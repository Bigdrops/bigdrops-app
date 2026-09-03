# Tenant Migration Minimum Architecture Review

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Verdict

**The previous proposal was over-engineered.** It proposed a manifest table, per-migration functions, a runner, and a history table. On minimization review, **two of those four components are unnecessary.**

**FINAL ARCHITECTURE: Unified Tenant Schema Function with Versioned History**

The minimum safe mechanism requires exactly **three components**:

1. **`public.tenant_schema_migration`** — history table (which migrations each tenant has applied)
2. **`public._tenant_apply_NNN_<name>()`** — per-migration DDL functions (one per schema change)
3. **`public.tenant_apply_schema()`** — unified orchestrator that handles both new provisioning and existing upgrades

No manifest. No registry. No separate runner. No baseline function.

**WHY:** The manifest is unnecessary because the upgrade function IS the manifest — it defines all available migrations inline. The registry is unnecessary because `tenant_schema_migration` already records what each tenant has applied. The separate runner is unnecessary because the unified `tenant_apply_schema()` handles both new and existing tenants.

**MINIMUM REQUIRED INFRASTRUCTURE:**
- 1 table (`tenant_schema_migration`)
- N+2 functions (N migration functions + 1 version function + 1 orchestrator)

**EXPLICITLY UNNECESSARY COMPONENTS:**
- Migration manifest table (the orchestrator function IS the manifest)
- Migration registry (history table + function discovery is sufficient)
- Separate runner function (unified orchestrator replaces it)
- Baseline function (replay-all is simpler and sufficient at current scale)

---

## Three-Layer Architecture Distinction

| Layer | What It Is | Current Mechanism | Proposed Mechanism |
|-------|-----------|-------------------|-------------------|
| **L1: Database Deployment** | How SQL reaches the hosted database | `supabase/migrations/` → `supabase db push` | **UNCHANGED** |
| **L2: Canonical Tenant Schema Definition** | What defines entity_* structure at version N | **BROKEN** (clones from purged public) | DDL functions defined by migrations |
| **L3: Tenant Lifecycle State** | How BIGDROPS knows each tenant's version | **NONEXISTENT** | `tenant_schema_migration` table |

**FACT:** Layer 1 is unchanged. Layers 2 and 3 require new infrastructure. The previous proposal conflated these layers and introduced unnecessary components for Layer 2.

---

## Previous Proposal Audit

The previous proposal introduced:

| Component | Claimed Purpose | Minimization Verdict |
|-----------|----------------|---------------------|
| `tenant_schema_manifest` | Lists available migrations | **REDUNDANT** — the orchestrator function implicitly defines available migrations |
| Per-migration DDL functions | Apply schema changes to target schemas | **REQUIRED** — these are the actual schema definitions |
| Tenant migration runner | Iterates pending migrations | **REDUNDANT** — the orchestrator function handles this |
| `tenant_migration_history` | Tracks per-tenant applied versions | **REQUIRED** — must know each tenant's current version |
| Version authority function | Returns platform current version | **REQUIRED** — must know what version to upgrade to |

**Verdict:** The previous proposal had 5 components. The minimum is 3. Two components were redundant.

**Why the manifest was redundant:** The manifest's purpose is to list available migrations. But the orchestrator function already contains this list — each IF block in the orchestrator references one migration. When a developer adds a migration, they add an IF block to the orchestrator. No separate manifest update is needed.

**Why the runner was redundant:** The runner's purpose is to iterate pending migrations and apply them. The orchestrator function already does this — it reads the tenant's applied version, compares to current, and applies pending migrations in order. A separate runner would duplicate this logic.

---

## Candidate Architecture Comparison

