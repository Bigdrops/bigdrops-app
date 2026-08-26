# Team Roles and Permissions Implementation Plan

This report was written by Claude on 2026-08-20 via Local Runner.

## Objective

Determine how the Team screen must manage member access using the existing
tenancy architecture. Produce an implementation plan only. No code, no build,
no migrations, no database changes.

## Scope

- Team screen behavior only.
- Role assignment, Company Admin assignment, and role visibility.
- Workspace membership and invitation behavior already shipped.

Out of scope:

- Backend changes. The plan identifies backend gaps but does not fix them.
- Role Builder. The plan defers it to a later phase.
- Multi-entity selector. The plan defers it to a later phase.

## 1. Current Architecture

### Public schema

- `workspaces`: id, slug UNIQUE, name, status CHECK IN
  (`pending_approval`, `active`, `suspended`, `archived`), `created_by`
  NOT NULL. `owner_id` is removed. Ownership is a
  `workspace_members.role = 'owner'` row. Unique partial index
  `idx_one_owner_per_workspace`. Unique partial index
  `one_pending_workspace_per_creator` on `created_by` where
  `status = 'pending_approval'`.
- `workspace_members`: `role` CHECK IN (`owner`, `member`),
  `permissions jsonb DEFAULT '[]'`. SELECT permits self or any member of
  the same workspace. INSERT, UPDATE, DELETE require the workspace owner.
  Policies use the SECURITY DEFINER helpers `is_workspace_member()` and
  `is_workspace_owner()`.
- `entities`: `workspace_id`, `slug`, `display_name`, `is_active`. One
  workspace holds many entities. The frontend resolves one active entity.
- `entity_permissions`: `entity_id`, `user_id`, `resource`, `action`,
  `granted_by`, UNIQUE on all four. SELECT permits self or `granted_by`
  equals the caller. No INSERT, UPDATE, or DELETE policies. All writes go
  through SECURITY DEFINER functions.
- `permission_templates` and `permission_template_items`: role bundles.
  SELECT permits any member. INSERT, UPDATE, DELETE require the workspace
  owner. `permission_template_items` has no UPDATE policy. Editing items
  means DELETE plus INSERT.
- `workspace_invitations` and `workspace_invitation_entity_grants`: an
  invite carries a role, a permissions payload, and per-entity grants.
  UNIQUE on (`invite_id`, `entity_id`, `resource`, `action`). A trigger
  and the acceptance function reject grants that point to an entity
  outside the invite workspace.

### Functions

All functions are SECURITY DEFINER except where noted.

- `apply_permission_template(p_template_id, p_entity_id, p_user_id,
  p_granted_by DEFAULT NULL)`: copies template items into
  `entity_permissions`. Uses INSERT ... ON CONFLICT DO NOTHING.
  Contains NO caller authorization check. Any authenticated user can call
  it for any entity and any user.
- `has_entity_permission(p_entity_id, p_user_id, p_resource, p_action)`:
  STABLE. Returns true on exact match, `resource = '*'`, `action = '*'`,
  or both.
- `assign_role_to_company_member(p_template_id, p_entity_id,
  p_user_id)`: requires template and entity in the same workspace. Requires
  the target user to hold at least one `entity_permissions` row on the
  entity. This row is the company membership signal. Requires the caller
  to be the workspace owner, or to hold every template ability on the
  entity (delegation ceiling). Calls `apply_permission_template` with
  `granted_by = auth.uid()`.
- `remove_role_from_company_member(p_template_id, p_entity_id,
  p_user_id)`: same authorization checks. Deletes every matching
  `(resource, action)` pair for the entity and user, regardless of which
  grant created the pair.
- `create_workspace_invitation(p_workspace_id, p_email, p_role DEFAULT
  'member', p_permissions DEFAULT '{}', p_expires_at)`: requires the
  caller to be the workspace owner or hold the `invite_members` toggle.
  Stores the email lowercased. Default expiry is 7 days.
- `revoke_workspace_invitation(p_invite_id)`: requires the owner or the
  `invite_members` toggle. Only pending invites can be revoked.
- `accept_workspace_invitation(p_invite_id)`: matches the invitee email
  against the lowercased JWT email claim. Inserts the membership with the
  invite role and permissions. Copies entity grants. Joins the entities
  table so a grant can never escape the invite workspace.
