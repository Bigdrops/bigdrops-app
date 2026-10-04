# CPS Mobile Instant Markup Presentation Replacement Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Replace the oversized Mobile/Fold Instant Markup presentation with a compact bounded bottom sheet following the attached screenshot and the canonical CPS HTML candidate. Reconnect it and the approved undo affordance to the existing production markup machinery. Desktop stays intact.

## Scope

- `src/components/cps/CpsMarkupSheet.tsx` (new)
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/tests/critical/cpsMarkupPresentation.test.js` (new)
- This report.

Domain engine, save, numbering, schema, and all other workflows were not changed.

## Files Changed

- `src/components/cps/CpsMarkupSheet.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/tests/critical/cpsMarkupPresentation.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-mobile-instant-markup-presentation-replacement-report.md`

## Skills Used

Skills used: karpathy, react-dev, frontend-design
Documentation standard: ASD-STE100 Simplified Technical English

---

## Exact Defective Presentation Code Removed

The mobile defect was the shared `InstantMarkupDialog` rendering its centered `w-full max-w-[560px]` dialog variant on non-desktop layouts, with an unbounded full row list and no internal scroll containment, so sheet height grew with row count.

Removed:

- The `dock` prop and the mobile dialog branch from `InstantMarkupDialog`, which is now desktop-only with its docked panel classes applied unconditionally.
- Mobile usage of `InstantMarkupDialog` in the editor render branch.

Nothing was hidden underneath another component. No override CSS was piled on. The removed branch is gone, verified by repository search (only the desktop dock CSS class reference remains).

## Exact Production Markup Machinery Retained

Unchanged: `openMarkup`, `handlePreview`, `handleApplyMarkup`, `undoMarkup`, `includeAll`, `included` selection state, `undoRows` state, `preview` and `markupError` state, `updateRows` integration, revision bump on apply and undo, and the full `src/domain/cps/instant-markup.ts` engine (eligibility, derivation, 2-decimal rounding, preview aggregates, apply, exclusion).

## Canonical HTML Inspected

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`:

- Setup sheet `#ovMarkup`: header plus subtitle plus close, Percentage and Fixed Value segment, value input with mode label, formula callout, Include All and Exclude All with included count, dense row list with group separator bands and an ungrouped band, Preview Changes plus Cancel.
- Preview wrap `#mkPreviewWrap`: aggregate cells, per-row before and after rows, apply note, Apply to Form plus Back.
- Undo banner `#mkUndo` in the main form: applied summary text plus Undo button, shown after apply and hidden on open.

## Attached Screenshot Used as Visual Reference

The screenshot defined the accepted density and containment: compact bounded sheet, strong compact header with close control, two compact mode controls, compact input, concise callout, lightweight include and exclude controls with included count, dense rows with Included, Excluded, and No CP states, lightweight group separators, prominent Preview Changes action, and secondary Cancel.

## Before and After Component Flow

Before:

```text
Mobile MARKUP tap → openMarkup → InstantMarkupDialog (centered, unbounded)
```

After:

```text
Mobile MARKUP tap → openMarkup → CpsMarkupSheet (bounded bottom sheet)
→ setup → Preview Changes → preview → Back or Apply to Form
→ existing handleApplyMarkup → revision sync → form reflects new SP
→ undo banner appears in the main form → Undo restores via undoMarkup
```

Desktop flow is unchanged and still renders `InstantMarkupDialog`.

## Mobile/Fold Versus Desktop Presentation Ownership

`InstantMarkupDialog` is desktop-owned. `CpsMarkupSheet` is mobile-owned. The editor branches on the existing `useDesktopComposition` flag and passes identical state and callbacks to both. No markup state or logic was duplicated.

## Sheet Max-Height and Viewport Containment Strategy

`SheetContent` uses bottom anchoring with `max-h-[85dvh]`, flex column layout, and hidden overflow, following the repository bottom-sheet convention. The height bound is viewport-relative, not pixel-fixed, so 3 rows and hundreds of rows share the same outer footprint. Safe-area padding applies to both footers.

## Internal Scrolling Strategy

Setup state: the mode controls, input, callout, and include tools stay fixed; the row list region uses `flex-1 min-h-0 overflow-y-auto`. Preview state: the aggregate and row region scrolls while the Apply and Back footer stays fixed. The `min-h-0` on flex children is what lets the scroll region absorb overflow instead of growing the sheet. The background form stays an inert layered surface behind the sheet overlay.

## Behavior With Large Row Counts

The outer sheet stops at its maximum footprint and the content region scrolls internally. Header, mode, input, tools, count, and footer actions remain reachable. No viewport overflow. No document-body scrolling dependency.

## Setup-State Implementation

