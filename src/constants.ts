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

export interface DefconMeta {
  level: Defcon
  color: string
  /** Official DEFCON code word. Stays untranslated — it is a proper name. */
  code: string
}

/** Authentic DEFCON colour coding: 1 white, 2 red, 3 yellow, 4 green, 5 blue. */
export const DEFCONS: DefconMeta[] = [
  { level: 1, color: '#ffffff', code: 'COCKED PISTOL' },
  { level: 2, color: '#ff453a', code: 'FAST PACE' },
  { level: 3, color: '#ffd60a', code: 'ROUND HOUSE' },
  { level: 4, color: '#32d74b', code: 'DOUBLE TAKE' },
  { level: 5, color: '#0a84ff', code: 'FADE OUT' },
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
