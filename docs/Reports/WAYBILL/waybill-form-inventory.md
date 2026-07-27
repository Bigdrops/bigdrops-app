# WaybillForm — Full Form Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/components/waybill/WaybillForm.tsx`  
**Utility types:** `src/components/waybill/waybillUtils.ts`  
**Contracts:** `src/domain/waybill/contracts/waybillContract.ts`  
**Parent page:** `src/pages/WaybillFormPage.tsx`

---

## 1. Form Structure Overview

The form is a single-page scrollable layout. Sections are rendered sequentially inside a `max-w-[780px]` centered container. A fixed `FormFooter` is pinned at the bottom. The form receives a `type` prop (`'internal' | 'external'`) that cannot change after mount.

**Props:**
```
type: WaybillType
onSave: (data: WaybillFormData) => Promise<void>
onClose: () => void
initialData?: Partial<WaybillFormData>
waybillNumber?: string
loadingNumber?: boolean
```

**Internal state container:** `WaybillFormData` (line 31)
```ts
{ waybill: Waybill, items: WaybillItem[], customColumns: WaybillCustomColumn[], customFields: WaybillCustomFields }
```

---

## 2. Section-by-Section Inventory

### SECTION 1: Waybill Header

**SectionLabel:** "Waybill Header" (color: indigo)  
**Container:** `rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] p-6`

#### Field: Type badge (read-only display)
- **Location:** Line 283
- **Type:** Inline badge with colored dot
- **Values:** "EXTERNAL DELIVERY NOTE" (primary color) or "INTERNAL TRANSFER NOTE" (warning color)
- **Behavior:** Derived from `type` prop. Never changes after mount.
- **CSS:** `--bd-primary` for external, `--bd-warning` for internal

#### Field: Client (external only)
- **Location:** Lines 290–310
- **Type:** Button that opens `ClientSelector` sheet
- **Control:** `clientPickerOpen` / `setClientPickerOpen`
- **Display:** Client name or "Select a client" placeholder
- **Icon:** `BriefcaseBusiness`
- **Behavior:** On client selection: updates `waybill.client_id` and `waybill.client_name`
- **Validation:** Required for external type (enforced on save, line 210)
- **CSS:** Dashed border, hover turns indigo

#### Field: Waybill Number
- **Location:** Lines 315–322
- **Type:** `MobileTextField` with `font-mono` class
- **Control:** `updateWaybill('waybill_number', value)`
- **Disabled:** When `loadingNumber` is true
- **Behavior:** In create mode, auto-populated from `waybillNumber` prop via useEffect (lines 107–111). User can manually override.

#### Field: P.O. Number (external only)
- **Location:** Lines 323–329
- **Type:** `MobileTextField`
- **Control:** `updateWaybill('po_number', value)`
- **Conditionally rendered:** Only in grid when `type === 'external'` (line 307)
- **Default:** Empty string

#### Field: Date
- **Location:** Lines 335–342
- **Type:** `MobileTextField` with `type="date"`
- **Control:** `updateWaybill('date', value)`
- **Validation:** Required (enforced on save, line 219)
- **Default:** Today from `createDefaultWaybill()`

#### Field: Time
- **Location:** Lines 343–350
- **Type:** `MobileTextField` with `type="time"`
- **Control:** `updateWaybill('time', value)`
- **Optional:** No validation

#### Field: Linked Invoice (external only)
- **Location:** Lines 355–395
- **Type:** Button or info card
- **Control:** Opens `AttachExistingDocumentSheet`
- **Behavior:**
  - If `customFields.references.linkedInvoiceNumber` is set → shows linked invoice number with X button to unlink
  - Otherwise → shows "Tap to link an invoice" button
  - Button disabled if no `client_id` selected ("Select a client first")
- **On attach:** Updates `customFields.references.linkedInvoiceNumber`
- **CSS:** Dashed border card, disabled state at 50% opacity
- **Icon:** `FileText`

---

### SECTION 2: Transport Details

**SectionLabel:** "Transport Details" (color: amber)  
**Container:** `rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] p-6`

#### Field: Transport Mode
- **Location:** Lines 408–425
- **Type:** `CompactSelectField` inside `MobileField`
- **Control:** `updateWaybill('transport_mode', value)`
- **Options:** 'By Vehicle', 'By Hand', 'Courier', 'Blank' (maps to empty string)
- **Default:** 'By Vehicle' (from `createDefaultWaybill()`)
- **Side effect:** Selecting 'By Hand' or 'Courier' clears `vehicle_plate` (lines 417–419)
- **CSS:** Uses `--bd-text-muted` label

#### Field: Purpose
- **Location:** Lines 426–439
- **Type:** `CompactSelectField` inside `MobileField`
- **Control:** `updateWaybill('purpose', value)` — null when 'Blank'
- **Options (external):** Supply, Return, Repair, Other, Blank
- **Options (internal):** Transfer, Repair, Other, Blank
- **Default:** null (Blank)
- **CSS:** Full-width select

