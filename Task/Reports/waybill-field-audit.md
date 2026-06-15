# Waybill Field Read-Only Audit

> Audit date: 2026-06-14
> Scope: `src/components/waybill/` + `src/domain/waybill/` + `src/components/waybill/WaybillImportSheet.tsx`

---

## Source of Truth: `Waybill` Interface

Defined at `src/components/waybill/waybillUtils.ts:66-93`.

### Top-level Fields

| # | Field | Type | In Form UI? | In Import Prompt? | In DB Payload? | Notes |
|---|-------|------|-------------|-------------------|----------------|-------|
| 1 | `id` | `string` | No | No | No (auto) | Supabase PK |
| 2 | `waybill_number` | `string` | **Yes** | No | `waybill_number` | Required. Code gen: `AWB-E-NNNN` / `AWB-I-NNNN` |
| 3 | `type` | `'internal'\|'external'` | Via prop | **Yes** | `type` | DB CHECK constraint |
| 4 | `date` | `string` | **Yes** | **Yes** | `date` | |
| 5 | `time` | `string` | **Yes** | **Yes** | `time` | Nullified if empty |
| 6 | `sender_name` | `string` | **Yes** | **Yes** (aliases) | `sender_name` | Multiple import aliases |
| 7 | `receiver_name` | `string` | **Yes** | **Yes** (aliases) | `receiver_name` | Multiple import aliases |
| 8 | `client_id` | `string` | **Yes** (external only) | No | `client_id` | Nullified if empty |
| 9 | `client_name` | `string` | **Yes** (external only) | **Yes** | No | Display-only, not in DB payload |
| 10 | `project_id` | `string` | **No** | No | `project_id` | Nullified if empty |
| 11 | `invoice_id` | `string` | **No** | No | `invoice_id` | Nullified if empty |
| 12 | `po_number` | `string` | **Yes** (external only) | **Yes** (aliases) | `po_number` | |
| 13 | `vehicle_plate` | `string` | **Yes** (conditional) | **Yes** (aliases) | `vehicle_plate` | Hidden when transport=By Hand/Courier |
| 14 | `driver_name` | `string` | **Yes** | No | `driver_name` | In form but NOT in import prompt |
| 15 | `transport_mode` | `TransportMode` | **Yes** | No | `transport_mode` | In form but NOT in import prompt |
| 16 | `purpose` | `WaybillPurpose\|''` | **No** | No | `purpose` | Defaulted to 'Supply' for external, NULL for internal |
| 17 | `delivery_location` | `string` | **No** | **Yes** (aliases) | `delivery_location` | In import prompt but NO form field |
| 18 | `receiver_signature_url` | `string` | No | No | `receiver_signature_url` | Legacy field — superseded by custom_fields |
| 19 | `receiver_description` | `string` | **No** | **Yes** (alias) | `receiver_description` | Imported via `acknowledgement_notes` alias |
| 20 | `notes` | `string` | **Yes** | **Yes** (aliases) | `notes` | Collapsible RichTextEditor |
| 21 | `status` | `WaybillStatus` | No | **Yes** (imported) | `status` | Hardcoded `'dispatched'` on save |
| 22 | `created_by` | `string` | No | No | `created_by` | Nullified if empty |
| 23 | `created_at` | `string` | No | No | No (auto) | |
| 24 | `archived_at` | `string` | No | No | No | |
| 25 | `custom_fields` | `string\|WaybillCustomFields\|null` | **Yes** (as JSONB) | Indirectly | `custom_fields` | JSON blob |

### Item Fields (`WaybillItem`, `waybillUtils.ts:27-34`)

