# Plan D Final Backfill Report

This report was written by opencode (deepseek-v4-flash-free) on 2026-08-23 via Local Runner.

## Objective

Deliver Plan D of the Multi-Tenancy Final Reconciliation Blueprint. Plan D closes root cause B: it backfills the remaining public-only rows in the live production entity `entity_bigdrops-main_main`, re-adds the deferred cross-schema foreign keys, and resolves the SASQUO-324 quotation duplicate.

The agent applied the migrations to production via the Supabase Management API query endpoint. The human operator handoff was not used.

## Scope

Plan D covers:

- Remove the SASQUO-324 quotation duplicate on direct user instruction.
- Backfill the remaining public-only rows across 8 tables with preserved IDs.
- Re-add the deferred cross-schema foreign keys (`_clone` suffix).
- Restore canonical trigger parity after the copy.
- Validate counts, ID sets, orphan integrity, and FK re-add.

Plan D does not cover:

- Permissions for the owner user. The seeder runs separately.
- Migrating `public.letters`. The single public-only letter (LTR-000001, id 6787502b) is an ownership blocker and is excluded.
- Frontend changes.
- The stray schema. Plan G covers this.
- The 7 pre-existing item-library blockers. They are unrelated and documented separately.

## Files changed

- `supabase/migrations/20260821590000_remove_sasquo324_duplicate.sql` (new)
- `supabase/migrations/20260822000000_plan_d_final_backfill.sql` (new)
- `docs/Reports/multi-tenancy/plan-d-final-backfill.md` (this report)

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Documentation standard

This report follows ADS-STE100 Simplified Technical English.

## Changes made

### SASQUO-324 duplicate resolution

Two quotations shared the unique `quotation_number` SASQUO-324:

- `public.quotations.7776bd46-b466-4e0d-95b8-d5ad8701b4c5` created 2026-08-10 by user `b676c7a8` (NO-ENTITY owner) for client `49d5f6e8` (Century Mining Company Ltd), 7 quotation_items, subtotal 121000, status open.
- `entity_bigdrops-main_main.quotations.09005d6f-01d2-4a47-8e8e-dbabfba40b47` created 2026-08-14 by the same owner user for the same client, 0 quotation_items, total 376250, status open.

Both rows were created by the same unresolvable owner for the same client four days apart with different contents. They are two different quotations sharing one number. The duplicate blocked the Plan D insert because the tenant `quotations` table enforces a unique constraint on `quotation_number`.

The project lead directed: DELETE BOTH. This is an explicit user override of the usual "public data is never deleted" guardrail. The override applies only to these two quotation rows.

The deletion migration `20260821590000_remove_sasquo324_duplicate.sql`:

- Confirms exactly one row exists in each schema before deleting (guard against wrong-scope deletion).
- Deletes the 7 public `quotation_items` owned by public `7776bd46` first (required by the public FK `quotation_items_quotation_id_fkey`).
- Deletes public quotation `7776bd46`.
- Deletes tenant quotation `09005d6f` (0 items, no tenant FK points at quotations).
- Keeps the audit log rows (CREATE event, id `65f20bd8` in both schemas) to preserve the audit trail and document lineage.

Reference checks performed before deletion:

- The only public FK referencing `quotations` is `quotation_items_quotation_id_fkey`.
- Tenant has no FK referencing `quotations` (all `_clone` FKs were dropped by earlier migrations).
- No `quotation_id` column exists on `invoices`.
- Audit log soft references exist in both schemas and are preserved.

Post-delete verification (r29): public quotation count 322 to 321, tenant quotation count 327 to 326, 0 items reference `7776bd46`, 1 audit log each.

### Plan D final backfill

The migration `20260822000000_plan_d_final_backfill.sql`:

- Resolves the entity id from `public.entities` and `public.workspaces` by schema name. It uses no hardcoded UUID. It raises an exception if the entity cannot be resolved.
- Guards on the provisioning helpers `public._prov_install_triggers` and `public._prov_readd_foreign_keys`.
- Drops the quotation ownership-stamping triggers on the tenant `quotations` table before the copy so preserved `created_by` and `updated_by` metadata is kept.
- Copies public-only rows into tenant with preserved IDs:
  `INSERT INTO tenant.<table> SELECT * FROM public.<table> ON CONFLICT (id) DO NOTHING`.
- Copy order is foreign-key safe: signatories, clients, bank_accounts, quotations, quotation_items, csrs, rfqs, audit_logs.
- `letters` is deliberately excluded from the copy.
- Re-installs canonical triggers after the copy.
- Validates and raises an exception on any mismatch:
  - Every public id in the 8 backfill tables exists in the tenant table.
  - No orphan `csrs.technician_signatory_id`.
  - No orphan `rfq_items.rfq_id`.
