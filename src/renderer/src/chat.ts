import type { TranslationKey } from '../../shared/i18n'
import { tcStatic, tStatic } from './i18n'

export interface FileMeta {
  name: string
  size: number
}

export interface ToolItem {
  kind: 'tool'
  id: string
  name: string
  path: string | null
  status: 'running' | 'ok' | 'error'
  detail: string
  startedAt: number
  finishedAt?: number
  parent?: string | null
  agent?: string | null
}

export interface CompactionItem {
  kind: 'compaction'
  id: string
  status: 'running' | 'ok' | 'error'
  detail: string
}

export interface ImageItem {
  kind: 'image'
  id: string
  path: string
  absolutePath: string
  mime: string
  bytes: number
}

export type ChatItem =
  | {
      kind: 'user'
      id: string
      text: string
      files?: FileMeta[]
      images?: { name: string; src: string }[]
    }
  | { kind: 'assistant'; id: string; text: string }
  | ToolItem
  | CompactionItem
  | ImageItem
  | { kind: 'notice'; id: string; text: string }
  | { kind: 'error'; id: string; text: string }

export interface RunSummary {
  total: number
  files: number
  writes: number
  failed: number
}

export interface RunStats {
  steps: number
  done: number
  failed: number
  files: Record<string, { added: number; removed: number }>
}

export interface RunOverview {
  steps: number
  done: number
  files: number
  added: number
  removed: number
  failed: number
}

export function overviewOf(stats: RunStats): RunOverview {
  const edits = Object.values(stats.files)
  return {
    steps: stats.steps,
    done: stats.done,
    files: edits.length,
    added: edits.reduce((sum, edit) => sum + edit.added, 0),
    removed: edits.reduce((sum, edit) => sum + edit.removed, 0),
    failed: stats.failed
  }
}

const TOOL_KEYS: Record<string, TranslationKey> = {
  read_file: 'tool.read',
  write_file: 'tool.write',
  generate_image: 'tool.image',
  list_files: 'tool.list',
  search_files: 'tool.search',
  use_skill: 'tool.skill',
  open_project: 'tool.project',
  take_screenshot: 'tool.screen',
  ask_user: 'tool.ask',
  run_subagent: 'tool.agent'
}

export function toolLabelKey(name: string): TranslationKey {
  return TOOL_KEYS[name] ?? 'tool.unknown'
}

export function toolLabel(name: string): string {
  return tStatic(toolLabelKey(name))
}

export function pluralRun(count: number, key: TranslationKey): string {
  return tcStatic(key, count)
}

export function deriveTaskTitle(items: ChatItem[]): string {
  const user = items.find(
    (item): item is Extract<ChatItem, { kind: 'user' }> => item.kind === 'user'
  )
  if (!user) return tStatic('side.newTask')
  const text = user.text.replace(/\s+/g, ' ').trim()
  if (!text || text === tStatic('chat.attachmentOnly')) {
    if (user.files?.length) {
      const extra = user.files.length > 1 ? ` +${user.files.length - 1}` : ''
      return `${user.files[0].name}${extra}`
    }
    return tStatic('chat.fileWork')
  }
  return text.length > 56 ? `${text.slice(0, 56).trimEnd()}…` : text
}

export function summarizeRun(items: ChatItem[]): RunSummary | null {
  const tools = items.filter((item): item is ToolItem => item.kind === 'tool')
  if (!tools.length) return null
  const files = new Set(
    tools
      .map((tool) => tool.path)
      .filter((path): path is string => Boolean(path) && path !== '.')
  )
  return {
    total: tools.length,
    files: files.size,
    writes: tools.filter(
      (tool) =>
        (tool.name === 'write_file' || tool.name === 'generate_image') && tool.status === 'ok'
    ).length,
    failed: tools.filter((tool) => tool.status === 'error').length
  }
}
