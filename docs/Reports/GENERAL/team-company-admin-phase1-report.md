# Team Company Admin Phase 1 Report

This report was written by opencode (ox-alpha) on 2026-08-20 via Local Runner.

## Objective

Add Company Admin access management to the Team screen for the ACTIVE
entity. Use the existing permission-template model and the SECURITY
DEFINER assignment RPCs. No backend changes. Phase 1 only.

## Scope

- Team screen member cards gain an entity-scoped access indication and,
  for workspace owners, grant/remove actions.
- Read boundary: one templates query and one permissions query.
- Out of scope: Role Builder, multi-entity selection, custom roles,
  invitation role selection, backend fixes.

## Skills Used

react-useeffect

## Documentation Standard

ADS-STE100 Simplified Technical English

## Files Changed

- `src/domain/tenant/tenantCreation.ts` — added two thin typed RPC
  wrappers: `assignRoleToCompanyMember` and
  `removeRoleFromCompanyMember`.
- `src/hooks/useCompanyAdminAccess.ts` — new hook. Smallest read
  boundary for template discovery and per-member access state.
- `src/pages/settings/AdminSettingsSection.tsx` — TeamSettingsSection
  wiring and UI block inside the existing member card.

No migrations. No schema changes. No unrelated files touched.

## Changes Made

### 1. Company Admin template discovery

The hook queries `permission_templates` joined with
`permission_template_items(resource, action)` filtered by
`workspace_id = activeWorkspace` AND `name = 'Company Admin'`. The name
matches the canonical seed in
`20260819000000_preloaded_roles_and_assignment.sql`. No UUID is
hardcoded. If the template does not exist yet, the hook exposes
`templateId = null` and the UI shows "Status unavailable" instead of a
badge and hides actions.

### 2. Access determination

The hook fetches `user_id, resource, action` from `entity_permissions`
for the active entity. RLS (`entity_permissions_select_self`) limits
rows to those granted BY the caller or held BY the caller. The hook
groups rows by user and marks a member as Company Admin when at least
one visible row covers every template item. Coverage mirrors
`has_entity_permission`: exact match, or wildcard on resource, action,
or both.

Visibility consequence: an owner sees grants they made; each member
sees their own rows. Grants made by other paths (for example invitation
grants with NULL granted_by) are invisible to everyone except the
grantee. The backend stays authoritative at enforcement time.

### 3. Mutations

Both go through the existing SECURITY DEFINER RPCs via the new
wrappers:

- Grant: `assign_role_to_company_member(p_template_id, p_entity_id,
  p_user_id)`. The RPC enforces same-workspace, company-membership
  signal, and the delegation ceiling.
- Remove: `remove_role_from_company_member(p_template_id, p_entity_id,
  p_user_id)`.

The frontend never calls `apply_permission_template`. A repository
search found zero call sites; the only match is a comment stating this
rule.

### 4. UI behavior

- Each eligible member card shows an access row: label
  "ACCESS · {company name}" and a badge — green "Company Admin" or grey
  "Standard".
- Owners see "Grant Company Admin" / "Remove Company Admin" buttons for
  members who are not themselves. Self-management is not offered.
- Members see their own badge read-only.
- Non-owner viewers see no access block for other members because RLS
  hides that data; showing a value would be wrong.
- Null active entity: no per-member blocks render. One caption appears
  in the members card: "No active company selected — select or create a
  company to manage member access."
- Template missing: badge replaced by "Status unavailable", actions
  hidden.
- While loading, access blocks are withheld to avoid flashing wrong
  states.

Existing invite, revoke, remove-member flows and markup are unchanged.

## Verification Result

- `bun run audit:load`: passed. Exit code 0. All findings are
  pre-existing in unrelated files. None reference the files changed
  here. The new hook uses narrow column selects.
- `bun run typecheck`: passed. `tsc --noEmit` produced no errors.
- `git status`: shows my three files plus pre-existing parallel
  workstream changes. My unstaged delta per `git diff --stat` is exactly
  `tenantCreation.ts` (+38) and `AdminSettingsSection.tsx` (+87, -5).
- `apply_permission_template` search: no call sites in `src/`.
- `bun run build`: skipped due to hardware policy.

## Risks and Limitations

- Owner-visible status depends on RLS visibility. Pre-existing grants
  created outside this owner may be invisible and shown as "Standard"
  even though enforcement still allows them. This is a display
  limitation, not an authorization change.
- `remove_role_from_company_member` deletes overlapping grants from any
  source (known backend issue, out of scope).
- Member removal still leaves orphaned `entity_permissions` (known
  backend issue, out of scope).
- Generated database types are stale; the Supabase client is untyped,
  consistent with all existing hooks. Row shapes are typed locally.

## Deferred Work

- Phase 2: role picker for all templates.
- Phase 3: Role Builder.
- Phase 4: multi-entity selector generalizing company scope.
- Backend hardening of `apply_permission_template`, grant-source
  tracking, and removal cleanup.
