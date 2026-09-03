# Template Picker Audit — CSR vs Invoice

**Goal**: Audit existing CSR and Invoice template picker systems to understand architecture for replicating a similar picker in Waybill.

**Date**: 2026-06-19

---

## 1. CSR Template Picker

### Files

| File | Purpose |
|------|---------|
| `src/components/csr/CSRPreviewContent.js` | Template constants: `CSR_TEMPLATE_VARIANTS`, `CSR_TEMPLATE_OPTIONS`, `getCsrTemplateVariant()` |
| `src/components/csr/CSRPreviewPanel.tsx` | Picker UI + live preview using inline CSS styles |
| `src/components/document-view/csr/CsrDocumentPreview.tsx` | PDF preview renderer receiving theme from preview model |

### Template Constants (`CSRPreviewContent.js:118-150`)

```typescript
// 4 template options with key, label, blurb, accent
CSR_TEMPLATE_OPTIONS = [
  { key: '1', label: 'PulseFrame',     blurb: '...', accent: '#1D4ED8' },
  { key: '2', label: 'SignalBands',     blurb: '...', accent: '#DC2626' },
  { key: '3', label: 'Zinc Light',      blurb: '...', accent: '#18181B' },
  { key: '4', label: 'Crimson System',  blurb: '...', accent: '#B91C1C' },
]
```

### Theme Variants (`CSRPreviewContent.js:23-116`)

4 themes with full color/font/compact/headerMode/statusStyle configuration (`pulseframe`, `signalbands`, `zinc`, `crimson`).

### Picker UI (`CSRPreviewPanel.tsx:360-387`)

Inline `<div>` card grid with JS `style={}` objects. Each card has:
- Custom inline thumbnail via `renderTemplateThumb()` (line 125-191)
- Label + blurb + accent-colored border on active
- "Active" text label when selected

### Data Flow

```
template key ('1'..'4')
  → getCsrTemplateVariant(key)    (CSRPreviewContent.js:145-149)
    → CSR_TEMPLATE_VARIANTS[variantName]
      → theme object consumed by CSRPreviewPanel for preview
      → passed to CsrDocumentPreview.tsx for PDF rendering
```

### Persistence

**None.** Template key lives only in React state. Not saved to DB. `designPreset?: PdfDesignPreset` prop is optional and unused in the main CSR view page.

---

## 2. Invoice Template Picker

### Files

| File | Purpose |
|------|---------|
| `src/domain/invoice/types.ts:80-91` | `InvoicePdfTemplateId` type + `normalizeInvoicePdfTemplateId()` |
| `src/domain/invoice/normalize.ts:15-26` | `DEFAULT_INVOICE_PDF_OUTPUT` |
| `src/components/document/DocumentDesignControls.tsx` | **Shared** `DocumentTemplatePicker`, `DocumentDesignPanel`, `DocumentDesignStyleEditor` |
| `src/components/document/DocumentActionSheets.tsx` | `DocumentPdfSheet` reusing `DocumentTemplatePicker` |
| `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` | Full customization sheet with template picker + font/color controls |
| `src/components/document-view/invoice/InvoiceOverlays.tsx:132-146` | Wires `PdfOutputCustomizeSheet` into invoice view |
| `src/components/document-view/invoice/useInvoiceActions.ts:168-182` | Persistence logic: saves `pdfTemplateId` + `pdfOutput` to `custom_fields` |
| `src/pages/ViewInvoice.tsx:52` | Reads template ID from DB via `normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId)` |
| `src/components/pdf-new/templates/` | 5 PDF renderer components (Apex, Bolt, Industry, Ledger, ObsidianReceipt) |

### Template Constants

**Type** (`types.ts:80-82`):
```typescript
export const INVOICE_PDF_TEMPLATE_IDS = ['industry', 'ledger', 'apex', 'bolt', 'obsidian-receipt'] as const
export type InvoicePdfTemplateId = (typeof INVOICE_PDF_TEMPLATE_IDS)[number]
```

**Migration** (`types.ts:88-91`):
```typescript
export function normalizeInvoicePdfTemplateId(value: unknown): InvoicePdfTemplateId | null {
  if (value === 'naijabiz') return 'apex'
  return isInvoicePdfTemplateId(value) ? value : null
}
```

**Picker options** (`PdfOutputCustomizeSheet.tsx:22-70`):
```typescript
INVOICE_PDF_TEMPLATE_OPTIONS = [
  { id: 'industry', label: 'Industry', eyebrow: 'Structured', shell, accents, columns },
  { id: 'ledger',   label: 'Ledger',   eyebrow: 'Editorial', shell, accents, columns },
  { id: 'apex',     label: 'Apex',     eyebrow: 'Placeholder', shell, accents, columns },
  { id: 'bolt',     label: 'Bolt',     eyebrow: 'Banner', shell, accents, columns },
  { id: 'obsidian-receipt', label: 'Obsidian Receipt', eyebrow: 'Elegant', shell, accents, columns },
]
```

Each option has Tailwind CSS class strings for visual preview miniatures.

