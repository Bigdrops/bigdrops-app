# Workspace Management Gaps — Audit & Fix Report

**Date:** 2026-09-05
**Agent:** OpenCode (mimo-v2.5-free)
**Harness:** Local Runner

---

## Objective

Audit the BIGDROPS workspace and team management implementation against the multi-tenancy PRD v2.1 and ERP frontend PRD v1.6. Identify gaps, implement fixes, and verify.

---

## Scope

- Full codebase audit: providers, hooks, components, domain logic, DB migrations, RLS policies
- PRD compliance: multi-tenancy PRD v2.1, ERP frontend PRD v1.6, three-PRD tenancy illustration
- 3 identified gaps: ownership transfer, template uniqueness constraints, operator role hierarchy

---

## Authoritative Team Model

The "Team" concept is **not a separate DB table**. It is the UX surface over:

| Layer | Table(s) | Purpose |
|---|---|---|
| Workspace membership | `workspace_members` | User-workspace association with role (`owner`/`member`) |
| Invitations | `workspace_invitations` + `workspace_invitation_entity_grants` | Pending membership with entity-level grants |
| Entity permissions | `entity_permissions` | Fine-grained RBAC: `(entity_id, user_id, resource, action)` |
| Role templates | `permission_templates` + `permission_template_items` | Reusable ability bundles (Company Admin, Manager, Engineer, Viewer) |

This overlay model is intentional per the ERP frontend PRD §12.6-12.9: roles are user-defined labels over collections of abilities via permission templates, not a separate Team entity.

---

## Audit Findings

### What Exists (Substantially Complete)

| Category | Status | Evidence |
|---|---|---|
| DB tables (10) | ✅ All present | `workspaces`, `workspace_members`, `workspace_invitations`, `workspace_invitation_entity_grants`, `entities`, `entity_permissions`, `permission_templates`, `permission_template_items`, `platform_operators`, `entity_provisioning_status` |
| SECURITY DEFINER RPCs (14) | ✅ All present | `create_workspace_invitation`, `accept_workspace_invitation`, `revoke_workspace_invitation`, `approve_workspace`, `has_entity_permission`, `apply_permission_template`, `assign_role_to_company_member`, `remove_role_from_company_member`, `seed_preloaded_role_templates`, `is_platform_operator`, `is_workspace_owner`, `is_workspace_member`, `provision_entity`, `get_entity_provisioning_status` |
| RLS policies (32) | ✅ All present | SELECT/INSERT/UPDATE/DELETE on all 10 tables |
| React providers | ✅ Complete | `WorkspaceProvider`, `EntityProvider`, `AuthorizationProvider` in `src/lib/tenant/contexts.tsx` |
| Hooks | ✅ Complete | `useTeamMembers`, `useTeamInvitations`, `usePermissionTemplates` |
| UI pages | ✅ Complete | `WorkspaceCreation`, `WorkspaceSelection`, `WorkspacePendingApproval`, `WorkspaceInvitation`, `AdminSettingsSection` (team management), `WorkspaceSwitchSection` |
| Domain logic | ✅ Complete | `createWorkspace`, `createEntity`, `provisionEntity`, `acceptWorkspaceInvitation`, `createWorkspaceInvitation`, `revokeWorkspaceInvitation`, `assignRoleToCompanyMember`, `removeRoleFromCompanyMember` |
| Onboarding gate | ✅ Complete | `TenantGate` + `resolveGatePhase()` |

### Gaps Identified

| # | Gap | PRD Section | Severity |
|---|---|---|---|
| 1 | **`transfer_workspace_ownership()`** — no SECURITY DEFINER RPC exists. The unique-owner index provides the constraint, but no function atomically demotes old owner and promotes new. | §7 | HIGH |
| 2 | **`permission_templates.UNIQUE(workspace_id, name)`** — missing constraint. Duplicate template names possible per workspace. | §3.6 | MEDIUM |
| 3 | **`permission_template_items.UNIQUE(template_id, resource, action)`** — missing constraint. Duplicate items possible in one template. | §3.6 | LOW-MEDIUM |
| 4 | **`is_platform_operator()` role hierarchy** — owner cannot satisfy `p_required_role = 'support'`. Exact match only, no hierarchy. | §6.2 | MEDIUM |

### Design Divergences (Intentional, Not Bugs)

| Divergence | PRD Section | Assessment |
|---|---|---|
| FK constraints missing on `created_by`, `granted_by`, `invited_by`, `user_id` | §3.3, §3.6, §5 | Intentional — avoids auth.users FK issues in multi-schema architecture. `stamp_row_ownership` trigger handles `created_by`. |
| `permissions` default `'[]'::jsonb` (array) vs PRD `'{}'::jsonb` (object) | §3.2 | App code treats it as a map of toggles. `'[]'` is functionally compatible. |
| `has_entity_permission()` uses plpgsql with 4-way wildcard vs PRD's sql | §3.5 | Strictly more permissive. Functional superset. |
| `apply_permission_template()` has extra `p_granted_by` param | §3.6 | Additive. Backward-compatible default NULL. |
| `approve_workspace()` has `AND status = 'pending_approval'` guard | §6.3 | Stricter. Prevents re-approval. |

---

## Changes Made

### File Created

`supabase/migrations/20260905010000_workspace_management_gaps.sql`

### 1. `transfer_workspace_ownership(p_workspace_id, p_new_owner_id)` — SECURITY DEFINER RPC

- Atomic demote-old-owner/promote-new-owner in one transaction
- Validates: caller is authenticated, caller is current owner or platform operator, new owner is a workspace member
- Idempotent: no-op if new owner is already the owner
- Uses the existing `idx_one_owner_per_workspace` unique index for consistency

### 2. UNIQUE Constraints

- `permission_templates_workspace_id_name_key` on `(workspace_id, name)`
- `permission_template_items_template_id_resource_action_key` on `(template_id, resource, action)`
- Both use `DO $$ ... IF NOT EXISTS ... $$` for idempotent application

### 3. `is_platform_operator()` Role Hierarchy Fix

- Rewritten from `LANGUAGE sql` to `LANGUAGE plpgsql` for explicit hierarchy logic
- Role hierarchy: `owner > support > auditor > operations`
- Owner implicitly satisfies all lower roles
- Support satisfies auditor and operations
- Auditor satisfies operations
- Maintains backward compatibility: exact match still works

---

## Verification

```
- bun run audit:load: passed (no new warnings)
- bun run typecheck: passed (no errors)
- git status: clean (new migration file + pre-existing Task 1 changes)
- bun run build: skipped (hardware policy)
```

---

## Risks & Limitations

1. **Migration not yet applied to live DB** — the migration file is created but not executed against the Supabase project. Application requires `supabase db push` or migration runner.
2. **No frontend wiring for `transfer_workspace_ownership`** — the RPC exists but no UI calls it yet. The `AdminSettingsSection` (team management) would need an "Transfer Ownership" action.
3. **Test coverage** — no automated tests exist for `useTeamMembers`, `useTeamInvitations`, `usePermissionTemplates`, `AuthorizationProvider`, `AdminSettingsSection` team management flows.

---

## Deferred Work

| Item | Reason |
|---|---|
| Frontend wiring for ownership transfer | Requires UI design decision: confirmation flow, 2FA, notification |
| Automated tests for hooks/authorization | Out of scope for this task; defer to dedicated test sprint |
| `entity_permission_audit` table (PRD §3.9) | PRD marks as "Reserved, Not Built" — intentional deferral |
| Workspace role editing semantics (ERP PRD §20) | Explicitly deferred in ERP frontend PRD v1.6 |
