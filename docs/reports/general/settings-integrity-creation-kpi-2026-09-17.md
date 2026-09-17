# Settings Integrity Fix Report — Company Creation Persistence and Team Hub KPI

This report was written by Buffy on 2026-09-17 via Freebuff.

## Objective

Fix three integrity issues in the Settings facelift:

1. Create Company collected seven fields and persisted only the display name. The other values were silently discarded.
2. The Team Hub KPI card labeled "Company" showed a count of members with visible effective permission rows. That number is not a true current-company member count.
3. Create Company entry control fidelity to `settings-unified-candidate.html` needed verification from the candidate source, not from prior reports.

## Scope

In scope:

- Persistence failure handling in Create Company.
- Team Hub KPI copy and data sourcing.
- `su-create-inline` styling fidelity to the candidate ghost button.
- KPI label wrapping inside the one-row strip.

Out of scope:

- Permission architecture changes.
- Database migrations. The user said "do not run Supabase migrations".
- Logo upload during creation.
- Redesign of accepted Settings surfaces. Role Details and Member Details restructuring stays as accepted.

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Persistence audit — Create Company fields

The existing company entity persistence model is a per-tenant `settings` table (id=1) in the tenant schema. Source of truth: `supabase/migrations/20260520090000_core_tables.sql`, `supabase/migrations/20260915194332_tenant_template_seed.sql`, `src/hooks/useSettings.js` (`saveSettings` upserts into `settings` through the schema-aware tenant client), and `src/pages/settings/CompanySettingsSection.tsx` (Company Info writes the same columns).

| Field | UI collects it? | Existing persistence location | Saved during creation? | Final decision |
| --- | --- | --- | --- | --- |
| Company name | Yes | `settings.company_name` (tenant schema; seeded by provisioning from `entities.display_name`) | Yes | Save. Overwrite the seeded value with the exact typed text. |
| Business type | Yes | `settings.custom_info` (JSON `{label, value}` array; Company Info Custom Fields uses the same path) | Yes | Save as entry `Business Type` in `custom_info`. |
| Registration number | Yes | `settings.custom_info` | Yes | Save as entry `RC Number` in `custom_info`. |
| Tax ID | Yes | `settings.custom_info` | Yes | Save as entry `Tax ID` in `custom_info`. |
| Phone | Yes | `settings.company_phone` | Yes | Save. |
| Email | Yes | `settings.company_email` | Yes | Save. |
| Address | Yes | `settings.company_address` | Yes | Save. |
| Logo / branding | No upload control in the sheet | `settings.company_logo_url` (upload path: `uploadFile` + Logo & Branding section) | No | Explicit post-creation action only. The sheet shows an informational Branding block. It collects no file and promises no upload. |

No new columns, no new entities, no migration. All writes go through the established `saveSettings` path.

### Write timing

Provisioning seeds the tenant `settings` row (`_prov_seed_settings` in `20260809000000_provisioning_settings_seed.sql`). The sheet writes the extra details only after `waitForTenantExposure()` confirms the schema is exposed. A direct tenant client is built with `createTenantClient(supabase, buildTenantSchemaName(workspaceSlug, entitySlug))` for that write. `TenantClient.isReady` is true by construction for a non-null schema.

### Failure handling change

Before this task, a failed details write was logged to console only. The user saw a success toast while typed values were discarded. That was a silent discard. Now the write failure raises one explicit warning toast:

- Message: "Company saved, but some details were not stored".
- Description names the company and points to Settings, Company Info for re-entry.
- The warning fires once per sheet session (ref guard). Reset on form reset.

The company itself stays usable. The user is never told that values were stored when they were not.

## KPI audit — Current Company Members

### How BIGDROPS defines company membership

Evidence chain:

- `20260818000000_creator_wildcard_permission_seed.sql`: every entity creator receives `('*', view/create/edit/delete)` grants.
- `20260829000000_invitation_company_membership_baseline.sql`: "entity_permissions, which IS genuine company membership under the existing model". Invitation acceptance copies a baseline `('*', 'view')` grant into `entity_permissions`.
- `20260915220000_role_assignments_and_template_management.sql`, `assign_role_to_company_member()`: the target must hold at least one `entity_permissions` row on the entity. Otherwise the RPC raises "User is not a member of this company".

Canonical definition: a user is a member of a company when they hold at least one `entity_permissions` row on that entity. Distinct `user_id` count over those rows is the authoritative count.

### Can the frontend derive that count?

No. RLS blocks it:

- `entity_permissions_select_self` (`20260714000001_multi_tenancy_rls.sql`): a caller sees only rows where `user_id = auth.uid()` or `granted_by = auth.uid()`.
- Rows with `granted_by` NULL (invitation baseline copy, system backfills) are invisible to everyone except the holder.
- Rows granted by a third member are invisible to the workspace owner viewing the Team Hub.
- No SECURITY DEFINER counting RPC exists. The repository has no `entity_members` or equivalent.

Therefore any client-side DISTINCT-user count is a strict subset. The previous card (members with visible effective permission rows) presented that subset as the company member count. That was not semantically true.

### Resolution

Per instruction, no migration in this task. The card now shows:

- Label: "Current Company Members" (exact required copy).
- Value: "—" (em dash), consistent with the app's existing "unavailable" marker.
- Sub-label: "checking access…" while loading, then "count unavailable".

