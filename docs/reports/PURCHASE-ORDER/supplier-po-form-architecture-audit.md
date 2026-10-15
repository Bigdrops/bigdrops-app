# Supplier Purchase Order — Form Architecture Audit

This report was written by Buffy on 2026-10-15 via Freebuff Desktop.

Skills used: supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read to locate candidate skills. The guidance applied for RLS, provisioning, indexing, and schema-design findings comes from `.agents/skills/supabase-postgres-best-practices/SKILL.md` and its `references/` files. The `docs/standard/` files are the primary normative source for the form, numbering, lifecycle, and transformation findings. No other registered skill was loaded.

---

## Objective

Determine how a Supplier Purchase Order (Supplier PO) can join the existing Invoice and Quotation document-form family. Establish what Invoice and Quotation share today, what must be extracted first, and what Supplier PO must not inherit.

This is an investigation. No application code, schema, migration, test, or configuration file changed.

## Scope

Contributing documents, forms, hooks, domain modules, PDF pipeline, search authority, tenant provisioning, and provisioning rules. Invoice and Quotation are the reference pair. RFQ, CPS, CSR, Waybill, and Receipt are inspected as precedent for the new document type.

## Files changed

| File | Change |
|---|---|
| `docs/reports/PURCHASE-ORDER/supplier-po-form-architecture-audit.md` | Created |

No other file changed. No migration created. No test changed.

## Changes made

One audit report. No source change.

## Verification result

```
Verification:
- git status before work: 11 pre-existing modified/untracked files (Phase 3 search work)
- git status after work: identical, plus this report only
- bun run audit:load: not run (not applicable — zero code change)
- bun run typecheck: not run (not applicable — zero code change)
- bun run lint: not run (not applicable — zero code change)
- bun run build: skipped due to hardware policy
- supabase db push: not applicable
```

## Supabase push status

Not applicable. No SQL changed.

---

# 1. Executive Verdict

**Verdict: Yes, after significant shared-form refactor.**

Evidence summary:

| Question | Answer |
|---|---|
| Does a shared document form exist? | Yes — `src/components/document/SharedDocumentForm.tsx`, used by both Invoice and Quotation |
| Is it parameterised by a document family? | No — it is parameterised by one boolean, `isQuotation` |
| Does a generic save lifecycle exist? | Yes — `src/hooks/useDocumentSave.ts` with per-type strategy objects |
| Does a first-class supplier entity exist? | No — supplier identity is free text only |
| Does a generic numbering extension path exist? | Yes — `src/domain/prefixConstants.ts` carries a documented new-type checklist |

The save lifecycle, numbering engine, PDF model, tenant provisioning, and search authority are all already generic. Supplier PO can join these.

The form UI is not generic. `SharedDocumentForm` renders a two-way sales document. Every label is a ternary on `isQuotation`. A third document type would render as an Invoice. The binary is the blocking issue, not the missing plumbing.

The missing supplier authority is a second blocker. Supplier PO has no party to point at.

---

# 2. Current Invoice / Quotation Architecture

| Area | Invoice authority | Quotation authority | Shared? | Notes |
|---|---|---|---|---|
| Form page | `src/pages/InvoiceFormPage.tsx` (567 lines) | `src/pages/QuotationFormPage.tsx` (783 lines) | Pattern only | One `*FormPage.tsx` per type with a `mode` prop. Mandated by `document-form-consolidation-standard.md`. |
| Create/edit delegators | `NewInvoice.tsx`, `EditInvoice.tsx` (5 lines each) | `NewQuotation.tsx`, `EditQuotation.tsx` (5 lines each) | Pattern only | Thin delegators, no logic. |
| Form UI | `src/components/document/SharedDocumentForm.tsx` (536 lines) | same file | **Yes — same component** | Invoice renders at line 450, Quotation at line 666. Props-driven, `props: any`. |
| Form orchestration | Extracted hooks: `useInvoiceEditableState`, `useInvoiceReferenceData`, `useInvoiceHydration` | Inline — 28 `useState`, 23 `useCallback` | **No** | Invoice is the mature side. Quotation keeps state in the page. |
| Responsive layout | `useLayoutMode()` → `useFoldAwareness()` | same | **Yes** | Centralised. Modes: `mobile`, `tablet`, `desktop`. Exposes `hasFold`, `isFoldable`. |
| Party picker | `src/components/ClientSelector.tsx` | same | **Yes — client only** | Queries the `clients` table. Can create a client inline. Props are `clientId` / `clientName`. |
| Item editor | `FormLineItems.tsx` + `useInvoiceColumns.tsx` | same | **Yes** | Quotation imports `useInvoiceColumns.jsx`; Invoice imports `useInvoiceColumns`. Same module. |
| Item card (mobile) | `src/components/invoice/MobileItemCard.tsx` | same | **Yes** | Invoice-named, shared. |
| Totals | `FormTotals.tsx` (57 lines) | same | **Yes** | Receives prepared `summaryRows`. Does not calculate. |
| Groups | `FormLineItems.tsx` + `useInvoiceColumns` | same | **Yes** | `row_type: 'standard' \| 'group_header'`. |
| Attachments | `FormNotesTerms.tsx` reference links | same | **Yes** | `attachments` is a `jsonb` column on the document. |
| Camera / images | `src/lib/itemPhotoUpload.ts`, `document-image-upload-policy.md` | same | **Yes** | Item-level `image_url`. |
| Tax / VAT | `src/lib/Calculations.ts` | same | **Yes** | `computeDocument()` is the only production entry point. |
| Extra charges | `FormCommercialTerms.tsx` (398 lines) | same | **Yes** | `workmanship`, `transportation`, `shipping` plus custom charges. |
| Discount / WHT | `Calculations.ts` `DiscountTiming`, `WhtType` | same | **Yes** | `before/after_tax`, `fixed/percent`. |
| Save lifecycle | `useDocumentSave.ts` + `useInvoiceSave.ts` (526 lines) | `useDocumentSave.ts` + `useQuotationSave.ts` (464 lines) | Core yes, strategy no | Strategy objects are per type. |
| Persistence RPC | `save_invoice_with_items_transaction` | `save_quotation_with_items_transaction` | Pattern only | Tenant-local, per type. |
| Dirty state / exit guard | `IdentityLockDialog.tsx` (47 lines) | same | **Yes** | Identity immutability interception. |
| Numbering | `resolvePrefix` + `withUniqueRetry` + `save_*` RPC | same | **Yes — engine** | Per-type generator function. |
| Status | `resolveInvoiceStatus.ts` + `financialState.ts` | `quotationStatus.ts`, `QuotationStatus` | **No** | Invoice status is derived from payments. Quotation status is stored. |
| List page | `src/pages/Invoices.tsx` (392 lines) | `src/components/quotation/QuotationList.tsx` (634 lines) | Adapter yes | `src/config/moduleAdapters.ts`. |
| View page | `src/components/document-view/invoice/*` | `src/components/document-view/quotation/*` | Shared shell yes | `document-view/shared/*` holds 30 shared components. |
| PDF | `src/components/pdf/index.ts` `generateInvoicePdf` | same, `generateQuotationPdf` | **Yes — engine** | One generic pipeline. |
| Search | `search_documents` RPC | same | **Yes** | `DocumentType` already lists 7 types. |
| Routes | `/invoices`, `/invoices/new`, `/invoices/:id` | `/quotations/*` | Pattern only | Registered in `src/components/app/AppShell.tsx`. |

