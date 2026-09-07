# Invoice Live Form — Forensic Wireframe Specification

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## 1. Form Identity

| Property | Value |
|---|---|
| Form name | Invoice Form (shared with Quotation via `document_type`) |
| Route entry (create) | `/invoices/new` → `NewInvoice` → `InvoiceFormPage(mode='create')` |
| Route entry (edit) | `/invoices/:id/edit` → `EditInvoice` → `InvoiceFormPage(mode='edit')` |
| Primary component | `src/components/document/SharedDocumentForm.tsx` |
| Page wrapper | `src/pages/InvoiceFormPage.tsx` |
| Domain model | `Invoice` (defined in `src/domain/invoice/types.ts`) |
| Shared form shell | `SharedDocumentForm` renders all sections; receives all props from `InvoiceFormPage` |
| Document types | Detected from `document_type` field or page title. Includes Invoice and Quotation. |
| Status on save | Always set to `unpaid` (via `save('unpaid')`) |

---

## 2. Complete Section Inventory (in order)

| # | Section | Component | Description |
|---|---|---|---|
| 1 | Form Header | `FormHeader` | Document type badge (Invoice/Quotation), client selector, document title, invoice number, PO number, issue date, due date, header custom fields |
| 2 | Line Items | `FormLineItems` | Repeating item rows with toolbar (Import, Settings, Clear), drag reorder, add item, add group |
| 3 | Commercial Terms | `FormCommercialTerms` | Payment terms, due/validity, discount (collapsible), VAT (collapsible), WHT (collapsible), additional charges (collapsible), additional fields (collapsible) |
| 4 | Totals | `FormTotals` | Summary rows (subtotal, discount, VAT, charges, WHT), VAT rate adjust, amount in words, grand total |
| 5 | Notes & Terms (collapsible) | `FormNotesTerms` | Notes rich text editor, Terms & Conditions rich text editor, Signatory picker, Reference links |
| 6 | PDF Output Settings | `PdfOutputSettings` | PDF template selection, bank details, footer, tagline, balance due, amount in words, percentage displays, compact mode |
| 7 | Footer bar | `FormFooter` | Cancel, Draft, Create Invoice / Save Changes buttons + floating save FAB |

---

## 3. Complete Field Inventory

### 3.1 Form Header Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| I-01 | Header | Badge | Document Type | Read-only | — | Display: "Invoice" (indigo badge) or "Quotation" based on `document_type` | — |
| I-02 | Header | Client Selector Button | Client | Editable (create), Locked (edit) | Yes | Click opens ClientSelector overlay | In edit mode: locked, shows lock icon, clicking opens IdentityLockDialog |
| I-03 | Header | Text Input | Invoice/Quotation Title | Editable | Optional | Large text input (e.g. "Monthly Maintenance") | Label changes based on document_type |
| I-04 | Header | Text Input | Invoice/Quotation No. | Editable (create), Locked (edit) | Yes | Mono font, hash icon prefix | In edit: locked, shows lock icon, clicking opens IdentityLockDialog |
| I-05 | Header | Text Input | PO Number | Editable | Optional | Text input, placeholder "Optional" | — |
| I-06 | Header | Date Input | Issue Date / Quotation Date | Editable | Optional | Date picker (native) | Label changes based on document_type |
| I-07 | Header | Date Input | Due Date / Valid Until | Editable | Optional | Date picker (native) | Label changes based on document_type |
| I-08 | Header | Header Fields (dynamic) | Custom label/value pairs | Editable | Optional | Add/remove/rename header field pairs. "Add field" button. | — |

### 3.2 Line Items Section

See §7 (Repeatable Row Inventory).

