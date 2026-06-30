# Architecture Inspection

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Inspected:** June 2026

---

## Executive Summary

The BIGDROPS frontend has grown organically across 10+ document modules, producing **4 distinct form architectures**, **3 column management systems**, and **25 dangerously oversized files**. The architecture shows clear evidence of feature-driven development without periodic consolidation. Key risks: component bloat (`NewInvoice.tsx` at 872 lines), dead code (`Dashboard.tsx` at 0 lines, `ui/sidebar.tsx` at 715 lines unused), and a mixed-domain pattern where quotation depends on invoice domain types.

---

## Scope

- Full component tree across `src/pages/`, `src/components/`, `src/domain/`, `src/lib/`
- Data flow patterns: form submission, column management, PDF rendering
- Dead code detection, file size analysis, module boundaries
- Dependency and import relationships between modules

---

## Methodology

1. `bun run audit:load` — automated file size and import pattern scan (690 files)
2. Directory inventory — listing all files per module
3. Task agent inspection of 48 page files across all modules
4. Manual import-path analysis for cross-module dependencies

---

## Files Inspected

- All 48 files in `src/pages/`
- All directories under `src/components/` (invoice, quotation, waybill, csr, boq, rfq, client, project, items, document, document-view, ui, reui, layout, dashboard, settings)
- All directories under `src/domain/` (invoice, quotation, waybill, csr, boq, rfq, table-document, document, project, notifications, audit, compliance)
- `src/lib/Calculations.ts` (no-touch zone)
- `src/hooks/` (20 hooks)

---

## Screens Inspected

- Every page-level component: 18 list/detail screens, 15 create/edit forms, 2 auth pages, 1 settings page
- Every document module: Invoice, Quotation, Waybill, CSR, BOQ, RFQ, Project, Client

---

## Findings

### 1. Form Architecture Fragmentation

| Pattern | Modules | Files | Characteristics |
|---------|---------|-------|-----------------|
| `SharedDocumentForm` | Invoice, Quotation | `NewInvoice.tsx`, `EditInvoice.tsx`, `NewQuotation.tsx`, `EditQuotation.tsx` | Shared form shell with sub-components (`InvoiceNotesTermsSection`, `PaymentSection`, etc.) |
| Custom inline | CSR | `CsrFormScreen.tsx` (861 lines) | Fully custom `Section`, `TextInput`, `TextArea`, `SelectField` sub-components, no reuse |
| Tabbed editor | BOQ, RFQ | `BoqForm.tsx`, `RfqForm.tsx` | 3-tab pattern (Details/Items/Output) with editor + preview split |
| Overlay | Waybill | `WaybillFormOverlay.tsx`, `WaybillGatewayOverlay.tsx` | Modal overlay pattern, unique to waybill |

**Risk:** Users switching between modules experience 4 different form interaction patterns. CSR (861 lines) and Invoice (872 lines) are particularly bloated.

### 2. Column Management Divergence

| System | Used By | Type Definition |
|--------|---------|-----------------|
| `ColumnConfig` | Invoice, Quotation | `src/domain/invoice/types.ts` — `ColumnConfig` interface with `key`, `label`, `defaultVisible` |
| `TableDocumentColumn` | BOQ, RFQ | `src/domain/table-document/types.ts` — different interface |
| Waybill-specific | Waybill | `src/domain/waybill/contracts/waybillContract.ts` — yet another structure |

**Risk:** Column customization, reordering, and persistence require separate implementations per module.

### 3. Domain Dependency Issues

- **Quotation** reuses invoice domain types (`@/domain/invoice/...`) — quotation has no independent domain layer
- **BOQ** and **RFQ** share `@/domain/table-document/...` types — clean
- **Waybill** has its own standalone domain — complete
- **CSR** has inline types within component files — no domain separation
- `src/lib/Calculations.ts` is the single source of truth for financial calculations, used by invoice domain

### 4. Dead Code

| File | Lines | Status |
|------|-------|--------|
| `src/pages/Dashboard.tsx` | 0 | Empty file — `DashboardRedesign.tsx` is active |
| `src/components/layout/sidebar.tsx` | 715 | shadcn sidebar primitive — NOT used by `Layout.tsx` |
| `src/styles/App.css` | ~50 | Not imported anywhere |
| `src/components/document/FormNavigationItem.tsx` | ~80 | Defined but not imported in any production code |
| `src/components/layout/FormNavigation.tsx` | ~120 | Only referenced by `FormNavigationItem` — both dead |