---

# 3. Shared Form Inventory

| File | Lines | Owns | Classification |
|---|---|---|---|
| `src/components/document/SharedDocumentForm.tsx` | 536 | Form composition, desktop action rail, sheets | **Needs extraction** — binary `isQuotation` |
| `src/components/document/FormHeader.tsx` | 203 | Title, number, dates, client picker trigger | **Needs extraction** — 8 ternaries on `isQuotation` |
| `src/components/document/FormLineItems.tsx` | 363 | Item table, groups, add/import controls | Reusable with configuration |
| `src/components/document/FormCommercialTerms.tsx` | 398 | Discount, VAT, WHT, extra charges, additional fields | Reusable with configuration |
| `src/components/document/FormTotals.tsx` | 57 | Totals presentation | Reusable unchanged |
| `src/components/document/FormNotesTerms.tsx` | 187 | Notes, terms, signatory, reference links | Reusable unchanged |
| `src/components/document/FormFooter.tsx` | 75 | Mobile action bar | Reusable unchanged |
| `src/components/document/SortableLineItem.tsx` | 88 | Row drag ordering | Reusable unchanged |
| `src/components/document/IdentityLockDialog.tsx` | 47 | Identity immutability dialog | Reusable unchanged |
| `src/components/document/DocumentFormPresentation.tsx` | 72 | `DocumentTopBar` | Reusable unchanged |
| `src/components/document/ProjectLinkDialog.tsx` | 341 | Project link | Reusable unchanged |
| `src/components/document/AttachExistingDocumentSheet.tsx` | 315 | Attach existing document | Reusable unchanged |
| `src/components/document/DocumentActionSheets.tsx` | 267 | Action sheets | Reusable with configuration |
| `src/components/document/LinkedDocumentsSheet.tsx` | 120 | Related documents | Reusable unchanged |
| `src/components/document/document-cps-overrides.css` | — | `.bd-document-form` presentation scope | Reusable unchanged |
| `src/hooks/useDocumentSave.ts` | 101 | Generic save lifecycle | **Reusable unchanged** |
| `src/components/useInvoiceColumns.tsx` | — | Column config, item factories | Reusable with configuration |
| `src/lib/Calculations.ts` | 794 | `computeDocument` financial engine | **Reusable unchanged** — do not modify |
| `src/components/ClientSelector.tsx` | — | Client party picker | **Should remain document-specific** — clients only |
| `src/domain/financial/resolveFinancialColumns.ts` | — | Financial column visibility | Reusable unchanged |
| `src/domain/prefixConstants.ts` | — | Numbering engine | Reusable with configuration |
| `src/lib/withUniqueRetry.ts` | — | Number collision retry | **Reusable unchanged** |
| `src/components/pdf/index.ts` | — | Generic PDF generation | Reusable with configuration |
| `src/config/moduleAdapters.ts` | — | List adapters, exhaustive `ModuleScope` | Reusable with configuration |
| `src/components/document-view/shared/*` | 30 files | View shell, hero, actions, related docs | Reusable unchanged |

---

# 4. Duplication Map

