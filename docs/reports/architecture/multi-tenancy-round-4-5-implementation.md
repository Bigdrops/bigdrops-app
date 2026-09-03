# Multi-Tenancy Rounds 4 & 5 — Implementation Report

This report was written by MiMoCode on 2026-07-16 via Local Runner.

---

## 1. Scope

Covers Round 4 (platform operators + entity provisioning status) and Round 5 (RLS recursion fixes). Both rounds are append-only migrations that do not modify Rounds 1–3.

**Intentionally excluded:**
- Round 3 migrations (`20260714000000`, `20260714000001`) — immutable per constraint.
- Application-layer code changes (TypeScript/React).
- Data migration from `profiles.is_platform_admin` (column never existed in any migration file).

---

## 2. Round 4 — Platform Operators & Provisioning Status

### 2.1 Migration File

`supabase/migrations/20260716000000_multi_tenancy_platform_operators.sql` (139 lines)

### 2.2 What Was Implemented

| Component | PRD § | Implementation |
|-----------|-------|----------------|
| `platform_operators` table | §6.1 | id, user_id UNIQUE, role CHECK, granted_by, granted_at, expires_at |
| `is_platform_operator()` function | §6.2 | Exact role matching (per user instruction, not PRD CASE hierarchy) |
| `approve_workspace()` update | §6.3 | Platform owner guard added; Round 3 status guard preserved |
| `entity_provisioning_status` table | §9.1 | entity_id PK, status CHECK, last_error, attempt_count, updated_at |
| RLS on `platform_operators` | §6.1 | Owner-only CRUD (SELECT/INSERT/UPDATE/DELETE) |
| RLS on `entity_provisioning_status` | §9.2 | SELECT for any operator, CUD for owner only |

### 2.3 Deviation Found and Fixed

The previous session's draft migration included an extra `entity_type text NOT NULL` column on `entity_provisioning_status` with a composite PK `(entity_type, entity_id)`. The PRD §9.1 defines only `entity_id uuid PRIMARY KEY`. This was corrected before completion.

### 2.4 profiles.is_platform_admin

Confirmed absent from all migration files via grep across `*.sql`, `*.ts`, `*.tsx`. No TypeScript code references it. The column was never created. Per user instruction: skip data migration and column drop entirely.

---

## 3. Round 5 — RLS Recursion Fixes

### 3.1 Migration File

`supabase/migrations/20260716000001_multi_tenancy_rls_recursion_fixes.sql` (152 lines)

### 3.2 Confirmed Bugs (from prompt, not re-verified)

| Bug | Table | Root Cause | Symptom |
|-----|-------|------------|---------|
| #1 | `workspace_members` | `workspace_members_select_self` self-queries `workspace_members` | infinite recursion detected |
| #2 | `platform_operators` | `is_platform_operator()` lacks SECURITY DEFINER; policies call it, it queries `platform_operators`, triggering same policies | stack depth limit exceeded |

### 3.3 Sweep Results (Part C)

Full sweep of all 26 RLS policies across all three migration files for two patterns:
1. Policy that queries its own table
2. Non-SECURITY-DEFINER function called from a policy on the table that function queries

**12 instances found total:**

