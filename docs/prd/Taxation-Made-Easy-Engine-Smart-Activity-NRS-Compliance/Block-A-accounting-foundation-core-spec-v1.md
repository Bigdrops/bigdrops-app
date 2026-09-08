# Block A — Accounting Foundation Core — Implementation Specification v1

Status: Canonical Block A implementation specification. Reconstructed, not greenfield.

Version: 1.0

Date: 2026-09-08

Domain: Accounting Foundation (pre-tax)

This document is the implementation specification for Block A: Accounting
Foundation Core, as defined in the CIT-Readiness Roadmap
(cit-readiness-roadmap-2026-09-08.md). It sits below the architecture
blueprint (Accounting-foundation-blueprint-v1.md). The blueprint defines
the architecture. This document maps that architecture to the
implementation that already exists and names what is still missing.

Provenance: a standalone Block A specification was never persisted. This
document reconstructs it from the blueprint, the CIT-Readiness Roadmap,
the Gate A/B decision record, and Accounting Foundation Increment 1
through 10 reports. It invents no new accounting architecture and no
statutory value.

---

## 1. Purpose and Objective

Block A establishes the accounting core that every CIT prerequisite
consumes. The roadmap defines Block A as: the journal kernel, the chart
of accounts, the period model, and entity-scoped accounting.

The objective of this specification is to:

- record which Block A capabilities are already built, tested, and
  verified;
- name the exact remaining gaps;
- define the contracts the remaining work must obey;
- stop Block A from absorbing downstream tax work.

This specification does not implement anything. It is a specification
only.

---

## 2. Architectural Position

Block A is Prerequisite 1 of the CIT-readiness dependency chain. The
preserved architecture is:

```
Business Activity
→ Source Transaction
→ Accounting Classification / Mapping
→ Posting Kernel
→ Journal
→ Accounting Period
→ Financial Reporting
→ Tax Adjustment
→ CIT
```

Two separations are hard rules, inherited from the blueprint:

1. Record Engagement and Record Capture are upstream. They record
   facts. They never classify for accounting or tax.
2. Tax Adjustment and CIT are downstream. They consume accounting
   facts. They never write into the journal layer.

Block A covers the chain from Source Transaction through Accounting
Period, plus the minimum reporting foundation that Financial Reporting
needs. Tax Adjustment and CIT are outside Block A.

---

## 3. Determination: Implementation Block or Foundation Gate?

The roadmap labels Block A the "first practical implementation block".
The repository evidence says otherwise.

Increments 1 through 6 built and verified the Block A core:

- Increment 1: accounting domain kernel with posting invariants
  (schema-free TypeScript, 15 unit tests).
- Increment 2: persistence for accounts, periods, journal entries, and
  journal lines, with database-enforced balance, immutability, and
  idempotency. Gate A and Gate B closed. Positive posting path verified
  live through an authenticated operator.
- Increment 3: the source transaction boundary with a guarded
  lifecycle and controlled ingestion, confirmation, and posting RPCs.
- Increment 4A / 4B: invoice and payment ingestion adapters through the
  boundary. Both verified end to end on the hosted database.
- Increment 5: read-only reconciliation and integrity detection.
- Increment 6: controlled remediation boundary for missing facts.

Determination: Block A is substantially CLOSED as an implementation
increment. It must be treated as a foundation gate, not as a greenfield
block. Two genuine gaps remain, plus verification and retention items:

1. REQUIRED GAP — the journal-derived reporting foundation (account
   balances, trial balance, period totals derived from posted lines).
2. REQUIRED GAP — a controlled reversal path for posted entries
   (the domain kernel has reversal semantics; no boundary flow uses
   them yet).

No new implementation increment may rebuild any component listed as
EXISTING / CLOSED in section 7.

---

## 4. Scope

In scope for Block A:

- entity-scoped accounting books
- the authoritative accounting book per entity
- the chart of accounts and its seed policy
- the accounting-period model and its state machine
- the journal / posting kernel and its persistence
- the source transaction boundary
- accounting classification and mapping (adapter-level account mapping)
- accounting invariants
- journal immutability and the controlled correction model
- the minimum reporting foundation for downstream P&L
- traceability from business activity to journal entries