| # | Field | Type | In Form UI? | In Import Prompt? | DB Key | Notes |
|---|-------|------|-------------|-------------------|--------|-------|
| 1 | `description` | `string` | **Yes** | **Yes** (aliases) | `description` | Required |
| 2 | `quantity` | `number` | **Yes** | **Yes` (as `qty` in DB) | `qty` | **Name mismatch**: form uses `quantity`, DB stores as `qty` |
| 3 | `unit` | `string` | **Yes** | **Yes** | `unit` | |
| 4 | `condition` | `ItemCondition` | **Yes** | **Yes** | `condition` | Values: good / damaged / partial |
| 5 | `custom_data` | `WaybillItemCustomData` | **Yes** | **Yes** | `custom_data` | Dynamically added via custom columns |
| 6 | `row_type` | `'standard'\|'group_header'` | No | No | No | Frontend-only, never persisted |

### Custom Fields Namespace (`WaybillCustomFields`, `waybillUtils.ts:44-64`)

| Namespace | Sub-fields | In Form UI? | In Import Prompt? | Notes |
|-----------|-----------|-------------|-------------------|-------|
| `customColumns` | `WaybillCustomColumn[]` | **Yes** | Auto-created | Dynamically from item keys during import |
| `signatures.sender` | `present`, `description`, `confidence`, `image_url`, `drawn_data_url` | **Yes** (image/draw/upload) | **Yes** (`sender_signature_*`) | Prompt describes signatures, form captures image data |
| `signatures.receiver` | `present`, `description`, `confidence`, `image_url`, `drawn_data_url` | **Yes** (image/draw/upload) | **Yes** (`receiver_signature_*`) | Same as sender |
| `partyNotes.sender` | `string` | No | **Yes** (`sender_note`/`release_note`) | Imported but no form UI |
| `partyNotes.receiver` | `string` | No | **Yes** (`receiver_note`/`receipt_note`) | Imported but no form UI |
| `references.linkedInvoiceNumber` | `string` | **Yes** (displayed+attached) | **Yes** (`linked_invoice_number`/`invoice_number`) | |
| `references.linkedProjectName` | `string` | No | **Yes** (`linked_project_name`/`project_name`) | No form UI |
| `references.sourceDocumentNumber` | `string` | No | **Yes** (`source_document_number`/`reference_number`) | No form UI |
| `importMeta` | `source`, `importedAt`, `instructionsAccepted` | No | No | System-only |

---

## Critical Gaps

### Gap 1: `delivery_location` — In prompt, in Waybill type, BUT no form field

- Import prompt instructs AI to extract `delivery_location` (line 35 of WaybillImportSheet.tsx)
- `normalizeWaybillImport` maps `delivery_location`, `destination`, `to_location` into `fields.delivery_location`
- Waybill interface declares it at line 85
- `mapDbWaybill` reads it from DB at line 310
- **But the form UI has no input for `delivery_location` anywhere** — not even in the collapsible sections
- Impact: if imported, the value is silently ignored; user can never set or view it

### Gap 2: `purpose` — DB-enforced for external, BUT no form field

- DB CHECK constraint `check_waybill_purpose_conditional`: external waybills MUST have `purpose`, internal MUST be NULL
- `waybillMutations.ts:42` silently defaults it: `const purpose = waybill.type === 'internal' ? null : (waybill.purpose || 'Supply')`
- There are `PURPOSE_OPTIONS` defined (Supply, Return, Third-Party Custody) with full translations
- **But there is no Purpose dropdown/selector in the form UI**
- Validated in `validateWaybill()` at line 446: `if (waybill.type === 'external' && !waybill.purpose) errors.push('Purpose is required for external waybills')`
- Impact: every external waybill silently gets `purpose = 'Supply'` unless an edit elsewhere sets it; user has no control

### Gap 3: `project_id` / `invoice_id` — In Waybill type, in DB, BUT no form field for invoice_id

- `invoice_id` is referenced indirectly (via `AttachExistingDocumentSheet` → populates `linkedInvoiceNumber` in custom_fields.references, NOT `invoice_id` directly)
- `project_id` has no form UI or import mapping
- Both are nullable in DB but their values could be silently lost

### Gap 4: `driver_name` — In form UI, BUT NOT in import prompt

- Form has a `driver_name` text input
- `normalizeWaybillImport` does NOT map any import field to `driver_name`
- If a paper waybill has a driver name, the AI has no instruction to extract it
- Impact: data loss on import; user must manually type it after import

### Gap 5: `transport_mode` — In form UI, BUT NOT in import prompt

- Same as Gap 4 — form has `CompactSelectField`, but import has no mapping
- Impact: always defaults to `'By Vehicle'` on import (from `normalizeTransportMode`)

### Gap 6: `quantity` vs `qty` name mismatch

- Form interface: `WaybillItem.quantity`
- DB payload in `waybillMutations.ts:51`: `qty: item.quantity`
- Import mapping in `normalizeWaybillItem`: reads `record.qty`
- This is intentional (DB column is `qty`, frontend uses `quantity`), but worth documenting as a seam

### Gap 7: `partyNotes` — Imported but never displayed

- Import populates `customFields.partyNotes.sender` (from `sender_note`) and `.receiver` (from `receiver_note`)
- These values are never rendered in the form UI
- Impact: data loss on round-trip — import → save → re-open → notes gone

### Gap 8: `references.linkedProjectName` / `.sourceDocumentNumber` — Imported but never displayed

- Same pattern as Gap 7 — imported in `normalizeWaybillImport` but no form UI
- However, they are preserved during save (via `buildWaybillCustomFields`)

---

## `src/domain/waybill/` — Only One File

- `waybillMutations.ts` (89 lines) — save/update logic
- **No `importAdapter.ts`** (unlike `src/domain/invoice/importAdapter.ts` and `src/domain/quotation/importAdapter.ts`)
- All import logic lives in `normalizeWaybillImport()` inside `waybillUtils.ts`

---

## DB Constraints vs Code

| Constraint | Enforced? | Where? |
|-----------|-----------|--------|
| `check_waybill_type` (external\|internal) | **Yes** | DB + TypeScript types |
| `check_items_json_structure` (non-empty items, desc+qty>0) | **Partial** | Form validates, but `waybillMutations.ts` uses `Array.isArray` check, not structural |
| `check_waybill_purpose_conditional` | **No** (silent default) | `waybillMutations.ts:42` defaults to 'Supply', bypassing user intent |

---

## Summary

- **21 total fields in `Waybill` interface**
- **12 fields have form UI** (including conditional external-only fields)
- **13 fields can be set via import prompt** (including custom_fields sub-fields)
- **3 form fields missing from import**: `transport_mode`, `driver_name`, `notes` (notes is present actually)

Wait — `notes` IS in the form and IS in the import prompt and `normalizeWaybillImport` maps it. Let me correct: `driver_name` and `transport_mode` are in form but NOT in import. `delivery_location` is in import but NOT in form. `partyNotes`, `linkedProjectName`, `sourceDocumentNumber` are in import but have no form UI.

### Key Actions Needed (if changes were permitted)

1. **Add `delivery_location` field to form** — it's in the DB, in the import pipeline, but invisible to users
2. **Add `purpose` selector to external waybill form** — currently silently defaulted to 'Supply'
3. **Add `transport_mode` and `driver_name` to import prompt** — prevent data loss on import
4. **Display `partyNotes` in form** — currently data goes in, gets saved, but never shown
5. **Create `src/domain/waybill/importAdapter.ts`** — to match invoice/quotation domain pattern