| # | Duplication | Location | Risk if copied into Supplier PO |
|---|---|---|---|
| 1 | Binary `isQuotation` label switch | `SharedDocumentForm.tsx:241`, `FormHeader.tsx` (8 sites), `FormCommercialTerms.tsx:131,159` | **High** — a third type silently renders as Invoice |
| 2 | Save strategy skeleton | `useInvoiceSave.ts` (526) vs `useQuotationSave.ts` (464) | **High** — same `validate → buildPayload → persist → afterSave → getNavigationTarget` order, different fields |
| 3 | Page-level form state | `InvoiceFormPage.tsx` uses 3 extracted hooks; `QuotationFormPage.tsx` holds 28 `useState` inline | **Medium** — no shared state owner to reuse |
| 4 | Two quotation save paths | `useQuotationSave.persist` (inline insert/update) and `src/domain/quotation/quotationSaveTransaction.ts` | **Medium** — ambiguity about the canonical path |
| 5 | Invoice save dual path | `useInvoiceSave.ts:348` RPC path vs `:423` pre-cutover sequential insert | **Medium** — two persistence paths in one strategy |
| 6 | Client-only party abstraction | `ClientSelector.tsx` binds `clientId`/`clientName` and the `clients` table | **High** — no party-agnostic picker exists |
| 7 | Item row mapping | `toQuotationItemRow` in `documentConversion.ts` plus per-strategy row builders | **Medium** |
| 8 | List page shell | `Invoices.tsx` (392) and `QuotationList.tsx` (634) | **Low** — adapters already shared |
| 9 | Prefix key naming drift | `DEFAULT_PREFIXES` has `cps_sheets`; the DB CHECK constraint has `boq` | **Low** — pre-existing inconsistency |
| 10 | Standard drift | `prefix-engine-settings-standard.md` lists 7 keys; code has 9 (`receipt`, `letter` added since) | **Low** |
| 11 | Audit event drift | `document-transformation-standard.md` §8 names `DUPLICATE`, `CONVERT`, `REVERT`. The `activity_events.event_type` CHECK does not include them | **Medium** — lifecycle audit for a new type has no event name |

**Ranking summary:** High — items 1, 2, 6. Medium — items 3, 4, 5, 7, 11. Low — items 8, 9, 10.

---

# 5. Supplier Domain Findings

**Is there a first-class supplier entity? No.**

Evidence:

| Check | Result |
|---|---|
| `CREATE TABLE … supplier*` in `supabase/migrations/` | Zero matches |
| `CREATE TABLE … vendor*` in `supabase/migrations/` | Zero matches |
| `supplier_id` column anywhere | Zero matches |
| `vendor_id` column anywhere | Zero matches |
| Supplier or vendor table in `tenant_master_template` | Not present — the provisioning list `_prov_get_template_tables()` holds 49 tables, none supplier-related |
| Supplier picker component in `src/` | None |
| `vendor_name` / `vendor_contact` columns | Present as **plain text** on 5 tables |

Supplier identity is free text. It exists in these places:

| Table | Columns | Meaning |
|---|---|---|
| `rfqs` | `vendor_name`, `vendor_contact` | **Real** vendor identity. `src/domain/rfq/types.ts` declares both. |
| `boqs` | `vendor_name`, `vendor_contact` | **Legacy / repurposed.** `src/domain/cps/normalize.ts:71-74` reads `vendor_name` as a fallback for `client_name` and `vendor_contact` as a fallback for `project_name`. |
| `tax_input_entries` | `vendor_name` | Vendor on a tax input record |
| `expenses` | `vendor_name` | Payee on an expense. `expenseTypes.ts` |
| `cps_sheets` | `show_vendor_identity` boolean | Presentation flag inherited from BOQ |

**Does RFQ use real supplier references?** No. RFQ stores `vendor_name` and `vendor_contact` as text. There is no foreign key. The RFQ form (`src/components/rfq/RfqForm.tsx`) edits those strings.

**What Supplier PO requires:** a supplier authority. Supplier PO must not reuse `client_id`. Clients are the sales-side counterparty. A purchase order points the other way.

Smallest clean foundation, derived from the existing client pattern:

- A tenant-scoped `suppliers` table in `tenant_master_template`.
- Name plus contact and address fields, mirroring `clients`.
- A picker component modelled on `ClientSelector`, bound to the `suppliers` table.
- Optional later: a backfill that promotes distinct `rfqs.vendor_name` values into `suppliers`.

**Safer option to evaluate:** promote the existing `vendor_name` concept rather than inventing a parallel one. RFQ already owns the vendor relationship. The `boqs` columns are legacy and must not be treated as a template.

---

# 6. Proposed Supplier PO Domain Contract

Fields are grouped by evidence, not by convenience.

## A. Required for MVP

| Field | Evidence |
|---|---|
| `po_number` | Every document family carries a number. `resolvePrefix` + `formatDocumentNumber`. |
| `po_date` | `issue_date` exists on quotations, invoices, csps, rfqs, csrs. |
| `supplier_id` | New. Required for the party relationship. No existing authority. |
| `supplier_name` | Denormalised snapshot, matching `client_name` on invoices. |
| `status` | All document tables carry `status text`. |
| `items[]` | Every line-item family carries a child table. |
| item `description`, `quantity`, `unit`, `unit_price` | Mirrors `invoice_items`. |
| `subtotal`, `total` | Mirrors `invoices.total`. |
| `notes`, `terms` | Mirrors `invoices.notes`, `invoices.terms`. |
| `attachments jsonb` | Mirrors `invoices.attachments jsonb DEFAULT '[]'`. |
| `created_at`, `updated_at`, `archived_at` | Standard columns. `archived_at IS NULL` is the universal list filter. |
| `project_id` | Every document table carries `project_id`. |
| `custom_fields` | Carries `conversionTrail` lineage. |

## B. Optional / already reusable