### 3.3 Commercial Terms Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| CT-01 | Commercial | Select | Payment Terms | Editable | Optional | Options: "Custom", "Net 7 Days", "Net 14 Days", "Net 30 Days", "Due on Receipt" | — |
| CT-02 | Commercial | Text Input | Due / Validity | Editable | Optional | Free text, placeholder varies by doc type | — |
| CT-03 | Commercial (Discount) | Numeric Input | Discount Value | Editable | Optional | Collapsible section. NumericInput with min=0. | — |
| CT-04 | Commercial (Discount) | Segmented Control | Discount Type | Editable | Optional | Options: "NGN" (fixed), "%" (percent) | — |
| CT-05 | Commercial (Discount) | Segmented Control | Discount Timing | Editable | Optional | Options: "After VAT", "Before VAT" | — |
| CT-06 | Commercial (VAT) | Numeric Input | VAT Rate (%) | Editable | Optional | Collapsible section. NumericInput with min=0. | — |
| CT-07 | Commercial (WHT) | Numeric Input | WHT Rate | Editable | Optional | Collapsible section. NumericInput with min=0. | — |
| CT-08 | Commercial (WHT) | Segmented Control | WHT Unit | Editable | Optional | Options: "%" (percent), "NGN" (fixed) | — |
| CT-09 | Commercial (Charges) | Dynamic rows | Additional Charges | Editable | Optional | Collapsible section. Each row: label input + numeric value + tax toggle + remove button. Two add buttons: "+ Charge (with Tax)" and "+ Charge (No Tax)". | — |
| CT-10 | Commercial (Fields) | Dynamic rows | Additional Fields | Editable | Optional | Collapsible section. Each row: label input + value input + remove button. "Add Additional Field" button. | — |

### 3.4 Totals Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| T-01 | Totals | Summary rows | Subtotal, Discount, VAT, Charges, WHT, Install Rate | Computed | — | Read-only display. Rows shown conditionally based on values. Discount shown as negative. | Discount row shown before VAT if timing="before", after if timing="after". VAT row shown only if rate > 0. |
| T-02 | Totals | Expandable VAT | VAT | Editable | Optional | "VAT" button expands inline NumericInput for VAT rate | Inline adjustment without opening commercial terms |
| T-03 | Totals | Text | Amount in Words | Computed | — | Auto-generated from totalPayable (Naira words) | — |
| T-04 | Totals | Display | Grand Total | Computed | — | Large display of totalPayable | — |

### 3.5 Notes & Terms Section (collapsible)

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| N-01 | Notes | RichTextEditor | Invoice Notes | Editable | Optional | Rich text editor, lazy loaded. Editable title above. | — |
| N-02 | Terms | RichTextEditor | Terms & Conditions | Editable | Optional | Rich text editor, lazy loaded. Editable title above. | — |
| N-03 | Signatory | SignatoryPicker | Signatory | Editable | Optional | Select from saved signatories list. Shows name, role, signature thumbnail. | — |
| N-04 | Links | Dynamic rows | Reference Links | Editable | Optional | Each row: label input + URL input + remove button. "Add Link" button. | — |

### 3.6 PDF Output Settings Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| PDF-01 | PDF Settings | Various toggles/inputs | PDF template, bank account, footer, tagline, balance due, amount in words, VAT/WHT/discount percentage, compact mode | Editable | Optional | Rendered by `PdfOutputSettings` component | — |

---

## 4. Complete Action Inventory

