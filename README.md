# ▲ Defcon 1

Task board for several projects running in parallel. Local, no login, no cloud.
One swimlane per project, five status columns, tasks moved with the mouse.

```
                 Backlog     Todo    In Progress   Blocked    Done
Reporting Q4  │    ▓▓        ▓▓▓         ▓            ▓        ▓▓
Migration     │    ▓▓▓▓      ▓           ▓▓                    ▓▓▓
Onboarding    │    ▓         ▓▓                                ▓
```

## Getting started

```bash
npm install
npm start          # builds the frontend and starts the server
```

Then open `http://127.0.0.1:7777` — in Safari, Firefox, Chrome, or all of them at
the same time.

| Command | Purpose |
| --- | --- |
| `npm start` | Build + server (the normal way) |
| `npm run serve` | Server only, without rebuilding |
| `npm run dev` | Vite dev server (`:5173`) + API server, with hot reload |
| `npm test` | Vitest, 71 tests |
| `npm run typecheck` | Check TypeScript strict |

Environment variables: `DEFCON1_PORT` (default `7777`), `DEFCON1_HOST` (default
`127.0.0.1`), `DEFCON1_DATA_DIR` (default `./data`).

To reach the board from a tablet or a second machine on the same LAN, use
`DEFCON1_HOST=0.0.0.0 npm start`. Careful — there is no authentication, so only
do this on a network you trust.

## Languages

The whole interface is bilingual, German and English. The `DE` / `EN` switch sits
in the top bar; the first visit follows the browser's language preferences and
falls back to English. The choice is stored per device, so two browsers on the
same board may run in different languages.

Only the interface changes. Column names (Backlog, Todo, In Progress, Blocked,
Done), the DEFCON code words and your own project and task text stay as they are.
Dates follow the language: `20.09.2026` in German, `20 Sep 2026` in English —
never `09/20`, which reads differently on either side of the Atlantic. Quick-add
accepts both German and English tokens no matter which language is active, so
muscle memory keeps working after a switch.

## Where is the data?

In `data/board.json`. Exactly one file on disk, not in the browser — which is the
whole reason the little server exists.

localStorage works in every browser but is **separate per browser**: what you
create in Safari, Firefox will never see. On `file://` pages Safari also deletes
it after seven days of inactivity. So the server holds the truth and every
browser talks to it.

* **Conflicts**: every save carries a `rev` counter. Writing from a stale state
  gets HTTP 409, the board adopts the server state and tells you in the notice
  line.
* **Second browser**: the board polls every 4 seconds, so other people's changes
  show up on their own.
* **Safety against data loss**: writes go through a temporary file plus `rename`,
  so a crash can never leave the file half-written. Before every write a copy
  lands in `data/backups/` (the last 20 are kept).
* **Without a server**: the frontend falls back to localStorage automatically and
  shows "this browser only" in the top right. Start the server later and an
  existing localStorage board is migrated once.
* **By hand**: `Export` writes a JSON file, `Import` reads it back. The server is
  one process with one file — you are welcome to copy `data/board.json`, put it
  under version control or drop it into a sync folder.

View settings (density, sorting, collapsed lanes, focus, language) live in
localStorage on purpose: they make sense per device, not globally.

## DEFCON instead of priorities

| Level | Colour | Code word | Meaning |
| --- | --- | --- | --- |
| 1 | white | COCKED PISTOL | right now |
| 2 | red | FAST PACE | critical |
| 3 | yellow | ROUND HOUSE | important |
| 4 | green | DOUBLE TAKE | normal |
| 5 | blue | FADE OUT | someday |

Every card carries a coloured stripe on the left. DEFCON 1 and 2 count as "hot"
and are tallied in the lane and in the command deck.

## Ten projects in parallel

That is what the UI is built for:

* **Command deck** on top: one tile per project with deadline countdown,
  progress and the counters open / doing / blocked / hot / overdue. One click
  focuses the project, several clicks focus several. A double click opens the
  project settings.
* **Deadline per project**: calendar date plus countdown, in the lane and on the
  tile. Lanes are sorted by deadline by default, the most urgent on top.
* **Sticky column heads and lane rail**: while scrolling you can still see where
  you are.
* **Capped cell height**: an overflowing lane scrolls internally instead of
  pushing the others off screen.
* **Collapse lanes** — one at a time via the chevron, all of them with `c`. A
  summary line stays behind.
* **Density** `Comfort` / `Compact` (`d`): compact fits considerably more lanes
  on screen.
* **Narrow Done**: shrinks the Done column to its count and gives the width to
  the working columns.
* **Hide empty lanes**: hides projects without matching tasks.
* **DEFCON filter and search**: shows only what is burning, across all projects.

## Usage

### Mouse

* Drag a card — between columns, between projects, or reorder inside a column.
* A click selects a card, a double click opens it.
* `+ Task` appears when hovering a cell.

### Keyboard

| Key | Effect |
| --- | --- |
| `1`–`5` | move the selected task to Backlog / Todo / In Progress / Blocked / Done |
| `Shift`+`1`–`5` | set the DEFCON of the selected task |
| `n` | new task — in the selected task's project, otherwise the first visible one |
| `p` | new project |
| `e` | open the selected task |
| `x` | selected task to Done / back to Todo |
| `Backspace` / `Delete` | delete the selected task (with a confirmation) |
| `/` | search field |
| `c` | collapse / expand all lanes |
| `d` | toggle density |
| `?` | help |
| `Escape` | quick add → selection → search → filter → focus, in that order |

### Quick-add syntax

Type it straight into the `+ Task` field:

```
Open firewall ticket !2 @tomorrow
```

* `!1` … `!5` sets the DEFCON.
* `@today`, `@tomorrow`, `@mon`…`@sun`, `@+3d`, `@+2w`, `@20.09.`, `@20.09.2027`,
  `@2026-09-20` set the due date. The German tokens (`@heute`, `@morgen`,
  `@mo`…`@so`) work as well, in both languages.
* Anything that is not a valid token simply stays in the title.

## Layout

```
server/server.mjs   dependency-free HTTP server: /api/state + dist/
scripts/dev.mjs     starts Vite and the API server together
src/App.tsx         orchestration, drag & drop, shortcuts
src/components/     Board, Cell, TaskCard, LaneHeader, CommandDeck, dialogs
src/hooks/          useBoard (data + sync), usePrefs (view)
src/i18n/           de and en dictionaries, language context, detection
src/lib/            board (pure logic), date, quickAdd, storage
src/__tests__/      logic and UI tests
data/board.json     your data
```

Stack: React 19, TypeScript strict, Vite 7, `@dnd-kit` for drag & drop, Vitest.
The server runs without a single runtime dependency.

Contributing or handing this to an agent? `AGENTS.md` has the working agreements.
