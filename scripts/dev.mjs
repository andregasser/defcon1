/**
 * Starts both halves of the dev setup with one command:
 *   - the persistence server on :7777 (owns data/board.json)
 *   - Vite on :5173 (proxies /api to the server, see vite.config.ts)
 *
 * Kept dependency-free on purpose — no `concurrently`, no extra install.
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API_PORT = process.env.DEFCON1_API_PORT ?? '7777'

const children = []
let shuttingDown = false

function start(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, DEFCON1_API_PORT: API_PORT, DEFCON1_PORT: API_PORT },
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`[dev] ${name} beendet (${signal ?? code}) — stoppe alles.`)
    shutdown(typeof code === 'number' ? code : 1)
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => process.exit(code), 200)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start('api', [path.join(ROOT, 'server', 'server.mjs')])
start('vite', [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')])
