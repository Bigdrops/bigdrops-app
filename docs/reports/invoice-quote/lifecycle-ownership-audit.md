# Lifecycle Ownership Audit — Invoice vs Quotation

> Exact file-level mapping of who owns each lifecycle stage across both document types.

---

## Legend

| Owner | Meaning |
|---|---|
| **PAGE** | Lifecycle stage is handled inline in the page component |
| **FORM** | Lifecycle stage is handled in a standalone form component |
| **HOOK** | Lifecycle stage is handled in a custom React hook |
| **DOMAIN** | Lifecycle stage delegates to a domain function |
| **COMPONENT** | Lifecycle stage is handled in a reusable UI component |
| **ACTION** | Lifecycle stage is handled in a pure action/helper file |

---

## 1. Init (document creation / number generation)

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| PAGE | `src/pages/NewInvoice.tsx:244` | `getNextInvoiceNumber()` called inline on mount |
| DOMAIN | `src/domain/documentConversion.ts:8` | `getNextInvoiceNumber()` — queries all existing numbers, finds max, increments |
| PAGE | `src/pages/Invoices.tsx:106` | duplicate `getNextInvoiceNumber()` call (separate from creation flow) |

**Pattern**: Number generation is a thin domain function but called from PAGE inline. The `NewInvoice.tsx` component owns the init orchestration entirely.

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| FORM | `src/components/quotation/QuotationForm.tsx` (useEffect ~line 100-180) | Calls `getNextQuotationNumber()` inline on mount |
| DOMAIN | `src/domain/quotation/normalize.ts:28` | `getNextQuotationNumber()` — queries all existing numbers, finds max + 1 |
| ACTION | `src/pages/viewQuotationActions.ts:79` | `duplicateQuotationRecord()` calls `getNextQuotationNumber()` |
| ACTION | `src/pages/viewQuotationActions.ts:154` | `convertQuotationToInvoice()` calls `getNextInvoiceNumber()` (from `domain/documentConversion`) |
| ACTION | `src/pages/viewRFQActions.ts:61` | calls `getNextQuotationNumber()` |
| ACTION | `src/pages/viewBOQActions.ts:61` | calls `getNextQuotationNumber()` |
| MODULE | `src/modules/quotations/services/quotationService.ts:80` | calls `getNextQuotationNumber()` |
| MODULE | `src/modules/invoices/services/invoiceConversionService.ts:26` | calls `getNextQuotationNumber()` |

**Pattern**: Quotation number generation is shared across 6 callers — the domain function is reused but called from disparate locations. Invoice number generation has 3 callers.

### Key difference

`getNextInvoiceNumber` lives in `domain/documentConversion.ts` (shared conversion domain), while `getNextQuotationNumber` lives in `domain/quotation/normalize.ts` (quotation domain). Invoice init is PAGE-owned; Quotation init is FORM-owned.

---

## 2. Load (fetching from DB for edit / view)

### Invoice

**Edit load**

| Owner | File | Function / Location |
|---|---|---|
| PAGE | `src/pages/EditInvoice.tsx` (useEffect ~line 82-150) | Fetches invoice + items from supabase directly, no domain delegation |
| PAGE | `src/pages/EditInvoice.tsx` (inline) | Calls `parseCustomFields()`, `mapDbInvoiceItem()`, `normalizeFieldEntries()` inline |
| DOMAIN | `src/domain/invoice` | `mapDbInvoiceItem()`, `parseCustomFields()` used but called inline from PAGE |

**View load**

| Owner | File | Function / Location |
|---|---|---|
| HOOK | `src/hooks/useInvoiceDetailData.js:48` | `useInvoiceDetailData()` — fetches invoice, items, payments, client, settings, bank accounts, signatories, creator, project, related CSRs, related waybills |
| HOOK | `src/hooks/useInvoiceDetailData.js:66` | Offline cache fallback via `@/lib/native/invoiceCache` |
| DOMAIN | `src/domain/documentRelationships` | `fetchInvoiceChildDocuments()`, `fetchProjectSummary()` |
| DOMAIN | `src/domain/invoice/advanceProjection.rules` | `deriveAdvanceInvoiceProjection()` |
| DOMAIN | `src/domain/invoice/financialState` | `calculateInvoiceFinancialState()` |

### Quotation

**Edit load**

