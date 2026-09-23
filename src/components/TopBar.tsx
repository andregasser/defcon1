import { useId, useState } from 'react'
import { DEFCON_BY_LEVEL, DEFCON_LEVELS } from '../constants'
import { langCode, LANGS, langName, useT } from '../i18n'
import type {
  Defcon,
  Density,
  Lang,
  LaneSort,
  Prefs,
  SaveState,
  StorageMode,
  TaskSort,
} from '../types'

interface Props {
  narrow: boolean
  query: string
  onQuery: (value: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  defconFilter: Set<Defcon>
  onToggleDefcon: (level: Defcon) => void
  prefs: Prefs
  onDensity: (value: Density) => void
  onLaneSort: (value: LaneSort) => void
  onTaskSort: (value: TaskSort) => void
  onLang: (value: Lang) => void
  onToggleHideDone: () => void
  onToggleHideEmpty: () => void
  onToggleSound: () => void
  mode: StorageMode
  saveState: SaveState
  /** Lowest (= most urgent) DEFCON level among all open tasks. */
  alertLevel: Defcon | null
  openCount: number
  doingCount: number
  blockedCount: number
  /** Open tasks that stopped moving — see `staleDays`. */
  staleCount: number
  todayOpen: boolean
  /** Tasks on the Heute list, across all projects. */
  todayCount: number
  onToggleToday: () => void
  onExport: () => void
  onImport: () => void
  onHelp: () => void
}

export function TopBar({
  narrow,
  query,
  onQuery,
  searchRef,
  defconFilter,
  onToggleDefcon,
  prefs,
  onDensity,
  onLaneSort,
  onTaskSort,
  onLang,
  onToggleHideDone,
  onToggleHideEmpty,
  onToggleSound,
  mode,
  saveState,
  alertLevel,
  openCount,
  doingCount,
  blockedCount,
  staleCount,
  todayOpen,
  todayCount,
  onToggleToday,
  onExport,
  onImport,
  onHelp,
}: Props) {
  const t = useT()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsId = useId()
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
            title={t.topbar.alertTitle(alert.level, alert.code)}
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
            placeholder={t.topbar.searchPlaceholder}
            aria-label={t.topbar.searchLabel}
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
              title={t.topbar.clearSearch}
            >
              ✕
            </button>
          )}
        </div>

        <span
          className="sync"
          data-mode={mode}
          data-state={saveState}
          title={t.topbar.syncTitle[mode === 'loading' ? 'local' : mode]}
        >
          <span className="sync-dot" />
          {t.topbar.mode[mode]}
          {t.topbar.saveSuffix[saveState]}
        </span>

        <button type="button" className="btn sm" onClick={onExport} title={t.topbar.exportTitle}>
          {t.topbar.export}
        </button>
        <button type="button" className="btn sm" onClick={onImport} title={t.topbar.importTitle}>
          {t.topbar.import}
        </button>
        <button type="button" className="btn icon help-button" onClick={onHelp} title={t.topbar.helpTitle}>
          ?
        </button>
      </div>

      <div className="topbar-row">
        <button
          type="button"
          className="chip"
          aria-pressed={todayOpen}
          onClick={onToggleToday}
          title={t.topbar.todayTitle}
        >
          {t.topbar.today}
          {todayCount > 0 && <b>{todayCount}</b>}
        </button>

        {narrow && (
          <button
            type="button"
            className="btn view-toggle"
            aria-expanded={optionsOpen}
            aria-controls={optionsId}
            onClick={() => setOptionsOpen((open) => !open)}
          >
            {t.topbar.viewOptions}
            {defconFilter.size > 0 && <b> · {defconFilter.size}</b>}
          </button>
        )}

        <div id={optionsId} className="view-options" hidden={narrow && !optionsOpen}>
          <span className="divider" />

          <span className="micro">{t.topbar.defconLabel}</span>
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
                title={t.defcon.badgeTitle(level, meta.code, t.defcon.label[level])}
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
            title={t.topbar.hideDoneTitle}
          >
            {t.topbar.hideDone}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={prefs.hideEmptyLanes}
            onClick={onToggleHideEmpty}
            title={t.topbar.hideEmptyTitle}
          >
            {t.topbar.hideEmpty}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={prefs.sound}
            onClick={onToggleSound}
            title={t.topbar.alarmTitle}
          >
            {t.topbar.alarm}
          </button>

          <span className="divider" />

          <span className="micro">{t.topbar.densityLabel}</span>
          <div className="seg" role="group" aria-label={t.topbar.densityLabel}>
            <button
              type="button"
              aria-pressed={prefs.density === 'comfort'}
              onClick={() => onDensity('comfort')}
            >
              {t.topbar.comfort}
            </button>
            <button
              type="button"
              aria-pressed={prefs.density === 'compact'}
              onClick={() => onDensity('compact')}
            >
              {t.topbar.compact}
            </button>
          </div>

          <span className="micro">{t.topbar.lanesLabel}</span>
          <div className="seg" role="group" aria-label={t.topbar.lanesLabel}>
            <button
              type="button"
              aria-pressed={prefs.laneSort === 'deadline'}
              onClick={() => onLaneSort('deadline')}
              title={t.topbar.sortDeadlineTitle}
            >
              {t.topbar.sortDeadline}
            </button>
            <button
              type="button"
              aria-pressed={prefs.laneSort === 'manual'}
              onClick={() => onLaneSort('manual')}
              title={t.topbar.sortManualTitle}
            >
              {t.topbar.sortManual}
            </button>
          </div>

          <span className="micro">{t.topbar.tasksLabel}</span>
          <div className="seg" role="group" aria-label={t.topbar.tasksLabel}>
            <button
              type="button"
              aria-pressed={prefs.taskSort === 'defcon'}
              onClick={() => onTaskSort('defcon')}
              title={t.topbar.taskSortDefconTitle}
            >
              {t.topbar.taskSortDefcon}
            </button>
            <button
              type="button"
              aria-pressed={prefs.taskSort === 'manual'}
              onClick={() => onTaskSort('manual')}
              title={t.topbar.taskSortManualTitle}
            >
              {t.topbar.taskSortManual}
            </button>
          </div>

          <span className="divider" />

          <span className="micro">{t.topbar.langLabel}</span>
          <div className="seg" role="group" aria-label={t.topbar.langGroupLabel}>
            {LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                lang={lang}
                aria-pressed={prefs.lang === lang}
                onClick={() => onLang(lang)}
                // Always the endonym, so the switch reads the same in both languages.
                title={langName(lang)}
              >
                {langCode(lang)}
              </button>
            ))}
          </div>

          <span className="spacer" />

          <span className="micro" title={t.topbar.staleCounterTitle}>
            {t.topbar.counters(openCount, doingCount, blockedCount, staleCount)}
          </span>
        </div>
      </div>
    </header>
  )
}
