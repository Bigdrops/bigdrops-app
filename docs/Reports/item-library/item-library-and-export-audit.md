# Item Library & Export/Import Systems — Architectural Audit

> **Date:** 2026-06-30  
> **Scope:** READ-ONLY architectural inspection  
> **Status:** Complete  

---

## 1. Item Library Architecture (39 files)

### 1.1 Overview

The Item Library subsystem manages a centralized catalog of standard items (`item_catalog` table) used across invoices, quotations, and other documents. It includes alias normalization, duplicate detection, merge workflows, cleanup operations, and suggestion engines.

### 1.2 Database Schema (`20260520090005_items_catalog.sql`)

| Table | Purpose |
|---|---|
| `item_catalog` | Master catalog items: `id`, `name`, `normalized_name`, `standard_price`, `is_active`, `notes`, `metadata` |
| `item_aliases` | Alternative names for items: `item_id`, `alias_text`, `normalized_alias_text`, `is_active`, `is_retired`, `source` |
| `item_import_batches` | Import batch tracking: `status` (pending/processing/completed/failed), `payload`, `summary` |
| `item_merge_log` | Merge audit trail: `batch_id`, `from_item_id`, `to_item_id`, `action`, `details` |

Cross-document FKs: `invoice_items.item_id` and `quotation_items.item_id` reference `item_catalog(id)`.

**Key function:** `get_item_suggestions(search_text, result_limit)` — ranked search across both catalog names and aliases using `normalize_item_text()` (lowercase, trim, normalize `mm²`→`sqmm`, `&`→`and`, collapse whitespace).

### 1.3 Type Definitions

| File | Content |
|---|---|
| `types/itemLibrary.ts` (346 lines) | Core types: `CatalogItem`, `ItemAliasRow`, `ImportBatch`, `MergeLog`, `CatalogCleanupBatchExportPayload`, `FlaggedCleanupBatchExportPayload`, `CleanupApplyProposal`, `CleanupApplyResult`, `ItemLibraryMergeRequest`, `ItemLibraryFilterType`, `ItemLibraryViewMode` |
| `types/index.ts` | Re-exports |

### 1.4 Repository Layer

| File | Content |
|---|---|
| `repositories/itemLibraryRepository.ts` | CRUD operations: `searchItems`, `searchItemSuggestions`, `getItemById`, `getItemHistory`, `getItemAliases`, `addAlias`, `retireAlias`, `createItem`, `updateItemStandardPrice`, `updateItemNotes`, `mergeItems`, `getMergeHistory`, `getActiveItemsCount`, `getDuplicateGroups` |
| `repositories/importedItemFallback.ts` | Fallback path: `importItemFromCatalog`, `findOrCreateCatalogItem` — called when an item from import doesn't exist in catalog yet |
| `repositories/index.ts` | Re-exports |

### 1.5 Domain Layer

| File | Purpose |
|---|---|
| `domain/suggestionRanking.ts` | Client-side reranking of item suggestions |
| `domain/itemMergePlanning.ts` | Merge plan generation from duplicate groups |
| `domain/itemCleanupExchange.ts` | **Flagged/Cleanup batch export format** — serializes `FlaggedCleanupBatchExportPayload` for external cleanup; deserializes `CatalogCleanupBatchExportPayload` after cleanup |
| `domain/invoiceSuggestionSelection.ts` | UI logic for selecting suggestion rows |
| `domain/invoiceSuggestionPriceContext.ts` | Price context (standard_price vs last_sold_price) display |
| `domain/duplicateDetection.ts` | Groups items into duplicate groups based on `normalized_name` collisions |
| `domain/cleanupExportPayload.ts` | Builds `getCleanupExportItemIds` for the catalog cleanup workflow |
| `domain/cleanupApply.ts` | `getSyntheticCleanupItemIdFailure` — validates cleanup results |

### 1.6 Pages & Hooks

