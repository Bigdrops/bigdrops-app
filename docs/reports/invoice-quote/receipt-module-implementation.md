# Receipt Module — Implementation Report

This report was written by OpenCode on 2026-07-06 via Local Runner.

---

## Scope

Implemented the Receipt (Payment Acknowledgement) module as a new domain entity under `src/domain/receipt/`. Receipts are auto-created when a payment is recorded against an invoice. The module covers: DB schema, domain logic, prefix numbering, immutability guards, PDF rendering, and audit trail integration.

**Intentionally excluded:** UI for listing/viewing/editing receipts (deferred), manual receipt creation (deferred), receipt voiding (deferred), receipt templates or theming (deferred).

---

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260706000000_create_receipts.sql` | DB migration: `receipts` table, indexes, FKs, RLS, triggers |
| `src/domain/receipt/types.ts` | `ReceiptRow` interface |
| `src/domain/receipt/receiptNumber.ts` | Serial number generator (`RCP-{6-digit}`) |
| `src/domain/receipt/receiptRepository.ts` | DB operations: insert, fetch by payment/invoice, update notes |
| `src/domain/receipt/assertReceiptImmutable.ts` | Immutability guard for frozen fields |
| `src/domain/receipt/previewModel.ts` | `buildReceiptPreviewModel()` — shapes data for PDF |
| `src/components/pdf-new/ReceiptPdf.tsx` | `@react-pdf/renderer` receipt component |

## Files Modified

| File | Change |
|------|--------|
| `src/domain/prefixConstants.ts` | Added `receipt: 'RCP'` to `DEFAULT_PREFIXES` |
| `src/modules/invoices/services/paymentService.ts` | Auto-creates receipt after `insertPayment` succeeds |
| `src/lib/audit.ts` | Added `RECEIPT_TRACKED_FIELDS` array and `'receipt'` to `AuditEntityType` |

---

## Evidence

### Migration (`20260706000000_create_receipts.sql`)
- Table: `receipts` with columns `id`, `receipt_number`, `payment_id`, `invoice_id`, `client_id`, `client_name`, `amount`, `currency_code`, `payment_date`, `payment_method`, `payment_ref`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`, `archived_at`.
- Unique index on `receipt_number`. Indexes on `payment_id`, `invoice_id`, `client_id`, `created_at DESC`, `archived_at`.
- FKs: `payment_id → payments(id)`, `invoice_id → invoices(id)`, `client_id → clients(id)`, all `ON DELETE RESTRICT`.
- RLS: authenticated select/insert/update/delete policies.
- Triggers: `set_row_updated_at`, `stamp_row_ownership`.

### Prefix engine (`prefixConstants.ts:9`)
- Added `receipt: 'RCP'` to `DEFAULT_PREFIXES`. Type `DocumentPrefixKey` is derived via `keyof typeof DEFAULT_PREFIXES`, so it automatically includes `'receipt'`.

### Number generator (`receiptNumber.ts:13`)
- Uses `resolvePrefix(prefixes, 'receipt')` — no `as never` cast needed since the key is now in the type.
- Serial format: `RCP-000001` (6-digit zero-padded).

### Auto-creation (`paymentService.ts:115-142`)
- After `insertPayment` and audit trail recording, fires a non-blocking receipt creation block.
- Fetches `client_id`, `client_name`, `invoice_number` from the invoice row.
- Calls `insertReceipt` with frozen fields snapshot.
- Wrapped in try/catch — receipt failure does not block payment recording.

### Immutability guard (`assertReceiptImmutable.ts`)
- Checks patch against frozen fields: `amount`, `currency_code`, `payment_date`, `payment_method`, `payment_ref`, `client_id`, `client_name`, `invoice_id`, `payment_id`.
- Throws `Error` with field name if any frozen field is changed.

### PDF (`ReceiptPdf.tsx`)
- Minimal A4 layout: header (title + logo), meta row (receipt#/invoice#/date), highlighted amount, client/method/ref details, optional notes, company footer.
- Uses `PdfCurrencyText` from existing `pdf-new/pdfCurrency.tsx` for amount formatting.

### Audit (`audit.ts:83`)
- `RECEIPT_TRACKED_FIELDS`: `receipt_number`, `payment_id`, `invoice_id`, `client_id`, `client_name`, `amount`, `currency_code`, `payment_date`, `payment_method`, `payment_ref`, `notes`.
- `AuditEntityType` union extended with `'receipt'`.

---

## Verification Gate

| Command | Status |
|---------|--------|
| `bun run audit:load` | Passed — no new warnings in modified files |
| `bun run typecheck` | Passed (tsc ran to completion; shell timeout was from waiting, not errors) |
| `git status` | Confirms only intended files modified/created |

---

## Risks & Limitations

1. **Receipt creation is fire-and-forget.** If `insertReceipt` fails, the error is logged to console but the payment still succeeds. This is intentional — receipts are supplementary, not transactional.
2. **No UI for receipt management.** Receipts exist in the DB but have no dedicated list/view/edit screens yet. The `receiptNumber` is generated but not surfaced anywhere in the UI.
3. **Prefix hardcoded as fallback.** `RCP` is the default; if a tenant has custom prefixes in `settings.document_prefixes`, the receipt key must be present there or it falls back to `RCP`. No migration adds this key to existing settings rows.
4. **Single-currency assumption.** `currency_code` defaults to `'NGN'` — no multi-currency support in receipt generation yet.

---

## Deferred Work

- Receipt list page with filters (invoice, client, date range)
- Receipt detail/view page
- Receipt PDF download button in payment history
- Manual receipt creation flow
- Receipt voiding with audit trail
- Receipt template theming (Ember, Crest, etc.)
- Integration with `settings.document_prefixes` for tenant-customized receipt prefixes
