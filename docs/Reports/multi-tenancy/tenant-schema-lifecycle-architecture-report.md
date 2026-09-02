# Tenant Schema Lifecycle Architecture Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Verdict

BIGDROPS has no canonical, independent, versioned mechanism for creating or upgrading tenant schemas. The current provisioning engine clones table structure from `public.*` tables — a mechanism that broke when those tables were purged. There is no schema versioning, no tenant migration system, and no DDL-based provisioning.

**The recommended architecture is: versioned tenant migrations stored as SQL files in the repository, applied sequentially by a tenant migration runner function.** Each migration is an idempotent SQL script that modifies one tenant schema. The migration runner tracks which migrations have been applied to each tenant schema. New tenants receive all migrations up to the current version. Existing tenants receive only pending migrations.

This architecture is independent of customer data, independent of `public` operational tables, compatible with Supabase's migration infrastructure, and supports future schema evolution.

---

## 1. Current Architecture — FACTS

### Provisioning Mechanism

`provision_entity()` creates a tenant schema and clones table structure from `public`:

```
CREATE TABLE <target>.<table> (LIKE public.<table> INCLUDING ALL)
```

- Structure only (columns, constraints, indexes). No data.
- Source: hardcoded to `public`.
-32 tables listed in `_prov_get_template_tables()`.
- On failure: `DROP SCHEMA ... CASCADE` + status = `failed`.

### Migration Count

77 migration files in `supabase/migrations/`. All target the `public` schema. None iterate across tenant schemas.

### Schema Versioning

**Does not exist.** No `schema_version` column on any entity or provisioning-status table. No mechanism to know which version a tenant schema is at.

### Tenant Migration System

**Does not exist.** No function applies DDL to existing tenant schemas. No migration iterates across tenants.

### Supabase Migration Architecture

Migrations are sequential SQL files applied via `supabase db push`. They target the `public` schema by default. Supabase does not natively support multi-schema migrations.

---

## 2. Current Architecture Gaps

| Gap | Impact |
|-----|--------|
| No schema versioning | Cannot know which version a tenant has |
| No tenant migration runner | Cannot upgrade existing tenants |
| No DDL-based provisioning | Cannot create tenants without `public` tables |
| No template schema | No independent source of schema structure |
| Provisioning broken after purge | New companies cannot be created |
| No upgrade path for existing tenants | New columns/tables/functions never reach existing tenants |
| No idempotent migration tracking | Cannot safely retry failed migrations |

---

## 3. Canonical Schema Source Options

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| `public` tables as template | Simple | Broken (purged), creates public dependency | **REJECTED** |
| Existing tenant as template | No new infrastructure | Implicit master customer, no upgrade path, data contamination risk | **REJECTED** |
| Manual SQL per company | Explicit | Not scalable, not reproducible, operator burden | **REJECTED** |
| DDL provisioning function | Version-controlled | No upgrade mechanism, giant function, hard to maintain | **INSUFFICIENT alone** |
| Versioned tenant migrations | Version-controlled, upgradable, idempotent | Requires migration runner | **SELECTED** |
| Dedicated template schema | Clean separation | Still needs migration mechanism, maintenance burden | **UNNECESSARY if versioned migrations exist** |

### Selected: Versioned Tenant Migrations

The canonical source of tenant schema structure is a set of ordered, idempotent SQL migration files stored in the repository. Each migration is a self-contained script that modifies one tenant schema. A migration runner function applies pending migrations to a target tenant schema.

---

## 4. Selected Target Architecture

### Conceptual Model

