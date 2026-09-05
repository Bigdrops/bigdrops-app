# TaxBridge Nigeria CIT Architecture Audit

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Evaluate the GitHub repository `Scardubu/taxbridge` as a reference implementation for the BIGDROPS Nigeria NTA 2025 CIT engine. The audit is source-level and read-only. No integration was performed. Neither repository was modified.

This audit does not revisit the completed Luca evaluation. Luca's verdict (REFERENCE ARCHITECTURE ONLY) stands.

## Scope

- Inspected TaxBridge source at `/tmp/taxbridge` (read-only clone, working tree clean).
- Inspected the CIT engine, constants, contracts, routes, compliance service, Prisma schema, docs, and tests.
- Compared the implementation against the canonical NTA 2025 materials in the BIGDROPS NRS-docs directory.
- No code, schema, PRD, or configuration change was made to either repository.

## Skills Used

- `karpathy`
- `writing-clearly-and-concisely`
- No tax/accounting-specific skill exists in the BIGDROPS skill index; the accounting analysis was performed from source and statutory materials.

## Documentation Standard

ASD-STE100 Simplified Technical English

## Baseline Git Status (BIGDROPS)

Captured before the audit (20 entries, all pre-existing):

```
AM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
MM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/files-tax-monthly-prd-audit-2026-09-05.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
A  docs/reports/general/invoice-to-quotation-revert-fix.md
A  docs/reports/general/vat-filing-support-prd-update-2026-09-05.md
A  docs/reports/multi-tenancy/workspace-management-gaps-audit.md
M  src/domain/tenant/tenantCreation.ts
M  src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/settings/AdminSettingsSection.tsx
M  src/pages/viewQuotationActions.ts
A  supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
A  supabase/migrations/20260905010000_workspace_management_gaps.sql
?? docs/Reports/general/cit-readiness-audit-2026-09-05.md
?? docs/Reports/general/luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md
?? docs/Reports/general/record-capture-prd-audit-2026-09-05.md
?? docs/Reports/multi-tenancy/entity-lifecycle-audit.md
?? docs/Reports/multi-tenancy/ownership-transfer-ui.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/
```

All changes above pre-date this audit. The TaxBridge clone at `/tmp/taxbridge` was created fresh and its working tree is unchanged.

## 1. Executive Verdict

**USEFUL REFERENCE WITH MATERIAL GAPS.**

TaxBridge is Nigeria-specific and its codebase contains real Nigerian tax concepts: NGN currency, a `calculateCIT()` entry point, NTA 2025 section citations, Development Levy logic, and loss carry-forward input. That makes it more directly relevant to BIGDROPS than Luca was.

However, the CIT engine has material correctness gaps that disqualify it as a trustworthy calculation reference until independently re-derived from the NTA:

1. **The active CIT engine uses the wrong small-company threshold.** `packages/contracts/src/cit.ts` classifies at turnover below ₦100,000,000. The canonical NTA §202 defines a small company at gross turnover of ₦50,000,000 or less. ₦100,000,000 is the same value as the known BIGDROPS Technical-plan §8.3 documentation conflict. The statutory value wins; TaxBridge does not resolve this conflict, it repeats it.
2. **Three inconsistent CIT implementations coexist.** `cit.ts` (2 tiers, ₦100M), `nta2025.ts` (3 tiers: ₦25M / ₦100M, 20% medium), and `backend/config/nta2025-rules.json` (3 tiers plus EDT, minimum ETR at ₦1B). They disagree with each other and all disagree with the canonical NTA.
3. **The 20% medium tier does not exist in the NTA.** The canonical NTA §56 has 0% for small companies and 30% for all others, reducible to 25% by presidential Order. TaxBridge's 20% band appears in two of its three implementations and is not statutory.
4. **No capital allowances.** `calculateCIT()` accepts `taxableProfit` as an input and applies a rate. There is no First Schedule logic, no asset-level inputs, no qualifying-expenditure computation.
5. **No fixed-asset threshold check.** `SMALL_CO_FIXED_ASSETS_MAX` (₦250,000,000) is defined in constants but never used in classification.
6. **No professional-services exclusion.** NTA §202 excludes professional-service businesses from small-company status. TaxBridge's classification is turnover-only.
7. **The minimum ETR model is wrong and unimplemented.** Docs claim 15% for companies above ₦1B turnover. NTA §57 applies the 15% floor only to multinational groups at €750M or companies at ₦50,000,000,000. The `cit.ts` engine does not implement it at all.
8. **Floating-point arithmetic.** All money math uses `Math.round` on JavaScript numbers. No decimal library. TaxRemittance persists as `Decimal(15,2)` but calculation is not decimal-safe.
9. **Statutory citations are block-level and inconsistent.** `cit.ts` cites "NTA 2025 §55"; backend constants cite "Section 40/90"; `nta2025.ts` cites "§60A" for Development Levy. None matches the canonical numbering used in the BIGDROPS repository (rates at §56, Development Levy at §59, classification at §202).

