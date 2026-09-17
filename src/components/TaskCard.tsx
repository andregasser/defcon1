import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DEFCON_BY_LEVEL } from '../constants'
import { useLang, useT } from '../i18n'
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
  const t = useT()
  const lang = useLang()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', projectId: task.projectId, status: task.status },
  })

  const dueTone = dateTone(task.due, 3)

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
        {(task.due || task.note) && (
          <div className="card-meta">
            {task.due && (
              <span className="due" data-tone={dueTone}>
                <span aria-hidden="true">{dueTone === 'overdue' ? '▲' : '◷'}</span>
                {formatDateShort(task.due, lang)}
              </span>
            )}
            {task.note && (
              <span className="note-dot" title={t.card.noteTitle}>
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
