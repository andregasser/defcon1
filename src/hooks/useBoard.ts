import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardData, BoardNotice, Lang, RecoverySnapshot, RecoveryTarget, SaveState, ServerRevision, StorageMode } from '../types'
import { createDemoData } from '../lib/board'
import { isBrowserDemo } from '../lib/runtime'
import { RECOVERY_LIMIT, isRecoveryStorageKey, loadRecovery, mergeRecovery, pruneRecovery, recoverySnapshot, removePendingRecovery, saveRecovery } from '../lib/recovery'
import { fetchState, loadLocalData, normalizeData, putState, restoreState, saveLocalData } from '../lib/storage'

const SAVE_DEBOUNCE_MS = 400
const POLL_INTERVAL_MS = 4000
const SAVED_BADGE_MS = 1400
const EMPTY: BoardData = { projects: [], tasks: [] }

export interface BoardStore {
  data: BoardData
  mode: StorageMode
  saveState: SaveState
  notice: BoardNotice | null
  clearNotice: () => void
  update: (recipe: (data: BoardData) => BoardData) => void
  replaceAll: (data: BoardData) => void
  setSyncPaused: (paused: boolean) => void
  retrySave: () => Promise<void>
  recoverySnapshots: RecoverySnapshot[]
  recoveryDurable: boolean
  reviewRecovery: () => Promise<RecoveryTarget | null>
  restoreRecovery: (data: BoardData, target: RecoveryTarget) => Promise<boolean>
}

