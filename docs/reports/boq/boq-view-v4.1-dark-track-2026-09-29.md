# BOQ V4.1 Dark-Track Perimeter Refinement Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Correct the group-perimeter geometry and visual language in the
existing BOQ V4.1 candidates, per human visual review. No V5.
No architecture restart.

## Scope

Two existing files updated in place. One new report (this file).
No production, database, standards, PRD, form, V2, V3, V4, or
Invoice changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (modified)
- `docs/reports/boq/boq-view-v4.1-dark-track-2026-09-29.md` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.

## Documentation standard

ASD-STE100 Simplified Technical English.

## Change 1: perimeter geometry

The 14–18px side inset is reduced to 8px, so grouped rows keep
essentially the same usable width and alignment as standalone
rows. The perimeter still fully encloses the group header, all
member rows, and the group total, and standalone rows remain
outside. No card gutters, panels, tints, shadows, or raised
surfaces introduced.

## Change 2: dark track plus travelling light

The 1px neutral outline is replaced with a 2px ink-tone track
with 4px near-square corners, transparent interior, and no
shadow — legible with the animation mentally stopped. The
tracer is now a single short luminous segment (slightly wider
stroke plus a restrained glow) riding the exact track geometry,
so it reads as light travelling through the boundary rather
than disconnected dashes. One tracer, 14s loop, no layout
movement. `prefers-reduced-motion` hides the light and keeps
the complete static perimeter.

## Preserved

Group header identity, counts, continuous numbering, exposed
Cost/Sell/Profit/Margin rows, compact thumbnails with lightbox,
top Download beside Edit (mobile dossier, desktop top bar),
FAB, More and close-out Download paths, bottom-nav simulation
with clearance, desktop FAB-free full-width direction, sample
math (cost ₦7,316,090, selling ₦8,597,500, profit ₦1,281,410,
margin 14.9%).

## Verification

- `git status` before and after: captured. All other tree
  changes belong to other agents and are untouched.
- `git diff --check`: passed (whitespace clean).
- Dark 2px track, 8px inset, transparent unshadowed perimeter:
  verified in both files.
- Single riding tracer with infinite loop and reduced-motion
  off-switch: verified in both files.
- Group total inside, standalone rows outside, 5-row demo
  group: verified.
- Commercial, thumbnails, downloads, nav, desktop FAB-free:
  verified present/absent as required.
- V2, V3, V4, forms, Invoice, production source, standards,
  migrations: untouched by this task.
- Build: not run (banned). Typecheck/lint: not run.

## Supabase push status

Not applicable. No SQL changed.

## Human screenshot review still required

Track weight and corner softness, light speed and glow
restraint, grouped-vs-standalone width parity at device
widths, dark-mode track contrast, dossier two-button fit at
360px. No visual approval is claimed.
