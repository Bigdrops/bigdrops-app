# Two-Level Administration Model Investigation Report

This report was written by deepseek-v4-flash-free on 2026-08-17 via opencode.

## Objective

- Investigate how the two-level administration model is represented and enforced in the current multi-tenancy implementation.
- The two-level model is:
  - Level 1: Workspace Admin. This is the authority ceiling for the workspace.
  - Level 2: Company/Entity Admin. This is administrative authority scoped to one entity.
- Determine whether a new admin authority layer is required.
- Produce the minimum unresolved product decisions.
- This task is read-only. It does not change code.

## Scope

- Backend PRD: multi-tenancy-prd-v2.1.md
- Frontend PRD: erp-frontend-prd-v1.5.md
- Platform Office PRD: platform-office-prd.md
- Supabase migrations under supabase/migrations/
- Frontend source under src/ (tenant layer, authorization, settings)
- This task does not read or change any business-domain document module.

## Skills used

- archive-observer
- multi-tenancy-observer
- tenancy-permissions
- pdf-rendering-correctness

## Documentation standard

ADS-STE100 Simplified Technical English

## Source Documents Read

- docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md
  - Section 3: Roles and Authority Model
  - Section 3.1: two permission layers
  - Section 3.2: workspace roles and authority model
  - Section 3.3: entity-scoped permission model
  - Section 3.4: wildcard resource and action
  - Section 3.4.1: canonical resource and action values
  - Section 3.5: resolution algorithm
  - Section 3.6: permission templates
  - Section 3.7: invite grants
  - Section 3.8: Platform Operator
  - Section 3.11: two-level administration model
  - Section 4: signup, lobby, invites
  - Section 4.1: invitation creation and revocation RPCs
- docs/prd/multi-tenancy/multi-tenancy-prd.md (v2.0)
- docs/prd/multi-tenancy/multi-tenancy-prd-v2.md
- docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md
  - Section 12.6: two-level administration model
  - Section 12.7: administrative authority vs business permissions
  - Section 16: Non-Goals
  - Section 20: Future Enhancements
- docs/prd/Platform-god/platform-office-prd.md
  - Section 2.1 to 2.3

## Migrations Read

- 20260714000000_multi_tenancy_core.sql (lines 1 to 255)
- 20260714000001_multi_tenancy_rls.sql (full)
- 20260716000000_multi_tenancy_platform_operators.sql
- 20260716000001_multi_tenancy_rls_recursion_fixes.sql
- 20260717000000_entity_provisioning_engine.sql
- 20260730000000_entity_provisioning_status_member_rpc.sql
- 20260816000000_plan_b_template_resources_and_permissions.sql
- 20260817000000_plan_c_live_entity_backfill.sql
- 20260818000000_seed_wildcard_creator_permission.sql
- 20260818000001_multi_tenancy_invitation_correctness.sql (full)

## Frontend Files Read

- src/lib/tenant/contexts.tsx (lines 1 to 51)
- src/lib/tenantClient.ts (full)
- src/domain/tenant/tenantGate.ts (full)
- src/domain/tenant/tenantCreation.ts (full)
- src/components/app/TenantGate.tsx (full)
- src/pages/WorkspaceInvitation.tsx (full)
- src/pages/Settings.tsx (full)
- src/pages/settings/settings-config.ts (full)
- src/pages/settings/AdminSettingsSection.tsx (lines 1 to 54)
- src/pages/debug/TenantDebug.tsx (grep only)

## Required Product Model

The product requires a two-level administration model:

1. Workspace Admin: workspace-wide administrative authority.
   - Governs the entire workspace.
   - The workspace may contain multiple companies/entities.
   - Establishes the authority ceiling beneath the workspace level.
2. Company/Entity Admin: administrative authority scoped to one entity.
   - Manages only the assigned company/entity.
   - Cannot exceed the authority ceiling set by Workspace Admin.
   - Cannot administer other entities.
3. Administrative authority is separate from business permissions.
   - Admin titles must not automatically grant business permissions.
   - Business permissions remain deny-by-default, entity-scoped, and action-based.

## Current Implementation State

The current implementation expresses authority as:

- workspace_members: one row per user per workspace.
  - role column: only two values allowed: owner, member.
  - permissions column: jsonb toggles for capability keys.
  - The owner role is a partial unique index: one owner per workspace.
- entity_permissions: one row per (entity_id, user_id, resource, action).
  - Unique constraint on (entity_id, user_id, resource, action).
  - Rows are created by SECURITY DEFINER functions only.
- permission_templates and permission_template_items: reusable bundles of business permission rows.
- workspace_invitations: invitation lifecycle with workspace_role and workspace_permissions.
- workspace_invitation_entity_grants: per-entity business grants attached to an invitation.

Authorization in the frontend:

- AuthorizationProvider exposes hasAuthorization(resource, action).
- It checks business permission rows only.
- It never reads a workspace_role or an admin title.
- The only frontend consumer of hasAuthorization is TenantDebug.tsx.

## Two-Level Administration Representation

### Classification

The two-level administration model is NOT represented in the current implementation.

- There is no Workspace Admin role.
  - workspace_members.role allows only owner or member.
  - A "Workspace Admin" concept would require a new role value or a new mechanism.
- There is no Company/Entity Admin concept.
  - No table, column, role, or capability expresses entity-scoped administrative authority.
- There is no authority-ceiling enforcement.
  - Nothing in the database limits what a Company/Entity Admin may do.
  - The ceiling exists only in documentation.
- There is no UI distinction between admin authority scopes.
  - No frontend component reads or renders an admin title.
- Legacy platform-operator admin is unrelated.
  - ADMIN_EMAILS and is_platform_operator govern platform-level staff.
  - They do not administer tenant workspaces or entities.

