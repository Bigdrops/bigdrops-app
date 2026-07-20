# Multi-Tenancy Architecture Investigation & PRD

**Date:** 2026-07-12
**Author:** OpenCode via Local Runner
**Scope:** Full codebase audit for multi-tenancy readiness + PRD generation
**Status:** Complete

---

## 1. Objective & Scope

**Objective:** Investigate the BIGDROPS codebase's current architecture to determine what changes are needed to support multi-tenancy, then produce a Product Requirements Document (PRD) with an implementation-ready architecture specification.

**Covered:**
- All 40+ Supabase migration files (core tables, tax, auth, notifications, letters, etc.)
- Application-layer hooks: `useDocumentSave.ts`, `useSettings.ts`
- Domain engine: `prefixConstants.ts`, `Calculations.ts`
- RLS policies on every table
- Repository layer: `complianceRepository.ts`
- Auth/device/user tables
- Current `settings` table singleton pattern
- The `letters` table (the one outlier with a `tenant_id` column)
- Device sequences, offline workflow, blank-waybill/csr log tables

**Excluded:**
- Frontend component tree analysis (form components, page routing — these route through hooks that were inspected)
- PDF generation internals (verified they consume hook output, not DB directly)
- Android native code (device workflow is schema-agnostic)
- Real-time subscriptions (flagged as open question in PRD)

---

## 2. Key Findings

### 2.1 The Accidental Single Tenant

The `settings` table functions as an implicit tenant anchor via a singleton (`id=1`) hardcoded throughout the codebase:

- `src/modules/compliance/repositories/complianceRepository.ts` — hardcodes `eq('settings_id', 1)` at line ~23
- All tax tables (`tax_settings`, `tax_input_entries`, `tax_filings`, `tax_reminders`) carry `settings_id integer NOT NULL REFERENCES settings(id)` — the *only* tables with an explicit FK to settings
- RLS on `tax_settings` hardcodes `settings_id = 1`
- Activity events and notifications use `scope_type = 'tenant'`, `scope_id = 'default'` — no real tenant ID

### 2.2 Schema Ownership Map

| Ownership Pattern | Tables | Count |
|---|---|---|
| No tenant/user column (blanket auth RLS) | invoices, waybills, quotations, projects, csrs, receipts, letters*, signatories, bank_accounts, item_catalog, client** | ~25 |
| FK to `settings(id)` (hardcoded to 1) | tax_settings, tax_input_entries, tax_filings, tax_reminders | 4 |
| Has `user_id` (RLS per user) | boqs, notifications, notification_preferences, push_device_tokens, push_delivery_logs, devices, device_installations | 7 |
| Has `tenant_id` (unused — RLS still blanket) | letters | 1 |

*\*letters has `tenant_id` column + `idx_letters_tenant` index, but RLS is `USING (true)` — column exists but is not enforced.*

### 2.3 Prefix Engine Readiness

`src/domain/prefixConstants.ts` — `resolvePrefix()` takes `(docType, documentPrefixes?)`. The prefix map is injected by the caller. **No change needed** — just inject per-entity `document_prefixes` from that entity's settings row.

### 2.4 Calculations Engine

`src/lib/Calculations.ts` — pure in-memory pipeline. `calcTotals()` and `resolveRowVat()` operate on item arrays passed as parameters. **Zero changes required.**

### 2.5 Save Lifecycle

`src/hooks/useDocumentSave.ts` — `DocumentSaveStrategy.persist()` takes `(input, payload, ctx)`. Adding `tenantSchema` to the `ctx` object is a single-property injection. Low-impact change.

---

## 3. Architectural Decision — Why Schema-Per-Entity

The PRD proposes an **inverted** model compared to conventional multi-tenancy:

1. **No `tenant_id` on existing tables** — each entity (brand/company) gets its own Postgres schema
2. **Shared auth pool** — `auth.users` + `profiles` stay in `public`; `entity_members` maps users to entities
3. **`search_path` routing** — app sets `search_path` at request time; all queries auto-scope
4. **No RLS rewrite** — entity-schema tables need only `authenticated` check; schema is the boundary

This approach was chosen over `tenant_id ON every row` + RLS for:
- **Migration safety**: Existing single-tenant data stays in `public`; per-entity migration is optional and phased
- **Structural enforcement**: It's impossible to forget a tenant filter — the schema itself is the filter
- **Clean DROP**: `DROP SCHEMA entity_foo CASCADE` is complete teardown with no orphaned rows
- **Backup granularity**: `pg_dump -n entity_foo` backs up one entity

---

## 4. Risks & Limitations

1. **Supabase migration tooling**: Supabase manages `public` schema via `supabase/migrations/`. Entity schemas must be managed outside this tooling — raw SQL or a secondary migration runner. Flagged as open question.

2. **Supabase client `.schema()` support**: The JS client supports cross-schema queries via `.schema()`, but this path is less tested in the Supabase ecosystem. Fallback to `search_path` RPC is documented.

3. **Real-time subscriptions**: Supabase Realtime broadcasts on `public` schema by default. Per-schema real-time may require custom setup. Not investigated.

4. **Cross-tenant admin views**: `dblink`-based federation views are a migration-path convenience. Production cross-tenant reporting should use FDW. Documented as a `ponytail:` note.

5. **Connection pooling**: `search_path` is session-level. Pooled connections from PgBouncer must reset `search_path` between client requests. Documented as deployment consideration.

---

## 5. Verification Gate

Not applicable — this was a research + specification task with no code produced.

---

## 6. Deferred Work

The following were identified but intentionally left for subsequent phases:

- **Implementation of `entities` and `entity_members` tables** — needs a `database-optimizer` subagent dispatch
- **`complianceRepository.ts` settings_id refactor** — straightforward `eq` replacement
- **`useDocumentSave.ts` tenant injection** — one property addition
- **Supabase Realtime per-schema investigation** — unknown-effort exploration
- **Postgres FDW setup** — only needed when cross-tenant admin dashboards are required
- **Entity onboarding UI** — self-service provisioning is Phase 2

---

## 7. Deliverables

- **`docs/prd/multi-tenancy-prd.md`** — Full PRD with architecture, migration plan, table inventory, and change list