| Owner | File | Function / Location |
|---|---|---|
| FORM | `src/components/quotation/QuotationForm.tsx` (useEffect ~line 100-180) | Fetches quotation + items from supabase, uses `buildQuotationFormState()` |
| DOMAIN | `src/domain/quotation/normalize.ts` | `buildQuotationFormState()` — builds full form state from DB rows |

**View load**

| Owner | File | Function / Location |
|---|---|---|
| HOOK | `src/hooks/useQuotationViewData.ts:21` | `useQuotationViewData()` — lightweight, mainly delegates |
| ACTION | `src/pages/viewQuotationActions.ts:12` | `loadQuotationViewData()` — fetches quotation, items, settings, bank accounts, signatories; calls `buildQuotationFormState()`, `computeDocument()` |
| DOMAIN | `src/domain/quotation/normalize.ts` | `buildQuotationFormState()` |
| DOMAIN | `src/lib/Calculations.ts` | `computeDocument()` (redundant recomputation on view load) |

### Key difference

- Invoice edit load is PAGE-owned with inline supabase calls. Quotation edit load is FORM-owned with domain delegation (`buildQuotationFormState`).
- Invoice view load is HOOK-owned (`useInvoiceDetailData.js`) with heavy inline fetches, cache fallback, and financial state computation. Quotation view load is HOOK + ACTION split.
- Invoice view loads payments and financial state; Quotation view does not.
- Invoice view loads related documents (CSRs, waybills); Quotation view only loads project.

---

## 3. Edit (state management of form fields, items, groups)

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| PAGE | `src/pages/EditInvoice.tsx` (inline state) | items, groups, extraCharges, headerFields, additionalFields, columns, attachments all managed inline |
| PAGE | `src/pages/NewInvoice.tsx` (inline state) | Same pattern duplicated |
| HOOK | `src/components/useInvoiceColumns.tsx` | `useInvoiceColumns()` — column visibility, ordering, custom columns |
| HOOK | `src/hooks/useInvoiceForm.js` | `numberToWords()` only (not form state — misnamed) |
| DOMAIN | `src/domain/invoice` | Item CRUD functions, normalize functions, factory functions — called from PAGE inline |

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| FORM | `src/components/quotation/QuotationForm.tsx` (inline state) | items, groups, extraCharges, headerFields, additionalFields, columns, attachments all managed inline |
| HOOK | `src/components/useInvoiceColumns.tsx` | `useInvoiceColumns()` — **reused from Invoice**, same hook |
| DOMAIN | `src/domain/invoice` | Item CRUD functions, normalize functions — **reused from Invoice domain** (e.g., `normalizeQuantity`, `normalizeExtraCharges`, `makeEmptyItem`) |

### Key difference

Identical edit patterns. Quotation reuses Invoice's column hook and item factory/normalize functions. The only structural difference is PAGE ownership (Invoice) vs FORM ownership (Quotation).

---

## 4. Compute (totals, VAT, discounts)

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| PAGE | `src/pages/EditInvoice.tsx:235` | `buildCalculationInputs()` then `computeDocument()` |
| PAGE | `src/pages/NewInvoice.tsx:243` | `buildCalculationInputs()` then `computeDocument()` |
| DOMAIN | `src/domain/invoice` | `buildCalculationInputs()` — prepares calculation context |
| DOMAIN | `src/lib/Calculations.ts` | `computeDocument()` — SINGLE SOURCE OF TRUTH |
| DOMAIN | `src/domain/financial/resolveFinancialColumns` | `resolveFinancialColumns()` — column resolution for financial display |

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| FORM | `src/components/quotation/QuotationForm.tsx:180` | `buildCalculationInputs()` then `computeDocument()` — memoized via `useMemo` |
| ACTION | `src/pages/viewQuotationActions.ts:30` | `loadQuotationViewData()` calls `computeDocument()` again (redundant) |
| DOMAIN | `src/domain/invoice` | `buildCalculationInputs()` — **reused from Invoice domain** |
| DOMAIN | `src/lib/Calculations.ts` | `computeDocument()` — **shared with Invoice** |

### Key difference

Both use the same `buildCalculationInputs()` + `computeDocument()` pipeline. Quotation recomputes `computeDocument()` on view load (redundant — totals are already stored in DB). Invoice does not recompute on view load (uses stored values from `financialState`).

---

