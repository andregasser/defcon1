import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'vitest'

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
const put = (rev: number, name: string) => fetch(`${origin}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev, data: data(name) }) })
beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'defcon-recovery-')); await start() })
afterEach(async () => { await stop(); await fs.rm(directory, { recursive: true, force: true }) })

describe('real persistence server', () => {
  it('serializes concurrent revisions and preserves the winner through restart', async () => {
    const results = await Promise.all([put(0, 'First'), put(0, 'Second')])
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
    const saved = await (await get('/api/state')).json()
    await stop(); await start()
    assert.deepEqual(await (await get('/api/state')).json(), saved)
  })

  it('lists and reads validated backups without accepting arbitrary paths or symlinks', async () => {
    assert.equal((await put(0, 'Prior')).status, 200)
    assert.equal((await put(1, 'Current')).status, 200)
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
  await put(0, 'Original')
  const restore = fetch(`${origin}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: 1, data: data('Restored') }) })
  const results = await Promise.all([restore, put(1, 'Competing')])
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
