# Role and Teams Model PRD Update Report

This report was written by deepseek-v4-flash-free on 2026-08-17 via opencode.

## Objective
- Formalize the resolved product model for roles and teams across the three tenancy PRDs and the shared illustration.
- Make the role model explicit: roles are editable ability bundles; Workspace Admin is the workspace-wide authority ceiling; company-scoped roles (including Company Admin) sit below it; only expanded entity_permissions rows authorize anything.
- Keep the pass documentation-only. Do not change application source, Supabase migrations, RPCs, or RLS.

## Scope
- Backend PRD: `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- Frontend PRD: `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` (filename unchanged; internal version 1.6)
- Platform Office PRD: `docs/prd/Platform-god/platform-office-prd.md` (mirrored copy; changelog row 1.4 added)
- Illustration: `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`
- Report: `docs/Reports/multi-tenancy/role-and-teams-model-prd-update.md`

## Files changed
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md`
- `docs/prd/Platform-god/platform-office-prd.md`
- `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`
- `docs/Reports/multi-tenancy/role-and-teams-model-prd-update.md` (this report)

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

### Backend PRD
- Added a 2026-08-17 amendment note at the top.
- Added a Workspace Admin paragraph after the workspace roles table in section 3.2.
- Replaced section 3.11 with "3.11 Roles & Administration Model".
  - A role is an editable bundle of abilities stored as a permission template.
  - Assigning a role expands its items into entity_permissions rows.
  - The Workspace Admin and Company Admin are preloaded comprehensive roles.
  - No super admin exists.
  - The authority ceiling: Workspace Admin at the top, then workspace-wide authority, then company-scoped roles, then abilities.
  - Role assignment rules: existing company members only; no cross-company assignment; the same user can hold different roles in different companies.
  - Invitation interaction: acceptance creates membership plus the invite entity grants; role assignment is a separate post-acceptance step.
  - Platform Office relationship unchanged.
- Added an open item in section 12: role edit semantics (live vs snapshot) deferred; template reapply behavior in section 3.6 remains authoritative; the frontend role editor must expose the same semantics.
- Added success criteria in section 13.
  - Roles expand into entity_permissions rows.
  - Query time never infers authority from a role label.
  - A role is assignable only to existing company members.
  - No cross-company role assignment.
  - Company Admin is company-scoped.
  - Deleting a role never revokes expanded permissions.
- Added rows to the section 14 amendment table for the model resolution, company-member-only assignment, and deferred role edit semantics.

### Frontend PRD
- Bumped the internal version to 1.6 and added a v1.6 (2026-08-17) amendment record. The filename stays `erp-frontend-prd-v1.5.md`.
- Replaced section 12.6 with "12.6 Roles & Administration Model".
  - Role as editable ability bundle.
  - Preloaded roles: Workspace Admin and Company Admin.
  - Authority-ceiling diagram.
  - Assignment rules including the John example: Admin at Company A, Finance at Company B, no role at Company C.
  - Invitation interaction.
  - Representation note: roles stored as permission templates, expanded into entity_permissions rows.
  - Deferred role edit semantics.
- Replaced section 12.7 with "12.7 Role Abilities vs Business Permissions".
  - Roles carry zero authority of their own.
  - Only expanded entity_permissions rows are evaluated.
  - No inference from a role label at query time.
- Inserted new sections 12.8 Role Builder UX and 12.9 Teams UX before section 13.
  - Role Builder UX: category-grouped abilities; global and per-category Mark All with Include Delete / Exclude Delete confirmation; three-state category indicator.
  - Teams UX: two scopes, WORKSPACE and COMPANY; exact navigation is a frontend decision.
- Updated section 16 non-goals.
  - Two items reworded.
  - Four new items: role label as authority; role for a non-member; cross-company assignment; invented role edit semantics.
- Updated section 19 acceptance criteria with Role Builder and Teams items.
- Added a role-edit-semantics item to section 20.

### Platform Office PRD
- Updated section 2.5 to reference the ERP Frontend PRD v1.6 sections 12.6 to 12.9.
- Clarified zero authority over roles, role assignments, and teams.
- Kept the `approve_workspace()` rule unchanged.
- Extended section 8 item 2 with roles, role assignments, and teams.
- Added changelog row 1.4 (2026-08-17, documentation-only).

