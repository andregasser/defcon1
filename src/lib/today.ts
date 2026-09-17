import { HOT_DEFCONS } from '../constants'
import type { Task } from '../types'
import { todayISO } from './date'

export type TodaySectionId = 'overdue' | 'today' | 'doing' | 'hot'

export interface TodaySection {
  id: TodaySectionId
  label: string
  hint: string
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

  return [
    { id: 'overdue' as const, label: 'Überfällig', hint: 'Termin verstrichen', tasks: overdue },
    { id: 'today' as const, label: 'Heute fällig', hint: 'heute abgeben', tasks: dueToday },
    { id: 'doing' as const, label: 'In Arbeit', hint: 'läuft gerade', tasks: doing },
    { id: 'hot' as const, label: 'Brennt', hint: 'DEFCON 1–2, nicht in Arbeit', tasks: hot },
  ].filter((section) => section.tasks.length > 0)
}

export function todayCount(sections: TodaySection[]): number {
  return sections.reduce((sum, section) => sum + section.tasks.length, 0)
}
