# Expense-Money-Out PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Business Activity → Record → **Expense (Money Out)** → Accounting Source Transaction → Journal

---

## 1. Objective

Define the expense capture surface — the minimum data a user must provide to record money leaving the business. This PRD covers expense entry, categorisation, receipt attachment, and the accounting source transaction that feeds the journal.

## 2. Problem Statement

Expenses are the primary money-out event in the accounting cycle. Without a structured expense capture surface, the system cannot:
- Derive accounting profit for tax computation
- Enforce QCE (Qualifying Capital Expenditure) eligibility rules
- Apply tax-adjustment classifications (deductible vs. non-deductible vs. restricted)
- Produce a complete trial balance

## 3. Scope

- Expense entry creation (manual, receipt-based)
- Expense categorisation (operational, capital, personal, non-deductible)
- Receipt attachment (image upload, file reference)
- Expense-to-journal source transaction creation
- Expense period assignment (accounting period validation)
- Entity-scoped expense isolation

## 4. Non-Scope

- Accounts payable workflow (bill → approval → payment)
- Recurring expense templates
- Multi-currency expense conversion
- Expense reimbursement workflows
- Travel & expense policy enforcement
- Bank reconciliation (separate module)

## 5. Product Model

### 5.1 Expense Entry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Accounting period (e.g., `2026-01`) |
| `transaction_date` | date | yes | Date expense occurred |
| `amount` | numeric(18,2) | yes | Exact decimal amount in base currency |
| `category` | enum | yes | `operational` / `capital` / `personal` / `non_deductible` |
| `description` | text | yes | Free-text description |
| `vendor_name` | text | no | Payee name |
| `receipt_url` | text | no | File storage reference |
| `account_code` | text | yes | Target expense account (chart of accounts) |
| `status` | enum | yes | `draft` / `posted` / `voided` |
| `created_at` | timestamptz | auto | Creation timestamp |
| `updated_at` | timestamptz | auto | Last modification timestamp |

### 5.2 Expense Categories

| Category | Tax Treatment | Journal Effect |
|----------|---------------|----------------|
| `operational` | Deductible expense (full) | Dr Expense Account, Cr Cash/Bank |
| `capital` | QCE — capital allowance eligible | Dr Fixed Asset Account, Cr Cash/Bank |
| `personal` | Non-deductible (add-back) | Dr Owner's Draw, Cr Cash/Bank |
| `non_deductible` | Non-deductible (add-back) | Dr Expense Account, Cr Cash/Bank |

### 5.3 Accounting Source Transaction

The expense creates a source transaction that feeds the journal entry:
- `source_type`: `'expense'`
- `source_id`: expense entry UUID
- Lines follow double-entry rules per category

## 6. Data / Domain Model

### 6.1 Relationships

```
Expense Entry
  ├── belongs to Entity (entity_id)
  ├── belongs to Accounting Period (period_code)
  ├── creates Source Transaction → Journal Entry
  ├── optionally has Receipt (file reference)
  └── feeds Tax Adjustments (via category classification)
```

### 6.2 Status Lifecycle

```
draft → posted → voided
```

- `draft`: editable, not posted to journal
- `posted`: immutable, journal entry exists
- `voided`: reversed via journal reversal (see Block-A reversal spec)

## 7. Lifecycle

1. User creates expense entry with amount, category, account, period
2. System validates period is open (`state = 'open'`)
3. System validates account exists and is active in chart of accounts
4. On post: system creates source transaction + journal entry (Dr/Cr)
5. Journal entry follows `createJournalEntry` factory pattern
6. Expense status transitions `draft → posted`
7. Expense is now immutable — corrections use void + new entry

## 8. Accounting Boundary

- Expenses create journal entries through the accounting persistence layer
- Expense amounts are exact decimal strings (NUMERIC(18,2))
- Expense account codes must exist in the chart of accounts
- Period validation: expenses can only post to open periods
- Reversal uses the Block-A reversal pattern (linked correcting entries)

## 9. Tax Boundary

