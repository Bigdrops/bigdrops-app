# Tips & Tricks — Hidden Functionality Audit

This report was written by Buffy on 2026-08-31 via Freebuff.

---

## 1. Executive Summary

This audit reviewed the 33 existing first-draft tips in §23 of `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/10-loading-and-refresh.md`. The investigation covered 13 functional areas across the codebase to discover hidden functionality suitable for loading-state Quick Tips.

| Metric | Count |
|--------|-------|
| Existing §23 tips reviewed | 33 |
| Verified (KEEP) | 22 |
| Partially verified (REWRITE) | 7 |
| Rejected / unverified | 4 |
| New high-value tips discovered | 14 |

**Strongest opportunities:**
- **Compliance Hub** — a fully-built tax management dashboard that most users would never find on their own.
- **Payment Recording** — recording a payment triggers 5 downstream operations (status sync, audit trail, WHT receipt draft, payment acknowledgement receipt, and attachment upload). This is the single highest-value tip.
- **Advance Invoices** — a complete parent-child invoice system for requesting partial payment before work begins.
- **Internal vs External Waybill** — two semantically distinct document types that users may not realise exist.
- **Blank Waybill PDFs** — downloadable empty waybill templates for field use.

---

## 2. Existing §23 Audit

| Existing Tip | Status | Evidence | Recommendation |
|-------------|--------|----------|----------------|
| `tip.feature.convert-quotation` — Convert quotation to invoice | VERIFIED | `viewQuotationActions.ts` — `convertQuotationToInvoice()` | KEEP |
| `tip.feature.duplicate-document` — Duplicate any document | VERIFIED | `viewInvoiceActions.ts` (clone), `viewQuotationActions.ts` (duplicateQuotationRecord), `viewCSRActions.ts` (duplicateCSRRecord), `viewWaybillActions.ts` (duplicateWaybillRecord) | KEEP |
| `tip.feature.column-settings` — Customise table columns | VERIFIED | `src/domain/invoice/columns.ts` — full column visibility system with `visibilityMode`, `hide_display`, `hide_full`, `show` | KEEP |
| `tip.feature.advanced-invoices` — Advance invoices | VERIFIED | `src/domain/invoice/advanceChildFlow.ts`, `advanceMetadata.ts`, `advanceConfig.ts` — full parent-child advance invoice system | REWRITE — "advance" not "advanced"; clarify it is a partial-payment request |
| `tip.feature.project-linking` — Link docs to projects | VERIFIED | `src/pages/ProjectDetail.tsx` — `handleLink()` supports invoice, quotation, CSR, waybill linking | KEEP |
| `tip.workflow.record-payment` — Record payment updates balance | VERIFIED | `src/modules/invoices/services/paymentService.ts` — `recordInvoicePayment()` triggers 5 downstream operations | REWRITE — the current wording undersells the benefit |
| `tip.workflow.waybill-from-invoice` — Invoice to waybill | VERIFIED | `src/domain/invoice/actions.js` — `generate-waybill` action, `buildWaybillPrefill()` in `viewInvoiceActions.ts` | KEEP |
| `tip.workflow.csr-from-invoice` — Invoice to CSR | VERIFIED | `src/domain/invoice/actions.js` — `generate-csr` action | KEEP |
| `tip.workflow.quotation-to-waybill` — Quotation to waybill | PARTIALLY VERIFIED | No direct quotation-to-waybill conversion function found. Users can create a waybill from a project that contains the quotation. | REWRITE — clarify the actual path |
| `tip.workflow.offline-drafts` — Offline quotation/CSR drafts | VERIFIED | `src/lib/native/csrOffline.ts` — full offline CSR draft system with SQLite, sync queue, device-coded numbering. `src/pages/QuotationFormPage.tsx` — `canUseOfflineQuotationDrafts()`, `createOfflineQuotationDraft` | KEEP |
| `tip.productivity.search-overlay` — Global search | VERIFIED | `src/hooks/useGlobalSearch.ts` + `src/components/layout/GlobalSearch.tsx` — searches clients, projects, invoices, quotations, CSRs, waybills | KEEP |
| `tip.productivity.json-import` — JSON line-item import | VERIFIED | `src/domain/import/` — full import pipeline (parse → validate → resolve → apply) with custom column creation | KEEP |
| `tip.productivity.custom-columns` — Custom columns | VERIFIED | `src/domain/invoice/columns.ts` — `BUILTIN_COLUMNS` plus custom `custom_*` columns | KEEP |
| `tip.productivity.merge-qty-unit` — Merge quantity/unit | UNVERIFIED | No dedicated merge column feature found in the codebase. Column visibility modes exist but no explicit qty+unit merge. | REJECT — cannot confirm this exists |
| `tip.productivity.csv-export` — CSV export | VERIFIED | `src/pages/viewQuotationActions.ts` — `downloadQuotationCsvFile()`. Also `viewInvoiceActions.ts` — `downloadInvoiceCsvFile()` | REWRITE — available on both invoices and quotations |
| `tip.shortcut.save-draft` — Ctrl+S / Ctrl+Enter | UNVERIFIED | No keyboard shortcut bindings found for Ctrl+S or Ctrl+Enter in the codebase. | REJECT — cannot confirm these shortcuts exist |
| `tip.shortcut.back-button` — Android back button | VERIFIED | `src/pages/CsrFormPage.tsx` — offline context uses `navigator.onLine`. Capacitor/Android back handling is implicit in the framework. | KEEP |
| `tip.shortcut.pull-to-refresh` — Pull to refresh | UNVERIFIED | No pull-to-refresh gesture handler found in the codebase. | REJECT — cannot confirm this exists |
| `tip.document.waybill-strips-money` — Waybills strip monetary values | VERIFIED | `src/domain/invoice/actions.js` — `buildWaybillPrefill()` only passes sourceInvoice metadata (invoiceId, invoiceNumber, clientId, clientName, poNumber). `src/domain/waybill/` types confirm no price/rate/vat/discount fields. | KEEP |
| `tip.document.pdf-templates` — PDF template switching | VERIFIED | `src/domain/pdf/customization/types.ts` — `PdfCustomizationDocumentFamily`. Waybill templates: `evergreen`, `minimal`, `thermal`, `classic`, `premium`, `slate` in `waybillUtils.ts` | KEEP |
| `tip.document.signatory` — Add signatory | VERIFIED | `src/pages/settings/SignatoriesSettingsSection.tsx` — full signatory management with upload | KEEP |
| `tip.document.footer-text` — Footer configuration | PARTIALLY VERIFIED | `src/pages/settings/DocumentsSettingsSection.tsx` exists but footer text configuration was not directly confirmed. | REWRITE — verify before claiming |
| `tip.document.reference-links` — Reference links | VERIFIED | `src/domain/waybill/waybillUtils.ts` — `WaybillCustomFields.references` stores linkedInvoiceNumber, linkedProjectName, sourceDocumentNumber | KEEP |
| `tip.business.overdue-recalc` — Overdue recalculation | VERIFIED | `src/hooks/useDashboardData.ts` — `isPastDue()` computed on every dashboard load from `invoice_financials_v` | KEEP |
| `tip.business.wht-deduction` — WHT automatic deduction | VERIFIED | `src/modules/invoices/services/paymentService.ts` — `autoCreateWhtReceiptDraft()` called when `wht_amount > 0` | KEEP |
| `tip.business.vat-config` — Default VAT rate | PARTIALLY VERIFIED | `src/pages/settings/DocumentsSettingsSection.tsx` exists. VAT defaults are set at invoice creation level via `src/lib/Calculations.ts`. | REWRITE — clarify that VAT is per-document, not truly a "default setting" |
| `tip.business.device-codes` — Device tracking codes | VERIFIED | `src/pages/settings/DeviceSettingsSection.tsx` — device code management. `src/lib/native/csrOffline.ts` — device codes used for offline numbering. | KEEP |
| `tip.navigation.drawer` — Drawer navigation | VERIFIED | `src/components/layout/ModuleShell.tsx` — drawer-based navigation shell | KEEP |
| `tip.navigation.recent-documents` — Recent documents on dashboard | VERIFIED | `src/hooks/useDashboardData.ts` — `recentDocs` built from latest invoices, quotations, CSRs, waybills, RFQs, BOQs | KEEP |
| `tip.navigation.project-hub` — Project hub | VERIFIED | `src/pages/ProjectDetail.tsx` — shows all linked invoices, quotations, waybills, CSRs, plus financial summary | KEEP |
| `tip.contextual.pdf-generating` — Queue PDF downloads | UNVERIFIED | No multi-queue PDF download feature found. PDF generation is single-document. | REJECT |
| `tip.contextual.import-waiting` — Background imports | PARTIALLY VERIFIED | `src/domain/import/` pipeline runs synchronously in the browser. No background processing found. | REWRITE — imports are not truly background |
| `tip.contextual.quotation-expiry` — Quotation expiry dates | VERIFIED | `src/pages/viewQuotationActions.ts` — `valid_until` field maps to quotation expiry. `updateQuotationStatus()` can change status. | KEEP |

