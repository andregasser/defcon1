import { useRef, useState } from 'react'
import { STATUSES } from '../constants'
import { useLang, useT } from '../i18n'
import { cellId, groupByCell, type ProjectStats } from '../lib/board'
import { vars } from '../lib/css'
import { formatDate } from '../lib/date'
import type { Project, Task } from '../types'
import { DefconBadge } from './DefconBadge'
import { Dialog } from './Dialog'

interface Props {
  projects: Project[]
  tasks: Task[]
  statsByProject: Map<string, ProjectStats>
  onRestore: (id: string) => void
  onClose: () => void
}

export function ArchiveDialog({ projects, tasks, statsByProject, onRestore, onClose }: Props) {
  const t = useT()
  const lang = useLang()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [restoredName, setRestoredName] = useState<string | null>(null)
  const listButtons = useRef(new Map<string, HTMLButtonElement>())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const project = projects.find((item) => item.id === projectId)
  const cells = groupByCell(project ? tasks.filter((task) => task.projectId === project.id) : [])

  return (
    <Dialog
      title={t.archive.title}
      onClose={onClose}
      wide
      footer={
        <>
          {project && (
            <button type="button" className="btn primary" onClick={() => {
              onRestore(project.id)
              setRestoredName(project.name)
              setProjectId(null)
              headingRef.current?.focus()
            }}>
              {t.archive.restore}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>{t.actions.close}</button>
        </>
      }
    >
      <div className="dialog-body archive-body">
        <h2 ref={headingRef} tabIndex={-1}>{project ? project.name : t.archive.title}</h2>
        <p className="archive-message" role="status">{restoredName && t.archive.restored(restoredName)}</p>
        {project ? (
          <>
            <button type="button" className="btn archive-back" onClick={() => {
              const previous = project.id
              setProjectId(null)
              // The list returns on the next render, before the next paint.
              requestAnimationFrame(() => listButtons.current.get(previous)?.focus())
            }}>{t.archive.back}</button>
            <p className="archive-meta">{t.archive.archivedOn(formatDate(project.archivedAt, lang))}</p>
            {project.description && <p className="archive-text">{project.description}</p>}
            {project.deadline && (
              <dl className="archive-dates">
                <div><dt>{t.projectDialog.deadlineLabel}</dt><dd>{formatDate(project.deadline, lang)}</dd></div>
              </dl>
            )}
            {cells.size === 0 && <p>{t.archive.noTasks}</p>}
            {STATUSES.map((status) => {
              const items = cells.get(cellId(project.id, status.id)) ?? []
              if (items.length === 0) return null
              return (
                <section className="archive-section" key={status.id} aria-label={status.label}>
                  <h3>{status.label} <span className="count">{items.length}</span></h3>
                  {items.map((task) => (
                    <article className="archive-task" key={task.id} aria-label={task.title}>
                      <div className="archive-task-head"><DefconBadge level={task.defcon} /><h4>{task.title}</h4></div>
                      <dl className="archive-dates">
                        {task.due && <div><dt>{t.taskDialog.dueLabel}</dt><dd>{formatDate(task.due, lang)}</dd></div>}
                        {task.plannedFor && <div><dt>{t.taskDialog.plannedFor}</dt><dd>{formatDate(task.plannedFor, lang)}</dd></div>}
                        {task.reviewOn && <div><dt>{t.taskDialog.reviewOn}</dt><dd>{formatDate(task.reviewOn, lang)}</dd></div>}
                      </dl>
                      {task.blockedReason && <div><h5>{t.taskDialog.blockedReason}</h5><p className="archive-text">{task.blockedReason}</p></div>}
                      {task.note && <div><h5>{t.taskDialog.noteLabel}</h5><p className="archive-text">{task.note}</p></div>}
                      {task.checklist.length > 0 && (
                        <div>
                          <h5>{t.taskDialog.checklistLabel}</h5>
                          <ul className="archive-checklist">
                            {task.checklist.map((item) => (
                              <li key={item.id}>
                                <span role="img" aria-label={item.done ? t.archive.stepDone : t.archive.stepOpen}>{item.done ? '☑' : '☐'}</span>
                                <span>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              )
            })}
          </>
        ) : (
          <>
            <p>{t.archive.intro}</p>
            {projects.length === 0 ? <p>{t.archive.empty}</p> : (
              <ul className="archive-list">
                {projects.map((item) => (
                  <li key={item.id} style={vars({ '--project-color': item.color })}>
                    <button
                      type="button"
                      className="archive-project"
                      aria-label={item.name}
                      ref={(node) => { if (node) listButtons.current.set(item.id, node); else listButtons.current.delete(item.id) }}
                      onClick={() => { setProjectId(item.id); setRestoredName(null); headingRef.current?.focus() }}
                    >
                      <span className="archive-name">{item.name}</span>
                      <span className="archive-meta">{t.archive.archivedOn(formatDate(item.archivedAt, lang))}</span>
                      <span className="archive-meta">{t.archive.taskCount(statsByProject.get(item.id)?.total ?? 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Dialog>
  )
}
