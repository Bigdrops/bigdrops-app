# Bolu Invoice & Quotation Capability Parity Audit

**Date:** 2026-11-18 · **Type:** AUDIT — Read-only investigation · **Author:** OpenCode agent (Inkling 2 Small Free) · **Output:** this report only.

## 1. Executive summary

Bolu can already prepare, display and persist *basic* invoice and quotation proposals through its two-gate workflow (Gate 1 review, Gate 2 explicit save confirmation). The core financial engine is shared and sound: proposals are costed by `calculateDocument` (`src/lib/Calculations.ts`), model-generated totals are never trusted, persistence recomputes authoritatively, and invoice/quotation creation goes through the same tenant-scoped composite RPCs the form uses.

**Bolu is not at capability parity with the invoice/quotation forms, and the gap is concentrated in predictable places:**

1. **Advance Invoice is entirely invisible to Bolu.** It is a read-only presentation projection of a parent invoice (a `custom_fields.advance_invoice` block, a `-A` suffix number, two labels, an advance-summary block in the PDF), not a new document family. Bolu has no intent, schema, field, display, preview or persistence awareness of it. Any advance configuration on a parent document is also at risk: Bolu's item-modification RPC payload omits `custom_fields`, so the tenant update RPC writes `NULL`/`{}` into `custom_fields`.
2. **Severe, silent data loss in the modification path.** `persistInvoiceModification` (`src/lib/ai-assistant/bolu-document-service.ts:800-842`) rebuilds the `p_invoice_payload` from a *5-field* fetch (`id, invoice_number, client_name, notes, terms, due_date, issue_date, total, archived_at`) plus a mis-scoped recompute. The tenant `save_invoice_with_items_transaction` update branch then writes `custom_fields = NULL`, `po_number/invoice_title/project_id = NULL`, `payment_terms = NULL`, `workmanship/transportation/shipping = 0`, `install_rate_total = 0`, `status = 'unpaid'`. Per-item `vat_rate`, `discount_rate`, `install_rate`, `image_url` and `custom_data` are dropped by the re-serialization, and items are re-costed with VAT 7.5%, zero discount and zero WHT regardless of the document's stored commercial configuration. The quotation path mirrors this with `custom_fields = '{}'` and `status = 'open'`.
3. **Commercial charges** (named extra charges with per-charge VAT flags; fixed workmanship/transportation/shipping) are the strongest part of Bolu parity: validated, calculated, displayed and persisted — but create-only, and modify-charges is a hard error (by design, and correctly surfaced).
4. **Material classes of invoice/quotation capability are unrepresentable in a Bolu proposal at all:** line groups and group subtotals, `mergeQtyUnit`/column configuration, header custom fields, “other commercial details” additional fields, attachments/reference links, signatory assignment, PDF output options, invoice design/theme, and any manual invoice number. Bolu create flow drops these silently — nothing is shown in the proposal and nothing is persisted.
5. **Preview is the proposal card, not the document.** There is no Bolu document/PDF preview. Several persisted-but-invisible behaviours (e.g. per-line VAT/discount rates, install-rate lines) cannot be reviewed before Gate 2, so a proposal cannot fully “accurately communicate what Bolu intends to save.”

**None of the gaps is exotic or architectural.** They are schema/prompt/display omissions, one over-narrow item serialization, and one unsafe payload reconstruction in the modification path. A small, staged sequence — not a rewrite — closes them (§10).

**Bottom line: do not let Bolu claim or imply parity today.** Completed read-only investigation; limitations disclosed (§2.4, §12).

## 2. Investigation scope and evidence sources

### 2.1 Authorization and constraints
Read-only investigation plus this report. No application code, database, configuration or migration changes were made. No build was run (`bun run build` is prohibited on this 4 GB host). No tests were executed; existing tests were inspected statically (§12). No migrations deployed; no documents created; no production writes. `BIGDROP`/`bigdrops` identifiers preserved. Only this file is task-attributable.

### 2.2 Evidence sources (all source-level, current `main`)
- Git baseline: `## main...origin/main [ahead 12]`, HEAD `295f98e4`, pre-existing modifications `.workbuddy-ai/memory/2026-11-18.md` and untracked `docs/reports/bolu-persistence-integrity/*` preserved untouched.
- Four independent deep traces were run (invoice, quotation, Advance Invoice, Bolu) and their load-bearing claims were re-verified by direct inspection (`src/lib/Calculations.ts`, `src/lib/ai-assistant/*`, `src/hooks/useInvoiceSave.ts`, `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql`, `supabase/migrations/20260520090002/3_*.sql`).
- Financial math was verified against `src/lib/Calculations.ts` (Decimal.js, precision 20, ROUND_HALF_UP).
- Persistence was verified against `useInvoiceSave.ts`, `src/domain/quotation/quotationSaveTransaction.ts`, and the tenant RPC installer migrations.
- Historical reports (e.g. `docs/reports/ai-BOLU/*`, `docs/reports/bolu-persistence-integrity/*`) and the PRDs/prototypes were used as leads only; every claim in this report is grounded in current source. The supplied production deployment report is historical evidence and is **not** treated as proof of current repository or hosted state.

### 2.3 Method
Static source tracing end-to-end per family: form state → field definitions → types/validators → `computeDocument` → save payload (`useInvoiceSave.buildPayload`, `useQuotationSave`) → tenant composite RPC (`save_invoice_with_items_transaction`, `save_quotation_with_items_transaction`) → persistence (`invoices`/`quotations`, `*_items`, `custom_fields`) → preview model → PDF payload/templates. Bolu: intent match → context resolution → provider system prompt → envelope parse → `validateInvoiceCreateInput` → `buildInvoiceCreateProposal` → proposal card (`ProposalCardView`) → Gate 1/Gate 2 (`bolu-reducer.ts`, `useBoluThread.ts`, `api/bolu-save.ts`) → `persistInvoiceCreation|persistQuotationCreation` → same tenant RPCs.

### 2.4 Limitations
- Hosted database/tenant template state was not inspected (no credentials, no production reads). Whether the tenant installer migration (`20261118130000_bolu_tenant_rpc_installer.sql`) is applied on the live host is a deployed-state claim this audit does not verify.
- No browser/UI was run. All UI statements are source-only. No viewport verification (Mobile/Fold Closed, Fold Open, Tablets, Desktop) was performed; none is claimed.
- `save_invoice_with_items_transaction`/`save_quotation_with_items_transaction` bodies were read, not executed.
- The quote in §8 about RPCs applies to the tenant-template RPCs; per-tenant provisioning in live schemas was not enumerated.
- Tests were not executed (avoid side effects); "expected" behaviour is inferred from source and test source-text, not from a green run.
- Two anomalies were found in legacy/adjacent code (legal-looking but likely-dead code paths); both are reported, not fixed.

## 3. Existing invoice capability inventory

### 3.1 Data model and save spine (verified)
- Form: `src/pages/InvoiceFormPage.tsx` (state `InvoiceFormFields`, `InvoiceItem[]`), shared renderer `src/components/document/SharedDocumentForm.tsx` + `Form*` components.
- Calculation: `computeDocument` → `calculateDocument` (`src/lib/Calculations.ts:141-568`) via `normalizeDocumentInput` (`:601-725`). Decimal.js, `precision: 20`, `ROUND_HALF_UP` (`:38`). `document.vat/discount/wht` are **computed totals, never rate inputs** (`:26-32`); rates come from `cf.calculationInputs` with legacy fallbacks (`:615-649, 732-761`).
- Save: `useInvoiceSave.buildPayload` (`src/hooks/useInvoiceSave.ts:225-320`) → tenant RPC `save_invoice_with_items_transaction(p_entity_id, p_invoice_payload, p_items, p_mode, p_cps_feedback)` (`:348, 407`); pre-cutover sequential fallback (`:417-437`); items DELETE+INSERT inside the RPC; `operation_id` written by the RPC (`20261118130000_bolu_tenant_rpc_installer.sql:112,157-177`).
- Items serialize via `toDbItem` (`src/domain/invoice/factories.ts:97-123`): `amount = qty × unit_price`, `_uiKey/_isStarter/temp_ref/id` stripped, `custom_data` JSON-stringified, `install_rate_override` persisted, `install_rate_taxable`/`show_install_rate`/`formula` **never written by the form**.
- Identity lock (edit): `client_id`, `client_name`, `invoice_number`, `document_type` immutable (`InvoiceFormPage.tsx:300-307`; re-validated `useInvoiceSave.ts:193-209`).
- Every form save writes `status='unpaid'` (`InvoiceFormPage.tsx:429,504-506`).

