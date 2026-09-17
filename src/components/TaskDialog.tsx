import { useState } from 'react'
import { DEFCONS, STATUSES } from '../constants'
import { useT } from '../i18n'
import { vars } from '../lib/css'
import { todayISO } from '../lib/date'
import type { Defcon, Project, Status, Task } from '../types'
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

  const submit = () => {
    const trimmed = title.trim()
    if (trimmed === '') return
    onSave(task.id, {
      title: trimmed,
      note: note.trim(),
      defcon,
      due: due === '' ? null : due,
      projectId,
      status,
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
