# Waybill Live Form — Forensic Wireframe Specification

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## 1. Form Identity

| Property | Value |
|---|---|
| Form name | Waybill Form |
| Route entry (create) | `/waybills/new` → `NewWaybill` → `WaybillFormPage(mode='create')` |
| Route entry (edit) | `/waybills/:id/edit` → `EditWaybill` → `WaybillFormPage(mode='edit')` |
| Primary component | `src/components/waybill/WaybillForm.tsx` |
| Page wrapper | `src/pages/WaybillFormPage.tsx` |
| Domain model | `Waybill` (defined in `src/components/waybill/waybillUtils.ts`) |
| Domain contract | `src/domain/waybill/contracts/waybillContract.ts` |
| Waybill types | `external` (External Delivery Note) or `internal` (Internal Transfer Note) |
| Status on save | Always set to `dispatched` |

---

## 2. Create vs Edit: Gateway Overlay

Before the form renders in create mode, a **WaybillGatewayOverlay** (`src/components/waybill/WaybillGatewayOverlay.tsx`) is displayed as a modal dialog.

### Gateway Overlay Contents

| Element | Type | Behavior |
|---|---|---|
| Title text | Static | "Create Document / New Waybill / Select document type" |
| Option 1: External Delivery Note | Button | Selects type `external`, closes overlay, opens form |
| Option 1 description | Static | "Outbound shipment to clients and vendors. Links to invoice on record." |
| Option 1 badge | Static | "Type 01 / Outbound" |
| Option 2: Internal Transfer Note | Button | Selects type `internal`, closes overlay, opens form |
| Option 2 description | Static | "Stock movement between depots, workshops, and service centers." |
| Option 2 badge | Static | "Type 02 / Internal" |
| Divider text | Static | "or download blank" |
| Blank External (PDF) | Button | Downloads a blank external waybill PDF template. Logs the number to `blank_waybill_logs`. |
| Blank Internal (PDF) | Button | Downloads a blank internal waybill PDF template. Logs the number to `blank_waybill_logs`. |
| Numbering note | Static | "Waybill numbering follows WB-{6-digit serial} — auto-generated on creation." |

In edit mode, the gateway overlay is skipped. The form loads directly with the existing waybill data.

---

## 3. Complete Section Inventory (in order)

| # | Section | Color Tag | Description |
|---|---|---|---|
| 1 | Waybill Header | Indigo | Document type badge, client selector (external only), waybill number, PO number (external only), date, time, linked invoice (external only) |
| 2 | Transport Details | Amber | Transport mode, purpose, vehicle plate (conditional), driver name |
| 3 | Line Items | Green | Repeating item rows with import, settings, clear, add item actions |
| 4 | Custody Details | Indigo | Delivered by, received by, delivery location |
| 5 | Signatures | Green | Sender and receiver signature capture (upload, draw, pick from saved signatories) |
| 6 | Notes (collapsible) | Indigo | Editable title, rich text editor for notes |
| 7 | Terms & Conditions (conditional, collapsible) | Violet | Only shown when enabled via Table Settings "More Settings" modal. Rich text editor. |
| 8 | Footer bar | — | Cancel, Draft, Save Waybill buttons + floating save FAB |

---

## 4. Complete Field Inventory

### 4.1 Waybill Header Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| W-01 | Header | Badge | Document Type | Read-only | — | Display only | Shows "EXTERNAL DELIVERY NOTE" (indigo) or "INTERNAL TRANSFER NOTE" (amber) based on `type` |
| W-02 | Header | Client Selector Button | Client | Editable (create), Locked (edit) | Required for external | Click opens ClientSelector overlay | Only shown when `type === 'external'` |
| W-03 | Header | Text Input | WAYBILL NO | Editable, disabled while loading number | Required | Text input, mono font | Disabled while `loadingNumber` is true |
| W-04 | Header | Text Input | P.O. NUMBER | Editable | Optional | Text input | Only shown when `type === 'external'` |
| W-05 | Header | Date Input | DATE | Editable | Required | Date picker (native) | — |
| W-06 | Header | Time Input | TIME | Editable | Optional | Time picker (native) | — |
| W-07 | Header | Linked Invoice Display/Button | Linked Invoice | Conditional | — | If linked: shows invoice number with unlink (X) button. If not linked: shows "Tap to link an invoice" button that opens AttachExistingDocumentSheet. | Only shown when `type === 'external'`. Button is disabled/greyed when no client is selected. |