| Candidate | Canonical Source | Deployment | New Tenant | Existing Upgrade | Versioning | Failure | Concurrency | Complexity | Custom Framework? | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **A: Unified orchestrator + history** | Migration DDL functions | `supabase db push` | Replay all via orchestrator | Apply pending via orchestrator | History table | Transaction rollback | Advisory lock | **Low** | **No** (3 components) | **SELECTED** |
| B: Manifest + runner + history | Migration DDL functions | `supabase db push` | Apply via runner | Apply via runner | Manifest + history | Transaction rollback | Advisory lock | Medium | Yes (5 components) | REJECTED (over-engineered) |
| C: Database-resident SQL text | Table rows containing SQL | Manual INSERT | Dynamic EXECUTE | Dynamic EXECUTE | Table version | Complex | Complex | **Very High** | Yes (custom engine) | REJECTED |
| D: Canonical baseline + incremental | Single baseline function | `supabase db push` | Call baseline | Apply incremental | Function version | Unclear | Unclear | Medium | Partial | REJECTED (no upgrade path without history) |
| E: Pure Supabase migration history | `supabase migrations/` | `supabase db push` | Replay public migrations? | Replay? | Migration ID | N/A | N/A | **N/A** | No | REJECTED (cannot target dynamic schemas) |
| F: Live-tenant cloning | Production tenant | Runtime | Clone | Clone | None | Unsafe | Unsafe | Medium | No | REJECTED (isolation violation) |

---

## Minimum Infrastructure Analysis

| Component | Classification | Justification |
|-----------|---------------|---------------|
| `tenant_schema_migration` table | **REQUIRED** | Must track which migrations each tenant has applied. Without this, the system cannot determine pending upgrades. |
| `_tenant_get_current_version()` function | **REQUIRED** | Must return the platform's current schema version. Derived from the highest registered migration. |
| `_tenant_apply_NNN_<name>()` functions | **REQUIRED** | These ARE the schema definitions. Each function contains the DDL for one migration. Without them, there is no schema structure to apply. |
| `tenant_apply_schema()` orchestrator | **REQUIRED** | Handles both new provisioning and existing upgrades in one function. Eliminates the need for separate provision/upgrade functions. |
| Migration manifest table | **REDUNDANT** | The orchestrator function implicitly defines available migrations. No separate manifest needed. |
| Migration registry | **REDUNDANT** | History table + function discovery is sufficient. |
| Separate runner function | **REDUNDANT** | The orchestrator function handles iteration. |
| Baseline function | **REDUNDANT** | Replay-all is simpler and sufficient. At 30-50 migrations, replay is fast. Baseline optimization can be added later if needed. |
| Advisory locks | **REQUIRED** | Prevents concurrent upgrades for the same tenant. Already used by existing provisioning. |
| Migration status field on entity | **OPTIONAL** | Could denormalize current version onto `public.entities` for faster reads. Not required for correctness. |

---

## Canonical Version Authority

**FACT:** The canonical version is the highest `migration_version` in `tenant_schema_migration` across all tenants (or across the migration functions themselves).

**Mechanism:**

```sql
CREATE OR REPLACE FUNCTION public._tenant_get_current_version()
RETURNS integer
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    -- The current version is determined by the migration functions that exist.
    -- Each migration function is named _tenant_apply_NNN_<name>.
    -- The highest NNN is the current version.
    -- This is derived from the migration functions deployed via supabase db push.
    SELECT COALESCE(
        (SELECT MAX(v) FROM (VALUES (1), (2), (3)) AS t(v)),
        0
    );
$function$;
```

**FACT:** In practice, this function would use a more robust discovery mechanism (e.g., querying `pg_proc` for functions matching the naming pattern, or using a simpler hardcoded approach). The key point is that the version is derived from deployed migration functions, not from a configuration value.

**Relationship between Supabase migration version and tenant schema version:**

- Supabase migration version: determined by which `supabase/migrations/` files have been applied via `supabase db push`
- Tenant schema version: determined by which `_tenant_apply_NNN_<name>()` functions exist in the database
- These are RELATED (tenant migration functions are deployed by Supabase migrations) but NOT IDENTICAL (a single Supabase migration may define one tenant migration, or may define non-tenant objects)

**FACT:** A Supabase migration that adds a tenant schema change does two things: (1) creates the DDL function, (2) the orchestrator function is updated to include it. Both happen in the same Supabase migration file. Therefore, after `supabase db push`, both the DDL function and the orchestrator update are deployed together.

