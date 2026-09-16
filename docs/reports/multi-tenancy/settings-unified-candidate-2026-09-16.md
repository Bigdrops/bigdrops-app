# Unified Settings Implementation and Backend Blocker

This report was written by GPT-6 (Codex) on 2026-09-16 via Codex desktop.

## Objective

Apply the unified Settings candidate to the React application. Diagnose the recurring role-assignment error through the application data API.

Status: UI changes are ready for user visual review. The production database error remains blocked by CLI account access.

## Scope and authority

The sole visual authority for this pass is [settings-unified-candidate.html](../../prd/Adaptive%20Mobile-First%20UIUX%20Facelift%20PRD/Design-direction/settings/settings-unified-candidate.html). The full file was read before code changes.

The latest user attachment limits live Settings navigation to Switch Workspace and Team Hub. The other nine candidate rows remain visible and inert. This instruction supersedes the earlier 17-destination implementation. The prior implementation report does not prove that the current production error is resolved.

Visual verification belongs to the user, as requested. No browser preview or screenshot check was performed.

Skills used: frontend-design, react-dev, accessibility, supabase, apple-design, karpathy, superpowers:using-superpowers

Documentation standard: ASD-STE100 Simplified Technical English

Database procedure: [database-workflow.md](../../../supabase/database-workflow.md).

## Files changed

- `src/pages/Settings.tsx`
- `src/pages/settings/settings-config.ts`
- `src/components/settings/SettingsNav.tsx`
- `src/components/settings/SettingsShell.tsx`
- `src/components/settings/SettingsSheet.tsx`
- `src/components/settings/settings.css`
- `src/pages/settings/WorkspaceSwitchSection.tsx`
- `src/pages/settings/AdminSettingsSection.tsx`
- `src/pages/settings/RoleBuilder.tsx`
- `src/hooks/useTeamMembers.ts`
- `src/hooks/useTeamInvitations.ts`
- `src/tests/settings/role-builder.test.js`
- This report.

## Changes made

- Replace the large introduction and context card with the compact candidate header.
- Apply the Account, Workspace, Company, and Preferences groups in candidate order.
- Use the candidate row spacing, typography, surfaces, borders, and icon containers.
- Restrict navigation to two native buttons. Render the other nine rows without click handlers.
- Read names and counts from workspace, entity, and member state.
- Share the member query between Settings navigation and Team Hub.
- Start member and invitation hooks in a loading state. Do not show zero counts before the first query.
- Show invitation failures instead of a false empty state.
- Use a single component tree across screen widths. CSS controls pane visibility.
- Use one pane on narrow screens and a 360px navigation pane when the available Settings width reaches 700px.
- Use 430px, 820px, and 1180px maximum surface widths. Do not ship device simulator controls or the prototype device frame.
- Keep workspace switching in the existing `selectWorkspace` provider. List real available workspaces and identify the current workspace.
- Apply the Team Hub member cards, statistics, invitation rows, role entry, and invite button.
- Apply the role list and bottom-sheet presentation. Preserve the existing canonical resource/action editor and RPCs.
- Keep explicit role assignments separate from effective permissions. Do not use permission coverage as assignment truth.
- Preserve owner checks, multiple roles, invitation acceptance, role synchronization, and confirmation behavior.
- Keep modal focus handling, safe-area spacing, keyboard controls, and reduced-motion handling.

## Data and prototype limits

The prototype contains features that have no authorized implementation in this task. No mock workspace lifecycle, suspension, banishment, or role vocabulary was added.

The Company statistic counts members with visible effective permission rows. Its caption is `visible access`. The existing policy can hide grants held by other users and issued by other grantors. This count is not presented as a complete company membership count.

Workspace rows show the live slug and membership role. The provider does not supply a per-workspace member count. No prototype count is substituted.

Role rows show the live assignment-holder count for the active entity and the canonical permission-row count. No System or Built-in status is inferred from role names.

The candidate controls visual presentation. Existing M8 permission editing and destructive-action explanations remain where the prototype behavior would conflict with the live permission model.

## Supabase evidence

### Runtime configuration

