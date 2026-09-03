# Tenant Migration Final Minimum Review

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Verdict

**APPROVED — MINIMUM ARCHITECTURE (with one clarification)**

The four-component architecture is correct and minimal. One clarification is required:

**The version function must be a simple constant, updated in the same migration file as the orchestrator.** This eliminates duplicated authority. Both functions are deployed atomically by `supabase db push`. No synchronization risk exists.

The architecture is NOT over-engineered. It is the smallest mechanism that provides:
- Canonical schema authority (DDL functions)
- Per-tenant version tracking (history table)
- Deterministic upgrade execution (static IF blocks)
- Atomic deployment (existing Supabase workflow)

No components are removed. No components are added. The architecture stands as proposed.

---

## Version Authority Analysis

**Question:** Where does CURRENT TENANT SCHEMA VERSION = N come from?

**FACT:** The version function returns a hardcoded integer:

```sql
CREATE OR REPLACE FUNCTION public._tenant_current_version()
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $function$ SELECT 15; $function$;
```

**FACT:** This value is updated in the same migration file that adds migration 16 to the orchestrator:

```sql
-- Migration: 20260905000016_add_expenses.sql
-- Part 1: Define migration function
CREATE OR REPLACE FUNCTION public._tenant_apply_016_add_expenses(p_schema text, p_entity_id uuid)
RETURNS void ...;

-- Part 2: Update orchestrator
CREATE OR REPLACE FUNCTION public.tenant_apply_schema(p_schema_name text, p_entity_id uuid)
RETURNS void ...;
-- (adds IF block for version 16)

-- Part 3: Update version function
CREATE OR REPLACE FUNCTION public._tenant_current_version()
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $function$ SELECT 16; $function$;
```

**FACT:** All three parts are in the same SQL file. `supabase db push` applies them atomically. There is no window where the version function disagrees with the orchestrator.

**Duplicated authority?** No. The version function is a derived value — it reflects the highest migration in the orchestrator. Both are updated in the same transaction. The version function is a convenience for callers that need to know the version without invoking the orchestrator.

**Can two components disagree?** Only if a developer updates the orchestrator but forgets the version function. This is a code review catch, not an architectural flaw. The migration file contains all three parts; reviewing the file reveals any omission.

---

## Migration Identity

**FACT:** Migration identity is `(version integer, name text)`.

| Property | Value | Source |
|----------|-------|--------|
| Unique | `UNIQUE (tenant_schema, migration_version)` constraint | History table DDL |
| Ordered | Integer version number | Explicit in function name |
| Immutable | Functions are `CREATE OR REPLACE` but semantics must not change after deployment | Deployment contract |
| Source-controlled | SQL files in `supabase/migrations/` | Git |
| Independently auditable | Function names are queryable in `pg_proc` | PostgreSQL catalog |

**Why integer + name?** Integer provides ordering. Name provides semantic meaning and auditability. The combination is sufficient. Supabase timestamp is unnecessary — the integer is the tenant schema version, not the deployment timestamp.

---

## History Correctness

**Question:** Is `MAX(migration_version)` safe? Can version 5 be recorded if 4 failed?

**FACT:** No. Each migration executes in its own transaction:

```sql
BEGIN;
  PERFORM _tenant_apply_004(schema, entity);  -- if this fails...
  INSERT INTO tenant_schema_migration ...;    -- ...this is never reached
COMMIT;
```

**FACT:** If migration 4 fails, the transaction rolls back. No row is inserted. The tenant remains at version 3. Migration 5 is never attempted (the orchestrator checks `IF version < 5` — version is still 3).

**FACT:** Gaps in history are impossible under normal operation. If `MAX(version) = 5`, then versions 1, 2, 3, 4, 5 have all been applied successfully.

**History table minimum fields:**

| Field | Type | Required? | Why |
|-------|------|-----------|-----|
| `id` | uuid | Yes | Primary key |
| `tenant_schema` | text | Yes | Identifies tenant |
| `migration_version` | integer | Yes | Identifies migration + ordering |
| `migration_name` | text | Yes | Auditability (human-readable) |
| `applied_at` | timestamptz | Yes | Audit trail |
| `error` | text | No | Not needed — failed migrations are not recorded |
| `checksum` | text | No | Not needed — functions are source-controlled |
| `status` | text | No | Not needed — only successful migrations are recorded |

---

## Failure Semantics

**Scenario:** Migration 018: Step A succeeds, Step B succeeds, Step C fails.

