# Gate G — Tax-to-Journal Bridge Report

This report was written by Codex on 2026-09-13 via Local Runner.

---

## Objective

Implement Gate G — the bridge between Gate F tax computation results and the accounting journal. Converts a finalized tax computation into a balanced, immutable journal entry (Dr Tax Expense, Cr CIT Payable, Cr Development Levy Payable).

## Scope

- Pure domain bridge function (`createTaxJournalEntry`)
- Service layer (`taxPostingService`) wiring bridge → accounting persistence
- 18 focused tests covering bridge logic, validation, edge cases, and seed chart
- 3 CIT accounts added to seed chart of accounts
- No admin UI, no filing workflow, no Gate H reversal handling

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/domain/tax/taxBridge.ts` | Created | Pure domain bridge — `createTaxJournalEntry()` |
| `src/domain/tax/index.ts` | Updated | Added bridge exports (`createTaxJournalEntry`, `TAX_ACCOUNTS`, `TaxPostingInput`) |
| `src/modules/tax/taxPostingService.ts` | Created | Service layer — bridge → accounting persistence |
| `src/domain/accounting/chartOfAccounts.ts` | Updated | Added 3 CIT accounts (2310, 2320, 5500) to seed chart |
| `supabase/migrations/20260905142503_accounting_persistence.sql` | Updated | Added CIT accounts to seed function |
| `src/tests/critical/gateGJournalPosting.test.js` | Created | 18 tests covering bridge, validation, seed chart, edge cases |
| `src/tests/critical/accountingPersistenceContract.test.js` | Updated | Seed chart count 11 → 14 to match new accounts |

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

---

## Changes Made

### 1. Bridge Function (`src/domain/tax/taxBridge.ts`)

Pure domain function — no DB access, no side effects. Converts a Gate F result into a balanced journal entry.

Journal entry structure:
```
Dr Tax Expense (5500)              = tax_payable + development_levy
  Cr CIT Payable (2310)            = tax_payable
  Cr Development Levy Payable (2320) = development_levy (only if > 0)
```

Design decisions:
- Idempotency key: `tax-computation:{assessment_profit}:{periodCode}` (deterministic)
- Fails explicitly on: zero total, missing/inactive accounts, no open period
- Development levy line excluded when zero (2 lines); included when nonzero (3 lines)
- Uses existing `createJournalEntry`, `debit`, `credit` from `../accounting/factories`
- Uses existing `toDecimal` from `../accounting/money` (Decimal.js)

Functions:
- `createTaxJournalEntry(input, accounts, period)` — bridge entry point
- `TAX_ACCOUNTS` — constant map: `TAX_EXPENSE: '5500'`, `CIT_PAYABLE: '2310'`, `DEV_LEVY_PAYABLE: '2320'`

### 2. Service Layer (`src/modules/tax/taxPostingService.ts`)

Thin wiring layer connecting bridge → accounting persistence. Uses `postEntry` from the accounting service. Skipped import in tests (pre-existing `VITE_SUPABASE_URL` env issue).

### 3. Seed Chart Updates

3 CIT accounts added to `chartOfAccounts.ts`:

| Code | Name | Type | Normal Balance |
|------|------|------|----------------|
| 2310 | CIT Payable | liability | credit |
| 2320 | Development Levy Payable | liability | credit |
| 5500 | Tax Expense | expense | debit |

Seed chart now has 14 accounts (was 11). Migration SQL updated to match.

### 4. Tests (`src/tests/critical/gateGJournalPosting.test.js`)

18 tests covering:

| Test | Coverage |
|------|----------|
| Balanced entry | Bridge produces equal debits and credits |
| Tax expense = pay + levy | Dr amount equals sum of Cr amounts |
| Dev levy excluded when zero | 2 lines when development_levy = 0 |
| Dev levy included when nonzero | 3 lines when development_levy > 0 |
| Source reference traces | memo references computation |
| Idempotency key | Deterministic for same inputs |
| Throws on zero total | Rejects zero tax payable + zero levy |
| Throws on missing accounts | Rejects incomplete chart |
| Throws on inactive account | Rejects inactive expense/payable |
| Throws on missing dev levy account | Rejects when levy nonzero but account missing |
| Throws on no open period | Rejects when all periods closed |
| Seed chart includes CIT | 14 accounts, 3 CIT present |
| CIT account types correct | 2310/2320 = liability/credit, 5500 = expense/debit |
| Output passes validation | `validatePosting` accepts bridge output |
| Zero-levy passes validation | 2-line entry validates |
| Small company throws | Zero total = nothing to post |
| Memo includes assessment profit | Memo shows profit in formatted text |
| Fractional kobo | Handles sub-kobo Decimal precision |

**Bug found and fixed**: `Decimal('0.00').isPositive()` returns `true` in Decimal.js — zero is considered positive. Fixed to `greaterThan(0)` in `taxBridge.ts:88`.

---

## Verification Result

- `bun run audit:load`: passed (pre-existing warnings only)
- `bun run test` (Gate G): 18/18 pass
- `bun run test` (Gate F): 14/14 pass (regression clean)
- `bun run test` (Gate E): 28/28 pass (regression clean)
- `bun run test` (Phase 2A): 34/34 pass (regression clean)
- `bun run test` (accounting persistence): seed chart 14-account + migration contract pass
- `bun run typecheck`: skipped (hangs on 4GB RAM hardware — known limitation)
- `git diff --check`: clean
- `git status`: only Gate G files + unrelated pre-existing rename from another agent

## Risks or Limitations

1. **Service not integration-tested** — `taxPostingService.ts` imports supabase client (needs env vars). Tested via unit contract only.
2. **No admin UI** — bridge is domain-only. Service layer needs API route wiring.
3. **No Gate H** — reversal handling for tax journal entries not yet implemented.
4. **typecheck skipped** — hardware limitation (4GB RAM). Run manually on CI.

## Deferred Work

1. API route wiring (`/api/tax/post`) connecting `taxPostingService` to bridge
2. Gate H: Reversal handling for tax journal entries
3. Admin UI for reviewing and approving tax journal entries
4. NRS/API integration for filing
5. Payment reconciliation for tax remittances
