# ViewCSR — Page Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/pages/ViewCSR.tsx`
**Actions file:** `src/pages/viewCSRActions.ts`
**Document preview:** `src/components/document-view/csr/CsrDocumentPreview.tsx`
**View page:** `src/components/document-view/csr/CsrViewPage.tsx`
**DB migration:** `supabase/migrations/20260520090004_csrs.sql`, `supabase/migrations/20260620000001_add_csr_engine_no.sql`

---

## 1. Page Structure Overview

`ViewCSR` is a self-contained page that fetches its own data directly (no dedicated hook), manages all state and handlers inline, and renders through shared `DocumentPage` components. Unlike ViewInvoice which uses a separate actions hook, ViewCSR defines all handlers directly in the component body.

### Layout Structure

```
DocumentPage
├── DocumentTopNav (back, share, customize [SVG palette], more)
├── CsrPrimaryActions (Mark as Completed, Edit, Download)
├── DocumentHero (eyebrow, title, subtitle, status pill, meta via CsrHeroMeta)
├── CsrViewPage
│   ├── CsrSummaryStrip (3 metric cells)
│   └── DocumentSection "Service report content"
│       └── CsrDocumentPreview
├── FloatingDownloadButton
└── Overlays
    ├── DocumentSheet — Customize CSR PDF
    │   ├── CsrTemplateCarousel
    │   ├── Ink Color switch + swatches + hex input
    │   └── Handwriting Font switch + font selection buttons
    ├── CsrMoreSheet
    │   ├── Lifecycle: Mark as In Progress, Mark as Completed, Reopen Record
    │   ├── Links & Attachments: Link to Project, Duplicate
    │   ├── Document: Copy CSR Number, Export Document
    │   └── Danger: Archive Record, Delete Record
    ├── DocumentConfirmDialog — Complete
    ├── DocumentConfirmDialog — Archive
    ├── DocumentConfirmDialog — Delete
    └── ProjectLinkDialog
```

---

## 2. Data Loading

All data is fetched directly in the component's `loadCsr` async function inside a `useEffect`:

### Queries Executed

1. **`supabase.from('csrs').select('*').eq('id', id).single()`** — Main CSR record
2. **`supabase.from('signatories').select('*')`** — All signatories (not just CSR-specific ones)
3. **`supabase.from('clients').select('address, city, state').eq('id', data.client_id).single()`** — Only if client_id exists, only address fields

### State Variables (15 total)

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| `loading` | `boolean` | `true` | Initial data load |
| `csr` | `any\|null` | `null` | Row from `csrs` table |
| `signatories` | `array` | `[]` | All signatories |
| `client` | `any\|null` | `null` | Client address subset |
| `downloading` | `boolean` | `false` | PDF download in progress |
| `archiving` | `boolean` | `false` | Archive in progress |
| `deleting` | `boolean` | `false` | Delete in progress |
| `duplicating` | `boolean` | `false` | Duplicate in progress |
| `updatingStatus` | `boolean` | `false` | Status update in progress |
| `template` | `string` | `getStoredTemplate()` | Selected template ID (default `'3'`) |
| `customFont` | `'auto' \| PdfFillableFontChoice` | `getStoredCustomFont()` | Handwriting font selection |
| `customColor` | `'auto' \| string` | `getStoredCustomColor()` | Ink color selection |
| `projectLinkOpen` | `boolean` | `false` | Project link dialog |
| `comments` | `string` | `''` | Comments for PDF (rendered on PDF but not visible in UI) |

### Stored Preferences (localStorage)

| Key | Default | Type |
|-----|---------|------|
| `csr_view_template` | `'3'` | string (persisted on change) |
| `csr_custom_font_stash` | `'auto'` | string — PdfFillableFontChoice or 'auto' |
| `csr_custom_color_stash` | `'auto'` | string — hex color or 'auto' |

### Old localStorage Migration

At startup, reads old keys `csr_custom_font` and `csr_custom_color`, migrates to `bigdrops_pdf_customization_csr` (the canonical key used by `usePdfCustomization`), deletes old keys, and reloads the page. Only runs if the new key doesn't already exist.

