// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { act, cleanup, renderHook, render, screen, within, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { PREFS_KEY } from '../constants'
import { useBoard } from '../hooks/useBoard'
import { loadRecovery } from '../lib/recovery'
import { todayISO } from '../lib/date'
import { fetchState, normalizeData, putState } from '../lib/storage'
import type { BoardData } from '../types'

const board = (title: string): BoardData => normalizeData({ projects: [{ id: 'p', name: 'Project' }], tasks: [{ id: 't', projectId: 'p', title, createdAt: '2026-10-15T09:00:00Z' }] })
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const tick = async (ms = 450) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const settle = async () => act(async () => {})
const writes: { rev: number; data: BoardData }[] = []
let remote = { rev: 2, data: board('Original') }
let put: (payload: typeof remote) => Promise<Response>

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  writes.length = 0
  remote = { rev: 2, data: board('Original') }
  put = async (payload) => { remote = { ...payload, rev: payload.rev + 1 }; return response({ rev: remote.rev }) }
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT' || init?.method === 'POST') {
      const payload = JSON.parse(String(init.body))
      writes.push(payload)
      return put(payload)
    }
    return response(remote)
  }))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('durable recovery and serialized saves', () => {
  it('retains the latest local edit before conflict adoption and across remount', async () => {
    let finish!: (value: Response) => void
    put = () => new Promise((resolve) => { finish = resolve })
    const first = renderHook(() => useBoard())
    await settle()
    act(() => first.result.current.replaceAll(board('Sent edit')))
    await tick()
    act(() => first.result.current.replaceAll(board('Newest edit')))
    remote = { rev: 3, data: board('Remote title') }
    await act(async () => finish(response(remote, 409)))
    assert.equal(first.result.current.data.tasks[0].title, 'Remote title')
    assert.equal(first.result.current.recoverySnapshots[0].data.tasks[0].title, 'Newest edit')
    await tick(10000)
    assert.equal(writes.length, 1, 'a conflict is never retried automatically')
    first.unmount()
    const second = renderHook(() => useBoard())
    await settle()
    assert.equal(second.result.current.data.tasks[0].title, 'Remote title')
    assert.equal(second.result.current.recoverySnapshots[0].data.tasks[0].title, 'Newest edit')
  })

  it('serializes edits made while a save is in flight with the returned revision', async () => {
    let finish!: (value: Response) => void
    put = () => new Promise((resolve) => { finish = resolve })
    const { result } = renderHook(() => useBoard())
    await settle()
    act(() => result.current.replaceAll(board('First')))
    await tick()
    act(() => result.current.replaceAll(board('Second')))
    await tick()
    assert.equal(writes.length, 1)
    put = async () => response({ rev: 4 })
    await act(async () => finish(response({ rev: 3 })))
    assert.deepEqual(writes.map((p) => [p.rev, p.data.tasks[0].title]), [[2, 'First'], [3, 'Second']])
    assert.equal(result.current.data.tasks[0].title, 'Second')
    assert.equal(result.current.saveState, 'saved')
  })

  it('captures the newest failed data and retries explicitly without losing it', async () => {
    let finish!: (value: Response) => void
    put = () => new Promise((resolve) => { finish = resolve })
    const { result } = renderHook(() => useBoard())
    await settle()
    act(() => result.current.replaceAll(board('Sent')))
    await tick()
    act(() => result.current.replaceAll(board('Newest')))
    await act(async () => finish(response({ error: 'offline' }, 503)))
    assert.equal(result.current.recoverySnapshots[0].data.tasks[0].title, 'Newest')
    assert.equal(result.current.saveState, 'error')
    put = async () => response({ rev: 3 })
    await act(async () => result.current.retrySave())
    assert.deepEqual(writes.map((p) => [p.rev, p.data.tasks[0].title]), [[2, 'Sent'], [2, 'Newest']])
    assert.equal(result.current.saveState, 'saved')
  })

  it('preserves pending work immediately across remount without importing it', async () => {
    const first = renderHook(() => useBoard())
    await settle()
    act(() => first.result.current.replaceAll(board('Unsaved')))
    first.unmount()
    const second = renderHook(() => useBoard())
    await settle()
    assert.equal(second.result.current.data.tasks[0].title, 'Original')
    assert.equal(second.result.current.recoverySnapshots[0].data.tasks[0].title, 'Unsaved')
    assert.equal(writes.length, 0)
  })

  it('retains an exportable memory copy when browser storage is full', async () => {
    const { result } = renderHook(() => useBoard())
    await settle()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    put = async () => response({ rev: 3, data: board('Remote') }, 409)
    act(() => result.current.replaceAll(board('Only in memory')))
    await tick()
    assert.equal(result.current.data.tasks[0].title, 'Remote')
    assert.equal(result.current.recoverySnapshots[0].data.tasks[0].title, 'Only in memory')
    assert.equal(result.current.recoveryDurable, false)
  })

  it('retries failures no more often than once every four seconds', async () => {
    put = async () => response({ error: 'offline' }, 503)
    const { result } = renderHook(() => useBoard())
    await settle()
    act(() => result.current.replaceAll(board('Unsaved')))
    await tick()
    await tick(3000)
    assert.equal(writes.length, 1)
    await tick(1200)
    assert.equal(writes.length, 2)
  })

  it('rejects a restore reviewed before a newer remote revision and keeps the dialog result unsuccessful', async () => {
    const { result } = renderHook(() => useBoard())
    await settle()
    const target = await result.current.reviewRecovery()
    remote = { rev: 3, data: board('Other browser') }
    put = async () => response(remote, 409)
    let restored = true
    await act(async () => { restored = await result.current.restoreRecovery(board('Chosen copy'), target!) })
    assert.equal(restored, false)
    assert.equal(result.current.data.tasks[0].title, 'Other browser')
    assert.ok(result.current.recoverySnapshots.some((s) => s.data.tasks[0]?.title === 'Original'))
  })
})


