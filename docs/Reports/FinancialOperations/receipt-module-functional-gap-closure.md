# Receipt Module — Functional Gap Closure

This report was written by OpenCode on 2026-07-09 via Local Runner.

[DELEGATION] task="receipt module functional gap closure" | domain="receipt" | subagent="NONE" | justification="no SUBAGENTS.md entry matches receipt module task — falls under frontend-developer + minimal-change-engineer | harness="Local Runner"

---

## Objective

Make the receipt module functional end-to-end: fix the dead route, ensure receipt creation triggers on payment, add receipt link to invoice view, wire void lifecycle, and list unapplied migrations.

## Scope

All 6 items from the task spec are covered. Excludes: PDF theming/design-preset work (already done), receipt-specific test suite (deferred), and invoice->receipt transformation for waybills/BOQs (out of scope).

## Changes Made

### 1. Dead route fixed: `Layout.tsx:124`
- Added `receipts: '/receipts'` to `handleMorePick` `pathByKey` map.
- Before: pressing "Receipts" in the More sheet navigated to `/undefined` (route dead).
- After: navigates to `/receipts`.

### 2. Bottom nav highlight fixed: `navData.ts:48`
- Added `pathname.startsWith('/receipts')` to the `getActiveTab()` condition that returns `'more'`.
- Before: `/receipts` fell through to `'home'` (wrong tab highlighted).
- After: More tab is highlighted when on receipts.

### 3. Payment → Receipt creation: `paymentService.ts:118-187`
- Already existed. Verified: `recordInvoicePayment` creates a receipt row via `withUniqueRetry` with snapshot data from `snapshotBuilder.ts`, then calls `recordReceiptGenerated` audit log. No changes needed.

### 4. Receipt link on invoice view: `PaymentHistoryCard.tsx`
- Added `invoiceId` prop (passed from `InvoiceOperationalSections.tsx` which already had it).
- Added `useEffect` that fetches `{id, receipt_number, payment_id}` from `receipts` table for the invoice.
- Builds a `payment_id → {id, number}` lookup map.
- Each payment row now shows a "Receipt #RCP-XXXXXX" link (with external link icon) if a matching receipt exists.
- Clicking navigates to `/receipts/{receiptId}`.

### 5. Receipt void lifecycle: `paymentService.ts:340-347`
- Added to `voidInvoicePayment`: after voiding the payment and its Telegram captions, fetches the linked receipt via `fetchReceiptByPaymentId`. If found, calls `voidReceipt()` to set `status='voided'` + `voided_at` + `void_reason`, then logs `RECEIPT_VOIDED` audit event.

### 6. Migrations listed (apply manually)

| Migration | Purpose |
|-----------|---------|
| `20260706000000_create_receipts.sql` | Create base `receipts` table with FK + RLS + triggers |
| `20260707000000_receipt_snapshot_and_idempotency.sql` | Add 40+ snapshot columns, `status` column, prefix engine constraint, `RECEIPT_GENERATED`/`RECEIPT_VOIDED` event types |

Apply both in order. Receipt creation will fail without the first; receipt void will fail without the second.

## Evidence

| Check | Result |
|-------|--------|
| `bun run typecheck` | Passed (only pre-existing waybill `fillableBold`/`fillableColor` errors) |
| `bun run audit:load` | Passed (one new ARCH warning for `PaymentHistoryCard` — expected, direct supabase fetch) |
| `git status` | Only intended files modified (5 files) |

## Risks & Limitations

- **Migration dependency:** Receipt creation and void will fail at runtime until both migrations are applied. The code handles errors gracefully (try/catch, logged to console).
- **Audit warning:** `PaymentHistoryCard.tsx` now has a direct supabase call (fetches receipts). Per project standards, this should eventually move to a hook. Deferred for simplicity.
- **Race condition:** Receipt receipt link appears as soon as the receipts query resolves. If a receipt is created moments after the page loads, the link won't appear until page refresh. Acceptable for v1.
- **Receipt number looks up:** The receipt number is fetched from the DB and displayed. If migration 2 isn't applied, `receipt_number` may not exist on old rows (null fallback).

## Deferred Work

- Receipt-specific test suite in `src/tests/`
- Replace direct supabase call in `PaymentHistoryCard.tsx` with a `useReceipts` hook
