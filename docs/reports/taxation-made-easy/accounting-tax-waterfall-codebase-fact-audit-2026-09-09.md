# Accounting / Tax Waterfall — Codebase Fact Audit

This report was written by opencode on 2026-09-09 via opencode.

## Objective

Audit the BIGDROPS repository against every roadmap stage from Domain Kernel through CIT. Determine the actual implementation state of each gate and phase based on repository evidence only. No code, schema, migration, or configuration was modified.

## Scope

- Waterfall-roadmap.md phases and gates (Phase 0 through Phase 6)
- Block A accounting foundation core specification
- CIT-readiness roadmap
- Accounting-foundation-blueprint-v1.md
- All increment reports (1 through 10)
- Source code under `src/domain/accounting/`, `src/modules/accounting/`, `src/lib/Calculations.ts`
- Hosted database state (migrations applied)
- Adaptive-mobile-first-UIUX-alignment.md (first-class implementation authority)

## Skills Used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

---

## Phase 0 — Baseline Lock

### GATE A: Entity Accounting Boundary — CLOSED

| Question | Answer | Evidence |
| --- | --- | --- |
| What identifies a book | Entity id (`public.entities.id`, uuid) | `20260714000000_multi_tenancy_core.sql` |
| Scope | Entity-scoped, not settings-scoped | Gate A decision record: `accounting-gate-a-b-decision-2026-09-05.md` |
| Settings role | Configuration singleton (`settings_id = 1`), not ownership | `20260809000000_provisioning_settings_seed.sql` |
| RLS enforcement | Per-entity policies via `has_entity_permission` | Entity provisioning engine, `tenant_master_template.sql` |
| Cross-entity access | Explicit `entity_permissions` row required | Multi-tenancy core |

**Status: DECIDED. CLOSED. Entity-scoped books from day one.**

### GATE B: Money Precision — CLOSED

| Layer | Convention | Evidence |
| --- | --- | --- |
| Document calculation | Decimal.js, precision 20, ROUND_HALF_UP | `src/lib/Calculations.ts:34,38` |
| Domain kernel | Exact decimal strings, Decimal.js arithmetic | `src/domain/accounting/money.ts` |
| Storage | Postgres `numeric` (unconstrained), exact at rest | All money columns in migrations |
| Scale convention | `NUMERIC(18,2)` recommended, not enforced everywhere | Blueprint section 9 |

**Status: DECIDED. CLOSED. Domain and kernel enforce exact money. Storage uses Postgres numeric (exact). Scale convention is a recommendation, not a hard gate.**

---

## Phase 1 — Accounting Foundation (Increments 1–10)

### Increment 1: Domain Kernel — CLOSED

| Component | Status | Location |
| --- | --- | --- |
| Types (Account, JournalEntry, JournalLine, SourceTransactionRef, AccountingPeriod) | EXISTS | `src/domain/accounting/types.ts` |
| Money helpers (toDecimal, sum, toKoboString) | EXISTS | `src/domain/accounting/money.ts` |
| Invariants (balanced, active accounts, open period, date-in-period, no negatives) | EXISTS | `src/domain/accounting/invariants.ts` |
| Factories (createAccount, createPeriod, createJournalEntry, debit, credit) | EXISTS | `src/domain/accounting/factories.ts` |
| Seed chart of accounts (11 accounts) | EXISTS | `src/domain/accounting/chartOfAccounts.ts` |
| Posting kernel (postEntry, reverseEntry, normalizeIdempotencyKey, isReversed) | EXISTS | `src/domain/accounting/postingKernel.ts` |
| Unit tests (15 tests, all passing) | EXISTS | `src/tests/critical/accountingKernel.test.js` |

**Closed by:** `accounting-foundation-increment-1-domain-kernel-2026-09-05.md`

### Increment 2: Persistence — CLOSED

