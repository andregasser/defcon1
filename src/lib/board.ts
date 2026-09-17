import { DEFAULT_DEFCON, PROJECT_COLORS, STATUS_IDS } from '../constants'
import type { BoardData, Defcon, LaneSort, Project, Status, Task } from '../types'
import { daysUntil, nowISO, todayISO } from './date'

export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/* ------------------------------------------------------------------ cells */

/** dnd-kit needs one stable id per droppable cell of the swimlane grid. */
export function cellId(projectId: string, status: Status): string {
  return `cell:${projectId}:${status}`
}

export function parseCellId(id: string): { projectId: string; status: Status } | null {
  if (!id.startsWith('cell:')) return null
  const rest = id.slice(5)
  const split = rest.lastIndexOf(':')
  if (split < 0) return null
  const status = rest.slice(split + 1) as Status
  if (!STATUS_IDS.includes(status)) return null
  return { projectId: rest.slice(0, split), status }
}

const byOrder = (a: Task, b: Task) => a.order - b.order

/**
 * Buckets every task into its cell once per render. Cheaper and far easier to
 * reason about than filtering the task list 50 times for a 10-project board.
 */
export function groupByCell(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = cellId(task.projectId, task.status)
    const bucket = groups.get(key)
    if (bucket) bucket.push(task)
    else groups.set(key, [task])
  }
  for (const bucket of groups.values()) bucket.sort(byOrder)
  return groups
}

/* ------------------------------------------------------------------ moves */

/** Moves a task to `toIndex` of the (project, status) cell and renumbers both cells. */
export function moveTask(
  tasks: Task[],
  taskId: string,
  toProjectId: string,
  toStatus: Status,
  toIndex: number,
): Task[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return tasks

  const sameCell = task.projectId === toProjectId && task.status === toStatus
  const source = tasks
    .filter((t) => t.projectId === task.projectId && t.status === task.status && t.id !== taskId)
    .sort(byOrder)
  const target = sameCell
    ? source
    : tasks.filter((t) => t.projectId === toProjectId && t.status === toStatus).sort(byOrder)

  const moved: Task = {
    ...task,
    projectId: toProjectId,
    status: toStatus,
    doneAt: toStatus === 'done' ? (task.doneAt ?? nowISO()) : null,
  }

  const nextTarget = [...target]
  nextTarget.splice(Math.max(0, Math.min(toIndex, target.length)), 0, moved)

  const orders = new Map<string, number>()
  if (!sameCell) source.forEach((t, i) => orders.set(t.id, i))
  nextTarget.forEach((t, i) => orders.set(t.id, i))

  return tasks.map((t) => {
    if (t.id === taskId) return { ...moved, order: orders.get(taskId) ?? 0 }
    const order = orders.get(t.id)
    return order === undefined || order === t.order ? t : { ...t, order }
  })
}

/**
 * Places a task directly in front of `beforeTaskId` (or at the end when null).
 *
 * Anchoring on a neighbour rather than an index keeps drops correct while
 * filters are active: the visible list is a subset, so a visible index would
 * not line up with the stored order.
 */
export function moveTaskBefore(
  tasks: Task[],
  taskId: string,
  toProjectId: string,
  toStatus: Status,
  beforeTaskId: string | null,
): Task[] {
  const target = tasks
    .filter((t) => t.projectId === toProjectId && t.status === toStatus && t.id !== taskId)
    .sort(byOrder)
  const index = beforeTaskId ? target.findIndex((t) => t.id === beforeTaskId) : -1
  return moveTask(tasks, taskId, toProjectId, toStatus, index < 0 ? target.length : index)
}

/** Appends to the end of a cell — used by keyboard moves and quick add. */
export function appendIndex(tasks: Task[], projectId: string, status: Status): number {
  let count = 0
  for (const task of tasks) {
    if (task.projectId === projectId && task.status === status) count += 1
  }
  return count
}

/* ------------------------------------------------------------------ create */

export function createTask(
  projectId: string,
  status: Status,
  title: string,
  order: number,
  extra: Partial<Pick<Task, 'defcon' | 'due' | 'note'>> = {},
): Task {
  return {
    id: uid('t'),
    projectId,
    title,
    note: extra.note ?? '',
    status,
    defcon: extra.defcon ?? DEFAULT_DEFCON,
    due: extra.due ?? null,
    order,
    createdAt: nowISO(),
    doneAt: status === 'done' ? nowISO() : null,
  }
}

export function createProject(name: string, order: number, colorSeed = order): Project {
  return {
    id: uid('p'),
    name,
    color: PROJECT_COLORS[colorSeed % PROJECT_COLORS.length],
    deadline: null,
    order,
  }
}

