# JSON Import Audit — Per-Module Report

> Generated: 2026-06-14
> Scope: Every document module in the bigdrops-app that uses JSON import functionality.
> Method: Read-only file audit — no assumptions, no changes.

---

## 1. Shared Infrastructure

All modules route through a common pipeline in `src/domain/import/`:

| File | Purpose |
|---|---|
| `types.ts` | Shared types: `ImportMode`, `ApplyImportResult`, `ColumnImportMap`, `FieldMapping`, etc. |
| `schema.ts` | JSON schema validation via Zod (`simpleItemSchema`, `importJsonSchema`) |
| `utils.ts` | Helpers: `buildFieldMap`, `applyImportToItem`, `deduplicateByField` |
| `parser.ts` | `parseAndValidateJson()` — validates raw JSON against schema |
| `promptGenerator.ts` | `generateImportPrompt()` — builds dynamic item schema prompt from visible columns |

### Shared UI

- **`JsonImportLayout.tsx`** — A `Sheet`-based (shadcn) modal wrapper used by every module's import sheet.
  - Renders the textarea for pasting JSON, the "Open in AI" button, and the apply/cancel buttons.
  - Calls the module-specific `onApplyImport` callback with parsed JSON data.
  - Uses `OpenInAIDropdown` which always opens **Gemini** (URL-encoded prompt).
  - `src/lib/openInAI.ts` supports ChatGPT, Gemini, Claude but only Gemini path is used by the dropdown.

---

## 2. Invoice

| File | Path |
|---|---|
| Import adapter | `src/domain/invoice/importAdapter.ts` |
| Import sheet | `src/components/items/JsonItemsImportSheet.tsx` (shared with Quotation) |
| Domain layer | `src/domain/invoice/` (columns, factory, normalize) |

### How it works
- **Prompt source**: Shared `generateImportPrompt(columns, mode, "invoice")` from `promptGenerator.ts`.
  - Dynamically builds column list from `GetInvoiceColumns()`.
  - Mode is `"items"` (imports line items only).
- **Input format**: JSON array of objects matching visible invoice columns.
- **Validation**: JSON parsed via `parseAndValidateJson()` → Zod schema from `schema.ts`.
- **Apply logic**: `applyImportToItems(parsedData, items, columnImportMap)` updates the invoice's `items` array in-place.
- **Edge cases**: Handles optional columns (if column is not visible, its field is excluded from prompt schema).

### Key observations
- No standalone JSON file import — only clipboard paste.
- Only imports line items (`items` array), not header fields.
- Uses the generic `fieldMatcher` / `columnImportMap` pipeline to map pasted JSON keys to internal field names.

---

## 3. Quotation

| File | Path |
|---|---|
| Import adapter | `src/domain/quotation/importAdapter.ts` |
| Import sheet | `src/components/items/JsonItemsImportSheet.tsx` (shared with Invoice) |
| Domain layer | `src/domain/quotation/` (columns, factory, normalize) |

### How it works
- **Prompt source**: Shared `generateImportPrompt(columns, mode, "quotation")`.
  - Column list from `GetQuotationColumns()`.
- **Validation & apply**: Identical pipeline to Invoice — validates via Zod, applies via `applyImportToItems()`.

### Key observations
- Functionally identical to Invoice import — differs only in column source and document type label.
- Shares the same `JsonItemsImportSheet.tsx` component with Invoice.

---

## 4. RFQ (Request for Quotation)

| File | Path |
|---|---|
| Import adapter | `src/domain/rfq/importAdapter.ts` |
| Import sheet | `src/components/rfq/RfqImportSheet.tsx` |
| Domain layer | `src/domain/rfq/` |

### How it works
- **Prompt source**: **Hardcoded inline string** inside `rfqImportAdapter.ts`:
  > "Generate a JSON array of item objects. Each object must have the following fields: `item_name` (string), `quantity` (number), `specification` (string). ..."
