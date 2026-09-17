import { useState } from 'react'
import { PROJECT_COLORS } from '../constants'
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
      title={project ? 'Projekt bearbeiten' : 'Neues Projekt'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn primary" onClick={submit}>
            {project ? 'Speichern' : 'Anlegen'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
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
                  {taskCount > 0 ? `${taskCount} Tasks mitlöschen?` : 'Wirklich löschen?'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Löschen
                </button>
              )}
            </>
          )}
        </>
      }
    >
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="project-name">Projektname</label>
          <input
            id="project-name"
            type="text"
            value={name}
            placeholder="z. B. Migration Cloud"
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
          <label htmlFor="project-deadline">Deadline</label>
          <input
            id="project-deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <div className="date-quick">
            <button type="button" className="btn sm" onClick={() => setDeadline(shiftedToday(7))}>
              +1 Woche
            </button>
            <button type="button" className="btn sm" onClick={() => setDeadline(shiftedToday(30))}>
              +1 Monat
            </button>
            <button type="button" className="btn sm" onClick={() => setDeadline(shiftedToday(90))}>
              +1 Quartal
            </button>
            <button type="button" className="btn sm" onClick={() => setDeadline('')}>
              leeren
            </button>
          </div>
        </div>

        <div className="field">
          <label>Farbe</label>
          <div className="swatches">
            {PROJECT_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className="swatch"
                style={{ background: value }}
                aria-pressed={color === value}
                aria-label={`Farbe ${value}`}
                onClick={() => setColor(value)}
              />
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
