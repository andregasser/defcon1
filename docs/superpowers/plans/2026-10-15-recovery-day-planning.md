# Recovery and Daily Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Safely recover board changes, deliberately review earlier plans and prepare tomorrow, and make Today actions easier to scan.

**Architecture:** Preserve the Node JSON store and revision protocol. Separate recovery storage, transport and UI from Today planning helpers and presentation. Implement the three increments sequentially so each has its own tests and review.

**Tech Stack:** Existing React 19, strict TypeScript, Vite, Vitest, Node standard library; no new dependencies.

**Spec:** docs/superpowers/specs/2026-10-15-recovery-day-planning.md

## Global Constraints

- No new dependencies. The server remains dependency-free, local and auth-free.
- Every user-facing string belongs in both de.tsx and en.tsx; keep Dict shape typing and the dictionary tests.
- Task planning uses local ISO days and never changes due dates, priority or status.
- Preserve official DEFCON colours and complete wrapping titles, keyboard access and mobile usability.
- Normalize all disk/network/import board data. Keep device preferences and recovery copies out of board.json.
- Never touch real user board data. Integration tests and previews use temporary synthetic boards.
- Run npm test, npm run build, npm run build:demo and git diff --check before delivery.
- Every commit must have an imperative Conventional Commit subject under 72 characters and a substantive English body covering motivation, changes and actual checks. Stage only intended files, never dist, dist-demo, data, node_modules or local configuration.

### Task 1: Recover work after storage failures and conflicts

**Files:** create src/lib/recovery.ts, src/components/RecoveryDialog.tsx, src/__tests__/recovery.test.tsx and src/__tests__/server.test.ts; modify src/hooks/useBoard.ts, src/lib/storage.ts, src/types.ts, server/server.mjs, App.tsx, TopBar.tsx, index.css, both dictionaries, README.md and docs/usage.md as needed. Focus helpers may be extracted into narrowly named files to keep responsibilities legible.

**Interfaces:** preserve the existing useBoard interface, adding retrySave and recovery access/restore operations as needed. RecoverySnapshot stores id, capturedAt, reason and normalized BoardData; browser and demo keys are separate. GET /api/backups lists validated backup summaries; GET /api/backups/:id reads a validated snapshot. An explicit restore operation must compare the revision the user reviewed and preserve the prior state. Keep normal PUT concurrency semantics; unreadable primary files require explicit recovery with a reviewed revision/recovery token.

- [ ] Write failing regression tests for loss of local changes after 409, edits during an in-flight save, failure followed by retry, preservation across hook remount, and quota failure. Assert resulting board contents, saved payload revisions and recovery copies using real storage with mocked network boundaries where needed.
- [ ] Write real server tests using child_process, temporary directories and a free port: concurrent PUT requests from one revision produce one success and one conflict; restart preserves data; backup list/read returns prior data; malformed/missing identifiers and traversal/symlink attempts cannot read arbitrary files; malformed primary data is preserved and deliberate restore works.
- [ ] Run the focused tests and capture the expected failures before implementing.
- [ ] Implement durable pending snapshots, bounded recovery history (10 copies, deduplicate identical consecutive content), safe capture before conflict adoption, explicit user recovery and serialized retry. Capture the newest live data on failure, not only the request snapshot. Never retry a conflicted write automatically over the winning server data. If local persistence fails retain an in-memory recovery copy and expose export without claiming it is durable.
- [ ] Add the read-only server backup API and deliberate guarded recovery for an unreadable primary file. Recovery must use the same write queue and keep backups; never bypass revision checks or expose arbitrary filesystem paths.
- [ ] Add an accessible Recovery dialog with loading/failure/empty states, browser and server copy selection, timestamp/origin/counts and readable project/task preview, export and a clear full-board replacement confirmation. Protect and retain the current board before restore; do not close as successful on failed/conflicted restore. Add toolbar access and notice actions for review/retry/export.
- [ ] Add German/English copy and explain conflict recovery, retries, browser durability limits and backup restoration in README and usage docs. Run focused tests, the full suite and production build; review staged diff and create a coherent commit.