- **Input format**: JSON array of `{ item_name, quantity, specification }`.
- **Validation**: Uses a local `parseJson()` call — does NOT use shared `parseAndValidateJson` from `parser.ts`.
  - Schema check is inline: verifies array, then maps each item through a simple transform.
- **Apply logic**: Calls `appendItems(rfqId, items)` Supabase RPC.

### Key observations
- **Diverges from shared pipeline**: bypasses `promptGenerator.ts`, `schema.ts`, and `parser.ts`.
- Prompt is hardcoded with a fixed 3-field schema — does not adapt to UI columns.
- Validation is minimal (no Zod, just `Array.isArray` + existence checks).

---

## 5. CSR (Customer Service Report)

| File | Path |
|---|---|
| Import logic | `src/components/csr/csrImport.ts` |
| Import sheet | `src/components/csr/CsrImportSheet.tsx` |
| Domain layer | `src/domain/csr/` |

### How it works
- **Prompt source**: **Hardcoded constant** `CSR_IMPORT_PROMPT` in `csrImport.ts`:
  > "Generate a JSON object with the following structure: { \"customer_name\": string, \"report_type\": string | null, \"description\": string, \"amount_due\": number | null, \"amount_paid\": number | null, \"product_serial_number\": string | null, \"status\": \"pending\" | \"resolved\" }"
- **Input format**: JSON object (single record), not an array.
- **Validation**: Uses `parseJSON()` from `src/lib/json/parse.ts` plus manual field checks inside `parseCsvImport()`.
- **Apply logic**: Returns a single `ApplyImportResult` with the parsed CSR fields, applied in the sheet by calling `createCsr()` mutation.

### Key observations
- **Single-record import** only (not bulk).
- **Diverges from shared pipeline**: no Zod schema, no shared parser, hardcoded prompt.
- The function is named `parseCsvImport()` suggesting it was originally built for CSV.
- Import sheet also supports CSV file upload alongside JSON paste.

---

## 6. Waybill

| File | Path |
|---|---|
| Import sheet | `src/components/waybill/WaybillImportSheet.tsx` |
| Import adapter | (none — logic is inline in the sheet) |
| Domain layer | `src/domain/waybill/` |

### How it works
- **Prompt source**: **Hardcoded inline string** inside `WaybillImportSheet.tsx`:
  > "Generate a JSON array of items. Each item must have: `description` (string), `qty` (number), optionally `unit` (string). ..."
- **Input format**: JSON array of `{ description, qty, unit? }`.
- **Validation**: Uses `parseAndValidateJson()` from shared `parser.ts`, validated against `importJsonSchema`.
- **Apply logic**: Updates the waybill's local `items` array state directly (controlled form state).

### Key observations
- Prompt is hardcoded with a minimal 3-field schema (description, qty, unit).
- Uses shared parser but **not** shared prompt generator.
- Waybill import is lightweight — only populates the `items` JSONB array, not header fields.

---

## 7. Compliance Hub

| File | Path |
|---|---|
| Import contracts/prompts | `src/domain/compliance/import/contracts.ts` |
| Import sheet | `src/components/compliance/import/ComplianceJsonImportSheet.tsx` |
| Preview card | `src/components/compliance/import/ComplianceJsonPreviewCard.tsx` |

### How it works
- **Prompt source**: **Three separate hardcoded prompts** in `contracts.ts`, one per contract type:
  1. **vat_input** — expects `{ supplier_name, supplier_tin, invoice_number, invoice_date, amount, vat_rate, vat_amount, description? }`
  2. **tax_filing** — expects `{ filing_period, filing_year, tax_type, gross_revenue, taxable_income, tax_due, paid? }`
  3. **wht_receipt** — expects `{ deduction_type, recipient_name, recipient_tin, gross_amount, wht_rate, wht_amount, invoice_number?, description? }`
