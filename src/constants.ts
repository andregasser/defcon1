import type { Defcon, Prefs, Status } from './types'

export interface StatusMeta {
  id: Status
  /**
   * Column name. Intentionally the same in every language: these five words are
   * the shared vocabulary of every task board, and `1`–`5` should always mean
   * the same column. The translated hint underneath explains them.
   */
  label: string
}

export const STATUSES: StatusMeta[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'Todo' },
  { id: 'doing', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
]

export const STATUS_IDS: Status[] = STATUSES.map((s) => s.id)

export const STATUS_BY_ID: Record<Status, StatusMeta> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s]),
) as Record<Status, StatusMeta>

/**
 * After this many days without movement a task counts as "stehengelassen".
 * Only the two columns where standing still is the actual problem are watched:
 * work that stopped moving, and a block nobody chased.
 */
export const STALE_AFTER_DAYS: Partial<Record<Status, number>> = {
  doing: 3,
  blocked: 2,
}

export interface DefconMeta {
  level: Defcon
  /** The official signal colour of this level. Used as fill, never as small text. */
  color: string
  /** Text colour that stays legible **on** `color` — dark on the bright levels. */
  ink: string
  /** Official DEFCON code word. Stays untranslated — it is a proper name. */
  code: string
}

/**
 * The official DEFCON colour scale: 1 red, 2 orange, 3 yellow, 4 green, 5 blue.
 * These are signal colours, not tuned-down UI tones — they are the whole point
 * of the scale, so they are used verbatim. `ink` keeps the badge readable, which
 * is the one place where text sits on top of the colour.
 */
export const DEFCONS: DefconMeta[] = [
  // The ink is dark on all the bright levels — white on this red only reaches
  // 3.8:1, and the badge digit is far too small for that.
  { level: 1, color: '#ff1f1f', ink: '#08090c', code: 'COCKED PISTOL' },
  { level: 2, color: '#ff8c00', ink: '#08090c', code: 'FAST PACE' },
  { level: 3, color: '#ffd400', ink: '#08090c', code: 'ROUND HOUSE' },
  { level: 4, color: '#22b14c', ink: '#08090c', code: 'DOUBLE TAKE' },
  { level: 5, color: '#0057d8', ink: '#ffffff', code: 'FADE OUT' },
]

export const DEFCON_BY_LEVEL: Record<Defcon, DefconMeta> = Object.fromEntries(
  DEFCONS.map((d) => [d.level, d]),
) as Record<Defcon, DefconMeta>

export const DEFCON_LEVELS: Defcon[] = [1, 2, 3, 4, 5]

/** A task counts as "hot" — and lights up the deck — at these levels. */
export const HOT_DEFCONS: Defcon[] = [1, 2]

export const DEFAULT_DEFCON: Defcon = 4

export const PROJECT_COLORS = [
  '#0a84ff',
  '#ff9f0a',
  '#bf5af2',
  '#32d74b',
  '#ff453a',
  '#64d2ff',
  '#ffd60a',
  '#ff6482',
  '#5e5ce6',
  '#30d5c8',
]

export const DEFAULT_PREFS: Prefs = {
  // Overridden by the browser's language on first load, see loadPrefs().
  lang: 'de',
  density: 'comfort',
  laneSort: 'deadline',
  // Urgency should not need housekeeping: a task that becomes a DEFCON 1 rises
  // to the top of its cell on its own. Switch to 'manual' for hand order.
  taskSort: 'defcon',
  hideDone: false,
  hideEmptyLanes: false,
  // A DEFCON 1 is an interruption by definition, so it may make a noise. One
  // click on the Alarm chip turns it off for good on this device.
  sound: true,
  deckOpen: true,
  collapsedProjects: [],
  focusedProjects: [],
}

export const PREFS_KEY = 'defcon1.prefs.v1'
export const LOCAL_DATA_KEY = 'defcon1.data.v1'
