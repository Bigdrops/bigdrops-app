# Waybill Table Settings / JSON Import / DB Model — Systems Audit

> **Goal:** Map the three coupled systems that control column schema for the Waybill PDF engine rebuild.
> **Status:** Read-only audit. No fixes proposed.
> **Date:** 2026-06-20

---

## System A: Table Settings (Form-level column management)

**Location:** `WaybillForm.tsx` (lines 92–316), `waybillUtils.ts` (lines 21–69, 108–109, 405–416, 545–562), `ColumnManager.tsx`

### How it works

The form holds four independent state variables for column control:

| State | Type | Purpose |
|---|---|---|
| `columnVisibility` | `Record<string, boolean>` | Show/hide per column key |
| `columnTitles` | `Record<string, string>` | Display label overrides |
| `columnOrder` | `string[]` | Display order of standard columns only |
| `customColumns` | `WaybillCustomColumn[]` | User-created extra columns (max 4) |

### Standard columns (shared origin)

Defined in `src/domain/waybill/contracts/waybillContract.ts:46`:

| Key | Label | Default Visible |
|---|---|---|
| `description` | Description | true |
| `quantity` | Qty | true |
| `unit` | Unit | true |
| `make` | Make | false |
| `partNo` | Part No | false |
| `condition` | Condition | false |

The form builds `DEFAULT_WAYBILL_COLUMNS` as `ColumnConfig[]` from these (`WaybillForm.tsx:227`), then merges with `customColumns` into a single `columns` array passed to `ColumnManager`.

### Custom Column lifecycle

1. **Create:** `addCustomColumn()` generates key via `createCustomColumnKey('custom_${Date.now()}')` → e.g. `custom_1718000000000`. Sets visible by default.
2. **Rename:** `onUpdate` with field `'label'` — checks for duplicate labels, updates either `columnTitles` (standard) or `customColumns` array (custom).
3. **Remove:** `removeCustomColumn(key)` — removes from `customColumns` AND deletes key from every item's `custom_data`.
4. **Reset:** `onReset` — resets all four states to defaults, wipes all `custom_*` keys from items' `custom_data`.
5. **Collect before save:** `collectWaybillCustomColumns()` (`waybillUtils.ts:545`) merges existing `customColumns` with keys discovered in items' `custom_data`, deduplicated by normalized key, capped at `WAYBILL_COLUMN_LIMIT = 4`.

### Visibility flow

- `isColumnVisible(key)` checks `columnVisibility[key]` first, defaults to `true` for `custom_*` keys, `false` otherwise.
- `columnManagerProps.onToggle` flips `columnVisibility[key]` between `true`/`false`.
- On save, `buildWaybillCustomFields()` writes `{ customColumns, columnVisibility }` into `custom_fields`.

### Persistence shape

```json
{
  "customColumns": [{ "key": "custom_1718000000000", "label": "Serial No" }],
  "columnVisibility": { "description": true, "quantity": true, "unit": true, "make": false, "partNo": false, "condition": false, "custom_1718000000000": true },
  "signatures": { ... },
  "partyNotes": { ... },
  "references": { ... },
  "importMeta": { ... },
  "pdfTemplateId": "default"
}
```

### ColumnManager.tsx dependency

`ColumnManager` lives at `src/components/ColumnManager.tsx`. It's **invoice-specific** — imports `ColumnConfig` and `InvoiceItem` from `@/domain/invoice/types`. WaybillForm passes a `ColumnConfig[]` to it but `ColumnConfig` is an invoice type. The `onUpdate` handler in WaybillForm adapts the generic `ColumnConfig` interface back to waybill state.

---

## System B: JSON Import

**Location:** `WaybillImportSheet.tsx`, `externalWaybillImportAdapter.ts`, `internalWaybillImportAdapter.ts`, `externalWaybillPrompt.ts`, `internalWaybillPrompt.ts`, `externalWaybillSchema.ts`, `internalWaybillSchema.ts`, `waybillUtils.ts` (lines 564–654), `src/domain/import/` (generic pipeline — unused by waybills)

### Pipeline (waybill-specific)

```
WaybillImportSheet
  → JSON.parse(text)
  → adapter.schema.parse(parsed)     // Zod validation only, return value discarded
  → onImport(text)                   // passes raw text to parent
    → WaybillForm.handleApplyImport
      → adapter.applyResult(parsed)  // shape: WaybillImportResult
      → setState({ waybill, items, customColumns, customFields })
```

