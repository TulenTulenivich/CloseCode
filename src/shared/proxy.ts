export function normalizeProxy(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '')
  if (!trimmed) return ''
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname) return null
  if (url.pathname !== '/' && url.pathname !== '') return null
  if (url.search || url.hash) return null
  return url.toString().replace(/\/+$/, '')
}