- **Input format**: JSON array of objects (schema varies by contract type).
- **Validation**: Each contract type defines its own Zod schema (`contractSchemas`) in `contracts.ts` — these ARE Zod schemas but are custom per type, not the shared `importJsonSchema`.
- **Apply logic**: `applyImport()` per contract type transforms raw data into compliance record format, then calls the relevant Supabase mutation.
- **WHT payment linking**: `ComplianceJsonImportSheet.tsx` includes a payment selector dropdown when `wht_receipt` type is selected, allowing the user to link deductions to an existing payment.

### Key observations
- **Most complex import module** — 3 distinct schemas with conditional UI.
- Each contract type has its own hardcoded prompt and its own Zod schema.
- Does NOT use shared `promptGenerator.ts` or shared `schema.ts`.
- WHT receipt import has a unique payment-linking step not present in any other module.

---

## 8. Project Document (Purchase Order / Receipt / Receiving Waybill / Other)

| File | Path |
|---|---|
| Prompts | `src/domain/projectDocumentPrompts.ts` |
| Import sheet | `src/components/project/ProjectDocumentSheet.tsx` |
| Type selector | `src/components/project/ProjectDocumentTypeSelector.tsx` |
| Review form | `src/components/project/ProjectDocumentStep3Review.tsx` |
| Domain layer | `src/domain/projectDocuments.ts` |

### How it works

- **4 sub-types**, each with its own hardcoded AI prompt in `projectDocumentPrompts.ts`:
  1. **purchase_order** — expects `{ title, ref_number, voucher_number, date, from_party, to_party, notes, vat, wht, amount, payment_method, received_by, purchaseOrderItems[] }`
  2. **receipt** — expects `{ title, ref_number, voucher_number, date, from_party, to_party, notes, vat, wht, amount, waybillItems[] }`
  3. **receiving_waybill** — expects `{ title, ref_number, voucher_number, date, from_party, to_party, notes, amount, waybillItems[] }`
  4. **other** — expects `{ title, ref_number, voucher_number, date, from_party, to_party, notes, amount }`
- **Input format**: A single JSON object (one document), **not** an array.
- **Validation**: Inline `JSON.parse()` with try/catch, then checks `typeof result === 'object' && result !== null && !Array.isArray(result)` — no Zod schema, no shared parser.
- **Sheet architecture**: `ProjectDocumentSheet.tsx` wraps its own `Sheet` component directly (step 1 type selector, step 2 import, step 3 review). Step 2 uses the `JsonImportUI` inner component but does **not** wrap it in the shared `JsonImportLayout` (which itself is a Sheet-based wrapper).
- **from_party / to_party**: The AI prompt instructs extraction from source text — `from_party` = supplier/vendor name, `to_party` = purchaser/company name. The logged-in company identity is **not** injected into the prompt.
- **Prompt scope**: Prompts extract all form fields including financial values (`unit_price`, `amount`, `vat`, `wht`, `subtotal`, `total`). The review form recalculates subtotal/total from item data anyway, creating overlap between AI-computed and app-computed values.
- **Items with monetary values**: Unlike Invoice→Waybill spawn transforms (which strip all monetary values), Project Document item arrays preserve `unit_price`, `amount`, `vat`, `wht`, `subtotal`, `total` in the extracted JSON.

### Key observations

- **Only module with single-object (not array) import** — all others import bulk items/records.
- **No Zod validation** — raw `JSON.parse()` + manual type checks, unlike Invoice/Quotation/Waybill which use shared Zod schemas.
- **Own Sheet wrapper** — does not use shared `JsonImportLayout`; `ProjectDocumentSheet.tsx` has its own `Sheet` + steps. This is unique — every other module either uses `JsonImportLayout` or has its own simpler sheet, but Project Document combines a bespoke Sheet with `JsonImportUI` as a child.
- **4 sub-types, 1 module** — the only module where a single import mechanism handles 4 distinct document types with different prompt schemas and item structures.
- **from_party/to_party extraction** — prompt-driven from source text, no company identity baked in.
- **Financial field overlap** — prompt extracts calculated fields (subtotal, total) that the app recalculates, unlike Invoice/Quotation where only raw item fields are imported and totals are always calculated.
- **Invoice items → Waybill spawn strips monetary values** (hard rule in the codebase). Project Document items preserve them, meaning the same data flowing through a different domain retains vs. discards financial fields.

