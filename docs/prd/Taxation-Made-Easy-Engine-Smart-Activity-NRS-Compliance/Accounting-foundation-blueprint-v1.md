# BIGDROPS Accounting Foundation Blueprint v1

Status: Architecture Blueprint — Draft / Design Source of Truth

Version: 1.0 (draft)

Date: 2026-09-05

Domain: Accounting Foundation (pre-tax)

This document is an architecture specification. It is not an implementation. It does not change any statutory rule. It defines the contracts that the future schema, domain services, posting kernel, tax engine, and compliance UI must obey.

---

## 1. Purpose

BIGDROPS records business activity for Nigerian SMEs: invoices, payments, expenses, purchases, and supplier activity. Today the product can calculate document-level totals, but it has no general ledger. The future Nigerian tax engine must compute defensible tax positions from accounting facts.

This blueprint defines the accounting foundation that sits between the recording layer and the future tax engine. It establishes:

- domain boundaries
- accounting invariants
- data-flow contracts
- temporal semantics
- money-precision rules
- tenant boundaries
- correction rules
- phase boundaries

BIGDROPS is moving toward: Record → Reconcile → Explain → Optimise → Comply → Transmit. The accounting foundation provides the financial truth required between recording and tax/compliance.

---

## 2. Architectural Position

Target architecture:

Business Activity → Record Engagement → Source Transaction → Accounting Transaction → Journal / Double-Entry Posting → Accounting Period → Accounting Profit → Tax Adjustments → Taxable Profit → CIT / Development Levy → Compliance Position → Evidence / Filing / Payment / Reconciliation

Two separations are hard rules:

1. Record Engagement is an upstream behavioral layer. It prompts users to record real activity. It never fabricates activity. Only a recorded user/system fact becomes a source transaction.
2. Tax is a downstream layer. The accounting layer produces accounting facts and accounting profit. A separate tax-adjustment layer transforms them into taxable profit using Nigerian statutory rules.

The accounting foundation transforms recorded business facts into deterministic accounting facts. The tax layer consumes accounting facts and applies statutory rules separately.

---

## 3. Relationship to Existing Documents

The blueprint synthesizes the existing PRD folder. It does not copy it.

| Document | Role in this blueprint |
| :--- | :--- |
| Readme.md | Folder index. |
| Technical-plan-v1.1.md | Engineering plan. `src/lib/Calculations.ts` is the authoritative document-calculation layer. Its fixed-point question (§11.5) is resolved in section 9. |
| Record-capture-v1.md | Plain-language recording flows. Reverse gross-to-net/VAT derivation is new calculation-engine work, not an existing capability. |
| Record-engagement-plan-v1.md | Planning artifact for prompts and engagement. It is upstream of accounting (section 5). |
| Files-tax-monthly-v1.md | VAT filing obligations. NTAA-dependent deadlines remain unresolved. |
| bigdrops-tax-ux-vision-v1.md | Discovery-stage UX vision. Its "record it first" priority is honored. |
| Openai-ux-contribution.md | Product review. It contains an unsupported "small business" definition. This blueprint does not adopt it (section 27). |
| Refrences/ (five files) | Architectural references only. They are not statutory authority. |
| Audit reports under docs/reports/GENERAL/ | Evidence base for this blueprint's claims. |

Evidence corrections from the 2026-09-05 audits that this blueprint honors:

- `src/lib/Calculations.ts` provides the forward calculation path only. A gross-to-net/VAT reverse derivation requires new calculation-engine work.
- NTAA 2025 primary text is absent from the repository. NTAA-dependent matters (general VAT return deadline, any NTAA small-business exemption) remain unresolved.
- "Small business" is not an established classification in the repository. NTA 2025 defines "small company" only (§202). This blueprint uses "small company" when it means the defined term.

---

## 4. Domain Boundaries

Seven domains:

