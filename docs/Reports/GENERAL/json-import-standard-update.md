# JSON Import Standard Update Report

**Date:** 2026-06-19
**File:** `docs/STANDARD/json-import-standard.md`
**Version:** 1.0 → 1.1
**Scope:** Correct column auto-creation specification based on forensic pipeline inspection

---

## Changes Made

### 1. Section 1 — `custom_fields` Handling (lines 34-41)

Added a new `### custom_fields Handling` subsection to clarify:
- AI MUST place extra fields inside `"custom_fields": { key: value }`
- `custom_fields` presence does NOT create columns — only the import pipeline does

### 2. Section 8 — Schema Freeze Rule (lines 124-130) [NEW]

Added after Section 7 (Update Mode):
- Column schema is fully frozen after import
- No runtime process (render, edit, PDF, UI) may infer or modify schema
- Only user-driven actions (Table Settings or Import) may modify columns

### 3. Section 9 — Checklist for New Modules (lines 134-152) [Renumbered]

Updated with 5 new pipeline-enforcement items:
- Import pipeline (NOT prompt) is the only mechanism that creates columns
- `normalize.ts` extracts unknown keys into column candidates
- `resolve.ts` enforces 10-column limit deterministically
- `apply.ts` writes final columns via `setColumns()` only
- Schema remains frozen after import completion

### 4. Section 10 — Custom Column Auto-Creation (lines 156-201) [NEW]

Added comprehensive documentation covering:
- **Trigger conditions** — keys outside `BASE_FIELDS` or inside `custom_fields`
- **Pipeline sequence** — normalize.ts → resolve.ts → apply.ts
- **Column defaults** — visible: true, removable: true, includeInTotal: false
- **Constraints** — max 10 per import, duplicate key suffixing, no render/edit mutation
- **Determinism Rule** — identical input JSON must always produce identical column output

---

## Architecture Invariant

```
JSON → normalize.ts → resolve.ts → apply.ts → setColumns() → Schema Frozen
  │         │               │            │
  │    extract unknown   decide &     write final   no further mutation
  │    keys & candidates create cols  col array
  │
 Prompt output (AI) — data extraction only, NO schema creation
```

## Files Modified

- `docs/STANDARD/json-import-standard.md` — all changes applied

## Verification

- [x] Section 9 added and consistent with runtime pipeline
- [x] Prompt discipline updated correctly (`custom_fields` handling)
- [x] Schema freeze rule explicitly defined
- [x] Checklist enforces deterministic pipeline behavior
- [x] No runtime behavior changed
- [x] No Invoice or Waybill code modified
- [x] No prompt-driven schema inference introduced
