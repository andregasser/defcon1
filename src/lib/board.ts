import { DEFAULT_DEFCON, PROJECT_COLORS, STALE_AFTER_DAYS, STATUS_IDS } from '../constants'
import { getDict } from '../i18n'
import type {
  BoardData,
  ChecklistItem,
  Defcon,
  Lang,
  LaneSort,
  Project,
  Status,
  Task,
  TaskSort,
} from '../types'
import { daysSince, daysUntil, nowISO, todayISO } from './date'

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
 * Most urgent first, hand order within the same level. Nothing is renumbered:
 * `order` stays the manual order underneath, so switching back to `manual`
 * restores exactly the board the user had arranged.
 */
const byDefcon = (a: Task, b: Task) => a.defcon - b.defcon || a.order - b.order

/**
 * Buckets every task into its cell once per render. Cheaper and far easier to
 * reason about than filtering the task list 50 times for a 10-project board.
 */
export function groupByCell(tasks: Task[], sort: TaskSort = 'manual'): Map<string, Task[]> {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = cellId(task.projectId, task.status)
    const bucket = groups.get(key)
    if (bucket) bucket.push(task)
    else groups.set(key, [task])
  }
  const compare = sort === 'defcon' ? byDefcon : byOrder
  for (const bucket of groups.values()) bucket.sort(compare)
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
    // Only a real status change restarts the clock. Reordering inside a cell or
    // handing the task to another project does not: it has been waiting just
    // as long as before.
    statusSince: toStatus === task.status ? task.statusSince : nowISO(),
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
    plannedFor: null,
    reviewOn: null,
    blockedReason: '',
    order,
    createdAt: nowISO(),
    statusSince: nowISO(),
    doneAt: status === 'done' ? nowISO() : null,
    checklist: [],
  }
}

/* --------------------------------------------------------------- checklist */

export interface ChecklistProgress {
  done: number
  total: number
  percent: number
}

/**
 * Progress over a task's steps, or null when there are none — a task without a
 * checklist should show nothing at all rather than a defeated `0/0`.
 */
export function checklistProgress(task: Task): ChecklistProgress | null {
  const total = task.checklist.length
  if (total === 0) return null
  const done = task.checklist.filter((item) => item.done).length
  return { done, total, percent: Math.round((done / total) * 100) }
}

export function createChecklistItem(text: string): ChecklistItem {
  return { id: uid('c'), text, done: false }
}

export function createProject(name: string, order: number, colorSeed = order): Project {
  return {
    id: uid('p'),
    name,
    description: '',
    color: PROJECT_COLORS[colorSeed % PROJECT_COLORS.length],
    deadline: null,
    order,
  }
}

/* ------------------------------------------------------------------- aging */

/**
 * How many days the task has been sitting in its current status — but only once
 * that crosses the threshold for the status, otherwise null. A card that is
 * simply young is not news; one that stopped moving is.
 *
 * Done tasks never go stale: they are finished, not stuck.
 */
export function staleDays(task: Task, from = new Date()): number | null {
  const limit = STALE_AFTER_DAYS[task.status]
  if (limit === undefined) return null
  const days = daysSince(task.statusSince, from)
  return days !== null && days >= limit ? days : null
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
  /** Open tasks that have not moved for too long — see `staleDays`. */
  stale: number
  /** 0–100. */
  percent: number
  /** Lowest (= most urgent) DEFCON level among open tasks, or null. */
  topDefcon: Defcon | null
}

export function projectStats(tasks: Task[], projectId: string, from = new Date()): ProjectStats {
  const today = todayISO(from)
  let total = 0
  let done = 0
  let doing = 0
  let blocked = 0
  let hot = 0
  let overdue = 0
  let stale = 0
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
    if (staleDays(task, from) !== null) stale += 1
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
    stale,
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

/**
 * A board to look at on the first run. Task titles follow the interface
 * language; the project names are the same either way.
 */
export function createDemoData(lang: Lang): BoardData {
  const today = new Date()
  const inDays = (n: number) =>
    todayISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n))
  /** Backdates `statusSince` so the demo board also shows the aging chips. */
  const daysAgo = (n: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - n, 9).toISOString()
  const { tasks: titles, descriptions, steps: stepTexts } = getDict(lang).demo

  /** `[status, title, defcon, due, days in that status, [step, done][]]` */
  const specs: Array<{
    name: string
    description: string
    deadline: string | null
    tasks: Array<[Status, string, Defcon, string | null, number?, Array<[string, boolean]>?]>
  }> = [
    {
      name: 'Migration Cloud',
      description: descriptions.cloud,
      deadline: inDays(21),
      tasks: [
        ['doing', titles.terraform, 2, inDays(2), 1],
        ['blocked', titles.firewall, 1, inDays(-1), 6],
        [
          'todo',
          titles.runbook,
          4,
          inDays(9),
          0,
          [
            [stepTexts.sketchFlow, true],
            [stepTexts.describeRollback, false],
            [stepTexts.reviewWithOps, false],
          ],
        ],
        ['backlog', titles.costs, 5, null],
        [
          'done',
          titles.landingZone,
          3,
          null,
          0,
          [
            [stepTexts.accountsCreated, true],
            [stepTexts.guardrailsActive, true],
          ],
        ],
      ],
    },
    {
      name: 'Reporting Q4',
      description: descriptions.reporting,
      deadline: inDays(5),
      tasks: [
        ['doing', titles.metrics, 2, inDays(1), 4],
        ['todo', titles.dashboard, 3, inDays(3)],
        ['done', titles.sources, 4, null],
      ],
    },
    {
      name: 'Onboarding Tool',
      description: descriptions.onboarding,
      deadline: inDays(60),
      tasks: [
        ['backlog', titles.requirements, 5, null],
        ['todo', titles.prototype, 4, inDays(14)],
      ],
    },
  ]

  const projects: Project[] = []
  const tasks: Task[] = []

  specs.forEach((spec, index) => {
    const project = createProject(spec.name, index, index)
    project.description = spec.description
    project.deadline = spec.deadline
    projects.push(project)

    const perStatus = new Map<Status, number>()
    for (const [status, title, defcon, due, sinceDays = 0, steps = []] of spec.tasks) {
      const order = perStatus.get(status) ?? 0
      perStatus.set(status, order + 1)
      const task = createTask(project.id, status, title, order, { defcon, due })
      tasks.push({
        ...task,
        statusSince: sinceDays > 0 ? daysAgo(sinceDays) : task.statusSince,
        checklist: steps.map(([text, done]) => ({ ...createChecklistItem(text), done })),
      })
    }
  })

  return { projects, tasks }
}