TaxBridge is a useful architectural reference — a pure-function tax contract layer, centralized constants, and an idempotent filing route — but its CIT numbers and classification must not be copied. Every rule must be re-derived from the canonical NTA 2025 materials.

## 2. Repository / Version Snapshot

- Repository: `https://github.com/Scardubu/taxbridge`
- Inspected commit: shallow clone at `/tmp/taxbridge` (2026-09-05)
- package.json: name `taxbridge`, version `1.0.0`, Node 20, npm workspaces, proprietary license
- Stack: Fastify backend, Prisma ORM, PostgreSQL, React/Next admin, Expo mobile, Redis/BullMQ
- README claims: 528+ passing tests, 97.29% coverage, v12.0.0

## 3. CIT Capability Matrix

Legend: ✅ verified in source · ⚠️ partial or documented intention · ❌ missing · ❓ ambiguous/conflicting

| Capability | TaxBridge | Evidence | Gap/Risk |
|------------|-----------|----------|----------|
| Company classification | ⚠️ | `cit.ts`: turnover < ₦100M → small | Wrong threshold vs NTA §202 (₦50M) |
| Turnover threshold | ❌ | ₦100M in `cit.ts`; ₦25M/₦100M in `nta2025.ts` and rules.json | Statutory value is ₦50M |
| Fixed-asset threshold | ❌ | `SMALL_CO_FIXED_ASSETS_MAX` defined, never used | NTA §202 requires it |
| Professional-services exclusion | ❌ | No classification input for it | NTA §202 requires it |
| Accounting profit input | ⚠️ | `taxableProfit` input; route computes `revenue - expenses` | Shortcut math, no accrual basis |
| Allowable expenses | ❌ | Not modeled | — |
| Disallowable expenses | ❌ | Not modeled | — |
| Tax adjustments | ❌ | Not modeled | — |
| Losses | ⚠️ | `taxLossCarryforward` single number | No generation, expiry, or per-year register |
| Capital allowances | ❌ | Not modeled | First Schedule absent |
| CIT | ⚠️ | `calculateCIT()` rate application | Wrong threshold, no 25% Order path |
| Development Levy | ⚠️ | 4% in `cit.ts`; flag in route tied to digital income | Base/flags inconsistent with §59 |
| Minimum ETR | ❌ | Docs claim ₦1B; engine does not implement | §57 applies to ₦50B / €750M only |
| Filing | ⚠️ | `routes/filings/cit.ts` workflow with idempotency | Workflow wrapper, not full return engine |
| Statutory citations | ⚠️ | Block-level comments; conflicting numbers | Not attached per rule |
| Rule versioning | ❌ | No effective dates, no versioned params | — |
| Money precision | ❌ | `Math.round` on JS numbers | Floating-point arithmetic |
| Tests | ✅ | 618 test declarations; boundary tests exist | Tests encode the wrong ₦100M threshold |

## 4. Detailed CIT Calculation Trace

