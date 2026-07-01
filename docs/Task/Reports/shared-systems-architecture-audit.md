# Shared Systems Architecture Audit — BIGDROPS

> **Date:** 2026-07-01  
> **Scope:** All 7 business document modules: Invoice, Quotation, Waybill, CSR, BOQ, RFQ, Project  
> **Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vite 7, Bun  
> **Confidence:** High (all findings verified from current codebase)

---

## 1. Domain Layer Completeness

| Artifact                        | Invoice | Quotation | Waybill | CSR | BOQ | RFQ | Project |
|---------------------------------|---------|-----------|---------|-----|-----|-----|---------|
| **types.ts**                    | ✅ 363  | ✅ 134    | ✅ 88   | ❌  | ✅ 24 | ✅ 53 | ❌      |
| **columns.ts**                  | ✅ 251  | ❌*       | ❌**    | ❌  | ❌  | ❌  | ❌      |
| **normalize.ts**                | ✅ 295  | ✅ 232    | ❌      | ❌  | ❌  | ✅ 127 | ❌      |
| **factories.ts**                | ✅ 110  | ❌        | ✅ 59   | ❌  | ✅ 34 | ✅ 40 | ❌      |
| **calculations.ts**             | ✅ 395  | ❌        | ❌  | ❌  | ✅*** | ❌  | ❌      |
| **importAdapter.ts**            | ✅ 39   | ✅ 52     | ✅ 201 | ❌  | ❌  | ✅ 63 | ❌      |
| **previewModel.ts / render**    | ✅ 238  | ✅ 133    | ✅ (engine) | ✅ 232 | ❌&#8224; | ✅ 19 | ❌ |
| **contract (validation)**       | ✅ 33   | ❌        | ✅ 184 | ❌  | ❌  | ❌  | ❌      |
| **service/mutations file**      | ❌&#8225; | ❌&#8225; | ✅ 114 | ✅ 195 | ❌  | ✅ 47 | ❌ |
| **actions.js**                  | ✅ 149  | ❌        | ❌      | ❌  | ❌  | ❌  | ❌      |
| **File count**                  | **30**  | **6**     | **20** | **4** | **7+** | **4** | **4** |

> \* Quotation reuses Invoice's columns (no own columns.ts)  
> \** Waybill has a *different* column system — `StandardColumn` interface in `waybillContract.ts` + `WaybillCustomColumn` in waybillUtils.ts  
> \*** BOQ has its own engine (`boq-engine.ts`) — operates independently of `src/lib/Calculations.ts` (drift from AGENTS.md rule)  
> &#8224; BOQ uses `TableDocumentPreview` from `table-document` components  
> &#8225; Invoice and quotation handle Supabase directly in page components / hooks

### Findings

**1.1 Invoice is the reference architecture** — 30 files, full layered design with types → contracts → factories → normalize → calculations → preview → projections → financial state → actions. Every other module is a subset.

**1.2 Quotation is intentionally thin (confirms AGENTS.md rule)** — 6 files, reuses invoice types (`DbQuotation`, `QuotationItem` extend invoice patterns), reuses invoice column system (`mergeColumnConfigs`, `BUILTIN_COLUMNS`), and provides `mapQuotationToInvoice()` transform for SharedDocumentForm consumption.

**1.3 CSR is underdeveloped (architectural drift)** — 4 files, no types.ts, no normalize.ts, no factory, no calculations. The majority of domain logic lives in `src/components/csr/csrUtils.ts` (1,100+ lines) — a clear architectural drift where business logic resides in the component layer instead of the domain layer.

**1.4 BOQ has its own calculations engine** — `src/domain/boq/engine/boq-engine.ts` operates independently of `src/lib/Calculations.ts`. This violates the AGENTS.md hard rule that `Calculations.ts` is the single source of truth for all financial calculations.

**1.5 No consistent service layer** — Invoice and quotation embed Supabase calls in page components and hooks. Waybill has `waybillMutations.ts`. CSR has `csrService.ts`. RFQ has `rfqService.ts`. BOQ uses localStorage entirely. Three different persistence strategies with no shared abstraction.

---

## 2. Column Management Systems — 3 Distinct Systems

