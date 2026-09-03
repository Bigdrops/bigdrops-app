# ViewInvoice — Page Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/pages/ViewInvoice.tsx`
**Actions file:** `src/pages/viewInvoiceActions.ts`
**Action hook:** `src/components/document-view/invoice/useInvoiceActions.ts`
**Data hook:** `src/hooks/useInvoiceDetailData.js`
**Workspace:** `src/components/document-view/invoice/InvoiceWorkspace.tsx`
**Overlays:** `src/components/document-view/invoice/InvoiceOverlays.tsx`
**DB migration:** `supabase/migrations/20260520090003_invoices.sql`

---

## 1. Page Structure Overview

`ViewInvoice` is an orchestration page that loads all invoice-related data, builds preview/view models, and delegates rendering to `InvoiceWorkspace`. The page itself handles:

- **Quarantine guard:** Redirects advance child invoices to their parent (`src/pages/ViewInvoice.tsx` lines 91–105, uses `isAdvanceInvoiceChild()` from `src/domain/invoice/advanceMetadata.ts`)
- **Data orchestration:** Delegates all data fetching to `useInvoiceDetailData` hook
- **Model building:** Computes 3 memoized models (viewModel, documentTotals, previewModel)
- **PDF customization state:** Local `pdfOutput` state synced from `invoice.custom_fields`
- **Action delegation:** All actions handled through `useInvoiceActions` hook

### Layout Structure

```
DocumentPage
├── InvoiceTopNav (back, share, customize, more)
├── InvoiceActionRow (Record Payment [if unpaid], Edit, Download)
├── InvoiceDocumentCard (document preview)
├── BankDetailsCard (bank account selector)
├── DocumentOptionsCard (PDF output options)
├── InvoiceOperationalSections
│   ├── PaymentHistoryCard
│   ├── AdvanceInvoicesCard
│   ├── RelatedDocsCard
│   └── ActivityCard
├── FloatingDocumentButton (FAB download)
└── InvoiceOverlays
    ├── PdfOutputCustomizeSheet
    ├── InvoiceRecordPaymentSheet
    ├── InvoiceAdvanceSheet
    ├── InvoiceMoreSheet
    ├── DocumentConfirmDialog (revert)
    ├── DocumentConfirmDialog (archive)
    ├── DocumentConfirmDialog (delete)
    ├── ProjectLinkDialog
    └── VoidPaymentDialog
```

---

## 2. Data Loading (`useInvoiceDetailData.js`)

**File:** `src/hooks/useInvoiceDetailData.js`

### State Variables

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| `invoice` | `object\|null` | `null` | Row from `invoices` table |
| `items` | `array` | `[]` | Sorted rows from `invoice_items` table, mapped through `mapDbInvoiceItem()` |
| `payments` | `array` | `[]` | Merged active + voided payments, sorted by date then created_at |
| `invoiceFinancials` | `object\|null` | `null` | Row from `invoice_financials_v` view |
| `client` | `object\|null` | `null` | Row from `clients` table |
| `settings` | `object` | `{}` | Normalized row from `settings` table (id=1) |
| `bankAccounts` | `array` | `[]` | Rows from `bank_accounts`, ordered by `is_default DESC` |
| `signatories` | `array` | `[]` | Rows from `signatories`, ordered by `name` |
| `creatorProfile` | `object\|null` | `null` | Row from `profiles` table (created_by lookup) |
| `session` | `object\|null` | `null` | Current auth session |
| `linkedProject` | `object\|null` | `null` | Project summary via `fetchProjectSummary()` |
| `relatedCsrs` | `array` | `[]` | CSRs linked to this invoice via `fetchInvoiceChildDocuments()` |
| `relatedWaybills` | `array` | `[]` | Waybills linked to this invoice via `fetchInvoiceChildDocuments()` |
| `loading` | `boolean` | `true` | Loading state |
| `error` | `object\|null` | `null` | Error state |
| `advanceInvoiceProjection` | `object\|null` | computed | Derived from `deriveAdvanceInvoiceProjection(invoice)` |

### Queries Executed on `refresh()`

All fired in parallel via `Promise.all()`:

1. **`fetchInvoice()`** — `supabase.from('invoices').select('*').eq('id', id).single()` + fetches client and creator profile
2. **`fetchItems()`** — `supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')`
3. **`fetchPayments()`** — Two queries: active (voided_at IS NULL) + voided (voided_at IS NOT NULL), merged
4. **`fetchInvoiceRelationships()`** — Calls `fetchInvoiceChildDocuments(id)` for CSRs and waybills
5. **`fetchInvoiceFinancials()`** — `supabase.from('invoice_financials_v').select('*').eq('id', id).single()` — also syncs `computed_status` back to invoice

### Offline Fallback

- Detects Capcitor native SQLite + offline via `canUseNativeSqlite()` + `navigator.onLine`
- Falls back to `getCachedInvoiceDetail(id)` and `getCachedInvoicePayments(id)` from `@/lib/native/invoiceCache`
- Cache is written on successful fetch via `cacheInvoiceDetail()` and `cacheInvoicePayments()`

---

## 3. Models & Computations

All computed in `ViewInvoice.tsx` via `useMemo`:

### viewModel

**Source:** `buildInvoiceViewModel()` from `@/domain/invoice/viewModel`
**Inputs:** invoice, items, payments, relatedCsrs, relatedWaybills, financials, project, sourceDocument
**Output:** Object containing `cashReceived`, `balanceDue`, `invoiceTotal`, `computedStatus`, and other display fields

### documentTotals

**Source:** `computeDocument()` from `@/lib/Calculations`
**Inputs:** invoice, items, customFields (columnConfig), columns (saved or BUILTIN_COLUMNS)
**Output:** `CalculationResult` with subtotal, vat, discount, wht, installRateTotal, totalPayable

### previewModel

**Source:** `buildInvoicePreviewModel()` from `@/domain/invoice/previewModel`
**Inputs:** invoice, items, client, settings, bankAccounts, customFields, pdfOutput, signatory, poNumber, invoiceTotal, cashReceived, balanceDue, totals breakdown, formatMoney function
**Output:** Full preview model with `previewItems`, `previewTotals`, `previewDetailRows`, `companyPreviewLines`, `clientPreviewLines`, `previewBankAccounts`, `signatory`, etc.

### resolvedSignatory

**Source:** `resolveDocumentSignatory()` from `@/domain/invoice/previewModel`
**Inputs:** signatoryId from customFields, signatories array
**Output:** Matching signatory object or null

### Other Memos

- `customFields` — parsed via `parseCustomFields(invoice?.custom_fields)` from `@/domain/invoice/index.ts`
- `pdfTemplateId` — normalized via `normalizeInvoicePdfTemplateId()`, default `"industry"`
- `sourceDocument` — from `getInvoiceSourceDocument(invoice)` in `@/domain/documentRelationships`
- `logoUrl` — from `resolveCanonicalLogoUrl(settings)` in `@/domain/documentMedia`
- `previewBankAccounts` — from `buildBankAccountsProjection(bankAccounts)`

---

## 4. Workspace Components

### 4.1 InvoiceTopNav

**File:** `src/components/document-view/invoice/InvoiceTopNav.tsx`

Wraps `DocumentTopNav` from `@/components/document-view/shared/DocumentTopNav.tsx`.

| Action | Trigger | Description |
|--------|---------|-------------|
| Back | Left chevron | Navigates to `/invoices` |
| Share | Share2 icon | Calls `actions.handleShare()` |
| Customize | Palette icon | Opens `SHEET_CUSTOMIZE` |
| More | MoreHorizontal icon | Opens `SHEET_MORE` |

### 4.2 InvoiceActionRow

**File:** `src/components/document-view/invoice/InvoiceActionRow.tsx`

| Button | Condition | Action |
|--------|-----------|--------|
| Record Payment | Hidden when `isPaid` (status === 'paid') | Opens record-payment sheet |
| Edit | Always shown | Navigates to `/invoices/edit/{id}` |
| Download (pill) | Always shown | Calls `actions.handleDownload()` |

### 4.3 InvoiceDocumentCard

**File:** `src/components/document-view/invoice/InvoiceDocumentCard.tsx`