```
Repository
├── supabase/migrations/           (public schema migrations — existing)
│   ├── 20260520090000_core_tables.sql
│   ├── ...
│   └── 20260831000000_fix_invoice_financials_v_grants.sql
│
├── supabase/tenant_migrations/    (tenant schema migrations — NEW)
│   ├── 001_baseline.sql           (creates all 32 tables + RLS + triggers)
│   ├── 002_add_invoice_title.sql  (example future change)
│   └── 003_add_waybill_template.sql
│
└── supabase/tenant_migration_runner.sql  (applies pending migrations — NEW)
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `supabase/tenant_migrations/*.sql` | Ordered, idempotent DDL scripts for tenant schemas |
| `public.tenant_migration_history` | Tracks which migrations each tenant schema has applied |
| `public.apply_tenant_migration(schema, migration_id)` | Applies one migration to one tenant schema |
| `public.provision_tenant_schema(entity_id)` | Creates schema + applies all pending migrations |
| `public.upgrade_tenant_schema(entity_id)` | Applies pending migrations to existing tenant |
| `public.get_tenant_schema_version(entity_id)` | Returns current version of a tenant schema |

### Migration File Format

Each migration file is a self-contained SQL script:

```sql
-- Migration: 002_add_invoice_title
-- Description: Add invoice_title column to invoices table
-- Idempotent: Yes

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_setting('search_path')
          AND table_name = 'invoices'
          AND column_name = 'invoice_title'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_title text;
    END IF;
END;
$$;
```

### Migration History Table

```sql
CREATE TABLE IF NOT EXISTS public.tenant_migration_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name text NOT NULL,
    migration_id text NOT NULL,
    migration_name text NOT NULL,
    applied_at timestamp with time zone NOT NULL DEFAULT now(),
    applied_by uuid DEFAULT auth.uid(),
    duration_ms integer,
    UNIQUE (schema_name, migration_id)
);
```

---

## 5. Complete Company Provisioning Lifecycle

### New Company Creation

```
1. Frontend: createEntity({ workspaceId, displayName, slug })
   → INSERT INTO public.entities

2. Frontend: provisionEntity(entity.id)
   → supabase.rpc('provision_entity', { p_entity_id })

3. provision_entity():
   a. Validate permissions (create_entity or owner)
   b. Idempotency check (already ready? already creating?)
   c. Acquire advisory lock
   d. Get schema name: entity_<workspace_slug>_<entity_slug>
   e. Update status → 'creating'
   f. CREATE SCHEMA <schema_name>
   g. Apply ALL tenant migrations in order:
      FOR EACH migration IN tenant_migrations/:
          apply_tenant_migration(schema_name, migration_id)
   h. Seed settings row
   i. Install tenant RPCs (27 lifecycle/audit functions)
   j. Seed default permissions for creator
   k. Update status → 'ready'
   l. RETURN { status: 'ready', schema_name }

On failure:
   m. DROP SCHEMA <schema_name> CASCADE
   n. Update status → 'failed', record error
   o. RETURN { status: 'failed', error }
```

### Key Properties

- **Schema version**: Automatically current (all migrations applied)
- **Idempotency**: Each migration is idempotent (DO block with existence check)
- **Deterministic**: Same migrations produce same schema structure
- **Independent**: No dependency on `public` tables or other tenants

---

## 6. Existing Tenant Upgrade Lifecycle

### When Platform Schema Changes

```
1. Developer adds new migration file:
   supabase/tenant_migrations/003_add_waybill_template.sql

2. Migration is committed to repository

3. Existing tenants receive the upgrade via:
   upgrade_tenant_schema(entity_id)
   → reads migration history for this schema
   → identifies pending migrations
   → applies each pending migration in order
   → records each in tenant_migration_history

4. New tenants created afterward:
   provision_tenant_schema()
   → applies ALL migrations including 003
   → starts at current version
```

### Migration Ordering

Migrations are ordered by filename: `001_`, `002_`, `003_`, etc. The runner applies them sequentially. Each migration records its `migration_id` (filename prefix) in `tenant_migration_history`.

### Transaction Boundaries

Each migration runs within its own transaction. If migration 003 fails:
- Migration 003 is NOT recorded in history
- Schema remains at version 002
- Retry applies 003 again (idempotent)
- Migrations 001-002 are not re-applied

### Batch Upgrades

For upgrading all existing tenants:

```sql
-- Pseudocode for batch upgrade
FOR EACH entity IN entities WHERE provisioning_status = 'ready':
    PERFORM upgrade_tenant_schema(entity.id);
```

This can be run as a background job or triggered by a platform release.

---

## 7. New Company After Upgrade Lifecycle

### Proof

Given:
- Platform has migrations 001, 002, 003
- Existing tenant A is at version 002
- New company B is created

Then:
1. `provision_tenant_schema(entity_B)` is called
2. It applies migrations 001, 002, 003 in order
3. Tenant B starts at version 003 (current)
4. No cloning of tenant A required
5. No public tables required
6. No operator SQL required

### Acceptance Property

A new company always receives the current schema version because `provision_tenant_schema` applies ALL migrations in the `tenant_migrations/` directory.

---

## 8. Company Deletion Lifecycle

### Defined in PRD §8

```
1. Entity archived:
   - public.entities.status → 'archived'
   - RLS denies access immediately

2. Tenant schema retained during retention period (e.g., 30 days)

3. Background purge job:
   a. UPDATE entity_provisioning_status SET status = 'purging'
   b. DROP SCHEMA <entity_schema> CASCADE
   c. UPDATE entity_provisioning_status SET status = 'purged'
   d. DELETE FROM public.entities WHERE id = entity_id

4. Recovery window:
   - Owner can restore status → 'active' before purge runs
   - After purge: permanent deletion
```

### Gap

The background purge job is NOT implemented. The PRD defines the lifecycle but the job does not exist in the repository.

---

## 9. Workspace Deletion Lifecycle

### Defined in PRD §8

```
1. Workspace archived:
   - public.workspaces.status → 'archived'
   - RLS denies all member access immediately

2. All entities in workspace become inaccessible

3. Background purge job (per entity):
   - Same as company deletion lifecycle above
   - Each entity's tenant schema is dropped
   - Entity rows are removed

4. Workspace row is removed
```

### Relationship

```
Workspace
├── workspace_members (deleted via FK cascade or explicit)
├── Entity A → Schema entity_ws_a → DROP SCHEMA CASCADE
├── Entity B → Schema entity_ws_b → DROP SCHEMA CASCADE
└── Entity C → Schema entity_ws_c → DROP SCHEMA CASCADE
```

Workspace deletion cascades to all owned entities and their tenant schemas.

---

## 10. Failure / Retry / Idempotency Model

### Provisioning Failure

| Step | Failure | Recovery |
|------|---------|----------|
| Schema creation | Schema exists | Idempotent: skip if exists |
| Migration application | Migration fails | Record failure, retry same migration |
| RLS installation | Policy exists | Idempotent: CREATE POLICY IF NOT EXISTS |
| Trigger installation | Trigger exists | Idempotent: CREATE TRIGGER IF NOT EXISTS |
| RPC installation | Function exists | Idempotent: CREATE OR REPLACE FUNCTION |
| Permission seeding | Permission exists | Idempotent: ON CONFLICT DO NOTHING |
| Settings seed | Settings exist | Idempotent: ON CONFLICT DO NOTHING |

### Retry Behavior

`provision_entity()` is idempotent:
- If status = `ready` → return immediately
- If status = `creating` → return (another call in progress)
- If status = `failed` → retry from scratch (schema was dropped)
- If schema exists but status != `ready` → cleanup + retry

### Partial Migration Recovery

If migration 003 of 005 fails:
- Migrations 001-002 are recorded in history
- Migration 003 is NOT recorded
- Schema is at version 002
- Retry applies 003 again (idempotent)
- No need to re-apply 001-002

---

## 11. Schema Versioning Model

### Version Tracking

Each tenant schema's version is determined by counting applied migrations:

```sql
SELECT COUNT(*) FROM public.tenant_migration_history
WHERE schema_name = 'entity_workspace_company';
```

Or by finding the latest applied migration:

```sql
SELECT migration_id FROM public.tenant_migration_history
WHERE schema_name = 'entity_workspace_company'
ORDER BY applied_at DESC LIMIT 1;
```

### Version Numbering

Migrations use sequential numeric prefixes: `001`, `002`, `003`. The version is the count of applied migrations. This is simple and sufficient.

### Current Version

The "current version" is the total count of migration files in `supabase/tenant_migrations/`. A tenant is current when its applied count equals this total.

---

## 12. Supabase Migration Compatibility Analysis

### FACT: Supabase Migrations Are Public-Schema-Only

`supabase db push` applies migrations from `supabase/migrations/` to the `public` schema. There is no native mechanism to apply migrations to other schemas.

### FACT: Tenant Migrations Must Be Separate

Tenant migrations cannot use `supabase db push` because:
1. They target `entity_*` schemas, not `public`
2. Each tenant schema needs its own application
3. Migration history must be per-tenant, not global

### FACT: The Tenant Migration Runner Must Be a Database Function

Since Supabase doesn't support multi-schema migrations natively, the runner must be a PostgreSQL function that:
1. Reads migration files from a table (not the filesystem)
2. Applies them to a target schema
3. Records application in per-tenant history

### Migration File Storage

Migration files are stored in a `public.tenant_migration_files` table:

```sql
CREATE TABLE IF NOT EXISTS public.tenant_migration_files (
    migration_id text PRIMARY KEY,
    migration_name text NOT NULL,
    sql_body text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

Files are loaded into this table by a one-time seed script or by the application layer.

---

## 13. Tenant Isolation / Data-Safety Analysis

### Schema Upgrade ≠ Data Cloning

Migrations modify schema structure (ADD COLUMN, CREATE TABLE, etc.), not tenant data. A migration that adds a column to `invoices` affects only the schema definition, not existing rows.

### New Company ≠ Copying Existing Company

`provision_tenant_schema` creates an empty schema and applies migrations. No data is copied from any existing tenant.

### Tenant A Deletion ≠ Tenant B Deletion

Each tenant has its own PostgreSQL schema. `DROP SCHEMA entity_ws_a CASCADE` affects only `entity_ws_a`. No cross-schema foreign keys exist (FKs are re-added pointing within the same schema).

### Tenant A Upgrade ≠ Tenant B Data Modification

`upgrade_tenant_schema(entity_A_id)` targets only `entity_ws_a`. It cannot affect `entity_ws_b`.

### Remaining Risks

| Risk | Mitigation |
|------|------------|
| Migration modifies shared function | Functions are per-tenant (installed by `_prov_install_tenant_rpcs`) |
| Migration affects public schema | Tenant migrations set `search_path` to target schema |
| Concurrent migration application | Advisory lock per entity prevents concurrent upgrades |
| Migration introduces cross-schema reference | Architecture prohibits cross-schema references |

---

## 14. Future Schema Evolution Examples

### Adding a New Tenant Table

```
1. Create migration: 004_add_expenses.sql
   CREATE TABLE IF NOT EXISTS expenses (...);

2. Add to provisioning if needed:
   Update _prov_get_template_tables() to include 'expenses'
   OR (preferred) the migration runner handles it automatically

3. Existing tenants: upgrade_tenant_schema() applies 004
4. New tenants: provision_tenant_schema() applies 001-004
```

### Adding a Column

```
1. Create migration: 005_add_invoice_priority.sql
   ALTER TABLE invoices ADD COLUMN priority integer DEFAULT 0;

2. Existing tenants: upgrade applies 005
3. New tenants: provision applies 001-005
```

### Adding an Index

```
1. Create migration: 006_add_client_name_index.sql
   CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
```

### Adding/Changing RLS Policy

```
1. Create migration: 007_update_invoice_rls.sql
   DROP POLICY IF EXISTS invoice_view ON invoices;
   CREATE POLICY invoice_view ON invoices FOR SELECT ...
```

### Changing a Trigger

```
1. Create migration: 008_update_audit_trigger.sql
   DROP TRIGGER IF EXISTS audit_trigger ON invoices;
   CREATE TRIGGER audit_trigger AFTER UPDATE ON invoices ...
```

### Deprecating a Table

```
1. Create migration: 009_deprecate_old_table.sql
   -- Do NOT drop. Rename or mark as deprecated.
   ALTER TABLE old_table RENAME TO _deprecated_old_table;
```

---

## 15. Explicitly Rejected Architectures

| Architecture | Reason for Rejection |
|-------------|---------------------|
| Restore 32 `public.*` tables | Resurrects deprecated public operational layer |
| Clone from `entity_bigdrops-main_main` | Implicit master customer, no upgrade path |
| Manual SQL per company | Not scalable, not reproducible |
| Single DDL function | No upgrade mechanism, giant maintenance burden |
| Supabase migrations for tenants | Migrations target `public` only |
| Template schema without versioning | No upgrade path |

---

## 16. Required Future Implementation Phases

### Phase 1: Tenant Migration Infrastructure

1. Create `supabase/tenant_migrations/` directory
2. Create `public.tenant_migration_files` table
3. Create `public.tenant_migration_history` table
4. Create `public.apply_tenant_migration(schema, migration_id)` function
5. Create `public.provision_tenant_schema(entity_id)` function
6. Create `public.upgrade_tenant_schema(entity_id)` function
7. Create seed script to load initial migration (001_baseline.sql)
8. Generate 001_baseline.sql from existing table definitions

### Phase 2: Provisioning Migration

1. Update `provision_entity()` to call `provision_tenant_schema()` instead of clone loop
2. Remove `_prov_get_template_tables()` dependency
3. Remove `_prov_clone_table()` dependency
4. Keep `_prov_install_rls()`, `_prov_install_triggers()`, `_prov_install_tenant_rpcs()` (these are idempotent and can remain)
5. Update `_prov_cleanup_on_error()` to handle new provisioning path

### Phase 3: Existing Tenant Upgrade

1. Create batch upgrade script for existing tenants
2. Identify all existing tenant schemas
3. Determine their current version (likely version 0 = no migrations applied)
4. Apply all pending migrations
5. Verify schema consistency

### Phase 4: Tenant Deletion

1. Implement background purge job (PRD §8)
2. Add workspace archived → entity archived → schema purge → row cleanup

---

## 17. Open Questions / Unknowns

| Question | Status | Impact |
|----------|--------|--------|
| How many tenant schemas exist? | UNKNOWN | Determines batch upgrade scope |
| What is the current schema version of existing tenants? | UNKNOWN | Determines initial migration application |
| Are there any cross-schema references? | UNKNOWN | Could complicate isolation |
| Is `entity_bigdrops-main_main` the only tenant? | UNKNOWN | Affects upgrade strategy |
| When was the last successful provisioning? | UNKNOWN | Determines how long provisioning has been broken |
| Should tenant migrations be loaded from files or a table? | DECIDED: table | More reliable for SECURITY DEFINER functions |
| Should the migration runner be per-entity or batch? | DECIDED: both | Per-entity for provisioning, batch for upgrades |

---

## 18. Final Architecture Acceptance Checklist

| Question | Answer |
|----------|--------|
| What is the canonical source of tenant schema structure? | Versioned SQL migration files in `supabase/tenant_migrations/` |
| Is that source independent of customer data? | YES — migrations are DDL only, no data |
| Can a new company be provisioned without cloning another company? | YES — `provision_tenant_schema` applies all migrations to empty schema |
| Can a new company be provisioned without restoring public business tables? | YES — no public dependency |
| Can a new company be provisioned without an operator writing bespoke SQL? | YES — automated via migration runner |
| Can existing tenants be upgraded? | YES — `upgrade_tenant_schema` applies pending migrations |
| Can new tenants created after an upgrade receive the latest version? | YES — `provision_tenant_schema` applies all migrations |
| Is schema version explicitly tracked? | YES — via `tenant_migration_history` |
| Are migrations ordered and idempotent? | YES — sequential numeric prefix + existence checks |
| Can failed migrations safely retry? | YES — idempotent, only pending migrations re-applied |
| Is tenant business data preserved during schema upgrades? | YES — DDL-only migrations, no data manipulation |
| Can one tenant be deleted without deleting another? | YES — per-schema DROP SCHEMA CASCADE |
| Can workspace deletion eventually clean up all owned tenant schemas? | YES — PRD §8 defines cascade |
| Is the architecture compatible with future schema evolution? | YES — add new migration file, existing tenants upgrade, new tenants get current |
| Does the architecture eliminate the dependency on public.* operational business tables? | YES — no public tables in provisioning path |
| Does the architecture avoid designating a live tenant as master template? | YES — no tenant is used as template |
| Does the design preserve the Workspace → Entity → Tenant Schema isolation model? | YES |
| Is every conclusion grounded in repository/PRD evidence? | YES — or marked UNKNOWN |

---

## Evidence Index

| Claim | Evidence Type | Source |
|-------|---------------|--------|
| Provisioning clones from public | FACT | `_prov_clone_table()` in `20260717000000` |
|32 tables in template | FACT | `_prov_get_template_tables()` in `20260828000002` |
| Public tables purged | FACT | `20260830000000_public_business_schema_purge.sql` |
| No schema versioning exists | FACT | No `schema_version` column in any table |
| No tenant migration system exists | FACT | No function iterates tenant schemas |
| Supabase migrations target public | FACT | All77 migrations in `supabase/migrations/` |
| PRD §8 defines deletion lifecycle | FACT | `multi-tenancy-prd-v2.1.md` §8 |
| Cleanup drops schema on failure | FACT | `_prov_cleanup_on_error()` in `20260717000000` |
| Versioned migrations recommended | INFERENCE | Best fit for repository capabilities |
| Tenant migration runner needed | INFERENCE | Supabase doesn't support multi-schema natively |
| Batch upgrade requires background job | INFERENCE | PRD §8 defines delayed purge pattern |
