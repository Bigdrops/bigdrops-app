# Component Inventory

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Status:** Complete as of June 2026

---

## Executive Summary

BIGDROPS contains approximately **400+ React components** across `src/components/`, `src/pages/`, `src/domain/`, and source helpers. This document inventories the major component categories: **30+ UI primitives**, **33 shared document view components**, **49 page components**, and **module-specific form/view components** across 10 document modules. Key findings: 3 unused components (sidebar, FormNavigationItem, FormNavigation), 1 missing component library module (input-group, button-group), and significant component duplication in form patterns.

---

## Scope

- All components in `src/components/ui/` (shadcn-style primitives)
- All components in `src/components/reui/` (custom reusable components)
- All shared document view components in `src/components/document-view/shared/`
- All page components in `src/pages/`
- Module-specific components per document type
- Layout components, dashboard components, settings components

---

## Methodology

1. Directory listing of all component directories
2. Read + classify every component file
3. Check import usage for dead code detection
4. Compare component count across modules

---

## UI Primitive Components (`src/components/ui/`)

| Component | Lines | Radix-Based | Notes |
|-----------|-------|-------------|-------|
| `button.tsx` | ~120 | No | Variants: default, destructive, outline, secondary, ghost, link |
| `input.tsx` | ~50 | No | ForwardRef wrapper |
| `label.tsx` | ~25 | Yes (@radix-ui/react-label) | |
| `select.tsx` | ~180 | Yes (@radix-ui/react-select) | Full keyboard nav |
| `dialog.tsx` | ~80 | Yes (@radix-ui/react-dialog) | |
| `alert-dialog.tsx` | ~70 | Yes (@radix-ui/react-alert-dialog) | |
| `sheet.tsx` | ~120 | Yes (@radix-ui/react-dialog) | Used for mobile sidebar, FAB |
| `dropdown-menu.tsx` | ~100 | Yes (@radix-ui/react-dropdown-menu) | |
| `popover.tsx` | ~50 | Yes (@radix-ui/react-popover) | |
| `tooltip.tsx` | ~40 | Yes (@radix-ui/react-tooltip) | |
| `switch.tsx` | ~40 | Yes (@radix-ui/react-switch) | |
| `tabs.tsx` | ~50 | Yes (@radix-ui/react-tabs) | |
| `scroll-area.tsx` | ~40 | Yes (@radix-ui/react-scroll-area) | |
| `badge.tsx` | ~30 | No | Variants |
| `card.tsx` | ~60 | No | Card, CardHeader, CardContent, etc. |
| `avatar.tsx` | ~40 | Yes (@radix-ui/react-avatar) | |
| `separator.tsx` | ~20 | Yes (@radix-ui/react-separator) | |
| `table.tsx` | ~60 | No | Table, Header, Body, Row, Cell, etc. |
| `skeleton.tsx` | ~15 | No | Loading skeleton |
| `command.tsx` | ~150 | Yes (cmdk) | Combobox/command palette |
| `skeleton.tsx` | ~15 | No | |
| `sidebar.tsx` | 715 | Yes | **UNUSED** in production — Layout.tsx uses custom DesktopSidebar |
| `OpenInAIDropdown.tsx` | ~80 | No | Uses framer-motion |
| `circuit-board.tsx` | ~90 | No | Uses framer-motion for loading animation |
| `Sheet.tsx` (duplicate?) | Check | — | Verify vs `sheet.tsx` |

---

## Custom Reusable Components (`src/components/reui/`)

| Component | Lines | Notes |
|-----------|-------|-------|
| `sortable/` | ~200 | Custom dnd-kit wrapper — **unused** in production forms |
| `badge.tsx` | ~50 | Additional badge variants |
| `alert.tsx` | ~60 | Alert component |
| `filters/` | ~300 | Custom filter system with Filter component |
| `data-grid/` | ~500 | DataGrid, DataGridTable, DataGridPagination, DataGridColumnHeader |

---

## Shared Document View Components (`src/components/document-view/shared/`)

33 shared components including:
- `DocumentImageGrid` — Image gallery display
- `DocumentOperatingStream` — Operational details
- `DocumentPartyCard` — Client/party info card
- `DocumentSummaryCard` — Summary metrics
- `DocumentTable` — Items table
- `DocumentTimeline` — Timeline/history
- `DocumentStatusTimeline` — Status progression
- `DocumentPdfPreview` — PDF preview display
- `DocumentDownloadButton` — Download action
- `DocumentShareDialog` — Share action
- Various section headers, metadata displays

**Consistency**: These 33 components provide a unified view layer across all 7 document types.

---

## Layout Components (`src/components/layout/`)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `DesktopSidebar.tsx` | 638 | Persistent desktop navigation |
| `MobileSidebar.tsx` | ~250 | Mobile drawer navigation |
| `MobileBottomNav.tsx` | ~120 | Mobile bottom tab bar |
| `MobilePageHeader.tsx` | ~80 | Mobile page title bar |
| `MobileSalesSheet.tsx` | ~100 | Mobile sales actions sheet |
| `MobileMoreSheet.tsx` | ~120 | Mobile overflow menu |
| `ModuleShell.tsx` | ~400 | List page shell with filters, toolbar |
| `navData.ts` | ~150 | Navigation item definitions |
| `sidebar.tsx` | 715 | **UNUSED** (shadcn sidebar primitive) |