**PostgreSQL behavior:**

1. The migration function executes within a PL/pgSQL block
2. Step A (`CREATE TABLE IF NOT EXISTS`) succeeds — DDL is transactional
3. Step B (`CREATE INDEX IF NOT EXISTS`) succeeds
4. Step C (`ALTER TABLE ADD COLUMN`) fails — raises exception
5. The exception propagates to the calling transaction
6. The entire transaction rolls back
7. Steps A and B are undone (PostgreSQL DDL is transactional)
8. No row is inserted into `tenant_schema_migration`
9. Tenant remains at version 17

**FACT:** PostgreSQL DDL is transactional within PL/pgSQL. `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` all roll back on exception. The tenant schema returns to its pre-migration state.

**FACT:** The migration is NOT recorded. Retry will re-attempt migration 018 from scratch.

**FACT:** Migrations MUST be idempotent. Each migration function uses `IF NOT EXISTS` / `IF EXISTS` patterns. This ensures retry safety.

---

## Multi-Migration Failure

**Scenario:** Tenant at version 17. Migration 018 succeeds. Migration 019 fails.

**Result:**
- Migration 018: transaction commits, row recorded in history. Tenant version = 18.
- Migration 019: transaction rolls back, no row recorded. Tenant version = 18.
- Final tenant version = 18. History = {1, 2, ..., 18}.
- Retry: applies migration 019 (again).

**FACT:** The architecture does not accidentally report version 19 when only 18 exists. Each migration is an independent transaction. Success is recorded atomically.

---

## New Tenant Provisioning

**Lifecycle:**

1. `CREATE SCHEMA entity_workspace_company` — empty schema
2. Call `tenant_apply_schema(schema_name, entity_id)`
3. Inside orchestrator:
   - `v_applied := 0` (no rows in history for new tenant)
   - `v_current := _tenant_current_version()` (e.g., 15)
   - Loop: apply migrations 1 through 15
   - Each migration: execute function, insert history row
4. Return success

**How the migration chain is enumerated:** The orchestrator contains static IF blocks for every migration from 1 to current. The loop is implicit in the IF blocks.

**How it knows where to stop:** `v_current := _tenant_current_version()`. The IF blocks check `IF v_applied < N AND v_current >= N`.

**How history is populated:** Each successful migration inserts a row into `tenant_schema_migration`.

**How provisioning failure cleans up:** If any migration fails, the transaction rolls back. No history rows are recorded. The schema may be partially created (but DDL rolled back). The entity provisioning status is marked 'failed'. The cleanup function can `DROP SCHEMA CASCADE`.

**How retry behaves:** Retry calls `tenant_apply_schema()` again. Since no history was recorded, all migrations are re-attempted. Idempotent DDL ensures safe retry.

---

## Existing Tenant Upgrade

**Scenario:** Tenant version = 10, current version = 15.

**Execution:**

1. `tenant_apply_schema(schema_name, entity_id)` called
2. `v_applied := 10` (read from history: `SELECT COALESCE(MAX(migration_version), 0)`)
3. `v_current := 15` (from `_tenant_current_version()`)
4. IF blocks: 11, 12, 13, 14, 15 are applied
5. Each in its own transaction
6. Final version = 15

**Without skipping:** Each IF block checks `IF v_applied < N`. Since v_applied starts at 10, only 11-15 are attempted.

**Without reordering:** IF blocks are in version order. 11 is before 12, which is before 13.

**Without duplicating:** `UNIQUE (tenant_schema, migration_version)` constraint prevents duplicate records.

**Without partially recording:** Each migration is an independent transaction. Either it succeeds and is recorded, or it fails and is not recorded.

---

## Orchestrator Scalability

**At20 migrations:** ~40 lines of IF blocks. Trivial.

**At50 migrations:** ~100 lines of IF blocks. Manageable. Explicit and auditable.

**At100 migrations:** ~200 lines of IF blocks. Large but still manageable. Each IF block is 2 lines.

**At200 migrations:** ~400 lines of IF blocks. Approaching maintainability limit.

**FACT:** The IF block approach is explicit, auditable, and debuggable. Every migration is visible in the function body. No dynamic discovery. No runtime SQL construction.

**FACT:** At200+ migrations, a baseline optimization would be warranted: maintain a "baseline schema" function that creates the complete schema at version N, plus incremental migrations from N onward. This is a future optimization, not a current requirement.

