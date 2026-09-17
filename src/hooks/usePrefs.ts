import { useCallback, useEffect, useState } from 'react'
import { loadPrefs, savePrefs } from '../lib/storage'
import type { Prefs } from '../types'

/** Every pref that is a plain on/off switch — the ones `toggle` accepts. */
export type BoolPref = { [K in keyof Prefs]: Prefs[K] extends boolean ? K : never }[keyof Prefs]

export interface PrefsStore {
  prefs: Prefs
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  toggle: (key: BoolPref) => void
  /** Collapse state of a single swimlane. */
  toggleCollapsed: (projectId: string) => void
  setAllCollapsed: (projectIds: string[], collapsed: boolean) => void
  /** Focus filter: empty selection means "show all projects". */
  toggleFocus: (projectId: string) => void
  soloFocus: (projectId: string) => void
  clearFocus: () => void
}

/** View settings, persisted per browser — they describe the lens, not the data. */
export function usePrefs(): PrefsStore {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const set = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => (current[key] === value ? current : { ...current, [key]: value }))
  }, [])

  const toggle = useCallback((key: BoolPref) => {
    setPrefs((current) => ({ ...current, [key]: !current[key] }))
  }, [])

  const toggleCollapsed = useCallback((projectId: string) => {
    setPrefs((current) => ({
      ...current,
      collapsedProjects: current.collapsedProjects.includes(projectId)
        ? current.collapsedProjects.filter((id) => id !== projectId)
        : [...current.collapsedProjects, projectId],
    }))
  }, [])

  const setAllCollapsed = useCallback((projectIds: string[], collapsed: boolean) => {
    setPrefs((current) => ({ ...current, collapsedProjects: collapsed ? [...projectIds] : [] }))
  }, [])

  const toggleFocus = useCallback((projectId: string) => {
    setPrefs((current) => ({
      ...current,
      focusedProjects: current.focusedProjects.includes(projectId)
        ? current.focusedProjects.filter((id) => id !== projectId)
        : [...current.focusedProjects, projectId],
    }))
  }, [])

  const soloFocus = useCallback((projectId: string) => {
    setPrefs((current) => ({
      ...current,
      focusedProjects:
        current.focusedProjects.length === 1 && current.focusedProjects[0] === projectId
          ? []
          : [projectId],
    }))
  }, [])

  const clearFocus = useCallback(() => {
    setPrefs((current) => (current.focusedProjects.length === 0 ? current : { ...current, focusedProjects: [] }))
  }, [])

  return { prefs, set, toggle, toggleCollapsed, setAllCollapsed, toggleFocus, soloFocus, clearFocus }
}
