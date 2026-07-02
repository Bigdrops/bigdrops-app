# Waybill Classic Template Migration — Work Report

**Date:** 2026-06-21  
**Status:** ✅ Complete

---

## Summary

Migrated the Classic waybill template (`WaybillPDF.tsx`) to consume ONLY the `WaybillRenderModel` from `buildWaybillRenderModel`, making it a pure layout renderer with no raw data access, visibility logic, formatting, or conditional rendering.

---

## What Changed

### `src/components/waybill/WaybillPDF.tsx`

**Removed:**
- `formatWaybillTime`, `getWaybillSignature` imports (dead code after migration)
- `STANDARD_ITEM_COLUMNS` import (no longer needed)
- `columnVisibility`, `columnTitles` from props interface and destructuring
- `customColumns`, `signatureMap`, `senderSig`, `receiverSig` intermediate variables (only used for minimal path now, refactored)
- `isColumnVisible()` and `getColumnLabel()` helper functions (dead logic)
- Dead styles: `descCol`, `qtyCol`, `unitCol`, `conditionCol` (replaced by generic `customCol` column iteration)

**Added:**
- `model?: WaybillRenderModel` prop to `WaybillPDFProps`
- `WaybillRenderModel` type import from engine
- Classic template guard: returns `null` if `model` is missing (defensive)

**Rewritten (Classic branch):**
- Header: uses `model.branding.*` (name, tagline, logo, address, phone, email)
- Document title/number: uses `model.header.waybillNumber` and `getWaybillTypeContent(model.header.type)`
- Meta grid: renders `model.header.date/time/poNumber`, `model.logistics.vehiclePlate/deliveryLocation/deliveryMode/purpose/driverName`, `model.parties.clientName`
- Parties: uses `model.parties.senderName`, `model.parties.receiverName`
- Table header: iterates `model.table.columns` — uses `<View fixed>` for page repetition
- Table rows: iterates `model.table.rows`, each row's cells looked up by `col.key` — pure string rendering, zero transformation
- Notes: uses `model.notes` with `wrap={false}` for pagination safety
- Signatures: uses `model.signatures.sender/receiver` — renders image if present, empty box (110×42) if null
- Footer: `model.footer.waybillNumber` (left), `model.footer.companyName` (center), page numbers via React-PDF render prop

**Preserved (Minimal branch unchanged):**
- `template === 'minimal'` path still uses `mapDbWaybill()` + `WaybillMinimalContent`
- All minimal-specific imports retained

### `src/pages/ViewWaybill.tsx`

Already updated in prior session:
- Added `rawWaybill` state to preserve pre-mapped DB record
- Added `buildWaybillRenderModel` call inside `handleDownload` with resolved columns and company settings
- Passes `model={model}` to `<WaybillPDF>`

---

## Verification

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ Pass |
| `eslint WaybillPDF.tsx` | ✅ 0 errors, 0 warnings |

---

## Compliance with Spec Constraints

| Constraint | Status |
|---|---|
| Classic accepts ONLY `WaybillRenderModel` | ✅ No raw data prop |
| No modifications to engine | ✅ |
| No modifications to Minimal template | ✅ |
| No new shared utilities/hooks | ✅ |
| No `bun run dev` execution | ✅ |
| No inline ternaries on `mapped.*` | ✅ Model-driven iteration only |
| Signature empty boxes 110×42 | ✅ Preserved |
| `wrap={false}` on signatures/notes | ✅ Applied |
| Footer: waybillNumber (left), companyName (center), page numbers | ✅ |
| Table header uses `fixed` prop | ✅ |
| Dead code removed | ✅ |
