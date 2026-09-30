# BOQ V4.1 Group-Perimeter and Download Refinement Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Refine the existing BOQ V4.1 candidates in place per human visual
review: complete group perimeters with a live tracer, and a top
text-labelled Download action. No V5. No architecture restart.

## Scope

Two existing files updated in place. One new report (this file).
No production code, database, standards, PRD, form, V2, V3, V4,
or Invoice changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (modified)
- `docs/reports/boq/boq-view-v4.1-group-perimeter-2026-09-29.md` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.
`frontend-design` is not registered and was not loaded.

## Documentation standard

ASD-STE100 Simplified Technical English.

## Change 1: complete group perimeter

Each group now renders as one `<section class="grp">` enclosing
the header, every member row, and the group total. The boundary
is a single 1px neutral rule with an 8px radius, transparent
background, and no shadow or elevation. It reads as hierarchy
drawn on the continuous page, not a card. Standalone rows stay
outside. Numbering stays continuous (01–08).

## Change 2: live perimeter tracer

One SVG rect overlays each perimeter with a short accent dash
(`pathLength` normalized, 14s linear infinite loop,
top-side-bottom-side travel). One tracer only, 2px weight,
non-scaling stroke, no title animation, no glow or particles.
Under `prefers-reduced-motion` the tracer hides and the static
perimeter remains. Group A carries 5 rows so membership stays
legible mid-scroll.

## Change 3: longer demo group

Group A gains three civil-works rows (sand filling, damp-proof
membrane, formwork). Same locked formulas; recomputed sample
totals: cost ₦7,316,090, selling ₦8,597,500, profit ₦1,281,410,
margin 14.9%, Group A selling ₦5,742,500. Amount in words
updated to match. Verified with bun.

## Change 4: top Download action

Mobile dossier head now carries a text-labelled Download button
beside Edit in a shared action cluster. Desktop keeps its
existing top-bar Download beside Edit. No desktop FAB created.
FAB, More-menu, and close-out Download paths all remain.

## Preserved

Flowing page, exposed Cost/Sell/Profit/Margin rows, compact
thumbnails with lightbox, description-first hierarchy, reading
rhythm, standalone treatment, typography, commercial tones,
bottom-nav simulation with clearance, FAB behavior, More-sheet
behavior, desktop full-width direction. No grid backgrounds,
chip rails, sticky strips, collapsibles, or card architectures.

## Verification

- `git status` before and after: captured. All pre-existing
  staged, modified, deleted, and untracked entries belong to
  other agents and are untouched.
- `git diff --check`: passed (whitespace clean).
- Perimeter encloses header, all members, and total by
  construction (single section emit, verified in source).
- Tracer loops infinitely; reduced-motion hides it: verified
  in source.
- No tint, shadow, or large radius on `.grp`: verified
  (transparent background, `box-shadow:none`, 8px radius).
- Group A demonstrates 5 rows: verified.
- Commercial rows exposed, thumbnails compact: untouched paths,
  verified present.
- Labeled Download beside Edit on mobile dossier and desktop
  top bar: verified. FAB, More, and close-out paths intact.
- Bottom nav simulated on mobile; no FAB on desktop: verified.
- V2, V3, V4, forms, Invoice candidates, production source,
  standards, migrations: untouched by this task.
- Build: not run (banned). Typecheck/lint: not run.

## Supabase push status

Not applicable. No SQL changed.

## Human visual review still required

Perimeter weight and radius, tracer speed and subtlety,
mid-scroll group legibility, dossier two-button fit at 360px,
dark-mode perimeter contrast, and end clearance. No visual
approval is claimed.