## 5. Non-Scope

Out of scope for Block A. Each item is a downstream dependency
(section 18):

- expense accounting consumption (Block B)
- purchase / supplier accounting (Block B downstream)
- inventory accounting
- fixed assets and depreciation (Blocks E and F)
- credit notes and refunds as business modules (the generic reversal
  capability is in scope; the business flows are not)
- other income
- VAT accounting treatment
- WHT accounting and tax-credit treatment
- accounting-period P&L and income statement (Block D)
- tax-adjustment layer (Block H)
- CIT calculation (Block K)
- Record Capture changes of any kind

---

## 6. Classification Legend

This specification classifies every component into five states:

| State | Meaning |
| :--- | :--- |
| EXISTING / CLOSED | Built, tested, and verified by a closed increment. Do not rebuild. |
| EXISTING / RETAIN | Built for operational use. Keep it. Its authority transfers to the ledger at a defined point. |
| REQUIRED GAP | A genuine remaining Block A gap. Needs an implementation increment. |
| VERIFY DURING IMPLEMENTATION | Architecture exists. A detail must be confirmed against the repository or hosted database during the gap increment. |
| DEFERRED / DOWNSTREAM | Explicitly not Block A. Owned by a later block. |

---

## 7. Existing and Closed Foundation

| Capability | State | Evidence |
| :--- | :--- | :--- |
| Entity accounting boundary (Gate A) | EXISTING / CLOSED | Gate A/B decision record 2026-09-05. Book key is `public.entities.id`. `settings_id` is prohibited as an ownership key. |
| Money precision (Gate B) | EXISTING / CLOSED | Gate A/B decision record 2026-09-05. Domain: Decimal.js, precision 20, ROUND_HALF_UP. Persistence: NUMERIC(18,2), CHECK (amount >= 0). |
| Accounting domain kernel | EXISTING / CLOSED | Increment 1. `src/domain/accounting/`: types, money, invariants, factories, chartOfAccounts, postingKernel. 15 kernel tests. |
| Accounting persistence and enforcement | EXISTING / CLOSED | Increment 2. Migration 20260905142503. Four tables in `tenant_master_template`, RLS forced, seven guard triggers, `post_accounting_entry` RPC. Backfilled to all live entity schemas. |
| Positive posting path | EXISTING / CLOSED | Increment 2 positive-path close-out 2026-09-06 (authenticated UI posting, POSTED entry, no edit/delete/retract exposed). Re-proven live in Increment 4A/4B verification. |
| Chart of accounts | EXISTING / CLOSED | Increment 2 seed: 11 NGN accounts, entity-scoped, unique codes. Seeded at provisioning. Mirrored by `SEED_ACCOUNT_GROUPS` in `src/domain/accounting/chartOfAccounts.ts`. |
| Source transaction boundary | EXISTING / CLOSED | Increment 3. Migration 20260906103000. `source_transactions` table, lifecycle guard, `ingest_source_transaction`, `confirm_source_transaction`, `post_from_source_transaction`. 32 contract tests. |
| Invoice ingestion | EXISTING / CLOSED | Increment 4A. Claim posting: debit 1200, credit 4000. Idempotency keys `invoice:<id>:ingest` / `invoice:<id>:post`. Live end-to-end verification 14/14 checks (Increment 4A hosted closeout). |
| Payment ingestion | EXISTING / CLOSED | Increment 4B. Settlement posting: debit 1100, credit 1200, cash amount only. WHT excluded from the journal by design. Live verification 19/19 checks. |
| Reconciliation and integrity detection | EXISTING / CLOSED | Increment 5. `reconcile_accounting_integrity` is read-only. Seven finding types. Zero-mutation proven statically and live. |
| Controlled remediation boundary | EXISTING / CLOSED (contract) | Increment 6. `remediate_accounting_gap` with five result codes, row locks, and re-validation under lock. Hosted live verification is a deferred acceptance item (section 22). |
| Period state machine (database level) | EXISTING / CLOSED | Increment 2 period guard trigger: planned → open → closed → locked, identity frozen after planned. |
| Record Capture boundary | EXISTING / CLOSED | Increment 10 plus roadmap revision note 1. Record Capture stays factual. No accounting or tax classification fields in `tax_input_entries`. |