Renders a visual document preview showing:
- Brand block (logo + company name/tagline + company lines)
- Status pill (uppercased invoice status)
- Invoice title
- Meta chips (invoice number, issue date, due date, PO number)
- Client info grid + detail rows
- Item list (supporting group headers, group footers, item rows with facts, images)
- Totals list (rows + grand total + amount in words)
- Signatory block (signature image or fallback text + name + role)

### 4.4 BankDetailsCard

**File:** `src/components/document-view/shared/BankDetailsCard.tsx` (inferred from import path)

Shows bank accounts. `onBankAccountSelect` from parent passes bankId to `handleSaveCustomization`.

### 4.5 DocumentOptionsCard

**File:** `src/components/document-view/shared/DocumentOptionsCard.tsx` (inferred from import path)

PDF output options. Contains `onOutputChange`, `onToggleMergeQtyUnit`, `onCustomize` callbacks.

### 4.6 InvoiceOperationalSections

**File:** `src/components/document-view/invoice/InvoiceOperationalSections.tsx`

Contains 4 sections stacked vertically:

#### 4.6.1 PaymentHistoryCard
**File:** `src/components/document-view/invoice/sections/PaymentHistoryCard.tsx`

- Initially open (isOpen = true)
- Header: "Payment History" with "Record" button + chevron
- Content: Settled Total, Balance Due, progress bar, payment rows
- Each payment row: method label, date/time, reference/notes, amount, "Void" button
- Links to receipts if they exist (`navigate(/receipts/{id})`)
- Fetches receipts mapping via `supabase.from('receipts')` query

#### 4.6.2 AdvanceInvoicesCard
**File:** `src/components/document-view/invoice/sections/AdvanceInvoicesCard.tsx`

- If no advance invoice: shows header with "CREATE" button
- If advance exists: shows header with "VIEW/EDIT" button + advance invoice row (number, date, amount)

#### 4.6.3 RelatedDocsCard
**File:** `src/components/document-view/invoice/sections/RelatedDocsCard.tsx`

- Initially open (isOpen = true)
- Shows source document (quotation), CSRs, Waybills
- Clicking navigates to the respective document view page
- Empty state: "No related documents found."

#### 4.6.4 ActivityCard
**File:** `src/components/document-view/invoice/sections/ActivityCard.tsx`

- Initially closed (isOpen = false)
- Uses `useAuditTrail({ entityType: "invoice", entityId, enabled: isOpen })` — data loaded lazily
- Shows actor + action + timestamp per entry
- Clickable rows expand to show field-level changes (old → new)

### 4.7 FloatingDownloadButton

**File:** `src/components/document-view/shared/FloatingDownloadButton.tsx`

Floating action button labeled "Download PDF". Calls `onFabClick` (which maps to `handleDownload`).

---

## 5. Overlays (Sheets & Dialogs)

All managed by `InvoiceOverlays.tsx`. Sheet/modal IDs:

| ID | Type | Component |
|----|------|-----------|
| `customize-output` | Sheet | PdfOutputCustomizeSheet |
| `record-payment` | Sheet | InvoiceRecordPaymentSheet |
| `advance` | Sheet | InvoiceAdvanceSheet |
| `more-actions` | Sheet | InvoiceMoreSheet |
| `revert` | Modal | DocumentConfirmDialog |
| `archive` | Modal | DocumentConfirmDialog |
| `delete` | Modal | DocumentConfirmDialog |
| `void-payment` | Modal | VoidPaymentDialog |

### 5.1 PdfOutputCustomizeSheet

**Source:** `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx`

Template, font, and color styling for invoice PDF. `onSave` calls `handleSaveCustomization`.

### 5.2 InvoiceRecordPaymentSheet

**File:** `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`

Full payment recording form:

**Form fields:**
- Balance Due (read-only, loaded from `loadPaymentSheetData()`)
- Cash Amount (NumericInput)
- Percentage (text input with % suffix)
- 4 quick buttons: 25%, 50%, 75%, 100%
- Settlement Preview panel (cash received, WHT deducted, net settlement, remaining balance, progress bar)
- Date (date input with calendar icon)
- Mode/Method (Select: Transfer, Cash, POS, Cheque, Other)
- Reference (text input)
- Destination Account (Select, shown only for Transfer method)
- Notes (textarea)
- PaymentAttachmentUploader

**States:** loadingData, saving, error, submitAttempted, paymentRecorded, attachments, uploadResults

