# Team Company Role Assignment Phase 2 Report

This report was written by opencode (ox-alpha) on 2026-08-20 via Local Runner.

## Objective

Let an authorized manager assign existing permission-template roles to
existing workspace members for the ACTIVE entity, using the canonical
assignment RPCs. Generalize the Phase 1 Company Admin control into a
compact "Roles & Access" section. No Role Builder, no backend changes.

## Scope

- Read boundary for workspace templates plus effective entity access.
- Per-member roles list with grant/remove actions for owners.
- Honest effective-access labeling. No invented provenance.

Out of scope: template CRUD, multi-entity selection, invitation role
selection, backend migrations or RPC changes.

## Skills Used

react-useeffect, react-dev, supabase-postgres-best-practices

(typescript-advanced-types and frontend-design were reviewed against the
task and not applied: no advanced typing or new visual design was
needed. The existing Team visual language is preserved.)

## Documentation Standard

ADS-STE100 Simplified Technical English

## Files Changed

- `src/hooks/usePermissionTemplates.ts` — NEW. Single read boundary:
  workspace-scoped templates with items, plus effective permissions per
  member on the active entity. Exports `coversTemplate` and types.
- `src/pages/settings/AdminSettingsSection.tsx` — TeamSettingsSection
  wiring generalized; member card shows the Roles & Access list.
- `src/hooks/useCompanyAdminAccess.ts` — DELETED. Its single-consumer
  logic was absorbed into the new hook.

`tenantCreation.ts` wrappers from Phase 1 are reused unchanged. No other
files modified. No migrations.

## Implementation Notes

### Template discovery

One query: `permission_templates` joined with nested
`permission_template_items(resource, action)`, filtered by
`workspace_id = activeWorkspace`. RLS (`permission_templates_select_member`)
limits rows to workspaces the caller belongs to, so templates from other
workspaces cannot appear. No UUIDs hardcoded. Any number of templates is
supported, including future custom ones. Ordering: Company Admin first,
then alphabetical by name — deterministic and keeps the Phase 1 control
prominent.

### Active entity resolution

`useEntity().entity.id`, as in Phase 1. Null entity means no access
blocks and one explanatory caption in the members card.

### Effective access determination

The hook fetches `user_id, resource, action` from `entity_permissions`
for the active entity. RLS limits rows to those granted BY the caller or
held BY the caller. Rows are grouped per user into resource/action pair
lists. `coversTemplate(pairs, template)` mirrors `has_entity_permission`
matching: exact, wildcard resource, wildcard action, or both.

### Role assignment and removal

Both go through the Phase 1 wrappers, which call the SECURITY DEFINER
RPCs:

- Grant: `assign_role_to_company_member(p_template_id, p_entity_id,
  p_user_id)`.
- Remove: `remove_role_from_company_member(p_template_id, p_entity_id,
  p_user_id)`.

The UI toggles direction based on current effective coverage. The backend
remains authoritative for authorization and for what actually changes.

### Authorization gating

Buttons render only when the viewer is the workspace owner, the target is
not themselves, and at least one template exists. Self-management stays
blocked exactly as in Phase 1. All mutation buttons disable while any
role mutation is pending, preventing duplicate submissions. Backend
errors surface through feedback without corrupting local state; state
refreshes only after success.

### Loading and empty states

- Templates/access loading: access blocks withheld until loaded.
- Load error: inline red message inside the block.
- Zero templates: "No roles are available in this workspace yet."
- Null entity: no blocks; caption explains a company must be selected.
- Pending mutation: spinner + "Working…" on the triggering row; sibling
  buttons disabled.

### Provenance limitation (Section E/I)

`entity_permissions` has no grant-source column. Coverage of a template's
abilities is EFFECTIVE ACCESS, not proof of assignment. Grants can overlap
across roles, and removal deletes every matching pair regardless of
source. The UI discloses this under the list: "Shows effective access for
this company. Permissions can overlap between roles." Badges say what the
member can do, never what was assigned. No provenance metadata was
invented and no schema change was made.

## Verification Result

- `bun run audit:load`: passed, exit code 0. Findings identical to the
  pre-existing baseline; none reference the changed files.
- `bun run typecheck`: passed, no errors.
- `git status` / `git diff --stat`: my unstaged delta is exactly
  `AdminSettingsSection.tsx` (+93 relative to index, cumulative with
  Phase 1) and new `usePermissionTemplates.ts`. Deleted
  `useCompanyAdminAccess.ts` left no git trace (untracked file). All
  other entries in status belong to parallel workstreams, including a
  new hardening migration that this task did not touch.
- Repository searches:
  - `apply_permission_template`: one comment reference only, zero calls.
  - `entity_permissions` frontend writes: none. Two SELECT-only usages
    (AuthorizationProvider, new hook).
  - Assignment/removal: only via `assign_role_to_company_member` /
    `remove_role_from_company_member` wrappers.
  - No new role enum; `workspace_members.role` read-only display of
    owner/member; `profiles.role` untouched.
- `bun run build`: skipped due to hardware policy.

Pre-existing findings versus new findings: the audit output before and
after this task is byte-identical in findings. Nothing new introduced.

## Risks and Limitations

- Owner-visible coverage depends on RLS visibility, as in Phase 1;
  grants invisible to the viewer are not reflected in badges while
  enforcement still applies them.
- Removing a role removes overlapping pairs supplied by other sources;
  disclosed in UI copy, backend contract followed.

## Remaining Blockers

None for this phase. Deferred: grant-source tracking, Role Builder,
multi-entity selector, backend hardening of `apply_permission_template`.