#### Field: Vehicle Plate
- **Location:** Lines 442–449
- **Type:** `MobileTextField` with `font-mono uppercase` class
- **Control:** `updateWaybill('vehicle_plate', value)`
- **Conditionally rendered:** Hidden when `transport_mode` is 'By Hand' or 'Courier' (line 441)
- **Optional**

#### Field: Driver Name
- **Location:** Lines 450–456
- **Type:** `MobileTextField`
- **Control:** `updateWaybill('driver_name', value)`
- **Always visible**
- **Optional**

---

### SECTION 3: Line Items

**Component:** `FormLineItems` (from `@/components/document/FormLineItems`)  
**Location:** Lines 464–482

#### Fields per item row:
| Column Key | Default Label | Default Visible | Control |
|------------|--------------|-----------------|---------|
| `description` | Description | Yes | `updateItem(index, 'description', value)` |
| `quantity` | Qty | Yes | `updateItem(index, 'quantity', value)` |
| `unit` | Unit | Yes | `updateItem(index, 'unit', value)` |
| `make` | Make | No | `updateCustomItemField(index, 'make', value)` |
| `partNo` | Part No | No | `updateCustomItemField(index, 'partNo', value)` |
| `condition` | Condition | No | `updateItem(index, 'condition', value)` |

Custom columns: up to 4, stored in `custom_data` via `updateCustomItemField(index, key, value)`.

#### Buttons:

| Button | Action | Handler | Notes |
|--------|--------|---------|-------|
| Add Item | Adds blank row | `addItem()` | Appends `createDefaultItem()` to items array |
| Remove Item | Removes row at index | `removeItem(index)` | If last item, replaces with blank default instead of removing |
| Move Up | Moves item up one position | `moveItem(index, -1)` | Swaps array positions |
| Move Down | Moves item down one position | `moveItem(index, 1)` | Swaps array positions |
| Insert After | Inserts blank row after index | `insertItemAfter(index)` | Splices into items array |
| Clear All | Resets to single blank row | `handleClearAll()` | Sets items to `[createDefaultItem()]` |
| Import | Opens WaybillImportSheet | `setShowImportSheet(true)` | Lazy-loaded, parses JSON via adapter |
| Table Settings | Opens ColumnManager | `setShowTableSettings(true)` | Opens ColumnManager + "More Settings" modal |

#### Column Manager (modal overlay):
- Controlled by `columnVisibility` (Record<string, boolean>)
- Controlled by `columnTitles` (Record<string, string> — editable labels)
- Controlled by `columnOrder` (string[] — drag-to-reorder)
- Custom column add: up to `WAYBILL_COLUMN_LIMIT` (4), auto-generates label "Custom Column 2/3/..."
- Custom column remove: deletes key from `custom_data` on all items
- Reset: restores defaults for all columns and wipes all custom columns

#### More Settings modal (separate popup):
- Toggle: "Show Terms & Conditions" — controls `showTermsInTableSettings` state
- When enabled: shows another CollapseCard for Terms & Conditions RichTextEditor
- Terms text is stored in local `terms` state — **not persisted to DB**

---

### SECTION 4: Custody Details

**SectionLabel:** "Custody Details" (color: indigo)  
**Container:** 2-column grid inside section div

#### Field: Delivered By
- **Location:** Line 486
- **Type:** `MobileTextField`
- **Control:** `updateWaybill('sender_name', value)`
- **Required:** DB has NOT NULL constraint, but form allows empty

#### Field: Received By
- **Location:** Line 487
- **Type:** `MobileTextField`
- **Control:** `updateWaybill('receiver_name', value)`
- **Required:** DB has NOT NULL constraint, form requires for internal type (validation line 213)

#### Field: Delivery Location / Movement Route
- **Location:** Lines 488–496
- **Type:** `MobileTextField` with dynamic label and placeholder
- **Control:** `updateWaybill('delivery_location', value)`
- **Label:** "DELIVERY LOCATION" (external) or "MOVEMENT ROUTE / DESTINATION" (internal)
- **Placeholder:** Changes based on type

---

### SECTION 5: Signatures

**Component:** `SignaturesSection` from `./WaybillSignatures`  
**Location:** Lines 499–502  
**Props:** `customFields`, `updateCustomFields`

Two signature cards rendered:

#### Signature Card: "Delivered By" (sender)
- **Role:** `'sender'`
- **showPickButton:** true
- **Actions:** Upload, Draw, Pick from signatory table, Clear
- **Upload:** Validates file via `isSupportedImageFile`, processes via `processSignature()`, uploads to `supabase.storage.from('signatures')`, sets `image_url`
- **Draw:** Canvas drawing pad with Pointer Events (mouse/touch/pen), saves as `drawn_data_url` (data URI)
- **Pick:** Opens `PickSignatorySheet`, queries signatories table, sets `image_url` from stored signature

#### Signature Card: "Collected By" (receiver)
- **Role:** `'receiver'`
- **showPickButton:** false (no signatory picker for receiver)
- **Actions:** Upload, Draw, Clear
- **Same upload/draw behavior as sender**

#### Section header:
- Shows "Signatures" badge with `--bd-emerald` styling
- Shows counter: "X of 2 captured"

