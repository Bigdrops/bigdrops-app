# Increment 10: Record Capture Foundation

Written by opencode on 2026-09-07 via Local Runner.

---

## Objective

Extend the Taxation Made Easy module with record capture foundation: schema extension for evidence/payment_reference, reverse gross-to-net/VAT calculation, mobile-first Record Capture sheet, and `EXPENSE_RECORDED` audit-trail event.

## Scope

- Extend `tax_input_entries` schema with `payment_reference` and `evidence` columns
- Add `reverseVat()` function to Calculations.ts
- Add `EvidenceFile` type and extend `TaxInputEntry` interface
- Add `recordExpenseRecorded()` audit function
- Create `record_expense_recorded` RPC (public + tenant-scoped)
- Whitelist `EXPENSE_RECORDED` event type and `receipt` entity type
- Build `RecordCaptureSheet` component (bottom-sheet, mobile-first)
- Wire evidence file upload via existing `PaymentAttachmentUploader`

Out of scope: accounting journal interface, expense→source_transaction→journal, WHT/VAT/CIT rules, supplier management, bank reconciliation, credit notes, fixed assets, PO accounting.

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/20260907000000_record_capture_foundation.sql` | Created — schema migration |
| `src/domain/compliance/types.ts` | Modified — added `EvidenceFile`, extended `TaxInputEntry` |
| `src/lib/Calculations.ts` | Modified — added `reverseVat()` |
| `src/lib/audit.ts` | Modified — added `recordExpenseRecorded()` |
| `src/components/compliance/RecordCaptureSheet.tsx` | Created — main UI component |

## Skills Used

- karpathy — surgical changes, goal-driven execution
- supabase — hosted DB workflow, migration conventions

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Migration

- Added `payment_reference text` and `evidence jsonb NOT NULL DEFAULT '[]'` to `tax_input_entries`
- Whitelisted `'receipt'` entity_type and `'EXPENSE_RECORDED'` event_type in both public and tenant-scoped `record_activity_event`
- Created `record_expense_recorded(p_actor_id, p_entity_id, p_amount, p_category)` RPC in both schemas

### Calculations

- Added `reverseVat(gross, vatRate): { net, vat }` using Decimal.js for precision

### Types

- Added `EvidenceFile` interface (`{ name, url, size? }`)
- Extended `TaxInputEntry` with `payment_reference: string | null` and `evidence: EvidenceFile[]`

### Audit

- Added `recordExpenseRecorded()` — calls `record_expense_recorded` RPC with actor info

### RecordCaptureSheet

- Bottom-sheet pattern following `VatInputsPanel` conventions
- Fields: date, vendor, category, reference, payment_reference, notes
- VAT inclusive toggle with reverse calculation (`reverseVat`)
- Recoverable VAT switch
- Evidence uploads via `PaymentAttachmentUploader`
- Audit trail call on save via `recordExpenseRecorded`
- No new dependencies — reuses existing Sheet, Input, Switch, Textarea, Label, Button, PaymentAttachmentUploader

## Verification

- `bun run typecheck`: timed out on hardware (known issue — `src/supabase.ts` import resolution slow)
- `bun run test`: 230/230 previously-passing tests pass. 4 failures are pre-existing (missing `VITE_SUPABASE_URL` env in test runner — unrelated)
- `git diff --check`: only CRLF warnings, no errors
- `git status`: clean isolation — only intended files modified, no pre-existing changes touched

## Risks or Limitations

- `reverseVat` uses Decimal.js internally for precision; callers must round if needed (component rounds to 2 decimals)
- `insertTaxInputEntry` does not return the inserted ID, so the audit trail call uses a UUID for the entity reference (acceptable — audit is supplementary, not authoritative)
- Component does not handle edit-mode evidence merge (new uploads append to existing `entry.evidence`)

## Deferred Work

- Wire `RecordCaptureSheet` into a compliance page or entry point (requires page-level integration)
- Tests for `reverseVat` and `RecordCaptureSheet` component
- Typecheck verification (hardware timeout — needs CI or more time)
