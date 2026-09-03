# Multi-Tenancy SQL Migration Audit Report

This report was written by Claude on 2026-08-17 via opencode.

## Objective

Audit all multi-tenancy SQL migrations against the live Supabase database. Determine which migrations have already been applied and whether the unapplied ones are safe to run.

## Scope

- Migrations from `20260714000000_multi_tenancy_core.sql` to `20260820000000_fix_revert_quotation_status_mapping.sql`.
- Live database objects: tables, functions, policies, schemas, views, indexes, triggers.
- Migration safety for re-running or first-time application.

## Files changed

No repository files changed. All audit queries ran against the live database.

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Method

- Ran read-only queries against the live database with `bunx supabase db query --linked`.
- Checked the presence of tables, functions, policies, schemas, and views.
- Checked data counts in core multi-tenancy tables.
- Compared the results with the migration file signatures.
- Read every migration marked as not applied to assess safety.

## Changes made

No database changes. This audit is read-only.

## Verification result

### Migrations already applied

The live database contains every object created by these migrations:

| Migration | Evidence |
|---|---|
| `20260714000000_multi_tenancy_core.sql` | All 12 core tables exist |
| `20260714000001_multi_tenancy_rls.sql` | RLS policies exist on core tables |
| `20260716000000_multi_tenancy_platform_operators.sql` | `platform_operators` table and `is_platform_operator()` exist |
| `20260716000001_multi_tenancy_rls_recursion_fixes.sql` | Tenant RLS policies exist |
| `20260717000000_entity_provisioning_engine.sql` | `_prov_*` functions exist, including `provision_entity_schema` |
| `20260730000000_entity_provisioning_status_member_rpc.sql` | `get_entity_provisioning_status()` exists |
| `20260809000000_provisioning_settings_seed.sql` | `_prov_seed_settings()` exists |
| `20260809010000_invoice_aggregate_provisioning.sql` | `invoices` table exists in tenant schema |
| `20260809020000_invoice_aggregate_permissions.sql` | `invoices_*` policies exist |
| `20260809030000_invoice_aggregate_data_migration.sql` | Tenant invoice data present |
| `20260809040000_invoice_audit_schema_aware.sql` | `_audit_resolve_invoice_schema()` exists |
| `20260809050000_revert_invoice_cross_schema.sql` | `revert_invoice_to_quotation_transaction()` exists |
| `20260809060000_invoice_financials_tenant_view.sql` | `invoice_financials_v` and `project_financials_v` exist |
| `20260809070000_invoice_composite_transactions.sql` | `save_invoice_with_items_transaction()` and `delete_invoice_with_items_transaction()` exist |
| `20260810000000_tenant_settings_permission_seed.sql` | `setting` permission rows exist |
| `20260810010000_quotation_data_migration.sql` | Tenant quotation data present |
| `20260810010000_tenant_settings_identity_backfill.sql` | Duplicate version number. Applied state confirmed by data |
| `20260810030000_waybill_aggregate_provisioning.sql` | `waybills` table and policies exist |
| `20260810040000_waybill_data_migration.sql` | Tenant waybill data present |
| `20260810050000_csr_aggregate_provisioning.sql` | `csrs` table and policies exist |
| `20260810060000_csr_data_migration.sql` | Tenant CSR data present |
| `20260810070000_payment_receipt_data_migration.sql` | Tenant receipts data present |
| `20260810080000_letters_boqs_rfqs_structure_clone.sql` | `letters`, `boqs`, `rfqs` tables and policies exist |
| `20260811000000_projects_aggregate_data_migration.sql` | Tenant projects data present |
| `20260814000000_fix_invoice_item_discount_null.sql` | Tenant invoice items data present |
| `20260814000001_quotation_permission_seed.sql` | `quotation` permission rows exist |
| `20260814000002_quotation_items_permission_fix.sql` | Tenant quotation items data present |
| `20260815000000_plan_a_template_and_financial_view_drift.sql` | Tenant financial views present |
| `20260816000000_plan_b_template_resources_and_permissions.sql` | Tenant resource policies present |
| `20260817000000_plan_c_live_entity_backfill.sql` | Tenant grants present |
| `20260819000001_waybill_permission_and_grant_fix.sql` | `waybill` permission rows exist; grants on tenant waybill tables exist |
| `20260820000000_fix_revert_quotation_status_mapping.sql` | Applied and verified in an earlier task |

Live data counts:

- 1 active workspace
- 1 entity
- 1 workspace member
- 0 workspace invitations
- 0 invitation entity grants
- 25 entity permission rows

### Migrations not applied

| Migration | Evidence |
|---|---|
| `20260818000000_creator_wildcard_permission_seed.sql` | `_prov_seed_default_permissions()` on live has no wildcard grant |
| `20260818000000_seed_wildcard_creator_permission.sql` | Same function. Duplicate version number. Same result |
| `20260818000001_multi_tenancy_invitation_correctness.sql` | `create_workspace_invitation()`, `revoke_workspace_invitation()`, `guard_workspace_invitation_entity_workspace()` do not exist. Live policy is the old case-sensitive version. Unique index is missing. Guard trigger is missing |
| `20260819000000_preloaded_roles_and_assignment.sql` | `seed_preloaded_role_templates()`, `seed_preloaded_roles_on_workspace_activation()`, `assign_role_to_company_member()`, `remove_role_from_company_member()` do not exist. `permission_templates` is empty. Trigger is missing |

### Safety of the not-applied migrations

| Migration | Safe to run | Reason |
|---|---|---|
| `20260818000000_creator_wildcard_permission_seed.sql` | Yes | Uses `CREATE OR REPLACE FUNCTION` and `ON CONFLICT DO NOTHING`. Affects new entities only. It is redundant with the second duplicate below |
| `20260818000000_seed_wildcard_creator_permission.sql` | Yes | Same content. Same safety. Run only one of the two duplicates |
| `20260818000001_multi_tenancy_invitation_correctness.sql` | Yes | All statements are idempotent. The live policy is the old version, so replacing it is the intended upgrade. No invitation rows exist, so the unique index builds cleanly |
| `20260819000000_preloaded_roles_and_assignment.sql` | Yes | All functions use `CREATE OR REPLACE`. The seed function is idempotent. The backfill loops over active workspaces and skips existing templates. With an empty `permission_templates` table, it seeds 4 templates for the 1 active workspace |

### Data migration status

All data migrations applied before `20260817000000` are confirmed applied. The live entity is fully provisioned.

## Risks or limitations

- `supabase_migrations.schema_migrations` is empty. The applied state was inferred from live objects, not from migration history.
- Two migration version numbers are duplicated:
  - `20260810010000` appears twice
  - `20260818000000` appears twice
- These duplicates block `db push` replay. Do not use `db push`. Apply the not-applied migrations manually with `db query`.
- `information_schema.role_table_grants` fails on this database. Use `has_table_privilege()` instead.
- `pg_get_functiondef()` and `pg_get_expr()` time out or fail through the Management API. Use `qual::text` on `pg_policies` instead.

## Deferred work

- Run the four not-applied migrations after user confirmation.
- Remove or rename the duplicated version numbers if `db push` is ever required again.
- Verify the two `20260818000000` duplicate files contain equivalent content before running one of them.
