# Commercial Rendering Engine — Architecture Audit

**Date:** 2026-06-27
**Status:** Read-Only Audit Complete
**Scope:** `src/components/pdf-new/` — full rendering pipeline

---

## 1. Executive Summary

The Commercial Rendering Engine was introduced during Phase 1 to centralize PDF rendering. Phase 2 revealed the engine cannot serve Ledger or Obsidian because every engine component hardcodes `industryStyles` — a reverse dependency from engine to template. This audit maps the full dependency graph, classifies every module, and proposes a three-layer architecture (Core → Engine → Presentation) that eliminates the coupling.

**Key finding:** The engine currently contains zero genuinely reusable components. All four JSX components (`CommercialPartyCard`, `CommercialGroupHeaderRow`, `CommercialGroupFooterRow`, `renderOptionalList`) are Industry-specific presentation disguised as engine primitives. Only three engine modules (`resolveTextAlignmentStyle`, `getAccentTint`, `resolveColumnStyle`) contain behaviour without style coupling — and even `resolveColumnStyle` embeds Industry-specific column width overrides.

The fix is not style injection. The fix is a clean separation: behaviour in Engine, presentation in Presentation.

---

## 2. Existing Architecture

### 2.1 Layer Map

```
pdf-new/
├── core/                         (6 files — genuine reusable utilities)
│   ├── safeText.ts               unknown → string conversion
│   ├── description.ts            main/sub description extraction
│   ├── richText.ts               HTML parser → RichTextDocument
│   ├── pdfRichText.ts            RichTextDocument → React-PDF elements
│   ├── pdfCompact.ts             compact mode style overrides
│   └── displayValue.ts           hasDisplayValue predicate
│
├── engine/                       (8 files — intended reusable layer)
│   ├── index.ts                  barrel re-exports
│   ├── CommercialPartyCard.tsx   party card component
│   ├── CommercialGroupHeaderRow.tsx  group header
│   ├── CommercialGroupFooterRow.tsx  group footer
│   ├── renderOptionalList.tsx    attachment list
│   ├── resolveColumnStyle.ts     column width resolver
│   ├── resolveTextAlignmentStyle.ts  alignment resolver
│   └── getAccentTint.ts          color tint helper
│
├── templates/                    (9 files — template-specific)
│   ├── Industry.tsx              Industry invoice
│   ├── industryStyles.ts         Industry stylesheet
│   ├── Ledger.tsx                Ledger invoice
│   ├── LedgerStyles.ts           Ledger stylesheet
│   ├── ObsidianReceipt.tsx       Obsidian receipt
│   ├── ObsidianReceiptStyles.ts  Obsidian stylesheet
│   ├── Apex.tsx                  Apex placeholder
│   ├── ApexStyles.ts             Apex stylesheet
│   └── commercialDocumentBlocks.tsx  compatibility re-exports
│
├── industryAdapter.ts            data model + adapter
├── pdfCurrency.tsx               currency text component
└── types.ts                      shared types
```

### 2.2 Responsibility Boundaries (Current)

| Layer | Intended Responsibility | Actual Responsibility |
|-------|----------------------|----------------------|
| `core/` | Shared utilities, no rendering | Correct — all 6 files are presentation-agnostic |
| `engine/` | Reusable rendering primitives | Broken — all JSX components import `industryStyles` |
| `templates/` | Template-specific rendering | Partially correct — Industry delegates to engine, Ledger/Obsidian do everything inline |

---

## 3. Architectural Problems

### Problem 1: Reverse Dependency (Critical)

Engine components import from the template layer:

```
engine/CommercialPartyCard.tsx    →  imports styles from templates/industryStyles
engine/CommercialGroupHeaderRow.tsx → imports styles from templates/industryStyles
engine/CommercialGroupFooterRow.tsx → imports styles from templates/industryStyles
engine/renderOptionalList.tsx     →  imports styles from templates/industryStyles
```

This creates a circular ownership problem: the engine depends on the template it is supposed to serve. Any change to `industryStyles` ripples into the engine, and the engine cannot serve any template that does not use `industryStyles`.

### Problem 2: Engine Contains Presentation, Not Behaviour

The engine's JSX components contain both structure (which fields to render, in what order) and presentation (exact padding, font sizes, colors, borders). These are inseparable without modification.