### Illustration
- Updated the header sub and footer to the resolved role phrasing.
- Renamed the administration card heading to "Roles & teams — authority ceiling".
- Added `permission_templates` and `permission_template_items` to the registry pills and the registry plane copy.
- Updated the ERP plane copy to the resolved roles phrasing and added `apply_permission_template()` to the pills.
- Replaced the users model: `adminLevel` replaced by `wsAdmin` (boolean) plus `roles` keyed per company.
- Sample data: Aisha is workspace admin of bigdrops-main with roles Admin at Acme and Beta; Chidi is a member with role Admin at Acme; Bola has a pending invite; Tunde has no membership.
- Rewrote `adminLabel` to show the Workspace Admin label or the per-company roles list or member-no-role.
- Rewrote the user role line and the roles/authority box to the company-scoped, ability-bundle model.
- Updated the ledger `grantedBy` for Chidi to include the role source.

## Resolved authority model
- Workspace Admin: the authority ceiling; today expressed as role owner plus governance toggles on workspace members permissions.
- Workspace-wide authority: below the ceiling.
- Company-scoped roles: assigned per company; bounded by the workspace administration; includes Company Admin.
- Abilities: expanded into entity_permissions rows; the only things evaluated at query time.
- A role label has no authority of its own.
- Deleting a role never revokes expanded permissions.
- No super admin exists.

## Role model
- A role is an editable bundle of abilities.
- A role is stored as a permission template.
- Assigning a role expands its items into entity_permissions rows.
- Preloaded roles: Workspace Admin and Company Admin.
- Role edit semantics: deferred; the template reapply behavior in backend section 3.6 remains authoritative; the frontend role editor must expose the same semantics.

## Custom role model
- Custom roles reuse the existing permission template tables.
- No parallel schema is prescribed.
- A custom role is assignable only to existing company members.
- No cross-company role assignment.
- The same user can hold different roles in different companies.

## Mark All behavior
- Role Builder UX provides a global Mark All and a per-category Mark All.
- Include Delete and Exclude Delete require explicit confirmation.
- The category indicator shows three states: None, Partial, All.

## Category Mark All
- Role Builder groups abilities by category: Projects, Invoices, Quotations, Clients, RFQs, BOQs, Waybills, CSR, Receipts, Correspondence or Letters, and others.
- Per-category Mark All selects every ability in that category.
- The category indicator reflects the three-state result.

## Teams model
- Teams UX has two scopes.
- WORKSPACE scope: members, invitations, workspace admin, companies, role management.
- COMPANY scope: members, invitations, roles, Company Admin assignments.
- Exact navigation is a frontend decision.

## Company-scoped assignment
- A role is assignable only to existing company members.
- No cross-company role assignment.
- The same user can hold different roles in different companies.
- Example: John is Admin at Company A, Finance at Company B, and no role at Company C, under the BIGDROPS Group workspace.

## Invitation interaction
- Invitation lifecycle unchanged: pending, accepted, revoked, expired.
- Pass for now is a session-only action, not a state.
- Flow: invitation, then acceptance, then company membership, then role assignment.
- Acceptance creates membership plus the invite entity grants.
- Role assignment is a separate post-acceptance company-scoped step.
- Invitations do not assign roles.

## Illustration changes
- The illustration now matches all three PRDs: backend v2.1, frontend v1.6, platform office v1.4.
- The users array uses wsAdmin plus per-company roles.
- The authority box shows the ceiling, company roles, and the authorization rule.
- The ledger shows role-sourced grants.

## Verification results
- `bun run audit:load`: passed
- `git status`: expected four documentation files changed; no source or migration files changed
- `git diff --stat`: confirmed four documentation files changed
- `bun run typecheck`: skipped, documentation-only pass
- `bun run build`: skipped, documentation-only pass and hardware policy

## Risks or limitations
- The frontend PRD filename still says v1.5 while the internal version is 1.6. This is intentional. Renaming the file would break links. The amendment record documents the version change.
- Role edit semantics remain deferred. The backend template reapply behavior in section 3.6 stays authoritative until a decision is made.
- The illustration is a static mock. It shows the resolved model but does not run real authorization.

## Deferred implementation decisions
- Role edit semantics: live vs snapshot. Decision deferred. The backend template reapply behavior remains authoritative.
- Exact Teams navigation layout. The two scopes are defined; the navigation is a frontend decision.
- Query-time role label inference: explicitly rejected. Only expanded entity_permissions rows are evaluated.
- Super admin: explicitly rejected. It does not exist in the model.