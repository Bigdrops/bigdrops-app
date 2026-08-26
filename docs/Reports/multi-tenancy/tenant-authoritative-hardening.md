# Tenant-Authoritative Hardening Report

This report was written by deepseek-v4-pro on 2026-08-25 via opencode.

## Objective

Remove the remaining public-schema dependencies for entity business and audit data so the next task can purge public business tables safely. Make the app and provisioning tenant-authoritative.

## Scope

Entity `eca34515-0b30-482c-b12e-3963df164322` and its tenant schema `entity_bigdrops-main_main`. App data-access hardening plus one database migration. No public table is purged.

## Files changed

- `src/domain/correspondence/letter/letterRepository.ts` — letter CRUD now takes `TenantClient`.
- `src/hooks/useLetterSave.ts` — threads `tenantClient`.
- `src/pages/Letters.tsx`, `src/pages/LetterFormPage.tsx`, `src/pages/ViewLetter.tsx` — pass `tenantClient` from `useEntity()`.
- `src/hooks/useAuditTrail.ts` — reads `audit_logs` + `activity_events` via `useEntity().tenantClient`.
- `src/pages/Waybills.tsx`, `src/pages/ViewWaybill.tsx` — removed `tenantClient?.isReady ? tenantClient : supabase` fallbacks.
- `src/components/rfq/RfqList.tsx` — pass `tenantClient` to `archiveRfq` / `deleteRfq`.
- `supabase/migrations/20260828000000_tenant_authoritative_hardening.sql` — new migration.

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

Application:

- Letters now read and write only the tenant schema. No `supabase` import remains in the letter pages.
- Audit trail now reads only the tenant schema.
- Waybill archive, delete, and invoice-attach no longer fall back to public.
- RFQ list passes the tenant client to archive/delete services.

Database migration:

- Creates `activity_events` in each tenant schema (cloned from public structure).
- Redirects 23 audit RPCs to the tenant schema. The 21 delegators now call the tenant `record_activity_event`. `record_audit_log` and `record_activity_event` now write the tenant tables. Uses `pg_get_functiondef`, so the installed source is preserved and only the public audit references are swapped.
- Backfills `audit_logs`, `activity_events`, and `letters` from public into each tenant schema, preserving IDs.
- Drops dead code: `run_notification_jobs`, the four notification generators, `log_activity_event`, `validate_waybill_items`, and the `device_sequences` table (public and tenant).
- Restores `provision_entity` steps dropped by `20260827000000`: `_prov_seed_settings` and the per-table `_prov_install_triggers` loop. Adds the missing `_prov_install_financial_views` step.

## Verification result

- `bun run audit:load`: completed (pre-existing bloat/query warnings only; none from these changes).
- `bun run typecheck`: passed.
- `git status`: working tree contains these changes plus unrelated pre-existing modifications.
- `bun run build`: skipped due to hardware policy.
- Database migration: not executed locally. No local Postgres (Docker daemon off). Reviewed for correctness only.

## Risks or limitations

- The migration was not executed against a database. It must be applied and verified in a Supabase environment before the purge task.
- Template-table completeness and `_prov_table_to_resource` extension are deferred. New entities still clone only the original 15 tables; they do not yet receive the newer item-library, tax, and audit helper tables.
- Item-library tenant RPCs (`normalize_item_text`, `get_item_suggestions`, `merge_item_catalog_entries`) and the `item_price_summary_v` view are deferred. Item suggestions remain empty in the tenant until these are installed.
- Offline quotation/CSR sync remains on the public data path; deferred to a future ticket.

## Deferred work

- Extend `_prov_get_template_tables` and `_prov_table_to_resource` to the full 32-table set (verified against a live DB first).
- Author tenant item-library RPCs and `item_price_summary_v`.
- Offline sync tenant-awareness (see `offline-sync-tenant-aware-deferral.md`).
