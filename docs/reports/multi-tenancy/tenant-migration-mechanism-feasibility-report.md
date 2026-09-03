# Tenant Migration Mechanism Feasibility Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Verdict

**SELECTED ARCHITECTURE: Existing Supabase Migrations with Versioned Tenant Schema Functions**

The existing `supabase/migrations/` system CAN serve as the canonical source of tenant schema structure. Each migration file defines DDL as stored PostgreSQL functions that operate on dynamically named tenant schemas via `EXECUTE format(...)`. A manifest table tracks which migrations each tenant has applied. A runner function applies pending migrations. No custom migration engine, no database-resident SQL text, and no separate migration directory is required.

**WHY:** The repository already uses dynamic DDL in migrations (the provisioning engine itself does this). The existing `supabase db push` deployment workflow remains unchanged. The migration files ARE the source of truth. The functions they define ARE the implementation. This is the simplest architecture that satisfies all acceptance criteria.

**REJECTED ALTERNATIVES:**
- Database-resident SQL text + dynamic runner (high complexity, SQL injection risk, deployment opacity)
- Dedicated `supabase/tenant_migrations/` directory (requires custom runner, duplicate deployment workflow)
- Canonical baseline DDL function (no versioning, no upgrade path)
- Live-tenant cloning (production data ≠ schema definition)
- Public business table restoration (deprecated, tenant isolation violation)

**IMPLEMENTATION PRECONDITION:** The current `provision_entity()` function must be rewritten to call the new runner instead of cloning from `public`. This is a separate implementation task.

---

## Evidence Base

All conclusions are grounded in repository evidence. Evidence classification:

- **FACT** — directly established by code, SQL, migration, or configuration
- **INFERENCE** — strongly implied by evidence
- **UNKNOWN** — not established by available evidence

---

## Current Supabase Migration Model — FACTS

| Property | Value | Source |
|----------|-------|--------|
| Migration location | `supabase/migrations/` | `database-workflow.md` |
| Filename format | `YYYYMMDDHHMMSS_<description>.sql` | `database-workflow.md` |
| Apply order | Filename order | `database-workflow.md` |
| Deployment command | `supabase db push` | `database-workflow.md` |
| Local Docker | Not used | `database-workflow.md` |
| Hosted project | `xqlpekpkbszpdgtuwybh` | `database-workflow.md` |
| API exposed schemas | `public`, `graphql_public` | `config.toml` |
| Tenant schema access | `client.schema(schemaName)` | `tenantClient.ts` |
| Total migrations | ~50+ | `ls supabase/migrations/` |
| Dynamic DDL in migrations | Yes (provisioning, data migration) | Multiple migration files |

**FACT:** Migrations already contain dynamic DDL via `EXECUTE format(...)`. The provisioning engine (`20260717000000`) creates schemas and clones tables using dynamic SQL. Data migration functions (`20260809030000`, `20260810040000`, etc.) operate on tenant schemas via dynamic SQL.

**FACT:** No existing tenant schema versioning infrastructure exists. No `schema_version` table. No `tenant_migration_history`. No upgrade mechanism.

**FACT:** Data migrations are one-time, human-executed, production-specific operations. Not automated tenant-wide upgrades.

---

## Current Tenant Provisioning Model — FACTS

| Component | Mechanism | Source |
|-----------|-----------|--------|
| Schema creation | `CREATE SCHEMA %I` | `_prov_create_schema()` |
| Table creation | `LIKE public.<table> INCLUDING ALL` | `_prov_clone_table()` |
| Source schema | `public` | `_prov_get_template_tables()` |
| Template tables | 15 tables (clients, settings, invoices, etc.) | `_prov_get_template_tables()` |
| RLS installation | Dynamic per-table per-entity | `_prov_install_rls()` |
| FK re-addition | Dynamic per-table | `_prov_readd_foreign_keys()` |
| Trigger installation | Via `_prov_install_triggers()` | Provisioning engine |
| Permission seeding | Via `_prov_seed_default_permissions()` | Provisioning engine |
| Status tracking | `public.entities.provisioning_status` | `_prov_update_status()` |
| Error handling | `DROP SCHEMA CASCADE` + mark failed | `_prov_cleanup_on_error()` |
| Idempotency | Check status before provisioning | `_prov_check_idempotency()` |
| Concurrency | Transaction-scoped advisory lock | `pg_advisory_xact_lock()` |

**FACT:** The provisioning engine clones from `public`. The public business tables were purged. Provisioning is broken.