### 4.2 Transport Details Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| T-01 | Transport | CompactSelect | Transport Mode | Editable | Yes | Dropdown: "By Vehicle", "By Hand", "Courier", "Blank" | When "By Hand" or "Courier" selected, Vehicle Plate field is hidden and cleared |
| T-02 | Transport | CompactSelect | Purpose | Editable | Conditional | Dropdown options differ by waybill type | External: "Supply", "Return", "Repair", "Other", "Blank". Internal: "Transfer", "Repair", "Other", "Blank" |
| T-03 | Transport | Text Input | Vehicle Plate | Editable | Optional | Text input, mono uppercase | Hidden when transport_mode is "By Hand" or "Courier" |
| T-04 | Transport | Text Input | Driver Name | Editable | Optional | Text input | — |

### 4.3 Line Items Section

See §7 (Repeatable Row Inventory).

### 4.4 Custody Details Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| C-01 | Custody | Text Input | DELIVERED BY | Editable | Optional | Text input | — |
| C-02 | Custody | Text Input | RECEIVED BY | Editable | Required (internal: `receiver_name` required) | Text input | For internal waybills, validation enforces this is non-empty |
| C-03 | Custody | Text Input | DELIVERY LOCATION / MOVEMENT ROUTE / DESTINATION | Editable | Optional | Text input, full-width, placeholder changes by type | Label: "DELIVERY LOCATION" (external) or "MOVEMENT ROUTE / DESTINATION" (internal). Placeholder: "Client address, site, or drop-off location" (external) or "Where the items are moving within operations" (internal) |

### 4.5 Signatures Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| S-01 | Signatures | SignatureCard | Delivered By (sender) | Editable | Optional | See §12 (Signature Interactions) | Shows "Pick" button for sender role (DB lookup of saved signatories) |
| S-02 | Signatures | SignatureCard | Collected By (receiver) | Editable | Optional | See §12 (Signature Interactions) | No "Pick" button for receiver role |

### 4.6 Notes Section (collapsible)

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| N-01 | Notes | TextInput | Notes Title | Editable | Optional | Editable text, defaults to "Notes" | User can rename the section title |
| N-02 | Notes | RichTextEditor | Notes | Editable | Optional | Rich text editor (lazy loaded) | — |

### 4.7 Terms & Conditions Section (conditional, collapsible)

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| TC-01 | Terms | RichTextEditor | Terms & Conditions | Editable | Optional | Rich text editor (lazy loaded) | Only rendered when `showTermsInTableSettings` is true (enabled via More Settings modal checkbox) |

---

## 5. Complete Action Inventory

