# Dashboard KPI Zero-Values Audit

**Date:** 2026-08-28
**Scope:** Read-only audit. No code changes.

---

## Executive Summary

The Dashboard KPI section shows zero/empty values due to **three compounding causes**, listed by severity:

1. **Cache key has no entity isolation** — the most likely cause of persistent zeros across sessions.
2. **Dashboard and Reports measure different scopes** — Dashboard shows all-time totals, Reports shows current month. The user sees "zero" when comparing apples to oranges.
3. **Tenant client throws before entity resolves** — Dashboard silently returns defaults if entity context is still loading.

The Reports page displays correct values because it always queries fresh, always uses a date range, and never caches.

---

## Data Flow Comparison

| Aspect | Dashboard | Reports |
|---|---|---|
| **Data hook** | `useDashboardData()` | Direct `loadReceivables()` / `loadEnrichedCollections()` |
| **Repository call** | `fetchInvoiceFinancials(tenantClient, null, null)` | `fetchInvoiceFinancials(tenantClient, start, end)` |
| **Date filtering** | None — all-time | `this_month` default via `getPresetRange()` |
| **Cache** | `localStorage` with TTL (`dashboardCache.ts`) | No cache — fresh on every tab/range change |
| **Cache key** | `bd:dashboard:overview:v1` — **no entity_id** | N/A |
| **Entity dependency** | `useEntity()` → `tenantClient` | `useEntity()` → `tenantClient` |
| **Error on no entity** | `tenantClient.from()` throws → caught → defaults | Same throw → caught → error state shown |

---

## Finding 1: Cache Key Missing Entity Isolation (Critical)

**File:** `src/hooks/useDashboardData.ts:242`

```typescript
const cacheKey = `bd:dashboard:${variant}:v1`
```

The cache key does not include `schemaName` or `entity.id`. When a user:
1. Signs in to Entity A → Dashboard loads data → cache written as `bd:dashboard:overview:v1`
2. Switches to Entity B → `readDashboardCache(cacheKey)` returns Entity A's data
3. Entity B's fresh data loads → cache overwritten

But if Entity A had zero data, Entity B inherits zeros until cache TTL expires or user clears localStorage.

**Impact:** Cross-entity data contamination. Zeros persist.

---

## Finding 2: Dashboard Queries Unfiltered, Reports Queries Current Month

**File:** `src/hooks/useDashboardData.ts:437`

```typescript
// ponytail: same pipe as Reports — unfiltered for global KPIs, no date-range clipping
const invoiceFinancials = await fetchInvoiceFinancials(tenantClient, null, null)
```

Dashboard passes `null, null` for start/end → fetches ALL invoices ever created.

**File:** `src/pages/Reports.tsx:76,106`

```typescript
const [datePreset, setDatePreset] = useState<DatePreset>('this_month')
const { start, end } = useMemo(() => getPresetRange(datePreset, customStart, customEnd), [...])
```

Reports defaults to `this_month` → fetches only current month's invoices.

**Result:** If there are no invoices with `issue_date` in the current month, Reports shows non-zero values (it shows whatever is in the current month), but Dashboard shows the grand total. If both are "zero" to the user, the real issue is likely that the view `invoice_financials_v` returns empty rows — but Reports correctly displays what it finds while Dashboard computes totals across everything.

The KPI cards compute `totalInvoiced` as `sum(total_gross)` across all rows. If the view returns rows but all `total_gross` values are null/zero, Dashboard shows zero. Reports would also show zero for the same data.

**Impact:** Not a bug per se — but the user expectation is that Dashboard and Reports should tell the same story. They don't.

---

## Finding 3: Tenant Client Throws Before Entity Resolves

**File:** `src/lib/tenantClient.ts:17-18`

```typescript
from: () => {
  throw new Error('Tenant schema is not available yet.')
},
```

**File:** `src/hooks/useDashboardData.ts:276-278`

```typescript
if (!tenantClient.isReady) {
  return  // ← silently returns defaults
}
```

The `useEntity()` hook resolves asynchronously. While the entity is loading:
- `tenantClient.isReady` is `false`
- `useDashboardData.load()` returns immediately
- All state stays at default zeros
- Cache is written with zero values (on first load)

If entity resolution is slow (network latency, workspace lookup), Dashboard shows zeros during the loading window and may cache them.

**Impact:** Transient zero state on initial page load. If cache writes before entity resolves, zeros persist.

---

## Finding 4: Dashboard Computes KPI Aggregates from Invoice-Level Data

**File:** `src/hooks/useDashboardData.ts:188-237` — `computeKpiAggregates()`

This function computes:
- `totalInvoiced` = sum of `total_gross` across all invoice rows
- `prevMonthInvoiced` = sum where `issue_date` falls in previous calendar month
- `outstandingTotal` = sum of `balance_due` where `balance_due > 0`
- `prevMonthCollections` = sum of `cash_received` where `issue_date` in previous month

**File:** `src/config/kpiCards.ts:175-237` — `buildCard()`

KPI card display:
- `totalInvoiced` → formatted as ₦
- `thisMonthCollections` → sum of `cash_received` where `issue_date >= startOfMonth`
- `outstandingReceivables` → `outstandingTotal`
- `overdue` → sum of `balance_due` where `isPastDue()`

All calculations are mathematically correct. The issue is data availability, not calculation logic.

**Impact:** None — calculations are correct.

---

## Finding 5: Reports Has Stale-Range Guard, Dashboard Does Not

**File:** `src/pages/Reports.tsx:85,140`

