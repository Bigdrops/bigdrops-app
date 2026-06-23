# Waybill Footer, Header & Template Rename Report

**Date:** 2025-06-23
**Status:** Complete

---

## Summary

Fixed footer positioning, header layout, template renaming, and logo rendering across 7 Waybill PDF templates. Used the Invoice Industry template's footer logic as the reference standard.

---

## Changes Made

### Session 1 (Previous)

#### 1. Thermal Template Footer Fix (Critical)

**File:** `src/components/waybill/ThermalTemplate.tsx`

**Problem:** Footer was rendered as 3 vertical rows instead of a single horizontal row.

**Fix:**
- Changed footer style to `flexDirection: 'row'` + `justifyContent: 'space-between'`
- Split footer content into 3 separate `<Text>` elements: Company Name | Waybill Number | Page X of Y

#### 2. Split Template Header Enhancement

**File:** `src/components/waybill/SplitTemplate.tsx`

**Problem:** Header did not account for tagline field.

**Fix:** Added conditional tagline rendering in the banner text block.

#### 3. Industry Template Logo Rendering

**File:** `src/components/waybill/IndustryTemplate.tsx`

**Problem:** Industry waybill template had no logo rendering.

**Fix:** Added `brandLogo`, `brandLogoPlaceholder`, and `brandTextBlock` styles with logo rendering logic.

---

### Session 2 (Current)

#### 4. Bicolor (was Split) Header 4-Line Max Fix

**File:** `src/components/waybill/BicolorTemplate.tsx` (renamed from SplitTemplate.tsx)

**Problem:** Header could overflow beyond 4 lines with long addresses. Previous attempt used `numberOfLines` prop which is invalid in `@react-pdf/renderer` Text component.

**Fix:** Used `maxHeight` + `overflow: 'hidden'` on the `bannerText` container with explicit `lineHeight` values to cap content at 42pt (max 4 lines: name(15pt) + address×2(18pt) + tagline(9pt)).

**Before:**
```tsx
bannerText: { flex: 1 },
bannerName: { fontSize: 13, lineHeight: 1.2 },
bannerAddress: { fontSize: 7.5 }
```

**After:**
```tsx
bannerText: { flex: 1, maxHeight: 42, overflow: 'hidden' },
bannerName: { fontSize: 13, lineHeight: 15 },
bannerAddress: { fontSize: 7.5, lineHeight: 9 }
```

#### 5. Template Renames (3 Templates)

**Files:** All 7 template files + waybillUtils.ts + WaybillPDF.tsx + WaybillTemplateSelector.tsx + ViewWaybill.tsx

**Problem:** Generic template names (`green`, `split`, `industry`) did not reflect visual style and conflicted with other systems.

**Renames:**
| Old ID | New ID | File | Component |
|--------|--------|------|-----------|
| `green` | `evergreen` | GreenTemplate.tsx → EvergreenTemplate.tsx | `EvergreenTemplateDocument` |
| `split` | `bicolor` | SplitTemplate.tsx → BicolorTemplate.tsx | `BicolorTemplateDocument` |
| `industry` | `slate` | IndustryTemplate.tsx → SlateTemplate.tsx | `SlateTemplateDocument` |

**Backward Compatibility:** `normalizeWaybillPdfTemplateId()` in waybillUtils.ts maps old IDs to new:
- `'green'` → `'evergreen'`
- `'split'` → `'bicolor'`
- `'industry'` → `'slate'`

Existing waybills stored with old IDs in `custom_fields.pdfTemplateId` will continue to render correctly.

---

## Template Status Summary

| Template | Footer | Header | Logo | Status |
|----------|--------|--------|------|--------|
| EvergreenTemplate | ✅ Correct | ✅ N/A | ✅ Present | No changes needed |
| MinimalTemplate | ✅ Correct | ✅ N/A | ✅ Present | No changes needed |
| ClassicTemplate | ✅ Correct | ✅ N/A | ✅ Present | No changes needed |
| PremiumTemplate | ✅ Correct | ✅ N/A | ✅ Present | No changes needed |
| BicolorTemplate | ✅ Correct | ✅ Fixed (4-line max) | ✅ Present | Header fixed |
| ThermalTemplate | ✅ Fixed (was broken) | ✅ N/A | ✅ Present | Footer fixed |
| SlateTemplate | ✅ Correct | ✅ N/A | ✅ Added | Logo added |

---

## Footer Pattern (All Templates)

All 7 templates now use the same footer pattern matching Invoice Industry:

```
┌──────────────────────────────────────────────────────┐
│ Company Name              Waybill Number    Page X of Y │
└──────────────────────────────────────────────────────┘
```

- **Position:** `position: 'absolute', bottom: 0, left: 0, right: 0` (stays at page bottom regardless of content)
- **Layout:** `flexDirection: 'row'`, `justifyContent: 'space-between'` (single horizontal row)
- **Content area:** Uses `flex: 1` with `paddingBottom` to prevent content overlap
- **Content:** 3 separate `<Text>` elements (Company Name | Waybill Number | Page X of Y)

---

## Files Changed

### Session 1
1. `src/components/waybill/ThermalTemplate.tsx` — Footer style and content
2. `src/components/waybill/SplitTemplate.tsx` — Header tagline support
3. `src/components/waybill/IndustryTemplate.tsx` — Logo styles and rendering

### Session 2
4. `src/components/waybill/SplitTemplate.tsx` → `BicolorTemplate.tsx` — Renamed + header 4-line max fix
5. `src/components/waybill/GreenTemplate.tsx` → `EvergreenTemplate.tsx` — Renamed
6. `src/components/waybill/IndustryTemplate.tsx` → `SlateTemplate.tsx` — Renamed
7. `src/components/waybill/WaybillPDF.tsx` — Updated imports, type, and routing
8. `src/components/waybill/waybillUtils.ts` — Updated type and normalize function with backward compat
9. `src/components/waybill/WaybillTemplateSelector.tsx` — Updated template options and themes
10. `src/pages/ViewWaybill.tsx` — Updated template state type

---

## Verification

- ✅ `bun run typecheck` — passes (0 errors)
- ✅ `eslint` on changed files — passes (0 new errors, 7 pre-existing in ViewWaybill.tsx)