**Save flow:** `recordInvoicePayment()` service call → if upload results, shows upload status → on success calls `onSaved()` and `onClose()`

### 5.3 InvoiceAdvanceSheet

**File:** `src/components/invoice/view/InvoiceAdvanceSheet.tsx`

Advance invoice create/view/edit sheet. Props include mode, inputValue, suffix, labels, onSave/onDownloadPdf.

### 5.4 InvoiceMoreSheet

**File:** `src/components/document-view/invoice/InvoiceMoreSheet.tsx`

4 sections:

| Section | Items |
|---------|-------|
| Lifecycle | Revert to Quotation, Generate Waybill |
| Payments & Advances | Record Payment, Advance Invoice |
| Common Actions | Link to Project, Duplicate, Copy Invoice Number, Export as CSV, Qty + Unit merge (toggle) |
| Danger Zone | Archive Invoice, Delete Invoice |

### 5.5 VoidPaymentDialog

**File:** `src/components/document-view/invoice/VoidPaymentDialog.tsx`

AlertDialog with reason text input. Requires non-empty reason. Confirm calls `confirmVoidPayment`.

### 5.6 DocumentConfirmDialogs

3 instances for: Revert to Quotation, Archive, Delete. Uses shared `DocumentConfirmDialog` component.

### 5.7 ProjectLinkDialog

**Source:** `src/components/document/ProjectLinkDialog.tsx`

Links invoice to a project. `tableName="invoices"`, `onLinked={() => refresh()}`.

---

## 6. Actions (`useInvoiceActions.ts`)

**File:** `src/components/document-view/invoice/useInvoiceActions.ts`

### State variables managed in hook

| Variable | Initial | Description |
|----------|---------|-------------|
| `downloading` | `false` | PDF download in progress |
| `projectLinkOpen` | `false` | Project link dialog open |
| `reverting` | `false` | Revert in progress |
| `archiving` | `false` | Archive in progress |
| `deleting` | `false` | Delete in progress |
| `duplicating` | `false` | Duplicate in progress |
| `advanceSheetMode` | `"create"` | Current advance sheet mode |
| `selectedAdvanceInvoice` | `null` | Selected advance for view/edit |
| `advanceSaving` | `false` | Advance save in progress |
| `advancePdfGenerating` | `false` | Advance PDF gen in progress |
| `advanceDeleteConfirmOpen` | `false` | Advance delete confirm open |
| `advanceMode` | `"percent"` | Advance mode (percent/fixed) |
| `advanceInputValue` | `30` | Advance input value |
| `advanceSuffixValue` | `ADVANCE_SUFFIX_DEFAULT` | Advance suffix |
| `advancePrimaryLabel` | `ADVANCE_PRIMARY_LABEL_DEFAULT` | Advance primary label |
| `advanceSecondaryLabel` | `ADVANCE_SECONDARY_LABEL_DEFAULT` | Advance secondary label |
| `pendingVoidPaymentId` | `null` | Payment ID to void |
| `voiding` | `false` | Void in progress |

### Action Handlers

