# Provisioning Architecture Forensic Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Executive Determination

**FACT:** The `provision_entity()` function clones table structure from `public.*` tables into new tenant schemas using `CREATE TABLE ... LIKE public.<table> INCLUDING ALL`.

**FACT:** The `public_business_schema_purge` migration (20260830) dropped all32 public business tables that the provisioning engine depends on as clone sources.

**FACT:** The provisioning engine was extended to expect32 tables on 20260828 — two days before the purge dropped those tables on 20260830.

**INFERENCE:** The purge migration and the provisioning template extension were developed in parallel and merged without reconciling their dependency. The purge assumed provisioning would be updated to no longer depend on public tables. That update never happened.

**INFERENCE:** Restoring32 empty public business tables would fix the provisioning failure but re-introduces the exact architecture the multitenancy migration was designed to eliminate. It creates accidental operational query targets and undermines tenant isolation.

**RECOMMENDATION:** The provisioning engine must be reconciled with the canonical multitenant architecture. The correct fix is to change `_prov_clone_table` to clone from an existing tenant schema (e.g., `entity_bigdrops-main_main`) instead of `public`.

---

## 1. Canonical Multi-Tenancy PRD Requirements

### §2 — Tenancy Hierarchy

```
Platform (BIGDROPS)
├── Workspace
│   ├── workspace_members
│   ├── workspace_invitations
│   ├── permission_templates
│   └── Entities (companies), each an isolated Postgres schema
```

Three boundaries:
- **Workspace** = who can access data (security boundary)
- **Entity** = which company data belongs to (business boundary)
- **Schema** = where data is physically isolated (storage boundary)

### §9 — Zero-Entity Onboarding

> Entity creation itself runs through a SECURITY DEFINER RPC (not raw client DDL) that checks the caller holds create_entity in workspace_members.permissions (or is owner) before executing CREATE SCHEMA.

The PRD defines the provisioning contract as: create schema, populate it, mark ready. It does NOT specify that cloning from public tables is the mechanism.

### §9.1 — Provisioning Status

The PRD defines the status transitions: `pending → creating → ready | failed`. This is an observability contract, not a cloning mechanism specification.

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
│   └── Returns ARRAY['clients', 'settings', ..., 'activity_events'] (32 tables)
├── FOREACH table:
│   ├── _prov_clone_table('public', v_schema_name, table)
│   │   └── CREATE TABLE <target>.<table> (LIKE public.<table> INCLUDING ALL)
│   │   └── DROP foreign keys (re-added later)
│   └── _prov_install_rls(v_schema_name, table, entity_id, resource)
├── FOREACH table:
│   └── _prov_readd_foreign_keys('public', v_schema_name, table)
├── _prov_seed_settings(entity_id, schema_name)
├── FOREACH table:
│   └── _prov_install_triggers('public', v_schema_name, table)
├── _prov_seed_default_permissions(entity_id, auth.uid())
└── _prov_update_status(entity_id, 'ready')
```

### Key Function: `_prov_clone_table`

```sql
CREATE TABLE <target_schema>.<table> (LIKE public.<table> INCLUDING ALL)
```

- **Structure only** — copies columns, constraints, indexes. Does NOT copy rows.
- **Source is hardcoded to `public`** — the first argument is always `'public'`.
- **FKs are dropped** — foreign keys reference the source schema and are re-added pointing to the target schema.

### Key Function: `_prov_get_template_tables`

Returns a hardcoded array of32 table names. These tables must exist in `public` for the `LIKE` clause to succeed.

---

## 3. Migration Chronology

| Date | Migration | Action |
|------|-----------|--------|
| 20260520 | `core_tables.sql` | Creates all business tables in `public` |
| 20260717 | `entity_provisioning_engine.sql` | Creates provisioning engine. Clones subset of tables from `public` |
| 20260828 | `provisioning_template_completion.sql` | Extends template to full32-table set |
| 20260830 | `public_business_schema_purge.sql` | **Drops all32 public business tables** |

**The critical gap:** On 20260828, the template was extended to32 tables. On 20260830, those32 tables were dropped from `public`. Any entity provisioned after 20260830 will fail.

---

## 4. Public Schema vs Tenant Schema Responsibility Matrix

### Legitimate Public (Control Plane)

| Table | Purpose | Status |
|-------|---------|--------|
| `entities` | Company/entity registry | ✅ Control plane |
| `workspaces` | Workspace registry | ✅ Control plane |
| `workspace_members` | Membership | ✅ Control plane |
| `workspace_invitations` | Invitations | ✅ Control plane |
| `permission_templates` | Role templates | ✅ Control plane |
| `permission_template_items` | Template items | ✅ Control plane |
| `entity_permissions` | Entity-level permissions | ✅ Control plane |
| `entity_provisioning_status` | Provisioning state | ✅ Control plane |
| `platform_operators` | Platform staff | ✅ Control plane |

### Deprecated Public (Operational — Purged)

All32 business tables listed in `_prov_get_template_tables()`:
`clients`, `settings`, `signatories`, `bank_accounts`, `projects`, `project_documents`, `quotations`, `quotation_items`, `invoices`, `invoice_items`, `payments`, `wht_receipts`, `csrs`, `blank_csr_logs`, `waybills`, `blank_waybill_logs`, `tax_settings`, `tax_filings`, `tax_input_entries`, `tax_reminders`, `receipts`, `letters`, `boqs`, `boq_rows`, `rfqs`, `rfq_items`, `item_catalog`, `item_import_batches`, `item_aliases`, `item_merge_log`, `audit_logs`, `activity_events`

These are operational business data. The purge migration confirmed: "All32 public business tables have tenant replacements in entity_bigdrops-main_main; tenant counts >= public counts for every table (tenant authoritative)."

---

## 5. Why `public.clients` Is Referenced

**Exact cause:** `_prov_clone_table('public', v_schema_name, 'clients')` executes:

```sql
CREATE TABLE entity_workspace_company.clients (LIKE public.clients INCLUDING ALL)
```

Since `public.clients` was dropped by the purge migration, this fails with `relation "public.clients" does not exist`.

The32-table restoration migration (`20260902034052`) proposed recreating these tables as empty structural templates. This would fix the provisioning failure but re-introduces the deprecated public operational layer.

---

## 6. Whether Public Template Tables Are Architecturally Legitimate

**NO.** The purge migration explicitly removed these tables as the final step of the multitenancy cutover. The comment states:

> All32 public business tables have tenant replacements in entity_bigdrops-main_main; tenant counts >= public counts for every table (tenant authoritative).

Recreating them — even empty — re-establishes the dependency path: `provisioning → public tables → clone`. This contradicts the completed multitenancy architecture where tenant schemas are self-contained.

**Risk of accidental operational queries:** If empty public tables exist, any code path that resolves `public.clients` instead of the tenant schema's `clients` would silently succeed against the empty table rather than failing with a clear schema-resolution error. This makes schema-resolution bugs harder to detect.

---

## 7. Whether the Proposed32-Table Restoration Is Compatible with Multitenancy

**NO.** The restoration:

1. Re-introduces32 operational business tables into `public`.
2. Maintains the legacy provisioning dependency: `provisioning → public → tenant`.
3. Creates accidental query targets that could mask schema-resolution bugs.
4. Contradicts the purge migration's intent.
5. Does not address the root cause: the provisioning engine still assumes `public` as the template source.

The restoration is a **workaround**, not a fix. It makes the old provisioning path work without reconciling it with the canonical architecture.

---

## 8. Tenant-Isolation Risk Assessment

| Risk | Severity | Description |
|------|----------|-------------|
| Accidental public queries | HIGH | Empty public tables could mask schema-resolution bugs |
| Provisioning dependency on public | HIGH | New entities depend on public table structure |
| Future migration confusion | MEDIUM | Developers may assume public tables are authoritative |
| RLS bypass potential | LOW | Empty tables have no data, but RLS policies could be confusing |
| Architectural regression | HIGH | Reverses the multitenancy cutover completion |

---

## 9. Recommended Next Implementation Direction

The provisioning engine must be reconciled with the canonical multitenant architecture. Two options:

### Option A: Clone from an Existing Tenant Schema

Change `_prov_clone_table` to clone from an existing tenant schema (e.g., `entity_bigdrops-main_main`) instead of `public`:

```sql
-- Before:
PERFORM public._prov_clone_table('public', v_schema_name, v_table);

