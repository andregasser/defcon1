import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardData, SaveState, StorageMode } from '../types'
import {
  fetchState,
  loadLocalData,
  putState,
  saveLocalData,
} from '../lib/storage'

const SAVE_DEBOUNCE_MS = 400
const POLL_INTERVAL_MS = 4000
const SAVED_BADGE_MS = 1400

const EMPTY: BoardData = { projects: [], tasks: [] }

export interface BoardStore {
  data: BoardData
  mode: StorageMode
  saveState: SaveState
  /** Reachable file path on disk, when the persistence server answered. */
  notice: string | null
  clearNotice: () => void
  /** Applies a pure transformation and schedules a save. */
  update: (recipe: (data: BoardData) => BoardData) => void
  /** Wholesale replace — import, demo data, reset. */
  replaceAll: (data: BoardData) => void
  /** Suspends background polling, e.g. while dragging or editing in a dialog. */
  setSyncPaused: (paused: boolean) => void
}

/**
 * Owns the board data and its persistence.
 *
 * Prefers the local persistence server (one shared board.json, so Safari and
 * Firefox see the same tasks) and falls back to localStorage when the app was
 * opened without the server. Concurrent edits from a second browser are caught
 * by the rev counter and pulled in instead of silently overwritten.
 */
export function useBoard(): BoardStore {
  const [data, setData] = useState<BoardData>(EMPTY)
  const [mode, setMode] = useState<StorageMode>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [notice, setNotice] = useState<string | null>(null)

  const dataRef = useRef<BoardData>(EMPTY)
  const revRef = useRef(0)
  const modeRef = useRef<StorageMode>('loading')
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const queuedRef = useRef(false)
  const pausedRef = useRef(false)
  const initializedRef = useRef(false)

  const commit = useCallback((next: BoardData, markDirty: boolean) => {
    dataRef.current = next
    dirtyRef.current = markDirty || dirtyRef.current
    setData(next)
  }, [])

  const adopt = useCallback((next: BoardData, rev: number) => {
    revRef.current = rev
    dataRef.current = next
    dirtyRef.current = false
    setData(next)
  }, [])

  /* ------------------------------------------------------------------ save */

  const saveOnce = useCallback(async () => {
    const snapshot = dataRef.current
    setSaveState('saving')

    if (modeRef.current !== 'server') {
      saveLocalData(snapshot)
      if (dataRef.current === snapshot) dirtyRef.current = false
      setSaveState('saved')
      return
    }

    const result = await putState(revRef.current, snapshot)
    if (result.ok) {
      revRef.current = result.rev
      if (dataRef.current === snapshot) dirtyRef.current = false
      setSaveState('saved')
      return
    }

    if (result.conflict) {
      // Another browser was ahead of us. Its version wins; ours would have
      // overwritten changes we never saw.
      adopt(result.state.data, result.state.rev)
      setSaveState('idle')
      setNotice('Board wurde in einem anderen Browser geändert — die neuere Version ist jetzt geladen.')
      return
    }

    setSaveState('error')
    setNotice(`Speichern fehlgeschlagen: ${result.error}`)
  }, [adopt])

  const flush = useCallback(async () => {
    if (savingRef.current) {
      queuedRef.current = true
      return
    }
    savingRef.current = true
    try {
      do {
        queuedRef.current = false
        await saveOnce()
      } while (queuedRef.current)
    } finally {
      savingRef.current = false
    }
  }, [saveOnce])

  /* ------------------------------------------------------------------ init */

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    let cancelled = false

    void (async () => {
      const remote = await fetchState()
      if (cancelled) return

      if (!remote) {
        modeRef.current = 'local'
        setMode('local')
        const local = loadLocalData()
        if (local) adopt(local, 0)
        return
      }

      modeRef.current = 'server'
      setMode('server')

      const local = loadLocalData()
      const remoteEmpty = remote.data.projects.length === 0 && remote.data.tasks.length === 0
      if (remoteEmpty && local && local.projects.length > 0) {
        // First run with the server after using the browser-only fallback:
        // carry the existing board over instead of showing an empty screen.
        adopt(local, remote.rev)
        dirtyRef.current = true
        setNotice('Board aus dem Browser-Speicher übernommen und in data/board.json gesichert.')
        void flush()
        return
      }

      adopt(remote.data, remote.rev)
    })()

    return () => {
      cancelled = true
    }
  }, [adopt, flush])

  /* -------------------------------------------------------- debounced save */

  useEffect(() => {
    if (mode === 'loading' || !dirtyRef.current) return
    const timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [data, mode, flush])

  /* ------------------------------------------- pick up edits from elsewhere */

  useEffect(() => {
    if (mode !== 'server') return
    const timer = setInterval(() => {
      if (pausedRef.current || dirtyRef.current || savingRef.current) return
      void (async () => {
        const remote = await fetchState()
        if (!remote || remote.rev === revRef.current) return
        if (pausedRef.current || dirtyRef.current || savingRef.current) return
        adopt(remote.data, remote.rev)
      })()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [mode, adopt])

  /* ------------------------------------------------------- flush on unload */

  useEffect(() => {
    const onHide = () => {
      if (!dirtyRef.current) return
      if (modeRef.current === 'server') {
        // fetch() is unreliable during teardown; keepalive gives it a chance.
        void fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rev: revRef.current, data: dataRef.current }),
          keepalive: true,
        }).catch(() => {})
      } else {
        saveLocalData(dataRef.current)
      }
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  /* ------------------------------------------------------- transient badge */

  useEffect(() => {
    if (saveState !== 'saved') return
    const timer = setTimeout(() => setSaveState('idle'), SAVED_BADGE_MS)
    return () => clearTimeout(timer)
  }, [saveState])

  /* ------------------------------------------------------------------- api */

  const update = useCallback(
    (recipe: (current: BoardData) => BoardData) => {
      const next = recipe(dataRef.current)
      if (next === dataRef.current) return
      commit(next, true)
    },
    [commit],
  )

  const replaceAll = useCallback(
    (next: BoardData) => {
      commit(next, true)
    },
    [commit],
  )

  const setSyncPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused
  }, [])

  const clearNotice = useCallback(() => setNotice(null), [])

  return { data, mode, saveState, notice, clearNotice, update, replaceAll, setSyncPaused }
}
