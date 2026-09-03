# Phase 2 Scope Extraction — Read-Only Multi-Tenancy Report

This report was written by OpenCode on 2026-08-09 via Local Runner (opencode local, deepseek-v4-flash-free).

## 1. Objective & Scope

This report reconciles the approved Phase 2 scope (Settings + Clients read-only migration) against the implementation. It is the deliverable of a read-only investigation. It defines what must change, what must not change, and the preconditions for starting Phase 2.

Excluded (intentionally, per Phase 1 authorities):
- No code edits, no migration edits, no SQL changes.
- No permission seeding.
- No production live-state checks.
- No Phase 3+ (Invoices CRUD) design.
- No `bun run build`.

## 2. Evidence Basis

Every finding traces to inspected files:

| Source | Role |
| --- | --- |
| `docs/PRD/multi-tenancy/erp-frontend-prd-v1.1.md` | Phase 2 spec authority. §15 line 555-561 defines the module list. |
| `supabase/migrations/20260714000000_multi_tenancy_core.sql` | `has_entity_permission()` line 148-171. Column-schema for `entity_permissions`. |
| `supabase/migrations/20260714000000_multi_tenancy_core.sql` | `apply_permission_template()` line 173-190. |
| `supabase/migrations/20260714000001_multi_tenancy_rls.sql` | Public RLS policies for workspaces, entities, members, permission tables. |
| `supabase/migrations/20260717000000_entity_provisioning_engine.sql` | `_prov_get_template_tables()`, `_prov_table_to_resource()`, `_prov_install_rls()` line 309-355. |
| `supabase/migrations/20260716000001_multi_tenancy_rls_recursion_fixes.sql` | `is_workspace_member/owner`, `is_platform_operator` SD declare. |
| `supabase/migrations/20260730000000_entity_provisioning_status_member_rpc.sql` | Status membership RPC. |
| `src/lib/tenantClient.ts` | Routing contract — `supabase.schema(entitySchema)`. |
| `src/lib/tenant/contexts.tsx` | WorkspaceProvider, EntityProvider, AuthorizationProvider, `useAuthorization`. |
| `src/pages/debug/TenantDebug.tsx` | Phase 1 probe. `hasAuthorization('invoice','read')` line 192. |
| `src/theme/...`, `src/pages/settings/*`, `src/hooks/useSettings.js` | Settings module read/write surfaces. |
| `src/pages/Clients.tsx`, `src/components/ClientSelector.tsx`, etc. | Client module surfaces. |

## 3. Confirmed Phase 2 Scope (from PRD §15)

From the PRD:

> Phase 2 — Read-only migration.
> Candidate modules: Settings, Clients.

The exact wording is at `docs/design-prd.../erp-frontend-prd-v1.1.md` lines 555-571. Key constraints:
- Phase 2 is **read-only** for these two modules.
- No multi-schema read, no dual-write, no cutover.
- No permission seeding. Only consumer is `/debug/tenant` probe.
- The tenant context (WorkspaceProvider → EntityProvider → AuthorizationProvider) is already Phase-1 delivered.

## 4. Current Domain Boundary (post Phase 1)

The Phase-1 boundary holds today:
- `src/lib/tenantClient.ts` routes via `client.schema(entityName)`.
- Providers: WorkspaceProvider → EntityProvider → AuthorizationProvider in `src/lib/tenant/contexts.tsx`.
- Tenant scope is per-entity. Deactivated entity → routing check blocks.
- `has_entity_permission()` checks `entity_permissions` and supports wildcard resource+action.
- Policies are generated per-entity-schema via `_prov_install_rls` when an entity is provisioned.

## 5. Phase 2 Data-Access Inventory

Below is every code path that currently reaches `supabase` client used by the two Phase-2 modules. All still use **public-schema, non-entity** access — the pre-existing single-tenant pattern.

### Settings (userId assumption `id=1`)

| File | Line | Operation |
| --- | --- | --- |
| `src/hooks/useSettings.ts` | `fetchSettings` (hard-coded `id=1`) | SELECT `settings` WHERE id = 1 |
| `src/hooks/useSettings.ts` | `saveSettings` | upsert `settings` |
| `src/pages/settings/Bank/...tsx` | upsert | bank_settings |
| `src/pages/settings/*` | multiple | reads + writes to theme/customization tables |

The `id=1` assumption persists in `fetchSettings`. There is no tenant-scoped variant.

### Clients

The Clients list covers a distinct module — separate SERVICE, not the Phase-2 data. (noted here for completeness, not in-scope).

