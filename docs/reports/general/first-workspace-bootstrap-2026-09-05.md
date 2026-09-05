# First-Workspace Bootstrap Report

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Create the first workspace automatically for an authenticated user with no workspace. Preserve the approval model. Reuse the existing first-company bootstrap.

## Scope

- In scope: workspace detection, automatic pending workspace creation, owner path, approval boundary, WorkspaceCreation integration.
- Out of scope: approval bypass, new RPCs, migrations, PRD edits, company bootstrap rewrite, manual flow changes.

## Files Changed

- `src/domain/tenant/tenantCreation.ts`: added `ensureInitialWorkspace`, `InitialWorkspaceError`, outcome types.
- `src/domain/tenant/tenantGate.ts`: added pure helper `buildInitialWorkspaceInput`.
- `src/pages/WorkspaceCreation.tsx`: auto-runs bootstrap on mount; manual form stays as fallback.
- `src/tests/critical/firstWorkspaceBootstrap.test.js`: new unit test for the naming helper.

## Skills Used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Workspace creation mechanism found: direct `workspaces` insert via `createWorkspace`. Status defaults to `pending_approval`. `created_by` is stamped by trigger. No in-app caller of `approve_workspace` exists. Approval is external (Platform Office).
- Owner membership is created only by external `approve_workspace`. The bootstrap writes no `workspace_members` rows.
- `buildInitialWorkspaceInput` derives name from the session email and a deterministic per-user slug (`ws-<uid8>`). The slug is user-id based because `workspaces.slug` is globally unique.
- `ensureInitialWorkspace` re-reads memberships and own pending workspace on every call. Active membership returns `reused` with the count. Own pending returns `pending`. Only zero-state creates.
- Creation reuses `createWorkspace`, so the row lands in `pending_approval`. The outcome is status-driven. Only `active` counts as usable. Approval is never bypassed.
- Concurrent calls converge. Deterministic slug plus `UNIQUE` slug and the unique pending-per-creator index reject duplicates. The loser re-reads and reuses the winner row. No retry creates a second row.
- Errors carry codes: `auth/unavailable`, `workspace/creation-failure`, `permission/failure`, `tenant/resolution-failure`.
- `WorkspaceCreation` shows a minimal progress state during auto-run. Any outcome refreshes providers so the gate re-routes to selection, company creation, or the existing pending-approval page. Auto failure shows the existing manual form with the error.
- Company integration needs no new code. A usable workspace reaches `CompanyCreation`, which already auto-runs `ensureInitialCompany`. A pending workspace cannot provision because entity insert RLS needs owner membership.
- No migration was added. Existing constraints give the needed guarantees. No PRD file was changed.

## Verification Result

- `bun run audit:load`: passed (only pre-existing warnings).
- `bun run typecheck`: passed.
- `bun run test`: 152 pass, 1 fail. The failure is pre-existing in `tenantGate.test.js` (`multi-entity` expectation). This change did not cause it.
- New tests: 3 pass.
- `git status`: only the 4 listed files changed by this task. Other modified files belong to other agents. They were not touched.
- `bun run build`: skipped due to hardware policy.

## Risks and Limitations

- New users land on the pending-approval page until external approval. This is the PRD rule, not a defect.
- The default workspace name comes from the email prefix. Users rename it later in settings.
- No live database test was run. Docker and local Supabase were not started per task rules.

## Deferred Work

- Fix the pre-existing `multi-entity` test expectation (separate task).
- Live provisioning test needs a safe non-production environment.
