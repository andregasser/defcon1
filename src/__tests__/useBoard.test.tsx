// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'

import { useBoard } from '../hooks/useBoard'
import { fetchState, loadLocalData } from '../lib/storage'
import type { BoardData, Project } from '../types'

/**
 * The server is not always there — it restarts, it is started late, it is not
 * started at all. These tests pin down what the board does in between, because
 * getting it wrong looks exactly like data loss to the person watching.
 */

vi.mock('../lib/storage', () => ({
  fetchState: vi.fn(),
  putState: vi.fn(async () => ({ ok: true, rev: 1 })),
  loadLocalData: vi.fn(),
  saveLocalData: vi.fn(),
}))

const remote = vi.mocked(fetchState)
const local = vi.mocked(loadLocalData)

/** The interval the reconnect runs on, plus a little slack. */
const POLL_MS = 4000 + 100

function project(name: string): Project {
  return { id: `p_${name}`, name, description: '', color: '#0a84ff', deadline: null, order: 0 }
}

function board(name: string): BoardData {
  return { projects: [project(name)], tasks: [] }
}

/** Lets the initial effect run its async fetch and apply the result. */
async function settle() {
  await act(async () => {})
}

beforeEach(() => {
  vi.useFakeTimers()
  remote.mockReset()
  local.mockReset()
  local.mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useBoard and a server that comes and goes', () => {
  it('takes the server board when the server answers', async () => {
    remote.mockResolvedValue({ rev: 3, data: board('Vom Server'), updatedAt: null })

    const { result } = renderHook(() => useBoard())
    await settle()

    assert.equal(result.current.mode, 'server')
    assert.equal(result.current.data.projects[0].name, 'Vom Server')
  })

  it('recovers on its own after the server was briefly unreachable', async () => {
    // A reload during a server restart: the very first fetch finds nothing.
    remote.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useBoard())
    await settle()
    assert.equal(result.current.mode, 'local', 'falls back to browser-only first')
    // Not `deepEqual` against `[]`: that narrows the type to never[] for the
    // assertions further down.
    assert.equal(result.current.data.projects.length, 0)

    // The server finishes booting. Nobody should have to reload for this.
    remote.mockResolvedValue({ rev: 7, data: board('Wieder da'), updatedAt: null })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })

    assert.equal(result.current.mode, 'server')
    assert.equal(result.current.data.projects[0].name, 'Wieder da')
  })

  it('never overwrites a board that was edited browser-only', async () => {
    remote.mockResolvedValue(null)
    local.mockReturnValue(board('Von Hand'))

    const { result } = renderHook(() => useBoard())
    await settle()
    assert.equal(result.current.mode, 'local')

    // One edit while offline is enough to make this board the user's business.
    act(() => {
      result.current.update((data) => ({ ...data, projects: [...data.projects, project('Neu')] }))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    remote.mockResolvedValue({ rev: 9, data: board('Vom Server'), updatedAt: null })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3)
    })

    assert.equal(result.current.mode, 'local', 'a browser-only session is not hijacked')
    assert.deepEqual(
      result.current.data.projects.map((entry) => entry.name),
      ['Von Hand', 'Neu'],
    )
  })
})
