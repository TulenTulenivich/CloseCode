import { tr } from '../lang'

export interface SseEvent {
  event?: string
  data: string
}

export async function* readSse(response: Response): AsyncGenerator<SseEvent> {
  if (!response.body) throw new Error(tr('e.emptyResponse'))
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = ''
  let dataLines: string[] = []

  const takeEvent = (): SseEvent | null => {
    if (!dataLines.length) {
      eventName = ''
      return null
    }
    const result: SseEvent = { event: eventName || undefined, data: dataLines.join('\n') }
    eventName = ''
    dataLines = []
    return result
  }

  const processLine = (line: string): SseEvent | null => {
    if (line === '') return takeEvent()
    if (line.startsWith(':')) return null
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      return null
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
      return null
    }
    return null
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      let line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      if (line.endsWith('\r')) line = line.slice(0, -1)
      const event = processLine(line)
      if (event) yield event
      newline = buffer.indexOf('\n')
    }
  }

  buffer += decoder.decode()
  if (buffer.length) {
    for (const raw of buffer.split('\n')) {
      const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
      const event = processLine(line)
      if (event) yield event
    }
  }
  const last = takeEvent()
  if (last) yield last
}

export async function readHttpError(response: Response): Promise<Error> {
  let detail = ''
  try {
    const text = await response.text()
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string } | string
        message?: string
      }
      const error = parsed.error
      detail = (typeof error === 'string' ? error : error?.message) || parsed.message || text
    } catch {
      detail = text
    }
  } catch {
    // ignore body read errors
  }
  detail = detail.replace(/\s+/g, ' ').trim().slice(0, 600)
  const status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  return new Error(detail ? `${status}: ${detail}` : status)
}

export function endpointUrl(baseUrl: string, suffix: string): string {
  let base = baseUrl.trim().replace(/\/+$/, '')
  if (!base) throw new Error(tr('e.noBaseUrl'))
  for (const known of ['/chat/completions', '/messages', '/responses']) {
    if (base.endsWith(known)) {
      base = base.slice(0, -known.length)
      break
    }
  }
  const url = base + suffix
  try {
    new URL(url)
  } catch {
    throw new Error(tr('e.badBaseUrlValue', { value: baseUrl }))
  }
  return url
}

export async function postForSse(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal
): Promise<Response> {
  let host = url
  try {
    host = new URL(url).host
  } catch {
    // ignore, endpointUrl already validated
  }
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new Error(tr('e.connect', { host, reason: (error as Error).message }))
  }
  if (!response.ok) throw await readHttpError(response)
  return response
}