## 5. Validate (client, items, constraints)

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| PAGE | `src/pages/EditInvoice.tsx` (inline ~line 480-510) | Validates client_id, items length, handles errors inline |
| PAGE | `src/pages/NewInvoice.tsx` (inline ~line 480-510) | Same validation duplicated |

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| FORM | `src/components/quotation/QuotationForm.tsx` (inline ~line 450-470) | Validates client_id, items length, handles errors inline |

### Key difference

Identical validation logic. Only structural difference: PAGE vs FORM ownership.

---

## 6. Persist (save to database)

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| PAGE | `src/pages/EditInvoice.tsx` (inline ~line 350-650) | Full save pipeline inline |
| PAGE | `src/pages/NewInvoice.tsx` (inline ~line 350-650) | Full save pipeline inline (duplicated) |
| LIB | `src/lib/withUniqueRetry.ts` | `withUniqueRetry()` — collision retry wrapper |
| LIB | `src/lib/saveTiming.ts` | `createSaveTimer()` — performance timing |
| LIB | `src/lib/audit` | `recordInvoiceCreated()`, `recordAuditLog()` — deferred import |
| DOMAIN | `src/domain/invoice/factories.ts` | `toDbItem()` — item row conversion |

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| FORM | `src/components/quotation/QuotationForm.tsx` (inline ~line 460-711) | Full save pipeline inline |
| LIB | `src/lib/withUniqueRetry.ts` | `withUniqueRetry()` — collision retry wrapper |
| LIB | `src/lib/saveTiming.ts` | `createSaveTimer()` — performance timing |
| LIB | `src/lib/audit` | `recordQuotationCreated()`, `recordAuditLog()` — deferred import |
| DOMAIN | `src/domain/invoice/factories.ts` | `toQuotationItem()` (separate function, not shared) |

### Key difference

- Invoice persists 2× (NewInvoice.tsx + EditInvoice.tsx). Quotation persists 1× (QuotationForm.tsx).
- Quotation has offline draft support (`createOfflineQuotationDraft`); Invoice does not.
- Audit function names differ but pattern is identical.
- Item conversion uses separate factories: `toDbItem()` for Invoice vs `toQuotationItem()` for Quotation.

---

## 7. Export (PDF / CSV / share)

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| COMPONENT | `src/components/document-view/invoice/InvoiceViewPage.tsx` | View page — export UI orchestration |
| ACTION | `src/components/document-view/invoice/invoicePdfActions.ts` | `buildInvoicePdfData()` — builds PDF model from invoice data |
| COMPONENT | `src/components/pdf-new/index.ts` | Shared PDF rendering pipeline |
| DOMAIN | `src/domain/invoice/previewModel.ts` | `resolveDocumentSignatory()` — signatory resolution |
| LIB | `src/lib/Calculations.ts` | `computeDocument()` — totals recomputed for PDF |
| COMPONENT | `src/components/document-view/shared/shareDocument.ts` | `shareDocument()` — native share sheet or clipboard |

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| COMPONENT | `src/components/document-view/quotation/QuotationViewPage.tsx` | View page — export UI orchestration |
| ACTION | `src/domain/quotation/pdfDownloadHandler.ts` | `buildQuotationPdfData()` — builds PDF model from quotation data |
| COMPONENT | `src/components/pdf-new/index.ts` | **Shared** PDF rendering pipeline |
| ACTION | `src/pages/viewQuotationActions.ts:66` | `downloadQuotationCsvFile()` |
| COMPONENT | `src/components/quotation/exportQuotationCsv.ts` | `buildQuotationCsv()` — CSV builder |
| DOMAIN | `src/domain/invoice/previewModel.ts` | `resolveDocumentSignatory()` — **shared** |
| COMPONENT | `src/components/document-view/shared/shareDocument.ts` | `shareDocument()` — **shared** |
| LIB | `src/lib/Calculations.ts` | `computeDocument()` — totals recomputed for PDF |

### Key difference

- For PDF: both have their own model builder (`invoicePdfActions.ts` vs `pdfDownloadHandler.ts`) but share the renderer (`@/components/pdf-new/index.ts`) and signatory resolver (`previewModel.ts`).
- For CSV: Quotation has a dedicated CSV builder; Invoice builds CSV inline in the view page.
- Quotation export actions are centralized in `useQuotationActions.ts` hook. Invoice export actions appear to be more distributed in the view page.

---

## 8. Convert (quotation → invoice)

### Quotation

