# Accounting Foundation Increment 4A — Invoice to Source Transaction Integration Report

This report was written by Buffy on 2026-09-06 via Freebuff.

## Objective

Implement Accounting Foundation Increment 4A: connect the existing Invoice lifecycle to the Increment 3 source transaction boundary, without bypassing the Increment 2 accounting posting kernel.

Path proven: invoice created → `ingest_source_transaction()` → `confirm_source_transaction()` → `post_from_source_transaction()` → `post_accounting_entry()` → immutable journal.

Skills used: karpathy, supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Selected Invoice Accounting Event

Event: first creation of an invoice.

Evidence for the selection:

- The persisted invoice status vocabulary is `unpaid | partially_paid | paid | cancelled | voided | archived`. There is no draft state. `unpaid` is the default operational state for every saved invoice.
- Status values are operational and mutable. The invoice form saves every document as `unpaid` (`InvoiceFormPage.tsx` lines 411, 486–488). Payments overwrite status through `syncInvoiceStatusFromFinancials`. Batch actions write `status: 'paid'` and `status: 'unpaid'` directly (`BatchActionFooter.tsx` lines 105–125). No single status change is authoritative.
- Money facts are immutable by comparison. An invoice total is a user-confirmed claim amount. `changeInvoiceStatus` guards prohibit status changes back to unpaid after money moves. The payment aggregates in `financialState.ts` derive from money events, never the reverse.
- The blueprint defines the boundary: "Invoice or document activity does not automatically equal accounting revenue. An invoice is a claim" (Accounting-foundation-blueprint-v1.md section 12). The narrowest authoritative claim event is creation.

Scope decision: only the composite RPC creation branch (`entityId && isCreate` in `save_invoice_with_items_transaction`) triggers the event. The pre-cutover sequential insert fallback does not trigger it, because entity scoping is required for the accounting boundary.

## Files Changed

| File | Change |
| --- | --- |
| `src/modules/invoices/services/invoiceAccountingService.ts` | New. The invoice accounting adapter. |
| `src/hooks/useInvoiceSave.ts` | One scoped block in the create branch. Dispatches the event after a successful composite save. Best-effort. |
| `supabase/migrations/20260906120000_invoice_accounting_adapter.sql` | New. Repairs the `post_from_source_transaction` defect. |
| `src/tests/critical/invoiceAccountingIntegration.test.js` | New. 21 focused contract tests. |

No other files were modified by this increment. Other modified files in the working tree belong to a separate PDF-customize workstream from a concurrent agent.

## Source Transaction Integration Path

1. Invoice save succeeds through `save_invoice_with_items_transaction` (create mode).
2. `syncInvoiceAccountingEvent` builds the ingest payload: `source_type = 'invoice'`, `source_id = invoice id`, exact kobo amount from the invoice total via Decimal.js ROUND_HALF_UP, `counterparty_type = 'customer'`, `source_document_ref = invoice_number`.
3. `ingest_source_transaction` captures the fact with `lifecycle_status = 'captured'`.
4. `confirm_source_transaction` transitions captured → confirmed.
5. `resolveOpenPeriod` finds the open accounting period covering the invoice date. With no open period, the adapter stops after confirmation and records the reason. It never creates periods.
6. `post_from_source_transaction` posts the claim entry and flips confirmed → posted. The guard trigger enforces the state machine. Posted is terminal.
7. `post_accounting_entry` (Increment 2 kernel) validates balance, period, accounts, and writes `journal_entries` and `journal_lines`.

Idempotency: re-running the same invoice creation ingest returns the existing source transaction (`source_type + source_id` check). The journal entry idempotency key is `invoice:<id>:post`. The kernel raises `23505` on duplicate keys, so one invoice posts at most once.

Failure policy: the event is best-effort. Any failure is logged with the `[invoice-accounting]` prefix and never blocks or breaks invoice creation. This preserves the rule that unposted invoices are valid (blueprint section 6).

## Account Mapping Used

- Debit `1200` Accounts Receivable, credit `4000` Revenue, equal amounts, invoice total.
- Both accounts exist in the seeded 11-account chart (Increment 2, `_prov_seed_chart_of_accounts`), which mirrors `SEED_ACCOUNT_GROUPS` in `src/domain/accounting/chartOfAccounts.ts`.
- WHT excluded: the invoice `wht` column is an estimate, not a settled tax fact.
- VAT excluded: mapping invoice VAT to `2100` VAT Control would assert a statutory treatment that no authoritative code or documentation establishes.

## RPC Repair (Required for This Integration)

Increment 3 wrote `SELECT public.post_accounting_entry(...) INTO v_entry_id` where `v_entry_id` is `uuid`, but `post_accounting_entry` returns `jsonb`. The first call would raise `invalid input syntax for type uuid`. Increment 3 shipped this RPC without a caller, so the defect was latent. Increment 4A is the first caller.

The repair migration preserves the signature, permission gate (`has_entity_permission` `journal`/`create`), confirmation gate, terminal posted flip, and return shape. It captures the kernel jsonb, extracts `id`, and reloads the PostgREST cache. No second posting path exists.

## Verification Result

```
bun run audit:load: passed (exit 0; remaining warnings are pre-existing, in files not touched by this increment)
bun run typecheck: passed (exit 0)
bun test src/tests/critical/: 281 pass, 0 fail across 24 files (includes the 21 new tests, the 32 Increment 3 contract tests, and the Increment 2 persistence contract)
git diff --check: passed (exit 0)
git status: only intended files added; pre-existing staged Session-memories changes and the concurrent agent's modified files untouched
bun run build: skipped due to hardware policy
```

Test coverage proves: only creation triggers the event; the update branch contains no accounting dispatch; the adapter calls only `ingest_source_transaction`, `confirm_source_transaction`, and `post_from_source_transaction`; the adapter never writes `journal_entries` or `journal_lines`; the claim posting balances with exact decimal amounts; idempotency keys are deterministic; the repaired RPC keeps the confirmation gate and delegates to the kernel.

Live hosted database verification was not performed in this environment. Migration application (`supabase db push`) and a live end-to-end posting remain outstanding steps.

## Unresolved Accounting and Tax Decisions

1. VAT accounting treatment: not implemented. Requires an explicit accounting policy decision.
2. WHT accounting treatment: not implemented. WHT on invoices is an estimate until payment; settled WHT belongs to the payment integration increment.
3. Batch status overrides (`BatchActionFooter` mark paid/unpaid) and the pre-cutover insert fallback write invoices without the accounting event. Documented as a bypass. Payment integration must reconcile this in a later increment.
4. Invoice cancellation after posting leaves the claim posted with no reversal. Increment 3 defers source-transaction reversal semantics. Documented as an accounting gap for a later increment. No reversal behavior was invented here.
5. Recognition policy remains a v1 default (claim at creation). A later accounting-layer decision may re-date or re-shape it.

## No Direct Journal-Writing Path

Confirmed: no invoice code writes to `journal_entries` or `journal_lines`. The adapter calls three RPCs only, and every posting decision stays inside `post_accounting_entry`. The contract tests pin this boundary.

## Deferred Work

- Apply migration `20260906120000_invoice_accounting_adapter.sql` to the hosted project.
- Live verification of one posting end to end.
- Payment integration (Increment 4B or later).
- Reversal semantics for source transactions.