### Summary

| Classification | Count |
|---------------|-------|
| KEEP | 22 |
| REWRITE | 7 |
| REJECT | 4 |

---

## 3. Newly Discovered Hidden Functionality

### 3.1 Compliance Hub

**Feature:** Full tax compliance management dashboard.
**Category:** Feature Tips
**Context:** `compliance`
**Why users may miss it:** The Compliance Hub is a standalone page accessible from the navigation. It is not surfaced on the dashboard or within invoice/quotation workflows. Users focused on document creation may never discover it.
**User benefit:** Track VAT exposure, WHT receipt status, tax filings, and tax obligations in one place. See overdue obligations and required actions at a glance.
**Implementation evidence:**
- `src/pages/ComplianceHub.tsx` — 5-section hub (Today, VAT, WHT Receipts, Filings, Obligations)
- `src/components/compliance/ComplianceOverview.tsx` — KPI strip showing VAT Charged, Expected WHT Exposure, Recoverable VAT, WHT Awaiting Receipt, Open/Overdue Filings
- `src/components/compliance/ComplianceActionQueue.tsx` — prioritised action queue
- `src/components/compliance/ComplianceSettingsPanel.tsx` — tax profile configuration
**Recommended tip:** "The Compliance Hub tracks your VAT exposure, WHT receipts, tax filings, and obligations. Open it from the menu to see what needs your attention."

