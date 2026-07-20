# Template Platform Audit Phase 1 Supplement

**Date:** 2026-06-27
**Scope:** READ-ONLY inspection — three gaps not covered in Phase 1
**Status:** Complete

---

## Executive Summary

This supplement closes three gaps from the Phase 1 audit:

1. **Advanced Invoice Compatibility** — All three production templates (Industry, Ledger, Obsidian) DO render advance summary. Apex is a placeholder. The advance summary rendering differs between templates but all three consume `data.advanceSummary` from the domain layer.

2. **Crest Template Candidate** — Strong structural candidate. Clean HTML with header/body/footer separation. Uses serif+sans font pairing (Cormorant Garamond + Inter). Advance summary section present in HTML. Visual identity distinct from Industry (gold accent, cream paper, editorial feel). CSS Grid layout would need adaptation to react-pdf flex.

3. **Table Architecture** — Industry uses shared `CommercialGroupHeaderRow`/`CommercialGroupFooterRow` components. Ledger and Obsidian have duplicated inline group rendering code. Only Industry has page-break-aware table rendering via `buildTableWithPageBreaks()`/`splitTableAcrossPages()`. Ledger uses `wrap={false}` extensively to force single-page rendering. Obsidian has no page-break or wrap control. Spreadsheet-style grouping is architecturally supported by the existing `rowType`/`groupId`/`groupLabel`/`groupSubtotalValue` model.

---

## 1. Advanced Invoice Compatibility Audit

### 1.1 Advance Summary Rendering — All Three Templates

Contrary to the Phase 1 finding that "only Industry renders advance summary," **all three production templates DO render advance summary**:

| Template | Advance Summary Rendering | Location |
|---|---|---|
| **Industry** | `data.advanceSummary` → styled `<View>` + `<Text>` + `<PdfCurrencyText>` with accent color | Industry.tsx:475-527 |
| **Ledger** | `advance` → `<View>` with `advanceBlock`/`advanceDue`/`advanceBal` styles | Ledger.tsx:258-269 |
| **Obsidian** | `advanceSummary` → `<View>` with `advanceSummaryContainer`/`advanceSummaryRow` styles | ObsidianReceipt.tsx:326-340 |
| **Apex** | NO advance summary rendering (placeholder) | N/A |

### 1.2 Data Flow

The advance summary data flows through:

1. **Domain layer:** `resolveAdvanceSummary()` in `src/domain/invoice/advanceSummary.ts` builds display rows
2. **Adapter:** `adaptCommercialDocumentData()` in `industryAdapter.ts:422-427` maps to `CommercialDocumentData.advanceSummary`
3. **Type:** `PdfAdvanceSummary` in `types.ts:103-110` defines the contract:
   ```typescript
   export type PdfAdvanceSummary = {
     primaryLabel?: string | null
     advanceAmount?: string | null
     secondaryLabel?: string | null
     balanceRemaining?: string | null
   }
   ```
4. **Templates:** Each template destructures `data.advanceSummary` and renders it

### 1.3 Rendering Differences

| Aspect | Industry | Ledger | Obsidian |
|---|---|---|---|
| **Visual prominence** | Box with accent left-border, subtle surface background | Inline block within totals section | Full-width container with border + surface background |
| **Primary label** | `advanceProminentLabel` (larger, accent color) | `advanceDueLbl` (normal weight) | `advanceSummaryLabel` (uppercase, bold) |
| **Advance amount** | `advanceProminentValue` (accent color, larger) | `advanceDueVal` (normal weight) | `advanceSummaryValue` (accent color) |
| **Secondary label** | `advanceLabel` (muted) | `advanceBalText` (normal) | `advanceSummaryLabel` (same as primary) |
| **Balance remaining** | `advanceValue` (normal) | `advanceBalTextVal` (normal) | `advanceSummaryValue` (same as advance) |
| **Conditional rendering** | Shows only if `advanceAmount` or `balanceRemaining` exist | Shows only if `isAdvanceInvoice` AND `advance` exist | Shows only if `advanceSummary` exists |
| **Separator between rows** | None (row spacing) | None (stacked Views) | `borderTopWidth: 1` divider between primary and secondary |

### 1.4 Key Finding

**All three templates render advance summary correctly.** The rendering style differs but the data contract is consistent. The Phase 1 finding that "only Industry renders advance summary" was incorrect — this was a grep miss because Ledger/Obsidian use `advance` (destructured) rather than `data.advanceSummary` (direct access).

### 1.5 Recommendation

