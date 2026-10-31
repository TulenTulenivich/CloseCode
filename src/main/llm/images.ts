import type { ProviderKind } from '../../shared/types'
import { tr } from '../lang'
import { endpointUrl, readHttpError } from './sse'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export interface ImageRequestInput {
  kind: ProviderKind
  apiKey: string
  baseUrl: string
  model: string
  prompt: string
  size?: string | null
  signal: AbortSignal
}

export interface GeneratedImage {
  buffer: Buffer
  mime: string
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Images are only accepted when their magic bytes look like a real raster image. */
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  const head = buffer.length >= 6 ? buffer.toString('ascii', 0, 6) : ''
  if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif'
  return null
}

function acceptImage(buffer: Buffer): GeneratedImage {
  if (!buffer.length) throw new Error(tr('e.imageNoData'))
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error(tr('e.imageTooBig'))
  const mime = sniffImageMime(buffer)
  if (!mime) throw new Error(tr('e.imageBadData'))
  return { buffer, mime }
}

function decodeBase64(value: string): GeneratedImage {
  const cleaned = value.replace(/^data:[^,]*,/i, '').replace(/\s+/g, '')
  const buffer = Buffer.from(cleaned, 'base64')
  return acceptImage(buffer)
}

function decodeDataUrl(value: string): GeneratedImage | null {
  if (!/^data:/i.test(value)) return null
  return acceptImage(Buffer.from(value.replace(/^data:[^,]*,/i, ''), 'base64'))
}

async function downloadImage(url: string, signal: AbortSignal): Promise<GeneratedImage> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(tr('e.imageBadData'))
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(tr('e.imageBadData'))
  }
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new Error(tr('e.imageDownload', { reason: (error as Error).message }))
  }
  if (!response.ok) throw await readHttpError(response)
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_IMAGE_BYTES) throw new Error(tr('e.imageTooBig'))
  return acceptImage(Buffer.from(await response.arrayBuffer()))
}

function connectionError(url: string, error: unknown): Error {
  if ((error as Error).name === 'AbortError') return error as Error
  let host = url
  try {
    host = new URL(url).host
  } catch {
    // endpointUrl already validated the URL
  }
  return new Error(tr('e.connect', { host, reason: (error as Error).message }))
}

function isOpenRouter(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.toLowerCase().endsWith('openrouter.ai')
  } catch {
    return /openrouter\.ai/i.test(baseUrl)
  }
}

async function requestOpenRouter(input: ImageRequestInput): Promise<GeneratedImage> {
  const url = endpointUrl(input.baseUrl, '/chat/completions')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
  if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: 'user', content: input.prompt }],
        modalities: ['image', 'text'],
        stream: false
      }),
      signal: input.signal
    })
  } catch (error) {
    throw connectionError(url, error)
  }
  if (!response.ok) throw await readHttpError(response)

  const payload = (await response.json()) as JsonRecord
  const choices = Array.isArray(payload.choices) ? payload.choices : []
  const choice = isRecord(choices[0]) ? choices[0] : null
  const message = choice && isRecord(choice.message) ? choice.message : null
  const images = message && Array.isArray(message.images) ? message.images : []
  const first = images[0]
  let target = ''
  if (typeof first === 'string') {
    target = first
  } else if (isRecord(first)) {
    if (typeof first.b64_json === 'string') return decodeBase64(first.b64_json)
    if (typeof first.url === 'string') target = first.url
    else if (isRecord(first.image_url) && typeof first.image_url.url === 'string') {
      target = first.image_url.url
    }
  }
  if (!target) {
    const details = message && typeof message.content === 'string' ? message.content.trim() : ''
    throw new Error(
      tr('e.imageNoData') + (details ? ` ${details.slice(0, 300)}` : '')
    )
  }
  return decodeDataUrl(target) ?? (await downloadImage(target, input.signal))
}

async function requestOpenAiImages(input: ImageRequestInput): Promise<GeneratedImage> {
  if (input.kind === 'anthropic') throw new Error(tr('e.imageProvider'))
  const url = endpointUrl(input.baseUrl, '/images/generations')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
  if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`

  const body: Record<string, unknown> = {
    model: input.model,
    prompt: input.prompt,
    n: 1,
    size: input.size || '1024x1024'
  }
  // gpt-image models reject response_format; DALL-E uses it to return bytes.
  if (/dall-?e/i.test(input.model)) body.response_format = 'b64_json'

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: input.signal
    })
  } catch (error) {
    throw connectionError(url, error)
  }
  if (response.status === 404 || response.status === 405) throw new Error(tr('e.imageProvider'))
  if (!response.ok) throw await readHttpError(response)

  const payload = (await response.json()) as JsonRecord
  const data = Array.isArray(payload.data) ? payload.data : []
  const first = isRecord(data[0]) ? data[0] : null
  if (!first) throw new Error(tr('e.imageNoData'))
  if (typeof first.b64_json === 'string' && first.b64_json) return decodeBase64(first.b64_json)
  const remote =
    typeof first.url === 'string'
      ? first.url
      : typeof first.image_url === 'string'
        ? first.image_url
        : ''
  if (!remote) throw new Error(tr('e.imageNoData'))
  return decodeDataUrl(remote) ?? (await downloadImage(remote, input.signal))
}

/**
 * Asks the provider for one image. OpenAI-compatible providers use the images
 * endpoint; OpenRouter exposes image models through chat completions instead.
 */
export async function generateImage(input: ImageRequestInput): Promise<GeneratedImage> {
  if (isOpenRouter(input.baseUrl)) return requestOpenRouter(input)
  return requestOpenAiImages(input)
}
