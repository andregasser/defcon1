import type { Defcon, Prefs, Status } from './types'

export interface StatusMeta {
  id: Status
  label: string
  /** Shown in the column header, right under the label. */
  hint: string
}

export const STATUSES: StatusMeta[] = [
  { id: 'backlog', label: 'Backlog', hint: 'unsortiert' },
  { id: 'todo', label: 'Todo', hint: 'geplant' },
  { id: 'doing', label: 'In Progress', hint: 'läuft' },
  { id: 'blocked', label: 'Blocked', hint: 'wartet' },
  { id: 'done', label: 'Done', hint: 'erledigt' },
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
  color: string
  /** Official DEFCON code word — used as the tooltip. */
  code: string
  label: string
}

/** Authentic DEFCON colour coding: 1 white, 2 red, 3 yellow, 4 green, 5 blue. */
export const DEFCONS: DefconMeta[] = [
  { level: 1, color: '#ffffff', code: 'COCKED PISTOL', label: 'sofort' },
  { level: 2, color: '#ff453a', code: 'FAST PACE', label: 'kritisch' },
  { level: 3, color: '#ffd60a', code: 'ROUND HOUSE', label: 'wichtig' },
  { level: 4, color: '#32d74b', code: 'DOUBLE TAKE', label: 'normal' },
  { level: 5, color: '#0a84ff', code: 'FADE OUT', label: 'irgendwann' },
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
  density: 'comfort',
  laneSort: 'deadline',
  hideDone: false,
  hideEmptyLanes: false,
  deckOpen: true,
  collapsedProjects: [],
  focusedProjects: [],
}

export const PREFS_KEY = 'defcon1.prefs.v1'
export const LOCAL_DATA_KEY = 'defcon1.data.v1'