- `approve_workspace(p_workspace_id, p_creator_user_id)`: requires the
  platform owner. Sets the workspace active and inserts the creator as
  owner with `permissions = '{}'::jsonb`. The activation trigger seeds
  preloaded role templates.
- `get_entity_provisioning_status(p_entity_id)`: guarded by
  `is_workspace_member()`. Used by the frontend Entity Provider.

### Preloaded role templates

Seeded idempotently on workspace activation and backfilled for active
workspaces:

| Name | Abilities |
|------|-----------|
| Company Admin | `*` view, create, edit, delete |
| Viewer | `*` view |
| Manager | `*` view, create, edit |
| Engineer | `*` view; create and edit on project, waybill, boq, rfq, csr, item |

These are editable defaults. They are not locked business rules.

### Frontend

- `WorkspaceProvider` exposes `workspace.role` (`owner` or `member`).
- `EntityProvider` resolves a single active entity, or null when there
  are zero or multiple entities. It builds the tenant client per entity
  schema.
- `AuthorizationProvider` fetches `entity_permissions` for the active
  entity only. It exposes `hasAuthorization(resource, action)` with the
  same wildcard semantics as the backend. When the entity is null, the
  permission list is empty and every check returns false.
- `TeamSettingsSection` lists members and pending invitations. Invite,
  revoke, and remove are owner-gated. The role badge shows Owner or
  Member only. Member removal calls a direct DELETE on
  `workspace_members`. It does not clean up `entity_permissions`.
- The frontend invitation path inserts into `workspace_invitations`
  directly. It bypasses `create_workspace_invitation`. It sends
  `workspace_role: 'member'` and no permissions. The `invite_members`
  toggle is never set.

## 2. Role Model

- A role is an ability bundle. It reuses `permission_templates` and
  `permission_template_items`.
- Workspace Admin is the `workspace_members.role = 'owner'` row plus
  governance toggles in `workspace_members.permissions`. It is the
  workspace-wide authority ceiling. It is not a template.
- Company-scoped roles are templates assigned to one entity. They grant
  nothing outside that entity.
- Roles are assignable only to existing company members. Membership is
  signalled by at least one `entity_permissions` row on the entity. The
  creator seed and invitation acceptance both create such rows.
- Roles never cross companies. One user can hold different roles in
  different entities under one workspace.
- Invitations carry entity grants. They never carry role payloads. Role
  assignment happens after acceptance.

Recommendation: keep this model. Do not add values to
`workspace_members.role` beyond `owner` and `member`. Do not map Company
Admin onto the owner role.

## 3. Permission Model

- Deny by default. Entity scoped. Action based.
- `entity_permissions` is the only evaluated source. Role labels are
  never evaluated at query time.
- Wildcard resolution: exact match, `resource = '*'`, `action = '*'`, or
  both.
- The canonical resource and action values are validation guidance only.
  They are not a database constraint.
- `entity_permissions` has no write policies. All writes go through
  SECURITY DEFINER functions. The Team UI must route every role change
  through `assign_role_to_company_member` or
  `remove_role_from_company_member`.

## 4. Team UX Recommendation

Recommendation: Option C, both scopes.

- Workspace scope: members, invitations, workspace owner management,
  role management entry point. This surface exists today in
  `TeamSettingsSection`.
- Company scope: roles and Company Admin assignment for the active
  entity, and the user's own role visibility within it.

Rationale:

- The backend permission model is entity scoped. There is no
  workspace-scoped permission concept except the owner role and its
  governance toggles. A workspace-wide access dialog (Option A) would
  imply a permission scope that does not exist.
- ERP frontend PRD section 12.9 explicitly requires two scopes.
- The frontend resolves one active entity. Company scope maps directly
  to that entity. When the multi-entity selector ships, company scope
  generalizes to the selected entity.
- Option B alone omits the workspace-scope membership surface that is
  already shipped and verified.

## 5. Data Flow

- `WorkspaceProvider` resolves the workspace and the caller role.
- `EntityProvider` resolves the active entity and its schema.
- `AuthorizationProvider` fetches `entity_permissions` for the active
  entity and the caller. It gates all `hasAuthorization` checks.
- The Team screen fetches workspace members, pending invitations, and
  the permission templates for the workspace.
- For each member, the Team screen shows the assigned roles on the active
  entity. It derives this from the member's `entity_permissions` rows for
  that entity, grouped by template.
