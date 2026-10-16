// @vitest-environment jsdom
import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useBoard } from '../hooks/useBoard'
import { normalizeData } from '../lib/storage'

let directory: string
let child: ChildProcess | undefined
let origin: string
const data = (name: string) => ({ projects: [{ id: 'p', name }], tasks: [] })
async function start() {
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const address = reservation.address()
  assert.ok(address && typeof address === 'object')
  const port = address.port
  await new Promise<void>((resolve) => reservation.close(() => resolve()))
  child = spawn(process.execPath, ['server/server.mjs'], { env: { ...process.env, DEFCON1_DATA_DIR: directory, DEFCON1_PORT: String(port), DEFCON1_HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] })
  origin = await new Promise<string>((resolve, reject) => {
    let output = ''
    child!.stdout!.on('data', (chunk) => { output += chunk; const match = output.match(/Board:\s+(http:\/\/127.0.0.1:\d+)/); if (match) resolve(match[1]) })
    child!.once('error', reject)
    child!.once('exit', (code) => reject(new Error(`server exited ${code}`)))
  })
}
async function stop() { if (child) { const exited = once(child, 'exit'); child.kill(); await exited; child = undefined } }
const get = (url: string) => fetch(`${origin}${url}`)
const put = (rev: number | string, name: string) => fetch(`${origin}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev, data: data(name) }) })
const nativeFetch = globalThis.fetch
beforeEach(async () => { localStorage.clear(); directory = await fs.mkdtemp(path.join(os.tmpdir(), 'defcon-recovery-')); await start() })
afterEach(async () => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); await stop(); await fs.rm(directory, { recursive: true, force: true }) })

describe('real persistence server', () => {
  it('serializes concurrent revisions and preserves the winner through restart', async () => {
    const results = await Promise.all([put(0, 'First'), put(0, 'Second')])
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
    const saved = await (await get('/api/state')).json()
    await stop(); await start()
    assert.deepEqual(await (await get('/api/state')).json(), saved)
  })

  it('lists and reads validated backups without accepting arbitrary paths or symlinks', async () => {
    const priorWrite = await put(0, 'Prior')
    assert.equal(priorWrite.status, 200)
    assert.equal((await put((await priorWrite.json()).rev, 'Current')).status, 200)
    const response = await get('/api/backups')
    assert.equal(response.status, 200)
    const { backups } = await response.json()
    assert.equal(backups.length, 1)
    const prior = await (await get(`/api/backups/${backups[0].id}`)).json()
    assert.equal(prior.data.projects[0].name, 'Prior')
    const id = 'board-2026-10-15T00-00-00-000.json'
    await fs.symlink(path.join(directory, 'board.json'), path.join(directory, 'backups', id))
    await fs.writeFile(path.join(directory, 'backups', 'board-2026-10-15T00-00-01-000.json'), '{broken')
    for (const value of [id, 'missing.json', '..%2Fboard.json', '%2Fetc%2Fpasswd', 'board-2026-10-15T00-00-01-000.json']) {
      assert.notEqual((await get(`/api/backups/${value}`)).status, 200)
    }
    assert.equal((await (await get('/api/backups')).json()).backups.length, 1)
  })

  it('preserves a malformed primary and requires a reviewed token for deliberate recovery', async () => {
    await stop()
    await fs.writeFile(path.join(directory, 'board.json'), '{ irreplaceable damaged content')
    await start()
    const current = await get('/api/state')
    assert.equal(current.status, 503)
    const state = await current.json()
    assert.equal(state.recoveryRequired, true)
    assert.equal(typeof state.recoveryToken, 'string')
    assert.equal((await put(0, 'Accidental')).status, 503)
    const restore = (recoveryToken: string) => fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: 0, recoveryToken, data: data('Recovered') }) })
    assert.notEqual((await restore('wrong')).status, 200)
    assert.equal(await fs.readFile(path.join(directory, 'board.json'), 'utf8'), '{ irreplaceable damaged content')
    assert.equal((await restore(state.recoveryToken)).status, 200)
    const files = await fs.readdir(path.join(directory, 'backups'))
    assert.ok((await Promise.all(files.map((file) => fs.readFile(path.join(directory, 'backups', file), 'utf8')))).includes('{ irreplaceable damaged content'))
    assert.equal((await (await get('/api/state')).json()).data.projects[0].name, 'Recovered')
  })
})

it('queues an explicit restore with normal writes and backs up the board it replaces', async () => {
  const { rev } = await (await put(0, 'Original')).json()
  const restore = fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev, data: data('Restored') }) })
  const results = await Promise.all([restore, put(rev, 'Competing')])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  const { backups } = await (await get('/api/backups')).json()
  const copies = await Promise.all(backups.map(async (copy: { id: string }) => (await (await get(`/api/backups/${copy.id}`)).json()).data.projects[0].name))
  assert.ok(copies.includes('Original'))
})

it('refuses a changed recovery token and a symlinked backup directory', async () => {
  await stop()
  await fs.writeFile(path.join(directory, 'board.json'), '{ damaged one')
  await start()
  const { recoveryToken } = await (await get('/api/state')).json()
  await fs.writeFile(path.join(directory, 'board.json'), '{ damaged two')
  const restored = await fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: 0, recoveryToken, data: data('Restored') }) })
  assert.equal(restored.status, 409)
  assert.equal(await fs.readFile(path.join(directory, 'board.json'), 'utf8'), '{ damaged two')
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'defcon-outside-'))
  try {
    await fs.symlink(outside, path.join(directory, 'backups'))
    assert.equal((await get('/api/backups')).status, 500)
    assert.equal((await fs.readdir(outside)).length, 0)
  } finally { await fs.rm(outside, { recursive: true, force: true }) }
})

it('detects primary corruption during the running process and blocks normal replacement', async () => {
  assert.equal((await put(0, 'Healthy')).status, 200)
  await fs.writeFile(path.join(directory, 'board.json'), '{ damaged while running')
  assert.equal((await put(1, 'Accidental overwrite')).status, 503)
  const current = await get('/api/state')
  assert.equal(current.status, 503)
  const { recoveryToken } = await current.json()
  assert.equal((await put(1, 'Accidental overwrite')).status, 503)
  assert.equal(await fs.readFile(path.join(directory, 'board.json'), 'utf8'), '{ damaged while running')
  const restored = await fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: 0, recoveryToken, data: data('Deliberate recovery') }) })
  assert.equal(restored.status, 200)
  const files = (await fs.readdir(path.join(directory, 'backups'))).filter((file) => file.startsWith('unreadable-'))
  assert.equal(files.length, 1)
  assert.equal(await fs.readFile(path.join(directory, 'backups', files[0]), 'utf8'), '{ damaged while running')
})


async function writeLegacyHistory() {
  await fs.writeFile(path.join(directory, 'board.json'), JSON.stringify({ rev: 1, data: data('Legacy'), updatedAt: null }))
  const saved = await put(1, 'Latest before corruption')
  assert.equal(saved.status, 200)
  return (await saved.json()).rev as number | string
}

async function recoverCorruption(restart: boolean) {
  await fs.writeFile(path.join(directory, 'board.json'), '{ damaged primary')
  if (restart) { await stop(); await start() }
  const damaged = await (await get('/api/state')).json()
  const restored = await fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rev: damaged.rev, recoveryToken: damaged.recoveryToken, data: data('Recovered') }) })
  assert.equal(restored.status, 200)
  return (await restored.json()).rev as number | string
}

for (const restart of [false, true]) {
  const scenario = restart ? 'after a corrupt-primary restart' : 'after live primary corruption'
  it(`rejects all pre-recovery writes ${scenario} and retains the new identity through restart`, async () => {
    const latest = await writeLegacyHistory()
    const recovered = await recoverCorruption(restart)
    const staleStatuses = await Promise.all([1, latest].map(async (rev) => (await put(rev, 'Stale overwrite')).status))
    assert.deepEqual(staleStatuses, [409, 409])
    const staleRestore = await fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rev: latest, data: data('Stale restored copy') }) })
    assert.equal(staleRestore.status, 409)
    await stop(); await start()
    const state = await (await get('/api/state')).json()
    assert.equal(state.rev, recovered)
    assert.equal(state.data.projects[0].name, 'Recovered')
    assert.equal((await put(latest, 'Stale after restart')).status, 409)
    assert.equal((await put(recovered, 'Current edit')).status, 200)
    assert.equal((await (await get('/api/state')).json()).data.projects[0].name, 'Current edit')
  })

  it(`polls the recovered board ${scenario} and saves with its identity`, async () => {
    await writeLegacyHistory()
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => nativeFetch(input.startsWith('/') ? `${origin}${input}` : input, init))
    const { result } = renderHook(() => useBoard())
    await waitFor(() => assert.equal(result.current.data.projects[0]?.name, 'Latest before corruption'))
    await recoverCorruption(restart)
    await waitFor(() => assert.equal(result.current.data.projects[0]?.name, 'Recovered'), { timeout: 5000 })
    act(() => result.current.replaceAll(normalizeData(data('Edit after polling'))))
    await act(async () => { await result.current.retrySave() })
    assert.equal(result.current.saveState, 'saved')
    assert.equal((await (await get('/api/state')).json()).data.projects[0].name, 'Edit after polling')
  }, 10000)
}


it('reads legacy primary and backup revisions and rejects malformed write identities', async () => {
  await writeLegacyHistory()
  const { backups } = await (await get('/api/backups')).json()
  const legacy = await (await get(`/api/backups/${backups[0].id}`)).json()
  assert.equal(legacy.rev, 1)
  assert.equal(legacy.data.projects[0].name, 'Legacy')
  const original = await fs.readFile(path.join(directory, 'board.json'), 'utf8')
  for (const rev of [null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', 'invalid-revision']) {
    const result = await fetch(`${origin}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rev, data: data('Malformed identity') }) })
    assert.equal(result.status, 400)
  }
  assert.equal(await fs.readFile(path.join(directory, 'board.json'), 'utf8'), original)
})