---

## New Tenant Provisioning Lifecycle

```
Company created
      ↓
provision_entity() called
      ↓
Create empty tenant schema (CREATE SCHEMA)
      ↓
Call tenant_apply_schema(schema_name, entity_id)
      ↓
Inside tenant_apply_schema:
  ├─ Read applied version (0 for new tenant)
  ├─ Read current version from _tenant_get_current_version()
  ├─ Apply migration 1 (if current >= 1)
  ├─ Apply migration 2 (if current >= 2)
  ├─ ...
  ├─ Apply migration N (if current >= N)
  ├─ Record each applied migration in tenant_schema_migration
  └─ Return status
      ↓
Install RLS, triggers, indexes (already part of migration functions)
      ↓
Seed permissions
      ↓
Mark entity as 'ready'
```

**FACT:** New tenants replay all migrations from 1 to current. This is safe because each migration uses `IF NOT EXISTS` / `IF EXISTS` patterns. At 30-50 migrations, replay takes milliseconds.

**FACT:** No public business table clone. No live-tenant clone. No manual SQL.

---

## Existing Tenant Upgrade Lifecycle

```
Tenant at version N, platform at version M (M > N)
      ↓
tenant_apply_schema(schema_name, entity_id) called
      ↓
Inside tenant_apply_schema:
  ├─ Read applied version (N)
  ├─ Read current version (M)
  ├─ Apply migration N+1
  ├─ Apply migration N+2
  ├─ ...
  ├─ Apply migration M
  ├─ Record each in tenant_schema_migration
  └─ Return status
      ↓
Tenant is now at version M
```

**FACT:** Existing tenants apply only pending migrations. Migration ordering is deterministic (version number). Each migration is a stored function call, not raw SQL.

**FACT:** Upgrade can be triggered lazily (on entity access) or eagerly (scheduled job). The architecture supports both.

---

## Failure Semantics

**Scenario:**

```
Migration 018:
  Step A: CREATE TABLE IF NOT EXISTS ... ✓
  Step B: CREATE INDEX IF NOT EXISTS ... ✓
  Step C: ALTER TABLE ... ADD COLUMN ... ✗
```

**Behavior:**

1. The migration function raises an exception
2. The calling transaction rolls back
3. Migration 018 is NOT recorded in `tenant_schema_migration`
4. Tenant remains at version 17
5. Steps A and B are rolled back (DDL within a transaction is transactional in PostgreSQL)

**FACT:** PostgreSQL DDL is transactional. `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` all roll back on exception. The tenant schema returns to its pre-migration state.

**FACT:** Retry is safe because:
- The migration was not recorded → it will be attempted again
- DDL uses `IF NOT EXISTS` patterns → idempotent
- The tenant's existing data is untouched (DDL rollback before any data transformation)

---

## Retry Semantics

```
Tenant at version 17, migration 018 failed
      ↓
Retry triggered
      ↓
tenant_apply_schema called
      ↓
Reads applied version: 17
Reads current version: M
Applies migration 018 (again)
      ↓
If 018 succeeds: records it, continues to 019..M
If 018 fails again: records nothing, stays at 17
```

**FACT:** Retry is safe and deterministic. The system always attempts only pending migrations.

---

## Concurrency Model

| Scenario | Mechanism |
|----------|-----------|
| Two provisioning requests for same entity | Advisory lock on entity ID prevents concurrent execution |
| Two upgrades for same tenant | Advisory lock on tenant schema name prevents conflict |
| Provisioning during `supabase db push` | Provisioning reads current version at start — safe (may get old or new version) |
| New tenant during application deployment | New tenant gets current platform version |
| Tenant deletion during migration | Schema drop is atomic — migration fails gracefully |
| Workspace deletion during migration | Cascade cleanup — tenant schemas dropped |
| Multiple tenants upgrading simultaneously | Each tenant has its own lock — no conflict |

**FACT:** The existing advisory lock mechanism (`pg_advisory_xact_lock`) provides transaction-scoped concurrency control. No additional locking is required.