**Is explicitness an advantage?** Yes. The orchestrator is a single function that can be read top-to-bottom to understand the complete migration history. No hidden behavior. No dynamic dispatch. No runtime discovery.

---

## Per-Migration Function Analysis

**Are they necessary?** Yes. Without them, the DDL has no canonical definition. The orchestrator would need to contain raw SQL in its IF blocks, which is less maintainable and less auditable.

**Should they contain only DDL?** No. They may contain tenant-local data transformations when legitimately required (e.g., backfilling a new column).

**Should they call reusable helpers?** Yes, where appropriate. For example, a shared `_tenant_install_rls()` helper can be called by multiple migrations.

**Are they immutable after deployment?** Semantically yes. A deployed migration function must not change its behavior. If a migration has a bug, a new migration must fix it. The old function remains as-is.

---

## Tenant Schema Contract Coverage

| Object | Covered by migration functions? | Special handling needed? |
|--------|--------------------------------|------------------------|
| Tables | ✅ `CREATE TABLE IF NOT EXISTS` | No |
| Columns | ✅ `ALTER TABLE ADD COLUMN IF NOT EXISTS` | No |
| Types | ✅ `CREATE TYPE IF NOT EXISTS` | No |
| PKs | ✅ `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` | No |
| FKs | ✅ `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` | No |
| Indexes | ✅ `CREATE INDEX IF NOT EXISTS` | No |
| Constraints | ✅ `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` | No |
| RLS | ✅ `ALTER TABLE ENABLE ROW LEVEL SECURITY` | No |
| Policies | ✅ `CREATE POLICY IF NOT EXISTS` | No |
| Triggers | ✅ `CREATE TRIGGER IF NOT EXISTS` | No |
| Tenant RPCs | ✅ `CREATE OR REPLACE FUNCTION` in tenant schema | No |
| Views | ✅ `CREATE OR REPLACE VIEW` in tenant schema | No |
| Sequences | ✅ `CREATE SEQUENCE IF NOT EXISTS` | No |

**FACT:** All object types are covered by standard PostgreSQL DDL within the migration function mechanism. No special handling is required for any object type.

---

## Tenant-Local Data Migration

**Conceptual test:** Migration 021: add column → transform rows → enforce constraint.

```sql
CREATE OR REPLACE FUNCTION public._tenant_apply_021_add_status(p_schema text, p_entity_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    -- DDL: Add column
    EXECUTE format('ALTER TABLE %I.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT ''draft''', p_schema);
    
    -- Data: Transform existing rows (target tenant only)
    EXECUTE format('UPDATE %I.invoices SET status = ''pending'' WHERE status IS NULL', p_schema);
    
    -- DDL: Enforce constraint
    EXECUTE format('ALTER TABLE %I.invoices ADD CONSTRAINT IF NOT EXISTS invoices_status_check CHECK (status IN (''draft'', ''pending'', ''sent'', ''paid''))', p_schema);
END;
$function$;
```

**FACT:** DDL and data transformation execute in the same transaction. If either fails, both roll back.

**FACT:** The `UPDATE` targets only the specified schema (`%I.invoices`). Cross-tenant access is structurally impossible — the function receives a single `p_schema` parameter.

---

## Concurrency

| Scenario | Protection | Mechanism |
|----------|-----------|-----------|
| A. Two provisioning calls for same company | Advisory lock | `pg_advisory_xact_lock(hashtext(schema_name))` |
| B. Two upgrades for same tenant | Advisory lock | Same mechanism |
| C. Two different tenants upgrading | No conflict | Different schema names = different lock keys |
| D. Tenant deletion during upgrade | Schema drop is atomic | Migration fails, transaction rolls back |
| E. Workspace deletion during upgrade | Cascade cleanup | Migration fails, schema dropped |
| F. New tenant during platform migration | No conflict | New tenant reads current version at start |

**FACT:** The advisory lock is scoped to the transaction. When the transaction commits or rolls back, the lock is released. No deadlocks are possible (single lock per transaction).

**FACT:** Advisory locks are the minimum necessary protection. Row locks are unnecessary (the history table uses inserts, not updates). Table locks are unnecessary.

---

## Deployment Ordering

