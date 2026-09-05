# 🏗️ WATERFALL ROADMAP [EXECUTION SEQUENCE]

> ⛔ **STATUS: ACTIVE PLANNING BASELINE — PHASES PENDING UNTIL GATES CLOSE**
>
> This is a **Living Command Document**. The baselines below are locked. Phases stay **PENDING** until their exit gates close.
> Once a phase's gate closes, this document becomes the single source of truth for its execution order.
>
> *Owner:* BIGDROPS Taxation / Accounting Workstream

---

## 0. PURPOSE AND LOCKED BASELINES

### 0.1 Purpose

This roadmap sequences the BIGDROPS taxation and accounting workstream. It is the authoritative implementation-ordering document. It tells future execution agents what must happen, in what dependency order, what may proceed in parallel, what is gated, and what must remain deferred.

### 0.2 Locked baselines

| Baseline | Document | Status |
| :--- | :--- | :--- |
| Active technical plan | Technical-plan-v1.1.md | Confirmed active. Technical-plan.md (v1.0) is superseded. Technical-plan-v1.2.md does not exist and must not be created. |
| Target architecture | Accounting-foundation-blueprint-v1.md | Confirmed target. Architecture Blueprint, not implementation. |
| Current implementation state | docs/Reports/general/accounting-foundation-implementation-audit-2026-09-05.md | Confirmed evidence baseline. Do not claim implemented capability without this audit's support. |
| Scope reconciliation | docs/Reports/general/record-capture-accounting-foundation-reconciliation-2026-09-05.md | Record Capture stays a narrow capture surface. Accounting Foundation is downstream. |

### 0.3 Dependency chain

```
Technical-plan-v1.1  →  Accounting-foundation-blueprint-v1  →  Implementation audit  →  This roadmap
```

Target long-term sequence:

```
Record Engagement
→ Accounting Foundation
→ Tax Adjustments
→ Nigerian Tax Rules Engine
→ Compliance / Filing / Reconciliation
→ Propagation and ongoing engagement
```

### 0.4 Architectural principle

The intended architecture is: **Record → Reconcile → Explain → Optimise → Comply → Transmit**.

The Accounting Foundation supplies authoritative financial facts between operational recording and tax calculation. Do not build the roadmap around the assumption that BIGDROPS needs a tax calculator on top of invoice aggregates. Do not collapse accounting, tax adjustment, and tax rules into one calculation engine.

### 0.5 Status taxonomy

The roadmap uses four states for current capability:

| State | Meaning |
| :--- | :--- |
| IMPLEMENTED / REUSABLE | Exists and can be reused. |
| PARTIAL / REQUIRES INTEGRATION | Meaningful implementation exists but is not authoritative accounting. |
| MISSING / GREENFIELD | No meaningful implementation found. |
| DEFERRED / OUT OF CURRENT SCOPE | Intentional future scope, not a defect. |

---

## 1. CURRENT STATE vs TARGET STATE MATRIX