| Handler | Purpose | Service Layer | Side Effects |
|---------|---------|--------------|--------------|
| `handleDownload` | Download invoice PDF | `downloadInvoicePdfDocument()` from `invoicePdfActions.ts` | Sets downloading state |
| `handleArchive` | Archive invoice | `archiveInvoice()` from `invoiceLifecycleService.ts` | Navigates to /invoices on success |
| `handleDelete` | Delete invoice | `deleteInvoice()` from `invoiceLifecycleService.ts` | Navigates to /invoices on success |
| `handleRevertToQuotation` | Convert to quotation | `revertInvoiceToQuotationService()` from `invoiceConversionService.ts` | Navigates to /quotations/{id} |
| `handleDuplicate` | Clone invoice | `duplicateInvoice()` from `invoiceLifecycleService.ts` | Navigates to /invoices/new with prefill |
| `handleDownloadCsv` | Export CSV | `downloadInvoiceCsvFile()` from `viewInvoiceActions.ts` | Downloads CSV file |
| `handleCopyNumber` | Copy to clipboard | `navigator.clipboard.writeText()` | Toast feedback |
| `handleToggleMergeQtyUnit` | Toggle merge | Direct `supabase.from('invoices').update()` | DB write, refresh |
| `handleSaveCustomization` | Save PDF settings | Direct `supabase.from('invoices').update()` | DB write, refresh |
| `handleVoidPayment` | Open void dialog | Sets pendingVoidPaymentId, opens modal | UI state only |
| `confirmVoidPayment` | Execute void | `voidInvoicePayment()` from `paymentService.ts` + `syncAndGetInvoiceStatus()` | DB write, refresh |
| `handleAdvanceSave` | Save advance | `createAdvanceInvoiceRecord()` or `updateAdvanceInvoiceRecord()` from `viewInvoiceActions.ts` | DB write, refresh |
| `handleAdvanceDownload` | Download advance PDF | `downloadInvoicePdfDocument()` | PDF download |
| `handleAdvanceDelete` | Delete advance | `deleteAdvanceInvoiceRecord()` from `viewInvoiceActions.ts` | DB write, refresh |
| `openAdvanceDetails` | View/edit advance | Reads advance metadata, sets form state | UI state |
| `openCreateAdvanceSheet` | Create new advance | Resets form to default, opens sheet | UI state |
| `openRevertFlow` | Start revert flow | Closes sheet, opens revert modal | UI state |
| `handleShare` | Share document | `shareDocument()` from shared module | Native share sheet |

### Service-layer functions in `viewInvoiceActions.ts`

| Function | Purpose |
|----------|---------|
| `downloadInvoiceCsvFile()` | Builds + downloads CSV |
| `buildWaybillPrefill()` | Creates waybill prefill state from invoice |
| `voidInvoicePayment()` | Voids payment via `voidPaymentService` |
| `createAdvanceInvoiceRecord()` | Creates advance metadata + audit trail |
| `updateAdvanceInvoiceRecord()` | Updates advance metadata + audit trail |
| `deleteAdvanceInvoiceRecord()` | Clears advance metadata + audit trail |

---

## 7. PDF Download Pipeline

**File:** `src/components/document-view/invoice/invoicePdfActions.ts`

`downloadInvoicePdfDocument()` orchestrates:
1. Parse custom fields and template ID
2. Compute totals via `computeDocument()` (Calculations.ts)
3. Calculate financial state via `calculateInvoiceFinancialState()`
4. Build preview model via `buildInvoicePreviewModel()`
5. Resolve table settings via `interpretPdfTableSettings()`
6. Build reference links from attachments
7. Call `generateInvoicePdf()` with full model

---

## 8. Known Issues / Observations

1. **Advance Invoice Quarantine Guard** (`ViewInvoice.tsx` lines 91–105): Redirects advance child invoices to parent. No test coverage visible.

2. **`isRedirecting` state** (`ViewInvoice.tsx` line 22): Prevents re-triggering the redirect effect. Relies on manual `setIsRedirecting(true)` before navigate.

3. **Status sync in `useInvoiceDetailData`** (`useInvoiceDetailData.js`): `fetchInvoiceFinancials()` performs `setInvoice(current => ({ ...current, status: data.computed_status }))` — this mutates the invoice status from the computed view. Could be unexpected if the DB status differs.

4. **Payment voiding**: After voiding, `syncInvoiceStatus()` is called to update the computed status. This is done via `syncAndGetInvoiceStatus()` service call.

5. **`useInvoiceActions` returns all state and handlers** as a single object. The component destructures specific fields for `InvoiceOverlays` props.

6. **`handleSaveCustomization`** uses `useCallback` with dependencies on `customFields`, `invoice?.id`, `pdfOutput`, `pdfTemplateId`, `refresh`, `setPdfOutput`. The callback writes `custom_fields` JSON string to DB.

7. **No dirty-tracking**: Unlike WaybillForm and CSR Form, ViewInvoice is read-only by design—no unsaved changes warning.

8. **Multiple confirmation dialogs share the same `DocumentConfirmDialog`** component with different configurations (title, description, destructive flag).

9. **InvoiceWorkspace props** include 19 data props and 17 action callbacks directly passed from ViewInvoice.

---

## 9. DB Schema — Invoices Table

**Migration:** `supabase/migrations/20260520090003_invoices.sql`

