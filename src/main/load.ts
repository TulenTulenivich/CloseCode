import type { ModelLoad } from '../shared/types'
import { detectBrand } from '../shared/modelNames'

const SAMPLE_WINDOW = 6

interface Sample {
  firstTokenMs: number
  tokensPerSecond: number
  durationMs: number
}

interface Live {
  model: string
  startedAt: number
  firstTokenAt: number | null
  outputChars: number
}

const live = new Map<string, Live>()
const samples: Sample[] = []
let totalRequests = 0
let seq = 0

/** Rough token count: the same 3.2 chars/token heuristic the context meter uses. */
function toTokens(chars: number): number {
  return Math.max(0, Math.round(chars / 3.2))
}

export interface RequestTrace {
  id: string
  firstToken(): void
  delta(text: string): void
  done(): void
}

export function beginRequest(model: string): RequestTrace {
  const id = `req_${++seq}`
  const entry: Live = {
    model,
    startedAt: Date.now(),
    firstTokenAt: null,
    outputChars: 0
  }
  live.set(id, entry)
  totalRequests++

  return {
    id,
    firstToken() {
      if (entry.firstTokenAt === null) entry.firstTokenAt = Date.now()
    },
    delta(text) {
      if (entry.firstTokenAt === null) entry.firstTokenAt = Date.now()
      entry.outputChars += text.length
    },
    done() {
      const record = live.get(id)
      if (!record) return
      live.delete(id)
      const now = Date.now()
      const firstTokenMs = (record.firstTokenAt ?? now) - record.startedAt
      const generationMs = record.firstTokenAt ? now - record.firstTokenAt : 0
      const tokens = toTokens(record.outputChars)
      const tokensPerSecond = generationMs > 250 ? (tokens * 1000) / generationMs : 0
      samples.push({ firstTokenMs, tokensPerSecond, durationMs: now - record.startedAt })
      while (samples.length > SAMPLE_WINDOW) samples.shift()
    }
  }
}

export function abandonRequest(id: string): void {
  live.delete(id)
}

export function resetLoad(): void {
  live.clear()
  samples.length = 0
  totalRequests = 0
}

function average(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function modelLoad(fallbackModel: string | null): ModelLoad {
  const entries = [...live.values()]
  const current = entries[entries.length - 1] ?? null
  const model = current?.model ?? fallbackModel ?? ''
  const firstTokenSamples = samples.map((sample) => sample.firstTokenMs)
  const speedSamples = samples.map((sample) => sample.tokensPerSecond).filter((value) => value > 0)

  const liveTokens = current?.firstTokenAt ? toTokens(current.outputChars) : 0
  const liveWindow = current?.firstTokenAt ? Date.now() - current.firstTokenAt : 0

  return {
    inflight: entries.length,
    requests: totalRequests,
    activeModel: model || null,
    activeBrand: detectBrand(model),
    firstTokenMs: current ? (current.firstTokenAt ?? Date.now()) - current.startedAt : (firstTokenSamples[firstTokenSamples.length - 1] ?? null),
    avgFirstTokenMs: average(firstTokenSamples) === null ? null : Math.round(average(firstTokenSamples) as number),
    tokensPerSecond:
      liveWindow > 400 ? Math.round((liveTokens * 1000) / liveWindow) : (speedSamples[speedSamples.length - 1] ?? null),
    avgTokensPerSecond: average(speedSamples) === null ? null : Math.round(average(speedSamples) as number),
    elapsedMs: current ? Date.now() - current.startedAt : 0,
    outputChars: current?.outputChars ?? 0
  }
}