| Capability | Current state (audit evidence) | Target state | Roadmap state |
| :--- | :--- | :--- | :--- |
| Record Engagement | Record-engagement-plan-v1.md is a planning artifact. No prompts, escalation, or enforcement engine. | Upstream behavioral layer; inferred activity never becomes accounting fact | PARTIAL / REQUIRES INTEGRATION |
| Source transactions | invoices, payments, receipts, tax_input_entries, wht_receipts exist as operational records. Partial idempotency (receipt snapshot, record_payment_transaction RPC). | Unified source-fact model with lifecycle, source key, provenance | PARTIAL / REQUIRES INTEGRATION |
| Chart of accounts | No accounts table or account model. Only free-text category fields. | Entity-scoped accounts with types, codes, hierarchy, active/inactive | MISSING / GREENFIELD |
| Journal / posting kernel | No journal tables, no debit/credit, no balanced-posting check. record_payment_transaction is an atomic operational write, not a posting. | Single posting boundary; balanced double-entry; immutable; idempotent | MISSING / GREENFIELD |
| Money precision | Decimal.js in Calculations.ts (precision 20, ROUND_HALF_UP). JavaScript number arithmetic in financialState.ts and paymentService.ts. Unconstrained `numeric` storage. | Decimal.js everywhere money is authoritative; NUMERIC(18,2) accounting storage; one rounding mode | PARTIAL / REQUIRES INTEGRATION |
| Accounting periods | period_start/period_end on tax_filings and tax_reminders. No lifecycle, no open/closed/locked states. | First-class periods with open/closed/locked semantics and posting restrictions | PARTIAL / REQUIRES INTEGRATION |
| Revenue | Invoice statuses derived from payment aggregates (financialState.ts). No recognition policy. | Invoice is a claim; recognition policy lives in the accounting layer | PARTIAL / REQUIRES INTEGRATION |
| Payments | Payments table (invoice_id FK, cash_amount, wht_amount, method, attachments). Partial, overpayment, soft-void supported. Never posts entries. | Payment as source transaction feeding postings; allocation, overpayment, reversal semantics | PARTIAL / REQUIRES INTEGRATION |
| Expenses / money-out | No expense table, no supplier-payment flow. Record-capture-v1.md defines the requirement. | Expense and supplier-payment records that can become accounting facts | MISSING / GREENFIELD |
| Fixed assets / depreciation | No asset register, no depreciation code. | Capitalization, useful life, depreciation, disposal; separate from tax capital allowances | MISSING / GREENFIELD |
| Corrections / reversals | Payment soft-void with audit event. No posted entries, no reversal entries. | Immutable postings; corrections via reversal and linked correcting entries | PARTIAL / REQUIRES INTEGRATION |
| Audit / provenance | audit_logs and activity_events tables; src/lib/audit.ts record functions; payment attachments; receipt snapshots; wht_receipts evidence. | Provenance from business activity to journal line to report result | IMPLEMENTED / REUSABLE |
| Tenant isolation | Entity schemas provisioned from master template; 158 RLS policies; entity permissions; entity lifecycle. Tax tables settings_id-scoped. | Entity-scoped accounting books per Gate A; RLS at schema boundary | IMPLEMENTED / REUSABLE |
| Accounting-to-tax bridge | No accounting profit, no adjustment records. WHT summary is operational derivation. | Accounting profit → tax adjustments → taxable profit | MISSING / GREENFIELD |
| Tax rules engine | No parameter store, no rule versions, no citations in code. | Versioned parameters, effective dates, citations, deterministic trace | MISSING / GREENFIELD |
| Loss register | No loss register. | Tax-loss lifecycle; carry-forward values per verified sources only | MISSING / GREENFIELD |
| Compliance | Compliance Hub (VatInputsPanel, WhtReceiptsPanel, TaxFilingsPanel, TaxRemindersPanel); notifications and push infrastructure; tax_filings and tax_reminders tables. Files-tax-monthly-v1.md is a PRD, not implemented. | Obligations, evidence, filing prep, payment tracking, reconciliation, dashboard, notifications | PARTIAL / REQUIRES INTEGRATION |
| Propagation | Notifications and push infrastructure exist. WhatsApp, email, scheduling do not. | In-app first; WhatsApp/email/scheduling deferred | PARTIAL / REQUIRES INTEGRATION |
| Deferred domains | Bank feeds, multi-currency, inventory, procurement, payroll, consolidation, budgeting, dunning, hash chain absent. | Stay out of v1 scope | DEFERRED / OUT OF CURRENT SCOPE |

---

## 2. HARD GATES

The roadmap is gated, not time-based. A phase does not start authoritative work until its gates close.

| Gate | Condition | Blocks |
| :--- | :--- | :--- |
| GATE A | Entity accounting boundary decided: entity_id vs settings_id. Which books are authoritative, and how settings-scoped tax facts migrate. | Phase 1 accounting schema design |
| GATE B | Money precision and authoritative financial-path policy established: NUMERIC(18,2) convention, Decimal.js prerequisite for paths that feed accounting, identification of JavaScript-number paths to remediate. | Phase 1 storage and financial paths |
| GATE C | Balanced posting kernel exists. Unbalanced postings are impossible at the posting boundary. | Authoritative journal-derived reporting (trial balance, GL, P&L) and all downstream tax work |
| GATE D | Accounting-to-tax bridge exists: accounting profit plus adjustments produce taxable-profit inputs. | Profit-based CIT becoming authoritative |
| GATE E | Statutory rule evidence exists in the repository for a given value before that value becomes a production rule. | Statutory-dependent implementation points (WHT rates, VAT threshold, capital allowances, CIT order date) |
| GATE F | Compliance calculations, evidence, and reconciliation are reproducible from authoritative facts. | Compliance status represented as authoritative |