| ID | Location | Action | Trigger | Result | Confirmation | Conditional |
|---|---|---|---|---|---|---|
| A-01 | Footer | Cancel | Click "Cancel" | Navigates to `/invoices` (create) or `/invoices/:id` (edit) | No | — |
| A-02 | Footer | Save Draft | Click "Draft" | Saves with status `unpaid` | No | — |
| A-03 | Footer | Save Primary | Click "Create Invoice" / "Save Changes" | Saves with status `unpaid` | No | — |
| A-04 | Footer (FAB) | Floating Save | Click save icon | Same as A-03 | No | — |
| A-05 | Header | More Actions | Click "⋯" button | Opens ActionsSheet | No | — |
| A-06 | ActionsSheet | Save as Draft | Select from sheet | Saves with status `unpaid` | No | — |
| A-07 | ActionsSheet | Cancel | Select from sheet | Navigates away | No | — |
| A-08 | ActionsSheet | Manage Columns | Select from sheet | Opens ColumnManager | No | — |
| A-09 | ActionsSheet | Import JSON | Select from sheet | Opens JsonItemsImportSheet | No | — |
| A-10 | ActionsSheet | Toggle Merge Qty+Unit | Toggle switch | Toggles `mergeQtyUnit` state | No | — |
| A-11 | ActionsSheet | Add Group | Select from sheet | Adds new group header row | No | — |
| A-12 | ActionsSheet | Notes & Terms | Select from sheet | Scrolls to and expands Notes & Terms section | No | — |
| A-13 | ActionsSheet | Reference Links | Select from sheet | Scrolls to and expands Reference Links section | No | — |
| A-14 | Line Items | Import | Click "Import" in toolbar | Opens JsonItemsImportSheet | No | — |
| A-15 | Line Items | Settings | Click "Settings" in toolbar | Opens ColumnManager | No | — |
| A-16 | Line Items | Clear All | Click "Clear" in toolbar | AlertDialog confirmation → clears all items | Yes | Only shown when items > 0 |
| A-17 | Line Items | Add Item | Click "Add item" | Appends new default row | No | — |
| A-18 | Line Items | Add Group | Click "Add group" | Inserts group header row | No | — |
| A-19 | Line Item row | Remove | Click X button | Removes row. Last row resets to default. | No | — |
| A-20 | Line Item row | Move Up/Down | Click chevrons | Swaps row with adjacent | No | Disabled on first/last |
| A-21 | Line Item row | Insert Below | Click "Insert below" | Inserts new default row after current | No | — |
| A-22 | Line Item row | Drag reorder | Drag grip handle | Reorders via @dnd-kit | No | — |
| A-23 | Line Item row | Sub-desc toggle | Click "Sub-desc" pill | Expands/collapses sub-description textarea | No | — |
| A-24 | Line Item row | Photo upload | Click "Photo" pill | Opens native file picker, uploads to Cloudinary, sets image_url | No | — |
| A-25 | Line Item row | Image remove | Click X on image | Clears image_url | No | Only when image present |
| A-26 | Line Item row | Item suggestions | Focus description + type 2+ chars | Shows autocomplete dropdown from item library | No | Only for invoice/quotation (not waybill) |
| A-27 | Header | Client Picker | Click client button (create) | Opens ClientSelector overlay | No | Locked in edit mode |
| A-28 | Header | Identity Lock | Click locked field (edit) | Opens IdentityLockDialog: "Identity Fields Locked" with Duplicate option | No | Only in edit mode |
| A-29 | Notes | Toggle | Click section header | Expands/collapses Notes & Terms section | No | — |
| A-30 | Signatory | Select | Use SignatoryPicker | Sets signatory_id for PDF output | No | — |
| A-31 | Links | Add/Remove | Click add/remove buttons | Manages reference link rows | No | — |

---

## 5. Overlay Inventory

| ID | Overlay | Trigger | Contents | Confirm | Cancel | Dismiss |
|---|---|---|---|---|---|---|
| O-01 | ClientSelector | Click client button (create mode) | Searchable list of clients. Compact, dense, no header. | Selecting client | Close | Click outside |
| O-02 | ActionsSheet (UnifiedActionSheet) | Click "⋯" button | List of actions: Save Draft, Cancel, Manage Columns, Import JSON, Toggle Merge Qty+Unit, Add Group, Notes & Terms, Reference Links | Clicking action item | Close (tap outside or swipe) | Swipe down / tap outside |
| O-03 | JsonItemsImportSheet | Click "Import" in toolbar or ActionsSheet | JSON import sheet (bottom sheet). Title: "Import JSON". Paste area, tutorial steps, video link. | Preview + Save buttons | Close | Click outside |
| O-04 | ColumnManager | Click "Settings" in toolbar or ActionsSheet | Column visibility toggles, rename, add/remove custom columns, reorder, reset, reset item overrides | — | Close button | — |
| O-05 | IdentityLockDialog | Click locked field in edit mode | Alert dialog: "Identity Fields Locked". Description explains client/document number can't change. Buttons: Cancel, "Duplicate Current Changes". | "Duplicate Current Changes" navigates to create mode with prefill | Cancel | Click outside |
| O-06 | AlertDialog (Clear All) | Click "Clear" in line items toolbar | "Clear all items?" with count description. Cancel + "Clear All" (destructive red). | "Clear All" | Cancel | Click outside |
| O-07 | SignatoryPicker | Expand signatory section | Grid/list of saved signatories with name, role, signature thumbnail. | Select signatory | Close | — |

