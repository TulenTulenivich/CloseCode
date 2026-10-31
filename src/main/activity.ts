import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { ActivityDay, ActivityView } from '../shared/types'

interface DayCount {
  messages: number
  tools: number
  writes: number
}

interface StoredActivity {
  version: 1
  days: Record<string, DayCount>
}

const WINDOW_DAYS = 366
const KEEP_DAYS = 400
const FLUSH_DELAY = 800

let cache: StoredActivity | null = null
let flushTimer: NodeJS.Timeout | null = null

function activityFile(): string {
  return path.join(app.getPath('userData'), 'activity.json')
}

function empty(): StoredActivity {
  return { version: 1, days: {} }
}

export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalize(raw: unknown): StoredActivity {
  const store = empty()
  if (!raw || typeof raw !== 'object') return store
  const days = (raw as Record<string, unknown>).days
  if (!days || typeof days !== 'object') return store
  for (const [key, value] of Object.entries(days as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue
    const item = value as Record<string, unknown>
    const count = (field: string): number =>
      typeof item[field] === 'number' && item[field] > 0 ? Math.round(item[field] as number) : 0
    store.days[key] = { messages: count('messages'), tools: count('tools'), writes: count('writes') }
  }
  return store
}

function load(): StoredActivity {
  if (cache) return cache
  try {
    cache = normalize(JSON.parse(fs.readFileSync(activityFile(), 'utf8')) as unknown)
  } catch {
    cache = empty()
  }
  return cache
}

function prune(store: StoredActivity): void {
  const oldest = new Date()
  oldest.setDate(oldest.getDate() - KEEP_DAYS)
  const limit = dateKey(oldest)
  for (const key of Object.keys(store.days)) {
    if (key < limit) delete store.days[key]
  }
}

function persist(store: StoredActivity): void {
  const file = activityFile()
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const temp = `${file}.tmp`
    fs.writeFileSync(temp, JSON.stringify(store), { encoding: 'utf8', mode: 0o600 })
    fs.renameSync(temp, file)
  } catch {
    // Activity is cosmetic; losing the file must never break the agent.
  }
}

function schedulePersist(store: StoredActivity): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    persist(store)
  }, FLUSH_DELAY)
  flushTimer.unref?.()
}

function record(field: keyof DayCount): void {
  const store = load()
  const key = dateKey(new Date())
  const day = store.days[key] ?? { messages: 0, tools: 0, writes: 0 }
  day[field] += 1
  store.days[key] = day
  prune(store)
  schedulePersist(store)
}

export function recordMessage(): void {
  record('messages')
}

export function recordTool(name: string, ok: boolean): void {
  if (!ok) return
  record('tools')
  if (name === 'write_file' || name === 'generate_image') record('writes')
}

export function flushActivity(): void {
  if (!flushTimer) return
  clearTimeout(flushTimer)
  flushTimer = null
  if (cache) persist(cache)
}

export function getActivity(): ActivityView {
  const store = load()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: ActivityDay[] = []
  let totalMessages = 0
  let totalTools = 0
  let totalWrites = 0
  let activeDays = 0
  let busiest = 0

  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const key = dateKey(date)
    const stored = store.days[key] ?? { messages: 0, tools: 0, writes: 0 }
    const score = stored.messages + stored.tools + stored.writes
    totalMessages += stored.messages
    totalTools += stored.tools
    totalWrites += stored.writes
    if (score > 0) activeDays += 1
    if (score > busiest) busiest = score
    days.push({ date: key, ...stored })
  }

  let longestStreak = 0
  let run = 0
  for (const day of days) {
    if (day.messages + day.tools + day.writes > 0) {
      run += 1
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }

  let currentStreak = 0
  for (let index = days.length - 1; index >= 0; index--) {
    const score = days[index].messages + days[index].tools + days[index].writes
    if (score > 0) currentStreak += 1
    else if (index === days.length - 1) continue
    else break
  }

  return {
    days,
    totalMessages,
    totalTools,
    totalWrites,
    activeDays,
    currentStreak,
    longestStreak,
    busiest
  }
}
