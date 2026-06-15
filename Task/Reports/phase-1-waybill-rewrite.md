# Phase 1: Waybill Import Rewrite Report

**Date:** 2026-06-15
**Scope:** Restore `delivery_location` to waybill forms + split External/Internal imports into isolated prompt/adapter/schema files

---

## Part A: Restore `delivery_location` to Waybill Form

### What Changed
- **File:** `src/components/waybill/WaybillForm.tsx`
- Added `delivery_location` field to the Custody Details section for both External and Internal waybill forms
- Field uses existing `locationLabel`/`locationPlaceholder` content from `WAYBILL_TYPE_CONTENT`
- External label: "DELIVERY LOCATION" with placeholder "Client address, site, or drop-off location"
- Internal label: "MOVEMENT ROUTE / DESTINATION" with placeholder "Where the items are moving within operations"
- Field spans full width (`col-span-2`) below sender/receiver fields in the Custody Details grid

### Existing Support
- `delivery_location` already existed in the `Waybill` interface in `waybillUtils.ts`
- `normalizeWaybillImport` already maps `delivery_location` from imported JSON
- `waybillMutations.ts` already includes `delivery_location` in the save payload

---

## Part B: Isolated Import Adapters (6 New Files)

### B1. External Waybill Prompt (`src/domain/waybill/externalWaybillPrompt.ts`)
- Imports `JSON_IMPORT_DISCIPLINE_SPEC` from `promptGenerator.ts`
- Isolation statement: "This document type is isolated. Do not reuse interpretation logic from any other document type, including internal waybill."
- Header fields: sender_name, receiver_name, po_number, vehicle_plate, driver_name, transport_mode, delivery_location, notes, date, time
- Items: description, quantity, unit, condition
- Excludes: partyNotes, linkedProjectName, sourceDocumentNumber, purpose, client_id/client_name

### B2. Internal Waybill Prompt (`src/domain/waybill/internalWaybillPrompt.ts`)
- Isolation statement: "This document type is isolated. Do not reuse interpretation logic from any other document type, including external waybill."
- Same header fields as external except: no po_number, no client fields
- Excludes: purpose (DB-enforced NULL), po_number, client_id/client_name

### B3. External Waybill Schema (`src/domain/waybill/externalWaybillSchema.ts`)
- Zod schema for external waybill import validation
- All fields nullable/optional except items array (min 1) with required description and quantity
- Transport mode enum: "By Vehicle" | "By Hand" | "By Courier"
- Item condition enum: "good" | "damaged" | "partial"

### B4. Internal Waybill Schema (`src/domain/waybill/internalWaybillSchema.ts`)
- Same shape as external but without po_number field
- Same item validation requirements

### B5. External Waybill Import Adapter (`src/domain/waybill/externalWaybillImportAdapter.ts`)
- Combines prompt, schema, and `applyResult` function
- `applyResult` strips monetary fields (defense in depth), normalizes dates, maps parsed data to `WaybillImportResult` shape
- Returns type: 'external', fields, items, customColumns, customFields

### B6. Internal Waybill Import Adapter (`src/domain/waybill/internalWaybillImportAdapter.ts`)
- Same pattern as external adapter but for internal waybills
- Returns type: 'internal', no po_number in fields

---

## B7. Wiring Updates (2 Modified Files)

### `src/components/waybill/WaybillImportSheet.tsx`
- Removed hardcoded 82-line prompt string
- Accepts `adapter` prop with `prompt` and `schema` properties
- Uses `adapter.prompt` for AI prompt display
- Validates parsed JSON with `adapter.schema.parse()` before calling `onImport`
- Error feedback via `feedback.error` for parse/validation failures

### `src/components/waybill/WaybillForm.tsx`
- Imports `externalWaybillImportAdapter` and `internalWaybillImportAdapter`
- `handleApplyImport` now selects adapter based on `type` and calls `adapter.applyResult(parsed)` instead of `normalizeWaybillImport`
- `WaybillImportSheet` receives `adapter` prop based on current waybill type
- Removed unused `normalizeWaybillImport` import

---

## `JSON_IMPORT_DISCIPLINE_SPEC` Export

### `src/domain/import/promptGenerator.ts`
- Added named export `JSON_IMPORT_DISCIPLINE_SPEC` (was previously local `const DISCIPLINE_SPEC`)
- Local `DISCIPLINE_SPEC` now references the exported constant
- Both prompt files import this constant to maintain single source of truth

---

## Verification

| Check | Result |
|-------|--------|
| `bun run audit:load` | Pass (no new warnings from changed files) |
| `bun run typecheck` | Pass (0 errors) |
| `bun run lint` (modified files) | Pass (0 new errors; `normalizeWaybillImport` unused import removed) |
| Field count: modified files | 3 (WaybillForm, WaybillImportSheet, promptGenerator) |
| Field count: new files | 6 (2 prompts, 2 schemas, 2 adapters) |
| **Total files changed** | **9** |

---

## File Inventory

### Modified Files
1. `src/components/waybill/WaybillForm.tsx` — delivery_location field + adapter wiring
2. `src/components/waybill/WaybillImportSheet.tsx` — adapter prop + schema validation
3. `src/domain/import/promptGenerator.ts` — exported JSON_IMPORT_DISCIPLINE_SPEC

### New Files
1. `src/domain/waybill/externalWaybillPrompt.ts`
2. `src/domain/waybill/internalWaybillPrompt.ts`
3. `src/domain/waybill/externalWaybillSchema.ts`
4. `src/domain/waybill/internalWaybillSchema.ts`
5. `src/domain/waybill/externalWaybillImportAdapter.ts`
6. `src/domain/waybill/internalWaybillImportAdapter.ts`

### Untouched (No Changes Required)
- `src/domain/import/schema.ts` — invoice schema only
- `src/domain/waybill/waybillMutations.ts` — already references delivery_location
- `src/components/waybill/waybillUtils.ts` — delivery_location already in Waybill interface
