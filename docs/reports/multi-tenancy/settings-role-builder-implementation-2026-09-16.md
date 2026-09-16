# Settings and Role Builder Implementation Report

This report was written by GPT-6 (Codex) on 2026-09-16 via Codex desktop.

## Objective

Implement the Team Hub and Role Builder against the existing M8 contracts.
Apply the approved Settings design with the required permission and scope corrections.

## Scope

- Settings navigation and company context.
- Team summary, member search, member cards, and member sheets.
- Role definition management and assignment display.
- Permission selection, preview, and explicit synchronization.
- Settings typography and accessible overlays.

## Skills and documentation

Skills used: superpowers:using-superpowers, frontend-design, react-dev, supabase, accessibility, karpathy, apple-design

Documentation standard: ASD-STE100 Simplified Technical English

Authoritative references:

- [Approved candidate](../../prd/Adaptive%20Mobile-First%20UIUX%20Facelift%20PRD/Design-direction/settings/New-settings-candidate-v1-gemini.html).
- [Facelift PRD](../../prd/Adaptive%20Mobile-First%20UIUX%20Facelift%20PRD/00-index.md), Design.md, and sections 02, 03, 11, and 21.
- [Frontend PRD](../../prd/multi-tenancy/erp-frontend-prd-v1.5.md), sections 12.8 and 12.9.
- [Tenancy PRD](../../prd/multi-tenancy/multi-tenancy-prd-v2.1.md).
- M8 migration `20260915220000_role_assignments_and_template_management.sql`.
- The user attachment controls where the older audit and candidate conflict with M8.

## Audit and implementation delta

The old Team view used `coversTemplate()` to choose Grant or Remove.
It did not read assignment records. It had no template management controls.

The existing backend already supplies all required write operations.
No new database capability was needed.

## Files changed

- `index.html`: load DM Mono through the existing font stylesheet request.
- `src/components/settings/SettingsShell.tsx`: introduction and persistent context.
- `src/components/settings/SettingsSectionFrame.tsx`: Team surface and back target.
- `src/components/settings/SettingsSheet.tsx`: Settings overlay wrapper.
- `src/components/settings/settings.css`: scoped typography and reduced motion.
- `src/hooks/usePermissionTemplates.ts`: descriptions and assignment records.
- `src/domain/team/role-permissions.ts`: canonical editor helpers.
- `src/domain/team/role-management.ts`: existing RPC adapters.
- `src/pages/Settings.tsx`: scope reset and removal of the legacy section alias.
- `src/pages/settings/AdminSettingsSection.tsx`: Team Hub.
- `src/pages/settings/RoleBuilder.tsx`: role list and editor.
- `src/pages/settings/AppThemeSettingsSection.tsx`: company color scope labels.
- `src/pages/settings/settings-config.ts`: scope groups, labels, and gates.
- `src/pages/settings/index.ts`: remove the legacy export alias.
- `src/tests/settings/role-builder.test.js`: 11 focused tests.
- `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md`: Settings navigation note.
- This report.

## Changes made

- All 17 Settings sections remain reachable for the applicable user.
- Team Hub is under Workspace. Switch Company leads the Company group.
- Document Controls and Archives are under Company.
- Personal appearance is under Account. Shared colors identify the company.
- Member cards show assignment records only. Permission coverage does not imply assignment.
- Company sheets show assigned roles separately from visible effective permission rows.
- Multiple assignments use the existing assign and remove RPCs.
- Create, edit, duplicate, and delete use the existing template RPCs.
- The editor uses the canonical resources and view/create/edit/delete actions.
- Each resource has None, Partial, or All state and a Mark All choice for delete.
- Exact stored permission pairs are available in the preview.
- Template writes remain owner-only. Read-only inspection disables editing.
- Save calls only the update RPC. The backend propagates additions.
- A separate AlertDialog confirms enforcement across all companies with role holders.
- Enforcement copy states that direct and invitation grants can be removed.
- Delete copy states that assignment records are deleted but effective permissions remain.
- Requests from an old workspace or company cannot replace current role state.
- Sheets use the approved bottom-sheet pattern on mobile and tablet.
- Sheets include safe-area padding, focus handling, a drag handle, and swipe dismissal.
- Settings use Manrope and DM Mono. Reduced-motion users receive no CSS animation.

## Design reconciliation

The approved candidate controls the visual direction and navigation flow.
The user attachment requires these functional differences:

- Use canonical permission pairs instead of the candidate ability names.
- Apply the corrected scope groups.
- Do not add suspension. The fourth summary tile shows the current company.
- Do not lock preloaded roles or prohibit deletion based on holder count.
  Those restrictions do not exist in the required backend contract.
- Keep invitation access separate from role assignment.
- Keep the existing company create, archive, and restore flows.

## Verification result

- `bun run audit:load`: passed, exit 0. It reports 25 oversized files,
  8 broad selects, 1 component fetch, and 3 heavy limits outside this patch.
- `bun run typecheck`: passed, exit 0. One earlier attempt ran out of memory.
  The preview server was stopped before the successful retry.
- `bun test src/tests/settings/role-builder.test.js`: 11 passed, 0 failed.
- `bun run test`: 443 tests; 439 passed and 4 failed.
- The four failing accounting test files were run separately through Bun.
  Each fails at unchanged `src/supabase.ts:3` because `import.meta.env` is
  undefined in the Node test runner. None imports the changed Settings code.
- `git diff --check`: passed.
- `git status`: task files added or modified; pre-existing changes retained.
- Browser verification: not performed. Browser access was denied.
- `supabase db push`: not applicable. No SQL or schema change.
- `bun run build`: not executed, as required by the hardware policy.

Read-only queries against the linked hosted project confirmed:

- The assignment table and all five template-management RPCs exist.
- The authenticated role has SELECT permission on the assignment table.
- Effective-permission reads are limited to rows held by or granted by the caller.
- Both Engineer templates contain the required create/edit pairs, including
  invoice and quotation, the wildcard view pair, and no delete action.
- Both Viewer templates contain view actions only.

## Supabase push status

Not applicable. This task did not write database data or change migrations.
No historical M8 migration was edited. No production mutation test was run.

## Working-tree preservation

The initial status included changes to the skill index, skill lock,
multi-tenancy roadmap, quotation save hook, quotation view, and BOQ actions.
It also included a deleted older Settings candidate, untracked design files,
reports, templates, tickets, local settings, Neon skills, and two migrations.
Those files were not changed, staged, removed, or restored by this task.

## Risks or limitations

- Visual fidelity and browser interaction still need a permitted browser review.
- The current read policy does not give an owner a complete view of all other
  users' effective grants. The UI labels this limitation and leaves membership
  validation to the assignment RPC. It does not treat hidden rows as no access.
- Permission rows have no grant-source field. Enforcement cannot isolate
  direct grants from old template grants. Confirmation states this limit.
- The full test suite remains blocked by the existing test environment issue.
- Font loading uses the existing Google Fonts connection and has local fallbacks.

## Deferred work

- Browser review on phone, tablet, and desktop when access is permitted.
- Repair the accounting test environment in a separate task.
- Suspension, timed suspension, and removal undo remain outside this task.
