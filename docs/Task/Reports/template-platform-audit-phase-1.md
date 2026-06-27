# Template Platform Audit — Phase 1: Architectural Inspection

**Date:** 2026-06-27  
**Scope:** Read-only inspection of all PDF templates against Industry reference  
**Status:** Complete (Phase 1 only — no repairs)  
**Post-Removal:** Bolt template deleted. Remaining IDs: `industry`, `ledger`, `apex`, `obsidian-receipt`

---

## 1. Template Inventory & Completeness

| Template | Lines | Status | Purpose |
|----------|-------|--------|---------|
| **Industry** | 629 | Production reference | Full commercial invoice — parties, table, payments, totals, custom info, terms, notes, advance, signature, compact mode |
| **Ledger** | 464 | Production (editorial variant) | Dark-theme editorial layout — own party rendering, own styles, minimal shared infrastructure |
| **ObsidianReceipt** | 436 | Production (receipt variant) | Receipt-focused — own party cards, inline currency, own styles |
| **Apex** | 31 | **Placeholder — no rendering** | Hero band + title + "Apex is currently a placeholder" message only |
| ~~Bolt~~ | ~~520~~ | **DELETED** | Removed per audit Phase 1 completion |

---

## 2. Dependency Comparison vs Industry

### Industry (reference — full shared infrastructure)

| Dependency | Purpose |
|-----------|---------|
| `renderPdfRichText` | Rich text → PDF `<Text>` elements |
| `compactCommercialDocument` | Compact/landscape mode overrides |
| `PdfCurrencyText` | Currency with ₦/kobo formatting |
| `lightenHex` | Color tinting for backgrounds |
| `getAccentTint` | Accent color palette derivation |
| `CommercialPartyCard` | Shared party card renderer |
| `CommercialGroupHeaderRow` | Table group header row |
| `CommercialGroupFooterRow` | Table group footer row |
| `renderOptionalList` | Render arrays as PDF lists |
| `resolveIndustryColumnStyle` | Column width/style resolution |
| `resolveTextAlignmentStyle` | Text alignment within columns |
| `getCellText` | Cell content extraction |
| `getDescriptionMain/Sub` | Description splitting |
| `safeText` | HTML-safe text conversion |

### Ledger (minimal shared helpers)

| Dependency | Purpose |
|-----------|---------|
| `safeText` | Text safety only |
| `getDescriptionMain/Sub` | Description splitting |
| `PdfCurrencyText` | Currency rendering |

**Missing vs Industry:** `renderPdfRichText`, `compactCommercialDocument`, `CommercialPartyCard`, `CommercialGroupHeaderRow`, `CommercialGroupFooterRow`, `renderOptionalList`, `resolveIndustryColumnStyle`, `resolveTextAlignmentStyle`, `getCellText`, `lightenHex`, `getAccentTint`

### ObsidianReceipt (minimal shared helpers)

| Dependency | Purpose |
|-----------|---------|
| `safeText` | Text safety only |
| `getDescriptionMain/Sub` | Description splitting |
| `PdfCurrencyText` | Currency rendering |

**Missing vs Industry:** Same as Ledger — does not use shared party cards, group rows, compact mode, rich text, or column resolution.

### Apex (placeholder only)

| Dependency | Purpose |
|-----------|---------|
| `safeText` | Text safety only |

**Missing vs Industry:** Everything except text safety. No table, no parties, no payments, no totals.

---

## 3. HTML Safety Audit

### The Problem: Raw HTML Tags Flowing into PDF `<Text>` Elements

**`safeText()`** (`src/components/pdf-new/core/safeText.ts`):
- Converts `unknown → string`
- Handles objects by checking `label`/`name`/`text`/`main`/`value` properties
- Returns `''` for unrecognised objects
- **Does NOT sanitize HTML tags** — passes raw strings through

**`richText.ts`** (`src/components/pdf-new/core/richText.ts`):
- Has `escapeHtml()` function available
- Only used during HTML-to-AST parsing, NOT applied to raw content flowing into PDF

**Impact:**
- If any data source contains HTML (e.g., `<p>`, `<strong>`, `<em>`), it will render as raw text in the PDF
- `safeText` does not strip or escape `<`, `>`, `&` characters
- This is an existing issue across ALL templates, not introduced by any change

**Templates affected:**
- Industry: Uses `safeText` for party fields, descriptions, and content areas
- Ledger: Uses `safeText` throughout
- Obsidian: Uses `safeText` throughout
- Apex: Uses `safeText` in hero section

**Recommendation (not in scope for audit):** Apply `escapeHtml()` from `richText.ts` within `safeText()` to strip HTML tags, or add a dedicated `stripHtml()` helper.