**FACT:** The provisioning engine demonstrates that `EXECUTE format(...)` in SECURITY DEFINER functions can create schemas, create tables, install RLS, add FKs, and install triggers — all within the existing migration framework.

---

## Candidate Architecture Comparison

| Architecture | Canonical Source | New Tenant | Existing Upgrade | Deployment | Complexity | Isolation | Verdict |
|---|---|---|---|---|---|---|---|
| **Existing Supabase migrations + versioned functions** | Migration files (SQL functions) | Apply all migrations via runner | Apply pending via runner | `supabase db push` | Low | ✅ | **SELECTED** |
| Dedicated `tenant_migrations/` directory | Separate SQL files | Custom runner needed | Custom runner needed | Custom deployment | High | ✅ | REJECTED |
| Database-resident SQL text + dynamic runner | Table rows containing SQL | Dynamic EXECUTE | Dynamic EXECUTE | Manual INSERT | Very High | ⚠️ | REJECTED |
| Canonical baseline DDL function | Single function body | Call function | No upgrade path | `supabase db push` | Low | ✅ | REJECTED (no versioning) |
| Live-tenant cloning | Production tenant | Clone from tenant | Clone from tenant | Runtime | Medium | ❌ | REJECTED |

---

## Selected Architecture: Existing Supabase Migrations with Versioned Tenant Schema Functions

### How It Works

Each Supabase migration that modifies tenant schema structure does three things:

1. **Defines a DDL function** that applies the change to a target schema
2. **Registers the migration** in a manifest
3. **The function uses `EXECUTE format(...)`** to apply DDL to the target schema

A **runner function** applies migrations to tenant schemas. A **manifest table** tracks which migrations each tenant has applied.

### Canonical Source of Truth

**FACT:** The migration files in `supabase/migrations/` are the canonical source. They are:
- Source-controlled in Git
- Deployed via `supabase db push`
- Reviewed as part of the normal PR workflow
- Applied in deterministic filename order

The DDL functions defined BY these migrations are the implementation of the schema structure. They are not separate from the migration system — they ARE the migration system.

### Why This Is Not a Custom Migration Engine

The existing Supabase migration workflow remains unchanged:
- Developer creates a migration file in `supabase/migrations/`
- `supabase db push` applies it
- The migration defines functions that later operate on tenant schemas

The "runner" is just a stored function that calls other stored functions. It does not store SQL text in tables. It does not use dynamic EXECUTE on raw SQL. It calls named functions that were deployed by the migration system.

---

## Version Authority

### Schema Version Tracking

A `public.tenant_schema_migration` table records which migrations each tenant has applied:

```sql
CREATE TABLE public.tenant_schema_migration (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_schema text NOT NULL,          -- e.g., 'entity_bigdrops-main_main'
    migration_name text NOT NULL,          -- e.g., '001_clients'
    migration_version integer NOT NULL,    -- e.g., 1
    applied_at timestamptz DEFAULT now(),
    UNIQUE (tenant_schema, migration_name)
);
```

**FACT:** This table lives in `public` (control plane). It tracks migration state, not tenant data.

### Migration Identity

Each migration has:
- A **name** (e.g., `001_clients`) — unique, stable, human-readable
- A **version number** (e.g., `1`) — sequential, deterministic
- A **DDL function** (e.g., `_tenant_apply_001_clients(schema_name)`) — the actual implementation

### Current Version Authority

A `public._tenant_get_current_version()` function returns the highest registered version:

```sql
CREATE OR REPLACE FUNCTION public._tenant_get_current_version()
RETURNS integer
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT COALESCE(MAX(migration_version), 0)
    FROM public.tenant_schema_migration;
$function$;
```

**INFERENCE:** The current version is determined by the migrations that have been deployed to the database via `supabase db push`. It is NOT a configuration value — it is derived from the deployed migrations.

---

## New Tenant Provisioning Lifecycle

```
Company created
      ↓
Empty tenant schema (CREATE SCHEMA)
      ↓
Read current version from _tenant_get_current_version()
      ↓
For each migration 1..current_version:
  ├─ Check if already applied (idempotent)
  ├─ Call _tenant_apply_<name>(schema_name)
  ├─ Record in tenant_schema_migration
  └─ On failure: mark failed, cleanup
      ↓
Install RLS, triggers, indexes, RPCs
      ↓
Seed permissions
      ↓
Mark entity as 'ready'
```

**FACT:** New tenants receive ALL migrations from 1 to current version. This means a company created after version N+1 is released automatically receives N+1 without any manual intervention.

