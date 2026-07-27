# CsrFormScreen — Full Form Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/components/csr/CsrFormScreen.tsx`  
**Utility types:** `src/components/csr/csrUtils.ts`  
**Parent page:** `src/pages/NewCSR.tsx` / `src/pages/EditCSR.tsx`

---

## 1. Form Structure Overview

The form is a single scrollable page inside a `max-w-md` centered container with `pb-[200px]` for floating button clearance. Sections are rendered using a local `Section` wrapper component. A floating save button is positioned at bottom-right on desktop (fixed), and a `MobileFab` on mobile. An offline indicator bar appears at top when offline.

**Props:**
```ts
mode: 'new' | 'edit'
csr: CsrRecord             // Record<string, any>
csrMeta: CsrMeta           // display settings
materialsRows: MaterialRow[]
saving: boolean
csrNumberReady?: boolean
onUpdate: (field: string, value: any) => void
onUpdateMeta: (field: string, value: any) => void
onUpdateMaterialRow: (index: number, field: string, value: string) => void
onAddMaterialRow: () => void
onRemoveMaterialRow: (index: number) => void
onApplyImport: (result: ParsedCsrImport) => void
onSave: () => void
onDownloadBlank?: () => void
onLockedFieldClick?: (field: 'client' | 'csr_number') => void
```

---

## 2. Section-by-Section Inventory

### SECTION 1: Document Details

**Section dot:** `bg-slate-900`  
**Container:** `rounded-[20px] border border-bd-border bg-bd-surface p-4 shadow[...]`

#### Header block (lines 338–359):
- Shows "New CSR" / "Edit CSR" subtitle
- Shows "Create CSR" / "Update CSR" title (28px, black weight)
- Three-dot menu button (`MoreHorizontal` icon) — no handler wired. **Dead button?** Just renders an empty onClick

#### Field: Client (locked in edit, selectable in new)
- **Location:** Lines 362–388
- **New mode:** `ClientSelector` component — selects client_id, client_name, and auto-fills address from client data (lines 380–388)
- **Edit mode:** Locked display with Lock icon. Click triggers `onLockedFieldClick?.('client')`.
- **Display:** Shows client name or "No client selected"

#### Field: CSR Number
- **Location:** Lines 391–423
- **Type:** Free text input in new mode, locked display in edit mode
- **New mode:** TextInput with `Hash` icon prefix, `font-mono font-bold`
- **Edit mode:** Locked display with `Lock` icon prefix, click triggers `onLockedFieldClick?.('csr_number')`
- **Blur handler:** If user clears the field and blurs, restores `lastGoodCsrNumber` from ref (lines 305–307)
- **Validation:** Must be non-empty for save button to enable (line 316)

#### Field: Date
- **Location:** Lines 425–430
- **Type:** TextInput with `type="date"`
- **Control:** `onUpdate('date', event.target.value)`

#### Field: Customer Name
- **Location:** Lines 431–445
- **New mode:** TextInput (free text)
- **Edit mode:** Locked display with Lock icon, clickable — same field as client locked behavior

#### Field: PO Number
- **Location:** Lines 447–456
- **Type:** TextInput with placeholder "Optional"
- **Control:** `onUpdate('po_number', value)`
- **Side effect:** When po_number is non-empty, automatically sets `show_po = true` (line 452)

---

### SECTION 2: Item Controls

**Section dot:** `bg-slate-700`  
**Container:** Same section wrapper

#### Button: Import
- **Location:** Lines 460–465
- **Action:** Opens `CsrImportSheet`
- **Control:** `setImportSheetOpen(true)`
- **Style:** Full-width button with border, center-aligned text
- **Icon:** None (text only)

---

### SECTION 3: Main Details

**Section dot:** `bg-bd-violet`

#### Field: Call Type
- **Location:** Lines 471–478
- **Type:** `SelectField` component
- **Options:** Breakdown, Preventive Maintenance, Installation, Commissioning, Inspection, Emergency Repair, Other
- **Control:** `onUpdate('call_type', value)`
- **Default:** Empty (placeholder "Select...")
- **CSS:** Rounded select with `--bd-border` styling

#### Field: Service Basis
- **Location:** Lines 479–486
- **Type:** `SelectField` component
- **Options:** Paid Service, AMC, Warranty
- **Control:** `onUpdate('service_basis', value)`

#### Field: System Down
- **Location:** Lines 487–500
- **Type:** `SelectField` component
- **Options:** Yes, No
- **Control:** `onUpdate('system_down', value === 'Yes')` — converts to boolean when Yes
- **Clear behavior:** If value is empty, sets to null: `onUpdate('system_down', null)`

---

### SECTION 4: Equipment

**Section dot:** `bg-slate-600`

#### Field: Equipment Type
- **Location:** Lines 512–518
- **Type:** TextInput

#### Field: Equipment Location
- **Location:** Lines 519–525
- **Type:** TextInput