| Field | Evidence |
|---|---|
| `vat` | `Calculations.ts` `globalVatPercent`. |
| `discount` | `DiscountType`, `DiscountTiming`. |
| `wht` | `WhtType`. Note: WHT is a sales-side withholding concept. See §8. |
| `extra charges` (`workmanship`, `transportation`, `shipping`) | Present on `invoices`. Semantics are service-side. See §8. |
| `delivery_location` | `waybills.delivery_location` exists. |
| `payment_terms` | `invoices.payment_terms` exists. |
| `amount_in_words` | `invoices.amount_in_words` exists. `numberToWords` in `src/lib/formatters/money`. |
| `scope_type` | `invoices.scope_type` exists. |

## C. Future

| Field | Reason to defer |
|---|---|
| `expected_delivery_date` | No precedent column. Not needed for a first form. |
| `delivery_terms` | No precedent column. |
| `received_quantity` per item | Requires a goods-receipt capability. Not in scope. |
| `source_rfq_id` | Can be expressed through `custom_fields.conversionTrail` instead. |
| `source_cps_id` | Same. CPS lineage columns exist on `invoice_items` (`source_cps_id`, `source_cps_row_id`) as a precedent. |

**Do not add** `client_id`, `linked_quote_id`, `linked_csr_id`, or `invoice_id`. Those are sales-side links.

---

# 7. Reuse Matrix

| Supplier PO concern | Reuse Invoice? | Reuse Quotation? | New authority? | Reason |
|---|---|---|---|---|
| Form shell | Yes, after refactor | Yes, after refactor | No | `SharedDocumentForm` is shared, but the `isQuotation` binary must become a document-family descriptor. |
| Item UI | Yes | Yes | No | `FormLineItems` + `useInvoiceColumns` are already type-neutral. |
| Totals UI | Yes | Yes | No | `FormTotals` receives prepared rows and renders them. |
| Party picker | No | No | **Yes** | `ClientSelector` binds `clientId`/`clientName` and the `clients` table. |
| Item library | Yes | Yes | No | `item_id` is a nullable FK. Search and forms are already independent of it. |
| Attachments | Yes | Yes | No | `attachments jsonb`. |
| Camera / images | Yes | Yes | No | `itemPhotoUpload.ts`. |
| Numbering | Yes | Yes | Configuration only | Add a `purchase_order` key to `DEFAULT_PREFIXES`, extend the CHECK constraint, add a generator. |
| Tax (VAT) | Yes | Yes | No | `computeDocument()` is type-neutral. |
| WHT | No | No | Reuse with care | WHT is a sales-side concept. See §8. |
| Status | No | No | **Yes** | Invoice status derives from payments; quotation status is `open/converted/archived`. Neither fits procurement. |
| Persistence | Pattern only | Pattern only | **Yes — RPC** | Each type has its own `save_*_with_items_transaction` RPC. |
| Save lifecycle | Yes | Yes | Strategy only | `useDocumentSave` is generic. Add a `usePurchaseOrderSave` strategy. |
| PDF | Yes | Yes | Template config only | `PdfDocumentModel` is generic with a `kind` discriminator. |
| Search | Yes | Yes | Add type only | `DocumentType` union and the `search_documents` RPC take new types. |
| Responsive layout | Yes | Yes | No | `useLayoutMode` / `useFoldAwareness` are centralised. |
| List page | Yes | Yes | Adapter only | Add a `ModuleScope` entry and an adapter. |
| View page | Yes | Yes | No | `document-view/shared/*` is already type-neutral. |
| Conversion / linking | Yes | Yes | No | `custom_fields.conversionTrail`. |

---

# 8. Procurement Semantics That Must Not Be Inherited Blindly

| Sales concept | Where it lives | Why Supplier PO must not inherit it |
|---|---|---|
| `selling_price` | `cps_rows.cells->>'sp'`, `calculateCpsTotals.ts` `total_selling_price` | A purchase order records cost, not selling price. |
| `unit_price` meaning | `invoice_items.unit_price`, `quotation_items.unit_price` | The column name is neutral, but the label and semantics are "rate charged to the client". On a PO it is "unit cost paid to the supplier". |
| `client_id` / `client_name` | `invoices`, `quotations` | The counterparty is a supplier. Reusing `client_id` would corrupt the client ledger. |
| Payment state | `payments` table, `financialState.ts`, `resolveInvoiceStatus.ts` | Invoice status derives from received payments. A PO derives from goods received. |
| `Payments` FK | `payments.invoice_id` | A PO must not appear as an invoice. |
| `wht` | `Calculations.ts` `WhtType` | Withholding tax applies to the company's own receivables. Confirm before including. |
| `workmanship`, `transportation`, `shipping` | `invoices` columns, `FormCommercialTerms.tsx` | These are service-delivery charges. They may or may not apply to procurement. |
| Quotation validity | `quotations.valid_until`, `quotationStatus.ts` OVERDUE | A PO has an expected delivery date, not a validity window. |
| Revert | `document-transformation-standard.md` §4.1 | Revert is Invoice-only. Supplier PO must be blocked from revert. |
| Conversion to Invoice | `documentConversion.ts`, `appendDerivedTrail` | A PO does not convert into a sales document. |
| `receipts` | `receipt-standard.md` | Receipts are proof of payment for an invoice. Not for a PO. |
| Client address on PDF | `pdf/engine/party.ts`, receipt snapshot `client_address` | The PDF party block must render the supplier, not a client. |

