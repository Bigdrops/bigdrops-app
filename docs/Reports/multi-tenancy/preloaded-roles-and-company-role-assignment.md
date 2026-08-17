# Preloaded Roles and Company Role Assignment Report

This report was written by opencode on 2026-08-19 via Local Runner.

## Objective

Implement the backend core of the Roles + Teams model. The PRD-set starter
roles are seeded for every active workspace. Role assignment and removal
RPCs are added with authorization guardrails.

## Scope

- One new migration: `supabase/migrations/20260819000000_preloaded_roles_and_assignment.sql`.
- No existing migration was edited.
- No frontend code was changed.
- No template or permission table schema was changed.
- No new `role` or `assign` resource convention was added.

## Files changed

- `supabase/migrations/20260819000000_preloaded_roles_and_assignment.sql`

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Documentation standard

The PRD at `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` is the source
of truth. Sections used: §3.6, §3.11, §12.8.

## Changes made

The migration does four things.

1. `seed_preloaded_role_templates(p_workspace_id)` seeds four templates per
   workspace: Company Admin, Engineer, Manager, Viewer. It is SECURITY
   DEFINER and idempotent. A template is inserted only when no template
   with the same name exists for the workspace. The seed skips workspaces
   that are not active.

   The starter templates use these items:

   | Template | Items |
   |----------|-------|
   | Company Admin | `('*', view/create/edit/delete)` |
   | Manager | `('*', view/create/edit)` |
   | Engineer | `('*', view)` + `(project, waybill, boq, rfq, csr, item)` × `(create, edit)` |
   | Viewer | `('*', view)` |

   These are editable defaults. They are not part of any locked business rule.

2. `trg_workspaces_seed_preloaded_roles` is an AFTER INSERT OR UPDATE
   trigger on `workspaces`. It fires when a workspace becomes active. This
   covers `approve_workspace()`, which is SECURITY DEFINER and was not
   edited.

3. A backfill block seeds every workspace that is already active.

4. `assign_role_to_company_member(p_template_id, p_entity_id, p_user_id)`
   and `remove_role_from_company_member(...)` apply or remove a template on
   one company entity for one user. Both are SECURITY DEFINER. Both enforce
   three guardrails:

   - The template and entity must belong to the same workspace.
   - The target user must already be a company member. Company membership
     is signalled by at least one `entity_permissions` row for that entity.
   - The assigner must be the workspace owner, or must hold every ability
     in the template on the target entity. This implements the delegation
     ceiling in PRD §12.8.

   Assignment reuses `apply_permission_template()` with
   `ON CONFLICT DO NOTHING`.

## Design decisions

- **Company Admin is comprehensive.** It uses the wildcard pair
  `('*', *)`. This matches the existing wildcard pattern in
  `_prov_seed_default_permissions()`.
- **No new resource convention.** Role assignment is authorized by the
  delegation ceiling, not by a dedicated `role` or `assign` resource.
  Company Admin's wildcard covers role management. A dedicated resource is
  deferred.
- **No parallel schema.** The existing `permission_templates` and
  `permission_template_items` tables are reused.
- **Workspace Admin is not a template.** It remains the owner role plus
  governance toggles on `workspace_members.permissions`.

## Verification result

- `bun run audit:load`: passed. Pre-existing warnings only.
- `bun run typecheck`: timed out at 300000 ms. The change is SQL-only and
  does not touch TypeScript, so the timeout is unrelated to this change.
- `git status`: shows the new migration as untracked. No commit was made.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- `entity_permissions` has no grant-source column. `remove_role_from_company_member`
  deletes every `(resource, action)` pair that matches the template for the
  entity and user, regardless of which grant produced it. A pair that also
  came from the creator seed or an invitation grant is removed too. This is
  marked with a `ponytail:` comment in the migration.
- The trigger is a business-behavior change. Any workspace whose status
  changes to `active` now receives seeded templates. The seed is idempotent,
  so a repeated activation does not duplicate templates.
- The starter template content is a reasonable default, not a PRD-mandated
  ability list. The PRD names the roles but does not enumerate their items.

## Deferred work

- Frontend UI for role management and role assignment.
- A grant-source column on `entity_permissions` to make role removal
  precise.
- A dedicated `role`/`assign` resource convention if stricter role
  management gating is required later.
- A backfill check on live production entities if the seeder was already
  run in another environment.