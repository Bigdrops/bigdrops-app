# Capital-Allowances PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Adjusted Profit → **Capital Allowances** → Assessable Profit

---

## 1. Objective

Define the capital allowance computation that deducts qualifying capital expenditure from adjusted profit to produce assessable profit. This PRD covers asset classification, allowance rates, computation, and the balance of unrelieved expenditure.

## 2. Problem Statement

Capital allowances are the tax equivalent of accounting depreciation. Without a structured capital allowance computation:
- Adjusted profit cannot be reduced to assessable profit
- First Schedule rates cannot be applied systematically
- Unrelieved expenditure cannot be tracked across periods
- The capital allowance step in Gate E has no data source

## 3. Scope

- Capital allowance computation (per NTA First Schedule Part I)
- Asset classification (Class 1, 2, 3)
- Allowance rate application (10%, 20%, 25%)
- Balancing allowance / charge on disposal
- Unrelieved expenditure tracking
- Entity-scoped allowance isolation

## 4. Non-Scope

- Accounting depreciation (see Fixed-Assets-Depreciation-PRD)
- Asset register management (see Fixed-Assets-Depreciation-PRD)
- Investment allowance (separate relief)
- Initial allowance (separate relief)
- Export allowance (separate relief)

## 5. Product Model

### 5.1 Capital Allowance Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Tax period |
| `asset_class` | enum | yes | `class_1` / `class_2` / `class_3` |
| `qualified_expenditure` | numeric(18,2) | yes | QCE for the period |
| `allowance_rate` | numeric(5,2) | yes | Statutory rate (10, 20, 25) |
| `allowance_amount` | numeric(18,2) | yes | Computed allowance |
| `unrelieved_expenditure` | numeric(18,2) | yes | Remaining QCE for future periods |
| `status` | enum | yes | `draft` / `finalized` |
| `created_at` | timestamptz | auto | Creation timestamp |

### 5.2 Asset Classes (NTA First Schedule Part I)

| Class | Rate | Assets |
|-------|------|--------|
| Class 1 | 10% | Buildings, agricultural structures, masts, intangible assets, heavy transport |
| Class 2 | 20% | Plant & machinery, agricultural equipment, furniture/fittings, mining equipment, other equipment |
| Class 3 | 25% | Motor vehicles, software, other capital assets |

### 5.3 Computation

```
For each asset class:
  allowance = qualified_expenditure × rate
  unrelieved = qualified_expenditure - allowance

Total capital allowances = Σ(allowance by class)

Assessable profit = adjusted profit - total capital allowances
```

### 5.4 Balancing Allowance / Charge (Disposal)

When an asset is disposed of:
```
balancing_allowance = unrelieved_expenditure - disposal_proceeds
  (if positive → deductible allowance)
  (if negative → balancing charge, added to assessable profit)
```

## 6. Data / Domain Model

### 6.1 Relationships

```
Capital Allowance
  ├── belongs to Entity (entity_id)
  ├── computed for Period (period_code)
  ├── references Asset Class (class_1/2/3)
  ├── derives from Fixed Asset Register (qualified_expenditure)
  └── feeds CIT Computation (assessable profit step)
```

### 6.2 Status Lifecycle

```
draft → finalized
```

- `draft`: editable
- `finalized`: frozen, used in computation

## 7. Lifecycle

1. System identifies QCE for the period (from fixed asset register)
2. System classifies expenditure by First Schedule class
3. System applies statutory rate per class
4. System computes total capital allowances
5. System deducts from adjusted profit → assessable profit
6. Unrelieved expenditure carried forward

## 8. Accounting Boundary

- Capital allowances are a tax computation — no journal entries
- Capital allowances do not affect accounting records
- Accounting depreciation continues separately
- The difference is a permanent timing difference (depreciation add-back, capital allowance deduction)

## 9. Tax Boundary

