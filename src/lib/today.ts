import { HOT_DEFCONS } from '../constants'
import type { Task } from '../types'
import { todayISO } from './date'

export type TodaySectionId = 'overdue' | 'today' | 'doing' | 'hot'

export interface TodaySection {
  id: TodaySectionId
  tasks: Task[]
}

/** Nulls sort last: a task without a date is never more urgent than one with. */
function compareDue(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}

const byUrgency = (a: Task, b: Task) =>
  a.defcon - b.defcon || compareDue(a.due, b.due) || a.title.localeCompare(b.title, 'de')

/** Oldest date first — the task that has been late longest goes on top. */
const byDue = (a: Task, b: Task) => compareDue(a.due, b.due) || a.defcon - b.defcon

/**
 * The morning list: everything that wants attention today, across all projects,
 * in the order one would work through it.
 *
 * Every task appears exactly once, in the first section it qualifies for —
 * otherwise an overdue DEFCON 1 in progress would show up three times and the
 * count would stop meaning anything.
 */
export function todayList(tasks: Task[], from = new Date()): TodaySection[] {
  const today = todayISO(from)

  const overdue: Task[] = []
  const dueToday: Task[] = []
  const doing: Task[] = []
  const hot: Task[] = []

  for (const task of tasks) {
    if (task.status === 'done') continue
    if (task.due && task.due < today) overdue.push(task)
    else if (task.due === today) dueToday.push(task)
    else if (task.status === 'doing') doing.push(task)
    else if (HOT_DEFCONS.includes(task.defcon)) hot.push(task)
  }

  overdue.sort(byDue)
  dueToday.sort(byUrgency)
  doing.sort(byUrgency)
  hot.sort(byUrgency)

  // Only the ids: the headings live in the dictionaries, so grouping stays a
  // pure function of the tasks and does not have to know the interface language.
  return [
    { id: 'overdue' as const, tasks: overdue },
    { id: 'today' as const, tasks: dueToday },
    { id: 'doing' as const, tasks: doing },
    { id: 'hot' as const, tasks: hot },
  ].filter((section) => section.tasks.length > 0)
}

export function todayCount(sections: TodaySection[]): number {
  return sections.reduce((sum, section) => sum + section.tasks.length, 0)
}

export interface TodayWorkspace {
  planned: Task[]
  attention: Task[]
  waiting: Task[]
  completed: Task[]
  available: Task[]
  planTotal: number
  planDone: number
}

const byWorkspaceUrgency = (a: Task, b: Task): number =>
  a.defcon - b.defcon || compareDue(a.due, b.due) || a.order - b.order ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Plans are deliberate commitments, independent of due dates. Blocked work
 * always stays in waiting so urgency cannot make the same task appear twice.
 */
export function buildTodayWorkspace(tasks: Task[], day: string): TodayWorkspace {
  const result: TodayWorkspace = {
    planned: [], attention: [], waiting: [], completed: [], available: [],
    planTotal: 0, planDone: 0,
  }
  for (const task of tasks) {
    if (task.plannedFor === day) {
      result.planTotal += 1
      if (task.status === 'done') result.planDone += 1
    }
    if (task.status === 'done') {
      if (task.doneAt && todayISO(new Date(task.doneAt)) === day) result.completed.push(task)
    } else if (task.status === 'blocked') result.waiting.push(task)
    else if (task.plannedFor === day) result.planned.push(task)
    else if (
      (task.due !== null && task.due <= day) || task.defcon <= 2 ||
      task.status === 'doing' || (task.reviewOn !== null && task.reviewOn <= day)
    ) result.attention.push(task)
    else result.available.push(task)
  }
  for (const group of [result.planned, result.attention, result.waiting, result.available]) {
    group.sort(byWorkspaceUrgency)
  }
  result.completed.sort((a, b) =>
    new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime() || byWorkspaceUrgency(a, b),
  )
  return result
}
