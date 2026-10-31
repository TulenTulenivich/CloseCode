export interface ToolSchema {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: string
}

/** An image the user attached, carried alongside the text of a user turn. */
export interface MessageImage {
  /** Original file name, kept for restored chats. */
  name?: string
  mime: string
  /** Base64 payload without the data URL prefix. */
  data: string
}

export type ChatMessage =
  | { role: 'user'; content: string; images?: MessageImage[] }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string }

export interface ProviderRequest {
  apiKey: string
  baseUrl: string
  model: string
  system: string
  messages: ChatMessage[]
  tools: ToolSchema[]
  signal: AbortSignal
  /** Output ceiling; derived from the model + effort when omitted. */
  maxTokens?: number
  temperature?: number | null
  /** OpenAI-style reasoning effort: `low` | `medium` | `high`. */
  reasoningEffort?: string | null
  /** Anthropic extended-thinking token budget. */
  thinkingBudget?: number | null
}

export interface ProviderResult {
  text: string
  toolCalls: ToolCall[]
  finishReason: string
}

export type ProviderStream = (
  request: ProviderRequest,
  onText: (text: string) => void
) => Promise<ProviderResult>
