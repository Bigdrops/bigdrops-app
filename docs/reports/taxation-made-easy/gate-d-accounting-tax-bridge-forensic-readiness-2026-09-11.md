# Gate D — Accounting → Tax Bridge: Forensic Readiness Audit

**Author**: OpenCode via opencode/mimo-v2-5-free
**Date**: 2026-09-11
**Classification**: READ-ONLY audit. Zero code changes.

---

## 1. Verdict

**Gate D is NOT READY. Three of seven components are MISSING FOUNDATION. Two require Gate E completion. Two are READY NOW.**

The accounting domain (Gates A–C) provides a solid posted-journal-facts foundation. The gap is the **bridge layer**: no code, no schema, no types exist to transform accounting profit into taxable profit. The Taxation-Made-Easy PRD defines this bridge conceptually but no implementation exists.

---

## 2. Current Accounting Capability

| Capability | Status | Evidence |
|---|---|---|
| Chart of Accounts | ✅ READY | 11 seed accounts, incl. 2100 VAT Control, 2200 WHT Control (`chartOfAccounts.ts`) |
| Journal Entry Posting | ✅ READY | `postEntry()` in `postingKernel.ts`, atomic via `post_accounting_entry` RPC |
| Reversal Boundary | ✅ READY | `reverseEntry()` in `postingKernel.ts`, via `reverse_accounting_entry` RPC |
| Reporting Foundation | ✅ READY | `derive_accounting_reporting` RPC, `get_accounting_period_summaries` RPC |
| Source Transactions | ✅ READY | `ingestSourceTransaction()`, `confirmSourceTransaction()` in `sourceTransactionService.ts` |
| Reconciliation | ✅ READY | `reconcile_accounting_integrity` RPC, 7 finding types |
| Remediation | ✅ V1 | `remediate_accounting_gap` RPC, scoped to disposable/test fixtures only |

**What accounting provides for tax**: Posted journal facts with balanced debits/credits, period summaries, trial balance data, and audit trail. The accounting profit (P&L balance) is derivable from reporting accounts.

---

## 3. Gate D Readiness Matrix

The bridge path: **Posted Journal Facts → Accounting Profit → Assessable Profit → Taxable Profit → CIT Payable**

| # | Component | Classification | Dependency | Existing Code |
|---|---|---|---|---|
| 1 | CIT Rate Table | **REQUIRES GATE E** | Entity-level tax config | None |
| 2 | Tax Adjustments (Disallowances) | **MISSING FOUNDATION** | Disallowable expense mapping | None |
| 3 | Assessable Profits | **MISSING FOUNDATION** | Accounting profit + adjustments | None |
| 4 | Capital Allowances | **MISSING FOUNDATION** | Asset register + computation | None |
| 5 | Loss Carry-Forward | **MISSING FOUNDATION** | Loss register + carry-forward logic | None |
| 6 | Taxable Profit (Chargeable Profits) | **MISSING FOUNDATION** | All above components | None |
| 7 | VAT/WHT Control Account Bridge | **READY NOW** | Journal facts only | Accounts 2100/2200 in seed data |

---

## 4. Detailed Classification

### 4.1 READY NOW — VAT/WHT Control Account Bridge

**What exists**: Accounts 2100 (VAT Control) and 2200 (WHT Control) are in the seed chart. Every journal entry flowing through `postEntry()` updates these control accounts. The balance represents accumulated VAT/WHT held.

**What this means**: A VAT return or WHT return can read the control account balance via `derive_accounting_reporting` or `get_accounting_period_summaries` and reconcile against filed amounts. No additional bridge code is needed — the accounting foundation is sufficient.

**Remaining work**: Only the return-filing logic (which is out of scope for Gate D).

### 4.2 REQUIRES GATE E — CIT Rate Table

**What exists**: Nothing.

