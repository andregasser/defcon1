# AGENTS.md

Working agreements for coding agents (and humans) in this repository. Read this
before the first edit. `README.md` explains what the product does — this file
explains how to change it.

## 1. What this is

Defcon 1 is a local, auth-free task board for several projects running in
parallel. One swimlane per project, five status columns, drag & drop between
them. A tiny Node server owns a single JSON file so every browser on the machine
sees the same board.

Non-goals, on purpose: no authentication, no multi-user permissions, no cloud, no
database, no runtime dependency in the server, no build step for the server.
Proposals that add one of those need a very good reason.

## 2. Setup and commands

```bash
npm install
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite (`:5173`) + API server together, hot reload — use this while coding |
| `npm test` | Vitest once (93 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc -b --noEmit`, strict |
| `npm run build` | `tsc -b && vite build` into `dist/` |
| `npm start` | Build, then serve `dist/` + the API on `:7777` |
| `npm run serve` | Serve only, no rebuild |

Run these commands from the repository root. For normal use, run `npm start`
and open <http://127.0.0.1:7777>. Keep the terminal open while using the board.

* **Stop:** press `Ctrl+C` in the terminal running the server.
* **Restart:** stop with `Ctrl+C`, then run `npm start` again. Use
  `npm run serve` instead if the existing build is still current.
* There are no dedicated stop or restart scripts. Board data stays on disk
  when the server stops.
* For development, run `npm run dev` and open <http://localhost:5173>;
  `Ctrl+C` stops both Vite and the API server.

Environment: `DEFCON1_PORT` (7777), `DEFCON1_HOST` (127.0.0.1),
`DEFCON1_DATA_DIR` (`./data`).

**Definition of done for any change:** `npm test` green, `npm run build` green
(it type-checks first). Run both before you report back. Never commit `dist/` or
`data/`.

## 3. Layout

```
index.html            single page; lang + title are overwritten at runtime
server/server.mjs     dependency-free HTTP server: /api/state, /api/health, dist/
scripts/dev.mjs       spawns Vite and the API server
src/main.tsx          mounts <App />
src/App.tsx           orchestration: state wiring, drag & drop, shortcuts, dialogs
src/components/       Board, Cell, TaskCard, LaneHeader, CommandDeck, TopBar, dialogs
src/hooks/useBoard.ts data + server sync + fallback + notices
src/hooks/usePrefs.ts per-device view settings
src/i18n/             de.tsx, en.tsx dictionaries, index.tsx context, lang.ts detection
src/lib/alarm.ts      the DEFCON 1 alarm: MP3s from public/sounds/, rotated
public/sounds/        the alarm recordings + their own README
src/lib/board.ts      pure board logic: cell ids, moves, stats, sorting, demo data
src/lib/date.ts       ISO parsing, language-aware formatting, countdowns
src/lib/quickAdd.ts   the `!2 @tomorrow` mini syntax
src/lib/storage.ts    normalisation, localStorage, server transport, export/import
src/types.ts          the whole domain model
src/constants.ts      statuses, DEFCON levels, colours, default prefs, storage keys
src/index.css         all styling; CSS custom properties, no framework
src/__tests__/        logic.test.ts (node env), app.test.tsx + useBoard.test.tsx (jsdom)
data/board.json       runtime data, gitignored
```

Rules of thumb:

* **Pure logic goes in `src/lib/`** and is tested in `logic.test.ts` without
  React. If a component grows a non-trivial computation, move it there.
* **`App.tsx` owns cross-cutting state** (selection, filters, drag, quick add).
  Components stay presentational and take props.
* **No new dependency without asking.** The server must stay dependency-free.

## 4. Data model and persistence

* `Project { id, name, description, color, deadline, order }`, `Task { id,
  projectId, title, note, status, defcon, due, order, createdAt, doneAt }`.
  Dates are local ISO days, `yyyy-mm-dd`.
* `order` is dense **per cell** (`projectId` × `status`) for tasks and per board
  for projects. Any move must renumber both source and target so no holes appear.
* A cell is addressed by `cellId(projectId, status)` → `cell:<projectId>:<status>`;
  parse it back only with `parseCellId`, which tolerates colons in ids.
* Persistence: `GET /api/state` → `{ rev, data, updatedAt }`, `PUT /api/state`
  with the last seen `rev`. A stale `rev` gets **HTTP 409** plus the current
  state; the client adopts the server state and raises a `conflict` notice.
  Polling every 4 s picks up other browsers. Writes are tmp-file + `rename`, with
  the last 20 copies in `data/backups/`.
* Without a server the frontend falls back to `localStorage`
  (`defcon1.data.v1`) and migrates that board once when a server appears.