Statutory gaps do not block architecture. They block only the gated statutory-dependent implementation points.

---

## 3. PHASE 0 — ARCHITECTURE GATES / BASELINE LOCK

**Objective:** Lock baselines and resolve the pre-implementation decisions that Phase 1 depends on.

**Inputs / dependencies:** Technical-plan-v1.1.md; Accounting-foundation-blueprint-v1.md; accounting-foundation-implementation-audit-2026-09-05.md; folder Readme.md.

**Implementation scope:**
- Confirm Technical-plan-v1.1 as the active technical baseline.
- Confirm Accounting-foundation-blueprint-v1 as the target architecture.
- Confirm the implementation audit as the current-state baseline.
- Resolve the entity accounting boundary (GATE A): whether accounting books are entity-scoped from day one, and how settings-scoped tax facts (tax_input_entries, tax_filings, tax_reminders, tax_settings) migrate.
- Establish the accounting money convention and the authoritative financial-path policy (GATE B): NUMERIC(18,2) for accounting storage; Decimal.js and ROUND_HALF_UP; identify the JavaScript-number paths in financialState.ts and paymentService.ts that must be remediated before they feed accounting.
- Confirm the posting-boundary architecture: the blueprint requires one posting kernel as the single entry point. Decide the enforcement mechanism (database RPC versus domain service) before Phase 1 implementation.
- Confirm the chart-of-accounts seed policy. The blueprint defers the exact seed list; decide the policy now.
- Separate statutory evidence gaps from engineering gaps. Maintain the statutory-evidence register in section 9.

**Explicit non-scope:** No accounting tables. No rules engine. No tax calculations. No compliance claims.

**Exit gate:** GATE A and GATE B decided and recorded. Posting-boundary decision recorded. Seed policy chosen. Statutory register compiled.

**Verification / acceptance criteria:**
- The entity-boundary decision names the authoritative book scope and the migration rule for settings-scoped tax facts.
- The money policy names the storage convention and the financial paths that require Decimal migration.
- No architectural decision is left implicit.

**Dependencies on prior phases:** None. This is the first phase.

**Safe parallel work:** Statutory-source acquisition and verification (feeds Phase 3). Documentation and UX preparation that does not invent accounting behavior.

**Known risks:** Scope drift into architecture redesign. The audit is the baseline; do not reopen it.

**Statutory evidence requirements:** Compile the register only. Do not resolve the values.

---

## 4. PHASE 1 — ACCOUNTING FOUNDATION

**Objective:** Produce authoritative accounting facts. Authoritative balances derive from posted journal entries, not from operational aggregates.

**Inputs / dependencies:** Phase 0 decisions; Accounting-foundation-blueprint-v1 sections 4 to 18; implementation audit.

**Implementation scope (approximate order):**
1. Accounting domain boundaries (blueprint section 4).
2. Chart of accounts (section 7), per the Phase 0 seed policy and GATE A scope.
3. Source transaction model (section 6).
4. Journal headers and lines (section 8).
5. Balanced posting kernel (section 8): total debits equal total credits; unbalanced postings impossible; idempotent; source-linked; period-validated.
6. Accounting periods (section 10): planned → open → closed → locked.
7. Revenue and source-document posting (section 12): invoice as claim; recognition policy in the accounting layer.
8. Payments and allocations (section 13): source transactions; partial, overpayment, unallocated, reversal semantics.
9. Expenses / money-out (section 14): operating expenses, supplier payments, purchases, tax-relevant expenses, supporting evidence.
10. Fixed assets and accounting depreciation (section 15): capitalization, useful life, straight-line v1 default, disposal. Never a synonym for tax capital allowances.
11. Corrections / reversals / idempotency (section 16): immutable postings; reversal plus linked correcting entries.
12. Provenance and auditability (section 17): walk from posting to journal line to source transaction to recorded activity.
13. Tenant isolation (section 18): entity-scoped accounting facts per GATE A; RLS at the schema boundary.
14. Journal-derived reporting (section 11): trial balance, general ledger, profit and loss, balance sheet where justified. Caches are optimizations only.