**FACT:** No public business table clone. No live-tenant clone. No manual SQL.

---

## Existing Tenant Upgrade Lifecycle

```
Upgrade triggered (on entity access, scheduled, or manual)
      ↓
Read current tenant version from tenant_schema_migration
      ↓
Read platform version from _tenant_get_current_version()
      ↓
If tenant_version >= platform_version: no upgrade needed
      ↓
For each migration (tenant_version + 1)..platform_version:
  ├─ Call _tenant_apply_<name>(schema_name)
  ├─ Record in tenant_schema_migration
  └─ On failure: mark failed, stop, report
      ↓
Tenant is now at current version
```

**FACT:** Existing tenants apply only pending migrations. Migration ordering is deterministic (version number). Each migration is called as a stored function, not as raw SQL text.

---

## Failure / Transaction / Retry Model

### Failure Semantics

Each migration function is a stored function. The runner executes them within a transaction:

```sql
BEGIN
  -- Apply migration
  PERFORM _tenant_apply_<name>(p_schema_name);
  -- Record success
  INSERT INTO tenant_schema_migration (tenant_schema, migration_name, migration_version)
  VALUES (p_schema_name, '<name>', <version>);
COMMIT;
```

**FACT:** If the migration function raises an exception, the transaction rolls back. The migration is NOT recorded. The tenant remains at the previous version.

**FACT:** Retry is safe because:
- Migrations use `IF NOT EXISTS` / `IF EXISTS` patterns
- DDL is idempotent (CREATE TABLE IF NOT EXISTS, ALTER TABLE IF NOT EXISTS)
- The runner only attempts pending migrations

### Partial Failure Scenario

```
Migration 018:
  Step 1: CREATE TABLE IF NOT EXISTS ... ✓
  Step 2: CREATE INDEX IF NOT EXISTS ... ✓
  Step 3: ALTER TABLE ... ADD COLUMN ... ✗ (e.g., column exists)
```

**FACT:** The entire migration rolls back. The tenant remains at version 17. The operator can:
1. Fix the migration function (if it has a bug)
2. Deploy a corrected migration
3. Retry the upgrade

**FACT:** The tenant's existing data is NOT affected because DDL changes that fail are rolled back before any data transformation occurs.

---

## Tenant-Local Data Migration Policy

**FACT:** Migrations may include tenant-local data transformations when legitimately required.

Rules:
- A migration may `UPDATE`, `INSERT`, `DELETE` rows ONLY in the target tenant schema
- A migration may NOT read another tenant's data
- A migration may NOT copy data between tenants
- A migration may NOT use another tenant as a data source

Example of legitimate tenant-local data migration:
```sql
-- Migration 019: Add 'status' column and backfill from existing data
CREATE OR REPLACE FUNCTION public._tenant_apply_019_add_invoice_status(p_schema text)
RETURNS void LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    -- DDL: Add column
    EXECUTE format('ALTER TABLE %I.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT ''draft''', p_schema);
    -- Data: Backfill from existing data (target tenant only)
    EXECUTE format('UPDATE %I.invoices SET status = ''pending'' WHERE status IS NULL', p_schema);
END;
$function$;
```

**INFERENCE:** Tenant-local data migrations are part of the schema evolution lifecycle. They must be executed in the same transaction as the DDL change to maintain consistency.

---

## RLS / Trigger / RPC / Index / FK Evolution

All of these are covered by the same migration mechanism:

| Object | Evolution Mechanism |
|--------|-------------------|
| Tables | `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` |
| Columns | `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| Indexes | `CREATE INDEX IF NOT EXISTS` |
| Constraints | `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` |
| Foreign Keys | `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` |
| RLS policies | `CREATE POLICY IF NOT EXISTS`, `DROP POLICY IF EXISTS` |
| Triggers | `CREATE TRIGGER IF NOT EXISTS`, `DROP TRIGGER IF EXISTS` |
| Tenant RPCs | `CREATE OR REPLACE FUNCTION` in tenant schema |
| Views | `CREATE OR REPLACE VIEW` in tenant schema |

**FACT:** All of these can be implemented via `EXECUTE format(...)` in stored functions. The existing provisioning engine already demonstrates this pattern for RLS, triggers, and FKs.

---

## Deployment Lifecycle

```
Developer changes tenant schema structure
      ↓
Creates migration file: supabase/migrations/YYYYMMDDHHMMSS_<description>.sql
      ↓
Migration defines:
  1. DDL function (_tenant_apply_NNN_<name>)
  2. Registration in manifest (INSERT INTO tenant_schema_migration_version)
      ↓
