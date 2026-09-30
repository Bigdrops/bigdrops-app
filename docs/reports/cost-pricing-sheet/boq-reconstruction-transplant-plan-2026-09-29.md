# BOQ Reconstruction Transplant Plan — Audit Report

This report was written by Buffy on 2026-09-29 via Freebuff.

Skills used: writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

This report is planning only. It changes no application code, no HTML candidate,
no database object, and no configuration.

---

## 1. Executive summary

- The BOQ form/editor presentation and the BOQ view-page presentation are gone.
  Phase 1 removed them. The list page and all BOQ domain, data, and shared
  infrastructure remain.
- V12 is the approved presentation destination. V12 is a standalone HTML
  prototype. It defines composition and interaction only. V12's own JavaScript
  (a local `rows` array, `data:` URL photos, `localStorage`) is not production
  architecture. Do not port it.
- The reconstruction must inherit five shared production systems, not build
  BOQ-only versions: Column Settings, the Prefix Engine, JSON Import, item
  photo through Cloudinary, and the FAB standard.
- Quotation Column Settings is the reference. It is the shared `ColumnManager`
  sheet over `useInvoiceColumns` and `ColumnConfig`, persisted in
  `custom_fields.columnConfig`. Invoice and Quotation use the same mechanism.
  BOQ currently uses a different and isolated column model
  (`TableDocumentColumn`), which it shares with RFQ. Moving BOQ to the shared
  contract is the largest decision in this plan.
- The V12 "Sub Description" column switch must not survive. In Invoice and
  Quotation, sub-description is a per-item field, not a column. BOQ must match
  that. Section 5.7 gives the resolution.
- Prefix Engine: BOQ already has the shared default prefix, the shared cursor
  helpers, and a generator that calls the shared `nextAutomaticNumber`. Only
  the create flow wiring was lost in the demolition.
- JSON Import: BOQ has no adapter. The shared prompt generator supports only
  `invoice` and `quotation`, and it always emits group rules. The standard
  forbids groups outside Invoice and Quotation. The generator needs a
  group-less path.
- Item photo: production photos use one shared Cloudinary uploader in
  `src/components/invoice/MobileItemCard.tsx`. It stores the Cloudinary
  `secure_url` in the item field `image_url`. V12 uses local data URLs. That is
  presentation-only.
- Schema impact: most capabilities need no migration. BOQ audit coverage needs
  one migration (the activity entity whitelist). Item photo needs none if the
  URL is stored in the existing `boq_rows.cells` jsonb column.
- One latent defect: `src/services/exportFetchers.ts` maps BOQ line items to
  `boq_items`. That table does not exist. The real table is `boq_rows`.

---

## 2. Current BOQ capability inventory

### 2.1 Preserved — BOQ domain and data (rebuild on top of these)

| Path | Role |
| :--- | :--- |
| `src/domain/boq/types.ts` | `Boq`, `DbBoq`, `DbBoqRow` contracts. |
| `src/domain/boq/normalize.ts` | `normalizeDbBoq`, `denormalizeToDbBoq`, `denormalizeToDbBoqRow`, `getNextBoqNumber`. |
| `src/domain/boq/factories.ts` | `createEmptyBoq`. |
| `src/domain/boq/calculateBoqTotals.ts` | `computeBoqTotals`, `computeRowProfit`. Locked BOQ commercial model. |
| `src/pages/view-boq-actions.ts` | `archiveBOQRecord`, `deleteBOQRecord`, `updateBOQStatus`, `duplicateBOQRecord`, `convertBOQToQuotation`. |
| `src/domain/pdf/customization/boq.ts` | `BOQ_CAPABILITIES`, `BOQ_POLICY`, `BOQ_TEMPLATE_DEFAULTS`. |
| `src/domain/table-document/types.ts` | `TableDocumentRow`, `TableDocumentColumn`, `TableColumnKey`. Shared with RFQ. |
| `src/domain/table-document/rows.ts` | `createEmptyTableRow`, `ensureTableRowKeys`. |
| `src/domain/table-document/templateRegistry.ts` | `SHARED_TABLE_TEMPLATES`, `getDefaultColumnsForDocument`. |
| `src/components/table-document/*` | Shared row editor, preview, PDF renderer, column controls. Shared with RFQ. |
| `src/components/boq/BoqList.tsx`, `src/pages/Boqs.tsx` | List page. Uses `ModuleShell`, `DocumentQueryProvider`, `MobileFab`, export dropdown. |
| `src/config/moduleAdapters.ts` (`boqsAdapter`) | List query adapter. |
| `src/tests/critical/boqNormalize.test.js`, `src/tests/critical/documentNumbering.test.js` | Domain tests. |

Database (verified in `supabase/migrations/`):

| Object | Evidence |
| :--- | :--- |
| `boqs` table | `20260520090002_quotations.sql:70`. |
| `boq_rows` table with `cells jsonb` | `20260520090002_quotations.sql:83`. |
| `boqs.boq_number`, `status`, `project_id`, `total`, `issue_date`, `vendor_name`, `vendor_contact`, palette columns, `notes` | `20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql:151`. |
| Tenant cloning and RLS | `20260810080000_letters_boqs_rfqs_structure_clone.sql`, `20260520090002_quotations.sql:195`. |
| Tenant template seed | `20260915194332_tenant_template_seed.sql:651`. |

Two schema facts shape the plan:

- `boqs` has no `client_id` column. It stores `client_name` as text.
- `boq_rows` has no `image_url` column. It has `cells jsonb`.

### 2.2 Removed in the Phase 1 demolition (rebuild as new work)

- Form/editor: `BoqForm.tsx`, `BoqEditor.tsx`, `BoqCustomizationPanel.tsx`,
  `BoqPreview.tsx`, `BoqPdfDocument.tsx`.
- View page: the whole `src/components/document-view/boq/` folder.
- Route pages `NewBoq.tsx`, `EditBoq.tsx`, `ViewBoq.tsx` are now placeholders.
- Dead script `scripts/tmp-d2-render-boq-pdf.ts`.

### 2.3 Absent capabilities that need transplant

