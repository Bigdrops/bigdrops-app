# Payment Recording UI Redesign Report

This report was written by OpenCode on 2026-07-05 via Local Runner.

## Objective

Redesign the Record Payment modal/sheet UI into a compact, fast accounting workspace while preserving 100% of the existing payment engine behavior. Payment calculations, settlement engine, audit pipeline, compliance automation, receipt automation, financial state, database schema, Supabase queries, payment validation logic, service layer, and repository layer remain untouched.

## Scope

- **Files modified:** 3
  - `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` — Full redesign
  - `src/components/document-view/invoice/sections/PaymentHistoryCard.tsx` — Compact tailwind conversion
  - `src/components/document-view/invoice/InvoiceRecordPaymentSheet.module.css` — Stripped (388→1 lines)
- **Files preserved untouched:**
  - `src/components/invoice/paymentEntryHelpers.ts` — `getPaymentEntrySummary`, `validatePaymentEntry` used as-is
  - `src/modules/invoices/services/paymentService.ts` — `recordInvoicePayment` signature unchanged
  - `src/modules/invoices/types/paymentTypes.ts` — Types unchanged
  - `src/components/document-view/invoice/VoidPaymentDialog.tsx` — Already functional, no changes needed
  - `src/domain/invoice/projections/financialProjection.ts` — `buildPaymentSummaryProjection` used as-is

## Changes Made

### 1. InvoiceRecordPaymentSheet.tsx — Full UI Redesign

**Layout:**
- Two-column grid (`md:grid-cols-2`) on desktop stacking Amount + Settlement Preview side by side, single column on mobile
- Compact card-based design using `bg-bd-surface-muted rounded-2xl p-4` cards instead of sprawling full-width form
- Hidden scroll area — form fits within sheet without internal scroll region

**New Features:**
- **Percentage Input:** Bidirectional sync between cash amount and percentage. Changing cash updates `pctInput` via `syncPctFromCash()`. Editing percentage updates cash via `handlePctEdit()`. Clamped 0–100%.
- **Quick Percentage Buttons:** 25% / 50% / 75% / 100% pill buttons call `applyPct(n)` directly — replaces the old "Pay Full" flow.
- **Settlement Progress Bar:** Gradient bar below net settlement showing `progressPct` with live animation.
- **WHT Notice:** Conditionally shown when `invoiceHasWht` (invoice has existing WHT) — reminds user to verify tax credit receipt in Compliance Hub.

**Removed (migrated to Tailwind):**
- 388-line CSS module completely stripped
- Old "Pay Full" toggle pill replaced by 100% quick button
- Old `typeToggle` (Cash/Percentage mode switch) eliminated — now always shows both inputs

### 2. PaymentHistoryCard.tsx — Compact Tailwind Conversion

**Changes:**
- Migrated from `InvoiceWorkspace.module.css` and `DocumentPreview.module.css` imports to pure Tailwind classes
- Compact payment item rows with flex layout, rounded-xl background, truncation for long notes
- Consistent styling with new payment sheet (same card radius, font sizes, spacing scale)
- Progress bar matches new settlement preview style (gradient fill)

**Preserved:**
- `buildPaymentSummaryProjection` call unchanged
- Collapsible section behavior unchanged
- Void payment wiring unchanged
- Empty state messaging

### 3. InvoiceRecordPaymentSheet.module.css — Stripped

- All 388 lines replaced with single comment: `/* Stripped — all styling migrated to Tailwind classes */`
- No remaining imports of this file exist in the codebase

## Verification

| Check | Status |
|-------|--------|
| `bun run typecheck` | PASSED |
| `bun run audit:load` | PASSED (no new warnings) |
| `git status` | Only 3 intended files modified |

## Risks & Limitations

- Percentage precision: uses `Math.round(cash * 100) / 100` for 2-decimal cash rounding. Percentage display shows up to 2 decimals but strips trailing zeros for clean UX.
- The `getPaymentEntrySummary()` helper remains unchanged — settlement preview is driven by the same function used previously.
- No visual regression suite exists for the payment sheet; manual verification on mobile and desktop needed for layout breakpoints.
- VoidPaymentDialog remains fully functional with confirmed wiring via `useInvoiceActions` → `voidInvoicePayment` → repository layer.

## Deferred Work

- Adding unit tests for the percentage↔cash sync math (straightforward, low risk)
- Keyboard shortcut for "Record Payment" submit (could be `Cmd+Enter` later)
- Animated transitions for the settlement preview card on amount change