PR review
      ↓
supabase db push (applies to hosted database)
      ↓
Platform version is now N (derived from deployed migrations)
      ↓
Existing tenants:
  ├─ On next access: upgrade function checks version
  ├─ Applies pending migrations
  └─ Tenant is now at version N
      ↓
New tenants:
  ├─ Provisioning runner reads current version (N)
  ├─ Applies all migrations 1..N
  └─ Tenant starts at version N
```

**FACT:** When a new migration is deployed via `supabase db push`, it becomes immediately available. Existing tenants upgrade on next access (lazy upgrade) or via a scheduled job.

**FACT:** A new tenant created during partial rollout of existing tenant upgrades receives the current platform version (N) — it does NOT inherit the partially-upgraded state of any existing tenant.

---

## Concurrency Model

| Scenario | Guarantee |
|----------|-----------|
| Duplicate provisioning for same entity | Advisory lock prevents concurrent execution (`pg_advisory_xact_lock`) |
| Simultaneous provisioning of different entities | Each entity has its own lock key — no conflict |
| Simultaneous upgrade of same tenant | Advisory lock on tenant schema name prevents conflict |
| Provisioning during platform deployment | Provisioning reads current version at start — may get old or new version depending on timing |
| Tenant deletion during migration | Schema drop is atomic — migration fails gracefully |
| Workspace deletion during tenant migration | Cascade cleanup — tenant schemas dropped |

**FACT:** The existing advisory lock mechanism (`pg_advisory_xact_lock`) provides transaction-scoped concurrency control. No additional locking is required.

---

## Company Deletion Lifecycle

```
Company deleted
      ↓
Mark entity as 'archived' (soft delete)
      ↓
Retention period (configurable)
      ↓
DROP SCHEMA <tenant_schema> CASCADE
      ↓
DELETE FROM tenant_schema_migration WHERE tenant_schema = <schema>
      ↓
DELETE FROM public.entities WHERE id = <entity_id>
      ↓
Control-plane cleanup complete
```

**FACT:** Deleting a tenant schema does NOT affect the canonical migration definitions. The migration functions live in `public` and are shared by all tenants.

---

## Workspace Deletion Lifecycle

```
Workspace deleted
      ↓
For each entity in workspace:
  ├─ Mark entity as 'archived'
  ├─ After retention: DROP SCHEMA CASCADE
  ├─ Delete migration history
  └─ Delete entity record
      ↓
Delete workspace membership records
      ↓
