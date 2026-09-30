# BOQ View Page Candidates V4.1 Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Refine the accepted V4 design direction into V4.1. Fix the two
structural problems from human review: the card-feed schedule and
the hidden commercial information. Preserve all accepted V4 elements.

## Scope

Two new standalone HTML files plus this report. No production code
changed. No database change. V2, V3, V4, and BOQ form candidates
stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (new)
- `docs/reports/boq/boq-view-candidate-v4.1-2026-09-29.md` (new, this file)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Standards audited

- `AGENTS.md` — Bun only, no build as verification, concurrent-agent
  safety, financial source of truth, report rules.
- `docs/standard/fab-standard.md` v1.1 (re-read; unchanged since V4)
  — 50x50 rounded-18 container, custom AB Download Manager SVG icon,
  ambient float on a wrapper (4s, reduced-motion off), clearance
  above bottom nav, mobile bottom calc(88px + safe-area), z-50, one
  primary FAB per view.
- `docs/standard/document-transformation-standard.md` — Convert to
  Quotation remains a sheet action.

## Source inspected

- V4 mobile and desktop candidates (refinement base; not modified).
- V4 report `docs/reports/boq/boq-view-candidate-v4-2026-09-29.md`.
- `src/domain/boq/calculateBoqTotals.ts` (locked model, unchanged).
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
  (AB icon path reused verbatim in mobile V4.1).
- `src/components/layout/MobileBottomNav.tsx` (nav geometry).

## Change 1: continuous document

V4 wrapped each item in a rounded, shadowed specimen card inside grey
gutters. V4.1 removes every per-item card: no radius, no shadow, no
islands, no detached gaps. Chapters, entries, and close-out flow on
one full-bleed document surface. Entries stay distinguishable
through whitespace, thin hairline rules, marginal index numbers, and
type hierarchy only. The schedule uses the full viewport width with
a 20px readability inset. Verified: no entry-level box-shadow,
radius, or card class exists in either V4.1 file.

## Change 2: exposed commercial

The per-item "Cost & margin" toggle is deleted. The collapsible
summary capsule is replaced by a permanently visible static summary.
Every item carries a compact commercial composition with zero
interaction: COST row (qty × CP = line cost, cost tone), SELL row
(qty × SP = line sell, sell tone), PROFIT row (margin note + toned
amount). The summary shows Total Cost, Selling Total, Gross Profit,
and Margin directly. The close-out repeats the formal totals. No
commercial value requires a tap. The composition uses small labelled
rows with hairline separation — no column headers, no grid cells,
no table chrome.

## Preserved from V4

Typography and tone; compact app bar; number/status treatment;
dossier identity with AK monogram fallback; editorial chapters;
description-first hierarchy; reference photo with read-only
lightbox; Download FAB; simulated bottom nav; More sheet and action
hierarchy; dark mode; locked math; fold recomposition concept.

## Photo behavior

Item 1 carries the simulated site photo as an inset figure in the
entry flow with caption and tap-to-preview lightbox. Items 2–5 emit
zero photo markup and reserve zero space. The photo never forces an
item into a card.

## Fold composition

At 600px+ the entry splits into text and commercial columns: the
commercial block docks right of the text behind a hairline rule,
and the photo docks beside the text at 200px. No cards return at
fold width. Document surface stays full-bleed.

## Desktop composition

Fluid shell: 1720px cap with clamp(20px, 3vw, 48px) margins, so the
workspace expands across 1366px, 1440px, 1920px widths instead of
centering a 1240px column. Schedule takes the dominant share; a
360–380px rail takes the rest. Entries use purpose-built columns
(index, text capped near 62–68ch, photo region only when present,
250px right-aligned commercial column) so width is consumed through
composition, not stretched lines. Same continuous surface and
exposed commercial as mobile. No per-item cards, no paper-sheet
metaphor, no enlarged-phone layout. No FAB or bottom nav (unchanged).

## Locked-math verification

Same sample model as V4, verified with bun: cost ₦6,158,090,
selling ₦7,237,000, profit ₦1,078,910, margin 14.91% (shown
14.9%). All figures render from the locked formulas in script from
a single item array. Chapter subtotals: A ₦5,377,000 (3 items),
B ₦1,860,000 (2 items). Amount in words covers ₦7,237,000.

## Verification

- `git status` before work: captured. All pre-existing
  modifications, deletions, and untracked files recorded as
  belonging to other agents. Untouched.
- `git status` after work: only the two V4.1 HTML files plus this
  report are new. No other additions.
- `git diff --check`: passed (whitespace clean).
- V4 mobile and desktop: no diff. Untouched.
- V2 and V3 files: no diff. Untouched.
- Production source (`src/`, `supabase/`): no diff from this task.
  Untouched.
- BOQ form candidates: the `boq-form-candidate-v12.html`
  modification predates this task (present in before-status).
  Untouched.
- No per-item commercial disclosure controls in V4.1: confirmed by
  search (cost-toggle, costbtn, capsule controls appear only in V4
  files).
- Overall commercial visible without interaction: confirmed
  (static summary panel + close-out, no collapsed state).
- Item commercial visible without interaction: confirmed (comm
  blocks render inline for all 5 items).
- Mobile bottom nav simulated with true geometry: confirmed.
- Download FAB follows fab-standard v1.1: confirmed (container,
  icon path, placement, float wrapper, reduced-motion rule).
- End clearance above FAB + nav + safe area: confirmed.
- One photo-present item, zero footprint otherwise: confirmed.
- `bun run build`, typecheck, lint, browser checks, screenshots,
  Supabase commands: not run. Excluded by the task. Human visual
  review is authoritative.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- No browser render was run. A human must judge pixels: document
  surface rhythm, hairline density, commercial row scannability,
  photo inset tone, fold column balance, desktop width usage at
  1366/1440/1920px, dark-mode surfaces, FAB clearance.
- The desktop rail keeps a commercial position card beside the
  in-flow summary. Values match by construction, but the human
  should confirm the repetition reads as context, not clutter.
- The per-item commercial rows add vertical length to every entry.
  The human should confirm entries still scan quickly on small
  phones.
- Margin shows 14.9% (one decimal from 14.91%). Display precision
  rule still awaits a project decision.
- Action toasts name real actions without persistence. Export CSV
  builds a real client-side extract. Sample data is fictional.

## Deferred work

- Human visual acceptance of V4.1 against V4 side by side.
- Production React implementation after design acceptance.
- Real item photography replacing the simulated photo.
- Margin precision and CP-visibility-by-role decisions.
- Whether Approved locks Edit and Convert.
