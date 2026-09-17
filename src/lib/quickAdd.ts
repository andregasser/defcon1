import type { Defcon } from '../types'
import { todayISO } from './date'

export interface QuickAddResult {
  title: string
  defcon: Defcon | null
  due: string | null
}

const WEEKDAYS: Record<string, number> = {
  so: 0, sonntag: 0, sun: 0,
  mo: 1, montag: 1, mon: 1,
  di: 2, dienstag: 2, tue: 2,
  mi: 3, mittwoch: 3, wed: 3,
  do: 4, donnerstag: 4, thu: 4,
  fr: 5, freitag: 5, fri: 5,
  sa: 6, samstag: 6, sat: 6,
}

function shift(days: number, from: Date): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  return todayISO(date)
}

/** Next occurrence of a weekday, always in the future (never today). */
function nextWeekday(target: number, from: Date): string {
  const delta = ((target - from.getDay() + 7) % 7) || 7
  return shift(delta, from)
}

function dayMonth(day: number, month: number, year: number | null, from: Date): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  let resolved = year ?? from.getFullYear()
  const candidate = new Date(resolved, month - 1, day)
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null
  // A bare "20.09." in December means next year, not nine months ago.
  if (year === null && candidate < new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
    resolved += 1
  }
  return todayISO(new Date(resolved, month - 1, day))
}

/** Resolves one `@…` token to an ISO date, or null if it is not a date. */
function parseDateToken(raw: string, from: Date): string | null {
  const token = raw.toLowerCase()

  if (token === 'heute' || token === 'today') return todayISO(from)
  if (token === 'morgen' || token === 'tomorrow') return shift(1, from)
  if (token === 'übermorgen' || token === 'uebermorgen') return shift(2, from)

  const relative = /^\+(\d{1,3})(t|d|w)?$/.exec(token)
  if (relative) {
    const amount = Number(relative[1])
    return shift(relative[2] === 'w' ? amount * 7 : amount, from)
  }

  if (token in WEEKDAYS) return nextWeekday(WEEKDAYS[token], from)

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token)
  if (iso) return dayMonth(Number(iso[3]), Number(iso[2]), Number(iso[1]), from)

  const swiss = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?$/.exec(token)
  if (swiss) {
    let year: number | null = null
    if (swiss[3]) year = swiss[3].length === 2 ? 2000 + Number(swiss[3]) : Number(swiss[3])
    return dayMonth(Number(swiss[1]), Number(swiss[2]), year, from)
  }

  return null
}

/**
 * Parses the quick-add mini syntax so a task can be filed without touching the
 * mouse: `Deploy vorbereiten !2 @morgen`.
 *
 * - `!1` … `!5` sets the DEFCON level
 * - `@heute`, `@morgen`, `@fr`, `@+3d`, `@20.09.`, `@2026-09-20` set the due date
 *
 * Tokens that look like syntax but do not parse stay part of the title, so an
 * e-mail address or a stray `!` never gets swallowed.
 */
export function parseQuickAdd(input: string, now = new Date()): QuickAddResult {
  const words = input.split(/\s+/)
  const titleWords: string[] = []
  let defcon: Defcon | null = null
  let due: string | null = null

  for (const word of words) {
    if (!word) continue

    const level = /^!([1-5])$/.exec(word)
    if (level && defcon === null) {
      defcon = Number(level[1]) as Defcon
      continue
    }

    if (word.startsWith('@') && word.length > 1 && due === null) {
      const parsed = parseDateToken(word.slice(1), now)
      if (parsed) {
        due = parsed
        continue
      }
    }

    titleWords.push(word)
  }

  return { title: titleWords.join(' ').trim(), defcon, due }
}