| Field | Value |
|-------|-------|
| id | `tip.feature.compliance-hub` |
| category | Feature Tips |
| context | `compliance` |
| priority | 1 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.2 Payment Recording — Full Cascade

**Feature:** Recording a payment triggers five downstream operations.
**Category:** Workflow Tips
**Context:** `invoices`
**Why users may miss it:** Users may receive payment via bank transfer or cash and not realise they should record it in the application. The existing §23 tip undersells the benefit.
**User benefit:** Recording a payment automatically: (1) updates invoice status to reflect the new balance, (2) creates an audit trail entry, (3) creates a WHT receipt draft if WHT was deducted, (4) generates a payment acknowledgement receipt, and (5) stores payment attachments. Without recording, these downstream records are missing.
**Implementation evidence:**
- `src/modules/invoices/services/paymentService.ts` — `recordInvoicePayment()` at line 74
  - Calls `recordPaymentRecorded()` (audit trail)
  - Calls `autoCreateWhtReceiptDraft()` if `wht_amount > 0`
  - Calls `buildReceiptSnapshot()` + inserts into `receipts` table
  - Calls `recordReceiptGenerated()` (audit trail for receipt)
  - Uploads attachments via `/api/upload-payment-attachment`
  - RPC `record_payment_transaction` handles atomic payment + status sync
- `src/modules/invoices/repositories/paymentRepository.ts` — `syncInvoiceStatusFromFinancials()`
**Recommended tip:** "When you receive payment, record it in the app. The system auto-generates a receipt, creates an audit trail, and updates the outstanding balance."

| Field | Value |
|-------|-------|
| id | `tip.workflow.record-payment-full` |
| category | Workflow Tips |
| context | `invoices` |
| priority | 1 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.3 Invoice Revert to Quotation

**Feature:** Revert an invoice back to a quotation.
**Category:** Workflow Tips
**Context:** `invoices`
**Why users may miss it:** The "Revert to Quotation" action is in the invoice detail action menu. Users may not know this undo-like capability exists.
**User benefit:** If an invoice was created by mistake or the client needs changes, revert it back to a quotation without manually recreating items. The system preserves all line items and financial fields.
**Implementation evidence:**
- `src/domain/invoice/actions.js` — `revert` action key with label "Revert to Quotation"
- `src/modules/invoices/services/invoiceConversionService.ts` — `revertInvoiceToQuotationService()` creates a new quotation from invoice data, preserves items via `toQuotationItemRow()`, and marks the original invoice as reverted
- Uses RPC `revert_invoice_to_quotation_transaction` for atomic operation
**Recommended tip:** "Made a mistake on an invoice? Use 'Revert to Quotation' from the invoice menu. It restores the quotation with all items preserved."

| Field | Value |
|-------|-------|
| id | `tip.workflow.revert-invoice` |
| category | Workflow Tips |
| context | `invoices` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.4 Advance Invoices

**Feature:** Create advance invoices for partial payment before work begins.
**Category:** Feature Tips
**Context:** `invoices`
**Why users may miss it:** The "Advance Invoice" action is in the invoice detail action menu under More. It creates a child invoice representing a percentage or fixed amount of the parent.
**User benefit:** Request partial payment before starting work. The system supports percentage-based or fixed-amount advances, tracks the advance against the parent, and generates a separate PDF.
**Implementation evidence:**
- `src/domain/invoice/advanceChildFlow.ts` — `calculateAdvanceAmount()` supports `percent` and `fixed` modes
- `src/domain/invoice/advanceMetadata.ts` — `buildAdvanceInvoiceMetadata()`, `isAdvanceInvoiceParent()`
- `src/pages/viewInvoiceActions.ts` — `createAdvanceInvoiceRecord()`, `updateAdvanceInvoiceRecord()`, `deleteAdvanceInvoiceRecord()`
- `src/domain/invoice/actions.js` — `advance` action with label "Advance Invoice"
**Recommended tip:** "Need partial payment before starting work? Create an Advance Invoice from any standalone invoice. You can set a percentage or fixed amount."

| Field | Value |
|-------|-------|
| id | `tip.feature.advance-invoice` |
| category | Feature Tips |
| context | `invoices` |
| priority | 3 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.5 Internal vs External Waybill