describe('recovery review interface', () => {
  it('previews a copy, confirms replacement and keeps a conflicted restore open', async () => {
    vi.useRealTimers()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'en' }))
    const preview = board('Saved local title')
    preview.projects[0].deadline = '2026-10-31'
    Object.assign(preview.tasks[0], { due: '2026-10-30', plannedFor: '2026-10-16', reviewOn: '2026-10-17', blockedReason: 'Waiting for approval' })
    localStorage.setItem('defcon1.recovery.v1', JSON.stringify([{ id: 'copy', capturedAt: '2026-10-14T09:00:00Z', reason: 'conflict', data: preview }]))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Recovery' }))
    const dialog = screen.getByRole('dialog', { name: 'Recover a board' })
    await user.click(within(dialog).getByRole('button', { name: /Browser copy/ }))
    assert.ok(within(dialog).getByText('Saved local title'))
    for (const value of ['31 Oct 2026', '30 Oct 2026', '16 Oct 2026', '17 Oct 2026', 'Waiting for approval']) {
      assert.ok(within(dialog).getByText(value))
    }
    const restore = within(dialog).getByRole('button', { name: 'Restore complete board' }) as HTMLButtonElement
    assert.equal(restore.disabled, true)
    await user.click(within(dialog).getByRole('checkbox'))
    remote = { rev: 3, data: board('Other browser') }
    put = async () => response(remote, 409)
    await user.click(restore)
    assert.ok(await within(dialog).findByRole('alert'))
    assert.ok(screen.getByRole('dialog', { name: 'Recover a board' }))
    assert.equal(writes.at(-1)?.rev, 2)
  })
})