### 3.2 Header / document metadata

| Label | Source prop → DB | Type / default | Req | Calc | Notes |
|---|---|---|---|---|---|
| Client | `client_id` → `invoices.client_id` (uuid) | required, edit-locked | R | — | validated at save (`useInvoiceSave.ts:170-173`) |
| Client name | `client_name` → col | text, mirror | R | — | edit-locked; PDF recipient |
| Invoice title | `invoice_title`/`invoiceTitle` → col | text\|null | O | — | PDF identity.title |
| Invoice No. | `invoice_number` → col NOT NULL | text; auto `<PREFIX>-…`; manual override on create only | O* | — | edit read-only; `withUniqueRetry` |
| PO number | `po_number` → col | text\|null | O | — | preview/PDF detail row |
| Issue date | `issue_date` → col (`date`) | ISO date; default today | O | — | |
| Due date | `due_date` → col (**text**) | text\|null | O | — | never validated as date at DB |
| Status | `status` → col default `'unpaid'` | text | — | — | **not editable in form**; save forces `'unpaid'` |
| Document type | `document_type` → col | `'invoice'` | — | — | used for list filtering |
| Payment terms | `payment_terms` → col | select `Custom/Net 7/Net 14/Net 30/Due on Receipt`; default `Custom` | O | — | if `Custom`, the **custom text** is saved in this column; nothing records that Custom was selected |
| Custom payment terms | `custom_payment_terms` (form state only) | text | O | — | folded into `payment_terms` at save; **not re-hydrated** (`normalize.ts:228`) |
| Work duration | `work_duration` → col | text | O | — | no editor in form; prefill/conversion only |
| Header fields | `customFields[]` → `custom_fields.header` | `{id,label,value}` filter label&&value | O | — | PDF/preview detail rows |
| Notes | `notes` → col (rich HTML) | default `''` | O | — | `normalizeRichTextHtml` |
| Terms & Conditions | `terms` → col (rich HTML) | default `''` | O | — | |
| Notes/Terms section titles | `notesTitle`,`termsTitle` → `custom_fields.*` | `'Notes'` / `'Terms and Conditions'` | O | — | **no editor anywhere** (props unused) |
| Linked quote / CSR | `linked_quote_id`,`linked_csr_id` → col | uuid | O | — | set by conversion flow; not user-facing |
| Amount in words | `amount_in_words` → col | text | — | words view | recomputed on save from `totalPayable` |

### 3.3 Line items (`InvoiceItem`, `src/domain/invoice/types.ts:230-274`)

Builtin columns and defaults (`src/domain/invoice/columns.ts:23-33`): `description, quantity, make, unit, unit_price, amount` = **show**; `install_rate` = hide_display, `includeInTotal: true`, `formula: ''`; `vat_rate`, `discount_rate` = hide_display. `visibilityMode ∈ show | hide_display | hide_full`.

| Label | Item prop → DB (`invoice_items`) | Notes |
|---|---|---|
| Description (req) | `description` (NOT NULL) | validated non-empty at save |
| Sub description | `sub_description` col | PDF/preview detail |
| Quantity | `quantity` (≥0; ≤0→**1**) | `normalizeQuantity` fallback 1 |
| Make | `make` col | "Make / brand" |
| Unit | `unit` col | free text / merged-qty-unit mode |
| **Part No.** | `partNo` → **no column** | not a builtin column; custom column keys are `custom_*`; value **never rendered, never persists** |
| **Condition** | `condition` → **no column** | same; dropped |
| Rate | `unit_price` col | |
| Item image | `image_url` col | upload via MobileItemCard; `resolveCanonicalItemImageUrl` |
| Amount (computed) | `amount` col | recomputed `qty × unit_price`; PDF cell shows qty×price only (VAT/disc/install not per-line) |
| VAT % | `vat_rate` col | null = inherit global; explicit 0 = zero (but form cannot express explicit 0) |
| Disc % | `discount_rate` col | NULL→0→healed NULL on read |
| Install | `install_rate` + `install_rate_override` (col) + `install_rate_taxable` (form never writes) | install money adds to totals; hidden by default |
| Group header | `row_type='group_header'`, `group_id`, `group_name`, `sort_order` | group subtotals in preview/PDF; `groupMeta{ name, showSubtotal }` in cf |
| Item catalog link | `item_id` col | |
| Lineage | `source_cps_id`,`source_cps_row_id`,`source_quotation_id`,`source_quotation_item_id` cols | system-owned; never inferred |
| Custom column values | `custom_data` jsonb | keyed by `custom_*` keys |
| Formula | `formula` col | auto install = `formula × qty × price`; never written by form |

Group semantics: `group_header` rows carry identity only; groups accumulate `subtotal`/`installTotal` (`Calculations.ts:443-455, 543-549`); `hideEmptyGroups` read with default `true` (never written).

### 3.4 Commercial terms, charges, taxes

| Label | Props → storage | Type / default | Calc effect |
|---|---|---|---|
| Discount value | UI `invoice.discount`; input persisted `cf.calculationInputs.discountValue`; **computed amount** persisted `invoices.discount` | `percent`\|`fixed`; default `percent`; `before_tax`\|`after_tax`; default `before_tax` | percent → per-row; fixed before_tax → proportional allocation across taxable rows clamped to eligible base (fallback: allocate across all inheriting rows when no taxable rows, `Calculations.ts:176-267`); fixed after_tax → document level |
| VAT rate | input `cf.calculationInputs.vatPercent`; **computed** persisted `invoices.vat` | default **7.5%** | per-row `lineVatBase × rate/100`; row override wins; `hide_full` VAT column forces 0 globally |
| WHT | `cf.calculationInputs.whtValue/Type`; computed persisted `invoices.wht` | `percent`\|`fixed`; default `percent` / 0 | **WHT base = subtotal + install + extra charges − discount; VAT never included** (`Calculations.ts:503-522`); `totalPayable = grandTotal − wht` |
| Extra charges | `extraCharges[{id,label,value,withTax}]` → `cf.extraCharges` (no column) | label required, value number, `withTax` default **true** (`makeExtraCharge`) | taxable: added to VAT base at **global rate only**, added to WHT base; non-taxable: added to grand total only; filter: non-empty label kept (`useInvoiceSave.ts:251`) |
| Workmanship / Transportation / Shipping | `workmanship`,`transportation`,`shipping` → numeric cols (COALESCE 0) | default 0; **no inputs in this form** (only prefill/conversion) | injected as extra charges with `vatApplicable:false` (`Calculations.ts:653-659`); included in WHT base |
| Charge labels | `chargeLabels` → `cf.chargeLabels` | defaults `Workmanship/Transportation/Shipping` | display only; **no editor** (`onChargeLabelChange` dead prop) |
| Install rate | §3.3 | | `installRateTotal` adds to grandTotal even when hidden (unless `hide_full`) |

### 3.5 Presentation, exports, secondary data (all in `custom_fields` unless noted)
`header[]`, `additionalFields[]` ("Other commercial details"), `extraCharges`, `chargeLabels`, `columnConfig`, `notesTitle`, `termsTitle`, `attachments` (reference links), `mergeQtyUnit` (default **true**; no toggle), `showItemImages` (**written, never read**), `discountType/discountTiming/whtType`, `calculationInputs`, `groupMeta`, `signatoryId`, `pdfOutput{ showBankDetails, bankAccountId, showFooter, showTagline, showBalanceDue, showAmountInWords, compact, landscapeLayout }`, `pdfTemplateId` (view-page), `pdf-theme` fields via `DocumentDesignControls`, plus pass-through `advance_invoice`, `conversionTrail`, `source_*`. Legacy `custom_fields.bottom` is **deleted unconditionally on first save** (`useInvoiceSave.ts:232-244`). `attachments` also have a dedicated `invoices.attachments` jsonb column that is **never written**.

### 3.6 Preview & PDF rendering
`ViewInvoice` → `computeDocument` → `buildInvoicePreviewModel` (`src/domain/invoice/previewModel.ts`) → projections (`contentProjection`, `financialProjection`, `partyProjection`); PDF via `buildInvoicePdfPayload` (`invoicePdfActions.ts`) with templates under `src/components/pdf/**`. **PDF line cells show raw `qty × unit_price`** (VAT/discount/install not per-line); totals block carries the rest; install included only when column visible (`hide_display` still includes in totals).

