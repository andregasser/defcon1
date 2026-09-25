# Today Workspace Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent data work and review. Steps use checkboxes to track completion.

**Goal:** Turn Today into an actionable daily workspace with deliberate planning, focus, follow-ups, accessible inline actions, and visible completion.

**Architecture:** Keep App responsible for board changes and selection. Pure grouping and safe undo helpers live in lib/today.ts. TodayView and a dedicated task row render the daily workspace; all new strings live in both dictionaries. No new dependencies or server endpoints.

**Tech Stack:** React, TypeScript, existing CSS variables, Vitest, local JSON persistence.

**Spec:** User-approved design in this conversation, 25 September 2026: daily header and filters, compact project selector, explicit focus task, readable actionable rows, planned/attention/waiting/completed groups, checklists, keyboard actions, undo, reduced-motion-aware feedback. Execute both stages.

## Global Constraints

- Preserve official DEFCON colors, all full task/project text, and existing board behavior.
- Interface must remain German and English; no new dependency.
- Plan dates differ from due dates. Task fields: plannedFor: string|null, reviewOn: string|null, blockedReason: string. Normalize older and malformed data.
- Focus is a per-device preference, focusTaskId: string|null; never auto-start the next task.
- Blocked tasks appear once under waiting, including critical tasks; urgent flags and clickable summary filters must still expose them.
- Undo reverses the last Today inline action only if its changed fields have not been modified since; preserve other tasks and unrelated concurrent edits. Status undo goes through normal cell reordering.
- Today updates after local midnight and returning to the tab. Completion uses local calendar day, not UTC date slicing.
- npm test, npm run build, npm run build:demo, git diff --check must pass before publication. Open a PR, never merge.

### Task 1: Daily data and pure behavior

Files: src/types.ts, src/constants.ts, src/lib/storage.ts, src/lib/board.ts, src/lib/today.ts, src/__tests__/logic.test.ts and typed fixtures as needed.

Interfaces: buildTodayWorkspace(tasks: Task[], day: string) returns { planned: Task[], attention: Task[], waiting: Task[], completed: Task[], available: Task[], planTotal: number, planDone: number }. completed includes only tasks completed on day; planDone counts planned tasks whose status is done. Tasks have exactly one bucket. available includes unplanned calm tasks for the planner. Attention includes overdue/due today, DEFCON1–2, running tasks and due follow-ups. Waiting owns blocked tasks. Explicit plan wins for other open tasks. Sorting deterministic by DEFCON, due date, manual order, id.

- [x] Add tests for older-file defaults, invalid calendar dates, export/import preservation, local-day completion, no duplicates, overdue blocked tasks, plan progress and next-day reset.
- [x] Run targeted tests and confirm red; implement grouping and normalization; verify tests green.
- [x] Review the data contract before UI integration.

### Task 2: Accessible daily workspace

Files: src/components/TodayView.tsx, new src/components/TodayTaskRow.tsx, src/App.tsx, src/components/TaskDialog.tsx, src/hooks/useTodayDate.ts, src/i18n/de.tsx, src/i18n/en.tsx, src/index.css, src/__tests__/app.test.tsx.

- [x] Add integration tests for keyboard row focus, inline completion and next selection, undo, planning without changing due date, explicit focus, checklists, project filters, and blocked follow-up editing.
- [x] Implement daily header with summary buttons, compact project selection, progress tied to explicit plan, a highlighted focus card and an available-task picker. Completed group starts collapsed.
- [x] Implement row controls for plan, focus, start, complete, priority and details; show checklist controls on expansion/focus and blocked reason/follow-up in details. Undo completion/plan/start/checklist/priority safely.
- [x] Preserve urgent visibility under waiting and explain empty search/filter results. Keep summary counts scoped to projects and date, independent of list filters.
- [x] Implement local-day refresh and persistence; make all controls keyboard/touch accessible and preserve focus after regrouping.
- [x] Style within existing theme, ensure 320px mobile layout and full text, support reduced motion.

### Task 3: Verification and delivery

Files: README.md, final scoped implementation fixes.

- [x] Document Today planning, follow-ups, focus, progress, filters and undo limitations.
- [x] Run full test suite, production and demo builds. Review full diff and independent review findings.
- [x] Inspect real browser desktop/mobile with disposable fixture data, including long titles, empty/done-only states, daily actions and keyboard focus. Save screenshots.
- [ ] Commit with a substantive English Conventional Commit body, push feature branch, check for existing PR, create and attach PR against main.


## Verification record

- Baseline: 126 tests passed on main fa72c03.
- Data and support contracts independently reviewed; normalization, grouping, local-day refresh and guarded undo passed focused tests.
- UI regressions were observed failing before implementation; transient-button focus regressions were reproduced and corrected.
- Current suite: 148 tests passed; production and demo builds passed.
- Browser fixture uses an isolated temporary data directory, never the user's board. Desktop keyboard completion/undo restores focus correctly. Mobile 390/320px testing found date-row and footer overflow, corrected with responsive stacking/wrapping.
- Ruling: work on the existing clean checkout in a dedicated branch, matching the established session workflow; preserve unrelated local files.
- Ruling: keep the old pure todayList helper as a compatibility export while App uses buildTodayWorkspace; existing consumers retain their behavior.
- Ruling: undo validates inside the board recipe against its current snapshot, so even remote updates not yet rendered cannot be overwritten by a stale guard.