Note on the transformation standard: it names Invoice, Quotation, Waybill, CSR, BOQ, and RFQ. `receipt-standard.md` §7.1 explicitly excludes Receipt. Supplier PO is not named. The standard must be extended to state whether Supplier PO participates in the 3 Laws System. This is an open decision, not an oversight to guess at.

---

# 9. Database / RLS Impact

No SQL was written. This section describes the future footprint only.

| Item | Impact |
|---|---|
| New tables | `suppliers` and `purchase_orders` plus `purchase_order_items`, in `tenant_master_template`. |
| Tenant template | Three new tables seeded into `tenant_master_template`. |
| `_prov_get_template_tables()` | **Must be updated.** It is a hardcoded `text[]`. A new table is not cloned until it is listed. |
| `_prov_table_to_resource()` | **Should be updated.** It has an `ELSE p_table` fallback, so it degrades safely, but an explicit `'purchase_orders' → 'purchase_order'` mapping matches existing style. |
| Existing tenants | A backfill loop must clone the new tables into every `entity_*` schema. The existing enumeration pattern filters by `tablename = 'quotations'`. Reuse it. |
| RLS | Installed per table by `_prov_install_rls`. No bespoke policy needed. |
| Grants | Handled by `_prov_create_schema` (scoped GRANT). |
| Foreign keys | `_prov_readd_foreign_keys` re-points FKs from the template to the target schema. |
| Triggers | `_prov_install_canonical_triggers` covers `updated_at` and row ownership. |
| Numbering | Extend `check_document_prefixes_format` with a `purchase_order` key. Add the key to `DEFAULT_PREFIXES`. Backfill `settings.document_prefixes` for existing rows, following the `receipt` precedent in `20260707000000_receipt_snapshot_and_idempotency.sql`. |
| `activity_events.entity_type` | CHECK currently allows `invoice, quotation, project, receipt, waybill, csr, rfq, boq`. Add `purchase_order`. |
| `activity_events.event_type` | CHECK lacks `DUPLICATE`, `CONVERT`, `REVERT`. Add if PO lifecycle needs them. |
| Save RPC | A new tenant-local `save_purchase_order_with_items_transaction`, mirroring the invoice and quotation RPCs. Installed through a `_prov_install_*` helper and called from `provision_entity`. |
| Search | Extend `search_documents` with PO branches. Add `'purchase_order'` to the `DocumentType` union. `MatchSource` already carries `'vendor'`. |
| PostgREST | `NOTIFY pgrst, 'reload schema'`. |

Incomplete-tenant policy: the convergence migration establishes that provisioning-complete schemas must succeed and structurally incomplete schemas may be skipped by name with a reason. Unknown failures abort. Preserve this.

---

# 10. UI / Responsive Implementation Path

Responsive support is already centralised. Supplier PO inherits it without new layout code.

| Mode | Mechanism | Supplier PO path |
|---|---|---|
| Mobile | `useLayoutMode().isMobile`, Tailwind `md:` breakpoints, `FormFooter` action bar | Reuse. Nothing new. |
| Fold Close | `useFoldAwareness()` → `hasFold`, `isFoldable`; `AndroidFoldAwareness.tsx` | Reuse. Nothing new. |
| Fold Open | same hook, panelled layout | Reuse. Nothing new. |
| Tablet | `useLayoutMode().isTablet` | Reuse. Nothing new. |
| Desktop | `lg:` breakpoints, `DesktopActionRail` inside `SharedDocumentForm` | Reuse. The rail is already type-neutral apart from the title. |

Required refactor before reuse:

1. Replace the `isQuotation: boolean` prop with a document-family descriptor. A descriptor carries the display label, the number label, the date label, and the party label.
2. Thread the descriptor through `SharedDocumentForm`, `FormHeader`, `FormLineItems`, and `FormCommercialTerms`. The `FormHeader` ternaries are the bulk of the work — 8 sites.
3. Provide the party picker as a slot. `ClientSelector` becomes one implementation, a future `SupplierSelector` becomes another.

Do **not** duplicate layouts. Do **not** fork `SharedDocumentForm` into a `PurchaseOrderForm` unless the descriptor proves insufficient. The consolidation standard prefers one form UI where the domain models fit.

---

# 11. PDF Implementation Path

Reusable unchanged:

| Piece | Path |
|---|---|
| Pipeline entry | `src/components/pdf/index.ts` — `generatePdf` is generic |
| Model | `PdfDocumentModel` with `PdfDocumentIdentity.kind` |
| Renderer | `src/components/pdf/renderers/PdfRenderer.tsx` |
| Templates | 7 templates: industry, ledger, crest, minimal, ember, bolt, evergreen |
| Engine primitives | `engine/party.ts`, `engine/totals.ts`, `engine/group.ts`, `engine/columnLayout.ts`, `engine/alignment.ts`, `engine/attachments.ts`, `engine/advance.ts` |
| Delivery | `CompositePdfDelivery`, `WebPdfDelivery`, `NativePdfDelivery` |

Must be procurement-specific:

| Piece | Reason |
|---|---|
| `kind` value | A new `PdfDocumentKind`. |
| Title text | "PURCHASE ORDER", not "INVOICE". |
| Party block content | Supplier, not client. `engine/party.ts` renders whatever it receives — the preparer supplies supplier data. |
| Totals labels | "Unit Cost", "Total Cost". Same rows, different labels. |
| A `buildPurchaseOrderRenderPayload` domain function | The PDF must receive prepared data. `document-transformation-standard.md` forbids calculation in renderers. The `buildPdfRenderPayload.ts` in `src/domain/invoice/` is the precedent. |

