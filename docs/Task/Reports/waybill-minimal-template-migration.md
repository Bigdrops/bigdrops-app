# Waybill Minimal Template Migration — Work Report

## Summary

Migrated the Minimal waybill template (`blankWaybillTemplate.tsx`) to consume ONLY the `WaybillRenderModel` from `buildWaybillRenderModel`, making it a pure layout renderer identical to what Classic now has. No separate data path, no raw waybill access.

## Changes Made

### 1. `src/components/waybill/blankWaybillTemplate.tsx`

**Removed:**
- `MinimalContentData` interface
- `BlankTemplateOptions` interface
- `BlankExternalTemplate` wrapper function
- `BlankInternalTemplate` wrapper function
- `downloadBlankWaybillTemplate` function (replaced with model-based version)
- Imports: `formatWaybillDate`, `rawWaybillToWaybillItems`, `richTextToPlainText`, `WaybillType`, `WaybillItem`

**Added:**
- `WaybillMinimalContent` now accepts `{ model: WaybillRenderModel }` instead of `{ data: MinimalContentData }`
- `downloadBlankWaybillTemplate` now accepts `{ model: WaybillRenderModel, type: 'internal' | 'external', fileName?: string }`
- Uses `pdf()` from `@react-pdf/renderer` for blob generation

**Updated:**
- All field access paths to use `model.*` sections:
  - `model.branding.*` for company info
  - `model.header.*` for waybill number, date, type
  - `model.parties.*` for client name, sender/receiver
  - `model.logistics.*` for vehicle, driver, delivery mode, purpose
  - `model.table.columns/rows` for table data
  - `model.signatures.*` for signatures
  - `model.footer.*` for footer
  - `model.notes` for notes (now a string, not object)
- Checkbox derivation from model strings (one allowed exception to "no logic")
- Table uses `model.table.columns` for headers and `model.table.rows` for data
- Signature cards use `model.signatures.sender/receiver` with null → empty box fallback
- Pagination uses `model.pagination.repeatTableHeader` for fixed header

### 2. `src/components/waybill/WaybillPDF.tsx`

**Removed:**
- `MinimalContentData` import
- `formatWaybillDate` import
- `mapDbWaybill` import (no longer needed for minimal path)
- `minimalData` construction code (lines 102-124)
- Dead variables: `customFields`, `signatureMap`, `senderSig`, `receiverSig`

**Updated:**
- Minimal path now passes `model` directly to `WaybillMinimalContent`
- Added guard: `if (!model) return null` for minimal path

### 3. `src/pages/NewWaybill.tsx`

**Updated:**
- `handleBlankDownload` now builds a `WaybillRenderModel` from blank waybill data
- Imports `buildWaybillRenderModel` and `STANDARD_ITEM_COLUMNS` dynamically
- Constructs `RawWaybill` from blank options (waybillNumber, type, date, empty items)
- Passes model to `downloadBlankWaybillTemplate`

## Type Safety

- All changes pass `bun run typecheck` with no errors
- No new lint errors introduced (verified with `bun run lint`)
- Pre-existing lint errors in other files remain unchanged

## Architecture Impact

- **Engine**: Not modified
- **Classic template**: Not modified
- **New shared utilities/hooks/abstraction layers**: None created
- **Minimal template**: Now consumes ONLY `WaybillRenderModel`
- **Data flow**: Both entry points (WaybillPDF for view/download, NewWaybill for blank) now build model before passing to template

## Verification

1. ✅ `bun run typecheck` — passes
2. ✅ `bun run lint` — no new errors in modified files
3. ✅ No modifications to engine, Classic template, or shared utilities
4. ✅ No new abstractions created
5. ✅ Minimal template is now a pure layout renderer