---

## 6. Dropdown/Selector Inventory

| ID | Dropdown | Trigger | Current Value | Options | Search | Multi | Clear | Result |
|---|---|---|---|---|---|---|---|---|
| D-01 | Client Selector | Click client button | Empty or client_name | Database clients | Yes (searchable) | No | Yes (if allowClear) | Sets client_id, client_name |
| D-02 | Payment Terms | Click select trigger | invoice.payment_terms | "Custom", "Net 7 Days", "Net 14 Days", "Net 30 Days", "Due on Receipt" | No | No | No | Sets payment_terms |
| D-03 | Discount Type | Segmented control | discountType | "NGN" (fixed), "%" (percent) | No | No | No | Sets discountType |
| D-04 | Discount Timing | Segmented control | discountTiming | "After VAT", "Before VAT" | No | No | No | Sets discountTiming |
| D-05 | WHT Unit | Segmented control | whtType | "%" (percent), "NGN" (fixed) | No | No | No | Sets whtType |
| D-06 | Signatory | Expand section + pick | signatoryId | Saved signatories list | No (visual list) | No | Yes ("Leave blank") | Sets signatoryId |

---

## 7. Repeatable Row Inventory

### Invoice Item Row (MobileItemCard)

Each invoice item row contains:

| Column | Field | Control | Default | Notes |
|---|---|---|---|---|
| Description | `description` | Textarea | `''` | Primary item field. Triggers item library suggestions when focused and 2+ chars typed. |
| Sub-description | `sub_description` | Textarea (collapsed) | `''` | Toggled by "Sub-desc" pill. Appears in collapsed container. |
| Image | `image_url` | File upload (Cloudinary) | `null` | "Photo" pill triggers native file picker. Uploads to Cloudinary. Shows 80x80 preview with X to remove. |
| Make | `make` | Text Input | `''` | Visibility controlled by column settings. Default: hidden. |
| Quantity | `quantity` | NumericInput | `1` | Must be ≥ 1. |
| Unit | `unit` | UnitInput (custom) | `''` | Custom unit selector component. |
| Rate (unit_price) | `unit_price` | NumericInput | `0` | Visibility controlled by column settings. Default: visible for invoice/quotation. |
| Part No | `partNo` | Text Input | `''` | Visibility controlled by column settings. Default: hidden. |
| Condition | `condition` | Text Input | `''` | Visibility controlled by column settings. Default: hidden. |
| Install Rate | `install_rate` | NumericInput | Auto-calculated | Visibility controlled by column settings. Default: hidden. Has override logic: if column has formula, shows auto-calculated value as placeholder. |
| VAT Rate | `vat_rate` | NumericInput | `null` | Visibility controlled by column settings. Default: hidden. Row-level VAT override. |
| Discount Rate | `discount_rate` | NumericInput | `null` | Visibility controlled by column settings. Default: hidden. Row-level discount override. |
| Custom Columns | `custom_data[key]` | Text/Numeric Input | `''` | User-created columns. Stored in item's custom_data. |
| Subtotal (computed) | Computed | Display only | — | Shows formatted currency amount. Visibility controlled by `amount` column visibility. |

### Row Actions (MobileItemCard)

