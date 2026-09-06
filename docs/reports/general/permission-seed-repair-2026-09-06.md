# Fresh-Tenant Permission Seed Repair Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

Find why a fresh company fails blank waybill logging. Fix the canonical path.

## Scope

- Proved table, policies, grants, and owner predicate are correct.
- Fixed the narrowed permission seeder plus safe backfill.
- Untouched: RLS, lifecycle, business data, UI design.

## Files Changed

- `supabase/migrations/20260906015952_restore_canonical_permission_seed.sql`: new.
- `src/pages/WaybillFormPage.tsx`: permission-aware error only (earlier).

## Skills Used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Root cause found: `20260905142503` redefined the seeder with 7 resources. It dropped 5 resources, 2 view-only grants, and the wildcard.
- Opaque provisioned under the narrowed version. Creator held 28 rows. No waybill grant. INSERT denied correctly by RLS.
- New migration restores the 54-row canonical baseline. Accounting resources kept.
- Backfill targets pairs with account rows on wildcard-free entities only. Templates and invitations cannot produce account rows. No limited member can match.
- Opaque now holds 54 rows. Predicate returns true.
- Archived entities gained inert baseline rows for the owner only.
- Main untouched. Anthropology untouched. No business data changed.

## Verification Result

- Live predicate: true for Opaque owner.
- Entity counts and UUIDs unchanged.
- `bun run typecheck`: passed.
- `bun run audit:load`: passed (pre-existing warnings only).
- Focused tests: 33 pass, 0 fail.
- `git status`: migration file plus prior isolated edit only.
- `bun run build`: not executed. Docker not started.

## Risks and Limitations

- No fresh production company was created. Creation is prohibited.
- Member onboarding grants remain a product decision.
- Archived entities now carry baseline rows. They are inert unless restored.

## Deferred Work

- Member grant flow product decision.
- Nightly cron legacy reference cleanup.
