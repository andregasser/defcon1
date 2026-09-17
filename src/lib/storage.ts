import {
  DEFAULT_DEFCON,
  DEFAULT_PREFS,
  LOCAL_DATA_KEY,
  PREFS_KEY,
  PROJECT_COLORS,
  STATUS_IDS,
} from '../constants'
import { detectLang, isLang } from '../i18n/lang'
import type { BoardData, Defcon, Prefs, Project, Status, Task } from '../types'
import { nowISO } from './date'

/**
 * Thrown by `parseBackup` for a file without any content. A sentinel rather
 * than a sentence, because the message shown to the user depends on the
 * interface language.
 */
export const EMPTY_BACKUP = 'EMPTY_BACKUP'

export interface RemoteState {
  rev: number
  data: BoardData
  updatedAt?: string | null
}

export type PutResult =
  | { ok: true; rev: number }
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

function asDefcon(value: unknown): Defcon {
  const level = Number(value)
  return level >= 1 && level <= 5 ? (Math.round(level) as Defcon) : DEFAULT_DEFCON
}

function asStatus(value: unknown): Status {
  return STATUS_IDS.includes(value as Status) ? (value as Status) : 'backlog'
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
    tasks.push({
      id: String(task.id),
      projectId: String(task.projectId),
      title: asString(task.title, 'Untitled task'),
      note: asString(task.note),
      status,
      defcon: asDefcon(task.defcon),
      due: asDate(task.due),
      order: Number.isFinite(task.order) ? Number(task.order) : index,
      createdAt: asString(task.createdAt, nowISO()),
      doneAt: status === 'done' ? asString(task.doneAt, nowISO()) : null,
    })
  })

  return { projects, tasks }
}

/* ------------------------------------------------------------------ server */

/** Resolves to the server state, or null when no server is reachable. */
export async function fetchState(): Promise<RemoteState | null> {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' })
    if (!response.ok) return null
    const payload = (await response.json()) as RemoteState
    return { rev: Number(payload.rev) || 0, data: normalizeData(payload.data), updatedAt: payload.updatedAt }
  } catch {
    return null
  }
}

export async function putState(rev: number, data: BoardData): Promise<PutResult> {
  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rev, data }),
    })

    if (response.status === 409) {
      const payload = (await response.json()) as RemoteState
      return {
        ok: false,
        conflict: true,
        state: { rev: Number(payload.rev) || 0, data: normalizeData(payload.data) },
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}) as { error?: string })
      return { ok: false, conflict: false, error: payload.error ?? `HTTP ${response.status}` }
    }

    const payload = (await response.json()) as { rev: number }
    return { ok: true, rev: Number(payload.rev) || rev + 1 }
  } catch (error) {
    return { ok: false, conflict: false, error: (error as Error).message }
  }
}

/* ------------------------------------------------- localStorage (fallback) */

export function loadLocalData(): BoardData | null {
  try {
    const raw = localStorage.getItem(LOCAL_DATA_KEY)
    return raw ? normalizeData(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveLocalData(data: BoardData): void {
  try {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('[defcon1] writing to localStorage failed', error)
  }
}

/* ------------------------------------------------------------------- prefs */

export function loadPrefs(): Prefs {
  // Without a stored choice the browser decides — a German browser gets German.
  const fresh: Prefs = { ...DEFAULT_PREFS, lang: detectLang() }
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      ...fresh,
      ...parsed,
      lang: isLang(parsed.lang) ? parsed.lang : fresh.lang,
      collapsedProjects: Array.isArray(parsed.collapsedProjects) ? parsed.collapsedProjects : [],
      focusedProjects: Array.isArray(parsed.focusedProjects) ? parsed.focusedProjects : [],
    }
  } catch {
    return fresh
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
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