describe('recovery async guards', () => {
  it('keeps a conflict notice after unrelated failed work is retried successfully', async () => {
    put = async () => response({ rev: 3, data: board('Remote') }, 409)
    const { result } = renderHook(() => useBoard())
    await settle()
    act(() => result.current.replaceAll(board('Conflicted edit')))
    await tick()
    put = async () => response({ error: 'offline' }, 503)
    act(() => result.current.replaceAll(board('New edit')))
    await tick()
    put = async () => response({ rev: 4 })
    await act(async () => result.current.retrySave())
    assert.equal(result.current.notice?.kind, 'conflict')
    assert.ok(result.current.recoverySnapshots.some((s) => s.data.tasks[0].title === 'Conflicted edit'))
  })

  it('restores only over the board revision actually displayed to the user', async () => {
    const { result } = renderHook(() => useBoard())
    await settle()
    remote = { rev: 3, data: board('Unreviewed remote change') }
    const target = await result.current.reviewRecovery()
    put = async (payload) => payload.rev === 3 ? response({ rev: 4 }) : response(remote, 409)
    let restored = true
    await act(async () => { restored = await result.current.restoreRecovery(board('Chosen'), target!) })
    assert.equal(restored, false)
    assert.equal(writes[0].rev, 2)
    assert.equal(result.current.data.tasks[0].title, 'Unreviewed remote change')
  })

  it('connects safely through React strict effect replay', async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: StrictMode })
    await settle()
    assert.equal(result.current.mode, 'server')
    assert.equal(result.current.data.tasks[0].title, 'Original')
  })

  it('does not adopt a reconnect result after a local edit', async () => {
    let finish!: (value: Response) => void
    let reads = 0
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method) return response({ rev: 1 })
      if (++reads === 1) throw new Error('offline')
      return new Promise<Response>((resolve) => { finish = resolve })
    }))
    const { result } = renderHook(() => useBoard())
    await settle()
    await tick(4000)
    act(() => result.current.replaceAll(board('Local edit during reconnect')))
    await act(async () => finish(response(remote)))
    assert.equal(result.current.mode, 'local')
    assert.equal(result.current.data.tasks[0].title, 'Local edit during reconnect')
  })

  it('bounds browser history and deduplicates consecutive identical conflicts', async () => {
    put = async () => response(remote, 409)
    const { result } = renderHook(() => useBoard())
    await settle()
    for (let index = 0; index < 12; index++) {
      act(() => result.current.replaceAll(board(`Edit ${index}`)))
      await tick()
    }
    act(() => result.current.replaceAll(board('Edit 11')))
    await tick()
    assert.equal(result.current.recoverySnapshots.length, 10)
    assert.equal(result.current.recoverySnapshots[0].data.tasks[0].title, 'Edit 11')
    assert.equal(result.current.recoverySnapshots[1].data.tasks[0].title, 'Edit 10')
    assert.equal(result.current.recoverySnapshots[9].data.tasks[0].title, 'Edit 2')
  })
})

it('loads and restores a server backup through the German review flow', async () => {
  vi.useRealTimers()
  localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'de' }))
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { const payload = JSON.parse(String(init.body)); writes.push(payload); return response({ rev: 3 }) }
    if (url === '/api/backups') return response({ backups: [{ id: 'server-copy', capturedAt: '2026-10-14T09:00:00Z', projects: 1, tasks: 1 }] })
    if (url === '/api/backups/server-copy') return response({ rev: 1, data: board('Server-Sicherung Inhalt') })
    return response(remote)
  }))
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Wiederherstellung' }))
  const dialog = screen.getByRole('dialog', { name: 'Board wiederherstellen' })
  await user.click(await within(dialog).findByRole('button', { name: /Server-Sicherung/ }))
  assert.ok(await within(dialog).findByText('Server-Sicherung Inhalt'))
  await user.click(within(dialog).getByRole('checkbox'))
  await user.click(within(dialog).getByRole('button', { name: 'Gesamtes Board wiederherstellen' }))
  assert.equal(screen.queryByRole('dialog'), null)
  assert.equal(writes[0].data.tasks[0].title, 'Server-Sicherung Inhalt')
  assert.equal(loadRecovery()[0].data.tasks[0].title, 'Original')
})

