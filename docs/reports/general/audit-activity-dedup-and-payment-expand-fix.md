# Audit Trail Bug Fixes: CREATE Dedup & Payment Row Expandability

This report was written by DeepSeek on 2026-07-04.

## Objective

Fix two related audit trail bugs affecting the Activity & History section of invoice/quotation detail views.

## BUG 1 — Duplicate CREATE Rows in Activity Feed

### Root Cause

`recordInvoiceCreated()` (writes to `activity_events`) and `recordAuditLog()` (writes to `audit_logs`) are sequential awaited calls in `InvoiceFormPage.tsx:637-638`. Each call involves a network round-trip to Supabase (~50–500ms). The `created_at` timestamp is set by PostgreSQL `now()` at the transaction start of each RPC/INSERT, so the two timestamps are offset by the network gap between the sequential calls.

The dedup in `useAuditTrail.ts:55-64` matches audit_logs rows to activity_events rows by `entity_id : rounded_to_nearest_second(created_at)` using `Math.round(ms/1000)`. When timestamps straddle the `.500` second boundary (e.g., activity at .400 → rounds to second N, audit at .600 → rounds to second N+1), the keys don't match and both rows appear.

**Probability:** ~G/1000 where G = gap in ms. A 200ms gap → ~20% failure rate.

### Fix

`src/hooks/useAuditTrail.ts`:

1. `dedupActivityEvents()` now returns `{ auditDeduped, activityFiltered }` instead of only `auditDeduped`.
2. **CREATE events** use entity-level dedup: an entity is created once, so matching by `entity_id` alone (no timestamp) is correct. The `audit_logs` row (has field diffs) is kept; the `activity_events` row is removed.
3. **Non-CREATE events** (STATUS_CHANGE, LINK, etc.) keep the existing timestamp-based dedup, keeping `activity_events` (richer domain metadata).
4. `fetchMerged()` uses the new signature: `[...auditDeduped, ...activityFiltered]`.

## BUG 2 — Payment Rows Not Expandable

### Root Cause

`mapActivityEventToAuditLog()` in `useAuditTrail.ts:38` sets `changes: null` for all `activity_events` rows. ActivityCard checks `hasChanges = entry.changes.length > 0` (`ActivityCard.tsx:61`), which is always `false` for payment rows. The metadata (amount, method, etc.) stored in `activity_events.metadata` was never exposed to the UI.

### Fix

1. **`src/domain/audit/auditTypes.ts`**: Added `metadata?: Record<string, unknown> | null` to `AuditLogRecord`.
2. **`src/hooks/useAuditTrail.ts`**: `mapActivityEventToAuditLog()` now passes through `metadata` from the DB result.
3. **`src/domain/audit/auditFormatters.ts`**:
   - Added `PAYMENT_VOIDED` action label (`'voided a payment on this invoice'`).
   - `buildPaymentChanges()` generates virtual `AuditTrailChange[]` from metadata for `PAYMENT_RECORDED` (amount, date, method, reason) and `PAYMENT_VOIDED` (amount, reason) events.
   - `buildAuditTrailItems()` falls back to `buildPaymentChanges()` when regular changes are empty.
   - Added `'amount'` to `CURRENCY_FIELDS` for Naira formatting.

## Verification

`bun run audit:load` — passed (all warnings pre-existing).
`bun run typecheck` — passed (exit 0, no errors).

## Files Changed

| File | Change |
|------|--------|
| `src/domain/audit/auditTypes.ts` | Added `metadata` to `AuditLogRecord` |
| `src/hooks/useAuditTrail.ts` | Entity-level dedup for CREATE events; pass through metadata |
| `src/domain/audit/auditFormatters.ts` | Payment metadata→changes conversion; PAYMENT_VOIDED label; amount currency formatting |

## Risks & Limitations

- **Non-CREATE dedup** still uses the 1-second rounding window and can theoretically fail on slow connections. The CREATE fix uses entity-level matching (no timestamp involved), which is bulletproof. Non-CREATE dedup is less critical since STATUS_CHANGE/LINK duplicates aren't as noticeable as CREATE duplicates.
- **Payment date/method** fields are only present when the caller includes them in metadata. The current `record_payment_recorded` RPC only stores `{ amount, status, total }` — date and method are not yet in the payload. This is fine: the fields will appear when the metadata includes them.
