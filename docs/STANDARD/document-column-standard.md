# Document Column Standard — BIGDROPS

> **Version:** 1.0  
> **Last Updated:** 2026-07-02  
> **Scope:** All business document modules with user-configurable column ordering (Invoice, Quotation).

---

## 1. Purpose

This standard defines the canonical architecture for user-configurable column ordering across all BIGDROPS financial document types. It covers column definition, persistence, initialization, live-editing drag operations, mobile rendering, and the rules modules must follow when adopting columns.

This standard is prescriptive — all current and future document modules with column support must conform.

---

## 2. Covered Modules

| Module | Column System | Canonical Source |
|---|---|---|
| Invoice | `useInvoiceColumns` hook | `src/domain/invoice/columns.ts` |
| Quotation | `useInvoiceColumns` hook (same module) | Inherits from Invoice domain |
| Waybill | Separate inline state (`columnOrder` + `customColumns`) | NOT covered by this standard |

Waybill has an independent column implementation and is excluded from this standard. Future modules that wish to adopt configurable columns MUST use the Invoice column system pattern.

---

## 3. Core Principles

1. **Description is always first.** The `description` column is locked at index 0 in every context — form, PDF, view, mobile. No drag, code, or user action may move it from that position.

2. **hide_full removes from all contexts.** A column with `visibilityMode: 'hide_full'` is excluded from form rendering, PDF output, and view mode. It is functionally deleted from runtime (but preserved in DB for restore).

3. **hide_display hides from PDF/view only.** A column with `visibilityMode: 'hide_display'` remains editable in the form but is excluded from PDF and view rendering.

4. **Custom columns append to canonical order.** Custom columns (`custom_*` keys) are appended after all built-in columns. They can be reordered among themselves but not interleaved between built-in columns by default (drag may rearrange them freely, as the hook supports drag for all non-description columns regardless of key prefix).

5. **Custom columns default to `removable: true`.** Users may delete custom columns via `toggleDisabled` (which removes `custom_*` columns) or `removeCustomColumn`.

6. **Column schema freezes after import.** No runtime process (render, edit, PDF) may modify column schema after import completes. Only user-driven actions (Table Settings, drag, toggle, or subsequent Import) may change columns.

---

## 4. Column Ordering Contract

### 4.1 Canonical Order

The default column order is defined in `DEFAULT_COLUMN_ORDER` (`src/domain/invoice/columns.ts:11-21`):

```typescript
['description', 'quantity', 'make', 'unit', 'unit_price',
 'amount', 'install_rate', 'vat_rate', 'discount_rate']
```

### 4.2 Rules

- `description` MUST always be at index 0 in the resolved order.
- No duplicate keys are permitted in the final resolved array.
- Unknown/saved keys that are not in `BUILTIN_COLUMNS` are preserved as-is (for forward compatibility).
- Custom columns (`custom_*`) are appended after all built-in columns have been placed.

### 4.3 `BUILTIN_COLUMNS` Definition

Nine built-in columns exist (`src/domain/invoice/columns.ts:23-33`):

| key | Default Visibility | Removable |
|---|---|---|
| `description` | always visible | no |
| `quantity` | show | no |
| `make` | show | no |
| `unit` | show | no |
| `unit_price` | show | no |
| `amount` | show | no |
| `install_rate` | hide_display | no |
| `vat_rate` | hide_display | no |
| `discount_rate` | hide_display | no |

---

## 5. Runtime Contract

### 5.1 Resolver

`resolveFinancialColumns()` in `src/domain/financial/resolveFinancialColumns.ts` is the **single entry point** for hydrating a column config from saved data:

1. If `saved` is null/empty → returns canonical default order (via `BUILTIN_COLUMNS` mapped through `normalizeColumnConfig`).
2. If `saved` has content → runs `ensureColumnOrderIntegrity` to:
   - Ensure description is first.
   - Deduplicate by key (first occurrence wins).
3. Each saved column is merged over its built-in counterpart (if one exists), preserving user customizations while filling in built-in defaults.
4. Any built-in column missing from saved data is appended at the end with its default config.
5. Description is always placed at index 0 after assembly.

### 5.2 Integrity Enforcer

`ensureColumnOrderIntegrity()` (`resolveFinancialColumns.ts:13-39`):

- Returns `getResetColumnConfigs()` if input is empty.
- Moves `description` to index 0 if found.
- Deduplicates: first occurrence of each key wins.

### 5.3 Reset

`getResetColumnConfigs()` (`columns.ts:35-42`) always returns the canonical `DEFAULT_COLUMN_ORDER` array with `normalizeColumnConfig` applied.

### 5.4 Visibility Resolution

`resolveColumnBehavior()` (`columns.ts:117-134`) determines which columns are active in a given context:

- `description` is always visible (enforced by `ALWAYS_VISIBLE_COLUMN_KEYS`).
- `hide_full` columns are excluded from all contexts.
- `hide_display` columns are excluded from `pdf` and `view` contexts.
- In `form` context, all non-hidden columns are active.
- In `pdf` context, columns with no visible values across any item may be auto-hidden (except those in `NEVER_AUTO_HIDE_COLUMN_KEYS`: `description`, `quantity`, `unit_price`).

---

## 6. Initialization Contract

### 6.1 Edit Mode (EditInvoice)

At `src/pages/EditInvoice.tsx:168`:

```typescript
setColumns(resolveFinancialColumns(parsed.columnConfig as any[]))
```

- `resolveFinancialColumns` is called unconditionally on load.
- If `parsed.columnConfig` is null/empty, the canonical defaults are used.
- If the saved config has stale/removed columns, the resolver handles integrity.

### 6.2 New From Template (NewInvoice)

At `src/pages/NewInvoice.tsx:203-205`:

```typescript
if (initialCustomFields?.columnConfig) {
  setColumns(resolveFinancialColumns(initialCustomFields.columnConfig as any[]))
}
```

- Prefill columns from source document (e.g., quotation conversion) are resolved through the same pipeline.
- If no prefill exists, the hook initializes from `BUILTIN_COLUMNS`.

### 6.3 View Mode (ViewInvoice)

At `src/pages/ViewInvoice.tsx:66-67`:

```typescript
const savedColumns = Array.isArray((customFields as any)?.columnConfig)
  ? (customFields as any).columnConfig
```

- View mode reads `columnConfig` directly from custom_fields.
- No resolver call — view is read-only and trusts the stored data.

---

## 7. Drag Contract

`useInvoiceColumns.moveColumn()` (`src/components/useInvoiceColumns.tsx:146-160`):

- **Guard:** `description` key is locked — attempting to move it returns the array unchanged.
- **Guard:** target index 0 is clamped to 1 (description occupies index 0).
- **Bounds:** target index is clamped to `[0, columns.length)`; out-of-range returns unchanged.
- **No-op:** if the key is already at the target index, the array is returned unchanged.
- All non-description columns (including `custom_*`) may be dragged freely.

---

## 8. Mobile Rendering Contract

`MobileItemCard.tsx` renders custom column cells based on their `.type` field:

- `type: 'number'` → `<NumericInput>` (decimal keyboard)
- `type: 'text'` → standard `<Input>` (text keyboard)
- Missing `type` on custom columns defaults to text.

This contract is shared across Invoice, Quotation, and Waybill — all use `MobileItemCard.tsx` as their single item card component.

---

## 9. PDF Column Contract

`getPdfColumns()` (`columns.ts:145-191`) maps active columns to PDF column definitions:

- A `#` (row number) column is always prepended at index 0.
- Each built-in column has fixed `pdfWidth` and `pdfFlex` values defined inline.
- Custom columns receive default PDF dimensions based on their type (number vs text).
- Columns excluded by `resolveColumnBehavior` (context `'pdf'`) do not appear.

`getPdfCellValue()` (`columns.ts:199-221`) maps item fields to cell values for PDF rendering.

---

## 10. Persistence Contract

Column config is persisted in `Invoice.custom_fields.columnConfig` as a `ColumnConfig[]` JSON array:

```typescript
columnConfig: columns  // at save time (EditInvoice:561, NewInvoice:580)
```

- Only the `ColumnConfig[]` array is saved — not the merged runtime view.
- `resolveFinancialColumns` reconstructs the full runtime view on load.
- Custom columns with `removable: true` persist their config alongside built-in columns.

---

## 11. Adoption Rules for New Modules

A new document module (e.g., Purchase Order, Credit Note) that requires configurable columns MUST:

1. **Import `useInvoiceColumns` hook** — do not create a custom column hook.
2. **Import `resolveFinancialColumns`** from `@/domain/financial/resolveFinancialColumns`.
3. **Call `resolveFinancialColumns(saved.columnConfig)` unconditionally on hydration.**
4. **Persist columns** in `custom_fields.columnConfig` as a `ColumnConfig[]` array.
5. **Use `getPdfColumns` and `getPdfCellValue`** for PDF rendering.
6. **Use `getActiveColumns`** for form rendering (or `resolveColumnBehavior` for context-specific filtering).

Do NOT:
- Create a separate column type definition.
- Reimplement drag, toggle, or visibility logic.
- Store columns in a separate table or different field.
- Create a custom column hook (extend `useInvoiceColumns` instead).

---

## 12. Non-Goals

- This standard does NOT cover Waybill column management (Waybill has a separate system with `columnOrder` + `customColumns` split state).
- This standard does NOT define the JSON import column auto-creation pipeline (see `docs/STANDARD/json-import-standard.md`).
- This standard does NOT cover PDF template-level column overrides.
