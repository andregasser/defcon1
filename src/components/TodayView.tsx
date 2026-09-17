import { DEFCON_BY_LEVEL, STATUS_BY_ID } from '../constants'
import { useLang, useT } from '../i18n'
import { checklistProgress, staleDays } from '../lib/board'
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
  const t = useT()

  if (sections.length === 0) {
    return (
      <div className="today-empty">
        <p>
          {t.today.empty}
          {focused && t.today.emptyFocused}
        </p>
        <span className="micro">{t.today.back}</span>
      </div>
    )
  }

  return (
    <div className="today">
      {sections.map((section) => (
        <section key={section.id} className="today-group">
          <div className="today-head">
            <span className="today-label" data-section={section.id}>
              {t.today.sections[section.id].label}
            </span>
            <span className="micro">{t.today.sections[section.id].hint}</span>
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

      <span className="micro today-foot">{t.today.foot}</span>
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
  const t = useT()
  const lang = useLang()
  const dueTone = dateTone(task.due, 3)
  const stale = staleDays(task)
  const steps = checklistProgress(task)
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

      {steps && (
        <span
          className="steps"
          data-complete={steps.done === steps.total}
          title={t.card.stepsTitle(steps.done, steps.total)}
        >
          <span aria-hidden="true">{steps.done === steps.total ? '☑' : '☐'}</span>
          {steps.done}/{steps.total}
        </span>
      )}

      {task.due && (
        <span className="due" data-tone={dueTone}>
          <span aria-hidden="true">{dueTone === 'overdue' ? '▲' : '◷'}</span>
          {formatDateShort(task.due, lang)}
        </span>
      )}

      {stale !== null && (
        <span className="stale" title={t.card.staleTitle(stale, status.label)}>
          <span aria-hidden="true">◴</span>
          {t.card.staleBadge(stale)}
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