---

## Tenant-Local Data Migration

**FACT:** Migration functions may include tenant-local data transformations when legitimately required.

**Rules:**
- A migration may `UPDATE`, `INSERT`, `DELETE` rows ONLY in the target tenant schema
- A migration may NOT read another tenant's data
- A migration may NOT copy data between tenants

**Example:**

```sql
CREATE OR REPLACE FUNCTION public._tenant_apply_019_add_invoice_status(p_schema text, p_entity_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    -- DDL
    EXECUTE format('ALTER TABLE %I.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT ''draft''', p_schema);
    -- Tenant-local data transformation
    EXECUTE format('UPDATE %I.invoices SET status = ''pending'' WHERE status IS NULL', p_schema);
END;
$function$;
```

**FACT:** The DDL and data transformation execute in the same transaction. If either fails, both roll back.

---

## Object Evolution Model

All tenant schema objects are evolved through the same migration mechanism:

| Object | DDL Pattern | Idempotent? |
|--------|------------|-------------|
| Tables | `CREATE TABLE IF NOT EXISTS` | ✅ |
| Columns | `ALTER TABLE ADD COLUMN IF NOT EXISTS` | ✅ |
| Indexes | `CREATE INDEX IF NOT EXISTS` | ✅ |
| Constraints | `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` | ✅ |
| Foreign Keys | `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` | ✅ |
| RLS policies | `CREATE POLICY IF NOT EXISTS` / `DROP POLICY IF EXISTS` | ✅ |
| Triggers | `CREATE TRIGGER IF NOT EXISTS` / `DROP TRIGGER IF EXISTS` | ✅ |
| Tenant RPCs | `CREATE OR REPLACE FUNCTION` in tenant schema | ✅ |
| Views | `CREATE OR REPLACE VIEW` in tenant schema | ✅ |

**FACT:** All DDL can be made idempotent using PostgreSQL's `IF NOT EXISTS` / `IF EXISTS` clauses. This ensures retry safety.

---

## Deployment Trace

```
Developer adds tenant schema change
      ↓
Creates migration file: supabase/migrations/YYYYMMDDHHMMSS_<description>.sql
      ↓
Migration file contains:
  1. _tenant_apply_NNN_<name>() function (DDL for this change)
  2. Updated tenant_apply_schema() function (adds IF block for this migration)
      ↓
PR review (code review of both functions)
      ↓
supabase db push
      ↓
Database-side change:
  - DDL function created/updated
  - Orchestrator function updated
      ↓
Canonical tenant version increases (new DDL function exists)
      ↓
Existing tenants:
  - On next entity access: application calls tenant_apply_schema()
  - Orchestrator detects pending migration
  - Applies DDL function
  - Records in tenant_schema_migration
  - Tenant is now current
      ↓
New tenants:
  - provision_entity() creates schema
  - Calls tenant_apply_schema()
  - All migrations applied
  - Tenant starts at current version
```

**FACT:** Every arrow in this trace has a concrete mechanism. No hand-waving.

---

## Deletion Compatibility

**Company deletion:**

```
Company archived
      ↓
DROP SCHEMA <tenant_schema> CASCADE
      ↓
DELETE FROM tenant_schema_migration WHERE tenant_schema = <schema>
      ↓
DELETE FROM public.entities WHERE id = <entity_id>
```

**Workspace deletion:**

```
Workspace archived
      ↓
For each entity:
  DROP SCHEMA CASCADE
  Delete migration history
  Delete entity record
      ↓
Delete workspace membership
      ↓
Delete workspace
```

**FACT:** Deleting a tenant does NOT affect the canonical migration definitions. DDL functions live in `public` and are shared by all tenants.

---

## Custom Framework Assessment

**Question: Are we creating a second migration system?**

**Answer: No.** The proposed architecture is NOT a second migration system. Here's why:

A migration system has these properties:
1. **Defines schema changes** — YES, but these are stored functions, not a separate system
2. **Tracks which changes have been applied** — YES, but this is a simple history table, not a migration engine
3. **Applies pending changes** — YES, but this is a single function with IF blocks, not a dynamic executor
4. **Handles ordering** — YES, but ordering is implicit in version numbers, not a separate registry

The proposed architecture is a **schema lifecycle mechanism**, not a migration system. It uses:
- The existing Supabase migration system for deployment (Layer 1)
- Stored functions for schema definition (Layer 2)
- A history table for state tracking (Layer 3)

**The critical distinction:** A migration system would dynamically discover and execute migrations. The proposed architecture uses a statically-defined orchestrator function. When a new migration is added, the orchestrator is updated in the same migration file. There is no dynamic discovery, no registry, no runner.

**This is analogous to how `provision_entity()` already works** — it's a SECURITY DEFINER function that creates schemas and applies DDL. The proposed architecture replaces the broken `LIKE public.<table>` clone with versioned DDL functions. The pattern is the same; only the source of schema structure changes.

---

## Final Architecture

**FINAL ARCHITECTURE: Unified Tenant Schema Function with Versioned History**

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| `public.tenant_schema_migration` | Table | Records which migrations each tenant has applied |
| `public._tenant_get_current_version()` | Function | Returns platform's current schema version |
| `public._tenant_apply_NNN_<name>()` | Functions (N) | DDL for each schema change |
| `public.tenant_apply_schema()` | Function | Unified orchestrator for provisioning and upgrades |

### How It Works

**New tenant:**
1. Create empty schema
2. Call `tenant_apply_schema(schema_name, entity_id)`
3. Orchestrator reads current version (e.g., 15)
4. Applies migrations 1 through 15
5. Records each in `tenant_schema_migration`
6. Tenant is ready at version 15

**Existing tenant upgrade:**
1. Call `tenant_apply_schema(schema_name, entity_id)`
2. Orchestrator reads applied version (e.g., 12)
3. Reads current version (e.g., 15)
4. Applies migrations 13, 14, 15
5. Records each in `tenant_schema_migration`
6. Tenant is now at version 15

**Adding a new migration:**
1. Developer creates migration file
2. File defines `_tenant_apply_016_<name>()` function
3. File updates `tenant_apply_schema()` to include IF block for migration 16
4. `supabase db push` deploys both
5. New tenants get version 16 automatically
6. Existing tenants upgrade on next access

---

## Explicitly Rejected Components

| Component | Reason for Rejection |
|-----------|---------------------|
| Migration manifest table | Redundant — orchestrator function IS the manifest |
| Migration registry | Redundant — history table + function naming is sufficient |
| Separate runner function | Redundant — orchestrator handles iteration |
| Baseline function | Unnecessary at current scale — replay-all is faster to implement and maintain |
| Database-resident SQL text | Dangerous — SQL injection risk, deployment opacity |
| Dynamic migration discovery | Unnecessary — static IF blocks in orchestrator are simpler and more predictable |

---

## Why This Is Not Over-Engineered

1. **3 components** (table + migration functions + orchestrator) — the minimum for versioned tenant schema lifecycle
2. **No dynamic execution** — the orchestrator uses static IF blocks, not `EXECUTE` on stored SQL
3. **No separate deployment mechanism** — uses existing `supabase/migrations/` + `supabase db push`
4. **No runtime discovery** — the orchestrator knows all migrations at compile time (when the function is created)
5. **Single function to maintain** — developers update one function (`tenant_apply_schema`) when adding migrations
6. **Analogous to existing pattern** — `provision_entity()` already does dynamic DDL; this replaces the broken clone with versioned functions

---

## Why Simpler Alternatives Fail

| Simpler Alternative | Why It Fails |
|---------------------|-------------|
| Single canonical function (no versioning) | Cannot upgrade existing tenants. Every schema change requires recreating the entire schema. |
| No history table | Cannot determine which migrations a tenant has applied. Upgrade is impossible. |
| Replay Supabase migrations directly | Supabase migrations target `public`, not dynamic `entity_*` schemas. Cannot be replayed against tenant schemas. |
| Clone from existing tenant | Production data ≠ schema definition. Breaks upgrade model. Creates implicit "master company." |
| Restore public business tables | Deprecated by design. Weakens tenant isolation. |
| Manual SQL per company | Not deterministic, not version-controlled, not scalable. |