| Capability | Current state |
| :--- | :--- |
| Consolidated form page | No `BoqFormPage.tsx`. `NewBoq`/`EditBoq` are placeholders. |
| Standard Column Settings | Uses `TableDocumentColumn` + `TableColumnControls`, not the shared `ColumnManager`. |
| Prefix Engine create wiring | `getNextBoqNumber` exists. The create flow that used `withUniqueRetry` and the auto cursor is gone. |
| JSON Import | No `src/domain/boq/importAdapter.ts`. No import sheet wiring. |
| Item photo / Cloudinary | No item image field. No picker. |
| FAB on the form | None. The list page already has the create FAB. |
| Save orchestration | No BOQ `DocumentSaveStrategy`. No `useBoqSave`. |
| Audit trail | Zero BOQ coverage (see `audit-trail-standard.md` §8). |
| PDF pipeline | The old renderer is gone. Must route through the migration pipeline. |
| View page + customization sheet | Deleted. Must use `DocumentCustomizeCard` inside `DocumentSheet`. |

---

## 3. Approved V12 boundary

File: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v12.html`

### 3.1 What V12 controls

- The full-page form composition: top bar, document details grid, section rails,
  the item identity stack, the data zone, totals, and the save surface.
- The responsive split: phone, large phone, and the 600 px fold recomposition.
- The per-item identity order: Description, Sub Description, Make / Brand, then
  the Photo action.
- The photo interaction concept: empty Photo action, attached thumbnail, remove
  control, phone versus fold placement.
- The column-settings presentation concept and the totals presentation.

### 3.2 What V12 does not control

- Persistence, numbering, import, photo storage, FAB placement, and React
  component architecture.
- Database contracts.
- Business rules. BOQ calculations, CP/SP semantics, quantities, grouping,
  ordering, and totals stay in the domain.

### 3.3 How production React must preserve V12 without copying prototype logic

- Rebuild the V12 composition as React components. Keep the layout, spacing,
  and class intent. Do not copy V12's inline JavaScript.
- Wire all data through domain modules and shared hooks. V12's `rows` array,
  `render()` loop, `toast()`, and `data:` URL photos are prototype fixtures.
- The production photo path is Cloudinary (Section 8), not a data URL.
- Keep presentation components as renderers. They receive prepared data. They
  do not calculate, persist, or number (see `lifecycle-ownership-standard.md`).

---

## 4. Standards applicability matrix

| Standard | Applicability | BOQ area affected | Concrete requirement | Reference implementation |
| :--- | :--- | :--- | :--- | :--- |
| `prefix-engine-settings-standard.md` | Applicable | Numbering | Use `resolvePrefix`, `withUniqueRetry`, the shared cursor, and the 6-digit sequence. No hardcoded prefixes. | `src/domain/prefixConstants.ts`, `src/lib/withUniqueRetry.ts`, `src/pages/NewInvoice.tsx` |
| `fab-standard.md` | Applicable | Floating actions | Create FAB uses `MobileFab`. Save FAB uses `SaveAll`. Download FAB uses `FloatingDownloadButton`. One primary FAB per view. | `src/components/layout/MobileFab.tsx`, `src/components/document-view/shared/FloatingDownloadButton.tsx` |
| `json-import-standard.md` | Applicable | JSON Import | Adapter with `prompts`, Zod `schema`, and `applyResult`. Shared `JsonImportLayout`. No groups for BOQ. | `src/domain/quotation/importAdapter.ts`, `src/components/import/JsonImportLayout.tsx` |
| `document-column-standard.md` | Applicable | Column Settings | Use `useInvoiceColumns` and `resolveFinancialColumns`. Persist `custom_fields.columnConfig`. No custom column type. | `src/components/useInvoiceColumns.tsx`, `src/domain/financial/resolveFinancialColumns.ts`, `src/components/ColumnManager.tsx` |
| `document-image-upload-policy.md` | Applicable | Item photo | Every picker uses `IMAGE_ACCEPT_ATTRIBUTE`, `isSupportedImageFile`, and `getUnsupportedImageErrorMessage`. | `src/lib/documentImageUploadPolicy.ts`, `src/components/invoice/MobileItemCard.tsx` |
| `document-form-consolidation-standard.md` | Applicable | Form architecture | One `BoqFormPage.tsx` with a `mode` prop. `NewBoq`/`EditBoq` become thin delegators. | `src/pages/QuotationFormPage.tsx`, `src/pages/InvoiceFormPage.tsx` |
| `document-save-orchestration.md` | Applicable | Save lifecycle | Implement a BOQ `DocumentSaveStrategy` and a `useBoqSave` hook. No duplicated orchestration. | `src/hooks/useDocumentSave.ts`, `src/hooks/useQuotationSave.ts` |
| `document-transformation-standard.md` | Applicable | Duplicate, convert, revert | Duplicate clears identity and lineage. Revert is blocked for BOQ. Convert sets lineage. | `src/pages/view-boq-actions.ts`, `src/domain/documentConversion.ts` |
| `lifecycle-ownership-standard.md` | Applicable | Ownership | Page coordinates. Domain hydrates, computes, and validates. Form state edits. Components render only. | `src/hooks/useDocumentSave.ts` pattern |
| `pdf-migration-standard.md` | Applicable | PDF output | Route through `DefaultPdfGenerator` + `CompositePdfDelivery` + `DefaultFeedbackBus`. `PdfDocumentType` already includes `boq`. | `src/lib/pdf/DefaultPdfGenerator.ts`, `src/lib/pdf/types.ts` |
| `pdf-customization-extension-standard.md` | Partially applicable | PDF customization | BOQ metadata exists. It lacks the required `bridgeToDesignPreset` function. | `src/domain/pdf/customization/boq.ts`, `src/domain/pdf/customization/csr.ts` |
| `audit-trail-standard.md` | Partially applicable | Audit | BOQ has zero coverage. Adding entity type `boq` needs a migration. | `src/lib/audit.ts`, `supabase/migrations/20260520089999_audit_activity_bootstrap.sql:93` |
| `receipt-standard.md` | Not applicable | — | Payment receipts only. | — |
| `docs-commit-workflow-standard.md` | Not applicable | — | Commit and push pipeline. | — |
| `Commercial Party Architecture Standard.md` | Not applicable | — | The file is empty (0 lines). Not authoritative. | — |

Standards read for this audit: all 15 files in `docs/standard/`.
`Commercial Party Architecture Standard.md` is empty, so this audit does not
treat it as authoritative.

---

## 5. Quotation Column Settings audit

### 5.1 Surface

The Column Settings surface is one shared bottom sheet: `ColumnManager`
(`src/components/ColumnManager.tsx`). It is mounted by
`src/components/document/SharedDocumentForm.tsx`. Invoice and Quotation both
use it. Quotation Form Page calls `useInvoiceColumns` at
`src/pages/QuotationFormPage.tsx:137`. Invoice Form Page does the same at
`src/pages/InvoiceFormPage.tsx:187`.

Invoice and Quotation share the same mechanism. The meaningful differences
between the two documents are in the save strategy (`useInvoiceSave.ts` versus
`useQuotationSave.ts`) and the import adapter. They are not in Column Settings.

### 5.2 Exact options

The sheet renders these sections:

| Section | Options |
| :--- | :--- |
| Description | Fixed at index 0. Label is editable. Not removable. No visibility switch. |
| Columns | One row per column with drag handle, up/down buttons, editable label, a `Num`/`Text` badge, a visibility switch, and, for total-affecting columns, a "remove from totals" toggle. |
| Add Custom Column | Creates a `custom_*` column. Removable. |
| Reset to defaults | Confirm dialog. Restores canonical order and labels. Keeps items. |
| Row Overrides | Present only when `onResetItemOverrides` is passed. Lists per-item VAT, Discount, and Install overrides. |

Built-in columns and defaults (`src/domain/invoice/columns.ts`):

| Key | Label | Default |
| :--- | :--- | :--- |
| `description` | Description | show, locked first |
| `quantity` | Quantity | show |
| `make` | Make | show |
| `unit` | Unit | show |
| `unit_price` | Unit Price | show |
| `amount` | Amount | show |
| `install_rate` | Install Rate | `hide_display`, total-affecting, has a `formula` multiplier |
| `vat_rate` | VAT Rate | `hide_display` |
| `discount_rate` | Discount Rate | `hide_display` |

Visibility modes: `show`, `hide_display` (hidden from PDF and view only), and
`hide_full` (removed from all contexts, kept in the database for restore).

### 5.3 State and persistence

- State lives in `useInvoiceColumns` (`src/components/useInvoiceColumns.tsx`).
  The hook owns `columns`, `isVisible`, `getColumn`, `toggleVisible`,
  `toggleDisabled`, `updateColumn`, `addCustomColumn`, `removeCustomColumn`,
  `resetColumns`, and `moveColumn`.
- `description` is locked. `moveColumn` refuses to move it and clamps target
  index 0 to 1.
- Persistence contract: the `ColumnConfig[]` array is stored in the document's
  `custom_fields.columnConfig` JSONB field (`document-column-standard.md` §10).
- Hydration entry point: `resolveFinancialColumns`
  (`src/domain/financial/resolveFinancialColumns.ts`). It enforces order
  integrity and fills in missing built-ins.

### 5.4 Document-specific exceptions

- Total-affecting keys drive the "Num" badge and the totals toggle:
  `quantity, unit_price, amount, install_rate, vat_rate, discount_rate`.
- `install_rate` has a `formula` multiplier field. No other column does.
- Row Overrides exist only for VAT, Discount, and Install. They come from the
  caller, not from the column list.

### 5.5 BOQ mapping

BOQ must inherit the Column Settings mechanism, not a BOQ-only column model.
The current BOQ model (`TableDocumentColumn` with keys `description`,
`specification`, `unit`, `quantity`, `make_brand`, `cp`, `sp`) is a different
system. It is shared with RFQ. The plan is:

1. Adopt `ColumnConfig` for BOQ.
2. Use `useInvoiceColumns` and `ColumnManager`.
3. Persist the array in `boqs.custom_fields.columnConfig`.
4. Resolve through `resolveFinancialColumns` on load.

BOQ-specific mapping:

| Quotation column | BOQ treatment |
| :--- | :--- |
| `description` | Keep. Fixed first, locked. |
| `quantity` | Keep. |
| `unit` | Keep. |
| `make` | Keep. Maps to the current BOQ `make_brand` field. |
| `unit_price` | BOQ-specific exception. BOQ uses `cp` (cost price) and `sp` (selling price). |
| `amount` | BOQ-specific exception. BOQ amount derives from `cp × qty` and `sp × qty`. |
| `install_rate`, `vat_rate`, `discount_rate` | Not applicable. BOQ has no VAT, discount, or WHT (`src/domain/boq/calculateBoqTotals.ts`). Do not expose them. |
| `specification` (Sub Description) | Remove from Column Settings. See 5.7. |

This is a real adaptation, not a copy. `src/domain/invoice/columns.ts` is
coupled to invoice keys in `itemHasVisibleValue` and `getPdfCellValue`. BOQ
needs its own built-in column definitions and its own item-value and PDF-cell
mapping, while reusing the hook, the sheet, and the persistence contract.

### 5.6 Explicit resolution of the Sub Description switch

V12 exposes a "Sub Description" switch in its column concept. This must not
remain a BOQ-specific column visibility option.

Evidence: in Invoice and Quotation, sub-description is an item field, not a
column. `InvoiceItem.sub_description` exists
(`src/domain/invoice/types.ts:169`). The item card renders a per-item
"Sub-desc" toggle (`src/components/invoice/MobileItemCard.tsx`). No
`sub_description` entry exists in `BUILTIN_COLUMNS` or `DEFAULT_COLUMN_ORDER`.

Resolution: BOQ's `specification` (Sub Description) leaves the column list. It
becomes a per-item field in the BOQ item card, exactly as in Quotation. The V12
Sub Description row stays as item composition, not as a column setting.

---

## 6. Prefix Engine audit and BOQ transplant plan

### 6.1 Existing shared architecture

| File | Role |
| :--- | :--- |
| `src/domain/prefixConstants.ts` | `DEFAULT_PREFIXES` (BOQ key exists), `resolvePrefix`, `DOCUMENT_SERIAL_WIDTH = 6`, `formatDocumentNumber`, `parseTrailingSequence`, `AUTO_CURSOR_KEY`, `readAutoCursor`, `mergeAutoCursor`, `clearAutoCursors`, `cursorFamiliesForPrefixKey`, `mergePrefixUpdate`, `resetPrefixUpdate`, `resetAllPrefixesUpdate`, `findFreeSequence`, `nextAutomaticNumber`. |
| `src/domain/documentNumbering.ts` | `fetchAutoCursor`, `advanceAutoCursor`. Persists cursors in `settings.document_prefixes.__auto_seq`. |
| `src/lib/withUniqueRetry.ts` | Collision retry for unique constraint `23505`. |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | Settings UI and previews. |

The cursor lives in `settings.document_prefixes.__auto_seq`. The standard
confirms this needs no schema migration.

### 6.2 Reference integrations

| Document | File |
| :--- | :--- |
| Invoice | `src/pages/NewInvoice.tsx` |
| Quotation | `src/components/quotation/QuotationForm.tsx` |
| Waybill | `src/domain/waybill/waybillMutations.ts` |
| RFQ | `src/pages/NewRfq.tsx` |
| CSR | `src/pages/NewCSR.tsx` |
| Project | `src/domain/projects.ts` (built-in retry, do not double-wrap) |

### 6.3 Existing BOQ numbering pieces

- `DEFAULT_PREFIXES.boq = 'BOQ'` (`src/domain/prefixConstants.ts`).
- `getNextBoqNumber(rows, prefix = 'BOQ', cursor?)`
  (`src/domain/boq/normalize.ts`). It already calls the shared
  `nextAutomaticNumber` with a 6-digit family.
- `duplicateBOQRecord` and `convertBOQToQuotation`
  (`src/pages/view-boq-actions.ts`) already use `resolvePrefix`,
  `fetchAutoCursor`, `advanceAutoCursor`, and `parseTrailingSequence`.

So BOQ is already on the shared engine for numbering. Only the create flow
wiring was removed with `NewBoq.tsx`.

### 6.4 Required future wiring and behaviour

Create flow (in `BoqFormPage.tsx` or a `useBoqSave` strategy):

1. Resolve the prefix: `resolvePrefix(settings?.document_prefixes, 'boq')`.
2. Family: `${prefix}-`.
3. Manual identity: only an explicitly typed value is manual. An untouched
   pre-field is automatic. Compare against the last auto-filled value.
4. Automatic candidate: `getNextBoqNumber(rows, prefix, cursor)`.
5. Insert inside `withUniqueRetry`.
6. Advance the cursor only on automatic success
   (`advanceAutoCursor(tenantClient, family, seq)`).

Behaviour contract:

| Concern | Required behaviour |
| :--- | :--- |
| Automatic numbering | Shared cursor plus skip-scan. |
| Manual numbering | Attempted exactly as typed. Never advances the cursor. |
| Cursor | Monotonic. Best-effort. A failed bump does not fail creation. |
| Occupied skipping | `nextAutomaticNumber` skips occupied identifiers. |
| Preview | Handled by the shared settings preview. |
| Create | Candidate from `getNextBoqNumber` inside `withUniqueRetry`. |
| Edit | Number is immutable. No retry. |
| Duplicate | New number from `getNextBoqNumber`. Identity cleared. Already implemented in `duplicateBOQRecord`. |
| Settings | Already present. BOQ is in `DEFAULT_PREFIXES`. |
| Persistence | `settings.document_prefixes.__auto_seq`. No migration. |

Do not add BOQ-only numbering logic. `getNextBoqNumber` stays thin: it delegates
to `nextAutomaticNumber`.

### 6.5 Files expected to change during implementation

- `src/pages/BoqFormPage.tsx` (create) — new.
- `src/hooks/useBoqSave.ts` — new. Owns `persist` numbering.
- `src/pages/NewBoq.tsx`, `src/pages/EditBoq.tsx` — thin delegators.
- `src/domain/boq/normalize.ts` — keep `getNextBoqNumber`. No change needed.

---

## 7. JSON Import audit and BOQ transplant plan

### 7.1 Shared infrastructure

| Path | Role |
| :--- | :--- |
| `src/components/import/JsonImportLayout.tsx` | Mandatory sheet wrapper. Provides prompt copy, "Open in AI", paste, preview, save. |
| `src/domain/import/promptGenerator.ts` | `JSON_IMPORT_DISCIPLINE_SPEC` and `generateImportPrompt`. |
| `src/domain/import/types.ts` | `ImportMode`, `ImportFieldKey`, `ApplyImportResult`, `ResolvedImportData`, and related types. |
| `src/domain/import/normalize.ts` | Extracts unknown keys into column candidates. |
| `src/domain/import/resolve.ts` | Builds `ColumnConfig` objects and enforces the 10-column limit. |
| `src/domain/import/apply.ts` | Builds the final items and columns. |
| `src/domain/import/overwrite.ts` | `detectOverwriteTargets`. |
| `src/domain/import/validate.ts`, `utils.ts`, `parse.ts`, `schema.ts`, `tableState.ts` | Validation and helpers. |
| `src/components/document/SharedDocumentForm.tsx` | Receives `importAdapter` and renders the import sheet. |

### 7.2 Standard contract

Each import-capable module needs `src/domain/<module>/importAdapter.ts` with:

- `prompts(columns, mode, currentItemCount)` — includes the discipline block.
- `schema` — a strict Zod schema.
- `applyResult(parsed, formState)` — returns a new state.

Groups are an Invoice and Quotation concern only. A non-group module must state
"Do not create groups" in its prompt. Column creation happens only in the
import pipeline. Schema is frozen after import.

### 7.3 Reference implementations

| Module | Path | Notes |
| :--- | :--- | :--- |
| Quotation | `src/domain/quotation/importAdapter.ts` | Conforming adapter. It supports groups. |
| Invoice | `src/domain/invoice/importAdapter.ts` | Conforming adapter. It supports groups. |
| RFQ | `src/domain/rfq/importAdapter.ts`, `src/components/rfq/RfqImportSheet.tsx` | Non-group example. Prompt says "Do not create groups." It does not use Zod or the standard adapter shape. Treat it as a non-group reference only. |
| CSR | `src/components/csr/CsrImportSheet.tsx` | Additional non-group UI reference. |

### 7.4 BOQ mapping and the groups conflict

BOQ has no adapter. Two shared constraints collide with BOQ's data model:

1. `generateImportPrompt` accepts only `'invoice' | 'quotation'` and always
   emits group rules in `Add` mode.
2. The standard forbids groups outside Invoice and Quotation.

The BOQ document model has sections (`row_type: 'section'`). Section 7 rules
resolve this: BOQ import must not create groups or sections. The BOQ prompt must
state "Do not create groups." Sections are added manually in the form.

The shared `generateImportPrompt` must gain a group-less mode, or BOQ must build
a group-less prompt that reuses `JSON_IMPORT_DISCIPLINE_SPEC`. Both reuse shared
infrastructure. Do not create a BOQ-only import stack.

### 7.5 BOQ field mapping

`ImportFieldKey` is invoice-shaped. It lists `description`, `sub_description`,
`quantity`, `unit`, `unit_price`, `make`, `row_number`, `temp_ref`, `group_id`.
BOQ's commercial fields are `cp` and `sp`. They are not in the base set.

Options:

- Map `cp` and `sp` to custom fields. They then become custom columns. This
  conflicts with BOQ's need for first-class cost and selling columns.
- Extend the shared field set for BOQ commercial fields. Keep the group-less
  prompt and the frozen-schema rule.

The second option keeps CP/SP first-class. It is an extension of shared
infrastructure, not a BOQ-only stack. The exact choice is a decision (Section 15).

### 7.6 Validation and failure behaviour

- Schemas must be strict Zod. Manual `typeof` checks are prohibited.
- Missing values are null. No inference.
- Update mode requires `row_number` in range, rejects duplicates, and shows the
  empty-field retention warning.
- Overwrite confirmation uses `detectOverwriteTargets`.
- The import pipeline alone creates columns.

### 7.7 Future integration points

- New: `src/domain/boq/importAdapter.ts`.
- New: a BOQ import sheet that renders `JsonImportLayout` with the adapter
  props. Follow `src/components/rfq/RfqImportSheet.tsx` for wiring and
  `src/domain/quotation/importAdapter.ts` for the adapter shape.
- Modified: `src/domain/import/promptGenerator.ts` — add a group-less mode.
- Modified: `src/domain/import/types.ts` — extend the field set if CP/SP become
  first-class.
- Modified: `src/components/document/SharedDocumentForm.tsx` is already generic.
  Pass the BOQ adapter from `BoqFormPage`.

---

## 8. Item photo + Cloudinary audit

### 8.1 Invoice implementation

The uploader lives in one shared card:
`src/components/invoice/MobileItemCard.tsx`.

- `CLOUD_NAME = 'ddhqvv77g'`, `UPLOAD_PRESET = 'ml_default'` (lines 28–29).
- `handleImageUpload` (line 295) validates with `isSupportedImageFile`, posts
  `FormData(file, upload_preset)` to
  `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, and stores
  `data.secure_url` in the item field `image_url`.