---

## 8. Component-by-Component Architecture and Status

### 8.1 Entity-Scoped Accounting — EXISTING / CLOSED

Each entity owns exactly one accounting book. The book key is
`public.entities.id` (uuid). Accounting tables live inside the entity
schema. RLS with `has_entity_permission` adds defense in depth. No
accounting table carries `settings_id`, workspace, user, client, or
schema-name ownership columns.

The domain kernel carries an opaque `entityRef`. At the persistence
boundary, `entityRef` binds to `public.entities.id`. VERIFY DURING
IMPLEMENTATION: confirm every new accounting write path binds
`entityRef` to the entity id and never to settings or schema text.

### 8.2 Authoritative Accounting Book — EXISTING / CLOSED

The book exists when `provision_entity` reaches ready state. It starts
empty: seeded chart, no open period. Periods open only through an
explicit open action. No posting occurs before a period opens.

The operational aggregates (invoice financial views, `financialState.ts`)
remain the operational display authority (EXISTING / RETAIN). Consumers
switch to journal-derived balances when the reporting foundation gap
(section 16) closes. The Gate A/B record requires this switch; it is
still pending.

### 8.3 Chart of Accounts — EXISTING / CLOSED

Accounts have: stable code (unique per entity), name, type (asset,
liability, equity, revenue, expense), normal balance, optional parent
code, and active state. Inactive accounts reject new postings. Accounts
with postings cannot be deleted.

The seed holds 11 minimal NGN accounts, including: 1000 Cash,
1100 Bank, 1200 Accounts Receivable, 1500 Fixed Assets,
1510 Accumulated Depreciation, 2000 Accounts Payable, 2100 VAT Control,
2200 WHT Control, 4000 Revenue, 5000 Operating Expenses, and equity.
Chart expansion is a policy decision, not a Block A gap. Any expansion
follows the blueprint's mutation rules.

### 8.4 Accounting-Period Model — EXISTING / CLOSED, one VERIFY item

Periods have: entity scope, unique code, explicit start and end dates,
and the state machine planned → open → closed → locked. The database
guard trigger enforces the transitions and freezes identity after
planned. Ordinary postings enter open periods only. Posting into a
closed or locked period is rejected. The adapters resolve the open
period covering a transaction date and stop cleanly when none exists.
They never create periods.

VERIFY DURING IMPLEMENTATION: the operational service layer and UI
expose create and open today. Close and lock are enforced by the
database but have no dedicated operational surface. Decide during the
gap increment whether Block A needs a close/lock operational flow now
or whether it ships with Block C (accounting periods and revenue
recognition). The database contract does not wait on this decision.

### 8.5 Journal / Posting Kernel — EXISTING / CLOSED

The kernel is the single entry point for postings. Application modules
never write `journal_entries` or `journal_lines` directly. Tests pin
this rule for the invoice and payment adapters.

Posting validation: balanced lines, accounts exist and are active,
exact money amounts, no negative amounts, open period, transaction date
inside period bounds, source reference present, idempotency key
present and unique. A posting commits all lines atomically. Partial
posting is impossible. The RPC and independent row triggers enforce the
same rules, so every writer is guarded, not only the RPC caller.

Posted entries are immutable. The UI exposes no edit, delete, or
retract action for a POSTED entry (observed in the Increment 2
close-out).

### 8.6 Source Transaction Boundary — EXISTING / CLOSED

A source transaction is a recorded business fact. It is not a posting.
The lifecycle is: captured → confirmed → posted (terminal), or
captured → rejected (terminal). No regression is possible. The guard
trigger enforces the machine; the RPCs gate permissions; the posting
boundary requires a confirmed transaction and delegates to the kernel.

Ingestion is idempotent on `source_type + source_id`. Re-delivery
returns the existing row. A source transaction with no accounting
effect is valid. The accounting layer never creates a source
transaction.

