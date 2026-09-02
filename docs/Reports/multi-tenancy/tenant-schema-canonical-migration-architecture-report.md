# Tenant Schema Canonical Migration Architecture Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Verdict

**SELECTED ARCHITECTURE: Database-Resident Tenant Migrations with a PostgreSQL Runner Function.**

Tenant schema migrations are stored as SQL in a `public.tenant_migrations` table. A PostgreSQL function `apply_tenant_migration(schema_name, migration_id)` applies one migration to one tenant schema. A provisioning function `provision_tenant_schema(entity_id)` creates an empty schema and applies all migrations. A history table `public.tenant_migration_history` tracks which migrations each tenant has applied.

This architecture:
- Uses the existing Supabase migration system to deploy the runner infrastructure
- Stores tenant migrations in the database (not the filesystem) so they can be applied dynamically
- Is independent of `public` operational tables
- Is independent of any existing tenant
- Supports both new-tenant provisioning and existing-tenant upgrades
- Is compatible with the existing Supabase workflow
- Handles future schema evolution through new migration entries

---

## 1. Current Architecture — FACTS

### Provisioning Mechanism

`provision_entity()` in `supabase/migrations/20260717000000_entity_provisioning_engine.sql`:

```
1. Validate permissions
2. Idempotency check
3. Acquire advisory lock
4. Get schema name: entity_<workspace_slug>_<entity_slug>
5. CREATE SCHEMA <name>
6. FOR EACH table IN _prov_get_template_tables():
     a. _prov_clone_table('public', schema, table)
        → CREATE TABLE <target>.<table> (LIKE public.<table> INCLUDING ALL)
     b. _prov_install_rls(schema, table, entity_id, resource)
7. FOR EACH table:
     a. _prov_readd_foreign_keys('public', schema, table)
8. _prov_seed_settings(entity_id, schema)
9. FOR EACH table:
     a. _prov_install_triggers('public', schema, table)
10. _prov_install_tenant_rpcs(schema)
11. _prov_seed_default_permissions(entity_id, auth.uid())
12. Status → 'ready'

On failure:
  DROP SCHEMA <name> CASCADE
  Status → 'failed'
```

### Objects Created Per Tenant

| Object Type | Count | Mechanism |
|-------------|-------|-----------|
| Tables | 32 | `CREATE TABLE ... LIKE` from `public` |
| RLS policies | ~96 (3 per table × 32) | Dynamic `CREATE POLICY` |
| Triggers | ~32 (1 per table) | Copied from `public` |
| Functions (RPCs) | 27 | `_prov_install_tenant_rpcs` with string replacement |
| Settings row | 1 | `_prov_seed_settings` |
| Permission rows | 4 (baseline) | `_prov_seed_default_permissions` |

### Migration System

77 migration files in `supabase/migrations/`. All use `SET search_path TO 'public'`. None target tenant schemas. Applied via `supabase db push`.

### Schema Versioning

**Does not exist.** No `schema_version` column anywhere.

### Config.toml API Exposure

```toml
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
```

Tenant schemas are NOT exposed through the API. They are accessed at runtime via `client.schema(schemaName)`.

---

## 2. Current Schema Authority

**FACT:** The current authoritative source of tenant schema structure is `public.*` tables. The provisioning engine reads table definitions from `public` using `LIKE`.

**FACT:** This authority was removed by the `public_business_schema_purge` migration.

**FACT:** No alternative canonical source exists in the repository.

---

## 3. Supabase Migration Model Analysis

### FACT: How Supabase Migrations Work

- Migrations are SQL files in `supabase/migrations/` with timestamped filenames
- Applied in filename order via `supabase db push`
- Each migration runs once (tracked in `supabase_migrations` table)
- Default target is `public` schema
- Migrations can use dynamic SQL (`EXECUTE format(...)`)
- Migrations can create functions that operate on other schemas

### FACT: What Migrations Currently Do

