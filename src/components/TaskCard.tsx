import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DEFCON_BY_LEVEL, STATUS_BY_ID } from '../constants'
import { checklistProgress, staleDays } from '../lib/board'
import { vars } from '../lib/css'
import { dateTone, formatDateShort } from '../lib/date'
import type { Task } from '../types'
import { DefconBadge } from './DefconBadge'

interface Props {
  task: Task
  selected: boolean
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}

/**
 * Memoised on purpose: a ten-project board can hold several hundred cards, and
 * every drag move re-renders the tree. Only the touched cards should re-paint.
 */
export const TaskCard = memo(function TaskCard({ task, selected, onSelect, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', projectId: task.projectId, status: task.status },
  })

  const dueTone = dateTone(task.due, 3)
  const stale = staleDays(task)
  const steps = checklistProgress(task)

  return (
    <article
      ref={setNodeRef}
      className="card"
      data-selected={selected}
      data-dragging={isDragging}
      data-done={task.status === 'done'}
      style={{
        ...vars({ '--dc-color': DEFCON_BY_LEVEL[task.defcon].color }),
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      onClick={() => onSelect(task.id)}
      onDoubleClick={() => onOpen(task.id)}
      title={task.note ? `${task.title}\n\n${task.note}` : task.title}
      {...attributes}
      {...listeners}
    >
      <DefconBadge level={task.defcon} />
      <div className="card-main">
        <div className="card-title">{task.title}</div>
        {(task.due || task.note || stale !== null || steps) && (
          <div className="card-meta">
            {steps && (
              <span
                className="steps"
                data-complete={steps.done === steps.total}
                title={`Checkliste: ${steps.done} von ${steps.total} Schritten erledigt`}
              >
                <span aria-hidden="true">{steps.done === steps.total ? '☑' : '☐'}</span>
                {steps.done}/{steps.total}
              </span>
            )}
            {task.due && (
              <span className="due" data-tone={dueTone}>
                <span aria-hidden="true">{dueTone === 'overdue' ? '▲' : '◷'}</span>
                {formatDateShort(task.due)}
              </span>
            )}
            {stale !== null && (
              <span
                className="stale"
                title={`Liegt seit ${stale} Tagen unverändert in "${STATUS_BY_ID[task.status].label}"`}
              >
                <span aria-hidden="true">◴</span>
                {stale} T
              </span>
            )}
            {task.note && (
              <span className="note-dot" title="Notiz vorhanden">
                ≡
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
})

/** Non-interactive twin rendered inside the DragOverlay. */
export function TaskCardPreview({ task }: { task: Task }) {
  return (
    <article
      className="card"
      style={vars({ '--dc-color': DEFCON_BY_LEVEL[task.defcon].color })}
    >
      <DefconBadge level={task.defcon} />
      <div className="card-main">
        <div className="card-title">{task.title}</div>
      </div>
    </article>
  )
}
