# BIGDROPS Multi-Tenancy — Architecture & Migration PRD

**Type:** Architecture Specification / Migration Plan
**Status:** Draft
**Version:** 1.0
**Date:** 2026-07-12
**Repository path:** `docs/PRD/multi-tenancy-prd.md`

---

## 1. Purpose & Problem Statement

BIGDROPS currently operates as a **hardcoded single-tenant application**. The `settings` table is a singleton (`id=1`), every business document lives in the shared `public` schema behind broad `authenticated` RLS policies, and there is no mechanism to isolate data or configuration between distinct business entities. This blocks multi-brand deployments, franchise models, and B2B SaaS distribution.

### 1.1 Current Architecture — The Implicit Single Tenant

The present data model has three scoping patterns, none of which provide tenant isolation:

**Pattern A — Singleton anchor (settings_id = 1)**
Only the tax domain explicitly FKs to `settings(id)`: `tax_settings`, `tax_input_entries`, `tax_filings`, `tax_reminders`. These tables carry `settings_id integer NOT NULL` with `REFERENCES settings(id)`. The RLS on `tax_settings` hardcodes `settings_id = 1`. Every other table is implicitly scoped by being in the same database.

**Pattern B — Auth-based user scoping**
`boqs` uses `user_id uuid NOT NULL` with `auth.uid() = user_id` RLS. `notifications`, `notification_preferences`, `push_device_tokens`, `devices`, and `device_installations` also carry `user_id` with per-user RLS. These are user-scoped, not tenant-scoped.

**Pattern C — No scoping at all**
The major document tables (`invoices`, `waybills`, `quotations`, `projects`, `csrs`, `receipts`, `letters*`) have no tenant or user column. RLS on these tables is a blanket `USING (auth.role() = 'authenticated')`. Every authenticated user sees every row.

*Note: The `letters` table was introduced with a `tenant_id` column but RLS still permits `SELECT TO authenticated USING (true)` — the column exists but is not enforced.*

### 1.2 What Multi-Tenancy Must Solve

1. **Configuration isolation**: Company name, logo, address, bank details, document prefixes, theme tokens per entity
2. **Data isolation**: Documents, clients, items, projects, payments — no cross-tenant leakage
3. **User pool semantics**: A user may belong to multiple entities (field engineers servicing multiple brands)
4. **Document numbering isolation**: Prefix sequences must be per-tenant
5. **Offline/device workflow**: Android devices assigned to users who cross tenant boundaries
6. **Audit trail scoping**: Activity events must carry tenant context
7. **Gradual migration path**: The current single-tenant deployment must continue working throughout

---

## 2. Inversion: A Peculiar Approach

Rather than the conventional `tenant_id ON every row` + RLS filter pattern, this specification proposes an **inverted, layered model** that exploits the existing architecture:

### 2.1 Design Decision Record

| Convention | Rejected In Favor Of | Rationale |
|---|---|---|
| `tenant_id uuid NOT NULL` on every table | **Schema-per-entity isolation** via Postgres schemas | Leverages built-in PostgreSQL schema visibility. No column bloat on 30+ tables. Trivial to backup/restore per entity. Impossible to forget RLS on a new table. DROP SCHEMA ... CASCADE is clean teardown. |
| Central user table with org membership | **Shared auth pool with entity profile join** | Engineers service multiple brands. Supabase Auth is global. A single `auth.users` pool with a profile-level `current_entity_id` selector. |
| RLS tenant filter on every policy | **Schema-level visibility + search_path** | RLS on 30+ tables touched in every migration is a maintenance trap. `SET search_path TO entity_schema, public` makes cross-entity leakage structurally impossible at the connection level. |
| Big-bang migration | **Tenant View Wrapper** + per-entity schema rollout | Phase the migration: create entity schemas lazily as entities onboard. The view wrapper federates SELECT queries across schemas; DML goes to the active schema. Existing single-tenant deployment runs unmodified. |

### 2.2 The Metaphor

Instead of each row carrying a flag for "which company owns this," **each company gets its own Postgres schema**. The schemas are identical twins — same tables, same indexes, same constraints — instantiated from a `_template` schema via `CREATE SCHEMA entity_abc TEMPLATE _template`.

The `public` schema becomes:
- A **registry** of entities (tenant metadata)
- A **shared pool** for auth, notifications, and device management
- A **routing layer** for the application

### 2.3 Entity Schema Layout

