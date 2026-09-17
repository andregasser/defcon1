import { DEFCON_BY_LEVEL, DEFCON_LEVELS } from '../constants'
import type { Defcon, Density, LaneSort, Prefs, SaveState, StorageMode } from '../types'

interface Props {
  query: string
  onQuery: (value: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  defconFilter: Set<Defcon>
  onToggleDefcon: (level: Defcon) => void
  prefs: Prefs
  onDensity: (value: Density) => void
  onLaneSort: (value: LaneSort) => void
  onToggleHideDone: () => void
  onToggleHideEmpty: () => void
  mode: StorageMode
  saveState: SaveState
  /** Lowest (= most urgent) DEFCON level among all open tasks. */
  alertLevel: Defcon | null
  openCount: number
  doingCount: number
  blockedCount: number
  /** Open tasks that stopped moving — see `staleDays`. */
  staleCount: number
  onExport: () => void
  onImport: () => void
  onHelp: () => void
}

const MODE_LABEL: Record<StorageMode, string> = {
  loading: 'verbinde …',
  server: 'data/board.json',
  local: 'nur dieser Browser',
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: '',
  saving: ' · speichert',
  saved: ' · gespeichert',
  error: ' · Fehler',
}

export function TopBar({
  query,
  onQuery,
  searchRef,
  defconFilter,
  onToggleDefcon,
  prefs,
  onDensity,
  onLaneSort,
  onToggleHideDone,
  onToggleHideEmpty,
  mode,
  saveState,
  alertLevel,
  openCount,
  doingCount,
  blockedCount,
  staleCount,
  onExport,
  onImport,
  onHelp,
}: Props) {
  const alert = alertLevel ? DEFCON_BY_LEVEL[alertLevel] : null

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ▲
          </span>
          <span className="brand-name">Defcon&nbsp;1</span>
        </div>

        {alert && (
          <span
            className="alert-pill"
            data-live={alert.level <= 2}
            style={{ color: alert.color, borderColor: alert.color }}
            title={`Dringendste offene Task: DEFCON ${alert.level} — ${alert.code}`}
          >
            <span className="alert-dot" />
            Defcon {alert.level}
          </span>
        )}

        <span className="spacer" />

        <div className="search">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            placeholder="Tasks durchsuchen  /"
            aria-label="Tasks durchsuchen"
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Escape') {
                onQuery('')
                event.currentTarget.blur()
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => onQuery('')}
              title="Suche leeren"
            >
              ✕
            </button>
          )}
        </div>

        <span
          className="sync"
          data-mode={mode}
          data-state={saveState}
          title={
            mode === 'server'
              ? 'Daten liegen in data/board.json — für alle Browser gleich'
              : 'Kein Server erreichbar: Daten liegen nur in diesem Browser. Starte "npm start" für browserübergreifende Speicherung.'
          }
        >
          <span className="sync-dot" />
          {MODE_LABEL[mode]}
          {SAVE_LABEL[saveState]}
        </span>

        <button type="button" className="btn sm" onClick={onExport} title="Board als JSON sichern">
          Export
        </button>
        <button type="button" className="btn sm" onClick={onImport} title="Board aus JSON laden">
          Import
        </button>
        <button type="button" className="btn icon" onClick={onHelp} title="Hilfe & Shortcuts (?)">
          ?
        </button>
      </div>

      <div className="topbar-row">
        <span className="micro">Defcon</span>
        {DEFCON_LEVELS.map((level) => {
          const meta = DEFCON_BY_LEVEL[level]
          const active = defconFilter.has(level)
          return (
            <button
              key={level}
              type="button"
              className="chip"
              aria-pressed={active}
              onClick={() => onToggleDefcon(level)}
              title={`DEFCON ${level} — ${meta.code} (${meta.label})`}
            >
              <span className="chip-swatch" style={{ background: meta.color }} />
              {level}
            </button>
          )
        })}

        <span className="divider" />

        <button
          type="button"
          className="chip"
          aria-pressed={prefs.hideDone}
          onClick={onToggleHideDone}
          title="Done-Spalte auf die Zählung schrumpfen und Platz gewinnen"
        >
          Done schmal
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={prefs.hideEmptyLanes}
          onClick={onToggleHideEmpty}
          title="Swimlanes ohne passende Tasks ausblenden"
        >
          Leere Lanes aus
        </button>

        <span className="divider" />

        <span className="micro">Dichte</span>
        <div className="seg" role="group" aria-label="Dichte">
          <button
            type="button"
            aria-pressed={prefs.density === 'comfort'}
            onClick={() => onDensity('comfort')}
          >
            Komfort
          </button>
          <button
            type="button"
            aria-pressed={prefs.density === 'compact'}
            onClick={() => onDensity('compact')}
          >
            Kompakt
          </button>
        </div>

        <span className="micro">Lanes</span>
        <div className="seg" role="group" aria-label="Reihenfolge der Swimlanes">
          <button
            type="button"
            aria-pressed={prefs.laneSort === 'deadline'}
            onClick={() => onLaneSort('deadline')}
            title="Dringendste Deadline oben"
          >
            Deadline
          </button>
          <button
            type="button"
            aria-pressed={prefs.laneSort === 'manual'}
            onClick={() => onLaneSort('manual')}
            title="Eigene Reihenfolge (mit ↑ ↓ in der Lane)"
          >
            Manuell
          </button>
        </div>

        <span className="spacer" />

        <span className="micro" title="Stehengelassen: zu lange unverändert in In Progress oder Blocked">
          {openCount} offen · {doingCount} laufen · {blockedCount} blockiert
          {staleCount > 0 && ` · ${staleCount} stehen`}
        </span>
      </div>
    </header>
  )
}
