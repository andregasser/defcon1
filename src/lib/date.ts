import type { Lang } from '../types'

/**
 * All dates in Defcon 1 are plain local calendar days (`yyyy-mm-dd`), never
 * timestamps. That keeps "due on 20.09." free of timezone surprises.
 *
 * Formatting takes the language explicitly instead of reaching for
 * `Intl.DateTimeFormat`: the board needs short, predictable labels that fit a
 * card, and an English locale must never turn `20.09.` into an ambiguous
 * `09/20`.
 */

const DAY_MS = 86_400_000

/** Month abbreviations for the English format. German stays numeric. */
const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface CountdownWords {
  today: string
  tomorrow: string
  days: (n: number) => string
  weeks: (n: number) => string
  months: (n: number) => string
  overdue: (n: number) => string
}

const COUNTDOWN: Record<Lang, CountdownWords> = {
  de: {
    today: 'heute',
    tomorrow: 'morgen',
    days: (n) => `in ${n} T`,
    weeks: (n) => `in ${n} Wo`,
    months: (n) => `in ${n} Mt`,
    overdue: (n) => `überfällig · ${n} T`,
  },
  en: {
    today: 'today',
    tomorrow: 'tomorrow',
    days: (n) => `in ${n} d`,
    weeks: (n) => `in ${n} wk`,
    months: (n) => `in ${n} mo`,
    overdue: (n) => `overdue · ${n} d`,
  },
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses `yyyy-mm-dd` as local midnight. Returns null for anything else. */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Whole days from today to `iso`. Negative = in the past. */
export function daysUntil(iso: string | null | undefined, from = new Date()): number | null {
  const target = parseISODate(iso)
  if (!target) return null
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((target.getTime() - start.getTime()) / DAY_MS)
}

/**
 * Whole calendar days since a timestamp (`createdAt`, `statusSince`). Counted
 * in days, not hours: something stamped yesterday evening is "1 d" this
 * morning, which is how one reads a board.
 */
export function daysSince(iso: string | null | undefined, from = new Date()): number | null {
  if (!iso) return null
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return null
  const stamp = new Date(time)
  const start = new Date(stamp.getFullYear(), stamp.getMonth(), stamp.getDate())
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((today.getTime() - start.getTime()) / DAY_MS)
}

/** `20.09.2026` in German, `20 Sep 2026` in English. */
export function formatDate(iso: string | null | undefined, lang: Lang = 'de'): string {
  const date = parseISODate(iso)
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  if (lang === 'en') return `${d} ${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}.${m}.${date.getFullYear()}`
}

/** Same, without the year — for tight spots like task cards. */
export function formatDateShort(iso: string | null | undefined, lang: Lang = 'de'): string {
  const date = parseISODate(iso)
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  if (lang === 'en') return `${d} ${MONTHS_EN[date.getMonth()]}`
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}.${m}.`
}

export type DateTone = 'overdue' | 'today' | 'soon' | 'ok' | 'none'

/** `soonDays` controls how early a date starts looking urgent. */
export function dateTone(iso: string | null | undefined, soonDays = 7): DateTone {
  const days = daysUntil(iso)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= soonDays) return 'soon'
  return 'ok'
}

/** Human countdown: "überfällig · 3 T", "heute", "in 12 T" / "in 12 d". */
export function formatCountdown(iso: string | null | undefined, lang: Lang = 'de'): string {
  const days = daysUntil(iso)
  if (days === null) return ''
  const words = COUNTDOWN[lang] ?? COUNTDOWN.de
  if (days < 0) return words.overdue(Math.abs(days))
  if (days === 0) return words.today
  if (days === 1) return words.tomorrow
  if (days <= 45) return words.days(days)
  if (days <= 120) return words.weeks(Math.round(days / 7))
  return words.months(Math.round(days / 30))
}

export function nowISO(): string {
  return new Date().toISOString()
}