```
public                        # Registry, shared auth, routing
├── entities                  # Tenant registry (replaces singleton settings)
├── profiles                  # User pool (unchanged)
├── devices                   # Device installs (cross-entity)
├── notifications             # Notification delivery (scoped by scope_id)
├── activity_events           # Cross-entity audit trail
├── push_device_tokens        # FCM tokens (per user, cross-entity)
├── settings                  # [DEPRECATED] Kept for backward compat
│
entity_acme                   # One schema per entity
├── settings                  # Company config, prefixes, theme (single row)
├── clients
├── invoices
├── invoice_items
├── payments
├── wht_receipts
├── quotations
├── quotation_items
├── waybills
├── blank_waybill_logs
├── projects
├── project_documents
├── csrs
├── blank_csr_logs
├── receipts
├── letters
├── item_catalog
├── item_aliases
├── item_import_batches
├── item_merge_log
├── signatories
├── bank_accounts
├── tax_settings
├── tax_input_entries
├── tax_filings
├── tax_reminders
├── audit_logs
├── activity_events           # Entity-local activity
├── device_sequences          # Per-entity device counter
│
entity_beta                   # Another entity, same structure
└── ...
```

---

## 3. Schema-Per-Entity: Detailed Architecture

### 3.1 The Entity Registry

A new `public.entities` table replaces the singleton `settings` as the tenant authority:

```sql
CREATE TABLE public.entities (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name     text NOT NULL UNIQUE,            -- 'entity_acme'
    slug            text NOT NULL UNIQUE,            -- 'acme'
    name            text NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    settings        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- company_name, logo, etc.
    document_prefixes jsonb NOT NULL DEFAULT '{}'::jsonb, -- per-entity prefix overrides
    theme_tokens    jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    migrated_at     timestamptz                      -- when data was moved from public
);
```

### 3.2 Schema Template & Instantiation

A `_template` schema (never written to directly) holds the canonical DDL. A PL/pgSQL function clones it:

```sql
CREATE OR REPLACE FUNCTION public.create_entity_schema(
    p_entity_id uuid,
    p_schema_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);

    -- Clone all tables from _template
    -- (implemented via CREATE TABLE ... LIKE or pg_dump/pg_restore loop)

    -- Insert entity-specific settings row
    EXECUTE format(
        'INSERT INTO %I.settings (id, company_name, document_prefixes)
         SELECT 1, e.name, e.document_prefixes
         FROM public.entities e WHERE e.id = $1',
        p_schema_name
    ) USING p_entity_id;
END;
$$;
```

### 3.3 Application Connection Routing

Instead of modifying every query, the app sets `search_path` at connection/request time:

```typescript
// src/lib/setTenantContext.ts
import { supabase } from './supabase'

let currentSchema = 'public'

export async function setTenantContext(entitySlug: string) {
    // Resolve entity → schema mapping
    const { data } = await supabase
        .from('entities')
        .select('schema_name')
        .eq('slug', entitySlug)
        .single()

    if (data?.schema_name) {
        currentSchema = data.schema_name
        // Set session-level search_path
        await supabase.rpc('set_tenant_schema', {
            p_schema: data.schema_name,
        })
    }
}

export function getCurrentSchema(): string {
    return currentSchema
}
```

The RPC:

```sql
CREATE OR REPLACE FUNCTION public.set_tenant_schema(p_schema text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT set_config('search_path', p_schema || ', public', false);
$$;
```

### 3.4 Cross-Schema Queries via Federated Views

For global operations (admin dashboard, cross-entity reports), a view layer federates data:

```sql
CREATE OR REPLACE VIEW public.all_invoices AS
SELECT e.slug AS entity_slug, i.*
FROM public.entities e
CROSS JOIN LATERAL (
    SELECT * FROM dblink(
        'dbname=' || current_database(),
        'SELECT * FROM ' || quote_ident(e.schema_name) || '.invoices'
    ) AS i(
        id uuid, invoice_number text, client_id uuid, ...
    )
) i
WHERE e.is_active;
```