| File | Content |
|---|---|
| `pages/ItemLibraryPage.tsx` (630 lines) | Main page: search + catalog/cleanup workflow modes, detail panel, duplicate review, merge history, status strip, advanced cleanup panel |
| `hooks/index.ts` | Custom hooks: `useItemAliases`, `useItemHistoryDetail`, `useItemHistoryList`, `useItemMerge`, `useItemMergeHistory`, `useItemFilterCounts` |

### 1.7 Components

| File | Purpose |
|---|---|
| `ItemLibraryAdvancedCleanupPanel` | Bulk cleanup UI |
| `ItemLibraryDetailPanel` | Single item detail view |
| `ItemLibraryDuplicateReviewPanel` | Review and merge duplicate groups |
| `ItemLibraryListPanel` | Filterable/paginated catalog list |
| `ItemLibraryMergeHistoryPanel` | Historical merge log |
| `ItemLibraryStatusStrip` | Summary status bar |

### 1.8 Item Library Export/Import Subsystem

The Item Library has its **own separate export/import** mechanism specifically for catalog cleanup:

- **Export:** `domain/cleanupExportPayload.ts` + `domain/itemCleanupExchange.ts` — serializes flagged items and aliases into a JSON payload (`CatalogCleanupBatchExportPayload`)
- **Import:** `domain/itemCleanupExchange.ts` — deserializes batches, maps aliases, validates structure
- **Not connected** to the shared `ContextualExportDropdown` or the generic import domain pipeline (`domain/import/*`)
- Uses a bespoke exchange format (not the JSON Import Standard from `docs/standard/json-import-standard.md`)

---

## 2. Shared Export System (22 files)

### 2.1 Architecture Overview

Two parallel CSV export paths exist:

**Path A — Single-Document CSV** (legacy, specific to Invoices and Quotations)

| File | Purpose |
|---|---|
| `components/invoice/exportInvoiceCsv.ts` | Builds + downloads a single invoice's item rows as CSV with totals section |
| `components/quotation/exportQuotationCsv.ts` | Same pattern for quotations |

These are called from ViewInvoice/ViewQuotation pages for individual document exports.

**Path B — Shared Bulk Export** (ContextualExportDropdown + compileToCSV)

| File | Purpose |
|---|---|
| `components/export/ContextualExportDropdown.tsx` (132 lines) | Inline dropdown UI, maps domains and formats |
| `components/export/ExportDropdownRow.tsx` | Row component for export options |
| `utils/exportCompilers.ts` (271 lines) | `compileToCSV()`, `compileToJSON()`, `compileToHTML()` — shared compilation |
| `utils/exportSchemas.ts` (113 lines) | Domain-specific field whitelists per module |
| `services/exportFetchers.ts` (238 lines) | `fetchExportDataset()`, `getExportData()` — parametric DB extraction |
| `types/exportHub.ts` | `ExportModuleDomain`, `ExportFormat`, `InheritedExportContext` |

### 2.2 Supported Export Formats per Module

| Module | CSV_SUMMARY | CSV_DETAIL | JSON_RAW |
|---|---|---|---|
| INVOICES | ✅ | — | ✅ |
| QUOTATIONS | ✅ | — | ✅ |
| WAYBILLS | ✅ | — | ✅ |
| PROJECTS | ✅ | — | ✅ |
| RFQS | ✅ | — | ✅ |
| BOQS | ✅ | — | ✅ |
| CLIENTS | ✅ | — | ✅ |
| CSR | — | — | — |

- `exportFetchers.ts` handles nested line-item relationships for INVOICES, QUOTATIONS, and BOQS (`DOMAINS_WITH_ITEMS` set).
- Waybill pages pass `supportedFormats={['CSV_SUMMARY', 'JSON_RAW']}`.
- CSR has no export adapter fetcher/compiler support currently.

### 2.3 Data Fetching Pipeline (`exportFetchers.ts`)