Header with title, subtitle, and compact close. Percentage and Fixed Value segmented controls with icons. Mode-aware value label and input. Mode-aware formula callout. Inline error box. Lightweight Include All and Exclude All text controls with a mono included count. Dense row list with section separator bands, an ungrouped band mirroring canonical ordering logic, status dots, mono CP and current-SP sublines, and Included, Excluded, and disabled No CP pills. Preview Changes primary action is disabled without input. Cancel closes through the existing close path, which resets preview and error state.

## Preview-State Implementation

Aggregate cells for affected count, selling total before and after, gross profit before and after, and aggregate change, all from the production preview object. Per-row cards with description, CP, current to proposed SP, profit, and margin, all from engine fields. No TSP synthesis and no delta arithmetic were added. The explanatory note, Back, and Apply to Form (disabled at zero affected) complete the state. Preview never mutates rows.

## Apply Boundary

Apply calls the existing `handleApplyMarkup` only. The sheet closes per established behavior. Revision sync refreshes the form buffer. The normal save path persists the values.

## Percentage and Fixed-Value Behavior

Both modes flow through the existing mode state into `previewInstantMarkup` and `applyInstantMarkup`. Labels, callouts, and input behavior switch with mode. No mode-specific logic lives in the presentation.

## Inclusion and Exclusion Behavior

Toggles call the existing inclusion updater per production row key. Include All and Exclude All call the existing bulk setter. Counts derive from production eligibility plus inclusion state.

## Group and Header Handling

Section rows render as lightweight separator bands with titles and never participate. They carry no toggle. Membership display follows row order with group and ungrouped bands; domain membership is untouched.

## No-CP Handling

Ineligible rows show a danger dot, a red no-cost-price subline, and a disabled No CP pill with no toggle. They cannot enter preview or apply output.

## Decimal Authority

All computed values come from the engine, which uses Decimal throughout. The presentation formats numbers for display only (whole-naira readout). No `Decimal`, preview, apply, totals, float, or parseFloat math exists in the new sheet, verified by test.

## Undo Handling

Mobile-initiated apply captures the existing `undoRows` snapshot through the unchanged production stack. The main form shows the canonical undo banner (applied summary plus Undo) whenever `hasUndo` is true, wired to the existing `undoMarkup` callback. Undo restores authoritative rows, clears the snapshot, bumps the revision, and hides the banner. No second undo stack exists. One deliberate delta from the canonical HTML: production keeps the undo snapshot across sheet reopen rather than hiding it on open, so the banner reflects true snapshot state instead of sheet visibility.

## Theme Manager Integration

All color semantics use `bd-text`, `bd-text-muted`, `bd-border`, `bd-surface`, `bd-surface-muted`, `bd-card-bg`, `bd-button-primary-bg`, `bd-button-primary-text`, `bd-status-success-text`, and `bd-status-danger-*` tokens. No prototype colors returned. No geometry tokens changed. Main-form geometry untouched.

## Confirmation: No Prototype Calculation Logic Returned

The new sheet contains no ported HTML engine code. It receives `preview`, `included`, `rows`, and callbacks as props and renders them.

## Confirmation: Calculation Files Untouched

`calculateCpsTotals.ts`, `calculations.ts`, legacy BOQ calculation machinery, and `instant-markup.ts` were not modified. No import cleanup in those files was needed.

## Regression Results

- New `cpsMarkupPresentation` tests (5 cases): no engine math in the sheet, pure selectors only, correct desktop and mobile ownership, toolbar intent intact, undo affordance without a local stack.
- Existing suites: instant markup (9), row operations (13), normalize (5), import view (20), save serialization (5), list date (4), hooks order (3), calculations (68), numbering (17) — 141 passed, 0 failed across the targeted run.
- Desktop markup path renders the same dialog with the same props and state as before.

## Exact Files Changed

- `src/components/cps/CpsMarkupSheet.tsx` (new, 1 file).
- `src/components/cps/CostPricingSheetEditor.tsx` (branch split, dialog simplification, undo prop pass-through).
- `src/components/cps/CostPricingSheetForm.tsx` (two undo props plus banner; toolbar intent already existed).
- `src/tests/critical/cpsMarkupPresentation.test.js` (new).

## Pre-Existing Working-Tree Modifications Distinguished

`src/components/cps/CpsList.tsx`, `src/config/moduleAdapters.ts`, and `src/tests/critical/cpsListDate.test.js` were already modified or created by the concurrent list-date task before this task started. This task did not touch them.

## Verification Commands and Results

- `bun run typecheck`: passed.
- `bun test` (9 targeted files): 141 passed, 0 failed.
- `git diff --check`: passed (line-ending notices only).
- `git status`: expected scope (3 modified files including the pre-existing list-date pair, 1 new component, 1 new test, plus reports).
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- Explicit confirmation: `bun run build` was not executed.

## Device and Browser Validation

Device and browser visual validation remains human validation. Static verification confirms structure, containment classes, state wiring, and engine authority. A human pass should confirm bottom-sheet height behavior with small and large row counts, internal scrolling, safe-area fit, preview readability, and undo banner placement on a real phone viewport.