Current producers: invoice creation (4A) and entity-aware payment
recording (4B). Documented unwired paths: batch status overrides, the
pre-cutover invoice fallback, and the legacy no-entity payment path.
Reconciliation detects the resulting gaps (EXISTING / RETAIN until the
bypass closure work lands).

### 8.7 Accounting Classification / Mapping — EXISTING / CLOSED at v1 scope

Classification lives in the ingestion adapters, not in Record Capture
and not in the kernel:

- invoice claim: debit 1200 Accounts Receivable, credit 4000 Revenue
- payment settlement: debit 1100 Bank, credit 1200 Accounts
  Receivable, cash amount only

VAT, WHT, and economic-nature classification (inventory, fixed asset,
prepaid) are downstream decisions. They are DEFERRED / DOWNSTREAM. Do
not add them to the adapters or to `tax_input_entries` to serve CIT.

### 8.8 Traceability — EXISTING / CLOSED at fact level

The provenance chain business activity → source transaction → journal
entry exists through the `(source_type, source_id)` pair persisted on
both tables. There is no formal foreign key between source transactions
and journal entries. Increment 5 documents this as an established
relationship mechanism. Row-level pairing is not required by Block A.
Reconciliation proves fact-level linkage and detects unbalanced,
missing, duplicate, and orphaned facts.

---

## 9. Minimum Data Model and Relationships

All tables below exist. This section records the established model. It
adds no columns.

| Table | Established shape (summary) |
| :--- | :--- |
| `accounting_accounts` | code (unique per entity), name, type, normal_balance, parent_code (self FK), active flag, audit columns |
| `accounting_periods` | code (unique per entity), state (planned, open, closed, locked), start_date, end_date (end >= start), audit columns |
| `journal_entries` | period_id FK (RESTRICT), transaction_date, posting_date, source_type, source_id (NOT NULL), idempotency_key (UNIQUE per entity), status (draft, posted), reversal_of_entry_id (self FK, RESTRICT), memo, audit columns |
| `journal_lines` | entry_id FK (CASCADE for draft cleanup), account_id FK (RESTRICT), side, amount NUMERIC(18,2) with CHECK (amount >= 0), line_no, UNIQUE (entry_id, line_no) |
| `source_transactions` | id, source_type, source_id, transaction_date, amount NUMERIC(18,2), currency_code, counterparty_type, counterparty_name, source_document_ref, evidence_refs jsonb, lifecycle_status, idempotency_key (UNIQUE), rejection_reason, memo |

Relationships:

- one entity → one book → many accounts, periods, journal entries
- one period → many journal entries; entries reference the period
- one journal entry → two or more journal lines
- one source transaction → zero or one journal entry (fact level,
  through `source_type + source_id`)
- one reversed entry → referenced by its reversal through
  `reversal_of_entry_id`

The reversed state is derived from the reversal link. It is never
stored on the original entry.

Established boundary functions: `post_accounting_entry`,
`ingest_source_transaction`, `confirm_source_transaction`,
`post_from_source_transaction`, `reconcile_accounting_integrity`,
`remediate_accounting_gap`. No new posting or ingestion path may exist.

The reporting foundation gap (section 16) requires no new table. It
derives from posted `journal_lines`. Exact names and surfaces:
VERIFY DURING IMPLEMENTATION.

---

## 10. Accounting Invariants

These invariants are binding. Items 1 to 10 are enforced today. Items
11 and 12 bind the reporting foundation.

1. Every posted journal entry balances: total debits = total credits.
2. Posted facts are never silently mutated, deleted, or overwritten.
3. Every accounting fact is entity-scoped and RLS-enforced.
4. Source provenance is retained from business activity to journal
   entry.
5. Source ingestion and posting are idempotent.
6. Authoritative balances derive from posted journal lines. Caches are
   rebuildable optimizations, never a second source of truth.
7. Monetary arithmetic is exact. Binary floating-point is prohibited
   for money.
8. Closed and locked periods reject ordinary postings.
9. Corrections preserve history through reversal plus linked correcting
   entries.
10. Accounting depreciation and tax capital allowances are separate
    calculations (binding on all later blocks).
11. Every derived balance or total traces to posted journal lines and,
    through them, to source transactions.
12. The derivation is deterministic: the same posted data yields the
    same report figures.

