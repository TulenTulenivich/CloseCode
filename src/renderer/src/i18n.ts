import { useSyncExternalStore } from 'react'
import {
  createTranslator,
  translate,
  translateCount,
  type Lang,
  type TranslationKey
} from '../../shared/i18n'

let current: Lang = 'ru'
const listeners = new Set<() => void>()

/** Called whenever the stored language changes so every subscribed component re-renders. */
export function setRendererLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function currentLang(): Lang {
  return current
}

export function useLang(): Lang {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current
  )
}

export interface RendererTranslator {
  lang: Lang
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  tc: (key: TranslationKey, count: number) => string
}

export function useT(): RendererTranslator {
  const lang = useLang()
  const { t, tc } = createTranslator(lang)
  return { lang, t, tc }
}

/** For strings built outside of a component render, e.g. chat item factories. */
export function tStatic(key: TranslationKey, vars?: Record<string, string | number>): string {
  return translate(current, key, vars)
}

export function tcStatic(key: TranslationKey, count: number): string {
  return translateCount(current, key, count)
}
