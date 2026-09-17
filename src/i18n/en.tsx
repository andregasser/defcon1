import type { Defcon } from '../types'
import type { Dict } from './de'

/** English UI copy. Typed as `Dict`, so a missing key is a compile error. */
export const en: Dict = {
  code: 'en',
  name: 'English',
  documentTitle: 'DEFCON 1 — Task Board',

  actions: {
    save: 'Save',
    create: 'Create',
    cancel: 'Cancel',
    delete: 'Delete',
    close: 'Close',
    ok: 'OK',
    clearDate: 'clear',
  },

  status: {
    hint: {
      backlog: 'unsorted',
      todo: 'planned',
      doing: 'running',
      blocked: 'waiting',
      done: 'finished',
    },
  },

  defcon: {
    label: {
      1: 'now',
      2: 'critical',
      3: 'important',
      4: 'normal',
      5: 'someday',
    } as Record<Defcon, string>,
    badgeTitle: (level: Defcon, code: string, label: string) =>
      `DEFCON ${level} — ${code} (${label})`,
    legend: 'Defcon levels',
  },

  topbar: {
    alertTitle: (level: Defcon, code: string) =>
      `Most urgent open task: DEFCON ${level} — ${code}`,
    searchPlaceholder: 'Search tasks  /',
    searchLabel: 'Search tasks',
    clearSearch: 'Clear search',
    mode: {
      loading: 'connecting …',
      server: 'data/board.json',
      local: 'this browser only',
    },
    saveSuffix: {
      idle: '',
      saving: ' · saving',
      saved: ' · saved',
      error: ' · error',
    },
    syncTitle: {
      server: 'Data lives in data/board.json — the same board in every browser',
      local:
        'No server reachable: data lives in this browser only. Run "npm start" for cross-browser storage.',
    },
    export: 'Export',
    exportTitle: 'Save the board as JSON',
    import: 'Import',
    importTitle: 'Load a board from JSON',
    helpTitle: 'Help & shortcuts (?)',
    defconLabel: 'Defcon',
    hideDone: 'Slim Done',
    hideDoneTitle: 'Shrink the Done column to its count and reclaim the width',
    hideEmpty: 'Hide empty lanes',
    hideEmptyTitle: 'Hide swimlanes without matching tasks',
    alarm: 'Alarm',
    alarmTitle: 'Play the alarm sound as soon as a task hits DEFCON 1',
    densityLabel: 'Density',
    comfort: 'Comfort',
    compact: 'Compact',
    lanesLabel: 'Lanes',
    sortDeadline: 'Deadline',
    sortDeadlineTitle: 'Most urgent deadline on top',
    sortManual: 'Manual',
    sortManualTitle: 'Your own order (with ↑ ↓ in the lane)',
    tasksLabel: 'Tasks',
    taskSortDefcon: 'DEFCON',
    taskSortDefconTitle:
      'Sorted by urgency inside every column: DEFCON 1 on top. Cards on the same level keep your hand order.',
    taskSortManual: 'Manual',
    taskSortManualTitle: 'Column order exactly as you drop the cards',
    langLabel: 'Language',
    langGroupLabel: 'Interface language',
    counters: (open: number, doing: number, blocked: number) =>
      `${open} open · ${doing} running · ${blocked} blocked`,
  },

  deck: {
    ariaLabel: 'Project overview',
    collapse: 'Collapse the overview',
    expand: 'Expand the overview',
    summary: (count: number) => `Overview · ${count} ${count === 1 ? 'project' : 'projects'}`,
    clearFocus: (count: number) => `Clear focus (${count})`,
    newProject: '+ Project',
    tileFocused: 'Click: drop out of focus',
    tileUnfocused: 'Click: focus this project (several possible)',
    openBadge: (count: number) => `${count} open`,
    openTitle: 'Open tasks',
    doingTitle: 'In Progress',
    blockedTitle: 'Blocked',
    hotTitle: 'Open at DEFCON 1–2',
    overdueTitle: 'Overdue tasks',
  },

  board: {
    collapseAll: 'Collapse all swimlanes',
    expandAll: 'Expand all swimlanes',
    projectCount: (count: number) => `${count} ${count === 1 ? 'project' : 'projects'}`,
    noMatch: 'No swimlane matches the active filters.',
  },

  lane: {
    collapse: 'Collapse swimlane',
    expand: 'Expand swimlane',
    solo: (name: string) => `Show "${name}" only`,
    unfocus: 'Clear focus',
    up: 'Move up',
    down: 'Move down',
    edit: 'Edit project',
    meterTitle: (done: number, total: number) => `${done} of ${total} done`,
    meta: (open: number, percent: number) => `${open} open · ${percent}%`,
    hotTitle: 'Open tasks at DEFCON 1–2',
    blockedTitle: 'Blocked tasks',
    overdueTitle: 'Tasks past their due date',
  },

  cell: {
    narrowTitle: (shown: number, total: number) =>
      `${shown} of ${total} finished tasks match the filter — dropping still works`,
    hidden: (count: number) => `+ ${count} hidden`,
    hiddenTitle: 'Hidden by a filter',
    add: '+ Task',
    addTitle: 'Add a task',
  },

  card: {
    noteTitle: 'Has a note',
  },

  deadline: {
    none: 'no deadline',
    noneTitle: 'No deadline set',
    title: (date: string, countdown: string) => `Deadline: ${date} — ${countdown}`,
  },

  quickAdd: {
    placeholder: 'Task … !2 @tomorrow',
    label: 'New task',
    hintDefcon: 'DEFCON',
    hintDue: 'due',
    hintTokens: ['@tomorrow', '@fri', '@+3d'],
  },

  taskDialog: {
    title: 'Edit task',
    titleLabel: 'Title',
    defconLabel: 'Defcon — priority',
    projectLabel: 'Project',
    statusLabel: 'Status',
    dueLabel: 'Due date',
    dueToday: 'today',
    dueTomorrow: 'tomorrow',
    dueWeek: '+1 week',
    noteLabel: 'Note',
    notePlaceholder: 'Context, links, open questions …',
    deleteTitle: 'Delete task',
  },

  projectDialog: {
    titleNew: 'New project',
    titleEdit: 'Edit project',
    nameLabel: 'Project name',
    namePlaceholder: 'e.g. Cloud migration',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'What is this project about?',
    descriptionHint: 'Shown in full in the project overview.',
    deadlineLabel: 'Deadline',
    plusWeek: '+1 week',
    plusMonth: '+1 month',
    plusQuarter: '+1 quarter',
    colorLabel: 'Colour',
    colorSwatch: (color: string) => `Colour ${color}`,
    confirmWithTasks: (count: number) => `Delete ${count} tasks as well?`,
    confirmEmpty: 'Really delete?',
  },

  dialog: {
    closeTitle: 'Close (Esc)',
  },

  help: {
    title: 'Defcon 1 — how it works',
    keyboard: 'Keyboard',
    mouse: 'Mouse',
    quickAdd: 'Quick add',
    keys: {
      search: 'Focus the search field',
      newTask: 'New task in the first visible project (Backlog)',
      newProject: 'New project',
      moveColumn: 'Move the selected task to column 1–5',
      setDefcon: 'Set the DEFCON level of the selected task',
      edit: 'Edit the selected task',
      done: 'Selected task to Done / back to Todo',
      delete: 'Delete the selected task',
      collapse: 'Collapse / expand all swimlanes',
      density: 'Toggle density (Comfort / Compact)',
      escape: 'Close the dialog, drop the selection and the filters',
    },
    mouseRows: {
      drag: 'Drag',
      dragDesc: 'Move a task to another column or another swimlane',
      click: 'Click',
      clickDesc: 'Select a task',
      doubleClick: 'Double click',
      doubleClickDesc: 'Edit a task',
      tile: 'Click a tile',
      tileDesc: 'Focus this project (several possible)',
      tileDouble: 'Double click a tile',
      tileDoubleDesc: 'Edit the project (name, deadline, colour)',
      lane: 'Click a lane name',
      laneDesc: 'Show this project only',
    },
    quickRows: {
      defcon: 'Set the DEFCON level straight from the title',
      dates: 'Due date',
      datesTokens: ['@today', '@tomorrow'],
      weekday: 'Next weekday',
      weekdayTokens: ['@fri', '@mon'],
      relative: 'In 3 days / in 2 weeks',
      absolute: 'A specific date',
      absoluteTokens: ['@20.09.', '@2026-09-20'],
      bothLanguages:
        'German and English tokens always work, no matter which interface language is active.',
    },
    priorityLabel: 'Priority',
    priorityText:
      'Inside every column the most urgent tasks come first — a DEFCON 1 rises to the top by ' +
      'itself as soon as you change the priority. The "Tasks" switch in the header changes that ' +
      'to "Manual", where the order is exactly how you drop the cards. A task reaching DEFCON 1 ' +
      'also plays the alarm sound — switch it off with "Alarm".',
    storageLabel: 'Storage',
    storageServer: () => (
      <>
        All data lives in <code>data/board.json</code> inside the project folder. That way Safari,
        Firefox and Chrome show the same board, and edits made in another browser appear on their
        own after a few seconds. Before every write the server drops a copy into{' '}
        <code>data/backups/</code>.
      </>
    ),
    storageLocal: () => (
      <>
        No server is running, so the data lives in this browser's storage only and is invisible to
        other browsers. For cross-browser storage in the project folder, run <code>npm start</code>{' '}
        and open <code>http://127.0.0.1:7777</code>.
      </>
    ),
    loadDemo: 'Load demo data',
  },

  empty: {
    intro:
      'A task board for parallel projects. Every project is a swimlane with its own deadline, every task carries a DEFCON level from 1 (now) to 5 (someday). Drag tasks from column to column with the mouse.',
    firstProject: 'Create the first project',
    loadDemo: 'Load demo data',
    storage: (where: string) => `Storage: ${where}`,
  },

  notice: {
    conflict: 'The board changed in another browser — the newer version is loaded now.',
    migrated: 'Board taken over from this browser’s storage and saved to data/board.json.',
    saveFailed: (detail: string) => `Saving failed: ${detail}`,
  },

  confirm: {
    deleteTask: (title: string) => `Delete task?\n\n${title}`,
    import: (projects: number, tasks: number) =>
      `Import: ${projects} projects, ${tasks} tasks.\n\nOK replaces the current board. Cancel aborts.`,
    importFailed: (detail: string) => `Import failed: ${detail}`,
    importEmpty: 'No projects or tasks found in the file',
    loadDemo: 'Demo data replaces the current board. Continue?',
  },

  demo: {
    tasks: {
      terraform: 'Refactor the Terraform modules',
      firewall: 'Firewall clearance for the network',
      runbook: 'Write the runbook',
      costs: 'Review the cost model',
      landingZone: 'Landing zone set up',
      metrics: 'Align the key metrics',
      dashboard: 'Finalise the dashboard layout',
      sources: 'Data sources inventoried',
      requirements: 'Collect the requirements',
      prototype: 'Sketch the prototype',
    },
    descriptions: {
      cloud:
        'Lift and shift the three core applications into the new landing zone, including network clearances and the cost model. Signed off by the operations team.',
      reporting:
        'Quarterly report for the board: align the key metrics, document the data sources, finish the dashboard before the meeting.',
      onboarding:
        'Pre-project for self-service onboarding of new staff. Not approved yet — requirements and a prototype first.',
    },
  },
}
