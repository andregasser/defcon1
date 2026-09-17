import type { ProjectStats } from '../lib/board'
import { vars } from '../lib/css'
import type { Project } from '../types'
import { DeadlineChip } from './DeadlineChip'

interface Props {
  projects: Project[]
  statsByProject: Map<string, ProjectStats>
  focusedIds: Set<string>
  open: boolean
  onToggleOpen: () => void
  onToggleFocus: (projectId: string) => void
  onClearFocus: () => void
  onEditProject: (projectId: string) => void
  onNewProject: () => void
}

/**
 * The answer to "ten projects at once": a compact tile per project with its
 * deadline countdown, progress and trouble counters. Scan the deck to find out
 * *which* stream needs attention, then click it to filter the board down to it.
 */
export function CommandDeck({
  projects,
  statsByProject,
  focusedIds,
  open,
  onToggleOpen,
  onToggleFocus,
  onClearFocus,
  onEditProject,
  onNewProject,
}: Props) {
  const focusing = focusedIds.size > 0

  return (
    <section className="deck" aria-label="Projektübersicht">
      <div className="deck-head">
        <button
          type="button"
          className="btn icon"
          onClick={onToggleOpen}
          aria-expanded={open}
          title={open ? 'Übersicht einklappen' : 'Übersicht aufklappen'}
        >
          {open ? '▾' : '▸'}
        </button>
        <span className="micro">Übersicht · {projects.length} Projekte</span>
        <span className="spacer" />
        {focusing && (
          <button type="button" className="btn sm" onClick={onClearFocus}>
            Fokus aufheben ({focusedIds.size})
          </button>
        )}
        <button type="button" className="btn sm" onClick={onNewProject}>
          + Projekt
        </button>
      </div>

      {open && (
        <div className="deck-grid">
          {projects.map((project) => {
            const stats = statsByProject.get(project.id)
            if (!stats) return null
            const focused = focusedIds.has(project.id)

            return (
              <div
                key={project.id}
                className="tile"
                data-focused={focused}
                data-dimmed={focusing && !focused}
                style={vars({ '--tile-color': project.color })}
                role="button"
                tabIndex={0}
                aria-pressed={focused}
                title={
                  focused
                    ? 'Klick: aus dem Fokus nehmen'
                    : 'Klick: auf dieses Projekt fokussieren (mehrere möglich)'
                }
                onClick={() => onToggleFocus(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onToggleFocus(project.id)
                  }
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onEditProject(project.id)
                }}
              >
                <span className="tile-bar" />

                <div className="tile-top">
                  <span className="tile-name">{project.name}</span>
                  <span className="tile-pct">{stats.percent}%</span>
                </div>

                <div className="tile-body">
                  <DeadlineChip deadline={project.deadline} />
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        ...vars({ '--meter-color': project.color }),
                        width: `${stats.percent}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="tile-badges">
                  <span className="badge" data-tone="muted" title="Offene Tasks">
                    {stats.open} offen
                  </span>
                  {stats.doing > 0 && (
                    <span className="badge" data-tone="doing" title="In Progress">
                      ▸ {stats.doing}
                    </span>
                  )}
                  {stats.blocked > 0 && (
                    <span className="badge" data-tone="blocked" title="Blockiert">
                      ⏸ {stats.blocked}
                    </span>
                  )}
                  {stats.hot > 0 && (
                    <span className="badge" data-tone="hot" title="Offen auf DEFCON 1–2">
                      ▲ {stats.hot}
                    </span>
                  )}
                  {stats.overdue > 0 && (
                    <span className="badge" data-tone="hot" title="Überfällige Tasks">
                      ◷ {stats.overdue}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
