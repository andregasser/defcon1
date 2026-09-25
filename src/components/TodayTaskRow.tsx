import { useId, useState } from 'react'
import { DEFCONS, STATUS_BY_ID } from '../constants'
import { useLang, useT } from '../i18n'
import { daysUntil, formatDate, parseISODate } from '../lib/date'
import { vars } from '../lib/css'
import type { Defcon, Project, Task } from '../types'
import { DefconBadge } from './DefconBadge'

interface Props {
  task: Task
  project: Project | undefined
  day: string
  selected: boolean
  focused: boolean
  onSelect: (id: string) => void
  onOpen: (id: string) => void
  onFocusTask: (id: string | null) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
}

export function TodayTaskRow({ task, project, day, selected, focused, onSelect, onOpen, onFocusTask, onUpdate }: Props) {
  const t = useT()
  const lang = useLang()
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const done = task.status === 'done'
  const blocked = task.status === 'blocked'
  const overdue = task.due !== null && task.due < day && !done
  const dueDays = daysUntil(task.due, parseISODate(day) ?? new Date())
  const stepsDone = task.checklist.filter((step) => step.done).length

  return (
    <article
      className="today-row"
      aria-label={task.title}
      tabIndex={0}
      data-today-task={task.id}
      data-selected={selected}
      data-done={done}
      data-focus={focused}
      style={vars({ '--row-color': project?.color ?? 'var(--line-3)' })}
      onFocus={() => onSelect(task.id)}
      onClick={() => onSelect(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          event.preventDefault()
          event.stopPropagation()
          onOpen(task.id)
        }
      }}
    >
      <div className="today-task-top">
        <DefconBadge level={task.defcon} />
        <div className="today-task-heading">
          <span className="today-project"><span className="today-dot" aria-hidden="true" />{project?.name}</span>
          <h3 className="today-title">{task.title}</h3>
        </div>
        <span className="today-status">{STATUS_BY_ID[task.status].label}</span>
      </div>
      <div className="today-task-meta">
        {task.due && <span className={overdue ? 'today-warning' : ''}>
          {overdue ? t.today.overdueDays(Math.abs(dueDays ?? 0)) : task.due === day && !done
            ? t.today.dueToday : t.today.dueOn(formatDate(task.due, lang))}
        </span>}
        {!done && task.defcon <= 2 && <span className="today-warning">{t.today.critical}</span>}
        {!done && task.reviewOn && <span className={task.reviewOn <= day ? 'today-warning' : ''}>
          {task.reviewOn <= day ? t.today.reviewReady : t.today.reviewOn(formatDate(task.reviewOn, lang))}
        </span>}
        {!done && task.plannedFor && task.plannedFor < day && <span>{t.today.earlierPlan(formatDate(task.plannedFor, lang))}</span>}
      </div>
      {blocked && <p className="today-blocker">{task.blockedReason || t.today.noReason}</p>}
      <div className="today-task-actions">
        {!done && <>
          {!blocked && <button type="button" className="btn sm" aria-pressed={focused}
            onClick={() => onFocusTask(focused ? null : task.id)}>
            {focused ? t.today.clearFocus : t.today.focusTask}
          </button>}
          {task.status !== 'doing' && <button type="button" className="btn sm" onClick={() => onUpdate(task.id, { status: 'doing', reviewOn: null })}>
            {blocked ? t.today.resume : t.today.start}
          </button>}
          <button type="button" className="btn sm" aria-pressed={task.plannedFor === day}
            onClick={() => onUpdate(task.id, { plannedFor: task.plannedFor === day ? null : day })}>
            {task.plannedFor === day ? t.today.unplan : t.today.plan}
          </button>
        </>}
        <button type="button" className="btn sm today-complete" onClick={() => onUpdate(task.id, { status: done ? 'todo' : 'done' })}>
          <span aria-hidden="true">{done ? '↶' : '✓'}</span>{done ? t.today.reopen : t.today.done}
        </button>
        <button type="button" className="btn sm" onClick={() => onOpen(task.id)}>{t.today.details}</button>
        {!done && <label className="today-priority">
          <span className="sr-only">{t.today.priority}</span>
          <select aria-label={t.today.priority} value={task.defcon} onChange={(event) => onUpdate(task.id, { defcon: Number(event.target.value) as Defcon })}>
            {DEFCONS.map((meta) => <option key={meta.level} value={meta.level}>{t.defcon.badgeTitle(meta.level, meta.code, t.defcon.label[meta.level])}</option>)}
          </select>
        </label>}
        {task.checklist.length > 0 && !focused && <button type="button" className="btn sm" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)}>
          {t.today.checklistProgress(stepsDone, task.checklist.length)}
        </button>}
      </div>
      {task.checklist.length > 0 && <div id={detailsId} hidden={!focused && !expanded} className="today-checklist" role="group" aria-label={t.today.checklist}>
        {task.checklist.map((step) => <label key={step.id}>
          <input type="checkbox" checked={step.done} aria-label={t.taskDialog.checkToggle(step.text)}
            onChange={(event) => onUpdate(task.id, { checklist: task.checklist.map((item) => item.id === step.id ? { ...item, done: event.target.checked } : item) })} />
          <span>{step.text}</span>
        </label>)}
      </div>}
    </article>
  )
}
