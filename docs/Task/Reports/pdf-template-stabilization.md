# PDF Template Stabilization Report

**Date:** 2026-06-29  
**Status:** In Progress — TASKs 1-2 complete, TASKs 3-7 pending  

---

## TASK 1 — TypeScript Errors (COMPLETE)

Fixed 3 errors, zero remain:

| File | Error | Fix |
|---|---|---|
| `Ember.tsx:26-28` | `keepWholePdfWord` returned `string` not `string[]` | `return [str]` |
| `invoiceSuggestionSelection.ts:1-2` | `.ts` extension imports with `moduleResolution: "Bundler"` | Removed `.ts` suffix |
| `suggestionRanking.ts:5-7` | `.replaceAll()` not in ES2020 target | `.replace(/regex/g, ...)` |

---

## TASK 2 — Audit Findings

### Architecture

Pipeline: `invoicePdfActions.ts` → `PdfDocumentModel.designPreset` → `adaptCommercialDocumentData()` → `CommercialDocumentData.design` → Templates.

All 8 templates receive identical props via `PdfRenderer`:
```ts
{ data: CommercialDocumentData, layout?: PdfPageLayout, compact?: boolean }
```

The `data.design` object carries: `accentColor`, `textColor`, `mutedColor`, `borderColor`, `surfaceColor`, `headerFont`, `bodyFont`, `useCustomColors`, `useCustomFonts`.

### Per-Template Status

| Template | `data.design` | `compact` | `layout` (orientation) | Style Source | Signature |
|---|---|---|---|---|---|
| **Industry** | ✅ Full (all 7 fields + guards) | ✅ Full | ✅ `data.layout` | `industryStyles.ts` (presentation layer) | `({ data, compact })` |
| **Apex** | ❌ None | ❌ None | ✅ `data.layout` | `ApexStyles.ts` (hardcoded) | `({ data })` |
| **Bolt** | ❌ None | ❌ None | ✅ `data.layout` | `BoltStyles.ts` (hardcoded) | `({ data })` |
| **Crest** | ❌ None | ❌ None | ✅ `data.layout` | `CrestStyles.ts` (hardcoded) | `({ data })` |
| **Ember** | ❌ None | ❌ None | ✅ `data.layout` | `EmberStyles.ts` (hardcoded) | `({ data })` |
| **Evergreen** | ❌ None | ❌ None | ✅ `data.layout` | `EvergreenStyles.ts` (hardcoded) | `({ data })` |
| **Ledger** | ❌ None | ❌ None | ✅ `data.layout` | `LedgerStyles.ts` (hardcoded) | `({ data })` |
| **Minimal** | ❌ None | ❌ None | ✅ `data.layout` | `MinimalStyles.ts` (hardcoded) | `({ data })` |

### Duplicated Helpers

| Helper | Templates | Notes |
|---|---|---|
| `toTitleCase` | Ember, Minimal, Evergreen, Bolt, Apex, Industry, Ledger | 7 templates, same implementation |
| `keepWholePdfWord` | Ember, Crest, Bolt, Industry | 4 templates, trivial `(word) => [word]` |

### Key Files

| File | Role |
|---|---|
| `src/components/pdf-new/renderers/PdfRenderer.tsx` | Passes `{data, layout, compact}` to templates |
| `src/components/pdf-new/industryAdapter.ts` | Maps `PdfDocumentModel` → `CommercialDocumentData` (includes `design`) |
| `src/components/pdf-new/types.ts` | Core types |
| `src/components/pdf-new/index.ts` | Template resolution + generation entry |
| `src/lib/pdfDesignPreset.ts` | `PdfDesignPreset`, `lightenHex`, `darkenHex`, `resolvePdfFontFamily` |
| `src/components/pdf-new/engine/index.ts` | Shared pure functions (`getAccentTint`, `resolveColumnLayout`, etc.) |
| `src/components/pdf-new/presentation/industry/compact.ts` | Compact mode overrides for Industry |

---

## TASK 3 — Design Token Integration (PENDING)

**Goal:** All 8 templates consume `data.design.accentColor`, `textColor`, `mutedColor`, `borderColor`, `surfaceColor` via `useCustomColors` guard.

**Pattern to replicate** (from `IndustryTemplate.tsx`):
```ts
const design = data?.design || { /* defaults */ }
const accentColor = design.useCustomColors && design.accentColor ? design.accentColor : null
const textColor = design.useCustomColors && design.textColor ? design.textColor : null
const mutedColor = design.useCustomColors && design.mutedColor ? design.mutedColor : null
const borderColor = design.useCustomColors && design.borderColor ? design.borderColor : null
const surfaceColor = design.useCustomColors && design.surfaceColor ? design.surfaceColor : null
```

**Approach:** Each template's main component extracts these at the top, then applies to inline styles. Style files remain as defaults; design tokens override at runtime.

---

## TASK 4 — Font Integration (PENDING)

**Goal:** All 8 templates consume `data.design.headerFont`/`bodyFont` via `useCustomFonts` guard, using `resolvePdfFontFamily()` from `pdfDesignPreset.ts`.

**Pattern:**
```ts
const headerFontFamily = design.useCustomFonts && design.headerFont ? resolvePdfFontFamily(design.headerFont) : undefined
const bodyFontFamily = design.useCustomFonts && design.bodyFont ? resolvePdfFontFamily(design.bodyFont) : undefined
```

---

## TASK 5 — Compact Mode (PENDING)

**Goal:** All 8 templates reduce margins, spacing, and table density when `compact` is true.

**Pattern:** Each template applies compact overrides conditionally:
```ts
<Page style={[styles.page, compact ? compactOverrides.page : null]}>
```

---

## TASK 6 — Landscape Mode (PENDING)

**Goal:** All 8 templates properly handle landscape orientation for wider table layouts.

All templates already read `data.layout?.orientation` for the `<Page>` component. This task ensures tables and content adapt to landscape width.

---

## TASK 7 — Shared Helpers (PENDING)

**Goal:** Remove duplicated `toTitleCase` and `keepWholePdfWord` from 7+ templates. Centralize into `src/components/pdf-new/engine/` or `src/lib/`.

---

## Verification

After all tasks: `bun run typecheck && bun run build && bun run audit:load`