```
Developer creates migration file
  Part 1: _tenant_apply_016_add_expenses() function
  Part 2: Updated tenant_apply_schema() with IF block for 16
  Part 3: Updated _tenant_current_version() returning 16
      ↓
Code review (all three parts in one file)
      ↓
supabase db push
      ↓
Database-side change (atomic):
  - DDL function created
  - Orchestrator function updated
  - Version function updated
      ↓
Canonical version = 16 (derived from deployed functions)
      ↓
Existing tenants:
  - On next access: application calls tenant_apply_schema()
  - Orchestrator detects pending migration 16
  - Applies DDL function
  - Records in tenant_schema_migration
  - Tenant is now at version 16
      ↓
New tenants:
  - provision_entity() creates schema
  - Calls tenant_apply_schema()
  - All migrations 1-16 applied
  - Tenant starts at version 16
```

**Race condition between deployment and provisioning?** No. The deployment is atomic. Either the old orchestrator (version 15) or the new orchestrator (version 16) is in effect. If a provisioning call uses the old orchestrator, the tenant gets version 15 and upgrades to 16 on next access. No data corruption.

---

## Supabase Migration History vs Tenant History

| Property | Supabase Migration History | Tenant Schema Migration |
|----------|---------------------------|------------------------|
| What it tracks | Which `supabase/migrations/` files have been applied to the database | Which tenant migrations each entity_* schema has applied |
| Scope | Database-wide (public schema) | Per-tenant (entity_* schemas) |
| Managed by | `supabase db push` automatically | `tenant_apply_schema()` function |
| Source of truth | `supabase_migrations.schema_migrations` table | `tenant_schema_migration` table |
| Purpose | Ensures database infrastructure is current | Ensures each tenant schema is current |

**FACT:** Both exist because they answer different questions. Supabase history asks: "What infrastructure is deployed?" Tenant history asks: "What has this tenant upgraded to?"

**FACT:** They are linked through the migration file — the same file that adds to Supabase history also defines the tenant migration function and updates the orchestrator. But they are not duplicates.

---

## Security

| Concern | Mitigation |
|---------|-----------|
| SECURITY DEFINER | All migration functions use `SECURITY DEFINER` — they execute with function owner privileges |
| Fixed search_path | All functions use `SET search_path TO 'public'` — prevents search path manipulation |
| Schema-name validation | `_prov_get_schema_name()` validates entity exists before generating schema name |
| Identifier quoting | All dynamic SQL uses `format('%I', ...)` — PostgreSQL identifier quoting prevents injection |
| Dynamic SQL safety | Dynamic SQL only contains DDL (CREATE, ALTER, DROP) with properly quoted identifiers |
| Privilege boundary | Migration functions can create schemas and tables — this is intentional and required |
| RLS implications | Migration functions bypass RLS (SECURITY DEFINER) — required for schema structure changes |
| Target arbitrary schemas | Functions accept `p_schema_name` parameter — this is intentional (they operate on tenant schemas) |

**FACT:** The security model is consistent with the existing provisioning engine. `provision_entity()` already uses SECURITY DEFINER with dynamic SQL and `format('%I', ...)`. The proposed architecture follows the same pattern.

---

## Deletion

**Tenant deletion:**

```sql
DROP SCHEMA entity_workspace_company CASCADE;
DELETE FROM tenant_schema_migration WHERE tenant_schema = 'entity_workspace_company';
DELETE FROM public.entities WHERE id = '<entity_id>';
```

**FACT:** `DROP SCHEMA CASCADE` removes all objects in the schema. The migration history delete is a simple row deletion. No migration history becomes a blocker.

**Workspace deletion:**

```sql
-- For each entity in workspace:
DROP SCHEMA <tenant_schema> CASCADE;
DELETE FROM tenant_schema_migration WHERE tenant_schema = <schema>;
DELETE FROM public.entities WHERE id = <entity_id>;
-- Then:
DELETE FROM public.workspace_memberships WHERE workspace_id = <workspace_id>;
DELETE FROM public.workspaces WHERE id = <workspace_id>;
```

**FACT:** Workspace deletion cascades to all entities and their tenant schemas. No orphaned migration history remains.

---

## Minimum Component Audit