it('exports the selected recovery content rather than the winning remote board', async () => {
  vi.useRealTimers()
  localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'en' }))
  localStorage.setItem('defcon1.recovery.v1', JSON.stringify([{ id: 'memory', capturedAt: '2026-10-14T09:00:00Z', reason: 'conflict', data: board('Preserved edit') }]))
  let exported!: Blob
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob: Blob) { exported = blob; return 'blob:recovery-export' }
    static revokeObjectURL() {}
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Recovery' }))
  const dialog = screen.getByRole('dialog', { name: 'Recover a board' })
  await user.click(within(dialog).getByRole('button', { name: /Browser copy/ }))
  await user.click(within(dialog).getByRole('button', { name: 'Export this copy' }))
  const text = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(exported) })
  assert.equal(JSON.parse(text).data.tasks[0].title, 'Preserved edit')
  assert.equal(writes.length, 0)
})


it('keeps the current local board when a restore cannot persist to browser storage', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  const { result } = renderHook(() => useBoard())
  await settle()
  act(() => result.current.replaceAll(board('Current local work')))
  await tick()
  const target = await result.current.reviewRecovery()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  let restored = true
  await act(async () => { restored = await result.current.restoreRecovery(board('Chosen'), target!) })
  assert.equal(restored, false)
  assert.equal(result.current.data.tasks[0].title, 'Current local work')
  assert.equal(result.current.notice?.kind, 'browserSaveFailed')
  assert.equal(result.current.recoveryDurable, false)
})


it('clears prior Today undo and status only after a successful full-board restore', async () => {
  vi.useRealTimers()
  localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'en' }))
  remote.data.tasks[0].plannedFor = todayISO()
  remote.data.tasks[0].status = 'todo'
  localStorage.setItem('defcon1.recovery.v1', JSON.stringify([{ id: 'prior', capturedAt: '2026-10-14T09:00:00Z', reason: 'conflict', data: board('Recovered') }]))
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: /^Today/ }))
  await user.click(await screen.findByRole('button', { name: 'Focus on this task' }))
  await user.click(screen.getByRole('button', { name: 'Start' }))
  await waitFor(() => assert.equal(writes.length, 1))
  assert.ok(screen.getByRole('button', { name: 'Undo' }))
  assert.ok(screen.getByText('Updated: Original'))
  await user.click(screen.getByRole('button', { name: 'Recovery' }))
  const dialog = screen.getByRole('dialog', { name: 'Recover a board' })
  await user.click(within(dialog).getByRole('button', { name: /Browser copy/ }))
  await user.click(within(dialog).getByRole('checkbox'))
  await user.click(within(dialog).getByRole('button', { name: 'Restore complete board' }))
  assert.equal(screen.queryByRole('dialog'), null)
  assert.equal(screen.queryByRole('button', { name: 'Undo' }), null)
  assert.equal(screen.queryByText('Updated: Original'), null)
})

it('retains a conflict copy after another mounted tab successfully saves', async () => {
  put = async (payload) => {
    if (payload.data.tasks[0].title === 'Conflicted A') {
      remote = { rev: 3, data: board('Winner') }
      return response(remote, 409)
    }
    assert.equal(payload.rev, remote.rev)
    remote = { ...payload, rev: 4 }
    return response({ rev: 4 })
  }
  const a = renderHook(() => useBoard())
  const b = renderHook(() => useBoard())
  await settle()
  act(() => a.result.current.replaceAll(board('Conflicted A')))
  await tick()
  assert.equal(a.result.current.recoverySnapshots[0].data.tasks[0].title, 'Conflicted A')
  await tick(4000)
  act(() => b.result.current.replaceAll(board('Saved B')))
  await tick()
  a.unmount(); b.unmount()
  const reloaded = renderHook(() => useBoard())
  await settle()
  assert.ok(reloaded.result.current.recoverySnapshots.some((copy) => copy.data.tasks[0]?.title === 'Conflicted A'))
})

