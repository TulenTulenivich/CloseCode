import type { TranslationKey } from '../../shared/i18n'
import { tStatic } from './i18n'

export function errorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '')
}

export function baseName(target: string | null): string {
  if (!target) return ''
  const parts = target.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] ?? target
}

export function newId(): string {
  return crypto.randomUUID()
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${tStatic('unit.b')}`
  if (bytes < 1024) return `${Math.round(bytes)} ${tStatic('unit.b')}`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} ${tStatic('unit.kb')}`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${tStatic('unit.mb')}`
}

export function formatTokens(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 10000) return `${Math.round(value / 1000)}K`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(Math.max(0, Math.round(value)))
}

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string