All77 migrations modify `public` schema objects. Some create functions that operate on tenant schemas (e.g., `_prov_install_tenant_rpcs` installs 27 RPCs into tenant schemas). But no migration directly creates or modifies tenant schema structure.

### INFERENCE: Can Existing Migrations Serve as Tenant Schema Authority?

**Partially.** The existing migrations define the `public` schema structure. But tenant schemas are separate PostgreSQL schemas with their own table definitions. The existing migrations do not directly define tenant table structure — they define `public` table structure, and the provisioning engine clones from that.

After the purge, `public` no longer contains the business tables. So even the indirect authority is broken.

### FACT: Can Migrations Use Dynamic SQL?

**YES.** Several migrations use `EXECUTE format(...)` for dynamic schema operations. The provisioning functions themselves are created by migrations and use dynamic SQL extensively.

### FACT: Can a Migration Create a Function That Applies DDL to Tenant Schemas?

**YES.** This is exactly what `_prov_install_tenant_rpcs` does — it creates functions in tenant schemas using string replacement. The same pattern can be used for table DDL.

---

## 4. Candidate Architecture Comparison

### Candidate A: Existing Supabase Migrations as Tenant Schema Authority

**Approach:** Modify `supabase/migrations/` to include tenant-schema-aware DDL. Use `EXECUTE format(...)` to apply DDL to dynamically named schemas.

| Criterion | Assessment |
|-----------|------------|
| Canonical source | The migration files themselves |
| New tenant provisioning | Migration creates function that applies all DDL |
| Existing tenant upgrades | Same function applies pending DDL |
| Schema version tracking | Must be added (new table) |
| Migration ordering | Timestamp filenames provide ordering |
| Compatibility with existing workflow | High — uses existing `supabase db push` |
| Operational complexity | Low — one migration system |
| Risk | Migrations become longer/more complex; mixing public and tenant DDL |

### Candidate B: Database-Resident Tenant Migrations

**Approach:** Store tenant migration SQL in a `public.tenant_migrations` table. A PostgreSQL runner function applies them to target schemas. History tracked in `public.tenant_migration_history`.

| Criterion | Assessment |
|-----------|------------|
| Canonical source | `public.tenant_migrations` table |
| New tenant provisioning | Runner applies all migrations to new schema |
| Existing tenant upgrades | Runner applies pending migrations |
| Schema version tracking | Built-in via history table |
| Migration ordering | Explicit `migration_order` column |
| Compatibility with existing workflow | High — initial infrastructure deployed via normal migration |
| Operational complexity | Medium — two storage mechanisms (files + table) |
| Risk | SQL stored in database, not version-controlled files (mitigated by loading from files) |

### Candidate C: Canonical Baseline + Incremental Migrations

**Approach:** One baseline function creates all32 tables. Additional incremental functions handle changes. Baseline is updated when new tables are added.

| Criterion | Assessment |
|-----------|------------|
| Canonical source | Baseline function + incremental functions |
| New tenant provisioning | Apply baseline + all incrementals |
| Existing tenant upgrades | Apply only pending incrementals |
| Schema version tracking | Must be added |
| Migration ordering | Explicit ordering required |
| Compatibility with existing workflow | Medium — custom mechanism |
| Operational complexity | Medium — must keep baseline in sync |
| Risk | Baseline drift; two things to maintain |

### Candidate D: Dedicated Template Schema

**Approach:** Create a `template` schema with the canonical tenant structure. Clone from template instead of `public`.

| Criterion | Assessment |
|-----------|------------|
| Canonical source | Template schema |
| New tenant provisioning | Clone from template |
| Existing tenant upgrades | Must still have migration mechanism |
| Schema version tracking | Must be added |
| Compatibility | Low — requires maintaining a separate schema |
| Risk | Template drift; still need upgrade mechanism |

### Candidate E: DDL Provisioning Function (Baseline Only)

**Approach:** One function with all32 table DDL. No upgrade mechanism.