---

## 11. Lifecycle and State Transitions

### 11.1 Source transaction

```
captured → confirmed → posted   (terminal)
captured → rejected             (terminal)
```

No regression. No skip. Posting requires confirmed. Posted is
immutable.

### 11.2 Journal entry

```
draft → posted → (reversed, derived)
```

The kernel inserts as draft and flips to posted in the same
transaction. The reversed state is derived from an existing reversal
entry, never stored on the original.

### 11.3 Accounting period

```
planned → open → closed → locked
```

Identity (code, dates) freezes after planned. Ordinary postings enter
open periods only. Late postings into an open period are allowed. A
posting that misses an open period leaves its source transaction
captured, with the reason logged; the remediation boundary can post it
later under its qualification rules.

---

## 12. Source Transaction Boundary Rules

1. Only a recorded user or system fact becomes a source transaction.
2. The accounting layer never creates a source transaction.
3. Ingestion is idempotent per `source_type + source_id`.
4. Confirmation requires permission and moves captured → confirmed.
5. Posting requires confirmed, resolves an open period, delegates to
   the kernel, and marks the transaction posted atomically.
6. Failure policy is best-effort at the adapter: a failed accounting
   event never blocks the business operation, and the gap becomes
   visible through reconciliation.

---

## 13. Posting Rules

1. The kernel validates: balance, account existence and activity,
   exact kobo amounts, non-negative amounts, open period, date inside
   period bounds, source linkage, idempotency key.
2. The write is atomic. Any failure aborts all writes.
3. Idempotency is layered: unique source key at ingest, unique journal
   idempotency key at post, terminal posted state at the boundary.
4. Amounts cross the boundary as exact kobo text. Malformed input is
   rejected, never coerced to zero.
5. Independent row triggers re-validate every writer, including direct
   SQL.

---

## 14. Period Controls

1. Periods are entity-scoped with unique codes and explicit bounds.
2. The state machine is database-enforced for every writer.
3. Ordinary postings enter open periods only.
4. Closed-period corrections use the correction path (section 15),
   never a reopened period.
5. Adapters never create or reopen periods. The remediation boundary
   never creates or reopens periods.

---

## 15. Correction / Reversal Model

The model is fixed by the blueprint and the kernel:

1. Posted entries are immutable.
2. A reversal is a new equal-and-opposite entry linked through
   `reversal_of_entry_id`.
3. A correcting entry is a new entry that records the correct state and
   links to the original.
4. Every correction records who, when, and why.
5. Reversals post to the current open period unless policy routes them
   elsewhere. Closed-period corrections follow reverse-and-repost with
   the original retained.
6. Correction submissions carry an idempotency key.

REQUIRED GAP: the kernel implements reversal semantics, and the
persistence schema carries the reversal link, but no boundary flow
exposes a controlled reversal for a posted entry. Known consequence,
documented in Increment 4A: a posted invoice claim has no reversal
path when the invoice is cancelled. The gap increment must add a
controlled reversal path through the kernel, with the blueprint rules
above. Exact RPC or service names: VERIFY DURING IMPLEMENTATION.

Business-side refund and credit-note flows stay downstream (section
18). Block A delivers only the generic reversal capability they will
consume.

---

## 16. Reporting Foundation (Required Gap)

The blueprint (section 11) defines the authoritative facts. None of
them exists in code yet. Verified by repository inspection: no trial
balance or journal-derived balance code exists.

REQUIRED GAP — minimum reporting foundation for Block A:

1. account balances derived from posted, un-reversed journal lines
2. trial balance derived from posted journal lines
3. period totals derived from posted journal lines

Rules the gap increment must obey:

- derivation only; no new table is required;
- read-only; it never mutates accounting state;
- every figure traces to journal lines and, through source linkage, to
  source transactions;
- deterministic output;
- exact decimal arithmetic; sums computed in Postgres NUMERIC, carried
  as text across the boundary, matching the Increment 5 pattern;
- any cached aggregate is a versioned, rebuildable optimization and is
  never a second source of truth;
- full P&L and income statement stay in Block D.