#### Field: Make
- **Location:** Lines 527–531
- **Type:** TextInput

#### Field: Capacity
- **Location:** Lines 532–538
- **Type:** TextInput

#### Field: Model (label customizable via csrMeta.modelLabel)
- **Location:** Lines 540–545
- **Type:** TextInput
- **Label:** `{csrMeta.modelLabel || 'Model'}`

#### Field: Serial No. (label customizable via csrMeta.serialLabel)
- **Location:** Lines 546–552
- **Type:** TextInput
- **Label:** `{csrMeta.serialLabel || 'Serial No.'}`

#### Field: Engine No
- **Location:** Lines 554–560
- **Type:** TextInput
- **Optional**

---

### SECTION 5: Problem & Service

**Section dot:** `bg-bd-rose`

#### Field: Problem Reported
- **Location:** Lines 572–577
- **Type:** TextArea (min-h 84px)

#### Field: Service Rendered
- **Location:** Lines 578–584
- **Type:** TextArea (min-h 96px)

#### Field: Defects Found
- **Location:** Lines 585–590
- **Type:** TextArea

#### Field: Engineer Remarks
- **Location:** Lines 591–596
- **Type:** TextArea

---

### SECTION 6: Service Execution

**Section dot:** `bg-slate-900`

#### Fields (2-column grid):

| Field | Control | Type |
|-------|---------|------|
| Start Date | `onUpdate('start_date', value)` | type="date" |
| Start Time | `onUpdate('start_time', value)` | type="time" |
| End Date | `onUpdate('end_date', value)` | type="date" |
| End Time | `onUpdate('end_time', value)` | type="time" |

#### Field: Status After Service
- **Location:** Lines 624–630
- **Type:** `SelectField`
- **Options:** Complete, Incomplete, Pending for spares, Under observation, Working solution provided
- **Default:** 'Complete' (from `createDefaultCsr()`)

---

### SECTION 7: Operational Readings

**Section dot:** `bg-amber-500`  
**Toggle button:** "Hide section" / "Show section" via `onUpdateMeta('showOperationalReadings', !val)`

**Conditionally rendered:** Only when `csrMeta.showOperationalReadings` is true

#### Fields (2-column grid):

| Field | Control |
|-------|---------|
| Voltage | `onUpdate('voltage', value)` |
| Frequency | `onUpdate('frequency', value)` |
| Battery | `onUpdate('battery', value)` |
| Temperature | `onUpdate('temperature', value)` |
| Pressure | `onUpdate('pressure', value)` |
| Hours | `onUpdate('hours', value)` |

**Persistence:** Visibility state stored in `CsrMeta`, serialized into `materials_used` column via `__CSR_META_V1__` prefix JSON.

---

### SECTION 8: Materials Used

**Section dot:** `bg-bd-emerald`  
**Title:** Editable text input (line ~649), default "Materials Used"  
**Badge:** Shows "X items" count (filtered to rows with any non-empty field)

#### Material Row fields (per row, 3-column grid):

| Field | Width | Control | Type |
|-------|-------|---------|------|
| Item | 1.4fr | `onUpdateMaterialRow(index, 'item', value)` | TextInput |
| Quantity | 88px | `onUpdateMaterialRow(index, 'quantity', value)` | NumericInput |
| Unit | 86px | `onUpdateMaterialRow(index, 'unit', value)` | UnitInput |

#### Row container: `rounded-[16px] border p-3`

#### Buttons:

| Button | Action | Conditions |
|--------|--------|------------|
| Remove | `onRemoveMaterialRow(index)` | Only visible if `materialsRows.length > 1` |
| Add material | Appends `DEFAULT_MATERIAL_ROW` | Always visible at bottom of section |

**Persistence:** Serialized into `materials_used` text column via `__CSR_META_V1__` + JSON encoding. Contains both `materialsRows` array and `CsrMeta` object.

---

### SECTION 9: Technician

**Section dot:** `bg-sky-500`  
**Toggle button:** "Included" / "Include" via `onUpdateMeta('showTechnicianSignLine', !val)`

**Conditionally rendered:** Only when `csrMeta.showTechnicianSignLine` is true

#### Field: Technician Name
- **Location:** Lines 664–669
- **Type:** TextInput
- **Control:** `onUpdateMeta('technicianName', value)`

#### Field: Technician Signature
- **Location:** Lines 670–686
- **Type:** Signatory selector
- **Display:** Shows selected signatory name or "Leave blank for offline sign."
- **Buttons:**
  - "Choose signatory" / "Change signatory" — opens bottom sheet with all signatories from DB
  - "Leave blank" — sets `technician_signatory_id` to null

**Data source:** `supabase.from('signatories').select('*')` loaded in useEffect (lines 323–330)

---

### SECTION 10: Acknowledgement

**Section dot:** `bg-slate-900`  
**Toggle button:** "Included" / "Include" via `onUpdateMeta('showAcknowledgement', !val)`

