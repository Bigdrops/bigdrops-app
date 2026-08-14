# Invoice Edit Discount Persistence Fix Report

This report was written by DeepSeek (OpenCode) on 2026-08-14 via Local Runner.

## Objective

Fix the Invoice Edit discount-persistence defect. A global discount added during Edit was lost after Save. The cause was a `COALESCE` in the invoice save RPC that converted `NULL` row-level discount rates to `0`. This change preserves the `NULL` value.

## Scope

- The invoice save RPC `public.save_invoice_with_items_transaction`.
- The `discount_rate` column write path only.
- No change to `src/lib/Calculations.ts`.
- No change to the column manager.
- No change to the discount system.
- No data backfill.

## Root Cause

`save_invoice_with_items_transaction()` wrote item rows with:

```sql
COALESCE((v_item->>'discount_rate')::numeric, 0)
```

In the engine, `NULL` means "inherit the global discount" and `0` means "explicit no override". The `COALESCE` destroyed this distinction. After the first Save, every item row stored `0`. On Edit, the discount engine could not tell that the user wanted a global discount. The saved items therefore did not inherit the global discount. The behavior appeared as "the global discount is lost after Save".

Evidence:

- `src/lib/Calculations.ts:203` — `inheritsGlobal = item.discount_rate == null`.
- `src/domain/invoice/normalize.ts:285` — the invoice path keeps `0`.
- `src/domain/quotation/normalize.ts:137` — the quotation path heals `0` to `null`.
- `supabase/migrations/20260809070000_invoice_composite_transactions.sql:210` — the `COALESCE`.
- Live database: `pg_get_functiondef` shows the same `COALESCE` expression in the deployed function.
- Live invoices `SASINV079` and `SASINV080` — all item rows have `discount_rate = 0`.

## Reference Behavior

The quotation path preserves `NULL`. `revert_invoice_to_ln_transaction()` writes:

```sql
(v_item->>'discount_rate')::NUMERIC
```

It has no `COALESCE`. The new invoice behavior follows this reference.

## Files Changed

- `supabase/migrations/20260814000000_fix_invoice_item_discount_null.sql` (new migration).
- `docs/Reports/invoice/edit-invoice-discount-persistence.md` (forensic report from prior task).

## Changes Made

The new migration redefines `save_invoice_with_items_transaction()` using the exact body of the currently deployed function. The single change is:

- Before: `COALESCE((v_item->>'discount_rate')::numeric, 0)`
- After: `(v_item->>'discount_rate')::numeric`

The function body otherwise matches the deployed version. The `install_rate_override` boolean keeps its `COALESCE(..., false)`. That field is a boolean flag and its default behavior is functionally required. It is outside the scope of this fix.

## Discount Semantics Preserved

| Input | Before | After |
|-------|--------|-------|
| `NULL` | `0` (wrong) | `NULL` (inherits global) |
| `0` | `0` | `0` (explicit no override) |
| `5` | `5` | `5` (explicit override) |

No existing value changes meaning. Only future `NULL` values are preserved.

## Database Changes

- One new migration file.
- One function redefinition via `CREATE OR REPLACE FUNCTION`.
- No schema change.
- No data change.
- No backfill. Legacy rows with `discount_rate = 0` cannot be separated from intentional `0%` overrides. A backfill would corrupt explicit override semantics. The fix prevents future corruption only.

## Verification

- `bun run audit:load`: passed. Warnings are pre-existing and none are in changed files.
- Migration dry-run on the linked database inside a transaction with `ROLLBACK`: passed. The function compiles and the `COALESCE` expression is absent from the new definition.
- `bun run typecheck`: failed with pre-existing errors in quotation, CSR, Waybill, and invoice page files. These errors relate to the multi-tenant migration WIP (`tenantClient`, `supabase` references). None are in files changed by this task.
- `git status`: the migration is the only new tracked-path addition from this task.
- `bun run build`: skipped due to hardware policy.

## Skills Used

supabase, supabase-postgres-best-practices, audit-trail-investigation

## Documentation Standard

ADS-STE100 Simplified Technical English

## Risks or Limitations

- The fix prevents future `NULL` loss. It does not repair existing rows.
- The migration must be applied to the live database before the behavior changes in production.
- The repository copy of the original migration (`20260809070000...`) uses `p_schema_name` while the deployed function uses `v_schema`. The fix migration replicates the deployed version. Do not replace the deployed function with the repository copy.

## Deferred Work

- Apply the migration to the live database.
- Controlled UI verification: edit an invoice, add a global discount, save, reload, confirm the discount persists and items keep `NULL` discount_rate.
- If product requires it, a later data repair pass may identify intentional zero-override rows using audit trail evidence.
