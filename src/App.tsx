import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { Board } from './components/Board'
import { CommandDeck } from './components/CommandDeck'
import { HelpDialog } from './components/HelpDialog'
import { ProjectDialog } from './components/ProjectDialog'
import { TaskCardPreview } from './components/TaskCard'
import { TaskDialog } from './components/TaskDialog'
import { TodayView } from './components/TodayView'
import { TopBar } from './components/TopBar'
import { STATUS_IDS } from './constants'
import { useBoard } from './hooks/useBoard'
import { usePrefs } from './hooks/usePrefs'
import {
  appendIndex,
  cellId,
  createDemoData,
  createProject,
  createTask,
  groupByCell,
  moveTaskBefore,
  parseCellId,
  projectStats,
  reorderProject,
  sortProjects,
  staleDays,
  type ProjectStats,
} from './lib/board'
import { nowISO } from './lib/date'
import { parseQuickAdd } from './lib/quickAdd'
import { downloadBackup, parseBackup } from './lib/storage'
import { todayCount, todayList } from './lib/today'
import type { Defcon, Status, Task } from './types'

/**
 * Pointer-first collision detection. Whatever sits under the cursor wins, which
 * matters here because every cell is a droppable that also contains droppables.
 * Only when the pointer is outside all of them do we fall back to overlap.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
}

export default function App() {
  const board = useBoard()
  const { data, mode } = board
  const { prefs, set, toggle, toggleCollapsed, setAllCollapsed, toggleFocus, soloFocus, clearFocus } =
    usePrefs()

  const [query, setQuery] = useState('')
  const [defconFilter, setDefconFilter] = useState<Defcon[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quickAddCell, setQuickAddCell] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [taskDialogId, setTaskDialogId] = useState<string | null>(null)
  const [projectDialogId, setProjectDialogId] = useState<string | null | undefined>(undefined)
  const [helpOpen, setHelpOpen] = useState(false)
  const [todayOpen, setTodayOpen] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  /* --------------------------------------------------------------- derived */

  const collapsedIds = useMemo(() => new Set(prefs.collapsedProjects), [prefs.collapsedProjects])
  const focusedIds = useMemo(() => new Set(prefs.focusedProjects), [prefs.focusedProjects])
  const defconSet = useMemo(() => new Set(defconFilter), [defconFilter])

  const sortedProjects = useMemo(
    () => sortProjects(data.projects, prefs.laneSort),
    [data.projects, prefs.laneSort],
  )

  /** Tasks passing search and DEFCON filters. `hideDone` is a layout switch, not a filter. */
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '' && defconSet.size === 0) return data.tasks
    return data.tasks.filter((task) => {
      if (defconSet.size > 0 && !defconSet.has(task.defcon)) return false
      if (needle === '') return true
      return (
        task.title.toLowerCase().includes(needle) || task.note.toLowerCase().includes(needle)
      )
    })
  }, [data.tasks, query, defconSet])

  const cells = useMemo(() => groupByCell(matching), [matching])

  const cellTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const task of data.tasks) {
      const key = cellId(task.projectId, task.status)
      totals.set(key, (totals.get(key) ?? 0) + 1)
    }
    return totals
  }, [data.tasks])

  const statsByProject = useMemo(() => {
    const stats = new Map<string, ProjectStats>()
    for (const project of data.projects) {
      stats.set(project.id, projectStats(data.tasks, project.id))
    }
    return stats
  }, [data.projects, data.tasks])

  const visibleProjects = useMemo(() => {
    const filtersActive = prefs.hideEmptyLanes || query.trim() !== '' || defconSet.size > 0
    return sortedProjects.filter((project) => {
      if (focusedIds.size > 0 && !focusedIds.has(project.id)) return false
      if (!filtersActive) return true
      return STATUS_IDS.some((status) => (cells.get(cellId(project.id, status))?.length ?? 0) > 0)
    })
  }, [sortedProjects, focusedIds, prefs.hideEmptyLanes, query, defconSet, cells])

  const columnTotals = useMemo(() => {
    const totals = new Map<Status, number>()
    for (const status of STATUS_IDS) totals.set(status, 0)
    for (const project of visibleProjects) {
      for (const status of STATUS_IDS) {
        const count = cells.get(cellId(project.id, status))?.length ?? 0
        totals.set(status, (totals.get(status) ?? 0) + count)
      }
    }
    return totals
  }, [visibleProjects, cells])

  const globals = useMemo(() => {
    let open = 0
    let doing = 0
    let blocked = 0
    let stale = 0
    let alert: Defcon | null = null
    for (const task of data.tasks) {
      if (task.status === 'done') continue
      open += 1
      if (task.status === 'doing') doing += 1
      if (task.status === 'blocked') blocked += 1
      if (staleDays(task) !== null) stale += 1
      if (alert === null || task.defcon < alert) alert = task.defcon
    }
    return { open, doing, blocked, stale, alert }
  }, [data.tasks])

  const allCollapsed =
    visibleProjects.length > 0 && visibleProjects.every((project) => collapsedIds.has(project.id))

  /**
   * The Heute list deliberately ignores search and the DEFCON filter — it has
   * its own idea of what is urgent — but it does respect the project focus, so
   * "nur dieses Projekt" keeps meaning the same thing everywhere.
   */
  const todaySections = useMemo(
    () =>
      todayList(
        focusedIds.size > 0
          ? data.tasks.filter((task) => focusedIds.has(task.projectId))
          : data.tasks,
      ),
    [data.tasks, focusedIds],
  )
  const todayTotal = useMemo(() => todayCount(todaySections), [todaySections])

  const projectsById = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project])),
    [data.projects],
  )

  const selectedTask = useMemo(
    () => (selectedId ? (data.tasks.find((task) => task.id === selectedId) ?? null) : null),
    [selectedId, data.tasks],
  )
  const dialogTask = useMemo(
    () => (taskDialogId ? (data.tasks.find((task) => task.id === taskDialogId) ?? null) : null),
    [taskDialogId, data.tasks],
  )
  const dialogProject = useMemo(
    () => (projectDialogId ? (data.projects.find((p) => p.id === projectDialogId) ?? null) : null),
    [projectDialogId, data.projects],
  )
  const activeTask = useMemo(
    () => (activeId ? (data.tasks.find((task) => task.id === activeId) ?? null) : null),
    [activeId, data.tasks],
  )

  /** Drag handlers need the rendered order, which filters can differ from. */
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const dialogOpen = taskDialogId !== null || projectDialogId !== undefined || helpOpen

  useEffect(() => {
    board.setSyncPaused(dialogOpen || activeId !== null || quickAddCell !== null)
  }, [board, dialogOpen, activeId, quickAddCell])

  /* --------------------------------------------------------------- actions */

  const addTask = useCallback(
    (projectId: string, status: Status, text: string) => {
      const parsed = parseQuickAdd(text)
      if (parsed.title === '') return
      board.update((current) => ({
        ...current,
        tasks: [
          ...current.tasks,
          createTask(projectId, status, parsed.title, appendIndex(current.tasks, projectId, status), {
            defcon: parsed.defcon ?? undefined,
            due: parsed.due,
          }),
        ],
      }))
    },
    [board],
  )

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      board.update((current) => {
        const task = current.tasks.find((item) => item.id === id)
        if (!task) return current

        const nextProject = patch.projectId ?? task.projectId
        const nextStatus = patch.status ?? task.status
        const moved = nextProject !== task.projectId || nextStatus !== task.status

        // A project or status change has to re-rank the task inside its new cell.
        const tasks = moved
          ? moveTaskBefore(current.tasks, id, nextProject, nextStatus, null)
          : current.tasks

        return {
          ...current,
          tasks: tasks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  order: item.order,
                  projectId: nextProject,
                  status: nextStatus,
                  doneAt: nextStatus === 'done' ? (item.doneAt ?? nowISO()) : null,
                }
              : item,
          ),
        }
      })
    },
    [board],
  )

  const deleteTask = useCallback(
    (id: string) => {
      board.update((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== id),
      }))
      setSelectedId((current) => (current === id ? null : current))
    },
    [board],
  )

  const moveTaskToStatus = useCallback(
    (id: string, status: Status) => {
      board.update((current) => {
        const task = current.tasks.find((item) => item.id === id)
        if (!task || task.status === status) return current
        return { ...current, tasks: moveTaskBefore(current.tasks, id, task.projectId, status, null) }
      })
    },
    [board],
  )

  const saveProject = useCallback(
    (values: { name: string; deadline: string | null; color: string }) => {
      board.update((current) => {
        if (projectDialogId) {
          return {
            ...current,
            projects: current.projects.map((project) =>
              project.id === projectDialogId ? { ...project, ...values } : project,
            ),
          }
        }
        const project = createProject(values.name, current.projects.length)
        return {
          ...current,
          projects: [...current.projects, { ...project, ...values }],
        }
      })
    },
    [board, projectDialogId],
  )

  const deleteProject = useCallback(() => {
    if (!projectDialogId) return
    board.update((current) => ({
      projects: current.projects.filter((project) => project.id !== projectDialogId),
      tasks: current.tasks.filter((task) => task.projectId !== projectDialogId),
    }))
  }, [board, projectDialogId])

  const moveProject = useCallback(
    (projectId: string, delta: number) => {
      board.update((current) => ({
        ...current,
        projects: reorderProject(current.projects, projectId, delta),
      }))
    },
    [board],
  )

  const toggleAllCollapsed = useCallback(() => {
    setAllCollapsed(
      data.projects.map((project) => project.id),
      !allCollapsed,
    )
  }, [setAllCollapsed, data.projects, allCollapsed])

  const toggleDefcon = useCallback((level: Defcon) => {
    setDefconFilter((current) =>
      current.includes(level) ? current.filter((item) => item !== level) : [...current, level],
    )
  }, [])

  const onImportFile = useCallback(
    async (file: File) => {
      try {
        const imported = parseBackup(await file.text())
        const replace = window.confirm(
          `Import: ${imported.projects.length} Projekte, ${imported.tasks.length} Tasks.\n\n` +
            'OK ersetzt das aktuelle Board. Abbrechen bricht ab.',
        )
        if (replace) board.replaceAll(imported)
      } catch (error) {
        window.alert(`Import fehlgeschlagen: ${(error as Error).message}`)
      }
    },
    [board],
  )

  const loadDemo = useCallback(() => {
    if (
      data.projects.length > 0 &&
      !window.confirm('Demo-Daten ersetzen das aktuelle Board. Fortfahren?')
    ) {
      return
    }
    board.replaceAll(createDemoData())
    setHelpOpen(false)
  }, [board, data.projects.length])

  /* ------------------------------------------------------------ drag & drop */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findCell = (id: string, tasks: Task[]) => {
    const parsed = parseCellId(id)
    if (parsed) return parsed
    const task = tasks.find((item) => item.id === id)
    return task ? { projectId: task.projectId, status: task.status } : null
  }

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    setSelectedId(id)
    setQuickAddCell(null)
  }, [])

  /** Live preview: as soon as the pointer enters another cell, the card follows. */
  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return
      const activeTaskId = String(active.id)
      const overId = String(over.id)
      if (activeTaskId === overId) return

      board.update((current) => {
        const from = findCell(activeTaskId, current.tasks)
        const to = findCell(overId, current.tasks)
        if (!from || !to) return current
        if (from.projectId === to.projectId && from.status === to.status) return current
        const beforeId = parseCellId(overId) ? null : overId
        return {
          ...current,
          tasks: moveTaskBefore(current.tasks, activeTaskId, to.projectId, to.status, beforeId),
        }
      })
    },
    [board],
  )

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return
      const activeTaskId = String(active.id)
      const overId = String(over.id)

      board.update((current) => {
        const to = findCell(overId, current.tasks)
        if (!to) return current

        let beforeId: string | null = null
        if (!parseCellId(overId)) {
          // Dropped onto a card: mirror arrayMove on the rendered order and read
          // off which card should end up behind ours.
          const visible = cellsRef.current.get(cellId(to.projectId, to.status)) ?? []
          const ids = visible.map((task) => task.id)
          const oldIndex = ids.indexOf(activeTaskId)
          const newIndex = ids.indexOf(overId)
          if (newIndex < 0) return current
          if (oldIndex < 0) {
            beforeId = overId
          } else {
            if (oldIndex === newIndex) return current
            const next = arrayMove(ids, oldIndex, newIndex)
            beforeId = next[next.indexOf(activeTaskId) + 1] ?? null
          }
        }

        return {
          ...current,
          tasks: moveTaskBefore(current.tasks, activeTaskId, to.projectId, to.status, beforeId),
        }
      })
    },
    [board],
  )

  const onDragCancel = useCallback(() => setActiveId(null), [])

  /* -------------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogOpen) return
      // Never hijack keys while the user is typing somewhere. The target is not
      // guaranteed to be an Element (it can be window or document).
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const digit = /^[1-5]$/.test(event.key) ? (Number(event.key) as 1 | 2 | 3 | 4 | 5) : null

      if (digit && selectedTask) {
        event.preventDefault()
        if (event.shiftKey) updateTask(selectedTask.id, { defcon: digit as Defcon })
        else moveTaskToStatus(selectedTask.id, STATUS_IDS[digit - 1])
        return
      }

      switch (event.key) {
        case '/':
          event.preventDefault()
          searchRef.current?.focus()
          searchRef.current?.select()
          return
        case '?':
          event.preventDefault()
          setHelpOpen(true)
          return
        case 't':
          event.preventDefault()
          setTodayOpen((current) => !current)
          return
        case 'n': {
          event.preventDefault()
          const first = visibleProjects[0] ?? sortedProjects[0]
          if (!first) return
          // Quick add lives in a cell, so the board has to be on screen for it.
          setTodayOpen(false)
          if (collapsedIds.has(first.id)) toggleCollapsed(first.id)
          setQuickAddCell(cellId(first.id, 'backlog'))
          return
        }
        case 'p':
          event.preventDefault()
          setProjectDialogId(null)
          return
        case 'c':
          event.preventDefault()
          toggleAllCollapsed()
          return
        case 'd':
          event.preventDefault()
          set('density', prefs.density === 'comfort' ? 'compact' : 'comfort')
          return
        case 'e':
          if (!selectedTask) return
          event.preventDefault()
          setTaskDialogId(selectedTask.id)
          return
        case 'x':
          if (!selectedTask) return
          event.preventDefault()
          moveTaskToStatus(selectedTask.id, selectedTask.status === 'done' ? 'todo' : 'done')
          return
        case 'Backspace':
        case 'Delete':
          if (!selectedTask) return
          event.preventDefault()
          if (window.confirm(`Task löschen?\n\n${selectedTask.title}`)) deleteTask(selectedTask.id)
          return
        case 'Escape':
          event.preventDefault()
          if (quickAddCell) setQuickAddCell(null)
          else if (selectedId) setSelectedId(null)
          else if (query) setQuery('')
          else if (defconFilter.length > 0) setDefconFilter([])
          else if (focusedIds.size > 0) clearFocus()
          else setTodayOpen(false)
          return
        default:
          return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    dialogOpen,
    selectedTask,
    selectedId,
    quickAddCell,
    query,
    defconFilter.length,
    visibleProjects,
    sortedProjects,
    collapsedIds,
    focusedIds,
    prefs.density,
    set,
    toggleCollapsed,
    toggleAllCollapsed,
    updateTask,
    moveTaskToStatus,
    deleteTask,
    clearFocus,
  ])

  /* ------------------------------------------------------------------ view */

  const showEmptyState = mode !== 'loading' && data.projects.length === 0

  return (
    <div className="app" data-density={prefs.density}>
      <TopBar
        query={query}
        onQuery={setQuery}
        searchRef={searchRef}
        defconFilter={defconSet}
        onToggleDefcon={toggleDefcon}
        prefs={prefs}
        onDensity={(value) => set('density', value)}
        onLaneSort={(value) => set('laneSort', value)}
        onToggleHideDone={() => toggle('hideDone')}
        onToggleHideEmpty={() => toggle('hideEmptyLanes')}
        mode={mode}
        saveState={board.saveState}
        alertLevel={globals.alert}
        openCount={globals.open}
        doingCount={globals.doing}
        blockedCount={globals.blocked}
        staleCount={globals.stale}
        todayOpen={todayOpen}
        todayCount={todayTotal}
        onToggleToday={() => setTodayOpen((current) => !current)}
        onExport={() => downloadBackup(data)}
        onImport={() => importRef.current?.click()}
        onHelp={() => setHelpOpen(true)}
      />

      {board.notice && (
        <div className="notice">
          <span>{board.notice}</span>
          <span className="spacer" />
          <button type="button" className="btn sm" onClick={board.clearNotice}>
            OK
          </button>
        </div>
      )}

      {!showEmptyState && (
        <CommandDeck
          projects={sortedProjects}
          statsByProject={statsByProject}
          focusedIds={focusedIds}
          open={prefs.deckOpen}
          onToggleOpen={() => toggle('deckOpen')}
          onToggleFocus={toggleFocus}
          onClearFocus={clearFocus}
          onEditProject={setProjectDialogId}
          onNewProject={() => setProjectDialogId(null)}
        />
      )}

      {showEmptyState ? (
        <div className="board-empty">
          <div className="board-empty-inner">
            <h2>Defcon 1</h2>
            <p>
              Ein Taskboard für parallele Projekte. Jedes Projekt ist eine Swimlane mit eigener
              Deadline, jeder Task hat eine DEFCON-Stufe von 1 (sofort) bis 5 (irgendwann). Tasks
              zieht man mit der Maus von Spalte zu Spalte.
            </p>
            <div className="empty-actions">
              <button type="button" className="btn primary" onClick={() => setProjectDialogId(null)}>
                Erstes Projekt anlegen
              </button>
              <button type="button" className="btn" onClick={loadDemo}>
                Demo-Daten laden
              </button>
            </div>
            <span className="micro">
              Speicherort: {mode === 'server' ? 'data/board.json' : 'nur dieser Browser'}
            </span>
          </div>
        </div>
      ) : todayOpen ? (
        <div className="board-scroll">
          <TodayView
            sections={todaySections}
            projectsById={projectsById}
            selectedId={selectedId}
            focused={focusedIds.size > 0}
            onSelect={setSelectedId}
            onOpen={setTaskDialogId}
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="board-scroll">
            <Board
              projects={visibleProjects}
              statsByProject={statsByProject}
              cells={cells}
              cellTotals={cellTotals}
              columnTotals={columnTotals}
              prefs={prefs}
              laneSort={prefs.laneSort}
              collapsedIds={collapsedIds}
              focusedIds={focusedIds}
              selectedId={selectedId}
              quickAddCell={quickAddCell}
              allCollapsed={allCollapsed}
              onToggleAllCollapsed={toggleAllCollapsed}
              onToggleCollapsed={toggleCollapsed}
              onSolo={soloFocus}
              onEditProject={setProjectDialogId}
              onMoveProject={moveProject}
              onQuickAddOpen={setQuickAddCell}
              onQuickAdd={addTask}
              onSelectTask={setSelectedId}
              onOpenTask={setTaskDialogId}
            />
          </div>

          <DragOverlay className="drag-overlay" dropAnimation={null}>
            {activeTask ? <TaskCardPreview task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {dialogTask && (
        <TaskDialog
          task={dialogTask}
          projects={sortedProjects}
          onSave={updateTask}
          onDelete={deleteTask}
          onClose={() => setTaskDialogId(null)}
        />
      )}

      {projectDialogId !== undefined && (
        <ProjectDialog
          project={dialogProject}
          taskCount={
            dialogProject
              ? (statsByProject.get(dialogProject.id)?.total ?? 0)
              : 0
          }
          onSave={saveProject}
          onDelete={deleteProject}
          onClose={() => setProjectDialogId(undefined)}
        />
      )}

      {helpOpen && (
        <HelpDialog mode={mode} onClose={() => setHelpOpen(false)} onLoadDemo={loadDemo} />
      )}

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void onImportFile(file)
        }}
      />
    </div>
  )
}
