import {
  DEFAULT_DEFCON,
  DEFAULT_PREFS,
  LOCAL_DATA_KEY,
  PREFS_KEY,
  PROJECT_COLORS,
  STATUS_IDS,
} from '../constants'
import { detectLang, isLang } from '../i18n/lang'
import type { BoardData, ChecklistItem, Defcon, Prefs, Project, Status, Task, ServerBackupSummary, ServerRevision } from '../types'
import { uid } from './board'
import { nowISO, parseISODate, todayISO } from './date'
import { isBrowserDemo } from './runtime'

/**
 * Thrown by `parseBackup` for a file without any content. A sentinel rather
 * than a sentence, because the message shown to the user depends on the
 * interface language.
 */
export const EMPTY_BACKUP = 'EMPTY_BACKUP'

export interface RemoteState {
  rev: ServerRevision
  data: BoardData
  updatedAt?: string | null
  recoveryRequired?: boolean
  recoveryToken?: string
}

export type PutResult =
  | { ok: true; rev: ServerRevision }
  | { ok: false; conflict: true; state: RemoteState }
  | { ok: false; conflict: false; error: string }

/* -------------------------------------------------------------- validation */

const isoDate = /^\d{4}-\d{2}-\d{2}$/

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asDate(value: unknown): string | null {
  return typeof value === 'string' && isoDate.test(value) ? value : null
}

/** Calendar planning must reject overflow dates such as 31 April. */
function asCalendarDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const date = parseISODate(value)
  return date && todayISO(date) === value ? value : null
}

function asDefcon(value: unknown): Defcon {
  const level = Number(value)
  return level >= 1 && level <= 5 ? (Math.round(level) as Defcon) : DEFAULT_DEFCON
}

function asStatus(value: unknown): Status {
  return STATUS_IDS.includes(value as Status) ? (value as Status) : 'backlog'
}

/**
 * Boards written before the checklist existed simply have no field, and a
 * hand-edited one may carry entries without an id. Empty steps are dropped:
 * a nameless checkbox is noise, not data.
 */
function asChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  const items: ChecklistItem[] = []
  for (const entry of value) {
    const item = (entry ?? {}) as Partial<ChecklistItem>
    const text = asString(item.text).trim()
    if (!text) continue
    items.push({ id: asString(item.id) || uid('c'), text, done: item.done === true })
  }
  return items
}

/**
 * Repairs whatever we got — an older file version, a hand-edited board.json, a
 * half-written import — into a shape the UI can render without crashing.
 * Anything unsalvageable (a task with no id or no project) is dropped.
 */
export function normalizeData(raw: unknown): BoardData {
  const input = (raw ?? {}) as Partial<BoardData>
  const rawProjects = Array.isArray(input.projects) ? input.projects : []
  const rawTasks = Array.isArray(input.tasks) ? input.tasks : []

  const projects: Project[] = []
  rawProjects.forEach((item, index) => {
    const project = (item ?? {}) as Partial<Project>
    if (!project.id) return
    projects.push({
      id: String(project.id),
      // Placeholders for salvaged records stay untranslated: they are written
      // into the shared board file, which has no language.
      name: asString(project.name, 'Untitled project'),
      description: asString(project.description),
      color: asString(project.color) || PROJECT_COLORS[index % PROJECT_COLORS.length],
      deadline: asDate(project.deadline),
      order: Number.isFinite(project.order) ? Number(project.order) : index,
    })
  })

  const knownProjects = new Set(projects.map((p) => p.id))
  const tasks: Task[] = []
  rawTasks.forEach((item, index) => {
    const task = (item ?? {}) as Partial<Task>
    if (!task.id || !task.projectId || !knownProjects.has(String(task.projectId))) return
    const status = asStatus(task.status)
    const createdAt = asString(task.createdAt, nowISO())
    tasks.push({
      id: String(task.id),
      projectId: String(task.projectId),
      title: asString(task.title, 'Untitled task'),
      note: asString(task.note),
      status,
      defcon: asDefcon(task.defcon),
      due: asDate(task.due),
      plannedFor: asCalendarDate(task.plannedFor),
      reviewOn: asCalendarDate(task.reviewOn),
      blockedReason: asString(task.blockedReason),
      order: Number.isFinite(task.order) ? Number(task.order) : index,
      createdAt,
      // Boards written before the aging chip existed have no timestamp: fall
      // back to creation, which is the earliest the task can have been here.
      statusSince: asString(task.statusSince) || createdAt,
      doneAt: status === 'done' ? asString(task.doneAt, nowISO()) : null,
      checklist: asChecklist(task.checklist),
    })
  })

  return { projects, tasks }
}

