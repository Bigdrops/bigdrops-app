# Tenant-Isolation Fix Report (Including Item Library)

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Fix four confirmed leak surfaces without redesigning tenancy: settings cache, notifications, item library cache, PostgREST readiness.

## Scope

- Fixed: entity-keyed settings cache, scoped notifications, keyed item library cache, exposure readiness gate.
- Untouched: lifecycle, RLS policies, provisioning engine, tenant schemas, business data, UX tickets.

## Files Changed

- `src/lib/tenant/settingsCache.ts`: new keyed cache primitives.
- `src/hooks/useSettings.js`: uses keyed cache; fail-closed.
- `src/domain/notifications/notificationScope.ts`: new ownership boundary.
- `src/hooks/useNotifications.ts`: tenant existence filtering.
- `src/lib/cache/listCache.ts`: added `itemLibraryCacheKey`.
- `src/modules/item-library/hooks/useItemHistoryList.ts`: keyed cache, fail-closed.
- `src/modules/item-library/pages/ItemLibraryPage.tsx`: keyed optimistic writes.
- `src/domain/tenant/tenantCreation.ts`: exposure probe plus reporting trigger.
- `src/lib/tenant/contexts.tsx`: EntityProvider exposure gate.
- `supabase/migrations/20260905181312_tenant_schema_exposure_check.sql`: probe RPC.
- Tests: settings (5), notifications (6), item library keys (5), bootstrap (15).

## Skills Used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Settings entries live under tenant schema keys. Null key reads and writes nothing. Switching entities cannot show prior settings.
- Notifications with entity references show only when the record exists in the active tenant schema. Global rows pass. Unknown types hide.
- Item library cache is namespaced per schema. The retired global key is never read. Load failure keeps the active entity's rows only. Optimistic patches write the active key only.
- `is_tenant_schema_exposed` returns true only for workspace members with schema present and listed. Fail-closed.
- EntityProvider holds `schemaName` null until exposure confirms, with re-trigger plus retry. Trigger reports results with warnings.
- Migration applied to Main. Probe verified: exists, rejects bad shapes, fail-closes without auth.

## Verification Result

- `bun run typecheck`: passed.
- `bun run audit:load`: passed. One new bloat warning (`tenantCreation.ts`). Others pre-existing.
- Focused tests: 31 pass, 0 fail.
- Full suite pre-existing `multi-entity` failure unchanged.
- `git status`: only listed files changed. Other entries belong to other agents.
- `bun run build`: not executed. Docker not started.

## Risks and Limitations

- Exposure true-path needs an authenticated session. CLI probe covered fail-closed paths only.
- Legacy global notifications remain stored. They no longer render under foreign tenants.
- Orphaned global item library cache entries remain in browsers. Nothing reads them now.
- `purge-archived` cron references dropped public tables. Flagged, not changed.

## Deferred Work

- Pre-existing `multi-entity` test fix.
- Nightly cron cleanup.
- Safe-environment live provisioning test.
