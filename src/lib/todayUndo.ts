import type { Task } from '../types'

export interface TodayUndo {
  taskId: string
  before: Partial<Task>
  after: Partial<Task>
}

function sameField(left: Task[keyof Task] | undefined, right: Task[keyof Task] | undefined): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => {
      const other = right[index]
      return item.id === other.id && item.text === other.text && item.done === other.done
    })
  }
  return left === right
}

export function makeTodayUndo(before: Task, after: Task): TodayUndo | null {
  const keys = (Object.keys(before) as (keyof Task)[]).filter((key) => (
    key !== 'order' && !sameField(before[key], after[key])
  ))
  if (keys.length === 0) return null
  return {
    taskId: before.id,
    before: Object.fromEntries(keys.map((key) => [key, before[key]])),
    after: Object.fromEntries(keys.map((key) => [key, after[key]])),
  }
}

export function todayUndoPatch(current: Task | undefined, undo: TodayUndo): Partial<Task> | null {
  if (!current || current.id !== undo.taskId) return null
  const keys = Object.keys(undo.after) as (keyof Task)[]
  if (!keys.every((key) => sameField(current[key], undo.after[key]))) return null
  // Cell order belongs to the move operation, not to the saved task fields.
  return Object.fromEntries(keys.filter((key) => key !== 'order').map((key) => [key, undo.before[key]]))
}
