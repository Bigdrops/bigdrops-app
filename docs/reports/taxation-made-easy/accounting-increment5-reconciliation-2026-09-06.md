# Accounting Foundation Increment 5 — Reconciliation and Integrity Report

This report was written by Buffy on 2026-09-06 via Freebuff.

Skills used: karpathy, supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Implement Accounting Foundation Increment 5: Reconciliation and Integrity. Detect provable mismatches between operational business facts, source transactions, and journal entries. Reconciliation is detection-only. It never creates, modifies, deletes, reverses, or repairs accounting state.

## Reconciliation architecture

- One read-only Postgres function: `public.reconcile_accounting_integrity(p_entity_id uuid)` returns `jsonb`.
- One TypeScript domain module: `src/domain/accounting/reconciliation.ts` (types, finding-type whitelist, report shape).
- One TypeScript service: `src/modules/accounting/reconciliationService.ts` (thin RPC wrapper; drops unknown finding types as defense in depth).
- One migration: `supabase/migrations/20260906130000_accounting_reconciliation.sql`.
- Tests: `src/tests/critical/reconciliationIntegrity.test.js` (22 focused tests).

The function resolves the entity schema through the existing `public._prov_get_schema_name`, gates on `has_entity_permission(..., 'journal', 'view')`, and accumulates findings in a `jsonb` array. It contains no `INSERT`, `UPDATE`, or `DELETE` statements. A test scans the comment-stripped migration text to prove this.

## Authoritative relationships used

| Relationship | Source of authority |
|---|---|
| ST → operational record | `source_transactions (source_type, source_id)`; `source_id` is the operational row id |
| JE → ST / operational fact | `journal_entries (source_type, source_id)`; the kernel persists the posting payload values |
| Uniqueness | `idempotency_key` is UNIQUE on both tables; `(source_type, source_id)` is not, so duplicates are provable |
| Balance | `journal_lines` NUMERIC sums per side |

No formal foreign key exists between source transactions and journal entries, and none was added. The kernel-persisted `(source_type, source_id)` pair is the established relationship mechanism; introducing a second one for reconciliation was unnecessary.

Provable limitation (documented, not worked around): a posted ST and a journal entry for the same source fact cannot be paired row-to-row without an id reference, so `MISSING_JOURNAL` proves "no journal exists for a posted fact" and `JOURNAL_MISMATCH` proves "the journal for this fact is unbalanced". Row-level pairing would need a schema change, which this increment does not make.

## Qualification rules (no invented expectations)

- Invoice expects accounting when `status NOT IN ('cancelled', 'voided', 'archived')`.
- Payment expects accounting when `voided_at IS NULL AND cash_amount > 0` (4B posts cash only).
- No check branches on specific invoice status values, so operational status changes between accounting-qualified states never create findings.

## Finding types

All seven required types, explicit and whitelisted: `MISSING_SOURCE_TRANSACTION`, `SOURCE_TRANSACTION_CAPTURED`, `SOURCE_TRANSACTION_CONFIRMED`, `ORPHANED_SOURCE_TRANSACTION`, `MISSING_JOURNAL`, `JOURNAL_MISMATCH`, `DUPLICATE_ACCOUNTING_FACT`.

Each finding carries: deterministic `finding_id` (type + source identity + row id where applicable; doubles as the deduplication identity), `entity_id`, `category`, `source_type`, `source_id`, `source_transaction_id`, `journal_entry_id`, `finding_type`, `severity` (`warning`/`error`), human-readable `explanation`, `transaction_date`, `amount`, and `actionable`.

`MISSING_SOURCE_TRANSACTION` fires in three categories: invoice fact, payment fact, and journal entry without any source transaction (boundary bypass, e.g. the known batch/pre-cutover gap). The bypass category is `actionable: false` because repair policy is out of scope.

## Invoice checks

- Posted ST + balanced journal → healthy, no finding.
- Qualified invoice with no ST → `MISSING_SOURCE_TRANSACTION`.
- ST captured → `SOURCE_TRANSACTION_CAPTURED`. ST confirmed → `SOURCE_TRANSACTION_CONFIRMED`.
- Orphaned ST (invoice row gone) → `ORPHANED_SOURCE_TRANSACTION`.
- Duplicate STs for one invoice → `DUPLICATE_ACCOUNTING_FACT` (source side).
- Status changes alone produce no findings.

## Payment checks

- Same lifecycle coverage as invoices.
- Duplicate detection groups by per-payment `source_id`, so multiple legitimate payments against one invoice are never duplicates of each other.
- Voided and zero-cash payments produce no findings.

## Journal/source checks

- Posted ST with no journal entry → `MISSING_JOURNAL`.
- Journal entry for a posted ST with unequal NUMERIC debit/credit sums → `JOURNAL_MISMATCH`.
- Entry status never gates health: the kernel inserts entries as `draft` and never transitions them, so a test asserts no `je.status` reference exists.
- Duplicate journal entries per source fact → `DUPLICATE_ACCOUNTING_FACT` (journal side).

