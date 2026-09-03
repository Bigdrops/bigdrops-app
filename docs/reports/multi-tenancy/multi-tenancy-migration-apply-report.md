# Multi-Tenancy Migration Apply Report

This report was written by DeepSeek on 2026-08-17 via OpenCode.

## Objective

Apply the remaining verified multi-tenancy backend migrations to the live Supabase database. Confirm that each migration is applied, that data is preserved, and that the preloaded role templates are seeded.

## Scope

- Apply one of the two duplicate 20260818000000 migrations.
- Apply 20260818000001_multi_tenancy_invitation_correctness.
- Apply 20260819000000_preloaded_roles_and_assignment.
- Verify all required objects and seed data after apply.
- Run the required verification gate.

## Files changed

- supabase/migrations/20260819000000_preloaded_roles_and_assignment.sql (added `v_item record;` declaration, committed in 8bef1fd6)

## Skills used

supabase, supabase-postgres-best-practices

Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

### Duplicate 20260818000000 migration

Both 20260818000000 files were compared:

- 20260818000000_creator_wildcard_permission_seed.sql
- 20260818000000_seed_wildcard_creator_permission.sql

Both files create the same function `public._prov_seed_default_permissions(uuid, uuid)` with the same inserts and the same `ON CONFLICT DO NOTHING` behavior. Only the insert order differs. The migrations are functionally equivalent.

One migration was applied: 20260818000000_seed_wildcard_creator_permission.sql. The other was not applied. This satisfies the requirement to execute exactly one duplicate.

### Applied migrations

The following three migrations are applied to the live database:

- 20260818000000_seed_wildcard_creator_permission.sql
- 20260818000001_multi_tenancy_invitation_correctness.sql
- 20260819000000_preloaded_roles_and_assignment.sql

During apply, 20260819000000 failed with error 42601. The function `remove_role_from_company_member` used a loop variable `v_item` without declaring it. The file was edited to add the declaration. The migration then applied successfully. All statements run as one implicit transaction, so the failed run rolled back cleanly.

### Live verification

The following verification query was run against the linked database:

- wildcard_fn: 1
- invite_fns: 3
- invite_trigger: 1
- grants_unique_idx: 1
- role_fns: 4
- role_trigger: 1
- templates_seeded: 4
- template_items: 21
- active_workspaces: 1
- entities: 1
- members: 1
- invites: 0
- grants: 0
- entity_permissions: 25

All object checks returned positive. The four preloaded role templates are seeded with 21 template items. Existing data is preserved: one active workspace, one entity, one member, and 25 entity_permissions rows. No invitation data was changed.

## Verification

- bun run audit:load: passed (pre-existing warnings only)
- git status: clean for applied work; unrelated untracked wireframe files present
- bun run build: skipped due to hardware policy

## Risks or limitations

- The role templates exist but no role is yet assigned to a member. The verification confirmed the assignment functions exist, not that a role assignment was performed.
- `remove_role_from_company_member()` can remove permission pairs granted through another source. The `entity_permissions` table has no grant-source column. This limitation is not fixed in this task.
- The two 20260818000000 migrations are equivalent by inspection. The non-applied file remains in the repository.

## Deferred work

- Existing-entity backfill remains Plan C scope.
- Assign starter roles to existing members in the live database.
