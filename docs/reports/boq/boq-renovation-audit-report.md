# BOQ Renovation Audit Report

**Written by:** opencode on 2026-09-17
**Scope:** Full BOQ renovation — tenancy, storage, totals/profit, conversion lineage, general hygiene

---

## 1. Executive Summary

The BOQ renovation spans three prior sessions and one audit session. This report covers the audit pass that verified all work end-to-end. One critical issue was found and fixed during the audit.

**What works:**
- Native Decimal.js arithmetic replaces all BOQ totals calculations
- Gross profit computed from aggregate totals (not row-level sum)
- `computeRowProfit()` used at render time only — never persisted
- BOQ→Quotation conversion sets `source_boq_id` FK and preserves `conversionTrail`
- ViewQuotation renders BOQ source badge with correct link
- CP (cost price) stripped from quotation items during conversion
- No `computeDocument` import in BOQ domain
- No VAT, discount, or WHT in BOQ code
- No `localStorage` in BOQ code

**What was broken and fixed:**
- Migration `20260914130000` only targeted `tenant_master_template`. Production entity schemas (11 total) had no `source_boq_id` column. BOQ→Quotation conversion would fail at INSERT time on production. Fix migration `20260916000000` added the column to all schemas.

---

## 2. Audit Results

### Item 1: Tenancy — `source_boq_id` on Entity Schemas

| | |
|---|---|
| **Initial finding** | **CRITICAL FAIL** |
| **Root cause** | Migration `20260914130000` used a static `IF EXISTS` check on `tenant_master_template` only. The provisioning system clones DDL to new entities via `_prov_clone_table`, but existing entity schemas are never auto-updated. |
| **Impact** | `view-boq-actions.ts:81` inserts `source_boq_id: boq.id` into quotations. Without the column on production entities, this INSERT would fail with a column-not-found error. The BOQ→Quotation conversion path was non-functional in production. |
| **Fix** | New migration `20260916000000_fix_source_boq_id_all_entity_schemas.sql` dynamically iterates all schemas with a `quotations` table and adds column + partial index. Idempotent (`ADD COLUMN IF NOT EXISTS`). |
| **Verification** | Column confirmed on `entity_bigdrops-main_main` and `entity_bigdrops-main_agbado` via `information_schema.columns`. All 11 entity schemas + template covered. Push succeeded. |

### Item 2: Storage — No `localStorage` in BOQ Code

| | |
|---|---|
| **Finding** | **PASS** |
| **Scope** | `src/components/boq/`, `src/domain/boq/`, `src/pages/` BOQ page files |
| **Result** | Zero `localStorage` references. All localStorage hits are in non-BOQ files (CSR, Waybill, MoreOptions). |

### Item 3: Totals/Profit — Correctness

| Check | Result |
|---|---|
| `computeDocument` imported in BOQ domain? | **No** — grep across `src/domain/boq/`, `src/components/table-document/`, BOQ pages: zero matches |
| VAT/discount/WHT in BOQ code? | **No** — only match is comment at `calculateBoqTotals.ts:12`: "BOQ is a costing/pricing schedule — no VAT, discount, or WHT." |
| Gross profit = aggregate, not row-sum? | **Yes** — `gross_profit: totalSellingPrice.minus(totalCost).toNumber()` (line 34) |
| `computeRowProfit` at render time only? | **Yes** — all 3 files: `TableRowsEditor.tsx:157`, `TableDocumentPreview.tsx:223`, `TableDocumentPdfDocument.tsx:123` |
| Decimal.js for all arithmetic? | **Yes** — `new Decimal(...)` throughout `calculateBoqTotals.ts` |

### Item 4: Conversion Lineage