- `operational` expenses → deductible → appear as negative in tax adjustment
- `capital` expenses → QCE → feed capital allowance calculation
- `personal` / `non_deductible` → permanent add-back in tax adjustment
- Expense categorisation drives tax treatment — misclassification = incorrect tax position

## 10. Provenance / Auditability

- Every posted expense has a source transaction linking to the journal entry
- Journal entry traces to period + source (see reporting.ts `ReportingSourceTraceRow`)
- Expense status transitions are logged with timestamps
- Voided expenses retain original data — reversal is a new entry, not mutation

## 11. Entity / Tenant Isolation

- All expense records scoped by `entity_id`
- Entity isolation enforced at query level (see multi-tenancy-alignment.md)
- Cross-entity expense queries forbidden

## 12. Calculation Rules

- Expense amounts: exact decimal (Decimal.js, precision 20, ROUND_HALF_UP)
- Journal line amounts = expense amount (no transformation at entry)
- Tax adjustment derived from category, not re-calculated from amount
- Capital expense → QCE amount carried to capital allowance computation

## 13. Immutability / Reversal Rules

- Posted expenses are immutable
- Void = journal reversal (Dr ↔ Cr flipped, linked via `reversal_of_entry_id`)
- Voided expenses remain queryable for audit trail
- New expense entry required for corrections

## 14. UX Requirements

- Expense entry form: amount, category selector, account selector, period, date, description
- Receipt upload (optional, image or PDF)
- Expense list view with status, amount, category, date filters
- Void action with confirmation dialog
- Mobile-first responsive layout (Tailwind CSS)

## 15. Edge Cases

| Case | Handling |
|------|----------|
| Expense posted to closed period | Reject with error |
| Expense amount = 0 | Reject — zero-value expenses not allowed |
| Capital expense with no fixed asset account | Warn, require account selection |
| Receipt upload fails | Save expense without receipt, flag for retry |
| Period has no opening balance | Allow — expense does not require opening balance |
| Expense category changed after posting | Void + re-enter (no in-place edit) |

## 16. Dependencies

- Accounting Foundation (Block-A): journal entry factory, period management
- Chart of Accounts: expense accounts must exist (codes 5000+)
- Period Management: period must be open for posting
- Multi-Tenancy: entity isolation layer

## 17. Acceptance Criteria

- [ ] Expense entry can be created with all required fields
- [ ] Posted expense creates balanced journal entry (debits = credits)
- [ ] Period validation rejects expenses to closed periods
- [ ] Capital expense category flags entry for QCE processing
- [ ] Personal / non-deductible categories generate tax adjustment entries
- [ ] Voided expense produces reversal journal entry
- [ ] Entity isolation prevents cross-entity expense access
- [ ] All monetary values stored as exact decimal strings

## 18. Verification Requirements

- Unit test: expense creation with valid data
- Unit test: journal entry balance check (dr = cr)
- Unit test: period validation (open/closed)
- Unit test: category → tax treatment mapping
- Unit test: void produces reversal entry
- Integration test: expense → journal → trial balance consistency
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| Expense deductibility rules | NTA 2025 s.24 (deductions) | Unresolved — full deduction rules pending |
| Capital expenditure treatment | NTA 2025 First Schedule Part I | Addressed in Capital-Allowances-PRD |
| Non-deductible add-backs | NTA 2025 s.24(1)-(5) | Unresolved — specific add-back list pending |
| Receipt requirement | Not statutory | Business rule |

## 20. Open Questions

1. Should expense entry support split transactions (one payment → multiple categories)?
2. Is receipt upload mandatory for expenses above a threshold?
3. Should capital expenses auto-create fixed asset records?
4. How do expense categories map to the chart of accounts code ranges?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- Current codebase has no dedicated expense domain module
- `NewTaxComputation.tsx` collects expenses as a single numeric input — not structured
- Expense capture surface must precede structured tax input design
- Future implementation: `src/domain/expense/` module + `src/pages/expenses/` pages
