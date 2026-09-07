# Accounting Foundation Increment 6 — Controlled Remediation Report

This report was written by Buffy on 2026-09-06 via Freebuff.

## Objective

Implement Accounting Foundation Increment 6: a controlled remediation mechanism for missing accounting facts identified by Increment 5 reconciliation.

Remediation must reuse the existing Invoice/Payment accounting adapters and the existing Source Transaction posting kernel. It must never write journals directly, create source transactions outside the established lifecycle, or bulk-repair the approximately 300 pre-cutover historical gaps on the main entity.

## Scope

In scope:
- One controlled mutation boundary: `public.remediate_accounting_gap()`.
- Invoice remediation under the Increment 4A policy.
- Payment remediation under the Increment 4B policy.
- Row-level locking on the authoritative operational record.
- Re-validation under lock before any mutation.
- Idempotent, retry-safe execution.
- Structured remediation results.
- Permission gate using the existing accounting-fact create permission.
- Disposable/test-fixture verification only.

Out of scope:
- Bulk repair of the ~300 real pre-cutover gaps.
- Production approval workflow for historical findings.
- Reconciliation changes; Increment 5 remains read-only.
- VAT, WHT, bank/cash mapping redesign, payment reversal/void accounting, expenses, or tax rules.
- UI, poll endpoint, quarantine table, or second posting path.

## Skills used

supabase, supabase-postgres-best-practices

Documentation standard: ASD-STE100 Simplified Technical English

## Files changed

- `supabase/migrations/20260906140000_accounting_remediation.sql`
- `src/modules/accounting/remediationService.ts`
- `src/tests/critical/remediationContract.test.js`

Scratch scan scripts were created during migration review and removed before completion. They are not part of the deliverable.

## Remediation architecture

The remitter is a single `SECURITY DEFINER` Postgres function:

`public.remediate_accounting_gap(p_entity_id, p_source_type, p_source_id) -> jsonb`

The function re-validates the operational fact from authoritative tables, acquires a row-level lock on that record with `FOR UPDATE`, re-checks qualification and existing accounting state under lock, then runs the existing ingestion/posting lifecycle inside the same transaction scope:

ingest_source_transaction
→ confirm_source_transaction
→ post_from_source_transaction
→ post_accounting_entry

The existing boundary RPCs are procedures that return `jsonb` and do not issue `COMMIT` or `ROLLBACK`, so they inherit the caller's transaction context.

The remitter never:
- inserts into `journal_entries` or `journal_lines` directly
- calls `post_accounting_entry` directly
- creates a source transaction outside the existing ingestion RPC
- create or reopen an accounting period
- modify operational invoice/payment records
- read a quarantine table or poll a status endpoint

## Qualification rules

Invoice remediation is allowed only when all of the following are provable:
- the invoice exists in the current entity schema
- the invoice belongs to the current entity
- the invoice has an authoritative recoverable `total`
- `total` is present and greater than zero
- no existing source transaction exists for that invoice accounting fact
- no existing journal entry already represents that invoice accounting fact
- an open accounting period covers the invoice transaction date
- the existing Increment 4A accounting policy applies

Payment remediation is allowed only when all of the following are provable:
- the payment exists in the current entity schema
- the payment belongs to the current entity
- the payment is not voided
- `cash_amount` is present and greater than zero
- no existing source transaction exists for that payment accounting fact
- no existing journal entry already represents that payment accounting fact
- the payment has an authoritative transaction date
- an open accounting period covers the payment transaction date
- the existing Increment 4B accounting policy applies

If any condition fails, the remitter returns a deterministic non-repair result rather than guessing.

## Chart treatment

Invoice remediation uses the Increment 4A chart exactly:
- debit 1200 Accounts Receivable
- credit 4000 Revenue
- amount equals the exact invoice total as text

Payment remediation uses the Increment 4B chart exactly:
- debit 1100 Bank
- credit 1200 Accounts Receivable
- amount equals the exact payment `cash_amount` as text
- no WHT journal line

## Idempotency and concurrency strategy

Duplicate protection is layered:

- Existing Increment 3 uniqueness on `(source_type, source_id)` on `source_transactions` is the authoritative guard.
- Existing idempotency keys are used on the posting payload.
- Existing journal posting idempotency is reused.
- Row-level `FOR UPDATE` on the invoice or payment row serializes concurrent remediation attempts for the same business fact before any accounting mutation begins.

The remitter also re-checks source transaction and journal existence twice:
- before lock
- under lock after re-reading the operational record

If another process resolves the fact between validation and lock, the remitter returns `ALREADY_RESOLVED` with the existing source transaction id and journal entry id where available.

## Result codes

Remediation returns exactly these structured results:

- `REPAIRED`
- `ALREADY_RESOLVED`
- `BLOCKED_NO_OPEN_PERIOD`
- `NOT_REPAIRABLE`
- `NOT_FOUND`

Where available, the result includes:
- entity id
- source type
- source id
- source transaction id
- journal entry id
- transaction date
- exact amount
- remediator id
- remediator label
- explanation

The remitter never exposes internal database errors as the explanation when a safe deterministic reason is available.