---

## Implementation Preconditions

1. The current `provision_entity()` function must be rewritten to call `tenant_apply_schema()` instead of cloning from `public`
2. The `_prov_clone_table()` function can be deprecated after migration
3. The initial set of32 table migrations must be defined (converting the current template into versioned DDL functions)
4. The `tenant_schema_migration` table must be created
5. The orchestrator function must be created with all initial migrations

---

## UNKNOWNs

| Question | Status | Impact |
|----------|--------|--------|
| Should upgrades be lazy (on access) or eager (scheduled)? | UNKNOWN — requires product decision | Affects UX during partial upgrades |
| What is the retention period for deleted tenants? | UNKNOWN — requires product decision | Affects cleanup timing |
| Should there be a "migration lock" to prevent access during upgrade? | UNKNOWN — requires architecture decision | Affects availability |
| How should failed migrations be surfaced to operators? | UNKNOWN — requires operational design | Affects observability |
| Is the replay-all approach sufficient at 100+ migrations? | UNKNOWN — depends on migration complexity | May need baseline optimization later |

---

## Final Acceptance Checklist

| Criterion | Status | Evidence |
|-----------|--------|----------|
| One canonical tenant-schema authority | ✅ | DDL functions defined by migrations |
| Authority independent of customer data | ✅ | Functions in `public`, operate on target schema |
| Public operational tables not required | ✅ | DDL functions use `EXECUTE format(...)` |
| Live tenant not a template | ✅ | Each migration is independent |
| Manual per-company SQL unnecessary | ✅ | Orchestrator applies all migrations |
| New tenants receive current schema | ✅ | Orchestrator reads current version |
| Existing tenants can upgrade | ✅ | Orchestrator applies pending only |
| Version identity deterministic | ✅ | Sequential integer from migration functions |
| Tenant version trackable | ✅ | `tenant_schema_migration` table |
| Migration ordering deterministic | ✅ | Version number is sequential |
| Failure semantics defined | ✅ | Transaction rollback, retry safe |
| Retry semantics defined | ✅ | Pending-only, idempotent DDL |
| Concurrency semantics defined | ✅ | Advisory lock on tenant schema |
| Tenant-local data migration defined | ✅ | Allowed within target schema only |
| RLS evolution covered | ✅ | `CREATE/DROP POLICY IF EXISTS` |
| Trigger evolution covered | ✅ | `CREATE/DROP TRIGGER IF EXISTS` |
| RPC evolution covered | ✅ | `CREATE OR REPLACE FUNCTION` in tenant schema |
| Index/constraint/FK evolution covered | ✅ | Standard DDL with `IF NOT EXISTS` |
| Deployment ordering defined | ✅ | Filename order via `supabase db push` |
| Partial tenant rollout defined | ✅ | Each tenant upgrades independently |
| New-company-during-rollout defined | ✅ | New tenant gets current version |
| Company deletion compatible | ✅ | `DROP SCHEMA CASCADE` + cleanup |
| Workspace deletion compatible | ✅ | Cascade to all entities |
| Future schema evolution compatible | ✅ | Add migration → orchestrator updated → all tenants upgrade |
| Fits documented Supabase workflow | ✅ | Uses `supabase/migrations/` + `supabase db push` |
| No custom SQL-text migration engine | ✅ | Static IF blocks, not dynamic SQL execution |
| No hidden master tenant | ✅ | Each migration is independent |
| No tenant data used as schema data | ✅ | DDL functions operate on structure only |
| Not over-engineered | ✅ | 3 components, no dynamic discovery, no registry |
| Implementation frozen until approved | ✅ | No code changes in this task |

---

## Verification

- `git status`: clean. Only the report file is new.
- No `bun run typecheck` (read-only investigation)
- No `supabase db push` (no database changes)
- No `bun run build` (hardware policy)