---

## 4. Currency Formatting Audit

### The Problem: NGN Instead of ₦

**Shared component** (`src/components/pdf-new/pdfCurrency.tsx`):
- Uses `PdfCurrencyText` from shared infrastructure
- Accepts `currency`, `amount`, `locale` props
- Should render ₦ (naira) symbol

**Obsidian inline currency rendering:**
- ObsidianReceipt renders currency inline with its own prefix/suffix approach
- Does NOT use `PdfCurrencyText` for item-level currency
- May produce `NGN` instead of `₦` depending on locale resolution

**Ledger currency:**
- Uses `PdfCurrencyText` for totals section
- Party sections render amounts inline

**Apex:**
- No currency rendering — placeholder only

**Templates affected:**
- Obsidian: Inline currency rendering may show `NGN` instead of `₦`
- Ledger: Uses shared component — should be correct
- Industry: Uses shared component — should be correct

**Recommendation (not in scope):** Audit Obsidian's inline currency paths to ensure ₦ symbol is used consistently.

---

## 5. Feature Compatibility Matrix

| Feature | Industry | Ledger | Obsidian | Apex |
|---------|----------|--------|----------|------|
| Party cards (company + client) | ✅ `CommercialPartyCard` | ⚠️ Own rendering | ⚠️ Own rendering | ❌ None |
| Table (items) | ✅ Full table builder | ✅ Own table builder | ✅ Own table builder | ❌ None |
| Payment methods | ✅ `paymentMethodsProjection` | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Bank account details | ✅ `bankAccountProjection` | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Custom info | ✅ Rendered as inline text | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Terms & conditions | ✅ Rendered | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Notes | ✅ Rendered | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Advance payment | ✅ Rendered | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Signature line | ✅ Rendered | ❌ Not rendered | ❌ Not rendered | ❌ None |
| Compact/landscape mode | ✅ `compactCommercialDocument` | ❌ Not supported | ❌ Not supported | ❌ None |
| Group headers/footers | ✅ `CommercialGroupHeaderRow/FooterRow` | ❌ Own implementation | ❌ Own implementation | ❌ None |
| Description splitting | ✅ `getDescriptionMain/Sub` | ✅ Uses shared | ✅ Uses shared | ❌ None |
| Page layout | ✅ A4, responsive | ⚠️ Fixed A4 | ⚠️ Fixed A4 | ❌ None |
| Dark theme | ❌ | ✅ Editorial dark | ❌ | ❌ |
| Receipt layout | ❌ | ❌ | ✅ Receipt-focused | ❌ |

---

## 6. Page Breaking & Layout Issues

### Industry
- Uses `Page` component from `@react-pdf/renderer`
- Proper page break handling with `break` prop on groups
- Footer uses `fixed` positioning — no collision risk
- Compact mode available via `compactCommercialDocument`

### Ledger
- **Footer collision risk:** Absolute-positioned footer may overlap long documents
- No compact/landscape mode
- Fixed A4 layout — no responsive sizing
- **Issue:** If document has many items, footer may collide with last row

### ObsidianReceipt
- Receipt-focused layout — typically shorter documents
- Footer collision less likely due to receipt format
- No compact/landscape mode
- Fixed A4 layout

### Apex
- Placeholder only — no page layout to audit
- Only renders hero band + title

---

## 7. Obsidian Receipt — Deep Audit

### Architecture
- **Own party rendering:** Does NOT use `CommercialPartyCard` — has inline party cards with custom styling
- **Own table rendering:** Custom table builder, not using shared `buildCommercialTable`
- **Own currency rendering:** Inline prefix/suffix approach, may not use `PdfCurrencyText` consistently
- **Own styles:** `ObsidianReceiptStyles.ts` — completely independent style system

### Issues Found
1. **Currency formatting:** Inline currency rendering may produce `NGN` instead of `₦`
2. **Missing features:** No payment methods, no bank details, no custom info, no terms, no notes, no advance, no signature
3. **No compact mode:** Receipt format doesn't support landscape/compact
4. **Table behaviour divergence:** Own table builder may handle column widths differently than Industry
5. **Party rendering divergence:** Own party cards don't benefit from shared infrastructure improvements

### Recommendation (not in scope)
- Consider migrating to shared `CommercialPartyCard` for party rendering
- Consider migrating to shared `buildCommercialTable` for table rendering
- Add missing feature sections (payments, custom info, etc.)

---

## 8. Ledger — Deep Audit

### Architecture
- **Own party rendering:** Does NOT use `CommercialPartyCard` — inline party rendering with its own styles
- **Own table rendering:** Custom table builder
- **Uses shared:** `safeText`, `getDescriptionMain/Sub`, `PdfCurrencyText` only
- **Own styles:** `LedgerStyles.ts` — independent dark-theme style system

