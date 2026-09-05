# TekVwarho-ProAudit Nigeria Tax Reference

REFERENCE ONLY — NOT STATUTORY AUTHORITY

This document is not a statutory source. The canonical NTA 2025 materials
in NRS-docs/ remain the source of truth. Do not copy TekVwarho source
code. TekVwarho is licensed as Proprietary.

## Source

- Repository: EfeObus/TekVwarho-ProAudit
- Inspected: commit 2c9d905, 2026-01-30, version 0.1.0
- Stack: Python 3.11, FastAPI, SQLAlchemy async, PostgreSQL, Alembic
- License: Proprietary
- Full evidence: docs/Reports/general/tekvwarho-proaudit-nigeria-tax-architecture-audit-2026-09-05.md

## Why this reference exists

The BIGDROPS CIT readiness audit found no accounting foundation.
TekVwarho demonstrates a complete double-entry accounting layer at source
level. Its accounting architecture is the reusable part. Its Nigerian tax
values are not.

## Accounting architecture worth borrowing

- Chart of accounts scoped per business entity, with parent hierarchy and
  normal balance.
- Fiscal periods with OPEN, PENDING_CLOSE, CLOSED, LOCKED, and REOPENED
  states, and a bank-reconciliation gate before close.
- Journal entries with a database constraint that total debits equal total
  credits.
- Corrections by reversal: POSTED, REVERSED, and VOIDED states with links
  between original and reversal entries.
- Approval workflow on journal entries.
- Source-document linkage: module, document type, document id, reference.
- Decimal arithmetic with Numeric(18,2) storage.
- A SHA-256 hash-chained ledger as an optional stronger audit pattern.
  The core principle is an append-only journal. The hash chain is an
  integrity enhancement, not a requirement.

## Tax values that must NOT be used

- CIT bands: the calculator classifies at ₦25M (0%), 20% band to ₦100M,
  and 30% above. The canonical NTA 2025 provides a ₦50M small-company
  threshold (§202) and 0%/30% rates (§56). There is no 20% band.
- Tertiary Education Tax at 3%. The canonical text provides a 4%
  Development Levy (§59).
- 0.5% minimum tax of turnover. Not verified against canonical text.
- The classification shortcuts: no fixed-asset condition and no
  professional-services exclusion in the CIT path.
- `accounting_profit = gross_turnover - total_expenses`. This is a
  shortcut. It is not a ledger-derived accounting profit.
- Hardcoded filing deadlines (VAT 21st, WHT 21st, PAYE 10th, CIT 30
  June). No statutory citation. The NTAA 2025 is absent from BIGDROPS
  NRS-docs, so these remain unresolved.
- WHT rate values. The BIGDROPS WHT rate question is delegated to an
  unsourced subsidiary regulation. TekVwarho's hardcoded table cannot
  close it.

## What matched the canonical text

- Development Levy rate of 4% on assessable profit.
- Minimum effective tax rate: 15%, applied only to companies with ₦50B
  turnover or MNE groups with €750M revenue (§57).
- VAT rate of 7.5%.
- The fixed-asset threshold of ₦250M appears in the levy and CGT services
  (with a ₦100M turnover condition that is wrong; the canonical turnover
  condition is ₦50M).

## Capital-allowance lesson

TekVwarho has a fixed-asset register and accounting depreciation. It has
no statutory capital-allowance computation. A capital allowance is a
client-supplied number inside the adjustment inputs.

Accounting depreciation and Nigerian statutory capital allowances are
separate concepts. BIGDROPS needs first-class asset records with
acquisition dates, costs, categories, and business-use proportions to
support First Schedule capital-allowance computation. That layer does not
exist in TekVwarho.

## Loss lesson

TekVwarho has no tax-loss engine. A negative profit input returns zero
CIT. There is no loss register, carry-forward, or year-of-assessment
tracking. BIGDROPS must build the loss layer from canonical text.

## Classification lesson

TekVwarho contains four different classification schemes. None matches
the canonical §202 definition (turnover ≤ ₦50M, fixed assets ≤ ₦250M,
professional services excluded). This is a warning: multiple inconsistent
classification paths can coexist in one codebase. BIGDROPS must have one
classification function with one statutory source.

## Known limitations

- The tax calculators do not read the ledger. Assessable profit is
  client-supplied. The accounting-to-tax bridge does not exist inside
  TekVwarho.
- Statutory citations are almost absent. Only the minimum-ETR service
  cites a section.
- No tax-rule versioning or effective dates. The engine cannot represent
  statutory amendments.
- Tests validate the wrong ₦25M/₦100M boundaries.
- README claims (₦50M small-company 0%) disagree with the calculator
  (₦25M/20%).

## What BIGDROPS may borrow conceptually

- The journal, period, and correction model for the native accounting
  module.
- The balanced-entry constraint as a database invariant.
- The minimum-ETR applicability model.
- The boundary-test style (with corrected statutory values).
- Input VAT recovery tracking with vendor IRN, subject to verification
  against canonical text.

## What BIGDROPS must verify independently

- Every rate, threshold, and deadline in this reference.
- IRN-based input VAT recovery.
- CGT at the CIT rate.
- PAYE bands.
- The 25% Presidential Order path under §56.

## Status

REFERENCE ONLY — NOT STATUTORY AUTHORITY.

TekVwarho is not a dependency, a service, or an implementation target.
BIGDROPS builds its accounting and tax layers natively from the canonical
NTA 2025 materials.