**Conditionally rendered:** Only when `csrMeta.showAcknowledgement` is true

#### Field: Recipient Name/Title
- **Location:** Lines 698–703
- **Type:** TextInput
- **Control:** `onUpdate('acknowledgement_name', value)`

#### Field: Comment
- **Location:** Lines 704–709
- **Type:** TextArea
- **Control:** `onUpdate('customer_feedback', value)`

#### Field: Recipient Signature — FILE UPLOAD
- **Location:** Lines 711–748
- **Type:** Hidden `<input type="file">` with `accept={IMAGE_ACCEPT_ATTRIBUTE}`
- **File validation:** `isSupportedImageFile(file)` — shows error toast for unsupported types
- **Processing:** `FileReader.readAsDataURL(file)` → stores as data URI
- **Control:** `onUpdate('recipient_signature_uri', reader.result as string)`
- **Display:** Shows file name or "Leave blank for offline sign."
- **Buttons:**
  - "Upload signature" — opens file picker
  - "Leave blank" — clears recipient_signature_uri and file input value
- **KNOWN ISSUE:** `recipient_signature_uri` is NOT a valid DB column. `sanitizeCsrInsertPayload()` in `csrService.ts` strips it on every save. **Signature is silently discarded.**

---

## 3. Floating Controls

### Offline Indicator
- **Location:** Lines 744–748
- **Behavior:** Fixed top bar (mobile) or bottom bar (desktop) with amber background
- **Display:** "You are offline — save is disabled" with pulsing dot

### Desktop Floating Save Button
- **Location:** Lines 750–768
- **Position:** `fixed bottom-6 right-6`
- **Controls:** Two buttons side by side:
  - **Download blank CSR** (if `onDownloadBlank` prop provided): Download icon, white background with primary border
  - **Save:** Save icon (or spinner when saving), primary background
- **Disabled when:** `saveDisabled` is true

### Mobile Floating Save (MobileFab)
- **Location:** Lines 770–776
- **Component:** `MobileFab` with `sm:hidden`
- **Same saveDisabled logic**

---

## 4. Modals / Sheets

| Sheet | Open State | Content |
|-------|-----------|---------|
| Signatory chooser | `signatorySheetOpen` | Scrollable list of signatories from DB with active state highlight |
| Import sheet | `importSheetOpen` | `CsrImportSheet` component for JSON import |

Both rendered at the bottom of the component tree.

---

## 5. State Variables (local to component)

| State Variable | Type | Initial | Purpose |
|---------------|------|---------|---------|
| `signatories` | `SignatoryRow[]` | `[]` | Loaded from DB on mount |
| `signatorySheetOpen` | `boolean` | `false` | Signatory picker sheet |
| `importSheetOpen` | `boolean` | `false` | Import sheet |
| `clientPickerOpen` | `boolean` | `false` | Client selector sheet (new mode only) |
| `materialsTitle` | `string` | `'Materials Used'` | Editable section title |
| `recipientSignatureName` | `string` | `''` | Display name for uploaded recipient signature file |
| `isOnline` | `boolean` | `navigator.onLine` | Network status tracking |
| `lastGoodCsrNumber` | `Ref<string>` | empty string | Stores last valid CSR number for auto-restore on blur |

---

## 6. Effects

| Effect | Trigger | Behavior |
|--------|---------|----------|
| Load signatories | `mount` | Fetches all signatories from Supabase (lines 323–330) |
| Track online/offline | `mount` | Listens for `online`/`offline` events, updates `isOnline` (lines 291–298) |
| Save last good CSR number | `csr.csr_number` change | Updates `lastGoodCsrNumber.current` ref (lines 301–303) |

---

## 7. Validation

**No field-level validation.** The only validation is the save button disable logic (line ~316):
```ts
const saveDisabled = saving || !isOnline || !csrNumberReady || !String(csr.csr_number || '').trim()
```

- `saving` — prevents double-save
- `!isOnline` — requires online connection
- `!csrNumberReady` — waits for CSR number generation
- `!csr.csr_number.trim()` — requires non-empty CSR number

**No per-field error messages, no invalid-field highlighting, no required-field checks beyond CSR number.**

---

## 8. Save Behavior (via onSave prop)

The form calls `onSave()` when save button is clicked. The actual save logic lives in the parent page (`NewCSR.tsx` / `EditCSR.tsx` — not inspected). The service layer (`csrService.ts`) does:

1. `sanitizeCsrInsertPayload()` — strips any key not in `CSR_TABLE_COLUMNS`
2. Upserts to `csrs` table with retry logic (3 attempts, exponential backoff for timeouts)
3. Fire-and-forget audit: `recordAuditLog` (CREATE/UPDATE) + `recordCsrCreated` or `recordCsrStatusChanged`
4. On create: returns `{ id, csr_number }`
5. On update: returns `void`
