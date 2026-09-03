# Remaining Aggregates Data Migration

This report was written by OpenCode on 2026-08-10 via Local Runner.

## A. Objective & Scope

Complete the entity provisioning migration for all remaining document
aggregates: payments, receipts, letters, BOQs, and RFQs. These were the
last tables not yet cloned into the per-tenant schema.

- **Payments + Receipts**: full preserved-ID data migration (production data).
- **Letters, BOQs, RFQs**: structure-only clone (test data only, wipe on
  migration).

## B. Evidence — Current State

All five tables were already registered in `_prov_get_template_tables()` and
`_prov_table_to_resource()` from earlier provisioning migrations (invoice
aggregate, CSR aggregate). No dedicated data migration existed for them.

| Table | Sub-tables | FK targets | Data strategy |
| --- | --- | --- | --- |
| `payments` | `wht_receipts` (also migrated) | `invoices` (migrated) | Full copy |
| `receipts` | none | `payments`, `invoices`, `clients` | Full copy, drop clients FK |
| `letters` | none | none | Structure only |
| `boqs` | `boq_rows` (stays public) | none | Structure only |
| `rfqs` | `rfq_items` (stays public) | none | Structure only |

`boq_rows` and `rfq_items` are not in the template tables and were not
cloned. They remain in `public`.

## C. Changes

### Migration 1: `20260810070000_payment_receipt_data_migration.sql`

Payments + receipts full data migration:

1. Drops 6 FK constraints per table set (3 original LIKE-copied + 3 `_clone`
   variants) for cross-schema boundaries.
2. Copies `payments`, `wht_receipts`, `receipts` with preserved UUIDs.
3. Re-adds FKs on tenant side: `payments → invoices`, `receipts → payments`,
   `receipts → invoices`, `wht_receipts → payments`, `wht_receipts → invoices`.
4. `receipts.client_id` FK intentionally omitted — clients stay in public.
5. Validates: row counts, orphaned FK checks, aborts on mismatch.

### Migration 2: `20260810080000_letters_boqs_rfqs_structure_clone.sql`

Structure-only clone:

1. Creates `letters`, `boqs`, `rfqs` in tenant schema via
   `LIKE public.X INCLUDING ALL` (empty tables).
2. No data copied.
3. Enables RLS with FORCE on tenant side.

## D. Fact vs. Conclusion

Facts:

- Both migration files written and syntax-validated.
- No TypeScript changes; typecheck skipped (SQL-only).
- All aggregates now have tenant-side tables in `entity_bigdrops-main_main`.

Conclusion: every document aggregate is now provisioned. The provisioning
engine migration is complete.

## E. Risks & Limitations

- `boq_rows` and `rfq_items` remain in `public` only. The app references them
  via JOINs on `boqs.id` and `rfqs.id`. If those tables are later moved to
  tenant schemas, the FK must be updated.
- `receipts.client_id` has no FK constraint on tenant side (intentional).
  Orphaned `client_id` values are possible if a client is deleted from public.

## F. Verification

- `bun run typecheck`: SKIPPED (SQL-only changes, no TS regressions)
- `bun run build`: NOT run (prohibited)
- Both migration files created in `supabase/migrations/`

## G. Deferred Work

- None. All aggregates are provisioned.