### 5. Oversized Files (600+ lines)

| File | Lines | Issue |
|------|-------|-------|
| `ItemLibraryAdvancedCleanupPanel.tsx` | 1038 | Extreme bloat — mixed concerns |
| `NewInvoice.tsx` | 872 | Form + logic + layout in one file |
| `EditInvoice.tsx` | 849 | Near-duplicate of NewInvoice |
| `CsrFormScreen.tsx` | 861 | All CSR form logic inline |
| `DesktopSidebar.tsx` | 638 | Navigation + business context mixed |
| `MultiFilter.tsx` | 852 | Reference template (not production) |
| `Sortable.tsx` | 151 | Reference template |

**25 files total** exceed the 600-line bloat threshold.

### 6. PDF Rendering Diversity

| Module | Approach |
|--------|----------|
| Invoice | Dual system: `components/pdf/` (legacy) + `components/pdf-new/` (current) |
| Quotation | Reuses invoice PDF via quotation domain's preview functions |
| Waybill | 6 standalone PDF templates in `components/waybill/WaybillPdf*.tsx` |
| CSR | 4 inline template variants in `CSRPreviewContent.js` |
| BOQ | Delegates to shared `TableDocumentPdfDocument` |
| RFQ | Delegates to shared `TableDocumentPdfDocument` |

### 7. Mobile Support Fragmentation

| Module | Mobile Components | Status |
|--------|------------------|--------|
| Invoice | `MobileItemCard`, `MobileGroupCard`, `mobileFormPrimitives` | Full mobile support |
| Waybill | Reuses invoice's `mobileFormPrimitives` | Partial reuse |
| CSR | Some mobile-adaptive styling inline | Partial |
| BOQ | None | None |
| RFQ | None | None |

---

## Evidence

- All file sizes confirmed via `Get-ChildItem -Recurse -Name -Filter *.tsx` and line counting
- Import relationships confirmed via grep for `from "@/components/"` and `from "@/domain/"`
- Dead code confirmed by checking imports — files not imported anywhere in production code
- PDF diversity confirmed by examining file listing per module directory

---

## Risks

1. **Maintenance cost**: 4 form systems means bugs must be fixed in 4 places
2. **UX inconsistency**: Users get different interactions per module (especially CSR vs invoice form)
3. **Refactoring difficulty**: Bloat in `NewInvoice.tsx` and `CsrFormScreen.tsx` makes them risky to touch
4. **Onboarding friction**: New developers must learn 4 form patterns
5. **Dead code accumulation**: `sidebar.tsx` (715 lines) misleads new devs into thinking it's used

---

## Recommendations

1. **Extract `SharedDocumentForm` to cover CSR** — CSR's form is the biggest divergence; unify it
2. **Unify column management** — Create a shared `ColumnConfig` type in `src/domain/common/`
3. **No-touch zoning** — Mark `Calculations.ts`, waybill prefix engine, and DB constraints as no-touch
4. **Dead code removal** — Delete `Dashboard.tsx`, `App.css`, `sidebar.tsx`, `FormNavigationItem.tsx`, `FormNavigation.tsx`
5. **File splitting** — Split `NewInvoice.tsx` (872 lines) into form shell + section sub-components

---

## Priority

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Dead code removal | Low | Minimal | High |
| Extract CSR → SharedDocumentForm | High | Medium | High |
| Unify column management | High | Large | Medium |
| File splitting (invoice, CSR) | Medium | Medium | Medium |
| Legacy PDF system cleanup | Low | Medium | Low |

---

## Affected Files

- `src/pages/NewInvoice.tsx`, `EditInvoice.tsx` — split
- `src/components/csr/CsrFormScreen.tsx` — unify
- `src/components/layout/sidebar.tsx` — remove
- `src/components/document/FormNavigationItem.tsx` — remove
- `src/pages/Dashboard.tsx` — remove
- `src/styles/App.css` — remove
- `src/domain/invoice/types.ts` — extract ColumnConfig
- `src/domain/table-document/types.ts` — align ColumnConfig

---

## Future Considerations

- **Document conversion** module (`src/domain/document/conversion/`) can spawn waybills and CSRs from invoices — this cross-module logic should be well-tested
- **New module adoption** (expense tracking, profit/loss reporting) should inherit the unified form pattern, not create a 5th architecture
- **Monorepo extraction** risk: domain modules are tightly coupled; consider eventual separation
