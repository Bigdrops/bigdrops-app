# Accounting Foundation Increment 2 Persistence Report

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Implement the persistence layer for the accounting domain kernel. Store accounts, accounting periods, journal entries, and journal lines with tenant isolation, RLS, idempotency, and database-enforced balanced posting. Gate A and Gate B are CLOSED and bound the design.

## Scope

- One migration: accounting tables, enforcement triggers, posting RPC, provisioning registry updates, seed policy, backfill of existing entity schemas.
- One contract test file for the persistence boundary.
- This report.
- Out of scope: ingestion adapters, expenses, fixed assets, tax rules, CIT, compliance, reporting, historical backfill, migration of existing numeric columns.

## Files Changed

- supabase/migrations/20260905142503_accounting_persistence.sql (new).
- src/tests/critical/accountingPersistenceContract.test.js (new).
- docs/Reports/taxation-made-easy/accounting-gate-a-b-decision-2026-09-05.md (relocated from docs/Reports/general/; path references updated).
- docs/Reports/taxation-made-easy/accounting-foundation-increment-2-persistence-2026-09-05.md (this report, new).
- No source file changed. No existing migration changed. No tax table changed.

## Skills Used

Skills used: supabase, supabase-postgres-best-practices, database-schema-designer
Documentation standard: ASD-STE100 Simplified Technical English

## Migration Strategy

- Canonical tables live in tenant_master_template with no RLS and no data. This follows the template rule.
- New entities receive the tables through the existing generic provisioning steps. The migration extends _prov_get_template_tables and _prov_table_to_resource only. Clone, RLS install, FK re-add, and canonical triggers run unchanged.
- provision_entity gains two additive steps: accounting trigger install (9b) and chart seed (13b). The body is otherwise the current tenant-neutral version.
- Existing entity schemas (8 live schemas) received tables, RLS, triggers, grants, seed rows, and owner permission grants through the idempotent backfill block. Each schema runs in an isolated sub-block. One failure warns without stopping the rest.
- The migration applied to the hosted project through supabase db push. Remote history was fully in sync before the push.

## Table and Model Choices

- accounting_accounts: code (UNIQUE), name, type, normal_balance, parent_code (self FK), active flag, audit columns. No entity_id column. Tenant tables use schema placement plus baked RLS as the boundary (verified against invoices and all 32 template tables).
- accounting_periods: code (UNIQUE), state (planned, open, closed, locked), start and end dates with end_date >= start_date, audit columns.
- journal_entries: period_id FK (RESTRICT), transaction and posting dates, source_type and source_id (NOT NULL, non-blank), idempotency_key (UNIQUE per schema, hence per entity), status (draft or posted), reversal_of_entry_id (self FK, RESTRICT), memo, audit columns.
- journal_lines: entry_id FK (CASCADE for draft cleanup), account_id FK (RESTRICT), side plus amount representation, line_no with UNIQUE (entry_id, line_no).
- Line representation is side plus amount. This matches the domain JournalLine contract exactly. It removes the dual-column invariant class (both or neither side positive).
- The reversed lifecycle state is derived, never stored. Storing it would require mutation of the immutable original. A reversal is a new entry with reversal_of_entry_id set.
- No settings_id, workspace_id, user_id, or company-name column exists on any accounting table.

## RLS Strategy

- Standard _prov_install_rls policies per table with resources account, period, and journal. SELECT, INSERT, UPDATE, and DELETE policies check has_entity_permission with the entity id bound at provisioning time.
- RLS is enabled and forced on all four tables in every entity schema (verified live).
- Default permissions now include account, period, and journal with all four actions. This follows the settings precedent. Posted facts stay immutable through row triggers regardless of the coarse grant.
- Existing entity owners received the new resource grants in the backfill.

## Posting Enforcement Strategy

