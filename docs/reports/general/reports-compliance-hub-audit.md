# Architectural Audit — Reports & Compliance Hub

This report was written by OpenCode on 2026-07-27 via Local Runner.

---

## 1. Objective and Scope

### Objective

Audit the existing Reports and Compliance Hub infrastructure in BIGDROPS. Identify the current architecture, component inventory, data flow, and gaps.

### Scope

- Financial reports page at `/reports`
- Compliance Hub page at `/compliance`
- Supporting services, repositories, types, and utilities
- PDF/CSV/JSON export infrastructure
- Routing and navigation registration
- The Statement of Account feature was treated as the first framing consumer during the audit

### Excluded

- Individual document modules (invoices, quotations, waybills, BOQ, RFQ, CSR, receipts)
- The PDF rendering templates for invoices, quotations, etc.
- The authentication/session layer (only permission patterns were checked)
- Mobile-specific code paths

---

## 2. Current Architecture

### 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      /reports (page)                        │
│  src/pages/Reports.tsx                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ReportsShell                                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │   │
│  │  │ReportsNav│ │ReportsHdr│ │ReportsFilterBar   │    │   │
│  │  │(5 tabs)  │ │onExport= │ │(date,client,search)│    │   │
│  │  │          │ │()=>{}    │ │                  │    │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘    │   │
│  │  ┌──────────────────────────────────────────┐      │   │
│  │  │ Section (tab-dependent)                   │      │   │
│  │  │  Overview | Receivables | Collections |   │      │   │
│  │  │  Projects | Tax                           │      │   │
│  │  └──────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   /compliance (page)                         │
│  src/pages/ComplianceHub.tsx                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Today | VAT | WHT Receipts | Filings | Obligations │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  reportRepository.ts ──► Supabase views                      │
│  reportProjectionService.ts ──► enrichment pass-through       │
│  complianceService.ts ──► Supabase tables                     │
│  reportUtils.ts ──► computeReportTaxMetrics, formatters       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Export Infrastructure                    │
│  src/lib/pdf/ ──► PdfDocumentType (no 'report' type)        │
│  src/services/exportFetchers.ts ──► fetch for export         │
│  src/utils/exportCompilers.ts ──► CSV/JSON compilation       │
│  src/types/exportHub.ts ──► ExportFormat types               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Inventory

| File | Line Count | Responsibility |
|---|---|---|
| `src/pages/Reports.tsx` | 507 | Orchestrator: manages 4 data sets, 5 tabs, client filter, search, date range |
| `src/pages/ComplianceHub.tsx` | 346 | Compliance data loading, 5 section panels |
| `src/components/reports/ReportsShell.tsx` | — | Layout container with nav/header/filter/content slots |
| `src/components/reports/ReportsNav.tsx` | — | 5-tab navigation |
| `src/components/reports/ReportsHeader.tsx` | — | Title, description, `onExport` prop (wired to `() => {}`) |
| `src/components/reports/ReportsFilterBar.tsx` | — | Date preset selector, client dropdown, search input |
| `src/components/reports/ReportShared.tsx` | — | `MetricStrip`, `Filters`, `LoadingState`, `EmptyState`, `ErrorBanner` |
| `src/components/reports/ReportsMetricStrip.tsx` | 163 | Compact and simple KPI metric cards |
| `src/components/reports/OverviewSection.tsx` | 353 | Total exposure, past-due share, VAT/WHT, high-risk receivables, aging buckets |
| `src/components/reports/ReceivablesSection.tsx` | 206 | Filterable invoice list with aging, status, balances |
| `src/components/reports/CollectionsSection.tsx` | 193 | Payment log with amounts, methods, references |
| `src/components/reports/ProjectsSection.tsx` | 160 | Project financial summaries |
| `src/components/reports/TaxSection.tsx` | 229 | VAT summary, WHT exposure, compliance hub CTA |
| `src/components/reports/reportTypes.ts` | — | `ReportTab`, `DatePreset`, `InvoiceFinancialRow`, `CollectionRow`, etc. |
| `src/components/reports/reportUtils.ts` | — | `formatMoney`, `formatDate`, `computeReportTaxMetrics`, `getAgingBucket`, `getPresetRange` |
| `src/modules/reports/services/reportProjectionService.ts` | — | `loadEnrichedCollections`, `loadReceivables`, `loadProjects`, `loadTaxInvoices` |
| `src/modules/reports/repositories/reportRepository.ts` | — | Supabase queries against `invoice_financials_v`, `project_financials_v`, etc. |