- Capital allowances are mandatory for QCE
- Rates are statutory (First Schedule Part I)
- Unrelieved expenditure carries forward indefinitely
- Disposal triggers balancing allowance/charge
- Capital allowances reduce assessable profit

## 10. Provenance / Auditability

- Each allowance traces to QCE + asset class + statutory rate
- Unrelieved expenditure is a running balance
- Disposal adjustments trace to original allowance + disposal proceeds
- Computation is deterministic: same inputs → same result

## 11. Entity / Tenant Isolation

- All allowance records scoped by `entity_id`
- Entity isolation enforced at query level
- Cross-entity allowance queries forbidden

## 12. Calculation Rules

- Allowance: `qualified_expenditure × rate` (Decimal.js, ROUND_HALF_UP)
- Rate: statutory (10%, 20%, 25%) from First Schedule
- Unrelieved: `qualified_expenditure - allowance` (can be zero)
- Balancing: `unrelieved_expenditure - disposal_proceeds`
- No rounding of rates — use exact decimal

## 13. Immutability / Reversal Rules

- Finalised allowances are immutable
- Correction: create adjustment entry (not edit)
- Disposal creates new record (not modify existing)

## 14. UX Requirements

- Allowance computation view by class
- Unrelieved expenditure summary
- Disposal adjustment preview
- Mobile-first responsive layout

## 15. Edge Cases

| Case | Handling |
|------|----------|
| No QCE in period | Allowance = 0, assessable = adjusted profit |
| Disposal proceeds > unrelieved | Balancing charge (added to profit) |
| Disposal proceeds = unrelieved | No balancing adjustment |
| Disposal proceeds < unrelieved | Balancing allowance (deducted from profit) |
| Mixed asset classes | Compute per class, sum totals |
| Asset acquired mid-period | Full year allowance in acquisition year (v1) |
| Asset disposed mid-period | Balancing adjustment in disposal year |

## 16. Dependencies

- Fixed Asset Register: source of QCE and classification
- Tax Rules Engine: capital allowance rates from rule snapshot
- Tax Adjustments: depreciation add-back
- CIT Computation: uses assessable profit

## 17. Acceptance Criteria

- [ ] Capital allowance computed correctly per class
- [ ] Correct statutory rates applied (10%, 20%, 25%)
- [ ] Unrelieved expenditure tracked correctly
- [ ] Disposal triggers balancing allowance/charge
- [ ] Total allowances deducted from adjusted profit
- [ ] Entity isolation prevents cross-entity allowance access

## 18. Verification Requirements

- Unit test: allowance computation per class
- Unit test: unrelieved expenditure tracking
- Unit test: balancing allowance on disposal
- Unit test: balancing charge on disposal
- Integration test: QCE → allowance → assessable profit
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| Class 1 rate (10%) | NTA 2025 First Schedule Part I, Class 1 | Resolved |
| Class 2 rate (20%) | NTA 2025 First Schedule Part I, Class 2 | Resolved |
| Class 3 rate (25%) | NTA 2025 First Schedule Part I, Class 3 | Resolved |
| Asset class definitions | NTA 2025 First Schedule Part I | Resolved |
| Balancing allowance rules | NTA 2025 s.24 + First Schedule | Unresolved — detailed balancing rules pending |
| Initial allowance | NTA 2025 | Not in scope |

## 20. Open Questions

1. Should initial allowance be supported in v2?
2. How are assets acquired before the tax year treated?
3. Should the system auto-derive QCE from the fixed asset register?
4. How are mixed-use assets (part business, part private) handled?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- `computation.ts` already implements capital allowance: `totalCapitalAllowances = sum of (qce × rate) per class`
- `mapCategoryToClass` maps expense categories to First Schedule classes
- `types.ts` defines `CapitalAllowanceInput` with `qce_by_class: Array<{ class: string; qce: string }>`
- `CapitalAllowanceRulePayload` has `rates: Record<string, string>` and `classes: Record<string, string[]>`
- Future implementation: `src/domain/tax/capital-allowances.ts` module