The missing capability is stated in the UI and in the deferred work section. The card does not display a knowingly incomplete number.

### KPI table

| KPI | Authoritative data source | Exact meaning | Reliable under current RLS? |
| --- | --- | --- | --- |
| Workspace Members | `workspace_members` rows for the workspace (`useTeamMembers`) | Count of active workspace memberships | Yes. `workspace_members_select_self` shows all rows for workspaces the caller belongs to (via `is_workspace_member`). |
| Current Company Members | Distinct `user_id` in `entity_permissions` for the entity. Not obtainable client-side. | Users holding at least one permission grant on the current company (canonical membership signal) | No. RLS hides third-party-granted and `granted_by`-NULL rows. No counting RPC exists. Card reports "count unavailable" until a SECURITY DEFINER counting RPC is added. |
| Pending Invites | `workspace_invitations` rows, status `pending`, for the workspace (`useTeamInvitations`) | Pending invitation count | Yes. Workspace members see all invitations of their workspace. |

### KPI layout

The three cards stay in one row at mobile, fold, and desktop. The strip stays `grid-template-columns: repeat(3, 1fr)`. Only the label text changed: labels may now wrap to two lines. `white-space: nowrap` with ellipsis truncation was removed for `.su-stat-label`; the full words "Current Company Members" stay readable.

## Entry control audit — candidate source

Determination comes from the candidate file itself: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/settings/settings-unified-candidate.html`.

### Create Company

- Representation: inline ghost button. Not a FAB.
- Evidence, Switch Company renderer: `<button class="ghostbtn" type="button" data-nav="create-company" style="width:100%;justify-content:center;gap:6px;"> + Create Company </button>` inside a `margin-top:8px` wrapper, placed after the company list and before the ia-note.
- The create-company view itself renders as a full-page form with a `fab-float` save action inside the form. That is the form's submit affordance, not the entry control.
- Implementation match: `CompanyManageSection.tsx` opens the sheet from a `su-create-inline` button. This task made `su-create-inline` match the candidate ghost button: solid `--su-surface-muted` fill, no border (candidate has no border), radius 8, `margin-top: 8px`, gap 6, weight 800, accent hover. Height is 44 px, this app's mobile-port floor for `.su-ghostbtn` (candidate base is 30 px at its compact prototype scale). The prior dashed-border styling was invented, not candidate-derived, and is removed.

### Create Workspace

- Representation: FAB on the Switch Workspace screen. Evidence: `<button class="fab" id="fabCreateWsBtn" aria-label="Create Workspace">` rendered after the workspace list. The FAB navigates to a separate `create-workspace` view with name and slug fields and a `primarybtn` submit.
- Implementation match: `WorkspaceSwitchSection.tsx` already has a `su-fab` on the list view that switches to a create view with Workspace name + auto-derived slug + `su-primarybtn` submit. Interactions correspond to the candidate. No change made. No redesign needed.

## Changes made

| File | Change |
| --- | --- |
| `src/components/layout/CreateCompanySheet.tsx` | Details-write failure now raises one explicit warning toast (de-duplicated per session). No other flow change. |
| `src/pages/settings/AdminSettingsSection.tsx` | KPI copy: "Workspace Members", "Current Company Members", "Pending Invites". Company card shows "count unavailable" instead of an RLS-limited subset. Company card previously derived from `effectiveByUser`; sub-labels updated. |
| `src/components/settings/settings.css` | `su-create-inline` restyled to candidate ghost button. `.su-stat-label` allows two-line wrap. |

Role Details and Member Details restructuring was not touched.

## Verification result

Verification:

- bun run audit:load: passed (exit 0; all warnings pre-existing, including the CreateCompanySheet oversize flag)
- bun run typecheck: passed (`tsc --noEmit`, zero errors)
- Focused settings tests: 10 pass, 3 fail. The 3 failures are pre-existing: with this task's changes stashed, the same 3 tests fail. They assert Settings-nav inventory state that does not match current `settings-config.ts`; unrelated to this task.
- git diff --check: clean
- git status: this task modified 3 files. Pre-existing concurrent-agent changes observed (tmp-purge deletions, untracked migration `20260916000000_fix_source_boq_id_all_entity_schemas.sql`, untracked session-memory files). Untouched.
- supabase db push: not applicable (no SQL changed)
- bun run build: skipped due to hardware policy

## Supabase push status

Not applicable. No migration was written. The user excluded migrations from this task.

## Risks or limitations

- The Current Company Members card shows no number. This is honest but less useful than a true count. Restoring a number requires a backend change (see deferred work).
- The details write is non-blocking. If it fails, the company is active but the extra details are absent. The warning toast now makes this visible. The values live only in the form until the write succeeds.
- The write uses a schema name built from slugs. Slug collision suffixes are handled by `buildTenantSchemaName` the same way provisioning names schemas, so the path is deterministic. Exposure is confirmed before the write.

## Deferred work

1. Authoritative company-member count. Add a SECURITY DEFINER RPC, for example `count_entity_members(p_entity_id uuid)`, that returns `COUNT(DISTINCT user_id)` over `entity_permissions` for the entity, gated by workspace membership. Needs a new migration in a task that authorizes it.
2. The 3 pre-existing settings test failures need a separate decision: update the test inventory or restore the nav state they assert.
3. Optional: inline the details write into the provisioning-success toast flow so the user sees one combined outcome.