---

## 9. Item Library

| File | Path |
|---|---|
| Parser | `src/domain/items/itemJsonImport.ts` |
| Import sheet | (none — no UI component) |

### How it works
- **Prompt source**: (none — this is a parse-only utility, no prompt generation).
- **Input format**: JSON array of `{ name, unit, unit_price }`.
- **Validation**: Inline checks — verifies array, required fields, types.
- **Apply logic**: Returns parsed items for the caller to process (no UI, no mutation binding).

### Key observations
- **No UI** — this is a standalone utility function, not integrated into any sheet or modal.
- No prompt generation — the consumer is expected to provide the JSON directly.
- Minimal validation compared to shared pipeline.

---

## 10. Modules with NO JSON Import

| Module | Evidence |
|---|---|
| **BOQ** | Zero import-related files found. No import adapter, no import sheet. The only BOQ JSON interaction is via Compliance Hub's `wht_receipt` contract which references BOQ fields. |
| **Reports** | Zero import-related files found. No grep matches for "import" combining with "report". |
| **Payments** | No import adapter or import sheet. `RecordPaymentModal.tsx` exists but is a manual entry form, not an import mechanism. |

---

## 11. Summary Matrix

| Module | Prompt Source | Parser | Validation | Bulk/ Single | Uses Shared Pipeline? |
|---|---|---|---|---|---|
| Invoice | Shared `generateImportPrompt()` | Shared `parser.ts` | Shared Zod `schema.ts` | Bulk | **Yes** |
| Quotation | Shared `generateImportPrompt()` | Shared `parser.ts` | Shared Zod `schema.ts` | Bulk | **Yes** |
| RFQ | Hardcoded inline | Inline `parseJson()` | Inline checks | Bulk | **No** |
| CSR | Hardcoded constant (`CSR_IMPORT_PROMPT`) | Inline `parseCsvImport()` | Inline checks | Single | **No** |
| Waybill | Hardcoded inline | Shared `parser.ts` | Shared Zod `schema.ts` | Bulk | Partial (parser only) |
| Compliance Hub | Hardcoded per contract (3 prompts) | Per-contract custom | Per-contract Zod | Bulk | **No** |
| Item Library | N/A (no prompt) | Inline function | Inline checks | Bulk | **No** |
| Project Document | Hardcoded per sub-type (4 prompts) | Inline `JSON.parse()` | Inline type checks | Single | **No** |
| BOQ | — | — | — | — | N/A (no import) |
| Reports | — | — | — | — | N/A (no import) |

---

## 12. Cross-Cutting Observations

1. **3 out of 8 import-capable modules** (Invoice, Quotation, partial Waybill) use the shared `parser.ts` and `schema.ts`. The other 5 (RFQ, CSR, Compliance Hub, Item Library, Project Document) have bespoke implementations.
2. **Only 2 modules** (Invoice, Quotation) use the shared `promptGenerator.ts`. All others hardcode prompts inline.
3. The shared pipeline (`promptGenerator.ts`) is designed for dynamic `columns` → schema prompts, but no module besides Invoice/Quotation actually has a dynamic column set to pass.
4. **Validation inconsistency**: Invoice/Quotation/Waybill use Zod through shared schema. RFQ/CSR/Item Library/Project Document use manual checks. Compliance Hub uses its own Zod schemas per contract.
5. The **"Open in AI"** feature exclusively opens Gemini, despite the underlying `openInAI.ts` supporting ChatGPT and Claude.
6. CSV support exists alongside JSON in the **CSR** module (file upload + paste). All other modules are JSON-paste-only.

---

## 12. Invoice/Quotation Import — Update Mode (Current Implementation)