- `src/supabase.ts` reads `VITE_SUPABASE_URL` and the anon or publishable key.
- The client has no custom database schema override. The role hook queries `entity_role_assignments` in public.
- Local `.env` resolves to `https://xqlpekpkbszpdgtuwybh.supabase.co`.
- Vite environment resolution for development, production, and test modes resolves to that same host on this machine.
- The repository CLI link is `jfijijipdlppyoqyocmi`.
- The application configuration and CLI link do not target the same project.
- The Android release workflow receives its URL from GitHub Actions secrets. Its deployed value was not available in this task.
- A deployed website can also use build-time environment values different from local `.env`.
- The user was asked which runtime shows the error. No runtime-specific response was available when this report was written.

### Application data API probe before correction

The probe used the installed `@supabase/supabase-js` client, the locally resolved public URL/key, default public schema, and this read shape:

```ts
client.from('entity_role_assignments')
  .select('user_id, template_id')
  .eq('entity_id', '00000000-0000-0000-0000-000000000000')
```

The zero UUID limits the probe to no business rows. It is not application state or a production fallback.

Result: HTTP 404, code `PGRST205`.

```text
Could not find the table 'public.entity_role_assignments' in the schema cache
```

A control query for `entity_permissions` on the same host, key, schema, and entity filter returned HTTP 200 with zero rows. This confirms that the public data API is reachable while the assignment-table lookup fails.

The probe had no signed-in user session. It reproduces the schema lookup failure through the same table/query API, but does not verify authenticated member rows or RLS behavior.

### Linked project SQL probe

Read-only CLI queries against `jfijijipdlppyoqyocmi` found:

- Migration `20260915220000`: present.
- `public.entity_role_assignments`: present.
- Row-level security: enabled.
- `entity_role_assignments_select_member`: SELECT policy present.
- Policy predicate: entity workspace membership with `wm.user_id = auth.uid()`.
- Authenticated SELECT privilege: present.

These results apply only to the linked project. They do not resolve the production error.

### Production access blocker

An explicit production query first failed with the CLI IPv6 setup error. A production link was then attempted in an isolated temporary CLI directory. The existing repository link was preserved.

The production link was denied with:

```text
Your account does not have the necessary privileges to access this endpoint.
```

Production migration history, table existence, RLS, and policies could not be inspected with this CLI account. The evidence does not establish whether the production cause is a missing migration, stale metadata, or table exposure configuration.

Corrective database action: none. No cache reload or migration push was attempted on an unverified target. No schema, migration history, historical M8 file, or environment value was changed.

After-fix result: not available. The production blocker remains unresolved. A successful query on the linked project is not accepted as a production fix.

## Verification

- `bun run audit:load`: passed, exit 0. Existing findings: 25 oversized files, 8 broad selects, 1 component fetch, and 3 heavy limits. None identifies a file changed by this task.
- `bun run typecheck`: passed, exit 0 on the final code.
- `bun test src/tests/settings/role-builder.test.js`: passed, 12 tests.
- Focused tenant gate and Settings cache tests through the repository Node loader: passed, 16 tests.
- Settings CSS parser check: passed, 162 rules.
- `git diff --check`: passed, exit 0.
- `git status --short`: task changes and unrelated concurrent changes remain uncommitted. No protected file was reverted or overwritten by this task.
- Visual mobile, foldable, desktop, and authenticated interaction checks: delegated to the user by request.
- `supabase db push`: not applicable to this patch. No SQL change was made. Database resolution remains blocked.
- `bun run build`: not run, as required by hardware policy.
- Commit: not created.

## Concurrent work

The initial working tree contained changes to the Android release workflow, GuidanceTip, and guidanceEngine, plus an Android report and a guidance ticket. Changes to `src/App.tsx` appeared during this task. These files were not edited, reverted, staged, or removed by this task.

## Risks, limitations, and deferred work

- The production role-assignment error remains open.
- Sign the CLI in with an account authorized for `xqlpekpkbszpdgtuwybh`, then inspect that project's migration and table state through the documented workflow.
- Apply only an evidence-supported correction. Use a safe schema reload only if the table and migration are verified. Use the normal migration chain if it is missing and consistent.
- Repeat the application client query with an authenticated session on the failing runtime after correction.
- The user must verify visual fidelity and interactive behavior on mobile, foldable, and desktop.
- The approved candidate's small type and muted colors were preserved. This pass does not claim a complete WCAG contrast audit.
