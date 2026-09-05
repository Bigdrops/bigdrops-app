# Tax Foundation / PSLmodels, Balaka, OpenBooks, Beancount Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Perform the final broad external architecture research pass for the
BIGDROPS Taxation and Accounting Foundation initiative.

Evaluate four projects as reference material only:

- Tax Foundation / PSLmodels Tax-Calculator (tax-policy modelling)
- Balaka (accounting)
- OpenBooks (accounting)
- Beancount (accounting)

Compare their architecture against the previous research (Luca V0.5,
TaxBridge, TekVwarho-ProAudit, OpenAccountants, OpenFisca) and against
the canonical Nigeria Tax Act 2025.

This audit is read-only. No repository was modified.

## Scope

- Extract durable architectural patterns, not code.
- Evaluate the four projects independently.
- Do not treat any external project as statutory authority.
- Produce exactly two documentation artifacts:
  - this audit report;
  - a curated reference under the Refrences/ folder.

## Skills used

karpathy, writing-clearly-and-concisely

No tax or accounting-specific skill exists in docs/PROJECTSKILLINDEX.md.
This audit was performed from source architecture and statutory text.

## Documentation standard

ASD-STE100 Simplified Technical English

## Repository identity and version

| Project | Repository | Commit | Date | License | Stack |
|---|---|---|---|---|---|
| Tax-Calculator | PSLmodels/Tax-Calculator | 48c9c98 | 2026-09-03 | CCO-1.0 | Python, Numba |
| Beancount | beancount/beancount | 9747213 | 2026-08-22 | GPL-2.0 | Python |
| OpenBooks | ianberryman/OpenBooks | 6e1b6a1 | 2026-08-03 | See LICENSE | TypeScript, Node, MySQL |
| Balaka | artivisi/balaka | e2d257e | 2026-08-31 | Apache-2.0 | Java, Spring Boot, PostgreSQL |

Naming note: "Balaka" is artivisi/balaka, an Indonesian SME accounting
application. "OpenBooks" is ianberryman/OpenBooks, an AI-native
double-entry accounting platform. Both were identified by search and
recorded here to avoid ambiguity.

All four are shallow clones. Only the head commit was inspected.

## Files changed

- docs/Reports/general/tax-foundation-pslmodels-balaka-openbooks-beancount-audit-2026-09-05.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/tax-foundation-pslmodels-balaka-openbooks-beancount-reference.md

## Changes made

None. This task created documentation only. The working tree was not
modified in any other way.

## Baseline git status

