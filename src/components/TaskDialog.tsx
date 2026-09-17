import { useState } from 'react'
import { DEFCONS, STATUSES } from '../constants'
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
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [defcon, setDefcon] = useState<Defcon>(task.defcon)
  const [due, setDue] = useState(task.due ?? '')
  const [projectId, setProjectId] = useState(task.projectId)
  const [status, setStatus] = useState<Status>(task.status)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist)
  const [draft, setDraft] = useState('')

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
    })
    onClose()
  }

  return (
    <Dialog
      title="Task bearbeiten"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn primary" onClick={submit}>
            Speichern
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              onDelete(task.id)
              onClose()
            }}
            title="Task löschen"
          >
            Löschen
          </button>
        </>
      }
    >
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="task-title">Titel</label>
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
          <label>Defcon — Priorität</label>
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
                <span>{meta.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="task-project">Projekt</label>
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
            <label htmlFor="task-status">Status</label>
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
          <label htmlFor="task-due">Fällig am</label>
          <input
            id="task-due"
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
          <div className="date-quick">
            <button type="button" className="btn sm" onClick={() => setDue(shiftedToday(0))}>
              heute
            </button>
            <button type="button" className="btn sm" onClick={() => setDue(shiftedToday(1))}>
              morgen
            </button>
            <button type="button" className="btn sm" onClick={() => setDue(shiftedToday(7))}>
              +1 Woche
            </button>
            <button type="button" className="btn sm" onClick={() => setDue('')}>
              leeren
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-check-add">
            Checkliste
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
                    aria-label={`${item.text} abhaken`}
                    onChange={(event) => patchItem(item.id, { done: event.target.checked })}
                  />
                  <input
                    type="text"
                    value={item.text}
                    aria-label={`Schritt ${index + 1}`}
                    onChange={(event) => patchItem(item.id, { text: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.preventDefault()
                    }}
                  />
                  <button
                    type="button"
                    className="btn icon sm"
                    onClick={() => setChecklist((c) => c.filter((other) => other.id !== item.id))}
                    title="Schritt entfernen"
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
              placeholder="Schritt hinzufügen …"
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
              Hinzufügen
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-note">Notiz</label>
          <textarea
            id="task-note"
            value={note}
            placeholder="Kontext, Links, offene Fragen …"
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
