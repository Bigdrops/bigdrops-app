# Tax-Adjustments PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Accounting Profit → **Tax Adjustments** → Adjusted Profit

---

## 1. Objective

Define the tax adjustment layer that transforms accounting profit into adjusted profit for tax computation. This PRD covers the classification, recording, and application of permanent and temporary differences between accounting treatment and tax treatment.

## 2. Problem Statement

Accounting profit (per IFRS/IAS) does not equal taxable profit (per NTA 2025). Without a structured adjustment layer:
- Accounting profit cannot be reliably transformed to adjusted profit
- Non-deductible expenses cannot be systematically identified
- Tax-exempt income cannot be excluded from the tax base
- Capital allowances cannot be substituted for accounting depreciation
- Loss utilisation cannot be applied against the correct profit figure

## 3. Scope

- Tax adjustment entry creation (manual and auto-derived)
- Adjustment classification: `permanent_add_back`, `permanent_exemption`, `temporary_timing`
- Adjustment mapping to expense categories
- Adjustment period assignment
- Adjustment-to-adjusted-profit pipeline
- Entity-scoped adjustment isolation

## 4. Non-Scope

- Tax computation (see CIT-Computation-PRD)
- Loss register (see Loss-Register-PRD)
- Capital allowances (see Capital-Allowances-PRD)
- Tax filing (separate module)
- Journal entry creation for adjustments (adjustments modify the tax computation, not the accounting journal)

## 5. Product Model

### 5.1 Tax Adjustment Entry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Tax period |
| `adjustment_type` | enum | yes | `permanent_add_back` / `permanent_exemption` / `temporary_timing` |
| `category` | text | yes | Source category (maps to expense type) |
| `description` | text | yes | Reason for adjustment |
| `amount` | numeric(18,2) | yes | Adjustment amount (positive = add to profit, negative = reduce) |
| `source_entry_id` | uuid | no | FK to source expense entry (if auto-derived) |
| `status` | enum | yes | `draft` / `finalized` |
| `created_at` | timestamptz | auto | Creation timestamp |

### 5.2 Adjustment Types

| Type | Effect on Profit | Example |
|------|------------------|---------|
| `permanent_add_back` | Increases adjusted profit | Non-deductible entertainment, fines, penalties |
| `permanent_exemption` | Decreases adjusted profit | Tax-exempt income, dividend income |
| `temporary_timing` | Timing difference (deferred tax) | Accelerated depreciation vs. straight-line |

### 5.3 Adjustment Application Pipeline

```
Accounting Profit
  + Σ(permanent_add_back amounts)  → increases profit
  - Σ(permanent_exemption amounts) → decreases profit
  ± Σ(temporary_timing amounts)    → timing differences
  = Adjusted Profit
```

## 6. Data / Domain Model

### 6.1 Relationships

```
Tax Adjustment
  ├── belongs to Entity (entity_id)
  ├── belongs to Tax Period (period_code)
  ├── optionally references Source Expense (source_entry_id)
  └── feeds Adjusted Profit → Capital Allowances → Assessable Profit
```

### 6.2 Adjustment Categories (NTA 2025)

| Category | NTA Reference | Treatment |
|----------|---------------|-----------|
| Non-deductible entertainment | s.24(1) | Permanent add-back |
| Fines and penalties | s.24(1) | Permanent add-back |
| Gifts above threshold | s.24(2) | Permanent add-back |
| Depreciation (accounting) | s.24 + First Schedule | Permanent add-back (replaced by capital allowances) |
| Tax-exempt income | Various exemptions | Permanent exemption |
| Interest income (certain) | s.24(3) | Permanent exemption |

### 6.3 Status Lifecycle

```
draft → finalized
```

- `draft`: editable
- `finalized`: frozen, used in computation

## 7. Lifecycle

1. System derives adjustments from expense categories (auto)
2. User reviews and adds manual adjustments
3. Adjustments are finalised for the period
4. Computation engine applies adjustments to accounting profit
5. Result: adjusted profit for capital allowance deduction

## 8. Accounting Boundary