### Schema surfaces

| Field | External Schema | Internal Schema |
|---|---|---|
| `sender_name` | string.nullable.optional | string.nullable.optional |
| `receiver_name` | string.nullable.optional | string.nullable.optional |
| `po_number` | string.nullable.optional | — (not present) |
| `vehicle_plate` | string.nullable.optional | string.nullable.optional |
| `driver_name` | string.nullable.optional | string.nullable.optional |
| `transport_mode` | enum: By Vehicle, By Hand, By Courier | same |
| `delivery_location` | string.nullable.optional | string.nullable.optional |
| `notes` | string.nullable.optional | string.nullable.optional |
| `date` | string.nullable.optional | same |
| `time` | string.nullable.optional | same |
| `items` | array(min 1): {description, quantity(positive)} | same |

Both schemas use `.passthrough`? No — Zod `z.object()` by default **strips** unknown keys. So extra root-level fields are silently dropped by the schema parse. But since the schema result is discarded (only used for validation), `applyResult` receives the raw `parsedData` with all original keys intact.

### Adapter `applyResult` behavior

Both adapters (`externalWaybillImportAdapter.ts`, `internalWaybillImportAdapter.ts`) are structurally identical:

1. **Strip monetary keys:** `unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total` are deleted from each item (AGENTS.md hard rule: "Invoice domain items to waybill spawn transform must strip all monetary values")
2. **Map remaining item fields to `custom_data`:** Any key not in `STANDARD_KEYS = ['description','quantity','unit','condition']` → goes into `custom_data`, key normalized via `normalizeDataKey()`. Special handling for nested `custom_fields` object.
3. **Generate custom columns:** For every unique custom_data key discovered, a `WaybillCustomColumn` is created via `makeWaybillCustomColumn(labeledKey, normalizedKey)` with semantic keys (e.g. `serial_no`, `part_no`, `make`).
4. **Set top-level fields:**
   - External: `type`, `date`, `time`, `sender_name`, `receiver_name`, `client_name`, `po_number`, `vehicle_plate`, `delivery_location`, `notes`
   - Internal: `type`, `date`, `time`, `sender_name`, `receiver_name`, `vehicle_plate`, `delivery_location`, `notes`
5. Custom columns capped at **20** (vs form limit of 4).

### Prompt extraction rules

Both prompts enforce:
- Monetary values stripped
- Custom item fields consolidated to **make/part_no/serial_only** (3 exact keys)
- At most 2 additional custom field keys beyond these 3
- Never exceed **6 total item columns** (description, quantity, unit, condition + at most 2 custom beyond make/part_no/serial_no)
- Document type isolation (external prompt must not reuse internal logic and vice versa)

### Generic import pipeline (`src/domain/import/`) — NOT used by waybills

The generic pipeline in `src/domain/import/` follows: `parse → normalize → validate → resolve → apply`. It is **invoice-specific**:

- All types reference `InvoiceItem` and `ColumnConfig` from `@/domain/invoice`
- `BASE_FIELDS` in `normalize.ts:16` includes invoice fields: `unit_price`, `sub_description`, `make`, `group_id`, `temp_ref`
- `apply.ts` builds `InvoiceItem[]` with `sort_order`, `group_id`, `group_name`
- Supports Add/Update modes with group clustering/scattering, overwrite detection
- Waybill import completely bypasses this — adapters transform directly

---

## System C: Supabase / DB Model

**Location:** `supabase/migrations/20260611000000_waybill_schema_final.sql`, `src/lib/database.types.ts`