---

## 3. Models & Computations

### previewData

**Source:** `buildCsrPreviewData(csr, { signatories, client })` from `@/components/csr/csrUtils.ts`
**Trigger:** When `csr` changes
**Output:** `CsrRenderModel` — enriched CSR data with address fields, client details, etc.

### branding

**Source:** `getCsrBranding(settings)` from `@/components/csr/csrUtils.ts`
**Trigger:** When settings change
**Output:** Branding object from settings

### designPreset

**Source:** `bridgeToDesignPreset(getPdfDesignPreset('csr'), customization)` from `@/domain/pdf/customization/csr.ts`
**Trigger:** When customization changes
**Output:** Design preset for CSR PDF

### documentTotals (docProps)

Computed inline in the render section:
```ts
const docProps: BaseDocument = {
  id: csr.id,
  number: csr.csr_number,
  title: 'Customer Service Report',
  status: (csr.status || 'in_progress') as any,
}
```

### metrics

Inline computed:
```ts
const metrics = [
  { label: 'Equipment', value: csr.equipment_type || 'N/A' },
  { label: 'Date', value: csr.date || 'N/A', tone: 'amber' },
  { label: 'Status', value: csr.status || 'in_progress', tone: csr.status === 'completed' ? 'green' : 'amber' },
]
```

---

## 4. View Components

### 4.1 DocumentTopNav

**File:** `src/components/document-view/shared/DocumentTopNav.tsx`

| Action | Type | Handler |
|--------|------|---------|
| Back | ChevronLeft | `navigate('/csr')` |
| Share | Share2 icon | `handleShare()` (uses `shareDocument()`) |
| Customize | SVG palette icon (custom JSX) | Opens `SHEET_CUSTOMIZE` |
| More | Scatter dots SVG icon | Opens `SHEET_MORE` |

### 4.2 CsrPrimaryActions

**File:** `src/components/document-view/csr/CsrPrimaryActions.tsx`

| Button | Style | Handler |
|--------|-------|---------|
| Mark as Completed | Primary (bg-bd-button-primary-bg) | Opens MODAL_COMPLETE |
| Edit | Outline (border-bd-brand) | Navigates to `/csr/edit/{id}` |
| Download | Icon button (border-bd-border) | `handleDownload()` — shows spinner while downloading |

### 4.3 DocumentHero

**File:** `src/components/document-view/shared/DocumentHero.tsx`

- `eyebrow`: `"Customer Service Report"`
- `title`: `csr.csr_number`
- `subtitle`: `csr.client_name || 'No client specified'`
- `status`: Mapped to pill class via `statusClassNameMap` (partial → partial, paid → paid, unpaid → unpaid, open → draft, converted → paid, others → default)
- `meta`: `<CsrHeroMeta threadTag={csr.make || 'General Service'} />`

### 4.4 CsrHeroMeta

**File:** `src/components/document-view/csr/CsrHeroMeta.tsx`

Shows a thread tag with an SVG "curved arrow" icon. Props: `threadTag` (string).

### 4.5 CsrSummaryStrip

**File:** `src/components/document-view/csr/CsrSummaryStrip.tsx`

3 metric cells using CSS modules. Supports 6 tone classes: amber, green, blue, purple, red, and default.

| Cell | Value | Tone |
|------|-------|------|
| Equipment | `csr.equipment_type \|\| 'N/A'` | default |
| Date | `csr.date \|\| 'N/A'` | amber |
| Status | `csr.status \|\| 'in_progress'` | green (if completed) / amber |

### 4.6 CsrViewPage

**File:** `src/components/document-view/csr/CsrViewPage.tsx`

Simple layout wrapper:
```
CsrSummaryStrip
DocumentSection "Service report content"
  → CsrDocumentPreview (or deprecated preview prop)
  → activityHistory (CsrActivityCard)
```

Props: `document` (BaseDocument), `metrics` (CsrMetric[]), `documentPreview` (ReactNode), `activityHistory` (ReactNode), `onDuplicate`, `onCopyNumber`.

