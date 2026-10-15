import type { BoardData, RecoverySnapshot } from '../types'
import { normalizeData } from './storage'
import { isBrowserDemo } from './runtime'
import { uid } from './board'

export const RECOVERY_LIMIT = 10
const key = () => isBrowserDemo() ? 'defcon1.demo.recovery.v1' : 'defcon1.recovery.v1'

export function recoverySnapshot(data: BoardData, reason: RecoverySnapshot['reason']): RecoverySnapshot {
  return { id: uid('recovery'), capturedAt: new Date().toISOString(), reason, data: normalizeData(data) }
}

/** Consecutive identical boards occupy one slot, even when their reason changes. */
export function prependRecovery(snapshot: RecoverySnapshot, history: RecoverySnapshot[]): RecoverySnapshot[] {
  const same = history[0] && JSON.stringify(history[0].data) === JSON.stringify(snapshot.data)
  return [snapshot, ...history.slice(same ? 1 : 0)].slice(0, RECOVERY_LIMIT)
}

export function loadRecovery(): RecoverySnapshot[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key()) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((entry) => entry && typeof entry.id === 'string' &&
      typeof entry.capturedAt === 'string' && Number.isFinite(Date.parse(entry.capturedAt)) &&
      ['pending', 'conflict', 'saveFailed', 'beforeRestore'].includes(entry.reason) &&
      Array.isArray(entry.data?.projects) && Array.isArray(entry.data?.tasks))
      .slice(0, RECOVERY_LIMIT).map((entry) => ({ ...entry, data: normalizeData(entry.data) }))
  } catch { return [] }
}

export function saveRecovery(snapshots: RecoverySnapshot[]): boolean {
  try { localStorage.setItem(key(), JSON.stringify(snapshots)); return true } catch { return false }
}