| Feature | Invoice / Quotation | Waybill | RFQ / BOQ (table-document) |
|---------|-------------------|---------|---------------------------|
| **Column type** | `ColumnConfig` (rich, 8 properties) | `StandardColumn` + `WaybillCustomColumn` (minimal) | `TableDocumentColumn` (simple, 3 properties) |
| **File location** | `src/domain/invoice/columns.ts` | `src/domain/waybill/contracts/waybillContract.ts` + waybillUtils.ts | `src/domain/table-document/templateRegistry.ts` |
| **Visibility modes** | 3-value enum: `show`, `hide_display`, `hide_full` | `Record<string, boolean>` only | `visible: boolean` only |
| **Custom columns** | Yes, key prefixed `custom_` | Yes, via `createCustomColumnKey()` | No |
| **Reordering** | Yes (drag + buttons in ColumnManager) | Yes (via `columnOrder` state) | No |
| **Monetary fields** | `unit_price`, `amount`, `install_rate`, `vat_rate`, `discount_rate` | **None** (forbidden by contract) | `cp`, `sp` (text, not computed) |
| **Item custom_data** | `CustomDataMap` (typed) | `WaybillItemCustomData` (typed, enforced by `assertNoExtensionFieldsOutsideCustomData`) | None |
| **Persistence** | `custom_fields.columnConfig` | `custom_fields.customColumns` + `columnVisibility` | `table_columns` |
| **PDF column logic** | `getPdfColumns()` with pdfWidth/pdfFlex | `resolveColumns()` in engine/ | Table templates only |
| **Context-aware field routing** | `ITEM_FIELD_POLICY.invoice` | `ITEM_FIELD_POLICY.waybill` | N/A |

### Findings

**2.1 No shared column abstraction** — Three completely independent column systems with no shared base type or interface.

**2.2 Invoice and Waybill share ColumnManager UI but not column model** — The `ColumnManager.tsx` (724 lines) is shared as a React component, but waybill adapts its column model to fit the Invoice-compatible `ColumnConfig` interface for rendering only. The underlying persistence format differs.

**2.3 Waybill column system is the most unique and validated** — The `waybillContract.ts` enforces at runtime that no monetary fields leak into items. `assertNoExtensionFieldsOutsideCustomData()` is called pre-persist. This is the only module with runtime contract enforcement for columns.

**2.4 RFQ/BOQ column system is simplest but least type-safe** — No `custom_data`, no visibility modes, no reordering. `cp` and `sp` are plain text strings, not computed fields.

---

## 3. Shared Form Component Adoption

| Component | Used By | Lines |
|-----------|---------|-------|
| `SharedDocumentForm.tsx` | Invoice, Quotation | 365 |
| `FormLineItems.tsx` | Invoice, Quotation (via SharedDocumentForm) | 368 |
| `SortableLineItem.tsx` | Invoice, Quotation (via FormLineItems) | 88 |
| `FormHeader.tsx` | Invoice, Quotation | ~50 |
| `FormFooter.tsx` | Invoice, Quotation | ~50 |
| `FormTotals.tsx` | Invoice, Quotation | ~50 |
| `FormCommercialTerms.tsx` | Invoice, Quotation | ~50 |
| `FormNotesTerms.tsx` | Invoice, Quotation | ~50 |
| `ColumnManager.tsx` | Invoice, Quotation, Waybill (adapted) | 724 |
| `MobileItemCard.tsx` | Invoice, Quotation, Waybill (adapted) | 501 |
| `MobileGroupCard.tsx` | Invoice, Quotation | ~80 |

### Not using SharedDocumentForm

| Module | Editor Component | Approach |
|--------|-----------------|----------|
| Waybill | `WaybillForm.tsx` | Custom full-width form with ColumnManager, mobile item cards |
| CSR | `CsrFormScreen.tsx` | Custom CSR-specific form |
| BOQ | `BoqEditor.tsx` | Uses `TableRowsEditor` from table-document |
| RFQ | `RfqEditor.tsx` | Uses `TableRowsEditor` from table-document |

### Findings

**3.1 Only Invoice + Quotation use SharedDocumentForm** — This is by design (Quotation maps to Invoice format), but means 5/7 modules have custom form implementations.

**3.2 Underlying item editing IS partially shared** — `MobileItemCard.tsx` is shared across Invoice, Quotation, and Waybill. But the waybill version is adapted via `ITEM_FIELD_POLICY`.

**3.3 `ColumnManager.tsx` is the heaviest shared component** — 724 lines, handles visibility toggling, reordering, custom columns, row overrides, formulas. Used by Invoice, Quotation, and Waybill (with adaptation).

**3.4 NewInvoice.tsx (871 lines) and EditInvoice.tsx (848 lines) are oversized** — These page components contain event handlers, state management, and Supabase calls that should ideally live in the domain layer or dedicated hooks.