This is the smallest genuine remaining foundation gap. It unblocks the
planned authority switch (operational aggregates → journal-derived
balances) and gives Block D its input.

---

## 17. Existing vs Required vs Deferred Capability Matrix

| # | Capability | State | Gap action |
| :--- | :--- | :--- | :--- |
| 1 | Entity-scoped accounting | EXISTING / CLOSED | None. Verify entityRef binding on new paths. |
| 2 | Authoritative accounting book | EXISTING / CLOSED | None. |
| 3 | Chart of accounts (seed, rules) | EXISTING / CLOSED | None. Expansion is policy, not gap. |
| 4 | Period state machine | EXISTING / CLOSED | None at database level. Close/lock operational surface: VERIFY DURING IMPLEMENTATION. |
| 5 | Posting kernel (domain + persistence + enforcement) | EXISTING / CLOSED | None. |
| 6 | Source transaction boundary | EXISTING / CLOSED | None. Producer coverage gaps tracked as findings. |
| 7 | Invoice ingestion (4A policy) | EXISTING / CLOSED | None. |
| 8 | Payment ingestion (4B policy) | EXISTING / CLOSED | None. |
| 9 | Accounting classification / mapping (v1) | EXISTING / CLOSED | None. VAT/WHT/nature mapping is downstream. |
| 10 | Traceability (fact level) | EXISTING / CLOSED | None. |
| 11 | Reconciliation detection | EXISTING / CLOSED | None. |
| 12 | Controlled remediation boundary | EXISTING / CLOSED (contract) | Hosted live verification outstanding. VERIFY DURING IMPLEMENTATION. |
| 13 | Journal-derived reporting foundation | REQUIRED GAP | One read-only derivation increment (section 16). |
| 14 | Controlled posted-entry reversal path | REQUIRED GAP | One boundary-flow increment (section 15). |
| 15 | Period close/lock operational flow | VERIFY DURING IMPLEMENTATION | Decide Block A now or Block C. |
| 16 | Operational aggregates authority | EXISTING / RETAIN | Switch consumers after gap 13 closes. |
| 17 | Documented bypasses (batch, pre-cutover, legacy payment) | EXISTING / RETAIN | Detected by reconciliation; closure is separate work. |
| 18 | Expense accounting consumption | DEFERRED / DOWNSTREAM | Block B. |
| 19 | Purchase / supplier accounting | DEFERRED / DOWNSTREAM | Block B downstream. |
| 20 | Inventory accounting | DEFERRED / DOWNSTREAM | Roadmap downstream. |
| 21 | Fixed assets / depreciation | DEFERRED / DOWNSTREAM | Blocks E and F. |
| 22 | Credit notes / refunds business flows | DEFERRED / DOWNSTREAM | They consume gap 14's reversal capability. |
| 23 | Other income | DEFERRED / DOWNSTREAM | Roadmap downstream. |
| 24 | VAT accounting treatment | DEFERRED / DOWNSTREAM | Needs explicit policy decision first. |
| 25 | WHT accounting / tax-credit treatment | DEFERRED / DOWNSTREAM | Blocked on unsourced subsidiary regulation. |
| 26 | Accounting-period P&L / income statement | DEFERRED / DOWNSTREAM | Block D. Consumes gap 13. |
| 27 | Tax-adjustment layer | DEFERRED / DOWNSTREAM | Block H. |
| 28 | CIT calculation | DEFERRED / DOWNSTREAM | Block K. |

---

## 18. Downstream Dependencies

Block A enables, and must not implement:

| Downstream capability | Consumes from Block A | Owning block |
| :--- | :--- | :--- |
| Expense accounting consumption | source boundary, kernel, chart, periods | Block B |
| Purchase / supplier accounting | source boundary, kernel, chart | Block B downstream |
| Inventory accounting | chart, kernel | Roadmap downstream |
| Fixed assets and depreciation | kernel, chart (1500/1510), periods | Blocks E and F |
| Credit notes / refunds | reversal path (section 15) | Roadmap downstream |
| Other income | source boundary, kernel | Roadmap downstream |
| VAT accounting treatment | kernel, 2100 VAT Control account | Policy decision, then a block |
| WHT accounting / tax-credit treatment | kernel, 2200 WHT Control account | Blocked on statutory source |
| Accounting-period P&L | reporting foundation (section 16) | Block D |
| Tax-adjustment layer | posted accounting facts only | Block H |
| CIT calculation | tax-adjustment outputs, classification | Block K |