**What is needed**: A `tax_obligations` or `tax_configuration` table storing per-entity CIT rate. Section 56 of NTA 2025:
- Small company: 0%
- Any other company: 30% (reducible to 25% by Presidential Order)
- Effective Tax Rate minimum: 15% (Section 57)

**Why REQUIRES GATE E**: The CIT rate depends on entity classification (small company thresholds are defined elsewhere in the Act). Entity-level tax configuration belongs to the accounting-entity domain, which Gate E establishes.

### 4.3 MISSING FOUNDATION — Tax Adjustments (Disallowances/Add-backs)

**What exists**: Nothing. The accounting domain treats all expenses as deductible for reporting purposes.

**What is needed**: A mapping layer from accounting expense accounts to disallowable/non-allowable categories per NTA 2025 Chapter Two. Key disallowables include:
- Depreciation (replaced by capital allowances)
- Fines and penalties
- Entertainment expenses (restricted)
- Gifts above threshold
- Donations above threshold
- Non-business expenses

**Implementation path**: A `tax_adjustments` table or `disallowable_expenses` mapping. The bridge function reads accounting P&L, applies the mapping, and produces assessable profit.

### 4.4 MISSING FOUNDATION — Assessable Profits

**What exists**: Accounting profit is derivable from `derive_accounting_reporting` (P&L accounts).

**What is needed**: A bridge function that takes accounting profit and applies tax adjustments to produce assessable profit. Per NTA 2025 s.27:
- Assessable profits = adjusted profits − loss deductions (s.27(6))
- Loss carried forward deducted from assessable profits of subsequent years

**Implementation path**: A `compute_assessable_profit` function that wraps accounting profit with adjustment logic.

### 4.5 MISSING FOUNDATION — Capital Allowances

**What exists**: Nothing. The accounting domain has no concept of "qualifying capital expenditure" (QCE).

**What is needed** (per NTA 2025 First Schedule Part II):
- Asset register with tax-relevant metadata (QCE, date in use, useful life, rate)
- Capital allowance computation schedules (WRVDB for plant/machinery at 25%, straight-line for buildings at 10%)
- Disposal rules (balancing adjustments)
- Residue calculations
- Transitional rules for pre-Act assets

**Key rates from NTA 2025 First Schedule**:
| Asset Class | Method | Rate |
|---|---|---|
| Plant & Machinery | WRVDB | 25% |
| Buildings (Industrial) | Straight-line | 10% |
| Agricultural Assets | Per Agriculture Schedule | Varies |
| Motor Vehicles | WRVDB | 20% |
| Furniture & Fittings | WRVDB | 20% |
| Software | WRVDB | 20% |
| Intangibles (Goodwill etc.) | Straight-line | 20% |

**Implementation path**: An asset register table + capital allowance computation engine. This is entirely new tax-domain infrastructure.

### 4.6 MISSING FOUNDATION — Loss Carry-Forward

**What exists**: Accounting period losses exist via P&L, but not "tax losses" (which may differ due to adjustments).

**What is needed** (per NTA 2025 s.27(6)):
- A `tax_losses` table tracking annual tax losses per entity
- Loss carry-forward computation (indefinite carry-forward, per s.27(6))
- Loss deduction applied against assessable profits of subsequent years
- Digital asset loss restrictions (losses only deductible against digital asset profits)

**Implementation path**: A loss register + carry-forward computation function.

### 4.7 MISSING FOUNDATION — Taxable Profit & CIT Payable

**What exists**: Nothing.

**What is needed**: The final computation that ties everything together:
- Chargeable profits = assessable profits − capital allowances (s.71(1))
- CIT payable = chargeable profits × CIT rate
- Effective Tax Rate recomputation if ETR < 15% (s.57)

**Implementation path**: A `tax_computation` table storing per-period computations. This is the culmination of the entire bridge.

---

## 5. Existing Models To Reuse