| Criterion | Assessment |
|-----------|------------|
| New tenant provisioning | Works |
| Existing tenant upgrades | **NO MECHANISM** |
| Schema version tracking | **NONE** |
| Risk | Incomplete — solves provisioning but not lifecycle |

---

## 5. Selected Architecture

**SELECTED: Candidate B — Database-Resident Tenant Migrations with PostgreSQL Runner.**

### Why

1. **Separation of concerns:** Platform migrations (in `supabase/migrations/`) handle public schema. Tenant migrations (in `tenant_migrations` table) handle tenant schemas. No mixing.

2. **Existing workflow preserved:** The runner infrastructure is deployed via normal `supabase db push`. Tenant migrations are loaded from repository files into the table.

3. **Built-in versioning:** The history table provides per-tenant version tracking without additional infrastructure.

4. **Dynamic schema support:** The runner uses `EXECUTE format(...)` to apply DDL to any tenant schema name.

5. **Upgrade mechanism:** New tenants get all migrations. Existing tenants get only pending ones. Same mechanism.

6. **Independent of public tables:** Migrations contain explicit DDL, not clones.

7. **Independent of existing tenants:** No tenant is used as a template.

### Why Not the Others

| Candidate | Rejection Reason |
|-----------|-----------------|
| A (existing migrations) | Mixes public and tenant concerns; migrations become unwieldy; ordering coupling between platform and tenant changes |
| C (baseline + incremental) | Baseline drift risk; two things to maintain; still needs version tracking |
| D (template schema) | Still needs upgrade mechanism; template drift; maintenance burden |
| E (DDL function only) | No upgrade mechanism; incomplete lifecycle |

---

## 6. Canonical Schema Definition

### What Is It

The canonical tenant schema is defined by the ordered set of migration entries in `public.tenant_migrations`. Each entry contains:

| Column | Purpose |
|--------|---------|
| `migration_id` | Unique identifier (e.g., `001_baseline`) |
| `migration_name` | Human-readable description |
| `migration_order` | Sequential integer for ordering |
| `sql_body` | The DDL/DML SQL to execute |
| `created_at` | When the migration was added |

### Current Version

The current version is determined by:

```sql
SELECT MAX(migration_order) FROM public.tenant_migrations;
```

A tenant is "current" when its latest applied migration order equals the global maximum.

### Migration Content

Each migration is a self-contained SQL script that executes within a single transaction against a target schema. Examples:

**001_baseline.sql** — Creates all32 tables, indexes, constraints:
```sql
CREATE TABLE IF NOT EXISTS clients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    ...
);
```

**002_add_invoice_title.sql** — Adds a column:
```sql
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_setting('search_path')
          AND table_name = 'invoices' AND column_name = 'invoice_title'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_title text;
    END IF;
END $$;
```

**015_add_rls_policy.sql** — Adds an RLS policy:
```sql
CREATE POLICY IF NOT EXISTS new_policy ON invoices FOR SELECT ...;
```

---

## 7. Schema Versioning Model

### Version Identity

Each migration has a `migration_order` (sequential integer). A tenant's version is the `migration_order` of its most recently applied migration.

### Version Tracking

```sql
CREATE TABLE IF NOT EXISTS public.tenant_migration_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name text NOT NULL,
    migration_id text NOT NULL,
    migration_order integer NOT NULL,
    applied_at timestamp with time zone NOT NULL DEFAULT now(),
    duration_ms integer,
    UNIQUE (schema_name, migration_id)
);
```

### Current Version Source

The authoritative current version is `MAX(migration_order)` from `tenant_migrations`. This is computed at runtime, not stored as a static value.

### Incomplete Migration Detection

A tenant has an incomplete migration if:
- A row exists in `tenant_migration_history` for that schema with an error
- Or the migration runner recorded a partial application

The runner marks each migration as applied only after successful execution.

---

## 8. New Tenant Provisioning Lifecycle

