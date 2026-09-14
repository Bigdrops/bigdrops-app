# Fixed-Assets-Depreciation PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Business Activity → Record → Expense (Capital) → **Fixed Assets & Depreciation** → Accounting Source Transaction → Journal

---

## 1. Objective

Define the fixed asset register and accounting depreciation model. This PRD covers asset acquisition, classification, depreciation methods, asset lifecycle, and the accounting depreciation journal — distinct from tax capital allowances (see Capital-Allowances-PRD).

## 2. Problem Statement

Fixed assets are capital expenditures that provide economic benefit across multiple periods. Without a structured fixed asset register:
- Accounting depreciation cannot be calculated or posted
- Asset book value cannot be tracked
- Disposal gains/losses cannot be determined
- The capital allowance computation lacks the asset cost base
- Total fixed assets for small-company classification (s.202) cannot be derived

## 3. Scope

- Fixed asset record creation (from capital expense)
- Asset classification (by NTA First Schedule class)
- Accounting depreciation (straight-line, reducing balance)
- Accumulated depreciation tracking
- Asset disposal and gain/loss calculation
- Book value reporting
- Entity-scoped asset isolation

## 4. Non-Scope

- Tax capital allowances (see Capital-Allowances-PRD — separate computation)
- Asset revaluation (IFRS revaluation model)
- Impairment / impairment reversal
- Lease accounting (IFRS 16)
- Asset tagging / physical inventory management
- Asset maintenance scheduling
- Depreciation override / manual adjustment

## 5. Product Model

### 5.1 Fixed Asset Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `name` | text | yes | Asset description |
| `account_code` | text | yes | Fixed asset account (chart of accounts) |
| `accumulated_depreciation_account` | text | yes | Contra-asset account |
| `expense_account` | text | yes | Depreciation expense account |
| `acquisition_date` | date | yes | Date asset was acquired |
| `acquisition_cost` | numeric(18,2) | yes | Original cost (exact decimal) |
| `salvage_value` | numeric(18,2) | yes | Estimated residual value |
| `useful_life_years` | integer | yes | Estimated useful life in years |
| `depreciation_method` | enum | yes | `straight_line` / `reducing_balance` |
| `classification` | enum | yes | NTA First Schedule class: `class_1` / `class_2` / `class_3` |
| `status` | enum | yes | `active` / `fully_depreciated` / `disposed` |
| `disposed_date` | date | no | Date of disposal |
| `disposal_proceeds` | numeric(18,2) | no | Amount received on disposal |
| `created_at` | timestamptz | auto | Creation timestamp |

### 5.2 Depreciation Calculation

**Straight-Line Method:**
```
annual_depreciation = (acquisition_cost - salvage_value) / useful_life_years
monthly_depreciation = annual_depreciation / 12
```

**Reducing Balance Method:**
```
annual_depreciation = book_value × (2 / useful_life_years)
monthly_depreciation = annual_depreciation / 12
```

Where `book_value = acquisition_cost - accumulated_depreciation`

### 5.3 NTA First Schedule Classification

| Class | Rate | Assets |
|-------|------|--------|
| Class 1 | 10% | Buildings, agricultural structures, masts, intangible assets, heavy transport |
| Class 2 | 20% | Plant & machinery, agricultural equipment, furniture, mining, other equipment |
| Class 3 | 25% | Motor vehicles, software, other capital assets |

Note: Classification is for tax capital allowances. Accounting depreciation uses useful life, not statutory rates.

### 5.4 Depreciation Journal Entry

Monthly depreciation creates a balanced journal entry:
```
Dr Depreciation Expense (expense_account)  = monthly_depreciation
  Cr Accumulated Depreciation (contra_account)  = monthly_depreciation
```

## 6. Data / Domain Model

### 6.1 Relationships

```
Fixed Asset
  ├── belongs to Entity (entity_id)
  ├── created from Expense Entry (capital category)
  ├── generates Depreciation Entries (monthly)
  ├── generates Disposal Journal (on disposal)
  └── feeds Capital Allowance computation (via acquisition_cost + classification)
```

### 6.2 Status Lifecycle

```
active → fully_depreciated
active → disposed
```

- `active`: depreciation running
- `fully_depreciated`: book value = salvage value, no more depreciation
- `disposed`: asset sold/scrapped, disposal journal posted

### 6.3 Accumulated Depreciation

Running total of all depreciation posted. Never decreases except on disposal.
- `book_value = acquisition_cost - accumulated_depreciation`
- Depreciation stops when `book_value <= salvage_value`

## 7. Lifecycle

1. User creates fixed asset from capital expense (or directly)
2. System records acquisition cost, useful life, method, classification
3. Monthly: system calculates depreciation for each active asset
4. System creates depreciation journal entry (Dr Expense, Cr Accumulated Depreciation)
5. On disposal: system calculates gain/loss, creates disposal journal
6. Asset status transitions to `disposed`