The canonical engine is `packages/contracts/src/cit.ts`.

Input: `{ turnover, taxableProfit, taxLossCarryforward?, devLevyApplies? }`.

Trace:

1. `band = turnover < SMALL_CO_CIT_THRESHOLD ? 'small' : 'large'` — threshold is `100_000_000`.
2. `exempt = band === 'small'`; rate is 0 or `CIT_LARGE_RATE` (0.30).
3. Small: returns zero liability immediately.
4. Large: `adjustedProfit = max(0, taxableProfit - max(0, taxLossCarryforward))`.
5. `citLiability = Math.round(adjustedProfit * rate)`.
6. `devLevy = devLevyApplies ? Math.round(adjustedProfit * 0.04) : 0`.
7. `total = citLiability + devLevy`.

The calculation is pure and deterministic. But the calling route `backend/src/routes/tax.ts` computes `taxableProfit = Math.max(0, input.revenue - input.expenses)` and sets `devLevyApplies: (input.digitalIncome ?? 0) > 0`. Both choices are wrong for CIT: accounting profit is not `revenue - expenses` (the BIGDROPS audit explicitly rejected this), and Development Levy applicability is not determined by digital income.

## 5. Detailed Capital-Allowance Assessment

TaxBridge does not implement Nigerian First Schedule capital allowances.

- No asset-level inputs in `CITInput`.
- No asset categories, acquisition dates, or business-use proportions.
- No qualifying-expenditure model.
- No initial allowance, annual allowance, or balancing adjustment logic.
- The DEPRECIATION concept exists only in Luca, not in TaxBridge; TaxBridge has no depreciation model at all.
- The word "allowance" in TaxBridge source refers to payroll allowances (housing etc.), not capital allowances.

Accounting depreciation and statutory capital allowance are both absent. BIGDROPS must build the asset register and the First Schedule computation itself.

## 6. Detailed Loss Treatment Assessment

- Losses are a single optional number: `taxLossCarryforward` in `CITInput`.
- Applied once: `adjustedProfit = max(0, taxableProfit - max(0, taxLossCarryforward))`.
- There is no loss register, no generation from prior years, no expiry rule, no ring-fencing, and no per-year-of-assessment tracking.
- This is a statutory-tax-loss input, not a generic accounting loss, but it is far too thin to support NTA §27(5) carry-forward rules (deduct from the first year after the loss, subsequent years until recouped, same trade only).

## 7. Detailed Company-Classification Assessment

- Classification is turnover-only, using the wrong threshold (₦100M).
- Fixed assets are not checked even though `SMALL_CO_FIXED_ASSETS_MAX` (₦250M) exists as a constant.
- Professional services are not excluded.
- Two other implementations in the repo use a 3-tier model (₦25M / ₦100M) that adds a nonexistent 20% band.
- None of the three implementations matches NTA §202 (₦50M turnover, ₦250M fixed assets, professional-services exclusion) or NTA §56 (0% / 30%, reducible to 25%).

## 8. Detailed Development Levy Assessment

- Rate: 4% (correct per NTA §59(1)).
- Tax base: `adjustedProfit` in `cit.ts` (assessable profit after loss offset).
- Exclusions: `cit.ts` gives small companies zero levy via the early exempt return. `nta2025.ts` sets `smallCompanyExempt: false`, claiming the levy applies to all companies regardless of size. This contradicts NTA §59(1), which excludes small companies and non-resident companies. The two implementations conflict.
- The filing route ties `devLevyApplies` to digital income, which is unrelated to the levy's statutory trigger.
- Relationship to CIT: modeled as an additional amount in `total`, which is conceptually correct (separate levy, not part of the 30% rate).

## 9. Detailed Minimum-ETR Assessment

