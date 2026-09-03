# Plan B Template, Resources, and Permissions Report

This report was written by Qwen on 2026-08-16 via Local Runner.

## Objective

Deliver Plan B of the Multi-Tenancy Final Reconciliation Blueprint. Plan B extends the provisioning engine so every newly provisioned entity receives the full 32-table tenant schema with correct permission resources and default owner permissions.

Plan A delivered the 21-table template. Plan B adds the remaining 11 tables. This report covers the migration that completes the template.

## Scope

Plan B covers:

- `_prov_get_template_tables()`: add 11 tables.
- `_prov_table_to_resource()`: map the 11 new tables.
- `_prov_seed_default_permissions()`: seed owner permissions for the new resources.

Plan B does not cover:

- Production entity backfill. Plan C covers this.
- Financial view changes.
- Data copy operations.
- Frontend changes.

## Files changed

- `supabase/migrations/20260816000000_plan_b_template_resources_and_permissions.sql` (new)
- `docs/reports/multi-tenancy/plan-b-template-resources-and-permissions.md` (this report)

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Documentation standard

This report follows ADS-STE100 Simplified Technical English.

## Changes made

### Template tables

The 21 tables from Plan A keep their exact relative order. The 11 new tables are inserted at FK-safe positions so `_prov_readd_foreign_keys()` can re-add every foreign key during provisioning.

Order rules:

- `item_catalog` sits before `quotation_items` and `invoice_items` so their `item_id` foreign keys can be re-added.
- `boq_rows` sits after `boqs`.
- `rfq_items` sits after `rfqs`.
- `tax_input_entries`, `tax_filings`, `tax_reminders` sit after `tax_settings`. `tax_filings` sits before `tax_reminders` so the `linked_filing_id` foreign key can be re-added.
- `item_aliases` and `item_merge_log` sit after `item_catalog`. `item_import_batches` sits before `item_merge_log` so the `batch_id` foreign key can be re-added.
- `audit_logs` and `device_sequences` have no foreign keys. They sit last.

The final 32-table order is:

1. clients
2. settings
3. signatories
4. bank_accounts
5. projects
6. project_documents
7. item_catalog
8. quotations
9. quotation_items
10. invoices
11. invoice_items
12. payments
13. wht_receipts
14. csrs
15. waybills
16. blank_waybill_logs
17. blank_csr_logs
18. tax_settings
19. tax_input_entries
20. tax_filings
21. tax_reminders
22. receipts
23. letters
24. boqs
25. boq_rows
26. rfqs
27. rfq_items
28. item_aliases
29. item_import_batches
30. item_merge_log
31. device_sequences
32. audit_logs

### Resource mapping

The 11 new tables map to permission resources:

- `rfq_items` -> `rfq`
- `boq_rows` -> `boq`
- `item_catalog` -> `item`
- `item_aliases` -> `item`
- `item_import_batches` -> `item`
- `item_merge_log` -> `item`
- `tax_input_entries` -> `tax_setting`
- `tax_filings` -> `tax_setting`
- `tax_reminders` -> `tax_setting`
- `audit_logs` -> `audit`
- `device_sequences` -> `device`

### Default permission seeder

The seeder now grants owner permissions for the new resources:

- `rfq`, `boq`, `item`, `tax_setting`: view, create, edit, delete.
- `audit`, `device`: view only.

Existing resources (`invoice`, `payment`, `receipt`, `setting`, `quotation`) keep all four actions. The seeder stays idempotent via `ON CONFLICT DO NOTHING`.

## Verification

Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: one new migration file and one report (see below)

Audit findings are pre-existing and unrelated to this migration. The migration adds no TypeScript code.

## Risks or limitations

- The migration only affects new entity provisioning. Existing entities need Plan C.
- `audit_logs` and `device_sequences` are seeded with view-only permissions. This follows the blueprint. If those modules later need write access, the seeder must change.

## Deferred work

- Plan C: existing-entity backfill.
- Production entity: run Plan B functions against the live entity after Plan C.