- Primary path: public.post_accounting_entry (SECURITY DEFINER, fixed search path, dynamic schema resolution, journal/create permission gate). It validates header, lines, accounts, kobo amounts, and balance, then inserts the draft header plus lines and flips to posted in one transaction. Any failure aborts all writes.
- Independent guard: row triggers validate every writer. The entry guard blocks all mutation of posted rows and re-validates period state, date bounds, reversal target, and exact balance whenever a row becomes posted. The line guard blocks all writes to lines of posted entries. The period guard enforces planned to open to closed to locked transitions and freezes identity after planned.
- Idempotency: UNIQUE (idempotency_key) per schema plus an RPC pre-check with a duplicate-key error. The same key in different entities cannot collide (separate tables).
- No balance column exists anywhere. Balances always derive from lines.

## Money Contract

- Columns use NUMERIC(18,2) with CHECK (amount >= 0). No FLOAT, REAL, or DOUBLE PRECISION exists in the migration.
- RPC input amounts are kobo text validated by accounting_kobo_amount (regex for non-negative decimals with at most 2 fraction digits). Malformed, negative, and over-precise inputs raise errors. Nothing coerces to zero.
- Exact zero persists as 0.00.
- Display formatting stays separate from stored precision.

## Tests Performed

- New: src/tests/critical/accountingPersistenceContract.test.js (10 tests, all pass). Covers kobo normalization, zero preservation, malformed rejection, seed determinism, SQL seed parity with the domain chart, NUMERIC(18,2) presence, float absence, ownership-key absence in table definitions, enforcement-hook presence, and idempotency and immutability guards.
- Existing: accountingKernel.test.js (15 tests, all pass). Increment 1 behavior is intact.
- Live structure checks against the hosted project: 4 template tables present; all 8 entity schemas hold the tables; 11 seed rows in the main schema; RLS enabled and forced on all 4 tables; 4 standard policies per table; amount column is NUMERIC(18,2); all 7 guard triggers present; all 5 public functions present.
- Live behavior checks: bogus entity id raises schema-not-found before any write; valid entity id without authentication raises insufficient_privilege (42501) before any write; journal_entries count is 0 after both denied calls.
- Full bun run test shows one failure in tenantGate.test.js. That failure is pre-existing and unrelated: it tests domain/tenant gating logic that this increment never touches, and it imports none of the new files.

## Verification Result

- supabase db push: applied 20260905142503 cleanly; remote in sync.
- bun run test (new file): 10 pass, 0 fail.
- bun run test (kernel file): 15 pass, 0 fail.
- bun run audit:load: passed.
- bun run typecheck: passed (exit 0).
- git diff --check: passed.
- bun run build: skipped due to hardware policy.
- Pre-existing stash entry and pre-existing tenantGate failure left untouched.

## Risks and Limitations

- The positive posting path (balanced entry commits; unbalanced entry rolls back; trigger rejects direct writes) is enforced by code that static tests pin but live execution did not exercise. Live execution of a positive posting needs an authenticated user JWT, which this environment lacks. The denied-call checks prove the gate fires before writes. An operator with entity access must run the positive self-test below before the ingestion increment begins.
- Operator self-test (run as an entity member with journal/create rights, in any entity schema): open a period, post a balanced entry through post_accounting_entry, confirm status posted; attempt an unbalanced posting and confirm full rollback; attempt UPDATE and DELETE on the posted entry and confirm rejection; attempt posting into a closed period and confirm rejection.
- Direct SQL inserts with more than 2 decimal places round per Postgres NUMERIC(18,2) semantics. The supported write path (RPC) rejects such input before casting. RLS write policies plus triggers cover correctness; exact input hygiene belongs to the RPC.
- Slug renames change derived schema names. The backfill resolves entities through the current slug join. A future rename mechanism must keep that mapping stable.

## Deferred Work

- Source-transaction model and invoice and payment adapters.
- Journal-derived reporting and balance migration.
- Backfill policy for existing unconstrained numeric columns.
- Settings-scoped tax fact migration plan.
- Chart expansion beyond the 11-account seed.
- Positive-path live posting self-test by an authorized operator.

## Excluded Scope Confirmation

- No invoice or payment ingestion or adapter was implemented.
- No expenses, fixed assets, tax rules, CIT, compliance, bank feeds, multi-currency, payroll, inventory, or consolidation code was added.
- No existing tax table, RLS policy, or operational balance was modified.
- No unrelated refactor was introduced.
