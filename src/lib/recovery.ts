import type { BoardData, RecoverySnapshot } from '../types'
import { normalizeData } from './storage'
import { isBrowserDemo } from './runtime'

export const RECOVERY_LIMIT = 10
const key = () => isBrowserDemo() ? 'defcon1.demo.recovery.v1' : 'defcon1.recovery.v1'
const entryKey = (snapshot: RecoverySnapshot) => `${key()}.${snapshot.reason === 'pending' ? 'pending' : 'history'}.${snapshot.id}`

export function recoverySnapshot(data: BoardData, reason: RecoverySnapshot['reason']): RecoverySnapshot {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  return { id, capturedAt: new Date().toISOString(), reason, data: normalizeData(data) }
}

function parseSnapshot(raw: unknown): RecoverySnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const entry = raw as Partial<RecoverySnapshot>
  if (typeof entry.id !== 'string' || typeof entry.capturedAt !== 'string' ||
    !Number.isFinite(Date.parse(entry.capturedAt)) ||
    !['pending', 'conflict', 'saveFailed', 'beforeRestore'].includes(entry.reason ?? '') ||
    !Array.isArray(entry.data?.projects) || !Array.isArray(entry.data?.tasks)) return null
  return { id: entry.id, capturedAt: entry.capturedAt, reason: entry.reason!, data: normalizeData(entry.data) }
}

function readLegacy(): RecoverySnapshot[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key()) ?? '[]')
    return Array.isArray(raw) ? raw.map(parseSnapshot).filter((entry): entry is RecoverySnapshot => !!entry) : []
  } catch { return [] }
}

function readEntries(): { key: string; snapshot: RecoverySnapshot }[] {
  const entries: { key: string; snapshot: RecoverySnapshot }[] = []
  const prefix = `${key()}.`
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
  for (const storedKey of keys) {
    if (!storedKey?.startsWith(`${prefix}pending.`) && !storedKey?.startsWith(`${prefix}history.`)) continue
    try {
      const snapshot = parseSnapshot(JSON.parse(localStorage.getItem(storedKey) ?? 'null'))
      if (snapshot) entries.push({ key: storedKey, snapshot })
    } catch { /* A malformed copy must not hide other recoverable entries. */ }
  }
  return entries
}

function newestFirst(a: RecoverySnapshot, b: RecoverySnapshot): number {
  return b.capturedAt.localeCompare(a.capturedAt) ||
    Number(a.reason === 'pending') - Number(b.reason === 'pending') || b.id.localeCompare(a.id)
}

/** Pending copies never deduplicate retained history: their owner can remove them. */
export function mergeRecovery(snapshots: RecoverySnapshot[]): RecoverySnapshot[] {
  return [...new Map(snapshots.map((snapshot) => [snapshot.id, snapshot])).values()]
    .sort(newestFirst).slice(0, RECOVERY_LIMIT)
}

export function loadRecovery(): RecoverySnapshot[] {
  try { return mergeRecovery([...readLegacy(), ...readEntries().map((entry) => entry.snapshot)]) }
  catch { return [] }
}

/** Each immutable key is independent: no tab can replace another tab's list. */
export function saveRecovery(snapshot: RecoverySnapshot): boolean {
  try {
    // Preserve copies from the original single-key format before retiring it.
    for (const legacy of readLegacy()) {
      const target = entryKey(legacy)
      if (localStorage.getItem(target) === null) localStorage.setItem(target, JSON.stringify(legacy))
    }
    localStorage.removeItem(key())
    const target = entryKey(snapshot)
    if (localStorage.getItem(target) === null) localStorage.setItem(target, JSON.stringify(snapshot))
    return true
  } catch { return false }
}

/** Callers may remove only pending entries they created or explicitly superseded. */
export function removePendingRecovery(snapshots: RecoverySnapshot[]): void {
  for (const snapshot of snapshots) {
    if (snapshot.reason !== 'pending') continue
    try { localStorage.removeItem(entryKey(snapshot)) } catch { /* A stale copy is safer than a lost copy. */ }
  }
}

export function pruneRecovery(): void {
  try {
    const entries = readEntries().sort((a, b) => newestFirst(a.snapshot, b.snapshot))
    let historyCount = 0
    let pendingCount = 0
    let previousHistory: string | undefined
    for (const entry of entries) {
      if (entry.snapshot.reason === 'pending') {
        if (++pendingCount > RECOVERY_LIMIT) localStorage.removeItem(entry.key)
        continue
      }
      const content = JSON.stringify(entry.snapshot.data)
      if (content === previousHistory || ++historyCount > RECOVERY_LIMIT) localStorage.removeItem(entry.key)
      previousHistory = content
    }
  } catch { /* Retention failure may leave extra copies; it must never block saving. */ }
}

export function isRecoveryStorageKey(storedKey: string | null): boolean {
  return storedKey === null || storedKey === key() || storedKey.startsWith(`${key()}.`)
}
