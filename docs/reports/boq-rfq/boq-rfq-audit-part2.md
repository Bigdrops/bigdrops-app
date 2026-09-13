# BOQ & RFQ Module Audit — Part 2: Data Model, Form, Conversion, Totals, Open Decisions

**Date:** 2026-09-13
**Audit Type:** Read-only — data model, form, conversion, totals, architecture analysis
**Scope:** BOQ form, view, conversion to Quotation, computeDocument integration, open decisions

---

## 1. BOQ's Place in the Document Lifecycle

BOQ sits in the **table-document domain** — a simplified table-based document model shared with RFQ. This is architecturally distinct from the Invoice/Quotation PDF system.

| Aspect | Table-Document Domain (BOQ/RFQ) | Invoice/Quotation Domain |
|---|---|---|
| Row model | `TableDocumentRow` (cp/sp/specification/make_brand in cells) | `InvoiceItem` (unit_price/install_rate/vat_rate/discount_rate) |
| Columns | User-configurable `TableDocumentColumn[]` | Fixed columns + `ColumnConfig[]` |
| PDF renderer | `TableDocumentPdfDocument` (single A4 page) | Multi-page with groups, headers, footers |
| Totals | None (no `computeDocument`) | Full `computeDocument()` integration |
| View shell | `DocumentPage` + module-specific view page | `DocumentPage` + module-specific view page |

**Implication:** BOQ cannot directly reuse `computeDocument()` for totals — the row models are incompatible. BOQ must build its own totals layer or map to `InvoiceItem` first.

---

## 2. Data Model: BOQ Row Shape

### `TableDocumentRow` (BOQ's row model)

```ts
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
  cp: string    // cost price — BOQ/RFQ only
  sp: string    // selling price — BOQ/RFQ only
}
```

### `InvoiceItem` (Quotation's row model)

```ts
interface InvoiceItem {
  id?: string
  description: string
  sub_description?: string
  quantity: number
  unit: string
  unit_price: number
  install_rate: number
  vat_rate: number
  discount_rate: number
  row_type: 'standard' | 'group_header'
  group_id?: string
  group_name?: string
  make?: string
  image_url?: string
  custom_data?: Record<string, unknown>
}
```

**Key differences:**
- BOQ has `cp`, `sp`, `specification`, `make_brand` — Quotation has none of these
- Quotation has `unit_price`, `install_rate`, `vat_rate`, `discount_rate` — BOQ has none of these
- Quotation has `group_id`/`group_name` for section headers — BOQ uses `row_type: 'section'` with `section_title`
- Mapping: `sp → unit_price`, `quantity × sp → amount`, `cp` is internal (not shown on Quotation)

---

## 3. BOQ Form: Current State

### `BoqForm.tsx` (72 lines)

Three tabs: **Details**, **Rows**, **Output**

- **Details:** title, boq_number, issue_date, vendor_name, vendor_contact, notes
- **Rows:** `TableRowsEditor` — full row editing with cp/sp/specification/make_brand
- **Output:** `BoqCustomizationPanel` — template selection (modern/bordered_schedule), color preset

### `BoqEditor.tsx` — wraps BoqForm + BoqPreview with save/cancel/preview toggle

### `Boqs.tsx` → `BoqList.tsx` — list reads from Supabase via `DocumentQueryProvider`, supports archive/delete/filter/export

### Storage: creation saves to localStorage (`boq_documents_v1`), view reads from Supabase — **storage split bug exists**

---

## 4. Quotation Form: Reference Pattern

### `QuotationFormPage.tsx` (full field set)

```
quotation_number, po_number, quotation_title, client_id, client_name,
issue_date, valid_until, status, notes, terms,
workmanship, transportation, shipping, discount, vat, wht,
subtotal, install_rate_total, total, amount_in_words
```

**Compute invocation (line 438):**
```ts
const result = computeDocument({
  items,
  globalVatPercent: quotation.vat ?? 0,
  discountType: quotation.discount ?? 0,
  discountTiming: 'before',
  discountValue: 0,
  whtType: 'percent',
  whtValue: 0,
  extraCharges: [],
  visibleRowEffects: [],
  cf: { extraCharges: [], calculationInputs: { vat: 0, discount: 0, wht: 0 } },
  document: { ...quotation, items },
  columns,
})
```

