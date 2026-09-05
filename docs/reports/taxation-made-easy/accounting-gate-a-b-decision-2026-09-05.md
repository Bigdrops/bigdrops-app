# Accounting Gate A and Gate B Decision Record

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Close Gate A (authoritative accounting entity boundary) and finalize the persistence-side portion of Gate B (accounting money precision and storage contract). This task creates no accounting schema, migration, RLS policy, RPC, service, adapter, or UI change.

## Scope

- Repository evidence: multi-tenancy migrations, provisioning engine, tenant template, tax tables, invoice and payment paths.
- Blueprint: Accounting-foundation-blueprint-v1.md, sections 9 and 18.
- Baseline: accounting-foundation-implementation-audit-2026-09-05.md.
- Domain kernel: src/domain/accounting/ (unchanged).
- Out of scope: schema DDL, RLS implementation, ingestion adapters, tax rules, statutory values.

## Files Changed

- docs/Reports/taxation-made-easy/accounting-gate-a-b-decision-2026-09-05.md (this report, new file).
- No source file changed. No migration changed.

## Skills Used

Skills used: supabase, supabase-postgres-best-practices, database-schema-designer
Documentation standard: ASD-STE100 Simplified Technical English

## Gate A Decision: CLOSED

Status: CLOSED. Accounting books are entity-scoped. The authoritative identifier is public.entities.id (uuid).

### Evidence

- public.entities is the authoritative business identity. Columns: id (uuid PK), workspace_id (FK to public.workspaces), slug (unique per workspace), display_name, entity_type, is_active. Source: 20260714000000_multi_tenancy_core.sql.
- Workspaces own entities. Workspace members own access. Entity permissions grant per-entity, per-resource, per-action rights. Cross-entity access requires an explicit permission row. Source: multi-tenancy core and RLS migrations.
- The tenant schema is physical isolation, not identity. The provisioning engine derives the schema name as entity_<workspace_slug>_<entity_slug> from public.entities and public.workspaces. No table stores the schema name as a foreign key. Source: 20260717000000_entity_provisioning_engine.sql (_prov_get_schema_name).
- Settings is configuration, not ownership. Each entity schema holds one singleton settings row with id = 1. Provisioning seeds it from public.entities.display_name. Source: 20260809000000_provisioning_settings_seed.sql.
- Legacy tax tables (tax_settings, tax_input_entries, tax_filings, tax_reminders) reference settings(id) with hardcoded settings_id = 1 and open RLS (USING true). This is pre-tenancy single-tenant scope. It carries no tenant isolation. Source: 20260520090009_tax.sql, 20260520090000_core_tables.sql.
- Entity-aware RPCs already take p_entity_id uuid and resolve the schema from it. Example: record_payment_transaction. Source: 20260809070000_invoice_composite_transactions.sql.

### Required Answers

- What identifies an accounting book: one book per entity. The book key is the entity id.
- What business object owns the book: the entity row in public.entities (one company or business unit).
- Book scope: entity. Not settings. Not tenant schema name. Not workspace.
- Authoritative identifier: public.entities.id, type uuid.
- Relation to public.entities: each accounting book belongs to exactly one entity row. The entity row is the ownership root.
- Relation to settings and settings_id: settings is company-profile configuration inside the entity schema. settings_id is always 1 inside its schema. It identifies no business. It must not serve as the accounting ownership key.
- Relation to tenant schema isolation: the schema is the physical container for one entity's tables. The schema name derives from entity identity. Application code must resolve the schema from the entity id. It must never store the schema name as the ownership key.
- RLS enforcement: future accounting tables live inside the entity schema. Each table gets per-entity policies through has_entity_permission with the entity id bound at provisioning time. This follows the existing _prov_install_rls pattern. Schema separation adds defense in depth. RLS complements the boundary. The entity id remains the logical owner.
- Cross-entity access: a member reaches another entity's book only when an entity_permissions row grants the matching resource and action. No shared book exists. No implicit access exists.
- Company and entity creation: public.entities row first, then provision_entity clones the template, installs RLS, and seeds settings id = 1. The accounting book must exist when provisioning reaches ready state. It starts empty: seeded chart, no open period.
- Book start: the book exists at provisioning ready. Periods open only through an explicit open action. No automatic posting occurs before a period opens.
- Settings changes: settings edits change labels, branding, and document identity only. They never move book ownership. They never merge books. They never split books.
- Entity switch: the user enters a different schema with a different permission set. Books never cross schemas.
- settings_id in accounting tables: allowed only as a nullable configuration reference (for example, which settings revision rendered a document header). It must never serve as owner, tenant discriminator, or RLS key.
- Prohibited ownership keys: settings_id, schema name text, workspace id, user id, client id, company name text.

### Domain Mapping

- The kernel keeps the opaque entityRef field unchanged. No kernel code changed in this task.
- At the persistence boundary, entityRef binds to public.entities.id rendered as a uuid string.
- Journal entries, accounts, and periods each carry the entity binding. Lines inherit the binding from their entry header. Lines carry no separate owner.

## Gate B Decision: CLOSED

Status: CLOSED. Domain precision stays exact decimal strings with Decimal.js (precision 20, ROUND_HALF_UP). Persistence uses NUMERIC(18,2) for new accounting monetary columns.