| ID | Location | Action | Trigger | Result | Confirmation | Conditional |
|---|---|---|---|---|---|---|
| A-01 | Footer | Cancel | Click "Cancel" | Navigates to `/waybills` | No | — |
| A-02 | Footer | Save (Draft) | Click "Draft" | Validates, saves waybill with status `dispatched` | No | — |
| A-03 | Footer | Save (Primary) | Click "Save Waybill" | Validates, saves waybill with status `dispatched` | No | — |
| A-04 | Footer (FAB) | Floating Save | Click save icon | Same as A-03 | No | — |
| A-05 | Line Items toolbar | Import | Click "Import" | Opens WaybillImportSheet | No | — |
| A-06 | Line Items toolbar | Settings | Click "Settings" | Opens ColumnManager + More Settings modal | No | — |
| A-07 | Line Items toolbar | Clear All | Click "Clear" | Opens AlertDialog confirmation: "Clear all items?" | Yes (AlertDialog) | Only shown when line items count > 0 |
| A-08 | Line Items | Add Item | Click "Add item" | Appends a new default row | No | — |
| A-09 | Line Item row | Remove | Click X button on row | Removes the row. If last row, resets to default empty row. | No | — |
| A-10 | Line Item row | Move Up | Click up chevron | Swaps row with previous | No | Disabled on first row |
| A-11 | Line Item row | Move Down | Click down chevron | Swaps row with next | No | Disabled on last row |
| A-12 | Line Item row | Insert Below | Click "Insert below" | Inserts new default row after current | No | — |
| A-13 | Line Item row | Drag reorder | Drag grip handle | Reorders via DnD (PointerSensor + TouchSensor) | No | — |
| A-14 | Header | Client Picker | Click client button | Opens ClientSelector overlay | No | Only for external type |
| A-15 | Header | Link Invoice | Click "Tap to link" | Opens AttachExistingDocumentSheet | No | Only for external type, only when no invoice linked, only when client selected |
| A-16 | Header | Unlink Invoice | Click X on linked invoice | Clears `linkedInvoiceNumber` from customFields.references | No | Only when invoice is linked |
| A-17 | Signatures | Upload | Click "Upload" button | Opens native file picker (image files only) | No | — |
| A-18 | Signatures | Draw | Click "Draw" button | Expands/collapses DrawPad (canvas for drawing) | No | — |
| A-19 | Signatures | Pick (sender only) | Click "Pick" button | Opens PickSignatorySheet (bottom sheet with saved signatories) | No | Only on sender signature card |
| A-20 | Signatures | Clear | Click trash icon | Clears signature image/drawing | No | Only shown when signature has evidence |
| A-21 | Signatures | Show/Hide | Click eye icon | Toggles visibility of signature card content | No | — |
| A-22 | Notes | Toggle | Click section header | Expands/collapses notes section | No | — |
| A-23 | Terms | Toggle | Click section header | Expands/collapses terms section | No | Only visible when enabled via More Settings |
| A-24 | More Settings modal | Show Terms | Toggle checkbox | Enables/disables Terms & Conditions section visibility | No | — |
| A-25 | More Settings modal | Done | Click "Done" | Closes the modal | No | — |

---

## 6. Overlay Inventory

| ID | Overlay | Trigger | Contents | Confirm | Cancel | Dismiss |
|---|---|---|---|---|---|---|
| O-01 | WaybillGatewayOverlay (Dialog) | Navigate to `/waybills/new` | Type selection (External/Internal), blank template download buttons | Selecting a type | Close button / clicking outside | Clicking outside closes and navigates back to `/waybills` |
| O-02 | ClientSelector | Click client button (external only) | Searchable list of clients from database | Selecting a client (sets client_id + client_name) | Close button | Clicking outside |
| O-03 | AttachExistingDocumentSheet | Click "Tap to link an invoice" | Searchable sheet for invoices (by number, client, PO). Title: "Link Invoice". Description: "Search for an invoice to link to this waybill". Search placeholder: "Search invoices by number, client, or PO...". | Selecting an invoice (sets linkedInvoiceNumber) | Close button | Clicking outside |
| O-04 | WaybillImportSheet | Click "Import" in line items toolbar | JSON import sheet. Title: "Import Waybill". Description: "Capture a paper waybill by pasting its JSON extraction." Tutorial with steps and video. | "Preview" and "Save" buttons (both apply import) | Close button | Clicking outside |
| O-05 | ColumnManager | Click "Settings" in line items toolbar | Column visibility toggles, rename columns, add/remove custom columns (max 4), reorder columns, reset | — | Close button | — |
| O-06 | More Settings Modal | Click "Settings" (secondary modal from ColumnManager area) | Checkbox: "Show Terms & Conditions". "Done" button. | Click "Done" | Close (X) button | Clicking outside |
| O-07 | PickSignatorySheet (Sheet, bottom) | Click "Pick" on sender signature | Searchable list of saved signatories from DB. Title: "Pick a signatory". Description: "People who signed for you before. Tap to attach." Search: "Search by name or role…" | Selecting a signatory (attaches signature_url) | Close / swipe down | Swipe down |
| O-08 | DrawPad (inline, not overlay) | Click "Draw" on signature card | Canvas for drawing signature. Buttons: Reset, Cancel, Save drawing. | "Save drawing" (converts to dataURL) | "Cancel" | — |
| O-09 | AlertDialog (Clear All) | Click "Clear" in line items toolbar | "Clear all items?" with description of count. Cancel + "Clear All" (destructive, red) | "Clear All" | "Cancel" | Clicking outside |
| O-10 | Image file picker | Click "Upload" on signature card | Native OS file picker for image files | Selecting file (uploads to Supabase Storage `signatures` bucket) | Cancel | — |