-- After:
PERFORM public._prov_clone_table('entity_bigdrops-main_main', v_schema_name, v_table);
```

**Pros:**
- Uses the actual canonical schema as the template source.
- No public operational tables needed.
- Provisioning reflects the real tenant architecture.

**Cons:**
- Depends on the reference tenant schema existing and being up-to-date.
- If the reference schema drifts, new entities inherit the drift.

### Option B: DDL-Based Schema Definition

Replace the clone-from-template approach with explicit DDL statements that create each table directly in the target schema:

```sql
CREATE TABLE <target_schema>.clients (...);
CREATE TABLE <target_schema>.invoices (...);
-- etc.
```

**Pros:**
- No dependency on any source schema.
- Schema definition is explicit and version-controlled in migrations.
- Most robust long-term approach.

**Cons:**
- Significant migration work to extract DDL from existing table definitions.
- Must be kept in sync with any future schema changes.

### Recommended: Option A (Immediate) → Option B (Future)

Option A is the smallest safe change that resolves the provisioning failure without reintroducing public operational tables. Option B is the architecturally pure solution for the long term.

---

## 10. What Must NOT Be Changed

- `public_business_schema_purge` migration must NOT be reverted.
- Public operational business tables must NOT be restored.
- Tenant isolation boundaries must NOT be weakened.
- RLS policies must NOT be modified.
- The canonical entity/workspace control-plane tables are NOT affected.

---

## 11. Open Questions

1. Is `entity_bigdrops-main_main` guaranteed to exist and have the correct32-table schema? (It should, based on the migration history, but this should be verified against the live database.)

2. Are there any other provisioning dependencies on `public` tables that aren't captured in `_prov_get_template_tables()`?

3. Should the provisioning engine be moved to a dedicated `provisioning` schema to further isolate it from the control plane?

---

## Evidence Index

| Claim | Evidence Type | Source |
|-------|---------------|--------|
| Provisioning clones from public | FACT | `provision_entity()` in `20260809020000` |
|32 tables listed in template | FACT | `_prov_get_template_tables()` in `20260828000002` |
| Purge dropped all32 tables | FACT | `20260830000000_public_business_schema_purge.sql` |
| Template extended before purge | FACT | Migration timestamps (20260828 vs 20260830) |
| Clone is structure-only | FACT | `_prov_clone_table()` uses `LIKE ... INCLUDING ALL` |
| PRD doesn't specify clone mechanism | FACT | §9 says "executing CREATE SCHEMA" only |
| Restoration re-introduces public dependency | INFERENCE | Empty public tables maintain the clone dependency |
| Accidental queries possible against empty tables | INFERENCE | Schema resolution bugs would silently succeed |
| Option A is smallest safe change | INFERENCE | One-line change to source schema parameter |
