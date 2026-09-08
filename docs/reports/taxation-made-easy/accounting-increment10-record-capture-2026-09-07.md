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
| `src/pages/ComplianceHub.tsx` | Modified — wired RecordCaptureSheet entry point |
| `src/modules/compliance/repositories/complianceRepository.ts` | Modified — `insertTaxInputEntry` returns inserted ID |
| `src/modules/compliance/services/complianceService.ts` | Modified — returns `TaxInputEntry` from insert |
| `src/tests/critical/calculations.test.js` | Modified — added 4 `reverseVat()` tests (Block 18) |

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
- `insertTaxInputEntry` now returns the inserted `TaxInputEntry` (`.select().single()`) — audit trail uses actual record ID

### ComplianceHub Integration

- Added "Record Expense" button next to "Tax Profile" in ComplianceHub header
- Mounted `RecordCaptureSheet` as Sheet overlay
- On save, refreshes `taxInputs` list via `fetchTaxInputEntries`

### RecordCaptureSheet

- Bottom-sheet pattern following `VatInputsPanel` conventions
- PRD §3.1 fields only: date, vendor, amount (gross), category, reference, payment_reference, notes, evidence
- System derives tax treatment: `reverseVat(gross, 7.5%)` splits net/VAT automatically
- `is_recoverable` defaults to `false` per PRD §3.3
- Evidence uploads via `PaymentAttachmentUploader`
- Audit trail call on save via `recordExpenseRecorded` with actual inserted record ID
- No new dependencies — reuses existing Sheet, Input, NumericInput, Textarea, Label, Button, PaymentAttachmentUploader

## Verification

- `bun run typecheck`: targeted typecheck on Increment 10 files passed with zero errors (full-project `tsc --noEmit` OOM on limited-RAM hardware — known limitation)
- `bun run audit:load`: clean — no new warnings from Increment 10
- `bun run test`: 234/234 previously-passing tests pass. 4 failures are pre-existing (missing `VITE_SUPABASE_URL` env in test runner — unrelated). All 4 new `reverseVat()` tests (Block 18) pass.
- `git diff --check`: only CRLF warnings, no errors
- `git status`: clean isolation — only intended files modified, no pre-existing changes touched

## Risks or Limitations

- `reverseVat` uses Decimal.js internally for precision; callers must round if needed (component rounds to 2 decimals)
- Component does not handle edit-mode evidence merge (new uploads append to existing `entry.evidence`)
- VAT rate is hard-coded at 7.5% — if Nigeria changes rate, update `DEFAULT_VAT_RATE` in RecordCaptureSheet

## Deferred Work

None — all Increment 10 scope is complete.