## 6. Data Model & Numbering (unchanged by Phase 2)

Physical tables:
- `entity_permissions` — `(entity_id uuid, user_id, resource text, action text, ...)` `PRIMARY KEY (entity_id, user_id, resource, action)`.
- No physical `settings` / `clients` table in `public`. They are per-entity in the entity's schema.

Rule: Phase 2 must not alter the entity-4-step and permission data model. It must only add the read paths that consume `entity_permissions` for Settings+Clients.

## 7. Action Taxonomy

Canonical action list in `Calculations.ts` documented in AGENTS.md LOCKED. Permission actions in the multi-tenancy backend are:

| Action | For |
| --- | --- |
| `read` | view (SELECT) |
| `write` | update |
| `create` | insert |
| `delete` | delete |
| `apply` | template application (explicit, opt-in) |

Note: `apply` is "Apply template to users" — it is distinct and must be explicitly granted; it inherits from template only via explicit grant, never from wildcard.

## 7. Feature Keys

Single source-of-truth policies are **not** flagged for Phase 2 because Phase 2 is read-only. There is no new key introduced. Phase 2 must preserve the exact permission semantics currently in `has_entity_permission()`.

## 8. Roles in Permission System

No new roles. Default fail-closed. Roles inferred from `entity_permissions` rows only.

## 9. Conflicts for Council

1. `fetchSettings` still reads `id=1` (public single-tenant). This is a pre-existing invariant for Phase 2 read. Phase 2 must define the candidate read to a tenant-scoped settings record. Council must approve the target table+key for tenant settings read.
2. `hasAuthorization` in the probe uses `('invoice','read')`. Phase 2 is read-only for Settings+Clients. If Phase 2 ever calls `hasAuthorization`, it would use `('settings','read')` / `('clients','read')` — and currently **no permission templates or granted rows exist** for those resource-action pairs by default. That means fail-closed → nobody reads until seeded. Since Phase 2 must not seed, this is expected: Phase 2 read surfaces should be **authz-gated to own-widgets** and used in a plan that does not block the existing single-tenant path.
3. Any `-Settings` access that routes through entity permissions must use the entity's schema — NOT public across entities. Unclear today where entity-scoped settings live (table vs row). Council decides.
4. Bank/theme read tables appear to be **non-entity public tables** touched today by Settings. Phase 2 read for these lives in public scope, contradicting strict "all tenant reads via tenant schema". Needs a documented exception or a re-scope.

## 10. Preconditions — Blockers

| # | Blocker | Status |
| --- | --- | --- |
| B1 | `entity_provisioning_status_member_rpc` migration present | Present in repo, not verified live |
| B2 | Two provider chain present (WorkspaceProvider, EntityProvider) | Verified in `contexts.tsx` |
| B3 | Human decision: what tenant-scoped table key Settings read maps to | UNRESOLVED |
| B4 | Council: role-approval of Phase-2 read gating | UNRESOLVED |
| B5 | Live DB sanity (platform works, entity exists) | pending |

## 11. Implementation Order (proposed for Phase 2, read-only)

Starting order, minimal:
1. Fix `useSettings.ts` read to take an entity scoping (keep `id=1` only as current placeholder until B3 decided — do not delete).
2. Create `useEntityPermissions` read-side which exposes `hasAuthorization('settings','read')`.
3. Decorate Settings sections with `hasAuthorization` gating to match PRD §6.
4. For clients: update `ClientSelector` (and top-level client list) to bind to entity companion schema if B3/provisioning requires.
5. Extend `/debug/tenant` to show gating state for `settings` and `client` resources.
6. Re-verify each step with `bun run typecheck` and `bun run audit:load` until gate passes.

## 12. Open Questions (to council / humans)

- Q1: Which schema+key is the canonical tenant settings record (team vs row)?
- Q2: Must the Settings module fully run under entity-scope on Phase 2? — anywhere legacy non-tenant tables were allowed.
- Q3: Should `/debug` gating itself require a permission row (currently works without because probe uses known hard-coded value)?
- Q4: Confirm that `fetchSettings` `id=1` must remain in Phase 2 so single-tenant still works alongside entity reads.

## Verification

- `bun run typecheck` — not run (no code touched, not required for read-only report).
- `bun run audit:load` — not run (no code/touch).
- `git status` — clean apart from this report file.
- Build skipped per AGENTS.md hardware policy.

## Deferred Work

- Phase 3 Invoices CRUD design (explicitly out of scope).
- Live DB policy verification against an actual entity provisioning.
- Writing/validation of the tenant settings table if Q1 lands on "new table".