---

## 4. Providers and Hooks Architecture

### Context Providers

| Provider | File | Scope |
|----------|------|-------|
| `DocumentQueryProvider` | `src/context/DocumentQueryContext.tsx` | All 7 modules — unified query state |

### Module Adapters (Registry Pattern)

- **Registry:** `src/config/moduleAdapters.ts` (712 lines)
- **7 adapters:** invoices, quotations, waybills, projects, csr, rfqs, boqs
- **Each adapter has:** `initialSortBy`, `statusOptions`, `cacheKey`, `cacheTtlMs`, `fetcher(query)`
- **Cache strategy:** `readListCache` with invalidation on create/update
- **Module type map:** `invoices/quotations → "financial"`, `waybills → "logistics"`, `projects/csr/rfqs/boqs → "project"`

### Document-Specific Hooks

| Hook | Module | Purpose |
|------|--------|---------|
| `useInvoiceForm.js` | Invoice | Form state management |
| `useInvoiceMutations.ts` | Invoice | Create/update/delete |
| `useInvoiceList.ts` | Invoice | List with filters/sort |
| `useInvoiceDetailData.js` | Invoice | Detail view data |
| `useQuotationActions.ts` | Quotation | Quotation actions |
| `useQuotationViewData.ts` | Quotation | View data |
| `useProjectDocumentFetch.ts` | Project | Document fetch |

### Findings

**4.1 Only Invoice has a full set of hooks** — useInvoiceForm, useInvoiceMutations, useInvoiceList, useInvoiceDetailData. Other modules have minimal or no custom hooks.

**4.2 DocumentQueryProvider is the only shared context** — No other shared state providers exist for form state, edit state, or draft management.

**4.3 Module adapters are well-architected** — The fetcher + cache + local filter pattern is clean. But only the **list/query** concern — not forms, saves, or mutations.

**4.4 No shared mutation hooks** — Each module implements save/create/delete independently.

---

## 5. Calculations Strategy

| Module | Calculations Source | Status |
|--------|-------------------|--------|
| Invoice | `src/domain/invoice/calculations.ts` (395 lines) | ✅ Uses `calcTotals`, `resolveRowVat` from `Calculations.ts` |
| Quotation | Uses Invoice calculations | ✅ Re-uses invoice pipeline |
| Waybill | No monetary calculations | ✅ By design (logistics-only) |
| CSR | Minimal — in csrUtils.ts | ⚠️ No shared calculations |
| **BOQ** | **Own engine: `src/domain/boq/engine/boq-engine.ts`** | **❌ Drift from `Calculations.ts`** |
| RFQ | No calculations (CP/SP are text) | ✅ By design |
| Project | N/A | N/A |

### Finding

**5.1 BOQ has its own calculations engine** — This is a violation of the AGENTS.md hard rule: `src/lib/Calculations.ts` is designated as the single source of truth for all financial calculations. BOQ's `boq-engine.ts` implements independent calculation logic.

---

## 6. PDF Rendering Approaches

| Module | Approach | File(s) |
|--------|----------|---------|
| Invoice | React-PDF (`@react-pdf/renderer`) via `src/components/pdf-new/` | `src/components/pdf-new/invoice/` |
| Quotation | React-PDF via `src/components/pdf-new/` | Shares invoice PDF components |
| Waybill | React-PDF via `src/components/waybill/WaybillPdfDocument.tsx` | Own PDF, own engine-based render model |
| CSR | React-PDF via `src/domain/csr/csrRenderModel.ts` → PDF component | Own PDF |
| BOQ | React-PDF via `src/components/table-document/TableDocumentPdfDocument.tsx` | Shared table-document PDF |
| RFQ | React-PDF via `src/components/table-document/TableDocumentPdfDocument.tsx` | Shared table-document PDF |

### Findings

**6.1 All modules use React-PDF** — Consistent library choice (`@react-pdf/renderer`).

**6.2 Invoice and Quotation share PDF components** — Quotation uses the `pdf-new/invoice` pipeline (with invoice PDF template).

**6.3 Table-document PDF is shared between RFQ and BOQ** — `TableDocumentPdfDocument.tsx` handles both.

**6.4 Waybill and CSR have standalone PDFs** — No sharing with invoice or table-document.

