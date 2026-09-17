export type Status = 'backlog' | 'todo' | 'doing' | 'blocked' | 'done'

/** Priority, expressed as a DEFCON level. 1 = maximum readiness, 5 = at ease. */
export type Defcon = 1 | 2 | 3 | 4 | 5

export interface Project {
  id: string
  name: string
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
  /**
   * When the task last entered its current status. DEFCON says how important
   * something is, this says how long it has not moved.
   */
  statusSince: string
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