### DB columns (waybills table)

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() |
| `waybill_number` | text | UNIQUE, indexed |
| `type` | text | CHECK IN ('external','internal') |
| `status` | text | CHECK IN ('dispatched','pending_confirmation','delivered','returned') |
| `date` | text | (architecture: text) |
| `time` | text | |
| `sender_name` | text | NOT NULL |
| `receiver_name` | text | NOT NULL |
| `receiver_signature_url` | text | |
| `receiver_description` | text | |
| `client_id` | uuid? | |
| `client_name` | text | |
| `project_id` | uuid? | |
| `invoice_id` | uuid? | |
| `po_number` | text | |
| `vehicle_plate` | text | |
| `driver_name` | text | |
| `transport_mode` | text | CHECK (NULL OR IN ('By Vehicle','By Hand','Courier','Self Pick-Up')) |
| `purpose` | text | CHECK (external: IN ('Supply','Return','Third-Party Custody'), internal: NULL) |
| `delivery_location` | text | |
| `items` | jsonb | CHECK via `validate_waybill_items()`: array, non-empty, each has `description` + `qty` (number > 0) |
| `notes` | text | |
| `created_by` | uuid? | (no FK per architecture) |
| `created_at` | timestamptz | |
| `archived_at` | timestamptz | |
| `custom_fields` | jsonb | No CHECK — free-form |

### Purpose constraint (critical discrepancy)

DB constraint `check_waybill_purpose_conditional`:

```sql
(type = 'external' AND purpose IN ('Supply', 'Return', 'Third-Party Custody')) OR
(type = 'internal' AND purpose IS NULL)
```

App `WaybillPurpose` type (`waybillUtils.ts:17`): `'Supply' | 'Return' | 'Repair' | 'Other' | 'Transfer'`

| App value | Allowed by DB for external? | Allowed by DB for internal? |
|---|---|---|
| `Supply` | Yes | No (internal must be NULL) |
| `Return` | Yes | No |
| `Repair` | **No** — not in DB enum | **No** — internal must be NULL |
| `Other` | **No** | **No** |
| `Transfer` | **No** | **No** |
| `Third-Party Custody` | Yes (DB-only, not in app) | No |

**Every `purpose` value set through the app on any waybill would violate the DB CHECK constraint** — except `'Supply'` and `'Return'` on external waybills. `'Third-Party Custody'` is a DB-only value the app never produces.

### `database.types.ts` staleness

The auto-generated `database.types.ts` waybill Row type is missing:
- `purpose` (text, nullable)
- `transport_mode` (text, nullable)
- `driver_name` (text, nullable)
- `custom_fields` (Json, nullable)

And shows `sender_name` and `receiver_name` as `string | null` when the migration sets them `NOT NULL`.

---

## Mapping Boundaries & Conflicts

### Conflict 1: Column key naming conventions

| Source | Key pattern | Example |
|---|---|---|
| Table Settings | `custom_${timestamp}` | `custom_1718000000000` |
| Import adapters | `normalizeDataKey(sourceKey)` | `serial_no`, `part_no`, `make` |
| Generic import pipeline (unused) | `custom_${snakeCase(label)}` | `custom_serial_no` |
| Standard columns (contract) | Literal string | `description`, `partNo`, `make` |

**Problem:** Import adapters create semantic keys (`serial_no`) but Table Settings creates opaque timestamp keys (`custom_1718000000000`). If a user imports with `serial_no` columns, then later adds a column manually, the key formats mismatch. `collectWaybillCustomColumns()` would see `serial_no` from `custom_data` and `custom_1718000000000` from `customColumns` — two different conventions for similar purposes.

### Conflict 2: Custom column count limits differ

| System | Limit |
|---|---|
| Form Table Settings | `WAYBILL_COLUMN_LIMIT = 4` |
| Import adapters | `.slice(0, 20)` |

Import can produce up to 20 custom columns but the form UI only supports managing 4. The extra 16 would be in `custom_fields.customColumns` but invisible/hidden in the form UI. The PDF engine would need to decide what to render.

### Conflict 3: `make` and `partNo` — standard column or custom?

- `STANDARD_ITEM_COLUMNS` lists `make` and `partNo` as standard columns (keys must match top-level `WaybillItem` fields)
- But `WaybillItem` interface does NOT have `make` or `partNo` top-level fields — only `description`, `quantity`, `unit`, `condition`, `custom_data`, `row_type`
- `WAYBILL_ITEM_KEYS` (the contract enum) does NOT include `make` or `partNo`
- Import adapters define `STANDARD_KEYS = ['description','quantity','unit','condition']` — no `make` or `partNo`
- So `make` and `partNo` values coming from import go into `custom_data` as custom keys
- But they appear as "standard columns" in `STANDARD_ITEM_COLUMNS` and the ColumnManager

**Status:** `make` and `partNo` exist in a grey zone — the contract presents them as standard columns, but the type system and import treat them as custom_data extension fields. The form's `columnTitles` state has entries for them, and visibility can toggle them, but they're not typed as top-level WaybillItem fields.