1. `TABLE_MAP` routes export domain → DB table name
2. `getExportData()` → `fetchExportDataset()` builds Supabase query
3. Parametric filter application: `clientId`, `statuses`, `dateRange`, `amountRange`
4. No pagination limits — full dataset extraction
5. `DOMAINS_WITH_ITEMS` (INVOICES, QUOTATIONS, BOQS) join their items tables
6. Sort by configurable `sortBy`/`sortDirection` (default: `created_at` desc)

### 2.4 Compilation Pipeline (`exportCompilers.ts`)

- **CSV:** `compileToCSV()` — flat field extraction per schema, escape CSV values
- **JSON:** `compileToJSON()` — full record dump as JSON array
- **HTML:** `compileToHTML()` — styled HTML table (not widely used)

### 2.5 Waybill Export Status

The Waybills page (`pages/Waybills.tsx:169`) uses `ContextualExportDropdown` with `CSV_SUMMARY` and `JSON_RAW`. There is **no** waybill-specific CSV builder (unlike invoices/quotations which have `exportInvoiceCsv.ts`/`exportQuotationCsv.ts`). The shared `CSV_SUMMARY` format provides a flat-field export suitable for waybills.

---

## 3. Shared Import Domain (14+ files)

### 3.1 Pipeline Architecture

```
JSON/CSV Input
    ↓
[Prompt (AI)]       ← generateImportPrompt()
    ↓
Parse & Schema      ← parse.ts, schema.ts (Zod)
    ↓
Normalize           ← normalize.ts (collision detection, type coercion)
    ↓
Validate            ← validate.ts (row count, description required)
    ↓
Resolve Columns     ← resolve.ts (unknown columns → create/map/drop)
    ↓
Detect Overwrites   ← overwrite.ts (Update mode conflict detection)
    ↓
Apply Result        ← apply.ts (Add/Update item generation)
    ↓
Adapter             ← importAdapter.ts per module (calls makeEmptyItem, etc.)
```

### 3.2 Core Import Domain Files

| File | Lines | Purpose |
|---|---|---|
| `domain/import/types.ts` | 150 | `ParsedImportRoot`, `NormalizedImportData`, `ValidatedImportData`, `ResolvedImportData`, `ApplyImportResult`, `ImportMode`, etc. |
| `domain/import/schema.ts` | 90 | Zod schemas: `ImportRootSchema`, `ImportItemSchema`, `ExtraChargeSchema`, `ImportGroupSchema` |
| `domain/import/parse.ts` | 44 | `parseImportJson()` — JSON parse + Zod schema validation |
| `domain/import/normalize.ts` | 207 | Field normalization: snake_case conversion, collision detection, dangerous key blocking, type inference, `custom_fields` unpacking, group extraction |
| `domain/import/validate.ts` | 87 | Row count limits (MAX_IMPORTED_ROWS), description requirement (Add mode), row_number validation (Update mode) |
| `domain/import/resolve.ts` | 120 | Unknown column resolution: alias matching → create/map/drop decisions, custom column generation |
| `domain/import/overwrite.ts` | 60 | `detectOverwriteTargets()` — flags existing data that would be overwritten in Update mode |
| `domain/import/apply.ts` | 252 | Applies resolved import to document state: Add (appends with group handling) or Update (replaces by row_number) |
| `domain/import/promptGenerator.ts` | — | Generates AI prompt with column schema, mode, and discipline block per JSON Import Standard |
| `domain/import/tableState.ts` | — | Table state helpers (`hasMeaningfulStandardRows`) |
| `domain/import/utils.ts` | — | Shared utilities: column aliases, number parsing, text normalization |

### 3.3 Import Adapters per Module

| Adapter | File |
|---|---|
| Invoice | `domain/invoice/importAdapter.ts` (39 lines) |
| Quotation | `domain/quotation/importAdapter.ts` |
| RFQ | `domain/rfq/importAdapter.ts` |
| Waybill (External) | `domain/waybill/externalWaybillImportAdapter.ts` |
| Waybill (Internal) | `domain/waybill/internalWaybillImportAdapter.ts` |

