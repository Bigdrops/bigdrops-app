# KPI Data Model Audit Report

This report was written by Buffy on 2026-08-26 via Freebuff.

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

---

## 1. Executive Determination

The BIGDROPS dashboard KPI strip currently displays ₦0 across all cards with "No comparison period" for every trend. This audit establishes the root cause, audits the existing nine KPI fields, inventories all available financial data, and recommends four money-denominated KPIs for a future implementation.

**Key findings:**

1. The ₦0 problem is a tenant schema provisioning or scoping issue — not a calculation bug.
2. Of the nine current fields, at least five are conceptual duplicates or time-window variants of the same financial concept.
3. The codebase supports four genuinely distinct money-denominated KPIs.
4. Two of the four can support real trend comparisons. Two cannot without historical snapshots.
5. Segmented bars have real business meaning for all four recommended KPIs.

---

## 2. Exact Cause of the ₦0 Values

### 2.1 Execution Path Trace

For the `overdue` KPI (selected by default), the full path is:

```
DashboardRedesign.tsx
  → useDashboardData({ variant: 'overview' })
    → load() callback
      → tenantClient.from('invoice_financials_v').select('balance_due, cash_received, issue_date, due_date, computed_status')
      → invoiceFinancials = financialMetricsRes.data || []
      → overdue = invoiceFinancials.reduce((sum, row) => isPastDue(row) ? sum + Number(row.balance_due || 0) : sum, 0)
      → setKpiStats({ ...overdue, ... })
      → DashboardOverview receives kpiStats
        → buildKpiCards(kpiStats, loadStoredKpiCards())
          → buildCard(KPI_METRIC_REGISTRY['overdue'], stats)
            → formatNaira(stats.overdue, { round: true }) → "₦0"
```

### 2.2 Root Cause: Tenant Client Failure

The `tenantClient` is created in `EntityProvider` (src/lib/tenant/contexts.tsx):

```typescript
const schemaName = provisioningStatus === 'ready' ? expectedSchema : null
const tenantClient = useMemo(() => createTenantClient(supabase, schemaName), [schemaName])
```

If `provisioningStatus` is not `'ready'`, `schemaName` is `null`, and `tenantClient.isReady` is `false`. When `useDashboardData` calls `tenantClient.from('invoice_financials_v')`, it throws:

```typescript
// src/lib/tenantClient.ts line 17
throw new Error('Tenant schema is not available yet.')
```

The error is caught by the `catch` block in `useDashboardData.ts`:

```typescript
} catch (error) {
  console.error('Dashboard data load failed:', error)
}
```

This silently swallows the error. The stats remain at their default zero values. The dashboard renders with ₦0.

### 2.3 Contributing Factors

1. **No `isReady` guard in `useDashboardData`.** The hook calls `tenantClient.from(...)` without checking `tenantClient.isReady` first. Other modules (e.g., `reportRepository.ts`) accept `tenantClient` as a parameter and may check readiness before calling.

2. **Silent error swallowing.** The catch block logs to console but does not set any error state. The user sees ₦0 with no indication of failure.

3. **Race condition possibility.** `EntityProvider` resolves asynchronously. If the dashboard mounts before provisioning completes, `tenantClient.from()` throws.

4. **Possible empty tenant schema.** Even if `tenantClient` is ready, the tenant schema may have zero invoices. The query would return an empty array, and all aggregations would produce 0.

### 2.4 Definitive Confirmation Without Database Access

Without direct database access, definitive confirmation requires one of:
- Reading the console logs for the `Dashboard data load failed:` message
- Verifying `provisioningStatus === 'ready'` via the TenantDebug page (`/debug/tenant`)
- Confirming the tenant schema `entity_bigdrops-main_main` has invoice rows

The code evidence is conclusive: **the code path is correct, but the tenant schema may not be accessible or populated.** This is a provisioning/scoping issue, not a calculation bug.

### 2.5 Schema File Analysis

The `live-public-schema.sql` contains two `CREATE OR REPLACE VIEW` definitions for `invoice_financials_v`:
- **Line 2614**: A NULL-returning placeholder (all columns return NULL)
- **Line 4374**: The real implementation with actual aggregation logic

The schema file is applied sequentially. The second definition overwrites the first. However, the tenant schema is created by `_prov_install_financial_views()` (migration 20260815000000), which installs the correct view. The public schema placeholder is irrelevant to tenant queries.

### 2.6 Conclusion

The ₦0 problem is **not a dashboard calculation bug**. It is one of:
1. Tenant provisioning not in 'ready' state → `tenantClient` throws
2. Tenant schema has no invoice/payment data
3. A race condition where the dashboard loads before entity resolution completes