- The preview is a 20×20 thumbnail (`h-20 w-20`) with a remove button that sets
  `image_url` to null.
- The empty state is a compact "Photo" chip with the `Camera` icon.

### 8.2 Quotation implementation

Quotation uses the same `MobileItemCard`. Consumers:
`src/components/document/FormLineItems.tsx`,
`src/components/document/SortableLineItem.tsx`, and
`src/components/invoice/MobileGroupCard.tsx`. There is no separate Quotation
uploader. Invoice and Quotation photo behaviour is identical.

### 8.3 Shared Cloudinary infrastructure

There is no separate Cloudinary service module. The upload is inline in
`MobileItemCard.tsx`. The shared validation utility is
`src/lib/documentImageUploadPolicy.ts` (`IMAGE_ACCEPT_ATTRIBUTE`,
`isSupportedImageFile`, `getUnsupportedImageErrorMessage`,
`partitionImageFiles`).

### 8.4 Data contract and lifecycle

| Stage | Contract |
| :--- | :--- |
| Select | Hidden `<input type="file" accept={IMAGE_ACCEPT_ATTRIBUTE}>` plus validation. |
| Prepare | No client-side resize in this path. Cloudinary receives the original file. |
| Upload | Unsigned preset `ml_default` to `api.cloudinary.com`. |
| Reference | The Cloudinary `secure_url` string. |
| Item state | `InvoiceItem.image_url` (`src/domain/invoice/types.ts:182`). |
| Persistence | `invoice_items.image_url` and `quotation_items.image_url` columns (`20260520090003_invoices.sql:66`, `20260520090002_quotations.sql:59`). |
| Hydration | `normalizeDbBoq`-style row mapping keeps the field. Shared guard: `resolveCanonicalItemImageUrl` in `src/domain/documentMedia.ts`. It rejects temporary URLs (`blob:`, `file:`, `content:`, `capacitor://`, `filesystem:`). |
| Render | `<img src={item.image_url}>` in the item card and in PDF/item render types. |
| Replace | Selecting a new file overwrites `image_url`. |
| Remove | Sets `image_url` to null. |
| Cleanup | No Cloudinary delete call exists. Removed assets stay in Cloudinary. |
| Save failure | The upload happens before save. A failed save leaves an orphaned Cloudinary asset. |
| Upload failure | `feedback.error('Upload failed', ...)`. The item keeps its previous value. |
| Duplicate | Duplication copies the row, so it copies `image_url`. This matches the transformation standard (attachments preserved per system rules). |
| Convert | Conversion maps items to the target document. Photo handling depends on the target field. |
| Preview / PDF | The image URL flows into the render types (`src/domain/invoice/renderTypes.ts`). |

