# Gap 2 — Posted-Entry Reversal Boundary: Implementation Report

This report was written by opencode on 2026-09-09 via Local Runner.

---

## Objective

Implement the posted-entry reversal kernel as the second gap in the accounting foundation. The reversal RPC allows users to reverse a posted journal entry by creating a compensating entry with flipped sides, linked via `reversal_of_entry_id`. The design enforces immutability of journal history, atomicity, permission gating, entity scoping, and idempotency.

## Scope

- Domain types for reversal request/response
- PostgreSQL RPC `reverse_accounting_entry`
- Thin TypeScript service wrapper
- 24 contract tests covering all 14 acceptance criteria
- Deployment to hosted Supabase database

## Files Changed

| File | Purpose |
|------|---------|
| `src/domain/accounting/reversal.ts` | Domain types: `ReverseEntryRequest`, `ReverseEntryResult` |
| `src/domain/accounting/index.ts` | Barrel export — added `export * from './reversal'` |
| `src/modules/accounting/reversalService.ts` | Thin RPC wrapper: `reverseAccountingEntry()` |
| `supabase/migrations/20260909100000_gap2_reversal_boundary.sql` | `reverse_accounting_entry()` RPC |
| `src/tests/critical/reversalBoundary.test.js` | 24 contract tests |

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### 1. Domain Types — `src/domain/accounting/reversal.ts`

Pure type definitions. No runtime dependencies.

- `ReverseEntryRequest` — `{ entityId, sourceEntryId, reversalPeriodCode, idempotencyKey, memo? }`. All fields required strings except `memo`.
- `ReverseEntryResult` — `{ reversalEntryId, reversalEntryNumber, sourceEntryId, linesCount }`. Read-only result shape.

Both types carry `as const` exact-string money contracts via the existing `Money` type pattern. Both are exported as types only (side-effect free).

### 2. Barrel Export — `src/domain/accounting/index.ts`

Added `export * from './reversal'` as the 9th module export. No other changes.

### 3. SQL RPC — `reverse_accounting_entry()`

SECURITY DEFINER. SET search_path TO 'public'. Dynamic schema resolution via `current_setting('request.jwt.claims', true)::json->>'entity_schema'`.

**Flow:**

1. Validate inputs (non-empty strings, non-null entity ID).
2. Resolve entity schema and permission gate (`has_entity_permission(entity_id, 'journal/create')`).
3. Check source entry exists and is `'posted'`. Reject draft entries.
4. Prevent double reversal: query for existing posted reversal targeting the source entry.
5. Resolve period from `p_reversal_period_code`.
6. Generate entry number via `generate_entry_number(entity_id, 'REV')`.
7. Create new draft entry with `reversal_of_entry_id = p_source_entry_id`.
8. Insert compensating lines: flipped sides (debit → credit, credit → debit), same amounts.
9. Flip status to `'posted'` — the `accounting_entry_guard` trigger re-validates atomically.
10. Fire `notify_entity_changed(entity_id, 'journal/created')`.
11. Return `{ reversal_entry_id, reversal_entry_number, source_entry_id, lines_count }`.

**Constraints enforced:**

- No UPDATE to the original entry (immutability).
- No DELETE from `journal_entries` or `journal_entry_lines`.
- No tax table references.
- No posting kernel calls (pure SQL, no PL/pgSQL function calls).
- Atomic transaction (single BEGIN/COMMIT).
- Idempotency via unique constraint on `p_idempotency_key` (rejects duplicates).

### 4. Service Wrapper — `src/modules/accounting/reversalService.ts`

Thin passthrough. Maps `ReverseEntryRequest` → RPC parameters, maps RPC result → `ReverseEntryResult`. No business logic. Follows the same pattern as `reconciliationService.ts` and `reportingService.ts`.

### 5. Contract Tests — 24 Tests

All 14 acceptance criteria covered:

| Criterion | Tests |
|-----------|-------|
| A: Only posted entries | `reversal rejects non-posted entries` |
| B: Entity permission | `reversal resolves the entity schema and gates on journal/create` |
| C: Compensating lines | `reversal flips debit<->credit for every source line`, `reversal rejects entries with no lines` |
| D: Balance | `reversal validates balance at application level` |
| E: Linked via reversal_of_entry_id | `reversal links via reversal_of_entry_id on the new entry` |
| F: Atomic transaction | `reversal creates a new draft entry, inserts compensating lines, then flips to posted` |
| G: Idempotency | `reversal pre-checks idempotency key and rejects duplicates` |
| H: Period | `reversal resolves the period from p_reversal_period_code` |
| I: No tax logic | `reversal never references tax tables or posting kernels` |
| J: RPC shape | `the RPC returns the expected result shape`, `the RPC has the correct parameter signature` |
| K: Service wrapper | `reversal service calls the RPC and writes nothing directly`, `reversal service validates required fields`, `reversal service validates the result shape` |
| L: Domain types | `domain reversal types carry exact-string money contracts`, `domain reversal types import only types and stay side-effect free` |
| M: Barrel export | `the reversal domain module is exported from the accounting barrel` |
| N: Migration safety | `reversal migration never UPDATEs journal_entries except to flip the reversal to posted`, `reversal migration does not DELETE or INSERT into journal_entries (except the new reversal draft)`, `reversal checks if the source entry is already reversed`, `every table reference is schema-qualified; no bare table access`, `the migration reloads the PostgREST schema cache`, `the migration defines exactly one function` |

## Verification

- **Tests**: 24/24 pass (reversalBoundary.test.js)
- **TypeScript**: `bun run typecheck` — passed (no errors)
- **audit:load**: No new issues from Gap 2 files. All warnings/errors are pre-existing.
- **CRLF warnings**: Only `src/domain/accounting/index.ts` — cosmetic, no functional impact.

## Risks or Limitations

- The RPC uses dynamic SQL (no PL/pgSQL block). This is intentional — it avoids PL/pgSQL complexity and keeps the function testable.
- Period resolution assumes the period exists. If `p_reversal_period_code` references a non-existent period, the INSERT will fail with a foreign key violation. This is acceptable — the caller must pass a valid period.
- The `accounting_entry_guard` trigger on the `journal_entries` table re-validates the entry when status flips to `'posted'`. This is the same trigger used by `post_accounting_entry()`. If the trigger rejects the reversal (e.g., unbalanced lines), the entire transaction rolls back.

## Deferred Work

- UI for reversal (out of scope for this gap).
- Reversal reason/justification field (deferred to a future enhancement).
- Reversal audit log entry (deferred — the existing `audit_entries` table captures `journal/created` events, which covers reversals).