All three are provisioning/data-layer issues, not KPI calculation issues.

---

## 3. Current Nine-Field KPI Audit

### 3.1 `collections`

| Property | Value |
|----------|-------|
| Definition | Cash received this month across issued invoices |
| Source | `invoice_financials_v.cash_received` WHERE `issue_date >= startOfMonth` |
| Calculation | `SUM(p.cash_amount)` (from payments joined to invoices) |
| Primary unit | ₦ (naira) |
| Time window | Current calendar month |
| Money-denominated | YES |
| Duplicates | `thisMonthCollections` (identical by construction) |
| Subset of another concept | No — it is the MTD collections metric |
| KPI candidate | YES — but redundant with `thisMonthCollections` |

### 3.2 `thisMonthCollections`

| Property | Value |
|----------|-------|
| Definition | Cash received since the month began |
| Source | `invoice_financials_v.cash_received` WHERE `issue_date >= startOfMonth` |
| Calculation | `SUM(p.cash_amount)` filtered by issue_date |
| Primary unit | ₦ (naira) |
| Time window | Current calendar month |
| Money-denominated | YES |
| Duplicates | `collections` (identical) |
| KPI candidate | YES — preferred over `collections` (more precise name) |

### 3.3 `overdue`

| Property | Value |
|----------|-------|
| Definition | Sum of balance_due where due_date < today AND balance > 0 |
| Source | `invoice_financials_v.balance_due` + `due_date` |
| Calculation | `SUM(balance_due) WHERE due_date < today AND balance_due > 0` |
| Primary unit | ₦ (naira) |
| Time window | Point-in-time (current state) |
| Money-denominated | YES |
| Duplicates | `pastDue` (identical by construction) |
| Subset of another concept | Yes — subset of outstanding receivables |
| KPI candidate | YES — money at risk, distinct concept from total outstanding |

### 3.4 `pastDue`

| Property | Value |
|----------|-------|
| Definition | Same past-due balance as `overdue` |
| Source | Identical to `overdue` |
| Calculation | Identical to `overdue` |
| Primary unit | ₦ (naira) |
| Time window | Point-in-time |
| Money-denominated | YES |
| Duplicates | `overdue` (identical) |
| KPI candidate | NO — redundant alias |

### 3.5 `dueThisWeek`

| Property | Value |
|----------|-------|
| Definition | Outstanding balance falling due within the next 7 days |
| Source | `invoice_financials_v.balance_due` + `due_date` |
| Calculation | `SUM(balance_due) WHERE due_date BETWEEN now AND now+7d AND balance_due > 0` |
| Primary unit | ₦ (naira) |
| Time window | Forward-looking 7-day window |
| Money-denominated | YES |
| Duplicates | None — but conceptually a time-filtered subset of outstanding |
| Subset of another concept | Yes — subset of outstanding receivables |
| KPI candidate | MARGINAL — useful but not distinct enough from outstanding |

### 3.6 `awaitingPaymentCount`

| Property | Value |
|----------|-------|
| Definition | Count of invoices with balance_due > 0 |
| Source | `invoice_financials_v` rows WHERE `balance_due > 0` |
| Calculation | `COUNT(*) WHERE balance_due > 0` |
| Primary unit | Count (integer) |
| Time window | Point-in-time |
| Money-denominated | NO |
| Duplicates | None |
| Subset of another concept | No |
| KPI candidate | NO — count metric, not money-denominated |

### 3.7 `openWork`

| Property | Value |
|----------|-------|
| Definition | Invoices currently needing follow-up |
| Source | `invoice_financials_v` rows with balance > 0 AND (past due OR due within 7 days) |
| Calculation | `COUNT(*) WHERE (pastDue OR dueThisWeek)` |
| Primary unit | Count (integer) |
| Time window | Point-in-time |
| Money-denominated | NO |
| Duplicates | `pendingFollowUp` (identical by construction) |
| KPI candidate | NO — count metric, not money-denominated |

### 3.8 `pendingFollowUp`

| Property | Value |
|----------|-------|
| Definition | Invoices flagged for attention this week |
| Source | Same as `openWork` |
| Calculation | Same as `openWork` |
| Primary unit | Count (integer) |
| Time window | Point-in-time |
| Money-denominated | NO |
| Duplicates | `openWork` (identical) |
| KPI candidate | NO — count metric, not money-denominated |

### 3.9 `inTransitWaybills`