Each adapter exports:
- `documentType` — domain identifier
- `prompts(columns, mode, count)` → AI prompt builder
- `createItem()` → `makeEmptyItem()` / equivalent
- `applyResult({ result, setColumns, setItems, ... })` → applies `ApplyImportResult` to document state

The Waybill module has **two separate adapters** for External vs Internal waybills, as prescribed by the JSON Import Standard.

### 3.4 JSON Import Standard (`docs/standard/json-import-standard.md`)

Key requirements:
1. Global AI prompt discipline block (verbatim preamble)
2. Adapter pattern: `src/domain/<module>/importAdapter.ts`
3. Sub-type adapters for modules with distinct field sets
4. `custom_fields` sub-object for extra attributes
5. Groups restricted to Invoice/Quotation only
6. Strict null-for-missing, JSON-only output rules
7. Each adapter must export `documentType`, `prompts`, `createItem`, `applyResult`

---

## 4. Query Platform / Module Adapters (`config/moduleAdapters.ts` — 712 lines)

### 4.1 Registry

7 registered adapters: invoices, quotations, waybills, projects, csr, rfqs, boqs

### 4.2 Architecture Pattern

- **Cache-first:** `readListCache()` with `isListCacheFresh()` — 5-minute TTL per module
- **Cache bypass:** `hasActiveFilters()` — non-default filters skip cache
- **Dual filtering pattern:** Server-side filters (via Supabase `.eq()`, `.in()`, `.gte()`) for simple cases; client-side local filtering (`filterInvoicesLocally`, `filterFinancialLocally`, etc.) for computed states
- **Computed status resolution:**
  - Invoice: DB stores only `"unpaid"`/`"paid"`; `PARTIALLY PAID` and `OVERDUE` computed client-side from payments array and due_date
  - Quotation: `OVERDUE` computed from `valid_until` date
- **Adaptive select clauses:** Each adapter selects only the fields needed for list view, with relationship joins (e.g., invoices include `payments(cash_amount, wht_amount, amount, voided_at)`)

---

## 5. Cross-System Relationships

### 5.1 Document → Document

| Relationship | Mechanism |
|---|---|
| Waybill → Invoice | `waybills.invoice_id` FK, managed via `AttachExistingDocumentSheet` |
| Waybill → Project | `waybills.project_id` FK, managed via `ProjectLinkDialog` |
| Invoice → Project | `invoices.project_id` |
| Quotation → Project | `quotations.project_id` |
| CSR → Invoice | `csrs.linked_invoice_id` |
| CSR → Project | `csrs.project_id` |
| RFQ → Project | `rfqs.project_id` |
| BOQ → Project | `boqs.project_id` |

### 5.2 Document → Item Catalog

| Relationship | Mechanism |
|---|---|
| Invoice Item → Catalog | `invoice_items.item_id` FK → `item_catalog.id` |
| Quotation Item → Catalog | `quotation_items.item_id` FK → `item_catalog.id` |

Enforced at DB level via FK constraints (migration `20260520090005_items_catalog.sql:89-90`).

### 5.3 Import Flow

1. User selects JSON import on a document form
2. AI prompt generated via `generateImportPrompt()` with column schema + mode
3. AI returns JSON matching `ImportRootSchema`
4. `parseImportJson()` validates with Zod
5. Pipeline: Normalize → Validate → Resolve Columns → Apply
6. Module adapter bridges result → document state (`setItems`, `setColumns`, etc.)

---

## 6. Key Architectural Observations

### 6.1 Two Separate CSV Export Paths Exist

- **Single-document:** `exportInvoiceCsv.ts` / `exportQuotationCsv.ts` — specific to View pages, includes totals section
- **Bulk:** `ContextualExportDropdown` + `compileToCSV()` — shared pipeline, flat field set
- These are **not connected** — different code paths, different headers, different callers

### 6.2 Item Library Export/Import Is Self-Contained

