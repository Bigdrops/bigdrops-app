# Dashboard Recent Activity Cache Fix

This report was written by opencode on 2026-08-14 via Local Runner.

## Objective

Fix the dashboard so "Recent Activity" shows documents that were just created instead of the old snapshot.

## Scope

- `src/hooks/useDashboardData.ts`

## Files changed

- `src/hooks/useDashboardData.ts`

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

The dashboard load flow used a cached snapshot. The cache had a two-minute TTL. When the cache was fresh, the hook returned the cached data. It did not fetch new data. A user who created a document and then opened the dashboard within two minutes saw the old snapshot.

The fix removes the fresh-cache early return. The dashboard now always fetches fresh data on mount. The cache still provides instant paint of the last snapshot. This prevents a blank loading screen.

Changes:

- Removed `isDashboardCacheFresh` from the imports.
- Removed `DASHBOARD_CACHE_TTL`.
- Removed the early return that skipped the fetch when the cache was fresh.

## Verification

- `bun run audit:load`: passed (all warnings are pre-existing)
- `bun run typecheck`: passed
- `git status`: only `src/hooks/useDashboardData.ts` modified

## Risks or limitations

The dashboard always fetches data on mount. The cache no longer skips a fetch within the two-minute window. This means one extra data fetch when a user reopens the dashboard quickly. The instant-paint benefit remains.

## Deferred work

None.