### 3.7 Persisted but never shown / shown but never persisted
- Persisted-not-shown: `vat/discount/wht` rates (only derived labels), `install_rate_total` (summary row only), `status` (PDF identity only), `document_type`, `project_id`, `mergeQtyUnit`, `showItemImages`, `groupMeta` internals, `attachments._uiKey`.
- UI-not-persisted / dropped: `partNo`, `condition` (no column, no visible input), `custom_payment_terms` (folded), `notesTitle/termsTitle` (no editor), `chargeLabels` (no editor), `work_duration` (no editor), `status` (not editable).
- Silently defaulted/discarded (selection): `vat=7.5` create default, `payment_terms='Custom'`, `status='unpaid'` on every save, `quantity≤0→1`, extra charges `withTax` strict `=== true`, `discount_rate 0→null` healing, **legacy conversion prefill copies *computed totals* into what the calculator reads as *rates*** (`invoiceConversionService.ts:87-92` vs `buildCalculationInputs calculations.ts:47-56`) — flagged, out of scope to fix.

## 4. Advance Invoice workflow analysis

### 4.1 What an Advance Invoice is (verified in source)
An Advance Invoice is a **strict read-only presentation variant of a parent invoice — not a separate document, not a database entity, not a financial projection** (`src/domain/invoice/advanceProjection.contract.ts`, `advanceProjection.invariant.ts:10-27`). It exists only when the parent invoice's `custom_fields.advance_invoice` block is present and valid.

**Creation flow (detail page):** Invoice Actions ("Invoice Actions" sheet via `InvoiceMoreSheet.tsx:71-89`) → "Payments & Advances" → **Advance Invoice → Create an advance invoice** → `useInvoiceActions.openCreateAdvanceSheet` resets state (mode `percent`, value **30**, suffix `A`, default labels) → `InvoiceAdvanceSheet` collects: read-only parent number + **suffix**, **Advance Type** Percent|Fixed, **Percentage/Amount** (0–100 or 0–contractValue) with live preview, **Primary label** (default `Advance invoice due now`), **Secondary label** (default `Balance upon completion`) → `handleAdvanceSave` → `createAdvanceInvoiceRecord` (`src/pages/view-invoice-actions.ts:273-339`) → `buildAdvanceParentInvoiceMetadata` (`src/domain/invoice/advanceChildFlow.ts:106-166`) → single `UPDATE invoices SET custom_fields = JSON.stringify(next)` on the **parent** (`saveParentAdvanceInvoiceConfig`, `view-invoice-actions.ts:176-179`) + audit via `record_audit_log` (best-effort, failure logged and swallowed).

**Fields:** inherited = all items, client, PO number, issue/due dates, notes/terms, company/bank/signatory, and the parent's full VAT/WHT/discount/charge math (the advance PDF re-renders **parent totals unchanged** via `computeDocument`, `invoicePdfActions.ts:37-42`). Editable in sheet = suffix, mode, value, primary_label, secondary_label. Generated = `document_number = PARENT-<suffix>` (default `-A`; empty suffix → parent number unchanged), `amount`, `contract_value` (= parent total), `issued_at`/`due_at` (default parent dates), `status` (default `'unpaid'`; preserved, never transitioned by this flow). **Numbering:** suffix, not a parallel sequence; `-ADV` fallback in projection rules (`advanceProjection.rules.ts:33`) is inconsistent with `-A` default (`advanceChildFlow.ts:1`).

**Advance amount semantics:** `percentage` → `round2(contractValue × value/100)`; `fixed` → clamp(value, 0, contractValue); authority order = explicit stored `amount` > calculated from mode+value (`advanceMetadata.ts:104-136`); rounding `Math.round(v*100)/100` (2dp). Percentage stored as `'percentage'` (camelCase `'percent'` normalized). **No advance-specific VAT, WHT, discount, charge treatment, or apportionment exists.** The advance PDF keeps the parent's totals block, *suppresses the "Balance Due" row* (`industryAdapter.ts:373-380, 497-498`), and appends an advance summary block ("Advance due now" / "Balance upon completion" + percent + amount) rendered by every `src/components/pdf/**` template via `buildAdvanceSummary` (`components/pdf/engine/advance.ts`). `totals.mode: 'advance'` in the PDF payload (`invoicePdfActions.ts:174-188`).

**Payments/balance:** advance is **not booked as a payment**; payments still record against the parent invoice id; `advance.status` in metadata has **no coupling** to the payments ledger or `invoice.status`. `buildPdfRenderPayload` excludes payments (`targetPayments: []`); the parent invoice UI is untouched (`isAdvanceContext ≡ isVirtualProjection === true` only).

**Persistence:** one `UPDATE` on the parent's `custom_fields.advance_invoice`; no new row; no RPC (except audit); no `invoice_children` table. Legacy `legacy_child_invoice_id/_number/_total` metadata is retained read-for-traceability only and is quarantined in the view (`ViewInvoice.tsx:105-123`); current flow never writes `role: 'advance'`.

**Eligibility (as written):** none tied to status or payment state; the action is offered unconditionally on the detail page. PDF download requires `metadata.enabled && amount > 0`. Audit trail exists (CREATE/UPDATE/DELETE on the parent). No rollback exists beyond the single update.

**Entry points that don't work:** the list-page "Advance" action navigates with `state.openAdvanceSheet` and nothing reads it (dead intent); `src/modules/invoices/services/invoiceAdvanceService.ts` duplicates the UI logic but is referenced nowhere (appears to be a parallel/legacy implementation; UI uses `src/pages/view-invoice-actions.ts`).

### 4.2 Bolu awareness
**None.** Case-insensitive search for `advance` in `src/lib/ai-assistant/**`, `api/bolu-save.ts`, `api/` returns only: Bolu's document-numbering cursor (`advanceAutoCursor`), provider-failover `'advance'` in `chat.ts`/`protocol.ts`, narration chunking, and the balance-failover classifier. No field, intent, prompt instruction, schema key, proposal slot, card row, or persistence path references advance invoices. Bolu cannot detect, propose, display, persist, or preserve a "change the advance" request; worse, the item-modify path can **destroy** the parent's `custom_fields` (§8.3), silently removing any configured advance.

### 4.3 Advance Invoice parity requirement
Bolu does not need a new document family. The correct shape of parity is: (a) awareness of `custom_fields.advance_invoice` as parent metadata, (b) conversational editing of the same six editable fields through the same gates, (c) reuse of the existing `createAdvanceInvoiceRecord`/`saveParentAdvanceInvoiceConfig` functions, (d) zero new financial semantics.

## 5. Existing quotation capability inventory

### 5.1 Architecture and save spine (verified)
- Form: `src/pages/NewQuotation.tsx`/`EditQuotation.tsx` → `src/pages/QuotationFormPage.tsx` (718 lines). Same shared renderer as invoices (`SharedDocumentForm` + `Form*`). Invoice-like mapping is internal: `quotation_number↔invoice_number`, `valid_until↔due_date`, `quotation_title↔invoice_title` (`QuotationFormPage.tsx:539-544`). Descriptor classifies by page title → `QUOTATION_DESCRIPTOR` (`documentDescriptor.ts:168-180`): title "Quotation", numbers labelled "Quotation No.", `dueDateLabel` = "Valid Until", issue label "Quotation Date". Descriptors are **presentation-only**; persistence keys are hardcoded.
- Save: `useQuotationSave` → `persistQuotationTransaction` (`src/domain/quotation/quotationSaveTransaction.ts`) → tenant RPC **`save_quotation_with_items_transaction`** (`p_entity_id, p_quotation_payload, p_items, p_mode, p_cps_feedback`), template-declared and re-declared verbatim in hotfix migrations (`20261006120000…:2113`, `20261006130000…:2108`, `20261118130000…:2111+`). `has_entity_permission(...,'quotation','create'|'edit')` enforced inside; identity immutable client-side (`assertQuotationIdentityImmutable`, plus `IDENTITY_FIELDS` + `IdentityLockDialog`). Online path requires the tenant RPC; offline SQLite path exists for Android drafts.
- Calculation: **identical engine** (`computeDocument`). Same `calculationInputs` round-trip via `custom_fields`. No quotation-specific math.
- **Every manual save forces `status='open'`** (`QuotationFormPage.tsx:598` → `useDocumentSave` → `useQuotationSave.ts:55,221`), reverting `converted`/`archived`.
- Amount-in-words is **never computed** on the quotation form (state `''`, persisted verbatim); preview/PDF fall back to `resolveAmountInWords` (recompute) — PDF looks right while DB says `''`.
- View page totals use `BUILTIN_COLUMNS`, not the saved column config — can diverge from edit-form totals when `hide_full` columns exist.
- Hardcoded invoice copy survives in shared sections ("Invoice Summary" `FormTotals.tsx:26`, "Invoice Notes", "Invoice additions", "Invoice-level discount") when these components render quotations.

