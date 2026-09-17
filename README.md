<div align="center">

# ▲ DEFCON 1

**A local, login-free task board for the ten projects you are juggling at once.**

One swimlane per project · five status columns · priorities as DEFCON levels ·
one JSON file on your disk.

[![React 19](https://img.shields.io/badge/React-19-0a84ff?logo=react&logoColor=white)](https://react.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite 7](https://img.shields.io/badge/Vite-7-bf5af2?logo=vite&logoColor=white)](https://vite.dev)
[![Tests](https://img.shields.io/badge/tests-61%20passing-32d74b)](#development)
![Server dependencies](https://img.shields.io/badge/server%20deps-0-ff9f0a)
![No cloud](https://img.shields.io/badge/cloud-none-ff453a)

<img src="docs/images/hero.png" alt="The DEFCON 1 board: a command deck of project tiles above seven project swimlanes across Backlog, Todo, In Progress, Blocked and Done columns" width="100%">

</div>

---

## Why this exists

Most boards give you one project and expect you to switch tabs for the rest.
DEFCON 1 inverts that: **every project is a row**, always visible, so the answer
to *"what is actually on fire right now?"* is one glance, not five clicks.

And it stays yours. No account, no sync service, no telemetry — a tiny loopback
server, one `board.json`, and any browser you feel like opening.

## Quickstart

```bash
npm install
npm start          # builds the frontend and starts the server
```

Open **<http://127.0.0.1:7777>** — in Safari, Firefox, Chrome, or all three at
the same time. They all see the same board.

## Highlights

### Ten projects, one screen

The **command deck** puts one tile per project above the board: deadline
countdown, progress bar, and counters for open / doing / blocked / hot /
overdue. Click a tile to focus that project, click several to focus several,
double-click to edit it.

Below it, the board keeps ten lanes readable: sticky column headers, a sticky
lane rail, capped cell height so one overloaded project cannot push the others
off screen, and collapsible lanes that leave a summary line behind.

### A density switch that actually earns its keep

Press <kbd>d</kbd> for compact mode, and narrow the Done column to just its
count — the working columns get the width instead.

<div align="center">
<img src="docs/images/compact.png" alt="The same board in compact density with the command deck collapsed and the Done column narrowed to a count, fitting five project lanes on screen" width="100%">
</div>

### Priorities as DEFCON levels

Because "high / medium / low" never survives contact with ten projects.

| Level | Colour | Code word | Meaning |
| :---: | --- | --- | --- |
| **1** | white | `COCKED PISTOL` | drop everything |
| **2** | red | `FAST PACE` | critical |
| **3** | yellow | `ROUND HOUSE` | important |
| **4** | green | `DOUBLE TAKE` | normal |
| **5** | blue | `FADE OUT` | someday |

Every card carries a coloured stripe on its left edge. Levels 1 and 2 count as
**hot** and light up both the lane header and the command deck.

### Keyboard-first

| Key | Action |
| --- | --- |
| <kbd>1</kbd>–<kbd>5</kbd> | move the selected task to Backlog / Todo / In Progress / Blocked / Done |
| <kbd>Shift</kbd> + <kbd>1</kbd>–<kbd>5</kbd> | set its DEFCON level |
| <kbd>n</kbd> | new task in the first visible project |
| <kbd>p</kbd> | new project |
| <kbd>e</kbd> | open the selected task |
| <kbd>x</kbd> | toggle the selected task Done ⇄ Todo |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | delete the selected task (with a confirmation) |
| <kbd>/</kbd> | jump to search |
| <kbd>c</kbd> | collapse / expand all lanes |
| <kbd>d</kbd> | toggle density |
| <kbd>?</kbd> | help |
| <kbd>Escape</kbd> | backs out of quick-add → selection → search → filter → focus, in that order |

With the mouse: drag cards between columns, between projects, or to reorder
within a column. Click selects, double-click opens, and `+ Task` appears when
you hover a cell.

### Quick-add syntax

Type the whole task in one line:

```
Open firewall ticket !2 @tomorrow
```

* `!1` … `!5` sets the DEFCON level.
* `@today`, `@tomorrow`, `@mon`…`@sun`, `@+3d`, `@+2w`, `@2026-09-20`, `@20.09.`,
  `@20.09.2027` set the due date. German aliases (`@heute`, `@morgen`, `@fr`, …)
  work too.
* Anything that does not parse as a token simply stays in the title — so an
  e-mail address or a stray `!` never gets swallowed.

## Where your data lives

In **`data/board.json`**. Exactly one file on disk — not in the browser. That is
the entire reason the little server exists.

localStorage works everywhere, but it is **siloed per browser**: a board you
create in Safari is invisible to Firefox, and Safari additionally evicts it after
seven days of inactivity on `file://` pages. So the server holds the truth and
every browser talks to it.

* **Conflicts** — every save carries a `rev` counter. Write with a stale
  revision and you get HTTP 409; the board adopts the server state and tells you
  so in the status line.
* **Second browser** — the board polls every 4 seconds, so someone else's
  changes just show up.
* **Crash safety** — writes go through a temp file plus `rename`, so a crash can
  never leave the file half-written. Each write also drops a copy into
  `data/backups/` (the last 20 are kept).
* **No server?** — the frontend falls back to localStorage and says
  *"this browser only"* in the top right. Start the server later and an existing
  localStorage board is migrated over once.
* **By hand** — `Export` writes a JSON file, `Import` reads it back. It is one
  process and one file, so you are free to copy, version, or sync
  `data/board.json` yourself.

View settings (density, sort order, collapsed lanes, focus) deliberately stay in
localStorage — how you *look* at the board is per-device; the tasks are not.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEFCON1_PORT` | `7777` | HTTP port |
| `DEFCON1_HOST` | `127.0.0.1` | bind address |
| `DEFCON1_DATA_DIR` | `./data` | where `board.json` and backups live |

To reach the board from a tablet or a second machine on the same LAN:

```bash
DEFCON1_HOST=0.0.0.0 npm start
```

> [!WARNING]
> There is **no authentication**. Only bind beyond loopback on a network you
> trust.

## Development

| Command | Purpose |
| --- | --- |
| `npm start` | build + serve (the normal way) |
| `npm run serve` | serve only, no rebuild |
| `npm run dev` | Vite dev server (`:5173`) + API server, with hot reload |
| `npm test` | Vitest — 61 tests |
| `npm run typecheck` | TypeScript strict check |

```
server/server.mjs   dependency-free HTTP server: /api/state + dist/
scripts/dev.mjs     runs Vite and the API server together
src/App.tsx         orchestration, drag & drop, shortcuts
src/components/     Board, Cell, TaskCard, LaneHeader, CommandDeck, dialogs
src/hooks/          useBoard (data + sync), usePrefs (view state)
src/lib/            board (pure logic), date, quickAdd, storage
src/__tests__/      logic and UI tests
data/board.json     your data
```

**Stack:** React 19, TypeScript strict, Vite 7, [`@dnd-kit`](https://dndkit.com)
for drag & drop, Vitest. The server runs on the Node standard library alone —
zero runtime dependencies.

> [!NOTE]
> The UI labels are currently German (the screenshots above are the real app);
> the code, data model, and quick-add syntax are English.
