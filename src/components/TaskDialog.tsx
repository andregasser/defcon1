import { useState } from 'react'
import { DEFCONS, STATUSES } from '../constants'
import { useT } from '../i18n'
import { checklistProgress, createChecklistItem } from '../lib/board'
import { vars } from '../lib/css'
import { todayISO } from '../lib/date'
import type { ChecklistItem, Defcon, Project, Status, Task } from '../types'
import { DefconBadge } from './DefconBadge'
import { Dialog } from './Dialog'

interface Props {
  task: Task
  projects: Project[]
  onSave: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function shiftedToday(days: number): string {
  const now = new Date()
  return todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

export function TaskDialog({ task, projects, onSave, onDelete, onClose }: Props) {
  const t = useT()
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [defcon, setDefcon] = useState<Defcon>(task.defcon)
  const [due, setDue] = useState(task.due ?? '')
  const [projectId, setProjectId] = useState(task.projectId)
  const [status, setStatus] = useState<Status>(task.status)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist)
  const [draft, setDraft] = useState('')
  const [plannedFor, setPlannedFor] = useState(task.plannedFor ?? '')
  const [reviewOn, setReviewOn] = useState(task.reviewOn ?? '')
  const [blockedReason, setBlockedReason] = useState(task.blockedReason ?? '')

  const progress = checklistProgress({ ...task, checklist })

  const addDraft = () => {
    const text = draft.trim()
    if (text === '') return
    setChecklist((current) => [...current, createChecklistItem(text)])
    setDraft('')
  }

  const patchItem = (id: string, patch: Partial<ChecklistItem>) => {
    setChecklist((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const submit = () => {
    const trimmed = title.trim()
    if (trimmed === '') return
    // A step still sitting in the add field counts: nobody types it in order to
    // throw it away. Emptied steps are dropped instead of saved as blank rows.
    const pending = draft.trim()
    const steps = [...checklist, ...(pending === '' ? [] : [createChecklistItem(pending)])]
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text !== '')

    onSave(task.id, {
      title: trimmed,
      note: note.trim(),
      defcon,
      due: due === '' ? null : due,
      projectId,
      status,
      checklist: steps,
      plannedFor: plannedFor || null,
      reviewOn: reviewOn || null,
      blockedReason: blockedReason.trim(),
    })
    onClose()
  }

  return (
    <Dialog
      title={t.taskDialog.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn primary" onClick={submit}>
            {t.actions.save}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {t.actions.cancel}
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              onDelete(task.id)
              onClose()
            }}
            title={t.taskDialog.deleteTitle}
          >
            {t.actions.delete}
          </button>
        </>
      }
    >
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="task-title">{t.taskDialog.titleLabel}</label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
          />
        </div>

        <div className="field">
          <label>{t.taskDialog.defconLabel}</label>
          <div className="dc-picker">
            {DEFCONS.map((meta) => (
              <button
                key={meta.level}
                type="button"
                className="dc-option"
                aria-pressed={defcon === meta.level}
                style={vars({ '--dc-color': meta.color })}
                onClick={() => setDefcon(meta.level)}
                title={meta.code}
              >
                <DefconBadge level={meta.level} />
                <span>{t.defcon.label[meta.level]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-project">{t.taskDialog.projectLabel}</label>
            <select
              id="task-project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-status">{t.taskDialog.statusLabel}</label>
            <select
              id="task-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Status)}
            >
              {STATUSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-due">{t.taskDialog.dueLabel}</label>
          <input
            id="task-due"
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
          <div className="date-quick">
            <button type="button" className="btn sm" onClick={() => setDue(shiftedToday(0))}>
              {t.taskDialog.dueToday}
            </button>
            <button type="button" className="btn sm" onClick={() => setDue(shiftedToday(1))}>
              {t.taskDialog.dueTomorrow}
            </button>
            <button type="button" className="btn sm" onClick={() => setDue(shiftedToday(7))}>
              {t.taskDialog.dueWeek}
            </button>
            <button type="button" className="btn sm" onClick={() => setDue('')}>
              {t.actions.clearDate}
            </button>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-planned">{t.taskDialog.plannedFor}</label>
            <input id="task-planned" type="date" value={plannedFor} onChange={(event) => setPlannedFor(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="task-review">{t.taskDialog.reviewOn}</label>
            <input id="task-review" type="date" value={reviewOn} onChange={(event) => setReviewOn(event.target.value)} />
          </div>
        </div>
        <p className="task-planning-hint">{t.taskDialog.planningHint}</p>
        {(status === 'blocked' || blockedReason !== '') && (
          <div className="field">
            <label htmlFor="task-blocker">{t.taskDialog.blockedReason}</label>
            <textarea id="task-blocker" rows={2} value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} />
          </div>
        )}

        <div className="field">
          <label htmlFor="task-check-add">
            {t.taskDialog.checklistLabel}
            {progress && (
              <span className="check-progress">
                {progress.done}/{progress.total} · {progress.percent}%
              </span>
            )}
          </label>

          {checklist.length > 0 && (
            <ul className="check-list">
              {checklist.map((item, index) => (
                <li key={item.id} className="check-item" data-done={item.done}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    aria-label={t.taskDialog.checkToggle(item.text)}
                    onChange={(event) => patchItem(item.id, { done: event.target.checked })}
                  />
                  <input
                    type="text"
                    value={item.text}
                    aria-label={t.taskDialog.checkStep(index + 1)}
                    onChange={(event) => patchItem(item.id, { text: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.preventDefault()
                    }}
                  />
                  <button
                    type="button"
                    className="btn icon sm"
                    onClick={() => setChecklist((c) => c.filter((other) => other.id !== item.id))}
                    title={t.taskDialog.checkRemove}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="check-add">
            <input
              id="task-check-add"
              type="text"
              value={draft}
              placeholder={t.taskDialog.checkAddPlaceholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter keeps the field open for the next step instead of saving
                // the task: a checklist is usually written in one go.
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addDraft()
                }
              }}
            />
            <button type="button" className="btn sm" onClick={addDraft}>
              {t.taskDialog.checkAdd}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-note">{t.taskDialog.noteLabel}</label>
          <textarea
            id="task-note"
            value={note}
            placeholder={t.taskDialog.notePlaceholder}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                submit()
              }
            }}
          />
        </div>
      </div>
    </Dialog>
  )
}