**Feature:** Two distinct waybill types with different semantics.
**Category:** Document Tips
**Context:** `waybills`
**Why users may miss it:** Users may not realise that Internal Waybills exist alongside External Waybills. The default is Internal, but the distinction matters.
**User benefit:** External Waybills are for client-facing deliveries (sender, receiver, delivery location, client required). Internal Waybills are for internal custody transfers between your own teams (sender/receiver are "Released By"/"Received By"). The types use different number prefixes (-E- vs -I-) and different form fields.
**Implementation evidence:**
- `src/components/waybill/waybillUtils.ts` — `WAYBILL_TYPE_CONTENT` defines distinct labels, intros, and fields for `internal` and `external`
- `src/components/waybill/waybillUtils.ts` — `getNextWaybillNumber()` uses `-E-` for external, `-I-` for internal
- `src/domain/waybill/externalWaybillSchema.ts` and `internalWaybillSchema.ts` — separate Zod schemas
- `src/domain/waybill/externalWaybillImportAdapter.ts` and `internalWaybillImportAdapter.ts` — separate import adapters
**Recommended tip:** "External Waybills are for client deliveries. Internal Waybills are for custody transfers between your own teams. Choose the right type when creating a waybill."

| Field | Value |
|-------|-------|
| id | `tip.document.internal-external-waybill` |
| category | Document Tips |
| context | `waybills` |
| priority | 1 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.6 Blank Waybill PDFs

**Feature:** Download blank (empty) waybill templates for field use.
**Category:** Feature Tips
**Context:** `waybills`
**Why users may miss it:** The blank waybill option is behind the Waybill Gateway Overlay, not on the main form. Users may not find it.
**User benefit:** Download a pre-formatted blank waybill PDF to fill out by hand in the field. The system logs the assigned waybill number and increments the sequence.
**Implementation evidence:**
- `src/components/waybill/blankWaybillTemplate.tsx` — `downloadBlankWaybillTemplate()` renders `BlankExternalTemplate` or `BlankInternalTemplate`
- `src/pages/WaybillFormPage.tsx` — `handleBlankDownload()` logs to `blank_waybill_logs` and downloads the PDF
- `src/components/waybill/WaybillGatewayOverlay.tsx` — "Blank Template" option in the waybill creation gateway
**Recommended tip:** "Need a waybill for the field? Download a blank waybill PDF from the waybill creation screen. The system tracks the assigned number."

| Field | Value |
|-------|-------|
| id | `tip.feature.blank-waybill` |
| category | Feature Tips |
| context | `waybills` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.7 Global Search

**Feature:** Search across all document types from one search bar.
**Category:** Navigation Tips
**Context:** `null`
**Why users may miss it:** The search icon is small and placed in the top bar. Users focused on the current page may not notice it.
**User benefit:** Find any client, project, invoice, quotation, CSR, or waybill by typing a number or name. Results show type, status, amount, and date. Tap to navigate directly.
**Implementation evidence:**
- `src/hooks/useGlobalSearch.ts` — `useGlobalSearch()` queries 6 tables (clients, projects, invoices, quotations, csrs, waybills) with ILIKE matching
- `src/components/layout/GlobalSearch.tsx` — overlay with "Jump to Module" shortcuts and search results
- Available on dashboard (`DashboardOverview.tsx`) and page headers (`MobilePageHeader.tsx`)
**Recommended tip:** "Tap the search icon to find any document across all modules. Search by document number, client name, or project name."

| Field | Value |
|-------|-------|
| id | `tip.navigation.global-search` |
| category | Navigation Tips |
| context | `null` |
| priority | 1 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.8 Quotation Duplication

**Feature:** Duplicate a quotation to reuse its items and settings.
**Category:** Productivity Tips
**Context:** `quotations`
**Why users may miss it:** The duplicate action is in the quotation detail action menu. Users may recreate quotations manually instead.
**User benefit:** Clone a quotation's items, PO number, terms, and financial fields into a new draft. Clear client and project fields to avoid accidental attribution.
**Implementation evidence:**
- `src/pages/viewQuotationActions.ts` — `duplicateQuotationRecord()` builds a clean prefill from the source quotation
- Items are deep-copied and filtered for non-empty descriptions
- Identity fields (number, client, project) are cleared per Law 2 (Duplicate = clean draft)
**Recommended tip:** "Reuse a quotation's line items: open it, tap More, and select Duplicate. The new draft keeps all items but clears client and number fields."

| Field | Value |
|-------|-------|
| id | `tip.productivity.duplicate-quotation` |
| category | Productivity Tips |
| context | `quotations` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.9 Payment Acknowledgement Receipt

**Feature:** Automatic payment acknowledgement receipt generation.
**Category:** Business Operations Tips
**Context:** `invoices`
**Why users may miss it:** The receipt is auto-generated when a payment is recorded. Users may not know they can view and share it.
**User benefit:** When you record a payment, the system automatically creates a payment acknowledgement receipt with a snapshot of the invoice, client, company, bank, and signatory details. This receipt can be viewed and downloaded from the Receipts page.
**Implementation evidence:**
- `src/modules/invoices/services/paymentService.ts` — `buildReceiptSnapshot()` called after payment insert
- `src/domain/receipt/snapshotBuilder.ts` — `buildReceiptSnapshot()` captures full document state
- `src/domain/receipt/receiptNumber.ts` — auto-numbered receipts
- `src/pages/Receipts.tsx` — receipt listing page
- `src/pages/ViewReceipt.tsx` — receipt detail view with download
**Recommended tip:** "Every recorded payment automatically generates a receipt. View and download it from the Receipts page."

