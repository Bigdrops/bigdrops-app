# Dashboard KPI vs Reports Data-Path Audit Report

This report was written by Claude on 2026-08-30 via Local Runner.

---

## Objective

Investigate why Dashboard KPI values show zero/empty while Reports.tsx displays correct financial data. Produce a read-only audit comparing the complete data flow of both paths.

---

## Executive Summary

**Dashboard and Reports share the same underlying data source** (`invoice_financials_v` view via `fetchInvoiceFinancials()`), but diverge on **date range filtering**. The Dashboard queries **unfiltered (lifetime)** while Reports defaults to **`this_month`**. This is by design — the Dashboard shows global KPIs. If KPIs display zero, the root cause is NOT a different data source. The likely causes are: (1) stale localStorage cache from before the `KpiStats` type gained new fields, or (2) the tenant client not being ready at mount time.

---

## Scope

- Dashboard KPI data flow (end-to-end)
- Reports.tsx data flow (end-to-end)
- Data source, tenancy, date ranges, caching, aggregation, type safety

---

## Files Changed (Read-Only Audit)

| File | Role |
|------|------|
| `src/pages/DashboardRedesign.tsx` | Dashboard page wrapper |
| `src/components/dashboard/DashboardOverview.tsx` | Dashboard shell |
| `src/components/dashboard/KpiGrid.tsx` | KPI card grid (rendering) |
| `src/hooks/useDashboardData.ts` | Dashboard data hook (fetch + aggregation) |
| `src/config/kpiCards.ts` | KPI card view model builder |
| `src/lib/cache/dashboardCache.ts` | Dashboard localStorage cache |
| `src/pages/Reports.tsx` | Reports page (fetch + aggregation) |
| `src/modules/reports/services/reportProjectionService.ts` | Reports service layer |
| `src/modules/reports/repositories/reportRepository.ts` | Reports data access |
| `src/components/reports/reportTypes.ts` | Shared type definitions |
| `src/components/reports/reportUtils.ts` | Shared utilities (`isPastDue`, `safeDate`, `formatMoney`) |
| `src/lib/tenantClient.ts` | Tenant schema routing |

---

## Data Flow Comparison

### Dashboard KPI Path

```
DashboardRedesign.tsx
  → useDashboardData()
    → tenantClient.from('invoice_financials_v').select('*')  [NO date filter]
    → computeKpiAggregates(invoiceFinancials, now, startOfMonth)
      → computes: totalInvoiced, prevMonthInvoiced, outstandingTotal, prevMonthCollections, dueLastWeekWindow
    → additional inline aggregation: overdue, thisMonthCollections, dueThisWeek, pendingFollowUp
    → writeDashboardCache(cacheKey, ...)  [localStorage]
  → buildKpiCards(kpiStats, loadStoredKpiCards())
    → formatNaira() for display
  → KpiGrid → KpiCard
```

### Reports.tsx Path

```
Reports.tsx
  → loadReceivables(tenantClient, startDate, endDate)
    → fetchInvoiceFinancials(tenantClient, start, end)
      → tenantClient.from('invoice_financials_v').select('*')  [WITH issue_date filter]
  → overviewSummary useMemo
    → computeReportTaxMetrics(filteredTaxInvoices, filteredCollections)
    → inline: totalExposure, pastDueAmount, collectedAmount, taxPosition
  → OverviewSection
```

---

## Key Findings

### 1. Date Range Filtering — THE PRIMARY DIFFERENCE

| Aspect | Dashboard | Reports |
|--------|-----------|---------|
| Query | `fetchInvoiceFinancials(tenantClient, null, null)` | `fetchInvoiceFinancials(tenantClient, startDate, endDate)` |
| Filter | **None** — all rows from `invoice_financials_v` | `issue_date >= start AND issue_date <= end` |
| Default scope | Lifetime / all-time | `this_month` (current calendar month) |

**Impact**: Dashboard shows cumulative lifetime KPIs. Reports shows current-month filtered KPIs. These are intentionally different views. If the user expects them to match, the Reports default date preset or the Dashboard aggregation window must be reconciled.

### 2. Shared Data Source — Confirmed

Both paths call `fetchInvoiceFinancials()` from `reportRepository.ts:18-24`, which queries `invoice_financials_v` via the tenant client. The data source is identical.

### 3. Tenancy — Identical

Both use `useEntity()` → `tenantClient` → `client.schema(schemaName).from(table)`. All queries are scoped to the tenant schema. No divergence.

### 4. Caching — Dashboard Uses Stale localStorage

