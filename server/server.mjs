/**
 * Defcon 1 — local persistence server.
 *
 * Why this exists: localStorage is siloed per browser, so a board saved in
 * Firefox is invisible in Safari. This server keeps the single source of truth
 * in one file on disk (`data/board.json`) and hands it to any browser that
 * asks. No auth, no dependencies, bound to loopback only.
 *
 *   GET  /api/state   -> { rev, data, updatedAt }
 *   PUT  /api/state   -> { rev, data }; 409 + current state if rev is stale
 *   GET  /api/health  -> { ok, file, rev }
 *   *                 -> static files from dist/
 */

import { createServer } from 'node:http'
import { createReadStream, constants } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const DATA_DIR = process.env.DEFCON1_DATA_DIR
  ? path.resolve(process.env.DEFCON1_DATA_DIR)
  : path.join(ROOT, 'data')
const DATA_FILE = path.join(DATA_DIR, 'board.json')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')

const PORT = Number(process.env.DEFCON1_PORT ?? process.env.DEFCON1_API_PORT ?? 7777)
const HOST = process.env.DEFCON1_HOST ?? '127.0.0.1'
const MAX_BODY = 16 * 1024 * 1024
const KEEP_BACKUPS = 20

const EMPTY_STATE = { rev: 0, data: { projects: [], tasks: [] }, updatedAt: null }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.map': 'application/json; charset=utf-8',
}

/* ------------------------------------------------------------------ storage */

/** Serialises writes so two browsers saving at once cannot interleave. */
let writeChain = Promise.resolve()

function validRevision(value) {
  return typeof value === 'number' ? Number.isSafeInteger(value) && value >= 0
    : typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
}

function parseState(raw) {
  const parsed = JSON.parse(raw)
  if (!parsed || !validRevision(parsed.rev) || !validData(parsed.data)) {
    throw new Error('malformed state')
  }
  return { rev: parsed.rev, data: parsed.data, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null }
}

async function readState() {
  let raw
  try {
    raw = await fs.readFile(DATA_FILE)
    return parseState(raw.toString('utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return structuredClone(EMPTY_STATE)
    // Keep the original bytes. Only an explicitly reviewed restore can replace
    // this state, and its token changes whenever the damaged file changes.
    return { ...structuredClone(EMPTY_STATE), recoveryRequired: true,
      recoveryToken: createHash('sha256').update(raw ?? String(error.code)).digest('hex') }
  }
}

const backupId = /^board-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z?(?:-[a-f0-9-]{36})?\.json$/

async function ensureBackupDirectory() {
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  const stat = await fs.lstat(BACKUP_DIR)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('invalid backup directory')
}

async function readBackup(id) {
  if (!backupId.test(id)) throw new Error('invalid backup identifier')
  await ensureBackupDirectory()
  // O_NOFOLLOW protects the final component even if it changes after listing.
  const handle = await fs.open(path.join(BACKUP_DIR, id), constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    if (!(await handle.stat()).isFile()) throw new Error('invalid backup file')
    return parseState(await handle.readFile('utf8'))
  } finally { await handle.close() }
}

async function listBackups() {
  await ensureBackupDirectory()
  const backups = []
  for (const id of (await fs.readdir(BACKUP_DIR)).filter((id) => backupId.test(id)).sort().reverse()) {
    try {
      const state = await readBackup(id)
      backups.push({ id, capturedAt: state.updatedAt ?? id.slice(6, 29).replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})/, 'T$1:$2:$3.$4') + 'Z',
        projects: state.data.projects.length, tasks: state.data.tasks.length })
    } catch { /* Broken and linked files are never offered as restorable copies. */ }
  }
  return backups
}

async function backup(unreadable = false) {
  let raw
  try { raw = await fs.readFile(DATA_FILE) } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
  await ensureBackupDirectory()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  // Damaged originals are retained separately and never pruned as normal copies.
  const prefix = unreadable ? 'unreadable' : 'board'
  await fs.writeFile(path.join(BACKUP_DIR, `${prefix}-${stamp}-${randomUUID()}.json`), raw, { flag: 'wx' })
  const files = (await fs.readdir(BACKUP_DIR)).filter((id) => backupId.test(id)).sort()
  for (const stale of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) {
    await fs.unlink(path.join(BACKUP_DIR, stale))
  }
}