Security note: the Cloudinary preset is unsigned and the cloud name is in the
client bundle. Uploads are open. This is the existing project pattern. BOQ
inherits it. Per-tenant isolation is at the database row level, not at the
Cloudinary account level.

### 8.5 Responsibility split (required by the task)

| Layer | Responsibility |
| :--- | :--- |
| V12 presentation | Placement, empty action, thumbnail, remove control, phone/fold behaviour. |
| Shared photo upload | The picker interaction, validation, and item state update. |
| Cloudinary | File hosting and delivery. Returns `secure_url`. |
| Persistence / domain | Stores the URL on the item row and hydrates it back. |

### 8.6 BOQ mapping

- BOQ must use the same Cloudinary upload path and the same validation utility.
- BOQ must not use V12's `data:` URL state.
- `TableDocumentRow` has no `image_url` field. Two options:
  - Store the URL in `boq_rows.cells` JSONB (no migration). Extend the typed
    row contract and `normalizeDbBoq`/`denormalizeToDbBoqRow`.
  - Add an `image_url` column to `boq_rows` (migration).
- Read the URL back through `resolveCanonicalItemImageUrl` for consistency.
- Recommended: the `cells` JSONB option. It matches the existing
  `denormalizeToDbBoqRow` pattern, which already packs `specification`,
  `make_brand`, `cp`, and `sp` into `cells`.