| Aspect | Dashboard | Reports |
|--------|-----------|---------|
| Mechanism | `localStorage` key `bd:dashboard:overview:v1` | React Query (in-memory) + component state |
| TTL | **None** — persists until manual clear | Re-fetches on range change |
| Staleness risk | **HIGH** — old cache may lack new fields (`totalInvoiced`, `prevMonthInvoiced`) | Low — fresh fetch per range |

**Root cause of zero KPIs**: If the localStorage cache was written before `KpiStats` gained `totalInvoiced` and `prevMonthInvoiced` fields, `cached?.data.kpiStats` returns the old shape. `Number(undefined ?? 0)` → `0`. The Dashboard renders zeros until the cache is invalidated or overwritten.

### 5. Aggregation Logic — Correct but Divergent by Design

Dashboard computes from the full unfiltered result set:
- `totalInvoiced`: sum of all `total_gross` values (lifetime)
- `thisMonthCollections`: sum of `cash_received` where `issue_date >= startOfMonth` (current month only)
- `outstandingTotal`: sum of all `balance_due > 0` rows (lifetime)
- `overdue`: sum of `balance_due` where `isPastDue(due_date, balance_due)` (lifetime past-due)
- `prevMonthCollections`: sum of `cash_received` where `issue_date` falls in previous month
- `prevMonthInvoiced`: sum of `total_gross` where `issue_date` falls in previous month

Reports computes from date-filtered result set:
- `totalExposure`: sum of `balance_due` for outstanding invoices (filtered by date range)
- `pastDueAmount`: sum of `balance_due` where past due (filtered by date range)
- `collectedAmount`: sum of `cash_amount` from payments (filtered by date range)
- `taxPosition`: computed from tax invoices + payments (filtered by date range)

### 6. Type Safety Gap — `total_gross`

`useDashboardData.ts:205` accesses `row.total_gross`, but `InvoiceFinancialRow` in `reportTypes.ts` does not declare this field. The field exists in the database view `invoice_financials_v` but is untyped in the TypeScript interface. This works at runtime but loses type safety.

### 7. Utility Function Sharing — Correct

Both paths use the same `isPastDue` from `reportUtils.ts:71-80`. The Dashboard imports it directly. No divergence in past-due calculation logic.

---

## Root Cause Ranking

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| **P0** | Stale localStorage cache from before `KpiStats` gained `totalInvoiced`/`prevMonthInvoiced` | Dashboard shows zero KPIs | Bump cache version from `v1` → `v2` in `dashboardCache.ts`, or add `version: 2` check in `readDashboardCache` |
| **P1** | Dashboard fetches unfiltered lifetime data; Reports defaults to `this_month` | Values intentionally differ; users may perceive as "wrong" | Document the intentional difference, or add date-range picker to Dashboard |
| **P2** | `total_gross` not in `InvoiceFinancialRow` type | Type safety gap | Add `total_gross?: number \| null` to `InvoiceFinancialRow` |
| **P3** | No TTL on Dashboard cache | Stale data persists indefinitely | Add `isDashboardCacheFresh(entry, 300_000)` check (5 min TTL) |

---

## Canonical Source Recommendation

**The Dashboard KPIs and Reports Overview serve different purposes and should NOT be merged into one source.** The Dashboard shows global lifetime KPIs for at-a-glance health. Reports shows date-filtered financials for analysis. Both are correct in their respective contexts.

The one fix that resolves the "zero KPIs" symptom is **invalidating stale localStorage cache** (P0 above).

---

## Verification Plan

1. Run `bun run audit:load` — confirm no new warnings
2. Run `bun run typecheck` — confirm no type errors
3. Manually clear localStorage key `bd:dashboard:overview:v1` in browser DevTools
4. Refresh Dashboard — confirm KPIs populate with correct values
5. Compare Dashboard "Collected This Month" with Reports Overview "collectedAmount" — both should reflect current month's collections
6. Verify Dashboard "Total Invoiced" is a lifetime sum (larger than Reports' current-month figure)

---

## Risks and Limitations

- This is a read-only audit. No code was changed.
- The `invoice_financials_v` view schema is not audited (requires database access).
- RLS policies on `invoice_financials_v` are not verified (requires database access).
- The localStorage cache version bump (P0 fix) was not implemented — flagged for the next implementation pass.

---

## Deferred Work

- Implement P0 fix: bump cache version or add staleness check
- Add `total_gross` to `InvoiceFinancialRow` type (P2)
- Consider adding a 5-minute TTL to Dashboard cache (P3)
- Consider adding date-range picker to Dashboard for parity with Reports
