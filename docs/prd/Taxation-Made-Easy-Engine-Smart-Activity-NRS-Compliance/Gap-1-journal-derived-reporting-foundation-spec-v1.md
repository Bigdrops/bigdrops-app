# Gap 1 — Journal-Derived Reporting Foundation — Implementation Specification v1

Status: Canonical Gap 1 specification. Read-only derivation layer.

Version: 1.0

Date: 2026-09-08

Domain: Accounting Foundation (pre-tax). Reporting boundary of Block A.

Parent specification: Block-A-accounting-foundation-core-spec-v1.md
(section 16 names this gap). Architecture authority:
Accounting-foundation-blueprint-v1.md (sections 9, 11, 26).

This document defines the minimum read-only reporting layer that derives
reliable accounting facts from the existing posted journal. It is not a
new accounting engine. It does not redesign the posting kernel. It adds
no tax logic and no statutory value.

---

## 1. Purpose

The closed accounting foundation posts exact, balanced, immutable
journal facts. Today no code derives balances from them. Verified by
repository inspection on 2026-09-08:

- no trial balance code exists anywhere;
- no account-balance derivation exists;
- no reporting view or reporting RPC exists in any accounting
  migration;
- the accounting pages list accounts, periods, and journal entries.
  None shows a balance.

Consequences today:

- Authoritative balances still come from operational aggregates
  (invoice financial views, `financialState.ts`, payment aggregates).
  The Gate A/B record requires these to become presentation-only once
  journal-derived balances exist. That switch has no foundation yet.
- Block D (income statement / P&L) has no input.

Gap 1 closes this. It turns the posted journal into derived, readable
accounting facts. It is the smallest genuine remaining Block A
foundation gap.

## 2. Architectural Position

The preserved chain:

```
Business Activity
→ Source Transaction
→ Accounting Classification / Mapping
→ Posting Kernel
→ Journal
→ Accounting Period
→ Financial Reporting      ← GAP 1 starts here (derivation only)
→ Tax Adjustment           (downstream, out of scope)
→ CIT                      (downstream, out of scope)
```

Gap 1 begins after the journal and accounting period. It reads posted
journal facts and produces derived facts. It sits entirely inside the
accounting domain. The tax boundary stays untouched.

Inputs (all existing): `journal_entries`, `journal_lines`,
`accounting_accounts`, `accounting_periods`.

Outputs (new, derived): account balances, period totals, trial
balance.

## 3. Existing Foundation (Consumed, Not Changed)

| Capability | State | Evidence |
| :--- | :--- | :--- |
| Posting kernel with enforced balance, immutability, idempotency | EXISTING / CLOSED | Increment 1 (domain), Increment 2 (persistence, triggers, `post_accounting_entry`) |
| `journal_entries` / `journal_lines` (NUMERIC(18,2), side + non-negative amount, UNIQUE (entry_id, line_no)) | EXISTING / CLOSED | Increment 2, migration 20260905142503 |
| Account model with `type` and `normal_balance` | EXISTING / CLOSED | Increment 2; `src/domain/accounting/chartOfAccounts.ts` |
| Accounting periods with bounds and planned → open → closed → locked guard | EXISTING / CLOSED | Increment 2 period guard trigger |
| Entity-scoped books, RLS, permission-gated read pattern | EXISTING / CLOSED | Gate A record; Increment 5 read-only RPC pattern (`journal/view` gate) |
| Source traceability on entries (`source_type`, `source_id`) | EXISTING / CLOSED | Increment 2 schema; Increment 3 boundary |
| Reversal link (`reversal_of_entry_id`) | EXISTING / CLOSED (schema) | Increment 2. The controlled reversal flow is Gap 2 and stays separate |
| Exact-money rules (Decimal.js precision 20, ROUND_HALF_UP; no float) | EXISTING / CLOSED | Gate B record |
| Read-only derivation precedent (zero-mutation SQL, static + live proof) | EXISTING / CLOSED | Increment 5 `reconcile_accounting_integrity` |

## 4. Current Reporting State

Verified against the working tree on 2026-09-08:

| Item | State | Evidence |
| :--- | :--- | :--- |
| Trial balance | MISSING | No code matches trial balance in `src/`; no reporting view or function in any accounting migration |
| Account balances | MISSING | `accountingService.ts` lists accounts only (`listAccounts`); no sum over lines |
| Period totals | MISSING | `accountingService.ts` lists periods only (`listPeriods`) |
| Balance display | MISSING | `Accounts.tsx`, `Journal.tsx`, `Periods.tsx`, `AccountingOverview.tsx` show no balances |
| Entry-level balance check | EXISTS / RETAIN | `validatePostingLines` in `accountingService.ts` and the balance hint in `NewJournalEntry.tsx`. Posting-time only. Not a reporting feature |
| Operational aggregates (invoice balances, payment views, `financialState.ts`) | EXISTS / RETAIN | Remain the operational display authority until the switch (section 14) |
| Reconciliation findings | EXISTS / CLOSED | Increment 5 detects integrity problems. Gap 1 must not duplicate or replace it |

Conclusion: Gap 1 is genuinely MISSING. Nothing needs repair. Nothing
needs recreation. The gap is one small increment.

## 5. Gap Definition

Missing, and a genuine prerequisite:

1. account balances derived from posted, un-reversed journal lines;
2. period totals derived from posted, un-reversed journal lines;
3. a trial balance derived from the same lines, with an equality
   assertion.

Why prerequisite: Block A acceptance criteria 13 and 14
(Block-A-accounting-foundation-core-spec-v1.md section 21) require this
derivation. The operational-to-ledger authority switch requires it.
Block D requires it. No other Block A gap blocks downstream work the
way this one does.

Not a gap (rejected candidates): a reporting UI, cached materialized
balances, a GL drill-down view, report grouping/hierarchy rollups,
comparison periods, and export. Each is useful but none is required for
the derivation foundation. They are DEFERRED / DOWNSTREAM.

## 6. Scope

In scope:

1. one read-only derivation boundary (Postgres function or view set —
   VERIFY DURING IMPLEMENTATION for the exact surface) that returns:
   - account balances: per account, debit total, credit total, net;
   - period totals: per account per period, with opening and closing
     where required;
   - trial balance: all accounts with debit and credit totals and the
     equality assertion;
2. posted-only and un-reversed-only selection rules;
3. debit/credit sign convention and net computation;
4. entity/book scoping and permission gating on the read path;
5. source traceability on every derived figure;
6. contract tests pinning the derivation rules;
7. the balance-authority switch plan as a recorded follow-up (the
   switch itself may be a separate small increment).

## 7. Non-Scope

Explicitly excluded:

- posting kernel changes of any kind
- new source transaction architecture
- Record Capture redesign or boundary change
- expense accounting consumption
- purchase / supplier accounting
- inventory accounting
- fixed assets / depreciation
- credit notes / refunds (Gap 2 is the separate reversal increment)
- VAT treatment, WHT treatment, tax adjustments, CIT, capital
  allowances, any statutory calculation
- full P&L or income-statement implementation (Block D)
- report UI of any kind (see section 16 — UI is deferred)
- dashboard or report redesign
- repair of reconciliation findings or historical gaps
- migration of operational aggregates

## 8. Reporting / Data Model

Conceptual inputs (existing tables, entity schema):

| Input | Used for |
| :--- | :--- |
| `journal_entries` | status filter, period link, transaction date, reversal link, source linkage |
| `journal_lines` | amounts per side per account |
| `accounting_accounts` | account identity, type, normal balance |
| `accounting_periods` | period scope, bounds, ordering |

Conceptual outputs (derived, not stored):

| Output | Shape |
| :--- | :--- |
| Account balance | account code, name, type, normal balance, debit total, credit total, net |
| Period total | period code, account, debit total, credit total, net; plus opening and closing net where required |
| Trial balance | one row per account with debit total and credit total; grand totals; equality flag |

No new table is required. No column is added to any existing table.
Persistence is justified only if live aggregation proves too slow for a
real entity book. Until proven, nothing persists. Exact function, view,
or service names and file paths: VERIFY DURING IMPLEMENTATION. Follow
the established read-path pattern: schema resolution through the
entity id, permission gate, exact-text amounts across the boundary
(Increment 5 pattern).