### 2.3 Data Flow

The Reports page uses a **per-tab lazy loading** pattern:

1. `Reports.tsx` calls `getPresetRange()` to compute date boundaries from the selected preset
2. Four independent data fetchers load from Supabase views via `reportProjectionService`:
   - `loadReceivables` → `invoice_financials_v` (date-filtered)
   - `loadEnrichedCollections` → payments join invoices (date-filtered)
   - `loadProjects` → `project_financials_v` (unfiltered)
   - `loadTaxInvoices` → invoices with VAT/WHT fields (date-filtered)
3. Each data set has separate loading/error/loadedRange state
4. A race-condition guard uses `useRef` counters per data set
5. The Overview tab recomputes its summary via `useMemo` from all four data sets

**Key observation**: Projects data loads once and never reloads. Receivables, collections, and tax invoices reload when the date range changes. The Overview tab only loads data for tabs that need it (collections loaded when overview/collections/tax tab is active).

### 2.4 Type Definitions (reportTypes.ts)

```
ReportTab     = 'overview' | 'receivables' | 'collections' | 'projects' | 'tax'
DatePreset    = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'
ReceivablesFilter = 'all' | 'unpaid' | 'paid' | 'past_due'
MetricTone    = 'green' | 'red' | 'amber' | 'blue'

InvoiceFinancialRow — main invoice financial data with balance_due, cash_received
CollectionRow       — payment record with cash_amount, wht_amount, method
ProjectFinancialRow — project-level totals (total_invoiced, cash_collected, outstanding)
TaxInvoiceRow       — invoice with vat, wht fields
OverviewSummary     — aggregated overview metrics
Metric             — { label, value, tone, icon? }
```

### 2.5 Supabase Views Used

| View | Purpose |
|---|---|
| `invoice_financials_v` | Invoice-level financials with balance due, cash received |
| `project_financials_v` | Project-level aggregated financials |

### 2.6 Key Observations

**Without opinion**: These observations describe what the code does.

1. **ReceivablesSection, CollectionsSection, ProjectsSection, TaxSection** all pass the same date/filter/search props through from Reports.tsx. They duplicate the filtering logic (`isWithinRange`, `clientFilter`, `searchTerm`) internally instead of receiving pre-filtered data.

2. **CollectionsSection** styles use a mix of BD design tokens (ReportsFilterBar area) and shadcn `Card`/`CardContent`/`CardHeader` with `text-muted-foreground` and `border-emerald-200` (card body). The custom date picker in CollectionsSection uses `Card`/`Input` while ReceivablesSection uses a `<div>` with `bd-*` tokens.

3. **TaxSection** references a now-deprecated `/compliance` CTA. The Compliance Hub has its own separate data loading and does not share data with the Reports page. The Reports page refers users to Compliance Hub for detailed compliance operations.

4. **ReportsMetricStrip** has two rendering modes - `SimpleMetricItem` (original) and `CompactMetricCard` with trend/subValue support. The OverviewSection uses `compactMetrics`, other sections use `metrics`.

5. **ProjectsSection** is the only section that does **not** pass `start`/`end` for date range filtering. Projects data is loaded once and never refiltered by date.

6. **ComplianceHub loads its own data** directly from `invoices`, `payments`, and compliance tables. It does not use `reportRepository` or `reportProjectionService`. The Reports page and Compliance Hub are completely disconnected data consumers.

7. **The overviewLoading computation** is complex: it checks `tab === 'overview'` combined with `loadedRange !== rangeKey` for each data set, plus `!projectsLoaded`, plus the raw loading booleans. This means it's `true` even when the active tab is not overview — as long as any data set is loading.

---

## 3. Export/PDF Gap Analysis