- Assignment is possible only for members who already hold at least one
  grant on the active entity. The member list already reflects accepted
  membership.

## 6. Mutation Path

- Assign a role: `assign_role_to_company_member(template_id,
  entity_id, user_id)`.
- Remove a role: `remove_role_from_company_member(template_id,
  entity_id, user_id)`.
- Assign or remove Company Admin: the same functions with the Company
  Admin template.
- The frontend must never call `apply_permission_template` directly.
  That function has no authorization check.
- Template management: owner-only INSERT and DELETE on
  `permission_templates` and `permission_template_items`. Editing items
  is DELETE plus INSERT. This is deferred to the Role Builder phase.
- Member removal: the current direct DELETE on `workspace_members`
  works through the owner policy. It leaves orphaned
  `entity_permissions`. Cleanup is a backend gap, deferred.

## 7. Files to Modify

- `src/pages/settings/AdminSettingsSection.tsx`: add role and Company
  Admin assignment to the Team screen for the active entity.
- `src/domain/tenant/tenantCreation.ts`: add wrappers for
  `assign_role_to_company_member` and
  `remove_role_from_company_member`.
- Optional: route the invitation path through
  `create_workspace_invitation` so the role payload and the
  `invite_members` toggle become enforceable.

## 8. Files to Create

- `src/hooks/usePermissionTemplates.ts`: fetch templates and items for
  the workspace. Members have SELECT permission.
- `src/hooks/useMemberRoles.ts`: map each member's `entity_permissions`
  rows for the active entity into assigned roles.
- `src/domain/team/role-utils.ts`: group template items by category for
  the ability picker. Used by the deferred Role Builder.
- Role Builder component. Deferred.

## 9. Phased Implementation

Phase 1: Company Admin toggle per member on the active entity.

- Owner-gated.
- Uses the assignment functions.
- Matches ERP frontend PRD section 12.6.

Phase 2: Role assignment.

- Pick any preloaded or custom template per member on the active entity.
- Show current roles and remove them.
- Uses `usePermissionTemplates` and the assignment functions.

Phase 3: Role Builder. Deferred.

- Create, duplicate, and delete bundles.
- Ability picker with MARK ALL and a three-state indicator.
- Disable abilities the caller cannot grant.
- Reapply semantics stay deferred per ERP frontend PRD section 20.

Phase 4: Multi-entity selector. Deferred.

- Generalizes company scope to any entity.

## 10. Risks and Conflicts

- `apply_permission_template` is a privilege escalation hole. It has no
  authorization check, is SECURITY DEFINER, and is callable through
  PostgREST for any entity and user. The frontend must not call it. A
  backend guard is recommended but is out of scope for this plan.
- `remove_role_from_company_member` deletes every matching pair,
  including pairs created by the creator seed or an invitation grant.
  A user can lose baseline access. Grant-source tracking is deferred.
- Member removal leaves orphaned `entity_permissions`. A removed member
  can keep access through those rows. Cleanup is a backend gap.
- The frontend invitation path bypasses `create_workspace_invitation`.
  The role payload and the `invite_members` toggle are therefore
  unusable. This is not a security breach because the insert policy is
  owner-only. It is a workflow gap.
- `hasAuthorization` is gated on the active entity. With zero or
  multiple entities it returns false for everything. The company-scope
  UI must handle a null entity.
- Permission payload shape is inconsistent. The column default is an
  array. The functions write an object. `permissions ->> 'invite_members'`
  on an array returns null. This makes the toggle read as false.
- The delegation ceiling means a caller must hold every template ability
  to assign a role. The UI must disable options the caller cannot grant.
- Parallel workstream: seven files are being migrated from `supabase` to
  `tenantClient`. They do not overlap this plan. Leave them untouched.

## 11. Verification Plan

Static verification only.

- `bun run audit:load`.
- `bun run typecheck` with a timeout of at least 300000 ms.
- Do not run `bun run build` because of the hardware policy.
- Grep to confirm that no frontend code calls
  `apply_permission_template`.
- Confirm that all role mutation goes through
  `assign_role_to_company_member` and
  `remove_role_from_company_member`.
- Confirm the RLS policies allow the reads that the new hooks need:
  templates, members, and entity permissions.
- Confirm `git status` shows only intended files.

## Skills Used

NONE

## Documentation Standard

ADS-STE100 Simplified Technical English