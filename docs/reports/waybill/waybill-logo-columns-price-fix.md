# Waybill Logo, Column Visibility & Price Suggestions Fix

**Date:** 2025-07-11
**Scope:** Waybill PDF template logos, column visibility in PDF, price suggestion injection

---

## 1. Logo Background Fix (Evergreen & Premium Templates)

### Problem
Transparent company logos displayed on coloured template headers showed the header background colour bleeding through, making logos appear tinted or unreadable.

### Fix
Added `backgroundColor: '#ffffff'` to logo image styles in both templates, ensuring logos always render on a white background regardless of header colour.

**Files modified:**
- `src/components/waybill/EvergreenTemplate.tsx` — Added `backgroundColor: '#ffffff'` to `brandLogo` style (line ~67)
- `src/components/waybill/PremiumTemplate.tsx` — Added `backgroundColor: '#ffffff'` to `logoImg` style (line ~38)

**Bicolor template:** Verified already protected — `bannerLogo` style has `backgroundColor: '#ffffff'` (line 53). Dark banner with white logo background. No modification needed.

**Slate template:** Already fixed in previous task. Do NOT modify.

---

## 2. Empty Column Visibility Fix (PDF)

### Problem
Custom columns toggled off in Table Settings still appeared (empty) in the Waybill PDF. The `standardColumns` array was correctly filtered by `columnVisibility`, but `customColumns` were not.

### Fix
Added `.filter(col => columnVisibility[col.key] !== false)` to the `customColumns` chain in `ViewWaybill.tsx` `handleDownload`, matching the same pattern used for `standardColumns`.

**File modified:**
- `src/pages/ViewWaybill.tsx` — Line ~147: added visibility filter for custom columns

**Why this works:** The `columnVisibility` object (from `customFields.columnVisibility`) maps column keys to booleans. Columns toggled off have `false`. The filter excludes them from the `columns` array passed to `buildWaybillRenderModel`, so the engine never renders them.

---

## 3. Price Suggestion Injection Fix

### Problem
When a user selected an item from the item library suggestion dropdown on the Waybill form, `MobileItemCard` injected `unit_price` directly onto the WaybillItem via `onUpdate(index, 'unit_price', selection.unit_price)`, bypassing the `updateField` field-policy guard. This caused `assertNoExtensionFieldsOutsideCustomData` to throw at save time, because `unit_price` is not in `WAYBILL_ITEM_KEYS`.

### Fix
Added `if (ctx !== 'waybill')` guard around the `unit_price` injection in `handleSuggestionSelect`. For waybill context, only `description` and `item_id` (routed via `updateField` to `custom_data`) are written. Price data is excluded.

**File modified:**
- `src/components/invoice/MobileItemCard.tsx` — Line ~223: wrapped `unit_price` injection with `if (ctx !== 'waybill')`

**Why this is safe:**
- The `updateField` function already correctly routes `item_id` to `custom_data` for waybill context
- `description` is a valid root-level WaybillItem field
- The `isVisible('unit_price')` guard already prevents the Rate input from rendering for waybill
- Invoice and Quotation contexts are unaffected (their `ctx` is `'invoice'` or `'quotation'`)

---

## Verification

- **Typecheck:** `bun run typecheck` — passed (zero errors)
- **Lint:** All lint errors in changed files are pre-existing (`no-explicit-any`, `no-unused-vars`). No new issues introduced.
- **Bun runtime:** Only Bun used (never npm/yarn)
- **No engine modifications:** `src/domain/waybill/engine/` untouched
- **No SlateTemplate modifications:** Already fixed in previous task

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/components/waybill/EvergreenTemplate.tsx` | Logo white background |
| `src/components/waybill/PremiumTemplate.tsx` | Logo white background |
| `src/pages/ViewWaybill.tsx` | Custom column visibility filter |
| `src/components/invoice/MobileItemCard.tsx` | Skip price injection for waybill |
