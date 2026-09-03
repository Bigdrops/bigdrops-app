# Plan A Template and Financial-View Drift Migration Report

This report was written by deepseek-v4-flash-free on 2026-08-15 via opencode.

## Objective

Execute Plan A of the Final Reconciliation Blueprint. Plan A fixes three provisioning root causes:

1. Template drift. The live template list has 19 tables. The tenant schema contains `project_documents` and `quotation_items`, but the provisioning engine template does not include them. A new entity provisioned today would not receive either table.
2. Financial-view drift. The engine installs only `invoice_financials_v`. The tenant schema contains `project_financials_v` only because the projects aggregate data migration created it directly. A new entity would not receive `project_financials_v`.
3. Live-entity repair. The production entity `entity_bigdrops-main_main` has two defects on its tenant `project_documents` table: wrong RLS resource and missing table grants.

## Scope

- Redefine the provisioning template to 21 tables.
- Redefine the table-to-resource mapping for `project_documents`.
- Redefine the financial-view installer to include `project_financials_v`.
- Repair the production entity `entity_bigdrops-main_main` in a guarded, idempotent block.
- Do not change any financial formula.
- Do not touch `_prov_seed_default_permissions`. That work belongs to Plan B.
- Do not add `item_catalog` to the template. That work belongs to Plan B.

## Files changed

- `supabase/migrations/20260815000000_plan_a_template_and_financial_view_drift.sql` (new)
- `docs/reports/multi-tenancy/plan-a-template-and-financial-view-drift.md` (new)

## Skills used

NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

### Template tables

Redefined `public._prov_get_template_tables()` to return 21 tables. Order places `project_documents` after `projects` (FK to projects) and `quotation_items` after `quotations` (FK to quotations). The FK from `quotation_items` to `item_catalog` is skipped until Plan B adds `item_catalog` to the template. `_prov_readd_foreign_keys` only re-adds FKs whose referenced table exists in the target schema.

### Resource mapping

Redefined `public._prov_table_to_resource()` to add `project_documents` -> `project_document`. This matches the permission model in the blueprint, section 5. `quotation_items` already maps to `quotation` via migration `20260814000002`.

### Financial-view installer

Redefined `public._prov_install_financial_views(p_schema_name)` to create both views:

- `invoice_financials_v`. Body is byte-identical to the live definition from migration `20260809060000`, including the `invoice_persisted_status` call and the three `%I` format placeholders.
- `project_financials_v`. Body is byte-identical to the body installed for the production entity by migration `20260811000000`, including the four `%I` format placeholders.

Each view is dropped if stale, then recreated.

### Production repair

Added a guarded `DO` block that:

1. Resolves the entity id from the schema name through `public.entities` and `public.workspaces`. No hardcoded UUID.
2. Checks for wrongly-resourced policies on tenant `project_documents`. The check matches `pg_get_expr(pol.polqual, pol.polrelid)` against the literal `'project_documents'`.
3. If wrong policies exist, drops all policies on the table, reinstalls RLS with resource `project_document`, and grants `SELECT, INSERT, UPDATE, DELETE` to `authenticated`.
4. If the policies already use the correct resource, skips the reinstall. The grant runs in both cases.
5. Reinstalls the tenant financial views through the redefined installer if `invoices` exists.

The repair targets the exact defect. Migration `20260811000000` called `_prov_install_rls` with `_prov_table_to_resource('project_documents')`, which fell through the ELSE branch and produced resource `project_documents`. That migration also never granted table privileges to `authenticated`. Both defects are covered.

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: two untracked files (`final-reconciliation-blueprint.md`, `20260815000000_plan_a_template_and_financial_view_drift.sql`); working tree otherwise clean
- `bun run build`: skipped due to hardware policy
- `invoice_financials_v` body: byte-exact against `20260809060000`
- `project_financials_v` body: byte-exact against `20260811000000`, lines 108 to 130
- `%I` placeholder counts: 3 for `invoice_financials_v`, 4 for `project_financials_v`; argument lists match
- Dollar-quote markers balanced: three `$function$`, two `$fmt$`, one `$do$`
- `_prov_readd_foreign_keys` semantics confirmed from `20260717000000`, lines 260 to 305
- Blueprint section 5 permission plan confirmed verbatim before writing the resource map

## Risks or limitations

- The schema name `entity_bigdrops-main_main` is hardcoded in the repair block. This is the confirmed production entity and matches the convention used by migrations `20260811000000` and `20260814000002`.
- The RLS resource check depends on the policy expression string containing the literal `'project_documents'`. If `_prov_install_rls` output format changes, the check could miss the defect. The check is conservative: a missed match only skips the reinstall, it does not corrupt data.
- The migration is human-executed. OpenCode cannot run production SQL. The operator must run the migration and verify with the runtime smoke tests in the blueprint.
- `_prov_install_rls` signature is used with four arguments (schema, table, entity id, resource). This matches the call in migration `20260811000000`. The function body itself was not re-read in full during this pass.

## Deferred work

- Plan B: extend the template with the remaining never-templated tables (`boq_rows`, `rfq_items`, `item_catalog`, `item_aliases`, `item_import_batches`, `item_merge_log`, `device_sequences`, `audit_logs`, and the tax tables), extend resource mappings, and extend `_prov_seed_default_permissions`.
- Plan B: seed `entity_permissions` rows for the new resources.
- Plan C: copy rows for the deferred tables from `public` to the tenant schema.
- Plan D: validate all data and permissions.
- Plan E: verify and then drop the quarantine schema.
- Plan F: fix frontend fallbacks that depend on the corrected RLS.
- Plan G: drop the stray schema.
- Operator post-run: `SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>')` where required.
