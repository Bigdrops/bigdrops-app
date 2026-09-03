# Phase 2.3 — WHT Auto Receipt Draft

This report was written by OpenCode on 2026-07-05 via Local Runner.

## Summary

Automatically creates a draft WHT receipt after a payment containing WHT is recorded. The automation is fire-and-forget, non-blocking, and best-effort. Failure never impacts the payment pipeline.

## Files Modified

- `src/modules/compliance/services/complianceService.ts` — added `autoCreateWhtReceiptDraft()`
- `src/modules/invoices/services/paymentService.ts` — added fire-and-forget call after payment recording

## Idempotency Strategy

The `wht_receipts` table has a `UNIQUE INDEX` on `payment_id` (`wht_receipts_payment_id_key`). The automation performs an existence check (`SELECT id ... maybeSingle()`) before inserting. Duplicate attempts are silently no-oped. A second safety net: if two concurrent calls both pass the existence check, the DB constraint catches the duplicate and the `.catch()` in the payment service swallows the error.

## Verification

- `bun run audit:load` — passed (no new warnings)
- `bun run typecheck` — passed (exit code 0)
- `bun run test` — 51/52 pass (1 pre-existing failure: `waybillImportCustomColumn.test.js` missing `externalWaybillPrompt` module)
- `git status` — only the 2 intended files modified

Manual verification scenarios:
1. Payment with WHT (`wht_amount > 0`) → receipt auto-created with `receipt_status: 'pending'`
2. Payment without WHT (`wht_amount = 0`) → no receipt created
3. Duplicate automation → existence check prevents duplicate; DB constraint is backup
4. Manual receipt creation via UI → unchanged, uses `insertInlineWhtReceipt` directly

## Deferred Work

- `wht_type` is accepted in the function signature but not stored (the `WhtReceipt` type has no `wht_type` field). Add if the receipt schema is extended.
- No migration needed — the UNIQUE index already exists.