### Shared `DocumentTemplatePicker` — `DocumentDesignControls.tsx:74-133`

```typescript
interface DocumentTemplatePickerProps {
  value: string
  onChange: (templateId: string) => void
  templates: Template[]
}
```

- Renders horizontal scrollable card grid with mini previews
- Uses `templatePreviewById` for 8 preview configurations
- Active state: primary border + check circle icon
- Tailwind CSS classes throughout

**Used by:**
- `PdfOutputCustomizeSheet` (Invoice customization sheet)
- `DocumentPdfSheet` (`DocumentActionSheets.tsx:244`)
- BOQ module (`BoqCustomizationPanel.tsx`)
- RFQ module (`RfqCustomizationPanel.tsx`)

### Data Flow

```
custom_fields.pdfTemplateId (DB JSONB)
  → ViewInvoice.tsx:52 → normalizeInvoicePdfTemplateId()
    → pdfTemplateId state
      → InvoiceOverlays → PdfOutputCustomizeSheet
        → User picks template → setDraftTemplateId
          → onSave → handleSaveCustomization
            → writes pdfTemplateId back to custom_fields
```

### Persistence (`useInvoiceActions.ts:168-182`)

```typescript
const handleSaveCustomization = async (nextPdfOutput, _nextPreset, nextTemplateId) => {
  const nextCustomFields = { ...customFields, pdfOutput: nextPdfOutput, pdfTemplateId: nextTemplateId }
  await supabase.from("invoices").update({ custom_fields: JSON.stringify(nextCustomFields) })
  // Also persists design preset locally:
  setPdfDesignPreset(documentType, draftPreset)
}
```

Template ID is persisted per-document in `custom_fields.pdfTemplateId` (JSONB column).

### PDF Renderer Templates

5 components in `src/components/pdf-new/templates/`:
- `Industry.tsx` + `industryStyles.ts` + `industryTemplateBlocks.tsx`
- `Bolt.tsx` + `BoltStyles.ts`
- `Apex.tsx` + `ApexStyles.ts`
- `Ledger.tsx` + `LedgerStyles.ts`
- `ObsidianReceipt.tsx` + `ObsidianReceiptStyles.ts`

---

## 3. Comparison Table

| Aspect | CSR | Invoice |
|--------|-----|---------|
| **Template count** | 4 | 5 (8 previews in shared component) |
| **Template IDs** | String keys `'1'..'4'` | Typed union: `'industry' \| 'ledger' \| 'apex' \| 'bolt' \| 'obsidian-receipt'` |
| **Constants location** | `CSRPreviewContent.js` | `types.ts` + `PdfOutputCustomizeSheet.tsx` + `DocumentDesignControls.tsx` |
| **Picker component** | Custom inline in `CSRPreviewPanel.tsx` | **Shared** `DocumentTemplatePicker` (used by Invoice, BOQ, RFQ, DocumentPdfSheet) |
| **Thumbnails** | Per-variant inline JSX (`renderTemplateThumb`) | `templatePreviewById` Tailwind class strings |
| **Style system** | Inline CSS `style={}` objects | Tailwind CSS classes |
| **Persists to DB?** | No (state only) | Yes (`custom_fields.pdfTemplateId`) |
| **Persists design preset?** | No (optional prop) | Yes (`setPdfDesignPreset`) |
| **Reused modules** | CSR only | Invoice, BOQ, RFQ, any `DocumentPdfSheet` |
| **Font/color fine-tuning** | Optional `designPreset` prop | Built-in `DocumentTemplateDesignOverrides` |
| **Document type support** | CSR only | Multiple via `PdfDesignPresetDocument` |
| **Template → renderer mapping** | `getCsrTemplateVariant(key)` → variant name | Template ID passed to PDF preview directly |
| **Migration path** | None | Legacy `'naijabiz'` → `'apex'` handled |

---

## 4. Recommendation for Waybill

The **Invoice pattern** is superior for Waybill replication:

1. **Define template IDs** — Add `WaybillPdfTemplateId` type in Waybill domain (reuse same 5 IDs or subset)
2. **Reuse `DocumentTemplatePicker`** — Drop-in shared component; just pass `templates` array
3. **Reuse `PdfOutputCustomizeSheet`** with `designOnly` flag (same as Invoice at line 143: `designOnly`)
4. **Persist in `custom_fields` JSONB** — Waybill already has a `custom_fields` column; follow `useInvoiceActions.ts` pattern
5. **Create waybill PDF templates** — Either add new templates in `src/components/pdf-new/templates/` or reuse existing Industry/Bolt/etc. for waybill
6. **Add `normalizeWaybillPdfTemplateId`** — Following `normalizeInvoicePdfTemplateId` pattern for validation

### Reasons

- **Shared component** avoids duplicating 60 lines of picker UI per module
- **Persistence** means user preferences survive page refreshes
- **`PdfOutputCustomizeSheet`** provides both template selection and font/color editing in one component
- **Tailwind CSS** keeps styling consistent with the rest of the app
- **`PdfDesignPreset`** global state means waybill presets persist across all waybills (until overridden per-document)
