import type { ChatMessage, ProviderRequest, ProviderResult, ProviderStream } from './types'
import { endpointUrl, postForSse, readSse } from './sse'
import { tr } from '../lang'

interface OpenAiToolCallDelta {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

interface OpenAiDelta {
  content?: string
  tool_calls?: OpenAiToolCallDelta[]
  reasoning_content?: unknown
  reasoning?: unknown
  reasoning_details?: unknown
  [key: string]: unknown
}

function reasoningDelta(delta: OpenAiDelta): string {
  for (const key of ['reasoning_content', 'reasoning']) {
    const value = delta[key]
    if (typeof value === 'string' && value) return value
  }
  const details = delta.reasoning_details
  if (Array.isArray(details)) {
    return details
      .map((item) => (item as { text?: unknown } | null)?.text)
      .filter((text): text is string => typeof text === 'string')
      .join('')
  }
  return ''
}

function userContent(message: Extract<ChatMessage, { role: 'user' }>): unknown {
  if (!message.images?.length) return message.content || ' '
  const textPart = message.content.trim() ? message.content : ' '
  return [
    { type: 'text', text: textPart },
    ...message.images.map((image) => ({
      type: 'image_url',
      image_url: { url: `data:${image.mime};base64,${image.data}` }
    }))
  ]
}

function toOpenAiMessages(messages: ChatMessage[], system: string): unknown[] {
  const result: unknown[] = []
  if (system.trim()) result.push({ role: 'system', content: system })
  for (const message of messages) {
    if (message.role === 'user') {
      result.push({ role: 'user', content: userContent(message) })
    } else if (message.role === 'assistant') {
      const hasTools = Boolean(message.toolCalls?.length)
      const contentValue = message.content && message.content.trim() ? message.content : (hasTools ? null : '')
      const entry: Record<string, unknown> = { role: 'assistant', content: contentValue }
      if (hasTools) {
        entry.tool_calls = message.toolCalls!.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: call.arguments }
        }))
      }
      result.push(entry)
    } else {
      result.push({ role: 'tool', tool_call_id: message.toolCallId, content: message.content })
    }
  }
  return result
}

export const streamOpenAi: ProviderStream = async (
  request: ProviderRequest,
  onText
): Promise<ProviderResult> => {
  const url = endpointUrl(request.baseUrl, '/chat/completions')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
  if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`

  const body: Record<string, unknown> = {
    model: request.model,
    stream: true,
    messages: toOpenAiMessages(request.messages, request.system)
  }
  const isDeepSeek = request.baseUrl.includes('deepseek') || request.model.toLowerCase().includes('deepseek')
  const isReasoning = /(^|[/-])(o[134]|gpt-5)/i.test(request.model)
  if (request.maxTokens) {
    if (isReasoning && !isDeepSeek) {
      body.max_completion_tokens = request.maxTokens
    } else {
      body.max_tokens = request.maxTokens
    }
  }
  const isDeepSeekReasoner = isDeepSeek && request.model.toLowerCase().includes('reasoner')
  if (typeof request.temperature === 'number' && !isDeepSeekReasoner) body.temperature = request.temperature
  if (request.reasoningEffort && !isDeepSeek) body.reasoning_effort = request.reasoningEffort
  if (request.tools.length) {
    body.tools = request.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  const response = await postForSse(url, headers, body, request.signal)

  let text = ''
  let reasoning = ''
  let finishReason = ''
  const calls: Array<{ id: string; name: string; args: string }> = []

  for await (const event of readSse(response)) {
    if (event.data === '[DONE]') break
    let data: Record<string, unknown>
    try {
      data = JSON.parse(event.data) as Record<string, unknown>
    } catch {
      continue
    }
    const apiError = data.error as { message?: string } | string | undefined
    if (apiError) {
      throw new Error(typeof apiError === 'string' ? apiError : apiError.message || tr('e.providerError'))
    }
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    const choice = choices?.[0]
    if (!choice) continue
    const delta = (choice.delta ?? {}) as OpenAiDelta
    const rDelta = reasoningDelta(delta)
    if (typeof delta.content === 'string' && delta.content) {
      text += delta.content
      onText(delta.content)
    } else if (rDelta) {
      onText(rDelta)
    }
    if (rDelta) reasoning += rDelta
    if (Array.isArray(delta.tool_calls)) {
      for (const item of delta.tool_calls) {
        const index = typeof item.index === 'number' ? item.index : 0
        while (calls.length <= index) calls.push({ id: '', name: '', args: '' })
        const slot = calls[index]
        if (item.id) slot.id = item.id
        if (item.function?.name) slot.name += item.function.name
        if (item.function?.arguments) slot.args += item.function.arguments
      }
    }
    if (typeof choice.finish_reason === 'string') finishReason = choice.finish_reason
  }

  const toolCalls = calls
    .filter((call) => call.name)
    .map((call) => ({
      id: call.id || `call_${crypto.randomUUID()}`,
      name: call.name,
      arguments: call.args || '{}'
    }))

  return { text: text || reasoning.trim(), toolCalls, finishReason }
}
