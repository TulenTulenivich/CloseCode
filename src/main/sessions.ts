import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { ChatMessage, MessageImage, ToolCall } from './llm/types'

const MAX_STORED_MESSAGES = 200
const MAX_TRANSCRIPT_ENTRIES = 400
const MAX_TITLE_CHARS = 80

export type TranscriptEntry =
  | { role: 'user'; content: string; images?: MessageImage[] }
  | { role: 'assistant'; content: string }
  | { role: 'compaction'; ok: boolean; detail: string }

function sessionsDir(): string {
  return path.join(app.getPath('userData'), 'sessions')
}

function keyFor(projectPath: string): string {
  return createHash('sha1').update(path.resolve(projectPath).toLowerCase()).digest('hex').slice(0, 16)
}

function fileFor(projectPath: string): string {
  return path.join(sessionsDir(), `${keyFor(projectPath)}.json`)
}

interface StoredFile {
  version?: number
  title?: unknown
  messages?: unknown
  transcript?: unknown
}

const titleCache = new Map<string, string>()

function readFile(projectPath: string): StoredFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(fileFor(projectPath), 'utf8')) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as StoredFile) : null
  } catch {
    return null
  }
}

function cleanTitle(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_CHARS)
}

function writeSession(
  projectPath: string,
  title: string,
  messages: unknown,
  transcript: unknown
): void {
  const file = fileFor(projectPath)
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const payload = JSON.stringify({ version: 3, title: cleanTitle(title), messages, transcript }, null, 2)
    const temp = `${file}.tmp`
    fs.writeFileSync(temp, payload, { encoding: 'utf8', mode: 0o600 })
    try {
      fs.renameSync(temp, file)
    } catch {
      fs.copyFileSync(temp, file)
      try {
        fs.unlinkSync(temp)
      } catch {
      }
    }
    titleCache.set(file, cleanTitle(title))
  } catch {
  }
}

function cleanCalls(raw: unknown[]): ToolCall[] {
  const calls: ToolCall[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const call = item as Record<string, unknown>
    if (typeof call.id !== 'string' || typeof call.name !== 'string') continue
    calls.push({
      id: call.id,
      name: call.name,
      arguments: typeof call.arguments === 'string' ? call.arguments : '{}'
    })
  }
  return calls
}

function cleanImages(raw: unknown): MessageImage[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const images: MessageImage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const image = item as Record<string, unknown>
    if (typeof image.mime !== 'string' || typeof image.data !== 'string') continue
    images.push({
      name: typeof image.name === 'string' ? image.name.slice(0, 200) : undefined,
      mime: image.mime,
      data: image.data
    })
  }
  return images.length ? images : undefined
}

function sanitize(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const result: ChatMessage[] = []
  for (const item of raw.slice(-MAX_STORED_MESSAGES)) {
    if (!item || typeof item !== 'object') continue
    const message = item as Record<string, unknown>
    const content = typeof message.content === 'string' ? message.content : ''
    if (message.role === 'user' && content) {
      const images = cleanImages(message.images)
      result.push({ role: 'user', content, images })
    } else if (message.role === 'assistant') {
      const calls = Array.isArray(message.toolCalls) ? cleanCalls(message.toolCalls) : []
      if (content || calls.length) {
        result.push({ role: 'assistant', content, toolCalls: calls.length ? calls : undefined })
      }
    } else if (message.role === 'tool' && typeof message.toolCallId === 'string') {
      result.push({ role: 'tool', toolCallId: message.toolCallId, content })
    }
  }
  return result
}

function sanitizeTranscript(raw: unknown): TranscriptEntry[] {
  if (!Array.isArray(raw)) return []
  const result: TranscriptEntry[] = []
  for (const item of raw.slice(-MAX_TRANSCRIPT_ENTRIES)) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    if (entry.role === 'user' && typeof entry.content === 'string' && entry.content.trim()) {
      result.push({ role: 'user', content: entry.content, images: cleanImages(entry.images) })
    } else if (
      entry.role === 'assistant' &&
      typeof entry.content === 'string' &&
      entry.content.trim()
    ) {
      result.push({ role: 'assistant', content: entry.content })
    } else if (entry.role === 'compaction' && typeof entry.detail === 'string') {
      result.push({ role: 'compaction', ok: entry.ok !== false, detail: entry.detail })
    }
  }
  return result
}

export function loadTranscript(projectPath: string | null): TranscriptEntry[] | null {
  if (!projectPath) return null
  const parsed = readFile(projectPath)
  if (!parsed || !Array.isArray(parsed.transcript)) return null
  return sanitizeTranscript(parsed.transcript)
}

export function loadHistory(projectPath: string | null): ChatMessage[] {
  if (!projectPath) return []
  const parsed = readFile(projectPath)
  if (!parsed) return []
  const title = cleanTitle(parsed.title)
  if (title) titleCache.set(fileFor(projectPath), title)
  return sanitize(parsed.messages)
}

export function loadTitle(projectPath: string | null): string {
  if (!projectPath) return ''
  const file = fileFor(projectPath)
  const cached = titleCache.get(file)
  if (cached !== undefined) return cached
  const title = cleanTitle(readFile(projectPath)?.title)
  titleCache.set(file, title)
  return title
}

export function saveTitle(projectPath: string | null, title: string): void {
  if (!projectPath) return
  const stored = readFile(projectPath)
  const messages = Array.isArray(stored?.messages) ? stored.messages : []
  const transcript = Array.isArray(stored?.transcript) ? stored.transcript : []
  writeSession(projectPath, title, messages, transcript)
}

export function saveHistory(
  projectPath: string | null,
  messages: ChatMessage[],
  transcript: TranscriptEntry[]
): void {
  if (!projectPath) return
  writeSession(projectPath, loadTitle(projectPath), messages, transcript)
}

export function clearHistory(projectPath: string | null): void {
  if (!projectPath) return
  titleCache.delete(fileFor(projectPath))
  try {
    fs.unlinkSync(fileFor(projectPath))
  } catch {
  }
}

export function countHistory(projectPath: string): number {
  try {
    const parsed = readFile(projectPath)
    return Array.isArray(parsed?.messages) ? parsed.messages.length : 0
  } catch {
    return 0
  }
}