Note: CPS uses a **separate** PDF engine (`@formepdf/core`, `generateCpsFormePdf`). Supplier PO must use the commercial engine, not the CPS engine. A purchase order is a commercial document.

Note: `receipt-standard.md` references `src/components/pdf-new/`. The actual directory is `src/components/pdf/`. The standard is stale on this path.

---

# 12. Search Implementation Path

The Phase 3 search platform is already extended to 7 document types. The extension point is documented in `src/domain/search/types.ts`:

> "Extended by: future document types (waybill, csr, rfq, cps) without changes here"

Current state:

- `DocumentType` = `quotation | invoice | rfq | cps | csr | waybill | receipt`
- `MatchSource` already includes `'vendor'`
- `search_documents(p_term, p_document_types, p_client_id, p_limit)` returns the shared result shape
- Deduplication uses `DISTINCT ON (document_type, document_id)` with best rank winning
- Routes are pre-built in SQL, for example `'/invoices/' || i.id::text`

Supplier PO would need:

1. Add `'purchase_order'` to the `DocumentType` union.
2. Add header and item CTEs to `search_documents`, in a new additive migration.
3. Reuse existing rank bands: 1000 exact number, 900 number prefix, 800 number substring, 750 exact title, 650 title substring, 500 party (supplier), 400 exact item description, 300 item substring, 250 specification.
4. Add a `ModuleScope` entry and an adapter in `src/config/moduleAdapters.ts` if list search is also wanted.
5. Add a route mapping after the PO view route exists.

Note: `search_documents` filters `client_id` client-side. Supplier PO has no `client_id`. Follow the Phase 3 precedent for RFQ and CPS — those branches carry `AND p_client_id IS NULL` and are skipped entirely under a client scope. Do not fabricate a supplier-to-client relationship.

---

# 13. Risks

Ranked by severity.

| Rank | Risk | Why it matters | Mitigation |
|---|---|---|---|
| 1 | **No supplier authority exists** | Supplier PO has no party to reference. This is a hard blocker. | Build a `suppliers` table and picker first. Phase A. |
| 2 | **`SharedDocumentForm` is a binary sales form** | A third document type renders as an Invoice — wrong labels for title, number, dates, and validity. | Refactor `isQuotation: boolean` to a family descriptor before adding a third type. Phase B. |
| 3 | **Save-strategy duplication** | `useInvoiceSave` (526) and `useQuotationSave` (464) repeat the same lifecycle skeleton. A third copy adds a third maintenance site. | Extract the shared skeleton, or at minimum follow the strategy contract exactly. |
| 4 | **Calculation coupling** | `computeDocument` is shared and correct, but its inputs are built per page by `buildCalculationInputs`. A PO page must build the same input shape. | Reuse `buildCalculationInputs` and `resolveFinancialColumns`. Do not write a new calculation path. |
| 5 | **Accounting coupling** | `save_invoice_with_items_transaction` posts to the source-transaction boundary. A PO must not post as revenue. | Give PO its own RPC. Do not reuse the invoice RPC. |
| 6 | **`_prov_get_template_tables` is a hardcoded array** | A new table is silently not provisioned for new tenants. | Update the array in the same migration. |
| 7 | **Wrong party abstraction** | Reusing `client_id` or `ClientSelector` would corrupt the client ledger. | New `suppliers` authority. Never reuse `client_id`. |
| 8 | **PDF coupling** | `PdfRenderer` and templates are shared. A wrong `kind` or a client party block would produce a wrong document. | New `kind`, new party data, new labels. Reuse the engine only. |
| 9 | **Responsive duplication** | Copying layouts instead of reusing them would fork five viewport modes. | Reuse `useLayoutMode` and `SharedDocumentForm` after the descriptor refactor. |
| 10 | **Route/registry exhaustion** | `ModuleScope` and the adapter registry are exhaustive `Record` types. A missing entry is a compile error plus a runtime throw. | Add entries deliberately. TypeScript enforces completeness. |
| 11 | **Status model mismatch** | Invoice status derives from payments; quotation status is `open/converted/archived`. Neither fits procurement. | Design a PO status set from procurement need. Do not reuse either. |
| 12 | **Standard gaps** | Supplier PO is not named in `document-transformation-standard.md` or `lifecycle-ownership-standard.md`. The party architecture standard is a placeholder. | Decide PO's participation in the 3 Laws System and record it. |
| 13 | **Lifecycle audit naming** | The `event_type` CHECK lacks `DUPLICATE`, `CONVERT`, `REVERT` named by the transformation standard. | Extend the CHECK if PO lifecycle needs those events. |
| 14 | **`vendor_name` legacy reuse** | `boqs.vendor_name` was repurposed to hold a client name. Treating it as a supplier source would import wrong data. | Never use `boqs.vendor_name` as a supplier source. RFQ is the only real vendor precedent. |

---

# 14. Recommended Implementation Sequence

Adjusted to repository findings. The supplier authority and the form descriptor are prerequisites, not later refinements.

**Phase A — Supplier domain foundation**
Build `suppliers` in `tenant_master_template` with contact and address fields. Add a `SupplierSelector` modelled on `ClientSelector`. Provision it. This is the blocker for everything else.

**Phase B — Shared form descriptor extraction**
Replace `isQuotation: boolean` with a document-family descriptor. Thread it through `SharedDocumentForm`, `FormHeader`, `FormLineItems`, and `FormCommercialTerms`. Convert the party picker to a slot. Add a regression test proving Invoice and Quotation labels are unchanged.