## 9. Derivation Rules

### 9.1 Scope selection

- Posted only: lines belong to entries with status `posted`. Draft
  entries contribute nothing. See 9.6 for the draft-status check.
- Un-reversed only: an entry that is the target of a reversal
  (`reversal_of_entry_id` points at it) is excluded. Its reversal
  entry is excluded too. Both remain in the journal for audit.
- Entity scope: all rows come from the resolved entity schema. No
  cross-book read exists.

### 9.2 Sign convention

- Lines store a side (`debit` or `credit`) and a non-negative amount.
  No signed amounts exist and none are invented.
- Debit total = SUM(amount) where side = debit.
- Credit total = SUM(amount) where side = credit.
- Net = debit total − credit total. Positive net means a debit-balance
  account state; negative means credit-balance. Presentation maps net
  against `normal_balance`; reporting never mutates stored sides.

### 9.3 Account balances

Per account over all posted, un-reversed lines of the book:
debit total, credit total, net. Inactive accounts still report (they
reject new postings; history stays visible).

### 9.4 Period totals, opening and closing

- Period net per account = debit total − credit total of posted,
  un-reversed lines whose entry belongs to that period.
- Opening net = cumulative net over all earlier periods in period
  order.
- Closing net = opening net + period net.
- Entries outside the requested period are excluded from that period's
  totals and included in the cumulative chain by their own period.
  Period ordering key (code order versus start-date order):
  VERIFY DURING IMPLEMENTATION.

### 9.5 Trial balance

- One row per account: debit total, credit total over posted,
  un-reversed lines in scope.
- Grand debit total must equal grand credit total. The boundary
  asserts the equality. A mismatch is reported loudly as data, never
  repaired, never silently absorbed. Repair belongs to reconciliation
  and remediation, not to reporting.

### 9.6 Status and discrepancy checks

Documented discrepancies between the blueprint language and the
implementation, to resolve during implementation, not by invention:

1. The kernel inserts entries as `draft` and flips to `posted` in the
   same transaction, and never transitions status afterward (Increment
   5 finding). Supported paths therefore leave no draft rows. The
   increment must confirm no supported path leaves a posted-eligible
   entry in draft. VERIFY DURING IMPLEMENTATION. Until confirmed, the
   posted-only rule stays literal: draft contributes nothing.
2. The kernel's `reverseEntry` is equal-and-opposite to the whole
   original, so exclusion (9.1) and inclusion-cancel produce identical
   balances today. Exclusion is the rule because the blueprint says
   "un-reversed" and because it keeps reversed facts economically
   inactive even if a future policy allows partial reversal. If Gap 2
   introduces partial reversal, this rule must become amount-aware.
   VERIFY DURING IMPLEMENTATION when Gap 2 lands.

### 9.7 Exactness

- Sums are computed in Postgres NUMERIC arithmetic, never in
  JavaScript numbers.
- Amounts cross the boundary as exact text, matching the Increment 5
  pattern.
- Client-side display formatting stays at the display boundary and
  never rounds stored or derived facts into new stored facts.

## 10. Period Semantics

- Ordinary postings enter open periods only. Closed and locked periods
  reject postings. Therefore closed-period derived figures are stable.
- Late postings into an open period change that period's derived
  figures. Reporting is as-of-read. This is correct and expected.
- Gap 1 does not invent close or lock behavior. The close/lock
  operational-surface decision is open in the parent specification
  (section 8.4, open question 1) and is not resolved here.
- Entries with transaction dates outside their period bounds cannot
  exist through supported paths (kernel validates date inside period).
  Out-of-bounds rows, if ever found, are reconciliation findings. Gap 1
  reports by entry period and does not repair.

## 11. Traceability

Every derived figure must trace to the authoritative journal:

- balance → account → its journal lines → their entries;
- entry → period, status, reversal link;
- entry → source transaction through `source_type` + `source_id`
  (fact-level linkage; the formal FK does not exist and is not added —
  established by Increment 5).

