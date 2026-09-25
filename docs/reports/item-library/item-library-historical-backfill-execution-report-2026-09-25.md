# Item Library Historical Backfill Execution Report

This report was written by Codex on 2026-09-25 via Codex Desktop.

## Objective

Execute a controlled historical Item Library backfill.

The backfill must link only safe historical invoice and quotation rows to tenant item catalog records.

## Scope

In scope:

- Create a migration for the historical backfill.
- Create an audit trail for each linked row.
- Run a dry-run classification before mutation.
- Execute the backfill through `supabase db push`.
- Verify the mutation result.
- Add focused migration tests.

Out of scope:

- Manual review of Tier C rows.
- Mutation of Tier D rows.
- Mutation of incomplete tenants.
- Build verification with `bun run build`.

## Files changed

- `supabase/migrations/20260925110000_item_library_historical_backfill.sql`
- `src/tests/item-library/itemLibraryHistoricalBackfillMigration.test.js`
- `docs/reports/item-library/item-library-historical-backfill-execution-report-2026-09-25.md`

Pre-existing untracked files were present before this task:

- `docs/reports/boq/boq-form-prototype-v4-report-2026-09-25.md`
- `docs/reports/item-library/item-library-historical-backfill-planning-audit-2026-09-25.md`

They were not changed by this task.

## Skills used

Skills used: superpowers:using-superpowers, supabase, supabase-postgres-best-practices, superpowers:test-driven-development, superpowers:verification-before-completion

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

This report uses ASD-STE100 Simplified Technical English.

## Database architecture

The migration creates two public audit tables:

- `public.item_library_backfill_batches`
- `public.item_library_backfill_audit`

Both tables have row level security enabled.

The batch table stores the dry-run summary, result summary, status, error text, and timestamps.

The audit table stores one row for each linked historical row. It stores the tenant schema, source table, source row id, previous item id, new item id, execution tier, normalized description, canonical item id, canonical source, and whether the batch created the canonical item.

The migration also creates these helper functions:

- `public._item_library_backfill_tokenize(text)`
- `public._item_library_backfill_token_overlap(text[], text[])`
- `public._item_library_backfill_classify_tenant(text)`
- `public._item_library_backfill_mutate_tenant(text, uuid)`
- `public.run_item_library_historical_backfill(text)`

Public execute access is revoked from the helper and runner functions.

## Dry-run classification

The migration classified tenant rows before mutation.

Incomplete tenants were skipped:

- `entity_bigdrops-main_agam`
- `entity_bigdrops-main_issa-certified`
- `entity_bigdrops-main_ororo`

Pre-mutation dry-run totals:

| Tenant | Total null-linked rows | Tier A | Tier B | Tier B identities | Tier C | Tier D | Invoice candidates | Quotation candidates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `entity_bigdrops-main_anthropology` | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| `entity_bigdrops-main_azerbaijan` | 13 | 0 | 13 | 13 | 0 | 0 | 0 | 13 |
| `entity_bigdrops-main_main` | 1193 | 109 | 563 | 446 | 481 | 40 | 161 | 511 |
| Other complete tenants | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Aggregate dry-run totals:

- Total null-linked rows: 1207
- Tier A rows: 109
- Tier B rows: 577
- Tier B identities: 460
- Tier C rows: 481
- Tier D rows: 40
- Expected linked rows: 686

The dry-run was more conservative than the planning audit. Automatic rows decreased from 702 to 686. Human-review rows increased from 465 to 481.

## Mutation executed

The migration executed through `supabase db push`.

It applied migration `20260925110000_item_library_historical_backfill.sql`.

The mutation did these actions:

- Created 460 tenant-local catalog records for Tier B identities.
- Linked 686 historical rows.
- Linked only rows that still had `item_id IS NULL`.
- Linked only standard rows with non-empty normalized descriptions.
- Left Tier C rows unchanged.
- Left Tier D rows unchanged.
- Left incomplete tenants unchanged.

The migration updates only `item_id` on `invoice_items` and `quotation_items`.

## Per-tenant result

| Tenant | Created catalog records | Linked rows | Invoice linked | Quotation linked | Remaining null rows | Remaining Tier C | Remaining Tier D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `entity_bigdrops-main_anthropology` | 1 | 1 | 0 | 1 | 0 | 0 | 0 |
| `entity_bigdrops-main_azerbaijan` | 13 | 13 | 0 | 13 | 0 | 0 | 0 |
| `entity_bigdrops-main_main` | 446 | 672 | 161 | 511 | 521 | 481 | 40 |
| Other complete tenants | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Aggregate result:

