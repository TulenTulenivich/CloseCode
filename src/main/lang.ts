import { translate, translateCount, type Lang, type TranslationKey } from '../shared/i18n'

let current: Lang = 'ru'

export function setLanguage(lang: Lang): void {
  current = lang === 'en' ? 'en' : 'ru'
}

export function getLang(): Lang {
  return current
}

export function tr(key: TranslationKey, vars?: Record<string, string | number>): string {
  return translate(current, key, vars)
}

export function trc(key: TranslationKey, count: number): string {
  return translateCount(current, key, count)
}
