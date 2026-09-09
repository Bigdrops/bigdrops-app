# Gap 1 Reporting Foundation Implementation Report

This report was written by Buffy on 2026-09-08 via Freebuff.

## Objective

Implement the canonical Gap 1 Journal-Derived Reporting Foundation defined by
`docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Gap-1-journal-derived-reporting-foundation-spec-v1.md`
(v1.1 content). The fixed boundary:

Journal → deterministic account/period aggregation → trial balance.

The derivation is read-only. It produces account balances, period totals with
bounded opening and closing chains, and a trial balance with an explicit
equality assertion.

## Scope

- One read-only Postgres RPC in one new migration.
- One domain types module with exact-string money contracts.
- One thin typed service wrapper, mirroring `reconciliationService.ts`.
- One barrel export line in `src/domain/accounting/index.ts`.
- One critical contract test file.

Out of scope, unchanged, and untouched: posting kernel, triggers, posting RPC,
source-transaction lifecycle, Record Capture, `tax_input_entries`, reversal
flows (Gap 2), tax logic, P&L, UI, caches, operational aggregates.

## Files changed

| File | Change |
| :--- | :--- |
| `supabase/migrations/20260908100000_accounting_reporting_foundation.sql` | Added. Defines `public.derive_accounting_reporting(p_entity_id, p_period_id DEFAULT NULL)`. Returns jsonb: balances, periods, trial_balance, source_trace, draft_residue, scope. |
| `src/domain/accounting/reporting.ts` | Added. Type contracts for the report. All money fields are exact strings. |
| `src/modules/accounting/reportingService.ts` | Added. Thin read-only wrapper over the RPC. Validates report shape. Rejects non-canonical scope. |
| `src/domain/accounting/index.ts` | Modified. Added `export * from './reconciliation'` and `export * from './reporting'`. |
| `src/tests/critical/accountingReportingFoundation.test.js` | Added. 25 contract tests that pin the derivation rules. |

## Skills used

Skills used: supabase-postgres-best-practices, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English

Both skills were loaded from `.agents/skills/` per `docs/PROJECTSKILLINDEX.md`.

## Documentation standard

ASD-STE100 Simplified Technical English.

## Resolved specification verifications

The spec lists three bounded verifications (section 18, items 1 to 3). All
closed with repository evidence:

1. **Draft residue (item 1).** The only status writer in any migration is the
   single-transaction draft-to-posted flip inside `post_accounting_entry`.
   No later migration transitions status. No supported path leaves a
   posted-eligible entry in draft. The posted-only rule stays literal. The
   report surfaces the draft count as data.
2. **Period ordering key (item 2).** `(start_date, code)`. Chronological and
   deterministic. Period codes carry a UNIQUE constraint, so the pair is a
   total order with no tie. This matches the chronological intent of the
   existing `listPeriods` display ordering.
3. **Derivation surface (item 3).** One SECURITY DEFINER RPC. It follows the
   Increment 5 pattern: schema resolution through `_prov_get_schema_name`,
   `has_entity_permission` gate on `journal/view`, `%I` schema qualification
   for every table, jsonb result, exact-text amounts, `NOTIFY pgrst` at the
   end.

## Changes made

### Selection rules (spec 9.1, 9.6)

- Posted only: `je.status = 'posted'`. Draft entries contribute nothing.
- Active entries only: a posted entry is active only if it has not been
  reversed by a posted reversal entry. The probe reads
  `EXISTS (posted r WHERE r.reversal_of_entry_id = je.id)`. The original is
  excluded. The reversal stays active unless itself reversed. Both rows stay
  in journal history for audit.
- No partial-reversal support. No reversal flow. Gap 2 stays separate.

### Sign convention and exactness (spec 9.2, 9.7)

- Lines keep side plus non-negative amount. No signed amounts exist.
- Debit total = `SUM(amount) FILTER (WHERE side = 'debit')`. Credit total
  likewise. Net = debit − credit.