### 5.2 Field inventory (deltas vs invoice)

| Label | Quotation prop → DB | Notes |
|---|---|---|
| Client (required) | `client_id`/`client_name` | identical; required at save |
| Quotation No. | `quotation_number` (NOT NULL + unique) | auto `QTN-…`; manual on create only; edit read-only |
| Quotation Title | `quotation_title` → col | shown PDF/screen |
| PO number | `po_number` → col | detail row |
| Issue date | `issue_date` → `date NOT NULL` | |
| **Valid until** | `valid_until` → col (`date`, nullable) | **display-only**; OVERDUE pill in list; never enforced, never compared in save/PDF |
| Status | `status` → col, `'open'\|'converted'\|'archived'` | RPC COALESCE `'open'`; every save writes `'open'` |
| Project | `project_id` → col | **form state ignored**; validated project wins (`useQuotationSave.ts:216`) |
| Payment terms | `payment_terms` → **cf only** (no column) | `Custom/Net 7/…`; **never consumed by any preview/PDF** (form display only) |
| Validity note | `custom_payment_terms` → cf | `Net 14`-style free text; never rendered |
| items | `quotation_items` (same shape, same columns) | `quo_group_*` group ids; partNo/condition **silently discarded** (RPC column list omits them) |
| `amount_in_words` | col | always `''` from form |
| discount/vat/wht | computed → cols; rates → `cf.calculationInputs` | same engine; form defaults VAT 7.5% |
| workmanship/transportation/shipping | numeric cols default 0 | **no input UI anywhere** (only prefill/AI/import/duplicate) |
| extraCharges | cf.extraCharges `{id?,label,value,withTax}` | same semantics |
| header/additional fields, chargeLabels, mergeQtyUnit, showItemImages, columnConfig, notesTitle/termsTitle, attachments, signatoryId, pdfOutput | cf.* | same as invoice; `onPdfOutputChange` writes `custom_fields` **directly mid-edit** (last-writer-wins race) |
| Detail rows | `po_number, payment_terms, work_duration (if any), header fields` | `contentProjection.ts` |
| Convert to invoice | `view-quotation-actions.ts` → `status='converted'`, `conversionTrail` cf, `linked_quote_id` on invoice, lineage columns on items | the only cross-family reference |

**Status enum difference:** quotation `open|converted|archived` vs invoice free-text (`unpaid|paid|…`). **Date difference:** `valid_until` (nullable date) vs `due_date` (text). **Custom-fields typing difference:** `quotations.custom_fields` is **jsonb**; `invoices.custom_fields` is **text** (parsed via `safeParseJson` everywhere).

## 6. Bolu current capability inventory

