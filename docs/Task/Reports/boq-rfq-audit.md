# BOQ & RFQ Module Audit Report

**Date:** 2026-06-15  
**Audit Type:** Read-only — architectural & PDF template analysis  
**Scope:** All BOQ and RFQ files (51 files total)

---

## 1. Executive Summary

BOQ and RFQ share a near-identical architecture built on the `table-document` domain — a simplified table-based document model distinct from the Invoice/Quotation PDF system. Both use the same shared PDF renderer (`TableDocumentPdfDocument`), the same view shell components, and the same "Generate Quotation" conversion flow.

**Critical finding:** BOQ has a storage split — creation saves to localStorage, but the view page reads from Supabase. This means BOQs created via the New flow may not appear in the View flow.

---

## 2. Architecture Comparison

| Aspect | BOQ | RFQ |
|---|---|---|
| **Create persistence** | localStorage (`boq_documents_v1`) | Supabase (`rfqs` + `rfq_items`) |
| **View read source** | Supabase (`supabase.from('boqs')`) | Supabase (`supabase.from('rfqs')`) |
| **Storage layer** | `domain/boq/storage.ts` (localStorage) | `domain/rfq/rfqService.ts` (Supabase) |
| **Number format** | `BOQ-001` (hardcoded, no prefix engine) | `[PREFIX]-[000000]` (prefix engine) |
| **Collision handling** | None (localStorage only) | `withUniqueRetry` on insert |
| **PDF renderer** | `TableDocumentPdfDocument` | `TableDocumentPdfDocument` |
| **View shell** | `DocumentPage` + `BoqViewPage` | `DocumentPage` + `RfqViewPage` |
| **Customize (view)** | `DocumentTemplateDesignOverrides` (PDF preset only) | `RfqCustomizationPanel` (inline, saves to Supabase) |
| **CSV export** | No | Yes |
| **Reshuffle** | No | Yes |
| **Project link** | Yes | Yes |

---

## 3. BOQ Storage Split — Critical Bug

### The Problem

`NewBoq.tsx` calls `saveBoq()` from `domain/boq/storage.ts`, which writes to `window.localStorage` under key `boq_documents_v1`. No Supabase insert occurs during creation.

`ViewBoq.tsx` (line 51-53) loads from Supabase:
```ts
const [boqRes, itemsRes] = await Promise.all([
  supabase.from('boqs').select('*').eq('id', id).single(),
  supabase.from('boq_items').select('*').eq('boq_id', id).order('sort_order'),
])
```

`viewBOQActions.ts` — all actions (archive, delete, duplicate, convert) operate on Supabase tables `boqs` and `boq_items`.

### Impact

- A BOQ created via New → saves to localStorage → gets an `id` (UUID from factory)
- User clicks View → URL `/boqs/:id` → ViewBoq queries Supabase → **record not found** → redirects to `/boqs`
- BOQ list page (`Boqs.tsx`) likely also reads from Supabase → newly created BOQs don't appear

### Root Cause

The BOQ module was originally built as a localStorage-only prototype. The view page and actions were later upgraded to Supabase, but the creation path (`NewBoq` + `storage.ts`) was never migrated.

### Fix Required

Migrate `NewBoq.tsx` save flow to use Supabase insert (matching the RFQ pattern), or add a Supabase sync step in `saveBoq()`.

---

## 4. BOQ Number Generation

### Current (localStorage)

`storage.ts:getNextBoqNumber()` reads all BOQs from localStorage, finds max `BOQ-NNN`, increments. Format: `BOQ-001` (3-digit, hardcoded prefix).

### RFQ (Supabase + prefix engine)

`NewRfq.tsx` uses `getNextRfqNumber()` from `domain/rfq/normalize` + `resolvePrefix()` from prefix engine. Format: `[PREFIX]-[000000]` (6-digit, configurable prefix).

### viewBOQActions.ts:duplicateBOQRecord()

Ironically, the duplicate function (line 28-35) already queries Supabase for BOQ numbers and generates `BOQ-NNNN` (4-digit). This confirms the Supabase migration was partially started but never completed for the create flow.

---

## 5. Data Models

### BOQ (`domain/boq/types.ts`)

```ts
interface Boq {
  id: string
  boq_number: string
  template_id: TableTemplateId  // 'modern' | 'bordered_schedule'
  title: string
  vendor_name: string
  vendor_contact: string
  issue_date: string
  show_vendor_identity: boolean
  show_brand_name: boolean
  brand_name_override: string
  background_color: string
  text_color: string
  border_color: string
  accent_color: string
  preset_name: string
  notes: string
  table_rows: TableDocumentRow[]
  table_columns: TableDocumentColumn[]
  created_at: string
  updated_at: string
}
```

