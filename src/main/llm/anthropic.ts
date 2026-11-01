import type { ChatMessage, ProviderRequest, ProviderResult, ProviderStream, ToolCall } from './types'
import { endpointUrl, postForSse, readSse } from './sse'
import { tr } from '../lang'

interface AnthropicBlock {
  type: 'text' | 'tool' | 'thinking'
  text?: string
  id?: string
  name?: string
  json?: string
  initialInput?: unknown
}

type AnthropicContentBlock = Record<string, unknown>
interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: AnthropicContentBlock[]
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function userBlocks(message: Extract<ChatMessage, { role: 'user' }>): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = []
  for (const image of message.images ?? []) {
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mime, data: image.data }
    })
  }
  blocks.push({ type: 'text', text: message.content || ' ' })
  return blocks
}

function toAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
  const result: AnthropicMessage[] = []

  const push = (role: 'user' | 'assistant', blocks: AnthropicContentBlock[]): void => {
    if (!blocks.length) return
    const last = result[result.length - 1]
    if (last && last.role === role) {
      last.content.push(...blocks)
      return
    }
    result.push({ role, content: blocks })
  }

  for (const message of messages) {
    if (message.role === 'user') {
      push('user', userBlocks(message))
    } else if (message.role === 'assistant') {
      const blocks: AnthropicContentBlock[] = []
      if (message.content.trim()) blocks.push({ type: 'text', text: message.content })
      for (const call of message.toolCalls ?? []) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: parseJsonObject(call.arguments || '{}')
        })
      }
      if (!blocks.length && !message.content.trim()) {
        blocks.push({ type: 'text', text: ' ' })
      }
      if (blocks.length) push('assistant', blocks)
    } else {
      push('user', [
        {
          type: 'tool_result',
          tool_use_id: message.toolCallId,
          content: message.content
        }
      ])
    }
  }

  if (result.length && result[0].role !== 'user') {
    result.unshift({ role: 'user', content: [{ type: 'text', text: ' ' }] })
  }
  return result
}

export const streamAnthropic: ProviderStream = async (
  request: ProviderRequest,
  onText
): Promise<ProviderResult> => {
  const url = endpointUrl(request.baseUrl, '/messages')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'anthropic-version': '2023-06-01'
  }
  if (request.apiKey) headers['x-api-key'] = request.apiKey

  const thinkingBudget =
    request.thinkingBudget && request.thinkingBudget >= 1024 ? request.thinkingBudget : 0
  let maxTokens = request.maxTokens ?? 8192
  if (thinkingBudget > 0 && maxTokens <= thinkingBudget) {
    maxTokens = thinkingBudget + 2048
  }

  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: maxTokens,
    messages: toAnthropicMessages(request.messages),
    stream: true
  }
  if (thinkingBudget > 0) {
    body.thinking = { type: 'enabled', budget_tokens: thinkingBudget }
    body.temperature = 1
  } else if (typeof request.temperature === 'number') {
    body.temperature = request.temperature
  }
  if (request.system.trim()) body.system = request.system
  if (request.tools.length) {
    body.tools = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }))
  }

  const response = await postForSse(url, headers, body, request.signal)

  let text = ''
  let reasoning = ''
  let finishReason = ''
  const blocks = new Map<number, AnthropicBlock>()

  for await (const event of readSse(response)) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(event.data) as Record<string, unknown>
    } catch {
      continue
    }
    const type = event.event || (data.type as string) || ''

    if (type === 'error') {
      const error = data.error as { message?: string } | undefined
      throw new Error(error?.message || tr('e.providerError'))
    }

    if (type === 'content_block_start') {
      const index = Number(data.index ?? 0)
      const block = data.content_block as Record<string, unknown> | undefined
      if (block?.type === 'text') {
        blocks.set(index, { type: 'text', text: (block.text as string) || '' })
      } else if (block?.type === 'thinking' || block?.type === 'redacted_thinking') {
        blocks.set(index, { type: 'thinking', text: '' })
      } else if (block?.type === 'tool_use') {
        blocks.set(index, {
          type: 'tool',
          id: (block.id as string) || '',
          name: (block.name as string) || '',
          json: '',
          initialInput: block.input ?? {}
        })
      }
      continue
    }

    if (type === 'content_block_delta') {
      const index = Number(data.index ?? 0)
      const block = blocks.get(index)
      if (!block) continue
      const delta = (data.delta ?? {}) as Record<string, unknown>
      if (block.type === 'text' && delta.type === 'text_delta' && typeof delta.text === 'string') {
        block.text = (block.text ?? '') + delta.text
        text += delta.text
        onText(delta.text)
      } else if (block.type === 'thinking' && delta.type === 'thinking_delta' && typeof delta.thinking === 'string') {
        reasoning += delta.thinking
        if (!text) onText(delta.thinking)
      } else if (block.type === 'tool' && delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
        block.json = (block.json ?? '') + delta.partial_json
      }
      continue
    }

    if (type === 'message_delta') {
      const delta = (data.delta ?? {}) as Record<string, unknown>
      if (typeof delta.stop_reason === 'string') finishReason = delta.stop_reason
      continue
    }

    if (type === 'message_stop') break
  }

  const toolCalls: ToolCall[] = []
  for (const block of blocks.values()) {
    if (block.type !== 'tool' || !block.name) continue
    const raw = (block.json ?? '').trim()
    const parsed = raw ? parseJsonObject(raw) : (block.initialInput ?? {})
    toolCalls.push({
      id: block.id || `toolu_${crypto.randomUUID()}`,
      name: block.name,
      arguments: JSON.stringify(parsed)
    })
  }

  return { text: text || reasoning.trim(), toolCalls, finishReason }
}
