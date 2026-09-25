// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useTodayDate } from '../hooks/useTodayDate'
import { createTask } from '../lib/board'
import { makeTodayUndo, todayUndoPatch } from '../lib/todayUndo'

describe('Today field-level undo', () => {
  it('restores completion fields without rolling back unrelated edits or ordering', () => {
    const before = { ...createTask('project', 'doing', 'Original title', 3), statusSince: '2026-09-20T08:00:00.000Z' }
    const after = { ...before, status: 'done' as const, doneAt: '2026-09-25T09:00:00.000Z', statusSince: '2026-09-25T09:00:00.000Z', order: 0 }
    const undo = makeTodayUndo(before, after)
    assert.ok(undo)
    const current = { ...after, title: 'Edited elsewhere', note: 'Keep this note', order: 8 }
    const patch = todayUndoPatch(current, undo)
    assert.deepEqual(patch, { status: 'doing', doneAt: null, statusSince: '2026-09-20T08:00:00.000Z' })
    assert.equal({ ...current, ...patch }.title, 'Edited elsewhere')
    assert.equal({ ...current, ...patch }.note, 'Keep this note')
    assert.equal({ ...current, ...patch }.order, 8)
  })

  it('rejects undo when any completion field changed or the task disappeared', () => {
    const before = createTask('project', 'doing', 'Task', 0)
    const after = { ...before, status: 'done' as const, doneAt: '2026-09-25T09:00:00.000Z', statusSince: '2026-09-25T09:00:00.000Z' }
    const undo = makeTodayUndo(before, after)
    assert.ok(undo)
    assert.equal(todayUndoPatch(undefined, undo), null)
    assert.equal(todayUndoPatch({ ...after, id: 'another-task' }, undo), null)
    assert.equal(todayUndoPatch({ ...after, status: 'todo' }, undo), null)
    assert.equal(todayUndoPatch({ ...after, doneAt: null }, undo), null)
    assert.equal(todayUndoPatch({ ...after, statusSince: '2026-09-26T09:00:00.000Z' }, undo), null)
  })

  it('compares checklist values after a server round trip and protects later checklist edits', () => {
    const before = { ...createTask('project', 'doing', 'Task', 0), checklist: [{ id: 'step', text: 'First step', done: false }] }
    const after = { ...before, checklist: [{ id: 'step', text: 'First step', done: true }] }
    const undo = makeTodayUndo(before, after)
    assert.ok(undo)
    assert.deepEqual(todayUndoPatch({ ...after, checklist: [{ done: true, text: 'First step', id: 'step' }] }, undo), {
      checklist: [{ id: 'step', text: 'First step', done: false }],
    })
    assert.equal(todayUndoPatch({ ...after, checklist: [{ id: 'step', text: 'Updated step', done: true }] }, undo), null)
    assert.equal(todayUndoPatch({ ...after, checklist: [] }, undo), null)
  })

  it('does not record no-ops, reordered object keys, or cell renumbering', () => {
    const before = { ...createTask('project', 'todo', 'Task', 0), checklist: [{ id: 'step', text: 'First step', done: false }] }
    assert.equal(makeTodayUndo(before, before), null)
    assert.equal(makeTodayUndo(before, { ...before, order: 9 }), null)
    assert.equal(makeTodayUndo(before, { ...before, checklist: [{ done: false, text: 'First step', id: 'step' }] }), null)
  })
})

describe('useTodayDate', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('refreshes at local midnight and schedules the following midnight', () => {
    vi.setSystemTime(new Date(2026, 8, 25, 23, 59, 59))
    const { result } = renderHook(() => useTodayDate())
    assert.equal(result.current, '2026-09-25')
    act(() => vi.advanceTimersByTime(1000))
    assert.equal(result.current, '2026-09-26')
    act(() => vi.advanceTimersByTime(86_400_000))
    assert.equal(result.current, '2026-09-27')
  })

  it('refreshes after focus and visibility changes and releases its timer and listeners', () => {
    vi.setSystemTime(new Date(2026, 8, 25, 12))
    const { result, unmount } = renderHook(() => useTodayDate())
    vi.setSystemTime(new Date(2026, 8, 26, 12))
    act(() => window.dispatchEvent(new Event('focus')))
    assert.equal(result.current, '2026-09-26')
    vi.setSystemTime(new Date(2026, 8, 27, 12))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    assert.equal(result.current, '2026-09-27')
    assert.equal(vi.getTimerCount(), 1)
    unmount()
    assert.equal(vi.getTimerCount(), 0)
    act(() => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    assert.equal(vi.getTimerCount(), 0)
  })
})