---

## 7. Repeatable Row Inventory

### Line Items (WaybillItem)

Each waybill item row contains:

| Column | Field | Control | Default | Notes |
|---|---|---|---|---|
| Description | `description` | Textarea | `''` | Required for save. Primary item identifier. |
| Quantity | `quantity` | NumericInput | `1` | Must be > 0 for save. |
| Unit | `unit` | UnitInput (custom) | `''` | Optional. Unit selector. |
| Make | `make` | Text Input | `''` | Visibility controlled by column settings. Default: hidden. |
| Part No | `partNo` | Text Input | `''` | Visibility controlled by column settings. Default: hidden. |
| Condition | `condition` | Text Input | `'good'` | Visibility controlled by column settings. Default: hidden. Options: 'good', 'damaged', 'partial' |
| Custom Columns | `custom_data[key]` | Text/Numeric Input | `''` | Up to 4 custom columns. User-created. |

**Standard item columns** (from `STANDARD_ITEM_COLUMNS` in waybillContract.ts):

| Key | Label | Default Visible |
|---|---|---|
| `description` | Description | Yes |
| `quantity` | Qty | Yes |
| `unit` | Unit | Yes |
| `make` | Make | No |
| `partNo` | Part No | No |
| `condition` | Condition | No |

### Row Actions

| Action | Behavior |
|---|---|
| Drag reorder | Grip handle on left. Uses @dnd-kit with PointerSensor (8px activation) and TouchSensor (250ms delay). |
| Move up/down | Chevron buttons on right side. Disabled on first/last respectively. |
| Remove (X) | Removes row. If last row, resets to default empty row instead of removing. |
| Insert below | "Insert below" link below each row. Inserts new default row after current. |
| Invalid row highlight | On validation failure, the offending row scrolls into view and gets `bd-row-invalid` class for 2.5 seconds. |

### Add Item

- Button: "Add item" (dashed border, full width)
- Appends a new default row (`createDefaultItem()`) to the end

### Clear All

- Button: "Clear" (trash icon, appears in toolbar when items > 0)
- Confirmation dialog: "Clear all items?"
- Action: Resets items to `[createDefaultItem()]`

### Import

- Button: "Import" in toolbar
- Opens WaybillImportSheet (JSON import)
- Parses JSON, applies via adapter (external or internal adapter based on type)
- Replaces all items, waybill fields, custom columns, custom fields

### Column Management

- Button: "Settings" in toolbar
- Opens ColumnManager (full overlay)
- Capabilities: toggle visibility, rename columns, add custom columns (max `WAYBILL_COLUMN_LIMIT = 4`), remove custom columns, reorder columns, reset all to defaults
- Also opens "More Settings" modal with "Show Terms & Conditions" checkbox

### Empty State

- When items list has 1 default empty row, it shows the standard row with empty description and quantity=1

### Drag and Drop

- Uses `@dnd-kit/core` with `PointerSensor` (8px activation distance) and `TouchSensor` (250ms delay, 5px tolerance)
- Only ungrouped items participate in drag reorder (waybill has no groups, so all items are sortable)

---

## 8. Conditional Logic

| Condition | Effect |
|---|---|
| `type === 'external'` | Client selector button is shown. P.O. Number field is shown. Linked Invoice section is shown. Purpose options: Supply, Return, Repair, Other. |
| `type === 'internal'` | Client selector is hidden. P.O. Number is hidden. Linked Invoice is hidden. Purpose options: Transfer, Repair, Other. |
| `transport_mode === 'By Hand'` OR `transport_mode === 'Courier'` | Vehicle Plate field is hidden and cleared |
| `transport_mode === 'By Vehicle'` | Vehicle Plate field is shown |
| No client selected (external) | "Tap to link an invoice" button is disabled/greyed. Save validation requires client. |
| Invoice already linked (external) | Shows linked invoice number with X (unlink) button instead of "Tap to link" |
| `showTermsInTableSettings === true` | Terms & Conditions section appears in form |
| `showTermsInTableSettings === false` | Terms & Conditions section is hidden |
| Custom columns exist | Additional columns appear in each line item row (up to 4) |
| Custom columns at limit (4) | "Add column" action shows warning toast: "Maximum 4 columns allowed." |
| Edit mode (`mode === 'edit'`) | Loads existing waybill data. Waybill number may be pre-filled and editable. All fields editable. Save navigates to view page. |
| Create mode (`mode === 'create'`) | Gateway overlay shown first. After type selection, waybill number auto-generated. All fields start empty/default. |
| `dirty === true` | Beforeunload warning triggered on browser close/refresh |
| Validation failure (save) | Toast error with description. Invalid row highlighted and scrolled to. |

