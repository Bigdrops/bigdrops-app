# Waybill Green Template — Round 2 Fixes

**Date:** 2026-06-21
**Files Modified:**
- `src/components/waybill/waybillUtils.ts` — FIX 1
- `src/components/waybill/GreenTemplate.tsx` — FIX 2

---

## FIX 1: Item ID Column Root Cause

### Problem
"Item ID" column appeared in the rendered PDF despite not being in `STANDARD_ITEM_COLUMNS`.

### Root Cause
Chain of events:
1. Raw DB items have `item_id` at root level (DB schema field)
2. `normalizeWaybillItem()` auto-repair loop (line 427) moved ALL non-standard keys into `custom_data` — including `item_id`
3. `collectWaybillCustomColumns()` collected `item_id` from `custom_data` as a custom column
4. This column was saved to `custom_fields.customColumns` in the DB
5. On PDF download, `customFields.customColumns` included `item_id`
6. `buildWaybillRenderModel()` received this column, `resolveColumns()` mapped it to `PrintColumn`
7. GreenTemplate rendered the "Item ID" column header

### Fix
Added `FORBIDDEN_DB_KEYS` set in `normalizeWaybillItem()` containing: `item_id`, `id`, `created_at`, `updated_at`, `unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`.

These keys are now **stripped** (skipped) during auto-repair instead of being moved to `custom_data`. This prevents them from ever being collected as custom columns.

### File
`src/components/waybill/waybillUtils.ts` — `normalizeWaybillItem()` function, auto-repair loop

---

## FIX 2: Method/Purpose Tick-Box UI

### Problem
Method and Purpose sections showed plain text (`<Text>{deliveryMode}</Text>`) instead of the tick-box UI from Green.html.

### Design Reference (Green.html)
- Method: 3 tick boxes (Hand, Vehicle, Courier)
- Purpose: 5 tick boxes (Supply, Return, Repair, Transfer, Other)
- Each tick = small bordered square (11×11, border 1.5, rounded 3) + label text
- Checked = square filled with accent color (`#1f6e5c`)
- Layout: flex row, wrap, gap 8px 14px

### Fix
1. Added tick-box styles to `createStyles()`: `tickGroup`, `tick`, `tickBox`, `tickBoxChecked`, `tickLabel`
2. Replaced plain text rendering with tick-box rows comparing `deliveryMode`/`purpose` against option arrays
3. Each option renders a bordered square (checked = accent-filled) + bold label

### File
`src/components/waybill/GreenTemplate.tsx` — styles + Method/Purpose section

---

## FIX 3: Section Visibility Audit

### Finding
All sections in GreenTemplate are **unconditionally rendered**. No conditional hiding exists.

Every section always renders visible regardless of data:
- Accent bar, Header, Title, Info grid, Method/Purpose, Client & Destination, Items table, Driver row, Notes, Signatures, Footer

The only conditional rendering is within sections (logo vs icon, signature image vs empty area, alternating row styles) — both branches always render something visible.

### Status
No changes needed — already compliant with blank preservation rules.

---

## Verification

- **TypeScript:** `tsc --noEmit` — clean (no errors)
- **ESLint:** No new errors from modified files (1 pre-existing error on line 489 — `normalizeWaybillPdfTemplateId` unused parameter)