## 8. Accounting Boundary

- Fixed assets are balance sheet items (asset accounts)
- Accumulated depreciation is a contra-asset (reduces asset value)
- Depreciation expense hits the income statement
- Disposal gain/loss: `proceeds - book_value` → gain (revenue) or loss (expense)
- All amounts are exact decimal strings (NUMERIC(18,2))

## 9. Tax Boundary

- Accounting depreciation ≠ tax capital allowances
- Accounting depreciation: management policy, useful life based
- Tax capital allowances: statutory rates, First Schedule classification
- Both operate on the same acquisition cost base
- Depreciation is added back in tax adjustments; capital allowances are deducted

## 10. Provenance / Auditability

- Each asset has a creation timestamp and acquisition source
- Monthly depreciation entries trace to asset record
- Disposal entries trace to asset + disposal event
- Accumulated depreciation is a running audit of total depreciation claimed

## 11. Entity / Tenant Isolation

- All asset records scoped by `entity_id`
- Entity isolation enforced at query level
- Cross-entity asset queries forbidden

## 12. Calculation Rules

- Depreciation: Decimal.js (precision 20, ROUND_HALF_UP)
- Monthly depreciation = annual / 12
- Depreciation capped at: `book_value - salvage_value` (never below salvage)
- Disposal gain/loss: `proceeds - book_value` (can be negative)
- No partial-year pro-ration in v1 (full month if acquired in month)

## 13. Immutability / Reversal Rules

- Posted depreciation entries are immutable
- Monthly depreciation runs are idempotent (same month → same result)
- Disposal is irreversible — creates final journal entry
- Correcting depreciation errors: post adjustment entry (not void)

## 14. UX Requirements

- Asset creation form: name, cost, date, useful life, method, classification
- Asset list view with book value, accumulated depreciation, status
- Monthly depreciation run (batch or per-asset)
- Disposal form with proceeds, date, gain/loss preview
- Asset detail view with depreciation schedule

## 15. Edge Cases

| Case | Handling |
|------|----------|
| Asset cost = salvage value | No depreciation — immediately fully depreciated |
| Useful life = 0 | Reject — must be positive |
| Disposal proceeds > book value | Gain (credit to gain account) |
| Disposal proceeds < book value | Loss (debit to loss account) |
| Disposal proceeds = book value | No gain or loss |
| Depreciation exceeds book value | Cap at book_value - salvage_value |
| Two assets with same name | Allow — distinguished by ID |
| Asset acquired in current month | Full month depreciation in acquisition month |

## 16. Dependencies

- Expense Module: capital expenses create fixed assets
- Chart of Accounts: asset, contra-asset, expense accounts must exist
- Period Management: depreciation runs per open period
- Tax Capital Allowances: same cost base, different computation

## 17. Acceptance Criteria

- [ ] Fixed asset record can be created with all required fields
- [ ] Straight-line depreciation calculates correctly
- [ ] Reducing-balance depreciation calculates correctly
- [ ] Monthly depreciation creates balanced journal entry
- [ ] Depreciation stops at salvage value
- [ ] Disposal calculates gain/loss correctly
- [ ] Accumulated depreciation tracks running total
- [ ] Asset status transitions correctly (active → fully_depreciated / disposed)
- [ ] Entity isolation prevents cross-entity asset access

## 18. Verification Requirements

- Unit test: straight-line depreciation calculation
- Unit test: reducing-balance depreciation calculation
- Unit test: depreciation cap at salvage value
- Unit test: disposal gain/loss calculation
- Unit test: monthly idempotency
- Integration test: asset creation → depreciation → disposal lifecycle
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| Depreciation methods | Accounting standard (IAS 16) | Resolved — standard methods |
| NTA First Schedule classes | NTA 2025 First Schedule Part I | Resolved — classes defined |
| Asset disposal treatment | NTA 2025 s.27(2) | Unresolved — disposal gains/losses CIT treatment pending |
| Small company fixed asset threshold | NTA 2025 s.202 | Resolved — ₦250M threshold |

## 20. Open Questions

1. Should partial-year pro-ration be supported in v2?
2. Should asset revaluation be supported (IFRS revaluation model)?
3. How are group assets (e.g., 10 identical laptops) handled — individual records or aggregated?
4. Should the system auto-create fixed assets from capital expenses above a threshold?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- Current codebase has no fixed asset domain module
- `chartOfAccounts.ts` references "fixed assets" in comments but has no asset accounts
- `total_fixed_assets` field exists in tax classification facts — needs a source
- Future implementation: `src/domain/fixed-assets/` module
- Capital allowances PRD references asset cost base from this module
