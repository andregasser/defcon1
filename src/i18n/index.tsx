import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Lang } from '../types'
import { de, type Dict } from './de'
import { en } from './en'

export type { Dict }
export { detectLang, isLang, langCode, LANGS } from './lang'

const DICTS: Record<Lang, Dict> = { de, en }

export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? de
}

/** Endonym of a language — "Deutsch", "English". */
export function langName(lang: Lang): string {
  return DICTS[lang].name
}

interface I18n {
  lang: Lang
  t: Dict
}

const I18nContext = createContext<I18n>({ lang: 'de', t: de })

/** Puts the active dictionary in reach of every component below. */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<I18n>(() => ({ lang, t: getDict(lang) }), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** The active dictionary. Named `t` at the call site by convention. */
export function useT(): Dict {
  return useContext(I18nContext).t
}

/** The active language — needed wherever a date gets formatted. */
export function useLang(): Lang {
  return useContext(I18nContext).lang
}