| Domain | Responsibility | Produces |
| :--- | :--- | :--- |
| Record Engagement | prompts, escalation, controlled enforcement | recorded activity signals |
| Business / Source Transactions | capture of real business facts | source transactions |
| Accounting | double-entry postings, periods, reporting, corrections | accounting facts, accounting profit |
| Tax Adjustment | accounting-to-tax transformations | taxable profit inputs |
| Tax Rules | versioned statutory parameters and formulas | tax results |
| Compliance | obligations, filing, payment, evidence | compliance positions |
| Evidence / Audit | provenance, immutability, explainability | audit chain |

Rules:

- Domains communicate through defined contracts, not shared mutable state.
- Accounting never embeds Nigerian tax rules in the journal layer.
- Tax Adjustment never reconstructs missing accounting data. It consumes accounting facts only.

---

## 5. Record Engagement → Accounting Boundary

Record Engagement exists to make users record real business activity. It classifies activity into three levels:

| Level | Meaning | Accounting effect |
| :--- | :--- | :--- |
| Confirmed activity | The user recorded the fact (payment, expense, invoice). | May become a source transaction. |
| Strongly indicated activity | Signals from existing data (invoice overdue, payment amount matches invoice). | May generate a prompt. Becomes a source transaction only after user confirmation. |
| Suggested activity | General gaps (expenses with no evidence, WHT expected but not evidenced). | May generate a prompt. Never becomes an accounting fact without recording. |

Prompt mechanics: prompt, escalate, snooze, defer, dismiss.

Controlled enforcement: the product may gate flows. For example, it may warn before the user discards unrecorded payment evidence. It never auto-posts.

Invariant: inferred activity must not become an accounting fact without confirmation or recording. The engagement layer is a prompt generator, not a fact generator.

---

## 6. Source Transaction Model

A source transaction is a recorded business fact. It is not an accounting posting.

Required properties:

- source identity: stable id, source system, source type
- entity ownership
- transaction date
- amount (exact money, section 9)
- currency (NGN in v1)
- counterparty (customer or supplier where known)
- source document or evidence reference
- idempotency / source key: unique per source plus type plus natural key
- lifecycle: captured → validated → linked → posted, or rejected/quarantined
- relationship to accounting postings: one source transaction may drive zero or more journal entries; every posting references its source transaction

Ingestion rules:

- Ingestion is idempotent. Re-delivery of the same source key does not duplicate.
- A source transaction with no accounting effect is valid. An unposted invoice is an example.
- The accounting layer never creates a source transaction.

---

## 7. Chart of Accounts

| Property | Contract |
| :--- | :--- |
| Account identity | stable code plus name |
| Account type | asset, liability, equity, revenue, expense |
| Hierarchy | parent/child where required; reporting uses the hierarchy |
| Normal balance | debit or credit per type |
| Active/inactive state | inactive accounts reject new postings |
| Entity ownership | accounts belong to the entity's books |
| Reporting role | accounts map to report lines (P&L; balance sheet where justified) |
| Posting eligibility | most accounts receive postings; control/reporting accounts may be restricted |
| Mutation rules | accounts with historical postings cannot be deleted; code and type changes follow a migration policy; renames preserve history |

v1 chart: keep minimal. Seed standard NGN accounts: cash, bank, receivables, payables, VAT control, WHT control, revenue, expense categories, fixed assets, accumulated depreciation, equity. Tax control accounts hold collected and withheld amounts until remitted.

---

## 8. Journal / Posting Kernel

An accounting transaction is the prepared accounting representation of a source transaction: draft journal entry with accounts and amounts. The posting kernel validates it and posts it.

- journal entry: one posting unit (header plus lines)
- journal lines: debit/credit lines with account, amount, memo
- balancing invariant: total debits = total credits. Unbalanced postings are impossible at the posting boundary.
- posting lifecycle: draft → validated → posted → (later) reversed or corrected
- posting validation: balanced; accounts exist and are active; amounts are exact money; period is open; source linkage present; idempotency key unique
- period validation: postings enter open periods only
- account validation: posting eligibility per account
- atomicity: a posting commits all lines atomically. Partial posting is impossible.

