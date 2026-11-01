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
      const rest = line.slice(5)
      dataLines.push(rest.startsWith(' ') ? rest.slice(1) : rest)
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

const GEO_BLOCK =
  /unsupported_country_region_territory|country, region, or territory|request_forbidden|request not allowed|unavailable in your (?:country|region)|not available in your country/i

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
  }
  detail = detail
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
  const status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  if (response.status === 403 && GEO_BLOCK.test(detail)) {
    return new Error(detail ? `${status}: ${tr('e.geoHint')} (${detail})` : `${status}: ${tr('e.geoHint')}`)
  }
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
  if (base.startsWith('https://api.openai.com') && !base.includes('/v1')) {
    base = 'https://api.openai.com/v1'
  } else if (base.startsWith('https://api.anthropic.com') && !base.includes('/v1')) {
    base = 'https://api.anthropic.com/v1'
  } else if (base.startsWith('https://api.deepseek.com') && !base.includes('/v1')) {
    base = 'https://api.deepseek.com/v1'
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
    if (signal.aborted || (error as Error).name === 'AbortError') throw error
    throw new Error(tr('e.connect', { host, reason: (error as Error).message }))
  }
  if (!response.ok) throw await readHttpError(response)
  return response
}