> Audit date: 2026-06-14
> Scope: MAIN branch only
> Method: Static code audit — no behavior validation

---

### 12.1 System Summary

Update mode allows users to patch existing invoice/quotation line items by referencing them via `row_number`. Unlike Add mode (which appends new rows), Update mode modifies in-place specific fields on existing standard rows. The system matches imported items to existing table rows using a 1-based `row_number` index that corresponds to the visible row numbering (excluding group header rows).

**What Update mode does according to code:**
- Accepts JSON with `items` array where each item must include a `row_number`
- Validates that each `row_number` corresponds to an existing standard row
- Merges only the provided fields onto the matched row (partial update / patch semantics)
- Does NOT create new rows
- Does NOT reorder rows
- Detects overwrite targets (fields that already have values) for potential user confirmation

---

### 12.2 UI Flow

**Step-by-step: UI → submit → parser → apply**

1. **Tab Selection** (`JsonItemsImportSheet.tsx:183-207`)
   - Two tabs: "New Items" (Add) and "Update Existing" (Update)
   - Update tab is disabled when `hasMeaningfulStandardRows(items)` returns false (line 72)
   - If no meaningful rows exist and user was on Update, auto-switches to Add (line 82)
   - Mode stored as `useState<ImportMode>('Add')` (line 68)

2. **Mode Copy Display** (`JsonItemsImportSheet.tsx:38-49`)
   - Update mode shows: "Patch existing rows using row_number. Only include changed rows and fields."
   - Placeholder: `{ "items": [{ "row_number": 3, "unit_price": 50000 }] }`
   - Badge: "Update mode"

3. **Prompt Display** (`JsonItemsImportSheet.tsx:85-89`)
   - Active prompt computed via `adapter.prompts(columns, mode)` — dynamic based on mode
   - Prompt displayed in `JsonImportLayout` for user to copy

4. **User Pastes JSON** → `handleApply()` called

5. **Parse** (`parseImportText(pastedText, mode)`)
   - Validates JSON structure via Zod schema from `buildImportSchema(mode)`
   - For Update mode: each item must include `row_number` (schema.ts:21-28)

6. **Normalize** (`normalizeImportData(parsed.data, mode)`)
   - In Update mode: skips empty/undefined values for text fields (description, sub_description, unit, make) and extra fields (lines 96, 103, 117, 136)
   - In Update mode: top-level fields (title, po_number, notes, terms) are undefined if empty (lines 183-186)

7. **Validate** (`validateImportData(mode, normalized.data, items)`)
   - Checks at least one meaningful standard row exists (line 55)
   - Validates each `row_number` is a positive integer
   - Checks for duplicate `row_number` values
   - Checks `row_number` does not exceed standard row count
   - Returns error if any check fails (hard fail, no skip)

8. **Resolve Columns** (`resolveImportColumns(...)`)
   - Same as Add mode — maps unknown columns to custom columns or existing columns

9. **Build Apply Result** (`buildApplyResult(...)`)
   - Calls `detectOverwriteTargets()` to identify fields being overwritten
   - Creates `nextItems` by shallow-cloning all existing items
   - For each imported item with `row_number`: finds matching standard row and applies field updates via `assignResolvedFields()`
   - Returns merged items array with sort_order reassigned

10. **Adapter Apply** (`invoiceImportAdapter.applyResult` or `quotationImportAdapter.applyResult`)
    - Calls `setItems(result.items)` — replaces entire items array
    - Updates columns, top-level fields, extra charges, groups as needed

11. **Feedback** — Shows "Rows updated" success toast

---

### 12.3 Parser Behavior

**What changes in Update mode vs Add mode:**

| Aspect | Add Mode | Update Mode |
|---|---|---|
| `row_number` requirement | Optional (ignored) | **Required** per item |
| Schema validation (`schema.ts`) | No `row_number` check | Each item must have `row_number` |
| Empty field handling | All fields preserved | Empty text/extra fields stripped during normalize |
| `groups` array | Parsed and processed | Still parsed but not used in apply |
| `temp_ref` / `group_id` | Used for group assignment | Ignored |
| Top-level fields | All applied | Only non-empty values applied |

