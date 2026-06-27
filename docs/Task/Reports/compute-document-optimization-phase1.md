# Phase 1: `computeDocument` Memoisation Report

## Summary
Wrapped `computeDocument()` calls in `useMemo` in both `NewInvoice.tsx` and `EditInvoice.tsx` to prevent unnecessary executions on every render.

## Problem
`computeDocument()` was called inline in the render body of both new-invoice and edit-invoice pages. Every React re-render — even those triggered by UI state changes (modals, focus, dropdowns, etc.) — re-executed the full `calculateDocument()` pipeline, performing heavy Decimal-arithmetic work despite no change to line items or financial inputs.

## Root Cause
The two call sites at:
- `src/pages/NewInvoice.tsx:468` — `computeDocument({ ...invoice, ... }, { extraCharges, calculationInputs }, items)`
- `src/pages/EditInvoice.tsx:445` — same pattern

The inline spread `{ ...invoice, ... }` creates a new object reference every render, and the call itself has no wrapper — so there is zero caching.

## Fix
| File | Change |
|---|---|
| `src/pages/NewInvoice.tsx` | `computeDocument` wrapped in `useMemo` with deps `[items, columns, extraCharges, calculationInputs, invoice]` |
| `src/pages/EditInvoice.tsx` | Added `useMemo` to React import; same `useMemo` wrapper pattern |

## Deps Rationale
- `items` — changes on keystroke in line items → triggers recomputation ✅
- `columns` — static config, rarely changes ✅
- `extraCharges` — changes when user edits extra charge fields → must recompute ✅
- `calculationInputs` — changes on rounding/precision settings → must recompute ✅
- `invoice` — changes on invoice header field edits → must recompute ✅

`items` and `invoice` are separate state variables (`setItems` / `setInvoice`), so editing a line item only changes `items` and leaves `invoice` stable. This gives the correct caching behaviour: computation runs exactly once per keystroke, not once per render.

## Files Not Modified
- `src/lib/Calculations.ts` — DO NOT MODIFY per project rules
- `ViewInvoice.tsx` — already had `useMemo` ✅
- `QuotationForm.tsx` — already had `useMemo` ✅
- `viewQuotationActions.ts` / `invoicePdfActions.ts` — async, not render-path ✅

## Verification
| Command | Result |
|---|---|
| `bun run audit:load` | Pass (pre-existing warnings only) |
| `bun run typecheck` | Clean (no errors) |
| `bun run build` | Pass |
| `bun run test` | 37/37 pass (1 pre-existing failure: `waybillImportCustomColumn.test.js` — missing `externalWaybillPrompt` module) |

## Pre-existing Issue (Out of Scope)
`EditInvoice.tsx:229` — `updateItem` is not wrapped in `useCallback`. This is a rendering-layer concern (Phase 2 territory), not a calculation-correctness issue. It does not affect this optimisation.
