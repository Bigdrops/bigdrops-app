# CIT-Computation PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Adjusted Profit → Capital Allowances → Loss Utilisation → **CIT Computation** → Tax Payable

---

## 1. Objective

Define the CIT computation engine that transforms adjusted profit into tax payable. This PRD covers the full Gate E pipeline: accounting profit → adjusted profit → assessable profit → chargeable income → CIT before credits → tax payable, including development levy and ETR minimum.

## 2. Problem Statement

CIT computation requires precise application of statutory rates, thresholds, and reliefs. Without a structured computation engine:
- Tax rates cannot be applied systematically
- Small company classification cannot be determined
- Development levy cannot be calculated
- ETR minimum cannot be evaluated
- The computation result cannot be audited or reproduced

## 3. Scope

- Full Gate E computation pipeline
- Entity classification (small / medium / large)
- CIT rate application per classification
- Development levy calculation (4% of assessable profit)
- ETR minimum evaluation (15% for MNE/large)
- Tax credits application
- Final tax payable calculation
- Computation result storage and lineage
- Entity-scoped computation isolation

## 4. Non-Scope

- Tax filing (Filing-PRD)
- Tax payment / remittance (separate module)
- NRS/API integration (NRS-PRD)
- AI tax advisor (AI-PRD)
- Accounting journal posting (see Tax-Journal-Bridge-PRD)
- Loss register (see Loss-Register-PRD)
- Capital allowances (see Capital-Allowances-PRD)

## 5. Product Model

### 5.1 Computation Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Tax period (e.g., "2026-Q1") |
| `accounting_profit` | numeric(18,2) | yes | From accounting foundation |
| `tax_adjustments` | jsonb | yes | Array of adjustment entries |
| `capital_allowances` | jsonb | yes | Per-class QCE + rates |
| `loss_register` | jsonb | yes | Available losses for utilisation |
| `tax_rule_id` | uuid | yes | FK to resolved rule version |

### 5.2 Computation Result

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Tax period |
| `assessment_profit` | numeric(18,2) | yes | = accounting_profit + adjustments |
| `chargeable_income` | numeric(18,2) | yes | = assessment_profit - capital_allowances - loss_utilisation |
| `tax_before_credits` | numeric(18,2) | yes | = chargeable_income × rate |
| `tax_credits` | numeric(18,2) | yes | Total credits applied |
| `tax_payable` | numeric(18,2) | yes | = tax_before_credits - tax_credits |
| `development_levy` | numeric(18,2) | yes | = assessment_profit × 4% (if applicable) |
| `etr_rate` | numeric(5,4) | yes | Effective tax rate |
| `etr_minimum_triggered` | boolean | yes | Whether ETR minimum applies |
| `classification` | jsonb | yes | Entity classification details |
| `trace` | jsonb | yes | Full computation lineage |
| `status` | enum | yes | `draft` / `finalized` |
| `created_at` | timestamptz | auto | Creation timestamp |

### 5.3 Computation Pipeline

```
Layer 1: Accounting Profit (from accounting foundation)
  ↓
Layer 2: Tax Adjustments (permanent + temporary)
  = Adjusted Profit (assessment profit)
  ↓
Layer 3: Capital Allowances (First Schedule rates)
  - Loss Utilisation (FIFO, capped at assessable profit)
  = Chargeable Income
  ↓
Layer 4: CIT Rate Application
  × Rate (per entity classification)
  - Tax Credits
  = Tax Payable

Parallel: Development Levy = assessment_profit × 4% (if not excluded)
Parallel: ETR evaluation (if applicable)
```

### 5.4 Entity Classification

| Classification | Criteria | CIT Rate |
|----------------|----------|----------|
| Small | turnover ≤ ₦50M AND fixed_assets ≤ ₦250M AND not excluded sector | 0% |
| Medium | turnover ≤ ₦500M | 25% (Presidential Order) |
| Large | turnover > ₦500M | 30% (standard) |

### 5.5 Development Levy

- Rate: 4% of assessable profit
- Excluded: small companies, non-resident companies
- Computed after capital allowances but before CIT
- Shown as separate line item in computation

### 5.6 ETR Minimum

- Rate: 15%
- Applies to: MNE groups (≥€750M consolidated revenue) or large companies (≥₦50B turnover)
- If ETR < 15%: top-up tax = (15% - ETR) × chargeable_income
- ETR minimum is informational in v1 — no payment mechanism

## 6. Data / Domain Model

### 6.1 Relationships

```
CIT Computation
  ├── belongs to Entity (entity_id)
  ├── computed for Period (period_code)
  ├── uses Tax Rule Version (tax_rule_id)
  ├── references Accounting Profit (accounting foundation)
  ├── applies Tax Adjustments (adjustment layer)
  ├── deducts Capital Allowances (allowance computation)
  ├── utilises Losses (loss register)
  └── produces Tax Payable → Tax Journal Bridge
```

### 6.2 Computation Trace