**Phase C — Supplier PO form**
Create `PurchaseOrderFormPage.tsx` with a `mode` prop, plus 5-line `NewPurchaseOrder.tsx` and `EditPurchaseOrder.tsx` delegators. Create `usePurchaseOrderSave` as a `DocumentSaveStrategy`. Reuse `buildCalculationInputs`, `computeDocument`, and `FormTotals`. Do not add a new calculation path.

**Phase D — Persistence, list, and detail**
Add `purchase_orders` and `purchase_order_items` to the template. Add `save_purchase_order_with_items_transaction`. Update `_prov_get_template_tables` and `_prov_table_to_resource`. Backfill all `entity_*` schemas. Add the `ModuleScope` entry, the adapter, the routes, and the view page from `document-view/shared/*`.

**Phase E — Numbering and status**
Add the `purchase_order` prefix key. Extend `check_document_prefixes_format`. Backfill `settings.document_prefixes`. Add the settings UI entry and preview template per the prefix standard Appendix B. Define the PO status set.

**Phase F — PDF**
Add a `PdfDocumentKind`, a `buildPurchaseOrderRenderPayload` domain function, and PO labels. Reuse the templates and engine primitives.

**Phase G — Linking and conversion**
Decide whether a PO links to an RFQ, a CPS, and a Project. Reuse `custom_fields.conversionTrail` and the `project_id` column. Extend the transformation standard to state whether PO participates in the 3 Laws System.

**Phase H — Search integration**
Add the `'purchase_order'` type and the PO branches to a new additive migration. Skip PO under a client scope, following the RFQ and CPS precedent.

**Phase I — Verification**
Run `bun run audit:load`, then `bun run typecheck`, then `bun run test`. Verify tenant coverage on `tenant_master_template` and all eligible `entity_*` schemas. Verify `provision_entity` for a new tenant. Verify PostgREST sees the new RPC and the extended `search_documents`. Do not run `bun run build`.

---

# 15. File Impact Forecast

No file below was created or modified by this audit.

## New files

| File | Purpose |
|---|---|
| `supabase/migrations/<ts>_suppliers_domain.sql` | `suppliers` table, provisioning, RLS |
| `supabase/migrations/<ts>_supplier_purchase_order.sql` | `purchase_orders`, `purchase_order_items`, save RPC, prefix key, provisioning |
| `supabase/migrations/<ts>_purchase_order_search.sql` | PO branches in `search_documents` |
| `src/domain/supplier/types.ts` | Supplier types |
| `src/domain/purchaseOrder/types.ts` | PO types, status, factories |
| `src/domain/purchaseOrder/normalize.ts` | Persistence-to-form hydration |
| `src/domain/purchaseOrder/pdfRender.contract.ts` | PDF payload contract |
| `src/domain/purchaseOrder/buildPdfRenderPayload.ts` | Prepared PDF data |
| `src/hooks/usePurchaseOrderSave.ts` | Save strategy |
| `src/pages/PurchaseOrderFormPage.tsx` | Single create/edit form page |
| `src/pages/NewPurchaseOrder.tsx` | 5-line delegator |
| `src/pages/EditPurchaseOrder.tsx` | 5-line delegator |
| `src/pages/PurchaseOrders.tsx` | List page |
| `src/pages/ViewPurchaseOrder.tsx` | Detail view |
| `src/components/supplier/SupplierSelector.tsx` | Supplier party picker |
| `src/components/document-view/purchase-order/*` | View components |
| `src/tests/critical/purchaseOrderPlatform.test.js` | Structural and domain tests |

## Modified files

| File | Change |
|---|---|
| `src/components/document/SharedDocumentForm.tsx` | Replace `isQuotation` with a family descriptor |
| `src/components/document/FormHeader.tsx` | Descriptor instead of 8 ternaries |
| `src/components/document/FormLineItems.tsx` | Descriptor prop |
| `src/components/document/FormCommercialTerms.tsx` | Descriptor prop; gate sales-only terms |
| `src/domain/prefixConstants.ts` | Add the `purchase_order` prefix key |
| `src/config/moduleAdapters.ts` | Add the `ModuleScope` entry and adapter |
| `src/components/app/AppShell.tsx` | Add lazy imports and routes |
| `src/components/layout/navData.ts` | Add the nav entry |
| `src/domain/search/types.ts` | Add `'purchase_order'` to `DocumentType` |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | Add the settings entry and preview |
| `docs/standard/document-transformation-standard.md` | State PO participation in the 3 Laws System |
| `docs/standard/prefix-engine-settings-standard.md` | Add PO to the module table; refresh the stale key list |

## Protected files — do not touch

| File | Reason |
|---|---|
| `src/lib/Calculations.ts` | Financial source of truth. Reuse only. |
| `src/components/pdf/renderers/*`, `src/components/pdf/templates/*` | Renderers are presentation only. |
| `src/domain/invoice/calculations.ts` | Deprecated. No production callers. |
| Any existing migration | New work is additive only. |
| `src/modules/item-library/*`, `src/domain/item/*` | No Item Library dependency is introduced. |
| `src/domain/cps/` | CPS calculation behaviour is protected. |
| `src/hooks/useDocumentSave.ts` | Generic core. Extend by strategy, not by edit. |

---

# Appendix — Evidence Index

Every architectural claim in this report traces to one of these verified sources.

