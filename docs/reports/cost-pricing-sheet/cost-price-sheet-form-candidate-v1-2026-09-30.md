# Cost Price Sheet Form Candidate V1 Report

This report was written by Muse Spark on 2026-09-30 via OpenCode.

## Objective

Transplant the accepted BOQ V13 form architecture into the Cost
& Pricing Sheet product contract as two new V1 candidates
(mobile/fold and desktop) with the Instant Markup feature
intact. V13 is the design parent. No redesign from scratch.

## Scope

Two new standalone HTML files plus this report. No production
code, schema, migration, Supabase, PDF, or build work. V13
untouched (zero write operations to either V13 path this
session). BOQ View and Invoice candidates untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-desktop.html` (new)
- `docs/reports/cost-pricing-sheet/cost-price-sheet-form-candidate-v1-2026-09-30.md` (new, this file)

The `form/cps/` directory is new; no existing artifact was
moved or renamed.

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.
`frontend-design` is not registered in docs/PROJECTSKILLINDEX.md
and was not loaded.

## Documentation standard

ASD-STE100 Simplified Technical English.

## Sources audited

- Both BOQ V13 candidates (full read of the mobile lineage;
  desktop shares the engine): tokens, topbar, details,
  itemtools, rail/enumeration item architecture, sub-desc
  preview, photo flow, groups, create pair, totals, save
  validation, all four sheets, full script.
- Invoice mobile/fold V7 candidate and live
  `src/components/ClientSelector.tsx`: dashed trigger,
  search-by-name-or-contact dialog, contact/city option
  detail, Add New Client affordance, X clear, selected-client
  detail card, client-required save.
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`:
  CPS identity; client preferred with vendor omitted;
  project/site and notes supported; groups with
  non-commercial headers; locked costing formulas; save
  validation (desc, qty > 0, sp > 0).
- Readiness audit on Instant Markup (no precedent; cost-plus
  semantics per task authority; audit-UPDATE intent;
  Schedule Selling Total terminology; Decimal-path
  requirement).

## V12/V13 → CPS V1 capability matrix

Preserved in both files unless noted.

- Topbar, title/number/date, Draft badge, theme: kept.
  Identity is Cost & Pricing Sheet with CPS-2026-0001.
- Toolbar Columns / Import / Clear all + confirms: kept.
- Item rows (rail, enumeration, move, duplicate, delete,
  desc, sub-desc, make, Qty/Unit, CP/SP tones, photo flow,
  insert below): kept.
- Groups (envelope, delete-keeps-items, title, count,
  add-item footer, empty state, headers carry no commercial
  values): kept.
- Create pair, empty state, column manager, import contract,
  toasts, dark mode, reduced motion, safe areas: kept.
- Save validation extended: sheet number, client required
  (Invoice rule), row desc/qty/SP.
- Save surfaces: mobile keeps phone FAB + end CTA; desktop
  keeps topbar + end CTA + rail Save. No desktop FAB. No
  bottom nav in either (V12 shell has none).
- Totals keep locked semantics; selling line labeled
  Schedule selling total.
- Notes: absent in V12; added as contract-supported metadata.
- Vendor/Contractor: removed entirely. Reference/Contact:
  removed; replaced by Client Picker + Site/Project.
- Instant Markup: fully transplanted (modes, participation,
  preview, apply, undo, validation, ineligibility).

## Row economics redesign

The V13 profit strip is replaced by a coherent trio: TCP
(CP × Qty), TSP (SP × Qty), and Profit (TSP − TCP) as three
cells, with margin as secondary text beneath
(margin = profit / TSP, em-dash when TSP is 0). Desktop uses
the same component in its data column. Markup preview rows
show TSP and profit/margin consequences per affected row.

## Client Picker transplant

Dashed trigger with icon, name, and Bill-to subline;
searchable dialog with contact detail rows, selected check,
empty-search state, and Add New Client affordance; X clear on
the trigger; selected-client detail card; client-required
save. Invoice semantics preserved; placement adapted to V13
geometry. Desktop uses a compact centered dialog.

## Sample model and verified math

Selected client Wellspring Homes Ltd with Site/Project set;
6 grouped/standalone rows across units and quantities;
zero-CP provisional row; markup exclusions on the two
manually priced rows. Arithmetic extracted from the actual
HTML of both files: cost ₦4,984,090, selling ₦4,878,000,
profit −₦106,090 (negative base correctly exercises loss
styling and save-block). 20% markup on the 3 included rows
yields selling ₦5,973,308 and profit ₦989,218 (verified with
bun). Re-apply derives from CP (cement 30% → ₦6,760, never
compounded). Zero markup returns CP. Fixed-value mode adds
per-unit amounts. Prototype uses float math rounded to 2dp;
production MUST use the authoritative Decimal path. Audit
intent documented in the prototype preview note.

## Terminology verification

Static sweep of both files for BOQ, Vendor, Contractor
(case-sensitive): zero user-visible hits. One remaining hit
is the non-visible design-parent filename in a header
comment, covered by the task's source-comment exception.

## Verification

- `git status` before and after: captured. Only the two CPS
  files, the new directory entry, and this report are
  attributable to this task.
- `git diff --check`: passed (whitespace clean).
- Both files self-contained; separate mobile and desktop
  files; V13 received zero writes; no production source,
  migration, or unrelated artifact modified.
- Required concepts (identity, picker, CP/SP/TCP/TSP/Profit,
  markup, include/exclude, grouped + standalone rows)
  confirmed present in both files by inspection.
- FAB present on mobile only; dock present on desktop only;
  bottom nav absent in both, matching the V12 shell.
- No-build, no-typecheck, no-lint, no-Supabase rule obeyed.
- Human screenshot review is mandatory. No visual approval
  is claimed.
