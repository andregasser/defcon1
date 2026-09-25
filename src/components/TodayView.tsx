import { useLayoutEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { formatDate } from '../lib/date'
import { buildTodayWorkspace } from '../lib/today'
import type { Defcon, Project, Task } from '../types'
import { TodayTaskRow } from './TodayTaskRow'

type Filter = 'all' | 'due' | 'overdue' | 'completed'
interface Props {
  tasks: Task[]
  projects: Project[]
  focusedIds: Set<string>
  day: string
  focusTaskId: string | null
  focusRequest: { id: string } | null
  selectedId: string | null
  query: string
  defconFilter: Set<Defcon>
  message: string | null
  canUndo: boolean
  onUndo: () => void
  onResetFilters: () => void
  onToggleProject: (id: string) => void
  onClearProjects: () => void
  onSelect: (id: string) => void
  onOpen: (id: string) => void
  onFocusTask: (id: string | null) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
}

export function TodayView({ tasks, projects, focusedIds, day, focusTaskId, focusRequest, selectedId, query, defconFilter, message, canUndo, onUndo, onResetFilters, onToggleProject, onClearProjects, onSelect, onOpen, onFocusTask, onUpdate }: Props) {
  const t = useT()
  const lang = useLang()
  const [filter, setFilter] = useState<Filter>('all')
  const [choosing, setChoosing] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const previousRows = useRef<string[]>([])
  const lastFocused = useRef<string | null>(null)
  const handledRequest = useRef<Props['focusRequest']>(null)
  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const scoped = tasks.filter((task) => focusedIds.size === 0 || focusedIds.has(task.projectId))
  const workspace = buildTodayWorkspace(scoped, day)
  const activeTasks = scoped.filter((task) => task.status !== 'done')
  const counts = {
    due: activeTasks.filter((task) => task.due === day).length,
    overdue: activeTasks.filter((task) => task.due !== null && task.due < day).length,
    completed: workspace.completed.length,
  }
  const matches = (task: Task) => {
    const needle = query.trim().toLocaleLowerCase()
    const haystack = [task.title, task.note, task.blockedReason, projectMap.get(task.projectId)?.name ?? '', ...task.checklist.map((step) => step.text)].join(' ').toLocaleLowerCase()
    return (!needle || haystack.includes(needle)) && (!defconFilter.size || defconFilter.has(task.defcon)) &&
      (filter === 'all' || (filter === 'due' && task.status !== 'done' && task.due === day) ||
        (filter === 'overdue' && task.status !== 'done' && task.due !== null && task.due < day) ||
        (filter === 'completed' && workspace.completed.some((item) => item.id === task.id)))
  }
  const focusTask = scoped.find((task) => task.id === focusTaskId && task.status !== 'done' && task.status !== 'blocked' && matches(task))
  const groups = [workspace.planned, workspace.attention, workspace.waiting]
  const next = [...workspace.planned, ...workspace.attention].find((task) => task.status !== 'blocked' && matches(task))
  const hasFilters = filter !== 'all' || query.trim() !== '' || defconFilter.size > 0
  const visibleRows = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-today-task]') ?? [])
    .filter((row) => !row.closest('details:not([open])'))

  useLayoutEffect(() => {
    const rows = visibleRows()
    if (focusRequest && focusRequest !== handledRequest.current) {
      handledRequest.current = focusRequest
      const target = rows.find((row) => row.dataset.todayTask === focusRequest.id)
      if (target) target.focus()
      else rootRef.current?.querySelector<HTMLButtonElement>('.today-choose')?.focus()
    }
    const id = lastFocused.current
    // Regrouping can remove the focused row (completion) or remount it (planning).
    // Restore a useful location only when that operation actually lost DOM focus.
    if (id && document.activeElement === document.body) {
      const same = rows.find((row) => row.dataset.todayTask === id)
      const index = previousRows.current.indexOf(id)
      const target = same ?? rows[Math.min(Math.max(index, 0), rows.length - 1)]
      if (target) target.focus()
      else rootRef.current?.querySelector<HTMLButtonElement>('.today-choose')?.focus()
    }
    previousRows.current = rows.map((row) => row.dataset.todayTask!)
  })

  const renderRow = (task: Task, focused = false) => <TodayTaskRow
    key={task.id} task={task} project={projectMap.get(task.projectId)} day={day}
    selected={task.id === selectedId} focused={focused} onSelect={onSelect} onOpen={onOpen}
    onFocusTask={onFocusTask} onUpdate={onUpdate}
  />
  const renderGroup = (id: 'planned' | 'attention' | 'waiting', hint: string, all: Task[]) => {
    const rows = all.filter((task) => task.id !== focusTask?.id && matches(task))
    if (!rows.length && id !== 'planned') return null
    return <section className="today-group" aria-label={t.today[id]} key={id}>
      <div className="today-head"><h2 className="today-label">{t.today[id]}</h2><span className="today-group-count">{rows.length}</span></div>
      <p className="today-section-hint">{hint}</p>
      {rows.length ? rows.map((task) => renderRow(task)) : <p className="today-placeholder">{hasFilters ? t.today.noMatches : t.today.plannedEmpty}</p>}
    </section>
  }
  const completed = workspace.completed.filter(matches)
  const available = workspace.available.filter((task) => task.id !== focusTask?.id && matches(task))

  return (
    <div className="today" ref={rootRef}
      onFocusCapture={(event) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>('[data-today-task]')
        lastFocused.current = row?.dataset.todayTask ?? null
      }}
      onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !(event.target instanceof HTMLElement) || !event.target.matches('[data-today-task]')) return
        event.preventDefault()
        event.stopPropagation()
        const rows = visibleRows()
        const index = rows.indexOf(event.target)
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1)
        rows[Math.max(0, Math.min(rows.length - 1, nextIndex))]?.focus()
      }}>
      <header className="today-header">
        <div><p className="today-eyebrow">{t.today.date(formatDate(day, lang))}</p><h1>{t.today.heading}</h1>{workspace.planTotal === 0 && <p>{t.today.intro}</p>}</div>
        <details className="today-project-picker">
          <summary>{focusedIds.size ? t.today.projectCount(focusedIds.size) : t.today.allProjects}</summary>
          <div role="group" aria-label={t.today.projects}>
            <button type="button" className="btn sm" aria-pressed={!focusedIds.size} onClick={onClearProjects}>{t.today.allProjects}</button>
            {projects.map((project) => <button key={project.id} type="button" className="btn sm" aria-pressed={focusedIds.has(project.id)} onClick={() => onToggleProject(project.id)}>{project.name}</button>)}
          </div>
        </details>
      </header>
      <div className="today-summary" role="group" aria-label={t.today.all}>
        {(['due', 'overdue', 'completed'] as const).map((key) => <button type="button" key={key} aria-pressed={filter === key}
          onClick={() => { setFilter((value) => value === key ? 'all' : key); if (key === 'completed') setCompletedOpen(true) }}>
          <strong>{counts[key]}</strong><span>{key === 'due' ? t.today.dueToday : key === 'overdue' ? t.today.sections.overdue.label : t.today.completed}</span>
        </button>)}
      </div>
      <div className="today-plan-bar">
        <div><h2>{t.today.planTitle}</h2><p>{workspace.planTotal ? t.today.progress(workspace.planDone, workspace.planTotal) : t.today.noPlan}</p>
          <progress aria-label={t.today.planTitle} value={workspace.planDone} max={workspace.planTotal || 1} />
          {workspace.planTotal === 0 && <span>{t.today.planHint}</span>}</div>
        <button type="button" className="btn primary today-choose" aria-expanded={choosing} aria-controls="today-available" onClick={() => setChoosing((value) => !value)}>{choosing ? t.today.hideChooser : t.today.chooseTasks}</button>
      </div>
      <div className="today-notice" role="status" aria-live="polite">{message}<span className="spacer" />{canUndo && <button type="button" className="btn sm" onClick={onUndo}>{t.today.undo}</button>}</div>
      {hasFilters && <div className="today-filter-note"><span>{t.today.filtersHint}</span><button type="button" className="btn sm" onClick={() => { setFilter('all'); onResetFilters() }}>{t.today.resetFilters}</button></div>}
      {filter !== 'completed' && <section className="today-focus" aria-label={t.today.focus}>
        <div className="today-head"><h2>{t.today.focus}</h2><span className="today-focus-symbol" aria-hidden="true">◎</span></div>
        {focusTask ? renderRow(focusTask, true) : <div className="today-focus-empty"><p>{t.today.focusEmpty}</p>{!next && <span>{t.today.focusHint}</span>}
          {next && <button type="button" className="today-next" onClick={() => onFocusTask(next.id)}><span>{t.today.next}</span><strong>{next.title}</strong><span aria-hidden="true">→</span></button>}
        </div>}
      </section>}
      {choosing && <section className="today-group today-available" id="today-available" aria-label={t.today.available}>
        <h2>{t.today.available}</h2>{available.length ? available.map((task) => renderRow(task)) : <p>{hasFilters ? t.today.noMatches : t.today.availableEmpty}</p>}
      </section>}
      {filter !== 'completed' && <div className="today-work">
        {renderGroup('planned', t.today.plannedHint, groups[0])}
        {renderGroup('attention', t.today.attentionHint, groups[1])}
        {renderGroup('waiting', t.today.waitingHint, groups[2])}
      </div>}
      <details className="today-completed" open={completedOpen} onToggle={(event) => setCompletedOpen(event.currentTarget.open)}>
        <summary>{t.today.completedCount(completed.length)}</summary>
        <div hidden={!completedOpen}>{completed.length ? completed.map((task) => renderRow(task)) : <p>{t.today.noMatches}</p>}</div>
      </details>
      <p className="today-foot">{t.today.keyboard}</p>
    </div>
  )
}
