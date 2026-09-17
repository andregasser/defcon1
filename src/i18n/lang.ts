import type { Lang } from '../types'

/**
 * Language plumbing without any React or dictionary import, so pure modules
 * (storage, board logic) can validate and detect a language without pulling the
 * whole UI copy along.
 */

export const LANGS: Lang[] = ['de', 'en']

export function isLang(value: unknown): value is Lang {
  return value === 'de' || value === 'en'
}

/** Short label for the language switch, e.g. "DE". */
export function langCode(lang: Lang): string {
  return lang.toUpperCase()
}

/** The browser's language preferences, most wanted first. */
function navigatorTags(): string[] {
  if (typeof navigator === 'undefined') return []
  return [...(navigator.languages ?? []), navigator.language ?? '']
}

/**
 * First guess for a fresh install: follow the browser. Anything that is not
 * German gets English, which is the safer default for a shared machine.
 *
 * `tags` exists to be passed in by tests — the runtime never needs it.
 */
export function detectLang(tags: readonly string[] = navigatorTags()): Lang {
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.toLowerCase().startsWith('de')) return 'de'
  }
  return 'en'
}