| Component | Status | Migration |
| --- | --- | --- |
| `journal_entries` table | EXISTS | `20260905160000_accounting_persistence.sql` |
| `journal_lines` table | EXISTS | same |
| `source_transactions` table | EXISTS | same |
| `accounting_periods` table | EXISTS | same |
| `accounting_settings` table | EXISTS | same |
| `chart_of_accounts` table | EXISTS | same |
| `post_accounting_entry()` RPC | EXISTS | same |
| `reverse_accounting_entry()` RPC | EXISTS | same |
| `insert_source_transaction()` RPC | EXISTS | same |
| `confirm_source_transaction()` RPC | EXISTS | same |
| `post_from_source_transaction()` RPC | EXISTS | same |
| Positive-path verification (authenticated UI) | VERIFIED | `accounting-foundation-increment-2-positive-path-closeout-2026-09-06.md` |

**Closed by:** persistence migration + positive-path closeout

### Increment 3: Source Transaction Boundary — CLOSED

| Component | Status | Evidence |
| --- | --- | --- |
| Source transaction lifecycle (captured → confirmed → posted) | EXISTS | RPCs confirmed live on hosted |
| Idempotency key enforcement | EXISTS | Live verification (Increment 4A) |
| Terminal state immutability | EXISTS | Live verification (Increment 4A) |
| Permission gate (journal/create) | EXISTS | Live verification (Increment 4A) |

**Closed by:** `accounting-increment-3-source-transaction-boundary-closeout-2026-09-06.md`

### Increment 4A: Invoice Integration — CLOSED

| Check | Result |
| --- | --- |
| Invoice → source transaction (ingest) | `captured`, idempotent |
| Confirm | `confirmed` |
| Post via boundary | `posted`, journal entry id returned |
| Kernel duplicate-key backstop | blocked: `duplicate idempotency key` |
| Posted source is terminal | blocked: `immutable` |
| Balanced entry | debits = credits (exact kobo) |
| Claim lines only | 1200 debit, 4000 credit |
| Entity isolation preserved | yes |

**Closed by:** `accounting-increment4a-hosted-closeout-2026-09-06.md`

### Increment 4B: Payment Integration — CLOSED

| Check | Result |
| --- | --- |
| Payment → source transaction | `captured` |
| Confirm → post | `posted` |
| Journal entry balanced | yes |
| Payment allocation visible | `payment_allocations` row created |
| Idempotent re-post blocked | yes |
| Terminal immutability enforced | yes |

**Closed by:** `accounting-increment4b-payment-hosted-closeout-2026-09-06.md`

### Increment 5: Reconciliation — CLOSED

| Component | Status |
| --- | --- |
| `reconcile_accounting_gaps()` function | EXISTS |
| Detection-only, zero-mutation | VERIFIED |
| Returns gap inventory by source type | VERIFIED |
| Hosted verification script | EXISTS (`supabase/.temp/increment5_reconcile_verify.sql`) |

**Closed by:** `accounting-increment5-reconciliation-detection-closeout-2026-09-06.md`

### Increment 6: Remediation — CLOSED

| Component | Status |
| --- | --- |
| `remediate_accounting_gap()` function | EXISTS, deployed, verified live |
| Boundary: confirmed only, single-entity, idempotent | VERIFIED |
| Migration repair (v_source_id, EXECUTE format) | COMMITTED (`bcf98df2`) |

**Closed by:** `accounting-increment6-remediation-closeout-2026-09-06.md`

### Increment 7: Activity Coverage Audit — CLOSED (report only)

- Identified gap: expenses, purchases, fixed assets, refunds, credit notes, other income, VAT journal, WHT journal.
- No code change. No gate impact.

### Increment 8: Roadmap Reconciliation — CLOSED (report only)

- PRD coverage matrix produced.
- Recommended implementation sequence documented.
- No code change. No gate impact.

### Increment 9: Record Capture Readiness — CLOSED (report only)

- PRD readiness audit for Record-capture-v1.md completed.
- Identified gaps: no capture surface, no engagement engine.
- No code change. No gate impact.

### Increment 10: Record Capture Foundation — CLOSED

| Component | Status |
| --- | --- |
| `tax_input_entries` schema extension (evidence, payment_reference) | DEPLOYED |
| `reverseVat()` function | EXISTS |
| `RecordCaptureSheet` UI component | EXISTS |
| Integration into ComplianceHub | EXISTS |

