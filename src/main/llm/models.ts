import type { ProviderKind } from '../../shared/types'
import { tr } from '../lang'
import { endpointUrl, readHttpError } from './sse'

export async function fetchAvailableModels(
  kind: ProviderKind,
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  const url = endpointUrl(baseUrl, '/models')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (kind === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01'
    if (apiKey) headers['x-api-key'] = apiKey
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  let response: Response
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    timer.unref?.()
    try {
      response = await fetch(url, { headers, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    throw new Error(tr('e.fetchModels', { reason: (error as Error).message }))
  }
  if (!response.ok) throw await readHttpError(response)

  const payload = (await response.json()) as {
    data?: Array<{ id?: string; name?: string }>
    models?: Array<{ id?: string; name?: string }>
  }
  const items = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : []
  const ids = items
    .map((item) => item.id || item.name)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
}