---

### SECTION 6: Notes

**Component:** `CollapseCard`  
**Icon:** `ScrollText`  
**Location:** Lines 505–526  
**Toggle:** `showNotes` state

#### Field: Notes Title
- **Type:** Free text input
- **Control:** `setNotesTitle(value)` (local state only)
- **Default:** "Notes"
- **Behavior:** Allows customizing the collapsible card title

#### Field: Notes Content
- **Type:** `RichTextEditor` (lazy-loaded via Suspense)
- **Control:** `updateWaybill('notes', value)` — writes to `waybill.notes`
- **Persisted:** Yes — part of the Waybill payload

---

### SECTION 7: Terms & Conditions

**Component:** `CollapseCard`  
**Location:** Lines 529–538  
**Conditionally rendered:** Only when `showTermsInTableSettings` is enabled  
**Toggle:** `showTerms` state

#### Field: Terms & Conditions Content
- **Type:** `RichTextEditor` (lazy-loaded)
- **Control:** Local `setTerms(value)` — local state only
- **Persisted:** **No** — `terms` is not included in the save payload

---

## 3. Footer and Overlays

### FormFooter
- **Component:** `FormFooter`
- **Location:** Line 541
- **Buttons:** Cancel (calls `onClose`), Save (calls `handleSave`)
- **Behavior:** `onSaveDraft` and `onSaveSent` both call `handleSave`. `primaryLabel` = "Save Waybill".
- **State:** `saving` prop disables buttons and shows loading

### Overlays (hidden behind state booleans):

| Overlay | Trigger | State Control |
|---------|---------|---------------|
| ClientSelector | Client field button | `clientPickerOpen` |
| AttachExistingDocumentSheet | "Link Invoice" button | `invoiceSheetOpen` |
| ColumnManager | "Table Settings" button | `showTableSettings` |
| More Settings modal | Through ColumnManager | `showTableSettings` (same state) |
| WaybillImportSheet | "Import" button | `showImportSheet` |

---

## 4. State Summary

| State Variable | Type | Initial Value | Purpose |
|---------------|------|---------------|---------|
| `state` | `WaybillFormData` | `createInitialState(...)` | Core form data |
| `saving` | `boolean` | `false` | Save in progress |
| `dirty` | `boolean` | `false` | Unsaved changes flag |
| `invalidRowIndex` | `number \| null` | `null` | Highlight invalid row |
| `clientPickerOpen` | `boolean` | `false` | Client selector sheet |
| `showTableSettings` | `boolean` | `false` | Column manager + settings modal |
| `showImportSheet` | `boolean` | `false` | Import sheet |
| `invoiceSheetOpen` | `boolean` | `false` | Link invoice sheet |
| `columnVisibility` | `Record<string, boolean>` | From initialData or defaults | Toggle columns |
| `columnTitles` | `Record<string, string>` | Standard labels | Editable column labels |
| `columnOrder` | `string[]` | Standard column keys | Column ordering |
| `showNotes` | `boolean` | `false` | Notes collapsible |
| `showTerms` | `boolean` | `false` | Terms collapsible |
| `terms` | `string` | `''` | Terms text (NOT saved) |
| `notesTitle` | `string` | `'Notes'` | Notes card title (NOT saved) |
| `showTermsInTableSettings` | `boolean` | `false` | Enable terms section |

---

## 5. Effects

| Effect | Trigger | Behavior |
|--------|---------|----------|
| Set waybillNumber from prop | `waybillNumber` prop change | Updates `state.waybill.waybill_number` if currently empty (lines 107–111) |
| beforeunload warning | `dirty` state | Prevents accidental navigation when form has unsaved changes (lines 257–264) |

---

## 6. Validation Rules (in handleSave, lines 207–236)

| Condition | Error Message |
|-----------|---------------|
| `type === 'external'` and no `client_id` | "Client account must be selected for external waybills." |
| `type === 'internal'` and no `receiver_name.trim()` | "Recipient name is required for internal waybills." |
| No `waybill_number` | "Waybill number is missing or invalid." |
| No `date` | "Date is required." |
| `items.length === 0` | "Line items list cannot be empty." |
| Any item has no `description` or `quantity <= 0` | "Item {i+1} is missing a description or has quantity ≤ 0." — also sets `invalidRowIndex` for 2.5s |

---

## 7. Mutation Behavior (saveWaybill in waybillMutations.ts)

On save:
1. Validates client_id (external), waybill_number, items presence, item quality
2. Enforces `assertNoExtensionFieldsOutsideCustomData` on every item
3. Generates waybill number if creating (with retry via `withUniqueRetry`)
4. Strips empty strings to null for: time, client_id, project_id, invoice_id, created_by
5. Sets status to `normalizeWaybillStatus(waybill.status)` — maps 'draft' → 'dispatched'
6. Persists to Supabase
7. Invalidates list cache (`bd:list:waybills:v1:all`)
8. Fire-and-forget audit: `recordAuditLog` (CREATE/UPDATE) + `recordWaybillCreated` or `recordWaybillStatusChanged`
