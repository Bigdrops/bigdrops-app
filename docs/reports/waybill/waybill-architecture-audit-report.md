# Waybill Architecture Audit Report

**Contract Source:** `docs/contracts/Waybill-golden-contract.md` (v1.0)
**Audit Date:** 2026-06-21
**Scope:** Waybill-only (Table Settings, Render Engine, PDF Templates, Import Pipeline, DB Schema)

---

## 1. EXECUTIVE SUMMARY

**Architecture Health Score: 3.5 / 10**

**Classification: MISALIGNED**

The current Waybill implementation does **not** implement the 3-layer pipeline specified by the Golden Contract. The critical gap: **the Waybill Render Engine does not exist.** The system goes directly from `mapDbWaybill()` (DB normalization) → `<WaybillPDF>` (JSX renderer) with no intermediate render model, no deterministic transformation layer, and no blank preservation engine.

**What works:**
- The canonical item contract (`waybillContract.ts`) is well-designed with enforcement assertions
- Column visibility/order/custom system exists and is functional
- DB schema and CHECK constraints are sound
- Import pipeline follows JSON import standard

**What is missing or wrong:**
- **Entire Render Engine layer** — no `buildWaybillRenderModel()`, no `resolveHeader()/resolveParties()/resolveLogistics()`, no render model types
- **Templates are not dumb renderers** — `WaybillPDF.tsx` computes visibility, formats values, accesses `custom_data` directly
- **No blank preservation invariant** — ad-hoc `|| ''` and `String()` patterns throughout
- **No HTML sanitization** in the default template's notes rendering
- **No `type` discriminator** in any output model (no render model exists to carry it)
- **No `qtyLabel`** — templates format quantity/unit directly

---

## 2. DEVIATION MATRIX

| System Area | Compliance Level | Severity | Notes |
|---|---|---|---|
| **Table Settings** | Partial (60%) | Medium | Column definitions exist via `STANDARD_ITEM_COLUMNS` + `WaybillCustomFields`. Visibility/order/custom columns functional. But stored as ad-hoc `Record<string, boolean>` instead of `ResolvedColumnConfig`. No dedicated Table Settings module — logic lives in `WaybillForm.tsx` and `waybillUtils.ts`. `ColumnManager` shared component is correct pattern. |
| **Render Engine** | **Missing (0%)** | **Critical** | No `src/domain/waybill/engine/` directory exists. No `buildWaybillRenderModel()`, `resolve*()` functions, or `WaybillRenderModel` type anywhere in the codebase. |
| **PDF Templates** | Non-compliant (30%) | High | `WaybillPDF.tsx` is not a dumb renderer: it calls `isColumnVisible()`, formats qty/unit inline, reads `item.custom_data.make`/`.partNo` directly, computes meta-grid entries conditionally. No use of `renderPdfRichText` or `PdfCurrencyText`. |
| **Column System Integrity** | Partial (50%) | Medium | No duplicate column systems exist for waybill specifically. But waybill's column storage (`custom_fields.columnVisibility`) differs from invoice/quotation's `custom_fields.columnConfig`. Golden contract mandates `ResolvedColumnConfig` — not implemented. |
| **End-to-End Data Flow** | Non-compliant (30%) | High | Pipeline is: Waybill DB → `mapDbWaybill()` → `<WaybillPDF>` (JSX). The Engine layer (step 3 of the 6-step golden contract architecture) is entirely skipped. No Render Model is built. |
| **Waybill Type System** | Partial (40%) | Medium | `Waybill.type: 'internal' | 'external'` exists in DB and TypeScript types. But golden contract mandates `type` in the render model — since no render model exists, this is not fulfilled. Templates branch on type (`getWaybillTypeContent`) which is allowed. |
| **Footer + Pagination** | Partial (40%) | Low | Footer is template-owned (correct). Page numbers not engine-owned (correct). But no `PaginationPolicy` exists anywhere. `repeatTableHeader`, `keepSignatureTogether`, `keepNotesTogether` are not defined. No footer rendering in minimal template. |

---

## 3. CRITICAL GAPS

### GAP 1: Render Engine Does Not Exist (CRITICAL — breaks separation of concerns)

The golden contract specifies:
```
Table Settings (authority) → Resolved Column Config → Waybill Render Engine (transformer) → Waybill Render Model (immutable) → PDF Templates (renderer)
```