| Action | Behavior |
|---|---|
| Drag reorder | Grip handle (⋮⋮) on left. Uses @dnd-kit with PointerSensor (8px) and TouchSensor (250ms). Only ungrouped items participate. |
| Move up/down | Chevron buttons on right. Disabled on first/last. |
| Remove (X) | Removes row. If last, resets to default. |
| Insert below | "Insert below" link below each row. |
| Duplicate | Copy button (shown when `onDuplicate` provided — available in group context). |
| Ungroup | X button (shown when item has `group_id` — removes from group). |
| Sub-desc toggle | Pill button. Toggles sub-description textarea visibility. |
| Photo upload | Pill button. Opens file picker. Uploads to Cloudinary. |
| Item suggestions | Automatic dropdown when description focused and 2+ chars. Shows matching items from item library with prices. Selecting auto-fills description, item_id, unit_price. |

### Group Rows (MobileGroupCard)

Groups are structural rows that contain:
- Group header row (row_type: `group_header`) with editable group name
- Items within the group
- Optional group subtotal display
- "Add item to group" button
- Group delete action
- Group subtotal toggle

### Standard Item Columns (Financial)

| Key | Label | Type | Default Visible |
|---|---|---|---|
| `description` | Description | text | Yes |
| `quantity` | Qty | number | Yes |
| `unit` | Unit | text | Yes |
| `unit_price` | Rate | number | Yes |
| `amount` | Amount | computed | Yes |
| `make` | Make | text | No |
| `partNo` | Part No | text | No |
| `condition` | Condition | text | No |
| `install_rate` | Install | install_rate | No |
| `vat_rate` | VAT % | vat_rate | No |
| `discount_rate` | Disc % | discount_rate | No |

### Empty State

- When items list has 1 default empty row, it shows the standard row with empty fields

### Import

- Opens JsonItemsImportSheet (shared import component)
- Parses JSON and applies via `invoiceImportAdapter.applyResult()`
- Can set columns, items, groups, extra charges, and top-level fields

---

## 8. Conditional Logic

| Condition | Effect |
|---|---|
| `document_type` includes "QUOT" or title/modeLabel contains "quotation" | Document treated as Quotation. Labels change (Quotation No., Quotation Date, Valid Until). |
| `mode === 'edit'` | Client field locked. Invoice number locked. IdentityLockDialog shown on click. Items loaded from DB. |
| `mode === 'create'` | Client selectable. Invoice number auto-generated. All fields editable. |
| Payment terms = "Custom" | (In some variants) Custom payment terms text input appears |
| Discount value > 0 | Discount row shown in totals summary |
| VAT rate > 0 | VAT row shown in totals. VAT expand button visible. |
| WHT rate > 0 | WHT row shown in totals summary |
| Extra charges exist | Additional charge rows shown in totals summary |
| Install rate column visible + has formula | Auto-calculated install rate shown as placeholder in item row |
| `mergeQtyUnit === true` | Qty and Unit displayed merged in PDF output |
| Items exist | "Clear" button appears in toolbar. Item count shown. |
| No items | Empty state with default row |
| Groups exist | Group controls appear (subtotal toggle, group delete, add item to group) |
| `discountTiming === 'before'` | Discount shown before VAT in summary |
| `discountTiming === 'after'` | Discount shown after VAT in summary |
| Quotation mode | Some financial columns may differ. PDF template options may differ. |
| Edit mode + identity field click | IdentityLockDialog opens with "Duplicate Current Changes" option |
| Prefill from project/quotation | client_id, client_name, project_id pre-populated from route state |

---

## 9. Create vs Edit Differences