**Explicit non-scope:** No Nigerian tax rules in the journal layer. No depreciation-as-capital-allowance. No CIT. No compliance claims. No expense UI design beyond the Record Capture surface.

**Exit gate:** GATE C. A balanced posting kernel exists; unbalanced postings are impossible; journal-derived trial balance reproduces exactly from postings; immutability and reversal semantics are verified.

**Verification / acceptance criteria:**
- Posting-balance property test: every accepted posting has equal debits and credits.
- Reversal test: reversal of a posted entry leaves the ledger consistent with history preserved.
- Provenance walk test: every report figure traces to postings, source transactions, and recorded activity.
- Period test: closed periods reject ordinary postings.
- Tenant test: cross-entity access is denied at the schema boundary.

**Dependencies on prior phases:** Phase 0 (gates A, B, posting-boundary decision).

**Safe parallel work:** Statutory-source acquisition (Phase 3 inputs). Record Engagement UX design (no accounting integration). Compliance UI preparation (no filing authority).

**Known risks:** Remediating JavaScript-number financial paths while current product surfaces still depend on them; settings-scoped tax data migration under GATE A; scope creep into tax.

**Statutory evidence requirements:** None. Accounting is pre-tax.

---

## 5. PHASE 2 — ACCOUNTING → TAX BRIDGE

**Objective:** Transform accounting facts into taxable-profit inputs through explicit adjustments.

**Inputs / dependencies:** Phase 1 (accounting facts and accounting profit); blueprint sections 19 and 22.

**Implementation scope:**
- Accounting profit basis.
- Tax adjustments.
- Disallowables / add-backs.
- Exempt-income treatment.
- Capital allowances (statutory allowances computed from qualifying asset facts; separate from accounting depreciation).
- Losses and the loss register (section 22).
- Reconciliation from accounting profit to taxable / chargeable profit.
- Deterministic calculation context (section 20): entity, accounting period, assessment period, calculation date, transaction facts, accounting facts, applicable rule version.

**Explicit non-scope:** No statutory values invented. No changes to accounting postings. The bridge reads accounting facts and records adjustments; it never modifies postings.

**Exit gate:** GATE D. The bridge produces taxable-profit inputs from accounting facts plus versioned adjustments.

**Verification / acceptance criteria:**
- A profit-reconciliation walk exists from accounting profit to taxable profit.
- Every adjustment carries a rule citation or an explicit unresolved marker.
- No adjustment mutates accounting postings.

**Dependencies on prior phases:** Phase 1 (GATE C must be closed).

**Safe parallel work:** Statutory evidence work (feeds GATE E). Compliance UI preparation.

**Known risks:** Conflating depreciation with capital allowances; treating an unresolved statutory item as resolved.

**Statutory evidence requirements:** Capital-allowance values, loss carry-forward periods, and other statutory parameters are gated on evidence (GATE E). Do not invent them.

---

## 6. PHASE 3 — NIGERIAN TAX RULES ENGINE

**Objective:** Versioned, cited, reproducible statutory computation.

**Inputs / dependencies:** Phase 2 bridge outputs; canonical NTA 2025 source documents in NRS-docs/; the statutory-evidence register.

**Implementation scope:**
- Versioned statutory parameters.
- Effective dates on every parameter and rule.
- Rule identifiers and statutory citations (Act, section, sub-section).
- Calculation inputs and context.
- Deterministic formulas separate from parameters.
- Reproducible result trace: same context plus same rule versions yields the same result.
- Explicit separation between verified statutory rules and unresolved assumptions.