The posting kernel is the single entry point for creating accounting postings. Application modules do not write journal lines directly.

---

## 9. Money Precision and Rounding

Decision: exact decimal arithmetic everywhere. Binary floating-point is prohibited for money.

Reference evidence:

| System | Money model |
| :--- | :--- |
| Luca | Decimal.js, never float, round at display/result time |
| Beancount / Balaka | Decimal / BigDecimal; Beancount asserts Decimal instances |
| OpenBooks | branded bigint minor units, no-float lint rule, one rounding module |
| TekVwarho | decimal arithmetic, Numeric(18,2) storage |
| OpenFisca | numpy float64 (rejected for BIGDROPS) |
| TaxBridge | Math.round on JavaScript numbers (rejected for BIGDROPS) |

Existing BIGDROPS evidence: `src/lib/Calculations.ts` is the authoritative document-calculation layer. It already uses decimal.js with precision 20 and ROUND_HALF_UP (line 38).

Recommended BIGDROPS approach:

| Concern | Decision |
| :--- | :--- |
| Internal representation | exact decimal values, minor units of kobo (2 decimal places), carried by Decimal.js for arithmetic |
| Storage | Postgres NUMERIC(18,2) for money columns; one convention across the accounting schema; no mixed scales |
| Display conversion | format at the display boundary only; never round stored facts for storage |
| Arithmetic | Decimal.js with fixed precision 20 and one rounding mode for the whole foundation |
| Rounding point | document-level calculations keep the existing per-line ROUND_HALF_UP behavior of `Calculations.ts`; ledger postings carry exact line amounts; aggregates round only at the reporting/display boundary |
| Rounding mode | ROUND_HALF_UP, consistent with `Calculations.ts` |
| VAT/tax calculation boundary | document tax calculations use the canonical calculation layer; the accounting foundation stores calculated amounts as facts and never re-derives them in the ledger |
| Allocation/remainder | largest-remainder allocation so parts sum exactly to the whole, expressed in kobo; remainders resolve in kobo, never fractional kobo |

Primary direction: Decimal.js plus NUMERIC storage. bigint minor units remain an acceptable alternative implementation only with a no-float lint rule and a single rounding module. Decimal.js is preferred because it is already the production standard.

---

## 10. Accounting Periods

| Property | Contract |
| :--- | :--- |
| Period identity | entity plus period type plus period code |
| Period boundaries | explicit start and end dates |
| States | planned → open → closed → locked |
| Opening | a period opens for posting; v1 uses monthly periods |
| Posting restrictions | ordinary postings enter open periods only |
| Late entries | late postings into an open period are allowed; late postings into a closed period require the correction path (section 16) |
| Correction after close | reverse-and-repost into the correct period; history is preserved |
| Relationship to year of assessment | the accounting period determines which assessment period consumes the accounting profit; the mapping is a tax-layer concern (section 20) |

The foundation creates periods. The tax layer reads period boundaries.

---

## 11. Accounting Reporting

Authoritative facts:

- trial balance: derived from posted, un-reversed journal lines
- account balances: derived from postings
- period totals: derived from postings
- profit and loss: derived from revenue and expense accounts over a period
- balance sheet: derived from asset, liability, and equity balances (where justified in v1)

Rules:

- Authoritative balances derive from posted journal entries.
- Cached aggregates are allowed only as performance optimizations. They must be rebuildable from postings and versioned. A cache is never a second source of truth.
- Reports expose provenance. Every figure traces to journal lines and source transactions.

---

## 12. Revenue