it('does not reconnect over edits made while the initial connection was pending', async () => {
  let finish!: (value: Response) => void
  let first = true
  remote = { rev: 2, data: board('Remote') }
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (first) { first = false; return new Promise<Response>((resolve) => { finish = resolve }) }
    return response(remote)
  }))
  const { result } = renderHook(() => useBoard())
  assert.equal(result.current.mode, 'loading')
  act(() => result.current.replaceAll(board('Edited during connect')))
  await act(async () => finish(response(remote)))
  assert.equal(result.current.mode, 'local')
  assert.equal(result.current.data.tasks[0].title, 'Edited during connect')
  await tick()
  await tick(4000)
  assert.equal(result.current.mode, 'local')
  assert.equal(result.current.data.tasks[0].title, 'Edited during connect')
})

it('keeps equal-content conflict history when another tab removes its saved pending copy', async () => {
  put = async (payload) => {
    if (writes.length === 1) {
      remote = { rev: 3, data: board('Winner') }
      return response(remote, 409)
    }
    remote = { ...payload, rev: 4 }
    return response({ rev: 4 })
  }
  const a = renderHook(() => useBoard())
  const b = renderHook(() => useBoard())
  await settle()
  act(() => a.result.current.replaceAll(board('Same content')))
  await tick()
  await tick(4000)
  act(() => b.result.current.replaceAll(board('Same content')))
  await tick()
  a.unmount(); b.unmount()
  const reloaded = renderHook(() => useBoard())
  await settle()
  assert.ok(reloaded.result.current.recoverySnapshots.some((copy) => copy.reason === 'conflict' && copy.data.tasks[0]?.title === 'Same content'))
})

it('refreshes visible copies after storage events and keeps another tab pending work', async () => {
  const a = renderHook(() => useBoard())
  const b = renderHook(() => useBoard())
  await settle()
  act(() => a.result.current.replaceAll(board('Pending A')))
  const aId = a.result.current.recoverySnapshots[0].id
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: `defcon1.recovery.v1.pending.${aId}` })))
  assert.equal(b.result.current.recoverySnapshots[0].data.tasks[0].title, 'Pending A')
  act(() => b.result.current.replaceAll(board('Pending B')))
  await act(async () => b.result.current.retrySave())
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'defcon1.recovery.v1.pending.changed' })))
  assert.ok(a.result.current.recoverySnapshots.some((copy) => copy.id === aId && copy.data.tasks[0].title === 'Pending A'))
  a.unmount(); b.unmount()
  const reloaded = renderHook(() => useBoard())
  await settle()
  assert.ok(reloaded.result.current.recoverySnapshots.some((copy) => copy.id === aId))
})

it('keeps new recovery copies durable when the legacy recovery value is malformed', async () => {
  localStorage.setItem('defcon1.recovery.v1', '{ broken old recovery list')
  const first = renderHook(() => useBoard())
  await settle()
  act(() => first.result.current.replaceAll(board('New durable work')))
  assert.equal(first.result.current.recoveryDurable, true)
  first.unmount()
  const second = renderHook(() => useBoard())
  await settle()
  assert.equal(second.result.current.recoverySnapshots[0].data.tasks[0].title, 'New durable work')
})


it('keeps a successful browser-only restore when the server reconnects', async () => {
  let online = false
  vi.stubGlobal('fetch', async () => {
    if (!online) throw new Error('offline')
    return response(remote)
  })
  const { result } = renderHook(() => useBoard())
  await settle()
  assert.equal(result.current.mode, 'local')
  const target = await result.current.reviewRecovery()
  await act(async () => assert.equal(await result.current.restoreRecovery(board('Chosen local copy'), target!), true))
  online = true
  await tick(4500)
  assert.equal(result.current.mode, 'local')
  assert.equal(result.current.data.tasks[0].title, 'Chosen local copy')
  assert.equal(JSON.parse(localStorage.getItem('defcon1.data.v1')!).tasks[0].title, 'Chosen local copy')
})

it('still reconnects after a browser-only restore fails to persist', async () => {
  let online = false
  vi.stubGlobal('fetch', async () => {
    if (!online) throw new Error('offline')
    return response(remote)
  })
  const { result } = renderHook(() => useBoard())
  await settle()
  const target = await result.current.reviewRecovery()
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await act(async () => assert.equal(await result.current.restoreRecovery(board('Unsaved choice'), target!), false))
  storage.mockRestore()
  online = true
  await tick(4500)
  assert.equal(result.current.mode, 'server')
  assert.equal(result.current.data.tasks[0].title, 'Original')
})


