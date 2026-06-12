# Waybill Creation Bugfixes — 2026-06-12

## Bugs Fixed

### Bug 1: Waybill number displays "[Auto-generated]" placeholder
- **Root cause**: `NewWaybill.tsx` did not pre-generate the waybill number before rendering the form. The `WaybillForm` showed a placeholder `"Auto-generated"` because no value was provided.
- **Fix**:
  - Added `useEffect` in `NewWaybill.tsx` that fetches existing waybill numbers from the DB and calls `generateWaybillSequenceNumber()` when `type` changes.
  - Stored the generated number in a `waybillNumber` state variable.
  - Passed it as `initialData.waybill.waybill_number` to `<WaybillForm>`.
  - Changed the placeholder from `"Auto-generated"` to `"AWB-—"` as a subtle fallback hint.
- **Files modified**:
  - `src/pages/NewWaybill.tsx` — Added `useEffect` + state for number generation, passed `initialData` to form.
  - `src/components/waybill/WaybillForm.tsx:316` — Changed placeholder text.

### Bug 2: Items DB save fails due to `quantity` vs `qty` field mismatch
- **Root cause**: The `WaybillItem` TypeScript interface uses `quantity` as the field name, but the Postgres CHECK constraint `check_items_json_structure` requires `qty`. The `saveWaybill` function sent `quantity` directly, causing a 400 error.
- **Fix**:
  - Added a `dbItems` mapping step in `saveWaybill()` that transforms each item from `{ description, quantity, unit, condition }` to `{ description, qty, unit, condition }` before inserting into the DB.
- **Files modified**:
  - `src/domain/waybill/waybillMutations.ts` — Added `items.map()` to rename `quantity` → `qty` in the payload.

## Verification
- TypeScript typecheck (`bun run typecheck`) passes with no errors.