- Re-adds the deferred `_clone` foreign keys via `public._prov_readd_foreign_keys` for: csrs, invoice_items, invoices, payments, quotation_items, quotations, receipts, rfq_items, waybills.
- `projects` is skipped because `projects_client_id_fkey_clone` already exists (name collision).
- Re-runs orphan validation after FK re-add.
- Confirms `letters` remains the only public-only table and logs it as the expected blocker.

### Verification of the 2026-08-22 failed run

A first run of the Plan D migration failed on the `quotations_quotation_number_key` unique violation caused by the SASQUO-324 duplicate. The failed run rolled back cleanly. Pre-run and post-rollback counts matched for all tables (r21).

## Verification

### Delete verification (r29)

- public quotation `7776bd46`: 0 rows.
- public quotation_items owned by `7776bd46`: 0 rows.
- tenant quotation `09005d6f`: 0 rows.
- public audit log referencing `7776bd46`: 1 row (preserved).
- tenant audit log referencing `7776bd46`: 1 row (preserved).
- public quotations total: 321.
- tenant quotations total: 326.

### Plan D post-run counts (r30)

| table           | public | tenant | pub_only |
|-----------------|--------|--------|----------|
| signatories     | 1      | 1      | 0        |
| clients         | 32     | 32     | 0        |
| bank_accounts   | 1      | 1      | 0        |
| quotations      | 321    | 326    | 0        |
| quotation_items | 2799   | 2823   | 0        |
| csrs            | 17     | 17     | 0        |
| rfqs            | 3      | 3      | 0        |
| audit_logs      | 428    | 428    | 0        |
| letters         | 1      | 0      | 1        |

The tenant counts are higher for `quotations` and `quotation_items` because tenant legitimately contains ten-only rows. The validation uses `public subset tenant` (pub_only = 0), not strict equality.

### FK re-add verification (r31)

All 16 target `_clone` foreign keys are present:

- quotations: `quotations_client_id_fkey_clone`, `quotations_project_id_fkey_clone`.
- csrs: `csrs_project_id_fkey_clone`, `csrs_technician_signatory_id_fkey_clone`.
- quotation_items: `quotation_items_item_id_fkey_clone`, `quotation_items_quotation_id_fkey_clone`.
- rfq_items: `rfq_items_rfq_id_fkey_clone`.
- invoices: `invoices_project_id_fkey_clone`.
- invoice_items: `invoice_items_item_id_fkey_clone`.
- payments: `payments_invoice_id_fkey_clone`.
- receipts: `receipts_client_id_fkey_clone`, `receipts_invoice_id_fkey_clone`, `receipts_payment_id_fkey_clone`.
- waybills: `waybills_client_id_fkey_clone`, `waybills_invoice_id_fkey_clone`, `waybills_project_id_fkey_clone`.

The pre-existing `projects_client_id_fkey_clone` is present (not re-added by this run).

### Orphan verification (r32)

- orphan `csrs.technician_signatory_id`: 0.
- orphan `rfq_items.rfq_id`: 0.
- orphan `quotation_items.quotation_id`: 0.

### Trigger parity (r33)

The tenant `quotations` table has both canonical triggers enabled:

- `trg_quotations_stamp_ownership`.
- `trg_quotations_set_updated_at`.

Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: two new migration files and one report (see below)

The audit findings are pre-existing and unrelated to these migrations. The migrations add no TypeScript code.

## Risks or limitations

- The two deleted quotation rows are unrecoverable. This was the explicit user decision.
- The audit log rows referencing the deleted quotation `7776bd46` remain as soft references. This is intentional: it preserves the audit trail. No FK prevents these rows from referencing a deleted quotation.
- `public.letters` still has 1 public-only row (LTR-000001, id 6787502b). Its `tenant_id` `b676c7a8-7834-40dd-bc45-655822c5c5e6` matches no entity or workspace. The owner is the same unresolvable user that created the deleted quotations. It is reported as a blocker, never silently dropped or invented into tenant.
- The owner user has no permissions for the backfilled resources. Access is denied until the seeder runs.

## Deferred work

- Seed owner permissions. Run:
  `SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');`
- Resolve the `letters` public-only row (LTR-000001). The owner user `b676c7a8` must be mapped to an entity, or the row must be assigned to the target entity on a documented business decision.
- Plan E: grant permissions to other users per role.
- Plan F: source migration.
- Plan G: cutover and verification.
- The 7 pre-existing item-library blockers (missing `merge_item_catalog_entries` RPC, item-library RLS default-deny, mixed-schema revert RPC) are unrelated to this work and remain open.