- `backend/config/nta2025-rules.json` contains `minimumETR: { rate: 0.15, threshold: 1_000_000_000 }`.
- `docs/CANONICAL_TAX_IMPLEMENTATION.md` claims "Minimum ETR check (15% for large companies)" at ₦1B.
- The active `cit.ts` engine implements no minimum-ETR logic at all.
- NTA §57 applies the 15% floor only to multinational entity groups with at least €750M group turnover or companies with aggregate turnover of ₦50,000,000,000 and above. The ₦1B threshold is not statutory and must not be copied.
- For BIGDROPS's SME population, the floor does not apply. This rule is effectively out of scope for the typical tenant.

## 10. Statutory Citation / Traceability Assessment

- Citations are block-level comments at the top of files or constant groups. They are not attached to individual rules or calculation steps.
- The citation numbers are inconsistent and do not match the canonical NTA 2025 materials in the BIGDROPS repository:
  - `cit.ts`: "NTA 2025 §55" for CIT (canonical rates are §56).
  - backend `constants.ts`: "Section 40/90" for CIT rates; "§78" for WHT.
  - `nta2025.ts`: "§60A" for Development Levy (canonical §59).
  - `constants.ts` (contracts): "§11–12" for VAT (canonical §148).
- These numbers cannot be trusted as statutory references. BIGDROPS must not carry them forward.

## 11. Test-Suite Assessment (Source Inspection Only)

- 618 test declarations across backend and packages test files (grep of `it(` / `test(` in `*.test.ts`).
- README claims 528+ passing and 97.29% coverage. Tests were not executed in this audit.
- CIT boundary tests exist and cover: 0% below threshold, 30% at/above threshold, zero profit, Development Levy on/off, loss carry-forward reduction, and non-negative taxable profit.
- The tests encode the same wrong ₦100M threshold. There are no tests for: the ₦50M statutory threshold, the ₦250M fixed-asset threshold, professional-services exclusion, capital allowances, negative taxable profit with carry-forward interplay beyond a single offset, or minimum ETR in the active engine.
- Test quality is good structurally (boundary-focused), but the boundaries tested are the wrong ones.

## 12. BIGDROPS Dependency Comparison

TaxBridge assumes the caller provides:

- `turnover` (revenue).
- `taxableProfit` (or the route derives it as `revenue - expenses`).
- Optional prior-year loss and a Development Levy flag.

BIGDROPS currently provides: invoice revenue and money-in payments only. It lacks expenses, accounting profit, fixed assets, depreciation, and tax adjustments. TaxBridge's engine would therefore sit on the same missing foundation the CIT readiness audit identified. TaxBridge adds no accounting capability that BIGDROPS lacks; it only adds a CIT rate application on top of inputs BIGDROPS cannot yet produce.

## 13. Architecture Assessment

Positive:

- Pure, deterministic `calculateCIT()` — a good pattern for the BIGDROPS tax domain.
- Centralized rate constants in `packages/contracts` (C-04/C-10/C-41 rules).
- Idempotent filing route with audit-event write and reference generation.
- Contract package shared across backend, mobile, and admin — a reusable monorepo pattern.

Negative:

- Three divergent CIT implementations in one repo — no single source of truth in practice.
- Business logic leaks into the route (`revenue - expenses`, dev-levy flag from digital income).
- No rule versioning or effective dates.
- Floating-point money math.
- Block-level citations that are inconsistent and wrong.
- Documentation (CANONICAL_TAX_IMPLEMENTATION.md) describes features (EDT, employee count, minimum ETR) that the active engine does not implement.

## 14. Reusable Design Patterns for BIGDROPS

- Pure-function tax calculator with typed input/output contracts.
- Centralized rate constants with explicit "never inline" discipline.
- Idempotent filing submission with a stored reference and audit event.
- Boundary-focused unit tests (even though the specific boundaries are wrong).
- Tax-contract package shared across consumers.

## 15. Patterns Explicitly NOT to Copy

- The ₦100M small-company threshold.
- The 20% medium CIT band.
- The `revenue - expenses = taxableProfit` shortcut.
- The ₦1B minimum-ETR threshold.
- Development Levy gated by digital income.
- Floating-point `Math.round` money math.
- The incorrect section citations (§55, §40/90, §60A).
- Three coexisting, conflicting rule sets.