* **Browser-only mode is never a dead end.** `useBoard` keeps retrying
  `connect()` every 4 s while it is in `local` mode, so reloading the page during
  a server restart recovers on its own instead of showing an empty board until
  the next reload. The retry stops for good as soon as the user edits something
  in that mode (`localEditRef`) — pulling a board out from under someone is worse
  than staying browser-only. `useBoard.test.tsx` covers all three paths.
* View prefs live in `localStorage` (`defcon1.prefs.v1`) on purpose — they are
  per device. Never move them into `board.json`.
* `normalizeData()` is the single gate for anything coming from disk, network or
  an import: it fills defaults, clamps bogus DEFCON levels, rejects malformed
  dates and drops tasks whose project is gone. Extend it whenever you add a
  field, and cover the new field in `logic.test.ts`.

## 5. Bilingual by construction

The interface is fully German **and** English. This is a hard requirement, not a
nice-to-have.

* `src/i18n/de.tsx` is the reference dictionary and exports
  `export type Dict = typeof de`; `en.tsx` is typed `const en: Dict`. **A missing
  or misspelled key is a compile error** — that is the whole safety net, do not
  weaken it with `Partial`, `Record<string, string>` or casts.
* Components read copy via `const t = useT()` and, when they format a date,
  `const lang = useLang()`. `App.tsx` sits above the provider and uses
  `getDict(prefs.lang)` directly.
* Entries that need values are **functions**, e.g. `deleteTask: (title) => …`.
  Never concatenate translated fragments in a component.
* **Never put a user-visible string in a component, hook or lib.** New copy goes
  into both dictionaries in the same commit.
* Two tests guard this: the dictionaries must have the same shape (same keys,
  same value kinds) and every entry must actually differ between languages. If a
  value is identical on purpose (loan word, column name, code word, date token),
  add it to the `shared` set in `logic.test.ts` **with a reason in the comment**.
* Deliberately untranslated: the five column names (Backlog, Todo, In Progress,
  Blocked, Done — `1`–`5` must always mean the same column), the DEFCON code
  words (proper names), and the user's own content.
* Dates: German `20.09.2026` / `20.09.`, English `20 Sep 2026` / `20 Sep`. The
  month is always spelled out in English so `09/20` can never be misread. Use
  `formatDate` / `formatDateShort` / `formatCountdown` from `src/lib/date.ts`.
* Quick-add accepts German **and** English tokens regardless of the active
  language, so muscle memory survives a switch.
* The data layer never owns copy: `useBoard` reports a `BoardNotice` **code**
  (`conflict`, `migrated`, `saveFailed`) that `App.tsx` turns into a sentence.
  Placeholders written into `board.json` (`Untitled project`, `Untitled task`),
  server responses and console output are English — that is code language, not
  interface language.
* Language is a per-device pref; `detectLang()` guesses from
  `navigator.languages` on first load and falls back to English. It takes an
  optional `tags` argument purely so tests can be deterministic.

## 6. Priority: sorting and the alarm

* Cards inside a cell are ordered by `prefs.taskSort` (`'defcon'` by default,
  `'manual'` for pure hand order). `groupByCell(tasks, sort)` does it, and
  `defcon` mode sorts by `a.defcon - b.defcon || a.order - b.order`.
* **`order` is never renumbered for sorting.** It stays the hand order
  underneath, so switching back to `manual` restores exactly the board the user
  arranged. Never "fix up" `order` to match a DEFCON sort.
* A task reaching DEFCON 1 sounds the alarm (`playAlarm()` from
  `src/lib/alarm.ts`) — on creation with `!1` and on escalation, never twice for
  a task that is already at 1, and never when `prefs.sound` is off.
* Call it from the event handler, **not** from inside a `board.update()`
  callback: state updaters may run twice and would double the sound.
* The alarm is a **real recording**, not synthesis — synthesised horns sounded
  like a toy and were thrown out. `ALARM_TRACKS` lists the MP3s in
  `public/sounds/`; `nextTrack()` picks one at random but never the one that just
  played, which is pure and therefore tested directly. Adding a sound is a file
  plus a name in that list.
* Playback degrades to silence everywhere: no `Audio` constructor (node tests), a
  missing file, or a browser blocking autoplay — nothing throws. `app.test.tsx`
  mocks `playAlarm`/`preloadAlarm` and asserts only *when* it fires.
* `App.tsx` calls `preloadAlarm()` in an effect while `prefs.sound` is on, so the
  files are in the cache before the first emergency.