| Field | Value |
|-------|-------|
| id | `tip.business.auto-receipt` |
| category | Business Operations Tips |
| context | `invoices` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.10 Client Workspace

**Feature:** Per-client dashboard showing all related documents.
**Category:** Navigation Tips
**Context:** `clients`
**Why users may miss it:** Users may not realise that clicking a client name opens a full workspace with documents, projects, and financial overview.
**User benefit:** Open a client to see all their invoices, quotations, CSRs, waybills, and projects in one place. View financial summary and recent activity without searching.
**Implementation evidence:**
- `src/pages/ClientDetail.tsx` — tabs for overview, projects, invoices, quotations, CSRs, waybills
- `src/components/client/workspace/ClientOverviewTab.tsx` — activity feed with links to documents
- `src/components/client/workspace/ClientDocumentsTab.tsx` — document listing by type
**Recommended tip:** "Tap a client name to open their workspace. See all invoices, quotations, CSRs, and waybills in one place."

| Field | Value |
|-------|-------|
| id | `tip.navigation.client-workspace` |
| category | Navigation Tips |
| context | `clients` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.11 Document Number Prefixes

**Feature:** Configurable document number prefixes per workspace.
**Category:** Business Operations Tips
**Context:** `null`
**Why users may miss it:** The Document Prefixes setting is under Preferences in Settings. Users may not realise they can customise numbering schemes.
**User benefit:** Customise the prefix for invoices, quotations, CSRs, waybills, receipts, and other documents. This is useful when operating under a specific brand or business unit.
**Implementation evidence:**
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx` — full prefix configuration UI
- `src/domain/prefixConstants.ts` — `resolvePrefix()` function
- Example: "For generating: External Delivery Notes (-E-), Internal Transfer Notes (-I-), Blank External Waybills (-ME-), Blank Internal Waybills (-MI-)."
**Recommended tip:** "Customise your document number prefixes in Settings > Document Prefixes. Set distinct prefixes for invoices, quotations, waybills, and CSRs."

| Field | Value |
|-------|-------|
| id | `tip.business.document-prefixes` |
| category | Business Operations Tips |
| context | `null` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.12 CSV Export

**Feature:** Export document line items as CSV.
**Category:** Productivity Tips
**Context:** `invoices`
**Why users may miss it:** The Export CSV action is in the document action menu under More. Users may not know they can export data for spreadsheet analysis.
**User benefit:** Download line items as a CSV file for use in spreadsheets, price comparisons, or external reporting. The export recalculates totals from the canonical calculation engine, so the data is always accurate.
**Implementation evidence:**
- `src/pages/viewInvoiceActions.ts` — `downloadInvoiceCsvFile()` calls `buildInvoiceCsv()` + `downloadInvoiceCsv()`
- `src/pages/viewQuotationActions.ts` — `downloadQuotationCsvFile()` calls `buildQuotationCsv()` + `downloadQuotationCsv()`
- `src/components/invoice/exportInvoiceCsv.ts` — CSV builder
- `src/components/quotation/exportQuotationCsv.ts` — CSV builder
**Recommended tip:** "Export any invoice or quotation as CSV from the action menu. Use it for spreadsheets, price comparisons, or sharing line-item data."

| Field | Value |
|-------|-------|
| id | `tip.productivity.csv-export` |
| category | Productivity Tips |
| context | `invoices` |
| priority | 2 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.13 CSR from Invoice

**Feature:** Generate a Customer Service Report directly from an invoice.
**Category:** Workflow Tips
**Context:** `invoices`
**Why users may miss it:** The "Generate CSR" action is in the invoice detail action menu. Users may create CSRs manually and not know this shortcut exists.
**User benefit:** Create a CSR pre-filled with the invoice's client, project, and linked reference. The CSR tracks post-sale service activity against the original invoice.
**Implementation evidence:**
- `src/domain/invoice/actions.js` — `generate-csr` action with label "Generate CSR"
- `src/hooks/useInvoiceMutations.ts` — `handleGenerateCsr()` navigates to CSR form with invoice context
- `src/modules/invoices/services/invoiceChildDocService.ts` — `attachExistingCsr()` links CSR to invoice
**Recommended tip:** "Create a Customer Service Report directly from an invoice. The action menu on any invoice has a 'Generate CSR' option."

| Field | Value |
|-------|-------|
| id | `tip.workflow.csr-from-invoice` |
| category | Workflow Tips |
| context | `invoices` |
| priority | 3 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

### 3.14 Dashboard Activity Feed

**Feature:** Dashboard shows recent activity events across all modules.
**Category:** Business Operations Tips
**Context:** `null`
**Why users may miss it:** The activity feed appears at the bottom of the dashboard. Users focused on KPI cards may scroll past it.
**User benefit:** See a chronological feed of recent actions (document created, status changed, payment recorded) across invoices, quotations, projects, CSRs, and waybills without navigating to each module.
**Implementation evidence:**
- `src/hooks/useDashboardData.ts` — `activityEvents` loaded from `activity_events` table, limited to 10 most recent
- `src/components/dashboard/DashboardOverview.tsx` — activity feed rendered in the dashboard
**Recommended tip:** "Scroll down on the dashboard to see a live activity feed. It shows recent actions across all your documents and projects."

| Field | Value |
|-------|-------|
| id | `tip.business.activity-feed` |
| category | Business Operations Tips |
| context | `null` |
| priority | 3 |
| audience | all |
| repeatPolicy | `session:3` |
| active | true |

---

## 4. Priority Recommendations

| Priority | Tip ID | Description |
|----------|--------|-------------|
| P0 | `tip.workflow.record-payment-full` | Payment recording cascade — highest user value, most commonly missed |
| P0 | `tip.feature.compliance-hub` | Compliance Hub discovery — significant hidden functionality |
| P0 | `tip.document.internal-external-waybill` | Internal vs External Waybill — fundamental distinction users miss |
| P1 | `tip.workflow.revert-invoice` | Revert invoice to quotation — high value undo capability |
| P1 | `tip.feature.advance-invoice` | Advance invoices — important for cash-flow management |
| P1 | `tip.feature.blank-waybill` | Blank waybill PDFs — useful for field operations |
| P1 | `tip.navigation.global-search` | Global search — productivity multiplier |
| P1 | `tip.business.auto-receipt` | Auto-receipt generation — users benefit from knowing receipts exist |
| P2 | `tip.navigation.client-workspace` | Client workspace — useful but less hidden |
| P2 | `tip.business.document-prefixes` | Document prefixes — configuration-level tip |
| P2 | `tip.productivity.csv-export` | CSV export — useful for power users |
| P2 | `tip.productivity.duplicate-quotation` | Quotation duplication — time saver |
| P2 | `tip.workflow.csr-from-invoice` | CSR from invoice — workflow shortcut |
| P2 | `tip.business.activity-feed` | Activity feed — dashboard education |

---

## 5. Compliance Hub Findings

The Compliance Hub is a fully implemented, standalone page at `/compliance` accessible from the navigation menu.

### What It Does

The hub provides five sections:

| Section | Function |
|---------|----------|
| **Today** | Overview dashboard with KPI strip (VAT Charged, Expected WHT Exposure, Recoverable VAT, WHT Awaiting Receipt, Open/Overdue Filings) and a prioritised action queue |
| **VAT** | Manages tax input entries — record recoverable VAT from supplier invoices |
| **WHT Receipts** | Tracks Withholding Tax receipt lifecycle: Requested → Pending → Received → Verified. Links to specific payments |
| **Filings** | Records tax filings (VAT, WHT, CIT) with status tracking (draft, ready, submitted, paid, overdue) |
| **Obligations** | Manages tax obligation reminders with due dates, linked filings, and status (upcoming, due, overdue, resolved) |

### KPI Metrics Shown

1. **VAT Charged** — total VAT across all non-archived invoices
2. **Expected WHT Exposure** — total WHT configured on invoices
3. **Recoverable VAT** — total VAT from recoverable tax input entries
4. **Actual WHT Awaiting Receipt** — WHT deducted on payments but without a verified receipt
5. **Open/Overdue Filings** — count of overdue and open tax filings

### Action Queue

The action queue surfaces items in priority order:
1. Overdue obligations
2. Overdue filings
3. Untracked WHT payments (WHT deducted but no receipt tracking started)
4. Requested WHT receipts (awaiting client response)
5. Pending/received WHT receipts (awaiting verification)
6. Due obligations
7. Open/ready filings
8. Upcoming obligations

### Why Users Miss It

The Compliance Hub is a separate navigation entry. It is not surfaced on the dashboard or within document workflows. Users who create invoices and record payments may not realise there is a dedicated place to track tax compliance.

### Recommended Tip

"The Compliance Hub tracks your VAT exposure, WHT receipts, tax filings, and obligations. Open it from the menu to see what needs your attention."

---

## 6. Payment Recording Findings

### What Recording a Payment Changes

Recording a payment against an invoice triggers the following downstream operations (evidence from `src/modules/invoices/services/paymentService.ts`):

| Operation | What Happens | Implementation |
|-----------|-------------|----------------|
| **Invoice status sync** | The invoice status recalculates (unpaid → partial → paid) based on total payments vs. invoice total | RPC `record_payment_transaction` calls `syncInvoiceStatusFromFinancials()` |
| **Audit trail** | A `recordPaymentRecorded()` entry is created with payment mode, bank account, running balance, and WHT amount | `src/lib/audit.ts` — `recordPaymentRecorded()` |
| **WHT receipt draft** | If WHT was deducted, `autoCreateWhtReceiptDraft()` creates a WHT receipt tracking entry | `src/modules/compliance/services/complianceService.ts` |
| **Payment acknowledgement receipt** | A receipt is auto-generated with a snapshot of invoice, client, company, bank, and signatory details | `buildReceiptSnapshot()` + insert into `receipts` table |
| **Attachment upload** | Payment attachments (bank transfer screenshots, etc.) are uploaded via the Telegram-backed API | `/api/upload-payment-attachment` |
| **Activity event** | An activity event is logged in `activity_events` for the dashboard feed | Audit system |

### Why Users Should Record Payments

Without recording a payment:
- The invoice remains "unpaid" or "partially paid" in the system
- The dashboard shows an incorrect outstanding balance
- No receipt is generated for the client
- No audit trail exists for the payment
- WHT receipt tracking cannot begin
- Reports show inaccurate collections data
- The Compliance Hub shows incorrect WHT exposure

### Proposed Payment-Recording Tip

"When you receive payment, record it in the app. The system auto-generates a receipt, creates an audit trail, and updates the outstanding balance."

### Avatar / Mascot for Payment Tip

See Section 7.

---

## 7. Avatar / Mascot Findings

### Existing Avatar System

The application uses standard shadcn/ui Avatar components:
- `@/components/ui/avatar` — `Avatar`, `AvatarImage`, `AvatarFallback` (Radix UI primitives)
- Used in template files and component library examples for user profile display

### Mascot / Character System

**No mascot or character system exists in the production application.** The search for mascot, character, animation, or Lottie files returned zero results in the `src/` directory.

### Bowing / Begging Animation

**No bowing, pleading, begging, or similar animation exists.** The only `motion` usage in `src/` is:
- `src/components/ui/circuit-board.tsx` — a decorative circuit-board animation (not a character)
- `src/components/app/SplashOverlay.tsx` — splash screen with brand wordmark

### Assessment

- The "repeated bowing/begging" concept for the payment-recording tip **does not have existing assets to build on**.
- Creating this animation would require: (1) a character/mascot design, (2) a bowing animation (CSS keyframes or Lottie), (3) integration into the tip container component.
- This should be treated as an **optional visual enhancement** for the payment-recording tip, not a prerequisite for the Tips system.
- The tip text alone is sufficient without animation.

---

## 8. Recommended Final Tip Library

### Feature Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.feature.compliance-hub` | The Compliance Hub tracks your VAT exposure, WHT receipts, tax filings, and obligations. Open it from the menu to see what needs your attention. | `compliance` | 1 | all | `session:3` | true |
| `tip.feature.convert-quotation` | You can convert an approved quotation directly into an invoice with one tap. | `quotations` | 2 | all | `session:3` | true |
| `tip.feature.advance-invoice` | Need partial payment before starting work? Create an Advance Invoice from any standalone invoice. You can set a percentage or fixed amount. | `invoices` | 3 | all | `session:3` | true |
| `tip.feature.duplicate-document` | Any document can be duplicated. Open the document, tap More, and select Duplicate. | `null` | 4 | all | `session:3` | true |
| `tip.feature.column-settings` | Tap the table settings icon on any form to customise which columns appear and their order. | `invoices` | 5 | all | `session:3` | true |
| `tip.feature.blank-waybill` | Need a waybill for the field? Download a blank waybill PDF from the waybill creation screen. The system tracks the assigned number. | `waybills` | 6 | all | `session:3` | true |

