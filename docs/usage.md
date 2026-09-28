# Using DEFCON 1

[Back to the README](../README.md#features) · [Try the browser demo](https://andregasser.github.io/defcon1/)

The README gives a visual feature tour. This guide covers the detailed behavior,
keyboard shortcuts, and planning rules.

## Ten projects, one screen

The **command deck** puts one tile per project above the board: deadline
countdown, progress bar, and counters for open / doing / blocked / hot /
overdue / stalled. Click a tile to focus that project, click several to focus
several, double-click to edit it.

Below it, the board keeps ten lanes readable: sticky column headers, a sticky
lane rail, capped cell height so one overloaded project cannot push the others
off screen, and collapsible lanes that leave a summary line behind.

## Idle time, because DEFCON only tells you half the story

Every card remembers when it entered its current column. Sit still too long — **3
days** in In Progress, **2** in Blocked — and it picks up a violet `◴ 6 d`, while
the lane, the tile, and the header start counting the ones that stopped moving.

DEFCON says what is important; idle time says what got forgotten. Reordering
inside a column or moving a card to another project does **not** restart the
clock — only a real column change does.

## A checklist inside a task

Add as many steps as you like in the task dialog: tick them off, rename them,
delete them. The card shows only the tally — `☐ 1/3`, turning green at `☑ 3/3`.

A step is deliberately *not* a task: no status, no DEFCON, no place on the board.
Otherwise the lanes would be unreadable within a week.

## Today (<kbd>t</kbd>)

Today is a daily workspace with a compact project selector, clickable counters
for due / overdue / completed tasks, and a deliberate daily plan. **Choose tasks**
opens calm, unplanned work; tasks already needing attention can be planned directly
from their rows. **Plan for today** never changes a due date. Unfinished plans
from previous days keep their date and can be selected again rather than silently
rolling over. The progress bar counts completed tasks from the explicit daily
plan, not every urgent task that arrives during the day.

* **Work on today** — open tasks explicitly planned for this local calendar day.
* **Needs attention** — other tasks due today or overdue, at DEFCON 1–2, in progress,
  or ready for follow-up.
* **Waiting for …** — all blocked tasks, with a reason and optional follow-up date.
  Even urgent blocked tasks remain here, visibly flagged; the due/overdue counter
  filters include them. Planning a blocked task still counts it in plan progress.
* **Completed today** — initially collapsed, based on the local day of completion.

Each task appears once. Choose **Focus on this task** to highlight one actionable
task and expose its checklist. Completion offers a possible next task without
starting it automatically. Focus is saved per device; plan dates, blocker reasons
and follow-up dates live with the task and travel with JSON backups.

Rows offer direct start/resume, completion, planning, priority, details and
checklist actions. Tab reaches every control; arrow keys move between task rows,
Enter opens the focused row, and the usual status/DEFCON keys still work.
Completing a row moves keyboard focus to the next available row. **Undo** or
<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> reverses the last Today task edit in this
session. It preserves unrelated edits and refuses to overwrite changed fields.
It is not a general history for deletion, imports or board drag-and-drop, and it
does not replace a text field's native undo.

Search (including project names, blocker reasons and checklist text) and DEFCON
filters apply to Today. Header counts and plan progress remain scoped to the
selected projects, independent of those list filters. Dates refresh at local
midnight and when returning to the tab. Both desktop and mobile layouts preserve
full task text and honor reduced-motion preferences.

Existing boards load with empty planning and follow-up fields; no manual migration
is needed. After updating, reload all open clients before editing: older versions
do not preserve these new fields when saving a board.

## A density switch that actually earns its keep

Press <kbd>d</kbd> for compact mode, and narrow the Done column to just its
count — the working columns get the width instead.

## Priorities as DEFCON levels

Because "high / medium / low" never survives contact with ten projects.

| Level | Colour | Code word | Meaning |
| :---: | --- | --- | --- |
| **1** | 🟥 red | `COCKED PISTOL` | now |
| **2** | 🟧 orange | `FAST PACE` | critical |
| **3** | 🟨 yellow | `ROUND HOUSE` | important |
| **4** | 🟩 green | `DOUBLE TAKE` | normal |
| **5** | 🟦 blue | `FADE OUT` | someday |

These are the official signal colours of the scale, used verbatim rather than
toned down to fit the UI — that contrast *is* the feature.

Every card carries a coloured stripe on its left edge. Levels 1 and 2 count as
**hot** and light up both the lane header and the command deck.

Urgency needs no housekeeping: with task sorting on `DEFCON`, a task that gets
promoted rises to the top of its cell by itself. Switch to `MANUAL` if you would
rather order cards by hand. A fresh DEFCON 1 may also make a noise — one click on
the `ALARM` chip silences it for good on that device.

## Keyboard-first

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | focus and select a card |
| <kbd>Enter</kbd> | open the focused card |
| <kbd>Space</kbd>, arrow keys, <kbd>Space</kbd> | pick up, move and drop a card; <kbd>Escape</kbd> cancels |
| <kbd>1</kbd>–<kbd>5</kbd> | move the selected task to Backlog / Todo / In Progress / Blocked / Done |
| <kbd>Shift</kbd> + <kbd>1</kbd>–<kbd>5</kbd> | set its DEFCON level |
| <kbd>t</kbd> | toggle the Today list across all projects |
| <kbd>n</kbd> | new task in the first visible project |
| <kbd>p</kbd> | new project |
| <kbd>e</kbd> | open the selected task |
| <kbd>x</kbd> | toggle the selected task Done ⇄ Todo |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | delete the selected task (with a confirmation) |
| <kbd>/</kbd> | jump to search |
| <kbd>c</kbd> | collapse / expand all lanes |
| <kbd>d</kbd> | toggle density |
| <kbd>?</kbd> | help |
| <kbd>Escape</kbd> | backs out of quick-add → selection → search → filter → focus → Today, in that order |

With the mouse: drag cards between columns, between projects, or to reorder
within a column. Click selects and double-click opens. Empty cells always show
`+ Add task`, so a new project has a visible starting point. On touch devices,
add buttons stay visible in populated cells too.

Tabbing to a card selects it, so task shortcuts act on the focused card.
Shift + number works with symbol-producing keyboard layouts and the numeric
keypad. Dialogs focus the first input, keep keyboard focus inside while open,
and return it to the opening control when that control is still present.

## Small screens

At widths up to 600 px, the project overview starts collapsed independently of
your saved desktop setting. Search and Today stay directly accessible; open
**View & filters** for DEFCON filters, density, sorting, language and other view
options. Active DEFCON filters are counted on that button. Both disclosures
can be opened without changing the desktop overview preference. Scroll the
board sideways to reach the remaining columns; the project rail stays visible.

## Quick-add syntax

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
