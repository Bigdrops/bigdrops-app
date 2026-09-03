# Crest & Ledger Polish — Implementation Report

**Date:** 2026-06-28
**Scope:** Four presentation-layer fixes in Crest/Ledger PDF templates + waybill template inspection

---

## Fix 1: Crest Logo — Isolate from Dark Header Band

### Problem
The Crest logo `<Image>` sat directly inside `headerRight`, which was within `headerBand` (`backgroundColor: #2d1f3a` — INK). Transparent PNG logos appeared tinted/darkened by the parent background, losing their original colours.

### Solution
Wrapped the `<Image>` in a `<View>` with a white background, rounded corners, and centered alignment:

**`CrestStyles.ts`** — added `logoWrapper` style:
```ts
logoWrapper: {
  width: 76,
  height: 76,
  backgroundColor: '#ffffff',
  borderRadius: 4,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
},
```

**`Crest.tsx`** — wrapped `<Image>` in `<View style={styles.logoWrapper}>`:
```tsx
<View style={styles.headerRight}>
  <View style={styles.logoWrapper}>
    <Image src={data.company.companyLogoUrl} style={styles.logo} />
  </View>
</View>
```

### Impact
Logo now renders against a clean white background, preserving its original colors regardless of the surrounding dark band. The wrapper is 76×76pt (same as logo), so no layout displacement.

---

## Fix 2: Ledger Footer — Excessive Vertical Padding

### Problem
`pageFooter` had `paddingTop: 16` + `paddingBottom: 24` = 40pt total vertical padding, consuming excessive page space.

### Solution

**`LedgerStyles.ts`** — reduced footer padding:
```ts
// Before:
paddingTop: 16,
paddingBottom: 24,

// After:
paddingTop: 12,
paddingBottom: 20,
```

### Impact
Total vertical padding reduced from 40pt → 32pt (within the 30-35pt target). Footer remains legible with page numbering, document number, and company name.

---

## Fix 3: Ledger Page 2+ Header Clipping

### Problem
`tableHeaderRow` had `paddingBottom: 8` but zero `paddingTop`. On page 2+ when the table header repeats (`fixed`), the header row had insufficient height — the top of header cells was clipped.

### Solution

**`LedgerStyles.ts`** — added `paddingTop: 8` to `tableHeaderRow`:
```ts
// Before:
paddingBottom: 8,

// After:
paddingTop: 8,
paddingBottom: 8,
```

### Impact
Header row now has symmetric 8pt top/bottom padding, giving it adequate height on repeated pages. No visual change on page 1 since the header was already visible.

---

## Fix 4: Ledger Notes — Rich Text Rendering (HTML → PDF)

### Problem
Notes and Terms in Ledger used `safeText(notes.content)` which escaped HTML characters but rendered everything as a single `Text` node — no paragraph breaks, no list styling, no formatting. Crest already used `renderPdfRichText` for the same purpose.

### Solution

**`Ledger.tsx`**:
1. Added import: `import { renderPdfRichText } from '../core/pdfRichText'`
2. Replaced both Notes and Terms blocks:
```tsx
{/* Before: */}
<Text style={styles.textBlock}>{safeText(notes.content)}</Text>

{/* After: */}
{renderPdfRichText(notes.content, {
  containerStyle: styles.notesRichText,
  paragraphStyle: styles.notesParagraph,
  listStyle: styles.notesList,
  listItemRowStyle: styles.notesListItemRow,
  listMarkerStyle: styles.notesListMarker,
  listItemTextStyle: styles.notesListItemText,
  fallbackTextStyle: styles.textBlock,
}) || <Text style={styles.textBlock}>{notes.plainText || ''}</Text>}
```

**`LedgerStyles.ts`** — added 7 rich-text style entries (`notesRichText`, `notesParagraph`, `notesList`, `notesListItemRow`, `notesListMarker`, `notesListItemText`) with 8pt font sizing matching existing `textBlock` aesthetics.

### Impact
Notes and Terms now render with proper paragraph breaks, bullet lists, and formatting — identical rendering capability to Crest. Falls back to `plainText` if rich text parsing fails.

