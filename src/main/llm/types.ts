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

export interface MessageImage {
  name?: string
  mime: string
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
  maxTokens?: number
  temperature?: number | null
  reasoningEffort?: string | null
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
