# Calculations.ts Test Coverage Report

**Date:** 2026-07-19
**Author:** OpenCode
**Harness:** Local CLI

## Objective

Provide comprehensive test coverage for `src/lib/Calculations.ts` (the canonical financial calculations engine) without modifying production code. The file is [LOCKED] per AGENTS.md.

## Scope

- **Covered:** All 3 exported functions (`calculateDocument`, `normalizeDocumentInput`, `computeDocument`) and all internal calculation paths: subtotals, VAT, discounts (percent/fixed, before_tax/after_tax), install rates, extra charges, WHT, groups, decimal precision, legacy fallbacks, column visibility zeroing, and rate-vs-total anti-regression.
- **Excluded:** External integrations (Supabase, PDF generation, save hooks). These are tested in their respective module tests.
- **Production code changes:** NONE. All code is in new/supporting files only.

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `src/tests/critical/calculations.test.js` | Created | 56 tests across 17 blocks covering all calculation paths |
| `src/tests/resolve-alias.js` | Created | Custom ESM loader resolving `@/` aliases and `.js`→`.ts` extension mapping for Node 24 strip-types mode |
| `package.json` | Modified | Updated `test` script to use `--experimental-loader` for the alias resolver; `bun run test` now works |

## Test Coverage (17 Blocks, 56 Tests)

| Block | Name | Tests | What it covers |
|-------|------|-------|----------------|
| 1 | Basic subtotals | 4 | Single/multiple items, zero quantity, group_header skip |
| 2 | VAT calculations | 5 | Global VAT, row-level override, exempt rows, null→inherit, zero global |
| 3 | Percent discount before_tax | 3 | With/without VAT, zero discount no-op |
| 4 | Percent discount after_tax | 1 | VAT on full base, discount reduces total |
| 5 | Fixed discount before_tax | 3 | Proportional allocation, exempt rows excluded, override rows excluded |
| 6 | Fixed discount after_tax | 1 | Full VAT on base, discount applied to total |
| 7 | Fixed discount clamping | 1 | Discount capped at eligible VAT base |
| 8 | Row-level VAT overrides | 2 | Mixed rates, null vs 0 distinction |
| 9 | Row-level discount overrides | 2 | Override vs inherit, zero override ≠ inherit |
| 10 | Install rate | 3 | Non-taxable, taxable, visible_line_total |
| 11 | Extra charges | 3 | Without VAT, with VAT, mixed |
| 12 | WHT calculations | 4 | Percent, fixed, zero, base excludes discount |
| 13 | Rate-vs-total anti-regression | 3 | LOCKED behavior: ci rates not document totals |
| 14 | Decimal precision | 4 | Odd VAT, fractional unit_price, deep discount chain, fixed split |
| 15 | normalizeDocumentInput | 13 | ci precedence, cf fallback, legacy fields, hide_full visibility, extra charges, columns |
| 16 | Group accumulation | 4 | Single group sum, multiple groups, ungrouped items, group_header exclusion |
| 17 | Edge cases | 3 | Empty items, zero install/charges, all visibleRowEffects false |

## Verification Gate

```
bun run test  → 120/120 pass (56 calculations + 64 pre-existing)
bun run typecheck → Pass (0 errors)
bun run audit:load → Pass (no new warnings)
git status → Only intended files modified
```

## Key Findings

1. **Group accumulation works correctly** — groups are returned as `ComputedGroup[]` array with `group_id`, `group_name`, `subtotal`, `installTotal`.
2. **Fixed discount proportional allocation** correctly excludes exempt rows (vat_rate=0) and rows with explicit `discount_rate` overrides.
3. **Fixed discount clamping** prevents discounts from exceeding the eligible VAT base (tested with `discountValue: 9999` on base of 100).
4. **Rate-vs-total anti-regression** (Block 13) confirmed: `ci.vatPercent` is used as the rate, `document.vat` is ignored as a computed total; same for `ci.discountValue` vs `document.discount`.
5. **Hide_full visibility mode** correctly zeroes out vat_percent (global), discount_value, install_rate, and install_rate_taxable.
6. **`null` vs `0` distinction** for vat_rate is preserved: `null` → inherit global, `0` → exempt.
7. **`discount_rate=0`** means explicit zero (not inherit), tested against `discount_rate=null`.
8. **Decimal precision** preserved (20-digit Decimal precision with ROUND_HALF_UP).

## Infrastructure

A custom ESM loader (`src/tests/resolve-alias.js`) was created to handle:
- `@/` path alias mapping to `src/`
- `.js` → `.ts` extension mapping for transitive TypeScript imports (standard TS convention where source files use `.js` extension in import statements but actual files are `.ts`)

## Risks & Limitations

- Tests pass under Node 24 strip-types mode; would need different setup for ts-node or tsx runner.
- The ESM loader extends to non-`@/` relative imports for `.js` → `.ts` mapping, which could theoretically interfere with genuine `.js` file resolution (none currently in the dependency chain).
- No integration tests with Supabase or actual DB round-trips — testing is purely computational.
- Build testing skipped per hardware policy (4GB RAM constraint).

## Deferred Work

- Integration-level tests connecting `calculateDocument` → save → PDF render pipeline
- Property-based testing for edge cases with random quantities/prices
- Performance benchmarks for large document calculations (1000+ line items)
- Tests for the `composePreviewData` / `composePrintData` functions (in separate modules)
