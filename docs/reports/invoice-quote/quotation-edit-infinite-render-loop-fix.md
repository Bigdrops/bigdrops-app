# Quotation Edit — Infinite Render Loop Fix (#310)

This report was written by OpenCode on 2026-07-09 via Local Runner.

## Objective

Fix the React #310 infinite re-render that occurs when navigating to an existing quotation in edit mode, causing the browser tab to freeze.

## Root Cause

All callback props passed to `SharedDocumentForm` in `QuotationFormPage.tsx` were inline arrow functions defined at render body, creating new references on every render. This broke `React.memo` on every child component, causing cascading re-renders.

The specific loop completion path:

1. `updateQuotation` (line 320) — plain arrow, new ref every render
2. → `handleInvoiceLikeUpdate` (line 463) inherits instability via `updateQuotation` dep
3. → `guardedUpdateQuotation` inherits instability via `handleInvoiceLikeUpdate` dep
4. → `invoiceLikeQuotation` prop passed to `SharedDocumentForm` — new ref every render
5. → `SharedDocumentForm` `React.memo` fails → all children re-render
6. → `MobileItemCard` line 141 `useEffect` has `onUpdate` in deps — fires on every render because the inline `onUpdateItem` is new
7. → Effect calls `updateField('item_id', ...)` → parent's `onUpdate` handler → `commitGrouping` → `setItems`
8. → Re-render → goto 1

Previously missed during diagnosis because the effect has an early-return guard for loaded items. The guard works only when renders are occasional. Once the cascade starts (every inline prop is a new ref), the effect fires before the guard can stabilize, creating the loop.

## Files Changed

**`src/pages/QuotationFormPage.tsx`** — 60 insertions, 33 deletions

- `updateQuotation` wrapped in `useCallback([], [])` — root stabilization
- Added 13 stable callback handlers with `useCallback`:
  - `handleSetInvoiceTitle` — replaces inline `(value) => updateQuotation(...)`
  - `handleUpdateItem` — replaces inline item update closure
  - `handleAddHeaderField`, `handleUpdateHeaderField`, `handleRemoveHeaderField`
  - `handleAddAdditionalField`, `handleUpdateAdditionalField`, `handleRemoveAdditionalField`
  - `handleChargeLabelChange`, `handleAddExtraCharge`, `handleUpdateExtraCharge`, `handleRemoveExtraCharge`
  - `handleClearInvalidRow`
- Added `handleSave` for the three save triggers (`onSaveSent`, `onSaveDraft`, `onFloatingSave`)
- `signatories.map()` memoized with `useMemo` as `memoizedSignatories`

## Cascade Effect

Stabilizing `updateQuotation` makes `handleInvoiceLikeUpdate` stable (its only dep is now stable), which makes `guardedUpdateQuotation` stable, which makes `invoiceLikeQuotation` stable. `SharedDocumentForm` `React.memo` now works, preventing spurious child re-renders and breaking the #310 loop.

## Verification

- `bun run typecheck` — no errors in `QuotationFormPage.tsx`
- `bun run audit:load` — no regressions (only pre-existing warnings remain)
- `git diff --stat` — 93 lines changed, 1 file touched

## Risks & Limitations

- No test coverage for the re-render behavior. The fix relies on `useCallback` identity stability which is correct per React guarantees, but no regression test exists. A future refactor that unwraps these callbacks back to inline arrows would reintroduce the bug.
- `ensureUiKey` in `src/domain/invoice/factories.ts` uses `Date.now() + Math.random()` for fallback keys. This is a secondary risk if any normalization path strips `_uiKey` from DB-loaded items — but it is not the primary loop cause for this ticket.

## Deferred Work

- Consider adding a render-count guard or invariants check in dev mode for `SharedDocumentForm` to catch unstable props early.
- The `ensureUiKey` fallback key generation should be made deterministic if load-on-edit normalization ever strips the `_uiKey` field.