### Issues Found
1. **Footer collision risk:** Absolute-positioned footer may overlap long documents with many items
2. **Missing features:** No payment methods, no bank details, no custom info, no terms, no notes, no advance, no signature
3. **No compact mode:** Fixed A4 only
4. **Party rendering divergence:** Own party cards don't benefit from shared infrastructure
5. **Dark theme:** Uses dark backgrounds — may need special handling for currency/text contrast

### Recommendation (not in scope)
- Fix footer collision by using relative positioning or page break awareness
- Consider migrating party rendering to shared infrastructure
- Add missing feature sections

---

## 9. Apex — Placeholder Assessment

### Current State
- **31 lines total** — pure placeholder
- Renders: Hero band (accent color) + "Apex Invoice" title + "Apex is currently a placeholder" message
- No table, no parties, no payments, no totals, no custom info
- Uses `data.design.accentColor` for hero band only

### Issues Found
1. **No rendering capability:** Cannot render any invoice/quotation data
2. **Dead code:** Template exists in registry but produces no useful output
3. **Misleading presence:** Appears in template selector but generates blank PDF

### Recommendation (not in scope)
- Either implement Apex as a full template or remove from registry
- If keeping as placeholder, add clear UI indication that it's not yet functional

---

## 10. Summary of Findings

### Critical Issues
1. **HTML safety:** Raw HTML tags can flow into PDF `<Text>` elements across all templates
2. **Currency formatting:** Obsidian may render `NGN` instead of `₦` for item-level currency

### Major Issues
3. **Feature gap:** Only Industry supports all features (payments, custom info, terms, notes, advance, signature, compact mode)
4. **Party rendering divergence:** Ledger and Obsidian have own party rendering — don't benefit from shared infrastructure improvements
5. **Table rendering divergence:** Ledger and Obsidian have own table builders — may handle columns differently
6. **Footer collision:** Ledger's absolute-positioned footer risks overlapping long documents

### Minor Issues
7. **Apex is dead placeholder:** No rendering capability, misleading in template selector
8. **No compact mode:** Only Industry supports compact/landscape layout
9. **Style system fragmentation:** Each template has independent styles — no shared design tokens

### Recommendations (Phase 3+ — not in scope for audit)
1. Apply HTML sanitization in `safeText()` or add `stripHtml()` helper
2. Audit Obsidian's inline currency paths for ₦ symbol consistency
3. Migrate Ledger and Obsidian party rendering to shared `CommercialPartyCard`
4. Migrate Ledger and Obsidian table rendering to shared `buildCommercialTable`
5. Fix Ledger footer collision with page-break-aware positioning
6. Add missing feature sections to Ledger and Obsidian
7. Either implement Apex or remove from registry
8. Consider shared design tokens across templates

---

## Appendix: File Inventory (Post-Removal)

### Template Files
- `src/components/pdf-new/templates/Industry.tsx` — 629 lines
- `src/components/pdf-new/templates/Ledger.tsx` — 464 lines
- `src/components/pdf-new/templates/ObsidianReceipt.tsx` — 436 lines
- `src/components/pdf-new/templates/Apex.tsx` — 31 lines

### Style Files
- `src/components/pdf-new/templates/industryStyles.ts`
- `src/components/pdf-new/templates/LedgerStyles.ts`
- `src/components/pdf-new/templates/ObsidianReceiptStyles.ts`
- `src/components/pdf-new/templates/ApexStyles.ts`

### Shared Infrastructure
- `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` — Party cards, group rows, optional lists
- `src/components/pdf-new/core/safeText.ts` — HTML-unsafe text helper
- `src/components/pdf-new/core/richText.ts` — Rich text normalization (has `escapeHtml()`)
- `src/components/pdf-new/core/pdfRichText.ts` — PDF rich text rendering
- `src/components/pdf-new/core/pdfCompact.ts` — Compact mode overrides
- `src/components/pdf-new/core/description.ts` — Description splitting
- `src/components/pdf-new/pdfCurrency.tsx` — Currency rendering component

### Factory & Types
- `src/components/pdf-new/index.ts` — Template factory/registry
- `src/components/pdf-new/types.ts` — PDF model types
- `src/components/pdf-new/table.ts` — Table column/row builders
- `src/components/pdf-new/industryAdapter.ts` — Data adapter

### Domain Types (Post-Removal)
- `src/domain/invoice/types.ts` — `'bolt'` removed from `INVOICE_PDF_TEMPLATE_IDS`
- `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` — bolt removed from options
- `src/components/document/DocumentDesignControls.tsx` — bolt removed from preview map