**Ponytail note**: This uses `dblink` for simplicity. For production, replace with Postgres FDW or a materialized refresh. Add when cross-tenant queries are measured as a bottleneck (<https://github.com/your-org/bigdrops/issues/NNN>).

---

## 4. User Pool & Entity Membership

Unlike conventional multi-tenancy where one user belongs to one org, BIGDROPS users may operate across entities. A field engineer may service invoices for `acme` and `beta` on the same day.

### 4.1 Entity Membership Table

```sql
CREATE TABLE public.entity_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   uuid NOT NULL REFERENCES public.entities(id),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    role        text NOT NULL DEFAULT 'engineer'
                CHECK (role IN ('admin', 'engineer', 'viewer')),
    is_default  boolean NOT NULL DEFAULT false,
    joined_at   timestamptz NOT NULL DEFAULT now(),

    UNIQUE (entity_id, user_id)
);
```

### 4.2 Session-Level Entity Switching

The user selects an active entity on login (or via a navbar switcher). The selected entity:

1. Sets the `search_path` to that entity's schema
2. Loads the entity's `settings` into app context
3. Scopes all document operations to that schema

```typescript
// src/stores/entityStore.ts
interface EntitySession {
    slug: string
    schemaName: string
    settings: EntitySettings
}

const entityStore = create<{
    current: EntitySession | null
    switchTo: (slug: string) => Promise<void>
    // ...
}>()
```

### 4.3 Prefix Engine at Entity Scope

`resolvePrefix()` currently reads from `settings.document_prefixes` (a singleton). With entity schemas, each entity's `settings` row holds its own `document_prefixes`. The prefix engine becomes a tenant-aware call:

```typescript
// src/domain/prefixConstants.ts
// No change needed — resolvePrefix() accepts documentPrefixes as a parameter.
// The caller injects the entity's settings.document_prefixes.
```

The entity schema's `settings` row carries the same `check_document_prefixes_format` constraint already defined in `20260611000001_document_prefixes.sql`.

---

## 5. Migration Strategy: The Tenant View Wrapper

The critical requirement: **the existing production single-tenant instance must not break during migration**.

### 5.1 Phase 0 — Public Schema as Entity Zero

The current `public` schema is treated as the first "implicit" entity. All existing data stays in place. The migration adds:

- `public.entities` table with a synthetic row for the current deployment
- `public.entity_members` table — every existing user auto-provisioned as `entity_admin` on Entity Zero
- `public.set_tenant_schema()` RPC
- No data movement.

**Critical rule — existing user grandfathering:** Every user who exists at migration time is provisioned as `entity_admin` on Entity Zero. This is non-negotiable for backward compatibility:
- These users were operating in a single-tenant system with no access boundaries — they implicitly owned everything
- Demoting them arbitrarily (e.g. to `viewer`) would break existing workflows and lock users out of their own data
- The business owner can manually demote users post-migration, but the automated migration must never reduce access

This applies **only to pre-existing users**. New users created after migration follow the default-deny model (zero access until invited by an entity admin).

### 5.2 Phase 1 — Schema Template & Dry Run

1. Extract canonical DDL into a `_template` schema
2. Create a `_template` copy of all business tables (excluding public-only tables like `profiles`, `devices`, `entities`)
3. Verify that `search_path = '_template, public'` allows the app to operate against the template schema
4. Run integration tests against both schemas

### 5.3 Phase 2 — Entity Lazy Onboarding

New entities are created via `create_entity_schema()` on demand. The entity schema starts empty. The application code path becomes:

```typescript
async function getDocumentList(table: string) {
    const schema = getCurrentSchema()
    if (schema === 'public') {
        // Phase 2a: Direct query to public schema (old path)
        return supabase.from(table).select('*')
    }
    // Phase 2b: Query entity schema directly
    return supabase.schema(schema).from(table).select('*')
}
```

Supabase JS client supports the `.schema()` method for cross-schema queries.

### 5.4 Phase 3 — Data Migration Per Entity

When an entity is ready to leave the `public` schema:

1. Lock writes to the entity's documents (maintenance window or transactional cutover)
2. `INSERT INTO entity_acme.invoices SELECT * FROM public.invoices WHERE ...`
3. Update `public.entities.migrated_at`
4. Drop migrated rows from `public` (or keep a sync trigger during transition)

The migration is per-entity, not all-at-once. Different entities can migrate on different schedules.

### 5.5 Rollback

Because `public` retains the original data until explicitly cleaned, rollback is:
```sql
DELETE FROM entity_acme.invoices;
INSERT INTO public.invoices SELECT * FROM entity_acme.invoices;
-- Drop entity schema
DROP SCHEMA entity_acme CASCADE;
```

---

## 6. Changes to Existing Code

### 6.1 `useDocumentSave.ts` — Tenant Injection

The generic `DocumentSaveStrategy` interface receives tenant context via closure. The `persist()` call already accepts `(input, payload, ctx)`. Add a `tenantSchema` property to the context:

```typescript
// src/hooks/useDocumentSave.ts — minimal addition
export interface SaveContext {
    isCreate: boolean
    isEdit: boolean
    id?: string
    tenantSchema?: string   // ponytail: added for multi-entity routing
}
```

The concrete persist functions (invoice, waybill, etc.) read `tenantSchema` from the context and use `supabase.schema(tenantSchema).from(...)` when set. When `tenantSchema` is undefined, fall back to the current `public` behavior.

### 6.2 Settings — From Singleton to Scoped

The biggest refactor target. Currently:
- `src/modules/compliance/repositories/complianceRepository.ts` hardcodes `eq('settings_id', 1)`
- `useSettings()` presumably fetches `settings.id = 1`

With entity schemas, each entity schema has its own `settings` row. The compliance repository queries the entity's schema instead.

Compatibility bridge: A view or RPC that returns the entity settings from the current `search_path`.

### 6.3 Calculations.ts — No Change Needed

`calcTotals()` and `resolveRowVat()` operate on in-memory data (items arrays, rates). They don't query the database. No tenant awareness required.

### 6.4 Prefix Engine — No Change Needed

`resolvePrefix()` receives its prefix map as a parameter. The caller fetches `settings.document_prefixes` from the active entity schema.

### 6.5 RLS Policies — Simplified

With schema-level isolation, RLS on entity tables can be simplified to a flat `authenticated` check:

```sql
-- In entity_acme schema
CREATE POLICY entity_access ON invoices
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

The `search_path` at the connection level already guarantees the user is operating within the correct entity schema. RLS becomes a perimeter gate, not a per-row filter.

### 6.6 Audit & Activity Events

Two-tier approach:
- **Cross-entity events** (user login, entity switch, device registration) → `public.activity_events`
- **Entity-local events** (invoice created, payment recorded) → `entity_xxx.activity_events`

The `record_activity_event()` function uses `current_schema` to determine target.

---

## 7. Constraints & Non-Negotiables

| Constraint | Rule |
|---|---|
| **[LOCKED] Document numbering** | `generateWaybillSequenceNumber()` and consumed `blank_waybill_logs` tokens are per-schema. Entity schemas have their own `blank_waybill_logs` and `device_sequences` tables. Tokens are never shared across schemas. |
| **[LOCKED] Financial source of truth** | `src/lib/Calculations.ts` remains unmodified. Entity schemas hold separate financial data but the same calculation pipeline. |
| **[LOCKED] Prefix engine** | `resolvePrefix()` remains the canonical prefix resolver. Each entity schema's `settings.document_prefixes` drives it independently. |
| **Shared auth pool** | `auth.users`, `profiles`, `devices`, `device_installations` remain in `public`. The `entity_members` table maps users to entities. |
| **Offline device workflow** | Device codes are entity-agnostic. The `device_sequences` table per entity scopes counter increments. `get_device_code_counter_seeds()` queries the active schema. |
| **No framer-motion** | Applies globally. Unrelated to this PRD. |
| **PDFs are dumb renderers** | PDF generation queries entity-schema data. No financial logic in PDFs. |

---

## 8. Success Criteria

1. **Fresh entity creation**: `create_entity_schema('entity_newco')` produces a fully functional schema. Creating a new invoice, saving it, and viewing the list works without touching `public`.
2. **Data isolation**: User authenticated to `entity_acme` sees zero rows from `entity_beta` and vice versa.
3. **Shared user**: Same `auth.uid()` can switch between entities and see only that entity's documents in each session.
4. **Prefix isolation**: Both entities can have invoice `INV-000001` without collision.
5. **Public backward compat**: The existing data in `public` is fully operational with zero migration steps required.
6. **Migration time**: Per-entity data migration completes within 30 seconds for 100K rows (non-blocking).

---

## 9. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| `supabase.schema()` not supported in all clients | Test with Supabase JS v2. Falls back to `search_path` RPC. |
| Cross-schema FK constraints not possible | Entity data is self-contained. Cross-schema references (e.g., `invoices → clients`) exist within the same entity schema. Cross-entity references are via `public` tables or app-layer joins. |
| `dblink` performance for cross-tenant views | Replace with Postgres FDW in production. Phase 5 optimization. |
| Supabase migration tooling assumption | Supabase works on a single `public` schema. Entity schemas must be managed outside Supabase migrations (via raw SQL or a migration runner). Supabase's `_realtime` and `_queue` schemas are unaffected. |
| Real-time subscriptions | Supabase Realtime broadcasts on `public` schema by default. Entity-schema Realtime may require per-schema subscription setup. Investigate as follow-up. |

---

## 10. Out of Scope (Phase 2+)

- Billing / usage metering per entity
- Cross-entity data consolidation warehouse
- Entity-level export/import (single schema dump)
- Self-service entity provisioning UI
- Entity-level theme/branding in PDF output

---

## Appendix A: Complete Table Inventory & Tenant Mapping

| Table | Current Scope | Phase 1 Target | Migration Pattern |
|---|---|---|---|
| `settings` | Singleton (id=1) in `public` | Per entity schema | Clone + drop from `public` per entity |
| `profiles` | `public` | `public` (shared) | No migration |
| `clients` | `public` | Per entity schema | COPY TO entity schema |
| `invoices` | `public` | Per entity schema | COPY TO entity schema |
| `invoice_items` | `public` | Per entity schema | COPY TO entity schema |
| `payments` | `public` | Per entity schema | COPY TO entity schema |
| `wht_receipts` | `public` | Per entity schema | COPY TO entity schema |
| `quotations` | `public` | Per entity schema | COPY TO entity schema |
| `quotation_items` | `public` | Per entity schema | COPY TO entity schema |
| `waybills` | `public` | Per entity schema | COPY TO entity schema |
| `blank_waybill_logs` | `public` | Per entity schema | COPY TO entity schema |
| `projects` | `public` | Per entity schema | COPY TO entity schema |
| `project_documents` | `public` | Per entity schema | COPY TO entity schema |
| `csrs` | `public` | Per entity schema | COPY TO entity schema |
| `blank_csr_logs` | `public` | Per entity schema | COPY TO entity schema |
| `receipts` | `public` | Per entity schema | COPY TO entity schema |
| `letters` | `public` (has `tenant_id` column) | Per entity schema | COPY TO entity schema |
| `item_catalog` | `public` | Per entity schema | COPY TO entity schema |
| `item_aliases` | `public` | Per entity schema | COPY TO entity schema |
| `item_import_batches` | `public` | Per entity schema | COPY TO entity schema |
| `item_merge_log` | `public` | Per entity schema | COPY TO entity schema |
| `signatories` | `public` | Per entity schema | COPY TO entity schema |
| `bank_accounts` | `public` | Per entity schema | COPY TO entity schema |
| `tax_settings` | `public` (FK to settings_id=1) | Per entity schema | COPY TO entity schema |
| `tax_input_entries` | `public` (FK to settings_id=1) | Per entity schema | COPY TO entity schema |
| `tax_filings` | `public` (FK to settings_id=1) | Per entity schema | COPY TO entity schema |
| `tax_reminders` | `public` (FK to settings_id=1) | Per entity schema | COPY TO entity schema |
| `activity_events` | `public` | Dual: `public` (global) + per entity | Split by scope_type |
| `audit_logs` | `public` | Per entity schema | COPY TO entity schema |
| `notifications` | `public` (scope_id='default') | `public` with scope_id = entity_id | No data move |
| `notification_preferences` | `public` | `public` (shared) | No migration |
| `devices` | `public` | `public` (shared) | No migration |
| `device_installations` | `public` | `public` (shared) | No migration |
| `device_sequences` | `public` | Per entity schema | COPY TO entity schema |
| `push_device_tokens` | `public` | `public` (shared) | No migration |
| `push_delivery_logs` | `public` | `public` (shared) | No migration |
| `boqs` | `public` (user_id) | Per entity schema | COPY TO entity schema |
| `boq_rows` | `public` | Per entity schema | COPY TO entity schema |
| `rfqs` | `public` | Per entity schema | COPY TO entity schema |
| `rfq_items` | `public` | Per entity schema | COPY TO entity schema |
| `entities` | — | New in `public` | Not applicable |
| `entity_members` | — | New in `public` | Not applicable |
| `_template` | — | New meta-schema | Not applicable |

---

## Appendix B: Key Files to Modify

| File | Change |
|---|---|
| `src/lib/setTenantContext.ts` | New — entity resolution + search_path management |
| `src/stores/entityStore.ts` | New — entity session state |
| `src/hooks/useDocumentSave.ts` | Add `tenantSchema` to `SaveContext` |
| `src/domain/prefixConstants.ts` | No change needed (parameter-driven) |
| `src/lib/Calculations.ts` | No change needed (in-memory pipeline) |
| `src/modules/compliance/repositories/complianceRepository.ts` | Replace `eq('settings_id', 1)` with schema-scoped query |
| `supabase/migrations/*.sql` | Add `entities`, `entity_members` tables; create `_template` schema |