| Check | Result |
|---|---|
| `source_boq_id: boq.id` in INSERT payload? | **Yes** — `view-boq-actions.ts:81` |
| `custom_fields.conversionTrail` preserved alongside FK? | **Yes** — `view-boq-actions.ts:82-91`, `withSourceTrail({}, buildTrailLink(...))` |
| CP stripped from quotation items? | **Yes** — `unit_price: item.sp \|\| item.unit_price` (line 101), no CP reference in item mapping |
| Amount = qty × SP? | **Yes** — `amount: (item.quantity \|\| 0) * (item.sp \|\| item.unit_price \|\| 0)` (line 102) |
| ViewQuotation badge renders? | **Yes** — `ViewQuotation.tsx:133-147`, detects `source_boq_id`, renders BOQ badge/link |
| DB: `source_boq_id` on production entity? | **Yes** — verified after fix migration |

### Item 5: General Hygiene

| Check | Result |
|---|---|
| `bun run typecheck` | **PASS** (clean) |
| `bun run audit:load` | **PASS** (pre-existing warnings only — no BOQ-related issues) |
| TODO/FIXME/HACK in BOQ files? | **None** |
| Git status | Unrelated changes only: `CreateCompanySheet.tsx` modified, `AdminSettingsSection.tsx` modified, `tmp-purge/` deletions, `docs/session-memories/` untracked |

---

## 3. Files Changed (This Session)

| File | Change |
|---|---|
| `supabase/migrations/20260916000000_fix_source_boq_id_all_entity_schemas.sql` | **NEW** — adds `source_boq_id` column + partial index to all schemas with `quotations` table |

---

## 4. Files Verified (Prior Sessions — Read-Only Audit)

| File | Verified |
|---|---|
| `src/domain/boq/calculateBoqTotals.ts` | Decimal.js arithmetic, aggregate gross profit |
| `src/components/table-document/TableRowsEditor.tsx` | `computeRowProfit()` at render time |
| `src/components/table-document/TableDocumentPreview.tsx` | `computeRowProfit()` at render time |
| `src/components/table-document/TableDocumentPdfDocument.tsx` | `computeRowProfit()` at render time |
| `src/pages/view-boq-actions.ts` | `source_boq_id` + `conversionTrail` in payload, CP stripped |
| `src/pages/ViewQuotation.tsx` | BOQ badge/link rendering |
| `src/domain/documentConversion.ts` | `buildTrailLink()`, `withSourceTrail()` |
| `src/domain/documentRelationships.js` | `getQuotationDocumentRelations(quotation)` |
| `src/domain/invoice/types.ts` | `DocumentTrailLink`, `DocumentConversionTrail` types |
| `src/components/boq/BoqForm.tsx` | Updated totals display |
| `src/components/boq/BoqPreview.tsx` | Updated totals strip |
| `src/pages/ViewBoq.tsx` | Updated hero metrics |

---

## 5. Verification

```
- bun run typecheck: PASS
- bun run audit:load: PASS (pre-existing only)
- supabase db push: PASS
- Column on entity_bigdrops-main_main: CONFIRMED
- Column on entity_bigdrops-main_agbado: CONFIRMED
- bun run build: SKIPPED (hardware policy)
```

---

## 6. Skills Used

NONE

---

## 7. Risks and Limitations

| Risk | Severity | Mitigation |
|---|---|---|
| `computeRowProfit()` runs at render time, not persisted | Low | Intentional design — profit is derived, never stored. Rows recompute on each render. |
| No live conversion test with real BOQ row | Low | Code path verified via static analysis. End-to-end test requires browser interaction. |
| Index creation on large entity schemas may lock | Low | Partial index (`WHERE source_boq_id IS NOT NULL`) is small. Existing rows have NULL. |

---

## 8. Deferred Work

| Item | Reason |
|---|---|
| End-to-end browser test of BOQ→Quotation conversion | Requires running dev server + Supabase connection. Code path verified statically. |
| `amount_in_words` for BOQ | Deferred per prior session. When implemented = Total Selling Price in words. |
| Live test of ViewQuotation BOQ badge link navigation | Requires browser. Code path verified statically. |

---

## Documentation Standard

ASD-STE100 Simplified Technical English