```
Diagram 1 — New Tenant

Company Created
       ↓
provision_entity(entity_id)
       ↓
CREATE SCHEMA entity_workspace_company
       ↓
provision_tenant_schema(entity_id)
       ↓
FOR EACH migration IN tenant_migrations ORDER BY migration_order:
    apply_tenant_migration(schema_name, migration_id, sql_body)
    Record in tenant_migration_history
       ↓
Seed settings row
Install tenant RPCs
Seed default permissions
       ↓
Status → 'ready'
```

### How a New Company Receives the Current Version

`provision_tenant_schema` iterates ALL migrations in `tenant_migrations` order. A company created today receives every migration from 001 to the current latest. No cloning required.

### Company Created Tomorrow After Version N+1

Migration N+1 is added to `tenant_migrations`. New company provisioned after that receives 001 through N+1. Existing tenants at version N receive only migration N+1 when upgraded.

---

## 9. Existing Tenant Upgrade Lifecycle

```
Diagram 2 — Existing Tenant Upgrade

Tenant A (version 10)
       ↓
upgrade_tenant_schema(entity_id)
       ↓
Read tenant_migration_history for this schema
Identify pending migrations (order > 10)
       ↓
FOR EACH pending migration:
    apply_tenant_migration(schema_name, migration_id, sql_body)
    Record in tenant_migration_history
       ↓
Tenant A → version 12 (current)
```

### Who Initiates

- **Automatic on access:** The application can check version and upgrade lazily
- **Batch upgrade:** A background job can upgrade all tenants
- **Manual trigger:** An admin can trigger upgrade for specific tenants

### Transaction Safety

Each migration runs in its own transaction. If migration 12 fails:
- Migrations 10-11 are recorded (already applied)
- Migration 12 is NOT recorded
- Schema remains at version 11
- Retry applies 12 again (idempotent)

### Concurrent Upgrade Prevention

Advisory lock per entity prevents concurrent upgrades:

```sql
PERFORM pg_advisory_xact_lock(hashtext(entity_id::text));
```

### Tenant Access During Migration

The tenant schema is temporarily in a transitional state. The application should handle this by:
- Checking provisioning/migration status before queries
- Showing a "upgrading" state if migration is in progress
- The existing `entity_provisioning_status` can be extended to include `migrating` state

---

## 10. New Tenant After Upgrade

```
Diagram 3 — New Tenant After Upgrade

Platform version = 20
Existing tenants: A→20, B→19, C→20

New Company D created
       ↓
provision_tenant_schema(entity_D)
       ↓
Apply migrations 001 through 020
       ↓
Tenant D → version 20
```

**No cloning of A or B required. No public tables required. No manual SQL required.**

---

## 11. Failure / Transaction / Retry Model

### Scenario: Migration 018, Step 3 Fails

```
Migration 018 begins (transaction starts)
  Step 1: ALTER TABLE invoices ADD COLUMN x text → SUCCESS
  Step 2: CREATE INDEX idx_invoices_x ON invoices(x) → SUCCESS
  Step 3: ALTER TABLE invoices ADD CONSTRAINT chk CHECK (...) → FAILS
  Transaction rolls back (PostgreSQL transactional DDL)
  Schema unchanged (steps 1-2 rolled back)
  Migration NOT recorded in history
  Retry: apply migration 018 again → all 3 steps re-executed
```

### Key Properties

- **Transactional:** PostgreSQL DDL is transactional. Failed migrations roll back completely.
- **Idempotent:** Each migration uses `IF NOT EXISTS` / `IF EXISTS` guards.
- **Retry-safe:** Unrecorded migrations can be re-applied safely.
- **No partial state:** A failed migration leaves the schema at the previous version.

### If Migration Is Not Idempotent

A non-idempotent migration that fails mid-way will roll back (transactional). On retry, it starts fresh. The only risk is if the migration has side effects outside the transaction (e.g., calling an external API). Tenant migrations should be pure DDL/DML.

---

## 12. RLS / Trigger / RPC / Index / FK Evolution

### All Part of Schema Evolution