/** Server writes share one queue; recovery copies never become implicit imports. */
export function useBoard(lang: Lang = 'en'): BoardStore {
  const initialLang = useRef(lang)
  const [data, setData] = useState<BoardData>(EMPTY)
  const [mode, setMode] = useState<StorageMode>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [notice, setNotice] = useState<BoardNotice | null>(null)
  const [recoverySnapshots, setRecoverySnapshots] = useState(loadRecovery)
  const [recoveryDurable, setRecoveryDurable] = useState(true)
  // Only this hook's unsaved copies live in memory. Shared durable entries are
  // re-read, never written back from a private snapshot of another tab's history.
  const memoryRef = useRef<{ snapshot: RecoverySnapshot; supersedes: RecoverySnapshot[] }[]>([])
  const pendingRef = useRef<RecoverySnapshot | null>(null)
  const supersededPendingRef = useRef<RecoverySnapshot[]>([])
  const dataRef = useRef(EMPTY)
  const revRef = useRef<ServerRevision>(0)
  const generationRef = useRef(0)
  const modeRef = useRef<StorageMode>('loading')
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const pausedRef = useRef(false)
  const localEditRef = useRef(false)
  const aliveRef = useRef(false)
  const connectionRef = useRef(false)
  const retryAtRef = useRef(0)
  const recoveryRequiredRef = useRef(false)

  const refreshRecovery = useCallback(() => {
    setRecoverySnapshots(mergeRecovery([
      ...loadRecovery(), ...memoryRef.current.map((entry) => entry.snapshot),
      ...(pendingRef.current ? [pendingRef.current] : []),
    ]))
  }, [])

  const persistRecovery = useCallback(() => {
    let durable = true
    memoryRef.current = memoryRef.current.filter((entry) => {
      if (!saveRecovery(entry.snapshot)) { durable = false; return true }
      removePendingRecovery(entry.supersedes)
      return false
    })
    if (pendingRef.current) {
      if (saveRecovery(pendingRef.current)) {
        removePendingRecovery(supersededPendingRef.current)
        supersededPendingRef.current = []
      } else durable = false
    }
    pruneRecovery()
    refreshRecovery()
    setRecoveryDurable(durable)
    if (!durable) setNotice((current) => current?.kind === 'conflict' ? current : { kind: 'browserSaveFailed' })
    return durable
  }, [refreshRecovery])

  const capture = useCallback((next: BoardData, reason: RecoverySnapshot['reason']) => {
    memoryRef.current = [...memoryRef.current, { snapshot: recoverySnapshot(next, reason), supersedes: [
      ...supersededPendingRef.current, ...(pendingRef.current ? [pendingRef.current] : []),
    ] }].slice(-RECOVERY_LIMIT)
    pendingRef.current = null
    supersededPendingRef.current = []
    return persistRecovery()
  }, [persistRecovery])

  const commit = useCallback((next: BoardData) => {
    dataRef.current = next
    generationRef.current++
    dirtyRef.current = true
    if (modeRef.current === 'local' || modeRef.current === 'loading') localEditRef.current = true
    if (pendingRef.current) supersededPendingRef.current.push(pendingRef.current)
    pendingRef.current = recoverySnapshot(next, 'pending')
    persistRecovery()
    setData(next)
  }, [persistRecovery])

  const adopt = useCallback((next: BoardData, rev: ServerRevision) => {
    revRef.current = rev
    dataRef.current = next
    generationRef.current++
    dirtyRef.current = false
    retryAtRef.current = 0
    setData(next)
  }, [])

  const flush = useCallback(async () => {
    if (savingRef.current || !dirtyRef.current || recoveryRequiredRef.current || modeRef.current === 'loading') return
    savingRef.current = true
    try {
      // An edit during the request is saved next, using the returned revision.
      while (aliveRef.current && dirtyRef.current) {
        const snapshot = dataRef.current
        setSaveState('saving')
        const result = modeRef.current === 'server'
          ? await putState(revRef.current, snapshot)
          : saveLocalData(snapshot) ? { ok: true as const, rev: revRef.current } : { ok: false as const, conflict: false as const, error: 'browser storage unavailable' }
        if (!aliveRef.current) return
        if (result.ok) {
          revRef.current = result.rev
          retryAtRef.current = 0
          if (dataRef.current === snapshot) {
            dirtyRef.current = false
            removePendingRecovery([...supersededPendingRef.current, ...(pendingRef.current ? [pendingRef.current] : [])])
            supersededPendingRef.current = []
            pendingRef.current = null
            persistRecovery()
          }
          setSaveState('saved')
          // A retry does not resolve a previous conflict or dismiss its copy.
          setNotice((current) => current?.kind === 'saveFailed' ? null : current)
          continue
        }
        capture(dataRef.current, result.conflict ? 'conflict' : 'saveFailed')
        if (result.conflict) {
          recoveryRequiredRef.current = !!result.state.recoveryRequired
          adopt(result.state.data, result.state.rev)
          setSaveState('idle')
          setNotice({ kind: 'conflict' })
        } else {
          retryAtRef.current = Date.now() + POLL_INTERVAL_MS
          setSaveState('error')
          setNotice((current) => current?.kind === 'browserSaveFailed' || current?.kind === 'conflict' ? current : modeRef.current === 'server'
            ? { kind: 'saveFailed', detail: result.error } : { kind: 'browserSaveFailed' })
        }
        break
      }
    } finally { savingRef.current = false }
  }, [adopt, capture, persistRecovery])

  const connect = useCallback(async () => {
    if (connectionRef.current) return false
    connectionRef.current = true
    const generation = generationRef.current
    try {
      const remote = await fetchState()
      if (!aliveRef.current || generation !== generationRef.current || localEditRef.current || !remote) return false
      modeRef.current = 'server'
      setMode('server')
      recoveryRequiredRef.current = !!remote.recoveryRequired
      if (remote.recoveryRequired) {
        adopt(remote.data, remote.rev)
        setNotice({ kind: 'recoveryRequired' })
        return true
      }
      const local = loadLocalData()
      if (!remote.data.projects.length && !remote.data.tasks.length && local?.projects.length) {
        adopt(local, remote.rev)
        commit(local)
        setNotice({ kind: 'migrated' })
        void flush()
      } else adopt(remote.data, remote.rev)
      return true
    } finally { connectionRef.current = false }
  }, [adopt, commit, flush])

  useEffect(() => {
    aliveRef.current = true
    let cancelled = false
    if (isBrowserDemo()) {
      modeRef.current = 'demo'
      setMode('demo')
      const local = loadLocalData()
      adopt(local ?? createDemoData(initialLang.current), 0)
      if (!local) { commit(dataRef.current); void flush() }
    } else {
      void (async () => {
        if (await connect() || cancelled) return
        if (modeRef.current !== 'loading') return
        modeRef.current = 'local'
        setMode('local')
        if (!dirtyRef.current) {
          const local = loadLocalData()
          if (local) adopt(local, 0)
        }
      })()
    }
    return () => { cancelled = true; aliveRef.current = false }
  }, [adopt, commit, connect, flush])

  useEffect(() => {
    if (mode === 'loading' || !dirtyRef.current) return
    const delay = Math.max(SAVE_DEBOUNCE_MS, retryAtRef.current - Date.now())
    const timer = setTimeout(() => void flush(), delay)
    return () => clearTimeout(timer)
  }, [data, mode, saveState, flush])

  useEffect(() => {
    const timer = setInterval(() => {
      if (savingRef.current) return
      if (dirtyRef.current) {
        if (Date.now() >= retryAtRef.current) void flush()
        return
      }
      if (modeRef.current === 'local' && !localEditRef.current) { void connect(); return }
      if (modeRef.current !== 'server' || pausedRef.current) return
      const generation = generationRef.current
      const rev = revRef.current
      void fetchState().then((remote) => {
        if (!aliveRef.current || !remote || pausedRef.current || dirtyRef.current || savingRef.current ||
          generation !== generationRef.current || rev !== revRef.current ||
          (remote.rev === rev && !!remote.recoveryRequired === recoveryRequiredRef.current)) return
        recoveryRequiredRef.current = !!remote.recoveryRequired
        adopt(remote.data, remote.rev)
        setNotice((current) => remote.recoveryRequired ? { kind: 'recoveryRequired' }
          : current?.kind === 'recoveryRequired' ? null : current)
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [adopt, connect, flush])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (isRecoveryStorageKey(event.key)) refreshRecovery()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refreshRecovery])

  useEffect(() => {
    // A synchronous browser copy is dependable during teardown; another PUT is
    // not, and would race the in-flight request with the same revision.
    const onHide = () => {
      if (!dirtyRef.current) return
      persistRecovery()
      if (modeRef.current === 'local' || modeRef.current === 'demo') saveLocalData(dataRef.current)
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [persistRecovery])

  useEffect(() => {
    if (saveState !== 'saved') return
    const timer = setTimeout(() => setSaveState('idle'), SAVED_BADGE_MS)
    return () => clearTimeout(timer)
  }, [saveState])

  const reviewRecovery = useCallback(async (): Promise<RecoveryTarget | null> => {
    if (savingRef.current || modeRef.current === 'loading') return null
    const generation = generationRef.current
    if (modeRef.current !== 'server') return { rev: revRef.current, generation }
    const remote = await fetchState()
    if (!remote || generation !== generationRef.current || savingRef.current) return null
    // The fresh GET checks availability; it must not authorize replacing a
    // newer board that has never been displayed to the user.
    return { rev: revRef.current, recoveryToken: remote.recoveryToken, generation }
  }, [])

  const restoreRecovery = useCallback(async (input: BoardData, target: RecoveryTarget): Promise<boolean> => {
    if (savingRef.current || generationRef.current !== target.generation) return false
    savingRef.current = true
    const next = normalizeData(input)
    capture(dataRef.current, 'beforeRestore')
    try {
      const result = modeRef.current === 'server'
        ? await restoreState(target.rev, next, target.recoveryToken)
        : saveLocalData(next) ? { ok: true as const, rev: target.rev } : { ok: false as const, conflict: false as const, error: 'browser storage unavailable' }
      if (!aliveRef.current) return false
      if (!result.ok) {
        if (result.conflict) {
          capture(dataRef.current, 'conflict')
          recoveryRequiredRef.current = !!result.state.recoveryRequired
          adopt(result.state.data, result.state.rev)
          setNotice({ kind: 'conflict' })
        } else setNotice(modeRef.current === 'server' ? { kind: 'saveFailed', detail: result.error } : { kind: 'browserSaveFailed' })
        setSaveState('error')
        return false
      }
      // Preserve a newer local edit if an event arrived while restore was pending.
      if (generationRef.current !== target.generation) capture(dataRef.current, 'beforeRestore')
      if (modeRef.current === 'local') localEditRef.current = true
      recoveryRequiredRef.current = false
      adopt(next, result.rev)
      setSaveState('saved')
      setNotice((current) => current?.kind === 'browserSaveFailed' ? current : null)
      return true
    } finally { savingRef.current = false }
  }, [adopt, capture])

  const update = useCallback((recipe: (current: BoardData) => BoardData) => {
    const next = recipe(dataRef.current)
    if (next !== dataRef.current) commit(next)
  }, [commit])
  const replaceAll = useCallback((next: BoardData) => commit(normalizeData(next)), [commit])
  const setSyncPaused = useCallback((paused: boolean) => { pausedRef.current = paused }, [])
  const clearNotice = useCallback(() => setNotice(null), [])
  return { data, mode, saveState, notice, clearNotice, update, replaceAll, setSyncPaused, retrySave: flush,
    recoverySnapshots, recoveryDurable, reviewRecovery, restoreRecovery }
}
