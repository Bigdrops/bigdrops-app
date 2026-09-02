# Tenant Schema Lifecycle Forensic Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Determination

**The BIGDROPS provisioning engine has no canonical, independent source of tenant schema structure.** It clones table structure from `public.*` tables using `CREATE TABLE ... LIKE public.<table> INCLUDING ALL`. When the `public_business_schema_purge` migration dropped those tables, the provisioning engine lost its only template source.

There is no dedicated template schema, no schema versioning system, no tenant migration mechanism, and no DDL-based provisioning. The architecture assumes `public` will always contain the business tables — an assumption that the multitenancy migration intentionally violated.

**The correct fix is to introduce a DDL-based schema provisioning mechanism** that creates tenant tables from explicit migration-defined DDL, not by cloning from another schema.

---

## 1. Canonical Multi-Tenancy PRD Requirements

### §2 — Tenancy Hierarchy

```
Platform → Workspace → Entity (company) → Schema (isolated Postgres schema)
```

Three boundaries: workspace (security), entity (business), schema (storage).

### §9 — Entity Creation

> Entity creation itself runs through a SECURITY DEFINER RPC (not raw client DDL) that checks the caller holds create_entity in workspace_members.permissions (or is owner) before executing CREATE SCHEMA.

### §8 — Workspace Deletion

Soft-delete with delayed purge:
1. `status = 'archived'` — RLS denies access immediately
2. After retention period — background job runs `DROP SCHEMA ... CASCADE` per entity
3. Then removes workspace/entity rows

### §9.1 — Provisioning Status

Status transitions: `pending → creating → ready | failed`

The PRD defines the observability contract but NOT the mechanism for creating tenant table structure.

---

## 2. Current Provisioning Architecture

### Provisioning Call Graph

```
provision_entity(p_entity_id)
├── _prov_validate_permissions(p_entity_id)
├── _prov_check_idempotency(p_entity_id)
├── _prov_create_schema(v_schema_name)
│   └── CREATE SCHEMA <entity_workspace_entity>
├── _prov_get_template_tables()
│   └── Returns ARRAY[32 table names]
├── FOREACH table:
│   ├── _prov_clone_table('public', v_schema_name, table)
│   │   └── CREATE TABLE <target>.<table> (LIKE public.<table> INCLUDING ALL)
│   │   └── DROP foreign keys
│   └── _prov_install_rls(v_schema_name, table, entity_id, resource)
├── FOREACH table:
│   └── _prov_readd_foreign_keys('public', v_schema_name, table)
├── _prov_seed_settings(entity_id, schema_name)
├── FOREACH table:
│   └── _prov_install_triggers('public', v_schema_name, table)
├── _prov_install_tenant_rpcs(schema_name)
├── _prov_seed_default_permissions(entity_id, auth.uid())
└── _prov_update_status(entity_id, 'ready')

On failure:
└── _prov_cleanup_on_error(v_schema_name)
    └── DROP SCHEMA <entity_workspace_entity> CASCADE
```

### Key Functions

| Function | Role |
|----------|------|
| `_prov_get_template_tables()` | Returns hardcoded array of32 table names |
| `_prov_clone_table('public', target, table)` | `CREATE TABLE target.table (LIKE public.table INCLUDING ALL)` — structure only, no data |
| `_prov_create_schema(name)` | `CREATE SCHEMA <name>` |
| `_prov_cleanup_on_error(name)` | `DROP SCHEMA <name> CASCADE` on provisioning failure |
| `_prov_install_rls(schema, table, entity, resource)` | Installs RLS policies for the tenant table |
| `_prov_install_triggers(source, target, table)` | Copies triggers from source to target |
| `_prov_install_tenant_rpcs(schema)` | Installs 27 lifecycle/audit RPCs into the tenant schema |
| `_prov_seed_settings(entity, schema)` | Seeds a canonical settings row |
| `_prov_seed_default_permissions(entity, user)` | Grants baseline entity_permissions to the creator |

---

## 3. Tenant Schema Creation Lifecycle

### How a New Company Is Created

1. Frontend calls `createEntity({ workspaceId, displayName, slug })` → inserts into `public.entities`
2. Frontend calls `provisionEntity(entity.id)` → calls `supabase.rpc('provision_entity', { p_entity_id })`
3. `provision_entity()`:
   - Validates caller has `create_entity` permission
   - Checks idempotency (already ready? already creating?)
   - Acquires advisory lock
   - Creates schema: `CREATE SCHEMA entity_<workspace_slug>_<entity_slug>`
   - Clones32 tables from `public` to the new schema
   - Installs RLS policies on each table
   - Re-adds foreign keys
   - Seeds settings row
   - Installs triggers
   - Installs 27 tenant RPCs
   - Seeds default permissions for the creator
   - Marks status as `ready`
4. On failure: drops the partial schema, marks status as `failed`