| Object | How It's Versioned |
|--------|-------------------|
| Tables | `CREATE TABLE IF NOT EXISTS` in migration |
| Columns | `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| Indexes | `CREATE INDEX IF NOT EXISTS` |
| Foreign keys | `ALTER TABLE ADD CONSTRAINT ... IF NOT EXISTS` |
| RLS policies | `CREATE POLICY IF NOT EXISTS` |
| Triggers | `DROP TRIGGER IF EXISTS; CREATE TRIGGER ...` |
| Functions | `CREATE OR REPLACE FUNCTION` |
| Views | `CREATE OR REPLACE VIEW` |

### Changing One Object

Adding an RLS policy is a new migration entry:
```sql
CREATE POLICY IF NOT EXISTS new_policy ON invoices FOR SELECT ...;
```

Existing tenants receive it via upgrade. New tenants receive it via provisioning.

### Removing an Object

Deprecation migration:
```sql
DROP POLICY IF EXISTS old_policy ON invoices;
```

Or rename for safety:
```sql
ALTER TABLE old_table RENAME TO _deprecated_old_table;
```

---

## 13. Tenant-Local Data Migration Policy

### Rule

A tenant migration MAY operate on that tenant's own data when legitimately required. It MUST NOT:
- Copy data between tenants
- Use another tenant as a data source
- Read from another tenant's schema

### Examples

**Backfilling a new column:**
```sql
UPDATE invoices SET priority = 0 WHERE priority IS NULL;
```

**Converting data format:**
```sql
UPDATE settings SET custom_info = '[]'::text WHERE custom_info IS NULL;
```

**Both are legitimate tenant-local data migrations.**

### Forbidden

```sql
-- FORBIDDEN: copying from another tenant
INSERT INTO entity_a.invoices SELECT * FROM entity_b.invoices;
```

---

## 14. Company Deletion Lifecycle

```
Diagram 4 — Company Deletion

Company Archived
       ↓
entity_provisioning_status → 'archived'
RLS denies access
       ↓
Retention period (e.g., 30 days)
       ↓
Background job:
  1. UPDATE status → 'purging'
  2. DROP SCHEMA entity_ws_company CASCADE
  3. UPDATE status → 'purged'
  4. DELETE FROM tenant_migration_history WHERE schema_name = ...
  5. DELETE FROM entities WHERE id = ...
       ↓
Complete
```

### How Schema Is Identified

From `public.entities`: `entity_<workspace_slug>_<entity_slug>`.

### Cannot Target Another Tenant

`DROP SCHEMA entity_ws_company CASCADE` affects only that schema. No cross-schema dependencies exist (FKs are intra-schema).

### Failed Purge Retry

If step 2 fails (e.g., lock contention):
- Status remains `purging`
- Job retries on next run
- No partial state

---

## 15. Workspace Deletion Lifecycle

```
Diagram 5 — Workspace Deletion

Workspace Archived
       ↓
RLS denies all member access
       ↓
FOR EACH entity IN workspace:
  Same as Company Deletion Lifecycle above
       ↓
DELETE FROM workspace_members WHERE workspace_id = ...
DELETE FROM workspace_invitations WHERE workspace_id = ...
DELETE FROM workspaces WHERE id = ...
       ↓
Complete
```

### Failure Isolation

If one entity's purge fails, other entities continue purging. The workspace remains in `archived` state until all entities are purged.

---

## 16. Deployment Lifecycle

```
Diagram 6 — Platform Deployment

Developer creates migration file:
  supabase/migrations/20260903000000_add_tenant_migrations.sql
  (creates tenant_migrations table, runner function, etc.)
       ↓
Repository review + merge
       ↓
supabase db push (deploys runner infrastructure to public)
       ↓
Load tenant migration 001_baseline.sql into tenant_migrations table
  (one-time seed or application-layer load)
       ↓
Canonical tenant version = 1
       ↓