| Property | Value |
|----------|-------|
| Definition | Count of dispatched waybills not yet delivered |
| Source | `waybills` table WHERE `status = 'dispatched'` |
| Calculation | `COUNT(*) WHERE status = 'dispatched'` |
| Primary unit | Count (integer) |
| Time window | Point-in-time |
| Money-denominated | NO |
| Duplicates | None |
| Subset of another concept | No |
| KPI candidate | NO — operational count, not money-denominated |

---

## 4. Confirmed Duplicate/Alias Map

| Alias Pair | Relationship | Both Selectable? |
|------------|-------------|-----------------|
| `collections` ≡ `thisMonthCollections` | Exact duplicate (same calculation) | Yes — confusing |
| `overdue` ≡ `pastDue` | Exact duplicate (same calculation) | Yes — confusing |
| `openWork` ≡ `pendingFollowUp` | Exact duplicate (same calculation) | Yes — confusing |

**Summary:** 3 confirmed alias pairs. That leaves 6 unique concepts from 9 fields, and 3 of those are count-only metrics. Only 3 fields are money-denominated and distinct.

---

## 5. Financial Data Inventory

### 5.1 Available in `invoice_financials_v`

| Field | Source | Available Since | Notes |
|-------|--------|-----------------|-------|
| `total_gross` | `invoices.total` | Always | Invoice grand total (before payments) |
| `cash_received` | `SUM(payments.cash_amount)` | Always | Cash settled against invoice |
| `wht_received` | `SUM(payments.wht_amount)` | Always | WHT settled against invoice |
| `settled_total` | `cash_received + wht_received` | Always | Total settled |
| `balance_due` | `total_gross - settled_total` | Always | Remaining balance |
| `computed_status` | CASE logic | Always | Derived: paid/partial/overdue/unpaid |
| `issue_date` | `invoices.issue_date` | Always | Used for time-based filtering |
| `due_date` | `invoices.due_date` | Always | Used for overdue/due-soon logic |

### 5.2 Available in `project_financials_v`

| Field | Source | Notes |
|-------|--------|-------|
| `total_invoiced` | `SUM(invoices.total)` | Per-project invoiced value |
| `cash_collected` | `SUM(payments.cash_amount)` | Per-project cash collected |
| `wht_collected` | `SUM(payments.wht_amount)` | Per-project WHT collected |
| `total_collected` | `cash_collected + wht_collected` | Per-project total collected |
| `outstanding` | `total_invoiced - total_collected` | Per-project outstanding |
| `invoice_count` | `COUNT(DISTINCT invoices.id)` | Per-project invoice count |

### 5.3 Available via `useDashboardData` Aggregates

| Aggregate | Calculation | Source |
|-----------|-------------|--------|
| `prevMonthCollections` | SUM(cash_received) where issue_date in previous month | invoice_financials_v |
| `outstandingTotal` | SUM(balance_due) WHERE balance_due > 0 | invoice_financials_v |
| `dueLastWeekWindow` | SUM(balance_due) where due_date in past 7 days | invoice_financials_v |
| `totalFinancialRows` | COUNT(*) of invoice_financials_v | invoice_financials_v |
| `waybillsTotal` | COUNT(*) of waybills | waybills table |
| `waybillsDispatchedTotal` | COUNT(*) WHERE status='dispatched' | waybills table |

### 5.4 Available in `invoices` Table

| Field | Type | Notes |
|-------|------|-------|
| `subtotal` | numeric | Sum of line items |
| `vat` | numeric | VAT amount (computed total) |
| `wht` | numeric | WHT amount (computed total) |
| `discount` | numeric | Discount amount (computed total) |
| `workmanship` | numeric | Extra charge |
| `transportation` | numeric | Extra charge |
| `shipping` | numeric | Extra charge |
| `install_rate_total` | numeric | Install rate total |
| `total` | numeric | Grand total (what `total_gross` maps to) |

### 5.5 Available in `payments` Table

| Field | Type | Notes |
|-------|------|-------|
| `cash_amount` | numeric(14,2) | Cash payment amount |
| `wht_amount` | numeric(14,2) | WHT payment amount |
| `date` | date | Payment date |
| `method` | text | Payment method |
| `voided_at` | timestamp | Void marker |

### 5.6 Available in `quotations` Table

| Field | Type | Notes |
|-------|------|-------|
| `total` | numeric(14,2) | Quotation total |
| `status` | text | open/converted/accepted/rejected |
| `issue_date` | date | Creation date |

---

## 6. Distinct Business Concepts

After deduplication and removing aliases, the following distinct financial concepts exist in the codebase:

| # | Concept | Money? | Distinct? | Available? | Notes |
|---|---------|--------|-----------|------------|-------|
| 1 | Total invoiced value | YES | YES | YES | SUM(total_gross) from invoice_financials_v |
| 2 | Total collected (all-time) | YES | YES | YES | SUM(settled_total) from invoice_financials_v |
| 3 | MTD collections | YES | YES | YES | Already implemented as thisMonthCollections |
| 4 | Outstanding receivables | YES | YES | YES | Already implemented as outstandingTotal |
| 5 | Overdue receivables | YES | Subset of #4 | YES | Already implemented as overdue |
| 6 | Due this week | YES | Subset of #4 | YES | Already implemented as dueThisWeek |
| 7 | WHT received (all-time) | YES | Component of #2 | YES | SUM(wht_received) |
| 8 | VAT invoiced | YES | Component of #1 | YES | In invoices.vat but not in the view |
| 9 | Discounts issued | YES | Component of #1 | YES | In invoices.discount but not in the view |
| 10 | Total invoiced by project | YES | Breakdown of #1 | YES | project_financials_v.total_invoiced |
| 11 | Outstanding by project | YES | Breakdown of #4 | YES | project_financials_v.outstanding |

**Genuinely distinct money concepts:** 1, 2, 3, 4, 5, 6 (concepts 7-11 are components or breakdowns of 1-6).

---

## 7. Time-Window vs Concept Analysis

| Candidate | Same concept, different window? | Relationship |
|-----------|-------------------------------|--------------|
| MTD collections vs Total collected | NO — MTD is a time-slice of the total, but both are "money collected" | Same concept, different time window |
| Outstanding vs Due this week | YES — due-this-week is outstanding filtered to a 7-day window | Subset, not distinct |
| Outstanding vs Overdue | YES — overdue is outstanding filtered to past-due only | Subset, not distinct |
| Total invoiced vs MTD collections | NO — invoiced is "money billed", collected is "money received" | Genuinely different concepts |
| Outstanding vs Total invoiced | NO — invoiced is cumulative, outstanding is remaining | Genuinely different concepts |
| Overdue vs Due this week | YES — both are time-slices of outstanding | Same concept, different windows |

**Conclusion:**