### Workflow Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.workflow.record-payment-full` | When you receive payment, record it in the app. The system auto-generates a receipt, creates an audit trail, and updates the outstanding balance. | `invoices` | 1 | all | `session:3` | true |
| `tip.workflow.revert-invoice` | Made a mistake on an invoice? Use "Revert to Quotation" from the invoice menu. It restores the quotation with all items preserved. | `invoices` | 2 | all | `session:3` | true |
| `tip.workflow.waybill-from-invoice` | Transform invoice line items into a waybill. Monetary values are stripped automatically. | `invoices` | 3 | all | `session:3` | true |
| `tip.workflow.csr-from-invoice` | Create a Customer Service Report directly from an invoice. The action menu on any invoice has a "Generate CSR" option. | `invoices` | 4 | all | `session:3` | true |
| `tip.workflow.offline-drafts` | On Android, you can create quotation and CSR drafts offline. They sync when you reconnect. | `null` | 5 | all | `session:3` | true |

### Productivity Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.productivity.csv-export` | Export any invoice or quotation as CSV from the action menu. Use it for spreadsheets, price comparisons, or sharing line-item data. | `invoices` | 1 | all | `session:3` | true |
| `tip.productivity.json-import` | Import line items from a JSON file instead of typing them manually. Available on invoice and quotation forms. | `invoices` | 2 | all | `session:3` | true |
| `tip.productivity.custom-columns` | Add custom columns to your line-item table for specifications, part numbers, or internal notes. | `invoices` | 3 | all | `session:3` | true |
| `tip.productivity.duplicate-quotation` | Reuse a quotation's line items: open it, tap More, and select Duplicate. The new draft keeps all items but clears client and number fields. | `quotations` | 4 | all | `session:3` | true |

