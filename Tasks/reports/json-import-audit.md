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

## 8. Item Library

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

## 9. Modules with NO JSON Import

| Module | Evidence |
|---|---|
| **BOQ** | Zero import-related files found. No import adapter, no import sheet. The only BOQ JSON interaction is via Compliance Hub's `wht_receipt` contract which references BOQ fields. |
| **Reports** | Zero import-related files found. No grep matches for "import" combining with "report". |
| **Project / Document** | Zero import files. Grep for "import" in `src/domain/project/` and `src/domain/document/` returned zero matches. |
| **Payments** | No import adapter or import sheet. `RecordPaymentModal.tsx` exists but is a manual entry form, not an import mechanism. |

---

## 10. Summary Matrix

| Module | Prompt Source | Parser | Validation | Bulk/ Single | Uses Shared Pipeline? |
|---|---|---|---|---|---|
| Invoice | Shared `generateImportPrompt()` | Shared `parser.ts` | Shared Zod `schema.ts` | Bulk | **Yes** |
| Quotation | Shared `generateImportPrompt()` | Shared `parser.ts` | Shared Zod `schema.ts` | Bulk | **Yes** |
| RFQ | Hardcoded inline | Inline `parseJson()` | Inline checks | Bulk | **No** |
| CSR | Hardcoded constant (`CSR_IMPORT_PROMPT`) | Inline `parseCsvImport()` | Inline checks | Single | **No** |
| Waybill | Hardcoded inline | Shared `parser.ts` | Shared Zod `schema.ts` | Bulk | Partial (parser only) |
| Compliance Hub | Hardcoded per contract (3 prompts) | Per-contract custom | Per-contract Zod | Bulk | **No** |
| Item Library | N/A (no prompt) | Inline function | Inline checks | Bulk | **No** |
| BOQ | — | — | — | — | N/A (no import) |
| Reports | — | — | — | — | N/A (no import) |
| Project | — | — | — | — | N/A (no import) |

---

## 11. Cross-Cutting Observations

1. **3 out of 7 import-capable modules** (Invoice, Quotation, partial Waybill) use the shared `parser.ts` and `schema.ts`. The other 4 (RFQ, CSR, Compliance Hub, Item Library) have bespoke implementations.
2. **Only 2 modules** (Invoice, Quotation) use the shared `promptGenerator.ts`. All others hardcode prompts inline.
3. The shared pipeline (`promptGenerator.ts`) is designed for dynamic `columns` → schema prompts, but no module besides Invoice/Quotation actually has a dynamic column set to pass.
4. **Validation inconsistency**: Invoice/Quotation/Waybill use Zod through shared schema. RFQ/CSR/Item Library use manual checks. Compliance Hub uses its own Zod schemas per contract.
5. The **"Open in AI"** feature exclusively opens Gemini, despite the underlying `openInAI.ts` supporting ChatGPT and Claude.
6. CSV support exists alongside JSON in the **CSR** module (file upload + paste). All other modules are JSON-paste-only.