### What the Current Model Can Express

The current model can express the following:

- Workspace governance: owner role plus capability toggles.
  - create_entity toggle: allows entity creation.
  - invite_members toggle: allows invitation creation and revocation.
- Entity-scoped business access: entity_permissions rows.
- Wildcard business access: '*' resource and action values.
- Delegate capability keys at invitation time.
  - The inviter sets workspace_permissions on the invitation.
  - accept_workspace_invitation copies them into workspace_members.permissions.
  - approve_workspace sets permissions to an empty object.

The current model is a capability-based model. It has no admin layer.

### Representation Mismatch

The capability model does not map cleanly onto the two-level model:

- Capability keys express business actions, not administrative titles.
  - create_entity is a business action on the workspace.
  - invite_members is an administrative action.
  - There is no key that means "administrator of entity X".
- RLS reads permissions as an object.
  - Example: (permissions->>'create_entity')::boolean = true.
  - The schema default for permissions is '[]'::jsonb, an array.
  - An array default with object access is a shape mismatch.

## Authority vs Business Permission Matrix

The following table compares the two concepts in the current implementation.

| Concept | Current representation | In the two-level model |
| --- | --- | --- |
| Workspace Admin | Not represented | Level 1, authority ceiling |
| Company/Entity Admin | Not represented | Level 2, entity-scoped |
| Workspace membership | workspace_members.role owner/member | Subordinate to Workspace Admin |
| Workspace governance | owner role, toggles | Workspace Admin authority |
| Entity business access | entity_permissions rows | Deny-by-default, entity-scoped |
| Invitation creation | owner or invite_members toggle | Workspace Admin authority |
| Invitation revocation | owner or invite_members toggle | Workspace Admin authority |
| Entity creation | owner or create_entity toggle | Business capability, not admin title |
| Template application | SECURITY DEFINER, no auth check | Not defined |

## Authority Ceiling Test

The two-level model requires the ceiling to be enforced. The following cases are not enforced today:

- Case A: A Company/Entity Admin for Company A administers Company B.
  - No mechanism prevents it.
  - No mechanism even assigns a Company/Entity Admin to Company A.
- Case B: A Company/Entity Admin exceeds the authority ceiling.
  - The ceiling is not defined in the database.
  - No check exists.
- Case C: A Workspace Admin grants a business permission to himself.
  - Nothing prevents an owner from granting business permissions.
  - The PRD does not forbid it.
- Case D: A Company/Entity Admin automatically gains business permissions.
  - The PRD forbids this unless explicitly established.
  - No automatic grant exists today.
  - This case is satisfied by absence, not by enforcement.
- Case E: Admin authority crosses entities.
  - Not possible, because no admin authority exists.

## Admin Authority vs Business Permissions

The PRD states that the two concepts are distinct and must not be conflated.

- Administrative authority answers: who may administer whom/what.
- Business permissions answer: what may this user do with business resources.

The current implementation does not conflate them. It simply has no administrative authority concept at all.

- Business permissions are entity-scoped and action-based.
- Admin authority would be a separate concept if implemented.
- No code path grants business permissions from an admin title.

## Multiple Admin Analysis

- The workspace may contain multiple companies/entities.
- Each entity may have its own Company/Entity Admin.
- Entity-admin scope is per entity and does not cross entities.
- The current model has no per-entity admin assignment mechanism.
- The owner remains the single workspace governance authority.

## Unresolved Product Decisions

The following decisions are not settled by any PRD. They must be answered before implementation.

1. Is Workspace Admin the same as the owner role?
   - Option A: yes, owner acts as Workspace Admin.
   - Option B: a distinct assignable admin role is required.
   - Option B requires a change to the workspace_members role check constraint.
2. How is Company/Entity Admin represented?
   - Option A: a new entity_administrators table.
   - Option B: a reserved admin capability in workspace permissions or entity_permissions.
   - Option C: an administrative role on entity membership.
   - The PRD does not decide this.
3. Does Company/Entity Admin auto-grant business permissions?
   - The PRD says no, unless explicitly established.
   - This must be confirmed as a product decision.
4. Who assigns Company/Entity Admins?
   - The PRD does not name an assigner.
   - Likely the Workspace Admin, but this is not decided.
5. Where does the UI show distinct admin authority scopes?
   - Acceptance criteria require Workspace Admin and Company/Entity Admin to appear distinct.
   - No frontend renders admin titles today.
6. Where is the member-management UI?
   - No UI calls create_workspace_invitation, revoke_workspace_invitation, or apply_permission_template.
   - Invitations are only readable and acceptable via WorkspaceInvitation.tsx.
   - A management UI is absent.

## Risks or Limitations

- This investigation is read-only.
- It proposes no schema change.
- It records no test results.
- The security observation about apply_permission_template is noted below but not fixed.
- The shape mismatch between the permissions default and RLS reads is noted below but not fixed.

## Security Observation

apply_permission_template is SECURITY DEFINER with no internal authorization check. Any authenticated user may call it. It could grant business permissions on any entity. This is outside the scope of this investigation. It should be reviewed in a separate security task.

## Deferred Work

- Add an admin authority layer after product decisions are made.
- Add member-management and admin-assignment UI.
- Resolve the permissions jsonb shape mismatch.
- Add authorization check to apply_permission_template.
- Revisit the ceiling enforcement after the representation is chosen.

## Files Changed

- docs/Reports/multi-tenancy/two-level-administration-investigation.md (new report)

## Verification

- bun run audit:load: skipped (read-only investigation, no code change)
- bun run typecheck: skipped (no code change)
- git status: only new file is the report; four staged wireframe-variant HTML files are pre-existing leftovers, not from this task
- git diff --stat: no tracked-file changes
- bun run build: skipped due to hardware policy and read-only scope