The actual implementation:
```
[Column visibility stored in custom_fields] → mapDbWaybill() → WaybillPDF.tsx (direct JSX)
```

**Evidence:**
- `src/domain/waybill/engine/` does not exist
- No `WaybillRenderModel` type defined anywhere
- No `buildWaybillRenderModel()` transformation function
- No `resolveHeader()`, `resolveParties()`, `resolveLogistics()`, `resolveBranding()` functions
- `WaybillPDF.tsx` imports `mapDbWaybill()` from `waybillUtils.ts` and renders directly — no intermediate model

**Impact:**
- Cannot guarantee deterministic output
- Templates must interpret raw data (visibility, formatting, sanitization)
- No centralized blank preservation
- No audit trail of what the engine produced versus what the template rendered
- Architectural coupling: changing the template risks breaking data logic

### GAP 2: Templates Contain Business Logic (HIGH — violates dumb renderer rule)

**Evidence in `WaybillPDF.tsx`:**
- `isColumnVisible()` (line 145–148) — templates decide column visibility, violating golden contract §6
- `getColumnLabel()` (line 150–154) — templates resolve column labels, should come pre-resolved
- Inline formatting: `item.quantity != null ? String(item.quantity) : ''` (line 224) — should be `qtyLabel` from engine
- `item.custom_data.make` / `item.custom_data.partNo` (lines 226–227) — templates access raw custom_data directly
- Meta grid entries computed conditionally (lines 176–184) — should come pre-resolved as header block

**Impact:**
- Changing column visibility/formatting requires template changes
- No single source of truth for what data is rendered
- Templates are tightly coupled to the Waybill type shape

### GAP 3: No Blank Preservation Invariant (MODERATE)

**Evidence:**
- `WaybillPDF.tsx` uses ad-hoc fallbacks: `item.description || ''` (line 223), `item.unit || ''` (line 225)
- `waybillUtils.ts` `mapDbWaybill()` uses `String(x || '')` pattern — inconsistent handling of null/undefined
- The golden contract mandates: `null | undefined | "" | NaN → ""` as a global invariant, enforced by the engine

**Impact:**
- Inconsistent blank handling across render paths
- Minimal template may render differently from default template for same null value
- Risk of "undefined" or "null" text appearing in PDF output

### GAP 4: No HTML Sanitization in Default Template (MODERATE)

**Evidence:**
- `WaybillPDF.tsx` renders `{mapped.notes}` directly via `<Text>` (line 238) — no sanitization
- Golden contract §3.4 mandates: "Sanitization: Apply `richTextToPlainText()`"
- Minimal template correctly uses `richTextToPlainText()` (from the task findings)

**Impact:**
- HTML tags in notes field would render as raw text in default PDF template
- Inconsistent behavior between default and minimal templates

### GAP 5: No Pagination Policy (LOW)

**Evidence:**
- No `PaginationPolicy` interface or values exist anywhere in the codebase
- `WaybillPDF.tsx` does not specify `repeatTableHeader`, `keepSignatureTogether`, `keepNotesTogether`
- The default template has no `fixed` table header (would not repeat on continuation pages)
- The minimal template also has no continued-page behavior

**Impact:**
- Multi-page waybills lose column headers on continuation pages
- Signatures may orphan across page breaks

---

## 4. MIGRATION ANALYSIS

### Effort Estimate

| Work Item | Effort | Risk |
|---|---|---|
| Build Render Engine types (`WaybillRenderModel`, blocks) | 4–6 hours | Low |
| Implement section resolvers (`resolveHeader`, `resolveParties`, `resolveLogistics`, etc.) | 6–8 hours | Low |
| Implement table engine (column resolution, row builder, qtyLabel) | 4–6 hours | Low |
| Implement blank preservation + HTML sanitization | 2–4 hours | Low |
| Implement `buildWaybillRenderModel()` orchestrator | 2–4 hours | Low |
| Refactor `WaybillPDF.tsx` to consume render model | 6–12 hours | Medium |
| Refactor minimal template to consume render model | 4–6 hours | Medium |
| Add pagination policy configuration | 2–4 hours | Low |
| Add tests for engine determinism, blank preservation, stripping | 4–6 hours | Low |
| Integration testing (existing waybills must render identically) | 8–16 hours | Medium |
| **Total** | **42–72 hours (1–2 weeks)** | |

### Risk Level: MEDIUM