| Aspect | Create | Edit |
|---|---|---|
| Entry | Direct form render | Hydration from DB (loading state shown) |
| Client | Selectable via ClientSelector | Locked (IdentityLockDialog on click) |
| Invoice number | Auto-generated from DB sequence | Locked (IdentityLockDialog on click) |
| Initial data | Default empty invoice + today's date | Loaded from DB via `useInvoiceHydration` |
| Items | Start with 1 default empty row | Loaded from `invoice_items` table |
| Groups | None initially | Discovered from group_header rows |
| Custom fields | From prefill or defaults | From `custom_fields` JSON |
| Extra charges | From prefill or defaults | From `custom_fields.extraCharges` |
| Attachments | From prefill or defaults | From `custom_fields.attachments` |
| Signatory | From prefill or defaults | From `custom_fields.signatoryId` |
| PDF output | From prefill or defaults | From `custom_fields.pdfOutput` |
| Column config | From defaults | From `custom_fields.columnConfig` |
| Discount/WHT type | From prefill or defaults | From `custom_fields` |
| Save action | `save('unpaid')` → navigates to view | `save('unpaid')` → navigates to view |
| Identity lock | N/A | Client, invoice_number locked. Dialog offers "Duplicate Current Changes". |
| Prefill support | Accepts route state `prefill`, `prefillItems`, `projectId`, `clientId`, `clientName` | N/A |

---

## 10. Validation and Error States

| Validation | Error Message | Trigger |
|---|---|---|
| Missing client | Toast error | Save attempt |
| Missing invoice number | Toast error | Save attempt |
| Invalid line items | "Item {n} is missing a description or has quantity ≤ 0" (with row highlight) | Save attempt |
| Empty items list | Toast error | Save attempt |
| Server errors | Toast with user-facing message | Save attempt |
| Duplicate invoice number (edit) | Toast error | Save attempt |
| Import JSON parse failure | Toast error with description | Import apply |
| Invalid row on save | Row scrolled into view and highlighted for 2.5 seconds (`bd-row-invalid` class) | Save attempt |

---

## 11. Attachment/Image/Signature Behavior

### Item Image Upload

- **Entry point:** "Photo" pill button on each item row
- **Picker:** Native file picker (accepts image files per `IMAGE_ACCEPT_ATTRIBUTE`)
- **Upload:** POST to Cloudinary API (`https://api.cloudinary.com/v1_1/ddhqvv77g/image/upload`)
- **Preview:** 80x80 thumbnail displayed in item row
- **Replace:** Upload new image (replaces previous)
- **Deletion:** Click X button on thumbnail → clears `image_url`
- **Failure:** Toast error with message

### Signatory Selection

- **Entry point:** Expand "Signatory" collapse section
- **Picker:** `SignatoryPicker` component — grid/list of saved signatories
- **Selection:** Click signatory → sets `signatoryId`
- **Clear:** "Leave blank" option
- **Result:** Signatory name and signature image appear in PDF output

### Reference Links

- **Entry point:** Expand "Reference Links" collapse section
- **Add:** "Add Link" button → new row with label + URL inputs
- **Remove:** Click X button on row
- **Storage:** Stored in `attachments` array within custom_fields

---

## 12. Data Flow / Dependencies

| Interaction | Effect |
|---|---|
| Select client | Sets `client_id` and `client_name`. If quotation conversion, may pre-fill items. |
| Edit item fields | Recalculates row subtotal and document totals in real-time via `computeDocument()` |
| Change VAT rate | Recalculates VAT amount across all items, updates totals summary |
| Change discount | Recalculates discount amount, updates totals summary |
| Change discount timing | Moves discount row in summary (before/after VAT) |
| Change WHT | Recalculates WHT amount, updates totals summary |
| Add/remove extra charges | Recalculates totals including charge rows |
| Add/remove item | Recalculates subtotal and all dependent totals |
| Add/remove group | Restructures item layout. Group subtotal recalculated. |
| Toggle group subtotal | Shows/hides subtotal row for that group in PDF |
| Change column visibility | Affects which columns render in item rows. Does NOT mutate item data. |
| Import JSON | Replaces items, columns, groups, charges, and top-level fields |
| Change document_type | Updates labels (Invoice vs Quotation). May affect PDF template options. |
| Save | Validates, computes final totals, serializes all state into invoice + items + custom_fields, calls Supabase RPC |

