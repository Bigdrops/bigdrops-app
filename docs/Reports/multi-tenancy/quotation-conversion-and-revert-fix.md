# Quotation Conversion and Revert Failure Fix Report

This report was written by deepseek-v4-flash-free on 2026-08-17 via opencode.

## Objective

Fix two multi-tenancy bugs in the quotation conversion and revert flows:

1. Quotation conversion failed with the error: `Could not find the function entity_bigdrops-main_main.save_invoice_with_items_transaction(p_entity_id, p_invoice_payload, p_items, p_mode) in the schema cache`.
2. Quotation revert failed with the error: `new row for relation "quotations" violates check constraint "quotations_status_check"`.

## Scope

The fix covered two files:

- One frontend file.
- One new SQL migration.

No applied migration was edited.

## Files changed

- `src/pages/viewQuotationActions.ts`
- `supabase/migrations/20260820000000_fix_revert_quotation_status_mapping.sql`

## Skills used

NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

### Conversion failure fix

Root cause: `viewQuotationActions.ts:207` called `tenantClient.rpc('save_invoice_with_items_transaction', ...)`.

The function `save_invoice_with_items_transaction` lives only in the `public` schema. The tenant client resolves RPC calls against the tenant schema. This produced the schema cache error.

All other callers of the function use the public `supabase.rpc` client and pass `p_entity_id` explicitly. Example: `useInvoiceSave.ts:280` and `useInvoiceSave.ts:304`.

Fix: changed the call at `viewQuotationActions.ts:207` to use `supabase.rpc`. The `supabase` import already existed in the file.

### Revert failure fix

Root cause: `revert_invoice_to_quotation_transaction` mapped the invoice status to a quotation status of `accepted`, `expired`, or `draft`.

The live constraint `quotations_status_check` allows only `open`, `converted`, and `archived`. Every revert therefore violated the constraint.

Fix: created migration `20260820000000_fix_revert_quotation_status_mapping.sql`. The migration redefines the function with a corrected status mapping:

- An archived invoice reverts to an archived quotation.
- Every other case reverts to an open quotation.

The function body is identical to the previous definition except for the status mapping CASE expression.

## Verification

- `bun run audit:load`: passed. All reported warnings are pre-existing and do not reference the changed files.
- `bun run typecheck`: passed.
- `git status`: shows only the two intended changes.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

The new migration has not been applied to a live database. Apply it with `bunx supabase db push` or the equivalent migration runner in the target environment.

The migration redefines a `SECURITY DEFINER` function. The redefinition preserves the existing security model.

## Deferred work

The constraint `quotations_status_check` exists only in the live database, not in the migration files. Consider adding the constraint to a migration to close the live-to-migration gap.