Boundary rules for all downstream work:

1. No tax logic enters the kernel.
2. No accounting or tax classification field enters Record Capture or
   `tax_input_entries`.
3. No second accounting architecture exists inside the taxation module.
4. Downstream consumers read accounting facts. They never write journal
   rows.

---

## 19. Implementation Boundary

Implementation must:

- reuse `post_accounting_entry` as the only posting path;
- reuse the source transaction RPCs for every new producer;
- keep adapters best-effort and permission-gated;
- keep all new accounting tables inside the entity schema with the
  established RLS pattern;
- use NUMERIC(18,2) with non-negative line checks for new money
  columns;
- add every new guard as a database trigger as well as an RPC check;
- pin every boundary rule with contract tests in
  `src/tests/critical/`.

Implementation must not:

- rebuild any component in section 7;
- add a second posting, ingestion, or remediation path;
- move classification into the kernel, the adapters beyond their v1
  policy, or Record Capture;
- invent statutory values.

---

## 20. Dependency Map toward P&L and CIT

```
Block A core                    [EXISTING / CLOSED]
  ├─ Reporting foundation       [REQUIRED GAP — section 16]
  │    └─ Block D: P&L / income statement
  │         └─ Block H: tax-adjustment layer
  │              └─ Block K: CIT calculation
  ├─ Reversal path              [REQUIRED GAP — section 15]
  │    └─ Credit notes / refunds (revenue correctness for Block D)
  ├─ Block B: expense accounting consumption
  │    └─ Block D (expense side of profit)
  ├─ Block C: accounting periods + revenue recognition
  │    └─ Block D (period assignment)
  ├─ Blocks E/F: assets and depreciation
  │    └─ Block I: capital allowances (tax layer)
  └─ Block G: company classification (parallel design)
       └─ Block K (rate application)
```

Ordering rules:

1. Close gap 13 (reporting foundation) before Block D starts.
2. Close gap 14 (reversal path) before credit-note or refund work and
   before revenue-side corrections are needed for a true P&L.
3. Block B can start in parallel; it depends on the closed kernel,
   chart, boundary, and periods, not on the gaps.
4. Statutory dependencies (NTAA 2025 text, WHT regulation, First
   Schedule verification) proceed in parallel and block only their
   gated implementation points.

---

## 21. Acceptance Criteria

Block A is fully closed when all of the following hold. Items 1 to 12
already hold.

1. Gate A and Gate B are CLOSED and bound in code and schema.
2. The four accounting tables exist in the template and in every live
   entity schema, with forced RLS.
3. The 11-account seed exists in every entity book and matches the
   domain seed.
4. A balanced posting through the kernel commits atomically and
   persists as POSTED.
5. Unbalanced, negative, malformed, closed-period, and duplicate
   postings are rejected with no residue.
6. Posted entries reject UPDATE and DELETE through every writer.
7. Source transactions follow the lifecycle machine with no regression.
8. Invoice and payment producers post through the boundary only, with
   deterministic idempotency keys.
9. Reconciliation detects the seven finding types with zero mutation.
10. Remediation returns only its five result codes and never writes
    journals directly.
11. Kernel, persistence, boundary, and adapter contract tests pass.
12. No `settings_id`, workspace, user, client, or schema-text ownership
    exists on any accounting table.

Remaining acceptance criteria (gap increments):

13. Account balances, trial balance, and period totals derive from
    posted, un-reversed lines, are deterministic, and trace to source
    transactions. (Gap 13)
14. At least one consumer reads a journal-derived balance in place of
    an operational aggregate, or the switch plan is recorded with an
    owner. (Gap 13 follow-through)
15. A posted entry can be reversed through a controlled boundary flow;
    the reversal is balanced, linked, reasoned, and idempotent; the
    original stays intact. (Gap 14)
16. The remediation boundary passes a hosted disposable rollback-based
    end-to-end verification. (Deferred Increment 6 acceptance item)