Note: `onDuplicate` and `onCopyNumber` are accepted props but **not used** in the component body — they are dead props passed but ignored.

### 4.7 CsrDocumentPreview

**File:** `src/components/document-view/csr/CsrDocumentPreview.tsx`

Renders a full document preview with:
- Company header area (logo, company name, address)
- Document ID block: "SERVICE REPORT" label, CSR number, status
- Meta grid: Service Date, Client, Client Details (address/phone/email), Call Type, Service Basis, Equipment/Asset
- Narrative sections: Problem Reported, Service Rendered, Defects Found
- Materials Used section (renders `materialsRows` parsed from preview data)
- Engineer Remarks, Customer Feedback
- Signature grid: "Technician Sign & Date" + "Client Acknowledgement" boxes

Uses `.css` file (`CsrDocumentPreview.css`) and `.module.css` (`CsrDocumentPreview.module.css`) for styling.

### 4.8 CsrActivityCard

**File:** `src/components/document-view/csr/sections/ActivityCard.tsx`

- Initially closed (isOpen = false)
- Uses `useAuditTrail({ entityType: "csr", entityId, enabled: isOpen })` — lazy loaded
- Same rendering as Invoice ActivityCard but with entityType "csr"
- Reuses CSS module from `../../invoice/InvoiceWorkspace.module.css`

---

## 5. Overlays (Sheets & Dialogs)

### 5.1 Customize CSR PDF Sheet

**File:** Inline JSX in `ViewCSR.tsx` (rendered inside `DocumentSheet`)

**3 sections:**

**Section 1: Template Selection**
- `CsrTemplateCarousel` component
- `value={template}`, `onChange={(next) => setTemplate(next)}`

**Section 2: Ink Color**
- Toggle switch (on = custom, off = 'auto')
- Color swatches: `['#000000', '#374151', '#1e3a5f', '#064e3b', '#7f1d1d']`
- Hex input field (`Input` component, monospace font)
- When toggled on, defaults to `CSR_TEMPLATE_DEFAULTS[template]?.color || '#0f172a'`
- **Note:** The switch toggle uses `onCheckedChange` AND `onClick` on parent div with `e.stopPropagation()`. This dual handling could cause double-firing.

**Section 3: Handwriting Font**
- Toggle switch (on = custom, off = 'auto')
- 6 font options: Reenie Beanie, Caveat, Kalam, Patrick Hand, Handlee, Sue Ellen Francisco
- Font button shows active state with ring
- When toggled on, defaults to 'Caveat'

**Save Button:**
- Persists `template`, `customFont`, `customColor` to localStorage
- Calls `ui.closeSheet()`
- Shows success toast

### 5.2 CsrMoreSheet

**File:** `src/components/document-view/csr/CsrMoreSheet.tsx`

| Section | Item | Handler |
|---------|------|---------|
| Lifecycle | Mark as In Progress | `handleUpdateStatus('in_progress', 'Marked In Progress')` |
| Lifecycle | Mark as Completed | Opens MODAL_COMPLETE |
| Lifecycle | Reopen Record | `handleUpdateStatus('in_progress', 'Record Reopened')` |
| Links & Attachments | Link to Project | `setProjectLinkOpen(true)` |
| Links & Attachments | Duplicate | `handleDuplicate()` |
| Document | Copy CSR Number | `handleCopyNumber()` |
| Document | Export Document | `handleDownload()` |
| Danger | Archive Record | Opens MODAL_ARCHIVE |
| Danger | Delete Record | Opens MODAL_DELETE |

Each item has inline SVG icons. Items use `onClick` + `onClose()` inside the button handler.

### 5.3 DocumentConfirmDialogs (3 instances)

| Modal | Title | Confirm Label |
|-------|-------|---------------|
| MODAL_COMPLETE | "Close Service Record?" | "Mark as Completed" |
| MODAL_ARCHIVE | "Archive CSR?" | "Archive" |
| MODAL_DELETE | "Delete CSR?" | "Delete" (destructive) |