| Owner | File | Function / Location |
|---|---|---|
| HOOK | `src/hooks/useQuotationActions.ts:124` | `handleConvertToInvoice()` — triggers conversion, navigates to new invoice |
| ACTION | `src/pages/viewQuotationActions.ts:154` | `convertQuotationToInvoice()` — full conversion logic |
| DOMAIN | `src/domain/documentConversion.ts` | `getNextInvoiceNumber()`, `buildTrailLink()`, `withSourceTrail()`, `appendDerivedTrail()` |
| LIB | `src/lib/audit` | `recordQuotationLinked()`, `recordInvoiceCreated()` |

### Invoice

| Owner | File | Function / Location |
|---|---|---|
| — | — | **Invoice has no convert action** (no "convert to quotation") |

### Key difference

Convert is Quotation-only. Invoice has no reciprocal lifecycle stage.

---

## Summary Comparison Table

| Stage | Invoice Owner | Quotation Owner | Same Code? | Notes |
|---|---|---|---|---|
| Init number | DOMAIN (`documentConversion.ts`) | DOMAIN (`quotation/normalize.ts`) | No | Different files, different formats |
| Init orchestration | PAGE (`NewInvoice.tsx`) | FORM (`QuotationForm.tsx`) | No | Structural difference |
| Load (edit) | PAGE (`EditInvoice.tsx`) inline | FORM (`QuotationForm.tsx`) useEffect | No | Different owners |
| Load (view) | HOOK (`useInvoiceDetailData.js`) | HOOK + ACTION (`useQuotationViewData` + `viewQuotationActions`) | No | Invoice hook is heavier |
| Edit state | PAGE inline | FORM inline | No | Same pattern, different files |
| Column management | HOOK (`useInvoiceColumns`) | HOOK (`useInvoiceColumns`) | **YES** | Shared hook |
| Item factory | DOMAIN (`invoice/factories.ts`) | DOMAIN (`invoice/factories.ts`) | **YES** | `toDbItem()` shared |
| Compute | DOMAIN (`Calculations.ts`) | DOMAIN (`Calculations.ts`) | **YES** | `computeDocument()` shared |
| Validate | PAGE inline | FORM inline | No | Same logic, different files |
| Persist | PAGE inline (×2 files) | FORM inline (×1 file) | No | Quotation has offline drafts |
| Collision retry | LIB (`withUniqueRetry.ts`) | LIB (`withUniqueRetry.ts`) | **YES** | Shared utility |
| Audit trail | LIB (`audit.ts`) | LIB (`audit.ts`) | **YES** | Shared audit system |
| PDF model builder | ACTION (`invoicePdfActions.ts`) | DOMAIN (`pdfDownloadHandler.ts`) | No | Separate files |
| PDF renderer | COMPONENT (`pdf-new`) | COMPONENT (`pdf-new`) | **YES** | Shared renderer |
| CSV export | PAGE inline | COMPONENT (`exportQuotationCsv.ts`) | No | Different locations |
| Share | COMPONENT (`shareDocument.ts`) | COMPONENT (`shareDocument.ts`) | **YES** | Shared component |
| Convert → other doc | **NONE** | ACTION (`viewQuotationActions.ts`) | No | Quotation-only |

---

## Verdict

**NOT equivalent.** While 7 code paths are shared (`useInvoiceColumns`, `toDbItem`, `computeDocument`, `withUniqueRetry`, `audit.ts`, `pdf-new`, `shareDocument`), the ownership model differs structurally:

1. **Ownership pattern differs**: Invoice is PAGE-owned (fat pages with inline logic duplicated across NewInvoice.tsx + EditInvoice.tsx). Quotation is FORM-owned (single QuotationForm.tsx component with thin page wrappers).

2. **Invoice has heavier view loading**: `useInvoiceDetailData.js` loads payments, financial state, advance projections, and related documents. `useQuotationViewData.ts` is lighter — no payments or related documents.

3. **Quotation has offline persistence**: QuotationForm.tsx includes offline draft support via `createOfflineQuotationDraft()`. Invoice has no equivalent.

4. **Quotation has convert lifecycle stage**: `convertQuotationToInvoice()` in `viewQuotationActions.ts` is unique to Quotation. Invoice has no reciprocal.

5. **Duplication exists**: The save pipeline logic is duplicated across NewInvoice.tsx and EditInvoice.tsx (Invoice) vs centralized in QuotationForm.tsx (Quotation).
