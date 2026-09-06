# Accounting Foundation Increment 4B — Payment to Source Transaction Integration Report

This report was written by Buffy on 2026-09-06 via Freebuff.

Skills used: karpathy, supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Implement Accounting Foundation Increment 4B: connect the invoice Payment lifecycle to the Increment 3 source transaction boundary and the Increment 2 posting kernel. Payment settles the receivable created by Increment 4A. Payment never recognizes invoice revenue a second time.

## Scope

- Payment accounting adapter (new module).
- One wire-in to the authoritative payment event.
- Focused contract tests.
- Live hosted end-to-end verification with disposable data.

Out of scope, per the task: VAT accounting, WHT journal treatment, expenses, reconciliation, source-transaction UI, reversal semantics, and the known batch/pre-cutover bypasses.

## Authoritative payment event

The event is a successful entity-aware payment record:

- `recordInvoicePayment` in `src/modules/invoices/services/paymentService.ts` calls the `record_payment_transaction` RPC when `entityId` is present. The RPC is atomic, entity-scoped, and permission-gated (`payment/create`).
- The RPC returns the payment id. This id is the accounting fact identity.
- All payment flows funnel through `InvoiceRecordPaymentSheet` → `recordInvoicePayment`. No other code calls `record_payment_transaction`.
- Invoice status changes (`paid`, `partially_paid`) are downstream effects of payments. They are not accounting events. No posting is wired to status changes.
- The legacy fallback path (no `entityId`) has no entity context. It is not wired. This mirrors the Increment 4A decision for its own pre-cutover path.

## Payment amount source

- The payment model stores `amount = cash_amount + wht_amount`.
- The settlement amount is `cash_amount` only: the money the business actually received.
- `amount` (gross) never settles receivable. A payment with WHT posts only its cash part.

## Bank/Cash account mapping

- `bank_account_id` on a payment points to the operational `bank_accounts` table. That table has no accounting-chart link.
- No authoritative mapping from payment method or bank account to chart account exists.
- The adapter therefore uses the v1 default debit account `1100 Bank` for every method. The seed chart has `1000 Cash` and `1100 Bank`. No new account model was invented.
- Missing decision (recorded, not invented): per-method or per-bank-account mapping to `1000`/`1100` needs an explicit business rule before it can be wired.

## Source Transaction path

```
recordInvoicePayment (entity-aware RPC success)
→ ingest_source_transaction()   source_type 'payment', source_id = payment id
→ confirm_source_transaction()
→ post_from_source_transaction()
→ post_accounting_entry()       (Increment 2 kernel, unchanged)
→ journal_entries / journal_lines
```

- Provenance: `source_type = 'payment'`, `source_id = payment id`.
- Idempotency keys: `payment:<payment_id>:ingest` and `payment:<payment_id>:post`. They mirror the database derivation.
- Multiple payments against one invoice get distinct keys. They are never duplicates of each other.

## A/R settlement logic

- Debit `1100 Bank` = credit `1200 Accounts Receivable` = exact `cash_amount`.
- Payment never credits `4000 Revenue`. The claim was recognized at invoice creation (Increment 4A policy).
- Partial payments post only the actual cash received. A 2500.00 payment against a 12500.50 invoice settles 2500.00 of receivable.
- Payment amount is normalized with the shared exact-decimal helper (`toKoboString`, Decimal.js, ROUND_HALF_UP, 2 decimals). No floating-point accounting.
- Zero, negative, missing, or malformed cash amounts produce no accounting event.
- Voided payments (`voided_at` set) produce no accounting event.

## Idempotency strategy

- Ingest is idempotent by `idempotency_key` (unique constraint). Re-delivery returns the existing row.
- Posting is idempotent by the kernel's journal idempotency key (`23505` on duplicate) plus the posted source transaction terminal guard.
- The same payment can never create a second journal entry.

## WHT/VAT treatment

- WHT at payment time is a settled fact (`wht_amount`), but no authoritative journal treatment exists. WHT is excluded from the settlement journal and recorded here as an unresolved decision.
- VAT is not part of the payment model. Nothing was inferred.
- Tests assert no payment entry touches `2200 WHT Control` or `4000 Revenue`.

## Files changed

- `src/modules/invoices/services/paymentAccountingService.ts` (new): the payment accounting adapter. Builders for amount, ingest payload, and settlement posting; void check; full best-effort sync through the controlled boundary. Reuses the Increment 4A `resolveOpenPeriod`. Payment code writes no journal rows.
- `src/modules/invoices/services/paymentService.ts` (one block): dispatches the accounting event after the entity-aware RPC returns the payment id. Best-effort, wrapped in try/catch; never blocks payment recording. No other behavior changed.
- `src/tests/critical/paymentAccountingIntegration.test.js` (new): 22 focused contract tests.