### Conflict 4: Purpose value mismatch (DB vs app)

The DB CHECK constraint (`check_waybill_purpose_conditional`) lists different allowed values than the app. This means:
- Any waybill saved with `purpose: 'Repair'`, `'Other'`, or `'Transfer'` will **fail at DB level**
- Internal waybills with any non-NULL purpose will fail
- The DB has `'Third-Party Custody'` which the app never sets

**Impact:** Waybill saves from the form will fail whenever a purpose is selected, for both external and internal types. Only `'Supply'` and `'Return'` on external waybills would succeed.

### Conflict 5: `transport_mode` empty string vs NULL

- DB CHECK allows: `NULL` or `'By Vehicle' | 'By Hand' | 'Courier' | 'Self Pick-Up'`
- Form has a `'Blank'` option that sets the value to **empty string `''`**
- Empty string `''` is not `NULL` and doesn't match any of the 4 valid values → **DB constraint violation**
- Import adapters set `transport_mode` only if present in source, otherwise it's absent/undefined (which may map to NULL)

### Conflict 6: Prompt output shape vs adapter expectations

External prompt output shape does NOT include `client_name` but the adapter's `applyResult` reads `parsedData.client_name`. The AI would never produce this key per the prompt instructions. Similarly, neither prompt includes `purpose` or `signatures`.

### Conflict 7: `columnVisibility` overwritten on import

In `handleApplyImport`:
```ts
customFields: {
  ...prev.customFields,
  ...result.customFields,
}
```
`result.customFields` only has `{ customColumns }`. While `...prev.customFields` preserves the rest, `customColumns` is **replaced entirely** by the import's version. If the user had custom columns from Table Settings, they're lost.

### Conflict 8: DB type definitions are stale

`database.types.ts` is missing `purpose`, `transport_mode`, `driver_name`, `custom_fields` — any TypeScript code referencing these as DB-shaped types will get no type support or false negatives.

---

## Summary Diagram

```
                    WaybillForm.tsx
                    ┌─────────────────────────────────┐
                    │  columnVisibility  ←→ ColumnManager │
                    │  columnTitles            (invoice    │
                    │  columnOrder             ColumnConfig)│
                    │  customColumns[0..4]                 │
                    │  items[].custom_data                 │
                    └──────────┬──────────────────────┘
                               │ save/load
                               ▼
                    custom_fields jsonb
                    ┌─────────────────────────────┐
                    │ customColumns[]              │
                    │ columnVisibility{}           │
                    │ signatures, partyNotes, ...  │
                    └─────────────────────────────┘
                               ▲
                               │ import
                    ┌──────────┴──────────────────────┐
                    │  WaybillImportSheet              │
                    │  → adapter.applyResult()         │
                    │    (bypasses generic import      │
                    │     pipeline, uses own transform)│
                    │  customColumns[0..20]           │
                    │  fields + items with custom_data │
                    └─────────────────────────────────┘

                      Supabase waybills table
                    ┌─────────────────────────────────┐
                    │  DB columns + custom_fields jsonb│
                    │  purpose CHECK (mismatched!)     │
                    │  transport_mode ('' vs NULL!)    │
                    │  items jsonb (qty, not quantity) │
                    └─────────────────────────────────┘
```

### Key: Items JSONB shape

DB CHECK expects `qty` (number > 0), but app TypeScript uses `quantity`. The migration function `validate_waybill_items()` checks for `qty`, not `quantity`. Another potential mismatch in persistence.

---

## What the PDF engine must reconcile

1. **Column source:** Must read from both `custom_fields.customColumns` (the canonical column definitions) and `STANDARD_ITEM_COLUMNS` (the contract-defined standard columns), deduplicating by key.
2. **Visibility:** Must consume `custom_fields.columnVisibility` to decide what to render.
3. **Custom data:** Each item's `custom_data` object may contain keys that correspond to `customColumns` entries — the engine must only render those columns that exist in the combined column set.
4. **No monetary values:** Must never render `unit_price`, `rate`, `vat`, etc. — AGENTS.md hard rule.
5. **Purpose vs transport_mode:** `transport_mode` is a DB column, not in `custom_fields`. The engine needs access to the waybill's `transport_mode` field directly, not from customFields.