### 5.4 ProjectLinkDialog

**File:** `src/components/document/ProjectLinkDialog.tsx`

`tableName="csrs"`, `recordId={id}`, `documentLabel={docProps.number}`.

---

## 6. Actions & Handlers

All handlers are defined as async functions directly in `ViewCSR.tsx`:

| Handler | Purpose | Service Layer | Side Effects |
|---------|---------|--------------|--------------|
| `handleCopyNumber()` | Copy CSR number | `navigator.clipboard.writeText()` | Toast feedback |
| `handleShare()` | Share document | `shareDocument()` from shared module | Toast feedback |
| `handleDownload()` | Download CSR PDF | `downloadPdfFromElement()` + `getCsrPdfDocument()` | Sets downloading state |
| `handleUpdateStatus(status, label)` | Update CSR status | `updateCSRStatus()` from `viewCSRActions.ts` | DB write, UI state update, toast |
| `handleDuplicate()` | Clone CSR record | `duplicateCSRRecord()` from `viewCSRActions.ts` | DB write, navigate to new CSR |
| `handleArchive()` | Archive CSR | `archiveCSRRecord()` from `viewCSRActions.ts` | DB write, navigate to /csr |
| `handleDelete()` | Delete CSR | `deleteCSRRecord()` from `viewCSRActions.ts` | DB write, navigate to /csr |

### Action service functions in `viewCSRActions.ts`

**File:** `src/pages/viewCSRActions.ts`

| Function | Purpose |
|----------|---------|
| `archiveCSRRecord(id)` | Sets `archived_at` to current timestamp |
| `deleteCSRRecord(id)` | Deletes row from `csrs` table |
| `updateCSRStatus(id, status)` | Updates `status` column |
| `duplicateCSRRecord(id)` | Fetches original, strips identity fields, regenerates number via `withUniqueRetry` |

### PDF Generation Pipeline

`handleDownload()` flow:
1. `buildCsrPreviewData(csr, { signatories, client })` → preview data
2. `getCsrBranding(settings)` → branding
3. `getCsrPdfDocument({ csr: previewData, comments, branding, template, designPreset })` → React-PDF element
4. `downloadPdfFromElement({ fileName: previewData.csr_number, subdirectory: 'csr', element })` → triggers download

---

## 7. Customization Engine

**File:** `src/domain/pdf/customization/csr.ts`

### Constants

| Constant | Value |
|----------|-------|
| `CSR_CAPABILITIES` | Defines what can be customized (inkFont, inkColour) |
| `CSR_POLICY` | Customization policy rules |
| `CSR_STATIC_DEFAULTS` | Default values for templates |

### Template Defaults

```ts
const CSR_TEMPLATE_DEFAULTS: Record<string, { font: PdfFillableFontChoice; color: string }> = {
  '2': { font: 'Caveat', color: '#0f172a' },
  '3': { font: 'Patrick Hand', color: '#3b82f6' },
  '4': { font: 'Handlee', color: '#1e293b' },
}
```

`bridgeToDesignPreset(basePreset, customization)` merges the customization into the base design preset.

### `usePdfCustomization` hook

**File:** `src/domain/pdf/customization/hooks.ts` (inferred from import path)

Manages `customization` state, `setInkFont`, `setInkColour`, `resetCustomization`.

### Font Sync Effects

Two `useEffect` hooks sync `customFont` and `customColor` to the engine:

```ts
// customFont sentinel → engine
useEffect(() => {
  const defaults = CSR_TEMPLATE_DEFAULTS[template] || CSR_TEMPLATE_DEFAULTS['3']
  setInkFont(customFont === 'auto' ? defaults.font : customFont)
}, [customFont, template])

// customColor sentinel → engine
useEffect(() => {
  const defaults = CSR_TEMPLATE_DEFAULTS[template] || CSR_TEMPLATE_DEFAULTS['3']
  setInkColour(customColor === 'auto' ? defaults.color : customColor)
}, [customColor, template])
```

---

## 8. Known Issues / Observations