---

## Page Components (`src/pages/`)

### Document List Pages (13)
| Page | Lines | Key Features |
|------|-------|-------------|
| DashboardRedesign.tsx | ~250 | Stats, activity, quick tiles |
| Invoices.tsx | 356 | Archive, delete, clone, spawn children |
| Quotations.tsx | 13 | Thin QuotationList wrapper |
| Waybills.tsx | 255 | Tabs (all/internal/external), export |
| CSR.tsx | 347 | Linked docs, projects, offline sync |
| Boqs.tsx | 13 | Thin BoqList wrapper |
| Rfqs.tsx | 13 | Thin RfqList wrapper |
| Projects.tsx | 246 | Archive, export, filter |
| Clients.tsx | 276 | Archive, delete, caching |
| Reports.tsx | 563 | 5 tabs: Overview, Receivables, Collections, Projects, Tax |
| ComplianceHub.tsx | 358 | WHT, VAT, tax filings, reminders |
| LifetimeDataHub.tsx | 305 | Export hub |

### Document View Pages (9)
| Page | Notes |
|------|-------|
| ViewInvoice, ViewQuotation, ViewWaybill, ViewCSR | Standard view pattern |
| ViewBoq, ViewRfq | Table-document view pattern |
| ClientDetail, ProjectDetail | Detail + linked documents |
| ProjectDocumentView | Document viewer in project context |

### Create/Edit Pages (15)
| Page | Lines | Form Pattern |
|------|-------|-------------|
| NewInvoice | 872 | SharedDocumentForm |
| EditInvoice | 849 | SharedDocumentForm |
| NewQuotation | ~350 | SharedDocumentForm |
| EditQuotation | ~350 | SharedDocumentForm |
| NewWaybill | ~200 | Waybill overlay |
| EditWaybill | ~200 | Waybill overlay |
| NewCSR | ~300 | Custom CsrFormScreen |
| EditCSR | ~300 | Custom CsrFormScreen |
| NewBoq | ~200 | Tabbed editor (Details/Rows/Output) |
| EditBoq | ~200 | Tabbed editor |
| NewRfq | ~200 | Tabbed editor |
| EditRfq | ~200 | Tabbed editor |
| NewProject | ~200 | Custom project form |
| AddClient | ~150 | Simple ClientForm |
| EditClient | ~150 | Simple ClientForm |

### Auth & Other (5)
| Page | Notes |
|------|-------|
| Login, ResetPassword | Standard auth forms |
| PendingApproval | Approval gate (uses reduced-motion style tag) |
| Settings | 12-section orchestrator |
| debug/ErrorsDashboard | Dev-only error viewer |

---

## Module-Specific Components

### Invoice (`src/components/invoice/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `InvoiceNotesTermsSection.tsx` | ~120 | Rich text notes + terms |
| `PaymentSection.tsx` | ~80 | Payment details |
| `PaymentTermsSection.tsx` | ~60 | Payment terms config |
| `CommercialTermsSection.tsx` | ~70 | Commercial terms |
| `TotalsPanel.tsx` | ~100 | Running total display |
| `MobileItemCard.tsx` | ~350 | Mobile line item card with drag |
| `MobileGroupCard.tsx` | ~150 | Mobile grouped items |
| `mobileFormPrimitives.tsx` | ~200 | Shared mobile form helpers |

### Quotation (`src/components/quotation/`)
Thin wrapper — reuses invoice components and `SharedDocumentForm`.

### Waybill (`src/components/waybill/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `WaybillFormOverlay.tsx` | ~300 | Overlay form container |
| `WaybillGatewayOverlay.tsx` | ~200 | Type selector overlay |
| `WaybillPdfPreview.tsx` | ~100 | Preview shell |
| `WaybillPdfDocument-External.tsx` | ~200 | External PDF template |
| `WaybillPdfDocument-Simplified.tsx` | ~150 | Simplified PDF template |
| `WaybillPdfDocument-Table.tsx` | ~200 | Table-style PDF |
| WaybillPdf + more | ~ | Additional PDF variants |
| `waybillUtils.ts` | ~100 | Utility functions |

### CSR (`src/components/csr/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `CsrFormScreen.tsx` | 861 | Full form (bloated, inline) |
| `CsrTemplateCarousel.tsx` | 123 | Horizontal template picker |
| `CSRPreviewPanel.tsx` | ~350 | Template selection grid |
| `CSRPreviewContent.js` | ~300 | Template variants (plain JS) |
| `CsrPdfDocument.tsx` | ~100 | PDF rendering |

### BOQ (`src/components/boq/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `BoqForm.tsx` | ~200 | 3-tab form shell |
| `BoqEditor.tsx` | ~150 | Side-by-side editor/preview |
| `BoqPreview.tsx` | ~50 | Thin proxy to TableDocumentPreview |
| `BoqPdfDocument.tsx` | ~50 | Thin proxy to TableDocumentPdfDocument |