### RFQ (`domain/rfq/types.ts`)

```ts
interface Rfq {
  id?: string
  rfq_number: string
  template_id?: TableTemplateId
  title: string
  vendor_name: string
  vendor_contact: string
  show_vendor_identity: boolean
  issue_date: string
  expiry_date: string        // ← RFQ-only field
  show_brand_name: boolean
  brand_name_override: string
  background_color: string
  text_color: string
  border_color: string
  accent_color: string
  preset_name: string
  export_order_seed: number  // ← RFQ-only field
  notes: string
  custom_fields: Record<string, any>
  table_rows?: TableDocumentRow[]
  table_columns?: TableDocumentColumn[]
  created_at?: string
  updated_at?: string
  items?: RfqItem[]          // ← RFQ has separate items array
}
```

### Shared (`domain/table-document/types.ts`)

```ts
type TableDocumentType = 'rfq' | 'boq'
type TableTemplateId = 'modern' | 'bordered_schedule'
type TableColumnKey = 'description' | 'specification' | 'unit' | 'quantity' | 'make_brand' | 'cp' | 'sp'

interface TableDocumentRow {
  id?: string
  _uiKey?: string
  row_type: 'item' | 'section'
  sort_order: number
  section_title: string
  description: string
  specification: string
  quantity: number
  unit: string
  notes: string
  make_brand: string
  cp: string
  sp: string
}
```

**Key difference:** RFQ has `expiry_date`, `export_order_seed`, `custom_fields`, and a separate `items` array (for Supabase `rfq_items` table). BOQ has none of these — it stores `table_rows` directly in the Boq object (localStorage).

---

## 6. PDF Template Analysis

### TableDocumentPdfDocument (`components/table-document/TableDocumentPdfDocument.tsx`)

This is the **sole PDF renderer** for both BOQ and RFQ. It is a simple single-page A4 document:

**Structure:**
- Header: title (`BILL OF QUANTITIES` / `REQUEST FOR QUOTE`), number, vendor name, issue date
- Brand name (modern template only, if `show_brand_name` is true)
- Table: S/No column + visible columns from `table_columns`
- Section rows rendered as full-width bold cells with `#f1f5f9` background

**Template behavior:**
- `modern`: Uses document's `background_color`, `text_color`, `border_color`
- `bordered_schedule`: Always white background, `#111827` text, `#64748b` borders

**Column widths (hardcoded percentages):**
```
s_no: 8%, description: 34%, specification: 18%, quantity: 10%, unit: 10%, make_brand: 12%, cp: 8%, sp: 8%
```

### BoqPdfDocument vs RfqPdfDocument

Both are thin wrappers that pass data to `TableDocumentPdfDocument`:

- `BoqPdfDocument`: `<TableDocumentPdfDocument documentType="boq" templateId={boq.template_id} document={boq} rows={boq.table_rows} columns={boq.table_columns} />`
- `RfqPdfDocument`: `<TableDocumentPdfDocument documentType="rfq" templateId={rfq.template_id} document={rfq} rows={rows} columns={columns} />`

### PDF Design Issues

| Issue | Severity | Details |
|---|---|---|
| No page breaks | Medium | Long tables overflow off-page. No `<PageBreak>` or chunking logic. |
| Single-page only | Medium | Hardcoded single `<Page>` — no multi-page support. |
| Section rows not spanning | Low | Section headers are full-width but don't break across pages. |
| No totals/subtotals | Low | No footer row for quantity or cost sums. |
| No logo/branding | Low | Brand name is text-only, no image logo support. |
| Hardcoded column widths | Medium | 8-column layout assumes all columns visible. No responsive adaptation. |
| `PdfCurrencyText` used for all cells | Low | Currency formatting applied to non-currency fields (description, specification). |

---

## 7. Conversion Flow (Both Modules)

### BOQ → Quotation (`viewBOQActions.ts:convertBOQToQuotation`)

1. Fetches all existing quotation numbers from Supabase
2. Generates next quotation number via `getNextQuotationNumber()` with prefix engine
3. Creates quotation record in `quotations` table with source trail link
4. Maps BOQ items → quotation items, **preserving pricing** (`unit_price: item.sp || item.unit_price`)
5. Navigates to new quotation

### RFQ → Quotation (`viewRFQActions.ts:convertRFQToQuotation`)

1. Same quotation number generation
2. Same quotation record creation with source trail
3. Maps RFQ items → quotation items, **zeroing pricing** (`unit_price: 0, amount: 0`)
4. Navigates to new quotation

**Key difference:** BOQ transfers pricing (SP → unit_price), RFQ resets pricing to zero (RFQ is a request, not a priced document).

Both use `buildTrailLink()` and `withSourceTrail()` from `domain/documentConversion` for audit trail.