---

## 9. Create vs Edit Differences

| Aspect | Create | Edit |
|---|---|---|
| Entry | Gateway overlay first → type selection → form | Direct form load with hydration |
| Waybill number | Auto-generated, shown as disabled while loading, then editable | Pre-filled, editable |
| Client | Selectable via ClientSelector | Editable (same as create) |
| Initial data | Default empty waybill + today's date | Loaded from DB via `mapDbWaybill()` |
| Save action | `saveWaybill({ mode: 'new' })` → navigates to view | `saveWaybill({ mode: 'edit', waybillId })` → navigates to view |
| Items | Start with 1 default empty row | Loaded from DB, with custom columns restored |
| Custom columns | None initially | Restored from `custom_fields.customColumns` and item `custom_data` |
| Signatures | Empty signature cards | Loaded from `custom_fields.signatures` |

---

## 10. Validation and Error States

| Validation | Error Message | Trigger |
|---|---|---|
| External waybill without client | "Client account must be selected for external waybills." | Save attempt |
| Internal waybill without receiver_name | "Recipient name is required for internal waybills." | Save attempt |
| Missing waybill number | "Waybill number is missing or invalid." | Save attempt |
| Missing date | "Date is required." | Save attempt |
| Empty items list | "Line items list cannot be empty." | Save attempt |
| Item missing description or qty ≤ 0 | "Item {n} is missing a description or has quantity ≤ 0." | Save attempt |
| Custom column name duplicate | `A column named "{name}" already exists` | ColumnManager rename |
| Max custom columns reached | "Maximum 4 columns allowed." (warning) | Add custom column at limit |
| Import JSON parse failure | "Import Failed" + error message | Import sheet apply |
| Import schema validation failure | "Import Failed" + Zod error message | Import sheet apply |

Validation is performed via `feedback.error()` toast notifications. No inline field errors are displayed in the form itself.

---

## 11. Attachment/Image/Signature Behavior

### Signature Capture (Waybill)

Two signature roles: **sender** and **receiver**.

**Entry points per signature card:**
1. **Upload** — opens native file picker (accepts image files per `IMAGE_ACCEPT_ATTRIBUTE`). File is processed via `processSignature()`, uploaded to Supabase Storage `signatures` bucket, public URL stored in `image_url`.
2. **Draw** — expands an inline canvas DrawPad. Pointer Events unify mouse/touch/pen. Save converts canvas to `dataURL('image/png')`. Stored in `drawn_data_url`.
3. **Pick** (sender only) — opens PickSignatorySheet bottom sheet. Queries `signatories` table. Shows name, role, signature thumbnail. Selecting attaches the signatory's `signature_url` to `image_url`.
4. **Clear** — removes image/drawing, sets `present: false`.
5. **Show/Hide** — toggles visibility of the signature card content area.

**Signature data structure:**
```typescript
{
  present: boolean | null
  description: string
  confidence: string
  image_url: string      // from upload or pick
  drawn_data_url: string // from draw pad
}
```

**Status indicators:** "Captured" (green badge) when image_url or drawn_data_url exists. "Empty" (grey badge) otherwise.

---

## 12. Data Flow / Dependencies

