# Payment History — Structured View Model Refactor

This report was written by OpenCode on 2026-07-04 via Local Runner.

## Objective

Eliminate inline string concatenation of `reference` and `notes` in Payment History rows, add date/time display, and introduce a proper `PaymentHistoryRowViewModel` to separate presentation logic from raw payment data.

## Scope

Covers Payment History ledger in the invoice document view only. Does not touch the Advance Invoices card (status badge already removed in prior fix) or any other document module.

## Changes

### 1. `PaymentHistoryCard.tsx` — render via view model

- Replaced direct `payments.map()` with `rowViewModels.map()` using `useMemo`
- Removed `formatDisplayDate` import (no longer needed in component)
- Removed inline `filter(Boolean).join(" • ")` concatenation
- Renders `reference` and `notes` as separate `<span>` elements with a `·` separator only when both are present
- Added `row.time` display (when available) via `formatDisplayTime`

### 2. `paymentHistoryViewModel.ts` — new file

- `PaymentHistoryRowViewModel` interface with typed, nullable fields
- `buildPaymentHistoryRowViewModels` mapping function from raw Supabase payment rows to view models
- Idempotent: null-safe accessors, falls back to empty string for missing values

### 3. `date.ts` — added `formatDisplayTime`

- `formatDisplayTime(value)` returns locale-formatted time (HH:MM) or empty string for null/invalid input
- Reuses existing patterns from `formatDisplayDate`

## Verification Gate

- `bun run audit:load` — passed (no new query/architecture warnings)
- `bun run typecheck` — 3 pre-existing errors in `ThermalTemplate.tsx` (color property on style objects), unrelated to changes
- `git status` — only untracked report file present (all code changes absorbed into prior commit `00667UUU`)

## Risks & Limitations

- The view model maps `payment.method` for the display label; if `method` is ever nullish it falls back to "Payment Received", preserving existing behavior
- `formatDisplayTime` uses `toLocaleTimeString` with only `hour`/`minute`; no AM/PM or seconds by default — adjust if 24h vs 12h preference differs per locale

## Deferred Work

- No deferred items; all changes scoped to this report are complete
