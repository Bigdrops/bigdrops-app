# Waybill PDF Template Audit

**Task:** prompt589 — Waybill PDF Template Audit
**Date:** 2026-06-17
**Status:** Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [File Inventory](#2-file-inventory)
3. [PDF Template Architecture](#3-pdf-template-architecture)
4. [Internal vs External Template Analysis](#4-internal-vs-external-template-analysis)
5. [Table Structure & Item Rendering](#5-table-structure--item-rendering)
6. [Quantity Bug Root Cause Analysis](#6-quantity-bug-root-cause-analysis)
7. [Blank Waybill Template](#7-blank-waybill-template)
8. [Type Selector Modal](#8-type-selector-modal)
9. [Signatures & Footer](#9-signatures--footer)
10. [JSON Import System](#10-json-import-system)
11. [Design Preset System](#11-design-preset-system)
12. [Confirmed Issues Summary](#12-confirmed-issues-summary)

---

## 1. Executive Summary

The Waybill module uses a **dual-template system**:
- **Data-filled PDF** (`WaybillPDF.tsx`): `@react-pdf/renderer` JSX, single A4 page, shared for both internal and external types with dynamic labels.
- **Blank PDF** (`blankWaybillTemplate.tsx`): HTML `<div>` elements rendered via `pdf()` to blob. Separate templates per type.

The data-filled PDF is clean and functional. The primary quantity display bug has been traced to a field name mismatch between the normalization layer (`qty`) and the item interface (`quantity`).

---

## 2. File Inventory

| File | Lines | Role |
|------|-------|------|
| `src/components/waybill/WaybillPDF.tsx` | 209 | Main PDF template (react-pdf JSX) |
| `src/components/waybill/blankWaybillTemplate.tsx` | 176 | Blank PDF template (HTML→PDF) |
| `src/components/waybill/waybillUtils.ts` | 655 | Types, normalization, utilities |
| `src/components/waybill/WaybillForm.tsx` | ~1200 | Full form with collapsible sections |
| `src/components/waybill/WaybillFormOverlay.tsx` | 66 | Modal overlay wrapper |
| `src/components/waybill/WaybillGatewayOverlay.tsx` | 147 | Type selector (internal/external) |
| `src/components/waybill/WaybillImportSheet.tsx` | 63 | JSON import sheet |
| `src/components/waybill/WaybillSignatureField.tsx` | — | Signature capture (draw/upload) |
| `src/pages/NewWaybill.tsx` | 102 | Create page with gateway + auto-number |
| `src/pages/EditWaybill.tsx` | 75 | Edit page |
| `src/pages/ViewWaybill.tsx` | 340 | View page with PDF download |
| `src/components/document-view/waybill/WaybillDocumentPreview.tsx` | 122 | On-screen preview (CSS) |
| `src/domain/waybill/waybillMutations.ts` | 106 | Supabase insert/update |
| `src/domain/waybill/externalWaybillImportAdapter.ts` | 64 | External import normalization |
| `src/domain/waybill/internalWaybillImportAdapter.ts` | 62 | Internal import normalization |

---

## 3. PDF Template Architecture

### 3.1 Data-Filled PDF (`WaybillPDF.tsx`)

```
WaybillPDF
├── Document (react-pdf)
│   └── Page (A4, portrait)
│       ├── Header (company logo + name + address + doc title + number)
│       ├── Divider
│       ├── Meta Grid (date, time, vehicle, location, client, PO, invoice ref, project ref)
│       ├── Party Row (sender box + receiver box)
│       ├── Items Table
│       │   ├── Table Header (dark bg, white text)
│       │   └── Table Rows (alternating white/#f8fafc)
│       ├── Notes Box (conditional)
│       ├── Signature Row (sender + receiver signature boxes)
│       └── Footer (absolute positioned, company name + contact + waybill number)
```

**Key facts:**
- Uses `@react-pdf/renderer` directly (Document/Page/View/Text/Image)
- Does NOT use `PdfRenderer.tsx` abstraction
- Single page A4 — no page break handling
- Design preset system: `getDefaultPdfDesignPreset('waybill')` for fonts/colors
- Fillable font registration: `registerPdfFillableFonts()` called at module level
- Column visibility and titles passed as props: `columnVisibility`, `columnTitles`

### 3.2 Blank PDF (`blankWaybillTemplate.tsx`)

```
downloadBlankWaybillTemplate(type, waybillNumber)
├── BlankExternalTemplate (HTML <div> elements)
│   ├── Header (BIGDROPS / EXTERNAL DELIVERY NOTE / waybill number)
│   ├── Sender/Receiver boxes
│   ├── Items table (5 empty rows)
│   ├── Invoice Reference + Vehicle Info
│   └── Signature boxes
└── BlankInternalTemplate (HTML <div> elements)
    ├── Header (BIGDROPS / INTERNAL TRANSFER NOTE / waybill number)
    ├── Origin/Destination boxes
    ├── Items table (5 empty rows)
    ├── Purpose checkboxes + Vehicle Info
    └── Signature boxes
```

**Key facts:**
- Uses HTML `<div>` elements rendered via `pdf()` from `@react-pdf/renderer`
- Downloads as blob → temporary `<a>` click → revoke URL
- Different layout per type (sender/receiver vs origin/destination)
- Hardcoded 5 empty rows, no dynamic row count
- Waybill number injected as prop

### 3.3 On-Screen Preview (`WaybillDocumentPreview.tsx`)

- CSS-based preview using `DocumentPreviewShell`
- Shows: company info, waybill number, dispatch date, consignee, logistics, items, signatures
- NOT used for PDF generation — purely visual preview in the view page

---

## 4. Internal vs External Template Analysis

### 4.1 Data-Filled PDF: Single Template, Dynamic Labels

`WaybillPDF.tsx` uses `getWaybillTypeContent(mapped.type)` from `waybillUtils.ts` to get type-specific labels:

| Label | Internal | External |
|-------|----------|----------|
| `pdfTitle` | INTERNAL WAYBILL | Waybill/Delivery note |
| `senderPdfLabel` | Released By / From | Sender |
| `receiverPdfLabel` | Received By / To | Receiver |
| `locationLabel` | Movement Route / Destination | Delivery Location |
| `clientLabel` | Client (optional) | Client |

**Conclusion:** The data-filled PDF is a **single shared template** with conditional labels. No structural differences between internal and external.

### 4.2 Blank PDF: Separate Templates

`blankWaybillTemplate.tsx` has **completely separate templates**:

- `BlankExternalTemplate`: Sender/Receiver boxes, Invoice Reference, Vehicle Info
- `BlankInternalTemplate`: Origin/Destination boxes, Purpose checkboxes (Transfer/Maintenance/Other), Vehicle Info

**Structural differences:**
- External has "Invoice Reference" section; Internal has "Purpose" section
- External labels: "Sender" / "Receiver"; Internal labels: "Origin" / "Destination"
- Internal has checkbox options; External has text fields

### 4.3 Summary

| Aspect | Data-Filled PDF | Blank PDF |
|--------|----------------|-----------|
| Template count | 1 (shared) | 2 (separate) |
| Differentiation | Dynamic labels | Different layouts |
| Rendering engine | react-pdf JSX | HTML→PDF |
| Party labels | Via `WAYBILL_TYPE_CONTENT` | Hardcoded in templates |
| Invoice reference | Via `customFields.references` | Hardcoded section |
| Purpose field | Via `mapped.purpose` (external only) | Checkbox (internal only) |

---

## 5. Table Structure & Item Rendering

### 5.1 Column Definitions

```typescript
// waybillUtils.ts:18-21
export interface WaybillCustomColumn {
  key: string
  label: string
}

export const WAYBILL_COLUMN_LIMIT = 4
```

### 5.2 Default Columns (from `WaybillPDF.tsx`)

| Column | Width | Align | Source |
|--------|-------|-------|--------|
| `#` (row number) | 20px | left | `index + 1` |
| Description | flex: 1.8 | left | `item.description` |
| Qty | 32px | right | `item.quantity` |
| Unit | 40px | left | `item.unit` |
| Condition | 48px | left | `item.condition` |

### 5.3 Custom Columns

- Custom columns rendered dynamically: `{customColumns.map((column) => ...)}`
- Width: 54px each
- Source: `item.custom_data?.[column.key]`
- Maximum 4 custom columns enforced in `waybillUtils.ts`

### 5.4 Item Row Structure

```tsx
<View style={index % 2 === 0 ? S.tableRow : S.tableRowAlt}>
  <Text style={[S.cell, S.numberCol]}>{index + 1}</Text>
  {isColumnVisible('description') && <Text style={[S.cell, S.descCol]}>{item.description || ''}</Text>}
  {isColumnVisible('quantity') && <Text style={[S.cell, S.qtyCol]}>{item.quantity != null ? String(item.quantity) : ''}</Text>}
  {isColumnVisible('unit') && <Text style={[S.cell, S.unitCol]}>{item.unit || ''}</Text>}
  {isColumnVisible('condition') && <Text style={[S.cell, S.conditionCol]}>{item.condition || ''}</Text>}
  {customColumns.map((column) => (
    <Text key={column.key} style={[S.cell, S.customCol]}>{String(item.custom_data?.[column.key] || '')}</Text>
  ))}
</View>
```

### 5.5 Conditional Row Types

The `WaybillItem` interface supports `row_type: 'standard' | 'group_header'` but the PDF template does **not** render group headers differently. All rows use the same style regardless of `row_type`.

---

## 6. Quantity Bug Root Cause Analysis

### 6.1 Data Flow

```
Form Input → saveWaybill → Supabase JSONB → mapDbWaybill → WaybillPDF
```

### 6.2 Normalization Layer

```typescript
// waybillUtils.ts:400-418
export function normalizeWaybillItem(item: unknown, customColumns: WaybillCustomColumn[] = []): WaybillItem {
  const record = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
  // ...
  return {
    description: String(record.description || ''),
    quantity: toNumber(record.qty),        // ← Reads from 'qty'
    unit: String(record.unit || ''),
    condition: normalizeCondition(record.condition),
    row_type: 'standard' as const,
    custom_data,
  }
}
```

### 6.3 WaybillItem Interface

```typescript
// waybillUtils.ts:27-34
export interface WaybillItem {
  description: string
  quantity: number    // ← Interface field name is 'quantity'
  unit: string
  condition: ItemCondition
  custom_data?: WaybillItemCustomData
  row_type?: 'standard' | 'group_header'
}
```

### 6.4 PDF Rendering

```tsx
// WaybillPDF.tsx:172
{isColumnVisible('quantity') && <Text style={[S.cell, S.qtyCol]}>{item.quantity != null ? String(item.quantity) : ''}</Text>}
```

### 6.5 The Bug

**Root cause:** `normalizeWaybillItem()` reads from `record.qty` (line 412) but the `WaybillItem` interface defines the field as `quantity` (line 29).

**Impact:** When items come from Supabase with the `quantity` key (not `qty`), `toNumber(record.qty)` returns `0` because `record.qty` is `undefined`.

**Evidence:**
- `normalizeWaybillItem` at line 412: `quantity: toNumber(record.qty)` — reads `qty`
- `WaybillItem.quantity` at line 29 — interface defines `quantity`
- The `createDefaultItem()` at line 364 creates items with `quantity: 1`
- The `WaybillForm` stores items with `quantity` key
- The import adapters store items with `quantity` key
- But the database may store items with either `qty` or `quantity` depending on creation path

**Where `qty` vs `quantity` conflict arises:**
1. Items created via form: stored with `quantity` key
2. Items imported via JSON: stored with `quantity` key (import adapters use `quantity`)
3. Items in Supabase: depends on how they were inserted
4. `normalizeWaybillItem` reads `qty` → misses `quantity` → returns 0

**Fix required:** Change `normalizeWaybillItem` to read from both `qty` and `quantity`:
```typescript
quantity: toNumber(record.qty ?? record.quantity),
```

---

## 7. Blank Waybill Template

### 7.1 Template Structure

The blank template system uses HTML `<div>` elements rendered via `pdf()` from `@react-pdf/renderer`. This is a **hybrid approach** — not the same as the data-filled PDF.

### 7.2 Sub-Templates

| Template | Type | Sections |
|----------|------|----------|
| `BlankExternalTemplate` | External | Sender/Receiver, Items (5 rows), Invoice Ref, Vehicle Info, Signatures |
| `BlankInternalTemplate` | Internal | Origin/Destination, Items (5 rows), Purpose checkboxes, Vehicle Info, Signatures |

### 7.3 Rendering Flow

```typescript
// blankWaybillTemplate.tsx:162-176
export async function downloadBlankWaybillTemplate(type: WaybillType, waybillNumber: string): Promise<void> {
  const element = type === 'internal'
    ? <BlankInternalTemplate waybillNumber={waybillNumber} />
    : <BlankExternalTemplate waybillNumber={waybillNumber} />

  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `blank-${type}-waybill.pdf`
  // ...
}
```

### 7.4 Issues

1. **Hardcoded 5 rows**: Items table always shows 5 empty rows regardless of actual item count
2. **No company branding**: Header shows "BIGDROPS" hardcoded, not from settings
3. **No design preset**: Blank template doesn't use the design preset system
4. **HTML→PDF approach**: Uses `<div>` elements instead of react-pdf JSX — inconsistent with data-filled template
5. **No custom columns**: Blank template has fixed columns (Description, Quantity, Unit, Notes) — no custom column support

### 7.5 NewWaybill.tsx Integration

```typescript
// NewWaybill.tsx:54-64
const { downloadBlankWaybillTemplate } = await import('../components/waybill/blankWaybillTemplate')
await downloadBlankWaybillTemplate(blankType, waybillNumber)
feedback.success(`Blank template ${waybillNumber} downloaded`)
```

Blank template download:
1. User selects type in gateway overlay
2. `onDownloadBlank` callback fires
3. Waybill number generated via `getNextWaybillNumber()`
4. Logged to `blank_waybill_logs` table
5. Blank template downloaded as PDF

---

## 8. Type Selector Modal

### 8.1 WaybillGatewayOverlay

The type selector is a full-screen overlay with two options:

| Option | Type | Description |
|--------|------|-------------|
| Type 01 / Outbound | `external` | External Delivery Note — outbound shipment to clients and vendors |
| Type 02 / Internal | `internal` | Internal Transfer Note — stock movement between depots |

### 8.2 Blank Download Buttons

Below the type selector, two additional buttons:
- "Blank Template External (PDF)"
- "Blank Template Internal (PDF)"

### 8.3 Flow

```
NewWaybill → WaybillGatewayOverlay → onSelect(type) → auto-generate waybill number → WaybillForm
                                      onDownloadBlank(type) → generate number → log → download blank PDF
```

---

## 9. Signatures & Footer

### 9.1 Signature System

```typescript
// waybillUtils.ts:251-260
export function getWaybillSignature(waybill: Pick<Waybill, 'receiver_signature_url' | 'custom_fields'>, role: SignatureRole): WaybillSignatureEvidence {
  const customFields = parseWaybillCustomFields(waybill.custom_fields)
  const signature = normalizeSignatureEvidence(customFields.signatures?.[role])

  // Fallback: receiver signature from top-level field
  if (role === 'receiver' && !signature.image_url && waybill.receiver_signature_url) {
    signature.image_url = waybill.receiver_signature_url
  }

  return signature
}
```

### 9.2 Signature Rendering in PDF

```tsx
// WaybillPDF.tsx:188-199
<View style={S.signatureRow}>
  {[{ title: typeContent.senderSignatureLabel, signature: senderSignature },
    { title: typeContent.receiverSignatureLabel, signature: receiverSignature }].map((entry) => (
    <View key={entry.title} style={S.signatureBox}>
      <Text style={S.signatureTitle}>{entry.title}</Text>
      {entry.signature.image_url || entry.signature.drawn_data_url ? (
        <Image src={entry.signature.image_url || entry.signature.drawn_data_url || ''} style={S.signatureImage} />
      ) : (
        <View style={[S.signatureImage, { borderBottom: '0.5pt solid #cbd5e1' }]} />
      )}
    </View>
  ))}
</View>
```

### 9.3 Signature Types

| Role | Label (External) | Label (Internal) |
|------|------------------|------------------|
| Sender | Sender Signature | Released By Signature |
| Receiver | Receiver Signature | Received By Signature |

### 9.4 Footer

```tsx
// WaybillPDF.tsx:201-205
<View style={S.footer}>
  <Text style={S.footerText}>{settings.company_name || ''}</Text>
  <Text style={S.footerText}>{footerContact}</Text>
  <Text style={S.footerText}>Waybill: {mapped.waybill_number}</Text>
</View>
```

Footer is absolute-positioned at bottom of page. Shows:
- Company name (left)
- Phone + email separated by `|` (center)
- Waybill number (right)

---

## 10. JSON Import System

### 10.1 Import Adapters

| Adapter | Type | Schema |
|---------|------|--------|
| `externalWaybillImportAdapter` | External | `externalWaybillSchema` |
| `internalWaybillImportAdapter` | Internal | `internalWaybillSchema` |

### 10.2 Import Flow

```
WaybillImportSheet → JSON.parse → adapter.schema.parse → adapter.applyResult → WaybillForm
```

### 10.3 Monetary Key Stripping

Both adapters strip monetary keys from imported items:
```typescript
const monetaryKeys = ['unit_price', 'rate', 'vat', 'discount', 'subtotal', 'grand_total']
```

### 10.4 Import Sheet Integration

`WaybillImportSheet.tsx` is a thin wrapper around `JsonImportLayout`:
- Title: "Import Waybill"
- Description: "Capture a paper waybill by pasting its JSON extraction."
- Tutorial with 3 steps and placeholder video URL

---

## 11. Design Preset System

### 11.1 Usage in WaybillPDF

```typescript
// WaybillPDF.tsx:37-42
function createStyles(designPreset?: PdfDesignPreset) {
  const preset = designPreset || getDefaultPdfDesignPreset('waybill')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const fillableColor = preset.fillableColor
  // ...
}
```

### 11.2 View Page Customization

```tsx
// ViewWaybill.tsx:252-268
<DocumentSheet title="Customize Waybill PDF">
  <DocumentTemplateDesignOverrides value={designPreset} onChange={setDesignPreset} />
  <button onClick={() => setPdfDesignPreset('waybill', designPreset)}>
    Save Settings
  </button>
</DocumentSheet>
```

Users can customize fonts, colors via the view page's "Customize" sheet. Changes persist via `setPdfDesignPreset('waybill', ...)`.

### 11.3 Blank Template Gap

The blank template does NOT use the design preset system. It hardcodes:
- Font: Helvetica
- Colors: #1a1a1a, #000, #666, #f0f0f0
- No company logo
- No brand colors

---

## 12. Confirmed Issues Summary

### Critical

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 1 | **Quantity field name mismatch**: `normalizeWaybillItem` reads `record.qty` but interface uses `quantity` | `waybillUtils.ts:412` | Confirmed |

### High

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 2 | **No page breaks**: Items table has no overflow handling for many items | `WaybillPDF.tsx` | Confirmed |
| 3 | **Blank template no company branding**: Hardcoded "BIGDROPS" header | `blankWaybillTemplate.tsx:8` | Confirmed |
| 4 | **Blank template hardcoded 5 rows**: No dynamic row count | `blankWaybillTemplate.tsx:41-49,120-130` | Confirmed |
| 5 | **Group header rows not visually distinct**: `row_type: 'group_header'` not rendered differently | `WaybillPDF.tsx:168-179` | Confirmed |

### Medium

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 6 | **Blank template no design preset**: Doesn't use `getDefaultPdfDesignPreset` | `blankWaybillTemplate.tsx` | Confirmed |
| 7 | **Blank template HTML→PDF hybrid**: Inconsistent rendering approach vs data-filled | `blankWaybillTemplate.tsx` | Confirmed |
| 8 | **Blank template no custom columns**: Fixed 5-column layout | `blankWaybillTemplate.tsx` | Confirmed |

### Low

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 9 | **Placeholder video URL in import sheet**: YouTube rickroll link | `WaybillImportSheet.tsx:59` | Confirmed |
| 10 | **Condition notes not shown in PDF**: `condition_notes` from custom_fields not displayed | `WaybillPDF.tsx` | Confirmed |

---

## Appendix A: Waybill Number Generation

```typescript
// waybillUtils.ts:453-465
export function getNextWaybillNumber(
  type: WaybillType,
  existingNumbers: string[],
  prefix: string = 'WBL',
): string {
  const routingPrefix = type === 'internal' ? `${prefix}-I-` : `${prefix}-E-`
  const nums = existingNumbers
    .filter((n) => n.startsWith(routingPrefix))
    .map((n) => parseInt(n.slice(routingPrefix.length), 10))
    .filter((n) => !isNaN(n))
  const highest = nums.length > 0 ? Math.max(...nums) : 0
  return `${routingPrefix}${String(highest + 1).padStart(6, '0')}`
}
```

**Format:** `[PREFIX]-[I|E]-[000000]`
- Internal: `WBL-I-000001`
- External: `WBL-E-000001`
- Prefix configurable via `resolvePrefix(settings?.document_prefixes, 'waybill')`

## Appendix B: Custom Fields Structure

```typescript
// waybillUtils.ts:44-64
export interface WaybillCustomFields {
  customColumns?: WaybillCustomColumn[]
  signatures?: {
    sender?: WaybillSignatureEvidence
    receiver?: WaybillSignatureEvidence
  }
  partyNotes?: {
    sender?: string
    receiver?: string
  }
  references?: {
    linkedInvoiceNumber?: string
    linkedProjectName?: string
    sourceDocumentNumber?: string
  }
  importMeta?: {
    source?: 'json'
    importedAt?: string
    instructionsAccepted?: boolean
  }
}
```

Stored as JSONB in `waybills.custom_fields`. Parsed via `parseWaybillCustomFields()` with safe defaults.

## Appendix C: Database Schema (Inferred)

The waybill data is stored in a `waybills` Supabase table with columns inferred from `mapDbWaybill()`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `waybill_number` | text | e.g., `WBL-E-000001` |
| `type` | text | `'internal'` or `'external'` (CHECK constraint) |
| `date` | text | ISO date string |
| `time` | text | Time string |
| `sender_name` | text | |
| `receiver_name` | text | |
| `receiver_signature_url` | text | Legacy top-level signature URL |
| `receiver_description` | text | |
| `client_id` | UUID | FK to clients |
| `client_name` | text | |
| `project_id` | UUID | FK to projects |
| `invoice_id` | UUID | FK to invoices |
| `po_number` | text | |
| `vehicle_plate` | text | |
| `driver_name` | text | |
| `transport_mode` | text | One of: By Vehicle, By Hand, Courier, Self Pick-Up |
| `purpose` | text | One of: Supply, Return, Third-Party Custody (NULL for internal) |
| `delivery_location` | text | |
| `items` | jsonb | Array of WaybillItem objects |
| `notes` | text | |
| `status` | text | dispatched, pending_confirmation, delivered, returned |
| `created_by` | text | |
| `created_at` | text | ISO timestamp |
| `archived_at` | text | ISO timestamp (nullable) |
| `custom_fields` | jsonb | WaybillCustomFields object |

**Items JSONB structure:**
```json
[
  {
    "description": "Item name",
    "quantity": 5,
    "unit": "pcs",
    "condition": "good",
    "custom_data": { "color": "red", "size": "L" },
    "row_type": "standard"
  }
]
```