## Historical date handling

Remediation uses the operational transaction date from the authoritative invoice or payment record. It does not use the current date, `now() AT ...`, or `current_timestamp` for the accounting fact. Operational record fields are never altered for accounting convenience.

## Ambiguous and non-repairable findings

Remediation does not repair:
- journal mismatches
- orphaned source transactions
- duplicate accounting facts
- journals without source transactions
- historical records with insufficient authoritative amount or date information
- any transaction whose accounting treatment cannot be established from Increment 4A/4B

These remain detection-only findings in Increment 5. The remitter returns `NOT_REPAIRABLE` with a specific explanation instead of guessing.

## Production safety

Increment 6 has no production remediation lane.

The approximately 300 real pre-cutover invoice and payment accounting gaps on the main entity remain quarantined as reconciliation findings. They are not bulk repaired in this increment. A future increment must define the approval workflow and production backfill authority before any controlled production repair is considered.

Hosted verification, if performed, must use disposable fixtures inside a rolled-back transaction. No production gaps are remediated during verification.

## Tests

The migration contract is verified by 25 focused contract tests in `src/tests/critical/remediationContract.test.js`.

The tests prove:

Result codes
- Exactly five codes exist: `REPAIRED`, `ALREADY_RESOLVED`, `BLOCKED_NO_OPEN_PERIOD`, `NOT_REPAIRABLE`, `NOT_FOUND`.

No new posting path
- The remitter never calls `post_accounting_entry` directly.
- The remitter never inserts journal rows directly.
- The remitter calls `ingest_source_transaction`, `confirm_source_transaction`, and `post_from_source_transaction`.
- No poll endpoint or quarantine table is used.

Row-level lock
- Invoice row is locked with `FOR UPDATE`.
- Payment row is locked with `FOR UPDATE`.
- Qualification is re-validated under lock.

Duplicate protection
- At least two existing source transaction checks exist.
- At least two existing journal entry checks exist.
- `ALREADY_RESOLVED` is returned when another process fixes the fact under lock, with both invoice and payment paths covered and full trace identifiers.

Period block
- `BLOCKED_NO_OPEN_PERIOD` is returned with transaction date, amount, source type, and source id.
- No accounting period is created.
- No closed period is reopened.

Ambiguous findings
- Journal mismatches are not repaired.
- Orphaned source transactions are not remediated.
- Duplicate accounting facts are not auto-repaired.
- `NOT_REPAIRABLE` is returned with the full set of non-repair explanations.

Exact decimal semantics
- Amount is carried as text from `v_amount::text`.
- The result block includes `'amount', v_amount_text`.

Chart correctness
- Invoice remediation uses exactly 1200 and 4000.
- Invoice remediation does not touch 2200 WHT control or 1100 Bank.
- Payment remediation uses exactly 1100 and 1200.
- Payment remediation does not credit 4000 Revenue and does not touch 2200 WHT control.

Historical date preservation
- The remitter uses the operational transaction date.
- It does not use `now() AT ...` or `current_timestamp`.

Entity isolation
- All accessed tables are schema-qualified via `%I`.
- The permission gate is `journal/create`.

Final consistency
- The remitter re-queries the final source transaction and journal under lock.
- It returns `NOT_REPAIRABLE` if no journal entry was created.

## Verification result

- `bun test src/tests/critical/remediationContract.test.js`: passed, 25/25
- `bun run typecheck`: passed
- `bun run audit:load`: passed with no new issues from this increment
- `git diff --check`: passed
- `git status`: only intended files changed
- `bun run build`: skipped due to hardware policy

Hosted live end-to-end verification was not performed in this increment. The ~300 real historical gaps were not remediated. Verification is limited to static migration contract checks and the focused TypeScript contract tests above. Live hosted verification remains a deferred acceptance item for the controlled remediation increment that performs disposable rollback-based testing against the hosted database.

## Risks and limitations

- The remitter is a database mutation boundary. Its safety depends on the existing ingestion and posting RPCs participating correctly in the caller's transaction.
- The remitter can only repair facts that satisfy strict qualification rules. Real-world historical records that fail qualification remain unresolved.
- Hosted verification was not completed in this increment. A future disposable rollback-based run is required before any production remediation path is used, even for individually approved records.
- `journal_lines` are not referenced by the remitter. That is intentional, because journal lines are created by the existing posting kernel, not by remediation.

## Deferred work

- Production approval workflow and backfill authority for historical reconciliation findings.
- Hosted disposable rollback-based verification of remediation end to end.
- Any future VAT, WHT, bank/cash mapping, payment reversal/void, expense, or tax-rule work remains outside Increment 6.

## Confirmation

Increment 6 implements a single controlled remediation boundary that reuses the existing Source Transaction lifecycle and existing posting kernel. It does not introduce a second posting path. It does not directly write journal entries or journal lines. The approximately 300 real pre-cutover accounting gaps remain quarantined as reconciliation findings and were not repaired in this increment.

Increment 6 implementation is complete for the disposable/test-fixture contract. Production remediation is not authorized in this increment.