/* ------------------------------------------------------------------ server */

function validRevision(value: unknown): value is ServerRevision {
  return typeof value === 'number' ? Number.isSafeInteger(value) && value >= 0
    : typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
}

/** Resolves to the server state, or null when no server is reachable. */
export async function fetchState(): Promise<RemoteState | null> {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' })
    const payload = (await response.json()) as RemoteState
    if (!response.ok && !(response.status === 503 && payload.recoveryRequired)) return null
    if (!validRevision(payload?.rev)) return null
    return { ...payload, data: normalizeData(payload.data) }
  } catch {
    return null
  }
}

export async function putState(rev: ServerRevision, data: BoardData): Promise<PutResult> {
  return writeRemote('/api/state', 'PUT', { rev, data })
}

export async function restoreState(rev: ServerRevision, data: BoardData, recoveryToken?: string): Promise<PutResult> {
  return writeRemote('/api/restore', 'POST', { rev, data, recoveryToken })
}

async function writeRemote(url: string, method: string, payload: { rev: ServerRevision; data: BoardData; recoveryToken?: string }): Promise<PutResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (response.status === 409) {
      const payload = (await response.json()) as RemoteState
      if (!validRevision(payload?.rev)) return { ok: false, conflict: false, error: 'invalid revision' }
      return {
        ok: false,
        conflict: true,
        state: { ...payload, data: normalizeData(payload.data) },
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}) as { error?: string })
      return { ok: false, conflict: false, error: payload.error ?? `HTTP ${response.status}` }
    }

    const saved = (await response.json()) as { rev: unknown }
    if (!validRevision(saved?.rev)) return { ok: false, conflict: false, error: 'invalid revision' }
    return { ok: true, rev: saved.rev }
  } catch (error) {
    return { ok: false, conflict: false, error: (error as Error).message }
  }
}

/* ------------------------------------------------- localStorage (fallback) */

export function loadLocalData(): BoardData | null {
  try {
    const raw = localStorage.getItem(isBrowserDemo() ? 'defcon1.demo.data.v1' : LOCAL_DATA_KEY)
    return raw ? normalizeData(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveLocalData(data: BoardData): boolean {
  try {
    localStorage.setItem(isBrowserDemo() ? 'defcon1.demo.data.v1' : LOCAL_DATA_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('[defcon1] writing to localStorage failed', error)
    return false
  }
}

/* ------------------------------------------------------------------- prefs */

export function loadPrefs(): Prefs {
  // Without a stored choice the browser decides — a German browser gets German.
  const fresh: Prefs = { ...DEFAULT_PREFS, lang: detectLang(), sound: isBrowserDemo() ? false : DEFAULT_PREFS.sound }
  try {
    const raw = localStorage.getItem(isBrowserDemo() ? 'defcon1.demo.prefs.v1' : PREFS_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      ...fresh,
      ...parsed,
      lang: isLang(parsed.lang) ? parsed.lang : fresh.lang,
      collapsedProjects: Array.isArray(parsed.collapsedProjects) ? parsed.collapsedProjects : [],
      focusedProjects: Array.isArray(parsed.focusedProjects) ? parsed.focusedProjects : [],
      focusTaskId: asString(parsed.focusTaskId) || null,
    }
  } catch {
    return fresh
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(isBrowserDemo() ? 'defcon1.demo.prefs.v1' : PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // View preferences are not worth surfacing an error for.
  }
}

/* ---------------------------------------------------------- export / import */

export function downloadBackup(data: BoardData): void {
  const stamp = nowISO().slice(0, 10)
  const blob = new Blob([JSON.stringify({ app: 'defcon1', version: 1, data }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `defcon1-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/** Accepts both a bare board and a wrapped export file. */
export function parseBackup(text: string): BoardData {
  const parsed = JSON.parse(text) as { data?: unknown; projects?: unknown }
  const payload = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed
  const normalized = normalizeData(payload)
  if (normalized.projects.length === 0 && normalized.tasks.length === 0) {
    throw new Error(EMPTY_BACKUP)
  }
  return normalized
}

export async function fetchBackups(): Promise<ServerBackupSummary[]> {
  const response = await fetch('/api/backups', { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json() as { backups: ServerBackupSummary[] }
  if (!Array.isArray(payload.backups)) throw new Error('Invalid backup list')
  return payload.backups
}

export async function fetchBackup(id: string): Promise<BoardData> {
  const response = await fetch(`/api/backups/${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json() as RemoteState
  if (!Array.isArray(payload.data?.projects) || !Array.isArray(payload.data?.tasks)) throw new Error('Invalid backup')
  return normalizeData(payload.data)
}
