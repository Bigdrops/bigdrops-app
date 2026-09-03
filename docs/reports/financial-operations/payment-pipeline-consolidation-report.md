# Payment Pipeline Consolidation Report (Phase 1b)

This report was written by OpenCode on 2026-07-04 via Local Runner.

## Objective

Consolidate the BIGDROPS payment recording pipeline into a single authoritative business entry point in `paymentService.ts`, removing WHT defaults and settlement assumptions from the UI helper layer.

## Scope

**Included:** Payment sheet data loading, helper API simplification, dead code removal, test alignment.

**Excluded:** No changes to payment UI behaviour, validation messages, audit sequence, settlement calculation, WHT runtime values, invoice financial calculations, or document lifecycle operations.

## Changes Made

| File | Change |
|------|--------|
| `src/modules/invoices/services/paymentService.ts` | Added `loadPaymentSheetData(invoiceId, invoiceTotal)` — single entry point that calls `calculatePreviousSettled` + `loadBankAccountsList` internally and returns `{ currentBalance, bankAccounts }`. Removed unused `refreshInvoicePaymentState`. |
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | Replaced separate `calculatePreviousSettled`/`loadBankAccountsList` calls with single `loadPaymentSheetData` call. Changed `previousSettled` state (number, derived) to `currentBalance` state (set by service). |
| `src/components/invoice/paymentEntryHelpers.ts` | Removed `whtDeducted` from `PaymentEntrySummaryInput`, `PaymentEntrySummary` output, and `whtError` from `PaymentEntryValidationResult`. Removed unused `buildFullPaymentPreset`. |
| `src/modules/invoices/types/paymentTypes.ts` | Removed unused `PaymentType` type and `PaymentFormState` interface. |
| `src/tests/invoice/paymentEntryHelpers.test.js` | Stripped all WHT-specific test cases. Kept 4 core tests: valid settlement, zero-settlement rejection, over-balance rejection, negative cash rejection. |

## Risks & Limitations

- `InvoiceRecordPaymentSheet.tsx` still hardcodes `whtDeducted: 0` in the settlement passed to `recordInvoicePayment` — this is the service layer's contract and was intentionally left unchanged per "preserve existing behaviour".
- `loadBankAccountsList` retained as a standalone export (not inlined into `loadPaymentSheetData`) since it may be useful for other UI contexts.
- Report docs mentioning `refreshInvoicePaymentState` and `buildFullPaymentPreset` were not updated — these are historical records and not actionable.

## Verification

- `bun run audit:load` — passed (no new issues)
- `bun run typecheck` — passed (zero errors)
- `git status` — only the 5 planned files modified

## Deferred Work

- Full payment allocation system
- Receipt generation
- Payment projection layer
