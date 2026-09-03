# Invoice Edit Payload ID Fix Report

This report was written by DeepSeek on 2026-08-12 via Local Runner.

## Objective

Fix Invoice Edit persistence for invoice SASINV077.

## Scope

- Modify the Invoice Edit save payload construction.
- Do not modify creation, RPC, calculations, audit logging, quotation, RLS, permissions, provisioning, PDF, or migrations.

## Files changed

- `src/hooks/useInvoiceSave.ts` (one line added)

## Skills used

- supabase
- supabase-postgres-best-practices
- audit-trail-investigation

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

- Added one line inside the edit persist branch:

```ts
payload.id = id
```

- The line is placed before the call to the RPC `save_invoice_with_items_transaction`.
- The variable `id` is the persist context ID. It is the existing invoice ID.
- No other logic changed.

## Root cause resolution

- The RPC edit branch uses:

```sql
WHERE id = (p_invoice_payload->>'id')::uuid
```

- Before the fix, the payload had no `id`.
- The RPC received `p_invoice_payload->>'id' = NULL`.
- The UPDATE matched zero rows.
- After the fix, the payload carries the real invoice ID.
- The UPDATE now matches the target invoice.
- This resolves the zero-row `WHERE id = NULL` case.

## Verification

- Diff inspected: only `src/hooks/useInvoiceSave.ts` changed.
- Create mode unchanged: no `payload.id` injected in the create branch.
- `bun run typecheck`: passed for `useInvoiceSave.ts`.
- Pre-existing errors remain in unrelated quotation and CSR files. They were present before this change.
- `bun run audit:load`: not run. It was not required by project audit rules for this change.
- `git status`: only `src/hooks/useInvoiceSave.ts` modified.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- The live edit still needs the controlled SASINV077 save test.
- Orphan `invoice_items` rows are untouched.
- Orphan cleanup is deferred to a separate task.

## Deferred work

- Controlled SASINV077 save test by the user.
- Inventory and cleanup of orphan `invoice_items` rows.