**Verified statutory values usable from the repository (NRS-docs/NIGERIA-TAX-ACT-2025.md):**
- Small company definition: gross turnover ≤ ₦50,000,000 per annum; total fixed assets ≤ ₦250,000,000; professional services excluded (line 4502).
- CIT rate — small company: 0% (line 1604).
- CIT rate — other companies: 30% from commencement; 25% effective from a date per Presidential Order (lines 1606–1608).
- VAT remittance deadline for designated withholding agents: on or before the 14th day of the month after the transaction month (section 155(4), line 3225).

**Unresolved statutory items (explicit blockers, not implementation tasks):**
- NTAA 2025 primary text (absent from NRS-docs/), including the general VAT return deadline and any small-business exemption.
- WHT subsidiary regulation: rate table and remittance deadline.
- VAT registration threshold.
- First Schedule capital-allowance values where not yet verified.
- Presidential Order / 25% CIT applicability and effective status where not yet verified.

**Explicit non-scope:** No change to accounting postings. No compliance UI. No tenant-editable statutory rules.

**Exit gate:** GATE E. Every production rule value has repository evidence; every unresolved value remains an explicit blocker.

**Verification / acceptance criteria:**
- Determinism test: identical inputs and rule versions produce identical results.
- Citation test: every rule parameter carries a citation.
- Separation test: verified values and unresolved assumptions are stored separately.

**Dependencies on prior phases:** Phase 2 (GATE D closed) for profit-based rules; Technical-plan-v1.1 for document-level VAT/WHT calculations.

**Safe parallel work:** Statutory-source acquisition continues; Compliance UI preparation.

**Known risks:** Introducing rules before accounting facts exist; treating PRD defaults as statutory authority.

**Statutory evidence requirements:** The register above governs. Day-21 deadlines remain PRD defaults, not verified authority. WHT rates remain working assumptions until the subsidiary regulation is sourced.

---

## 7. PHASE 4 — COMPLIANCE

**Objective:** Reproducible compliance positions, evidence, filing preparation, payment tracking, and reconciliation over authoritative facts.

**Inputs / dependencies:** Phase 2/3 outputs; Files-tax-monthly-v1.md; existing Compliance Hub panels; tax_filings and tax_reminders tables; notifications and push infrastructure.

**Implementation scope:**
- Obligation determination.
- Evidence requirements (per applicable rules; never invented).
- Filing preparation from prepared data.
- Payment tracking.
- Reconciliation of filing versus payment versus records.
- Compliance status.
- Dashboard visibility.
- Notifications and reminders.
- Record Engagement integration (bounded by Phase 5).

**Preserved distinctions:**
- WHT deducted from BIGDROPS by customers: tax credit, evidence, reconciliation.
- WHT deducted by BIGDROPS from supplier payments: withholding-agent liability, remittance, evidence.
- Customer WHT never reduces VAT. The existing hard rule stands: no fabricated values for blocked fields; "deducted by you" WHT renders "not tracked yet" until a supplier-payment capture surface exists; the WHT remittance deadline renders "pending" until the regulation is sourced.

**Explicit non-scope:** No external tax-authority API integration. No direct filing or payment transmission. No invented deadlines or evidence requirements. The Files-tax delivery mechanism stays an open decision.

**Exit gate:** GATE F. Compliance positions are reproducible from accounting facts, tax rules, evidence, and reconciliation records.

**Verification / acceptance criteria:**
- Trace test: every compliance figure traces to prepared data.
- No-fabrication test: blocked fields never render zero or guessed values.
- Reconciliation test: filing, payment, and records reconcile.

**Dependencies on prior phases:** Phase 2 and Phase 3 for tax values; Phase 1 for accounting facts.

**Safe parallel work:** Record Engagement design; propagation planning.

**Known risks:** Presenting compliance status as authoritative before gates E and F close; API-integration scope creep.

**Statutory evidence requirements:** Deadlines and rates from the register only.

---

## 8. PHASE 5 — RECORD ENGAGEMENT / PROPAGATION INTEGRATION

**Objective:** A behavioral layer that drives recording of real business activity. It operates over observable evidence and confirmed records. It is not an accounting substitute.