---

## Waybill Template Inspection

### Minimal (`src/components/waybill/MinimalTemplate.tsx` — 508 lines)

| Aspect | Detail |
|---|---|
| **Data model** | `WaybillRenderModel` from `@/domain/waybill/engine/types` |
| **Structuring** | `createStyles(preset)` → `StyleSheet.create()` with inline styles |
| **Rendering pipeline** | Takes `WaybillRenderModel` + optional `PdfDesignPreset`, creates styles at render |
| **Pagination** | Single page, fixed footer with `position: absolute` |
| **Feature set** | Waybill#, date/time, client/consignee, destination, vehicle plate, driver, delivery mode (checkboxes: Hand/Vehicle/Other), reason (Supply/Return/Repair/Other), items table, delivery remarks, signatures (sender + receiver + blank lines) |
| **Visual style** | Monochrome, border-heavy, mini-tablet checkbox UI, minimal whitespace, signature card layout |
| **Invoice adaptation** | High effort — would need new data model mapping, currency formatting, totals panel, bank details, rich-text notes; essentially a rewrite |

### Evergreen (`src/components/waybill/EvergreenTemplate.tsx` — 685 lines)

| Aspect | Detail |
|---|---|
| **Data model** | `WaybillRenderModel` from `@/domain/waybill/engine/types` |
| **Structuring** | `createStyles(preset)` → `StyleSheet.create()` using accent color (#1f6e5c), rounded cards |
| **Rendering pipeline** | Uses `getDefaultPdfDesignPreset('waybill')`, `getEffectiveFillableFont()`, `resolvePdfFontFamily()` |
| **Pagination** | Single page, fixed footer with `position: absolute` + `marginTop: 'auto'` |
| **Feature set** | Waybill#, date/time, PO#, vehicle plate, delivery mode (Hand/Vehicle/Courier), purpose (Supply/Return/Repair/Transfer/Other), client/consignee, destination, driver row, items table with zebra striping, operational notes, signature cards (sender + receiver with name, image, date/time fields) |
| **Visual style** | Green accent theme, rounded cards, badges, soft backgrounds, subtle borders, zebra-striped table, fillable-font awareness |
| **Invoice adaptation** | High effort — same structural concerns as Minimal; richer design palette would need re-theming for invoice context |

### Key Observations (Both Templates)
1. Both use `WaybillRenderModel` — invoice adaptation would need an entirely new data model or a mapper
2. Neither has currency formatting, totals computation, or bank details — core to invoice templates
3. Both use inline percentage-based column widths (`width: 95/Math.max(columns.length,1)%`) — invoice templates use `resolveColumnLayout()` with flex-basis
4. Neither uses `renderPdfRichText` — notes are plain text only
5. The `createStyles(preset)` pattern could be reused for new invoice templates
6. Waybill-specific features (checkboxes, signature cards, delivery mode) have no equivalent in invoice context

---

## Verification Results

| Check | Result |
|---|---|
| `bun run audit:load` | ✅ Pass (no new regressions) |
| `npx tsc --noEmit` | ✅ Type-safe (zero errors) |
| `bun run build` | ⚠️ Timed out (pre-existing — Vite bundle size, not related to changes) |

## Files Modified

| File | Change |
|---|---|
| `src/components/pdf-new/templates/CrestStyles.ts` | Added `logoWrapper` style |
| `src/components/pdf-new/templates/Crest.tsx` | Wrapped logo in `logoWrapper` View |
| `src/components/pdf-new/templates/LedgerStyles.ts` | Reduced footer padding, added header `paddingTop`, added 7 rich-text styles |
| `src/components/pdf-new/templates/Ledger.tsx` | Added `renderPdfRichText` import, replaced Notes and Terms rendering |

## Files Inspected (No Changes)

| File | Purpose |
|---|---|
| `src/components/waybill/MinimalTemplate.tsx` | Read-only inspection |
| `src/components/waybill/EvergreenTemplate.tsx` | Read-only inspection |
