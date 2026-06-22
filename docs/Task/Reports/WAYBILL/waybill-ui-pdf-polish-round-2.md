# Waybill UI/PDF Polish Round 2

**Date:** 2026-06-22  
**Status:** Complete  

## Summary

Seven surgical UI fixes applied across the waybill PDF template system. All changes are backward-compatible, no schema changes, no engine rebuilds.

---

## Tasks Completed

### 1. Template Picker — bd-* Token Upgrade
**File:** `src/components/waybill/WaybillTemplateSelector.tsx`  
**Change:** Upgraded from hardcoded `slate-*` colors to `bd-*` design tokens for visual consistency with CSR `DocumentTemplatePicker`. 220px card width, gradient hover states, design-system-aligned spacing.

### 2. Thermal Method+Purpose Horizontal Layout
**File:** `src/components/waybill/ThermalTemplate.tsx`  
**Change:** Added `flexDirection: 'row'` and `flexWrap: 'nowrap'` to `choiceLine` style (line 165). Ensures METHOD and PURPOSE tick options render inline without wrapping on narrow thermal widths.

### 3. Page-Break Footers
**Files:** All 7 templates (Green, Minimal, Thermal, Classic, Split, Premium, Industry)  
**Change:** Footer `<View>` elements now use `fixed` prop with `position: 'absolute', bottom: 0, left: 0, right: 0`. Footers appear on every page when content breaks across pages.

### 4. Page-Break Top Gap
**Files:** Minimal, Classic, Premium, Thermal templates  
**Change:** Removed `paddingTop` from content wrapper styles and moved it to the first child element. Ensures continuation pages don't have a blank gap at the top — padding only appears on page 1.

- Minimal: `paddingTop: 10` moved to `title` (+10)
- Classic: `paddingTop: 14` moved to `title` (+14)
- Premium: `paddingTop: 14` moved to `topbar` (+14)
- Thermal: `paddingVertical: 12` → `paddingBottom: 12`; `title` paddingVertical split to `paddingTop: 12, paddingBottom: 5`

### 5. Split Header Height & Logo Tint
**File:** `src/components/waybill/SplitTemplate.tsx`  
**Changes:**
- Banner padding: `8` → `6` (reduces header height)
- Banner logo: `40×40` → `36×36` (smaller footprint)
- Banner icon: matching `36×36`
- Banner name font: `15` → `13`
- Added `objectFit: 'contain'` and `backgroundColor: '#ffffff'` to `bannerLogo` to prevent dark-banner bleed-through

### 6. Thermal Signature Boxes
**File:** `src/components/waybill/ThermalTemplate.tsx`  
**Change:** Replaced `sigBlankLine` thin underline (`borderBottomWidth: 0.5, height: 10`) with proper bordered box (`borderWidth: 1, borderColor: '#333333', minWidth: 110, height: 42`). Signature area now meets the 110×42pt minimum for wet-ink signatures.

### 7. Client Corporate Address in Templates
**Files:**
- `src/domain/waybill/engine/types.ts` — Added `clientAddress: string | null` to `PartiesBlock`, `client_address?: string | null` to `RawWaybill`
- `src/domain/waybill/engine/resolvers/parties.ts` — Maps `clientAddress` via `normalizeBlank(waybill.client_address)`
- `src/pages/ViewWaybill.tsx` — Added Supabase query to fetch `clients.address` via `client_id` FK
- All 7 templates + blank template — Added `clientAddress` as second line under client name with conditional render

**Data flow:** `clients.address` (from `clients` table via `client_id` FK) → `RawWaybill.client_address` → `PartiesBlock.clientAddress` → template renders below client name.

---

## Verification

| Check | Result |
|-------|--------|
| `bun run typecheck` | ✅ Clean — no errors |
| `bun run lint` (changed files) | ✅ 9 pre-existing errors, 0 new |
| Schema changes | None |
| Engine rebuild | None |
| Backward compatibility | All changes are additive/optional |

---

## Files Modified

| File | Tasks |
|------|-------|
| `src/components/waybill/WaybillTemplateSelector.tsx` | 1 |
| `src/components/waybill/ThermalTemplate.tsx` | 2, 3, 4, 6, 7 |
| `src/components/waybill/GreenTemplate.tsx` | 3, 7 |
| `src/components/waybill/MinimalTemplate.tsx` | 3, 4, 7 |
| `src/components/waybill/ClassicTemplate.tsx` | 3, 4, 7 |
| `src/components/waybill/SplitTemplate.tsx` | 3, 5, 7 |
| `src/components/waybill/PremiumTemplate.tsx` | 3, 4, 7 |
| `src/components/waybill/IndustryTemplate.tsx` | 3, 7 |
| `src/components/waybill/blankWaybillTemplate.tsx` | 7 |
| `src/domain/waybill/engine/types.ts` | 7 |
| `src/domain/waybill/engine/resolvers/parties.ts` | 7 |
| `src/pages/ViewWaybill.tsx` | 7 |