**Inputs / dependencies:** Record-engagement-plan-v1.md; Record-capture-v1.md; Files-tax-monthly-v1.md; existing notifications, dashboard, and Compliance Hub infrastructure.

**Core lifecycle:**

```
EXPECTED ACTIVITY → SIGNAL / EVIDENCE → PROMPT → RECORD → RESOLVE
```

**Unresolved-activity lifecycle:**

```
PROMPT → SNOOZE / DISMISS / DEFER → RE-PROMPT → ESCALATE → PERSISTENT ATTENTION → CONTROLLED ENFORCEMENT WHERE JUSTIFIED
```

**Activity semantics (preserved):**
- Confirmed: a direct BIGDROPS fact recorded by the user or system.
- Strongly indicated: evidence or signal that requires confirmation before it becomes a record.
- Suggested: a recurring pattern or seasonality suggestion.
- Inferred or suggested activity never becomes accounting fact without recording or confirmation.

**Intervention levels:**
- L0 — passive visibility.
- L1 — contextual nudge.
- L2 — persistent reminder.
- L3 — escalated attention.
- L4 — controlled workflow gate.

**Gating semantics:** Narrow and justified. No blanket "record everything before using BIGDROPS" gate. Record Capture stays a narrow plain-language capture surface; it does not become a general-ledger interface.

**Integration constraint:** Accounting integration waits for stable accounting boundaries and source-transaction semantics from Phases 1 and 2.

**Explicit non-scope:** No fabrication of activity. No auto-posting. No financial-health score. No new capture architecture beyond Record-capture-v1.md.

**Exit gate:** Confirmed records flow to accounting source transactions only through the defined recording path; no inferred activity reaches accounting facts.

**Verification / acceptance criteria:**
- Invariant test: no accounting fact exists without a confirmed record.
- Escalation test: intervention levels behave per the plan.
- Enforcement test: any L4 gate is narrow, justified, and documented.

**Dependencies on prior phases:** Phase 1 (boundaries and source-transaction semantics).

**Safe parallel work:** UX design for engagement surfaces (no accounting integration).

**Known risks:** Turning engagement into enforcement; prompting on signals without confirmation.

**Statutory evidence requirements:** None specific to this phase.

---

## 9. PHASE 6 — DEFERRED EXTENSIONS

Marked as future scope. Do not pull these into v1 without a separate approved decision:

- Bank feeds and automatic reconciliation.
- Multi-currency.
- Inventory, procurement, production.
- Payroll / PAYE.
- Group consolidation.
- Budgeting and dunning.
- Optional cryptographic hash-chain audit enhancement.
- WhatsApp, email, and scheduling propagation.
- External tax-authority or API transmission (APP-based NRS e-invoicing transmission is governed by Technical-plan-v1.1 section 7; direct tax-authority integration is not a v1 requirement unless separately approved).

**Statutory evidence register (maintained here):**
| Item | State |
| :--- | :--- |
| NTAA 2025 primary text | Absent from NRS-docs/; required for general VAT return deadline and any small-business exemption |
| WHT subsidiary regulation (rates and remittance deadline) | Not sourced |
| VAT registration threshold | No primary source in repository |
| First Schedule capital-allowance values | Not verified from canonical source |
| Presidential Order / 25% CIT applicability | Effective status not verified |

---

## 10. PARALLEL WORKSTREAMS

| Workstream | May run alongside | Dependency boundary |
| :--- | :--- | :--- |
| Statutory-source acquisition and verification | Phase 1 and Phase 2 architecture | Feeds Phase 3 (GATE E). Never blocks accounting architecture. |
| Documentation and UX preparation | Phase 1 backend work | Must not invent accounting behavior. |
| Record Engagement UX design | Phase 1 | Accounting integration must wait for stable accounting boundaries and source-transaction semantics. |
| Compliance UI preparation | Phase 1, 2, 3 | Must not pretend filing authority or final tax calculations. |

---

## 11. MIGRATION AND RECONCILIATION STRATEGY