- All sums run in Postgres NUMERIC. All amounts cross the boundary as exact
  text. No JavaScript arithmetic touches money.

### Account balances (spec 9.3)

- One row per account over all active posted lines of the book.
- Inactive accounts still report. Every account appears, even with zero
  activity.

### Period totals (spec 9.4)

- One row per account per period. Period net from that period's active posted
  lines.
- Opening net = cumulative net over strictly earlier periods in
  `(start_date, code)` order. The running window spans the full period ×
  account grid, so a period with no activity still carries the chain.
- Closing net = opening net + period net.
- Optional `p_period_id` bound is inclusive. It caps the active set and every
  chain. An unknown period id raises an exception.

### Trial balance (spec 9.5)

- One row per account: debit total, credit total, net.
- Grand totals plus an `is_equal` flag asserted in Postgres NUMERIC.
- A mismatch is surfaced as data. Nothing is repaired, absorbed, or blocked.
- Per-account debit ≠ credit is normal accounting state. The migration adds
  no per-account assertion.

### Traceability (spec 11)

- The report carries `source_trace`: one row per active posted entry with
  entry id, period id, period code, transaction date, `source_type`,
  `source_id`, and `reversal_of_entry_id`. A consumer can walk every derived
  figure back to account, journal lines, entry, period, and source.

### Safety

- The migration contains no data-mutation statement. No new table, no new
  column, no index, no materialized view. No operational or tax table is read.
- Reporting is as-of-read. Mismatches are surfaced, never repaired.

## Verification result

Verification:
- bun run audit:load: passed. No finding touches the Gap 1 files. All
  findings are pre-existing in unrelated files.
- bun run typecheck: passed (`tsc --noEmit`, exit 0).
- bun run test: 3 of 28 test files fail. The failures are pre-existing and
  unrelated. Evidence: `paymentAccountingIntegration.test.js`,
  `remediationContract.test.js`, and `sourceTransactionContract.test.js` fail
  at import time with `TypeError: Cannot read properties of undefined
  (reading 'VITE_SUPABASE_URL')`. `src/supabase.ts` reads
  `import.meta.env`, which does not exist under plain node. `git diff HEAD`
  over every file in those import chains returns zero files. No file in the
  chains was changed by this task or by any working-tree change.
- New focused test file: 25 of 25 tests pass
  (`src/tests/critical/accountingReportingFoundation.test.js`).
- git diff --check: passed (exit 0). Staged diff check also passed.
- git status: only the five Gap 1 files plus pre-existing changes owned by
  other agents (three staged UIUX PRD design files; the untracked phantom
  `docs/Reports/pdf/poc/vendor-forme/` directory).
- bun run build: skipped due to hardware policy.

## Risks or limitations

- Two balance authorities coexist until the authority switch: operational
  aggregates and the new derived balances. The switch is a separate planned
  increment. No consumer was switched in this task.
- The reversal rule is forward-looking. Today no posted reversal can exist
  because Gap 2 is not implemented. The active-set presentation must be
  re-verified when Gap 2 lands, before any consumer relies on post-reversal
  figures.
- Reporting is as-of-read. Late postings into an open period change that
  period's derived figures. Closed and locked periods are stable.
- The RPC is not yet applied to the hosted database. Apply with the standard
  workflow in `supabase/database-workflow.md`. The migration ends with
  `NOTIFY pgrst, 'reload schema'`.

## Deferred work

- Balance-authority switch (operational aggregates → journal-derived). The
  spec records it as a follow-up increment.
- Gap 2: controlled reversal path. Separate. Do not bundle.
- Block D: P&L. Reads the trial balance and period totals later.
- Reporting UI. Deferred per spec section 16. Adaptive UI/UX authority
  applies when built.
- Caches or persisted aggregates. Deferred until a proven need exists.

## Concurrent-agent note

Three UIUX PRD design files were staged by another agent during this task.
They were not touched. The phantom untracked directory
`docs/Reports/pdf/poc/vendor-forme/` predates this task and was not touched.
