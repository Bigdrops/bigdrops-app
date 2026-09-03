# Receipt Module Correction Report

This report was written by OpenCode on 2026-07-08 via Local Runner.

---

## Objective

Bring the Receipt module into full compliance with `docs/standard/receipt-standard.md`, making each receipt a legally durable, immutable proof-of-payment with complete data snapshots, correct prefix engine integration, `withUniqueRetry` idempotency, and a dumb-renderer PDF.

## Scope

**Covered:**
- ReceiptRow type expanded with 40+ snapshot fields (payment, invoice, client, project, company, bank, signatory)
- New `snapshotBuilder.ts` pure function for building receipt snapshots
- Database migration adding snapshot columns, CHECK constraints, and prefix key backfill
- PaymentService receipt creation rewritten with snapshot builder, `withUniqueRetry`, and audit trail
- `assertReceiptImmutable.ts` expanded to cover all 41 frozen fields
- `previewModel.ts` rewritten with canonical `ReceiptPreviewData` interface and amount-in-words computation
- `ReceiptPdf.tsx` rewritten as dumb renderer with all 8 required sections per standard §8
- Audit helpers `recordReceiptGenerated()` and `recordReceiptVoided()` added to `audit.ts`
- `'receipt'` key registered in settings UI (`DocumentPrefixesSettingsSection.tsx`)

**Excluded:**
- Receipt editing (not allowed per standard — receipts are immutable)
- Receipt deletion (not allowed — only voiding)
- Waybill/CSR/quotation/invoice modules (separate tasks)
- PDF visual styling (kept minimal per standard; no framer-motion)

## Implementation Details

### Files Created
| File | Purpose |
|------|---------|
| `src/domain/receipt/snapshotBuilder.ts` | Pure `buildReceiptSnapshot()` function — constructs all snapshot fields from payment, invoice, client, project, company, bank, signatory inputs |
| `supabase/migrations/20260707000000_receipt_snapshot_and_idempotency.sql` | Adds snapshot columns, lifecycle columns (`status`, `voided_at`, `void_reason`), CHECK constraints, prefix key backfill |

### Files Rewritten
| File | Changes |
|------|---------|
| `src/domain/receipt/types.ts` | `ReceiptRow` expanded from 12 fields to 40+ fields covering payment snapshot, invoice snapshot, client snapshot, project snapshot, company snapshot, bank snapshot, signatory snapshot, and lifecycle |
| `src/domain/receipt/receiptRepository.ts` | `CreateReceiptInput` type added, `voidReceipt()` function added |
| `src/domain/receipt/assertReceiptImmutable.ts` | All 41 frozen fields now checked |
| `src/domain/receipt/previewModel.ts` | Canonical `ReceiptPreviewData` interface matching §4.1, `buildReceiptPreviewData()` pure function, `numberToWords()` for amount-in-words |
| `src/components/pdf-new/ReceiptPdf.tsx` | Dumb renderer with 8 required sections: header, client, payment, amount-in-words, invoice reference, project, bank, notes/voided, terms, signature, footer |
| `src/modules/invoices/services/paymentService.ts` | Receipt creation block rewritten: fetches invoice + client + company + bank + signatory in parallel, builds snapshot, uses `withUniqueRetry`, emits `RECEIPT_GENERATED` audit event |
| `src/lib/audit.ts` | `RECEIPT_TRACKED_FIELDS` updated to `['status', 'voided_at', 'void_reason']`, added `recordReceiptGenerated()` and `recordReceiptVoided()` |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | Added `'receipt'` to `PREFIX_KEYS`, `LABELS`, `PREFIX_INFO`, `PREVIEW_TEMPLATES`, and `savedPrefixes` |

## Verification

| Gate | Status |
|------|--------|
| `bun run audit:load` | ✅ Passed — no new warnings introduced (all pre-existing) |
| `bun run typecheck` (targeted) | ✅ Passed — zero errors in modified files |
| `git status` | ✅ Only expected files modified |

**Full `bun run build` skipped per AGENTS.md hardware constraint (4GB RAM).**

## Standard Compliance

| Requirement | Status |
|-------------|--------|
| §1 Definition — receipt is proof-of-payment with complete snapshot | ✅ |
| §3 Types — ReceiptRow has all required fields | ✅ |
| §4 Snapshot — `buildReceiptSnapshot()` captures all data at creation | ✅ |
| §5 Numbering — format `{prefix}-{6-digit serial}`, uses `withUniqueRetry` | ✅ |
| §6 Lifecycle — immutable after save, only status/voided_at/void_reason changeable | ✅ |
| §7 Audit — `RECEIPT_GENERATED` with payment_id in payload | ✅ |
| §8 PDF — dumb renderer, 8 required sections | ✅ |
| §9 Prefix — `'receipt'` key in settings CHECK constraint and UI | ✅ |
| §10 Voiding — status set to 'voided', receipt never deleted | ✅ |

## Risks & Limitations

1. **database.types.ts not regenerated** — `DocumentPrefixes` type in `database.types.ts` doesn't include `receipt` key. Workaround: cast to `DocumentPrefixes` in paymentService. Full type regeneration recommended.
2. **PDF styling minimal** — ReceiptPdf uses basic layout. Visual refinement can be done in a follow-up without changing business logic.
3. **No receipt edit/delete UI** — Per standard, receipts are immutable. No edit/delete buttons should be added.

## Deferred Work

- Full `database.types.ts` regeneration to include `receipt` in `document_prefixes` type
- PDF visual styling enhancements (logo positioning, color themes)
- Receipt list page filtering by status (voided/active)
- Receipt voiding UI flow (currently only `voidReceipt()` repository function exists)
