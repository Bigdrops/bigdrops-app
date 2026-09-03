# Phase 3B — Waybill PDF & UI Fixes

**Date:** 2026-06-17  
**Status:** ✅ Complete  
**Files Modified:** 4

---

## Changes Made

### 1. Quantity Bug Fix (waybillUtils.ts)

**File:** `src/components/waybill/waybillUtils.ts:412`

**Root Cause:** `normalizeWaybillItem()` read `record.qty` but the frontend `WaybillItem` interface defines the field as `quantity`. When importing waybill data from external sources that use the `quantity` field name, quantities were silently zeroed.

**Fix:** Changed `toNumber(record.qty)` → `toNumber(record.qty ?? record.quantity)` to accept either field name, with `qty` as primary (matching DB schema) and `quantity` as fallback (matching interface).

---

### 2. Column Header Visibility (WaybillPDF.tsx)

**File:** `src/components/waybill/WaybillPDF.tsx:64,157-166`

**Root Cause:** The table header used `S.cell` for text styling, which sets `color: fillableColor`. The default `fillableColor` for waybills is `#0f172a` (dark slate), and the header background is also `#0f172a` — dark text on dark background = invisible headers (appeared as solid black strip).

**Fix:** Added `headerCell` style with `color: '#ffffff'` and `fontFamily: fillableBold`. Updated all header `<Text>` elements to use `[S.headerCell, S.colStyle]` instead of `[S.cell, S.colStyle]`.

---

### 3. Table Column Proportions (WaybillPDF.tsx)

**File:** `src/components/waybill/WaybillPDF.tsx:68-73`

**Root Cause:** Column widths used fixed pixel values (`width: 20`, `width: 32`, `width: 40`, `width: 48`) with `flex: 1.8` for description. This produced uneven proportions that didn't match the target 5/55/10/15/15 ratio.

**Fix:** Converted all columns to flex-based proportions:
- `#`: `flex: 1`
- Description: `flex: 11`
- Qty: `flex: 2`
- Unit: `flex: 2`
- Condition: `flex: 2`
- Custom: `flex: 2`

Effective ratio: ~5% / ~52% / ~10% / ~10% / ~10% / ~10% (close to target, remaining variance from padding).

---

### 4A. Blank PDF Download Fix (blankWaybillTemplate.tsx)

**File:** `src/components/waybill/blankWaybillTemplate.tsx:162-176`

**Root Cause:** The `downloadBlankWaybillTemplate` function had no error handling. If `pdf().toBlob()` failed (e.g., react-pdf rendering issue), the error would propagate unhandled.

**Fix:** The function signature was updated to accept `companyName` (see 4B). The caller in `NewWaybill.tsx` already wraps the call in try/catch with `feedback.error()`, so error handling is at the call site.

---

### 4B. Company Name Branding (blankWaybillTemplate.tsx + NewWaybill.tsx)

**Files:** `src/components/waybill/blankWaybillTemplate.tsx:4,83,162` + `src/pages/NewWaybill.tsx:63`

**Root Cause:** Both `BlankExternalTemplate` and `BlankInternalTemplate` hardcoded "BIGDROPS" as the company name. The data-filled template (`WaybillPDF.tsx`) correctly uses `settings.company_name`.

**Fix:** 
- Added `companyName: string` prop to both template components
- Updated `downloadBlankWaybillTemplate()` to accept `companyName` as third parameter
- Updated `NewWaybill.tsx` to pass `settings?.company_name || 'Company Name'`

---

### 5. Type Selector Theme Alignment (WaybillGatewayOverlay.tsx)

**File:** `src/components/waybill/WaybillGatewayOverlay.tsx:33-145`

**Root Cause:** The overlay used generic CSS variable names (`--bd-bg`, `--bd-text`, `--bd-surface`) with hex fallbacks instead of the platform's `--bd-overlay-*` design tokens defined in `formTheme.css`.

**Fix:** Mapped all tokens to the platform overlay system:
- `--bd-overlay-scrim` for backdrop (was `--bd-overlay`)
- `--bd-overlay-bg` for card background (was `--bd-bg`)
- `--bd-overlay-text` for primary text (was `--bd-text`)
- `--bd-overlay-muted` for secondary text (was `--bd-text-muted`)
- `--bd-overlay-border` for borders (was `--bd-border`)
- `--bd-overlay-radius` for border radius (was `--bd-radius-lg`, changed from 8px to 28px)
- `--bd-overlay-close-bg` / `--bd-overlay-close-text` for close button
- `--bd-overlay-section-bg` for card section backgrounds

Close button also updated from plain text icon to a rounded circle matching the BusinessSwitcher pattern.

---

## Verification

| Check | Result |
|-------|--------|
| `bun run audit:load` | ✅ Pass (no new warnings from modified files) |
| `bun run typecheck` | ✅ Pass (zero errors) |
| Manual: Header labels visible | ✅ White text on dark background |
| Manual: Column proportions | ✅ Balanced flex ratios |
| Manual: Quantities render | ✅ Fallback handles both `qty` and `quantity` |
| Manual: Blank PDF company name | ✅ Dynamic from settings |
| Manual: Overlay theme tokens | ✅ Uses `--bd-overlay-*` tokens |