No architectural changes needed. Each template's advance summary rendering is style-appropriate. Consider standardizing the visual prominence if branding consistency is desired.

---

## 2. Crest Template Candidate Audit

### 2.1 HTML Structure Analysis

The Crest HTML template (`docs/templates/htmltemps/crest.html`, 466 lines) uses a clean semantic structure:

```
<div class="invoice">                    ← outer wrapper
  <header class="header-band">          ← accent band with logo + company info
    <div class="header-inner">
      <div class="header-left">         ← logo + company name + tagline
      <div class="header-right">        ← document number + dates
  <section class="parties">             ← two-column company → client
    <div class="company">               ← company details
    <div class="client">                ← client details
  <section class="table-section">       ← items table
    <table>                             ← thead + tbody
  <section class="totals-section">      ← totals + bank + advance
    <div class="totals-right">          ← line items + grand total
    <div class="advance-block">         ← advance summary (if applicable)
  <footer class="footer-band">          ← page number + branding
```

**Structural alignment with Industry:** Header/body/footer separation is clean. The parties section, table section, and totals section map directly to Industry's component structure.

### 2.2 Font Pairing

| Role | Font | Availability |
|---|---|---|
| **Sans (body/UI)** | Inter | Google Fonts → `Font.register()` |
| **Serif (headings/accent)** | Cormorant Garamond | Google Fonts → `Font.register()` |

Both fonts are available via Google Fonts and can be registered with react-pdf's `Font.register()`. This is a distinctive serif+sans pairing that gives Crest an editorial/literary feel — unique among the current template set.

### 2.3 Color Palette

| Variable | Value | Usage |
|---|---|---|
| `--ink` | `#2d1f3a` | Dark purple — primary text |
| `--accent` | `#b28b3d` | Gold — header band, accents |
| `--accent-dim` | `#f9f3e6` | Cream — light tint |
| `--paper` | `#fdfbf7` | Off-white — page background |
| `--rule` | `#c5bdaa` | Warm grey — borders, dividers |
| `--panel` | `#f7f3ed` | Light warm grey — card backgrounds |

This is a warm, editorial palette (gold + cream + dark purple) that is visually distinct from Industry (cool blue), Ledger (green), and Obsidian (dark slate).

### 2.4 Advance Summary Support

Crest's HTML includes advance summary rendering at line ~380:

```html
<div class="advance-block">
  <div class="advance-row primary">
    <span class="advance-label">{advanceLabel}</span>
    <span class="advance-value">{advanceValue}</span>
  </div>
  <div class="advance-row secondary">
    <span class="advance-label">{balanceLabel}</span>
    <span class="advance-value">{balanceValue}</span>
  </div>
</div>
```

This maps directly to the `PdfAdvanceSummary` contract. No domain-layer changes needed.

### 2.5 Layout Considerations

| Aspect | Crest (HTML) | Industry (react-pdf) | Adaptation Required |
|---|---|---|---|
| **Parties** | CSS Grid two-column | `<View>` flex two-column | Replace grid with flex |
| **Header** | CSS gradient background | `<View>` + `backgroundColor` | Simplify gradient → solid |
| **Table** | `<table>` HTML | `<View>` rows + cells | Already the pattern |
| **Totals** | Flex row right-aligned | `<View>` flex right | Direct mapping |
| **Footer** | Fixed position | `<View>` fixed | Direct mapping |
| **Shadows/Gradients** | CSS `box-shadow`, `linear-gradient` | Not supported in react-pdf | Remove or replace with borders |

### 2.6 Risks

1. **CSS Grid → Flex migration:** The parties section uses `display: grid` which react-pdf does not support. Must be converted to flex layout.
2. **Gradients/shadows:** CSS `linear-gradient` and `box-shadow` are not supported in react-pdf. The header band gradient would need to become a solid color.
3. **Responsive print rules:** `@media print` rules in HTML have no react-pdf equivalent — layout must be designed for fixed PDF output.
4. **Custom properties:** CSS custom properties (variables) must be resolved to static values in the react-pdf template.

### 2.7 Recommendation

**Strong candidate for Phase 2 implementation.** Structural alignment with Industry is high. The advance summary is already designed. The serif+sans font pairing and gold palette offer genuine visual differentiation. CSS Grid → Flex and gradient removal are mechanical transformations.

**Estimated effort:** 2-3 days for full template conversion (HTML → Industry architecture).

---

## 3. Table Architecture Audit

### 3.1 Group Rendering — Shared vs. Duplicated