### Domain Contract (Locked, Unchanged)

- Amounts are exact decimal strings.
- Arithmetic uses Decimal.js with precision 20 and ROUND_HALF_UP.
- Binary floating-point arithmetic is prohibited for accounting money.
- Sources: src/domain/accounting/money.ts, src/lib/Calculations.ts (precision 20, ROUND_HALF_UP). Both files agree.

### Persistence Contract (Locked for Future Schema Work)

- New accounting monetary columns use NUMERIC(18,2). No exception.
- FLOAT, REAL, and DOUBLE PRECISION are prohibited for accounting money.
- Repository check: no NUMERIC(18,2) column exists today. All current money columns use unconstrained numeric. The convention is new. It conflicts with nothing.
- Normalization before persistence: convert through toKoboString (Decimal toFixed(2)). Persist the resulting 2-decimal string.
- Exact zero persists as 0.00. Never persist empty string or null for a zero amount.
- Negative line amounts are rejected by the domain invariant (negative-amount issue). Storage adds a CHECK (amount >= 0) on line-level amount columns.
- Malformed decimal strings must fail at the boundary. The Decimal constructor throws. Adapter code must not catch the throw and substitute zero. It must reject the write.
- Display formatting stays separate from stored precision. Formatters read NUMERIC(18,2) values and format for display only. They never round stored facts.
- Allocation remainders resolve in kobo through largest-remainder logic. Fractional kobo must never persist.

## Existing Financial Path Classification

- src/lib/Calculations.ts: class C (already Decimal-safe). Precision 20, ROUND_HALF_UP. It remains the document-calculation authority.
- src/domain/accounting/money.ts: class C (already Decimal-safe). It remains the accounting-domain authority.
- src/domain/invoice/financialState.ts: class B (convert before feeding postings). It uses Number(), additive accumulation, Math.max, and a tolerance epsilon. It stays valid for operational display. Its outputs must pass through Decimal normalization before they reach any posting adapter.
- src/modules/invoices/services/paymentService.ts (normalizeAmount, normalizePaymentInput, Math.max balance clamps): class A for current operational use, class B at the accounting boundary. Payments persist to unconstrained numeric columns today, which store exact values. Before any value enters a posting, the adapter must convert it through toKoboString.
- Invoice financial views and invoice_persisted_status: class A (safe operational aggregates). They become presentation-only once journal-derived balances exist. No change in this task.
- Unconstrained numeric money columns in invoices, payments, and tax tables: class D (separate architectural decision). Postgres numeric stores exact values, so no corruption exists at rest. Scale migration of old columns needs its own backfill plan. New accounting tables still use NUMERIC(18,2) from day one.

## Next Persistence Increment Contract

The next increment may proceed only because Gate A is CLOSED.

### Allowed Scope

- accounts persistence (entity-bound, unique code per entity).
- accounting periods persistence (entity plus period code identity, planned-open-closed-locked states).
- journal entry header persistence.
- journal line persistence (NUMERIC(18,2) amounts, debit and credit sides).
- Database-level balanced-posting enforcement (all-lines-atomic check).
- RLS and tenant isolation per the Gate A pattern.
- NUMERIC(18,2) monetary columns with non-negative line checks.
- Uniqueness and idempotency constraints (idempotency key unique per entity).

### Excluded Scope

- Invoice and payment ingestion adapters.
- Expenses, fixed assets, tax rules, CIT.
- Compliance and filing behavior.
- Reporting beyond proof of posting persistence.
- Bank feeds, multi-currency, payroll, inventory, consolidation.

## Changes Made

- Created this decision record. No other file changed.
- No kernel behavior changed. The opaque entityRef design stays valid under the resolved mapping.
- No tax table scope changed. Legacy settings_id scope stays untouched.

## Verification Result

- git status before changes: clean tree (no uncommitted changes; HEAD at accounting increment 1 commit).
- git status after changes: one new untracked file under docs/Reports/taxation-made-easy/. No other change.
- git diff --check: passed (new file only, no whitespace error).
- bun run typecheck: not run (no TypeScript source changed).
- bun run audit:load: not run (AGENTS.md requires it before typecheck; typecheck did not apply).
- bun run build: skipped due to hardware policy.
- Pre-existing working-tree changes: none existed; none affected.

## Risks and Limitations

- Legacy tax facts remain settings-scoped. Their migration to entity-scoped accounting facts needs a separate implementation-phase plan. This record does not design it.
- The singleton settings row (id = 1) is a convention enforced by provisioning seed code, not by a cross-schema constraint. Future provisioning changes must preserve it.
- Schema names derive from workspace and entity slugs. Slug renames must keep the derived-name mapping stable or provide an explicit rename path. This record does not design slug renames.
- Operational aggregates (invoice balances from payments) remain authoritative until the ledger lands. Consumers must switch to journal-derived balances in the persistence increment.

## Deferred Work

- Accounting schema DDL and migration strategy.
- RLS policy implementation and verification tests.
- Source-transaction model and invoice and payment adapters.
- Chart seed list and seed policy.
- Backfill policy for unconstrained numeric columns.
- Settings-scoped tax fact migration plan.
- All statutory values (NTAA text, WHT rates, VAT threshold, deadlines). They remain unresolved and are not part of this decision.