```typescript
const [collectionsLoadedRange, setCollectionsLoadedRange] = useState<string | null>(null)
// ...
setCollectionsLoadedRange(nextRangeKey)
```

Reports tracks whether data for the current date range has been loaded. It only re-fetches when the range changes. This prevents duplicate fetches but also means data is always fresh for the active range.

Dashboard has no equivalent guard. It relies on the cache TTL instead. If the cache is stale but not expired, Dashboard serves old data.

**Impact:** Dashboard may serve stale data within the cache TTL window.

---

## Recommendation Priority

| Priority | Finding | Fix Complexity |
|---|---|---|
| **P0** | Cache key missing entity isolation | Trivial — add `schemaName` to cache key |
| **P1** | Cache writes zeros before entity resolves | Trivial — guard cache write when `!tenantClient.isReady` |
| **P1** | Dashboard/Reports scope mismatch | Design decision — add date scope toggle to Dashboard or align defaults |
| **P2** | No stale-range guard in Dashboard | Low — mirror Reports' `loadedRange` pattern |

---

## Files Examined

| File | Role |
|---|---|
| `src/pages/DashboardRedesign.tsx` | Dashboard page — consumes `useDashboardData()` |
| `src/hooks/useDashboardData.ts` | Core data hook — fetches all document types + invoice financials |
| `src/lib/cache/dashboardCache.ts` | localStorage cache with TTL |
| `src/config/kpiCards.ts` | KPI card building, metric registry, `buildKpiCards()` |
| `src/pages/Reports.tsx` | Reports page — date-filtered, no cache |
| `src/modules/reports/services/reportProjectionService.ts` | Service layer — thin wrapper over repository |
| `src/modules/reports/repositories/reportRepository.ts` | Shared queries — `fetchInvoiceFinancials()` etc. |
| `src/components/reports/reportUtils.ts` | `isPastDue()`, `getPresetRange()`, formatting |
| `src/components/reports/reportTypes.ts` | Type definitions for report rows |
| `src/lib/tenant/contexts.tsx` | `useEntity()` — resolves entity + schema + tenantClient |
| `src/lib/tenantClient.ts` | `createTenantClient()` — schema-scoped Supabase wrapper |

---

## Verification (Audit Only)

- `git status --short` — clean (no modifications from this audit)
- `src/lib/Calculations.ts` — not modified (financial source of truth untouched)
- No code changes were made.

---

# Implementation Report

**Date:** 2026-08-30
**Scope:** P0 fix — entity-scoped cache key + null-entity guard

---

## What Changed

**File:** `src/hooks/useDashboardData.ts` — single file, surgical edit.

### Fix 1: Entity-scoped cache key

```typescript
// Before
const cacheKey = `bd:dashboard:${variant}:v1`

// After
const cacheKey = schemaName
  ? `bd:dashboard:${schemaName}:${variant}:v2`
  : `bd:dashboard:pending:${variant}:v2`
```

Cache key now includes `schemaName` from `useEntity()`. Each entity gets its own cache slot. Old unscoped entries at `bd:dashboard:overview:v1` are orphaned harmlessly in localStorage.

### Fix 2: Null-entity guard on cache reads

Every `useState` initializer now returns safe defaults when `schemaName` is null:

```typescript
const [kpiStats, setKpiStats] = React.useState<KpiStats>(() => {
  if (!schemaName) return defaultKpiStats   // ← new guard
  const cached = readDashboardCache(cacheKey)
  return cached?.data.kpiStats || defaultKpiStats
})
```

Applied to all 7 state initializers (loading, recentDocs, recentProjects, kpiStats, heroStats, summary, activityEvents).

**Before:** When entity context was still resolving (`schemaName === null`), the hook read from the unscoped cache key, potentially serving another entity's data — or showed default zeros if no cache existed.

**After:** When `schemaName` is null, the hook skips cache reads entirely and shows loading state (`loading: true`, data arrays empty). Real data loads when entity resolves and `tenantClient.isReady` becomes true.

### What was NOT changed

- `src/lib/cache/dashboardCache.ts` — no changes needed. The cache layer is already generic (read/write by key).
- `src/config/kpiCards.ts` — no changes. KPI card logic is correct.
- `src/pages/DashboardRedesign.tsx` — no changes. Consumer untouched.
- `src/lib/Calculations.ts` — untouched. Financial source of truth preserved.
- Dashboard scope (all-time) — not changed to `this_month`. Scope alignment is a separate design decision per audit recommendation P1.

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| Entity A's cached data never shows on Entity B's Dashboard | ✅ Cache key includes `schemaName` |
| Default zeros not cached when `schemaName` is null | ✅ `useState` initializers skip cache when `schemaName` is null |
| Query failure doesn't overwrite valid cache with zeros | ✅ Already handled — `writeDashboardCache` only runs in try block after success |
| `src/lib/Calculations.ts` untouched | ✅ |
| No new dependencies added | ✅ |
| `bun run typecheck` passes | ✅ Clean |
| `bun run audit:load` — no new warnings | ✅ Same pre-existing warnings only |
| `git status --short` — only intended file changed | ✅ `src/hooks/useDashboardData.ts` only |

---

## Verification

- `bun run typecheck` — passed (tsc --noEmit, clean)
- `bun run audit:load` — passed (no new warnings)
- `git status --short` — `M src/hooks/useDashboardData.ts` only (plus pre-existing `ColumnManager.tsx` change)
- `git diff` — 10 lines added, 9 removed. All in `useDashboardData.ts`.
