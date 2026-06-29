# Minimal & Evergreen — Commercial Invoice Template Implementation

## Summary

Two new commercial invoice PDF templates (`Minimal` and `Evergreen`) have been implemented using the existing Commercial Rendering Engine in `src/components/pdf-new/templates/`. Both templates achieve full feature parity with existing templates (Industry, Ledger, Crest) — no features omitted.

---

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `src/components/pdf-new/templates/MinimalStyles.ts` | ~260 | Monochrome palette, border-driven layout, compact spacing, section-based styles |
| `src/components/pdf-new/templates/Minimal.tsx` | ~412 | Full commercial invoice template, 11 sections |
| `src/components/pdf-new/templates/EvergreenStyles.ts` | ~630 | Green accent theme (#1f6e5c), rounded panels (6px radius), soft backgrounds |
| `src/components/pdf-new/templates/Evergreen.tsx` | ~415 | Full commercial invoice template, 11 sections |

## Files Modified

| File | Change |
|------|--------|
| `src/domain/invoice/types.ts` | Added `'minimal'` and `'evergreen'` to `INVOICE_PDF_TEMPLATE_IDS` array (type union widened) |
| `src/components/pdf-new/index.ts` | Added dynamic imports for Minimal and Evergreen modules, added switch cases for both template IDs |
| `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` | Added Minimal and Evergreen entries to `INVOICE_PDF_TEMPLATE_OPTIONS` array with Tailwind preview cards |

---

## Feature Parity

Both `Minimal.tsx` and `Evergreen.tsx` implement these 11 sections identically to existing templates:

| # | Section | Details |
|---|---------|---------|
| 1 | **Header** | Title, customTitle, brand info (name/address/cityState/phone/email), logo, document number/issue date/due date with labels |
| 2 | **Party Section** | From (company) + Bill To (client) side-by-side boxes, `buildPartyLines()` + `companyLineMap`/`clientLineMap` lookup |
| 3 | **Custom Header Fields** | PO number + `customHeaderFields` array, label/value pairs |
| 4 | **Table** | `resolveColumnLayout()` widths, `resolveTextAlignment()` alignment, alternating row backgrounds, group headers/footers/subtotals, description main/sub text, image thumbnails with links, `PdfCurrencyText` for monetary cells |
| 5 | **Bottom: Bank + Totals** | Bank details panel (name/account name/number/sort code), totals lines, main total, balance due (`balanceDue`), amount in words, advance invoice summary |
| 6 | **Notes** | `renderPdfRichText()` for rich text with paragraphs/lists, plain text fallback |
| 7 | **Terms** | Same pattern as Notes |
| 8 | **Attachments** | `buildAttachmentItems()`, links for URLs with `formattedUrl`, plain text fallback |
| 9 | **Additional Fields** | Label/value bar at bottom |
| 10 | **Signature** | Image (`uri`/`method`/`headers` pattern), line, name, role |
| 11 | **Fixed Footer** | Page numbering `render={({pageNumber, totalPages})}`, document number, company name, extra text, tagline |

---

## Design Language

### Minimal
- **Palette**: Monochrome — `#111827` ink, `#ffffff` paper, `#e5e7eb` rule, `#f5f5f5` panels
- **Layout**: Border-driven — thin rules separate sections, compact spacing, no rounded corners
- **Typography**: Helvetica, restrained use of bold, muted grays for secondary text
- **Visual inspiration**: Captures waybill Minimal's clean, restrained personality — adapted for invoice context

### Evergreen
- **Palette**: Green accent — `#1f6e5c` primary, `#e8f3ef` light, `#f0f6f2` pale panel, `#1a3a32` ink
- **Layout**: Rounded panels (6px border-radius), soft green backgrounds, accent bar at top, green table header
- **Typography**: Helvetica, green-tinted totals box, white-on-green balance due badge
- **Visual inspiration**: Captures waybill Evergreen's green accent bar + rounded brand pill — adapted for invoice context (accent bar becomes top bar, rounded brand pill becomes rounded logo + panel corners)

---

## Verification

- `bun run audit:load` — passed (no new warnings) ✓
- `bun run typecheck` — passed (zero errors) ✓
- `bun run build` — timed out (system limitation on Windows; no type errors) ⚠️

---

## Architecture Compliance

- ✅ PDFs are dumb renderers — no computation of prices/taxes/totals
- ✅ `src/lib/Calculations.ts` not modified
- ✅ Engine helpers reused (`buildPartyLines`, `buildAttachmentItems`, `resolveColumnLayout`, `resolveTextAlignment`, `buildTotalsLines`, `getMainTotal`, `getBalanceDue`, `getAmountInWords`, `buildAdvanceSummary`)
- ✅ Shared utilities reused (`renderPdfRichText`, `PdfCurrencyText`, `safeText`, `getDescriptionMain`, `getDescriptionSub`)
- ✅ Tailwind CSS v3.4 — no v4 syntax
- ✅ No duplicate business logic
- ✅ Waybill templates not structurally reused — visual inspiration only