| Claim | Evidence |
|---|---|
| Shared form UI | `src/components/document/SharedDocumentForm.tsx`; imported at `InvoiceFormPage.tsx:450`, `QuotationFormPage.tsx:666` |
| Binary document switch | `SharedDocumentForm.tsx:241`; `FormHeader.tsx:44,88,92,98,105,127,129,137,139`; `FormCommercialTerms.tsx:131,159` |
| Generic save hook | `src/hooks/useDocumentSave.ts`; consumers `useInvoiceSave`, `useQuotationSave`, `useCpsSave`, `useLetterSave` |
| Calculation authority | `src/lib/Calculations.ts:767` `computeDocument` |
| Party picker is client-only | `src/components/ClientSelector.tsx:74` queries `clients` |
| Responsive centralisation | `src/hooks/useLayoutMode.ts` → `src/hooks/FoldAwareness.ts` |
| No supplier table | Zero `CREATE TABLE … supplier/vendor` matches in `supabase/migrations/` |
| Vendor is free text | `src/domain/rfq/types.ts` `vendor_name`, `vendor_contact` |
| BOQ vendor columns are repurposed | `src/domain/cps/normalize.ts:71-74` |
| Template table list is hardcoded | `_prov_get_template_tables()`, `20260927162405_item_library_tier_c_stage2b_reconciliation.sql:1249` |
| Resource map | `_prov_table_to_resource()`, `20260809010000_invoice_aggregate_provisioning.sql:48` |
| Provisioning clone loop | `provision_entity()`, `20261014100000_document_search_platform.sql:340` |
| Numbering engine | `src/domain/prefixConstants.ts` `DEFAULT_PREFIXES`, `formatDocumentNumber`, `nextAutomaticNumber` |
| Numbering extension checklist | `docs/standard/prefix-engine-settings-standard.md` Appendix B |
| Prefix CHECK constraint | `20260707000000_receipt_snapshot_and_idempotency.sql:98` |
| Search contract | `src/domain/search/types.ts` `DocumentType`, `MatchSource` |
| Search RPC | `search_documents`, `20261014100000_document_search_platform.sql`, extended by `20261014160000_document_search_phase3.sql` |
| Search route mapping | `search_documents` builds `'/invoices/' || i.id::text` |
| Invoice status derivation | `src/domain/invoice/resolveInvoiceStatus.ts`, `financialState.ts` |
| Quotation status | `src/components/quotation/quotationStatus.ts` |
| Receipt status CHECK | `docs/standard/receipt-standard.md` §3.1 |
| Lifecycle lineage | `src/domain/documentConversion.ts` `withSourceTrail`, `appendDerivedTrail` |
| Identity immutability | `src/domain/invoice/assertIdentityImmutable.ts`, `src/domain/quotation/assertIdentityImmutable.ts` |
| Save RPCs | `save_invoice_with_items_transaction` (`useInvoiceSave.ts:348`), `save_quotation_with_items_transaction` (`quotationSaveTransaction.ts:159`) |
| Audit entity types | `20260707000000_receipt_snapshot_and_idempotency.sql:121` |
| PDF pipeline | `src/components/pdf/index.ts`, `PdfDocumentModel`, `renderers/PdfRenderer.tsx` |
| PDF engine primitives | `src/components/pdf/engine/party.ts`, `totals.ts`, `group.ts` |
| View shell | `src/components/document-view/shared/*` (30 files) |
| Routes | `src/components/app/AppShell.tsx:305-338` |
| List adapters | `src/config/moduleAdapters.ts` `adapterRegistry` |
| Form consolidation rule | `docs/standard/document-form-consolidation-standard.md` §3 |
| Save lifecycle rule | `docs/standard/document-save-orchestration.md` §2 |
| Ownership rule | `docs/standard/lifecycle-ownership-standard.md` §3 |
| 3 Laws rule | `docs/standard/document-transformation-standard.md` §2-4 |
| Party standard is a placeholder | `docs/standard/Commercial Party Architecture Standard.md` — content is "coming soon" |
| Project link table | `tenant_master_template.project_documents` — `type`, `from_party`, `to_party`, `data jsonb` |

---

## Risks or limitations

- This audit is static inspection only. No query ran against the live database. Column lists come from migration DDL and TypeScript types, which agree.
- `bun run typecheck`, `bun run lint`, and `bun run audit:load` were not run. The task forbids them for a zero-code audit.
- `docs/standard/Commercial Party Architecture Standard.md` is a placeholder. The report does not treat it as authoritative.
- The report names three standards that need extension for Supplier PO (`document-transformation-standard.md`, `prefix-engine-settings-standard.md`, and the new party standard). It does not predict their final content.
- Line counts are accurate as of this audit and will drift.

## Deferred work

- Decide whether a Supplier PO participates in the 3 Laws System (Edit, Duplicate, Revert).
- Decide whether RFQ `vendor_name` values should be promoted into a `suppliers` table, or whether RFQ should later reference the new supplier authority.
- Decide the PO status set. Investigate whether a goods-receipt capability is needed.
- Decide whether PO lines should reference CPS rows for cost lineage, following the `source_cps_id` precedent on `invoice_items`.
- Extend `prefix-engine-settings-standard.md`. It lists 7 prefix keys; the code has 9.
- Reconcile the prefix key naming drift between `DEFAULT_PREFIXES` (`cps_sheets`) and the database CHECK constraint (`boq`).
- Reconcile the audit `event_type` drift. The transformation standard names `DUPLICATE`, `CONVERT`, and `REVERT`; the CHECK constraint does not include them.
- Correct the stale `src/components/pdf-new/` path in `receipt-standard.md`.
