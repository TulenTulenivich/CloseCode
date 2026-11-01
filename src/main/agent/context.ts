import type { AgentEvent, ContextState, EffortLevel, ProviderKind } from '../../shared/types'
import { contextWindowFor, maxTokensFor } from '../../shared/modelNames'
import type { ChatMessage } from '../llm/types'
import { streamAnthropic } from '../llm/anthropic'
import { streamOpenAi } from '../llm/openai'
import { tr } from '../lang'

export const COMPACT_THRESHOLD = 0.8

const TOOL_SCHEMA_TOKENS = 1800
const SUMMARY_MAX_CHARS = 24000
const TRANSCRIPT_MESSAGE_CHARS = 5000

const SUMMARY_SYSTEM = `You compress the history of a coding agent conversation so the work can continue in a limited context.
Write a dense technical summary in the language of the conversation:
- what the user asked for and which constraints were given;
- which files were inspected or changed (paths and the essence of each change);
- important code details, decisions and agreements;
- what is left to do and where the work stopped.
Do not invent facts. No introductions or general reasoning. Under 400 words.`

interface ProviderConfig {
  kind: ProviderKind
  apiKey: string
  baseUrl: string
}

function messageText(message: ChatMessage): string {
  if (message.role === 'tool') return message.content
  if (message.role === 'assistant') {
    const calls = message.toolCalls
      ?.map((call) => `${call.name} ${call.arguments}`)
      .join('\n')
    return calls ? `${message.content}\n${calls}` : message.content
  }
  return message.content
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 3.2)
}

export function contextLimitForModel(model: string): number {
  return contextWindowFor(model)
}

export function estimateHistoryTokens(messages: ChatMessage[], system: string): number {
  let chars = system.length + 32
  for (const message of messages) {
    chars += messageText(message).length + 16
  }
  return Math.ceil(chars / 3.2) + TOOL_SCHEMA_TOKENS + messages.length * 4
}

export function buildContextState(
  messages: ChatMessage[],
  system: string,
  limit: number,
  threshold = COMPACT_THRESHOLD
): ContextState {
  return {
    used: Math.min(estimateHistoryTokens(messages, system), limit),
    limit,
    threshold,
    estimated: true
  }
}

export function formatTokens(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 10000) return `${Math.round(value / 1000)}K`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(Math.max(0, Math.round(value)))
}

function renderTranscript(messages: ChatMessage[], limit: number): string {
  const budget = Math.max(8000, Math.min(180000, Math.floor(limit * 3.2 * 0.55)))
  const parts: string[] = []
  let used = 0
  let omitted = false

  const labels: Record<ChatMessage['role'], string> = {
    user: 'USER',
    assistant: 'ASSISTANT',
    tool: 'TOOL RESULT'
  }

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    let body = messageText(message)
    if (body.length > TRANSCRIPT_MESSAGE_CHARS) {
      body = `${body.slice(0, TRANSCRIPT_MESSAGE_CHARS)}\n[…truncated…]`
    }
    const part = `${labels[message.role]}:\n${body}`
    if (used + part.length > budget) {
      omitted = true
      break
    }
    parts.push(part)
    used += part.length
  }

  parts.reverse()
  if (omitted) parts.unshift('[…earlier part of the conversation was dropped during compaction…]')
  return parts.join('\n\n')
}

function trimToFit(messages: ChatMessage[], system: string, limit: number): void {
  const target = Math.floor(limit * 0.4)
  const kept: ChatMessage[] = []
  let tokens = estimateHistoryTokens([], system)

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const size = estimateTokens(messageText(message)) + 8
    if (kept.length && tokens + size > target) break
    kept.unshift(message)
    tokens += size
  }

  while (kept.length && kept[0].role === 'tool') kept.shift()
  const first = kept[0]
  if (first && first.role === 'assistant' && first.toolCalls?.length) {
    const toolIds = new Set(
      kept.filter((message) => message.role === 'tool').map((message) => message.toolCallId)
    )
    if (!first.toolCalls.every((call) => toolIds.has(call.id))) kept.shift()
  }
  while (kept.length && kept[0].role === 'tool') kept.shift()

  messages.splice(
    0,
    messages.length,
    { role: 'user', content: tr('sys.trimmed') },
    { role: 'assistant', content: tr('sys.ackTrim') },
    ...kept
  )
}

interface CompactOptions {
  messages: ChatMessage[]
  system: string
  provider: ProviderConfig
  model: string
  signal: AbortSignal
  emit: (event: AgentEvent) => void
  source: 'auto' | 'manual'
  effort?: EffortLevel
  extraTokens?: number
  force?: boolean
  limit?: number
  threshold?: number
}

export async function compactHistoryIfNeeded(options: CompactOptions): Promise<ContextState> {
  const limit = options.limit ?? contextLimitForModel(options.model)
  const threshold = options.threshold ?? COMPACT_THRESHOLD
  const before = estimateHistoryTokens(options.messages, options.system) + (options.extraTokens ?? 0)
  if (!options.messages.length) {
    return buildContextState(options.messages, options.system, limit, threshold)
  }
  if (!options.force && before < limit * threshold) {
    return buildContextState(options.messages, options.system, limit, threshold)
  }

  options.emit({ type: 'compact-start', source: options.source })

  let ok = true
  let detail = ''
  const usedBefore = Math.min(before, limit)

  try {
    const stream = options.provider.kind === 'anthropic' ? streamAnthropic : streamOpenAi
    const transcript = renderTranscript(options.messages, limit)
    const result = await stream(
      {
        apiKey: options.provider.apiKey,
        baseUrl: options.provider.baseUrl,
        model: options.model,
        system: SUMMARY_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `${tr('sys.summaryRequest')}\n\n${transcript}`
          }
        ],
        tools: [],
        signal: options.signal,
        maxTokens: Math.min(
          maxTokensFor(options.effort ?? 'medium'),
          Math.max(2048, Math.floor(limit * 0.2))
        )
      },
      () => undefined
    )

    const summary = result.text.trim().slice(0, SUMMARY_MAX_CHARS)
    if (!summary) throw new Error(tr('e.emptySummary'))

    options.messages.splice(
      0,
      options.messages.length,
      {
        role: 'user',
        content: `${tr('sys.summary')}\n\n${summary}`
      },
      {
        role: 'assistant',
        content: tr('sys.ackSummary')
      }
    )
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    ok = false
    trimToFit(options.messages, options.system, limit)
    detail = tr('d.compactFailed', { reason: (error as Error)?.message ?? '' }).trim()
  }

  const after = buildContextState(options.messages, options.system, limit, threshold)
  if (ok) {
    detail = tr('d.compacted', { before: formatTokens(usedBefore), after: formatTokens(after.used) })
  }
  options.emit({ type: 'compact-end', ok, detail, context: after })
  return after
}