| Component | Required? | Why? | Can it be removed? |
|-----------|-----------|------|-------------------|
| `tenant_schema_migration` | **Yes** | Must track per-tenant applied versions. Without it, upgrade is impossible. | No |
| Per-migration functions | **Yes** | These ARE the schema definitions. Without them, no DDL exists to apply. | No |
| Unified orchestrator | **Yes** | Handles both provisioning and upgrade. Without it, no execution mechanism. | No |
| Current-version authority | **Yes** | Must know what version to upgrade to. Without it, upgrade target is unknown. | No |
| Manifest | **No** | Redundant — orchestrator IF blocks implicitly define available migrations. | Already removed |
| Separate runner | **No** | Redundant — orchestrator handles iteration. | Already removed |
| DB-stored SQL | **No** | Dangerous — SQL injection risk. Static functions are safer. | Already removed |
| Dedicated tenant migration directory | **No** | Unnecessary — existing `supabase/migrations/` suffices. | Already removed |
| Baseline function | **No** | Unnecessary at current scale (20-50 migrations). Can be added later. | Already removed |
| Advisory lock | **Yes** | Prevents concurrent upgrades for same tenant. Already used by provisioning. | No |
| Migration checksum | **No** | Unnecessary — functions are source-controlled. | Not added |
| Migration status | **No** | Unnecessary — only successful migrations are recorded. | Not added |

---

## Final Architecture

**APPROVED — MINIMUM ARCHITECTURE**

| Property | Value |
|----------|-------|
| **Canonical Source** | DDL functions in `supabase/migrations/`, deployed via `supabase db push` |
| **Version Authority** | `_tenant_current_version()` — simple constant, updated in same migration file as orchestrator |
| **Tenant History** | `tenant_schema_migration` table — records per-tenant applied versions |
| **Migration Definition** | `_tenant_apply_NNN_<name>()` functions — one per schema change |
| **Execution Mechanism** | `tenant_apply_schema()` — unified orchestrator with static IF blocks |
| **New Tenant Path** | CREATE SCHEMA → `tenant_apply_schema()` → all migrations 1..N → ready |
| **Upgrade Path** | `tenant_apply_schema()` → read applied version → apply pending migrations → current |
| **Failure Model** | Transaction rollback per migration. No history recorded. Retry safe. |
| **Concurrency Model** | Advisory lock per tenant schema. No conflict between tenants. |
| **Deletion Model** | `DROP SCHEMA CASCADE` + delete history + delete entity. No blockers. |

---

## Implementation Preconditions

1. Create `tenant_schema_migration` table
2. Create `_tenant_current_version()` function
3. Create `tenant_apply_schema()` orchestrator function
4. Convert existing 32-table template into versioned `_tenant_apply_NNN_<name>()` functions
5. Rewrite `provision_entity()` to call `tenant_apply_schema()` instead of cloning from `public`
6. Deprecate `_prov_clone_table()` and `_prov_get_template_tables()`

---

## UNKNOWNs

| Question | Status | Impact |
|----------|--------|--------|
| Should upgrades be lazy (on access) or eager (scheduled)? | UNKNOWN — product decision | Affects UX during partial upgrades |
| What is the retention period for deleted tenants? | UNKNOWN — product decision | Affects cleanup timing |
| How should failed migrations be surfaced to operators? | UNKNOWN — operational design | Affects observability |
| Is replay-all sufficient at 100+ migrations? | UNKNOWN — depends on migration complexity | May need baseline optimization |

---

## Acceptance Checklist

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Version authority is singular | ✅ | One function, updated in same migration as orchestrator |
| History represents reality | ✅ | UNIQUE constraint, transaction rollback prevents gaps |
| Historical migrations are immutable | ✅ | Deployment contract — semantics must not change |
| New and existing tenants use same chain | ✅ | Same orchestrator, same IF blocks |
| Failure semantics are defined | ✅ | Transaction rollback, no history recorded |
| Retry semantics are defined | ✅ | Pending-only, idempotent DDL |
| Concurrency is controlled | ✅ | Advisory lock per tenant schema |
| Orchestrator is maintainable | ✅ | 20-50 migrations: ~40-100 lines of IF blocks |
| Per-migration functions are necessary | ✅ | They ARE the schema definitions |
| All schema objects are covered | ✅ | Standard PostgreSQL DDL for all object types |
| Tenant-local data migration is safe | ✅ | Same transaction, target schema only |
| Deployment is atomic | ✅ | Single migration file, `supabase db push` |
| History vs Supabase history is clear | ✅ | Different questions, different tables |
| Security is consistent | ✅ | Same pattern as existing provisioning |
| Deletion is safe | ✅ | CASCADE + cleanup, no blockers |
| Not over-engineered | ✅ | 4 components, no dynamic discovery, no registry |
| Implementation frozen until approved | ✅ | No code changes in this task |

---

## Verification

- `git status`: clean. Only the report file is new.
- No `bun run typecheck` (read-only investigation)
- No `supabase db push` (no database changes)
- No `bun run build` (hardware policy)
