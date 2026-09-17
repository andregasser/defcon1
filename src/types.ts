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

export interface Task {
  id: string
  projectId: string
  title: string
  note: string
  status: Status
  defcon: Defcon
  /** Local date, ISO `yyyy-mm-dd`. */
  due: string | null
  /** Rank within the (projectId, status) cell. */
  order: number
  createdAt: string
  doneAt: string | null
}

export interface BoardData {
  projects: Project[]
  tasks: Task[]
}

export type Density = 'compact' | 'comfort'
export type LaneSort = 'manual' | 'deadline'

/**
 * View-only settings. Deliberately kept in localStorage rather than in the
 * shared data file: how you look at the board is per-device, the tasks are not.
 */
export interface Prefs {
  lang: Lang
  density: Density
  laneSort: LaneSort
  hideDone: boolean
  hideEmptyLanes: boolean
  deckOpen: boolean
  collapsedProjects: string[]
  /** Empty = show every project. */
  focusedProjects: string[]
}

/** Where the board data lives. */
export type StorageMode = 'loading' | 'server' | 'local'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Something the user should know about, reported as a code rather than as a
 * sentence: the data layer has no business owning UI copy in two languages.
 */
export type BoardNotice =
  | { kind: 'conflict' }
  | { kind: 'migrated' }
  | { kind: 'saveFailed'; detail: string }
