import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useT } from '../i18n'
import { cellId } from '../lib/board'
import type { Status, Task } from '../types'
import { QuickAdd } from './QuickAdd'
import { TaskCard } from './TaskCard'

interface Props {
  projectId: string
  status: Status
  /** Already filtered and sorted — exactly what should be visible here. */
  tasks: Task[]
  /** Actual number of tasks in this cell, including ones hidden by filters. */
  totalCount: number
  /** Done column in its narrow state: count only, but still a drop target. */
  narrow: boolean
  selectedId: string | null
  quickAddOpen: boolean
  onQuickAddOpen: (cell: string | null) => void
  onQuickAdd: (projectId: string, status: Status, text: string) => void
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}

export function Cell({
  projectId,
  status,
  tasks,
  totalCount,
  narrow,
  selectedId,
  quickAddOpen,
  onQuickAddOpen,
  onQuickAdd,
  onSelect,
  onOpen,
}: Props) {
  const t = useT()
  const id = cellId(projectId, status)
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'cell', projectId, status } })
  const ids = useMemo(() => tasks.map((task) => task.id), [tasks])
  const hidden = totalCount - tasks.length

  if (narrow) {
    return (
      <div ref={setNodeRef} className="cell" data-status={status} data-over={isOver}>
        <span className="count" title={t.cell.narrowTitle(tasks.length, totalCount)}>
          {tasks.length}
        </span>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="cell" data-status={status} data-over={isOver} data-empty={tasks.length === 0 && hidden === 0}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={task.id === selectedId}
            onSelect={onSelect}
            onOpen={onOpen}
          />
        ))}
      </SortableContext>

      {hidden > 0 && (
        <div className="quick-add-hint" title={t.cell.hiddenTitle}>
          {t.cell.hidden(hidden)}
        </div>
      )}

      {quickAddOpen ? (
        <QuickAdd
          onSubmit={(text) => onQuickAdd(projectId, status, text)}
          onClose={() => onQuickAddOpen(null)}
        />
      ) : (
        <>
          {tasks.length === 0 && hidden === 0 && <div className="cell-empty" />}
          <button
            type="button"
            className="cell-add"
            onClick={() => onQuickAddOpen(id)}
            title={t.cell.addTitle}
          >
            {tasks.length === 0 && hidden === 0 ? t.cell.addFirst : t.cell.add}
          </button>
        </>
      )}
    </div>
  )
}