The Item Library's cleanup export/import:
- Has its **own exchange format** (`itemCleanupExchange.ts` — flagged/cleanup batch payloads)
- Does **not** use the shared `ContextualExportDropdown` or the generic import domain
- Operates independently of the document JSON import system
- Is triggered from the ItemLibraryPage cleanup workflow, not from document forms

### 6.3 Waybill Has Sub-Type Import Adapters

Waybill is the only document module with **two separate import adapters** (external/internal), as prescribed by the JSON Import Standard. Invoice, Quotation, and RFQ each have a single adapter.

### 6.4 Computed Statuses Are Client-Side Only

- `PARTIALLY PAID` and `OVERDUE` for invoices are computed in JavaScript, not stored in DB
- The `resolveInvoiceStatusFilter()` function in `moduleAdapters.ts` does this by summing the non-voided payments array
- Quotation `OVERDUE` is computed from `valid_until` date
- This means queries that filter by these derived statuses must fetch a superset and filter client-side

### 6.5 CSR Export Gap

CSR (`client_service_records`) is registered in `TABLE_MAP` but:
- Has no entry in `exportSchemas.ts` field whitelists
- Has no export compiler support
- Is not listed in any page's `ContextualExportDropdown` invocation

---

## 7. File Inventory

### Item Library (~39 files)

| Category | Count | Files |
|---|---|---|
| Types | 2 | `types/itemLibrary.ts`, `types/index.ts` |
| Repositories | 3 | `repositories/itemLibraryRepository.ts`, `repositories/importedItemFallback.ts`, `repositories/index.ts` |
| Domain | 8 | `suggestionRanking.ts`, `itemMergePlanning.ts`, `itemCleanupExchange.ts`, `invoiceSuggestionSelection.ts`, `invoiceSuggestionPriceContext.ts`, `duplicateDetection.ts`, `cleanupExportPayload.ts`, `cleanupApply.ts` |
| Hooks | 1+ | `hooks/index.ts` (6 hooks) |
| Pages | 1 | `pages/ItemLibraryPage.tsx` |
| Components | 6 | `ItemLibraryAdvancedCleanupPanel`, `ItemLibraryDetailPanel`, `ItemLibraryDuplicateReviewPanel`, `ItemLibraryListPanel`, `ItemLibraryMergeHistoryPanel`, `ItemLibraryStatusStrip` |
| Migration | 1 | `20260520090005_items_catalog.sql` |

### Export System (~22 files)

| Category | Count | Files |
|---|---|---|
| Shared Components | 2 | `ContextualExportDropdown.tsx`, `ExportDropdownRow.tsx` |
| Shared Utils | 3 | `exportCompilers.ts`, `exportSchemas.ts`, `exportFetchers.ts` |
| Types | 1 | `exportHub.ts` |
| Single-Doc CSV | 2 | `exportInvoiceCsv.ts`, `exportQuotationCsv.ts` |

### Import System (~14 files)

| Category | Count | Files |
|---|---|---|
| Domain Pipeline | 8 | `types.ts`, `schema.ts`, `parse.ts`, `normalize.ts`, `validate.ts`, `resolve.ts`, `overwrite.ts`, `apply.ts` |
| Domain Support | 2+ | `promptGenerator.ts`, `tableState.ts`, `utils.ts` |
| Module Adapters | 5 | `invoice/importAdapter.ts`, `quotation/importAdapter.ts`, `rfq/importAdapter.ts`, `waybill/externalWaybillImportAdapter.ts`, `waybill/internalWaybillImportAdapter.ts` |
| Standard | 1 | `docs/standard/json-import-standard.md` |

### Query Platform

| Category | Count | Files |
|---|---|---|
| Module Adapters | 1 | `config/moduleAdapters.ts` (712 lines, 7 adapters) |
| Filter Config | 1 | `config/filterCapabilities.ts` |
| Context | 1 | `context/DocumentQueryContext.tsx` |
| Types | 1 | `types/queryPlatform.ts` |