The derivation boundary returns enough identity (account code, period
code, and where applicable entry/source references) for a consumer to
walk the chain. No derived fact may exist without journal provenance.

## 12. Invariants

1. Only posted entries affect derived balances.
2. Draft entries affect nothing.
3. Reversed entries and their reversals are economically inactive in
   derived balances.
4. Derived debit totals equal derived credit totals across the trial
   balance. A mismatch is surfaced, never repaired.
5. Derived figures are deterministic: the same posted data yields
   byte-identical results.
6. Every derived figure traces to journal lines and source
   transactions.
7. The derivation never mutates any table. Row counts and checksums
   are identical before and after any derivation run.
8. All amounts are exact. No floating-point arithmetic anywhere in the
   path.
9. Entity isolation holds: a derivation returns one book's facts only.
10. Journal immutability holds. Reporting never writes.
11. Corrections stay controlled through the existing reversal
    architecture. Reporting never "fixes" data.

## 13. Performance / Caching Boundary

Decision for Gap 1: derive live. No cache. No persistence.

Reasons:

- an SME entity book is small (hundreds of entries, not millions);
- one grouped aggregation over posted lines is cheap;
- caching adds a staleness problem and a second-source-of-truth risk
  before any need is proven.

Rules if a cache is ever introduced later:

- it must be rebuildable from postings alone;
- it must be versioned;
- it is an optimization only, never an authority;
- it requires an explicit project decision and an invalidation story.
  Until then this is DEFERRED / DOWNSTREAM.

Request-scope memoization inside one read call is allowed and needs no
decision.

## 14. Dependency Map

```
Depends on (all EXISTING / CLOSED):
  posting kernel + journal persistence (Inc 1–2)
  chart of accounts (Inc 2)
  accounting periods (Inc 2)
  entity scoping + read-path permission pattern (Gate A, Inc 5)
  exact-money rules (Gate B)

Gap 1 enables:
  balance-authority switch (operational aggregates → ledger)   [follow-up]
  Block D: P&L / income statement per accounting period
  Block H: tax-adjustment layer (reads accounting facts)
  Block K: CIT calculation (via Block H)

Parallel / independent:
  Gap 2 (controlled reversal path) — separate; do not bundle.
  Block B (expense consumption) — does not wait on Gap 1.
  Statutory sourcing — never blocks Gap 1.
```

Note on the authority switch: after Gap 1 lands, consumers can move
from operational aggregates to journal-derived balances. The switch is
a separate, small, planned change with its own verification. Gap 1
records the plan; it does not perform the switch.

## 15. Implementation Boundary

The eventual coding increment may:

- add one read-only derivation boundary in the entity schema (function
  or view set — VERIFY DURING IMPLEMENTATION);
- add a thin typed service wrapper following
  `reconciliationService.ts` as the pattern;
- register the surface in the provisioning registry if the established
  pattern requires it;
- add contract tests in `src/tests/critical/`;
- reload the PostgREST schema cache after deployment
  (`NOTIFY pgrst, 'reload schema'` per supabase/database-workflow.md).

It must not:

- modify the posting kernel, its triggers, or its RPC;
- write to any accounting table;
- add columns or tables to the accounting schema;
- touch source-transaction RPCs or lifecycle;
- touch Record Capture or `tax_input_entries`;
- embed tax, VAT, WHT, or CIT logic;
- repair reconciliation findings;
- change operational aggregates (that is the separate switch).

## 16. UI Position (Adaptive UI/UX Authority)

Gap 1 is entirely a data and derivation foundation. No user-facing
reporting surface is in scope. UI is DEFERRED / DOWNSTREAM.

When a reporting surface is later built, `docs/prd/Adaptive Mobile-First
UIUX Facelift PRD/adaptive-uiux-alignment.md` is first-class
implementation authority: mobile-first, design-system compliant,
bottom-sheet overlays, progressive disclosure. No desktop-first
reporting interface. That work needs its own task.

## 17. Existing vs Required vs Deferred Matrix