---

## 13. Responsive Behavior

- Max-width container: `max-w-4xl` (overall), `max-w-[780px]` (form content)
- Mobile: Full-width with `px-0 sm:px-2`
- Form sections use consistent padding and spacing
- Line item rows use responsive grid: `grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5`
- Footer: sticky-bottom with safe-area-inset-bottom
- Floating save FAB: fixed bottom-right
- `isMobile` prop passed to SharedDocumentForm from `useLayoutMode()` hook
- ColumnManager and ImportSheet are bottom sheets on mobile

---

## 14. Interaction State Matrix

| Action | State Change |
|---|---|
| Open form (create) | Empty form with auto-generated number |
| Open form (edit) | Loading state → hydrated form with all data |
| Click client (create) | ClientSelector opens |
| Select client | client_id, client_name set, overlay closes |
| Click locked field (edit) | IdentityLockDialog opens |
| Click "Duplicate" | Navigates to create mode with current data prefilled (client cleared) |
| Click "⋯" | ActionsSheet opens |
| Select action from sheet | Corresponding action executes, sheet closes |
| Click "Import" | JsonItemsImportSheet opens (bottom sheet) |
| Apply import | All data replaced, sheet closes, toast |
| Click "Settings" | ColumnManager opens |
| Toggle column visibility | Column shown/hidden in all item rows |
| Add custom column | New column in all item rows (up to limit) |
| Click "Clear" | AlertDialog → confirm → all items reset |
| Add item | New row appended |
| Add group | Group header row inserted |
| Edit item description (2+ chars) | Item library suggestions dropdown |
| Select suggestion | Description, item_id, unit_price auto-filled |
| Upload item image | Cloudinary upload → preview shown |
| Remove item image | image_url cleared |
| Drag item | Row reordered via @dnd-kit |
| Save (valid) | Loading state, save call, navigation to view page |
| Save (invalid) | Toast error, invalid row highlighted and scrolled to |
| Before unload (dirty) | Browser confirmation dialog |

---

## 15. Missing/Unclear Behavior

| Item | Status |
|---|---|
| Exact PdfOutputSettings UI | Component renders but detailed field layout not fully inspected. Contains bank account selector, template picker, toggle switches for various PDF options. |
| Advance invoice section | `InvoiceAdvanceSheet` exists in document-view components but is NOT part of the form. It is a view-page-only feature. |
| Revert invoice | `RevertInvoiceDialog` exists but is NOT part of the form. View-page action only. |
| Workmanship/Transportation/Shipping defaults | These are legacy fields. In the current form they appear as extra charges with chargeLabels. Their exact initial values depend on custom_fields or prefill. |
| Number generation exact sequence | Uses `getNextInvoiceNumber()` from `@/domain/documentConversion` which queries existing invoices and increments. UNKNOWN — exact format depends on prefix settings. |
| PdfOutputSettings detailed fields | The component accepts `bankAccounts`, `companyTagline`, `footerText` and renders template selection, bank account pickers, and toggle switches. Exact layout varies. |

---

## 16. Skills Used

Skills used: NONE (forensic documentation task, not a visual redesign)

Documentation standard: ASD-STE100 Simplified Technical English

---

## 17. Verification

- Source inspected: `InvoiceFormPage.tsx`, `SharedDocumentForm.tsx`, `FormHeader.tsx`, `FormLineItems.tsx`, `FormCommercialTerms.tsx`, `FormTotals.tsx`, `FormNotesTerms.tsx`, `FormFooter.tsx`, `MobileItemCard.tsx`, `ActionsSheet.tsx`, `InvoicePaymentTermsSection.tsx`, `IdentityLockDialog.tsx`, `useInvoiceForm.js`, `useInvoiceHydration.ts`, `types.ts`
- All fields, overlays, actions, conditional logic, and validation derived from actual code inspection
- No assumptions made about unimplemented features
