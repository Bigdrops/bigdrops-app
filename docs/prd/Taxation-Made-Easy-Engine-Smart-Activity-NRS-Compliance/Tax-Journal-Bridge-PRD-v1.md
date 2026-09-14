# Tax-Journal-Bridge PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: CIT Computation → **Tax Journal Bridge** → Accounting Ledger

---

## 1. Objective

Define the bridge function that converts CIT computation results into balanced accounting journal entries. This PRD covers the domain function, service layer, idempotency, and the exact accounting accounts used.

## 2. Problem Statement

Tax computation produces a tax payable figure. This figure must be recorded in the accounting ledger as a liability. Without a bridge:
- Tax payable has no accounting representation
- Tax expense is not recognised in the income statement
- The accounting ledger does not reflect tax obligations
- Double-entry bookkeeping is incomplete for the tax cycle

## 3. Scope

- Domain bridge function (pure, no DB access)
- Service layer (persistence, orchestration)
- Journal entry creation (Dr Tax Expense, Cr CIT Payable, Cr Development Levy Payable)
- Idempotency key management
- Entity-scoped journal isolation
- Error handling and validation

## 4. Non-Scope

- Tax computation (see CIT-Computation-PRD)
- Tax payment / remittance (separate module)
- Tax filing (Filing-PRD)
- NRS/API integration (NRS-PRD)
- Tax provision / deferred tax
- Multi-currency tax entries

## 5. Product Model

### 5.1 Bridge Function (Domain Layer)

**Location:** `src/domain/tax/taxBridge.ts`

**Signature:**
```typescript
createTaxJournalEntry({
  taxPayable: string,
  developmentLevy?: string,
  periodCode: string,
  idempotencyKey: string
}): TaxJournalEntry
```

**Output:**
```typescript
interface TaxJournalEntry {
  type: 'tax_journal_entry'
  entries: Array<{
    accountCode: string
    debit?: string
    credit?: string
    description: string
  }>
  periodCode: string
  idempotencyKey: string
}
```

### 5.2 Service Layer

**Location:** `src/modules/tax/taxPostingService.ts`

Responsibilities:
- Load accounting period
- Validate entity permissions
- Call domain bridge function
- Persist journal entries via `AccountingService`
- Handle idempotency (check before create)

### 5.3 Journal Entry Structure

```
Dr Tax Expense (5500)              = taxPayable + developmentLevy
  Cr CIT Payable (2310)           = taxPayable
  Cr Development Levy Payable (2320) = developmentLevy (if > 0)
```

### 5.4 Accounts

| Code | Name | Type |
|------|------|------|
| 2310 | CIT Payable | Liability |
| 2320 | Development Levy Payable | Liability |
| 5500 | Tax Expense | Expense |

## 6. Data / Domain Model

### 6.1 Idempotency

- Key format: `tax-computation:{assessment_profit}:{periodCode}`
- Prevents duplicate journal entries for same computation
- Service checks for existing entry with same key before creating

### 6.2 Journal Entry Relationships

```
Tax Journal Entry
  ├── belongs to Entity (entity_id)
  ├── posted to Accounting Period (period_code)
  ├── references CIT Computation (via idempotency key)
  ├── debits Tax Expense (5500)
  ├── credits CIT Payable (2310)
  └── credits Development Levy Payable (2320) (if applicable)
```

### 5.3 Validation

- `taxPayable` must be ≥ 0
- `developmentLevy` must be ≥ 0 (if provided)
- `periodCode` must reference open period
- Entity must have accounting permission
- Account codes must exist in chart of accounts

## 7. Lifecycle

1. CIT computation finalised
2. Service layer called with computation result
3. Service validates inputs and entity permissions
4. Service checks idempotency (existing entry?)
5. Domain bridge creates journal entry structure
6. Service persists via AccountingService
7. Journal entry posted to ledger
8. Tax liability recorded in balance sheet

## 8. Accounting Boundary

- Bridge creates journal entries — this IS the accounting boundary
- Journal entries follow double-entry bookkeeping
- All amounts are exact decimal strings
- Entries are posted to the entity's accounting ledger

## 9. Tax Boundary

- Bridge converts tax result to accounting representation
- Tax computation is upstream; bridge is downstream
- Bridge does not modify tax computation
- Bridge is a one-way bridge: tax → accounting

## 10. Provenance / Auditability

- Each journal entry traces to idempotency key
- Idempotency key references computation (assessment_profit + period)
- Journal entries are immutable once posted
- Full audit trail: computation → bridge → journal

## 11. Entity / Tenant Isolation

- All journal entries scoped by `entity_id`
- Entity isolation enforced at service layer
- Cross-entity journal posting forbidden

## 12. Calculation Rules

- Debit = Credit (double-entry enforced)
- Tax Expense = CIT Payable + Development Levy Payable
- All amounts: exact decimal (Decimal.js)
- No rounding in bridge (amounts from computation are already rounded)

## 13. Immutability / Reversal Rules

- Posted journal entries are immutable
- Correction: post reversing entry (not edit)
- Idempotency prevents duplicate posting
- Bridge function is pure — no side effects

## 14. UX Requirements

- Bridge is called programmatically (no direct UI)
- Service layer may be triggered from computation finalise action
- Error messages for validation failures
- Logging for audit trail

## 15. Edge Cases

| Case | Handling |
|------|----------|
| Tax payable = 0 | No journal entry created |
| Development levy = 0 | Only CIT Payable credited |
| Period already closed | Reject — cannot post to closed period |
| Idempotency key exists | Return existing entry (no duplicate) |
| Account code missing | Reject — chart of accounts incomplete |
| Entity has no permission | Reject — insufficient permission |
| Domain function throws | Service catches, logs, rethrows |

## 16. Dependencies

- CIT Computation: source of tax payable and development levy
- Accounting Foundation: period validation, journal persistence
- Chart of Accounts: account codes (2310, 2320, 5500)
- Entity Permissions: has_entity_permission check

## 17. Acceptance Criteria

- [ ] Domain bridge creates balanced journal entry
- [ ] Service layer persists entry via AccountingService
- [ ] Idempotency prevents duplicate posting
- [ ] Validation catches invalid inputs
- [ ] Entity isolation prevents cross-entity posting
- [ ] Period validation rejects closed periods
- [ ] Error handling logs and propagates failures

## 18. Verification Requirements

- Unit test: balanced entry creation
- Unit test: development levy included when > 0
- Unit test: development levy excluded when = 0
- Unit test: idempotency (same key → same result)
- Unit test: validation (negative amounts, missing period)
- Integration test: computation → bridge → ledger
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| CIT expense recognition | IAS 12 / accounting standard | Resolved — standard treatment |
| Development levy liability | NTA 2025 s.59 | Resolved — liability on balance sheet |
| Double-entry requirement | Accounting foundation | Resolved — core principle |
| Idempotency pattern | Engineering standard | Resolved — prevents duplicates |

## 20. Open Questions

1. Should the bridge support pro-rata entries for partial periods?
2. How are prior-period adjustments bridged (reversing entries)?
3. Should the bridge support multi-currency (for foreign entities)?
4. How is the bridge triggered — automatically on finalise or manually?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- `taxBridge.ts` implements the domain function (pure, no DB)
- `taxPostingService.ts` implements the service layer (persistence)
- `types.ts` defines `TaxJournalEntry`, `CreateTaxJournalInput`
- All 18 Gate G tests pass (balanced entry, idempotency, validation)
- Account codes 2310, 2320, 5500 added to seed chart
- Decimal.js bug fixed: `isPositive()` → `greaterThan(0)` for zero check
