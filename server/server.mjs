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
import { createReadStream } from 'node:fs'
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
  '.map': 'application/json; charset=utf-8',
}

/* ------------------------------------------------------------------ storage */

/** Serialises writes so two browsers saving at once cannot interleave. */
let writeChain = Promise.resolve()
let cache = null

async function readState() {
  if (cache) return cache
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.data) throw new Error('malformed')
    cache = {
      rev: Number(parsed.rev) || 0,
      data: {
        projects: Array.isArray(parsed.data.projects) ? parsed.data.projects : [],
        tasks: Array.isArray(parsed.data.tasks) ? parsed.data.tasks : [],
      },
      updatedAt: parsed.updatedAt ?? null,
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[defcon1] ${DATA_FILE} unlesbar (${error.message}) — starte mit leerem Board.`)
    }
    cache = structuredClone(EMPTY_STATE)
  }
  return cache
}

async function backup() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    await fs.mkdir(BACKUP_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await fs.writeFile(path.join(BACKUP_DIR, `board-${stamp}.json`), raw, 'utf8')

    const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.startsWith('board-')).sort()
    for (const stale of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) {
      await fs.unlink(path.join(BACKUP_DIR, stale)).catch(() => {})
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[defcon1] Backup fehlgeschlagen:', error.message)
  }
}

/** Writes via temp file + rename so a crash can never truncate the board. */
async function writeState(next) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = `${DATA_FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  await fs.rename(tmp, DATA_FILE)
  cache = next
}

/**
 * Optimistic concurrency: the client sends the rev it last saw. A mismatch
 * means another browser saved in between, so we reject instead of clobbering.
 */
function saveState(clientRev, data) {
  const run = async () => {
    const current = await readState()
    if (clientRev !== current.rev) {
      return { conflict: true, state: current }
    }
    const next = {
      rev: current.rev + 1,
      data,
      updatedAt: new Date().toISOString(),
    }
    await backup()
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
        reject(new Error('Body zu gross'))
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
    return sendJSON(res, 200, await readState())
  }

  if (pathname === '/api/state' && req.method === 'PUT') {
    let payload
    try {
      payload = JSON.parse(await readBody(req))
    } catch (error) {
      return sendJSON(res, 400, { error: `Ungültiger Request: ${error.message}` })
    }
    if (!validData(payload?.data)) {
      return sendJSON(res, 400, { error: 'data.projects und data.tasks müssen Arrays sein' })
    }

    const result = await saveState(Number(payload.rev) || 0, payload.data)
    if (result.conflict) {
      return sendJSON(res, 409, {
        error: 'Board wurde zwischenzeitlich anderswo geändert',
        ...result.state,
      })
    }
    return sendJSON(res, 200, { rev: result.state.rev, updatedAt: result.state.updatedAt })
  }

  return sendJSON(res, 404, { error: 'Unbekannter Endpunkt' })
}

async function serveStatic(res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname
  const resolved = path.join(DIST, path.normalize(requested))

  // Never escape dist/, whatever the client sends.
  if (!resolved.startsWith(DIST + path.sep) && resolved !== path.join(DIST, 'index.html')) {
    return sendJSON(res, 403, { error: 'Verboten' })
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
    res.end('dist/ fehlt. Bitte zuerst "npm run build" ausführen (oder "npm run dev" nutzen).\n')
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
      return sendJSON(res, 405, { error: 'Methode nicht erlaubt' })
    }
    await serveStatic(res, pathname)
  } catch (error) {
    console.error('[defcon1]', error)
    if (!res.headersSent) sendJSON(res, 500, { error: 'Interner Fehler' })
    else res.end()
  }
})

server.listen(PORT, HOST, () => {
  console.log('')
  console.log('  ██  DEFCON 1  ██')
  console.log(`  Board:  http://${HOST}:${PORT}`)
  console.log(`  Daten:  ${DATA_FILE}`)
  console.log('  Beenden mit Ctrl+C')
  console.log('')
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[defcon1] Port ${PORT} ist belegt. Läuft Defcon 1 schon? ` +
        `Sonst mit DEFCON1_PORT=8080 npm start einen anderen Port wählen.`,
    )
    process.exit(1)
  }
  throw error
})