| Model | Location | Reuse For |
|---|---|---|
| `AccountGroup` seed (2100, 2200) | `chartOfAccounts.ts` | VAT/WHT control accounts |
| `postEntry()` / `reverseEntry()` | `postingKernel.ts` | Tax adjustment journal entries |
| `derive_accounting_reporting` RPC | Reporting foundation | Accounting profit extraction |
| `get_accounting_period_summaries` RPC | Reporting foundation | Period-level P&L data |
| `reconcile_accounting_integrity` RPC | Reconciliation service | Tax-accounting reconciliation |
| `AccountingPeriod` type | `types.ts` | Period lifecycle (open/closed) |
| `Decimal` precision (20, 2) | `money.ts` | Tax computations |

---

## 6. Missing Foundations (Summary)

| # | Foundation | Effort | Blocks |
|---|---|---|---|
| 1 | Disallowable expense mapping | Medium | Assessable profits |
| 2 | Asset register (QCE metadata) | Large | Capital allowances |
| 3 | Capital allowance computation engine | Large | Taxable profit |
| 4 | Tax loss register | Medium | Loss carry-forward |
| 5 | Tax computation table | Medium | CIT payable |
| 6 | CIT rate configuration | Small | CIT payable |
| 7 | Bridge function (accounting → tax) | Large | All tax outputs |

---

## 7. Gate E Dependencies

| Dependency | Why |
|---|---|
| Entity configuration model | CIT rate varies by entity type (small company vs. standard) |
| Entity lifecycle management | Tax obligations tied to entity registration/deregistration |
| Multi-entity isolation | Tax computations must be entity-scoped |
| Accounting period finalization | Tax computations require closed/verified periods |

---

## 8. Recommended Implementation Order

```
Phase 2a: Foundation Layer
├── 2a.1: Disallowable expense mapping table + types
├── 2a.2: Asset register table + types (QCE metadata)
├── 2a.3: Tax loss register table + types
└── 2a.4: CIT rate configuration (entity-level)

Phase 2b: Computation Layer
├── 2b.1: Capital allowance computation engine
├── 2b.2: Loss carry-forward computation
├── 2b.3: Assessable profit bridge function
└── 2b.4: Taxable profit + CIT payable computation

Phase 2c: Integration Layer
├── 2c.1: Tax return data extraction (VAT/WHT control accounts)
├── 2c.2: Tax-accounting reconciliation
└── 2c.3: Tax computation audit trail
```

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| No asset register exists | Cannot compute capital allowances | Build QCE register as first priority |
| No disallowable mapping | Cannot compute assessable profit | Map accounting accounts to NTA categories |
| NTA 2025 transitional rules complex | Pre-Act asset treatment unclear | Start with post-Act assets only |
| Loss carry-forward has no expiry | Historical loss tracking needed | Design register for indefinite accumulation |
| Entity-level CIT config depends on Gate E | Cannot compute final CIT payable | Design as configurable, not hardcoded |

---

## 10. Verification

```
Pre-audit git status: 96 modified files (all pre-existing from other agents)
Post-audit git status: 96 modified files (unchanged — zero code changes made)
```

**Audit method**: Read-only codebase inspection + NTA 2025 statutory text analysis. No hosted database queries. No SQL execution. No application code modifications.

---

## 11. Key Statutory References

| Section | NTA 2025 | Relevance |
|---|---|---|
| s.27 | Total profits of companies | Core formula: assessable profits − losses − capital allowances |
| s.56 | Rate of tax for companies | 30% (or 0% for small companies, 25% by Presidential Order) |
| s.57 | Effective Tax Rate | Minimum 15% ETR |
| s.70 | Assessable profits and losses | Loss carry-forward rules |
| s.71 | Chargeable profits and allowances | Capital allowances deduction |
| First Schedule Part II | Capital allowances | Asset classes, rates, WRVDB, straight-line, disposal rules |
| s.27(6) | Loss deductions | Indefinite carry-forward, trade-specific |
