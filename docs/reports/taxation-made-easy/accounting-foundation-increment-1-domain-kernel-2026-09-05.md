# Accounting Foundation Increment 1 — Domain Kernel Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Start Phase 1 (Accounting Foundation) execution. Implement the first slice: the accounting domain boundaries and the posting-kernel contracts as pure, schema-free TypeScript, with unit tests for the invariants. This increment follows the roadmap Phase 1 order (domain boundaries first) and the project lead's direction to proceed gradually.

## Scope

- New accounting domain module in src/domain/accounting/.
- Unit tests for kernel invariants.
- No schema, migration, RLS, service, or UI changes. No tax logic.

## Files Created

- src/domain/accounting/types.ts
- src/domain/accounting/money.ts
- src/domain/accounting/invariants.ts
- src/domain/accounting/factories.ts
- src/domain/accounting/chartOfAccounts.ts
- src/domain/accounting/postingKernel.ts
- src/domain/accounting/index.ts
- src/tests/critical/accountingKernel.test.js
- docs/Reports/taxation-made-easy/accounting-foundation-increment-1-domain-kernel-2026-09-05.md (this report)

No other file was created or modified by this task.

## Skills Used

writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English

## Gate Status

GATE A (entity accounting boundary): OPEN. The project lead did not decide settings_id versus entity_id. Per the audit's do-not-guess rule, the domain contracts carry an opaque entityRef and the schema increment waits for the decision. The blueprint section 18 target (entity-scoped books) remains the recommended direction.

GATE B (money precision): Decided at the domain level. All accounting amounts are exact decimal strings; arithmetic uses Decimal.js with precision 20 and ROUND_HALF_UP, matching src/lib/Calculations.ts. Storage convention (NUMERIC(18,2)) is a schema-increment decision.

## Changes Made

Domain contracts:

- Account, AccountingPeriod, JournalLine, JournalEntry, SourceTransactionRef types with exact-money strings and immutable-posting semantics.
- Exact money helpers on Decimal.js (toDecimal, sum, toKoboString). Binary floating-point is not used for accounting amounts.
- Posting validation invariants: balanced lines, existing and active accounts, open period only, transaction date inside period boundaries, required source reference, required idempotency key, no negative amounts.
- Factories: createAccount, createPeriod (planned state), createJournalEntry (draft state), debit, credit.
- Seed chart of accounts: 11 minimal NGN accounts per blueprint section 7 (cash, bank, receivables, fixed assets, accumulated depreciation, payables, VAT control, WHT control, equity, revenue, operating expenses) with unique codes and correct normal balances.
- Posting kernel: postEntry (validates then returns an immutable posted entry), reverseEntry (equal-and-opposite linked reversal, original marked reversed, no in-place mutation), normalizeIdempotencyKey, isReversed.

## Verification Result

- bun run audit:load: passed.
- bun run typecheck: passed.
- Kernel tests: 15 tests, 15 passed, 0 failed. Covered: balanced posting, unbalanced rejection, exact-money 0.1+0.2 case, period states (planned/closed/locked reject), outside-period rejection, unknown and inactive accounts, missing source ref, missing idempotency key, negative amounts, reversal semantics, reversal into closed period, double reversal, seed chart integrity, deterministic idempotency keys.
- git status: only the files above are attributable to this task. Pre-existing changes from other agents were preserved untouched.

## Risks or Limitations

- The domain is schema-free. The posting kernel's balance invariant must be enforced at the persistence boundary (trigger or RPC) when the schema lands.
- The money storage convention (NUMERIC(18,2)) and entity boundary (GATE A) are unresolved schema decisions.
- No source-transaction ingestion from existing payments/invoices yet. That is the next increment.

## Deferred Work

- Schema and migrations for accounts, journal entries, periods, with triggers and RLS.
- Source transaction model and ingestion from existing payments and invoices.
- Accounting periods lifecycle service (open/close/lock).
- Journal-derived reporting (trial balance, GL, P&L).
- Remaining Phase 1 items: revenue posting, payments and allocations, expenses, fixed assets, corrections service, provenance integration.

## Skills Used

writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English