**Whether it merges, replaces, or appends:**
- **Merges** — partial field update semantics. Only fields present in the import payload are changed. Fields not included in the JSON remain untouched on the existing row.

---

### 12.4 Row Matching Logic

**How rows are identified for update:**
- Each imported item must include `row_number` (1-based integer)
- `getStandardRowEntries()` in `utils.ts:157-165` filters out `group_header` rows, then re-indexes remaining standard rows starting at 1
- Matching: `rowEntries.find((entry) => entry.rowNumber === item.row_number)` (apply.ts:176)

**What happens if no match exists:**
- Validation stage (validate.ts:81-85): if `row_number > standardRows.length`, returns error `"row_number X does not match an existing row."`
- Apply stage (apply.ts:177): `if (!target) return` — silently skips items where row_number doesn't match (defensive, but validation should catch this first)

**Row numbering:**
- 1-based, sequential, excluding group header rows
- Example: if table has [group_header, standard_row_1, standard_row_2, group_header, standard_row_3], then row_number 1 = standard_row_1, row_number 2 = standard_row_2, row_number 3 = standard_row_3

---

### 12.5 Prompt Layer (CRITICAL)

**Location:** `src/domain/import/promptGenerator.ts`

**Function signature:**
```typescript
generateImportPrompt(columns: ColumnConfig[], mode: ImportMode, documentType: 'invoice' | 'quotation'): string
```

**Both Invoice and Quotation use the same prompt generator** — the only difference is the `documentType` parameter ("invoice" vs "quotation") which affects the intro sentence and one rule about title mapping.

**The prompts ARE different between Add and Update mode.** They are dynamically generated by the same function but with conditional branches based on `mode`.

---

#### Add Mode Prompt Structure

**Intro:**
```
Convert the source content into JSON for {documentType} import.
```

**JSON Structure:**
```json
{
  "title": "Document Title",
  "po_number": "PO-12345",
  "notes": "Remarks or internal notes",
  "terms": "Payment terms or conditions",
  "extra_charges": [{ "label": "Delivery", "value": 5000 }],
  "groups": [{ "id": "grp_1", "name": "Section or Category Name", "showSubtotal": false, "itemIds": ["item_1", "item_2"] }],
  "items": [{ "temp_ref": "item_1", "group_id": "grp_1", ...itemFields }]
}
```

**Rules (Add-only):**
- `row_number` refers to the current visible table row numbering starting at 1
- Include only fields that should change inside each row
- If source has section headings or categories, create a "groups" array
- Assign each group a stable id: "grp_1", "grp_2", etc.
- Add a unique "temp_ref" to every item: "item_1", "item_2", etc.
- Set "group_id" on each item matching its group's "id"
- List item temp_refs in the group's "itemIds" array
- If no sections exist in the source, omit "groups" entirely and omit "temp_ref" and "group_id" from items

**Item field keys (Add):**
```
temp_ref, group_id, {visibleColumnKeys}
```

---

#### Update Mode Prompt Structure

**Intro:**
```
Convert the source content into JSON for {documentType} update.
```

**JSON Structure:**
```json
{
  "title": "Document Title",
  "po_number": "PO-12345",
  "notes": "Remarks or internal notes",
  "terms": "Payment terms or conditions",
  "extra_charges": [{ "label": "Delivery", "value": 5000 }],
  "items": [{ "row_number": 1, ...itemFields }]
}
```

**Note:** No `groups` array in the Update mode JSON structure (line 39-48: groups only included when `mode === 'Add'`).

**Rules (Update-only):**
- `row_number` refers to the current visible table row numbering starting at 1
- Include only fields that should change inside each row

**Item field keys (Update):**
```
{visibleColumnKeys}
```
(No `temp_ref` or `group_id` in Update mode)

