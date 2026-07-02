# Invoice vs Quotation Architecture Comparison

> Strict structural audit. No remapping or architecture proposals.

---

## 1. Invoice vs Quotation Structural Comparison

### Domain completeness — **DIVERGENT**

| Dimension | Invoice | Quotation |
|---|---|---|
| Domain files | 26 files (incl. `projections/` subdirectory) | 6 files |
| Domain total size | ~104 KB | ~28 KB |
| Advance/invoicing subsystem | Full advance payment system (`advanceChildFlow.ts`, `advanceConfig.ts`, `advanceMetadata.ts`, `advanceProjection.*`, `advanceSummary.ts`) | None |
| Financial projections | `projections/` subdir (content, financial, party, line item resolvers) | None |
| Calculations layer | `calculations.ts` (14 KB) — unique financial logic encoding rate tiers, install-rate subtotals, WHT | None |
| Financial state machine | `financialState.ts`, `resolveInvoiceStatus.ts` — payment vs balance tracking | None |
| Column definitions | `columns.ts` (8 KB) — structured column registry with BUILTIN_COLUMNS | Reuses Invoice's `BUILTIN_COLUMNS` directly |
| View model layer | `viewModel.js` + `renderTypes.ts` | None |
| PDF contract & payload | `pdfRender.contract.ts`, `buildPdfRenderPayload.ts`, `renderTypes.ts` | None |
| Identity immutability | `assertIdentityImmutable.ts`, `invoiceIdentity.contract.ts` | None |

**Root cause of divergence:** Invoice has accumulated payment-advance-financial complexity over time (24-month+ head start). Quotation has no payments, no advances, no financial state machine, no projections.

### Hook orchestration depth — **DIVERGENT**

| Hook | Invoice | Quotation |
|---|---|---|
| Form orchestration | `useInvoiceForm.js` (~1.5 KB) — manages line item state, calculations, field entries, groups, import, save, PDF output | **No form hook exists**. Quotation form logic is entirely inline in `QuotationForm.tsx` |
| Detail/view data | `useInvoiceDetailData.js` — fetches + joins invoice + items + payments + bank accounts + CSRs + waybills for view page | `useQuotationViewData.ts` — fetches + joins quotation + items for view page |
| List queries | `useInvoiceList.ts` | `useQuotations` (via document list pattern) |
| Mutations | `useInvoiceMutations.ts` — dedicated mutation hook | `useQuotationActions.ts` — thin action wrapper |

**Root cause of divergence:** Invoice extracts orchestration logic into hooks (`useInvoiceForm.js`), then page components consume them. Quotation packs orchestration into a single component (`QuotationForm.tsx`), leaving pages as wrappers.

### Page orchestration responsibility — **DIVERGENT**

| Page | Invoice | Quotation |
|---|---|---|
| `New{Type}.tsx` | **878 lines** — fat page: form state, save logic, import, column management, UI rendering all inline | **10 lines** — thin wrapper: `<QuotationForm mode="new" />` |
| `Edit{Type}.tsx` | **848 lines** — fat page: load + form state + save + UI all inline | **12 lines** — thin wrapper: `<QuotationForm mode="edit" quotationId={id} />` |
| List page | `Invoices.tsx` — custom list page | `Quotations.tsx` — custom list page |
| View page | `InvoiceWorkspace.tsx` (162 lines, props-driven composite) + multiple sub-components | `QuotationViewPage.tsx` (123 lines, simpler props-driven layout) |

**Root cause of divergence:** Invoice never extracted a standalone form component. Form logic lives at the page layer. Quotation extracted `QuotationForm.tsx` as a reusable component, pages are trivial delegates.

### Form architecture — **DIVERGENT**

| Aspect | Invoice | Quotation |
|---|---|---|
| Form component | **None.** No `InvoiceForm.tsx` exists. Only `InvoiceFormActions.tsx` (shared action buttons, ~2 KB) | `QuotationForm.tsx` (853 lines) — full form with state, validation, save, import, column manager |
| State management | Inline `useState` in page components using `InvoiceFormFields` interface | Inline `useState` in `QuotationForm.tsx` using `QuotationEditorState` interface |
| Provider pattern | None — no form provider context | None — no form provider context |
| Column management | `useInvoiceColumns` shared from `@/components/useInvoiceColumns.jsx` | `useQuotationLineItems` — parallel column + line item hook inside form |
| Offline support | Via `@/lib/native/capacitor` (inline in NewInvoice.tsx) | Via `@/lib/native/quotationOffline` (in QuotationForm.tsx) |
| Import adapter | `invoiceImportAdapter` from domain | `quotationImportAdapter` from domain |

