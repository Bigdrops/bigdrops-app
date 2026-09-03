# Global Discount Field Calculation Fix Report

This report was written by Buffy (Freebuff) on 2026-08-14 via Freebuff.

## 1. Objective

Fix the defect where the regular global Discount field does not affect the invoice total summary.

## 2. Scope

- Application calculation path only.
- No database changes.
- No migration.
- No production data writes.

## 3. Files changed

- `src/lib/Calculations.ts`
- `src/tests/critical/calculations.test.js`

## 4. Skills used

- supabase
- supabase-postgres-best-practices
- karpathy
- pdf-rendering-correctness

Documentation standard: ADS-STE100 Simplified Technical English

## 5. Changes made

### 5.1 Engine fix

`src/lib/Calculations.ts` was modified.

A fixed before_tax discount is allocated only to rows with a non-zero VAT rate. On an invoice with no taxable rows, the allocation pool was empty and the fixed discount was silently dropped. The discount total became zero.

The fix adds a fallback. When no row is taxable but rows that inherit the global discount have a positive base, the fixed discount distributes across those rows. This restores the historical behavior where a fixed discount applies to the whole invoice.

Mixed documents keep the existing rule. Exempt rows are still excluded from the allocation when taxable rows exist. The existing test Block 5b still passes.

## 6. Verification result

- `bun run audit:load`: passed. The warnings are pre-existing and unrelated.
- `bun run typecheck`: passed, no errors.
- `bun run test`: 130 tests passed, 0 failed. This includes the 2 new tests.
- `git diff --check`: passed.

## 7. Root cause

The global Discount field is wired correctly. The value reaches `calculateDocument`.

The loss boundary is in the engine. `fixedDiscountEligible` requires `effectiveVatRate.greaterThan(0)`. A fixed discount on an invoice with no taxable rows produced a discount of zero. Percent discounts were not affected.

The pre-March-2026 engine distributed fixed discounts across all inheriting rows regardless of VAT. The March engine rewrite added the VAT requirement. The fallback restores the no-VAT behavior without reverting the documented mixed-invoice allocation rule.

## 8. Reverse percentage calculation

Reverse percentage calculation was NOT required.

The PDF summary label contract (`showDiscountPercentage`, `showWhtPercentage`) exists. It derives a percentage only when the type is percent. For fixed types it deliberately returns null. No existing UI contract expects an equivalent percentage for fixed amounts. Adding one would be a new feature, not a defect fix.

## 9. How fixed Discount is represented

- `discountType = fixed`
- `discountValue` = the actual fixed amount, the source of truth
- The engine applies the full amount.
- The derived per-row rate is informational only.

## 10. How fixed WHT is represented

- `whtType = fixed`
- `whtValue` = the actual fixed amount
- The engine uses the documented WHT base: contract value minus discount, VAT-exclusive.
- No WHT change was needed. Fixed and percent WHT both calculate correctly.

## 11. Tests added

Two tests added to `src/tests/critical/calculations.test.js`:

- Block 5d: fixed discount applies on a no-VAT invoice with NULL rows.
- Block 5e: fixed discount applies when every row is explicitly exempt.

## 12. Remaining legacy data issue

Invoices saved through the old RPC between 2026-08-09 and 2026-08-14 have item rows with `discount_rate = 0` that should be NULL. Example: SASINV079.

The engine correctly treats stored 0 as an explicit zero override. The global discount still does not apply on view for these invoices until the rows are healed.

No blanket 0 to NULL migration is authorized. Explicit 0 percent overrides are valid. A data repair requires a separately approved, deterministic gate.

## 13. Behavior deliberately left unchanged

- Percent global discounts.
- Row-level discount overrides.
- Column Manager visibility semantics.
- NULL and 0 semantics.
- The mixed-invoice allocation rule that excludes exempt rows when taxable rows exist.
- The percentage display contract for PDF summaries.