/* ------------------------------------------------------------------- stats */

export interface ProjectStats {
  total: number
  done: number
  open: number
  doing: number
  blocked: number
  /** Open tasks at DEFCON 1–2. */
  hot: number
  /** Open tasks past their due date. */
  overdue: number
  /** 0–100. */
  percent: number
  /** Lowest (= most urgent) DEFCON level among open tasks, or null. */
  topDefcon: Defcon | null
}

export function projectStats(tasks: Task[], projectId: string): ProjectStats {
  const today = todayISO()
  let total = 0
  let done = 0
  let doing = 0
  let blocked = 0
  let hot = 0
  let overdue = 0
  let topDefcon: Defcon | null = null

  for (const task of tasks) {
    if (task.projectId !== projectId) continue
    total += 1
    if (task.status === 'done') {
      done += 1
      continue
    }
    if (task.status === 'doing') doing += 1
    if (task.status === 'blocked') blocked += 1
    if (task.defcon <= 2) hot += 1
    if (task.due && task.due < today) overdue += 1
    if (topDefcon === null || task.defcon < topDefcon) topDefcon = task.defcon
  }

  return {
    total,
    done,
    open: total - done,
    doing,
    blocked,
    hot,
    overdue,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    topDefcon,
  }
}

/* -------------------------------------------------------------- lane order */

export function sortProjects(projects: Project[], mode: LaneSort): Project[] {
  const sorted = [...projects]
  if (mode === 'manual') return sorted.sort((a, b) => a.order - b.order)
  // Deadline mode: the project that runs out of time first goes on top,
  // projects without a deadline sink to the bottom in manual order.
  return sorted.sort((a, b) => {
    const da = daysUntil(a.deadline)
    const db = daysUntil(b.deadline)
    if (da === null && db === null) return a.order - b.order
    if (da === null) return 1
    if (db === null) return -1
    return da - db || a.order - b.order
  })
}

/** Moves a project `delta` steps in the manual order and renumbers. */
export function reorderProject(projects: Project[], projectId: string, delta: number): Project[] {
  const sorted = [...projects].sort((a, b) => a.order - b.order)
  const from = sorted.findIndex((p) => p.id === projectId)
  if (from < 0) return projects
  const to = Math.max(0, Math.min(sorted.length - 1, from + delta))
  if (to === from) return projects
  const [moved] = sorted.splice(from, 1)
  sorted.splice(to, 0, moved)
  const orders = new Map(sorted.map((p, i) => [p.id, i]))
  return projects.map((p) => {
    const order = orders.get(p.id)
    return order === undefined || order === p.order ? p : { ...p, order }
  })
}

/* --------------------------------------------------------------- demo data */

export function createDemoData(): BoardData {
  const today = new Date()
  const inDays = (n: number) =>
    todayISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n))

  const specs: Array<{
    name: string
    deadline: string | null
    tasks: Array<[Status, string, Defcon, string | null]>
  }> = [
    {
      name: 'Migration Cloud',
      deadline: inDays(21),
      tasks: [
        ['doing', 'Terraform-Module refactoren', 2, inDays(2)],
        ['blocked', 'Netzwerk-Freigabe Firewall', 1, inDays(-1)],
        ['todo', 'Runbook schreiben', 4, inDays(9)],
        ['backlog', 'Kostenmodell prüfen', 5, null],
        ['done', 'Landing Zone aufgesetzt', 3, null],
      ],
    },
    {
      name: 'Reporting Q4',
      deadline: inDays(5),
      tasks: [
        ['doing', 'Kennzahlen abstimmen', 2, inDays(1)],
        ['todo', 'Dashboard-Layout finalisieren', 3, inDays(3)],
        ['done', 'Datenquellen inventarisiert', 4, null],
      ],
    },
    {
      name: 'Onboarding Tool',
      deadline: inDays(60),
      tasks: [
        ['backlog', 'Anforderungen sammeln', 5, null],
        ['todo', 'Prototyp skizzieren', 4, inDays(14)],
      ],
    },
  ]

  const projects: Project[] = []
  const tasks: Task[] = []

  specs.forEach((spec, index) => {
    const project = createProject(spec.name, index, index)
    project.deadline = spec.deadline
    projects.push(project)

    const perStatus = new Map<Status, number>()
    for (const [status, title, defcon, due] of spec.tasks) {
      const order = perStatus.get(status) ?? 0
      perStatus.set(status, order + 1)
      tasks.push(createTask(project.id, status, title, order, { defcon, due }))
    }
  })

  return { projects, tasks }
}