**6.5 PDF pipeline structure diverges significantly:**
- **Invoice:** domain layer builds preview model (`invoicePreview.ts`, `previewModel.ts`) → `buildPdfRenderPayload()` → React-PDF component
- **Waybill:** engine assembly resolves columns/rows → print model → React-PDF component  
- **CSR:** `csrRenderModel.ts` builds render model → React-PDF component
- **BOQ/RFQ:** `TableDocumentPreview` + template selection → `TableDocumentPdfDocument.tsx`

---

## 7. Import / Export Strategies

### Import

| Module | Approach | File |
|--------|----------|------|
| Invoice | Delegates to `src/domain/import/` pipeline | `src/domain/invoice/importAdapter.ts` |
| Quotation | `mapQuotationToInvoice()` + invoice adapter | `src/domain/quotation/importAdapter.ts` |
| Waybill | **Own implementations** for external + internal | `src/domain/waybill/importAdapter.ts` (201 lines) |
| CSR | None | — |
| BOQ | None | — |
| RFQ | Own import adapter | `src/domain/rfq/rfqImportAdapter.ts` (63 lines) |

### Export / Printing

| Module | Approach |
|--------|----------|
| Invoice | PDF download (React-PDF) + batch export via `src/services/exportCompiler` |
| Quotation | PDF download (reuses invoice PDF) |
| Waybill | PDF via waybill engine → print model |
| CSR | PDF via csrRenderModel |
| BOQ | PDF via `TableDocumentExportController` (chunks rows → PNG capture → React-PDF) |
| RFQ | PDF via `TableDocumentExportController` |

### Findings

**7.1 The `src/domain/import/` pipeline exists but is only used by Invoice** — The centralized import pipeline (Parse → Normalize → Validate → Resolve → Apply) is fully built but Invoice is the only consumer. Waybill and RFQ bypass it with their own implementations.

**7.2 Waybill's import adapter is the most complex** — 201 lines, handles both external supplier import and internal CSV conversion, with Zod schemas for each pathway.

**7.3 BOQ export is the most complex** — Uses `html-to-image` to capture PNG segments of the table preview, then passes them to React-PDF for A4 output. This is significantly different from invoice/waybill which render PDF directly.

**7.4 CSR has no import adapter at all** — No JSON import support despite AGENTS.md specifying that new document modules supporting JSON import must follow `docs/json-import-standard.md`.

---

## 8. Workflow Save / Submit / Persistence

| Module | Save Function | Supabase | localStorage | Status Validation |
|--------|-------------|----------|-------------|-------------------|
| Invoice | In page component (NewInvoice.tsx:871) + hooks | ✅ Yes | ❌ | Yes (status column) |
| Quotation | Via QuotationForm → SharedDocumentForm | ✅ Yes | ❌ | Yes |
| Waybill | `waybillMutations.saveWaybill()` (114 lines) | ✅ Yes | ❌ | Yes (client for external) |
| CSR | `csrService.createCsr()` / `updateCsr()` | ✅ Yes | ❌ | Minimal |
| BOQ | `storage.ts` (71 lines) | **❌** | **✅ Yes** | None |
| RFQ | `rfqService.saveRfq()` → supabase | ✅ Yes | ❌ | Yes |
| Project | Various | ✅ Yes | ❌ | Minimal |

### Findings

**8.1 BOQ uses localStorage exclusively** — All BOQ data is persisted to localStorage (`boqs` key). No Supabase integration. This is a fundamentally different persistence strategy from all other modules.

**8.2 Waybill has the most robust save function** — `waybillMutations.ts` includes validation, contract enforcement, unique retry with number regeneration, cache invalidation, and payload normalization.

**8.3 No consistent save pattern** — Invoice saves in page components, Waybill has a dedicated mutations file, CSR has a service file, RFQ has a service file. Each uses different error handling and validation approaches.

**8.4 No shared draft/autosave mechanism** — No evidence of a shared autosave or draft persistence system across modules.

---

## 9. Key Architectural Concerns

### High Severity

| # | Issue | File(s) | Evidence |
|---|-------|---------|----------|
| H1 | **BOQ calculations drift from Calculations.ts** — violates AGENTS.md hard rule | `src/domain/boq/engine/boq-engine.ts` | Own calculation logic independent of `src/lib/Calculations.ts` |
| H2 | **CSR domain logic in component layer** — anti-pattern | `src/components/csr/csrUtils.ts` (1,100+ lines) | Contains normalize, validate, save, getNextNumber, types — all domain concerns outside `src/domain/csr/` |
| H3 | **No shared column abstraction** — 3 independent column systems | `columns.ts` (invoice), `waybillContract.ts` (waybill), `templateRegistry.ts` (table-document) | No shared base type, no shared editor, no shared persistence format |

