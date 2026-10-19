# Recovery, day transition and focused Today actions

Approved in chat on 2026-10-15: implement recovery from storage problems, then a deliberate day transition, then simplify the Today action hierarchy (recommendation 5). The existing local-first, auth-free architecture stays intact.

## Recovery

Preserve a recoverable browser snapshot before adopting remote data after a conflict, including edits made while the save was in flight. Preserve unsaved server work across reloads, in a separate recovery store, never silently import that store. Keep a bounded history, detect storage failure and offer immediate export if browser persistence fails. Successful retry must not claim unrelated conflicts were resolved. Failed writes retry automatically with bounded frequency and through a visible retry control. Concurrent requests must be serialized and guarded against outdated async results.

Expose a Recovery dialog from the toolbar and conflict/failure notices. List browser snapshots and the server's existing automatic backups. Selecting a copy shows its timestamp, origin, project/task counts and readable content before restoring the complete board. Clearly explain replacement, preserve the current board, require confirmation and retain optimistic concurrency during restoration. Snapshot export remains possible. Server backups are exposed read-only through validated identifiers; arbitrary paths, malformed files and symlinks must not be accepted. An unreadable primary file must not be silently overwritten as an empty board: preserve it and allow deliberate recovery. No new dependencies.

## Day transition

In Today, add a compact view to review unfinished earlier plans and prepare tomorrow. Each task appears once within the active view; changing planning dates never changes due dates, status or priority. Earlier unfinished tasks, including blocked tasks, offer plan today, choose a date, or remove from plan. Choosing tomorrow exposes the explicit plan for tomorrow and a way to add tasks; past work does not roll over automatically. Keep urgency and blockers visible in the normal Today workspace. Existing project/search/DEFCON filters, field-level undo and midnight refresh continue to work. No new persisted task fields are necessary.

## Action hierarchy

Today task rows show one emphasized action determined by context: resume blocked work, complete work in progress, start the focused pending task, or focus an ordinary pending task; completed tasks offer reopen. Secondary actions live in an accessible explicitly toggled area, never hover-only. Checklist progress remains visible and the focused task exposes its checklist with more breathing room. Retain all existing capabilities, official DEFCON colours, full wrapping text, mobile usability and keyboard shortcuts. Plan review rows emphasize their planning action.

## Validation and delivery

Use regression tests for storage races and retry/recovery, real server integration tests with temporary data, pure planning tests and UI interaction tests in German and English where copy differs. Run npm test, npm run build, npm run build:demo and git diff --check. Inspect desktop and narrow layouts with synthetic data. Update README and usage documentation. Use coherent Conventional Commits with substantive English bodies describing changes and actual validation. Open one PR against main, do not merge.
