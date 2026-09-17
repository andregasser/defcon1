import { Fragment } from 'react'
import { STATUSES } from '../constants'
import { useT } from '../i18n'
import { cellId, type ProjectStats } from '../lib/board'
import type { LaneSort, Prefs, Project, Status, Task } from '../types'
import { Cell } from './Cell'
import { LaneHeader } from './LaneHeader'

interface Props {
  /** Already sorted and filtered to what should be rendered. */
  projects: Project[]
  statsByProject: Map<string, ProjectStats>
  /** Visible tasks per cell id. */
  cells: Map<string, Task[]>
  /** Actual task count per cell id, filters ignored. */
  cellTotals: Map<string, number>
  columnTotals: Map<Status, number>
  prefs: Prefs
  laneSort: LaneSort
  collapsedIds: Set<string>
  focusedIds: Set<string>
  selectedId: string | null
  quickAddCell: string | null
  allCollapsed: boolean
  onToggleAllCollapsed: () => void
  onToggleCollapsed: (projectId: string) => void
  onSolo: (projectId: string) => void
  onEditProject: (projectId: string) => void
  onMoveProject: (projectId: string, delta: number) => void
  onQuickAddOpen: (cell: string | null) => void
  onQuickAdd: (projectId: string, status: Status, text: string) => void
  onSelectTask: (id: string) => void
  onOpenTask: (id: string) => void
}

/**
 * The swimlane grid. One CSS grid holds every lane so the five status columns
 * stay pixel-aligned no matter how many projects are open; column headers stick
 * to the top and the lane rail sticks to the left while scrolling.
 */
export function Board({
  projects,
  statsByProject,
  cells,
  cellTotals,
  columnTotals,
  prefs,
  laneSort,
  collapsedIds,
  focusedIds,
  selectedId,
  quickAddCell,
  allCollapsed,
  onToggleAllCollapsed,
  onToggleCollapsed,
  onSolo,
  onEditProject,
  onMoveProject,
  onQuickAddOpen,
  onQuickAdd,
  onSelectTask,
  onOpenTask,
}: Props) {
  const t = useT()
  // Reclaim the Done column's width when it is not the current concern.
  const doneColumn = prefs.hideDone ? '74px' : 'minmax(var(--col-min), 1fr)'

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `var(--lane-w) repeat(4, minmax(var(--col-min), 1fr)) ${doneColumn}`,
      }}
    >
      <div className="corner">
        <button
          type="button"
          className="btn icon"
          onClick={onToggleAllCollapsed}
          title={allCollapsed ? t.board.expandAll : t.board.collapseAll}
        >
          {allCollapsed ? '▸' : '▾'}
        </button>
        <span className="micro" style={{ marginLeft: 4 }}>
          {t.board.projectCount(projects.length)}
        </span>
      </div>

      {STATUSES.map((status) => (
        <div key={status.id} className="colhead" data-status={status.id}>
          <span className="colhead-label">
            <span className="colhead-name">
              {prefs.hideDone && status.id === 'done' ? '✓' : status.label}
            </span>
            {!(prefs.hideDone && status.id === 'done') && (
              <span className="colhead-hint">{t.status.hint[status.id]}</span>
            )}
          </span>
          <span className="count">{columnTotals.get(status.id) ?? 0}</span>
        </div>
      ))}

      {projects.map((project) => {
        const stats = statsByProject.get(project.id)
        if (!stats) return null
        const collapsed = collapsedIds.has(project.id)
        const focused = focusedIds.has(project.id)

        return (
          <Fragment key={project.id}>
            <LaneHeader
              project={project}
              stats={stats}
              collapsed={collapsed}
              focused={focused}
              dimmed={false}
              laneSort={laneSort}
              onToggleCollapsed={onToggleCollapsed}
              onSolo={onSolo}
              onEdit={onEditProject}
              onMove={onMoveProject}
            />

            {collapsed ? (
              <div className="lane-summary">
                <div className="pill-row">
                  {STATUSES.map((status) => (
                    <span key={status.id} className="stat-pill">
                      {status.label} <b>{cellTotals.get(cellId(project.id, status.id)) ?? 0}</b>
                    </span>
                  ))}
                </div>
                <span className="spacer" />
                {stats.hot > 0 && (
                  <span className="badge" data-tone="hot">
                    ▲ {stats.hot}
                  </span>
                )}
                {stats.blocked > 0 && (
                  <span className="badge" data-tone="blocked">
                    ⏸ {stats.blocked}
                  </span>
                )}
              </div>
            ) : (
              STATUSES.map((status) => {
                const id = cellId(project.id, status.id)
                return (
                  <Cell
                    key={id}
                    projectId={project.id}
                    status={status.id}
                    tasks={cells.get(id) ?? EMPTY_TASKS}
                    totalCount={cellTotals.get(id) ?? 0}
                    narrow={prefs.hideDone && status.id === 'done'}
                    selectedId={selectedId}
                    quickAddOpen={quickAddCell === id}
                    onQuickAddOpen={onQuickAddOpen}
                    onQuickAdd={onQuickAdd}
                    onSelect={onSelectTask}
                    onOpen={onOpenTask}
                  />
                )
              })
            )}
          </Fragment>
        )
      })}

      {projects.length === 0 && <div className="no-match">{t.board.noMatch}</div>}
    </div>
  )
}

const EMPTY_TASKS: Task[] = []