/** Writes via temp file + rename so a crash can never truncate the board. */
async function writeState(next) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = `${DATA_FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  await fs.rename(tmp, DATA_FILE)
}

/**
 * Optimistic concurrency: the client sends the rev it last saw. A mismatch
 * means another browser saved in between, so we reject instead of clobbering.
 */
function saveState(clientRev, data, restore = false, recoveryToken) {
  const run = async () => {
    const current = await readState()
    if (current.recoveryRequired && !restore) return { recoveryRequired: true, state: current }
    if (clientRev !== current.rev || (current.recoveryRequired && recoveryToken !== current.recoveryToken) ||
      (!current.recoveryRequired && recoveryToken)) {
      return { conflict: true, state: current }
    }
    const next = {
      // A fresh persisted identity cannot reuse a pre-corruption counter, even
      // if the process restarted and no longer knows the previous revision.
      rev: randomUUID(),
      data,
      updatedAt: new Date().toISOString(),
    }
    await backup(!!current.recoveryRequired)
    await writeState(next)
    return { conflict: false, state: next }
  }

  writeChain = writeChain.then(run, run)
  return writeChain
}

/* -------------------------------------------------------------------- http */

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function validData(data) {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.projects) &&
    Array.isArray(data.tasks)
  )
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health' && req.method === 'GET') {
    const state = await readState()
    return sendJSON(res, 200, { ok: true, file: DATA_FILE, rev: state.rev })
  }

  if (pathname === '/api/state' && req.method === 'GET') {
    const state = await readState()
    return sendJSON(res, state.recoveryRequired ? 503 : 200, state)
  }

  if (pathname === '/api/backups' && req.method === 'GET') {
    return sendJSON(res, 200, { backups: await listBackups() })
  }

  if (pathname.startsWith('/api/backups/') && req.method === 'GET') {
    try { return sendJSON(res, 200, await readBackup(decodeURIComponent(pathname.slice('/api/backups/'.length)))) }
    catch { return sendJSON(res, 404, { error: 'backup not found' }) }
  }

  if ((pathname === '/api/state' && req.method === 'PUT') || (pathname === '/api/restore' && req.method === 'POST')) {
    let payload
    try {
      payload = JSON.parse(await readBody(req))
    } catch (error) {
      return sendJSON(res, 400, { error: `invalid request: ${error.message}` })
    }
    if (!validData(payload?.data)) {
      return sendJSON(res, 400, { error: 'data.projects and data.tasks must be arrays' })
    }

    if (!validRevision(payload.rev)) return sendJSON(res, 400, { error: 'invalid revision' })
    const result = await saveState(payload.rev, payload.data, pathname === '/api/restore', payload.recoveryToken)
    if (result.recoveryRequired) return sendJSON(res, 503, { error: 'explicit recovery required', ...result.state })
    if (result.conflict) {
      return sendJSON(res, 409, {
        error: 'the board was changed elsewhere in the meantime',
        ...result.state,
      })
    }
    return sendJSON(res, 200, { rev: result.state.rev, updatedAt: result.state.updatedAt })
  }

  return sendJSON(res, 404, { error: 'unknown endpoint' })
}

async function serveStatic(res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname
  const resolved = path.join(DIST, path.normalize(requested))

  // Never escape dist/, whatever the client sends.
  if (!resolved.startsWith(DIST + path.sep) && resolved !== path.join(DIST, 'index.html')) {
    return sendJSON(res, 403, { error: 'forbidden' })
  }

  let target = resolved
  try {
    const stat = await fs.stat(target)
    if (stat.isDirectory()) target = path.join(target, 'index.html')
  } catch {
    // Unknown path: fall back to the SPA entry point.
    target = path.join(DIST, 'index.html')
  }

  try {
    await fs.access(target)
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('dist/ is missing. Run "npm run build" first (or use "npm run dev").\n')
    return
  }

  const ext = path.extname(target).toLowerCase()
  const immutable = target.includes(`${path.sep}assets${path.sep}`)
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(target).pipe(res)
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? HOST}`)
  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname)
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJSON(res, 405, { error: 'method not allowed' })
    }
    await serveStatic(res, pathname)
  } catch (error) {
    console.error('[defcon1]', error)
    if (!res.headersSent) sendJSON(res, 500, { error: 'internal error' })
    else res.end()
  }
})

server.listen(PORT, HOST, () => {
  console.log('')
  console.log('  ██  DEFCON 1  ██')
  console.log(`  Board:  http://${HOST}:${PORT}`)
  console.log(`  Data:   ${DATA_FILE}`)
  console.log('  Stop with Ctrl+C')
  console.log('')
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[defcon1] port ${PORT} is taken. Is Defcon 1 already running? ` +
        `Otherwise pick another port with DEFCON1_PORT=8080 npm start.`,
    )
    process.exit(1)
  }
  throw error
})
