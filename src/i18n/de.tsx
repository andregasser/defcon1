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
    alertTitle: (level: Defcon, code: string) =>
      `Dringendste offene Task: DEFCON ${level} — ${code}`,
    searchPlaceholder: 'Tasks durchsuchen  /',
    searchLabel: 'Tasks durchsuchen',
    clearSearch: 'Suche leeren',
    mode: {
      loading: 'verbinde …',
      server: 'data/board.json',
      local: 'nur dieser Browser',
    },
    saveSuffix: {
      idle: '',
      saving: ' · speichert',
      saved: ' · gespeichert',
      error: ' · Fehler',
    },
    syncTitle: {
      server: 'Daten liegen in data/board.json — für alle Browser gleich',
      local:
        'Kein Server erreichbar: Daten liegen nur in diesem Browser. Starte "npm start" für browserübergreifende Speicherung.',
    },
    export: 'Export',
    exportTitle: 'Board als JSON sichern',
    import: 'Import',
    importTitle: 'Board aus JSON laden',
    helpTitle: 'Hilfe & Shortcuts (?)',
    defconLabel: 'Defcon',
    hideDone: 'Done schmal',
    hideDoneTitle: 'Done-Spalte auf die Zählung schrumpfen und Platz gewinnen',
    hideEmpty: 'Leere Lanes aus',
    hideEmptyTitle: 'Swimlanes ohne passende Tasks ausblenden',
    densityLabel: 'Dichte',
    comfort: 'Komfort',
    compact: 'Kompakt',
    lanesLabel: 'Lanes',
    sortDeadline: 'Deadline',
    sortDeadlineTitle: 'Dringendste Deadline oben',
    sortManual: 'Manuell',
    sortManualTitle: 'Eigene Reihenfolge (mit ↑ ↓ in der Lane)',
    langLabel: 'Sprache',
    langGroupLabel: 'Sprache der Oberfläche',
    counters: (open: number, doing: number, blocked: number) =>
      `${open} offen · ${doing} laufen · ${blocked} blockiert`,
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
  },

  board: {
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
  },

  cell: {
    narrowTitle: (shown: number, total: number) =>
      `${shown} von ${total} erledigten Tasks passen zum Filter — Ablegen weiterhin möglich`,
    hidden: (count: number) => `+ ${count} ausgeblendet`,
    hiddenTitle: 'Durch Filter ausgeblendet',
    add: '+ Task',
    addTitle: 'Task hinzufügen',
  },

  card: {
    noteTitle: 'Notiz vorhanden',
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
    title: 'Task bearbeiten',
    titleLabel: 'Titel',
    defconLabel: 'Defcon — Priorität',
    projectLabel: 'Projekt',
    statusLabel: 'Status',
    dueLabel: 'Fällig am',
    dueToday: 'heute',
    dueTomorrow: 'morgen',
    dueWeek: '+1 Woche',
    noteLabel: 'Notiz',
    notePlaceholder: 'Kontext, Links, offene Fragen …',
    deleteTitle: 'Task löschen',
  },

  projectDialog: {
    titleNew: 'Neues Projekt',
    titleEdit: 'Projekt bearbeiten',
    nameLabel: 'Projektname',
    namePlaceholder: 'z. B. Migration Cloud',
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
      search: 'Suche fokussieren',
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
  },
}

export type Dict = typeof de