17. The close/lock decision (section 8.4) is recorded and implemented
    or explicitly assigned to Block C.

---

## 22. Risks and Unresolved Questions

Risks:

1. Operational aggregates remain the displayed authority until the
   switch completes. Two parallel balance sources coexist. The switch
   plan must be explicit.
2. The documented bypasses (batch status overrides, pre-cutover
   fallback, legacy payment path) still produce unrecorded facts.
   Reconciliation quarantines about 300 historical gaps on the main
   entity. Production repair needs an approval workflow and backfill
   authority that do not exist yet.
3. Increment 6 hosted live verification is outstanding. The remediation
   boundary is proven by contract tests only.
4. Live verifications for 4A/4B used a privileged session with a
   simulated JWT claim. Browser-session RLS was not exercised.
5. Slug renames change derived schema names. No rename mechanism exists
   yet.

Unresolved questions requiring repository-level verification or a
project-lead decision:

| # | Question | Owner |
| :--- | :--- | :--- |
| 1 | Does Block A need an operational close/lock surface now, or does it ship with Block C? | Project lead, during gap increment |
| 2 | Which consumer switches to journal-derived balances first, and when? | Project lead, after gap 13 |
| 3 | Is a cached aggregate needed for reporting performance, and what invalidates it? | VERIFY DURING IMPLEMENTATION |
| 4 | Bank versus Cash mapping for payment postings (1100 versus 1000)? | Project lead (recorded in 4B, still open) |
| 5 | VAT journal treatment policy? | Project lead (downstream, must precede VAT posting) |
| 6 | WHT journal treatment policy? | Blocked on unsourced subsidiary regulation |
| 7 | Does any new write path bind `entityRef` correctly to `public.entities.id`? | VERIFY DURING IMPLEMENTATION on each increment |

Statutory note: Block A contains no statutory values. NTAA 2025 text is
absent from `NRS-docs/`. WHT rates and deadlines, the VAT registration
threshold, and First Schedule values remain unresolved. They never
block Block A; they block only their gated downstream points.

---

## 23. Sources

| Source | Role |
| :--- | :--- |
| Accounting-foundation-blueprint-v1.md | Architecture authority for Block A contracts |
| cit-readiness-roadmap-2026-09-08.md | Block A definition, prerequisite chain, downstream blocks |
| accounting-gate-a-b-decision-2026-09-05.md | Gate A and Gate B decisions, entity and money contracts |
| accounting-foundation-increment-1-domain-kernel-2026-09-05.md | Domain kernel evidence |
| accounting-foundation-increment-2-persistence-2026-09-05.md | Persistence, triggers, RPC, seed evidence |
| accounting-foundation-increment-2-positive-path-verification-2026-09-05.md and close-out 2026-09-06 | Positive posting path evidence |
| accounting-increment3-source-transactions-2026-09-06.md | Source transaction boundary evidence |
| accounting-increment4a-invoice-integration-2026-09-06.md and hosted closeout | Invoice ingestion evidence, reversal gap record |
| accounting-increment4b-payment-integration-2026-09-06.md | Payment ingestion evidence, open mapping decisions |
| accounting-increment5-reconciliation-2026-09-06.md | Reconciliation evidence, relationship mechanism |
| accounting-increment6-remediation-2026-09-06.md | Remediation contract evidence |
| accounting-increment7-activity-coverage-audit-2026-09-07.md | Producer coverage gaps |
| accounting-increment8-roadmap-reconciliation-2026-09-07.md | PRD coverage and sequencing |
| accounting-increment9-record-capture-readiness-2026-09-07.md and increment10 report | Record Capture boundary evidence |
| Repository inspection, 2026-09-08 | `src/domain/accounting/`, `src/modules/accounting/`, adapters, migrations, tests, accounting pages; confirmed no trial balance code exists |

---

## 24. Change Log

| Date | Change |
| :--- | :--- |
| 2026-09-08 | v1.0 created. Reconstructed the missing Block A specification from closed increments and existing PRD documents. Determined Block A is a substantially closed foundation gate with two required gaps: the reporting foundation and the controlled reversal path. |