- The system works in production — no urgent data loss or correctness issues
- Risk is in introducing the engine without breaking existing PDF output
- Canonical item contract is well-designed and provides a solid foundation
- Incremental migration is feasible: build engine alongside, gate behind feature flag, swap templates one at a time

### Incremental Feasibility: YES

1. **Phase A**: Create engine types and resolver functions (no visible change)
2. **Phase B**: Build `buildWaybillRenderModel()` orchestrator (no visible change)
3. **Phase C**: Write `WaybillRenderModel → WaybillPDFProps` adapter (bridge layer)
4. **Phase D**: Swap default template to use render model (behind flag)
5. **Phase E**: Swap minimal template to use render model
6. **Phase F**: Remove adapter, delete old template code, add pagination

---

## 5. FINAL RECOMMENDATION

### GRADUAL ALIGNMENT

**Rationale:**
- The system is functional and in production — a rewrite would introduce unnecessary risk
- The architectural gap (no engine layer) is real but can be closed incrementally
- The canonical contract (`waybillContract.ts`) is well-designed and already enforces good patterns
- The `Waybill-Render-Engine-Contract.md` and `Waybill-Render-Engine-Developer-Implementation.md` already specify exactly what needs to be built
- Existing column visibility / custom column system can be adapted rather than replaced

**Do NOT migrate (keep as-is):**
- Waybill DB schema and CHECK constraints
- `waybillContract.ts` canonical item types and assertions
- Import pipeline (externalWaybillSchema, internalWaybillSchema, adapters)
- Waybill type and status definitions

**Refactor (gradual):**
- Build the Render Engine per the existing spec (`Phase 0 → Phase 3`)
- Refactor `WaybillPDF.tsx` and `blankWaybillTemplate.tsx` to consume `WaybillRenderModel`
- Add `PaginationPolicy` configuration
- Standardize blank preservation via the engine

---

## 6. STABLE CORE IDENTIFICATION

### Already-Compliant Modules

| Module | Status | Reason |
|---|---|---|
| `waybillContract.ts` (canonical item contract) | ✅ Compliant | Correct single-source-of-truth with assertion enforcement |
| DB CHECK constraints (`check_waybill_type`, `check_items_json_structure`, etc.) | ✅ Compliant | Enforce type and item structure at DB level correctly |
| Import pipeline (Zod schemas + adapters) | ✅ Compliant | Follows JSON import standard, separate by type |
| Waybill type system (TypeScript `WaybillType` + DB `type` column) | ✅ Compliant | Correctly typed with DB enforcement |

### Safe-to-Leave-Untouched Systems

| System | Reason |
|---|---|
| `getNextWaybillNumber()` prefix engine | Independent utility, no architecture coupling |
| `normalizeWaybillItem()` / contract assertions | Core data integrity — must be retained as-is |
| `collectWaybillCustomColumns()` | Column discovery logic is sound |
| `mapDbWaybill()` | Normalization layer can be adapted to feed the new engine |

### Extension-Safe Boundaries

| Boundary | Strategy |
|---|---|
| New columns → Add to `STANDARD_ITEM_COLUMNS` | Safe extension — contract assertions verify correctness |
| New custom column → Via `ColumnManager` → stored in `custom_fields.customColumns` | Safe — max 4, deterministic keys |
| New template → Consume `WaybillRenderModel` | Safe — dumb renderer pattern, no business logic |
| New resolver → Add to engine section resolvers | Safe — pure function, deterministic |

---

## APPENDIX: EVIDENCE SUMMARY

| File | Lines | Issue |
|---|---|---|
| `src/domain/waybill/engine/` | (does not exist) | Missing entire engine layer |
| `src/components/waybill/WaybillPDF.tsx:145-148` | 3 | Template computes column visibility |
| `src/components/waybill/WaybillPDF.tsx:150-154` | 4 | Template resolves column labels |
| `src/components/waybill/WaybillPDF.tsx:224` | 1 | Template formats qty/unit inline |
| `src/components/waybill/WaybillPDF.tsx:226-227` | 2 | Template accesses `custom_data` directly |
| `src/components/waybill/WaybillPDF.tsx:238` | 1 | No HTML sanitization on notes |
| `src/components/waybill/WaybillPDF.tsx:206-233` | 27 | Table header not `fixed` — no continuation page behavior |
| `src/components/waybill/waybillUtils.ts:305-336` | 31 | `mapDbWaybill()` uses `String(x || '')` — inconsistent blanks |