**BOQ form does NOT call `computeDocument()`** — it has no totals integration.

---

## 5. BOQ→Quotation Conversion

### Already exists: `view-boq-actions.ts:convertBOQToQuotation`

```ts
1. Fetch all quotation numbers from Supabase
2. Generate next quotation number via prefix engine
3. Insert quotation record in `quotations` table
4. Map BOQ rows → quotation items:
   - unit_price = row.sp || 0
   - amount = (row.quantity || 0) * (row.sp || 0)
   - description = row.description
   - make = row.make_brand
5. Navigate to new quotation editor
```

**Key difference from RFQ→Quotation:** BOQ transfers pricing (SP → unit_price), RFQ resets pricing to zero.

**Missing:** No `source_boq` or `boq_id` FK on quotations table — the conversion trail is stored in `custom_fields.conversionTrail` only, not as a database relationship.

---

## 6. BOQ Totals: `computeDocument()` Integration

### Can BOQ use `computeDocument()`?

**Not directly.** `computeDocument()` expects `InputItem[]` with `unit_price`, `vat_rate`, `discount_rate`, `install_rate` — BOQ rows have `cp`/`sp` instead.

### Two options:

**Option A: Map BOQ rows to `InputItem[]` before calling `computeDocument()`**
```ts
const items: InputItem[] = boq.table_rows
  .filter(r => r.row_type === 'item')
  .map((r, i) => ({
    id: r.id || String(i),
    description: r.description,
    quantity: r.quantity,
    unit: r.unit,
    unit_price: parseFloat(r.sp) || 0,
    vat_rate: 0,
    discount_rate: 0,
    install_rate: 0,
  }))
const result = computeDocument({ items, globalVatPercent: 0, ... })
```

**Option B: Build BOQ-specific totals layer (bypass `computeDocument`)**
```ts
const subtotal = rows.reduce((sum, r) => sum + (r.quantity * parseFloat(r.sp || '0')), 0)
```

**Recommendation:** Option A — reuses the canonical calc engine, consistent with Quotation, and the mapping is trivial. The BOQ form would need a "totals preview" that calls `computeDocument()` on the current rows.

---

## 7. View Page: BOQ vs RFQ UX Pattern

Both use identical shared view components:
- `DocumentPage` → `DocumentHero` → `DocumentTopNav` → `FloatingDownloadButton`
- Module-specific: `BoqViewPage` / `RfqViewPage` (metrics strip + actions + preview)

**RFQ has:** `RfqCustomizationPanel` (inline, saves to Supabase)
**BOQ has:** `DocumentTemplateDesignOverrides` (PDF preset only) — less feature-complete

**Recommendation:** Align BOQ customization to match RFQ's inline panel approach.

---

## 8. Open Decisions (REQUIRES DECISION)

### DECISION-1: Storage — localStorage vs Supabase

**Current:** Creation saves to localStorage, view reads from Supabase. Storage split bug.

**Options:**
- **A: Migrate creation to Supabase** (match RFQ pattern) — standard path, eliminates split
- **B: Keep localStorage, sync to Supabase on save** — preserves offline capability, adds complexity
- **C: localStorage-only, remove Supabase reads from view** — simplest, loses multi-device sync

**Recommendation:** Option A — RFQ already proves the pattern works. Offline is not a stated requirement.

### DECISION-2: cp/sp — BOQ-only or also on Quotation

**Current:** cp/sp exist only in `TableDocumentRow` (BOQ/RFQ domain). Quotation uses `unit_price` (no cost price concept).

**Options:**
- **A: cp/sp stay BOQ-only** — Quotation doesn't need cost price (it's internal)
- **B: Add cp to Quotation items** — useful for margin tracking on quotations
- **C: Add cp to Invoice items too** — full margin visibility across all documents

**Recommendation:** Option A for now — cp is a BOQ/RFQ internal field. Add to Quotation only if margin tracking is explicitly requested.

### DECISION-3: BOQ Totals — computeDocument or custom