## 16. Recommended BIGDROPS Ownership Boundaries

| Layer | Owner |
|-------|-------|
| Accounting layer (journal, periods, P&L, assets) | Native BIGDROPS accounting module |
| Tax-adjustment layer (allowable/disallowable, losses, capital allowances) | BIGDROPS tax domain |
| Nigerian CIT engine (classification, rates, levy) | BIGDROPS tax domain, `src/lib/Calculations.ts`-style module |
| Compliance/filing layer (returns, deadlines, evidence) | BIGDROPS compliance domain |

TaxBridge occupies only the third layer, and only partially. It is not a substitute for layers one, two, or four.

## 17. Build-vs-Reference Recommendation

TaxBridge should be used as a reference for structure (pure function, centralized constants, idempotent filing) but not for values or rules. Every statutory value must come from the canonical NTA 2025 materials:

- Classification: NTA §202 — ₦50M turnover, ₦250M fixed assets, professional-services exclusion.
- Rates: NTA §56 — 0% small, 30% other, 25% by Order.
- Development Levy: NTA §59 — 4%, excluding small companies and non-residents.
- Minimum ETR: NTA §57 — €750M groups / ₦50B companies only.
- Losses: NTA §27(5) — same trade, first year after, until recouped.
- Capital allowances: First Schedule Part I — asset categories, qualifying expenditure, proration.

## 18. Open Questions Requiring Statutory/Legal Verification

Blocking:
- Confirm the current official CIT rate (30% vs the 25% presidential Order, and whether it has taken effect) — the canonical repository text states 30% with a 25% conditional reduction.
- Confirm the NTAA 2025 filing deadline for CIT annual returns (NTAA absent from the BIGDROPS repository).

High-risk:
- Confirm whether any additional statutory exclusions apply to professional-service small companies beyond the §202 carve-out.
- Confirm the exact First Schedule allowance rates per asset class for the tax year (the canonical text defines qualifying expenditure categories; rates were not fully enumerated in the sections read for this audit).

Non-blocking:
- Whether the 20% tier in TaxBridge derives from any prior-law source (it is not in the canonical NTA 2025).

## 19. Final Decision

- **Recommendation:** Use TaxBridge as a structural reference only. Do not copy its CIT values, thresholds, rates, citations, or money handling. Build the BIGDROPS CIT engine natively from the canonical NTA 2025 materials, adopting TaxBridge's pure-function and centralized-constants pattern and its idempotent filing pattern.
- **Confidence level:** High.
- **Decisive evidence:** three mutually inconsistent CIT implementations; ₦100M threshold that conflicts with canonical NTA §202; `Math.round` floating-point arithmetic; no capital allowances, fixed-asset check, professional-services exclusion, or statutory minimum ETR; incorrect and inconsistent section citations.
- **Conditions that would change the recommendation:** if TaxBridge publishes a corrected, versioned CIT model aligned to NTA §202/§56/§59 with decimal-safe math and per-rule citations, its status could rise toward STRONG REFERENCE.

## Changes Made

None to either repository. This report is the only BIGDROPS change in this step, together with the curated reference document.

## Verification

- BIGDROPS `git status` before and after: only the two intended documentation files created.
- TaxBridge working tree: clean (fresh clone, untouched).
- No builds, typecheck, lint, `bun run audit:load`, migrations, or application execution were performed.

## Risks or Limitations

- TaxBridge is a live, changing project; the shallow clone reflects its state on 2026-09-05.
- Tests were inspected but not executed.
- The canonical NTA text used for comparison is the BIGDROPS `NRS-docs/NIGERIA-TAX-ACT-2025.md` conversion.

## Deferred Work

- Re-derive the CIT engine values from the canonical NTA in the future CIT PRD/technical plan.
- Build the native accounting foundation (expenses, accounting profit, asset register) before CIT implementation.
- Add NTAA 2025 to NRS-docs to close filing-deadline gaps.