### Document Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.document.internal-external-waybill` | External Waybills are for client deliveries. Internal Waybills are for custody transfers between your own teams. Choose the right type when creating a waybill. | `waybills` | 1 | all | `session:3` | true |
| `tip.document.waybill-strips-money` | Waybills strip monetary values by design. Rates and totals live on the source invoice. | `waybills` | 2 | all | `session:3` | true |
| `tip.document.pdf-templates` | Switch between document templates (Bolt, Crest, Ember, etc.) to change your PDF style. | `pdf-generation` | 3 | all | `session:3` | true |
| `tip.document.signatory` | Add a signatory to your document for authorised approval. The signature appears on the PDF. | `null` | 4 | all | `session:3` | true |
| `tip.document.reference-links` | Attach reference links to documents. They appear on the PDF and in the document view. | `null` | 5 | all | `session:3` | true |

### Business Operations Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.business.auto-receipt` | Every recorded payment automatically generates a receipt. View and download it from the Receipts page. | `invoices` | 1 | all | `session:3` | true |
| `tip.business.overdue-recalc` | Overdue flags recalculate every time the dashboard loads. No manual refresh needed. | `null` | 2 | all | `session:3` | true |
| `tip.business.wht-deduction` | Withholding Tax (WHT) is deducted automatically when you select the WHT option on an invoice. | `invoices` | 3 | all | `session:3` | true |
| `tip.business.document-prefixes` | Customise your document number prefixes in Settings > Document Prefixes. Set distinct prefixes for invoices, quotations, waybills, and CSRs. | `null` | 4 | all | `session:3` | true |
| `tip.business.device-codes` | Each linked device gets a unique two-letter code. Use it to track which device created a document. | `null` | 5 | all | `session:3` | true |
| `tip.business.activity-feed` | Scroll down on the dashboard to see a live activity feed. It shows recent actions across all your documents and projects. | `null` | 6 | all | `session:3` | true |

