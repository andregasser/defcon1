import { useState } from 'react'
import { PROJECT_COLORS } from '../constants'
import { useT } from '../i18n'
import { todayISO } from '../lib/date'
import type { Project } from '../types'
import { Dialog } from './Dialog'

interface Props {
  /** null = create a new project. */
  project: Project | null
  /** Number of tasks in the project, shown before deleting. */
  taskCount: number
  onSave: (values: { name: string; deadline: string | null; color: string }) => void
  onDelete: () => void
  onClose: () => void
}

function shiftedToday(days: number): string {
  const now = new Date()
  return todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

export function ProjectDialog({ project, taskCount, onSave, onDelete, onClose }: Props) {
  const t = useT()
  const [name, setName] = useState(project?.name ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    onSave({ name: trimmed, deadline: deadline === '' ? null : deadline, color })
    onClose()
  }

  return (
    <Dialog
      title={project ? t.projectDialog.titleEdit : t.projectDialog.titleNew}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn primary" onClick={submit}>
            {project ? t.actions.save : t.actions.create}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {t.actions.cancel}
          </button>
          {project && (
            <>
              <span className="spacer" />
              {confirmDelete ? (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    onDelete()
                    onClose()
                  }}
                >
                  {taskCount > 0
                    ? t.projectDialog.confirmWithTasks(taskCount)
                    : t.projectDialog.confirmEmpty}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  {t.actions.delete}
                </button>
              )}
            </>
          )}
        </>
      }
    >
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="project-name">{t.projectDialog.nameLabel}</label>
          <input
            id="project-name"
            type="text"
            value={name}
            placeholder={t.projectDialog.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="project-deadline">{t.projectDialog.deadlineLabel}</label>
          <input
            id="project-deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <div className="date-quick">
            <button type="button" className="btn sm" onClick={() => setDeadline(shiftedToday(7))}>
              {t.projectDialog.plusWeek}
            </button>
            <button type="button" className="btn sm" onClick={() => setDeadline(shiftedToday(30))}>
              {t.projectDialog.plusMonth}
            </button>
            <button type="button" className="btn sm" onClick={() => setDeadline(shiftedToday(90))}>
              {t.projectDialog.plusQuarter}
            </button>
            <button type="button" className="btn sm" onClick={() => setDeadline('')}>
              {t.actions.clearDate}
            </button>
          </div>
        </div>

        <div className="field">
          <label>{t.projectDialog.colorLabel}</label>
          <div className="swatches">
            {PROJECT_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className="swatch"
                style={{ background: value }}
                aria-pressed={color === value}
                aria-label={t.projectDialog.colorSwatch(value)}
                onClick={() => setColor(value)}
              />
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
