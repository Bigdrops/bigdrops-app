# BOQ V4.1 Black-Pipe Perimeter Refinement Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Refine the group perimeter in the existing BOQ V4.1 view
candidates, using claude-PIPE.html as the pipe-effect reference
only. No V5. No architecture restart.

## Scope

Two existing files updated in place. One new report (this file).
No production, database, standards, PRD, form, V2, V3, V4, V13,
Invoice, or reference-file changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (modified)
- `docs/reports/boq/boq-view-v4.1-black-pipe-2026-09-29.md` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.

## Reference finding

claude-PIPE.html contains no black-pipe implementation. It is
V12 plus an environmental-artwork layer whose only perimeter
technique is a full-height measured SVG overlay (`rails()`
sizing to pixel dimensions, debounced re-measure,
`fonts.ready` re-measure). The black-pipe visual itself was
therefore constructed per the task description, reusing the
reference's honest contribution: the measured-perimeter
strategy. Nothing else was taken from the file; its page,
typography, navigation, and commercial presentation were not
touched or transplanted.

## Change 1: constructed black pipe

Each group section carries an absolutely positioned SVG overlay
sized 1:1 to the group box. Four pixel-exact rects share one
near-square (rx 5) path: a 6px dark tube (`--pipe`, near-black
in both themes), a 2px recessed lighter channel centered in
the tube, and one layered light (6px brand halo at reduced
opacity plus a 2.5px white core with brand drop-shadow glow).
The tube is drawn geometry, not a CSS border: transparent
interior, no tint, no elevation, no card surface.

## Change 2: gutter correction

Group side inset reduced to 6px. The pipe hugs the content
boundary, so grouped rows keep essentially the same usable
width as standalone rows on phone and desktop.

## Change 3: constant-speed travel

Dash length and animation duration derive from the measured
path length (`getTotalLength`, ~140px/sec, dash clamped
48–84px), so perceived speed stays constant on groups of any
height. Re-measured after render, on debounced window resize,
and after fonts settle. Corners are part of the single
rect path, so travel stays smooth through them.
`prefers-reduced-motion` hides halo and core and keeps the
complete static tube plus channel.

## Preserved

Group header, all member rows with commercial information,
group total inside the enclosure, standalone rows outside,
continuous numbering, compact thumbnails with lightbox,
summary and close-out, all Download paths, Edit, Share, More
actions, FAB and bottom-nav behavior, desktop composition,
dark mode, and the locked sample math (no data rows changed).

## Verification

- `git status` before and after: captured. All other tree
  changes belong to other agents and are untouched.
- `git diff --check`: passed (whitespace clean).
- Zero `trace`/old-dash remnants in either file: confirmed.
- Tube, channel, halo, core, measured layout, and
  resize/fonts hooks present in both files: confirmed.
- claude-PIPE.html unchanged; V13, Invoice, production,
  standards, migrations untouched.
- Sample calculations unchanged (no data edits this task).
- Build, typecheck, lint: not run (banned/excluded).

## Supabase push status

Not applicable. No SQL changed.

## Human screenshot review still required

Tube weight, channel legibility, light speed and glow
restraint, corner behavior, mid-scroll membership clarity,
narrow-screen width parity, dark-mode contrast. No visual
approval is claimed.