- "Total invoiced" and "Total collected" are genuinely distinct concepts (billed vs received).
- "Outstanding receivables" is a third distinct concept (what's still owed).
- "Overdue" is a risk-weighted subset of outstanding (money at risk).
- "Due this week" is a time-slice of outstanding — NOT a distinct concept for a primary KPI.
- "MTD collections" is a time-slice of total collected — useful as the primary collection metric.

The strongest four should cover: billed, collected, outstanding, and at-risk.

---

## 8. Trend/Comparison Availability

| KPI | Comparison Period Available? | Source | Honest? |
|-----|------------------------------|--------|---------|
| Total invoiced (all-time) | Previous month's invoiced total | `invoice_financials_v` with issue_date filter | YES |
| MTD collections | Previous month's collections | `prevMonthCollections` aggregate (already computed) | YES |
| Outstanding receivables | Previous month's outstanding | Requires previous-month snapshot or re-aggregation | CONDITIONAL |
| Overdue receivables | Previous month's overdue | Requires previous-month snapshot or re-aggregation | CONDITIONAL |
| Due this week | Previous week's due amount | `dueLastWeekWindow` aggregate (already computed) | YES |

**Detailed assessment:**

- **MTD collections:** Strong comparison. Current month vs previous month. `computeKpiAggregates` already computes `prevMonthCollections`. Honest trend available.

- **Total invoiced:** Can compute previous month's invoiced total from the same `invoice_financials_v` result set by filtering `issue_date` to the previous month. Honest trend available.

- **Outstanding receivables:** The `outstandingTotal` is a current-state metric. To compare with a previous period, you would need either:
  - A historical snapshot (does not exist in the current data model)
  - A re-aggregation filtering by issue_date (but outstanding includes invoices from all time, so this would be misleading)
  
  **No honest comparison available without historical snapshots.** The current implementation correctly shows "No comparison period."

- **Overdue receivables:** Same issue as outstanding — point-in-time metric with no historical baseline. **No honest comparison available.**

- **Due this week:** Can compare to previous week's due amount via `dueLastWeekWindow`. Honest trend available.

**Rule for future UI:**
```
IF REAL COMPARISON DATA EXISTS:
    render the trend
IF NO REAL COMPARISON DATA EXISTS:
    omit the trend element entirely (no text, no "No comparison period")
```

---

## 9. Segmented-Bar Meaning Availability

| KPI | Bar Meaning | Numerator | Denominator | Real? |
|-----|-------------|-----------|-------------|-------|
| Total invoiced | Monthly invoiced value as share of cumulative invoiced | This month's invoiced | Total invoiced | YES |
| MTD collections | Current-month share of last two months' collections | This month's collections | This + last month's collections | YES |
| Outstanding receivables | Outstanding as share of total invoiced | Outstanding | Total invoiced | YES |
| Overdue receivables | Overdue as share of outstanding | Overdue | Outstanding | YES |
| Due this week | Due-soon as share of outstanding | Due this week | Outstanding | YES |

**Detailed bar definitions:**

- **Total invoiced bar:** "This month's invoiced value as share of cumulative invoiced." Numerator = SUM(total_gross) where issue_date in current month. Denominator = SUM(total_gross) all-time. Real financial relationship.

- **MTD collections bar:** Already implemented — "Current-month share of last two months' collections." Real relationship.

- **Outstanding bar:** "Outstanding balance as share of total invoiced." This shows what percentage of all billed money is still uncollected. Real financial relationship. Good health indicator.

- **Overdue bar:** Already implemented — "Overdue share of outstanding balance." Shows what fraction of outstanding is at risk. Real relationship.

- **Due this week bar:** Already implemented — "Share of outstanding balance due this week." Shows near-term collection pressure. Real relationship.

**All bars have defensible, real business meaning.** No arbitrary percentages needed.

---

## 10. Candidates to Retire or Demote

| Field | Status | Rationale |
|-------|--------|-----------|
| `collections` | **MERGE** into `thisMonthCollections` | Identical calculation. No reason to keep both. |
| `pastDue` | **MERGE** into `overdue` | Identical calculation. No reason to keep both. |
| `openWork` | **MERGE** into `pendingFollowUp` | Identical calculation. No reason to keep both. |
| `thisMonthCollections` | **KEEP AS KPI** | Strong money-denominated metric. Preferred over `collections`. |
| `overdue` | **KEEP AS KPI** | Strong money-denominated metric. Preferred over `pastDue`. |
| `dueThisWeek` | **DEMOTED** to secondary context or retired | Time-slice of outstanding. Not distinct enough for a primary card. |
| `awaitingPaymentCount` | **DEMOTED TO SECONDARY CONTEXT** | Count metric. Could appear as "X invoices" below a money KPI. |
| `pendingFollowUp` | **RETIRED** from KPI selection | Count metric. Internal operational concern. |
| `inTransitWaybills` | **RETIRED** from KPI selection | Operational count. Not financial. Waybill concerns belong in the waybill module. |

### Rationale for each

- **`collections` / `thisMonthCollections`:** Keep one, merge the other. `thisMonthCollections` has the more precise name.

- **`pastDue` / `overdue`:** Keep one, merge the other. `overdue` is the more standard business term.

- **`openWork` / `pendingFollowUp`:** Keep one, merge the other. Both are counts of the same set.

- **`dueThisWeek`:** Money-denominated, but conceptually a time-slice of outstanding receivables. If the dashboard has "Outstanding Receivables" as a primary KPI, "Due This Week" adds a forward-looking dimension. However, for a four-card strip, it competes with stronger concepts (total invoiced, total collected). Best used as secondary context on the outstanding card ("₦X due soon").

- **`awaitingPaymentCount`:** Useful as secondary context. Example: "₦89,000 outstanding · 6 invoices." Not strong enough for a primary slot.

- **`pendingFollowUp`:** Internal follow-up metric. Not client-facing. Not money-denominated. No primary KPI value.

- **`inTransitWaybills`:** Operational metric. Belongs in the waybill module, not the financial dashboard.

---

## 11. Recommended Four Money KPIs

### KPI 1: Total Invoiced

| Property | Value |
|----------|-------|
| KPI name | Total Invoiced |
| Primary value | `₦{sum(total_gross)}` |
| Business meaning | Total value of all invoices ever created — the cumulative billed amount |
| Exact source | `invoice_financials_v.total_gross` |
| Calculation | `SUM(total_gross) WHERE archived_at IS NULL` |
| Time basis | All-time cumulative |
| Why distinct | Represents money generated/billed — fundamentally different from collected or outstanding |
| Trend availability | YES — compare current month's invoiced vs previous month's invoiced |
| Bar availability | YES — this month's invoiced as share of cumulative invoiced |
| Secondary context | Invoice count: "X invoices" |
| Why it deserves a slot | Foundational metric. Shows business volume. Every other financial metric derives from invoices. |

### KPI 2: Collected This Month

| Property | Value |
|----------|-------|
| KPI name | Collected This Month |
| Primary value | `₦{sum(cash_received) WHERE issue_date >= startOfMonth}` |
| Business meaning | Cash received this month against invoices issued this month |
| Exact source | `invoice_financials_v.cash_received` |
| Calculation | `SUM(cash_received) WHERE issue_date >= startOfMonth` |
| Time basis | Current calendar month |
| Why distinct | Money actually received — different from money billed or money owed |
| Trend availability | YES — `prevMonthCollections` already computed. Compare MTD vs previous month. |
| Bar availability | YES — current month share of last two months' collections |
| Secondary context | Payment count: "X payments" |
| Why it deserves a slot | Primary collection metric. Shows money-in momentum. Has honest trend. |

### KPI 3: Outstanding Receivables

| Property | Value |
|----------|-------|
| KPI name | Outstanding Receivables |
| Primary value | `₦{sum(balance_due) WHERE balance_due > 0}` |
| Business meaning | Total money still owed by clients across all unpaid invoices |
| Exact source | `invoice_financials_v.balance_due` |
| Calculation | `SUM(balance_due) WHERE balance_due > 0` |
| Time basis | Point-in-time (current state) |
| Why distinct | Money owed — different from billed (cumulative) or collected (received) |
| Trend availability | NO — point-in-time metric, no historical snapshot exists |
| Bar availability | YES — outstanding as share of total invoiced (collection progress) |
| Secondary context | Invoice count: "X unpaid invoices" |
| Why it deserves a slot | Shows current exposure. Healthy businesses track this closely. The bar shows collection progress. |

### KPI 4: Overdue Balance

| Property | Value |
|----------|-------|
| KPI name | Overdue Balance |
| Primary value | `₦{sum(balance_due) WHERE due_date < today AND balance_due > 0}` |
| Business meaning | Money past its due date — receivables at risk of non-collection |
| Exact source | `invoice_financials_v.balance_due` + `due_date` |
| Calculation | `SUM(balance_due) WHERE due_date < today AND balance_due > 0` |
| Time basis | Point-in-time (current state) |
| Why distinct | Risk-weighted subset of outstanding — shows money at risk, not just money owed |
| Trend availability | NO — point-in-time metric, no historical snapshot exists |
| Bar availability | YES — overdue as share of outstanding (risk concentration) |
| Secondary context | Count: "X overdue invoices" |
| Why it deserves a slot | Primary risk metric. Shows how much outstanding is actually late. Critical for cash flow management. |

---

## 12. If Fewer Than Four Strong KPIs Exist

All four recommended KPIs are strongly supported by the existing data model:

1. **Total Invoiced** — `invoice_financials_v.total_gross` is available for every invoice row. Aggregation is straightforward.

2. **Collected This Month** — Already implemented and working (when tenant data is accessible). Has honest trend.

3. **Outstanding Receivables** — Already computed as `outstandingTotal` in `useDashboardData`. Real data.

4. **Overdue Balance** — Already computed as `overdue` in `useDashboardData`. Real data.

**All four are strong. No padding required.** The weakest is "Outstanding Receivables" because it lacks a trend comparison, but its bar (collection progress) and secondary context (invoice count) compensate.

If a fifth were needed in the future, "Due This Week" would be the strongest candidate (has honest trend, money-denominated), but it competes with "Overdue" for the "money at risk" dimension and is less critical for a four-card strip.

---

## 13. Data/Architecture Changes Required for Implementation

### 13.1 Fix the Provisioning Guard

The `useDashboardData` hook must check `tenantClient.isReady` before querying. Without this, the dashboard will always show zero when provisioning is not ready.

**File:** `src/hooks/useDashboardData.ts`
**Change:** Add guard at the start of `load()`:
```typescript
if (!tenantClient.isReady) {
  setLoading(false)
  return
}
```

### 13.2 Add Total Invoiced Aggregation

The current `useDashboardData` does not compute `SUM(total_gross)` across all invoice financial rows. This is needed for the "Total Invoiced" KPI.

**File:** `src/hooks/useDashboardData.ts`
**Change:** Add `totalInvoiced` to `KpiStats` type and compute it in the aggregation function:
```typescript
let totalInvoiced = 0
for (const row of invoiceFinancials) {
  totalInvoiced += Number(row.total_gross || 0)
}
```

### 13.3 Add Previous Month's Invoiced Total

For the "Total Invoiced" trend, compute last month's invoiced total from the same result set.

**File:** `src/hooks/useDashboardData.ts`
**Change:** In `computeKpiAggregates`, add:
```typescript
let prevMonthInvoiced = 0
if (hasIssueDate && issueDate >= prevMonthStart && issueDate < startOfMonth) {
  prevMonthInvoiced += Number(row.total_gross || 0)
}
```

### 13.4 Merge Duplicate Aliases

- Remove `collections` as a selectable metric (keep only `thisMonthCollections`)
- Remove `pastDue` as a selectable metric (keep only `overdue`)
- Remove `openWork` as a selectable metric (keep only `pendingFollowUp`)

**File:** `src/config/kpiCards.ts`
**Change:** Remove from `KpiMetricId` union and `KPI_METRIC_REGISTRY`.

### 13.5 Retire/Demote Non-Money Metrics

- Remove `inTransitWaybills` from `KpiMetricId` (operational, not financial)
- Remove `pendingFollowUp` from `KpiMetricId` (count-only, not primary KPI material)
- Keep `awaitingPaymentCount` as a possible secondary context value, but not as a primary KPI card

### 13.6 Add Error State for Provisioning Failure

The dashboard should show an informative message when the tenant schema is not available, not silent zeros.

**File:** `src/hooks/useDashboardData.ts`
**Change:** Add an error field to `UseDashboardDataResult` and set it when `tenantClient.isReady` is false.

### 13.7 Update KPI Registry

Update `KPI_METRIC_REGISTRY` to include:
- `totalInvoiced` (NEW — money-denominated, 'emerald' tone)
- `outstandingReceivables` (RENAME from `outstandingTotal` — already computed)

And update default selection to the four recommended KPIs.

---

## 14. Product Decisions Required

Before implementation, the user must decide:

1. **Confirm the four KPIs.** The recommendation is: Total Invoiced, Collected This Month, Outstanding Receivables, Overdue Balance. If a different set is preferred, specify which.

2. **Secondary context policy.** Should KPI cards show secondary context (e.g., "6 invoices" below the money value)? If yes, which metrics?

3. **Trend omission policy.** When no comparison data exists, should the trend element be completely hidden, or should a subtle "—" be shown? The recommendation is complete omission.

4. **Bar omission policy.** Should bars always be shown, or omitted when the ratio is not meaningful? All four recommended KPIs have meaningful bars, so this is a future concern.

5. **"No comparison period" copy.** If the decision is to keep showing something, what should the fallback text be? The recommendation is complete omission of the trend element.

6. **Settings picker.** Should users be able to swap KPI cards, or should the four be fixed? If swappable, which metrics should be available in the picker?

7. **Provisioning error handling.** Should the dashboard show a provisioning-not-ready message, a retry button, or silently show zeros?

---

## 15. Files/Tables/Views Inspected

### Source Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Project guardrails |
| `docs/PROJECTSKILLINDEX.md` | Skills registry |
| `src/hooks/useDashboardData.ts` | Dashboard data hook — query logic, aggregation |
| `src/config/kpiCards.ts` | KPI metric registry, selection, view-model builder |
| `src/components/dashboard/KpiGrid.tsx` | KPI card renderer |
| `src/pages/DashboardRedesign.tsx` | Dashboard page — wires data to grid |
| `src/components/dashboard/DashboardOverview.tsx` | Dashboard layout — renders KPI section |
| `src/lib/cache/dashboardCache.ts` | Dashboard cache contract |
| `src/lib/tenantClient.ts` | Tenant client factory — schema routing |
| `src/lib/tenant/contexts.tsx` | EntityProvider — tenant resolution |
| `src/lib/Calculations.ts` | Financial calculation engine |
| `src/modules/reports/repositories/reportRepository.ts` | Report data access |
| `src/modules/reports/services/reportProjectionService.ts` | Report projection layer |
| `src/pages/Reports.tsx` | Reports page — data loading |

### Database Objects

| Object | Type | Purpose |
|--------|------|---------|
| `invoice_financials_v` | View | Invoice-level financial aggregation |
| `project_financials_v` | View | Project-level financial aggregation |
| `invoices` | Table | Invoice records |
| `payments` | Table | Payment records |
| `waybills` | Table | Waybill records |
| `quotations` | Table | Quotation records |

### Migrations

| Migration | Purpose |
|-----------|---------|
| `20260520090010_views.sql` | Initial view definitions |
| `20260811000000_projects_aggregate_data_migration.sql` | Project financials in tenant schema |
| `20260815000000_plan_a_template_and_financial_view_drift.sql` | Financial view installer (adds project_financials_v) |

### Reference Documents

| Document | Purpose |
|----------|---------|
| `docs/Reports/Ui-Ux/dashboard-kpi-cards-implementation-report.md` | Previous KPI implementation report |
| `docs/tickets/view-invoice-csr-issues.md` | Known view issues |
| `docs/Reports/multi-tenancy/live-reconciliation-audit.md` | Tenant scoping audit |

---

## 16. Confirmation of Zero Code Changes

**Before audit:** `git status` showed 4 modified files (from previous session):
- `src/components/pdf-new/industryAdapter.ts`
- `src/lib/cache/listCache.ts`
- `src/pages/AddClient.tsx`
- `src/pages/Clients.tsx`

And 2 untracked items:
- `.commandcode/`
- `docs/Reports/GENERAL/2026-08-26-client-list-entity-scoped-cache-fix.md`

**After audit:** This report is the only new file. No application code, configuration, database migration, or KPI UI was modified.

**Verification:**
- No `bun run typecheck` needed (no code changes)
- No `bun run build` needed (no code changes)
- Git status: only the new report file is expected to appear

---

## Implementation Handoff

### 1. Root Cause of ₦0 Issue

The `useDashboardData` hook calls `tenantClient.from('invoice_financials_v')` without checking `tenantClient.isReady`. If the entity provisioning status is not `'ready'`, the `tenantClient.from()` method throws `'Tenant schema is not available yet.'`. The error is caught silently, and all stats remain at their default zero values. The dashboard renders ₦0 across all cards.

**Fix required:** Add `tenantClient.isReady` guard in `useDashboardData.load()`. Optionally add error state to inform the user.

### 2. Final Distinct Financial Concepts

| # | Concept | Money? | Source |
|---|---------|--------|--------|
| 1 | Total invoiced (all-time) | YES | `invoice_financials_v.total_gross` |
| 2 | Collected this month | YES | `invoice_financials_v.cash_received` filtered by issue_date |
| 3 | Outstanding receivables | YES | `invoice_financials_v.balance_due` WHERE > 0 |
| 4 | Overdue receivables | YES | `invoice_financials_v.balance_due` WHERE due_date < today AND > 0 |
| 5 | Due this week | YES | `invoice_financials_v.balance_due` WHERE due_date in 7d window |
| 6 | WHT received (all-time) | YES | `invoice_financials_v.wht_received` |
| 7 | Total collected (all-time) | YES | `invoice_financials_v.settled_total` |

### 3. Concepts to Retire

| Concept | Action |
|---------|--------|
| `collections` | MERGE into `thisMonthCollections` |
| `pastDue` | MERGE into `overdue` |
| `openWork` | MERGE into `pendingFollowUp` |
| `pendingFollowUp` | RETIRE from KPI selection |
| `inTransitWaybills` | RETIRE from KPI selection |

### 4. Concepts to Merge

- `collections` → `thisMonthCollections`
- `pastDue` → `overdue`
- `openWork` → `pendingFollowUp` (if kept at all)

### 5. Strongest Recommended KPI Set

1. **Total Invoiced** — Money billed/generated. Foundational.
2. **Collected This Month** — Money received. Has honest trend.
3. **Outstanding Receivables** — Money owed. Shows exposure.
4. **Overdue Balance** — Money at risk. Shows urgency.

### 6. Missing Fourth KPI

Not applicable. All four recommended KPIs are strongly supported.

### 7. Which Trends Can Be Real

| KPI | Trend? | Source |
|-----|--------|--------|
| Total Invoiced | YES | Current month invoiced vs previous month invoiced |
| Collected This Month | YES | `prevMonthCollections` already computed |
| Outstanding Receivables | NO | Point-in-time, no historical snapshot |
| Overdue Balance | NO | Point-in-time, no historical snapshot |

### 8. Which Bars Can Have Real Business Meaning

| KPI | Bar | Numerator / Denominator |
|-----|-----|------------------------|
| Total Invoiced | Monthly share | This month invoiced / Cumulative invoiced |
| Collected This Month | Trailing two-month share | This month / (this + last month) |
| Outstanding Receivables | Collection progress | Outstanding / Total invoiced |
| Overdue Balance | Risk concentration | Overdue / Outstanding |

All four bars have defensible, real financial relationships.

### 9. Code/Data-Layer Work Required

1. Fix `tenantClient.isReady` guard in `useDashboardData`
2. Add `totalInvoiced` and `prevMonthInvoiced` to `KpiStats` and aggregation
3. Merge duplicate aliases in `kpiCards.ts`
4. Retire non-money metrics from `KpiMetricId`
5. Update default KPI selection to the four recommended metrics
6. Add error state for provisioning failure
7. Update KPI registry with new metrics

### 10. Decisions Required from User

1. Confirm the four recommended KPIs
2. Secondary context policy (show counts below money values?)
3. Trend omission policy (hide completely vs subtle placeholder)
4. Bar omission policy (always show vs omit when meaningless)
5. Settings picker: swappable or fixed four?
6. Provisioning error UX (message, retry, or silent zeros)