---

## 9. FAB audit

Standard requirements (`fab-standard.md`):

- One container: 50×50 px, `rounded-[18px]`, `bg-bd-button-primary-bg`.
- Create: `Plus` via `MobileFab`.
- Save: `SaveAll`.
- Download: the inline `DownloadIcon` in `FloatingDownloadButton`.
- One primary FAB per view.

Existing implementations:

| FAB | File |
| :--- | :--- |
| Create | `src/components/layout/MobileFab.tsx` |
| Save | `src/components/document/FormFooter.tsx`, `src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx`, `src/components/csr/CsrFormScreen.tsx` |
| Download | `src/components/document-view/shared/FloatingDownloadButton.tsx` |

BOQ status and required behaviour:

- List page: already compliant. `src/components/boq/BoqList.tsx` uses
  `MobileFab` for "Create BOQ".
- Form page: needs a Save FAB (`SaveAll`) on mobile, matching the other
  document forms. Do not invent a BOQ-specific floating action.
- View page: needs the shared download FAB (`FloatingDownloadButton`) when the
  view page is rebuilt.
- Do not add a second primary FAB to any BOQ view.

Minor note: the standard says the create FAB sits at
`bottom: calc(82px + safe-area)`. `MobileFab` uses `bottom-[94px]`. The shared
component is the working authority. BOQ should keep using it.