- Invoice or document activity does not automatically equal accounting revenue.
- An invoice is a claim. Recognition policy decides when a claim becomes accounting revenue.
- Recognition policy belongs to the accounting layer, not to document status.
- v1 default: revenue is recognized when the supply is complete and the amount is collectible. This is a documented policy decision. The blueprint does not invent a full accrual or revenue-recognition standard beyond what BIGDROPS needs.
- Money received with no invoice is recorded as a source transaction and held as unallocated until reconciled.
- WHT deducted by a customer is not a revenue reduction in the accounting layer. It is a separate tax/evidence fact (section 13).

---

## 13. Payments and Allocations

- A payment is a source/business transaction (money-in or money-out).
- Allocation: a payment allocates to one or more invoices or obligations.
- Partial payment: allocate partially; the remainder stays unallocated or on the receivable.
- Overpayment: creates a customer credit balance. It never mutates the invoice total.
- Unallocated payment: recorded, held as unallocated, surfaced for reconciliation.
- Reversal/refund: recorded through the correction path (section 16). A payment is never deleted.
- Customer WHT deduction: recorded as a separate tax/evidence fact, linked to the payment and invoice. It is never treated as a VAT reduction. This preserves the existing product rule.

---

## 14. Expenses / Money-Out

Minimum v1 accounting concepts:

- operating expenses: money-out for business operations
- supplier payments: payments to suppliers, allocable to invoices where linked
- purchases: goods or services acquired, expensed or capitalized (section 15)
- tax-relevant expenses: expenses that may affect taxable profit; flagged as candidates for tax adjustment; no statutory deductibility classification here
- supporting evidence: receipt or invoice references where available

This is not a procure-to-pay system. Purchase orders, goods receipts, and procurement workflow are out of scope.

---

## 15. Fixed Assets and Depreciation

| Concern | Contract |
| :--- | :--- |
| Asset acquisition | a source transaction (asset purchase) that capitalizes |
| Capitalization | policy decides when an outlay is an asset rather than an expense; the policy lives in the accounting layer |
| Asset identity | stable asset record with acquisition cost and acquisition date |
| Useful life | per-asset policy input |
| Depreciation method | straight-line is the v1 default; the foundation defines the contract so other methods can be added |
| Depreciation periods | depreciation posts per accounting period to a depreciation expense account and accumulated depreciation |
| Disposal | record proceeds and remove the asset through a posting, never by deletion |
| Impairment boundary | impairment recognition is a later capability; v1 records evidence but does not compute impairment |

Explicit separation: accounting depreciation is a foundation concern. Nigerian tax capital allowances are a tax-layer concern (section 19). They are two different calculations and must never share a single implementation. The accounting layer does not use the term "capital allowance."

---

## 16. Corrections / Reversals / Idempotency

- Posted entries are immutable. No silent mutation, no deletion, no in-place edit.
- Reversal: an equal-and-opposite entry is posted against the original.
- Correcting entry: a new entry records the correct state and links to the original.
- Linkage: corrections reference the original entry id and the reason.
- Reason/provenance: every correction records who or what, when, and why.
- Period implications: reversal posts to the current open period unless the correction policy routes it elsewhere; closed-period corrections follow the reverse-and-repost path with the original retained.
- Idempotency: correction submissions carry an idempotency key; re-submission does not double-post.

---

## 17. Evidence / Provenance / Auditability

Minimum provenance chain:

business activity → source transaction → accounting entry → journal lines → report result → tax adjustment/result

Each link keeps:

- reference to the upstream fact (id and type)
- source document or evidence reference where available
- timestamps and actor

Explainability: a user or auditor can walk from any report figure to journal lines, to source transactions, to recorded business activity. If evidence is missing, the system says so. It does not invent it.

Strong auditability, immutable postings, correction linkage, and idempotency are required. A cryptographic hash chain is not required for v1 unless existing project standards require it.

---

## 18. Tenant / Entity Isolation