Captured before inspection (28 pre-existing entries, unchanged in
substance):

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
A  docs/reports/general/openaccountants-openfisca-tax-architecture-audit-2026-09-05.md
A  docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/openaccountants-openfisca-tax-reference.md
AM docs/prd/multi-tenancy/Readme.md
?? docs/Reports/general/cit-readiness-audit-2026-09-05.md
?? docs/Reports/general/luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md
?? docs/Reports/general/record-capture-prd-audit-2026-09-05.md
?? docs/Reports/general/taxbridge-nigeria-cit-architecture-audit-2026-09-05.md
?? docs/Reports/general/tekvwarho-proaudit-nigeria-tax-architecture-audit-2026-09-05.md
?? docs/Reports/multi-tenancy/entity-lifecycle-audit.md
?? docs/Reports/multi-tenancy/ownership-transfer-ui.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/
```

Between the baseline capture and this write, a concurrent agent staged
the two OpenAccountants/OpenFisca documentation files from the previous
session and its own multi-tenancy Readme. Those changes were not made by
this task and were not modified.

---

# 1. TAX FOUNDATION / PSLMODELS TAX-CALCULATOR

## Project purpose

A microsimulation model for static and conventional analysis of United
States federal income and payroll taxes. It is a research tool, not an
operational accounting or compliance product.

## Tax architecture

- Parameters: 251 top-level parameters in taxcalc/policy_current_law.json.
  Each parameter carries title, description, section_1, section_2 (tax
  form organization), type, validators (range, choice), compatible_data,
  and a year-keyed value array (for example
  [{year: 2013, value: 0.0}, ...]).
- A declared schema defines labels with types and validators (year range
  2013-2035, filing-status choices).
- Calculation logic: Numba-compiled vectorized functions
  (@iterate_jit) in taxcalc/calcfunctions.py. Logic and parameters are
  separate files.
- Indexing: parameters can be inflation-indexed (indexed/indexable
  flags) with growfactors. This is US CPI indexing and is not
  transferable to Nigeria without its own indexation rules.
- Reforms: JSON files with header metadata (Title, Reform_Author,
  Reform_Reference, Reform_Baseline, Reform_Description) and parameter
  overrides. Enacted-law regimes (ARPA, CARES, 2017_law) are modelled as
  data files, not as code changes.
- Versioning: year-keyed parameter values make historical and future
  regimes representable without rewriting the calculator.
- Testing: aggregate expected-output CSV files (reforms_expect.csv,
  cpscsv_agg_expect.csv) compare baseline versus reform runs.
- Precision: parameters and records are float (numpy arrays). This is a
  research model. It is not an exact-money system.

## Strengths

- Clean separation of policy parameters from calculation functions.
- Year-keyed parameter values with rich metadata.
- Reforms as versioned data files with authorship and reference
  headers.
- Deterministic simulation of a defined input population.

## Weaknesses for BIGDROPS

- US federal tax base. No Nigeria content.
- Research orientation: aggregate statistics, microdata populations, and
  policy scoring. BIGDROPS needs per-entity operational compliance.
- Float money.
- The tax base itself (adjusted gross income, deductions) is embedded in
  a massive US-specific function set. Not reusable.

## BIGDROPS applicability

ADOPT: the parameter-as-data pattern (year-keyed values with metadata,
validators, and organization), and reforms-as-versioned-files.
ADAPT: parameter indexing. Nigeria-specific indexation rules must be
defined from statute, not copied.
REJECT: the microsimulation/aggregate-statistics orientation, the
float money model, and the Numba vectorization.

---

# 2. BEANCOUNT

## Project purpose

A plain-text double-entry bookkeeping system. The ledger is a file of
directives. It is the reference implementation for ledger integrity in
the plain-text accounting movement.

## Accounting architecture

- Data model (beancount/core/data.py): Open, Close, Balance, and
  Transaction directives; Posting = account + units + cost + price +
  flag + meta.
- Amount = (Decimal number, currency). Decimal precision is enforced by
  assertion: "Amount's number is not a Decimal instance" raises.
- Inferred units: a posting with units=None is balanced from the other
  postings in the transaction.
- Balance directives: assertions that an account has an expected balance
  at a date, with tolerance. These act as integrity checkpoints.
- Validation (beancount/ops/validation.py): duplicate open/close
  directives, duplicate balance assertions, invalid references to
  inactive or unknown accounts, invalid currency for an account.
- Plugins: check_closing (inserts a balance check after a closing
  trade), auto_accounts, commodity checks.
- Padding: pad directives insert automatic balancing postings for
  missing periods.
- Immutability: the ledger file is append-only. A correction is a new
  transaction, never an edit.
- Provenance: meta key-value data on every directive; links and tags
  group related entries.
- Periods: no native fiscal-period object. Time is implicit in dates.
  Account closing is a directive, not a period lock.

## Strengths

- The cleanest ledger-integrity model inspected in this series.
- Exact Decimal amounts.
- Balance assertions as explicit integrity invariants.
- Append-only immutability by construction.
- Meta-based provenance.

## Weaknesses for BIGDROPS

- Plain-text single-user file model. No multi-tenancy, no RLS, no
  relational queries.
- No fiscal-period lock semantics.
- Inferred/auto-balanced postings are convenient for personal
  bookkeeping but too permissive for production compliance posting.

## BIGDROPS applicability

ADOPT: exact Decimal amounts; balance-assertion checkpoints; append-only
journals with reversal-by-new-entry; meta-based provenance; account
open/close directives.
ADAPT: the plugin validation concept into database constraints and
service checks.
REJECT: the plain-text file store, the single-user orientation, and
inferred auto-balancing postings in production.

---

# 3. OPENBOOKS (ianberryman)

## Project purpose

An AI-native, modular double-entry accounting platform. Pre-release but
with a built ledger kernel. The README states the schema is not yet
frozen.

## Accounting architecture

- Money: branded bigint minor units (packages/shared-types/src/money/
  money.ts). The Money type is a branded bigint; a bare number is a
  compile error; a lint rule (openbooks/no-float-money) bans raw
  operators on money. Exactness is total: "Nothing in this file rounds
  or divides." Rounding lives in exactly one module; proportional
  splitting is lossless. Multi-currency is out of v1 scope; every
  amount is the org's single currency.
- Ledger kernel (packages/server/src/modules/ledger/posting.service.ts):
  the sole implementation of the PostingService. Every financial object
  resolves to a posting here. The order of operations is explicit:
  permission, shape and balance (pure computation), account/contact/
  dimension resolution with row locks, period lock (assertPostable,
  FOR UPDATE), sequence lock, then insert. Lock order is consistent
  across callers to prevent deadlocks.
- Append-only enforced by the database: journals and journal_lines have
  no mutable columns. A reversal is a new journal carrying
  reverses_journal_id. The application connects to the database as a
  user without UPDATE or DELETE grants on journal tables
  (0002_ledger.ts, 0999_app_grants).
- Trial balance: direct aggregation over journal_lines with no cached
  balances and no denormalized totals. The design comment states a
  balance cache is "a second source of truth" whose staleness produces
  "books that balance on screen and not in the data."
- Tenancy: composite keys (org_id, id) on every table. The tenant scope
  is applied by the query layer before application code sees the query.
- Periods: assertPostable rejects posting into a closed period; a
  period-close service runs pass/warn checks before closing.
- Idempotency: a dedicated idempotency module exists.

## Strengths

- The strongest money model in the entire research series: branded
  integer minor units with compile-time and lint enforcement.
- Database-enforced immutability, not convention-based.
- Explicit locking order for concurrency safety.
- No cached balances.
- Schema-level tenancy.

## Weaknesses for BIGDROPS

- Pre-release. Schema not frozen. No production hardening pass.
- MySQL-based (BIGDROPS is Postgres/Supabase).
- No Nigerian tax content.
- Multi-currency deliberately out of scope.

## BIGDROPS applicability

ADOPT: integer minor units (or Decimal) with exact arithmetic and
single-point rounding; database-enforced append-only journals; reversal
journals with a reverses_journal_id link; no-balance-cache trial
balance; consistent lock ordering at posting time; posting-time period
assertion with FOR UPDATE; idempotency keys.
ADAPT: the grants-based immutability to Supabase (table privileges or
RLS restrictions) and the org-scoped keys to BIGDROPS entity scoping.
REJECT: the MySQL stack and any pre-release code.

---

# 4. BALAKA (artivisi)

## Project purpose

A production accounting application for Indonesian small businesses.
Spring Boot 4, Thymeleaf, PostgreSQL.

## Accounting architecture

- JournalEntry (entity/JournalEntry.java): unique journalNumber,
  postedAt, voidedAt, voidReason, separate debitAmount and creditAmount
  columns (BigDecimal, precision 19 scale 2), isReversal flag, and a
  reversedEntry self-reference.
- Transaction (entity/Transaction.java): the source document. It carries
  transactionNumber, referenceNumber, idempotencyKey, description,
  status (DRAFT), and a closingEntry flag. Journals link back to it.
- Balancing: services sum debit and credit per account and date range
  and compute balances from the account's normal balance direction.
- Corrections: voiding (voidedAt, voidReason) plus reversal entries.
  Both are non-destructive.
- FiscalPeriod: per year and month, with status OPEN/MONTH_CLOSED and
  further states, monthClosedAt/monthClosedBy, and taxFiledAt/
  taxFiledBy. Tax filing status lives on the fiscal period.
- Fixed assets: asset register with depreciation methods (straight-line
  and declining balance) and a depreciation report service.
- Financial reports: ReportController, aging reports, bank
  reconciliation, trial balance services.
- Indonesian tax compliance: PPN and PPh 21/23/4(2) calculations,
  e-Faktur/e-Bupot concepts, and export services (SptTahunanExport,
  CoretaxExport).
- Audit logging: AuditLog, SecurityAuditLog, audit event types.
  RBAC and AES-256-GCM encryption are present.

## Strengths

- A complete production double-entry surface: source transactions,
  journals, periods, reports, fixed assets.
- Exact decimal money (BigDecimal).
- Non-destructive void and reversal corrections.
- Tax-filing status attached to the fiscal period.

## Weaknesses for BIGDROPS

- Indonesian statutory tax content (PPN, PPh). Not transferable to
  Nigeria.
- Single-organization orientation (no entity-scoped multi-tenancy in the
  accounting model inspected).
- The tax calculations are Indonesian statutory logic, not a generic
  versioned rules layer.

## BIGDROPS applicability

ADOPT: the source-transaction to journal linkage with idempotencyKey;
separate debit/credit columns; voiding with reason plus reversal
linkage; fiscal-period month close with tax-filing markers.
ADAPT: the month-close workflow to Nigerian filing periods.
REJECT: Indonesian tax rules, the Java stack, and any dependency on its
statutory values.

---

# 5. CONSOLIDATED COMPARISON

| Capability | Tax-Calculator | Beancount | OpenBooks | Balaka | Luca | TaxBridge | TekVwarho | BIGDROPS target |
|---|---|---|---|---|---|---|---|---|
| Double-entry journal | No | Yes | Yes | Yes | Yes | No | Yes | Yes |
| Exact money | No (float) | Yes (Decimal) | Yes (bigint) | Yes (BigDecimal) | Yes (Decimal.js) | No (float) | Partial (float at boundaries) | Yes |
| Chart of accounts | No | Implicit | Yes | Yes | Yes | No | Yes | Yes |
| Fiscal periods | Year params | Implicit dates | Yes (locked) | Yes (month close) | Yes (OPEN/SOFT/HARD) | No | Yes | Yes |
| Period-lock at posting | n/a | No | Yes (FOR UPDATE) | Partial | Yes | No | Yes | Yes |
| Corrections | n/a | New entries | Reversal journals | Void + reversal | Counter-entries | No | Reversal states | Reversal journals |
| DB-enforced immutability | n/a | By file design | Yes (grants) | No | No | No | No | Yes |
| Balance assertions | No | Yes | Implied | No | No | No | No | Yes |
| Source-document link | No | Meta | Yes | Yes | No | No | Yes | Yes |
| Idempotency | No | No | Yes | Yes | Keys | No | No | Yes |
| Audit trail | No | Append-only | Append-only | Logs | Hash chain | No | Hash chain | Append-only + log |
| Trial balance | No | Via tools | Aggregation only | Yes | Yes | No | Yes | Aggregation only |
| Fixed assets | No | No | Yes | Yes | No | No | Register only | Yes |
| Depreciation | No | No | Yes | Yes | No | No | Yes | Yes (accounting) |
| Bank reconciliation | No | No | Yes | Yes | Yes | No | Yes | Later |
| Tax adjustments layer | Implicit | No | Tax module | Indonesian | No | Shortcut | Manual inputs | First-class |
| Tax-rule versioning | Yes (year keys) | No | No | No | No | No | No | Yes |
| Effective dates | Yes | No | No | No | No | No | No | Yes |
| Calculation trace | Partial | No | Legible kernel | No | No | No | No | Yes |
| Nigerian statutory content | No | No | No | No | No | Wrong | Wrong | Canonical only |
| Multi-tenancy | No | No | Yes (org keys) | No | No | Org model | Entity keys | Entity + RLS |

---

# 6. ACCOUNTING TO TAX BRIDGE

## Finding

None of the four projects bridges source transaction to Nigerian tax
liability.

- Tax-Calculator starts from tax-unit records and computes US tax. It
  has no accounting layer.
- Beancount records financial facts. It has no tax layer.
- OpenBooks has a tax module for invoicing (sales-tax style). It does
  not model Nigerian CIT, adjustments, capital allowances, or losses.
- Balaka computes Indonesian PPh and PPN from its own books. This is a
  complete accounting-to-tax bridge, but for Indonesian statutory rules
  only. The bridge architecture is real; the rules are not reusable.

## The strongest bridge pattern observed

Balaka demonstrates the practical shape: source transactions post to
journals, fiscal-period status carries tax-filing markers, and tax
export services consume ledger results. TekVwarho demonstrates the
anti-pattern: assessable profit supplied by the client with
revenue minus expenses as the accounting profit shortcut.

The BIGDROPS bridge must be:

```
source transaction → journal posting → period totals → accounting
profit → tax adjustments → taxable profits → CIT and Development Levy
```

with accounting profit produced by the accounting layer and every
subsequent step owned by the BIGDROPS tax domain.

---

# 7. CONFLICT RESOLUTION

| Conflict | Approaches | Type | Resolution |
|---|---|---|---|
| Money representation | float (Tax-Calculator, TaxBridge) vs Decimal (Beancount, Balaka, Luca) vs integer minor units (OpenBooks) | Accounting correctness | Exact arithmetic wins. Float is rejected. Minor units or Decimal are both acceptable; pick one and enforce it. |
| Balance storage | Signed amounts vs separate debit/credit columns (OpenBooks, Balaka, TekVwarho) | Implementation detail | Separate non-negative debit/credit columns with a check constraint are cleaner. Not a correctness difference if signed amounts are constrained. |
| Corrections | Void (Balaka) vs reversal-only (OpenBooks, Luca, Beancount) | Data integrity | Non-destructive. Reversal journals with a linkage column are the strongest pattern. |
| Period enforcement | Posting-time assertion (OpenBooks) vs status checks (Luca, TekVwarho) vs implicit (Beancount) | Accounting correctness | Posting-time assertion with a row lock. |
| Small-company threshold | ₦100M (TaxBridge) vs inconsistent (TekVwarho) | Statutory interpretation | Canonical NTA §202: ₦50M. No vote between external projects. |
| 20% medium band | Present (TaxBridge, TekVwarho, OpenAccountants) | Statutory interpretation | Canonical NTA §56: no such band. |
| Tenancy | Single-tenant (Luca, Beancount) vs org keys (OpenBooks) vs entity keys (TekVwarho) | Architecture | BIGDROPS entity scoping with RLS. |

Statutory conflicts are resolved only by the canonical NTA 2025, never
by majority vote between repositories.

---

# 8. EMERGING CONCLUSIONS

The research supports every emerging conclusion. No contradiction was
found.

1. BIGDROPS should build its own accounting foundation. Confirmed.
   The strongest candidates are single-tenant (Luca, Beancount),
   research-oriented (Tax-Calculator), Indonesian (Balaka), or
   pre-release (OpenBooks).
2. BIGDROPS should build its own Nigerian tax-rule layer. Confirmed.
   No external project has correct Nigerian values.
3. Accounting profit must be separated from taxable profit. Confirmed.
   Only TekVwarho shortcuts it, and that is the anti-pattern.
4. Tax adjustments must be first-class. Confirmed. TaxBridge hides them
   in a rate application; TekVwarho takes them as manual numbers.
5. Tax rules need effective dates and versioning. Confirmed.
   Tax-Calculator and OpenFisca show the pattern; no accounting
   candidate has it.
6. Monetary calculations must avoid unsafe float arithmetic. Confirmed
   by OpenBooks, Beancount, Balaka, and Luca. TaxBridge and
   Tax-Calculator are the counter-examples.
7. Accounting periods must be explicit. Confirmed by OpenBooks, Luca,
   TekVwarho, and Balaka.
8. Corrections should be non-destructive. Confirmed by every
   accounting candidate.
9. Capital allowances must be separate from accounting depreciation.
   Confirmed. No external project computes First Schedule allowances.
10. Loss carry-forward needs a register, not a number. Confirmed.
    No external project has a proper loss register.
11. Tax calculations should produce an explanation trace. Confirmed.
    OpenFisca and Tax-Calculator show how; OpenBooks shows legible
    kernel design.
12. Compliance is downstream of accounting and tax computation.
    Confirmed. Balaka attaches tax-filing status to the fiscal period;
    no project treats compliance as a substitute for computation.

---

# 9. MINIMUM BIGDROPS ACCOUNTING FOUNDATION

The minimum foundation before serious CIT calculation:

- Entity-scoped chart of accounts with normal balance and account type.
- Explicit fiscal periods with posting-time lock enforcement.
- Journal entries with balanced double-entry posting and a database
  balance constraint.
- Source-document linkage from journals to invoices, payments, and
  future expense records.
- Exact money: Decimal or integer minor units, single rounding point.
- Idempotency keys on posting.
- Non-destructive corrections via reversal journals.
- Trial balance and P&L as direct aggregation, no cached balances.
- Expense capture (per Record-capture-v1.md).
- A tax-adjustment layer with add-backs and disallowables.
- A loss carry-forward register with period, restriction, consumption,
  and remaining balance.
- A capital-allowance register fed by a fixed-asset register, computed
  per the First Schedule.
- Versioned Nigerian tax rules keyed by effective date with statutory
  citations.
- A calculation trace per tax result.
- Compliance evidence attached to obligations.

## Explicit distinction

ACCOUNTING DEPRECIATION: the expense recorded to allocate asset cost
over useful life. It is a book entry.

NIGERIAN TAX CAPITAL ALLOWANCES: statutory deductions under the First
Schedule of the NTA 2025, with their own rates, proration rules (§27(3),
§27(4)), and balancing adjustments. Section 27(1) deducts capital
allowances from assessable profits.

One must never substitute for the other. Depreciation is a disallowed
book expense; capital allowances are a statutory deduction.

---

# 10. WHAT NOT TO BUILD YET

Keep out of the immediate scope:

- Bank reconciliation and bank feeds. Needed later, not a prerequisite
  for CIT.
- Multi-currency. Single NGN currency first, per OpenBooks' explicit
  v1 decision.
- Inventory, procure-to-pay, and production modules. Balaka and
  OpenBooks include them; they are not prerequisites.
- Payroll and PAYE engines. Separate obligation, later phase.
- Consolidated or group accounting.
- General-purpose budgeting and dunning.
- A full audit-trail hash chain. The append-only journal plus an
  application audit log is sufficient. The SHA-256 chain remains an
  optional enhancement.

---

# 11. ARCHITECTURAL RECOMMENDATION

## Accounting foundation (native BIGDROPS)

Adopt the OpenBooks kernel shape: exact money, append-only journals
enforced by database privileges, reversal journals, posting-time period
assertion, no cached balances, idempotency keys, org-scoped keys mapped
to BIGDROPS entity scope plus RLS. Add Beancount-style balance
assertions and Balaka-style source-transaction linkage with voiding and
reversal.

## Tax engine (native BIGDROPS)

Adopt the Tax-Calculator/OpenFisca parameter shape: date-keyed
parameters with statutory citation, validators, and unit metadata;
reforms and historical regimes as data; formulas keyed by year of
assessment; a computation trace per result.

## Accounting/tax boundary

The accounting layer owns accounting facts and accounting profit. The
tax-adjustment layer owns statutory transformations. The Nigerian tax
engine owns versioned NTA 2025 rules. The compliance layer owns
obligations, evidence, filing, payment, and reconciliation.

## Statutory rule versioning

Store each parameter with an effective-date history and a citation. A
rule lookup is resolved as of the accounting period date. Formula
changes are new formula versions keyed by year of assessment.

## Calculation explanation

Record per calculation: which rule ran, which parameter values applied,
which period applied, which inputs contributed, and the result per
step. Attach the statutory citation to each rule.

## Minimum data model

Tenant, fiscal period, account, journal, journal line, source document,
expense, fixed asset, depreciation entry, tax adjustment, loss register,
capital allowance register, tax parameter (date-keyed), calculation
trace, compliance obligation, evidence, filing, payment, reconciliation.

## Whether broad external research is complete

Yes. Nine external projects have now been evaluated: Luca, TaxBridge,
TekVwarho, OpenAccountants, OpenFisca, Tax-Calculator, Beancount,
OpenBooks, and Balaka. The architectural evidence has converged. No
further broad external repository research is warranted. The next step
is BIGDROPS-native architecture design from the canonical NTA 2025 and,
once added to NRS-docs, the NTAA 2025.

---

# 12. OPEN QUESTIONS

Blocking:

- When will the NTAA 2025 gazette text be added to NRS-docs?
- Where is the subsidiary regulation that governs WHT rates and the WHT
  remittance deadline?

High-risk:

- The First Schedule capital-allowance rates have not been extracted
  value-by-value from the canonical text.
- The NTA 2025 VAT registration threshold is not verifiable from the
  canonical extract reviewed.

Non-blocking:

- Whether the 25% Presidential Order path under §56 is effective for
  the relevant period.

---

# 13. FINAL DECISION

- Recommendation: External research is closed. BIGDROPS builds its own
  accounting foundation and its own Nigerian tax engine. The strongest
  architectural patterns come from OpenBooks (kernel), Beancount
  (integrity assertions), Balaka (source-transaction workflow), and
  Tax-Calculator/OpenFisca (versioned parameters and reforms). No
  external project is adopted as a dependency or as statutory authority.
- Confidence: High.
- Decisive evidence: the branded-bigint money and DB-enforced
  immutability in OpenBooks; the Decimal and balance-assertion model in
  Beancount; the year-keyed parameter and reform-as-data model in
  Tax-Calculator; the source-transaction and fiscal-period workflow in
  Balaka; and the absence of any correct Nigerian statutory content in
  all nine projects.
- Conditions that would change the recommendation: a multi-tenant,
  Nigerian-correct, versioned, Postgres-native accounting and tax
  system released under a compatible license; or a new statutory
  development in the NTA/NTAA 2025.

## Verification

- git status before: 28 pre-existing entries captured. All left
  untouched.
- git status after: baseline plus the two intended documentation files
  only.
- All four clones (/tmp/taxcalculator, /tmp/beancount, /tmp/openbooks,
  /tmp/balaka) are read-only and unchanged.
- No build, typecheck, lint, audit:load, migration, or application
  execution was run. No external test suite was executed.

## Risks or limitations

- Shallow clones: only the head commit of each repository was inspected.
- OpenBooks is pre-release and its schema is not frozen. Findings are
  architectural, not endorsement.
- The canonical NTA extract reviewed covers the CIT core, sections
  20-22, 27, 56-59, and 202, plus the First Schedule. Values outside
  those areas were flagged for verification rather than resolved.
- The NTAA 2025 is absent from BIGDROPS NRS-docs. Filing-deadline items
  remain open.

## Deferred work

- Transition to BIGDROPS-native architecture design.
- Add the NTAA 2025 gazette text to NRS-docs.
- Extract the First Schedule capital-allowance rates value-by-value.
- Design the versioned-parameter and computation-trace data model.