## Changes made

- The adapter exposes pure builders plus one sync function, mirroring the Increment 4A adapter structure.
- The sync function runs ingest → confirm → period resolution → post. With no open period it leaves the source transaction captured and records the reason. It never creates periods.
- The wire-in passes `{ ...payload, id: paymentId }` because the normalized payload has no id; the RPC result supplies it.
- The legacy fallback path and all status-change paths remain unwired.

## Live hosted verification

Pattern: single transaction, simulated JWT for the real permission gates, disposable data, full `ROLLBACK`. Hosted project `xqlpekpkbszpdgtuwybh`, entity `main`, script `supabase/.temp/increment4b_live_verify.sql`.

Result: 19 of 19 checks pass.

| Proof | Result |
|---|---|
| Invoice created; 4A claim posted first (path intact) | posted |
| Payment 1 via real `record_payment_transaction` (cash 2500 + WHT 500) | payment id returned, status `partially_paid` |
| Ingest with cash amount only | captured; source amount `2500.00`, never `3000.00` |
| Re-ingest | idempotent, same id |
| Confirm before posting | confirmed |
| Second payment (1000, same invoice) posts independently | posted, not a duplicate |
| Captured source cannot post | blocked (`25001`) |
| Post reaches kernel | posted, journal entry id returned |
| Kernel duplicate-key backstop | `duplicate idempotency key: payment:<id>:post` (`23505`) |
| Posted source terminal | immutable |
| Payment 1 entry balanced | debits = credits = `2500.00` |
| Lines only `1100` debit / `1200` credit | no revenue, no WHT lines |
| One journal entry and one source row per payment | 1 and 1 |
| A/R balance after partial settlements | `12500.50 − 2500 − 1000 = 9000.50` |
| Negative control payment stays captured | captured, 0 entries |
| No payment entry anywhere recognizes revenue | 0 |

Post-run residue: zero. 0 test invoices, 0 payment source transactions, 0 payment journal entries. Only the pre-existing Increment 2 journal entry remains.

Note: one probe needed two script corrections before the run went clean (entity-schema-qualified RPC name; `format()` literal arguments). One expected-value constant in the script was wrong (arithmetic), corrected to `9000.50`. No system defect was found. The final run was clean end to end.

## Verification result

```
Verification:
- bun run audit:load: passed (exit 0)
- bun run typecheck: passed (exit 0)
- bun test src/tests/critical/paymentAccountingIntegration.test.js: 22 pass, 0 fail
- bun test src/tests/critical/: 307 pass, 0 fail across 25 files (includes Increment 2, 3, and 4A suites)
- Live hosted end-to-end verification: 19/19 checks pass, full rollback, zero residue
- git diff --check: passed
- git status: only intended files changed; concurrent PDF-customize workstream files untouched
- bun run build: skipped due to hardware policy
```

## Confirmation of boundary integrity

- Payment code never writes `journal_entries` or `journal_lines` directly. Tests assert this on the adapter source.
- `post_accounting_entry()` remains the sole posting kernel. The adapter calls only `post_from_source_transaction()`. Tests assert this.
- No second journal-posting mechanism was introduced.
- Entity isolation is preserved: all RPCs take `p_entity_id`; no `settings_id`, workspace, user, client, or schema-text ownership.

## Unresolved accounting decisions

1. Bank/Cash mapping: which payments debit `1000 Cash` versus `1100 Bank`, and whether `bank_account_id` should map to specific chart accounts. Needs an explicit business rule.
2. WHT journal treatment: `wht_amount` is a settled fact at payment time with no authoritative posting rule. Currently excluded from the journal.
3. Voided payments after posting: void currently excludes new events only. Ledger reversal for an already-posted payment is undefined and deferred.
4. Legacy fallback path (no entity context): unwired, like Increment 4A's pre-cutover path.

## Risks or limitations

- The wire-in posts at payment-record time with the payment date. If the entity has no open period covering that date, the source transaction stays captured and the posting is skipped with a logged reason. A later capture/post flow for these rows is future work.
- Live verification ran with a simulated JWT context in a privileged session (established project pattern). It exercised the real permission gates and RPC logic, but not browser-session RLS.
- The report evidence relies on the printed verification output. Disposable data was rolled back by design.

## Deferred work

- Bank/Cash mapping decision and wiring.
- WHT accounting increment.
- Payment void/reversal semantics.
- Reconciliation and Record Engagement functionality.
- Batch/pre-cutover invoice accounting bypasses (documented in Increment 4A).
