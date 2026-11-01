import { Agent, ProxyAgent, setGlobalDispatcher } from 'undici'
import { normalizeProxy } from '../shared/proxy'
import { tr } from './lang'

let active: string | null = null

export function installProxy(raw: unknown): string {
  const url = normalizeProxy(raw)
  if (url === null) throw new Error(tr('e.badProxy'))
  setGlobalDispatcher(url ? new ProxyAgent({ uri: url }) : new Agent())
  active = url || null
  return url
}

export function currentProxy(): string | null {
  return active
}

export function initProxy(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return installProxy(raw)
  } catch {
    return null
  }
}
