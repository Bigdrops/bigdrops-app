# Tax Foundation / PSLmodels, Balaka, OpenBooks, Beancount Reference

REFERENCE ONLY — NOT STATUTORY AUTHORITY

This document is not a statutory source. The canonical NTA 2025
materials in NRS-docs/ remain the source of truth. Do not copy code
from any project. Do not adopt any project as a dependency.

## Sources

- PSLmodels/Tax-Calculator — commit 48c9c98, 2026-09-03. CCO-1.0.
- beancount/beancount — commit 9747213, 2026-08-22. GPL-2.0.
- ianberryman/OpenBooks — commit 6e1b6a1, 2026-08-03. Pre-release.
- artivisi/balaka — commit e2d257e, 2026-08-31. Apache-2.0.
- Full evidence: docs/Reports/general/tax-foundation-pslmodels-balaka-openbooks-beancount-audit-2026-09-05.md

## What each project is

- Tax-Calculator: a US federal tax microsimulation model. Research
  tool. Parameters and logic are separated; reforms are data files.
- Beancount: a plain-text double-entry bookkeeping system. The
  reference model for ledger integrity.
- OpenBooks: an AI-native double-entry accounting platform with a
  built ledger kernel. Pre-release; schema not frozen.
- Balaka: a production accounting application for Indonesian SMEs.
  Includes Indonesian tax compliance.

## Patterns to adopt

### Money

- Exact arithmetic only. OpenBooks uses branded bigint minor units with
  a no-float-money lint rule and one rounding module. Beancount and
  Balaka use Decimal and BigDecimal. Never use binary float for money.
- Round at exactly one point. Proportional splitting must be lossless.

### Journal integrity

- Append-only journals. A correction is a reversal journal with a link
  to the original (reverses_journal_id), never an edit.
- Enforce immutability at the database level where possible: the
  application user has no UPDATE or DELETE grants on journal tables.
- Separate non-negative debit and credit columns with a balance
  constraint.
- Balance assertions as checkpoints (Beancount Balance directive):
  the ledger verifies an account has the expected balance at a date.
- Idempotency keys on postings (OpenBooks, Balaka).
- Trial balance as direct aggregation. No cached balances: a balance
  cache is a second source of truth that can go stale.

### Periods

- Explicit fiscal periods with posting-time enforcement
  (assertPostable, row lock) (OpenBooks, Luca, TekVwarho, Balaka).
- Attach tax-filing markers to the fiscal period (Balaka
  taxFiledAt).

### Source documents

- Journals link back to source transactions with reference numbers and
  idempotency keys (Balaka Transaction entity).

### Tax rules

- Year-keyed parameter values with title, description, section,
  type, validators, and citation metadata (Tax-Calculator
  policy_current_law.json; OpenFisca YAML parameters).
- Historical and future regimes as data files, not code changes
  (Tax-Calculator reform files with author and reference headers).
- Formulas keyed by year of assessment.
- A computation trace per result: which rule, which parameter values,
  which period, which inputs, result per step.

## Patterns to adapt

- Database-enforced immutability via Supabase table privileges or RLS
  restrictions.
- Org-scoped composite keys become BIGDROPS entity scope plus RLS.
- Balance assertions become a periodic ledger-verification job.
- Parameter indexing: define Nigerian indexation rules from statute,
  not from US CPI logic.

## Patterns to reject

- Float money (Tax-Calculator, TaxBridge).
- The plain-text file ledger (Beancount) as the production store.
- Inferred auto-balancing postings in production posting.
- The microsimulation and aggregate-statistics orientation
  (Tax-Calculator) for operational compliance.
- Indonesian statutory tax logic (Balaka PPN, PPh) for Nigeria.
- Any pre-release code (OpenBooks) as a dependency.
- The 20% medium CIT band wherever it appears. Canonical §56 has no
  such band.

## Accounting-to-tax bridge

The bridge must be:

source transaction → journal posting → period totals → accounting
profit → tax adjustments → taxable/total profits → CIT and Development
Levy

The accounting layer produces accounting profit. The tax domain owns
every step after that. The revenue-minus-expenses shortcut is rejected.

## Nigerian statutory facts (from canonical NRS-docs)

- Small company: turnover ≤ ₦50M, fixed assets ≤ ₦250M, professional
  services excluded (§202).
- Rates: small 0%, other 30%, reducible to 25% by Order (§56).
- Development Levy: 4%, excluding small and non-resident companies
  (§59).
- Minimum ETR: 15% for €750M groups or ₦50B companies (§57).
- Total profits: assessable profits minus losses minus First Schedule
  capital allowances (§27(1)).
- Capital allowances: First Schedule, with proration for partly-used
  assets (§27(3)) and no proration below 10% non-taxable income
  (§27(4)).
- Accounting depreciation is never a substitute for statutory capital
  allowances.

## Minimum BIGDROPS foundation

Entity-scoped chart of accounts; fiscal periods with lock; balanced
journal with source-document linkage; exact money; idempotency;
reversal journals; direct-aggregation trial balance and P&L; expense
capture; tax-adjustment layer; loss register; capital-allowance
register; date-keyed Nigerian tax rules with citations; calculation
trace; compliance evidence.

## Not yet

Bank reconciliation, multi-currency, inventory, payroll/PAYE, group
accounting, budgeting, dunning, and the optional hash-chain audit
layer. None are prerequisites for a sound Nigerian SME accounting and
CIT foundation.

## Status

REFERENCE ONLY — NOT STATUTORY AUTHORITY.

Broad external repository research is closed. The next step is
BIGDROPS-native architecture design from the canonical NTA 2025 and,
once added to NRS-docs, the NTAA 2025.