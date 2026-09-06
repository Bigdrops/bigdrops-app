# Accounting Foundation Increment 3 Implementation Report

This report was written by opencode on 2026-09-06 via Local Runner.

## Objective

Implement Accounting Foundation Increment 3: Source Transaction Model + Controlled Ingestion Boundary. Establish the source transaction layer between Record Engagement and the Posting Kernel. Source transactions are recorded business facts with lifecycle state. They carry provenance and feed the journal entry pipeline.

## Scope

In scope:

- Create `supabase/migrations/20260906103000_source_transactions.sql` — canonical table, lifecycle guard trigger, ingestion RPC, confirmation RPC, posting boundary RPC, provisioning registry updates, backfill.
- Create `src/domain/accounting/sourceTransactions.ts` — domain types for source transactions.
- Create `src/modules/accounting/sourceTransactionService.ts` — service layer (ingestion, confirmation, listing).
- Create `src/tests/critical/sourceTransactionContract.test.js` — 32 focused tests.

Out of scope (Increment 4+):

- Invoice integration
- Payment integration
- Expense capture
- Source transaction UI
- Reversal semantics on source transactions

## Files changed

| File | Change |
| :--- | :--- |
| `supabase/migrations/20260906103000_source_transactions.sql` | Created. Migration: table, triggers, RPCs, backfill, registry. |
| `src/domain/accounting/sourceTransactions.ts` | Created. Domain types: SourceTransaction, IngestResult, ConfirmResult. |
| `src/modules/accounting/sourceTransactionService.ts` | Created. Service layer: ingest, confirm, list, get. |
| `src/tests/critical/sourceTransactionContract.test.js` | Created. 32 tests: validation + migration contract. |

No other file was modified by this task.

## Skills used

NONE

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Migration (20260906103000_source_transactions.sql)

1. **Canonical table**: `source_transactions` in `tenant_master_template` with `id uuid`, `source_type text`, `source_id text`, `transaction_date date`, `amount NUMERIC(18,2)`, `currency_code text`, `counterparty_type text`, `counterparty_name text`, `source_document_ref text`, `evidence_refs jsonb`, `lifecycle_status text`, `idempotency_key text`, `rejection_reason text`, `memo text`. Unique constraint on `idempotency_key`. Indexes on `source_type + source_id`, `lifecycle_status`, `transaction_date`.

2. **Lifecycle guard trigger**: `source_transaction_guard()` enforces state machine: captured → confirmed → posted (terminal) or captured → rejected (terminal). posted and rejected are terminal. No regression allowed.

3. **Ingestion RPC**: `ingest_source_transaction()` — SECURITY DEFINER. Validates entity permission (`journal/create`). Client-side pre-validation mirrors RPC checks. Idempotent: `source_type + source_id` pair is unique. Returns `{ id, status, idempotent, message }`.

4. **Confirmation RPC**: `confirm_source_transaction()` — SECURITY DEFINER. Validates permission. Delegates to the trigger for state machine validation. Returns `{ id, status, message }`.

5. **Posting boundary RPC**: `post_from_source_transaction()` — SECURITY DEFINER. Requires confirmed source transaction. Delegates to existing `post_accounting_entry()`. Marks source transaction as posted atomically.

6. **Provisioning registry**: Added `source_transactions` to `_prov_get_template_tables()`, `_prov_table_to_resource()` (maps to `source_transaction`), `_prov_seed_default_permissions()` (new resource). Updated `provision_entity()` to install source transaction triggers.

7. **Backfill**: All existing entity schemas get the `source_transactions` table, RLS, triggers, and permissions.

### Domain types (sourceTransactions.ts)

Schema-free types: `SourceTransactionLifecycle`, `SourceTransaction`, `IngestResult`, `ConfirmResult`. Amounts are exact decimal strings (Decimal.js boundary). No persistence knowledge.

### Service layer (sourceTransactionService.ts)

Persistence types: `SourceTransactionRow` (snake_case). Input type: `IngestSourceTransactionInput`. Functions: `validateSourceTransactionInput()` (client-side pre-validation), `ingestSourceTransaction()`, `confirmSourceTransaction()`, `listSourceTransactions()`, `getSourceTransaction()`.

### Tests (sourceTransactionContract.test.js)

32 tests covering:
- Client-side validation: valid input, empty source_type, empty source_id, empty transaction_date, empty amount, non-numeric amount, negative amount, zero amount, >2 decimals, integer amount, 1-decimal amount.
- Migration contract: table creation, NUMERIC(18,2), lifecycle states, idempotency unique constraint, source_type + source_id check, evidence_refs jsonb, no float storage, no ownership keys, lifecycle guard trigger, all three RPCs, entity permission gate, template tables registration, resource map, default permissions, provision_entity integration, backfill, table grants, GRANT to anon/authenticated/service_role, PostgREST schema reload.

## Verification

- `bun run audit:load` — passed (no new issues)
- `bun run typecheck` — passed (clean)
- `bunx vitest run src/tests/critical/sourceTransactionContract.test.js` — 32/32 pass
- `bunx vitest run src/tests/critical/accountingPersistenceContract.test.js` — 10/10 pass (regression check)
- `git diff --check` — clean

## Risks and limitations

- Live database verification (`bunx supabase db reset`) not performed in this environment. Migration must be verified against the hosted project.
- No UI component for source transactions. The boundary is service-layer only.
- Reversal semantics on source transactions are deferred to Increment 4+.

## Deferred work

- Invoice integration (Increment 4)
- Payment integration (Increment 4)
- Expense capture (Increment 4)
- Source transaction UI
- Reversal semantics