**Current:** BOQ has no totals calculation. PDF has no subtotal/total row.

**Options:**
- **A: Map BOQ rows → `InputItem[]` → `computeDocument()`** — reuses canonical engine
- **B: Build BOQ-specific totals** — simpler, but duplicates logic
- **C: No totals on BOQ** — BOQ is a pricing schedule, not a financial document

**Recommendation:** Option A — `computeDocument()` is the financial source of truth. BOQ→Quotation conversion already uses SP as unit_price, so totals should be consistent.

### DECISION-4: BOQ→Quotation — DB relationship or trail-only

**Current:** Conversion stores trail in `custom_fields.conversionTrail`. No FK on `quotations` table.

**Options:**
- **A: Add `source_boq_id` FK to `quotations`** — proper relational link, enables "where did this quotation come from" queries
- **B: Keep trail-only** — simpler, no migration needed
- **C: Add `source_boq_id` + `source_type` generic FK** — extensible for other document types

**Recommendation:** Option A or C — proper FK is low-cost and enables better document lifecycle tracking. The existing `DocumentConversionTrail` pattern in `custom_fields` is redundant with a real FK.

### DECISION-5: BOQ Form — keep BoqForm or migrate to QuotationFormPage pattern

**Current:** `BoqForm` (72 lines, simple tabs) vs `QuotationFormPage` (450+ lines, full compute integration, group headers, PDF output).

**Options:**
- **A: Keep BoqForm** — it works, BOQ is simpler than Quotation
- **B: Migrate to QuotationFormPage pattern** — full compute integration, group headers, consistent UX
- **C: Extend BoqForm incrementally** — add totals, keep simplicity

**Recommendation:** Option C — add `computeDocument()` integration to BoqForm without rewriting it as QuotationFormPage. BOQ doesn't need all Quotation features (group headers, extra charges, WHT, signatories).

### DECISION-6: BOQ PDF — single-page or multi-page

**Current:** `TableDocumentPdfDocument` renders single A4 page. Long tables overflow.

**Options:**
- **A: Add page breaks** — chunk rows into ~20 per page
- **B: Keep single-page** — BOQs are typically short
- **C: Use the Invoice PDF renderer** — multi-page with groups, but requires row model conversion

**Recommendation:** Option A — low effort, prevents overflow for larger BOQs.

---

## 9. Summary of Findings

| Area | Status | Blocker |
|---|---|---|
| BOQ data model (`TableDocumentRow`) | Complete, well-typed | No |
| BOQ form (`BoqForm`) | Functional but minimal | No |
| BOQ view | Uses shared components, functional | No |
| BOQ list | Reads from Supabase, functional | No |
| BOQ→Quotation conversion | Already exists in `view-boq-actions.ts` | No |
| BOQ totals | **Not implemented** | **Yes — needs decision on computeDocument integration** |
| BOQ storage split | **Bug** — localStorage create, Supabase view | **Yes — needs decision on storage strategy** |
| BOQ PDF multi-page | **Not implemented** | Medium — overflow risk on large BOQs |
| cp/sp on Quotation | Not present — BOQ-only | Decision needed |
| BOQ→Quotation FK | Not present — trail-only | Decision needed |

---

## 10. Recommended Next Steps

1. **Resolve DECISION-1 (storage):** Migrate BOQ creation to Supabase. This is the critical blocker — the storage split means created BOQs may not appear in the list/view.

2. **Resolve DECISION-3 (totals):** Add `computeDocument()` integration to BoqForm with a simple row mapping. This enables totals display on the form and PDF.

3. **Resolve DECISION-5 (form):** Extend BoqForm incrementally — add totals preview, keep the existing simple tab layout.

4. **Resolve DECISION-4 (FK):** Add `source_boq_id` to quotations table for proper conversion tracking.

5. **Resolve DECISION-6 (PDF):** Add page break logic to `TableDocumentPdfDocument` for multi-page support.

6. **Defer DECISION-2 (cp on Quotation):** No current need — revisit if margin tracking is requested.

---

## Skills used: NONE
## Documentation standard: ASD-STE100 Simplified Technical English
