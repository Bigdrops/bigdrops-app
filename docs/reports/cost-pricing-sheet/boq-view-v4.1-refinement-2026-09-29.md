# BOQ View V4.1 Surgical Refinement Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Apply the accepted human-review corrections to the BOQ V4.1
candidates in place. No new BOQ version. No architecture change.

## Scope

Two existing files updated in place. No files created in the BOQ
track besides this report. No production code changed. No database
change. V2, V3, V4, and form candidates untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (modified in place)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (modified in place)
- `docs/reports/boq/boq-view-v4.1-refinement-2026-09-29.md` (new, this file)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Standards audited

- `AGENTS.md` — Bun only, no build as verification,
  concurrent-agent safety, locked math, report rules.
- `docs/standard/fab-standard.md` v1.1 (re-read; unchanged) —
  container, AB icon, wrapper float, clearance, z-50, one FAB.
- `docs/standard/document-transformation-standard.md` — Convert
  remains a sheet action.
- `docs/standard/document-image-upload-policy.md` — upload
  validation only; read-only rendering unaffected.

## Change 1: compact photo thumbnail

The full-width 16/9 figure is removed from both files. Item 1 now
carries a 64px attachment thumbnail (72px at fold width, 64px
docked grid cell on desktop) with a short supporting caption.
Tap/click still opens the existing read-only lightbox with caption.
Items without photos emit zero photo markup and reserve zero space.
SVG art uses slice cropping so the square thumbnail never
letterboxes.

## Change 2: unmistakable group containers

Each group now renders inside ONE bounded container: an explicit
"GROUP A" kicker plus title, item count, and ghost letter in the
header; flowing entries with hairline separators inside; an
explicit "GROUP TOTAL" close with the computed subtotal. The
container is a flat tinted region with a controlled border and
restrained radius — no shadow, no floating card, no per-item cards.
Item 3 (Hardcore filling) is now ungrouped and flows directly on
the document surface, so the grammar reads instantly: inside the
boundary means grouped, outside means individual. Numbering stays
continuous 01–05. Group A now closes at ₦4,382,000 (2 items);
Group B is unchanged at ₦1,860,000. Document totals are unchanged.

## Change 3: commercial stays exposed

No disclosure control returns. Per-item Cost/Sell/Profit rows and
the static summary are untouched. Verified by search: no toggle,
accordion, or collapsed state exists in either file.

## Change 4: download hierarchy

Mobile/fold now has three paths: the standard FAB (unchanged), a
labeled "Download PDF" button in the close-out, and a "Download
PDF" row at the top of the More menu Document section. Desktop
keeps its top-bar Download button and gains the same More menu
row. No backend or renderer invented; prototype toasts unchanged.

## Preserved

Full-flowing document surface, no card feed, no spreadsheet
background, no chip rail, no sticky commercial strip, editorial
hierarchy, bottom-nav simulation with end clearance, desktop
full-width composition, dark mode, locked math, More sheet
conventions.

## Verification

- `git status` before work: captured. All pre-existing changes
  recorded as other agents' work. Untouched.
- `git diff --check`: passed (whitespace clean).
- V4, V2, V3, form candidates: no diff from this task. Untouched.
- Production source: no diff from this task. Untouched.
- No new BOQ candidate version created: confirmed (only the two
  V4.1 files modified, no v4.2/v5 file exists).
- Thumbnail exists and opens the lightbox: confirmed (thumb
  markup, data-photo trigger, lightbox handler retained).
- No-photo items reserve zero space: confirmed.
- Group containers enclose members with explicit headers and
  subtotal closes: confirmed.
- Ungrouped item flows outside containers: confirmed (item 3,
  group null).
- Commercial requires zero interaction: confirmed (no toggle or
  collapsed state in either file).
- Mobile FAB + labeled action + menu row: confirmed.
- Bottom nav simulated with clearance: confirmed (geometry and
  end padding unchanged).
- Desktop full-width, no FAB: confirmed (no FAB markup; 1720px
  fluid shell retained).
- Locked math re-verified with bun: cost ₦6,158,090, selling
  ₦7,237,000, profit ₦1,078,910. Group A selling ₦4,382,000.
- Build, typecheck, lint, browser, Supabase: not run. Excluded.
  Human visual review is authoritative.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- No browser render was run. A human must confirm the thumbnail
  scale, container restraint, ungrouped-vs-grouped legibility,
  and the close-out Download button placement.
- The sample now mixes grouped and ungrouped lines. Production
  BOQ grouping rules should confirm this is a legal document
  shape before implementation.
- Margin precision (14.9% shown) still awaits a project decision.

## Deferred work

- Human visual acceptance of the refined V4.1 pair.
- Production React implementation after acceptance.
- Real item photography replacing the simulated thumbnail.