**Root cause of divergence:** Architectural fork — Invoice routes orchestration through page components, Quotation routes it through a dedicated form component. Both use the same underlying pattern (useState + inline logic + import adapter + PDF output settings), but at different code locations.

### PDF pipeline complexity — **SIMILAR with divergences**

| Layer | Invoice | Quotation |
|---|---|---|
| PDF generation | `generateInvoicePdf()` at `@/components/pdf-new` | `generateQuotationPdf()` at `@/components/pdf-new` |
| Core rendering | Shared `generatePdf()` → `adaptCommercialDocumentData()` | **Same** `generatePdf()` → `adaptCommercialDocumentData()` |
| Templates | 6 shared templates (Industry, Ledger, Crest, Minimal, Evergreen, Bolt, Ember) | **Same 6 templates** |
| Preview model | `@/domain/invoice/previewModel.ts` (9 KB) — handles advance summary, balance due, financial state | `@/domain/quotation/previewModel.ts` (9 KB) — simpler, no advance/payment logic |
| PDF download handler | `invoicePdfActions.ts` — includes payment reconciliation, financial state, logo resolution | `pdfDownloadHandler.ts` — simpler, no payment/advance handling |
| Columns | `BUILTIN_COLUMNS` from Invoice domain | Same `BUILTIN_COLUMNS` from Invoice domain |

**Delta:** The PDF rendering pipeline is **shared** (`generatePdf` + `adaptCommercialDocumentData`). The preview model and download handler are **forked** per document type, with Invoice's version significantly more complex due to payments/advance features.

### Adapter/config usage — **SIMILAR**

Both have parallel config adapters:
- `src/config/invoiceAdapters.ts` ↔ `src/config/quotationAdapters.ts`
- Both follow the same module adapter contract
- Same filter configuration pattern

---

## 2. View + PDF Pipeline Comparison

### Is PDF pipeline truly shared or forked?

**Shared at the rendering layer, forked at the entry/model layer:**

- `@/components/pdf-new/index.ts` exports `generateInvoicePdf()` and `generateQuotationPdf()` as **type-safe wrappers** around the same internal `generatePdf<TModel>()` function
- Both call `adaptCommercialDocumentData(request.model)` — one adapter function for both
- All 7 templates handle both `InvoicePdfModel` and `QuotationPdfModel` via the unified `PdfDocumentModel` type

**Forked downstream:**
- `invoicePdfActions.ts` builds the model with payment reconciliation, financial state, advance summary
- `pdfDownloadHandler.ts` builds the model with quotation-specific fields (validUntil) and no payment data

### Are preview components reused or duplicated?

**Duplicated with shared internals:**
- `@/domain/invoice/previewModel.ts` and `@/domain/quotation/previewModel.ts` are separate files with parallel structure but Invoice's includes advance/payment logic
- Invoice's `InvoiceWorkspace.tsx` uses invoice-specific children (`InvoiceOperationalSections`, `InvoicePaymentsSection`)
- Quotation's `QuotationViewPage.tsx` is a simpler layout without payment sections
- Both reuse `BankDetailsCard`, `DocumentOptionsCard` from `../shared/`

### Is template logic centralized or split?

**Centralized:** All PDF templates in `@/components/pdf-new/templates/` accept the unified `PdfDocumentModel` and adapt via `adaptCommercialDocumentData()`. No template-level splitting.

---

## 3. End-to-End Lifecycle Comparison

### Invoice flow