## Exact monetary comparison strategy

- Balance checks compare `NUMERIC` sums inside Postgres (`SUM ... FILTER`), never JavaScript numbers.
- Amounts cross the boundary as exact text (`i.total::text`, `st.amount::text`, sums `::text`).

## Entity isolation

- All queries run inside the resolved entity schema (`%I` qualification; a test proves no bare table references).
- No `settings_id`, workspace, user, client, or schema-text ownership.
- Hosted isolation probe: a second provisioned entity's report contained zero findings belonging to another entity.

## Zero-mutation guarantees

- No INSERT/UPDATE/DELETE statements (proven by test on comment-stripped SQL).
- No calls to `post_accounting_entry`, `post_from_source_transaction`, `ingest_source_transaction`, `confirm_source_transaction`, or `record_payment_transaction` (proven by test).
- Service only calls the read-only RPC (no table access, no insert/update/delete calls; proven by test).
- Hosted: source-transaction and journal-entry counts identical before and after reconciliation runs.

## Files changed

- `supabase/migrations/20260906130000_accounting_reconciliation.sql` (new)
- `src/domain/accounting/reconciliation.ts` (new)
- `src/modules/accounting/reconciliationService.ts` (new)
- `src/tests/critical/reconciliationIntegrity.test.js` (new)

No existing source files were modified.

## Verification result

```
Verification:
- bun run audit:load: passed (exit 0)
- bun run typecheck: passed (exit 0)
- bun test src/tests/critical/reconciliationIntegrity.test.js: 22 pass, 0 fail
- bun test src/tests/critical/: 329 pass, 0 fail across 26 files (includes Increment 2, 3, 4A, 4B suites)
- git diff --check: passed
- git status: only intended files changed; other agents' workstreams untouched
- bun run build: skipped due to hardware policy
```

## Hosted verification (performed)

Migration applied to hosted (`supabase db push`; function confirmed via `pg_proc`). Live verification ran as one rolled-back transaction with disposable fixtures on entity `main`: 19 of 19 checks pass.

Key evidence:

| Proof | Result |
|---|---|
| Zero mutations: ST count 8 → 8, JE count 5 → 5 across two runs | pass |
| Determinism: two runs produce byte-identical findings arrays | pass (307 = 307) |
| All 7 finding types present; every `finding_id` unique | pass |
| Healthy invoice (full real path) produces no finding | pass |
| Missing-ST invoice, missing-ST payment, captured ST, confirmed ST, posted-without-journal, unbalanced fixture JE, orphaned ST, source-side duplicate, journal-side duplicate, 2x boundary bypass | all detected exactly once each |
| Multiple payments on one invoice never flagged as duplicates | pass |
| Exact decimal amounts carried as text (`70.00`) | pass |
| Entity isolation on a second provisioned entity: 0 leaks | pass |

Notable live findings:

1. Reconciliation found ~300 real pre-cutover invoices/payments on `main` with no source transactions — the known documented bypass gap. Detection worked as designed; no repair was performed.
2. The Increment 3 ingest RPC refuses a second source transaction for the same `(source_type, source_id)`. Source-side duplicates therefore cannot arise through the boundary; the duplicate backstop fires only on out-of-band writes. The fixture proved this by direct insert.
3. The `accounting_entry_guard` trigger prevents inserting a `posted` journal entry without lines. Fixtures used `draft` status, which is also the kernel's steady state.

Script corrections during verification (test-side only, no system defects): fixture JE status, the isolation probe now selects only fully provisioned entities (some legacy schemas lack operational tables), and a missing `format()` argument in the orphan check — repaired via `supabase migration repair --status reverted` plus re-push, then re-verified.

Post-run residue: zero. 0 test invoices, 0 test payments, 0 source transactions, journal entries unchanged (only the pre-existing Increment 2 entry remains).

## Confirmation: no mutations

Reconciliation performed no accounting mutations at any point: static proof (tests), live proof (identical row counts before/after), and architectural proof (the function contains no data-modifying statements). It never calls the posting kernel and never creates source transactions.

## Limitations

- ST-to-JE pairing is fact-level, not row-level (no FK exists; adding one is out of scope).
- Posted-but-draft journal entries (kernel steady state) are considered healthy; entry status lifecycle is not reconciled because the kernel never transitions it.
- The `main` entity's pre-cutover bypass gaps are now visible as findings. Repair policy for them is a separate controlled increment.

## Deferred work

- Repair workflows for actionable findings (capture/post of stalled source transactions, legacy-gap remediation).
- Reconciliation UI or reporting surface (none built, per scope).
- WHT, VAT, Bank/Cash mapping, payment reversal accounting (unchanged from Increments 4A/4B).