**Closed by:** `accounting-increment10-record-capture-2026-09-07.md`

### GATE C: Posting Kernel — CLOSED

| Requirement | Status |
| --- | --- |
| Balanced posting | EXISTS — database-enforced |
| Immutability | EXISTS — posted entries cannot be mutated |
| Idempotency | EXISTS — duplicate-key backstop verified |
| Entity isolation | EXISTS — entity-scoped books |
| Source transaction lifecycle | EXISTS — ingest/confirm/post verified |
| Invoice ingestion (live) | EXISTS — end-to-end verified on hosted |
| Payment ingestion (live) | EXISTS — end-to-end verified on hosted |

**Status: CLOSED. All core posting kernel requirements met and verified on hosted database.**

---

## Phase 2 — Accounting → Tax Bridge (GATE D)

### Required Components

| Component | Status | Evidence |
| --- | --- | --- |
| Accounting profit derivation | MISSING | No trial balance, no period totals from posted lines |
| Tax adjustments (add-backs, exemptions) | MISSING | No adjustment records |
| Capital allowances | MISSING | No asset register, no depreciation schedule |
| Loss carry-forward | MISSING | No loss register |
| VAT control account bridge | MISSING | No VAT journal entries |
| WHT control account bridge | MISSING | No WHT journal entries |
| P&L from posted entries | MISSING | No financial statements derived from journal |

### Block A Remaining Gaps

The Block A specification reconstruction (`block-a-specification-reconstruction-2026-09-08.md`) identified two REQUIRED GAPS that block Phase 2:

1. **Reporting foundation** — account balances, trial balance, period totals derived from posted, un-reversed lines. Derivation-only, read-only, traceable, deterministic. Requires no new table, no new posting path, no statutory value.
2. **Posted-entry reversal path** — the kernel and schema carry reversal semantics; no boundary flow exposes them. The posted-invoice-cancellation gap from Increment 4A stays open.

**Status: OPEN. GATE D is NOT closed. Phase 2 cannot begin until reporting foundation and reversal path exist.**

---

## Phase 3 — Tax Rules Engine (GATE E)

| Component | Status | Evidence |
| --- | --- | --- |
| Statutory parameter store | MISSING | No rules engine, no parameter versions |
| NTAA 2025 primary text | UNRESOLVED | Not committed to repository |
| WHT rate table and remittance deadline | UNRESOLVED | Not committed to repository |
| VAT registration threshold | UNRESOLVED | Not committed to repository |
| General VAT return deadline | UNRESOLVED | Not committed to repository |
| Capital allowance values | UNRESOLVED | Not committed to repository |
| CIT order date | UNRESOLVED | Not committed to repository |
| Rule versioning with effective dates | MISSING | No implementation |
| Citation/reference to primary sources | MISSING | No implementation |
| Audit trail for rule application | MISSING | No implementation |

**Status: OPEN. GATE E is NOT closed. Statutory values remain unresolved. Architecture is greenfield.**

---

## Phase 4 — Compliance (GATE F)

| Component | Status | Evidence |
| --- | --- | --- |
| Compliance Hub (VatInputsPanel, WhtReceiptsPanel, TaxFilingsPanel, TaxRemindersPanel) | EXISTS | `ComplianceHub.tsx` |
| Push notification infrastructure | EXISTS | `src/lib/notifications.ts` |
| Tax input entries (extended) | EXISTS | Increment 10 |
| WHT receipts | EXISTS | `wht_receipts` table, `WhtReceiptsPanel` |
| Tax filings | EXISTS | `tax_filings` table, `TaxFilingsPanel` |
| Tax reminders | EXISTS | `tax_reminders` table, `TaxRemindersPanel` |
| Authoritative compliance positions | MISSING | No accounting-to-tax bridge, no tax rules engine |
| Filing obligation lookup | EXISTS | `OBLIGATION-LOOKUP-INDEX.md` (documentation only) |