- Tax adjustments do NOT create journal entries
- Tax adjustments modify the tax computation only
- Accounting profit remains unchanged by tax adjustments
- This is the key boundary: accounting ≠ tax

## 9. Tax Boundary

- Adjustments bridge accounting → tax
- `permanent_add_back`: non-deductible expenses deducted in accounting, added back for tax
- `permanent_exemption`: income included in accounting, exempt from tax
- `temporary_timing`: timing differences (deferred tax not in scope for CIT)

## 10. Provenance / Auditability

- Each adjustment records its source (auto-derived or manual)
- Auto-derived adjustments link to source expense entry
- Manual adjustments record description and rationale
- Finalised adjustments are frozen for the period

## 11. Entity / Tenant Isolation

- All adjustment records scoped by `entity_id`
- Entity isolation enforced at query level
- Cross-entity adjustment queries forbidden

## 12. Calculation Rules

- Amounts: exact decimal (Decimal.js, precision 20, ROUND_HALF_UP)
- Add-backs: positive amount (increase profit)
- Exemptions: negative amount (decrease profit)
- Net adjustment = Σ(all amounts)
- Adjusted profit = accounting profit + net adjustment

## 13. Immutability / Reversal Rules

- Finalised adjustments are immutable
- Correction: create new adjustment (not edit)
- Period adjustments cannot be changed after computation finalised

## 14. UX Requirements

- Adjustment list view with type, category, amount, status
- Adjustment entry form (manual)
- Auto-derived adjustments shown with source link
- Finalise button with confirmation
- Mobile-first responsive layout

## 15. Edge Cases

| Case | Handling |
|------|----------|
| No adjustments for period | Adjusted profit = accounting profit |
| Adjustment amount = 0 | Reject — zero adjustments not allowed |
| Adjustment exceeds accounting profit | Allow — can produce negative adjusted profit |
| Source expense voided | Auto-derived adjustment removed or flagged |
| Computation already finalised | Reject new adjustments for period |
| Multiple adjustments same category | Allow — each is a separate entry |

## 16. Dependencies

- Accounting Foundation: accounting profit derivation
- Expense Module: source entries for auto-derived adjustments
- Period Management: period must be open
- Tax Rules Engine: adjustment categories from rule snapshot

## 17. Acceptance Criteria

- [ ] Adjustment entry can be created with all required fields
- [ ] Auto-derived adjustments map expense categories correctly
- [ ] Permanent add-backs increase adjusted profit
- [ ] Permanent exemptions decrease adjusted profit
- [ ] Net adjustment applied correctly to accounting profit
- [ ] Finalised adjustments are immutable
- [ ] Entity isolation prevents cross-entity adjustment access

## 18. Verification Requirements

- Unit test: add-back increases profit
- Unit test: exemption decreases profit
- Unit test: net adjustment calculation
- Unit test: finalised adjustment immutability
- Integration test: expense → adjustment → adjusted profit pipeline
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| Non-deductible expense categories | NTA 2025 s.24(1)-(5) | Unresolved — full list pending |
| Tax-exempt income types | NTA 2025 various sections | Unresolved — specific exemptions pending |
| Depreciation add-back requirement | NTA 2025 s.24 + First Schedule | Resolved — depreciation not deductible |
| Timing difference rules | NTA 2025 | Unresolved — deferred tax scope pending |

## 20. Open Questions

1. Should the system auto-generate all adjustments from expenses, or require user confirmation?
2. Is deferred tax (temporary timing differences) in scope for CIT v1?
3. How are adjustments handled for prior-period corrections?
4. Should adjustments have a review/approval workflow?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- `computation.ts` already implements adjustment logic: `adj.category === 'non_deductible' || adj.category === 'expense'` → add-back
- `types.ts` defines `TaxAdjustment` with `category: 'deductible' | 'non_deductible' | 'exempt' | 'capital_expense' | 'expense'`
- Current adjustment categories in code are simplified — PRD defines full NTA taxonomy
- Future implementation: `src/domain/tax/adjustments.ts` module