| Interaction | Effect |
|---|---|
| Select waybill type (gateway) | Determines which sections/fields appear (client, PO, invoice link, purpose options) |
| Select transport mode | If "By Hand" or "Courier" → Vehicle Plate field hidden and cleared |
| Select purpose | Stored as enum value |
| Select client (external) | Sets `client_id` and `client_name`. Enables "Link Invoice" button. |
| Link invoice | Stores `linkedInvoiceNumber` in `customFields.references` |
| Edit item description/quantity | Marks form as dirty |
| Change column visibility | Affects which columns render in all item rows. Does NOT mutate item data. |
| Add custom column | New column appears in all item rows. Stored in `customColumns` array. |
| Import JSON | Replaces all waybill fields, items, custom columns, and custom fields from parsed JSON |
| Save | Validates all required fields, builds final custom fields, sets status to `dispatched`, calls `saveWaybill()` |
| Clear custom fields | Column visibility and order reset. Custom columns removed. Custom data on items cleared. |

---

## 13. Responsive Behavior

The form uses a max-width container (`max-w-[780px]`) and adjusts padding:
- Mobile: `px-3` padding
- Small screens+: `px-3 sm:px-4`, `pt-1 sm:pt-2`
- The footer is sticky-bottom with safe-area-inset-bottom support
- Floating save button: `fixed bottom-[calc(...)] right-4 sm:right-8`
- Grid layouts: `grid-cols-2` for field pairs (consistent across breakpoints)
- Line items use responsive grid: `grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5`

No separate mobile/desktop layouts exist — the form is a single responsive layout.

---

## 14. Interaction State Matrix

| Action | State Change |
|---|---|
| Open form (create) | Gateway overlay → type selection → form with empty state |
| Open form (edit) | Direct form load with hydrated data |
| Select type (gateway) | Overlay closes, form renders, waybill number auto-generated |
| Click client button | ClientSelector overlay opens |
| Select client | client_id + client_name set, overlay closes |
| Click "Tap to link invoice" | AttachExistingDocumentSheet opens |
| Select invoice | linkedInvoiceNumber set, overlay closes, success toast |
| Unlink invoice | linkedInvoiceNumber cleared |
| Click "Import" | WaybillImportSheet opens |
| Apply import | All fields/items/columns replaced, overlay closes |
| Click "Settings" | ColumnManager opens + More Settings modal |
| Toggle "Show Terms" | Terms section appears/disappears in form |
| Click "Clear" | AlertDialog opens → confirm → items reset |
| Click "Draw" (signature) | DrawPad expands inline |
| Save drawing | drawn_data_url set, DrawPad collapses |
| Click "Pick" (sender) | PickSignatorySheet opens (bottom sheet) |
| Select signatory | signature_url set on sender, sheet closes |
| Click upload (signature) | Native file picker opens |
| File selected | Uploaded to Supabase Storage, image_url set |
| Clear signature | image_url + drawn_data_url cleared, present = false |
| Save (valid) | Loading state, save call, navigation to view page |
| Save (invalid) | Toast error, invalid row highlighted |
| Before unload (dirty) | Browser confirmation dialog |

---

## 15. Missing/Unclear Behavior

| Item | Status |
|---|---|
| Waybill number prefix behavior | Implementation uses `resolvePrefix(settings?.document_prefixes, 'waybill')` with default 'WBL'. Format: `{prefix}-{I/E}-{6-digit serial}`. UNKNOWN — exact prefix customization UX not visible in form. |
| Signature image processing | `processSignature()` and `dataURItoFile()` from `@/lib/processSignature` — exact processing (resize, compression) UNKNOWN without inspecting that module. |
| PDF template selection on form | `pdfTemplateId` is stored in custom_fields but no UI to select it exists in the current form. Likely set elsewhere (view page or settings). |
| Blank waybill download details | `downloadBlankWaybillTemplate()` from `@/components/waybill/blankWaybillTemplate` — exact PDF layout UNKNOWN without inspecting that module. |

---

## 16. Skills Used

Skills used: NONE (forensic documentation task, not a visual redesign)

Documentation standard: ASD-STE100 Simplified Technical English

---

## 17. Verification

- Source inspected: `WaybillForm.tsx`, `WaybillFormPage.tsx`, `waybillUtils.ts`, `WaybillGatewayOverlay.tsx`, `WaybillImportSheet.tsx`, `WaybillSignatures.tsx`, `waybillContract.ts`, `FormLineItems.tsx`, `FormFooter.tsx`, `ClientSelector.tsx`, `ColumnManager`, `AttachExistingDocumentSheet`
- All fields, overlays, actions, conditional logic, and validation derived from actual code inspection
- No assumptions made about unimplemented features