**Status: OPEN. GATE F is NOT closed. Compliance surfaces exist but lack authoritative accounting-derived data.**

---

## Phase 5 — Record Engagement

| Component | Status | Evidence |
| --- | --- | --- |
| Record-engagement-plan-v1.md | EXISTS | Planning artifact, not implemented |
| Engagement engine | MISSING | No prompts, escalation, or enforcement |
| Inferred-activity-to-accounting-fact path | MISSING | No implementation |

**Status: NOT STARTED. Planning artifact exists only.**

---

## Phase 6 — Deferred Extensions

| Component | Status |
| --- | --- |
| Bank feeds and full bank reconciliation | DEFERRED — `bank_accounts` exists as manual registry only |
| Multi-currency (NGN only) | DEFERRED — payment RPC hard-codes `'NGN'` |
| Inventory and procure-to-pay | DEFERRED — `item_catalog` is item library, not inventory |
| Payroll/PAYE | DEFERRED — absent |
| Group consolidation | DEFERRED — absent |
| Budgeting and dunning | DEFERRED — absent |
| Cryptographic hash chain | DEFERRED — not required for v1 |

---

## Summary: Gate Status

| Gate | Phase | Status | Blocking |
| --- | --- | --- | --- |
| GATE A (entity boundary) | 0 | **CLOSED** | No |
| GATE B (money precision) | 0 | **CLOSED** | No |
| GATE C (posting kernel) | 1 | **CLOSED** | No |
| GATE D (accounting→tax bridge) | 2 | **OPEN** | Yes — reporting foundation + reversal path needed |
| GATE E (tax rules engine) | 3 | **OPEN** | Yes — statutory values unresolved |
| GATE F (compliance) | 4 | **OPEN** | Yes — depends on GATEs D and E |

## Summary: Implementation State

| Category | Count | Details |
| --- | --- | --- |
| Gates CLOSED | 3 | A, B, C |
| Gates OPEN | 3 | D, E, F |
| Increments CLOSED | 10 | 1 through 10 |
| Increments OPEN | 0 | — |
| Phases COMPLETE | 2 | Phase 0 (baseline), Phase 1 (foundation) |
| Phases IN PROGRESS | 0 | — |
| Phases NOT STARTED | 4 | Phase 2, 3, 4, 5 |
| Phases DEFERRED | 1 | Phase 6 |
| Required gaps blocking Phase 2 | 2 | Reporting foundation, posted-entry reversal path |
| Statutory values unresolved | 6 | NTAA, WHT table, VAT threshold, VAT deadline, capital allowances, CIT order date |

## Key Risks

1. **Reporting foundation gap** — no trial balance, no period totals, no financial statements from posted entries. This is the smallest genuine remaining foundation gap. It requires no new table, no new posting path, no statutory value.
2. **Reversal path gap** — kernel carries reversal semantics; no boundary flow exposes them. Posted-invoice cancellation from Increment 4A stays open.
3. **Statutory values** — six primary-source values remain unresolved. They must not be invented. They block Phase 3.
4. **Settings vs entity scope** — legacy tax tables (`tax_input_entries`, `tax_filings`, `tax_reminders`) are settings-scoped. New accounting facts are entity-scoped. The bridge between them needs a migration decision.

## Verification

- Pre-inspection git status captured: 4 modified files (onboarding UI), 4 untracked files (UI reports). All from other agents, untouched.
- All inspection was read-only. No code, schema, migration, or configuration was modified.
- No `bun run build`, `bun run typecheck`, `bun run lint`, or `bun run audit:load` was executed (audit constraint: read-only).
- Post-inspection git status will be captured after this report is written.

## Deferred Work

- Block A reporting foundation (account balances, trial balance, period totals from posted lines)
- Block A posted-entry reversal path
- Accounting→tax bridge (Phase 2)
- Tax rules engine with statutory parameters (Phase 3)
- Compliance authoritativeness (Phase 4)
- Record engagement engine (Phase 5)
- Bank feeds, multi-currency, inventory, payroll, group consolidation, budgeting (Phase 6)
