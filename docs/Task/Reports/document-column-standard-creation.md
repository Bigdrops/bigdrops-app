# Document Column Standard — Creation Report

> **Date:** 2026-07-02  
> **Task:** Create permanent project execution rules in AGENTS.md and canonical Document Column Standard  
> **Type:** Documentation-only — no production code was modified

---

## Deliverables

### 1. `docs/STANDARD/document-column-standard.md` (new)

Canonical standard for user-configurable column ordering across business document modules. Covers:

- **Covered Modules:** Invoice, Quotation. Waybill explicitly excluded (separate system).
- **Core Principles:** Description-locked-first, `hide_full` vs `hide_display` semantics, custom column rules, schema freeze after import.
- **Column Ordering Contract:** `DEFAULT_COLUMN_ORDER` canonical order, deduplication rules, `BUILTIN_COLUMNS` definition.
- **Runtime Contract:** `resolveFinancialColumns()`, `ensureColumnOrderIntegrity()`, `getResetColumnConfigs()`, `resolveColumnBehavior()`.
- **Initialization Contract:** EditInvoice (unconditional resolve with `parsed.columnConfig`), NewInvoice (prefill from source), ViewInvoice (read-only).
- **Drag Contract:** `description` locked at index 0, target clamping, bounds enforcement.
- **Mobile/PDF Rendering:** Custom column type-aware rendering, `getPdfColumns` / `getPdfCellValue`.
- **Persistence Contract:** Columns stored as `ColumnConfig[]` in `custom_fields.columnConfig`.
- **Adoption Rules:** New modules must import `useInvoiceColumns` + `resolveFinancialColumns`, use existing PDF and active-column utilities.

### 2. `AGENTS.md` (updated)

Added three new permanent sections:

- **Section 3 — Project Workflow Rules:** Audit-first, find-skills before new domains, explicit assumptions, minimum code, surgical changes, verify with tests.
- **Section 4 — Documentation Rules:** No root reports, standards in `docs/STANDARD/`, extend-before-create, documentation-only tasks must not modify production code.
- **Section 5 — Architecture Discipline:** PDFs-as-dumb-renderers, quotation reuse, column architecture standard reference, extend-before-abstract, Karpathy discipline.

Also fixed:
- JSON import standard path reference: `docs/json-import-standard.md` → `docs/STANDARD/json-import-standard.md`
- Added document-column-standard reference in Hard Architecture Rules.
- Renumbered sections 3→6 to maintain sequential order.

### 3. No Production Code Modified

Zero changes to `src/` files. All work was restricted to AGENTS.md and `docs/STANDARD/`.

---

## Files Touched

| File | Action | Lines |
|---|---|---|
| `AGENTS.md` | Updated | +3 sections, +2 hard rules, renumbered 3 sections |
| `docs/STANDARD/document-column-standard.md` | Created | ~280 lines |

---

## Verification

- `bun run audit:load` will be run to confirm build integrity
- `bun run typecheck` will be run to confirm no import/type breakage