### 6.1 Routing & intent
Read intents are local regex (`matchBoluIntent`, `bolu-capabilities.ts:3-41`): `search-invoices`, `search-quotations`, `read-receivables`. Write-context classification (`matchBoluWriteContext:140-166`) extracts family + client hint + document ref (`/INV-…|QTN-…/`). Actual document intent is **delegated to the model**: the `bolu-chat.ts` system prompt instructs a fenced ```json `bolu_operation` envelope; `parseStructuredOperationEnvelope` (`bolu-operations.ts:864-892`) extracts it; both `bolu-generation.ts` (production path) and `bolu-runtime.ts` (legacy shell) route on `operationType` + `documentFamily`. `documentFamily` must be exactly `invoice|quotation`; anything else is dropped with an explicit message.

### 6.2 Structured schemas (verified)
`BoluInvoiceItemInput` (`bolu-operations.ts:30-50`): `description` (req), `quantity` (>0), `unit_price` (≥0), `unit?`, `row_type?` (**forced `'standard'`**, `:267`), `group_id?/group_name?/item_id?`, `install_rate?/install_rate_taxable?`, `vat_rate?/discount_rate?`, `sub_description?/make?`, `part_number?/condition?`.
`BoluInvoiceCreatePayload` (`:94-119`): `client_name` (req 2–120), `client_id?`, `items[]` (req ≥1), `issue_date?/due_date?` (YYYY-MM-DD; **invalid silently replaced by defaults**), `notes?/payment_terms?/terms?/title?/po_number?/project_id?/work_duration?`, `workmanship?/transportation?/shipping?`, `discount?/discount_type?/discount_timing?`, `wht?/wht_type?`, `global_vat_percent?` (default 7.5), `extra_charges?[{label,value,vatApplicable}]` (alias `{name,amount,withTax}` accepted; ≤20 entries; label non-empty; amount ≥0).
`BoluInvoiceModifyPayload` (`:121-128`): `documentId` (UUID-regex, req), `field?` allow-list `client_name|notes|payment_terms|due_date|issue_date`, `items?`, `oldItems?`. **`extra_charges` in modify → hard error.** `terms` is **not** in the modify allow-list.
Proposals: create (`BoluDocumentCreateProposal`) and modify (`BoluDocumentModifyProposal`); create carries `computedTotals` (from `calculateDocument`), `candidateNumber`, `clientResolution`, `clarification`, `clarificationAnswers`, `suggestions`. Gates are non-optional (`gate1Required/gate2Required: true`).

### 6.3 What Bolu can retrieve
Clients (search/validate/create with explicit approval), client recent documents, tenant prefixes (`fetchDocumentPrefixesSafe`), invoice reads incl. `invoice_financials_v` (total, balance_due, computed_status), quotation reads, receivables list, read-only supplier and `item_catalog` lookups. **Bolu never reads line items** — a Bolu "modify items" proposal is blind to existing row metadata (see §8.3).

### 6.4 Proposal / preview / Gate flow
Proposal card (`assistant-chat-parts.tsx: ProposalCardView`) shows: kind label, Gate status badge, title, identity rows (title, PO, work duration, project id), client picker at Gate 1, line items with inline `qty × price` re-computation and meta line (`sub_description · Make: · Part no: · Condition:`), dates/terms/notes, authoritative totals (subtotal/discount/VAT/WHT/total), `ProposalCommercialBreakdown` (fixed + custom charges with VAT badges), suggestions, clarification card, authority-checked document number. The full-document preview panel (`assistant-chat-panel.tsx`) shows client/due/total/items/charges/clarification. **There is no document/PDF preview; no per-line rates, no group subtotals, no column config, no signatory, no attachments, no hidden-column caveats are shown.** Two-gate integrity is real: Gate 1 mutates only the pending draft (`proposal_payload` on `bolu_messages`), Gate 2 calls `api/bolu-save.ts` (server, bearer auth, tenant schema via `_prov_get_schema_name`, pre-flight `has_entity_permission`, user-scoped tenant client) which calls the same `persistInvoiceCreation` — with client-side fallback to the same functions.

### 6.5 Persistence (verified)
`persistInvoiceCreation` (`bolu-document-service.ts:272`) → re-check auth/status/staleness/idempotency (`operation_id` partial unique index + verified replay) → recompute totals (`computeAuthoritativeTotals`, `:324-337`) → tenant prefix resolution (aborts on settings read failure — never silently `INV`) → `save_invoice_with_items_transaction` create (or insert fallback) → sequential fallback inserts items and rolls back header on error → advances numbering cursor → audit via `record_invoice_created`. Invoice payload columns written: `po_number, invoice_title, client_id, client_name, project_id, issue_date, due_date, status:'unpaid', document_type:'invoice', payment_terms, notes, terms (fallback = payment_terms!), workmanship, transportation, shipping, discount, vat, wht, custom_fields (Bolu subset), operation_id, work_duration, subtotal, install_rate_total, total, amount_in_words`. Quotation mirrors with `valid_until` (from Bolu `due_date`), `status:'open'`, **no `payment_terms`, no `document_type`**.
`buildBoluCustomFields` (`:141-166`) writes only: `created_via:'bolu_assistant'`, `operation_id`, `extraCharges[{label,value,withTax}]`, `chargeLabels:{}`, `calculationInputs{vatPercent,discountValue,whtValue,discountType,discountTiming,whtType}`, `discountType/discountTiming/whtType`. **It omits** `header`, `additionalFields`, `notesTitle/termsTitle`, `columnConfig`, `mergeQtyUnit`, `showItemImages`, `attachments`, `signatoryId`, `pdfOutput`, `groupMeta`, `hideEmptyGroups`, and any user-supplied keys.
`serializeBoluItem` (`:236-264`) writes: `description, quantity, unit_price, unit, row_type:'standard'` (forced), `group_id/group_name`, `item_id`, `install_rate, install_rate_taxable, vat_rate, discount_rate`, `sub_description, make`, `custom_data{partNo, condition}`. **Loses:** `install_rate_override`, `formula`, `show_install_rate`, `image_url`, `row_type:'group_header'`, all `source_*` lineage, non-`partNo/condition` custom_data keys.

### 6.6 Prompt/schema mismatch notes
Prompt tells the model `extra_charges` use `{name, amount, withTax}`; the validator tolerates that **and** `{label,value,vatApplicable}` — fine. Prompt advertises `item fields … "group_name", "group_id"` — accepting group names but **no group semantics** survive (forced `standard`, `quantity>0`). The system prompt never documents the totals-are-application-owned rule in the *item* schema; it does state "NEVER compute totals."

## 7. Field-parity matrix

Legend — statuses: **Full** = works end-to-end today · **Partial** = works with loss/caveats · **None** = not representable/handled · **N/A** = not applicable to that family · **Unknown** = not verified. Bolu columns split Understanding / Proposal display / Persistence (full path). Invoice/Quotation/Advance columns describe the existing implementation's capability for each field.

| Field / capability | Invoice | Quotation | Advance Invoice | Bolu understanding | Proposal display | Persistence | Finding |
|---|---|---|---|---|---|---|---|
| Client identity (client_id/name) | Full | Full | Inherited (read-only) | Full | Full (picker + resolved record) | Full | Client resolution works; modify of client_name bypasses invoice identity lock (Bolu allow-list) |
| Invoice/quotation title | Full | Full | Inherited | Full (create) | Full | Full | Not modifiable via modify-document |
| Document number | Full (auto/manual create) | Full (auto/manual create) | Generated as `PARENT-A` | Partial (no manual number; honors tenant prefix) | Partial (only if authoritative-looking) | Full (auto on save) | Gap: manual numbering not expressible |
| PO number | Full | Full | Inherited | Full (create) | Full | Full | Not modifiable |
| Issue date | Full | Full | Inherited | Full | Full | Full | Modify = allowed |
| Due date / Valid until | Full (text) | Full (date, display-only) | Inherited (bespoke due_at) | Full (relabeled Valid until for quotes) | Full | Full | Semantics differ per family; Bolu handles mapping |
| Status | Full (forced unpaid) | Full (forced open) | Inherited only | N/A | Status badge shows create intent | Full (forced) | Not conversational; consistent with form |
| Document type / family | Full | Full | N/A (invoice-only) | Full | Full | Full | |
| Payment terms | Full | Full (cf only, unused in preview/PDF) | Inherited | Partial (invoice col; quote → smeared into terms) | Full | Partial (quotation: dropped to `terms`; modify maps to `terms`) | **Mismatch: quotation payment_terms not separately persisted/displayed** |
| Custom payment-terms note | Full (folded) | Full (cf, unused) | Inherited | None | None | None | Invisible to Bolu |
| Work duration | Full | Full | Inherited | Full (create) | Full | Full | No form editor either |
| Header custom fields | Full (PDF rows) | Full | Inherited | None | None | **None (dropped)** | Silent loss for Bolu documents |
| Additional ("other commercial details") fields | Full | Full | Inherited | None | None | **None (dropped)** | Silent loss |
| Notes (rich HTML) | Full | Full | Inherited | Full | Full | Full | |
| Terms & Conditions (rich HTML) | Full | Full | Inherited | Partial (create only, not in modify allow-list) | Full | Full | `terms` falls back to `payment_terms` text when unset (smear) |
| Notes/Terms section titles | Full | Full | Inherited | None | None | **None** | Defaults only |
| Item description | Full | Full | Inherited | Full | Full | Full | |
| Item sub-description | Full | Full | Inherited | Full | Full | Full | |
| Quantity | Full (≤0→1) | Full | Inherited | Full (>0 enforced) | Full | Full | |
| Unit | Full | Full | Inherited | Full | Full | Full | |
| Unit price | Full | Full | Inherited | Full (≥0) | Full | Full | |
| Amount (computed) | Full | Full | Inherited | Full (recomputed) | Full | Full | Card shows raw qty×price, VAT/disc excluded per line (matches PDF) |
| Discount value/type/timing | Full | Full | N/A | Full (create) | Partial (amount only; type/timing hidden) | Full (rates in cf; computed to col) | Not modifiable; card under-reports nuance |
| Global VAT % | Full (7.5 default) | Full | Inherited | Full (create; 7.5 default) | Full | Full (rate in cf; computed to col) | Modify-items recompute forces 7.5 / 0 discount / 0 WHT |
| Per-item VAT rate | Full | Full | Inherited | Full | **None** (rate not shown per line) | Partial (kept on create; **lost on invoice-item modify**) | Rates persist on create; invisible pre-Gate 2 |
| Per-item discount rate | Full | Full | Inherited | Full | **None** | Partial (lost on modify) | Same |
| WHT value/type | Full | Full | Inherited | Full (create) | Full | Full | Modify recompute sets WHT 0 |
| Extra charges + per-charge VAT flag | Full | Full | Inherited | Full | Full (VAT badge) | Full (cf.extraCharges) | Create-only; modify = explicit error (good) |
| Workmanship/Transportation/Shipping | Full (no inputs; prefill) | Full (no inputs; prefill) | Inherited | Full (create, non-taxable) | Full | Full | Fixed charges injected as non-taxable extras; modify blocked with message |
| Install rate (money; taxable) | Full (hidden col; in totals) | Full | Inherited | Partial (install_rate + install_rate_taxable; install_rate_override unsupported) | **None** (not shown) | Partial (kept on create; lost on invoice-item modify) | Install semantics preserved on create |
| Group headers / groups | Full | Full | Inherited | **None** (row_type forced standard) | **None** | **None** | Complete gap |
| Group subtotals / groupMeta | Full | Full | Inherited | None | None | None | |
| Item image | Full | Full | Inherited | **None** (not accepted/persisted) | **None** | **None** | |
| Part number | Partial in app (inputs gated off; RPC ignores) | Partial (dropped) | Inherited | Partial (item.part_number; card shows it) | Full | Partial (cf.custom_data.partNo) | Bolu is *better* than the form here |
| Condition | Partial (same) | Partial | Inherited | Partial (item.condition; card shows it) | Full | Partial (cf.custom_data.condition) | Same |
| Item catalog link (item_id) | Full | Full | Inherited | Full (item_id accepted) | Partial | Full | Lineage partially kept on create |
| Lineage (source_cps/quotation ids) | Full | Full | Inherited | **None** | None | **None (dropped on modify)** | Bolu item modify destroys lineage |
| Custom column values (custom_* keys) | Full | Full | Inherited | None | None | **None** | No parity |
| Column config / mergeQtyUnit | Full | Full | Inherited | None | None | **None** | Defaults used |
| Attachments / reference links | Full | Full | Inherited | None | None | **None** | Silent loss |
| Signatory assignment | Full | Full | Inherited | **None** | None | **None** | PDF signature block absent |
| PDF output options (bank/footer/tagline/balanceDue/amountInWords/compact/landscape) | Full | Full | Advance block renders | None | None | **None** | Defaults used; not user-configurable |
| amount_in_words | Full (computed) | Full (form stores '') | Inherited | Full (computed on save) | None | Full | Bolu writes words; Bolu persists 0-config for quotes |
| footprint/template/theme (pdfTemplateId, accent/fonts) | Full (view page) | Full | Inherited | None | None | N/A | Out of conversational scope (recommended) |
| Invoice financials view / receivables read | Full | Full | N/A | Full (`invoice_financials_v`) | Full (fact read) | N/A | Read path verified |
| **Advance Invoice (create/view/edit/delete)** | Full | N/A | Full | **None** | **None** | **None** | Complete Bolu absence; Bolu item-modify can destroy advance metadata via `custom_fields=NULL` |
| Advance numbering (`-A` suffix) | Full | N/A | Full | None | None | None | |
| Advance amount (percent/fixed) & authority order | Full | N/A | Full | None | None | None | |
| Advance labels & summary block in PDF | Full | N/A | Full | None | None | None | |
| Advance status coupling | None exists | N/A | None exists (metadata only) | None | None | None | By design: no coupling |
| Gate 1 / Gate 2 integrity | N/A | N/A | N/A | Full | Full | Full | Two gates enforced in reducer + hook + server route |
| Idempotent save (operation_id) | N/A | N/A | N/A | Full | Full | Full | DB partial unique index + verified replay |
| Tenant numbering prefix respected | Full | Full | N/A | Full (aborts on settings read error) | Partial | Full | |
| Modify: 5 scalar fields (client_name/notes/payment_terms/due_date/issue_date) | Full | Full | N/A | Full | Full | **Partial → data-loss (see §8.3)** | RPC payload omits po_number, title, project_id, custom_fields, charges; resets status |
| Modify: items | Full | Full | N/A | Partial | Full | **Partial → data-loss** | See §8.3 |
| Modify: commercial charges | Full | Full | N/A | Explicit rejection (visible) | N/A | N/A | Correct fail-visible behaviour |

### 7.1 Fail-visible vs fail-silent audit of the Bolu card
**Fail-visible (good):** unsupported family/type → explicit message; modify with `extra_charges` → error; validation failures → prose list; stale/replay handling; client unresolved → clarification card; document number not authoritative-looking → "assigned on save"; missing totals → "calculated on save" notice; fixed vs custom charges visually distinct; VAT/no-VAT badges.
**Fail-silent (must fix):** drop of unknown top-level payload keys; invalid dates silently replaced; non-number numerics silently ignored; missing `custom_fields` written by Bolu create (defaults used); **item-modify data loss (§8.3)**; quotation `payment_terms` smeared into `terms`; `terms` fallback to `payment_terms`; `install_rate_total → 0` on invoice modify; `status → 'unpaid'/'open'` forced even on modification of previously converted/archived docs; group_header rows unreachable; `partNo/condition` persisted but invisible in document rendering (only Bolu card shows them).

## 8. Financial and persistence integrity findings

### 8.1 Canonical engine (trusted)
`calculateDocument` owns all money math. Decimal.js ROUND_HALF_UP, precision 20. WHT base excludes VAT. Fixed before_tax discounts allocate pro-rata to eligible rows with a non-taxable fallback; clamped to eligible base and per row. Extra charges carry `vatApplicable` flags; VAT on taxable extras at global rate only; extras enter WHT base. Outputs unrounded floats (`.toNumber()`); DB `numeric` columns absorb full precision. Payment entry rounds to 2dp (UI only).

### 8.2 Bolu totals integrity (create path — sound)
Model totals are never trusted. Proposal totals, card totals and persisted totals all derive from `calculateDocument` via `computeAuthoritativeTotals` with the same options object (`global_vat_percent`, discount/wht type/timing/value, fixed + custom charges, `visibleRowEffects {install:false, vat:true, discount:false}`). Persist re-derives `discount`, `vat`, `wht`, `subtotal`, `install_rate_total`, `total`, `amount_in_words` — stored totals cannot drift from engine output on create. Tests `bolu-business-context-parity.test.js` and `bolu-canonical-persistence-and-context.test.js` encode this contract.

### 8.3 Bolu modification path — silent destruction (critical)
`persistInvoiceModification` / `persistQuotationModification` select a **5-field** snapshot, then build the RPC payload `{...currentDoc, ...updates}`. With `entityId` present, the tenant `save_*_with_items_transaction` **update** branch writes every payload key authoritatively (`20261118130000_bolu_tenant_rpc_installer.sql:150-205, 2214-2265`):

| Column | Invoice RPC when key absent in Bolu payload | Quotation RPC |
|---|---|---|
| `custom_fields` | **`NULL`** (`p_invoice_payload->>'custom_fields'` with no coalesce) | **`{}`** (`COALESCE(NULLIF(...,''),'{}')::jsonb`) |
| `po_number` | NULL | NULL |
| `invoice_title` / `quotation_title` | NULL | NULL |
| `project_id` | NULL | NULL |
| `payment_terms` | NULL | (n/a column) |
| `workmanship/transportation/shipping` | **0** | **0** |
| `status` | `'unpaid'` | `'open'` |
| `install_rate_total` | **0** (invoice modify never sets it) | updated (but wrong — see recompute) |
| `subtotal/vat/total/wht/discount` | recomputed with VAT 7.5%, **0 discount, 0 WHT, no charges** | same |

Additionally, both paths DELETE+INSERT all items; invoice re-serialization keeps only `description/quantity/unit_price/unit/row_type` (drops `vat_rate`, `discount_rate`, `install_rate`, `sub_description`, `make`, `custom_data` incl. `partNo/condition`, `image_url`); quotation re-serialization keeps more but drops lineage and forces `row_type:'standard'`. Costing ignores the document's stored `calculationInputs` (discount/WHT/VAT overrides/charges). **Any Bolu “edit items on this invoice/quotation” operation silently erases: advance-invoice configuration (invoices), calculation inputs, extra charges and charge labels, signatory, pdfOutput, attachments, column config (`hide_full` VAT/discount), group metas, PO/title/project linkage, payment terms, and fixed-charge amounts.** The legacy preview fallback (no `entityId`) is non-destructive for the header (`.update(updates)` touches only changed keys) but still re-costs with default rates and drops item metadata.

### 8.4 Create-path persistence mismatches vs the form
| Aspect | Form | Bolu create | Effect |
|---|---|---|---|
| `terms` fallback | terms = rich HTML, no fallback | `terms || payment_terms || ''` | T&C filled with payment terms when user never supplied terms |
| quotation `payment_terms` | saved to cf, **never rendered** | dropped (no cf, no column — payment_terms text lands in `terms`) | leaked into T&C; cf missing |
| invoice `payment_terms` | col, `Custom`-folded text | col, verbatim | OK for invoices |
| `install_rate_taxable` | never written → NULL (falsy) | `=== true` respected if model supplies | behaviour equal |
| `vat_rate` explicit 0 | form can't express (0→null) | accepted as 0? (`optionalNumber` keeps finite 0 — actually **0 is kept** here: `Number.isFinite(0)` passes; row VAT shows 0%) | Bolu can express zero-VAT rows the form cannot |
| `discount_rate` explicit 0 | form can't express | same as above | same |
| custom_fields | full shape incl. mergeQtyUnit/pdfOutput/signatoryId… | Bolu subset only | documents lack user defaults that a fresh form carries (mergeQtyUnit default true, pdfOutput defaults) |
| `operation_id` | not set | set | Bolu docs carry provenance |
| `amount_in_words` | computed | computed | equal |

### 8.5 Advance Invoice financial behaviour (verified)
No recalculation or apportionment. Parent totals pass through verbatim; `Balance Due` row is suppressed in advance PDFs; advance block appended; "advance" amount = percent/fixed of **parent total** (not of VAT base, not of WHT-adjusted); WHT/VAT do not apply to the advance figure. `contract_value` recorded at config time is **stale once the parent changes** (no derivation on read — actually `getAdvanceSummaryValues` reads `contractValue` from metadata first (`contract_value ?? invoice.total`) — **stored snapshot wins**; a later parent-total change is invisible until the user re-saves the advance). Advance `status` never transitions and couples to nothing. The `-ADV` vs `-A` fallback inconsistency and the unused list-page `state.openAdvanceSheet` hook are reported, not fixed.

### 8.6 Interaction Bolu × Advance (critical)
Bolu **create** for invoices is safe w.r.t. advance metadata (new document; Bolu writes its own `custom_fields` subset — correct). Bolu **modify** of an existing invoice with an advance configured destroys `custom_fields` (§8.3) — the advance silently disappears, while the PDF for that parent then renders without its advance block. Modify of a quotation with customized commercial settings likewise reverts `custom_fields` to an empty object.

## 9. Verified gaps and unresolved unknowns

### 9.1 Verified Bolu gaps (source-confirmed)
1. No Advance Invoice awareness, anywhere (intent, schema, display, persistence).
2. Modification-path data destruction: header columns (PO, title, project, payment terms, charges→0, status reset), `custom_fields`, per-item tax/discount/install/image/custom_data/lineage, re-costing with 7.5%/0/0.
3. Proposal cannot display: per-line VAT/discount/install rates, group headers & subtotals, fixed vs custom charge VAT **bases**, advance summary, signatory, attachments, column config, PDF output options, header/additional custom fields.
4. Group support absent end-to-end (forced `standard` rows; quantity>0 validation).
5. `install_rate_override` unsupported; item images unsupported; item lineage unsupported.
6. `terms` create fallback copies `payment_terms` into Terms & Conditions.
7. Quotation `payment_terms` not persisted to cf/column (only smeared into `terms`).
8. Invoice modify maps `payment_terms → terms` (wrong column; there *is* an invoice `payment_terms` column).
9. Invoice item-modify never writes `install_rate_total`; quotation modify does (inconsistent).
10. Documents created by Bolu lack all user document defaults (mergeQtyUnit, pdfOutput, columnConfig, signatory) — only the Bolu subset lands in `custom_fields`.
11. Modification allow-list is 5 scalars; commercial charges, terms, title, PO number, project link are explicitly non-conversational for edits (charges fail loudly; the rest are silently impossible).
12. Non-number numeric inputs are silently dropped to defaults/undefined; invalid dates silently replaced; unknown payload keys silently dropped (no unsupported-field diagnostics).
13. Prompt advertises `group_id/group_name` — promises grouping the validator cannot honor.
14. Bolu never reads line items; proposal quality for modify depends entirely on the model's memory of the document.
15. Competitive detail: `install_rate_taxable`, explicit row 0 VAT/discount are expressible by Bolu but hidden (display) and lossy (modify).

### 9.2 Verified integrity/risks
- §8.3 destruction path (any Bolu item modify, both families, RPC mode).
- `status` forced to `unpaid`/`open` on modify — archived/converted documents revert to active.
- `custom_fields` NULL vs `{}` asymmetry (invoice can erase entirely; quotation erases to empty object — both erase content).
- Legacy `invoiceConversionService.ts:87-92` copies computed totals into rate fields (pre-existing; flagged only).
- `QuotationFormPage` `onPdfOutputChange` mid-edit direct cf write races a later full save.
- Advance `contract_value` snapshot goes stale after parent edits; no code re-derives it on read.
- `-ADV` (projection) vs `-A` (sheet default) suffix inconsistency.

### 9.3 Unresolved unknowns (explicitly not established)
1. Whether the tenant RPC installer migration is applied on the hosted database; per-tenant schema provisioning state.
2. Live `invoice_financials_v` contents and `has_entity_permission` enforcement on the hosted project.
3. Product intent for the Advance PDF retaining the **parent** total beside the advance block (not the advance amount).
4. Product intent for `advance.status` ever transitioning (`paid/void`) — no writer exists.
5. Whether `state.openAdvanceSheet` (list page) ever worked; appears dead.
6. Whether `src/modules/invoices/services/invoiceAdvanceService.ts` is used anywhere; grep found no importers — appears legacy/parallel.
7. Whether the legacy `bolu-runtime.ts` shell is reachable in production (a second, duplicated intent-routing implementation exists alongside `bolu-generation.ts`).
8. Whether invoice-modify's option-less recompute is deliberate (it contradicts the create contract).
9. Server-side authorization depth for the advance `custom_fields` UPDATE beyond tenantClient scoping.
10. RLS posture of tenant schemas for `invoices/quotations` beyond the legacy base tables.
11. PDF rendering of `install_rate`/`formula` cells (read-path verified, render-path not executed).
12. Whether payment/advance figures appear anywhere in the Bolu conversation after save (no evidence either way).

### 9.4 What Bolu must *not* be expected to do (correctly out of scope)
Automatic saving/approval; changing Gate semantics; new document types; inventory/supplier discovery; redesigning client resolution; renaming BIGDROPS identifiers; UI redesign; production writes.

## 10. Prioritized recommendations and proposed implementation stages

Sequencing principle: **invoice completeness and integrity first (including Advance Invoice), then quotation, reusing the shared document path — never a parallel document implementation.** Keep both gates. Keep `calculateDocument` authoritative. Bolu remains a *proposer*; the form remains the full-fidelity editor.

### Stage 0 — Stop the bleeding (small, isolated)
1. **Fix the modification payload**: build `p_invoice_payload`/`p_quotation_payload` from the **full current row** (select all columns incl. `custom_fields`) or perform JSON merge of only the changed keys; delete the 5-field selection. Add regression tests (`persistInvoiceModification` preserves `custom_fields`, title, PO, project, charges, status). This is the single highest-severity fix.
2. **Option-full recompute** on modify: recompute with the document's persisted `calculationInputs` (hydrate like the form does), not bare defaults.
3. Item re-serialization parity: reuse `serializeBoluItem` semantics incl. `sub_description, make, install_rate(+override), install_rate_taxable, vat_rate, discount_rate, image_url, custom_data` and lineage pass-through on edit.
4. Fail-visible contract: unknown top-level keys → explicit “ignored fields” notice; invalid dates → rejected or flagged, not silently defaulted; invoice-modify `install_rate_total` always written; quotation modify writes `install_rate_total` consistently.
5. Fix the two smeared mappings: quotation `payment_terms` → `custom_fields.payment_terms` only; invoice modify `payment_terms → invoices.payment_terms` (not `terms`); `terms` create fallback removed (terms stays unset unless supplied).

### Stage 1 — Parity for fields Bolu already models (create path is ~80% done)
6. **Advance Invoice, conversationally, without new tables:** teach Bolu the six editable fields (`suffix, mode, value, primary_label, secondary_label` on the parent's `custom_fields.advance_invoice`) with intents like "create/enable/edit/remove the advance invoice for this invoice"; proposal card shows a dedicated advance section (document number preview `PARENT-A`, mode, percent/amount, computed advance from `contract_value` — stale-read warning or live recompute for display only); Gate 2 calls the **existing** `saveParentAdvanceInvoiceConfig`/`createAdvanceInvoiceRecord` (reuse, don't reimplement). Parent stays the financial source of truth; projection stays read-only. Explicitly require user to type/confirm the advance intent — never auto-create from an ordinary invoice request.
7. **Surface what Gate 2 will be accountable for:** show per-line effective VAT/discount/install lines in the card; show fixed vs custom charge tax bases; show `terms`/`payment_terms` verbatim; show warnings for `status` reset on modify ("will set status back to unpaid").
8. **Persistence parity for carried context:** on create, carry user-facing document defaults (`mergeQtyUnit:true`, `pdfOutput` defaults, `columnConfig` from BUILTIN_COLUMNS, `notesTitle/termsTitle` defaults, empty `additionalFields/header`) so Bolu documents render like form documents; never invent values.
9. **Explicitly unsupported-but-now-visible:** after Stage 1, anything still unsupported must be listed in a “not supported yet” disclosure on the card, not dropped silently.

### Stage 2 — Structural gaps, still no new architecture
10. Group support end-to-end: allow `group_header` rows (`quantity` exempted for `group_header` kind), `group_id` allocation, `groupMeta` write, group subtotals in card and PDF; surface `hideEmptyGroups`.
11. Item images + `install_rate_override` + lineage pass-through on Bolu item edit.
12. Header/additional custom fields round-trip: `customFields[]` and `additionalFields[]` in payload; render on card; persist into `custom_fields`; PDF picks them up unchanged.
13. Attachments & signatory: create-time selection from existing `signatories` (read-only lookup) + reference links `{label,url}` with URL validation.
14. PDF output options on create (`showBankDetails/bankAccountId/showFooter/showTagline/showBalanceDue/showAmountInWords/compact/landscape`) — defaults preserved, user-overridable, visible on card.
15. Display-only rounding note: show per-line and totals with documented 2dp presentation; engine stays authoritative.

### Stage 3 — Consistency hardening (quotation now first-class)
16. Quotation ↔ invoice descriptor unification already exists; apply the same Stage 0–2 verification matrix; fix hardcoded invoice copy in shared sections for quotation context (or route through descriptor labels).
17. Quotation `valid_until` Overdue semantics unify with invoice `due_date`; card shows “Valid until”; never enforce (documented decision).
18. `updateQuotationStatus`/conversion trail awareness (converted quotations should not be re-proposed for edit without warning).
19. Remove/merge the legacy `bolu-runtime.ts` duplicate once production path is confirmed, or document its role explicitly.
20. Rich-text `notes`/`terms`: decide whether Bolu authors HTML (sanitized server-side) or stores plain text with safe render; the current renderer trusts stored HTML.

### Recommended acceptance bar for “parity” (measurable)
- A full invoice and a full quotation (client, items incl. one zero-VAT row and one taxable extra charge with tax, discount, WHT, notes, T&C, PO no., title, project link, signatory, header+additional fields, attachment, custom PDF output flags) proposed by Bolu **byte-compare equal** in every persisted column/cf key with the same input through the form, except volatile keys (`operation_id`, timestamps).
- Advance invoice configured via Bolu renders identical PDF to the manual flow.
- Item modify on a configured document loses nothing (title, PO, project, charges, cf, lineage) — covered by new tests.

### Explicitly not recommended
New provider/framework/dependency; a parallel “Bolu document” model; changing `calculateDocument`; converting extra charges to line items; altering gate semantics; automatic anything; renaming BIGDROPS identifiers.

## 11. Files and functions inspected

**Invoice path:** `src/pages/InvoiceFormPage.tsx`; `src/components/document/SharedDocumentForm.tsx`, `FormHeader.tsx`, `FormLineItems.tsx`, `FormCommercialTerms.tsx`, `FormNotesTerms.tsx`, `FormTotals.tsx` (hardcoded "Invoice Summary"), `FormFooter.tsx`; `src/components/invoice/*` (`MobileItemCard.tsx`, `paymentEntryHelpers.ts`, `mobile/mobileFormPrimitives.tsx`); `src/hooks/useInvoiceSave.ts` (`buildPayload:225`, persist `:348/:407`); `src/domain/invoice/{types.ts, columns.ts:23-33, normalize.ts, calculations.ts, factories.ts:97-123 (toDbItem), previewModel.ts, projections/*, financialState.ts, additionalFields.ts, viewModel.js}`; `src/pages/ViewInvoice.tsx`, `src/hooks/useInvoiceDetailData.js:66`; `src/components/document-view/invoice/{InvoiceMoreSheet.tsx:71-89, InvoiceOperationalSections.tsx, sections/AdvanceInvoicesCard.tsx}`; `src/pages/InvoiceFormPage.tsx`.
**Advance:** `src/components/invoice/view/InvoiceAdvanceSheet.tsx`; `src/pages/view-invoice-actions.ts` (`createAdvanceInvoiceRecord:273`, `updateAdvanceInvoiceRecord:341`, `saveParentAdvanceInvoiceConfig:176`); `src/hooks/useInvoiceActions.ts` (open-create reset `:318`, save `:245`, download `:273`); `src/domain/invoice/{advanceMetadata.ts, advanceChildFlow.ts, advanceConfig.ts, advanceSummary.ts, advanceProjection.contract.ts, advanceProjection.invariant.ts, advanceProjection.rules.ts}`; `src/modules/invoices/services/invoiceAdvanceService.ts` (unused duplicate); `src/modules/invoices/services/invoiceChildDocService.ts` (unrelated); PDF advance block `src/components/pdf/engine/advance.ts`, `industryAdapter.ts`, `components/pdf/types.ts:106-123`.
**Quotation path:** `src/pages/QuotationFormPage.tsx` (invoiceLike mapping `:539-544`, handleSave forces open `:598`); `src/hooks/useQuotationSave.ts`; `src/domain/quotation/{quotationSaveTransaction.ts, types.ts, normalize.ts, previewModel.ts, pdfDownloadHandler.ts, quotationSaveTransaction.ts}`; `src/modules/quotations/services/quotationService.ts`; `src/components/quotation/{quotationFormConstants.ts, quotationFormTypes.ts, quotationFormUtils.ts, useQuotationLineItems.ts, QuotationList.tsx}`; `src/components/document/documentDescriptor.ts:168-180`.
**Shared/calculation:** `src/lib/Calculations.ts` (§6 WHT base, §5 extras, fixed-discount allocation); `src/domain/invoice/columns.ts`; `src/domain/documentConversion.ts`; `src/domain/prefixConstants.ts`; `src/domain/documentNumbering.ts`.
**Bolu:** `src/lib/ai-assistant/bolu-operations.ts` (`BoluInvoiceItemInput:30`, `BoluInvoiceCreatePayload:94`, `validateInvoiceCreateInput:341`, `validateInvoiceItems:223`, `validateBoluExtraCharges:295`, `validateInvoiceModifyInput:422`, `computeAuthoritativeTotals:486`, `buildInvoiceCreateProposal:540`, `mergeDocumentCreateProposal:636`, `parseStructuredOperationEnvelope:864`); `bolu-document-service.ts` (`persistInvoiceCreation:272`, `persistQuotationCreation:532`, create payload `:362-388`, quotation `:611-636`, `buildBoluCustomFields:141`, `serializeBoluItem:236`, `persistInvoiceModification:766`, `persistQuotationModification:924`, `findVerifiedReplay:223`); `bolu-runtime.ts` (legacy shell), `bolu-generation.ts` (production path), `bolu-reducer.ts`, `bolu-capabilities.ts`, `bolu-commercial-language.ts`, `bolu-data.ts`, `bolu-context.ts`, `bolu-audit.ts`, `bolu-export.ts`; `api/bolu-chat.ts:405-444` (system prompt), `api/bolu-save.ts`; components `src/components/ai-assistant/chat/{assistant-chat-parts.tsx, assistant-chat-panel.tsx, assistant-chat-thread.tsx}`; tests `src/tests/ai-assistant/{bolu-commercial-and-gate-lifecycle, bolu-canonical-persistence-and-context, bolu-business-context-parity}.test.js`, `state/bolt` not executed.
**DB:** `supabase/migrations/20260520090002_quotations.sql`, `20260520090003_invoices.sql`, `20260809070000_invoice_composite_transactions.sql`, `20261006120000_tenant_rpc_cps_quotation_transaction.sql`, `20261118120000_bolu_operation_idempotency.sql`, `20261118130000_bolu_tenant_rpc_installer.sql:112,142,172,200,2111-2265,2858-2866`.

## 12. Tests and verification performed or unavailable

- **Static tracing:** every claim above derived from reading current source (paths/lines cited inline). Canonical math verified directly against `Calculations.ts`. RPC bodies read from tenant-template migrations.
- **Tests inspected (not executed):** the three suite files listed in §11 encode the current create/parity contracts (`bolu-business-context-parity.test.js:30-160`, `bolu-commercial-and-gate-lifecycle.test.js`, `bolu-canonical-persistence-and-context.test.js`); none of them exercises `persistInvoiceModification`'s RPC payload destructiveness — that path is effectively untested. No test exists for advance-invoice awareness in Bolu either.
- **Not run:** `bun run audit:load`, `bun run typecheck`, `node --test`, the app itself. No code was changed, so build/typecheck are out of scope; no green-check is claimed. Runtime behaviour (including the destructive §8.3 path) is **source-verified, not execution-verified**; before any fix, reproduce against a scratch tenant.
- **Browser/viewport:** unavailable/not performed; no Mobile/Fold-Closed/Fold-Open/Tablet/Desktop claim is made. All UI statements are source-only.
- **Hosted state:** not inspected; no credentials used; no production data read.
- **Consistency checks performed:** card totals === `computedTotals` (both from `calculateDocument`) ✓; Bolu create payload keys vs RPC create insert list ✓; Bolu modify payload keys vs RPC update SET list ✗ (mismatch proven, §8.3); `invoices.custom_fields` (text) vs `quotations.custom_fields` (jsonb) cast asymmetry confirmed in migration bodies ✓.

## 13. Git state and attribution notes

Baseline at audit start (unchanged at delivery):
```
## main...origin/main [ahead 12]
 M .workbuddy-ai/memory/2026-11-18.md
?? docs/reports/bolu-persistence-integrity/independent-verification.md
?? docs/reports/bolu-persistence-integrity/production-deployment.md
HEAD = 295f98e4 "📝 docs: add bolu persistence integrity files and updates"
```
No staged, unstaged, untracked or conflicted pre-existing work was modified, reverted, staged, stashed, reset or cleaned. Stashes (`stash@{0}`, `stash@{1}`) untouched. This file is the only task-attributable output: `docs/reports/bolu-document-capability-parity/audit.md`. BIGDROPS/bigdrops identifiers preserved. `bun run build` was not run. No migrations were applied; no documents were created or modified; no hosted service was contacted.

---

**Status: Completed** — the requested read-only investigation and report are complete, with limitations disclosed (hosted/tenant state unverified, no execution of code paths, no viewport inspection, RPCs read not run). Unresolved items are enumerated in §9.3. This audit establishes the gap; it does not implement the solution, and no claim is made that Bolu has achieved capability parity.

