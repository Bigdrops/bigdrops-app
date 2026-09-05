# First-Company Bootstrap Report

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Give a new workspace owner a usable company without a manual form submit. Reuse the existing entity creation and provisioning engine. Keep all workspace lifecycle rules unchanged.

## Scope

- In scope: automatic first-company creation inside an active workspace with zero active entities.
- Out of scope: automatic workspace creation, approval bypass, PostgREST changes, migrations, manual company creation changes.

## Files Changed

- `src/domain/tenant/tenantGate.ts`: added pure helper `buildInitialCompanyInput`.
- `src/domain/tenant/tenantCreation.ts`: added `ensureInitialCompany`, `InitialCompanyError`, outcome types.
- `src/pages/CompanyCreation.tsx`: auto-runs bootstrap on mount; manual form stays as fallback.
- `src/tests/critical/firstCompanyBootstrap.test.js`: new unit test for the naming helper.

## Skills Used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- `buildInitialCompanyInput` derives a deterministic display name and slug from the workspace name. Fallback is `My Company` / `my-company`.
- `ensureInitialCompany` re-reads active entities from the database on every call. It writes nothing when an active entity exists.
- Concurrent calls converge on one row. The slug is deterministic. The `UNIQUE (workspace_id, slug)` constraint rejects duplicates. The loser re-reads and reuses the winner row.
- Bounded suffix retries (`-2` to `-5`) cover slug collisions with archived rows. Archived rows are never resurrected.
- Creation uses existing `createEntity`. Provisioning uses existing `provisionEntity`. PostgREST exposure uses the existing trigger path only.
- Provisioning failure returns `provisioning-failed` with `lastError`. The code creates no second row.
- Errors carry codes: `auth/unavailable`, `workspace/unavailable`, `entity/creation-failure`, `provisioning/failure`, `permission/failure`, `tenant/resolution-failure`.
- `CompanyCreation` starts in `creating` phase and runs bootstrap once per workspace. Success selects the entity through the existing `EntityProvider` mechanism. Failure shows the existing error UI with retry to the manual form.
- No database migration was added. Existing constraints already give the needed guarantees.
- No workspace creation path was touched. Approval flow is unchanged.

## Verification Result

- `bun run audit:load`: passed (only pre-existing warnings).
- `bun run typecheck`: passed.
- `bun run test`: 149 pass, 1 fail. The failure is pre-existing in `tenantGate.test.js` (`multi-entity` expectation, no such phase exists in code). This change did not cause it.
- New tests: 3 pass.
- `git status`: only the 4 listed files changed. Other modified files belong to other agents. They were not touched.
- `bun run build`: skipped due to hardware policy.

## Risks and Limitations

- First company gets a default name. Users rename it later in Company Settings.
- No live database test was run. Docker and local Supabase were not started per task rules.
- StrictMode double-mount fires two concurrent bootstrap calls. The design treats this as the normal concurrency case.

## Deferred Work

- Fix the pre-existing `multi-entity` test expectation (owner: tenant gate area, separate task).
- Full workspace auto-creation needs a product decision. It conflicts with PRD v2.1 approval rules.
- Live provisioning test needs a safe non-production environment.
