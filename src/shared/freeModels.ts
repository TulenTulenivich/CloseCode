import type { Lang } from './i18n'
import type { ProviderInfo } from './types'

/** Keyless provider seeded on first run so a fresh install can code without any setup. */
export const FREE_PROVIDER_ID = 'free-models'

/** OpenAI-compatible gateway that answers without an API key (~200 requests/hour per IP). */
export const FREE_PROVIDER_BASE_URL = 'https://api.kilo.ai/api/gateway'

/** Probed keyless on 2026-10-31; every id answers chat and real tool calls. The free pool rotates, so refresh this list. */
export const FREE_PROVIDER_MODELS = [
  'reflection/beam-free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'cohere/north-mini-code:free',
  'inclusionai/ling-3.1-flash-1019-free',
  'dots-studio/dots-3-note-preview:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'liquid/lfm-2.5-2.6b:free'
]

export function freeProviderLabel(lang: Lang): string {
  return lang === 'ru' ? 'Бесплатные модели' : 'Free models'
}

export function isFreeProvider(provider: Pick<ProviderInfo, 'id' | 'baseUrl'>): boolean {
  return provider.id === FREE_PROVIDER_ID || provider.baseUrl === FREE_PROVIDER_BASE_URL
}

/** The gateway lists hundreds of billed ids; only the free pool belongs to this provider. */
export function filterFreeModels(ids: string[]): string[] {
  return ids.filter((id) => /free$/i.test(id))
}