---

## 10. Shared-infrastructure reuse map

| Capability | Classification | Basis |
| :--- | :--- | :--- |
| Prefix resolution | Direct reuse | `resolvePrefix` already supports `boq`. |
| Auto cursor | Direct reuse | `fetchAutoCursor`, `advanceAutoCursor`. |
| Collision retry | Direct reuse | `withUniqueRetry`. |
| BOQ number generator | Preserve existing | `getNextBoqNumber` already delegates to `nextAutomaticNumber`. |
| Column Settings hook | Direct reuse | `useInvoiceColumns` is generic over `ColumnConfig`. |
| Column Settings sheet | Direct reuse | `ColumnManager`. |
| Column definitions | Thin BOQ adapter | BOQ needs its own built-in column keys (`cp`, `sp`). |
| Column persistence | Direct reuse | `custom_fields.columnConfig`. |
| Financial column resolver | Thin BOQ adapter | `resolveFinancialColumns` is invoice-key coupled in value mapping. |
| JSON import UI | Direct reuse | `JsonImportLayout`. |
| Import pipeline | Direct reuse | `normalize`, `resolve`, `apply`, `overwrite`. |
| Import prompt generator | Thin shared extension | Add a group-less mode. |
| BOQ import adapter | BOQ-specific implementation required | No adapter exists. |
| Photo validation | Direct reuse | `documentImageUploadPolicy`. |
| Photo upload | Thin BOQ adapter | Reuse the Cloudinary call; wire it into the BOQ item card. |
| Media URL hydration | Direct reuse | `resolveCanonicalItemImageUrl`. |
| Save orchestration | Thin BOQ adapter | New `useBoqSave` strategy. |
| Transform (duplicate, convert) | Preserve existing | `view-boq-actions.ts`. |
| PDF pipeline | Thin BOQ adapter | Route through the shared pipeline. |
| PDF customization metadata | Preserve existing; small addition | `boq.ts` needs `bridgeToDesignPreset`. |
| PDF renderer | Decision required | Reuse `TableDocumentPdfDocument` or build a BOQ-specific renderer. |
| FAB | Direct reuse | `MobileFab`, `FloatingDownloadButton`. |
| List page and query adapter | Preserve existing | `BoqList.tsx`, `boqsAdapter`. |
| Audit trail | BOQ-specific implementation required | Needs a migration and event wiring. |
| Export | Preserve existing; fix defect | `boq_items` table name is wrong (Section 11). |
| Table-document row model | Decision required | Shared with RFQ. Changing columns affects RFQ. |

---

## 11. Data and schema impact assessment

Evidence basis: `supabase/migrations/20260520090002_quotations.sql`,
`20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql`,
`20260520090003_invoices.sql`, `20260520089999_audit_activity_bootstrap.sql`.

| Capability | Schema change needed? | Evidence |
| :--- | :--- | :--- |
| Prefix Engine | No | Cursor lives in `settings.document_prefixes.__auto_seq`. `boqs.boq_number` exists. |
| Column Settings | No | `boqs.custom_fields` is JSONB. Store `columnConfig` there. |
| JSON Import | No | Import writes items and `custom_fields`. No new column. |
| Item photo | No, if stored in `boq_rows.cells` JSONB | `boq_rows.cells jsonb` exists. `invoice_items.image_url` and `quotation_items.image_url` are real columns, but BOQ's child table already has a JSONB cell bag. |
| Item photo (alternative) | Yes, if a real column is required | `boq_rows` has no `image_url` column. A migration would be required. |
| `client_id` on BOQ | Decision | `boqs` stores `client_name` text, not `client_id`. The transformation standard names `client_id` as identity. BOQ has no client FK today. |
| Audit trail | Yes | `record_activity_event` rejects entity types outside `('invoice','quotation','project')` (`20260520089999_audit_activity_bootstrap.sql:93`). Adding `boq` needs a migration. |
| Export line items | No migration; code fix | `src/services/exportFetchers.ts` maps `BOQS` items to `boq_items`. No `boq_items` table exists. The real table is `boq_rows`. |

Summary: the plan needs at most two migrations, and both are optional to the
core reconstruction:

1. Audit coverage (`entity_type` whitelist).
2. Item photo as a real column (only if the `cells` JSONB option is rejected).

No migration is needed for numbering, columns, or import.

---

## 12. Future implementation file map

### 12.1 Files to create

