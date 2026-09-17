/**
 * All dates in Defcon 1 are plain local calendar days (`yyyy-mm-dd`), never
 * timestamps. That keeps "fällig am 20.09." free of timezone surprises.
 */

const DAY_MS = 86_400_000

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
 * in days, not hours: something stamped yesterday evening is "1 T" this
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

/** Swiss short format: 20.09.2026 */
export function formatDate(iso: string | null | undefined): string {
  const date = parseISODate(iso)
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}.${m}.${date.getFullYear()}`
}

/** Same, without the year — for tight spots like task cards. */
export function formatDateShort(iso: string | null | undefined): string {
  const date = parseISODate(iso)
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
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

/** Human countdown: "überfällig · 3 T", "heute", "morgen", "in 12 T". */
export function formatCountdown(iso: string | null | undefined): string {
  const days = daysUntil(iso)
  if (days === null) return ''
  if (days < 0) return `überfällig · ${Math.abs(days)} T`
  if (days === 0) return 'heute'
  if (days === 1) return 'morgen'
  if (days <= 45) return `in ${days} T`
  const weeks = Math.round(days / 7)
  if (days <= 120) return `in ${weeks} Wo`
  return `in ${Math.round(days / 30)} Mt`
}

export function nowISO(): string {
  return new Date().toISOString()
}