* `DEFCONS` in `src/constants.ts` carries the **official** scale — 1 red, 2
  orange, 3 yellow, 4 green, 5 blue. Those are signal colours, used verbatim as
  fill, stripe and swatch; do not tone them down. Each level also has an `ink`,
  the text colour that stays legible **on** its `color` (the badge is the one
  place text sits on the colour, and a test enforces 4.5:1). Where a level has to
  appear inside running text — the help legend — use a swatch plus neutral text,
  never the colour as font colour: `#0057d8` is unreadable on the dark panel.

## 7. Ten lanes in parallel

The UI is designed for ~10 simultaneous projects. Keep it that way when you touch
the board: sticky column heads and lane rail, capped cell height with internal
scrolling, collapsible lanes, compact density, narrow Done, focus via the command
deck, DEFCON filter and search.

**Text on the board is never truncated.** Lane name, tile name, project
description **and task title** wrap (`overflow-wrap: anywhere`) instead of ending
in an ellipsis or a line clamp — a half-read title is worse than a taller card.
Compact density makes cards tighter (padding, line height), never shorter than
their content; there is deliberately no `white-space: nowrap` on `.card-title` in
any density. `logic.test.ts` asserts this directly against `index.css`, so if you
restyle those rules, keep the promise rather than the test.

Wrapping alone is not enough, and this part is subtle: `.cell` is a column flex
container with a `max-height`, so its children shrink by default. The usual
protection — `min-height: auto` resolving to the content size — **does not apply
to an item whose `overflow` is not `visible`**, and `.card` needs
`overflow: hidden` to clip its DEFCON stripe to the rounded corners. Cards were
therefore squashed as soon as a cell filled up, and the last line of a wrapped
title disappeared. `.cell > * { flex: 0 0 auto }` is what keeps them at their own
height; the cell scrolls instead. Do not remove it, and do not "simplify" it to
`.card` only — quick add and the hint line have the same problem.

The board is **one flat CSS grid**: a lane header and its five cells are
siblings, not nested in a per-lane wrapper. Tests walk `nextElementSibling` to
find a lane's cells — if you nest the DOM, fix the helpers in `app.test.tsx` in
the same commit.

Visibility rules for lanes, in order (see `visibleProjects` in `App.tsx`):

1. An explicit focus wins over everything — the lanes picked in the deck are
   exactly the lanes shown.
2. A project with at least one matching task is shown.
3. A project with **zero** tasks is hidden only by the explicit "hide empty
   lanes" switch — otherwise a new project would have no cell to add its first
   task to. This was a real bug; do not regress it.
4. Otherwise the project is hidden while a task filter is active.

## 8. Style

* TypeScript strict, including `noUnusedLocals` and `verbatimModuleSyntax` —
  type-only imports need `import type`.
* Everything in code is **English**: identifiers, comments, commit messages,
  server output, log lines. Only dictionary values are German.
* Comments explain **why**, not what. Match the density of the surrounding file;
  no decorative banners beyond the existing section separators.
* No CSS framework. Styling lives in `src/index.css` and goes through the
  existing custom properties; helpers in `src/lib/css.ts`.
* Prefer pure functions returning new arrays over in-place mutation — the board
  logic is written that way and the tests assert it.
* Accessibility is part of the feature: `aria-label` / `aria-pressed` /
  `role="group"` on controls, `title` on icon-only buttons, keyboard access for
  anything reachable by mouse.

## 9. Testing

* `src/__tests__/logic.test.ts` — node environment, `node:assert/strict`, covers
  `lib/` and the dictionaries. Fast; keep it that way.
* `src/__tests__/app.test.tsx` — starts with `// @vitest-environment jsdom`, uses
  `@testing-library/react` and `user-event` against the real `App`. It clears
  `localStorage` and **pins the language** (`PREFS_KEY` → `{ lang: 'de' }`)
  because jsdom reports `en-US`; keep the pin so assertions stay in one language.
* Every bug fix gets a regression test in the same commit.
* Drag & drop itself is not simulated — test the pure move functions instead.

## 10. Git

* **Conventional Commits**, lowercase imperative, no trailing period:
  `feat(i18n): add english dictionary`, `fix(board): keep empty lanes reachable`.
* Small, coherent commits. Tests and type-check green before committing.
* Do not commit to `main` directly, do not force-push, do not merge — work on a
  branch and open a PR.
* `dist/`, `data/` and `node_modules/` stay untracked.

## 11. Before you report back

- [ ] `npm test` green
- [ ] `npm run build` green (type-check included)
- [ ] New copy added to **both** dictionaries
- [ ] New/changed data fields handled in `normalizeData()`
- [ ] Regression test for every fixed bug
- [ ] Touched user-facing behaviour reflected in `README.md`