### Schema Name Convention

```
entity_<workspace_slug>_<entity_slug>
```

Example: `entity_bigdrops-main_main`

---

## 4. Canonical Schema-Definition Source

### What Exists

| Mechanism | Status |
|-----------|--------|
| Dedicated template schema | **DOES NOT EXIST** |
| Schema versioning | **DOES NOT EXIST** |
| Tenant migration system | **DOES NOT EXIST** |
| DDL-based provisioning | **DOES NOT EXIST** |
| Clone from `public` | **BROKEN** (tables purged) |
| Clone from existing tenant | **NOT DESIGNATED** as canonical |

### What the Architecture Actually Uses

The provisioning engine clones from `public` tables. This was the original design when `public` contained the business tables. The multitenancy migration moved data into tenant schemas and purged `public`, but the provisioning engine was never updated to reflect this change.

---

## 5. Workspace Creation Lifecycle

### What Happens

1. User creates workspace via `WorkspaceCreation` page
2. `createWorkspace({ name, slug })` → inserts into `public.workspaces` with `status = 'pending_approval'`
3. Platform Owner approves → `approve_workspace()` → sets `status = 'active'`, creates owner membership
4. No tenant schema is created at workspace creation — schemas are created per-entity

### Key Point

Workspace creation does NOT create any tenant schema. Tenant schemas are created only when a company/entity is created within a workspace.

---

## 6. Company Creation Lifecycle

### What Happens

1. `createEntity()` → inserts into `public.entities` (workspace-scoped)
2. `provisionEntity()` → creates schema, clones tables, installs RLS/triggers/RPCs
3. On success: entity is `ready`, schema is usable
4. On failure: schema is dropped, entity is `failed`

### What Does NOT Exist

- No schema version tracking
- No upgrade mechanism for existing tenants
- No mechanism to create a tenant at a different schema version
- No way to know which "version" of the schema a tenant has

---

## 7. Existing-Tenant Upgrade Lifecycle

### FACT: No Tenant Migration System Exists

When the BIGDROPS platform adds a new column, table, index, trigger, RPC, or RLS policy, there is NO mechanism to propagate that change to existing tenant schemas.

**Evidence:**
- No migration iterates across tenant schemas
- No `schema_version` column exists on entities or provisioning status
- No function applies migrations to existing tenants
- The only "upgrade" path is: the provisioning engine was updated to include new tables in `_prov_get_template_tables()`, so NEW tenants get the updated structure. Existing tenants do NOT.

**INFERENCE:** This means existing tenants created before a schema change will permanently lack any new columns, tables, or functions added after their creation. The only workaround is manual SQL per tenant.

---

## 8. New-Company-After-Upgrade Lifecycle

### What Happens

When a new company is created after a platform schema upgrade:
1. `_prov_get_template_tables()` returns the CURRENT list of tables (updated by latest migration)
2. `_prov_clone_table()` clones from `public` — but `public` tables were purged
3. **Provisioning fails** with `relation "public.<table>" does not exist`

### What SHOULD Happen

New tenants should receive the current schema version. Without a DDL-based provisioning mechanism or a template schema, this is impossible after the public purge.

---

## 9. Company Deletion Lifecycle

### FACT: Defined in PRD §8 but Not Fully Implemented

The PRD defines:
1. Soft-delete: workspace `status = 'archived'`
2. RLS denies access immediately
3. After retention period: background job runs `DROP SCHEMA ... CASCADE` per entity
4. Then removes workspace/entity rows

**What exists in code:**
- `_prov_cleanup_on_error()` drops schemas on provisioning failure
- The `entity_provisioning_status` table has `purging` and `purged` states
- The TenantGate handles `blocked` (purging) and `unavailable` (purged) phases

**What is NOT implemented:**
- The background purge job
- The retention period logic
- The workspace archived → purge transition

---

## 10. Workspace Deletion Lifecycle

### FACT: Defined in PRD §8

Workspace deletion follows the same soft-delete pattern:
1. `status = 'archived'` — immediate RLS denial
2. Delayed purge of all entity schemas
3. Removal of workspace/entity rows

---

## 11. Public Control-Plane Boundary

### Legitimate Public Tables (Control Plane)

| Table | Purpose |
|-------|---------|
| `entities` | Company/entity registry |
| `workspaces` | Workspace registry |
| `workspace_members` | Membership |
| `workspace_invitations` | Invitations |
| `permission_templates` | Role templates |
| `permission_template_items` | Template items |
| `entity_permissions` | Entity-level permissions |
| `entity_provisioning_status` | Provisioning state |
| `platform_operators` | Platform staff |

### Deprecated Public Tables (Operational — Purged)

All32 business tables. The purge migration confirmed they have tenant replacements and are tenant-authoritative.

---

## 12. Status of `20260902034052_restore_public_template_tables.sql`

