# Dashboard Financial Metrics Tenant View Report

This report was written by opencode on 2026-08-14 via Local Runner.

## Objective

Replace the non-existent database RPC `get_dashboard_financial_metrics` in the dashboard overview variant. The RPC caused the "Dashboard unavailable" toast on load.

## Scope

- `src/hooks/useDashboardData.ts`

## Files changed

- `src/hooks/useDashboardData.ts`

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

- Removed the `supabase.rpc('get_dashboard_financial_metrics', ...)` call in the overview variant.
- Replaced it with a direct `tenantClient` query on `invoice_financials_v`.
- Computed the metrics locally from the returned rows.
- The local computation mirrors the classic variant logic.
- Computed values:
  - `overdue`
  - `dueThisWeek`
  - `thisMonthCollections`
  - `pendingFollowUp`
  - `awaitingPaymentCount`
  - `hasPastDue`
- Removed the unused `DashboardFinancialMetrics` type.
- Removed the unused `toNumber` helper.
- Removed the unused ISO date constants.

## Verification

- bun run audit:load: passed
- bun run typecheck: passed
- git status: modified files present as expected
- bun run build: skipped due to hardware policy

## Risks or limitations

- The metrics are now computed on the client. This is acceptable for the current invoice volume.
- The `invoice_financials_v` view result is trusted as the financial source.
- The async `listBoqs()` call is unawaited in the overview variant. This was pre-existing and not changed.

## Deferred work

- The full dashboard redesign may move aggregation to the database layer.
- Revisit client-side computation if dashboard invoice volume grows.