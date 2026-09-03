# Item Library Load Failure Fix Report

This report was written by opencode on 2026-08-30 via Local Runner.

## Objective

Fix the Item Library page failing to load with the generic message "Failed to load item library".

## Scope

Item Library load path: `ItemLibraryPage` → `useItemHistoryList` → `loadSummaryList` → `getItemSummaryList` → `client.from('item_price_summary_v')`.

## Files changed

- `supabase/migrations/20260830020000_item_library_tenant_grants.sql` (new)

No application code was changed. The frontend (`src/modules/item-library/repositories/itemLibraryRepository.ts`) already queries the correct tenant view.

## Skills used

NONE

Documentation standard: ADS-STEAD Simplified Technical English

## Changes made

The Item Library summary query selects from the tenant view `entity_bigdrops-main_main.item_price_summary_v`. This view (and the functions it depends on: `normalize_item_text`, `get_item_suggestions`, `merge_item_catalog_entries`) were installed into tenant schemas by `20260828000001_item_library_tenant_objects.sql`, but the migration never granted them to the application roles. PostgREST executes queries as `authenticated`, which had no SELECT privilege on the view and no EXECUTE privilege on the functions. The result was a permission error during load, surfaced by the UI as "Failed to load item library".

Verified on the live database before the fix: the view and all three functions had zero grants to `authenticated`/`anon`/`service_role`.

The new migration grants `SELECT` on `item_price_summary_v` and `EXECUTE` on the three functions to `anon, authenticated, service_role` for every existing tenant schema (loop over `public.entities`, resolved through `_prov_get_schema_name`). Applied via `supabase db push` and verified.

## Verification result

- `supabase db push`: passed, migration applied.
- Live verification: `item_price_summary_v` grants SELECT to anon, authenticated, service_role; all three functions grant EXECUTE to anon, authenticated, service_role (and PUBLIC).
- Underlying base tables (`item_catalog`, `invoice_items`, `invoices`, `quotation_items`) already had correct grants and RLS policies; the view reads through them.
- `bun run typecheck` / `bun run build`: not applicable (migration-only change, no code touched).

## Risks or limitations

- The migration fixes all currently-provisioned tenant schemas. The helper `public._prov_install_item_library` (used when a NEW entity is provisioned) still does not include these grants. No new tenant is expected for this project (the only entity `bigdrops-main` is already provisioned), so this is not active. If new-tenant provisioning is added later, patch `_prov_install_item_library` to grant the view and functions.

## Deferred work

- Patching `public._prov_install_item_library` for future tenants. Not required for the current single-entity deployment.