The `trace` JSONB field records every step:
```json
{
  "accounting_profit": "10000000",
  "adjustments": [
    { "type": "permanent_add_back", "category": "depreciation", "amount": "2000000" }
  ],
  "adjusted_profit": "12000000",
  "capital_allowances": [
    { "class": "class_2", "qce": "5000000", "rate": "0.20", "allowance": "1000000" }
  ],
  "total_capital_allowances": "1000000",
  "loss_utilisation": "0",
  "chargeable_income": "11000000",
  "classification": { "type": "large", "turnover": "200000000" },
  "rate": "0.30",
  "tax_before_credits": "3300000",
  "tax_credits": "0",
  "tax_payable": "3300000",
  "development_levy": "480000",
  "etr_rate": "0.30",
  "etr_minimum_triggered": false
}
```

## 7. Lifecycle

1. User selects entity and period
2. System loads accounting profit from accounting foundation
3. System loads tax adjustments for the period
4. System computes capital allowances
5. System applies loss utilisation (FIFO)
6. System classifies entity (small/medium/large)
7. System applies CIT rate
8. System computes development levy
9. System evaluates ETR minimum
10. System stores computation result with full trace
11. Status: draft → finalized (user action)

## 8. Accounting Boundary

- Computation is a tax-only construct — no journal entries
- Computation result feeds the Tax Journal Bridge (Gate G)
- Accounting profit remains unchanged by computation

## 9. Tax Boundary

- Computation is the core tax engine output
- All statutory rules applied here
- Computation must be reproducible (deterministic)
- Computation must fail explicitly if required rule cannot be resolved

## 10. Provenance / Auditability

- Full trace of every computation step
- Rule versions recorded in trace
- Classification logic recorded
- Idempotent: same inputs → same result

## 11. Entity / Tenant Isolation

- All computation records scoped by `entity_id`
- Entity isolation enforced at query level
- Cross-entity computation queries forbidden

## 12. Calculation Rules

- All amounts: exact decimal (Decimal.js, precision 20, ROUND_HALF_UP)
- Rate application: `chargeable_income × rate`
- Development levy: `assessment_profit × 0.04`
- ETR: `tax_payable / chargeable_income` (if chargeable_income > 0)
- No floating-point in computation

## 13. Immutability / Reversal Rules

- Finalised computations are immutable
- Supersession creates new computation (not edit)
- Old computation remains for audit trail
- Draft computations can be recalculated

## 14. UX Requirements

- Computation wizard: select entity → period → review → compute
- Result view with full trace
- Development levy line item
- ETR evaluation
- Finalise button with confirmation
- Mobile-first responsive layout

## 15. Edge Cases

| Case | Handling |
|------|----------|
| No accounting profit | Computation proceeds with zero |
| Negative adjusted profit | No CIT payable, development levy = 0 |
| Chargeable income = 0 | No CIT payable |
| Small company | Rate = 0%, development levy excluded |
| ETR below minimum | Top-up tax flagged (informational in v1) |
| No tax rule for period | Computation fails explicitly |
| Multiple loss records | FIFO ordering applied |

## 16. Dependencies

- Tax Rules Engine: all rule types
- Tax Adjustments: adjustment entries
- Capital Allowances: allowance computation
- Loss Register: loss utilisation
- Accounting Foundation: accounting profit

## 17. Acceptance Criteria

- [ ] Full pipeline computes correctly (accounting profit → tax payable)
- [ ] Entity classification determines correct rate
- [ ] Development levy computed correctly (4% of assessable profit)
- [ ] ETR minimum evaluated correctly
- [ ] Computation trace records all steps
- [ ] Idempotent for same inputs
- [ ] Computation fails if no rule exists
- [ ] Entity isolation prevents cross-entity computation

## 18. Verification Requirements

- Unit test: full pipeline with standard company
- Unit test: small company (0% rate, no development levy)
- Unit test: development levy calculation
- Unit test: ETR minimum evaluation
- Unit test: idempotency
- Unit test: failure on missing rule
- Integration test: end-to-end computation
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| CIT rate 30% | NTA 2025 s.56 | Resolved |
| Small company rate 0% | NTA 2025 s.56 | Resolved |
| Presidential Order rate 25% | NTA 2025 s.56 | Resolved |
| Development levy 4% | NTA 2025 s.59 | Resolved |
| ETR minimum 15% | NTA 2025 s.57 | Resolved |
| Small company thresholds | NTA 2025 s.202 | Resolved |
| Excluded sectors | NTA 2025 s.202 | Unresolved — professional services only |
| ETR MNE threshold (€750M) | NTA 2025 s.57 | Resolved |

## 20. Open Questions

1. Should the computation auto-finalize or require user confirmation?
2. How are prior-period corrections handled?
3. Should the system support pro-rata computation for mid-year incorporation?
4. How are group relief and consolidated returns handled (if at all)?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- `computation.ts` implements the full pipeline
- `types.ts` defines `TaxComputationInput`, `TaxComputationResult`
- `ruleResolver.ts` resolves all rule types
- `classifier.ts` determines entity classification
- Future implementation: `src/domain/tax/cit-computation.ts` module