| # | Policy | Table | Pattern |
|---|--------|-------|---------|
| 1 | `workspace_members_select_self` | `workspace_members` | Self-subquery (bug #1) |
| 2 | `workspace_members_insert_owner` | `workspace_members` | Self-subquery (additional) |
| 3 | `workspace_members_update_owner` | `workspace_members` | Self-subquery (additional) |
| 4 | `workspace_members_delete_owner` | `workspace_members` | Self-subquery (additional) |
| 5-8 | `platform_operators_*` (4 policies) | `platform_operators` | Non-SD `is_platform_operator()` on same table |
| 9-12 | `entity_provisioning_status_*` (4 policies) | `entity_provisioning_status` | Transitive via non-SD `is_platform_operator()` |

**No other instances found.** All remaining policies query different tables (e.g., `workspaces` policies query `workspace_members`, `entities` policies query `workspace_members`, etc.). `has_entity_permission()` is non-SECURITY-DEFINER but is called from entity-schema policies, not from `entity_permissions` itself.

### 3.4 Additional Bug Discovered During Testing

`workspaces_select_member` and `workspaces_update_owner` had a **column name ambiguity bug**. The original policies use `WHERE workspace_id = id` in a subquery from `workspace_members`. PostgreSQL resolves unqualified `id` to `workspace_members.id` (the subquery's own PK) instead of `workspaces.id` (the outer table). This caused workspace visibility to return 0 rows for members.

**Evidence:** `pg_policies` output showed `workspace_members.workspace_id = workspace_members.id` instead of the intended `workspace_members.workspace_id = workspaces.id`.

### 3.5 Fixes Applied

| Fix | Component | Approach |
|-----|-----------|----------|
| A | `is_workspace_member()` | New SECURITY DEFINER function — breaks recursion chain |
| B | `is_workspace_owner()` | New SECURITY DEFINER function — preserves owner-check for INSERT/UPDATE/DELETE |
| C | `is_platform_operator()` | CREATE OR REPLACE with SECURITY DEFINER — fixes all 8 instances (5-12) |
| D | `workspace_members_*` policies (4) | DROP + CREATE with SD helper calls |
| E | `workspaces_select_member`, `workspaces_update_owner` | DROP + CREATE with SD helper calls (fixes ambiguity) |

### 3.6 Lifecycle Test Results (Part D)

**Environment:** Postgres 15 (Docker), non-superuser `test_app_user` role, RLS active.

| Step | Test | Before Fix | After Fix |
|------|------|------------|-----------|
| 1 | SELECT `workspace_members` as member | infinite recursion | **PASS** |
| 2 | SELECT `platform_operators` as operator | stack overflow | **PASS** |
| 3 | SELECT `entity_provisioning_status` as operator | transitive recursion | **PASS** |
| 4 | SELECT `workspaces` as member | 0 rows returned | **PASS** |
| 5 | SELECT `entities` as member | not tested (would crash — same `workspace_members` subquery chain as bug #1) | **PASS** |
| 6 | SELECT `entity_permissions` as member | PASS (no `workspace_members` subquery — direct column comparison only) | **PASS** |

All 6 steps pass after fixes. Steps 1–4 were only tested post-fix; step 5 would have crashed pre-fix (same recursion chain as bug #1); step 6 is genuinely pre-fix safe. Test container cleaned up.

**Test environment setup note:** The non-superuser test role required additional grants not covered by the migration files:
1. `authenticated` and `anon` roles must be created (Supabase built-in roles, not present in plain Postgres).
2. `GRANT ALL ON ALL TABLES/SEQUENCES IN SCHEMA public TO test_app_user` must be re-run after later migrations create new tables (platform_operators, entity_provisioning_status), since initial grants only cover tables that exist at grant time.
3. `GRANT USAGE ON SCHEMA auth TO test_app_user` and `GRANT SELECT ON auth.users TO test_app_user` are required for the auth stub functions to work under RLS.

### 3.7 Git Diff Summary

```
New file: supabase/migrations/20260716000001_multi_tenancy_rls_recursion_fixes.sql (152 lines)

+ 3 SECURITY DEFINER functions (is_workspace_member, is_workspace_owner, is_platform_operator)
+ 6 DROP POLICY + CREATE POLICY pairs:
    - workspace_members: SELECT, INSERT, UPDATE, DELETE
    - workspaces: SELECT, UPDATE
= 0 modifications to existing migration files
```

---

## 4. Verification Gate

| Check | Status |
|-------|--------|
| Append-only migration history | ✅ No existing files modified |
| PRD §6.1 alignment | ✅ `platform_operators` matches exactly |
| PRD §6.2 alignment | ✅ `is_platform_operator()` with exact role matching |
| PRD §6.3 alignment | ✅ `approve_workspace()` with platform owner guard |
| PRD §9.1 alignment | ✅ `entity_provisioning_status` with single-column PK |
| RLS recursion elimination | ✅ All 12 instances resolved |
| Column ambiguity fix | ✅ `workspaces_select_member` / `workspaces_update_owner` rewritten |
| Lifecycle test (6 steps) | ✅ All PASS as non-superuser |
| Docker container cleanup | ✅ Removed |
| Temp test files cleanup | ✅ Removed |

---

## 5. Deferred Work

- **Phase 0 grandfathers data migration** (PRD §10) — `profiles.is_platform_admin` never existed; skipped per user instruction. If the column is added in the future, migration logic will be needed.
- **Entity-schema RLS policies** — Created dynamically by `create_entity_schema()`. Not covered in this round.
- **Permission audit trail** (PRD §3.9) — Reserved for Phase 2+.
- **Platform operator roles beyond owner** (PRD §11.3) — Structure exists; roles not populated or enforced in v2.1.

---

## 6. Delegation Log

```
[DELEGATION] task="Round 4+5 multi-tenancy migrations" | domain="architecture" | subagent="NONE" | justification="Primary agent performed all work: migration writing, sweep analysis, lifecycle testing" | harness="Local Runner"
```
