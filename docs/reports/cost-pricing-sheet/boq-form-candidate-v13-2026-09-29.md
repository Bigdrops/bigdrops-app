# BOQ Form Candidate V13 Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Evolve the accepted V12 form candidate into two purpose-built V13
candidates (mobile/fold and desktop) and add the new Instant
Markup workflow. V12 is the design parent. No redesign.

## Scope

Two new standalone HTML files plus this report. No production
code, schema, migration, Supabase, PDF, or build work. V12
untouched. BOQ View and Invoice candidates untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-mobile-fold.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-desktop.html` (new)
- `docs/reports/cost-pricing-sheet/boq-form-candidate-v13-2026-09-29.md` (new, this file)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.
`frontend-design` is not registered in docs/PROJECTSKILLINDEX.md
and was not loaded.

## Documentation standard

ASD-STE100 Simplified Technical English.

## Sources audited

- V12 candidate, read in full (1418 lines): tokens, topbar,
  document details, itemtools, item/group architecture, photo
  flow, totals, save surfaces, all four sheets, full script.
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-view-readiness-and-instant-markup-audit-2026-09-29.md`:
  Instant Markup has no repository precedent; locked costing
  formulas; audit-UPDATE intent; Schedule Selling Total
  terminology; Decimal-path requirement; float-math warning.
- `src/domain/boq/calculateBoqTotals.ts` (locked formulas,
  already known) and `docs/standard/`
  `document-form-consolidation-standard.md` (production React
  structure; prototype HTML unaffected).

## V12 → V13 capability matrix

Every meaningful V12 capability, both V13 files unless noted.

- Topbar (back, title, Draft badge, theme): kept both.
  Layout chip kept on mobile; desktop shows a fixed
  "Desktop workspace" marker.
- Document details (title, number+sync, date, vendor,
  reference): kept both. Desktop uses a 4-column grid.
- Toolbar Columns / Import / Clear all + confirm: kept both.
- Item rows (rail, enumeration, move, duplicate, delete ear,
  desc, sub-desc preview/editor, make, Qty/Unit, CP/SP tones,
  photo attach + thumbnail + remove, line profit, insert
  below): kept both.
- Groups (envelope, dark header, delete-keeps-items, title,
  count, body, add-item footer, empty state, always
  expanded): kept both. Desktop contains the envelope in the
  main column instead of full-bleed.
- Create pair (Add line item / Add group), empty state: kept.
- Totals (cost, selling, profit, margin, words): kept both.
  Selling line relabeled "Schedule selling total (SP × Qty)"
  per the readiness audit; semantics unchanged.
- Save validation (number required; row desc/qty/SP>0 with
  error highlight + scroll): kept both.
- Save surfaces: mobile keeps phone FAB + end-of-form CTA;
  desktop keeps topbar Save + end-of-form CTA + rail Save.
  No FAB on desktop (V12 rule preserved).
- Column manager (order, labels, badges, switches, reset +
  confirm, drag on desktop): kept both.
- Import JSON (contract + validation errors): kept both.
- Toasts, dark mode, reduced motion, safe-area end padding:
  kept both.
- Bottom nav: absent in V12 shell; absent in both V13 files.
  The form shell uses FAB save, not bottom nav.
- Notes field: absent in V12; not introduced.
- Instant Markup: NEW in both (see below).

## Instant Markup design

- Entry: first-class toolbar "Markup" button beside
  Columns/Import, plus a rail "Open Markup" button on desktop.
- Modes: Percentage SP = CP × (1 + p/100) | Fixed SP = CP +
  value per unit. Cost-plus only; no margin-on-sell.
- Participation: per-item Included (default) / Excluded
  toggles plus Include/Exclude all. Group headers never
  participate. Zero/missing CP rows are ineligible with an
  explicit "Excluded — No cost price" state and are never
  counted. Basis is always CP; re-apply never compounds SP.
- Preview: per-row identity, CP, current → proposed SP,
  delta, line profit, margin, replace-warning for existing
  SP; aggregates (affected count, current/proposed selling
  totals, current/proposed profit, aggregate change).
  Desktop preview uses a 3-column comparison grid.
- Apply materializes rounded SP on included eligible rows
  only, recomputes through locked semantics, shows an
  immediate Undo banner restoring pre-apply SP. Cancel/Back
  mutate nothing.
- Validation: finite number ≥ 0 required; negatives, NaN,
  and empty input block Apply with visible feedback. Zero is
  valid (SP = CP).
- Audit intent: preview carries a production note — Apply
  must emit an audit UPDATE (mode, value, row ids,
  before/after SP). No audit code in the prototype.

## Sample model and verified math

V12 rows plus one zero-CP provisional row. Default exclusions:
Preliminaries and Emulsion paint (manually priced). Verified
with bun from the embedded inputs: base cost ₦4,984,090,
selling ₦5,878,000 (sand SP is 0, so base profit is negative
and Save correctly blocks — the markup narrative repairs it).
20% preview on the 3 included rows: cement ₦6,240, steel
₦11,760.90, sand ₦33,600; proposed selling ₦5,973,308, profit
₦989,218. Re-apply of 30% on cement yields ₦6,760 (from CP,
not compounded). Zero markup returns CP. Fixed ₦25,000 on
₦100,000 yields ₦125,000. All figures render from the locked
formulas in-script. Prototype uses float math rounded to 2dp;
production MUST use the authoritative Decimal path. Do not
port this float math.

## Verification

- `git status` before and after: captured. Only the two V13
  files plus this report are attributable to this task. The
  V12 modification flag predates this task (another agent's
  work); V12 received zero edits here.
- `git diff --check`: passed (whitespace clean).
- Both files self-contained; separate mobile and desktop
  files; V12 untouched; no production source changed.
- Formula strings, preview/apply/undo handlers, validation
  gate, ineligibility marking, group-header exclusion, dock
  (desktop only), FAB (mobile only), and no-bottom-nav state:
  all confirmed by static inspection.
- No-build, no-typecheck, no-lint, no-Supabase rule obeyed.
- Human screenshot review is mandatory. No visual approval
  is claimed.