---

#### Exact Differences Between Add and Update Prompts

| Aspect | Add Mode | Update Mode |
|---|---|---|
| Intro text | `"...for {doc} import"` | `"...for {doc} update"` |
| `groups` in JSON structure | Included | **Excluded** |
| Item sample shape | `{ temp_ref, group_id, ...fields }` | `{ row_number: 1, ...fields }` |
| `temp_ref` in key list | Yes | **No** |
| `group_id` in key list | Yes | **No** |
| Group-related rules | 6 rules about groups | **None** |
| `row_number` rule | Present | Present (same) |
| "Include only fields that should change" | Present | Present (same) |

---

#### Prompt Characteristics

- **Static or dynamic?** **Dynamic** — generated on every mode switch via `generateImportPrompt()`
- **Generator function:** `src/domain/import/promptGenerator.ts` — single function, no separate Add/Update generators
- **Conditional branches affecting Update mode:**
  - Line 39-48: `groups` only added to JSON structure when `mode === 'Add'`
  - Line 49-51: Item shape differs (`row_number` vs `temp_ref`/`group_id`)
  - Line 62-63: Two Update-specific rules added to `rules` array
  - Line 64-71: Six Add-specific group rules only included when `mode === 'Add'`
  - Line 76: Intro text changes from "import" to "update"
  - Line 84: Key list includes/excludes `temp_ref, group_id`

---

#### Does Update mode instruct AI to:

- **Match existing rows?** Yes — `row_number` rule: "row_number refers to the current visible table row numbering starting at 1"
- **Avoid duplicates?** Not explicitly — no rule about avoiding duplicate rows
- **Modify vs append?** Implicitly — by requiring `row_number` and saying "Include only fields that should change"
- **Identifier rules?** Uses `row_number` only (no name, SKU, or index-based matching)

---

### 12.6 Key Files & Functions

| File | Function/Component | Role in Update Flow |
|---|---|---|
| `src/components/items/JsonItemsImportSheet.tsx` | `JsonItemsImportSheet` | Main UI shell — mode tabs, state, submit handler |
| `src/components/items/JsonItemsImportSheet.tsx` | `MODE_COPY` | UI copy/description for each mode |
| `src/components/items/JsonItemsImportSheet.tsx` | `handleApply` | Orchestrates parse → normalize → validate → resolve → apply |
| `src/domain/import/promptGenerator.ts` | `generateImportPrompt` | Builds mode-specific AI prompts |
| `src/domain/import/schema.ts` | `buildImportSchema(mode)` | Zod schema — enforces `row_number` in Update mode |
| `src/domain/import/parse.ts` | `parseImportText(text, mode)` | JSON parse + Zod validation |
| `src/domain/import/normalize.ts` | `normalizeImportData(input, mode)` | Normalizes fields, strips empty values in Update |
| `src/domain/import/validate.ts` | `validateImportData(mode, normalized, existingItems)` | Validates `row_number` existence, range, uniqueness |
| `src/domain/import/resolve.ts` | `resolveImportColumns(...)` | Maps unknown columns (same for both modes) |
| `src/domain/import/apply.ts` | `buildApplyResult(...)` | Merges imported fields onto existing items by row_number |
| `src/domain/import/apply.ts` | `assignResolvedFields(item, source, exemptSet)` | Applies field values to a single item |
| `src/domain/import/overwrite.ts` | `detectOverwriteTargets(resolved, existingItems)` | Detects fields being overwritten (Update only) |
| `src/domain/import/utils.ts` | `getStandardRowEntries(items)` | Builds 1-based row index excluding group headers |
| `src/domain/import/types.ts` | `ImportMode`, `OverwriteTarget`, `BuildApplyResultOptions` | Type definitions |
| `src/domain/import/tableState.ts` | `hasMeaningfulStandardRows(items)` | Gates Update tab availability |
| `src/domain/invoice/importAdapter.ts` | `invoiceImportAdapter` | Invoice-specific adapter (prompts, applyResult) |
| `src/domain/quotation/importAdapter.ts` | `quotationImportAdapter` | Quotation-specific adapter (prompts, applyResult) |
| `src/components/import/JsonImportLayout.tsx` | `JsonImportLayout` | Sheet wrapper — prompt copy, textarea, tutorial |

