# JSON Import Standard — BIGDROPS

> **Version:** 1.0  
> **Last Updated:** 2026-06-15  
> **Scope:** All new document modules that support JSON import of items or header data.

---

## 1. Global Prompt Discipline (Non-Negotiable)

Every AI-bound prompt MUST include the following discipline block verbatim as the preamble:

```
You are a strict JSON data extractor. Follow these rules without exception:

· Return ONLY data explicitly present in the source document.
· Never infer, guess, or fabricate values.
· Missing values MUST be null.
· Do not rename or reorder fields.
· Output MUST be valid JSON only.
· Groups are allowed ONLY if explicitly present in the source document.
· Never create groups from layout, indentation, or spacing.
· Each document type is independent (no cross-domain inference).
· The identifier po_number MUST be null unless the source explicitly labels it as PO/Voucher.
```

After the discipline block, each prompt must define:
- The document type (e.g., "This is an external waybill import").
- The exact JSON shape with field names.
- A clear list of rules (6–10) including null-for-missing, JSON-only, code block, paste-back instruction.
- If the module supports groups (Invoice/Quotation only), explicit anti-inference group rules must be included.
- If the module does NOT support groups, a rule must state: "Do not create groups."

---

## 2. Adapter Pattern

Every import-capable module MUST have a dedicated import adapter file following this pattern:

```
src/domain/<module>/importAdapter.ts
```

If the module has distinct sub-types with different field sets (e.g., External vs Internal Waybill), each sub-type MUST have its own isolated adapter:

```
src/domain/<module>/externalImportAdapter.ts
src/domain/<module>/internalImportAdapter.ts
```

Each adapter MUST export:

### `prompts(columns: ColumnConfig[], mode: ImportMode, currentItemCount?: number): string`
- Returns the full prompt string with discipline preamble, JSON shape, and paste-back instruction.
- For Update mode, includes the valid row_number range (1 → N) dynamically.

### `schema` (Zod schema)
- A standalone Zod schema for the import JSON payload.
- Must be strict: reject invalid types, enforce ranges, use `.superRefine()` for cross-field checks.
- Schema must match the field set of the document variant exactly.

### `applyResult(parsed: T, formState: CurrentState): NextState`
- Merges parsed header fields and items into the current form state.
- Must handle any field name mismatch between parsed JSON and internal state (e.g., `quantity` → `qty`).
- Must return a new state object — never mutate the original.

---

## 3. Schema Validation

- All validation MUST use Zod schemas.
- Manual validation (if/else checks, `typeof` checks) is prohibited.
- Schemas must live in the adapter file or a dedicated `schema.ts` within the module's domain directory.
- For Update mode: `row_number` must be validated as `.int().positive()` with a range check and duplicate detection via `.superRefine()`.

---

## 4. UI Integration

- All import sheets MUST use the shared `src/components/import/JsonImportLayout.tsx` wrapper component.
- Ad-hoc modal or sheet components for import are prohibited.
- The prompt, schema, and apply function must be passed to `JsonImportLayout` via props, not inlined.
- The "Open in AI" dropdown and clipboard paste button are provided by `JsonImportLayout` automatically.
- The calling sheet must pre-compute the prompt (via `useMemo`) and pass it as a prop — never compute the prompt inside the layout component.

---

## 5. Module Isolation

- Each document type is independent. Do not reuse prompt fragments, schemas, or apply logic across different document types.
- If a module has sub-types (e.g., External vs Internal), each must have fully isolated prompts, schemas, and adapters. Zero shared logic between sub-types.

---

## 6. Groups

- Groups are an Invoice and Quotation concern ONLY.
- No other module (Waybill, CSR, RFQ, Compliance Hub, Project Documents) should include group rules in prompts or group handling in apply logic.
- If a module does not support groups, its prompt must explicitly state: "Do not create groups."

---

## 7. Update Mode

Update mode is a row-level patch system. It must:
- Require `row_number` for each item.
- Validate row_number range (1 → standard row count, excluding group headers).
- Reject duplicates and out-of-range values.
- Never support group structural changes. Groups are ignored in Update mode.
- Show an empty-field retention warning: "Fields you leave empty will stay unchanged."
- Require overwrite confirmation when any field would overwrite existing data.
- Use `detectOverwriteTargets()` (from the shared import domain) to build the confirmation list.

---

## 8. Checklist for New Modules

Before a new document module ships with JSON import, verify:

- [ ] Adapter file exists at `src/domain/<module>/importAdapter.ts` (or per-sub-type).
- [ ] Prompt includes the Global Discipline Spec block verbatim.
- [ ] Prompt includes JSON shape, rules, code-block, and paste-back instruction.
- [ ] Prompt does NOT include group rules (unless Invoice/Quotation).
- [ ] Zod schema is strict and matches all fields.
- [ ] `applyResult` handles field name mismatches and returns new state.
- [ ] UI uses `JsonImportLayout` — no inline import logic.
- [ ] Prompt is pre-computed and passed as a prop.
- [ ] Update mode (if applicable) includes row range, overwrite confirmation, and empty-field warning.
- [ ] Clipboard paste and "Open in AI" work automatically via `JsonImportLayout`.
