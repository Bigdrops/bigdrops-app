# Commercial Rendering Engine Architecture Report

> **Scope:** Engine-centric audit producing a consolidated blueprint for the Commercial Rendering Engine.
> **Date:** 2026-06-27
> **Status:** READ-ONLY architectural planning exercise — no implementation included.
> **Templates Audited:** Industry, Ledger, Obsidian, Apex.

---

## Table of Contents

1. [Common Engine Extraction Audit](#1-common-engine-extraction-audit)
2. [Dependency Consolidation Matrix](#2-dependency-consolidation-matrix)
3. [Switch Compliance Audit](#3-switch-compliance-audit)
4. [Rendering Pipeline Audit](#4-rendering-pipeline-audit)
5. [Crest Suitability Score](#5-crest-suitability-score)
6. [Advanced Invoice Compliance](#6-advanced-invoice-compliance)
7. [Engine Boundaries & Package Structure](#7-engine-boundaries--package-structure)
8. [Migration Order](#8-migration-order)
9. [Risk Matrix](#9-risk-matrix)
10. [Final Recommendations](#10-final-recommendations)
11. [Appendix — File Reference](#11-appendix--file-reference)

---

## 1. Common Engine Extraction Audit

### Current State

Shared infrastructure is fragmented across three locations:

| Location | Contents | Used By |
|----------|----------|---------|
| `src/components/pdf-new/core/` | safeText, description, richText, pdfRichText, pdfCompact | All templates |
| `src/components/pdf-new/` | industryAdapter, table, types, index, PdfRenderer | All templates |
| `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` | Party cards, group rows, optional list | Industry only (directly) |

### Extraction Candidates

| Function | Current Location | Extract To Engine | Reason |
|----------|------------------|-------------------|--------|
| `resolveIndustryColumnStyle()` | industryStyles.ts:573 | YES | Generic flex/width resolver, not Industry-specific |
| `resolveTextAlignmentStyle()` | industryStyles.ts:593 | YES | Trivial alignment helper |
| `CommercialPartyCard` | commercialDocumentBlocks.tsx | YES | Used by Industry; Ledger/Obsidian duplicate inline |
| `CommercialGroupHeaderRow` | commercialDocumentBlocks.tsx | YES | Used by Industry; Ledger/Obsidian duplicate inline |
| `CommercialGroupFooterRow` | commercialDocumentBlocks.tsx | YES | Used by Industry; Ledger/Obsidian duplicate inline |
| `renderOptionalList()` | commercialDocumentBlocks.tsx | YES | Generic list renderer |
| `getAccentTint()` | commercialDocumentBlocks.tsx | YES | Generic color utility |
| `compactCommercialDocument` | pdfCompact.ts | YES | Already generic; only missing Ledger/Obsidian integration |
| `PdfCurrencyText` | pdfCurrency.tsx | YES | Already shared |

### Non-Extraction Candidates (Template-Specific)

| Function | Current Location | Keep In Template | Reason |
|----------|------------------|------------------|--------|
| Column width overrides | industryStyles.ts:15-26 | Industry | Industry-specific column proportions |
| `buildTableWithPageBreaks()` | Industry.tsx:240-340 | Industry | Industry-specific pagination |
| `splitTableAcrossPages()` | Industry.tsx (called from above) | Industry | Group-aware page break logic |
| `renderAdvanceSummary()` | Industry.tsx:220-255 | Industry | Industry-specific advance render |
| All style objects | All *Styles.ts files | Each template | Distinct visual identity |
| `resolveAlignment()` | ObsidianReceiptStyles.ts:383 | Obsidian | Identical to Industry but kept separate |

---

## 2. Dependency Consolidation Matrix

### Shared Utilities Usage

| Dependency | Industry | Ledger | Obsidian | Apex | Engine Candidate |
|------------|----------|--------|----------|------|------------------|
| `safeText()` | YES | YES | YES | YES | Already core |
| `getDescriptionMain/Sub()` | YES | YES | YES | NO | Already core |
| `PdfCurrencyText` | YES | YES | YES | NO | Already engine |
| `compactCommercialDocument` | YES | NO | NO | NO | Should be engine-wide |
| `renderPdfRichText` | YES | NO | NO | NO | Should be engine-wide |
| `pdfRichText` | YES | NO | NO | NO | Should be engine-wide |
| `lightenHex` / `getAccentTint` | YES | NO | NO | NO | Should be engine-wide |
| `CommercialPartyCard` | YES | NO | NO | NO | Should be engine-wide |
| `CommercialGroupHeaderRow/FooterRow` | YES | NO | NO | NO | Should be engine-wide |
| `renderOptionalList()` | YES | NO | NO | NO | Should be engine-wide |
| `resolveIndustryColumnStyle()` | YES | NO | NO | NO | Should be engine-wide |
| `resolveTextAlignmentStyle()` | YES | NO | NO | NO | Should be engine-wide |

### Import Counts Per Template

| Template | Total imports from pdf-new | Shared imports | Inline duplicates |
|----------|---------------------------|----------------|-------------------|
| Industry | 13 | 13 (all shared) | 0 |
| Ledger | 3 | 3 | Party cards (60+ lines), group rows (16 lines), optional list |
| Obsidian | 3 | 3 | Party cards (40+ lines), group rows (20 lines), optional list |
| Apex | 1 | 1 | N/A (placeholder) |

**Key finding:** Ledger and Obsidian only import 3 shared utilities (`safeText`, `getDescriptionMain/Sub`, `PdfCurrencyText`). They duplicate party cards, group rows, and optional list rendering inline. This is the primary extraction opportunity.

---

## 3. Switch Compliance Audit

### Template Factory (`index.ts`)

- Switch statement at lines 14-25 handles: `industry`, `ledger`, `apex`, `obsidian-receipt`
- Bolt removed — verified no remaining references
- Default case throws `Error` for unknown template IDs
- Factory wraps template in `PdfRenderer` before calling `pdf()` from react-pdf/renderer
- Post-removal template IDs: `['industry', 'ledger', 'apex', 'obsidian-receipt']`

### Design Preset System

| Property | Type | Default (Invoice) | Industry Uses | Ledger Uses | Obsidian Uses | Apex Uses |
|----------|------|--------------------|---------------|-------------|---------------|-----------|
| `accentColor` | hex | `#14b8a6` | YES (with fallback) | NO (hardcoded `#7b8b6f`) | NO (hardcoded `#1a1a1a`) | NO (hardcoded `#0f172a`) |
| `textColor` | hex | `#0f172a` | YES (with fallback) | NO (hardcoded `#2b2b2b`) | NO (hardcoded `#1a1a1a`) | NO (hardcoded `#0f172a`) |
| `mutedColor` | hex | `#475569` | YES (with fallback) | NO (hardcoded `#6b6560`) | NO (hardcoded `#8c8279`) | NO (hardcoded `#64748b`) |
| `borderColor` | hex | `#cbd5e1` | Used via styles | NO (hardcoded `#cdc9c1`) | NO (hardcoded `#e4ded4`) | NO (hardcoded `#e2e8f0`) |
| `surfaceColor` | hex | `#f8fafc` | Used via styles | NO (hardcoded `#f4f2ed`) | NO (hardcoded `#fcfaf8`) | NO (hardcoded `#ffffff`) |
| `headerFont` | choice | `Inter` | Used via `Font.register()` | NO (hardcoded `Times-Roman`) | NO (hardcoded `Times-Bold`) | NO (hardcoded `Helvetica-Bold`) |
| `bodyFont` | choice | `Inter` | Used via `Font.register()` | NO (hardcoded `Helvetica`) | NO (hardcoded `Helvetica`) | NO (hardcoded `Helvetica`) |

**Finding:** Only Industry respects the design preset system. Ledger, Obsidian, and Apex have hardcoded palettes. This is by design (visual identity preservation) but means design preset customization only affects Industry output.

---

## 4. Rendering Pipeline Audit

### Current Pipeline

```
buildPdfRenderPayload(invoice) → PdfRenderPayload
    ↓
industryAdapter.ts → CommercialDocumentData
    ↓
PdfRenderer.tsx → resolves layout, wraps in <Document>
    ↓
Template component → react-pdf <Page>/<View>/<Text>
    ↓
react-pdf/renderer pdf() → Blob
```

### Data Flow Per Template

| Stage | Industry | Ledger | Obsidian | Apex |
|-------|----------|--------|----------|------|
| Payload → Adapter | YES | YES | YES | YES |
| Design preset resolution | YES | NO (hardcoded) | NO (hardcoded) | NO (hardcoded) |
| Grouping logic (rowType/groupId) | YES | YES | YES | N/A |
| Column definitions | YES | YES | YES | N/A |
| Advance summary mapping | YES | YES | YES | N/A |
| Logo/image URL resolution | YES | YES | YES | N/A |
| Signature mapping | YES | YES | YES | N/A |
| Compact mode | YES | NO | NO | NO |
| Page-break tables | YES | NO (wrap=false) | NO (no control) | N/A |
| Shared group components | YES | NO (inline) | NO (inline) | N/A |
| Shared party cards | YES | NO (inline) | NO (inline) | N/A |

### Critical Gaps

1. **Ledger `wrap={false}` on ALL rows:** Forces every row to not break across pages. Works for small invoices but causes overflow for large invoices (20+ rows). Industry's `buildTableWithPageBreaks()` handles this correctly.

2. **Obsidian NO wrap/break control:** No `wrap` prop on rows, no page-break logic. Silent overflow risk — large invoices may render with content cut off at page boundary.

3. **Only Industry has `buildTableWithPageBreaks()` + `splitTableAcrossPages()`:** These functions in Industry.tsx (lines 240-340) process table rows into pages, respecting `keepTogether` for group headers. Ledger and Obsidian lack this entirely.

4. **Only Industry uses shared `CommercialPartyCard` and group components:** Ledger and Obsidian duplicate these inline, creating maintenance burden and divergence risk.

### Advance Summary Rendering

All three templates render advance summary. Phase 1 incorrectly stated only Industry does.

| Template | Render Location | Variable Name | Render Pattern |
|----------|----------------|---------------|----------------|
| Industry | Line ~220 | `data.advanceSummary` | `renderAdvanceSummary()` function |
| Ledger | Lines 258-269 | `advance` (destructured) | Inline `<View>` + `<Text>` |
| Obsidian | Lines 326-340 | `advanceSummary` | Inline `<View>` + `<Text>` |

**Phase 1 grep missed Ledger/Obsidian because:** Ledger destructures `advance` from `data.advance` (not `data.advanceSummary`), and Obsidian uses `data.advanceSummary` but was not checked with a destructuring-aware pattern. Both render it correctly.

---

## 5. Crest Suitability Score

### HTML Template Analysis

| Criterion | Score | Notes |
|-----------|-------|-------|
| CSS Grid support | 0/10 | React-pdf does not support CSS Grid (`display: grid`) |
| Gradient/shadow support | 0/10 | `linear-gradient` and `box-shadow` unsupported in react-pdf |
| Font viability | 8/10 | Inter + Cormorant Garamond both on Google Fonts, react-pdf `Font.register()` compatible |
| Color palette | 9/10 | Solid hex colors only — `#2d1f3a` (ink), `#b28b3d` (gold accent), `#f9f3e6` (cream), `#fdfbf7` (paper), `#c5bdaa` (rule) |
| Advance summary section | 8/10 | Has advance section in HTML (`advance-block` div) |
| Grouping | UNKNOWN | Not tested in HTML |
| Party layout | 4/10 | Uses CSS Grid — requires migration to flex |
| Table layout | 5/10 | Uses CSS Grid — requires migration to flex |
| Overall structural fit | 5/10 | Requires significant CSS Grid → Flex migration |

### Crest Color Palette (from HTML)

```
--ink: #2d1f3a        (dark purple — primary text)
--accent: #b28b3d     (gold — accent, borders, highlights)
--accent-dim: #f9f3e6 (cream — accent background tint)
--paper: #fdfbf7      (off-white — page background)
--rule: #c5bdaa       (warm grey — borders, rules)
--panel: #f7f3ed      (light warm grey — card backgrounds)
```

### Crest Fonts (from HTML)

- **Headings:** Cormorant Garamond (serif) — Google Fonts
- **Body:** Inter (sans) — already registered in `pdfSharedFonts.ts`

### Crest Viability Verdict

**Viable but requires substantial work.** CSS Grid → Flex migration for parties and table. Gradient/shadow → solid color replacement. Font registration straightforward (Inter already registered, Cormorant Garamond needs `Font.register()`). Not a quick port — estimated 2-3 days of implementation.

**Recommendation:** Crest is a strong candidate for the 5th template slot but should NOT be attempted until the engine extraction (Phases 1-3) is complete and stable.

---

## 6. Advanced Invoice Compliance

### Architectural Invariant

From `pdf-rendering-correctness` skill and `advanceProjection.contract.ts`:

> An Advance Invoice is a STRICT 1:1 CLONE of the parent invoice. It is NOT a derived dataset. It is NOT a transformed financial model. The projection carries ONLY presentation overrides: invoice_number (with suffix), invoice_title (advance label), and footer context (advance due / balance upon completion). Items are NEVER carried on the projection — they are always sourced directly from the parent invoice at the point of use.

### Allowed Modifications

| Modification | Status | Evidence |
|-------------|--------|----------|
| invoice_number suffix | ALLOWED | `advanceMetadata.ts:138-162` — `deriveDocumentNumber()` adds suffix |
| invoice_title override | ALLOWED | `advanceProjection.contract.ts:10` — `invoice_title` field |
| Footer rendering (advance due / balance) | ALLOWED | `advanceSummary.ts` — `getAdvanceSummaryValues()` |
| Items modification | FORBIDDEN | `advanceProjection.contract.ts:14-15` — "Items are NEVER carried" |
| Total recalculation | FORBIDDEN | Invariant: parent is sole truth |
| Synthetic line items | FORBIDDEN | Invariant: parent is sole truth |

### Compliance Per Template

| Template | Renders Advance Summary | Modifies Items | Modifies Totals | Compliant |
|----------|------------------------|----------------|-----------------|-----------|
| Industry | YES (line ~220) | NO | NO | YES |
| Ledger | YES (lines 258-269) | NO | NO | YES |
| Obsidian | YES (lines 326-340) | NO | NO | YES |
| Apex | NO (placeholder) | NO | NO | YES (N/A) |

### Advance Pipeline Architecture

```
advanceMetadata.ts → getAdvanceInvoiceMetadata() → AdvanceInvoiceMetadata
    ↓
advanceChildFlow.ts → buildAdvanceParentInvoiceMetadata() → metadata for parent
    ↓
advanceProjection.contract.ts → AdvanceInvoiceProjection (parentId, invoice_number, invoice_title, isVirtualProjection: true)
    ↓
buildPdfRenderPayload.ts → PdfRenderPayload { identity, items (from parent), totals (from parent), meta: { isVirtualProjection } }
    ↓
industryAdapter.ts → CommercialDocumentData { advance: PdfAdvanceSummary }
    ↓
Template renders advance summary rows (dumb renderer)
```

### `PdfAdvanceSummary` Contract (types.ts:103-110)

```typescript
type PdfAdvanceSummary = {
  title: string;
  lines: Array<{ label: string; value: number }>;
  balanceLabel: string;
  balanceValue: number;
};
```

---

## 7. Engine Boundaries & Package Structure

### Proposed Engine Package Structure

```
src/components/pdf-new/
├── engine/                          # NEW — extracted common engine
│   ├── index.ts                     # Re-exports all engine primitives
│   ├── CommercialPartyCard.tsx      # From commercialDocumentBlocks.tsx
│   ├── CommercialGroupHeaderRow.tsx # From commercialDocumentBlocks.tsx
│   ├── CommercialGroupFooterRow.tsx # From commercialDocumentBlocks.tsx
│   ├── renderOptionalList.tsx       # From commercialDocumentBlocks.tsx
│   ├── resolveColumnStyle.ts        # From industryStyles.ts
│   ├── resolveAlignment.ts          # From industryStyles.ts
│   ├── getAccentTint.ts             # From commercialDocumentBlocks.tsx
│   └── CompactOverrides.ts          # From pdfCompact.ts
├── core/                            # EXISTING — unchanged
│   ├── safeText.ts
│   ├── description.ts
│   ├── richText.ts
│   ├── pdfRichText.ts
│   └── pdfCompact.ts
├── templates/                       # EXISTING — templates consume engine
│   ├── Industry.tsx
│   ├── Ledger.tsx
│   ├── ObsidianReceipt.tsx
│   ├── Apex.tsx
│   └── commercialDocumentBlocks.tsx # Slimmed — exports move to engine/
├── industryAdapter.ts               # EXISTING — unchanged
├── table.ts                         # EXISTING — unchanged
├── types.ts                         # EXISTING — unchanged
├── pdfCurrency.tsx                  # EXISTING — unchanged
├── index.ts                         # EXISTING — unchanged
└── renderers/
    └── PdfRenderer.tsx              # EXISTING — unchanged
```

### Boundary Rules

1. **`engine/`** contains ONLY presentation primitives — components, style resolvers, utilities. No data shaping, no business logic.
2. **`core/`** contains ONLY text/data manipulation — safeText, description, richText. No components, no styling.
3. **`templates/`** consume both `engine/` and `core/` — never import from each other.
4. **`industryAdapter.ts`** and **`table.ts`** stay at root — they shape data, not render.
5. **`types.ts`** stays at root — shared type definitions consumed by all.
6. **`pdfCurrency.tsx`** stays at root — already shared currency rendering component.
7. **`index.ts`** stays at root — template factory, unchanged.
8. **`PdfRenderer.tsx`** stays at renderers/ — minimal wrapper, unchanged.

### What Moves vs What Stays

| Item | Moves To Engine | Stays In Place | Reason |
|------|-----------------|----------------|--------|
| `CommercialPartyCard` | YES | | Generic party card, reusable across templates |
| `CommercialGroupHeaderRow` | YES | | Generic group header, reusable |
| `CommercialGroupFooterRow` | YES | | Generic group footer, reusable |
| `renderOptionalList()` | YES | | Generic list renderer |
| `getAccentTint()` | YES | | Generic color utility |
| `resolveIndustryColumnStyle()` | YES → `resolveColumnStyle.ts` | | Generic flex/width resolver |
| `resolveTextAlignmentStyle()` | YES → `resolveAlignment.ts` | | Generic alignment helper |
| `compactCommercialDocument` | YES → `CompactOverrides.ts` | | Already generic |
| `PdfCurrencyText` | Already at root | YES | Already shared |
| `safeText()` | Already in core/ | YES | Already shared |
| `getDescriptionMain/Sub()` | Already in core/ | YES | Already shared |
| `buildTableWithPageBreaks()` | NO | Industry | Industry-specific pagination |
| `splitTableAcrossPages()` | NO | Industry | Industry-specific page break logic |
| `renderAdvanceSummary()` | NO | Industry | Industry-specific advance render |
| All style objects | NO | Each template | Distinct visual identity |
| Column width overrides | NO | Industry | Industry-specific proportions |

---

## 8. Migration Order

### Phase 1: Extract Engine Primitives (No Behavior Change)

**Goal:** Create `engine/` directory and move shared components without changing any rendering.

| Step | Action | Risk | Verification |
|------|--------|------|--------------|
| 1 | Create `src/components/pdf-new/engine/` directory | None | Directory exists |
| 2 | Move `CommercialPartyCard` from `commercialDocumentBlocks.tsx` → `engine/CommercialPartyCard.tsx` | Low | Import path updated |
| 3 | Move `CommercialGroupHeaderRow` from `commercialDocumentBlocks.tsx` → `engine/CommercialGroupHeaderRow.tsx` | Low | Import path updated |
| 4 | Move `CommercialGroupFooterRow` from `commercialDocumentBlocks.tsx` → `engine/CommercialGroupFooterRow.tsx` | Low | Import path updated |
| 5 | Move `renderOptionalList` from `commercialDocumentBlocks.tsx` → `engine/renderOptionalList.tsx` | Low | Import path updated |
| 6 | Move `getAccentTint` from `commercialDocumentBlocks.tsx` → `engine/getAccentTint.ts` | Low | Import path updated |
| 7 | Move `resolveIndustryColumnStyle` from `industryStyles.ts` → `engine/resolveColumnStyle.ts` | Low | Import path updated |
| 8 | Move `resolveTextAlignmentStyle` from `industryStyles.ts` → `engine/resolveAlignment.ts` | Low | Import path updated |
| 9 | Update `commercialDocumentBlocks.tsx` to re-export from `engine/` (backward compat) | Low | Existing imports still work |
| 10 | Update `industryStyles.ts` to re-export from `engine/` (backward compat) | Low | Existing imports still work |
| 11 | Create `engine/index.ts` with all re-exports | None | Barrel file exists |
| 12 | Run typecheck, build, audit:load | None | All pass |

**Estimated time:** 30-45 minutes.

### Phase 2: Ledger Adopts Engine Components

**Goal:** Replace Ledger's inline party cards and group rows with shared engine components.

| Step | Action | Risk | Verification |
|------|--------|------|--------------|
| 1 | Replace Ledger inline party cards (~60 lines) with `CommercialPartyCard` | Medium | Visual comparison |
| 2 | Replace Ledger inline group header (~8 lines) with `CommercialGroupHeaderRow` | Medium | Visual comparison |
| 3 | Replace Ledger inline group footer (~8 lines) with `CommercialGroupFooterRow` | Medium | Visual comparison |
| 4 | Import `resolveColumnStyle` and `resolveAlignment` from engine/ | Low | Typecheck passes |
| 5 | Run typecheck, build, audit:load | None | All pass |
| 6 | Visual regression test — compare before/after | Medium | No visual differences |

**Estimated time:** 1-2 hours.

### Phase 3: Obsidian Adopts Engine Components

**Goal:** Replace Obsidian's inline party cards and group rows with shared engine components.

| Step | Action | Risk | Verification |
|------|--------|------|--------------|
| 1 | Replace Obsidian inline party cards (~40 lines) with `CommercialPartyCard` | Medium | Visual comparison |
| 2 | Replace Obsidian inline group header (~10 lines) with `CommercialGroupHeaderRow` | Medium | Visual comparison |
| 3 | Replace Obsidian inline group footer (~8 lines) with `CommercialGroupFooterRow` | Medium | Visual comparison |
| 4 | Import `resolveColumnStyle` and `resolveAlignment` from engine/ | Low | Typecheck passes |
| 5 | Run typecheck, build, audit:load | None | All pass |
| 6 | Visual regression test — compare before/after | Medium | No visual differences |

**Estimated time:** 1-2 hours.

### Phase 4: Compact Mode Integration

**Goal:** Enable compact/landscape mode for Ledger and Obsidian using existing `compactLedger` and `compactObsidian` overrides from `pdfCompact.ts`.

| Step | Action | Risk | Verification |
|------|--------|------|--------------|
| 1 | Ledger: import `compactLedger` overrides from `pdfCompact.ts` | Low | Import works |
| 2 | Ledger: apply compact overrides when `layout.compact === 'landscape'` | Medium | Layout renders correctly |
| 3 | Obsidian: import `compactObsidian` overrides from `pdfCompact.ts` | Low | Import works |
| 4 | Obsidian: apply compact overrides when `layout.compact === 'landscape'` | Medium | Layout renders correctly |
| 5 | Test compact rendering for all templates | Medium | No visual regressions |

**Estimated time:** 1 hour.

### Phase 5: Page-Break Tables for Ledger/Obsidian

**Goal:** Add page-break-aware table rendering to prevent overflow for large invoices.

| Step | Action | Risk | Verification |
|------|--------|------|--------------|
| 1 | Ledger: Replace `wrap={false}` on all rows with page-break logic | High | Multi-page test |
| 2 | Obsidian: Add page-break logic (currently has no wrap control) | High | Multi-page test |
| 3 | Test with 20+ row invoices | Medium | No content cutoff |
| 4 | Verify group headers stay with their items | Medium | `keepTogether` respected |

**Estimated time:** 2-3 hours.

---

## 9. Risk Matrix

| Risk | Likelihood | Impact | Phase | Mitigation |
|------|------------|--------|-------|------------|
| Ledger/Obsidian visual regression after adopting engine components | HIGH | MEDIUM | 2, 3 | Snapshot comparison before/after each template migration |
| Group rendering breakage (wrong styles, misaligned subtotals) | MEDIUM | HIGH | 2, 3 | Unit tests for group header/footer; visual regression |
| Compact mode breaks layout for Ledger/Obsidian | MEDIUM | LOW | 4 | Visual regression tests; compact overrides already defined |
| Page-break tables cause layout shift or content loss | HIGH | HIGH | 5 | Test with 20+ row invoices; verify group `keepTogether` |
| Engine extraction breaks backward compatibility | LOW | HIGH | 1 | Re-export from original locations; typecheck verification |
| Crest CSS Grid → Flex migration produces layout drift | HIGH | MEDIUM | Future | Prototype first; validate with react-pdf before committing |
| Design preset changes unexpectedly affect Ledger/Obsidian | LOW | LOW | N/A | Document that Ledger/Obsidian have hardcoded palettes |
| Advance summary rendering breaks during refactoring | LOW | HIGH | 2, 3 | Test with advance invoice data; verify `PdfAdvanceSummary` contract |
| Ledger `wrap={false}` removal causes new overflow issues | MEDIUM | MEDIUM | 5 | Test with small and large invoices; compare page counts |
| Obsidian page-break logic causes silent content loss | MEDIUM | HIGH | 5 | Visual verification; compare before/after page counts |

---

## 10. Final Recommendations

### Immediate (Phases 1-2)

1. **Extract engine primitives** — Low risk, high value. Creates single source of truth for party cards, group rows, and utility functions.
2. **Ledger adopts `CommercialPartyCard` and group components** — Reduces ~80 lines of duplicated code. Maintains visual identity through prop variations.
3. **Obsidian adopts same** — Consistency with engine primitives.

### Medium-Term (Phases 3-4)

4. **Compact mode for Ledger/Obsidian** — Already defined in `pdfCompact.ts` (`compactLedger`, `compactObsidian`). Just needs integration into template components.
5. **Page-break tables for Ledger** — Prevents single-page overflow risk for large invoices. Ledger currently forces `wrap={false}` on all rows.

### Long-Term (Phase 5+)

6. **Crest template** — Viable but requires 2-3 days CSS Grid → Flex migration. Should NOT be attempted until engine extraction is complete and stable.
7. **Standardize advance summary rendering** — Consider a shared `renderAdvanceSummary()` component in engine/ that all templates can use (with style overrides per template).
8. **Make Ledger/Obsidian respect design preset (optional)** — Currently hardcoded. Could be made configurable but risk losing visual identity.

### Do NOT Do

- **Do not create a new template registry system** — Current factory in `index.ts` is sufficient.
- **Do not unify visual identity** — Templates should remain distinct (Industry = clean corporate, Ledger = editorial dark, Obsidian = receipt-focused, Apex = placeholder).
- **Do not extract advance summary rendering to engine** — It is template-specific by design. Each template has a distinct advance summary visual treatment.
- **Do not add new DB tables** — The current `custom_fields` JSONB with `advance_invoice` nested key is sufficient for all template metadata.
- **Do not modify `Calculations.ts`** — Single source of truth for financial calculations. Templates receive pre-calculated totals.

---

## 11. Appendix — File Reference

### Template Files

| File | Lines | Role |
|------|-------|------|
| `src/components/pdf-new/templates/Industry.tsx` | 629 | Reference template — full shared infrastructure, advance summary, page-break tables |
| `src/components/pdf-new/templates/Ledger.tsx` | 464 | Editorial dark theme — own party/group rendering, has advance summary, `wrap={false}` |
| `src/components/pdf-new/templates/ObsidianReceipt.tsx` | 436 | Receipt-focused — own party/group rendering, has advance summary, no wrap control |
| `src/components/pdf-new/templates/Apex.tsx` | 31 | Placeholder — hero band + title + placeholder message |

### Style Files

| File | Lines | Role |
|------|-------|------|
| `src/components/pdf-new/templates/industryStyles.ts` | 597 | Industry styles + group styles + `resolveIndustryColumnStyle()` |
| `src/components/pdf-new/templates/LedgerStyles.ts` | 521 | Ledger styles + own group styles |
| `src/components/pdf-new/templates/ObsidianReceiptStyles.ts` | 387 | Obsidian styles + own group styles + `resolveAlignment()` |
| `src/components/pdf-new/templates/ApexStyles.ts` | 58 | Apex styles |

### Shared Infrastructure

| File | Lines | Role |
|------|-------|------|
| `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` | — | Party cards, group rows, optional list |
| `src/components/pdf-new/industryAdapter.ts` | — | Data adapter — grouping logic, advance summary mapping |
| `src/components/pdf-new/table.ts` | — | Table column/row builders |
| `src/components/pdf-new/types.ts` | — | PDF model types |
| `src/components/pdf-new/index.ts` | — | Template factory/registry |
| `src/components/pdf-new/pdfCurrency.tsx` | 25 | Currency rendering component |
| `src/components/pdf-new/core/safeText.ts` | — | HTML-unsafe text helper |
| `src/components/pdf-new/core/description.ts` | — | Description splitting helpers |
| `src/components/pdf-new/core/richText.ts` | — | Rich text normalization, `escapeHtml()` |
| `src/components/pdf-new/core/pdfRichText.ts` | — | PDF rich text rendering |
| `src/components/pdf-new/core/pdfCompact.ts` | 89 | Compact mode overrides (all templates) |
| `src/components/pdf-new/renderers/PdfRenderer.tsx` | 54 | PDF renderer wrapper |

### Advance Pipeline

| File | Lines | Role |
|------|-------|------|
| `src/domain/invoice/advanceMetadata.ts` | 350 | Advance invoice metadata parsing and normalization |
| `src/domain/invoice/advanceProjection.contract.ts` | 32 | `AdvanceInvoiceProjection` type |
| `src/domain/invoice/advanceSummary.ts` | 69 | `getAdvanceSummaryValues()` — advance due / balance |
| `src/domain/invoice/advanceChildFlow.ts` | 166 | `buildAdvanceParentInvoiceMetadata()` — metadata builder |
| `src/domain/invoice/buildPdfRenderPayload.ts` | 29 | Builds `PdfRenderPayload` from invoice |

### Font/Design Infrastructure

| File | Lines | Role |
|------|-------|------|
| `src/lib/pdfDesignPreset.ts` | 347 | Design preset system — colors, fonts, fillable fonts |
| `src/lib/pdfFontRegistry.ts` | 83 | Font registration for react-pdf |
| `src/lib/pdfSharedFonts.ts` | 150 | Shared font configs — Inter, Roboto, etc. |

### Reports

| File | Role |
|------|------|
| `docs/Task/reports/template-platform-audit-phase-1.md` | Phase 1 audit report |
| `docs/Task/reports/template-platform-audit-phase-1-supplement.md` | Supplement audit (Advanced Invoice, Crest, Tables) |
| `docs/Task/reports/commercial-rendering-engine-architecture-report.md` | This report |