### RFQ (`src/components/rfq/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `RfqForm.tsx` | ~200 | 3-tab form shell |
| `RfqEditor.tsx` | ~150 | Editor/preview split |
| `RfqPreview.tsx` | ~50 | Thin proxy |
| `RfqPdfDocument.tsx` | ~50 | Thin proxy |
| `RfqExportView.tsx` | ~100 | Export view |
| `RfqExportController.tsx` | ~100 | Export controls |
| `RfqStyleControls.tsx` | ~80 | Style customization |
| `RfqItemCard.tsx` | ~80 | Item display card |
| `RfqImagePreviewGrid.tsx` | ~80 | Image grid |
| `RfqImportSheet.tsx` | ~150 | Import sheet |
| `RfqCustomizationPanel.tsx` | ~100 | Customization panel |

### Client (`src/components/client/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `ClientForm.tsx` | ~80 | Simple form with shadcn Input |

### Project (`src/components/project/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `ProjectDocumentSheet.tsx` | ~150 | 3-step wizard |
| `ProjectDocumentTypeSelector.tsx` | ~80 | Document type chooser |
| `ProjectDocumentStep3Review.tsx` | ~80 | Review step |
| `ProjectDocumentCard.tsx` | ~60 | Document card |
| `ProjectOperatingStream.tsx` | ~150 | Operating stream detail |
| `ProjectLinkDialog.tsx` | ~100 | Document link dialog |
| `ProjectDocumentGroups.tsx` | ~80 | Document grouping |
| `ProjectDetailStats.tsx` | ~60 | Stats display |
| `ProjectDetailHeader.tsx` | ~60 | Header section |
| `ProjectActionRail.tsx` | ~80 | Action buttons |

### Items (`src/components/items/`)
| Component | Purpose |
|-----------|---------|
| `JsonItemsImportSheet.tsx` | JSON import for items |

---

## Dead Components

| Component | Location | Lines | Reason |
|-----------|----------|-------|--------|
| `sidebar.tsx` | `src/components/ui/sidebar.tsx` | 715 | shadcn sidebar — Layout.tsx uses custom DesktopSidebar instead |
| `FormNavigationItem.tsx` | `src/components/document/FormNavigationItem.tsx` | ~80 | Not imported anywhere |
| `FormNavigation.tsx` | `src/components/layout/FormNavigation.tsx` | ~120 | Only used by FormNavigationItem (also dead) |

---

## Gaps (Missing Components from Templates)

| Template Pattern | Target Module | Status |
|-----------------|---------------|--------|
| `@/components/ui/input-group` | Rich text toolbar | Module exists in template, **not in production** |
| `@/components/ui/button-group` | Filter/sort action bar | Module exists in template, **not in production** |
| `@/components/reui/sortable` | Drag-to-reorder items | Module exists but **unused** in production |
| FAB with staggered items | Dashboard quick actions | **No equivalent** in production |
| Canvas signature pad | Waybill signature | **No equivalent** (uses lib instead) |
| Animated sidebar | Desktop navigation | **No equivalent** (static CSS only) |

---

## Evidence

- All component existence confirmed via `Get-ChildItem` on each directory
- Dead code confirmed via grep for import statements
- Line counts from `bun run audit:load` and manual inspection
- Template gaps confirmed by checking for import existence in production

---

## Recommendations

1. **Remove dead components** — Delete `sidebar.tsx`, `FormNavigationItem.tsx`, `FormNavigation.tsx`
2. **Create `input-group` module** — Build `@/components/ui/input-group` from template, use in rich text toolbar
3. **Create `button-group` module** — Build `@/components/ui/button-group` from template, use in filter bars
4. **Adopt `reui/sortable`** — Migrate `FormLineItems.tsx` from raw @dnd-kit to `reui/sortable`
5. **Extract form overrides** from `NewInvoice.tsx` (872 lines) and `CsrFormScreen.tsx` (861 lines) into sub-components
6. **Convert `CSRPreviewContent.js`** to `.tsx` for type safety

---

## Priority

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Remove dead code | Low | Minimal | High |
| Create input-group module | Medium | Small | High |
| Create button-group module | Medium | Small | High |
| Adopt reui/sortable | Low | Medium | Medium |
| Split oversized form files | High | Medium | Medium |
| Convert CSRPreviewContent to TSX | Low | Small | Low |

---

## Affected Files

- `src/components/ui/sidebar.tsx` — delete
- `src/components/document/FormNavigationItem.tsx` — delete
- `src/components/layout/FormNavigation.tsx` — delete
- `src/components/ui/input-group.tsx` — create
- `src/components/ui/button-group.tsx` — create
- `src/components/document/FormLineItems.tsx` — migrate to reui/sortable
- `src/components/csr/CSRPreviewContent.js` — rename to .tsx + add types
- `src/pages/NewInvoice.tsx` — split
- `src/components/csr/CsrFormScreen.tsx` — split + unify

---

## Future Considerations

- Component library should be documented with Storybook or similar
- New modules should be required to use UI primitives, not create their own Section/Input/Select wrappers
- Consider extracting a `@/components/document-form` shared form section library
