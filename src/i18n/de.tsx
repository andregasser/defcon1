import type { Defcon } from '../types'

/**
 * German UI copy. This file is the reference dictionary: `Dict` is derived from
 * it, so every other language has to match its shape exactly and TypeScript
 * complains about a forgotten key instead of shipping a blank label.
 *
 * A few entries return JSX. That is deliberate — a sentence with inline <code>
 * paths reads much better as one unit than as five glued fragments.
 */
export const de = {
  code: 'de',
  /** Shown on the language switch, always in the language it selects. */
  name: 'Deutsch',
  documentTitle: 'DEFCON 1 — Taskboard',

  browserDemo: {
    label: 'Interaktive Demo',
    description: 'Probier das Board aus. Änderungen bleiben nur in diesem Browser. Mit Export kannst du sie sichern.',
    reset: 'Demo zurücksetzen',
    install: 'Lokal installieren',
  },

  actions: {
    save: 'Speichern',
    create: 'Anlegen',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    close: 'Schliessen',
    ok: 'OK',
    clearDate: 'leeren',
  },

  status: {
    hint: {
      backlog: 'unsortiert',
      todo: 'geplant',
      doing: 'läuft',
      blocked: 'wartet',
      done: 'erledigt',
    },
  },

  defcon: {
    label: {
      1: 'sofort',
      2: 'kritisch',
      3: 'wichtig',
      4: 'normal',
      5: 'irgendwann',
    } as Record<Defcon, string>,
    /** Tooltip on every DEFCON badge. The code word stays authentic English. */
    badgeTitle: (level: Defcon, code: string, label: string) =>
      `DEFCON ${level} — ${code} (${label})`,
    legend: 'Defcon-Stufen',
  },

  topbar: {
    viewOptions: 'Ansicht & Filter',
    alertTitle: (level: Defcon, code: string) =>
      `Dringendste offene Task: DEFCON ${level} — ${code}`,
    searchPlaceholder: 'Tasks durchsuchen  /',
    searchLabel: 'Tasks durchsuchen',
    clearSearch: 'Suche leeren',
    mode: {
      loading: 'verbinde …',
      server: 'data/board.json',
      local: 'nur dieser Browser',
      demo: 'Demo · dieser Browser',
    },
    saveSuffix: {
      idle: '',
      saving: ' · speichert',
      saved: ' · gespeichert',
      error: ' · Fehler',
    },
    syncTitle: {
      demo: 'Demo-Daten bleiben in diesem Browser und werden nicht an einen Server gesendet.',
      server: 'Daten liegen in data/board.json — für alle Browser gleich',
      local:
        'Kein Server erreichbar: Daten liegen nur in diesem Browser. Starte "npm start" für browserübergreifende Speicherung.',
    },
    export: 'Export',
    exportTitle: 'Board als JSON sichern',
    import: 'Import',
    importTitle: 'Board aus JSON laden',
    helpTitle: 'Hilfe & Shortcuts (?)',
    today: 'Heute',
    todayTitle:
      'Heute-Arbeitsbereich: Tagesplan, Fokus, dringende und blockierte Aufgaben (t)',
    defconLabel: 'Defcon',
    hideDone: 'Done schmal',
    hideDoneTitle: 'Done-Spalte auf die Zählung schrumpfen und Platz gewinnen',
    hideEmpty: 'Leere Lanes aus',
    hideEmptyTitle: 'Swimlanes ohne passende Tasks ausblenden',
    alarm: 'Alarm',
    alarmTitle: 'Alarmton abspielen, sobald ein Task auf DEFCON 1 steht',
    densityLabel: 'Dichte',
    comfort: 'Komfort',
    compact: 'Kompakt',
    lanesLabel: 'Lanes',
    sortDeadline: 'Deadline',
    sortDeadlineTitle: 'Dringendste Deadline oben',
    sortManual: 'Manuell',
    sortManualTitle: 'Eigene Reihenfolge (mit ↑ ↓ in der Lane)',
    tasksLabel: 'Tasks',
    taskSortDefcon: 'DEFCON',
    taskSortDefconTitle:
      'Innerhalb jeder Spalte automatisch nach Priorität: DEFCON 1 zuoberst. Gleiche Stufe behält die Reihenfolge von Hand.',
    taskSortManual: 'Manuell',
    taskSortManualTitle: 'Reihenfolge in der Spalte genau so, wie du die Karten hinziehst',
    langLabel: 'Sprache',
    langGroupLabel: 'Sprache der Oberfläche',
    counters: (open: number, doing: number, blocked: number, stale: number) =>
      `${open} offen · ${doing} laufen · ${blocked} blockiert` +
      (stale > 0 ? ` · ${stale} stehen` : ''),
    staleCounterTitle: 'Stehengelassen: zu lange unverändert in In Progress oder Blocked',
  },

  deck: {
    ariaLabel: 'Projektübersicht',
    collapse: 'Übersicht einklappen',
    expand: 'Übersicht aufklappen',
    summary: (count: number) => `Übersicht · ${count} ${count === 1 ? 'Projekt' : 'Projekte'}`,
    clearFocus: (count: number) => `Fokus aufheben (${count})`,
    newProject: '+ Projekt',
    tileFocused: 'Klick: aus dem Fokus nehmen',
    tileUnfocused: 'Klick: auf dieses Projekt fokussieren (mehrere möglich)',
    openBadge: (count: number) => `${count} offen`,
    openTitle: 'Offene Tasks',
    doingTitle: 'In Progress',
    blockedTitle: 'Blockiert',
    hotTitle: 'Offen auf DEFCON 1–2',
    overdueTitle: 'Überfällige Tasks',
    staleTitle: 'Stehengelassen: zu lange unverändert in In Progress oder Blocked',
  },

  board: {
    scrollHint: 'Weitere Spalten: seitlich scrollen →',
    collapseAll: 'Alle Swimlanes einklappen',
    expandAll: 'Alle Swimlanes aufklappen',
    projectCount: (count: number) => `${count} ${count === 1 ? 'Projekt' : 'Projekte'}`,
    noMatch: 'Keine Swimlane passt zu den aktiven Filtern.',
  },

  lane: {
    collapse: 'Swimlane einklappen',
    expand: 'Swimlane aufklappen',
    solo: (name: string) => `Nur "${name}" anzeigen`,
    unfocus: 'Fokus aufheben',
    up: 'Nach oben',
    down: 'Nach unten',
    edit: 'Projekt bearbeiten',
    meterTitle: (done: number, total: number) => `${done} von ${total} erledigt`,
    meta: (open: number, percent: number) => `${open} offen · ${percent}%`,
    hotTitle: 'Offene Tasks auf DEFCON 1–2',
    blockedTitle: 'Blockierte Tasks',
    overdueTitle: 'Tasks über dem Fälligkeitsdatum',
    staleTitle: 'Tasks, die zu lange unverändert in In Progress oder Blocked liegen',
  },

  cell: {
    addFirst: '+ Aufgabe hinzufügen',
    narrowTitle: (shown: number, total: number) =>
      `${shown} von ${total} erledigten Tasks passen zum Filter — Ablegen weiterhin möglich`,
    hidden: (count: number) => `+ ${count} ausgeblendet`,
    hiddenTitle: 'Durch Filter ausgeblendet',
    add: '+ Task',
    addTitle: 'Task hinzufügen',
  },

  card: {
    noteTitle: 'Notiz vorhanden',
    stepsTitle: (done: number, total: number) =>
      `Checkliste: ${done} von ${total} Schritten erledigt`,
    /** `column` is the English column label from `constants.ts`. */
    staleTitle: (days: number, column: string) =>
      `Liegt seit ${days} Tagen unverändert in "${column}"`,
    staleBadge: (days: number) => `${days} T`,
  },

  today: {
    heading: 'Dein Tag. Dein Fokus.',
    eyebrow: 'Arbeitsbereich',
    intro: 'Plane bewusst. Starte eine Aufgabe. Bring sie zu Ende.',
    date: (date: string) => `Heute · ${date}`,
    projects: 'Projekte auswählen',
    allProjects: 'Alle Projekte',
    projectCount: (count: number) => `${count} Projekte ausgewählt`,
    all: 'Alles anzeigen',
    dueCount: (count: number) => `${count} heute fällig`,
    overdueCount: (count: number) => `${count} überfällig`,
    completedCount: (count: number) => `${count} heute erledigt`,
    planTitle: 'Dein Tagesplan',
    progress: (done: number, total: number) => `${done} von ${total} geplanten Aufgaben erledigt`,
    noPlan: 'Noch nichts eingeplant. Wähle Aufgaben für deinen Tag aus.',
    planHint: 'Deine Planung verändert keine Fälligkeit. Offenes vom Vortag kannst du neu einplanen.',
    chooseTasks: 'Aufgaben auswählen',
    hideChooser: 'Auswahl schließen',
    available: 'Weitere Aufgaben',
    availableEmpty: 'Keine weiteren Aufgaben im aktuellen Projektfokus.',
    planned: 'Heute bearbeiten',
    plannedHint: 'Deine bewusste Auswahl für heute.',
    plannedEmpty: 'Hier erscheinen die Aufgaben, die du für heute einplanst.',
    attention: 'Dringend prüfen',
    attentionHint: 'Fällig, dringend, in Arbeit oder zur Wiedervorlage.',
    waiting: 'Wartet auf …',
    waitingHint: 'Blockaden klären und zum richtigen Zeitpunkt nachfassen.',
    completed: 'Heute erledigt',
    focus: 'Jetzt im Fokus',
    focusEmpty: 'Wähle bewusst, woran du jetzt arbeitest.',
    focusHint: 'Eine Aufgabe im Mittelpunkt. Dringendes bleibt darunter sichtbar.',
    focusTask: 'In den Fokus nehmen',
    clearFocus: 'Fokus freigeben',
    next: 'Nächste mögliche Aufgabe',
    start: 'Starten',
    resume: 'Weiterarbeiten',
    done: 'Erledigen',
    reopen: 'Wieder öffnen',
    details: 'Details öffnen',
    plan: 'Für heute einplanen',
    unplan: 'Aus Tagesplan nehmen',
    priority: 'Priorität ändern',
    checklist: 'Checkliste',
    checklistProgress: (done: number, total: number) => `${done} von ${total} Schritten`,
    noReason: 'Grund noch offen – in den Details ergänzen.',
    dueToday: 'Heute fällig',
    overdueDays: (days: number) => `Seit ${days} Tagen überfällig`,
    dueOn: (date: string) => `Fällig am ${date}`,
    reviewOn: (date: string) => `Wiedervorlage am ${date}`,
    reviewReady: 'Nachfassen ist fällig',
    earlierPlan: (date: string) => `Noch offen vom ${date}`,
    critical: 'Dringend · DEFCON 1–2',
    resetFilters: 'Filter zurücksetzen',
    filtersHint: 'Suche und DEFCON-Filter gelten auch hier. Zähler beziehen sich auf die ausgewählten Projekte.',
    noMatches: 'Keine Aufgaben für diese Auswahl.',
    undo: 'Rückgängig',
    changed: (title: string) => `Aktualisiert: ${title}`,
    undone: 'Letzte Änderung rückgängig gemacht.',
    undoExpired: 'Diese Aufgabe wurde inzwischen geändert. Rückgängig ist dafür nicht mehr möglich.',
    keyboard: 'Pfeiltasten wechseln die Aufgabe · Enter öffnet Details · x erledigt · Strg/⌘ Z macht rückgängig',
    empty: 'Nichts überfällig, nichts heute fällig, nichts in Arbeit, nichts auf DEFCON 1–2.',
    emptyFocused: ' — im aktuellen Projektfokus.',
    back: 'Zurück zum Board mit t oder Escape',
    foot: 'Klick markiert · Doppelklick öffnet · 1–5 verschiebt · x auf Done · t zurück zum Board',
    sections: {
      overdue: { label: 'Überfällig', hint: 'Termin verstrichen' },
      today: { label: 'Heute fällig', hint: 'heute abgeben' },
      doing: { label: 'In Arbeit', hint: 'läuft gerade' },
      hot: { label: 'Brennt', hint: 'DEFCON 1–2, nicht in Arbeit' },
    },
  },

  deadline: {
    none: 'keine Deadline',
    noneTitle: 'Keine Deadline gesetzt',
    title: (date: string, countdown: string) => `Deadline: ${date} — ${countdown}`,
  },

  quickAdd: {
    placeholder: 'Task … !2 @morgen',
    label: 'Neuer Task',
    hintDefcon: 'DEFCON',
    hintDue: 'fällig',
    /** Example date tokens shown under the input. */
    hintTokens: ['@morgen', '@fr', '@+3d'],
  },

  taskDialog: {
    plannedFor: 'Geplant für',
    reviewOn: 'Wiedervorlage',
    blockedReason: 'Wartet auf / Blockiert durch',
    planningHint: 'Planung und Wiedervorlage ändern die Fälligkeit nicht.',
    title: 'Task bearbeiten',
    titleLabel: 'Titel',
    defconLabel: 'Defcon — Priorität',
    projectLabel: 'Projekt',
    statusLabel: 'Status',
    dueLabel: 'Fällig am',
    dueToday: 'heute',
    dueTomorrow: 'morgen',
    dueWeek: '+1 Woche',
    checklistLabel: 'Checkliste',
    checkToggle: (text: string) => `${text} abhaken`,
    checkStep: (index: number) => `Schritt ${index}`,
    checkRemove: 'Schritt entfernen',
    checkAddPlaceholder: 'Schritt hinzufügen …',
    checkAdd: 'Hinzufügen',
    noteLabel: 'Notiz',
    notePlaceholder: 'Kontext, Links, offene Fragen …',
    deleteTitle: 'Task löschen',
  },

  projectDialog: {
    titleNew: 'Neues Projekt',
    titleEdit: 'Projekt bearbeiten',
    nameLabel: 'Projektname',
    namePlaceholder: 'z. B. Migration Cloud',
    descriptionLabel: 'Beschreibung',
    descriptionPlaceholder: 'Worum geht es in diesem Projekt?',
    descriptionHint: 'Wird vollständig in der Projektübersicht angezeigt.',
    deadlineLabel: 'Deadline',
    plusWeek: '+1 Woche',
    plusMonth: '+1 Monat',
    plusQuarter: '+1 Quartal',
    colorLabel: 'Farbe',
    colorSwatch: (color: string) => `Farbe ${color}`,
    confirmWithTasks: (count: number) => `${count} Tasks mitlöschen?`,
    confirmEmpty: 'Wirklich löschen?',
  },

  dialog: {
    closeTitle: 'Schliessen (Esc)',
  },

  help: {
    title: 'Defcon 1 — Bedienung',
    keyboard: 'Tastatur',
    mouse: 'Maus',
    quickAdd: 'Schnellerfassung',
    keys: {
      focus: 'Karten fokussieren und auswählen',
      keyboardDrag: 'Verschieben starten/beenden; Pfeiltasten bewegen, Esc bricht ab',
      search: 'Suche fokussieren',
      today: 'Heute-Arbeitsbereich: Tagesplan, Fokus, dringende und blockierte Aufgaben',
      newTask: 'Neuer Task im ersten sichtbaren Projekt (Backlog)',
      newProject: 'Neues Projekt',
      moveColumn: 'Markierten Task in Spalte 1–5 verschieben',
      setDefcon: 'DEFCON-Stufe des markierten Tasks setzen',
      edit: 'Markierten Task bearbeiten',
      done: 'Markierten Task auf Done / zurück auf Todo',
      delete: 'Markierten Task löschen',
      collapse: 'Alle Swimlanes ein-/ausklappen',
      density: 'Dichte umschalten (Komfort / Kompakt)',
      escape: 'Dialog schliessen, Auswahl und Filter aufheben',
    },
    mouseRows: {
      drag: 'Ziehen',
      dragDesc: 'Task in eine andere Spalte oder eine andere Swimlane schieben',
      click: 'Klick',
      clickDesc: 'Task markieren',
      doubleClick: 'Doppelklick',
      doubleClickDesc: 'Task bearbeiten',
      tile: 'Klick auf Kachel',
      tileDesc: 'Auf dieses Projekt fokussieren (mehrere möglich)',
      tileDouble: 'Doppelklick auf Kachel',
      tileDoubleDesc: 'Projekt bearbeiten (Name, Deadline, Farbe)',
      lane: 'Klick auf Lane-Namen',
      laneDesc: 'Nur dieses Projekt anzeigen',
    },
    quickRows: {
      defcon: 'DEFCON-Stufe direkt im Titel setzen',
      dates: 'Fälligkeitsdatum',
      datesTokens: ['@heute', '@morgen'],
      weekday: 'Nächster Wochentag',
      weekdayTokens: ['@fr', '@mo'],
      relative: 'In 3 Tagen / in 2 Wochen',
      absolute: 'Konkretes Datum',
      absoluteTokens: ['@20.09.', '@2026-09-20'],
      bothLanguages: 'Deutsche und englische Kürzel funktionieren immer, unabhängig von der Sprache der Oberfläche.',
    },
    priorityLabel: 'Priorität',
    priorityText:
      'Innerhalb jeder Spalte stehen die dringendsten Tasks zuoberst — ein DEFCON 1 rutscht ' +
      'nach einer Prioritätsänderung von selbst nach oben. Der Schalter «Tasks» in der Kopfzeile ' +
      'stellt auf «Manuell» um, dann gilt genau die Reihenfolge, in der du die Karten hinziehst. ' +
      'Erreicht ein Task DEFCON 1, ertönt zusätzlich der Alarmton — abschalten mit «Alarm».',
    storageLabel: 'Speicherort',
    storageServer: () => (
      <>
        Alle Daten liegen in <code>data/board.json</code> im Projektordner. Damit sehen Safari,
        Firefox und Chrome dasselbe Board, und Änderungen aus einem anderen Browser erscheinen nach
        wenigen Sekunden automatisch. Vor jedem Schreibvorgang legt der Server eine Kopie unter{' '}
        <code>data/backups/</code> ab.
      </>
    ),
    storageLocal: () => (
      <>
        Es läuft kein Server, deshalb liegen die Daten nur im Speicher dieses Browsers und sind in
        anderen Browsern nicht sichtbar. Für browserübergreifende Speicherung im Projektordner{' '}
        <code>npm start</code> ausführen und <code>http://127.0.0.1:7777</code> öffnen.
      </>
    ),
    loadDemo: 'Demo-Daten laden',
  },

  empty: {
    intro:
      'Ein Taskboard für parallele Projekte. Jedes Projekt ist eine Swimlane mit eigener Deadline, jeder Task hat eine DEFCON-Stufe von 1 (sofort) bis 5 (irgendwann). Tasks zieht man mit der Maus von Spalte zu Spalte.',
    firstProject: 'Erstes Projekt anlegen',
    loadDemo: 'Demo-Daten laden',
    storage: (where: string) => `Speicherort: ${where}`,
  },

  notice: {
    browserSaveFailed: 'Der Browser konnte das Board nicht speichern. Sichere deine Änderungen mit Export, bevor du die Seite schliesst.',
    conflict:
      'Board wurde in einem anderen Browser geändert — die neuere Version ist jetzt geladen.',
    migrated: 'Board aus dem Browser-Speicher übernommen und in data/board.json gesichert.',
    saveFailed: (detail: string) => `Speichern fehlgeschlagen: ${detail}`,
  },

  confirm: {
    deleteTask: (title: string) => `Task löschen?\n\n${title}`,
    import: (projects: number, tasks: number) =>
      `Import: ${projects} Projekte, ${tasks} Tasks.\n\nOK ersetzt das aktuelle Board. Abbrechen bricht ab.`,
    importFailed: (detail: string) => `Import fehlgeschlagen: ${detail}`,
    importEmpty: 'Keine Projekte oder Tasks in der Datei gefunden',
    loadDemo: 'Demo-Daten ersetzen das aktuelle Board. Fortfahren?',
  },

  /** Content of the demo board. Project names are the same in both languages. */
  demo: {
    tasks: {
      terraform: 'Terraform-Module refactoren',
      firewall: 'Netzwerk-Freigabe Firewall',
      runbook: 'Runbook schreiben',
      costs: 'Kostenmodell prüfen',
      landingZone: 'Landing Zone aufgesetzt',
      metrics: 'Kennzahlen abstimmen',
      dashboard: 'Dashboard-Layout finalisieren',
      sources: 'Datenquellen inventarisiert',
      requirements: 'Anforderungen sammeln',
      prototype: 'Prototyp skizzieren',
    },
    /** Checklist steps of the demo tasks that have one. */
    steps: {
      sketchFlow: 'Ablauf skizzieren',
      describeRollback: 'Rollback beschreiben',
      reviewWithOps: 'Review mit Ops',
      accountsCreated: 'Accounts angelegt',
      guardrailsActive: 'Guardrails aktiv',
    },
    descriptions: {
      cloud:
        'Lift & Shift der drei Kernanwendungen in die neue Landing Zone, inklusive Netzwerk-Freigaben und Kostenmodell. Abnahme durch das Betriebsteam.',
      reporting:
        'Quartalsbericht für die Geschäftsleitung: Kennzahlen abstimmen, Datenquellen dokumentieren, Dashboard bis zur Sitzung fertigstellen.',
      onboarding:
        'Vorprojekt für ein Self-Service-Onboarding neuer Mitarbeitender. Noch keine Zusage, erst Anforderungen und ein Prototyp.',
    },
  },
}

export type Dict = typeof de