| Path | Purpose |
| :--- | :--- |
| `src/pages/BoqFormPage.tsx` | Single form page with a `mode` prop. Rebuilds the V12 composition. |
| `src/hooks/useBoqSave.ts` | BOQ `DocumentSaveStrategy` over `useDocumentSave`. |
| `src/domain/boq/importAdapter.ts` | Import adapter with prompt, Zod schema, and `applyResult`. |
| `src/domain/boq/columns.ts` | BOQ built-in `ColumnConfig` set (`cp`, `sp`, group-less). |
| `src/components/boq/BoqColumnSettingsSheet.tsx` (or reuse `ColumnManager` directly from the form) | Column Settings wiring for BOQ. |
| `src/components/boq/BoqItemCard.tsx` | BOQ item card with the V12 composition and the shared photo picker. |
| `src/components/boq/BoqImportSheet.tsx` | `JsonImportLayout` wrapper for BOQ. |
| `src/components/boq/BoqPreview.tsx` (rebuilt) | Preview panel for the form and view. |
| `src/components/document-view/boq/*` (rebuilt) | View-page presentation. |

### 12.2 Files to modify

| Path | Change |
| :--- | :--- |
| `src/pages/NewBoq.tsx` | Thin delegator to `BoqFormPage mode="create"`. |
| `src/pages/EditBoq.tsx` | Thin delegator to `BoqFormPage mode="edit"`. |
| `src/pages/ViewBoq.tsx` | Rebuild the view page. |
| `src/domain/table-document/types.ts` | Add the item image field if the `cells` JSONB option is chosen. |
| `src/domain/table-document/templateRegistry.ts` | Only if the BOQ column registry changes. |
| `src/domain/boq/normalize.ts` | Map the new image field. |
| `src/domain/boq/types.ts` | Add the image field to the row type. |
| `src/domain/pdf/customization/boq.ts` | Add `bridgeToDesignPreset`. |
| `src/domain/import/promptGenerator.ts` | Add a group-less mode. |
| `src/domain/import/types.ts` | Extend the field set if CP/SP become first-class. |
| `src/components/app/AppShell.tsx` | No route change. Lazy imports already exist. |
| `src/services/exportFetchers.ts` | Fix `BOQS` item table from `boq_items` to `boq_rows`. |

### 12.3 Shared files that must stay untouched

- `src/components/ColumnManager.tsx` — shared by Invoice and Quotation.
- `src/components/useInvoiceColumns.tsx` — shared.
- `src/domain/financial/resolveFinancialColumns.ts` — shared.
- `src/components/import/JsonImportLayout.tsx` — shared.
- `src/lib/documentImageUploadPolicy.ts` — shared.
- `src/components/invoice/MobileItemCard.tsx` — shared by Invoice and Quotation.
- `src/lib/withUniqueRetry.ts`, `src/domain/prefixConstants.ts`,
  `src/domain/documentNumbering.ts` — shared.
- `src/lib/pdf/*` — shared pipeline.
- `supabase/migrations/*` — no edits; add new migrations only.

### 12.4 Files requiring a decision before implementation

- `src/components/table-document/*` — shared with RFQ. Changing the BOQ column
  model may affect RFQ.
- `src/components/table-document/TableDocumentPdfDocument.tsx` — reuse for BOQ
  PDF, or build a BOQ-specific renderer.
- `src/domain/invoice/columns.ts` — extend for BOQ, or create
  `src/domain/boq/columns.ts`.

---

## 13. Ordered transplant sequence

Order to minimize regression risk. Each step is independently verifiable.

1. Form shell from V12. Create `BoqFormPage.tsx` and rebuild the V12
   composition with static and local state. Keep `NewBoq`/`EditBoq` as thin
   delegators. Verify: the form renders on phone, large phone, and fold.
2. Persistence first. Add `useBoqSave` and wire load/save. Verify: create,
   reload, and edit round-trip through `boqs` and `boq_rows`.
3. Prefix Engine. Wire numbering in the create path
   (`resolvePrefix`, `getNextBoqNumber`, `withUniqueRetry`, cursor). Verify:
   automatic and manual numbers, skip behaviour, and cursor advance.
4. Standard Column Settings. Switch BOQ to `ColumnConfig` with
   `useInvoiceColumns` and `ColumnManager`. Persist in
   `custom_fields.columnConfig`. Remove the Sub Description column switch.
   Verify: order, visibility, custom columns, and reset.
5. Item photo. Add the item image field and reuse the Cloudinary path plus the
   image policy utility. Verify: select, thumbnail, remove, replace, and
   multi-item independence.
6. JSON Import. Add the adapter, the group-less prompt, and the import sheet.
   Verify: add and update modes, null handling, and overwrite confirmation.
7. FAB. Add the Save FAB on the form. Verify: one primary FAB per view.
8. View page and PDF. Rebuild the view page. Route PDF through the shared
   pipeline. Verify: download, preview, and filename pattern
   `{prefix}-{documentNumber}.pdf`.
9. Customization. Wire `DocumentCustomizeCard` in `DocumentSheet`. Add
   `bridgeToDesignPreset` to `boq.ts`. Verify: document font applies.
10. Audit and export. Add the audit migration and event wiring. Fix the export
    `boq_items` defect. Verify: events recorded; export returns line items.

Rationale: persistence and numbering come before column settings, because
column persistence uses the same save path. Photo and import depend on the item
model. View and PDF come last, because they read a stable document.

---

## 14. Dependency and risk register