---

## 8. View Shell Architecture

Both modules use identical shared view components from `components/document-view/shared/`:

| Component | Purpose |
|---|---|
| `DocumentPage` | Full-page layout with topNav, hero, floating button, overlays |
| `DocumentHero` | Eyebrow + title + subtitle + status badge |
| `DocumentTopNav` | Back button, share, customize, more actions |
| `FloatingDownloadButton` | Fixed-position PDF download FAB |
| `DocumentSheet` | Slide-over panel for customization |
| `DocumentConfirmDialog` | Modal confirmations |
| `ProjectLinkDialog` | Link document to project |

**Module-specific:**
- `BoqViewPage` / `RfqViewPage` — inner content shells (metrics strip + actions + preview)
- `BoqPrimaryActions` / `RfqPrimaryActions` — Convert + Edit buttons (nearly identical)
- `BoqMoreSheet` / `RfqMoreSheet` — overflow action menus
- `BoqHeroMeta` / `RfqHeroMeta` — metadata chips

---

## 9. Recommendations

### Priority 1: Fix BOQ Storage Split

Migrate `NewBoq.tsx` to save to Supabase instead of localStorage. Pattern exists in `NewRfq.tsx` — replicate with `supabase.from('boqs').insert()` + `supabase.from('boq_items').insert()`. Remove or deprecate `domain/boq/storage.ts`.

### Priority 2: Add Prefix Engine to BOQ

Replace hardcoded `BOQ-NNN` with `resolvePrefix(prefixes, 'boq')` + `getNextBoqNumber()` from a proper sequence generator. Match RFQ pattern.

### Priority 3: Multi-Page PDF Support

Add page break logic to `TableDocumentPdfDocument` — chunk rows into groups of ~20 per page, insert `<Page>` breaks. Both BOQ and RFQ benefit.

### Priority 4: Add Totals Row

Add subtotal/total row at bottom of PDF table. BOQ has `cp` and `sp` columns — compute and display sums. RFQ has `quantity` — display total quantity.

### Priority 5: Unify Customize Flow

RFQ has inline `RfqCustomizationPanel` that saves to Supabase. BOQ has `DocumentTemplateDesignOverrides` that only saves a PDF preset. Unify to match RFQ's approach.

---

## 10. File Reference

### BOQ Files Read

| File | Purpose |
|---|---|
| `pages/NewBoq.tsx` | Create page — localStorage save |
| `pages/EditBoq.tsx` | Edit page |
| `pages/ViewBoq.tsx` | View page — Supabase read |
| `pages/Boqs.tsx` | List page |
| `pages/viewBOQActions.ts` | Archive/delete/duplicate/convert — Supabase |
| `components/boq/BoqEditor.tsx` | Editor shell (presentational) |
| `components/boq/BoqForm.tsx` | Form fields |
| `components/boq/BoqPreview.tsx` | Live preview |
| `components/boq/BoqPdfDocument.tsx` | PDF wrapper |
| `components/document-view/boq/BoqViewPage.tsx` | View content shell |
| `components/document-view/boq/BoqPrimaryActions.tsx` | Convert + Edit buttons |
| `domain/boq/storage.ts` | localStorage CRUD |
| `domain/boq/types.ts` | Boq interface |
| `domain/boq/factories.ts` | Empty BOQ factory |

### RFQ Files Read

| File | Purpose |
|---|---|
| `pages/NewRfq.tsx` | Create page — Supabase save |
| `pages/EditRfq.tsx` | Edit page |
| `pages/ViewRfq.tsx` | View page — Supabase read |
| `pages/Rfqs.tsx` | List page |
| `pages/viewRFQActions.ts` | Archive/delete/duplicate/convert — Supabase |
| `components/rfq/RfqEditor.tsx` | Editor shell |
| `components/rfq/RfqForm.tsx` | Form fields |
| `components/rfq/RfqPreview.tsx` | Live preview |
| `components/rfq/RfqPdfDocument.tsx` | PDF wrapper |
| `components/rfq/RfqCustomizationPanel.tsx` | Inline template customization |
| `components/document-view/rfq/RfqViewPage.tsx` | View content shell |
| `components/document-view/rfq/RfqPrimaryActions.tsx` | Convert + Edit buttons |
| `domain/rfq/rfqService.ts` | Supabase CRUD |
| `domain/rfq/types.ts` | Rfq interface + presets |
| `domain/rfq/normalize.ts` | DB ↔ app normalization |

### Shared Files

| File | Purpose |
|---|---|
| `components/table-document/TableDocumentPdfDocument.tsx` | Shared PDF renderer |
| `domain/table-document/types.ts` | Shared types (TableDocumentRow, etc.) |
| `components/document-view/shared/*` | View shell components |