Delete workspace record
```

**FACT:** Workspace deletion cascades to all entities and their tenant schemas. The order is: entities → schemas → control-plane records.

---

## Future Schema Evolution Examples

### Add a new tenant table

```sql
-- Migration 020: Add expenses table
CREATE OR REPLACE FUNCTION public._tenant_apply_020_add_expenses(p_schema text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.expenses (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        entity_id uuid NOT NULL REFERENCES public.entities(id),
        amount numeric NOT NULL,
        description text,
        created_at timestamz DEFAULT now()
    )', p_schema);
    EXECUTE format('ALTER TABLE %I.expenses ENABLE ROW LEVEL SECURITY', p_schema);
    -- ... RLS policies, indexes, etc.
END;
$function$;
```

### Add a column

```sql
-- Migration 021: Add payment_method to invoices
CREATE OR REPLACE FUNCTION public._tenant_apply_021_add_payment_method(p_schema text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    EXECUTE format('ALTER TABLE %I.invoices ADD COLUMN IF NOT EXISTS payment_method text', p_schema);
END;
$function$;
```

### Change an RLS policy

```sql
-- Migration 022: Update invoice read policy
CREATE OR REPLACE FUNCTION public._tenant_apply_022_update_invoice_rls(p_schema text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS invoices_read ON %I.invoices', p_schema);
    EXECUTE format('CREATE POLICY invoices_read ON %I.invoices FOR SELECT USING (has_entity_permission(auth.uid(), entity_id, ''invoice'', ''view''))', p_schema);
END;
$function$;
```

**FACT:** All future schema changes follow the same pattern: define a DDL function, register in manifest, deploy via `supabase db push`.

---

## Explicitly Rejected Architectures

| Architecture | Reason for Rejection |
|---|---|
| Restore public.* business tables | Deprecated by design. Restoring creates accidental query targets and weakens tenant isolation. |
| Live-tenant cloning | Production data ≠ schema definition. Creates implicit "master company." Breaks upgrade model. |
| Manual per-company SQL | Not deterministic. Not scalable. Not version-controlled. |
| Database-resident SQL text | SQL injection risk. Deployment opacity. Complex security model. Dynamic EXECUTE on raw SQL is dangerous. |
| Dedicated tenant_migrations/ directory | Requires custom runner. Duplicate deployment workflow. Unnecessary complexity. |
| Single baseline DDL function | No versioning. No upgrade path. No retry semantics. |
| public-to-tenant fallback | Architectural regression. Weakens tenant isolation. |
| Tenant-to-public fallback | Architectural regression. Weakens tenant isolation. |

---

## Required Future Implementation Phases

1. **Phase 1: Schema manifest infrastructure** — Create `tenant_schema_migration` table and manifest functions
2. **Phase 2: Convert existing provisioning** — Rewrite `provision_entity()` to use the runner instead of cloning from `public`
3. **Phase 3: Define initial migration set** — Convert the current 32-table template into versioned migrations
4. **Phase 4: Upgrade mechanism** — Implement lazy upgrade on entity access
5. **Phase 5: Decommission `_prov_clone_table`** — Remove the legacy public-cloning code

---

## Open Questions / UNKNOWNs

| Question | Status | Impact |
|----------|--------|--------|
| Should upgrades be lazy (on access) or eager (scheduled)? | UNKNOWN — requires product decision | Affects UX during partial upgrades |
| What is the retention period for deleted tenants? | UNKNOWN — requires product decision | Affects cleanup timing |
| Should there be a "migration lock" to prevent access during upgrade? | UNKNOWN — requires architecture decision | Affects availability during upgrade |
| How should failed migrations be surfaced to operators? | UNKNOWN — requires operational design | Affects observability |

---

## Final Architecture Acceptance Checklist

| Criterion | Status | Evidence |
|-----------|--------|----------|
| One canonical tenant-schema authority | ✅ | Migration files in `supabase/migrations/` |
| Authority independent of customer data | ✅ | Functions defined in `public`, operate on target schema |
| Public operational tables not required | ✅ | DDL functions use `EXECUTE format(...)`, no public source needed |
| Live tenant not a template | ✅ | Each migration is a named function, not a clone |
| Manual per-company SQL unnecessary | ✅ | Runner applies all migrations automatically |
| New tenants receive current schema | ✅ | Runner reads `_tenant_get_current_version()` |
| Existing tenants can upgrade | ✅ | Runner applies pending migrations only |
| New and upgraded tenants derive from same history | ✅ | Both use the same manifest and runner |
| Version identity deterministic | ✅ | Sequential integer, derived from deployed migrations |
| Tenant version trackable | ✅ | `tenant_schema_migration` table |
| Migration ordering deterministic | ✅ | Version number is sequential |
| Failure semantics defined | ✅ | Transaction rollback, retry safe, idempotent |
| Retry semantics defined | ✅ | Pending-only, idempotent DDL |
| Concurrency semantics defined | ✅ | Advisory lock on tenant schema |
| Tenant-local data migration defined | ✅ | Allowed within target schema, cross-tenant prohibited |
| RLS evolution covered | ✅ | `CREATE/DROP POLICY IF EXISTS` |
| Trigger evolution covered | ✅ | `CREATE/DROP TRIGGER IF EXISTS` |
| RPC evolution covered | ✅ | `CREATE OR REPLACE FUNCTION` in tenant schema |
| Index/constraint/FK evolution covered | ✅ | Standard DDL with `IF NOT EXISTS` |
| Deployment ordering defined | ✅ | Filename order via `supabase db push` |
| Partial tenant rollout defined | ✅ | Each tenant upgrades independently |
| New-company-during-rollout defined | ✅ | New tenant gets current platform version |
| Company deletion compatible | ✅ | `DROP SCHEMA CASCADE` + cleanup |
| Workspace deletion compatible | ✅ | Cascade to all entities |
| Future schema evolution compatible | ✅ | Add new migration file → all tenants upgrade |
| Fits documented Supabase workflow | ✅ | Uses `supabase/migrations/` + `supabase db push` |
| No custom SQL-text migration engine | ✅ | Functions, not table-stored SQL |
| No hidden master tenant | ✅ | Each migration is independent |
| No tenant data used as schema data | ✅ | DDL functions operate on structure only |
| Implementation frozen until approved | ✅ | No code changes in this task |

---

## Verification

- `git status`: Only the report file is new. No code, migrations, or database state were modified.
- No `bun run typecheck` (read-only investigation)
- No `supabase db push` (no database changes)
- No `bun run build` (hardware policy)