**Principle:** Existing operational records are source infrastructure. They are integrated into accounting; they are not mistaken for a ledger. Historical operational records are never silently rewritten.

**Candidate source events:**
- Payments: money-in with invoice link. Strong candidate. Idempotent RPC (record_payment_transaction) and receipt snapshots exist.
- Invoices: claims with totals and status. Candidate for revenue source transactions under the recognition policy.
- Receipts: acknowledgement evidence with snapshot and idempotency.
- tax_input_entries: settings-scoped input-VAT records. Migration into entity-scoped accounting facts is governed by GATE A.
- wht_receipts: WHT credit evidence.

**What is safe to migrate:**
- Operational events with provenance and idempotency.
- Events that reconcile to current operational totals.

**Reconciliation requirements:**
- Migrated accounting totals must reconcile to operational totals before cutover.
- No opening balances are fabricated. Where a source event lacks provenance, it is quarantined, not guessed.
- Provenance is preserved through audit_logs and activity_events linkage.

**No silent rewrite rule:** Source records stay as the operational record. Accounting postings are derived from them; they are not mutations of them. Corrections to accounting effects use reversal and correcting entries.

---

## 12. MILESTONE TRACKER

| ID | Milestone / Phase | Priority | Status | % Complete | Last Updated |
|----|-------------------|----------|--------|------------|--------------|
| GA | GATE A — entity accounting boundary decided | CRIT | ⛔ PENDING | 0% | N/A |
| GB | GATE B — money precision and financial-path policy | CRIT | ⛔ PENDING | 0% | N/A |
| M0 | Phase 0 — baseline lock and architecture gates | HIGH | ⛔ PENDING | 0% | N/A |
| GC | GATE C — balanced posting kernel exists | CRIT | ⛔ PENDING | 0% | N/A |
| M1 | Phase 1 — Accounting Foundation | HIGH | ⛔ PENDING | 0% | N/A |
| GD | GATE D — accounting-to-tax bridge exists | CRIT | ⛔ PENDING | 0% | N/A |
| M2 | Phase 2 — Accounting → Tax Bridge | HIGH | ⛔ PENDING | 0% | N/A |
| GE | GATE E — statutory evidence for production rules | CRIT | ⛔ PENDING | 0% | N/A |
| M3 | Phase 3 — Nigerian Tax Rules Engine | HIGH | ⛔ PENDING | 0% | N/A |
| GF | GATE F — reproducible compliance | CRIT | ⛔ PENDING | 0% | N/A |
| M4 | Phase 4 — Compliance | HIGH | ⛔ PENDING | 0% | N/A |
| M5 | Phase 5 — Record Engagement integration | MED | ⛔ PENDING | 0% | N/A |
| M6 | Phase 6 — deferred extensions (review) | LOW | ⛔ PENDING | 0% | N/A |

**Status legend (unchanged):** ✅ IMPLEMENTED | 🔄 IMPROVED | 🛠️ CORRECTED | ⏭️ SUPERSEDED | ⛔ PENDING

---

## 13. EXECUTION ORDER SUMMARY

1. Phase 0 → close Gate A and Gate B.
2. Phase 1 → close Gate C (posting kernel before journal-derived reporting).
3. Phase 2 → close Gate D (bridge before profit-based CIT).
4. Phase 3 → close Gate E (evidence before production rules).
5. Phase 4 → close Gate F (reproducible compliance).
6. Phase 5 → Record Engagement integration over stable boundaries.
7. Phase 6 → deferred; review only.

Parallel workstreams (section 10) may run against their stated dependency boundaries. External authority transmission stays out of v1 scope unless separately approved.

---

## 14. CHANGELOG / LOG OF DECISIONS

| Date | Action Taken | Status Applied | Reason / Note |
|------|--------------|----------------|---------------|
| 2026-09-05 | Roadmap populated from placeholder to authoritative sequencing document. Baselines locked: Technical-plan-v1.1 active; Accounting-foundation-blueprint-v1 target; implementation audit current-state. Gates A–F defined; Phases 0–6 sequenced; migration strategy added. | ⛔ PENDING | Baseline audit and implementation audit completed; v1.2 confirmed nonexistent. |