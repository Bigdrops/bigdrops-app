# Phase 2.2 — Reporting Projection Layer

This report was written by OpenCode on 2026-07-04 via Local Runner.

## Objective & Scope

Introduce a repository + service projection layer for the Financial Reports module, centralizing all Supabase reads and removing self-loading logic from individual report section components. The existing report behaviour, data loading triggers, and metric computation are preserved.

## Evidence

### Files Created
- `src/modules/reports/repositories/reportRepository.ts` — 5 query functions: `fetchInvoiceFinancials`, `fetchProjectFinancials`, `fetchTaxInvoices`, `fetchPayments`, `fetchBankAccounts`
- `src/modules/reports/services/reportProjectionService.ts` — 4 projection functions: `loadReceivables`, `loadProjects`, `loadTaxInvoices`, `loadEnrichedCollections`, `loadOverviewData`

### Files Modified
- `src/pages/Reports.tsx` — Replaced 4 inline `supabase.from(...)` / `supabase.rpc(...)` loaders with calls to the projection service. Removed `import { supabase }` line. State variables renamed from `overviewReceivables`/`overviewProjects`/`overviewTaxInvoices` → `receivables`/`projects`/`taxInvoices` for consistency. Replaced `useCallback`/`useEffect`/`useRef` patterns with service calls wrapped in try/catch. All 5 sections now receive data via props.
- `src/components/reports/ProjectsSection.tsx` — Removed self-loading (`useCallback + useEffect + useRef + useState` with supabase query). Added `data`, `error`, `isLoading` props. Removed `supabase` import.
- `src/components/reports/ReceivablesSection.tsx` — Same pattern as ProjectsSection. Removed self-loading and supabase dependency.
- `src/components/reports/TaxSection.tsx` — Same pattern. Removed self-loading for tax invoices. Was already partially refactored (received `collections` as prop). Now also receives `data`, `isLoading`, `error`.

### Unchanged
- `CollectionsSection.tsx` — Already received data via props before this phase. Zero changes.
- `OverviewSection.tsx` — Already received `summary` via props. Zero changes.
- `reportUtils.ts` — Metric computation functions untouched.
- `reportTypes.ts` — Not modified.
- All existing business logic, calculations, and KPI definitions preserved.

### Verification
- `bun run typecheck` — Passes (0 errors)
- `bun run audit:load` — Only expected pre-existing warnings; our new `reportRepository.ts` uses `select('*')` on SQL views (acceptable as the views are pre-filtered projections)
- `git status` — Only the 5 expected files changed (4 modified + 1 new directory)
- Diff: 144 insertions, 294 deletions across all files (-150 lines net)

## Risks & Limitations

- The collections loading state for the tax tab combines both `taxLoading` and `collectionsLoading` with `||` — both must resolve before the UI shows loaded. This is fine for the current usage pattern (both queries are triggered simultaneously), but if one fails silently the loading spinner may persist until both complete.
- `reportRepository.ts` uses `select('*')` on SQL views. This is acceptable because the views are purpose-built projections (`invoice_financials_v`, `project_financials_v`), but if new fields are added to the underlying tables without updating the view, the repository will not surface them.

## Deferred Work

None intentionally deferred. All items from the audit were addressed.