- Audit rows: 686
- Tier A audit rows: 109
- Tier B audit rows: 577
- Created-by-batch canonical rows: 577
- Created-by-batch distinct items: 460
- Rows with previous item id: 0
- Rows with null new item id: 0

## Post-mutation classification

Post-mutation classification found:

- `entity_bigdrops-main_anthropology`: 0 remaining null-linked rows.
- `entity_bigdrops-main_azerbaijan`: 0 remaining null-linked rows.
- `entity_bigdrops-main_main`: 521 remaining null-linked rows.
- `entity_bigdrops-main_main`: 481 Tier C rows remain for human review.
- `entity_bigdrops-main_main`: 40 Tier D rows remain excluded.

There are no remaining Tier A or Tier B mutation candidates in the affected tenants.

## Catalog and trigger checks

Post-mutation catalog counts:

- `entity_bigdrops-main_anthropology`: 1 active catalog record.
- `entity_bigdrops-main_azerbaijan`: 13 active catalog records.
- `entity_bigdrops-main_main`: 1848 active catalog records.

Duplicate active normalized catalog names:

- Total duplicate active normalized names: 0.

Forward ingestion triggers:

- Enabled trigger count: 22.
- Trigger function: `public.learn_item_catalog_for_line_item()`.
- Trigger names: `trg_learn_item_catalog_invoice_items` and `trg_learn_item_catalog_quotation_items`.

## Financial and document integrity

The migration does not recalculate financial values.

The migration does not update parent `invoices` or `quotations`.

The mutation statement sets only `item_id` on `invoice_items` and `quotation_items`.

The focused tests check that the migration does not update these fields:

- `description`
- `quantity`
- `unit_price`
- `vat`
- `total`

Post-mutation row counts for parent documents stayed stable in the verification query.

A regenerated content hash check did not match the earlier transcript hash values for active tenants. The earlier hash SQL file was not available for comparison. Therefore, the hash check was not used as the pass or fail gate.

The direct mutation evidence remains:

- 686 audit rows were written.
- All audited rows had `previous_item_id IS NULL`.
- All audited rows had a non-null `new_item_id`.
- The migration SQL updates only `item_id`.
- Tier C and Tier D counts stayed unchanged after mutation.

## Audit and rollback design

The batch is traceable through `public.item_library_backfill_batches`.

Each linked source row is traceable through `public.item_library_backfill_audit`.

Rollback can use the audit table to set audited rows back to `item_id = previous_item_id`, which is `NULL` for this batch.

Rollback must also review batch-created catalog items before deletion because future rows can reference them after the backfill.

## Verification result

Verification:

- `supabase db push`: passed. Migration `20260925110000_item_library_historical_backfill.sql` applied. Supabase also reported that `_temp_debug.sql` was skipped because the file name does not match the migration pattern.
- Focused tests: passed. `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/item-library/itemLibraryHistoricalBackfillMigration.test.js src/tests/item-library/itemLibraryForwardIngestionMigration.test.js` reported 10 passed, 0 failed.
- `bun run audit:load`: completed with exit code 0. Existing load-risk findings remain.
- `bun run typecheck`: failed on pre-existing `src/pages/settings/AdminSettingsSection.tsx(38,148): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.`
- `git diff --check`: passed.
- `git status`: shows the two pre-existing untracked reports, plus the new migration, new test, and this report.
- `supabase db push`: passed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: passed.

The remote batch status is `completed`.

Batch id:

- `5ee4fc23-178d-457b-9799-3ea8d4a0c2ca`

Batch timestamp:

- `2026-09-25T18:52:34.365051+00:00`

## Risks or limitations

The remaining 481 Tier C rows need human review.

The remaining 40 Tier D rows are intentionally excluded.

The incomplete tenants were skipped by design.

The typecheck gate is blocked by an existing error outside the files changed for this task.

The content hash check could not be used as a final integrity gate because the earlier hash SQL was not available for exact replay.

## Deferred work

- Review and decide Tier C rows.
- Keep Tier D rows excluded unless a separate task changes the classification rules.
- Fix the existing `AdminSettingsSection.tsx` type error in a separate task.
