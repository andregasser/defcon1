import { DEFCON_BY_LEVEL, STATUS_BY_ID } from '../constants'
import { staleDays } from '../lib/board'
import { vars } from '../lib/css'
import { dateTone, formatDateShort } from '../lib/date'
import type { TodaySection } from '../lib/today'
import type { Project, Status, Task } from '../types'
import { DefconBadge } from './DefconBadge'

interface Props {
  /** Already grouped and sorted — see `todayList`. */
  sections: TodaySection[]
  projectsById: Map<string, Project>
  selectedId: string | null
  /** True while a project focus is active, so the list can say so. */
  focused: boolean
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}

const STATUS_TONE: Partial<Record<Status, string>> = {
  doing: 'doing',
  blocked: 'blocked',
}

/**
 * One flat list across every swimlane, for the question the board itself cannot
 * answer: what do I have to touch today? The board is organised by project, this
 * is organised by pressure.
 *
 * Selection is shared with the board, so the usual keys (1–5, e, x, ⌫) work on
 * whatever is highlighted here.
 */
export function TodayView({ sections, projectsById, selectedId, focused, onSelect, onOpen }: Props) {
  if (sections.length === 0) {
    return (
      <div className="today-empty">
        <p>
          Nichts überfällig, nichts heute fällig, nichts in Arbeit, nichts auf DEFCON 1–2.
          {focused && ' — im aktuellen Projektfokus.'}
        </p>
        <span className="micro">Zurück zum Board mit t oder Escape</span>
      </div>
    )
  }

  return (
    <div className="today">
      {sections.map((section) => (
        <section key={section.id} className="today-group">
          <div className="today-head">
            <span className="today-label" data-section={section.id}>
              {section.label}
            </span>
            <span className="micro">{section.hint}</span>
            <span className="spacer" />
            <span className="count">{section.tasks.length}</span>
          </div>

          {section.tasks.map((task) => (
            <TodayRow
              key={task.id}
              task={task}
              project={projectsById.get(task.projectId)}
              selected={task.id === selectedId}
              onSelect={onSelect}
              onOpen={onOpen}
            />
          ))}
        </section>
      ))}

      <span className="micro today-foot">
        Klick markiert · Doppelklick öffnet · 1–5 verschiebt · x auf Done · t zurück zum Board
      </span>
    </div>
  )
}

interface RowProps {
  task: Task
  project: Project | undefined
  selected: boolean
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}

function TodayRow({ task, project, selected, onSelect, onOpen }: RowProps) {
  const dueTone = dateTone(task.due, 3)
  const stale = staleDays(task)
  const status = STATUS_BY_ID[task.status]

  return (
    <article
      className="today-row"
      data-selected={selected}
      style={vars({
        '--dc-color': DEFCON_BY_LEVEL[task.defcon].color,
        '--row-color': project?.color ?? 'var(--line-3)',
      })}
      onClick={() => onSelect(task.id)}
      onDoubleClick={() => onOpen(task.id)}
      title={task.note ? `${task.title}\n\n${task.note}` : task.title}
    >
      <DefconBadge level={task.defcon} />
      <span className="today-title">{task.title}</span>

      {task.due && (
        <span className="due" data-tone={dueTone}>
          <span aria-hidden="true">{dueTone === 'overdue' ? '▲' : '◷'}</span>
          {formatDateShort(task.due)}
        </span>
      )}

      {stale !== null && (
        <span className="stale" title={`Liegt seit ${stale} Tagen unverändert in "${status.label}"`}>
          <span aria-hidden="true">◴</span>
          {stale} T
        </span>
      )}

      <span className="badge" data-tone={STATUS_TONE[task.status] ?? 'muted'}>
        {status.label}
      </span>

      <span className="today-project" title={project?.name}>
        <span className="today-dot" aria-hidden="true" />
        {project?.name ?? '—'}
      </span>
    </article>
  )
}