it('preserves opaque revisions through saves, conflicts, reviewed restores and later edits', async () => {
  const ids = [
    'eeeeeeee-1111-4111-8111-111111111111',
    'dddddddd-2222-4222-8222-222222222222',
    'cccccccc-3333-4333-8333-333333333333',
    'bbbbbbbb-4444-4444-8444-444444444444',
    'aaaaaaaa-5555-4555-8555-555555555555',
  ]
  let state = { rev: ids[0], data: board('Opaque board') }
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    if (!init?.method) return response(state)
    const payload = JSON.parse(String(init.body))
    if (payload.rev !== state.rev) return response(state, 409)
    const next = ids[ids.indexOf(state.rev) + 1]
    state = { rev: next, data: payload.data }
    return response({ rev: next })
  })
  const { result } = renderHook(() => useBoard())
  await settle()
  act(() => result.current.replaceAll(board('Saved edit')))
  await tick()
  assert.equal(result.current.saveState, 'saved')
  assert.equal(state.data.tasks[0].title, 'Saved edit')
  state = { rev: ids[2], data: board('Other tab') }
  act(() => result.current.replaceAll(board('Conflicting edit')))
  await tick()
  assert.equal(result.current.data.tasks[0].title, 'Other tab')
  assert.equal(result.current.notice?.kind, 'conflict')
  const target = await result.current.reviewRecovery()
  await act(async () => assert.equal(await result.current.restoreRecovery(board('Restored copy'), target!), true))
  assert.equal(state.data.tasks[0].title, 'Restored copy')
  act(() => result.current.replaceAll(board('Edit after restore')))
  await tick()
  assert.equal(result.current.saveState, 'saved')
  assert.equal(state.data.tasks[0].title, 'Edit after restore')
})

it.each([null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', 'invalid-revision'])('rejects malformed remote revisions (%s) instead of inventing an identity', async (rev) => {
  vi.stubGlobal('fetch', async () => response({ rev, data: board('Invalid identity') }))
  assert.equal(await fetchState(), null)
  assert.equal((await putState(2, board('Attempt'))).ok, false)
  vi.stubGlobal('fetch', async () => response({ rev, data: board('Invalid conflict') }, 409))
  const conflict = await putState(2, board('Attempt'))
  assert.equal(conflict.ok, false)
  if (!conflict.ok) assert.equal(conflict.conflict, false)
})

it('does not let an old in-flight poll overwrite a restored board', async () => {
  let finish!: (value: Response) => void
  const { result } = renderHook(() => useBoard())
  await settle()
  const target = await result.current.reviewRecovery()
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return response({ rev: 'aaaaaaaa-1111-4111-8111-111111111111' })
    return new Promise<Response>((resolve) => { finish = resolve })
  })
  await tick(4000)
  await act(async () => assert.equal(await result.current.restoreRecovery(board('Restored'), target!), true))
  await act(async () => finish(response({ rev: 99, data: board('Old poll') })))
  assert.equal(result.current.data.tasks[0].title, 'Restored')
})


it('keeps polling after detecting corruption so another browser can complete recovery', async () => {
  const { result } = renderHook(() => useBoard())
  await settle()
  vi.stubGlobal('fetch', async () => response({ rev: 0, data: { projects: [], tasks: [] }, recoveryRequired: true, recoveryToken: 'damaged' }, 503))
  await tick(4000)
  assert.equal(result.current.notice?.kind, 'recoveryRequired')
  vi.stubGlobal('fetch', async () => response({ rev: 'aaaaaaaa-1111-4111-8111-111111111111', data: board('Recovered elsewhere') }))
  await tick(4000)
  assert.equal(result.current.data.tasks[0]?.title, 'Recovered elsewhere')
  assert.equal(result.current.notice, null)
})
