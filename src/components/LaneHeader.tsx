import { useT } from '../i18n'
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
  const t = useT()

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
          title={collapsed ? t.lane.expand : t.lane.collapse}
          aria-expanded={!collapsed}
        >
          {collapsed ? '▸' : '▾'}
        </button>

        <button
          type="button"
          className="lane-name"
          onClick={() => onSolo(project.id)}
          title={focused ? t.lane.unfocus : t.lane.solo(project.name)}
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
                title={t.lane.up}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn icon"
                onClick={() => onMove(project.id, 1)}
                title={t.lane.down}
              >
                ↓
              </button>
            </>
          )}
          <button
            type="button"
            className="btn icon"
            onClick={() => onEdit(project.id)}
            title={t.lane.edit}
          >
            ✎
          </button>
        </div>
      </div>

      <DeadlineChip deadline={project.deadline} />

      {!collapsed && (
        <>
          <div className="lane-meter-wrap">
            <div className="meter" title={t.lane.meterTitle(stats.done, stats.total)}>
              <div
                className="meter-fill"
                style={{ ...vars({ '--meter-color': project.color }), width: `${stats.percent}%` }}
              />
            </div>
          </div>
          <div className="lane-meta">
            <span className="micro">{t.lane.meta(stats.open, stats.percent)}</span>
          </div>
          {(stats.hot > 0 || stats.blocked > 0 || stats.overdue > 0) && (
            <div className="lane-badges">
              {stats.hot > 0 && (
                <span className="badge" data-tone="hot" title={t.lane.hotTitle}>
                  ▲ {stats.hot}
                </span>
              )}
              {stats.blocked > 0 && (
                <span className="badge" data-tone="blocked" title={t.lane.blockedTitle}>
                  ⏸ {stats.blocked}
                </span>
              )}
              {stats.overdue > 0 && (
                <span className="badge" data-tone="hot" title={t.lane.overdueTitle}>
                  ◷ {stats.overdue}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