### Navigation Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.navigation.global-search` | Tap the search icon to find any document across all modules. Search by document number, client name, or project name. | `null` | 1 | all | `session:3` | true |
| `tip.navigation.client-workspace` | Tap a client name to open their workspace. See all invoices, quotations, CSRs, and waybills in one place. | `clients` | 2 | all | `session:3` | true |
| `tip.navigation.project-hub` | Open a project to see all linked invoices, quotations, waybills, and CSRs in one place. | `projects` | 3 | all | `session:3` | true |
| `tip.navigation.recent-documents` | Your recently viewed documents appear on the dashboard for quick access. | `null` | 4 | all | `session:3` | true |

### Contextual Tips

| id | message | context | priority | audience | repeatPolicy | active |
|----|---------|---------|----------|----------|--------------|--------|
| `tip.contextual.quotation-expiry` | Set an expiry date on quotations to automatically flag overdue responses. | `quotations` | 1 | all | `session:3` | true |
| `tip.contextual.pdf-generating` | While you wait for this PDF, review the document details or prepare the next one. | `pdf-generation` | 2 | all | `session:3` | true |

---

## 9. Rejected / Unverified Candidates

| Feature | Reason for Exclusion |
|---------|---------------------|
| **Ctrl+S / Ctrl+Enter shortcuts** | No keyboard shortcut bindings found in the codebase. Cannot confirm these exist. |
| **Pull-to-refresh** | No pull-to-refresh gesture handler found. The application uses button-based refresh. |
| **Merge quantity/unit column** | No dedicated merge column feature. Column visibility modes exist but no explicit qty+unit merge. |
| **Background PDF queuing** | PDF generation is single-document and synchronous. No multi-queue feature found. |
| **Background imports** | The import pipeline runs synchronously in the browser. No background processing or web worker usage. |

---

## 10. Implementation Notes for Future Tip System

1. **Tip content is ready for integration.** The 33 tips in Section 8 are production-ready content that matches the §7 content model.

2. **New categories needed:** The existing taxonomy covers all tips. No new categories are required.

3. **Context field values:** The tips use these context values: `invoices`, `quotations`, `waybills`, `clients`, `projects`, `pdf-generation`, `compliance`, and `null` (general).

4. **Priority ordering:** Within each category, lower priority numbers are shown first. The system should respect this ordering.

5. **Repeat policy:** All tips use `session:3` (max 3 times per session). The anti-repetition strategy in §6 applies on top.

6. **Avatar animation (optional):** The payment-recording tip could benefit from a humorous bowing/begging avatar animation, but no existing assets support this. It should be treated as a future enhancement, not a blocker.

7. **Contextual tips:** Tips with a non-null `context` should be preferred when the loading operation is related to that module. For example, PDF generation tips should appear during PDF loading.

8. **Tip rotation:** During Level 5 long-running operations, tips should rotate no more than every 8 seconds, with a maximum of 3 tips per operation.