```
NewInvoice.tsx (create inline)
  → Inline state → useInvoiceForm.js helpers
  → computeDocument() from Calculations.ts
  → supabase insert with withUniqueRetry
  → navigate to view page

EditInvoice.tsx (edit inline)
  → Load from supabase
  → Inline state → useInvoiceForm.js helpers
  → computeDocument()
  → supabase update with withUniqueRetry
  → navigate to view page

InvoiceWorkspace.tsx (view)
  → InvoiceDocumentCard + InvoiceMoneyStrip
  → InvoicePaymentsSection (payment tracking)
  → InvoiceOperationalSections (CSRs, waybills, advances)
  → invoicePdfActions.ts → generateInvoicePdf()

Send action: email/share flow from view
```

### Quotation flow

```
NewQuotation.tsx (thin wrapper)
  → QuotationForm.tsx (standalone component)
  → Inline state → no form hook
  → computeDocument() from Calculations.ts
  → supabase insert with withUniqueRetry
  → navigate to view page

EditQuotation.tsx (thin wrapper)
  → QuotationForm.tsx
  → Load from supabase → Inline state
  → computeDocument()
  → supabase update with withUniqueRetry
  → navigate to view page

QuotationViewPage.tsx (view)
  → QuotationDocumentPreview + QuotationMoneyStrip
  → No payment/advance sections (not applicable)
  → pdfDownloadHandler.ts → generateQuotationPdf()

Convert action: onConvert → convert quotation to invoice
  → This is the only extra step Quotation has
```

### Flow differences

| Step | Invoice | Quotation |
|---|---|---|
| Form orchestration | In page files (878/848 lines) | In standalone component (853 lines) |
| Hook usage | `useInvoiceForm.js` for helper functions | No form hook; all inline in component |
| View sections | Payments, CSRs, waybills, advances, source doc, actions | No payments, no advances; simpler document-only view |
| Convert action | N/A | Has `onConvert` to spawn invoice |
| PDF model builder | `invoicePdfActions.ts` with payment reconciliation | `pdfDownloadHandler.ts` without payments |
| Send | Email/share flow | Email/share flow (identical pattern) |

---

## 4. Final Parity Verdict

### Are Invoice and Quotation orchestration systems structurally equivalent?

## NO

**Evidence:**

1. **Form architecture is inverted.** Invoice puts form orchestration in page components (878-line `NewInvoice.tsx`, 848-line `EditInvoice.tsx`). Quotation extracts it into a standalone component (`QuotationForm.tsx`, 853 lines) with pages as 10-line delegates. They cannot share a form orchestration layer without rewriting Invoice's form injection point.

2. **Invoice has a `useInvoiceForm.js` hook; Quotation has zero form hooks.** Invoice's hook provides shared helpers across New/Edit pages. Quotation's form logic is entirely internal to `QuotationForm.tsx`. No shared hook contract exists.

3. **Domain depth is 4× asymmetric.** Invoice domain (26 files, ~104 KB) contains an advance payment subsystem, financial projections, financial state machine, calculations pipeline, view model layer, and identity immutability contracts. Quotation domain (6 files, ~28 KB) has none of these. Any shared layer must account for optional payment/advance complexity, making a unified abstraction heavier than warranted.

4. **View pipeline sub-components diverge significantly.** Invoice's `InvoiceWorkspace` relies on 8+ specialized sub-components for payments, advances, CSRs, waybills. Quotation's `QuotationViewPage` has 1/3 the sub-components and no payment/advance heritage. These cannot collapse without conditionally rendering Invoice-specific sections in a shared view.

5. **PDF model building is forked.** Although the renderer is shared, `invoicePdfActions.ts` contains payment reconciliation, financial state, and advance summary logic absent from `pdfDownloadHandler.ts`. Merging these would force Quotation to depend on payment/advance concepts it does not need.

**Bottom line:** Invoice and Quotation share a common **pattern** (state + document columns + computeDocument + supabase CRUD + PDF generation) but differ in **execution**. A shared orchestration layer (`InvoiceFormPage` / `QuotationFormPage` abstraction) is not safely achievable without either (a) making Quotation pay for Invoice's payment/advance complexity or (b) back-porting a form component into Invoice, which is a significant refactor of the existing page-layer form logic.

The two systems are structurally parallel but not structurally equivalent. They should remain independent modules sharing only the PDF renderer, domain utilities (columns, Calculations.ts), and common UI primitives — which they already do.
