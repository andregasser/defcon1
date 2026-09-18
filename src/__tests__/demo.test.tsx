// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../App'
import { LOCAL_DATA_KEY, PREFS_KEY } from '../constants'
import { useBoard } from '../hooks/useBoard'
import { loadPrefs, savePrefs } from '../lib/storage'

const demoKey = 'defcon1.demo.data.v1'
const demoPrefsKey = 'defcon1.demo.prefs.v1'
const savedBoard = {
  projects: [{ id: 'saved', name: 'My experiment', description: '', color: '#0a84ff', deadline: null, order: 0 }],
  tasks: [],
}

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('MODE', 'demo')
  // Even an available API must never receive requests from a public demo.
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ rev: 1, data: savedBoard }))))
  localStorage.setItem(demoPrefsKey, JSON.stringify({ lang: 'de' }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('browser demo', () => {
  it('seeds once in StrictMode, preserves edits on reload, and never contacts an API', async () => {
    vi.useFakeTimers()
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(savedBoard))
    const normalBoard = localStorage.getItem(LOCAL_DATA_KEY)
    const first = renderHook(() => useBoard(), { wrapper: StrictMode })
    await act(async () => {})

    assert.equal(first.result.current.mode, 'demo')
    assert.equal(first.result.current.data.projects.length, 3)
    assert.equal(first.result.current.data.tasks.length, 10)
    assert.ok(localStorage.getItem(demoKey), 'seed is persisted even before the first edit')

    act(() => first.result.current.replaceAll(savedBoard))
    act(() => window.dispatchEvent(new Event('pagehide')))
    first.unmount()
    const second = renderHook(() => useBoard())
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000) })

    assert.equal(second.result.current.data.projects[0].name, 'My experiment')
    assert.equal(localStorage.getItem(LOCAL_DATA_KEY), normalBoard)
    assert.equal(vi.mocked(fetch).mock.calls.length, 0)
  })

  it('keeps an intentionally empty demo empty across reloads', async () => {
    localStorage.setItem(demoKey, JSON.stringify({ projects: [], tasks: [] }))
    const { result } = renderHook(() => useBoard())
    await act(async () => {})
    assert.equal(result.current.mode, 'demo')
    assert.equal(result.current.data.projects.length, 0)
  })

  it('isolates demo preferences and starts with sound off', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'en', sound: true }))
    const prefs = loadPrefs()
    assert.equal(prefs.lang, 'de')
    assert.equal(prefs.sound, false)
    savePrefs({ ...prefs, sound: true })
    assert.equal(JSON.parse(localStorage.getItem(demoPrefsKey)!).sound, true)
    assert.equal(JSON.parse(localStorage.getItem(PREFS_KEY)!).lang, 'en')
  })

  it('labels the demo, loads translated examples and resets the board after confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    assert.ok(await screen.findByText('Terraform-Module refactoren'))
    assert.ok(screen.getByRole('region', { name: 'Interaktive Demo' }))
    assert.equal(screen.getByRole('link', { name: 'Lokal installieren' }).getAttribute('href'),
      'https://github.com/andregasser/defcon1#quickstart')
    const reset = screen.getByRole('button', { name: 'Demo zurücksetzen' })
    await user.type(screen.getByRole('textbox', { name: 'Tasks durchsuchen' }), 'no matching task')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(reset)
    assert.equal(screen.queryByText('Terraform-Module refactoren'), null)
    confirm.mockReturnValue(true)
    await user.click(reset)
    assert.ok(await screen.findByText('Terraform-Module refactoren'))
    await waitFor(() => assert.equal(JSON.parse(localStorage.getItem(demoKey)!).tasks.length, 10))
  })

  it('reports unavailable browser storage instead of claiming changes were saved', async () => {
    localStorage.setItem(demoKey, JSON.stringify(savedBoard))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useBoard())
    await act(async () => {})
    act(() => result.current.replaceAll({ projects: [], tasks: [] }))
    await waitFor(() => assert.equal(result.current.saveState, 'error'))
    assert.equal(result.current.notice?.kind, 'browserSaveFailed')
    assert.equal(result.current.data.projects.length, 0, 'editing remains possible in memory')
  })

  it('keeps the normal application out of demo mode', async () => {
    vi.stubEnv('MODE', 'test')
    render(<App />)
    await screen.findAllByText('My experiment')
    assert.equal(screen.queryByRole('button', { name: /Demo zurücksetzen|Reset demo/ }), null)
    fireEvent(window, new Event('pagehide'))
    assert.equal(localStorage.getItem(demoKey), null)
  })
})
