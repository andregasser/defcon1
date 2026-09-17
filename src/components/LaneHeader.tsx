import { vars } from '../lib/css'
import type { ProjectStats } from '../lib/board'
import type { LaneSort, Project } from '../types'
import { DeadlineChip } from './DeadlineChip'

interface Props {
  project: Project
  stats: ProjectStats
  collapsed: boolean
  focused: boolean
  dimmed: boolean
  laneSort: LaneSort
  onToggleCollapsed: (projectId: string) => void
  onSolo: (projectId: string) => void
  onEdit: (projectId: string) => void
  onMove: (projectId: string, delta: number) => void
}

export function LaneHeader({
  project,
  stats,
  collapsed,
  focused,
  dimmed,
  laneSort,
  onToggleCollapsed,
  onSolo,
  onEdit,
  onMove,
}: Props) {
  return (
    <div
      className="lane-head"
      data-dimmed={dimmed}
      style={vars({ '--lane-color': project.color })}
    >
      <div className="lane-top">
        <button
          type="button"
          className="btn icon"
          onClick={() => onToggleCollapsed(project.id)}
          title={collapsed ? 'Swimlane aufklappen' : 'Swimlane einklappen'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '▸' : '▾'}
        </button>

        <button
          type="button"
          className="lane-name"
          onClick={() => onSolo(project.id)}
          title={focused ? 'Fokus aufheben' : `Nur "${project.name}" anzeigen`}
        >
          {project.name}
        </button>

        <div className="lane-actions">
          {laneSort === 'manual' && (
            <>
              <button
                type="button"
                className="btn icon"
                onClick={() => onMove(project.id, -1)}
                title="Nach oben"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn icon"
                onClick={() => onMove(project.id, 1)}
                title="Nach unten"
              >
                ↓
              </button>
            </>
          )}
          <button
            type="button"
            className="btn icon"
            onClick={() => onEdit(project.id)}
            title="Projekt bearbeiten"
          >
            ✎
          </button>
        </div>
      </div>

      <DeadlineChip deadline={project.deadline} />

      {!collapsed && (
        <>
          <div className="lane-meter-wrap">
            <div className="meter" title={`${stats.done} von ${stats.total} erledigt`}>
              <div
                className="meter-fill"
                style={{ ...vars({ '--meter-color': project.color }), width: `${stats.percent}%` }}
              />
            </div>
          </div>
          <div className="lane-meta">
            <span className="micro">
              {stats.open} offen · {stats.percent}%
            </span>
          </div>
          {(stats.hot > 0 || stats.blocked > 0 || stats.overdue > 0 || stats.stale > 0) && (
            <div className="lane-badges">
              {stats.hot > 0 && (
                <span className="badge" data-tone="hot" title="Offene Tasks auf DEFCON 1–2">
                  ▲ {stats.hot}
                </span>
              )}
              {stats.blocked > 0 && (
                <span className="badge" data-tone="blocked" title="Blockierte Tasks">
                  ⏸ {stats.blocked}
                </span>
              )}
              {stats.overdue > 0 && (
                <span className="badge" data-tone="hot" title="Tasks über dem Fälligkeitsdatum">
                  ◷ {stats.overdue}
                </span>
              )}
              {stats.stale > 0 && (
                <span
                  className="badge"
                  data-tone="stale"
                  title="Tasks, die zu lange unverändert in In Progress oder Blocked liegen"
                >
                  ◴ {stats.stale}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