Test example for the observable conflict contract (adapt fixture/helper names to the implemented API):
```ts
// Network PUT returns a newer remote board after a local title edit.
assert.equal(result.current.data.tasks[0].title, 'Remote title')
assert.equal(result.current.recoverySnapshots[0].data.tasks[0].title, 'Local title')
// Remount hook; the copy must still be available and must not replace remote data.
```

### Task 2: Review earlier plans and prepare tomorrow

**Files:** modify src/lib/today.ts, TodayView.tsx, TodayTaskRow.tsx, App.tsx only where needed, index.css, both dictionaries, logic.test.ts/app.test.tsx (or a dedicated planning.test.tsx), README.md and docs/usage.md. Create src/components/DayPlanning.tsx for the planning review surface if needed.

**Interfaces:** introduce pure planning helpers deriving earlier unfinished plans, the next local day and a selected day's plan from existing Task.plannedFor. Use the existing onUpdate(id, Partial<Task>) path so all planning edits retain field-level Undo. No new persisted task fields.

- [ ] Write failing pure tests for earlier plans excluding completed tasks, including blocked tasks, and next-day calculation across month/year boundaries. Write UI tests for selecting earlier plans, plan today, choose another valid date, remove planning, and explicit tomorrow planning without altering due/status/priority.
- [ ] Run the focused tests and capture the expected failures.
- [ ] Add an accessible compact Today/Earlier plans/Tomorrow mode switch or equivalent review surface. Earlier view lists unfinished plannedFor < actual today; Tomorrow lists the explicit tomorrow plan and a chooser for other unfinished tasks. Keep each task unique in its active view. A completed/blocked task must never accidentally be started or completed by a planning action.
- [ ] Provide plan today, date input plus apply action, and remove-from-plan actions; tomorrow chooser plans for tomorrow. Reuse dictionary date formatters and local calendar helpers, validate ISO dates. Search/project/DEFCON filtering applies, with empty-state and filter-reset feedback. Midnight updates the viewed relative day. Preserve selected/focused keyboard behavior and Undo.
- [ ] Update both dictionaries and user documentation, run focused and full tests and production build, inspect staged diff and commit.

Observable contract:
```ts
const original = { plannedFor: '2026-10-14', due: '2026-10-20', status: 'blocked', defcon: 2 }
// Choosing 2026-10-16 produces only { plannedFor: '2026-10-16' } via onUpdate.
// Done tasks are absent from the earlier-plan review; no midnight rollover edits data.
```

### Task 3: Emphasize the next action in Today

**Files:** TodayTaskRow.tsx, TodayView.tsx, DayPlanning.tsx if created, index.css, both dictionaries, UI tests, README.md and docs/usage.md.

**Interfaces:** preserve all existing onUpdate/onOpen/onFocus callbacks and the day-planning actions. Presentational hierarchy changes only; no domain data changes.

- [ ] Write behavior tests proving primary actions work for pending/focused/doing/blocked/done tasks, secondary actions are accessible after explicitly expanding them, and planning review retains its planning action. Preserve checkbox, priority, keyboard shortcut and undo tests by updating only intentional interaction paths.
- [ ] Run focused tests and capture expected failures for the new hierarchy.
- [ ] Give each normal Today row one emphasized action: pending -> focus; focused pending -> start; doing -> complete; blocked -> resume; done -> reopen. Keep other actions behind a labelled button with aria-expanded/aria-controls and a hidden container, keyboard reachable without hover. Keep a visible compact checklist tally; focused tasks show checklists directly. Keep row-specific state coherent when regrouping and after completion.
- [ ] Give the focused task more spacing and typographic hierarchy, quiet secondary controls, preserve readable wrapping text and official colour values; keep narrow layout free from horizontal page overflow. Planning views emphasize planning rather than execution.
- [ ] Update translations and documentation. Run full tests and both builds; use synthetic data to inspect desktop and narrow layouts, review diff and commit.

## Delivery

- [ ] Independent spec and code-quality review after each task; fix significant findings with focused regression checks.
- [ ] Final whole-branch review and final validation; verify target main, inspect full diff and commit messages, check existing PR before publishing one PR, attach its URL, do not merge.
