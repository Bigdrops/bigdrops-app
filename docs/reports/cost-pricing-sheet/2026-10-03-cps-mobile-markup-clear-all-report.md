# CPS Mobile Markup and Clear All Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Reconnect the two remaining Mobile/Fold primary toolbar workflows: Markup and Clear All. Both invoke the existing production workflows through the shared editor. No new sheets. No new engines.

## Scope

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- This report.

Domain modules, validation, save, numbering, schema, and all other workflows were not changed.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-mobile-markup-clear-all-report.md`

## Skills Used

Skills used: karpathy, react-dev
Documentation standard: ASD-STE100 Simplified Technical English

---

## Architecture Confirmation

Unchanged:

```text
CpsFormPage
→ CostPricingSheetEditor (shared production controller)
→ useLayoutMode (unchanged authority)
├── Desktop → CostPricingSheetDesktopForm
└── Mobile/Fold → CostPricingSheetForm
```

Mobile toolbar intent flows into the editor. The editor owns the shared markup dialog, the shared clear dialog, and authoritative state. The unified production-row revision syncs external row mutations into the form buffer.

## Desktop Preservation

Desktop renders `CostPricingSheetDesktopForm`. The clear dialog JSX moved verbatim into an exported shared component; the desktop call site passes its original callbacks, so desktop confirm wording, styling, and clear behavior are identical. Markup open, preview, apply, undo, selection rebuild, and dialog behavior are untouched.

## Mobile/Fold Visual Preservation

The Markup and Clear All toolbar buttons keep their positions, labels, icons, and styling. They gained click handlers only. The form CSS block was not edited. No geometry, spacing, typography, card, group, item, breakpoint, Theme Manager, reset, or heading rule changed.

---

## Markup: Previous Mobile Behavior

The Markup toolbar button was inert. No markup path existed on Mobile/Fold.

## Production Markup UI Reused

The existing `InstantMarkupDialog` at the editor root serves mobile. Mobile Markup tap → `onRequestMarkup` → existing `openMarkup` → the shared dialog opens with mode, value, inclusion list, preview, and error state. The J3 MarkupSheet was not restored. No markup UI was copied into the form. The dialog keeps its existing responsive behavior (docked panel on desktop composition, centered sheet otherwise).

## instant-markup Authority Used

`src/domain/cps/instant-markup.ts` is untouched and authoritative: eligibility (item rows with CP above zero), section exclusion, per-row inclusion selection, percentage and value derivation, 2-decimal rounding, preview aggregates, and apply with undo capture. No formula was reproduced. No float math was added. No new utility exists.

## Exact Open and Close Flow

`openMarkup` opens the dialog, clears preview and error, and rebuilds inclusion from current editor rows. Cancel or overlay close dismisses without mutation. Apply runs the production function, captures undo rows, updates authoritative rows, clears preview, closes the dialog, and bumps the production-row revision.

## Preview Behavior

Production-owned and unchanged: current versus proposed SP per row, affected count, selling and profit deltas, inclusion toggles, include-all and exclude-all, and validation errors. Nothing was simplified for mobile.

## Exclusion Behavior

Unchanged. Ineligible rows (no CP, section headers) cannot be included. Excluded rows keep their SP. The exclusion map rebuilds from live rows on open and after import.

## Decimal and Rounding Behavior

Unchanged. Derivation uses Decimal with 2-decimalplaces rounding inside the existing module. CP is never mutated. Only SP changes.

## Apply Behavior

Apply writes authoritative editor rows through the existing `updateRows`, which normalizes order and rebuilds the inclusion map. Mobile receives the result through the revision sync. Production Decimal totals recalculate from the synced buffer. Save persists through the normal path.

## Authoritative Row Update

`updateRows(result.nextRows)` is the single writer, shared with desktop. No presentation-local markup state exists.

## Mobile Live Synchronization

The unified `productionRowsRevision` counter bumps on apply. The form effect replaces its buffer and title from the fresh production rows. No remount. No save cycle.

## Undo Behavior

Mobile-initiated apply captures `undoRows` through the same production stack as desktop. No second undo stack exists. Undo restores the pre-markup rows, clears the undo slot, and bumps the same revision, so any mounted mobile buffer reflects it immediately. No mobile undo trigger button was added: the approved toolbar has no such control, and adding one would redesign it. Undo remains drivable from any layout that exposes the existing desktop undo affordance (for example a foldable that changes composition with the same editor state). A dedicated mobile undo affordance, if ever wanted, belongs to a future task.

## Import to Markup Interaction

Preserved. Import apply rebuilds the inclusion map from imported rows and bumps the same revision. Markup always operates on current authoritative rows with current identities. The import contract was not modified.

## Stable Identity Preservation

Markup apply preserves row objects except updated SP values, so `_uiKey`, `id`, `group_id`, and order survive. The string-identity model is untouched. Numeric `gid` did not return.

---

## Clear All: Previous Mobile Behavior

The Clear All toolbar button was inert. No clear path existed on Mobile/Fold.

## Production Confirmation Reused

The desktop clear dialog is now the exported `CpsClearAllDialog` with identical markup, wording, classes, and accessibility attributes. Mobile confirmation renders the same component from the editor root. The J3 ConfirmDialog was not restored. No second confirmation logic exists.

## Exact Confirmation Flow

Mobile Clear All tap → `onRequestClearAll` → editor `mobileClearOpen` flag → shared dialog opens → Cancel or overlay tap closes without mutation → Clear all confirms. No destructive action precedes confirmation.

## Authoritative Clear Behavior

Confirm calls the existing `updateRows([])`. Authoritative editor rows become empty. Markup inclusion rebuilds to empty, so no deleted row reference survives. `undoRows` is intentionally left untouched, matching desktop parity (desktop clear also preserves a prior undo slot).

## State Preserved by Clear All

Client, `client_id`, `client_snapshot`, title, number, site, notes, column configuration, and document identity are untouched. Clear All removes the row collection only. It is not a document reset.

## State Reset by Clear All

Row collection and markup inclusion map only.

## Mobile Live Synchronization

Confirm bumps the same production-row revision. The form buffer empties immediately with no remount. Totals show the production empty state (zero cost, zero selling, zero profit, zero margin).

## Totals After Clear

Correct empty-state values from `computeCpsTotals([])`, rendered through the unchanged totals block.

## Markup Selection and Undo Handling After Clear

Inclusion map is empty. A prior undo slot, if any, behaves exactly as on desktop: invoking undo would restore its captured rows through the normal path. Nothing resurrects silently.

---

## Sync: Final External-Row Synchronization Strategy

One mechanism: `productionRowsRevision` in the editor, consumed as `rowsRevision` by the form alongside fresh production rows and title. It bumps on JSON import apply, markup apply, markup undo, and mobile clear confirm. The form effect applies the synced buffer only when the revision advances, so local edits, client changes, column changes, and photo uploads never trigger a reset. No competing counters exist. No full-form remount is used.

## Regression Check

- Columns: intact. Shared sheet, live mirror, and persistence untouched.
- Import: intact. Sheet, adapter contract, title/groups/items behavior, and revision flow untouched except the shared bump rename.
- ClientSelector: intact. Shared instance, add-new-client, hydration, clear, validation, and save integration untouched.
- Production Decimal math: intact. No calculation line touched.
- Stable identity: intact. No identity line touched.
- Photo upload: intact. No photo line touched.
- Saving and double-submit: intact. The `saving` path was not touched.

## Group-Delete Conflict Status

Untouched and still deferred. Mobile single-group delete keeps and ungroups items. Desktop behavior differs. Clear All is an explicit bulk operation and does not interact with that disagreement.

## Deferred Workflows

Still deferred: dark-mode Theme Manager integration, autosave, dirty-state protection, component decomposition, group-delete standardization, custom-column visual rendering, mobile undo trigger UI.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Targeted tests: 112 passed, 0 failed across `calculations`, `cpsInstantMarkup` (preview, apply, exclusion, reapplication, undo path, rejection), `cpsRowOperations`, `cpsNormalize`, `cpsImportView`.
- `git diff --check`: passed. Only line-ending warnings on touched files.
- `git status`: 4 modified source files in expected scope (Page change is the prior separation restore, still uncommitted). 6 untracked pre-existing reports plus this report.
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not executed per hardware policy.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Risks or Limitations

- No browser or device run was performed. Dialog overlays on small screens rely on existing responsive behavior.
- Mobile row edits not yet saved are replaced when import, markup apply/undo, or clear confirm lands, matching desktop replace semantics. This is intended and documented.
- Mobile has no undo trigger button. Undo state is shared and revision-synced, but driving it requires a layout that exposes the existing affordance.
