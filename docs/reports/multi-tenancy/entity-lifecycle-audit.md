# Entity Lifecycle — Audit Report

**Date:** 2026-09-05
**Agent:** OpenCode (mimo-v2.5-free)
**Harness:** Local Runner

---

## Objective

Audit the company/entity lifecycle management implementation against the multi-tenancy PRD v2.1. Determine whether entity-level archival, deactivation, or deletion is architected and implemented.

---

## Scope

- Full codebase: DB schemas, RPCs, RLS policies, frontend UI, domain logic, onboarding gate
- PRD compliance: multi-tenancy PRD v2.1 (§3 entities, §8 workspace deletion, §168 archive_entity permission)
- Entity lifecycle surfaces: creation, activation, archival, deletion, restoration

---

## Authoritative Entity Model

| Layer | Table/Column | Purpose |
|---|---|---|
| Entity record | `public.entities` | `id`, `workspace_id`, `slug`, `display_name`, `entity_type`, `is_active` (boolean), `created_at` |
| Provisioning state | `public.entity_provisioning_status` | Tracks provisioning pipeline: `pending` → `creating` → `ready` / `failed` / `purging` / `purged` |
| Permissions | `public.entity_permissions` | Fine-grained RBAC: `(entity_id, user_id, resource, action)` |
| Tenant schema | `entity_{workspace}_{entity}` | Per-entity Postgres schema with business tables |

---

## Audit Findings

### What Exists

| Component | Status | Evidence |
|---|---|---|
| `entities.is_active` column | ✅ Exists | Migration `20260714000000`, default `true` |
| Entity filtering by `is_active` | ✅ Implemented | `EntityProvider` at `src/lib/tenant/contexts.tsx:303` filters `is_active = true` |
| Entity creation RPC | ✅ Exists | `create_entity()` + `provision_entity()` in migration `20260714000000` |
| Entity provisioning pipeline | ✅ Exists | `entity_provisioning_status` table + `provision_entity()` function |
| RLS SELECT on entities | ✅ Exists | `entities_select_member` — any workspace member can read |
| RLS INSERT on entities | ✅ Exists | `entities_insert_member` — owner or `create_entity` permission |
| RLS UPDATE on entities | ✅ Exists | `entities_update_member` — owner or `create_entity` permission |
| RLS DELETE on entities | ✅ Exists | `entities_delete_member` — owner or `create_entity` permission |
| Entity switcher UI | ✅ Exists | `CompanyManageSection.tsx` — lists entities, allows switching |
| Entity creation UI | ✅ Exists | `CreateCompanySheet.tsx` + `CompanyCreation.tsx` |

### Gaps Identified

| # | Gap | PRD Section | Severity |
|---|---|---|---|
| 1 | **No entity archive/deactivate RPC.** `entities.is_active` exists but no `archive_entity()`, `deactivate_entity()`, or equivalent function toggles it. | §168 (`archive_entity` permission) | HIGH |
| 2 | **No entity lifecycle semantics in PRD.** PRD v2.1 §168 defines `archive_entity` as a permission toggle for members, but **never defines what archiving an entity does** — what happens to the tenant schema, documents, access, and reversibility. The workspace lifecycle (§8) is well-defined; the entity lifecycle is not. | §8, §168 | HIGH (architectural) |
| 3 | **No entity archive/deactivate UI.** `CompanyManageSection.tsx` lists entities and allows switching, but has no archive, deactivate, or delete button. | — | MEDIUM |
| 4 | **No workspace archive/delete RPC.** `workspaces.status` has a CHECK constraint (`pending_approval`, `active`, `suspended`, `archived`), and `WorkspaceProvider` filters `status === 'active'`, but no function transitions workspace status. | §8 | HIGH |
| 5 | **RLS DELETE on entities is permissive.** The `entities_delete_member` policy allows any workspace member with `create_entity` permission to DELETE an entity row. This is a hard delete with no soft-delete guard, no confirmation, and no tenant schema cleanup. | §8 (workspace deletion pattern) | MEDIUM |

### What the PRD Defines vs. What It Doesn't

**Workspace lifecycle (well-defined in §8):**
- `active` → `archived` (owner sets status)
- `archived` → restore (owner before 30-day purge window)
- `archived` → `purging` → `purged` (physical teardown: `DROP SCHEMA CASCADE` per entity)
- RLS denies access to non-active workspaces

**Entity lifecycle (NOT defined):**
- PRD §168 mentions `archive_entity` permission toggle — but what action does it gate?
- No status column on `entities` (only `is_active` boolean)
- No purge workflow for entity schemas
- No 30-day retention or restore mechanism
- No RLS policy that checks `is_active` before allowing access

---

## Risk Assessment

| Risk | Impact | Likelihood |
|---|---|---|
| Accidental entity deletion via RLS DELETE | Data loss — no soft-delete, no confirmation, no tenant schema cleanup | Medium |
| Inconsistent entity state — `is_active` never toggled | Users cannot deactivate/archive unused entities | High |
| Workspace archive doesn't cascade to entities | Archived workspace may still have visible entities if entity filtering is bypassed | Low (EntityProvider filters) |
| No entity restore mechanism | If `is_active` is ever toggled off, no UI or RPC restores it | Medium |

---

## Recommendation

**Do not implement entity lifecycle until the PRD is updated with entity-level archival semantics.**

The architecture has a clear pattern for workspace lifecycle (§8) that could serve as a template for entity lifecycle. However, implementing entity archive without a PRD definition risks:

1. Inconsistent behavior — what does "archive entity" mean? Hide from switcher? Lock tenant schema? Retain documents?
2. Cascading questions — should archived entities count toward entity limits? Should they be visible in archives? Should provisioning status change?
3. Migration debt — implementing now creates a de facto spec that may not match the eventual PRD

**Suggested PRD additions before implementation:**
- Entity status column (mirroring workspace `status`)
- Entity archive semantics (hide from switcher, lock tenant schema, retain documents)
- Entity purge workflow (physical teardown of tenant schema)
- Entity restore mechanism (before purge)
- RLS policy that denies access to non-active entities
- Cascading behavior when workspace is archived (what happens to its entities?)

---

## Files Examined

| File | Relevance |
|---|---|
| `supabase/migrations/20260714000000_multi_tenancy_core.sql` | Entity table schema, `is_active` column |
| `supabase/migrations/20260714000001_multi_tenancy_rls.sql` | Entity RLS policies |
| `supabase/migrations/20260717000000_entity_provisioning_engine.sql` | Provisioning pipeline |
| `src/lib/tenant/contexts.tsx` | EntityProvider — `is_active` filtering |
| `src/domain/tenant/tenantCreation.ts` | Entity creation domain logic |
| `src/domain/tenant/tenantGate.ts` | Onboarding gate — provisioning status routing |
| `src/components/app/TenantGate.tsx` | Gate UI — workspace status routing |
| `src/pages/settings/CompanyManageSection.tsx` | Entity list/switch UI |
| `src/components/layout/CreateCompanySheet.tsx` | Entity creation UI |
| `src/pages/settings/AdminSettingsSection.tsx` | Team management UI |
| `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` | Authoritative PRD |

---

## Verification

- No code changes were made (audit only)
- No `bun run typecheck` required