1. **`onDuplicate` and `onCopyNumber` are dead props on `CsrViewPage`** (`CsrViewPage.tsx` lines 29–30): The component accepts both props but never uses them. They are handled through `CsrMoreSheet` instead.

2. **No dedicated data hook**: Unlike ViewInvoice which uses `useInvoiceDetailData`, ViewCSR fetches data directly. There's no offline cache fallback, no refresh mechanism exposed to child components.

3. **Comments state** (`ViewCSR.tsx` line 92): `comments` state is initialized as `''` and passed to `getCsrPdfDocument`, but there is no UI element to edit comments. This is a state variable with no user-facing input — effectively dead or ready for future feature.

4. **`handleCopyNumber` does not close the More sheet**: The handler calls `navigator.clipboard.writeText()` and shows a toast, but does not call `ui.closeSheet()`. However, `CsrMoreSheet`'s Action component auto-closes the sheet via `onClick()` → `onClose()` wrapping.

5. **No ActivityCard in CsrMoreSheet sections**: The "Activity & History" section is rendered directly inside `CsrViewPage` (not as an overlay), unlike Invoice which has it in the operational sections.

6. **`archived_at` is set to current timestamp on archive** (`viewCSRActions.ts` line 5): Unlike delete which truly removes the row, archive only sets the timestamp.

7. **`duplicateCSRRecord` strips identity fields** (`viewCSRActions.ts` lines 39–47): Clears `id`, `created_at`, `updated_at`, `csr_number`, `client_id`, `client_name`, `project_id`, `linked_invoice_id`, `acknowledgement_name`. Everything else (equipment details, materials, narrative fields) is preserved.

8. **No `getNextCsrNumber()` call in ViewCSR**: Unlike WaybillForm which calls numbering inside the form, ViewCSR uses duplicate to generate numbers. The CSR number is set during creation and displayed as read-only on the view page.

9. **Template defaults only defined for IDs '2', '3', '4'**: If template is '1' or any other value, it falls back to `CSR_TEMPLATE_DEFAULTS['3']` in the sync effects.

10. **No auto-refresh**: Unlike ViewInvoice's `refresh()` function passed to overlays, ViewCSR has no exposed refresh mechanism. Child components cannot trigger data refresh — they rely on local state updates (e.g., `setCsr(curr => ({ ...curr, status }))` after status change).

---

## 9. DB Schema — CSRs Table

**Migrations:** `20260520090004_csrs.sql`, `20260620000001_add_csr_engine_no.sql`

### csrs
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK DEFAULT gen_random_uuid()` | |
| `csr_number` | `text NOT NULL` | |
| `client_id` | `uuid FK → clients(id)` | |
| `client_name` | `text` | Denormalized |
| `project_id` | `uuid FK → projects(id)` | |
| `date` | `date` | |
| `equipment_type` | `text` | |
| `equipment_location` | `text` | |
| `make` | `text` | |
| `model` | `text` | |
| `serial_no` | `text` | |
| `capacity` | `text` | |
| `engine_no` | `text` | Added in migration `20260620000001` |
| `problem_reported` | `text` | |
| `defects_found` | `text` | |
| `service_rendered` | `text` | |
| `materials_used` | `text` | JSON string of materials |
| `engineer_remarks` | `text` | |
| `customer_feedback` | `text` | |
| `call_type` | `text` | |
| `system_down` | `text` | String, not boolean in DB |
| `service_basis` | `text` | |
| `status` | `text DEFAULT 'in_progress'` | |
| `technician_name` | `text` | |
| `technician_signature` | `text` | URL or base64 |
| `recipient_name` | `text` | |
| `recipient_signature` | `text` | URL or base64 |
| `acknowledgement_name` | `text` | |
| `linked_invoice_id` | `uuid FK → invoices(id)` | |
| `show_po` | `boolean DEFAULT false` | |
| `po_number` | `text` | |
| `custom_fields` | `text` | JSON string |
| `archived_at` | `timestamptz` | |
| `created_at` | `timestamptz DEFAULT now()` | |
| `updated_at` | `timestamptz` | |