- Accounting facts (accounts, postings, periods, reports) are entity-scoped.
- Every accounting fact carries entity ownership, enforced by RLS at the database boundary and by the posting kernel at the application boundary.
- Current repository evidence: documents (invoices, quotations) use entity ownership; `tax_input_entries` is scoped by `settings_id` (FK to `settings(id)`, migration `20260520090009_tax.sql`); entity-scoped schema provisioning exists. `settings_id` and `entity_id` are not interchangeable.
- The accounting foundation targets entity-scoped books. Migration of existing settings-scoped tax facts into entity-scoped accounting facts is an implementation-phase decision, not a blueprint decision.
- RLS policies enforce entity isolation on every accounting table. Cross-entity queries are prohibited at the schema level.

---

## 19. Accounting → Tax Bridge

Transformation chain:

accounting facts → accounting profit → tax adjustments → taxable profit

Conceptual adjustment categories (no statutory numbers invented):

- add-backs / disallowables: expenses recorded in accounting but not deductible
- exempt-income adjustments: income recorded in accounting but exempt
- capital allowances: statutory allowances computed from qualifying asset facts; separate from depreciation
- tax losses: utilization through the loss register (section 22)
- other statutory adjustments: defined by the tax rules layer as sourced

The bridge:

- reads accounting facts only
- records adjustments as tax-layer facts with citations
- never modifies accounting postings
- outputs taxable-profit inputs for the tax rules layer

---

## 20. Tax Calculation Context

The future tax engine computes within a context containing:

- entity
- accounting period
- assessment period (year of assessment)
- calculation date
- transaction facts (from source transactions)
- accounting facts (from the foundation)
- applicable tax-rule regime/version

Temporal semantics. These dates are distinct and must not be conflated:

| Date | Meaning |
| :--- | :--- |
| Transaction date | when the business event happened |
| Accounting period | the period the entry posts into |
| Year of assessment | the tax year the profit is assessed under |
| Tax-rule effective date | when the rule version became law |
| Calculation date | when the result is computed |
| Filing/payment date | when obligations are due (compliance layer) |

---

## 21. Nigerian Tax Rules Boundary

Requirements:

- versioned statutory parameters
- effective dates on every parameter and rule
- formulas separate from parameters
- rule citations (Act, section, sub-section)
- calculation trace: every result records which rule versions and inputs produced it
- deterministic results: same context plus same rule versions yields the same result

Statutory rules are global. They are not tenant-editable. Tenant-specific facts, classifications, elections, evidence, and configuration remain tenant-scoped. The rules layer cannot be changed by tenant settings.

The rules layer never reconstructs missing accounting data. It fails loudly when inputs are absent.

---

## 22. Loss Register

Conceptual purpose: track tax losses — losses incurred in an assessment that may offset future profits, subject to statutory rules.

Lifecycle: recognized loss → recorded in the register → utilized against future taxable profits → expire per statutory rules.

v1 blueprint: define the register's purpose and lifecycle only. Carry-forward periods and utilization limits are statutory values. They remain unresolved until verified from primary sources.

---

## 23. Compliance Boundary

The compliance layer consumes accounting and tax outputs to produce:

- compliance positions (what is due, when)
- evidence (documents attached to positions)
- filing (returns prepared from prepared data)
- payment (remittance records)
- reconciliation (filing versus payment versus records)
- dashboard and notification surfaces

The compliance layer is a consumer. It does not recompute accounting or tax facts. It renders and transmits prepared data. This matches the project rule that renderers receive prepared data only.

---

## 24. Non-Goals (v1)

Deferred:

- bank feeds and full bank reconciliation
- multi-currency
- inventory
- complete procurement / procure-to-pay
- payroll / PAYE
- group consolidation
- budgeting
- dunning
- advanced treasury
- impairment calculation
- full cryptographic hash chain (unless project standards require it)

---

## 25. Phased Architecture

Phase 1 — Accounting Foundation: accounts → source transactions → posting kernel → periods → reporting → source documents → expenses → fixed assets/depreciation → corrections → tenant/RLS.

Phase 2 — Tax Adjustment Layer: accounting-to-tax bridge → add-backs → exempt-income treatment → capital allowances → losses → tax-specific adjustments.