Example — `CommercialPartyCard` renders:
- A `View` with `styles.partyBox` (padding: 16, border, borderRadius: 3)
- Title with `styles.partyTitle` (fontSize: 14, color: #7d8a88)
- Name with `styles.partyName` (fontSize: 12.5, fontWeight: bold)
- Lines with `styles.partyLine` (fontSize: 10, color: #374151)

Ledger renders the same semantic content (company/client info) with completely different layout and styling. There is no shared behaviour to extract — only shared data.

### Problem 3: Industry-Specific Overrides in Engine

`resolveColumnStyle.ts` contains `INDUSTRY_COLUMN_OVERRIDES` — hardcoded width/flex values for Industry's column keys (`num: 20, description: flex 3.7, quantity: width 44`). Ledger does not use these overrides. Obsidian does not use these overrides. The function is Industry-specific despite living in the engine.

### Problem 4: Duplicate Rendering Logic Across Templates

Ledger and Obsidian each contain inline implementations of:
- Group header rendering (different styling each)
- Group footer rendering (different labels, different layout)
- Attachment rendering (Ledger adds `formatValidUrl`, Obsidian uses different styling)
- Column alignment resolution (Obsidian has its own `resolveAlignment`)
- Bank details rendering (different label formats)
- Totals rendering (different panel layouts)

This duplication is the cost of the failed extraction — each template had to reimplement because the engine could not serve them.

---

## 4. Component Classification

### Engine Exports

| Component | Classification | Justification | Future |
|-----------|---------------|---------------|--------|
| `CommercialPartyCard` | **Template Presentation** | Hardcodes `industryStyles.partyBox`, `partyTitle`, `partyName`, `partyLine`. Pure Industry presentation. | Move to `presentation/industry/` |
| `CommercialGroupHeaderRow` | **Template Presentation** | Hardcodes `industryStyles.tableGroupHeader`, `groupTitleCell`. Industry-only styling. | Move to `presentation/industry/` |
| `CommercialGroupFooterRow` | **Template Presentation** | Hardcodes `industryStyles.tableGroupFooter`, `groupSubtotalRow`. Industry-only styling. | Move to `presentation/industry/` |
| `renderOptionalList` | **Template Presentation** | Hardcodes `industryStyles.attachmentItem`, `attachmentLink`. Industry-only rendering. | Move to `presentation/industry/` |
| `resolveColumnStyle` | **Mixed (requires redesign)** | Logic is generic (width/flex resolution), but contains `INDUSTRY_COLUMN_OVERRIDES` table. | Split: generic resolver in engine, overrides in industry |
| `resolveTextAlignmentStyle` | **Pure Reusable Behaviour** | No style imports. Returns plain `{ textAlign }` objects. | Keep in engine (or move to core) |
| `getAccentTint` | **Pure Reusable Behaviour** | Pure function. No imports. Accepts hex, returns tinted hex. | Keep in engine |

### Core Exports

| Module | Classification | Justification |
|--------|---------------|---------------|
| `safeText` | **Pure Reusable Behaviour** | No dependencies. Universal utility. |
| `getDescriptionMain/Sub` | **Pure Reusable Behaviour** | No style imports. Universal extraction. |
| `richText.ts` (parser) | **Pure Reusable Behaviour** | No rendering. Pure parsing logic. |
| `pdfRichText.ts` (renderer) | **Mixed** | Imports React-PDF primitives but accepts style props via options. Could serve any template. | Keep in core with style injection via options. |
| `pdfCompact.ts` | **Mixed** | Contains `compactCommercialDocument`, `compactLedger`, `compactObsidian`. All three are template-specific compact overrides. | Split into per-template files. |
| `displayValue` | **Pure Reusable Behaviour** | Trivial predicate. No dependencies. | Keep in core. |

### Template Files

| File | Classification | Notes |
|------|---------------|-------|
| `Industry.tsx` | **Template Presentation** | 628 lines. Full invoice rendering with engine delegation. |
| `industryStyles.ts` | **Template Presentation** | 553 lines. Industry-specific stylesheet. |
| `Ledger.tsx` | **Template Presentation** | 348 lines. All rendering inline. No engine usage. |
| `LedgerStyles.ts` | **Template Presentation** | 521 lines. Ledger-specific stylesheet. |
| `ObsidianReceipt.tsx` | **Template Presentation** | 392 lines. All rendering inline. No engine usage. |
| `ObsidianReceiptStyles.ts` | **Template Presentation** | 387 lines. Obsidian-specific stylesheet. |
| `Apex.tsx` | **Template Presentation** | 31 lines. Placeholder. |
| `ApexStyles.ts` | **Template Presentation** | 58 lines. Placeholder stylesheet. |
| `commercialDocumentBlocks.tsx` | **Compatibility Layer** | Re-exports engine components. Exists only so Industry's import path works. |

---

## 5. Dependency Analysis

### Current Dependency Graph

```
                    ┌──────────────────────────────┐
                    │         External              │
                    │  @react-pdf/renderer          │
                    │  pdfCurrency.tsx              │
                    │  pdfDesignPreset.ts           │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │         Core (6 files)        │
                    │  safeText, description,       │
                    │  richText, pdfRichText,       │
                    │  pdfCompact, displayValue     │
                    └──────────┬───────────────────┘
                               │
              ┌────────────────▼────────────────────┐
              │         Engine (8 files)             │
              │  CommercialPartyCard ◄─────────────┼──── PROBLEM: imports industryStyles
              │  CommercialGroupHeaderRow ◄─────────┼──── PROBLEM: imports industryStyles
              │  CommercialGroupFooterRow ◄─────────┼──── PROBLEM: imports industryStyles
              │  renderOptionalList ◄───────────────┼──── PROBLEM: imports industryStyles
              │  resolveColumnStyle ◄───────────────┼──── PROBLEM: INDUSTRY_COLUMN_OVERRIDES
              │  resolveTextAlignmentStyle          │
              │  getAccentTint                      │
              └──────────┬─────────────────────────┘
                         │
          ┌──────────────▼──────────────────────┐
          │        Templates                     │
          │  Industry.tsx ──► industryStyles.ts  │
          │  Ledger.tsx ──► LedgerStyles.ts      │
          │  ObsidianReceipt.tsx ──► ObsidianStyles│
          │  Apex.tsx ──► ApexStyles.ts          │
          └─────────────────────────────────────┘
```

**Reverse dependency:** Engine → Templates (industryStyles)
**Circular risk:** If Industry were to import from engine, and engine imports from industryStyles, the cycle would be: Industry → engine → industryStyles → (Industry re-exports from industryStyles). The `commercialDocumentBlocks.tsx` compatibility layer currently breaks this cycle by re-exporting engine components, but the engine's direct import of `industryStyles` remains problematic.

### What the Correct Graph Should Look Like

```
                    ┌──────────────────────────────┐
                    │         External              │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │         Core                  │
                    │  safeText, description,       │
                    │  richText, pdfRichText,       │
                    │  displayValue                 │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │         Engine                │
                    │  resolveTextAlignmentStyle    │
                    │  resolveColumnStyle (generic)  │
                    │  getAccentTint                │
                    └──────────┬───────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │         Presentation                    │
          │  industry/   ledger/   obsidian/        │
          │  (own JSX, own styles, own layout)      │
          └─────────────────────────────────────────┘
```

No reverse dependencies. No circular risks. Clean ownership.

---

## 6. Duplication Analysis

### Party Card / Address Block

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Concept | Two-card "From"/"To" panel | Single "Bill To" panel + company in header | Inline text blocks in meta grid |
| Rendering | `CommercialPartyCard` component | Inline JSX | Inline JSX |
| Styling | `partyBox` (border, padding 16, borderRadius) | `addressBlock` (border-bottom, padding 24) | `partyBlock` (no border, marginBottom 14) |
| Shared behaviour? | Display company/client name, address, phone, email | — | — |
| Shared presentation? | **NO** | — | — |
| Extract to engine? | **NO** — each has unique layout concept |

### Group Header

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Data source | `row.groupName \|\| row.groupLabel` | `row.groupLabel` | `row.groupLabel` |
| Container | `tableGroupHeader` (borderTop, marginTop 14) | `groupHeader` (borderBottom, no margin) | `groupHeaderRow` (borderBottom, marginVertical 4) |
| Typography | 10.5px, Helvetica-Bold, letter-spacing 0.1 | 8px, bold, uppercase, text-transform | 10px, Helvetica-Bold |
| Shared behaviour? | Display group label text | — | — |
| Shared presentation? | **NO** | — | — |
| Extract? | **NO** — presentation is the differentiator |

### Group Footer / Subtotal

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Label | None (value only, right-aligned) | "Group Total:" + value | "Subtotal" + value |
| Container | `tableGroupFooter` (borderBottom 1.8, backgroundColor) | `groupSubtotalRow` (borderTop + borderBottom, no bg) | `groupFooterRow` (no border, marginTop 4) |
| Shared behaviour? | Display subtotal value for a group | — | — |
| Shared presentation? | **NO** | — | — |
| Extract? | **NO** |

### Column Alignment

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Implementation | `resolveTextAlignmentStyle(column)` | Inline ternary: `col.align === 'right' ? ...` | `resolveAlignment(col.align)` |
| Logic | `right → { textAlign: 'right' }`, `center → { textAlign: 'center' }`, else `null` | `right → textRight`, `center → textCenter`, else `textLeft` | `right → { textAlign: 'right' }`, `center → { textAlign: 'center' }`, else `{ textAlign: 'left' }` |
| Shared behaviour? | **YES** — identical mapping | — | — |
| Shared presentation? | **YES** — same logic | — | — |
| Extract? | **YES** — move to `core/alignment.ts` |

### Attachment Rendering

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Items format | `Array<{ label?, url? }>` | `Array<{ label?, url? }>` | `Array<{ label?, url? }>` or strings |
| URL handling | Raw `item.url` | `formatValidUrl(item.url)` adds `https://` | Raw `item.url` |
| Styling | `attachmentItem` / `attachmentLink` | `attachmentItem` / `attachmentLink` | `attachmentItem` / `attachmentLink` |
| Shared behaviour? | Map items to Text/Link elements | — | — |
| Shared presentation? | **NO** — Ledger adds URL formatting, Obsidian supports string items | — | |
| Extract? | **NO** — behaviour differs |

### Bank Details

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Labels | "Bank", "Account Name", "Account Number", "Sort Code" | "Bank:", "Account Name:", "Account No:", "Sort Code:" | Inline: `Bank: ${value}` |
| Layout | Row-based (`bankLabel` 98px + `bankValue` flex 1) | Row-based (`bankLabel` 40% + `bankVal` 60%) | Single-line concatenated |
| Container | `bankBox` (border, borderRadius, padding 16) | `bankDetails` (border, borderRadius, padding 12) | No container |
| Shared behaviour? | Display bank fields conditionally | — | — |
| Shared presentation? | **NO** | — | — |
| Extract? | **NO** |

### Totals Panel

| Feature | Industry | Ledger | Obsidian |
|---------|----------|--------|----------|
| Layout | Right-aligned `totalsBox` (width: 232, border) | `totalsPanel` (width: 40%, bgPanel) | `totalsBlock` (flex: 1, border-top) |
| Balance Due | Colored bar (`balanceDue` bg: accent, white text) | Grand total row | Regular total line |
| Amount in Words | Italic text with padding | Right-aligned italic | Italic, no special styling |
| Shared behaviour? | Display list of label+value pairs, main total, optional balance | — | — |
| Shared presentation? | **NO** | — | — |
| Extract? | **NO** |

---

## 7. Recommended Architecture

### Design Principles

1. **Behaviour reusable** — Engine contains functions that transform data, not render UI
2. **Presentation template-specific** — Each template owns its JSX, styles, and layout
3. **No style injection APIs** — Templates don't pass style objects to engine; they call behaviour functions and render their own UI
4. **Zero circular dependencies** — Core never imports from Engine; Engine never imports from Templates
5. **Data flows one direction** — Model → Engine (behaviour) → Template (presentation)

### Layer Responsibilities

| Layer | Owns | Does NOT Own |
|-------|------|-------------|
| **Core** | Text utilities, description extraction, rich text parsing, currency display, display predicates, alignment helpers | Any rendering, any React components |
| **Engine** | View model builders, layout resolvers, column calculations, row formatting, colour utilities | JSX, styles, template-specific layout decisions |
| **Presentation** | JSX, StyleSheet, layout, typography, spacing, borders, colours, footer architecture, header architecture | Business logic, calculations, data transformation |

---

## 8. View Model Contracts

### PartyViewModel

**Purpose:** Normalized representation of a company or client for display.
**Producer:** Engine behaviour function.
**Consumer:** Any template that needs to display party information.

| Field | Type | Description |
|-------|------|-------------|
| `role` | `'issuer' \| 'recipient'` | Whether this is the company or client |
| `name` | `string` | Display name |
| `address` | `string` | Street address |
| `cityState` | `string` | City, state composite |
| `phone` | `string` | Phone number |
| `email` | `string` | Email address |
| `website` | `string \| null` | Website URL |
| `customInfo` | `Array<{ label: string; value: string }>` | Additional fields |

### GroupHeaderViewModel

**Purpose:** Normalized group header data.
**Producer:** Engine behaviour function.
**Consumer:** Any template rendering grouped tables.

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Display label (falls back through groupName → groupLabel → '') |
| `groupId` | `string \| null` | Group identifier |
| `rowIdx` | `number` | Row index for React key |

### GroupFooterViewModel

**Purpose:** Normalized group footer / subtotal data.
**Producer:** Engine behaviour function.
**Consumer:** Any template rendering grouped tables.

| Field | Type | Description |
|-------|------|-------------|
| `showSubtotal` | `boolean` | Whether to display subtotal |
| `subtotalValue` | `string \| null` | Formatted subtotal string |
| `subtotalLabel` | `string \| null` | Label text (template decides default: "Subtotal", "Group Total:", etc.) |
| `groupId` | `string \| null` | Group identifier |
| `rowIdx` | `number` | Row index for React key |

### AttachmentViewModel

**Purpose:** Normalized attachment item.
**Producer:** Engine behaviour function.
**Consumer:** Any template rendering attachment lists.

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Display text |
| `url` | `string \| null` | URL if linkable |
| `formattedUrl` | `string \| null` | URL with protocol prefix ensured |

### ColumnLayoutModel

**Purpose:** Resolved column width and flex for a given column definition.
**Producer:** Engine behaviour function.
**Consumer:** Any template rendering tables.

| Field | Type | Description |
|-------|------|-------------|
| `width` | `number \| null` | Fixed width if specified |
| `flexGrow` | `number` | Flex grow factor |
| `flexShrink` | `number` | Flex shrink factor |
| `flexBasis` | `number` | Flex basis |

### DescriptionModel

**Purpose:** Parsed description cell with main and sub parts.
**Producer:** Engine behaviour function (wraps existing `getDescriptionMain`/`getDescriptionSub`).
**Consumer:** Any template rendering description columns.

| Field | Type | Description |
|-------|------|-------------|
| `main` | `string` | Primary description text |
| `sub` | `string \| null` | Secondary description text |

### TotalsModel

**Purpose:** Normalized totals data.
**Producer:** Engine behaviour function (already in `industryAdapter.ts`).
**Consumer:** Any template rendering totals panels.

| Field | Type | Description |
|-------|------|-------------|
| `lines` | `Array<{ label: string; value: string }>` | Subtotal lines |
| `mainLine` | `{ label: string; value: string } \| null` | Main total (e.g., "Grand Total") |
| `amountInWords` | `string` | Words representation |
| `balanceDue` | `{ label: string; value: string } \| null` | Balance due line |
| `isAdvance` | `boolean` | Whether this is an advance invoice |

### AdvanceSummaryModel

**Purpose:** Normalized advance invoice summary.
**Producer:** Engine behaviour function.
**Consumer:** Templates rendering advance invoice sections.

| Field | Type | Description |
|-------|------|-------------|
| `primaryLabel` | `string` | Label for advance amount |
| `advanceAmount` | `string` | Formatted advance amount |
| `secondaryLabel` | `string` | Label for balance remaining |
| `balanceRemaining` | `string` | Formatted remaining balance |

---

## 9. Engine Design

The Engine should contain **behaviour functions** — pure functions that accept data and return view models or style-ready values. No JSX. No style imports.

### Behaviour Modules

| Module | Responsibility | Inputs | Outputs |
|--------|---------------|--------|---------|
| `buildPartyViewModel` | Normalize company/client data | `CommercialDocumentData.company \| client` | `PartyViewModel` |
| `buildGroupHeaderViewModel` | Extract group header data | `table.rows[i]` | `GroupHeaderViewModel` |
| `buildGroupFooterViewModel` | Extract group footer data | `table.rows[i]` | `GroupFooterViewModel` |
| `buildAttachmentViewModels` | Normalize attachment list, ensure URLs | `attachments[]` | `AttachmentViewModel[]` |
| `resolveColumnLayout` | Compute column width/flex | `column definition` + `overrides?` | `ColumnLayoutModel` |
| `resolveAlignment` | Map align string to style object | `align?: string` | `{ textAlign } \| null` |
| `buildTotalsModel` | Normalize totals data | `CommercialDocumentData.totals` | `TotalsModel` |
| `buildAdvanceModel` | Normalize advance summary | `CommercialDocumentData.advanceSummary` | `AdvanceSummaryModel \| null` |
| `getAccentTint` | Generate transparent tint of a colour | `hexColor, fallback` | `string` |
| `safeText` | Convert unknown to display string | `unknown` | `string` |
| `getDescriptionMain/Sub` | Extract description parts | `cell value` | `string` |

### What Moves Out of Engine

| Current Engine Module | Destination | Reason |
|----------------------|-------------|--------|
| `CommercialPartyCard` | `presentation/industry/` | Pure Industry presentation |
| `CommercialGroupHeaderRow` | `presentation/industry/` | Pure Industry presentation |
| `CommercialGroupFooterRow` | `presentation/industry/` | Pure Industry presentation |
| `renderOptionalList` | `presentation/industry/` | Pure Industry presentation |
| `resolveColumnStyle` | Split: generic → `engine/`, overrides → `presentation/industry/` | Overrides are Industry-specific |
| `commercialDocumentBlocks.tsx` | Delete | Compatibility shim no longer needed |

---

## 10. Presentation Design

### Industry

| Aspect | Owns? | Notes |
|--------|-------|-------|
| JSX | Yes | Full invoice layout with company header, party cards, table, bank details, totals, notes, terms, attachments, signature, footer |
| Styles | Yes | `industryStyles.ts` — 553 lines, complete stylesheet |
| Layout | Yes | Party cards side-by-side, bank details left / totals right, signature bottom-right |
| Typography | Yes | Helvetica family, specific font sizes per element |
| Spacing | Yes | Page padding 14/64/24, party gap 14, table margin 8, etc. |
| Borders | Yes | Rounded party boxes (borderRadius 3), colored table borders |
| Headers | Yes | Company logo right, title left, meta rows below |
| Footers | Yes | 3-column: page number, doc number, company name |
| Group visuals | Yes | Border-top group headers, border-bottom footers, left-border for group items |
| Compact mode | Yes | `compactCommercialDocument` overrides |
| Customisation | Yes | Design preset colours and fonts applied via props |

### Ledger

| Aspect | Owns? | Notes |
|--------|-------|-------|
| JSX | Yes | Full invoice with centered logo header, address panel, table, bank details, totals, signature, footer |
| Styles | Yes | `LedgerStyles.ts` — 521 lines |
| Layout | Yes | Company name left / logo center / title right; 50/50 address panel; dashed table borders |
| Typography | Yes | Times-Roman for doc title, Helvetica-Bold for brand, specific sizes |
| Spacing | Yes | Page padding 0, header padding 24, table padding 24, etc. |
| Borders | Yes | Dashed row borders, solid header border, rule-color separators |
| Headers | Yes | Three-column: company info, centered logo, document title + meta |
| Footers | Yes | Fixed absolute: doc number left, page center, company right |
| Group visuals | Yes | Bottom-border group headers, bottom-border footers with "Group Total:" label |
| Compact mode | Yes | `compactLedger` overrides |
| Customisation | None currently | No design preset integration (future) |

### Obsidian

| Aspect | Owns? | Notes |
|--------|-------|-------|
| JSX | Yes | Receipt-style layout with header, meta grid, table, advance summary, notes, terms, attachments, signature |
| Styles | Yes | `ObsidianReceiptStyles.ts` — 387 lines |
| Layout | Yes | Two-column meta grid (parties left, dates + totals right), minimal table |
| Typography | Yes | Times-Bold for invoice title, Helvetica-Bold for headings |
| Spacing | Yes | Page padding 24, items padding 16, etc. |
| Borders | Yes | Accent-colored header border, dashed table borders |
| Headers | Yes | Logo + company left, title + doc number badge right |
| Footers | Yes | Fixed absolute: doc number left, page center, company right |
| Group visuals | Yes | Background色 group headers with border-bottom |
| Compact mode | Yes | `compactObsidian` overrides |
| Customisation | Yes | Design preset colours applied inline |

---

## 11. Proposed Module Layout

```
pdf-new/
├── core/
│   ├── safeText.ts                    (unchanged)
│   ├── description.ts                 (unchanged)
│   ├── richText.ts                    (unchanged)
│   ├── pdfRichText.ts                 (unchanged)
│   ├── displayValue.ts                (unchanged)
│   ├── alignment.ts                   (NEW — resolveAlignment extracted from engine)
│   └── pdfCompact.ts                  (REFACTORED — split into per-template files)
│
├── engine/
│   ├── party.ts                       (NEW — buildPartyViewModel)
│   ├── groupHeader.ts                 (NEW — buildGroupHeaderViewModel)
│   ├── groupFooter.ts                 (NEW — buildGroupFooterViewModel)
│   ├── attachments.ts                 (NEW — buildAttachmentViewModels)
│   ├── columnLayout.ts                (NEW — resolveColumnLayout, generic only)
│   ├── totals.ts                      (NEW — buildTotalsModel, buildAdvanceModel)
│   ├── colour.ts                      (MOVED — getAccentTint)
│   └── index.ts                       (REWRITTEN — exports behaviour functions)
│
├── presentation/
│   ├── industry/
│   │   ├── IndustryTemplate.tsx       (MOVED — from templates/Industry.tsx)
│   │   ├── industryStyles.ts          (MOVED — from templates/industryStyles.ts)
│   │   ├── PartyCard.tsx              (MOVED — from engine/CommercialPartyCard.tsx)
│   │   ├── GroupHeaderRow.tsx         (MOVED — from engine/CommercialGroupHeaderRow.tsx)
│   │   ├── GroupFooterRow.tsx         (MOVED — from engine/CommercialGroupFooterRow.tsx)
│   │   ├── OptionalList.tsx           (MOVED — from engine/renderOptionalList.tsx)
│   │   ├── IndustryColumnOverrides.ts (NEW — extracted from resolveColumnStyle)
│   │   └── compact.ts                (MOVED — from core/pdfCompact.ts compactCommercialDocument)
│   ├── ledger/
│   │   ├── LedgerTemplate.tsx         (MOVED — from templates/Ledger.tsx)
│   │   ├── ledgerStyles.ts            (MOVED — from templates/LedgerStyles.ts)
│   │   └── compact.ts                 (MOVED — from core/pdfCompact.ts compactLedger)
│   └── obsidian/
│       ├── ObsidianTemplate.tsx        (MOVED — from templates/ObsidianReceipt.tsx)
│       ├── obsidianStyles.ts           (MOVED — from templates/ObsidianReceiptStyles.ts)
│       └── compact.ts                  (MOVED — from core/pdfCompact.ts compactObsidian)
│
├── industryAdapter.ts                 (unchanged)
├── pdfCurrency.tsx                    (unchanged)
└── types.ts                           (unchanged)
```

### Rationale

- **No `templates/` folder** — templates become presentation modules. The old folder name implies they are lightweight wrappers; they are not.
- **No engine JSX** — engine becomes pure behaviour. Zero React imports.
- **Core stays minimal** — alignment helper moves in; everything else stays.
- **Compact overrides colocated** with their template — `pdfCompact.ts` currently holds overrides for all three templates in one file. Each template should own its compact overrides.
- **Industry column overrides colocated** with Industry — they are not generic.

---

## 12. Migration Roadmap

### Phase 2: Architecture Redesign (This Document)

**Goal:** Produce definitive architecture that all future work follows.
**Files affected:** None (read-only audit).
**Risk:** None.
**Success criteria:** Architecture document reviewed and approved.

### Phase 3: Behaviour Extraction

**Goal:** Create engine behaviour functions. Move Industry JSX to `presentation/industry/`. Delete engine JSX components. Delete `commercialDocumentBlocks.tsx`.
**Files affected:**
- Create: `engine/party.ts`, `engine/groupHeader.ts`, `engine/groupFooter.ts`, `engine/attachments.ts`, `engine/columnLayout.ts`, `engine/totals.ts`
- Move: `Industry.tsx` → `presentation/industry/IndustryTemplate.tsx`
- Move: `industryStyles.ts` → `presentation/industry/industryStyles.ts`
- Move: engine JSX components → `presentation/industry/`
- Delete: `commercialDocumentBlocks.tsx`
- Rewrite: `engine/index.ts`
- Extract: `resolveAlignment` → `core/alignment.ts`
- Split: `pdfCompact.ts` → per-template files
- Extract: `INDUSTRY_COLUMN_OVERRIDES` → `presentation/industry/IndustryColumnOverrides.ts`

**Risk:** Medium — Industry must render identically after extraction.
**Success criteria:** `bun run typecheck`, `bun run build`, Industry PDF renders identically.

### Phase 4: Ledger Migration

**Goal:** Ledger consumes engine behaviour functions for data normalization while keeping its own JSX and styles.
**Files affected:**
- Modify: `Ledger.tsx` — call `buildPartyViewModel`, `buildGroupHeaderViewModel`, `buildGroupFooterViewModel`, `buildAttachmentViewModels`, `resolveColumnLayout` from engine
- Ledger's own rendering logic, styles, and layout remain unchanged

**Risk:** Low — only data preparation changes; rendering stays inline.
**Success criteria:** Ledger PDF renders identically. No engine import from `LedgerStyles`.

### Phase 5: Obsidian Migration

**Goal:** Same as Phase 4 but for Obsidian.
**Files affected:**
- Modify: `ObsidianReceipt.tsx` — call engine behaviour functions
- Own rendering stays inline

**Risk:** Low.
**Success criteria:** Obsidian PDF renders identically.

### Phase 6: Compact Mode Consolidation

**Goal:** Verify compact overrides colocated with templates work correctly. Remove `pdfCompact.ts`.
**Files affected:**
- Delete: `core/pdfCompact.ts`
- Verify: each `presentation/*/compact.ts` provides correct overrides

**Risk:** Low.
**Success criteria:** Compact mode renders identically for all templates.

### Phase 7: Pagination

**Goal:** Implement page break handling across all templates.
**Files affected:** All presentation templates.
**Risk:** High — pagination interacts with every visual section.
**Success criteria:** Multi-page documents render correctly with consistent headers/footers.

### Phase 8: HTML Sanitisation

**Goal:** Ensure rich text content is safely rendered. Audit `richText.ts` parser for edge cases.
**Files affected:** `core/richText.ts`, `core/pdfRichText.ts`.
**Risk:** Medium — incorrect sanitisation could break existing content.
**Success criteria:** No HTML injection possible. Existing content renders correctly.

### Phase 9: Performance Optimisation

**Goal:** Profile PDF generation, identify bottlenecks, optimise heavy computation.
**Files affected:** Engine behaviour functions, adapter.
**Risk:** Low.
**Success criteria:** PDF generation time measurably reduced.

---

## 13. Architectural Principles

| Principle | Status | Evidence |
|-----------|--------|----------|
| Behaviour reusable | **VIOLATED** — engine JSX components contain presentation | All 4 engine JSX components import `industryStyles` |
| Presentation template-specific | **PARTIAL** — Industry uses engine, Ledger/Obsidian are fully inline | Industry delegates to engine; others don't |
| No style injection APIs | **SATISFIED** — no template passes style objects | The problem is the opposite: styles are hardcoded |
| No duplicated business logic | **SATISFIED** — `safeText`, `description`, `richText` are shared | Core utilities serve all templates |
| Minimal duplicated rendering logic | **VIOLATED** — group header/footer/attachments duplicated 3× | Each template reimplements rendering |
| Zero circular dependencies | **AT RISK** — engine → industryStyles is a reverse dependency | Not circular yet, but fragile |
| Clear ownership boundaries | **VIOLATED** — engine owns Industry presentation | Engine should own behaviour only |
| Easy onboarding | **VIOLATED** — new developer must understand reverse dependency | Architecture is confusing |
| Future template support | **BLOCKED** — engine cannot serve new templates without style coupling | Any new template would need its own engine fork |
| Backward compatibility | **SATISFIED** — `commercialDocumentBlocks.tsx` preserves import paths | Compatibility shim works |

---

## 14. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Industry regression during Phase 3 extraction | High | Visual regression testing before/after. Generate identical PDF and compare. |
| Ledger/Obsidian behaviour function adoption breaks rendering | Medium | Each template tested independently. Behaviour functions are pure — no rendering impact. |
| Compact mode breaks during `pdfCompact.ts` split | Low | Compact overrides are simple style objects. Trivial to move. |
| Rich text parser edge cases surface during Phase 8 | Medium | Existing parser has been stable. Phase 8 is a focused audit, not a rewrite. |
| New templates expected before Phase 3 completes | Medium | Architecture document allows new templates to use inline rendering immediately. Engine migration is not a prerequisite. |

---

## 15. Verification Notes

| Check | Result |
|-------|--------|
| `bun run audit:load` | **PASS** — 673 files scanned, no new warnings in `pdf-new/` |
| `bun run typecheck` | **PASS** — zero errors |
| `bun run build` | **PASS** — completed successfully (dist/ exists, 3281 modules transformed) |

---

## 16. Final Recommendation

The current engine is a presentation layer pretending to be a behaviour layer. The fix is architectural, not incremental.

**Do not add style injection props.** Do not create `PartyCardProps` with `containerStyle` overrides. That approach turns every engine component into a configuration nightmare and still couples engine to rendering concerns.

Instead:

1. **Strip the engine of all JSX.** Move Industry components to `presentation/industry/`. The engine becomes a library of pure functions.
2. **Extract shared alignment logic to core.** One `resolveAlignment` function serves all templates.
3. **Let templates own their rendering.** Ledger already works this way. Obsidian already works this way. Industry should join them.
4. **Use engine behaviour for data preparation only.** Templates call `buildPartyViewModel()` and render the result with their own styles.

This architecture supports any number of future templates without engine modification. Each new template imports behaviour functions and writes its own presentation. No style injection APIs. No configuration objects. No reverse dependencies.

The roadmap is conservative: Phase 3 does the heavy lifting, Phase 4-5 are low-risk adoptions, Phase 6-9 are incremental improvements. Total estimated effort for Phase 3 is the highest, but it is a one-time structural correction that enables everything that follows.

---

*Architecture audit complete. No source files were modified.*
