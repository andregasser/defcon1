/** UI language. The board data itself is language-neutral. */
export type Lang = 'de' | 'en'

export type Status = 'backlog' | 'todo' | 'doing' | 'blocked' | 'done'

/** Priority, expressed as a DEFCON level. 1 = maximum readiness, 5 = at ease. */
export type Defcon = 1 | 2 | 3 | 4 | 5

export interface Project {
  id: string
  name: string
  /** What this stream is about. Free text, empty when nobody wrote one. */
  description: string
  color: string
  /** Local date, ISO `yyyy-mm-dd`. */
  deadline: string | null
  /** Rank in the manual lane order. */
  order: number
}

/**
 * One step inside a task. Deliberately not a task itself: a checklist item has
 * no status, no DEFCON and no place on the board — it is either done or not.
 */
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  projectId: string
  title: string
  note: string
  status: Status
  defcon: Defcon
  /** Local date, ISO `yyyy-mm-dd`. */
  due: string | null
  /** The local calendar day deliberately reserved for this task. */
  plannedFor: string | null
  /** The local calendar day to follow up on this task. */
  reviewOn: string | null
  blockedReason: string
  /** Rank within the (projectId, status) cell. */
  order: number
  createdAt: string
  /**
   * When the task last entered its current status. DEFCON says how important
   * something is, this says how long it has not moved.
   */
  statusSince: string
  doneAt: string | null
  /** Steps within this task, in the order they should be worked through. */
  checklist: ChecklistItem[]
}

export interface BoardData {
  projects: Project[]
  tasks: Task[]
}

export type Density = 'compact' | 'comfort'
export type LaneSort = 'manual' | 'deadline'

/**
 * Order of the cards inside one cell. `defcon` keeps the most urgent task on
 * top by itself; `manual` is pure hand order, exactly as dropped.
 */
export type TaskSort = 'manual' | 'defcon'

/**
 * View-only settings. Deliberately kept in localStorage rather than in the
 * shared data file: how you look at the board is per-device, the tasks are not.
 */
export interface Prefs {
  lang: Lang
  density: Density
  laneSort: LaneSort
  taskSort: TaskSort
  hideDone: boolean
  hideEmptyLanes: boolean
  /** Sound the alarm when a task reaches DEFCON 1. */
  sound: boolean
  deckOpen: boolean
  collapsedProjects: string[]
  /** Empty = show every project. */
  focusedProjects: string[]
  /** An explicit per-device focus; completing it never selects a successor. */
  focusTaskId: string | null
}

/** Where the board data lives. */
export type StorageMode = 'loading' | 'server' | 'local' | 'demo'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Something the user should know about, reported as a code rather than as a
 * sentence: the data layer has no business owning UI copy in two languages.
 */
export type BoardNotice =
  | { kind: 'conflict' }
  | { kind: 'migrated' }
  | { kind: 'browserSaveFailed' }
  | { kind: 'saveFailed'; detail: string }