Phase 3 — Nigerian Tax Rules Engine: versioned parameters → formulas → effective dates → statutory citations → calculation context → trace → deterministic result.

Phase 4 — Compliance: obligations → evidence → filing → payment → reconciliation → dashboard/notifications.

Each phase depends on the prior one. Phase 1 is the prerequisite for Phases 2–4.

---

## 26. Architectural Invariants

1. Every posted journal entry balances: total debits = total credits.
2. Posted accounting facts are never silently mutated, deleted, or overwritten.
3. Every accounting fact is tenant/entity scoped and RLS-enforced.
4. Source provenance is retained from business activity to report result.
5. Source ingestion and posting are idempotent.
6. Authoritative balances derive from posted journal entries; caches are optimizations only.
7. Monetary arithmetic is exact; binary floating-point is prohibited for money.
8. Closed periods reject ordinary postings.
9. Corrections preserve history through reversal plus linked correcting entries.
10. Accounting depreciation and tax capital allowances are separate calculations.
11. Tax rules are versioned and date-resolved; statutory rules are not tenant-editable.
12. Tax results are reproducible from accounting facts, tax adjustments, rule versions, and calculation context.

---

## 27. Open Decisions / Statutory Dependencies

Class A — architectural decisions resolved in this document:

- money representation: Decimal.js plus NUMERIC storage, ROUND_HALF_UP
- period granularity: monthly open periods; annual mapping for assessment
- reporting authority: postings-derived
- correction model: immutable postings plus reversal
- accounting boundary: entity-scoped books

Class B — implementation details deferred:

- exact chart of accounts seed list
- schema DDL and migration strategy
- cache design for reporting aggregates
- reverse gross-to-net/VAT derivation (new calculation-engine work; not yet designed)

Class C — statutory facts awaiting authoritative sources. These must not be invented:

- NTAA 2025 primary text (absent from NRS-docs/) and NTAA §22 provisions, including the small-business VAT exemption question
- general VAT return deadline (NTAA-dependent; day 21 is a PRD default, not verified authority)
- "small business" definition (the term is absent from the NTA 2025 text; only "small company" is defined)
- WHT subsidiary regulation, rate table, and deadline where not sourced
- VAT registration threshold where not sourced
- First Schedule capital-allowance values until verified from the canonical statutory source
- effective date of the Presidential Order that reduces the CIT rate to 25%

Resolved-in-repository statutory facts that this blueprint relies on (source: NRS-docs/NIGERIA-TAX-ACT-2025.md):

| Fact | Value | Citation |
| :--- | :--- | :--- |
| Small company definition | gross turnover ≤ ₦50,000,000 per annum; total fixed assets ≤ ₦250,000,000; professional services excluded | line 4502 |
| CIT rate — small company | 0% | line 1604 |
| CIT rate — other companies | 30% from commencement; 25% effective from a date per Presidential Order | lines 1606–1608 |
| VAT remittance deadline | on or before the 14th day of the month immediately following the month of transaction | §155(4), line 3225 |

---

## 28. Acceptance Criteria (this document)

- Architecture-first. No SQL and no schema DDL.
- Double-entry invariant is explicit.
- Exact money is resolved to a concrete direction.
- Periods, close, and lock semantics are explicit.
- Corrections are non-destructive.
- Reporting derives from postings.
- Payments, expenses, and fixed assets are covered at the correct conceptual depth.
- Depreciation is separated from capital allowances.
- The accounting-to-tax boundary is explicit.
- Tax temporal semantics are explicit.
- Rule versioning, effective dates, and citations are explicit.
- Tenant isolation is explicit, without conflating `settings_id` and `entity_id`.
- Statutory uncertainties are preserved as unresolved.
- Non-goals and phases are explicit.
- Invariants are testable.

---

## 29. Change Log

| Date | Change |
| :--- | :--- |
| 2026-09-05 | v1 draft created. |