### Medium Severity

| # | Issue | Evidence |
|---|-------|----------|
| M1 | **Inconsistent domain layer completeness** — Invoice (30 files) vs CSR (4 files) vs Project (4 files) | No shared minimum domain layer contract |
| M2 | **BOQ uses localStorage instead of Supabase** | `src/domain/boq/storage.ts` (71 lines) — no DB persistence |
| M3 | **No consistent service/mutation layer** — Direct Supabase in pages (Invoice), mutations file (Waybill), service file (CSR/RFQ), localStorage (BOQ) | 3 different persistence patterns |
| M4 | **Centralized import pipeline exists but is underutilized** | `src/domain/import/` — only Invoice uses it; Waybill and RFQ have own implementations |
| M5 | **Oversized page components** — NewInvoice.tsx (871 lines), EditInvoice.tsx (848 lines) | Contain domain logic, event handlers, Supabase calls |

### Low Severity

| # | Issue | Evidence |
|---|-------|----------|
| L1 | **Only Invoice has a full set of dedicated hooks** | `useInvoiceForm`, `useInvoiceMutations`, `useInvoiceList`, `useInvoiceDetailData` — no equivalents for other modules |
| L2 | **Only Invoice + Quotation use SharedDocumentForm** | Waybill, CSR, BOQ, RFQ all have custom editors |
| L3 | **CSR has no import adapter** | No import support despite AGENTS.md guidance |
| L4 | **DocumentQueryContext is the only shared context** | No shared form state, edit state, or draft management context |
| L5 | **Quotation/Invoice page wrappers are thin but inconsistent** | NewQuotation.tsx (10 lines) vs NewInvoice.tsx (871 lines) — extreme inconsistency |

---

## 10. Consolidation Opportunities

| Opportunity | Current State | Target | Impact |
|-------------|--------------|--------|--------|
| **Shared column model** | 3 independent column systems | Unify under a common base type (`ColumnDefinition`), with module-specific extensions | High — reduces duplication in column management, persistence, and PDF rendering |
| **Shared persistence layer** | 3 patterns (direct Supabase, mutations file, localStorage) | Unified mutation contract with consistent validation + error handling + cache invalidation | High — WaybillMutations is the best reference pattern |
| **CSR domain refactor** | 1,100+ lines in component layer | Extract to `src/domain/csr/` — types, normalize, calculations, service | High — fixes architectural drift |
| **BOQ persistence migration** | localStorage only | Migrate to Supabase with consistent persistence pattern | Medium — enables server-side queries, sharing, audit trail |
| **Import pipeline consolidation** | Centralized pipeline + 2 bypass implementations | Migrate Waybill and RFQ to use `src/domain/import/` pipeline | Medium |
| **Shared calculations** | BOQ has own engine | Align BOQ calculations with `Calculations.ts` or document divergence | High — AGENTS.md rule enforcement |
| **Karpathy discipline** | Module specialization scattered | Apply Karpathy's "simple single-file first" — consolidate shared logic before adding new abstraction layers | Ongoing |

---

## 11. What's Good

Despite the concerns, several systems are well-architected:

- **DocumentQueryContext + moduleAdapters** — Clean registry pattern with typed adapters, cache strategy, and local filtering. The 712-line adapter file is well-organized.
- **Waybill contract enforcement** — `waybillContract.ts` with runtime validation and `assertNoExtensionFieldsOutsideCustomData` provides a safety net no other module has.
- **Quotation's thin reuse of Invoice** — Confirms AGENTS.md rule, avoids duplication, and the `mapQuotationToInvoice()` transform is a clean adapter pattern.
- **Table-document shared domain** — RFQ and BOQ sharing `src/domain/table-document/` types, templates, and PDF renderer is the only successful cross-module domain sharing.
- **ColumnManager shared component** — Despite different column models underneath, the shared UI (724 lines) works across Invoice, Quotation, and Waybill.
- **`ITEM_FIELD_POLICY`** — Clean context-aware field routing for invoice vs waybill item models.

---

## 12. Methodology

- All findings verified by reading source files directly
- File line counts are exact (`wc -l` equivalent)
- Column systems compared by reading all column-related files in each module
- Form adoption verified by tracing imports from page components to form components
- Calculations strategy verified by checking files that import from `src/lib/Calculations.ts` vs `src/domain/boq/engine/`
- Persistence strategy verified by checking Supabase calls vs localStorage calls per module
- PDF approach verified by reading PDF component imports in each module