### 3.1 Export Infrastructure (Existing)

A centralized export system exists across these files:

| File | Purpose |
|---|---|
| `src/types/exportHub.ts` | `ExportFormat` enum: `PDF_LEDGER`, `CSV_SUMMARY`, `CSV_FLATTENED_LINE_ITEMS`, `JSON_RAW` |
| `src/services/exportFetchers.ts` | Fetches data from Supabase for export with filters |
| `src/utils/exportCompilers.ts` | `compileToCSV()`, `flattenLineItems()`, `triggerFileDownload()` |
| `src/components/export/ContextualExportDropdown.tsx` | Dropdown UI, used on CSR list page |
| `src/components/export/ExportDropdownRow.tsx` | Accordion-row export, shows `PDF_LEDGER` as label only |
| `src/lib/pdf/` (entire directory) | `PdfGenerator`, `DefaultPdfGenerator` (`@react-pdf/renderer`), `CompositePdfDelivery`, `FeedbackBus` |

### 3.2 PDF Pipeline Incompatibility

The PDF pipeline at `src/lib/pdf/types.ts` defines:

```typescript
PdfDocumentType = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'boq' | 'rfq' | 'receipt'
```

There is **no `'report'`** entry in `PdfDocumentType`. The PDF pipeline would need:
- A new `'report'` document type
- A React-PDF template (or use a different approach, since financial reports are multi-page tabular data)
- Integration with the export system

### 3.3 Connections to Reports

- `ReportsHeader.tsx` has `onExport` prop — wired to `onExport={() => {}}` in Reports.tsx (line 396)
- No export button is available on the Reports page
- No CSV/PDF/JSON export exists for any report tab
- The existing `exportFetchers.ts` and `exportCompilers.ts` are not used by the Reports page

### 3.4 PdfDocumentType Missing Report Support

| Document Type | Has PDF Template | Export Wired |
|---|---|---|
| invoice | Yes | Yes (per-document) |
| quotation | Yes | Not checked |
| csr | Yes | CSV/JSON only |
| waybill | Yes | Not checked |
| boq | Yes | Not checked |
| rfq | Yes | Not checked |
| receipt | Yes | Not checked |
| **report** | **No** | **No** |

---

## 4. Routing and Navigation

### 4.1 Route Registration

Routes are in `src/components/app/AppShell.tsx`. Relevant routes:

| Route | Component | Lazy Loaded |
|---|---|---|
| `/reports` | `Reports` | Yes |
| `/compliance` | `ComplianceHub` | Yes |

All routes are flat — no nested route layouts or sub-routes.

### 4.2 Navigation

Navigation is in `src/components/layout/navData.ts`:

```typescript
{ key: 'reports', label: 'Reports', icon: Icons.report, path: '/reports' }
{ key: 'compliance', label: 'Compliance Hub', path: '/compliance' }
```

Both entries appear in the main sidebar navigation.

### 4.3 Existing References to Statement of Account

**No references found.** Searched case-insensitively for `statement of account`, `statement_of_account`, `soa` across the entire `src/` directory. The feature does not exist in any form.

---

## 5. Authentication and Authorization

### 5.1 Current State

**No frontend permission or authorization layer exists.** Findings:

- No `usePermission` hook
- No `PermissionGuard` component
- No RBAC or ABAC system
- No route-level permission checks
- The only auth check is a session existence check + `profile.is_approved` flag at the app root
- `src/types/exportHub.ts` has a `requiredPermission` field in `ExportCardRegistryItem` but it is never enforced
- RLS policies on Supabase handle backend-level access control

### 5.2 Implications for Reports

- Any new report feature (including statement of account) cannot be gated by permissions at the frontend level
- Adding permission gating would require building a permission system from scratch or using Supabase RLS only

---

## 6. Statement of Account Readiness

### 6.1 What Exists That Can Be Reused

