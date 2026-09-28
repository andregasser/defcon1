# Repository media

The README opens with an original mission-control hero illustration, followed
by focused screenshots of the real app, captured on 28 September
2026 from `22d3cb9` (the Today workspace in PR #9). Each image shows one feature;
`board.png` supplies the overall swimlane context. The old full-window screenshots
and animated walkthrough have been replaced by this tour and the interactive demo.

All captures use the English interface, the built-in example projects and sound
off. Only the example board is edited. No private board data is included, and no
interface elements, text or colours are redrawn. Screenshots are cropped from
full-resolution browser captures and stored as lossless PNGs.

## Images

| File | Dimensions | Subject |
| --- | --- | --- |
| `hero.png` | 1600 × 800 | Mission-control illustration with parallel lanes and DEFCON priorities |
| `hero.svg` | 1600 × 800 | Editable vector source for the hero illustration |
| `board.png` | 1280 × 364 | Three project lanes and all five status columns |
| `project-overview.png` | 632 × 250 | Project descriptions, deadlines, progress and counters |
| `today-plan.png` | 1156 × 244 | Today counters and one of three planned tasks completed |
| `task-focus.png` | 1156 × 346 | The runbook in focus with its three-step checklist |
| `today-attention.png` | 1156 × 266 | Planned work beside other tasks needing attention |
| `waiting.png` | 1156 × 251 | A blocker reason, urgency and a due follow-up |
| `priorities.png` | 432 × 272 | DEFCON badges, a due date and aging chips |
| `quick-add.png` | 424 × 159 | A task title with priority and date tokens |
| `compact.png` | 1280 × 404 | Compact density, collapsed overview and Slim Done |
| `mobile.png` | 390 × 558 | Mobile search, filters and Today planning |
| `social-preview.png` | 1280 × 640 | Project positioning and the current board capture |

## Recreate the screenshots

1. Run `npm exec vite -- --mode demo --host 127.0.0.1 --port 5186` and open
   `http://127.0.0.1:5186/defcon1/`. Use a fresh browser profile or a dedicated
   demo origin so resetting examples cannot replace work you want to keep.
2. Select English, turn sound off, and use the built-in demo board. The desktop
   captures use a 1280 × 1000 viewport, Comfort density, deadline lane sorting,
   DEFCON task sorting, no search, no filters and no project focus.
3. Capture the board without the overview, then expand the overview for its
   three tiles. Crop the In Progress and Blocked columns for the priority image.
4. Collapse the overview and select Compact plus Slim Done for `compact.png`.
   Restore Comfort and the full Done column afterwards.
5. Open quick-add in Reporting Q4's Backlog cell. Type `Review !2 @tomorrow`,
   capture the input and its hints, then press Escape without adding the task.
6. Edit **Firewall clearance for the network**. Set the blocker reason to
   `Waiting for network security to approve the firewall rules.` and set its
   follow-up date to the capture day. Save, then open Today.
7. Plan **Write the runbook**, **Finalise the dashboard layout** and
   **Align the key metrics** for today. Complete the dashboard task, then focus
   the runbook. Leave **Refactor the Terraform modules** unplanned. The plan now
   shows one of three complete, while the completed-today counter shows three
   (including the two tasks already completed in the demo).
8. Capture the Today header and plan, the focus panel, the planned/attention
   pair, and the waiting section separately. Keep the full relevant panel and
   its heading in every crop; do not include unrelated partial rows.
9. For mobile, use a 390 × 844 viewport and capture the toolbar through the
   daily plan. Restore the viewport afterwards.

Demo dates are relative to the capture day, so newly captured dates should move
forward together. Keep the real UI, official DEFCON colours and natural text
wrapping. Verify the final files visually (not only the browser preview), check
all README image links, and keep each image below 1 MB. The root README provides
alt text and a short explanation for every screenshot.

## Hero illustration

`hero.svg` is the self-contained source for `hero.png`. It uses original vector
shapes, system typography, a dark grid and the five official DEFCON colours.
The tilted board and floating priority card are a brand illustration, not an
app screenshot. The real board remains visible in the README's feature tour.

Edit the SVG to change the composition or copy, then export it to a 1600 × 800
PNG with an SVG renderer. The current PNG was rendered with Sharp, using Arial
on macOS. Sharp is an authoring tool only, not a project dependency. Keep the
PNG below 1 MB and inspect it at full size and at 800 pixels wide before
replacing it. The README embeds the PNG for consistent typography across viewers;
the SVG includes its own accessible title and description.

## Social preview and licensing

`social-preview.png` retains the project title, positioning, five DEFCON swatches
and demo URL, with a scaled copy of the current `board.png`. Upload it under
GitHub **Settings → General → Social preview**; committing the file alone does
not change that repository setting. Update the URL when publishing for a fork.

These assets use the project's interface, original layout and captions, and
system fonts. They contain no third-party photography or private data and are
covered by the repository's MIT license.