| # | Item | State |
| :--- | :--- | :--- |
| 1 | Journal persistence (entries, lines, guards) | EXISTING / CLOSED |
| 2 | Account model, types, normal balance | EXISTING / CLOSED |
| 3 | Period model with bounds and state guard | EXISTING / CLOSED |
| 4 | Entity scoping + read permission pattern | EXISTING / CLOSED |
| 5 | Source traceability on entries | EXISTING / CLOSED |
| 6 | Reversal link column | EXISTING / CLOSED (flow is Gap 2) |
| 7 | Entry-level posting balance check | EXISTING / RETAIN |
| 8 | Operational aggregates (display authority) | EXISTING / RETAIN |
| 9 | Reconciliation detection | EXISTING / CLOSED |
| 10 | Account-balance derivation | REQUIRED FOR GAP 1 |
| 11 | Period totals with opening/closing | REQUIRED FOR GAP 1 |
| 12 | Trial balance with equality assertion | REQUIRED FOR GAP 1 |
| 13 | Posted-only / un-reversed selection rules | REQUIRED FOR GAP 1 |
| 14 | Read-only boundary + permission gate for derivation | REQUIRED FOR GAP 1 |
| 15 | Draft-status residue check | VERIFY DURING IMPLEMENTATION |
| 16 | Period ordering key | VERIFY DURING IMPLEMENTATION |
| 17 | Exclusion rule under future partial reversal | VERIFY DURING IMPLEMENTATION (with Gap 2) |
| 18 | Derivation surface names (RPC/view/service) | VERIFY DURING IMPLEMENTATION |
| 19 | Balance-authority switch | DEFERRED / DOWNSTREAM (follow-up increment) |
| 20 | Reporting UI | DEFERRED / DOWNSTREAM |
| 21 | Cached or persisted aggregates | DEFERRED / DOWNSTREAM (needs proven need) |
| 22 | P&L / income statement | DEFERRED / DOWNSTREAM (Block D) |
| 23 | Tax adjustment / CIT | DEFERRED / DOWNSTREAM (Blocks H/K) |

## 18. Open Questions / Risks

| # | Question | Type | Owner |
| :--- | :--- | :--- | :--- |
| 1 | Confirm no supported path leaves a posted-eligible entry in draft status | Repository verification, during implementation | Gap 1 increment |
| 2 | Period ordering key for opening/closing chains: code order or start-date order | Repository verification, during implementation | Gap 1 increment |
| 3 | Derivation surface: single RPC, view set, or service-side aggregation | Implementation decision within the established read-path pattern | Gap 1 increment |
| 4 | Which consumer switches to journal-derived balances first, and when | Project decision | Project lead |
| 5 | Exclusion rule must become amount-aware if Gap 2 ever allows partial reversal | Dependency note | Gap 2 increment |

No manufactured uncertainty: items 1–3 are bounded verifications inside
one increment, not design unknowns. Items 4–5 are recorded dependencies
from the parent specification.

Risks:

- Two balance authorities coexist until the switch completes
  (operational aggregates and derived balances). Keep the switch plan
  explicit to avoid divergence confusion.
- If out-of-band writers ever bypass the guards, derived figures will
  reflect what is posted. Reporting reports truth; reconciliation
  detects damage. Reporting never repairs.

---

## Sources

| Source | Role |
| :--- | :--- |
| Accounting-foundation-blueprint-v1.md §9, §11, §26 | Money rules, authoritative reporting facts, invariants |
| Block-A-accounting-foundation-core-spec-v1.md §15, §16, §21 | Gap definition and acceptance criteria 13–14 |
| cit-readiness-roadmap-2026-09-08.md | Block D dependency |
| accounting-gate-a-b-decision-2026-09-05.md | Gate A/B contracts |
| Increment 1–6 reports | Closed foundation evidence; Increment 5 read-path pattern |
| Increment 7–10 reports | Producer coverage and Record Capture boundary |
| Repository inspection, 2026-09-08 | Confirmed: no trial balance or balance derivation exists; accounting pages are list-only; no reporting view/function in accounting migrations |

## Change Log

| Date | Change |
| :--- | :--- |
| 2026-09-08 | v1.0 created. Canonical Gap 1 specification. Determination: Gap 1 is genuinely missing and is one small read-only derivation increment (balances, period totals, trial balance). UI and caching deferred. |