| Asset | Location | Reusable? |
|---|---|---|
| Invoice financial data | `invoice_financials_v` view | Yes |
| Payment data | `payments` table + `reportRepository` | Yes |
| Aging computation | `getAgingBucket()` in reportUtils | Yes |
| Money formatting | `formatMoney()` in reportUtils | Yes |
| Date formatting | `formatDate()` in reportUtils | Yes |
| Client filtering | `ReportsFilterBar` component | Yes |
| PDF infrastructure | `src/lib/pdf/` | Partial — needs `'report'` type and template |
| Tab-based shell | `ReportsShell` component | Yes |
| Metric strip cards | `ReportsMetricStrip` | Yes |

### 6.2 What Is Missing

| Capability | Gap |
|---|---|
| Statement of Account page/route | Does not exist |
| Statement of Account data model | No view, table, or type definition |
| Per-client balance history | Not captured in current views |
| Date-range running balance | Current views are snapshot-based, not cumulative |
| Transaction detail with running balances | Not computed |
| PDF output for Statement of Account | No template, no document type |
| CSV export for Statement of Account | Not wired |
| Permission gating for financial reports | No permission system exists |

---

## 7. Risks and Limitations

### 7.1 Verified Risks

1. **Data loading duplication**: Reports page and Compliance Hub both load invoices and payments independently. This creates two separate Supabase queries for overlapping data.

2. **Missing export**: The `onExport` prop being wired to `() => {}` represents a known gap.

3. **Mixed styling patterns**: CollectionsSection uses shadcn UI components with `text-muted-foreground` while most of the Reports page uses BD design tokens (`text-bd-text-muted`). The TaxSection uses a mix of `bg-amber-50`, `text-slate-900`, and `bd-*` tokens.

4. **No frontend permissions**: Any sensitive report feature would have no frontend access control.

5. **PdfDocumentType lock**: The PDF pipeline's type system excludes `'report'` — adding it requires touching `types.ts` and all implementing generators.

6. **Projects data is never date-filtered**: The ProjectsSection and ProjectFinancialRow do not support date-range scoping.

### 7.2 Design Risks (for future work)

- Adding Statement of Account as a new tab to the existing Reports page would require the most integration
- Creating it as a standalone page would duplicate the Reports page infrastructure
- The Compliance Hub's separate data loading makes integration with Reports data non-trivial
- No existing SQL view or function computes running ledger balances

---

## 8. Verification Gate

- `bun run typecheck` — Not run, this is a read-only audit
- `bun run audit:load` — Not run, no code was modified
- `git status` — Clean baseline confirmed at audit start
- Build skipped per AGENTS.md §3 hardware constraint

---

## 9. Recommendations

The following recommendations are organized by priority:

### High Priority

1. **Wire export functionality** — Connect the existing `exportFetchers.ts`/`exportCompilers.ts` pipeline to the Reports page. The `onExport={() => {}}` placeholder should become a `ContextualExportDropdown` or custom export flow.

2. **Add `'report'` to `PdfDocumentType`** — Extend the PDF pipeline at `src/lib/pdf/types.ts` to support the `'report'` document type so that report PDF generation uses the canonical pipeline.

3. **Unify date-range filtering for Projects** — Add date-range support to `ProjectFinancialRow` queries so that Project data can be scoped by date like other tabs.

### Medium Priority

4. **Share data between Reports and Compliance Hub** — The Compliance Hub loads invoices and payments that the Reports page already fetched. A shared data context or cache would eliminate redundant Supabase queries.

5. **Align CollectionsSection styling** — Convert CollectionsSection from shadcn `Card`/`text-muted-foreground`/`border-emerald-*` to the BD design token system used by the rest of the Reports page.

### Low Priority

6. **Add SQL view for running ledger balances** — If Statement of Account is implemented, a dedicated SQL view or function for per-client date-range running balances is needed.

7. **Add frontend permission framework** — If future features require role-based access to financial reports, a permission system (guard component + hook) should be built.

---

## 10. Deferred Work

- Detailed review of individual report section test coverage
- Performance profiling of the four concurrent data fetchers
- Analysis of mobile/responsive layout behavior for the Reports page
- Review of the Compliance Hub component structure (VATInputsPanel, WHTReceiptsPanel, etc.)
- Analysis of the `projection` layer in `reportProjectionService.ts` (currently a thin pass-through)