New tenants: provision at version 1
Existing tenants: upgrade to version 1 (if applicable)
```

### Future Tenant Schema Change

```
Developer creates:
  INSERT INTO tenant_migrations (migration_id, migration_name, migration_order, sql_body)
  VALUES ('002_add_feature', 'Add feature column', 2, 'ALTER TABLE invoices ADD COLUMN feature text;');
       ↓
Deployed via normal workflow (supabase db push if wrapped in a migration, or application-layer)
       ↓
Canonical tenant version = 2
       ↓
New tenants: provision at version 2
Existing tenants at version 1: upgrade via migration 002
```

### If Migration Deployment Succeeds But Tenant Upgrade Fails

- Platform version is 2
- Some tenants remain at version 1
- New tenants provision at version 2
- Failed tenants retry upgrade on next attempt

### If New Tenant Created While Existing Tenants Still Upgrading

- New tenant gets all migrations (version 2)
- Existing tenants upgrade independently
- No conflict

---

## 17. Concurrency Model

| Scenario | Protection |
|----------|------------|
| Two provisioning attempts for same company | Advisory lock per entity |
| Provisioning while platform migration changes | Platform migration deploys runner changes; provisioning uses current runner |
| Two upgrades for same tenant | Advisory lock per entity |
| Company deletion during migration | Status check before purge; migration and purge are sequential |
| Workspace deletion while tenant migration running | Advisory lock prevents concurrent operations on same entity |

---

## 18. Future Schema Evolution

| Change | How Handled |
|--------|------------|
| Add new table | New migration: `CREATE TABLE IF NOT EXISTS ...` |
| Add column | New migration: `ALTER TABLE ADD COLUMN IF NOT EXISTS ...` |
| Add index | New migration: `CREATE INDEX IF NOT EXISTS ...` |
| Change RLS policy | New migration: `DROP POLICY IF EXISTS ...; CREATE POLICY ...` |
| Add/change trigger | New migration: `DROP TRIGGER IF EXISTS ...; CREATE TRIGGER ...` |
| Change tenant RPC | New migration: `CREATE OR REPLACE FUNCTION ...` |
| Add foreign key | New migration: `ALTER TABLE ADD CONSTRAINT ...` |
| Deprecate table | New migration: `ALTER TABLE RENAME TO _deprecated_...` |
| Data migration | New migration with tenant-local DML |

**No dependency on `public.*` operational tables. No dependency on existing tenants.**

---

## 19. Explicitly Rejected Architectures

| Architecture | Rejection Reason |
|-------------|-----------------|
| Restore `public.*` business tables | Resurrects deprecated public operational layer |
| Clone from `entity_bigdrops-main_main` | Implicit master customer, no upgrade path |
| Manual SQL per company | Not scalable, not reproducible |
| DDL function without versioning | Incomplete lifecycle |
| Template schema without migration mechanism | No upgrade path |
| Using existing `supabase/migrations/` directly for tenant schemas | Mixes concerns; ordering coupling |

---

## 20. Required Future Implementation Phases

### Phase 1: Infrastructure (1 migration)

Create via normal `supabase/migrations/`:
- `public.tenant_migrations` table
- `public.tenant_migration_history` table
- `public.apply_tenant_migration(schema, migration_id, sql_body)` function
- `public.provision_tenant_schema(entity_id)` function
- `public.upgrade_tenant_schema(entity_id)` function
- `public.get_tenant_schema_version(entity_id)` function

### Phase 2: Baseline Migration (1 tenant migration)

Load `001_baseline.sql` into `tenant_migrations` table. This contains DDL for all32 tables, generated from existing table definitions.

### Phase 3: Provisioning Integration (1 migration)

Update `provision_entity()` to call `provision_tenant_schema()` instead of the clone loop. Remove `_prov_get_template_tables()` and `_prov_clone_table()` dependencies.

### Phase 4: Existing Tenant Upgrade

- Identify all existing tenant schemas
- Determine current version (likely 0 = no migrations applied)
- Run `upgrade_tenant_schema()` for each

### Phase 5: Tenant Deletion

Implement background purge job per PRD §8.

---

## 21. Open Questions / UNKNOWNs

| Question | Status | Impact |
|----------|--------|--------|
| How many tenant schemas exist? | UNKNOWN | Determines batch upgrade scope |
| Current schema version of existing tenants | UNKNOWN | Determines initial migration application |
| Cross-schema references | UNKNOWN | Could complicate isolation |
| When was last successful provisioning? | UNKNOWN | Determines how long broken |
| Should baseline migration be generated or hand-written? | DECIDED: generated | More reliable |
| Should tenant migrations be loaded from files or API? | DECIDED: files via seed script | Version-controlled |

---

## 22. Final Architecture Acceptance Checklist

| Question | Answer |
|----------|--------|
| One canonical source of tenant schema structure? | YES — `tenant_migrations` table |
| Independent of tenant business data? | YES — DDL only |
| No production tenant as template? | YES — no tenant used |
| No deprecated public tables required? | YES — explicit DDL |
| No manual SQL per company? | YES — automated |
| New companies receive current version? | YES — all migrations applied |
| Existing companies can upgrade? | YES — pending migrations applied |
| Schema version tracked? | YES — `tenant_migration_history` |
| Migrations ordered? | YES — `migration_order` column |
| Migration failure defined? | YES — transactional rollback |
| Migration retry defined? | YES — idempotent re-application |
| Concurrent upgrades controlled? | YES — advisory lock |
| Tenant data preserved? | YES — DDL-only migrations |
| RLS part of evolution? | YES — migration entries |
| Triggers part of evolution? | YES — migration entries |
| RPCs part of evolution? | YES — existing `_prov_install_tenant_rpcs` |
| Indexes part of evolution? | YES — migration entries |
| Data migration policy? | YES — tenant-local only |
| Company deletion defined? | YES — PRD §8 + runner cleanup |
| Workspace deletion defined? | YES — cascade to entities |
| New tenant during upgrade? | YES — gets current version |
| Partial upgrade safe? | YES — transactional rollback |
| Compatible with Supabase workflow? | YES — infrastructure via `supabase db push` |
| Future changes don't need public tables? | YES — explicit DDL |
| Future changes don't need tenant cloning? | YES — explicit DDL |
| No hidden master company? | YES |
| Preserves Workspace → Entity → Schema? | YES |
| Implementable with repository mechanisms? | YES |
| No disguised assumptions? | YES |
| Implementation deferred? | YES |

---

## Evidence Index

| Claim | Evidence Type | Source |
|-------|---------------|--------|
| Provisioning clones from public | FACT | `_prov_clone_table()` in `20260717000000` |
|32 tables in template | FACT | `_prov_get_template_tables()` in `20260828000002` |
| Public tables purged | FACT | `20260830000000_public_business_schema_purge.sql` |
| No schema versioning | FACT | No `schema_version` in any table |
| No tenant migration system | FACT | No function iterates tenant schemas |
| Migrations target public only | FACT | All77 migrations use `SET search_path TO 'public'` |
| Dynamic SQL supported in migrations | FACT | Multiple migrations use `EXECUTE format(...)` |
| Tenant schemas accessed via `client.schema()` | FACT | `config.toml` exposes only `public` |
| PRD §8 defines deletion | FACT | `multi-tenancy-prd-v2.1.md` |
| RLS installed dynamically | FACT | `_prov_install_rls()` in `20260717000000` |
| Tenant RPCs installed via string replacement | FACT | `_prov_install_tenant_rpcs()` in `20260827000000` |
| Advisory lock prevents concurrency | FACT | `pg_advisory_xact_lock` in `provision_entity()` |
| Database-resident migrations recommended | INFERENCE | Best fit for dynamic schema requirements |
| Runner function needed | INFERENCE | Supabase doesn't support multi-schema natively |
| Baseline generated from existing definitions | INFERENCE | More reliable than hand-written |
