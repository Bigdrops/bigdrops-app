# Phase 1.5 — Engine Foundation Audit & Resolver Tests

**Date:** 2026-07-08
**Prompt:** `docs/Prompts/prompt6i5.md`
**Status:** Complete — bug fixed, tests created, conventions documented.

---

## Audit Findings

### File-by-file compliance

| File | Verdict | Notes |
|------|---------|-------|
| `types.ts` | ✅ PASS | Pure types, no side effects, extensible via declaration merging |
| `resolver.ts` | 🔴 FIXED | Bug found and corrected (see below) |
| `hooks.ts` | ✅ PASS | Clean separation of storage from resolution; fixed to pass templateDefaults |
| `fontRegistry.ts` | ✅ PASS | Wraps existing `registerPdfFonts()` / `registerPdfFillableFonts()` without deleting them |
| `PdfCustomizationPanel.tsx` | ✅ PASS | Capability-driven, policy-aware, no hardcoded document-type logic |

### Bug Found & Fixed: templateDefaults not threaded through resolveSettings

**Severity:** Critical — would cause all disabled capabilities to fall back to hardcoded `FALLBACK_TEMPLATE_DEFAULTS` instead of template-specific defaults.

**Root cause:** `resolveSettings()` accepted `PdfTemplateDefaults` but never received it from callers. It used `FALLBACK_TEMPLATE_DEFAULTS` as the fallback. Meanwhile `resolvePdfCustomization()` accepted `templateDefaults` but never used it in the mapping.

**Fix applied:**
1. `resolver.ts`: Added optional `templateDefaults` parameter to `resolveSettings()`. Fallback chain is now `templateDefaults ?? FALLBACK_TEMPLATE_DEFAULTS`.
2. `resolver.ts`: Updated `resolveFull()` to pass `defaults` through to `resolveSettings()`.
3. `hooks.ts`: Updated `useMemo` call to pass `templateDefaults` to `resolveSettings()`.

**Impact:** Disabled capabilities now correctly fall back to the template's own defaults, not the engine-wide fallback.

---

## localStorage Naming Convention

### Current implementation
```
bigdrops_pdf_customization_{documentFamily}
```
Examples: `bigdrops_pdf_customization_invoice`, `bigdrops_pdf_customization_waybill`

### PRD convention (from `pdf-customization-extension-system.md`)
```
pdf_customization_{category}
```
- `pdf_customization_commercial` — Invoice, Quotation
- `pdf_customization_logistics` — Waybill, CSR
- `pdf_customization_receipt` — Receipt

### Existing codebase pattern (`pdfDesignPreset.ts`)
```
{documentType}_pdf_design_preset
```
Examples: `invoice_pdf_design_preset`, `waybill_pdf_design_preset`

### Recommendation for Phase 2
Adopt the PRD's category-based convention (`pdf_customization_commercial`, `pdf_customization_logistics`, `pdf_customization_receipt`). This groups documents that share visual defaults under one storage key, reducing localStorage sprawl. The hook's `PdfCustomizationDocumentFamily` type should be updated to accept category identifiers instead of per-document types. **Do not change yet** — this is a Phase 2 decision.

---

## Resolver Unit Tests

Created `src/tests/critical/pdfCustomizationResolver.test.ts` with 9 test scenarios:

| # | Scenario | Result |
|---|----------|--------|
| 1 | Template defaults only → resolved matches defaults | ✅ |
| 2 | Enabled capability + user override → user value wins | ✅ |
| 3 | Disabled capability + user setting → setting ignored, template default used | ✅ |
| 4 | Policy disables capability → user setting ignored | ✅ |
| 5 | Missing version in saved settings → migration path applied | ✅ |
| 6 | Null saved settings → template defaults used | ✅ |
| 7 | Partial saved settings → defaults fill gaps | ✅ |
| 8 | All capabilities disabled → all user settings stripped | ✅ |
| 9 | Determinism — same input produces identical output | ✅ |

All tests call `resolveSettings()` + `resolvePdfCustomization()` directly — no React, no hooks, no storage.

---

## Verification Gate

- **`bun run typecheck`:** PASSED (only pre-existing `native-feedback-renderer.tsx` errors)
- **`git status`:** Clean — 1 new file (`pdfCustomizationResolver.test.ts`), 2 modified files (`resolver.ts`, `hooks.ts` — bug fix). No existing pipeline files touched.

---

## Corrections Made

| File | Change |
|------|--------|
| `src/domain/pdf/customization/resolver.ts` | Added `templateDefaults` parameter to `resolveSettings()`; updated `resolveFull()` to pass it through |
| `src/domain/pdf/customization/hooks.ts` | Updated `resolveSettings()` call to include `templateDefaults` in arguments and deps array |
| `src/tests/critical/pdfCustomizationResolver.test.ts` | New file — 9 test scenarios |

---

## Deferred Work

- Phase 2: localStorage key convention update (category-based per PRD)
- Phase 2: Document family adoption
- Phase 2: Rendering pipeline integration
