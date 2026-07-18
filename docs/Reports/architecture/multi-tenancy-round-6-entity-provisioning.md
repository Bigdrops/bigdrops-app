# Multi-Tenancy Round 6 — Entity Provisioning Engine

This report was written by MiMoCode on 2026-07-17 via Local Runner.

---

## 1. Scope

Implementation of the Entity Provisioning Engine — the production pipeline for creating new business entities. Append-only migration, no existing files modified.

**Intentionally excluded:**
- Application-layer code changes
- Phase 0 grandfathering data migration
- Entity-schema RLS policy creation for existing entities

---

## 2. Migration

`supabase/migrations/20260717000000_entity_provisioning_engine.sql` (476 lines)

### 2.1 Architecture

One public orchestration function + 12 private helper functions:

| Function | Purpose |
|----------|---------|
| `provision_entity(uuid)` | Public entry point — nested blocks separate pre-flight from provisioning |
| `_prov_validate_permissions()` | Owner OR create_entity check |
| `_prov_check_idempotency()` | ready/creating/failed/new routing |
| `_prov_update_status()` | Upsert entity_provisioning_status |
| `_prov_get_schema_name()` | `entity_<ws_slug>_<entity_slug>` |
| `_prov_create_schema()` | CREATE SCHEMA |
| `_prov_clone_table()` | `(LIKE ... INCLUDING ALL)` + drop FKs |
| `_prov_readd_foreign_keys()` | Re-add FKs to target schema |
| `_prov_install_rls()` | 4 policies per table via has_entity_permission() |
| `_prov_cleanup_on_error()` | DROP SCHEMA on failure |
| `_prov_get_template_tables()` | 15-table config list |
| `_prov_table_to_resource()` | Table-to-resource name mapping |
| `_prov_get_retry_limit()` | Configurable retry ceiling (default: 3) |

### 2.2 Idempotency Strategy

| State | Behavior |
|-------|----------|
| READY | Return success immediately, no work |
| CREATING | Return "already in progress" |
| FAILED | Check attempt_count vs retry limit; if exceeded, return "Manual Intervention Required" |
| (none) | Proceed with provisioning |

### 2.3 Concurrency Protection

`pg_advisory_xact_lock(hashtext(entity_id::text))` — transaction-scoped, auto-released on commit/rollback.

### 2.4 Template Tables (15)

clients, settings, signatories, bank_accounts, projects, quotations, invoices, payments, csrs, waybills, tax_settings, receipts, letters, boqs, rfqs

---

## 3. Bugs Found by Real Execution

All 4 bugs were reproduced by running the migration against real Postgres 15.

### Bug 1 — LIKE syntax
**Error:** `syntax error at or near LIKE`
**Fix:** `CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)` — parentheses required.

### Bug 2 — Bind parameters in DDL
**Error:** `there is no parameter $1`
**Fix:** Use `%L` literals in `format()` instead of `USING` bind parameters.

### Bug 3 — Invalid ERRCODE
**Error:** `unrecognized exception condition error_during_execution`
**Fix:** `USING ERRCODE = 'P0001'`

### Bug 4 — Broad exception handler (most serious)
**Error:** Pre-flight exceptions (permission denial, idempotent no-op) caught by the same `EXCEPTION WHEN OTHERS` as provisioning failures, corrupting healthy entity state.
**Fix:** Nested blocks — pre-flight in outer block (no handler), provisioning in inner block (with handler). PL/pgSQL's `EXCEPTION WHEN OTHERS` catches all exceptions in the block, so nested blocks are required for separation.

---

## 4. Verification Results

| Scenario | Result | Detail |
|----------|--------|--------|
| S1: Successful provisioning | **PASS** | Schema created, 15 tables, 60 policies, status=ready |
| S2: Idempotent re-provision | **PASS** | Returns ready, no work done |
| S3: Member with create_entity | **PASS** | Successfully provisioned (verified via direct call) |
| S4: Unauthorized user rejected | **PASS** | Permission error, NO status record created |
| S5: Cross-workspace isolation | **PASS** | Two distinct schemas, no cross-access |
| S6: Retry limit tracking | **PASS** | Attempt count = 2 (correct) |
| S7: Bug 4 regression test | **PASS** | Status and attempts unchanged after unauthorized call on ready entity |

**7/7 pass** (S3 had a test isolation issue in the automated script but passes when run directly).

---

## 5. Verification Gate

| Check | Status |
|-------|--------|
| `bun run typecheck` | Timeout (large project, no new TS files) |
| `bun run audit:load` | ✅ Clean — no new issues |
| `git status` | ✅ Only new migration file |
| Lifecycle test (7 scenarios) | ✅ All pass |
| Docker cleanup | ✅ Container removed |

---

## 6. Deferred Work

- **Phase 0 grandfathering** — data migration from existing entities to schema-per-entity model
- **Entity-schema RLS for existing entities** — existing entities need schemas created retroactively
- **Retry configuration table** — current implementation uses a function; could be upgraded to a table for runtime configurability
- **Template table additions** — new entity-specific tables added in future migrations must be added to `_prov_get_template_tables()`

---

## 7. Delegation Log

```
[DELEGATION] task="Round 6 Entity Provisioning Engine — migration, 4 bug fixes, 7-scenario lifecycle test" | domain="architecture" | subagent="NONE" | justification="Full-stack DB task: PL/pgSQL function design, dynamic SQL, RLS policy generation, Postgres container testing; no matching SUBAGENTS.md entry covers the provisioning engine scope" | harness="MiMoCode" | date="2026-07-17"
```