| Risk | Coupling | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Numbering regression | Create path versus shared cursor | Duplicate or skipped numbers | Reuse `withUniqueRetry` and `advanceAutoCursor`. Never write a BOQ-only generator. |
| Column model change | `table-document` is shared with RFQ | RFQ regression | Create BOQ columns in `src/domain/boq/`. Do not edit the RFQ contract. |
| Import groups | Shared generator always emits groups | Non-conforming BOQ prompt | Add a group-less mode. State "Do not create groups." |
| CP/SP not in the import field set | `ImportFieldKey` is invoice-shaped | CP/SP become custom columns | Extend the shared field set, or map deliberately. Decide before import work. |
| Item identity | Row `id` versus `_uiKey` | Photo state or hydration loss | Keep one image field per row. Reuse `ensureTableRowKeys`. |
| Sections | BOQ rows include `row_type: 'section'` | Import creates groups | Keep sections manual. Import is flat. |
| Photo persistence | `boq_rows` has no `image_url` | Migration or JSONB spread | Store in `cells` JSONB. Extend the typed row. |
| Duplication and conversion | `view-boq-actions.ts` | Photo or lineage loss | Duplicate copies items and photos. Convert sets lineage. Follow the transformation standard. |
| Preview and PDF | Shared pipeline versus legacy `downloadPdf.tsx` | Mixed download paths | Use `DefaultPdfGenerator` + `CompositePdfDelivery`. |
| PDF customization | `boq.ts` lacks `bridgeToDesignPreset` | Customization does not apply | Add the bridge function. |
| Responsive V12 composition | New React layout | Overflow or collisions | Preserve V12's three breakpoints (`430px`, `600px`). |
| Shared infrastructure edits | `ColumnManager`, `useInvoiceColumns` | Invoice and Quotation regression | Prefer extension over change. Keep shared files untouched. |
| Audit entity whitelist | Migration needed | Runtime rejection of BOQ events | Add `boq` to the whitelist in a new migration before wiring events. |
| Export defect | `boq_items` does not exist | BOQ export returns no line items | Point the fetcher at `boq_rows`. |
| Client identity | `boqs` has no `client_id` | Identity checks differ from other documents | Decide whether to add `client_id` or keep `client_name`. |

---

## 15. Unresolved questions

Only questions that repository evidence cannot settle.

1. Should BOQ item photos persist in `boq_rows.cells` JSONB (no migration), or
   in a new `image_url` column (migration)? Evidence supports both.
2. Should BOQ leave the shared `table-document` column model and adopt the
   Invoice/Quotation `ColumnConfig` model? The change also touches RFQ's shared
   files.
3. Which BOQ built-in columns form the final set under the shared contract?
   Quotation's VAT, discount, and install columns do not apply to BOQ.
4. Should `cp` and `sp` become first-class import fields, or custom fields?
5. Should BOQ join audit coverage now (with a migration), or stay deferred per
   `audit-trail-standard.md` §8?
6. Should BOQ PDF reuse `TableDocumentPdfDocument.tsx`, or get a BOQ-specific
   renderer that matches the V12 composition?
7. Does BOQ need a `client_id` foreign key, or does `client_name` remain the
   party field? The transformation standard names `client_id` as identity.

---

## 16. Implementation acceptance checklist

The later implementation task is complete when all of these hold.

Form and persistence:

- [ ] `BoqFormPage.tsx` exists with a `mode: 'create' | 'edit'` prop.
- [ ] `NewBoq.tsx` and `EditBoq.tsx` are thin delegators with no orchestration.
- [ ] The form matches the approved V12 composition on phone, large phone, and fold.
- [ ] No V12 prototype JavaScript is present in production code.
- [ ] Save uses a BOQ `DocumentSaveStrategy` and `useDocumentSave`.

Column Settings:

- [ ] BOQ uses `useInvoiceColumns` and `ColumnManager`.
- [ ] Columns persist in `custom_fields.columnConfig` as `ColumnConfig[]`.
- [ ] `description` is fixed first and not movable.
- [ ] The Sub Description column switch is gone.
- [ ] Sub Description renders as a per-item field.
- [ ] No BOQ-only column type or column hook exists.

Prefix Engine:

- [ ] Create uses `resolvePrefix`, `getNextBoqNumber`, `withUniqueRetry`, and the cursor.
- [ ] Manual numbers never advance the cursor.
- [ ] Automatic numbers skip occupied identifiers.
- [ ] Edit does not retry, and the number is immutable.
- [ ] Duplicate generates a new number and clears identity.
- [ ] No BOQ-only numbering logic exists.

JSON Import:

- [ ] `src/domain/boq/importAdapter.ts` exists with `prompts`, a Zod `schema`, and `applyResult`.
- [ ] The prompt includes the shared discipline block.
- [ ] The prompt states "Do not create groups."
- [ ] Import does not create groups or sections.
- [ ] The sheet uses `JsonImportLayout`.
- [ ] Update mode validates `row_number` and uses `detectOverwriteTargets`.
- [ ] Columns are created only by the import pipeline.

Item photo:

- [ ] The picker uses `IMAGE_ACCEPT_ATTRIBUTE` and `isSupportedImageFile`.
- [ ] Uploads use the Cloudinary path, not a data URL.
- [ ] The stored value is the Cloudinary `secure_url`.
- [ ] Each item keeps independent photo state.
- [ ] Remove sets the field to null.
- [ ] Reload and edit hydrate the stored photo.
- [ ] Upload failure and save failure show feedback.

FAB:

- [ ] The list page keeps the `MobileFab` create action.
- [ ] The form page has one primary Save FAB using `SaveAll`.
- [ ] The view page uses `FloatingDownloadButton`.
- [ ] No BOQ-specific FAB icon or shape exists.

Standards and safety:

- [ ] BOQ revert stays blocked.
- [ ] Duplicate clears client, number, and lineage; it preserves items and columns.
- [ ] Convert sets lineage on the target document.
- [ ] PDF routes through the shared pipeline.
- [ ] `boq.ts` exports `bridgeToDesignPreset`.
- [ ] No financial calculation is duplicated. `src/lib/Calculations.ts` remains the source of truth.
- [ ] No shared file is changed without a recorded reason.
- [ ] The export fetcher uses `boq_rows`, not `boq_items`.
- [ ] Any schema change ships with a migration and a successful `supabase db push`.

---

## Verification

- `git status` before this task: recorded. Pre-existing changes were present
  from earlier tasks (BOQ demolition, the V12 photo transplant, and two earlier
  untracked files). This task changed none of them.
- `git diff --check`: pass (clean).
- `git status` after this task: exactly one new file created by this task —
  this report. No production source file changed. No V12 HTML file changed.
- Supabase push status: not applicable. This task changed no SQL.
- `bun run build`: skipped. Banned by the hardware policy.
- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run audit:load`,
  database commands: not run. This task is a static planning audit.

Note on report location: the task asked for `docs/Reports/`. The repository
already uses `docs/reports/`. On this case-insensitive filesystem they are the
same directory. This report follows the existing convention in
`docs/reports/boq/`.
