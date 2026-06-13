# Prompt 10 Execution Report

Date: 2026-06-13
Commit: fa669e3
Branch: main

## Objective
Fix the local SQLite schema mismatch that was preventing waybill saves in offline mode, and resolve three additional UI/data issues identified in `Task/Prompts/prompt10.md`.

---

## What Was Found

### 1. Local SQLite Schema Mismatch (`src/lib/native/waybillOffline.ts`)
- The `waybills_local` CREATE TABLE statement used `items_json` as the column name.
- The remote Supabase schema (and the rest of the codebase) uses `items`.
- This mismatch meant the INSERT statement was binding values to the wrong column count/names, causing `NOT NULL constraint failed: waybills.waybill_no` (the DB was rejecting the malformed insert and surfacing the nearest constraint).

### 2. Waybill Number Not Bound to Form (`src/pages/NewWaybill.tsx` + `src/components/waybill/WaybillForm.tsx`)
- `NewWaybill.tsx` generated the waybill number via `useEffect` and passed it through `initialData`.
- `WaybillForm.tsx` consumed `initialData` only at construction time via `createInitialState`.
- If the number arrived after the component mounted (or if `initialData` was `undefined` during the render before state initialized), the field stayed empty.
- The WAYBILL NO field showed `placeholder="AWB-—"` instead of the real generated number.

### 3. `quantity` vs `qty` in Offline Payload (`src/domain/waybill/waybillMutations.ts`)
- The offline save path spread `...waybill` and raw `items` directly into `createOfflineWaybillDraft`.
- `WaybillItem` uses `quantity`, but the local DB CHECK constraint `check_items_json_structure` (and the remote schema) require the JSON key `qty`.
- Offline saves would have produced items with `quantity` instead of `qty`, violating the constraint on sync.

### 4. Unit Input Was Free-Text (`src/components/waybill/WaybillForm.tsx`)
- The Unit column in the line items table used a plain `<Input>` with `onChange` writing any string.
- The invoice form already has a dedicated `UnitInput` component (`src/components/UnitInput.tsx`) with a searchable dropdown and `STANDARD_UNITS` / localStorage persistence.
- Waybills were not reusing this component, leading to inconsistent unit data.

---

## Fixes Applied

### Fix 1 — Align Local Schema with Remote
File: `src/lib/native/waybillOffline.ts`
- Renamed column `items_json` → `items` in the CREATE TABLE statement.
- Confirmed all other columns already match the remote schema:
  `id, waybill_number, type, date, time, sender_name, receiver_name, receiver_signature_url, receiver_description, client_id, client_name, project_id, invoice_id, po_number, vehicle_plate, delivery_location, items, notes, status, created_by, created_at, archived_at, purpose, transport_mode, driver_name, custom_fields`

### Fix 2 — Bind Generated Waybill Number to Form
Files: `src/pages/NewWaybill.tsx`, `src/components/waybill/WaybillForm.tsx`
- `NewWaybill.tsx` now passes `waybillNumber` and `loadingNumber` as explicit props to `WaybillForm`.
- `WaybillForm.tsx` accepts these props and initializes `waybill_number` from them in `createInitialState`.
- Added a `useEffect` that updates state if `waybillNumber` arrives after mount.
- WAYBILL NO field is `disabled` while loading; once generated it displays the real number (no placeholder).
- Kept `initialData` prop for backward compatibility with `EditWaybill.tsx`.

### Fix 3 — Map `quantity` → `qty` in Offline Path
File: `src/domain/waybill/waybillMutations.ts`
- Before calling `createOfflineWaybillDraft` in the offline branch, items are now normalized:
  ```ts
  const normalizedItems = items.map(item => ({
    description: item.description,
    qty: item.quantity,
    unit: item.unit,
    condition: item.condition,
    ...(item.custom_data && Object.keys(item.custom_data).length > 0 ? { custom_data: item.custom_data } : {})
  }))
  ```
- This ensures the JSON array inserted into `items` uses `qty`, satisfying the DB CHECK constraint.

### Fix 4 — Unit Column Dropdown
Files: `src/components/waybill/WaybillForm.tsx`
- Imported `UnitInput` from `@/components/UnitInput`.
- Replaced the free-text `<Input>` for the unit cell with `<UnitInput>`.
- No other columns or state logic changed; `updateItem(idx, 'unit', value)` signature remains compatible.

---

## Verification

### Typecheck
```
bun run typecheck
```
Result: **PASS** (zero errors)

### Git
```
git add -A && git commit -m "fix: align local SQLite schema, bind waybill number, unit dropdown" && git push origin main
```
Commit hash: **fa669e3**
Pushed to: `origin/main`

---

## Files Changed
1. `src/lib/native/waybillOffline.ts`
2. `src/domain/waybill/waybillMutations.ts`
3. `src/pages/NewWaybill.tsx`
4. `src/components/waybill/WaybillForm.tsx`