### invoices
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK DEFAULT gen_random_uuid()` | |
| `invoice_number` | `text NOT NULL` | |
| `client_id` | `uuid NOT NULL DEFAULT gen_random_uuid()` | Always overwritten on insert |
| `client_name` | `text` | Denormalized |
| `issue_date` | `date` | |
| `due_date` | `text` | |
| `status` | `text DEFAULT 'unpaid'` | |
| `subtotal` | `numeric` | |
| `vat` | `numeric` | |
| `wht` | `numeric` | |
| `discount` | `numeric` | |
| `workmanship` | `numeric` | |
| `transportation` | `numeric` | |
| `shipping` | `numeric` | |
| `install_rate_total` | `numeric` | |
| `total` | `numeric` | |
| `notes` | `text` | |
| `terms` | `text` | |
| `payment_terms` | `text` | |
| `document_type` | `text` | |
| `custom_fields` | `text` | JSON string |
| `linked_quote_id` | `uuid DEFAULT gen_random_uuid()` | Always overwritten |
| `linked_csr_id` | `uuid DEFAULT gen_random_uuid()` | Always overwritten |
| `work_duration` | `text` | |
| `amount_in_words` | `text` | |
| `created_at` | `timestamptz DEFAULT now()` | |
| `invoice_title` | `text` | |
| `attachments` | `jsonb DEFAULT '[]'` | |
| `archived_at` | `timestamptz` | |
| `project_id` | `uuid FK → projects(id)` | |
| `po_number` | `text` | |
| `created_by` | `uuid` | |
| `updated_by` | `uuid` | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `scope_type` | `text DEFAULT 'app'` | |

### invoice_items
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `invoice_id` | `uuid` | |
| `description` | `text NOT NULL` | |
| `sub_description` | `text` | |
| `make` | `text` | |
| `quantity` | `numeric` | |
| `unit` | `text` | |
| `unit_price` | `numeric` | |
| `amount` | `numeric` | |
| `vat_rate` | `numeric` | |
| `install_rate` | `numeric` | |
| `sort_order` | `integer` | |
| `row_type` | `text` | "standard" or "group_header" |
| `group_name` | `text` | |
| `image_url` | `text` | |
| `custom_data` | `jsonb DEFAULT '{}'` | |
| `discount_rate` | `numeric DEFAULT 0` | |
| `install_rate_override` | `boolean DEFAULT false` | |
| `group_id` | `text` | |

### payments
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `invoice_id` | `uuid FK → invoices(id)` | |
| `amount` | `numeric NOT NULL` | |
| `date` | `date NOT NULL` | |
| `method` | `text` | |
| `reference` | `text` | |
| `notes` | `text` | |
| `cash_amount` | `numeric NOT NULL DEFAULT 0` | |
| `wht_amount` | `numeric NOT NULL DEFAULT 0` | |
| `voided_at` | `timestamptz` | Null = active |
| `void_reason` | `text` | |
| `bank_account_id` | `uuid` | |

---

## 10. Invoice Types

**File:** `src/domain/invoice/types.ts`

Key interfaces: `Invoice`, `InvoiceItem`, `Payment`, `DbInvoice`, `DbInvoiceItem`, `InvoiceCustomFields`, `InvoicePdfOutput`, `AdvanceConfig`, `CalculationInputs`, `CalculationResult`, `ColumnConfig`, `PdfColumnDefinition`, `ExtraCharge`, `DocumentConversionTrail`, `DocumentTrailLink`.

- `InvoicePdfOutput` has 10 boolean fields controlling PDF rendering (showBankDetails, showFooter, showTagline, showBalanceDue, showAmountInWords, showVatPercentage, showWhtPercentage, showDiscountPercentage, compact, bankAccountId)
- 7 invoice PDF template IDs: `industry`, `ledger`, `crest`, `minimal`, `evergreen`, `bolt`, `ember`
- `AdvanceConfig` has 25+ documented fields including canonical, legacy, and transitional properties
- `InvoiceCustomFields` is a flexible dictionary with optional `calculationInputs`, `pdfOutput`, `pdfTemplateId`, `signatoryId`, `extraCharges`, `groupMeta`, `attachments`, `header`, `additionalFields`, `bottom`, `conversionTrail`, `advance_invoice`, `columnConfig`