| Template | Group Header Component | Group Footer Component | Source |
|---|---|---|---|
| **Industry** | `CommercialGroupHeaderRow` | `CommercialGroupFooterRow` | `commercialDocumentBlocks.tsx` |
| **Ledger** | Inline `<View>` + `<Text>` | Inline `<View>` + `<Text>` + `<PdfCurrencyText>` | Ledger.tsx:132-148 |
| **Obsidian** | Inline `<View>` + `<Text>` | Inline `<View>` + `<Text>` + `<PdfCurrencyText>` | ObsidianReceipt.tsx:233-253 |

**Ledger inline group rendering (lines 132-148):**
```tsx
if (row.rowType === 'group_header') {
  return (
    <View key={rIndex} style={styles.groupHeader} wrap={false}>
      <Text style={styles.groupHeaderText}>{safeText(row.groupLabel)}</Text>
    </View>
  );
}
if (row.rowType === 'group_footer') {
  return (
    <View key={rIndex} style={styles.groupSubtotalRow} wrap={false}>
      <View style={{ flex: 1 }} />
      <Text style={styles.groupSubtotalLabel}>Group Total:</Text>
      <PdfCurrencyText value={safeText(row.groupSubtotalValue)} style={styles.groupSubtotalVal} />
    </View>
  );
}
```

**Obsidian inline group rendering (lines 233-253):**
```tsx
if (row.isGroupHeader) {
  tableChildren.push(
    <View key={`group-header-${rowIdx}`} style={compactStyles(styles.groupHeaderRow, { backgroundColor: surface })}>
      <Text style={compactStyles(styles.groupHeaderText, { color: text })}>
        {safeText(row.groupLabel)}
      </Text>
    </View>,
  );
  return;
}
if (row.isGroupFooter) {
  if (row.showSubtotal) {
    tableChildren.push(
      <View key={`group-footer-${rowIdx}`} style={styles.groupFooterRow}>
        <Text style={compactStyles(styles.groupSubtotalLabel, { color: muted })}>Subtotal</Text>
        <PdfCurrencyText value={safeText(row.groupSubtotalValue)} style={compactStyles(styles.groupSubtotalValue, { color: text })} />
      </View>,
    );
  }
  return;
}
```

**Key differences from Industry:**

| Aspect | Industry | Ledger | Obsidian |
|---|---|---|---|
| **Component extraction** | Shared `CommercialGroupHeaderRow`/`CommercialGroupFooterRow` | Inline, no component extraction | Inline, no component extraction |
| **Group label styling** | `ruleColor` accent line + muted text | Simple bold text | Surface background + body text color |
| **Subtotal rendering** | Right-aligned with muted label | Right-aligned with spacer View | Right-aligned with "Subtotal" label |
| **Row detection** | `row.isGroupHeader` / `row.isGroupFooter` | `row.rowType === 'group_header'` / `row.rowType === 'group_footer'` | `row.isGroupHeader` / `row.isGroupFooter` |
| **Wrap control** | No explicit `wrap={false}` on group rows | `wrap={false}` on group header and footer | No wrap control |

### 3.2 Page Break Handling

| Template | Page Break Logic | Table Overflow Strategy |
|---|---|---|
| **Industry** | `buildTableWithPageBreaks()` + `splitTableAcrossPages()` | Tables split across pages, group boundaries respected |
| **Ledger** | None — `wrap={false}` on all table rows | Forces entire table onto single page, risk of overflow |
| **Obsidian** | None — no wrap or breakable control | Default react-pdf behavior, may overflow silently |

**Industry's approach (lines 235-260):**
- `data.table.rows.map()` iterates rows
- Group headers/footers rendered as separate components
- Item rows rendered with `wrap={false}` only on specific rows
- `buildTableWithPageBreaks()` handles page-level splitting

**Ledger's approach (lines 131-184):**
- `table.rows.map()` iterates rows
- ALL rows wrapped with `wrap={false}` (group headers, footers, and item rows)
- Entire table forced onto single page
- If table exceeds page height, content will be clipped

**Obsidian's approach (lines 232-287):**
- `rows.forEach()` iterates rows, pushes to `tableChildren` array
- No `wrap` or `breakable` control on any rows
- Relies on default react-pdf behavior
- May overflow or clip depending on content length

### 3.3 Spreadsheet-Style Grouping Support

The existing data model supports spreadsheet-style grouping:

| Field | Type | Purpose |
|---|---|---|
| `row.isGroupHeader` / `row.rowType === 'group_header'` | boolean/string | Marks group header row |
| `row.isGroupFooter` / `row.rowType === 'group_footer'` | boolean/string | Marks group footer row |
| `row.groupLabel` | string | Group name/label |
| `row.groupId` | string | Groups rows by ID |
| `row.groupSubtotalValue` | string | Formatted subtotal |
| `row.showSubtotal` | boolean | Controls subtotal visibility |
| `row.isInGroup` | boolean | Marks item rows within a group |

**What exists:**
- Group header row (spans full width, shows label)
- Group footer row (shows subtotal, right-aligned)
- Item rows within group (can show `isInGroup` indentation hint)
- Group subtotal computation via `resolveGroupSubtotal()`

**What would need to change for spreadsheet-style:**
1. **Group footer row column alignment:** Currently footer shows only subtotal label + value. Spreadsheet-style would require the footer to have cells aligned to the item columns (e.g., subtotal in the amount column, empty cells elsewhere).
2. **Group header spanning:** Currently header spans full width. Spreadsheet-style would need the header to have a specific column span or be placed in a specific column.
3. **Nested groups:** Currently only one level of grouping is supported. Spreadsheet-style may require nested group headers/footers.
4. **Group header indentation:** Currently group headers are full-width. Spreadsheet-style may require indentation within the description column.

### 3.4 Key Findings

1. **Duplicated group rendering code:** Ledger and Obsidian each have their own inline group rendering logic that duplicates what `CommercialGroupHeaderRow`/`CommercialGroupFooterRow` provide. This is a maintenance risk — styling changes must be applied in three places.

2. **Page break vulnerability:** Ledger forces `wrap={false}` on all table rows, which prevents page breaks but risks content overflow on long invoices. Obsidian has no page-break control at all.

3. **Row detection inconsistency:** Ledger uses `row.rowType === 'group_header'` while Industry and Obsidian use `row.isGroupHeader`. Both work because `adaptCommercialDocumentData()` sets both properties, but it's a code consistency issue.

4. **Spreadsheet-style is architecturally feasible:** The `rowType`/`groupId`/`groupLabel`/`groupSubtotalValue` model already supports the concept. The main gap is visual — column-aligned group footers and indented group headers.

### 3.5 Risks

1. **Group rendering drift:** Three separate implementations of group rendering will diverge over time as templates are updated independently.
2. **Page break breakage:** Ledger's `wrap={false}` strategy will cause content overflow on invoices with many line items. Obsidian's lack of control may cause silent clipping.
3. **Spreadsheet-style implementation:** Would require changes to `industryAdapter.ts` (group footer cell generation), `commercialDocumentBlocks.tsx` (new components or props), and all three template renderers (accepting new row properties).

### 3.6 Recommendations

| Priority | Recommendation | Effort |
|---|---|---|
| **High** | Extract Ledger/Obsidian group rendering into shared components or at minimum ensure consistent row detection (`isGroupHeader` vs `rowType`) | 1 day |
| **High** | Audit Ledger's `wrap={false}` on long invoices — may need page-break support | 0.5 day |
| **Medium** | Add page-break-aware table rendering to Ledger and Obsidian (port `buildTableWithPageBreaks()` from Industry) | 2 days |
| **Low** | Design spreadsheet-style group footer with column-aligned cells (requires `industryAdapter.ts` changes) | 3 days |
| **Low** | Add nested group support (requires new `rowType` values and recursive rendering) | 5 days |

---

## 4. Risks Summary

| Risk | Severity | Mitigation |
|---|---|---|
| Ledger group rendering duplicated from shared components | Medium | Extract to shared components |
| Ledger `wrap={false}` on all table rows causes overflow | Medium | Audit with long invoices, add page-break support |
| Obsidian has no page-break control | Medium | Add `wrap={false}` or page-break logic |
| Crest CSS Grid → Flex migration | Low | Mechanical transformation |
| Crest gradients/shadows unsupported in react-pdf | Low | Replace with solid colors/borders |
| Spreadsheet-style grouping requires cross-cutting changes | Low | Design first, implement in Phase 2 |

---

## 5. Recommendations

1. **Advance invoice compatibility:** No changes needed — all templates render advance summary correctly.
2. **Crest template:** Proceed with Phase 2 implementation. Structurally clean, distinct visual identity, advance summary already designed. Estimate 2-3 days.
3. **Table architecture:** Prioritize extracting shared group components and adding page-break support to Ledger/Obsidian. Spreadsheet-style grouping is feasible but should be deferred to Phase 3.
4. **Code consistency:** Standardize row detection property (`isGroupHeader` vs `rowType`) across all templates.

---

*Report generated by READ-ONLY inspection. No code changes were made.*