---

### 12.7 Edge Cases (Observed from Code)

1. **Empty dataset behavior:**
   - Update tab is disabled when `hasMeaningfulStandardRows(items)` returns false (line 72)
   - If no standard rows exist, validation returns: "Update is only available after the table has at least one real item row." (validate.ts:57-59)

2. **Invalid JSON behavior:**
   - `JSON.parse()` failure returns `{ ok: false, error: { stage: 'parse', message: 'Invalid JSON.' } }` (parse.ts:26-29)
   - Zod validation failure returns first Zod issue message (parse.ts:36-38)

3. **Missing `row_number` behavior:**
   - Zod schema: each item must have `row_number` — fails with "Each update row must include row_number." (schema.ts:24-26)
   - Validate: non-integer or < 1: "Row X must include a valid 1-based row_number." (validate.ts:67-70)

4. **Duplicate `row_number` behavior:**
   - Validation fails: "Duplicate row_number X is not allowed in Update mode." (validate.ts:74-78)

5. **Out-of-range `row_number` behavior:**
   - Validation fails: "row_number X does not match an existing row." (validate.ts:81-85)

6. **Empty text fields in Update:**
   - Normalize strips empty `description`, `sub_description`, `unit`, `make` in Update mode (lines 96, 103, 117)
   - This means sending `{ "row_number": 1, "description": "" }` will NOT clear the description — the empty value is discarded

7. **Empty extra/custom fields in Update:**
   - Normalize strips empty/undefined extra fields (line 136)
   - Custom fields cannot be cleared to empty string via import

8. **Top-level fields in Update:**
   - Empty `title`, `po_number`, `notes`, `terms` are set to `undefined` (lines 183-186)
   - This means sending `{ "items": [...], "title": "" }` will NOT update the title — it remains unchanged

9. **Overwrite detection:**
   - `detectOverwriteTargets()` runs only in Update mode (apply.ts:51)
   - Builds list of `{ id, rowNumber, columnKey, columnLabel, currentValue, nextValue }` for fields that have existing content
   - This data is returned in `ApplyImportResult.overwriteTargets` but no confirmation UI is currently wired in the import sheet

10. **Silent skip on missing row:**
    - In `buildApplyResult`, if `row_number` doesn't match any standard row entry, the item is silently skipped (apply.ts:177)
    - However, validation should catch this before reaching apply

11. **Groups in Update mode:**
    - The normalize function still parses `groups` from input (normalize.ts:164-177)
    - The validation function returns groups in the result (validate.ts:99)
    - The resolve function returns groups (resolve.ts:117)
    - But `buildApplyResult` in Update mode returns `existingGroups` unchanged (apply.ts:192) — imported groups are ignored

12. **exemptOverwriteIds:**
    - `buildApplyResult` accepts `exemptOverwriteIds` parameter (types.ts:147)
    - These IDs skip field assignment via `assignResolvedFields`
    - Not currently passed from `JsonItemsImportSheet` (always empty array default)
    - The overwrite detection computes `id` as `"${row_number}:${columnKey}"` format

13. **Max import size:**
    - `MAX_IMPORT_BYTES = 200,000` bytes (utils.ts:3)
    - `MAX_IMPORTED_ROWS = 200` rows (utils.ts:4)
    - Applies to both Add and Update modes equally

14. **Tab reset on close:**
    - When modal closes, mode resets to 'Add', pastedText clears, error clears (lines 76-80)

15. **Mode auto-switch:**
    - If `updateEnabled` is false and mode is 'Update', auto-switches to 'Add' (line 82)
    - This can trigger during a session if items are deleted externally
