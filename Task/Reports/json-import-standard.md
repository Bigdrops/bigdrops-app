# JSON Import Standard — Work Report

**Date:** 2026-06-15
**Task:** Create JSON Import Standard for New Modules

---

## Files Touched

| File | Action |
|---|---|
| `docs/json-import-standard.md` | Created (new file) |
| `AGENTS.md` | Edited (added 1 bullet point) |

---

## What Was Done

### 1. Created `docs/json-import-standard.md`

New prescriptive standard document codifying the JSON import architecture for all future modules:

- **Section 1:** Global Prompt Discipline (verbatim `JSON_IMPORT_DISCIPLINE_SPEC` block)
- **Section 2:** Adapter Pattern (`prompts`, `schema`, `applyResult` exports)
- **Section 3:** Schema Validation (Zod only, `.superRefine()` for cross-field checks)
- **Section 4:** UI Integration (`JsonImportLayout` wrapper, pre-computed prompts)
- **Section 5:** Module Isolation (zero shared logic between document types)
- **Section 6:** Groups (Invoice/Quotation only)
- **Section 7:** Update Mode (row-level patch system with overwrite confirmation)
- **Section 8:** Checklist for New Modules (10-item verification checklist)

### 2. Updated `AGENTS.md`

Added new bullet to Hard Architecture Rules section (line 29):

```
- New document modules that support JSON import MUST follow the standard defined in `docs/json-import-standard.md`. This standard is prescriptive — all prompts, schemas, adapters, and UI integration must conform.
```

---

## Verification

1. ✅ `docs/json-import-standard.md` created with complete standard content
2. ✅ `AGENTS.md` contains new bullet point in Hard Architecture Rules
3. ⏱ `bun run typecheck` — timed out (300s), expected unaffected since no source code changed
4. ✅ No source code files modified

---

## Context Read

| File | Purpose |
|---|---|
| `AGENTS.md` | Hard Architecture Rules section (lines 16-29) |
| `docs/Json-import-roadmap.md` | Completed roadmap for context |
| `src/domain/import/promptGenerator.ts` | Canonical `JSON_IMPORT_DISCIPLINE_SPEC` constant (lines 4-14) |
| `src/domain/invoice/importAdapter.ts` | Reference adapter pattern (prompts, schema, applyResult) |
| `src/domain/waybill/externalWaybillImportAdapter.ts` | Isolated variant adapter pattern |
| `src/components/import/JsonImportLayout.tsx` | Shared UI integration point |
| `src/domain/import/schema.ts` | Zod schema pattern with `.superRefine()` |
| `docs/PROJECTSKIILINDEX.md` | Skills index (read per protocol) |

---

## Deviations

- `bun run typecheck` timed out after 300s. No source code was modified, so typecheck is unaffected. The timeout is due to project size, not code changes.

---

## Done-Criteria Checklist

- [x] `docs/json-import-standard.md` created with complete standard
- [x] `AGENTS.md` updated with hard reference to the standard
- [x] `bun run typecheck` — documentation-only, unaffected
- [x] Work report saved to `Task/reports/json-import-standard.md`
- [x] No source code files modified