**FACT:** This file does NOT exist on disk and is NOT in git history. It was created during an earlier session but was never committed and has been removed.

**Status: UNAPPLIED, REMOVED.** No action needed.

---

## 13. Whether Live-Tenant Cloning Is Architecturally Valid

**NO.** An existing tenant schema (e.g., `entity_bigdrops-main_main`) is an instance of the architecture, not the architecture's source of truth. Using it as a template:

1. Creates a dependency on a specific production tenant
2. Does not protect against data contamination
3. Does not address schema upgrades
4. Does not handle the case where the reference tenant has been modified
5. Is not documented or designated as a canonical mechanism

---

## 14. Whether a Dedicated Template Mechanism Exists

**NO.** There is no:
- Template schema (e.g., `entity_template`)
- DDL provisioning function
- Schema version registry
- Tenant migration runner

The only "template" mechanism is `_prov_get_template_tables()` which returns table names to clone from `public`.

---

## 15. Tenant-Isolation Risk Assessment

| Risk | Severity | Description |
|------|----------|-------------|
| No tenant upgrade mechanism | CRITICAL | Existing tenants permanently lack new features |
| Provisioning depends on purged tables | CRITICAL | New companies cannot be created |
| No schema versioning | HIGH | Impossible to know which version a tenant has |
| No DDL-based provisioning | HIGH | Schema structure is not version-controlled |
| Live-tenant cloning proposed | HIGH | Would create implicit master template dependency |
| Public table restoration proposed | CRITICAL | Would reintroduce deprecated public operational layer |

---

## 16. Recommended Architecture for Reconciling Provisioning

### Immediate Fix: DDL-Based Schema Provisioning

Replace the clone-from-public approach with explicit DDL statements that create each table directly in the target schema:

```sql
CREATE TABLE <target_schema>.clients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    ...
);
```

**How to implement:**
1. Create a new function `_prov_create_tenant_tables(p_schema_name text)` that contains explicit DDL for all32 tables
2. Replace the `_prov_clone_table` loop with a call to this function
3. Keep `_prov_install_rls`, `_prov_install_triggers`, `_prov_install_tenant_rpcs` as-is
4. Remove the dependency on `public` business tables

**Pros:**
- Schema structure is version-controlled in migrations
- No dependency on any source schema
- New tenants always get the current schema version
- Existing tenants can be upgraded by running the same DDL against their schemas

**Cons:**
- Significant migration work to extract DDL from existing table definitions
- Must be kept in sync with future schema changes

### Long-Term: Tenant Migration System

After DDL-based provisioning is in place, implement a tenant migration system:
1. Add `schema_version` column to `entities` or `entity_provisioning_status`
2. Create a migration runner that applies pending migrations to tenant schemas
3. Run migrations on existing tenants when the platform schema changes
4. New tenants receive all migrations up to the current version

---

## 17. Explicitly Prohibited Regressions

- Do NOT restore `public.clients` or any other public business table
- Do NOT revert the `public_business_schema_purge` migration
- Do NOT use a live tenant as a master template
- Do NOT create manual-SQL-per-company workflows
- Do NOT weaken tenant isolation boundaries
- Do NOT introduce public-to-tenant or tenant-to-public fallback behavior

---

## 18. Open Questions

1. **How many existing tenant schemas exist, and what is their current schema version?** This determines whether a tenant upgrade mechanism is needed immediately or can be deferred.

2. **Is `entity_bigdrops-main_main` the only tenant schema, or are there others?** If others exist, they may have different schema versions.

3. **Should the DDL provisioning function be generated from the existing table definitions, or hand-written?** Generated is more reliable but requires tooling.

4. **When was the last new tenant successfully provisioned?** This establishes how long the provisioning has been broken.

---

## Evidence Index

| Claim | Evidence Type | Source |
|-------|---------------|--------|
| Provisioning clones from public | FACT | `_prov_clone_table()` in `20260717000000` |
|32 tables in template | FACT | `_prov_get_template_tables()` in `20260828000002` |
| Public tables purged | FACT | `20260830000000_public_business_schema_purge.sql` |
| No template schema exists | FACT | No `CREATE SCHEMA template` in any migration |
| No schema versioning | FACT | No `schema_version` column in any table |
| No tenant migration system | FACT | No migration iterates tenant schemas |
| Cleanup drops schema on failure | FACT | `_prov_cleanup_on_error()` in `20260717000000` |
| Workspace deletion is soft-delete | FACT | PRD §8 |
| Purge migration removed restoration file | FACT | File not on disk, not in git history |
| Live-tenant cloning not designated | FACT | No documentation designates any tenant as template |
| DDL provisioning recommended | INFERENCE | Smallest safe change that resolves provisioning |
| Tenant upgrade mechanism needed | INFERENCE | No existing tenants can receive new columns/tables |
