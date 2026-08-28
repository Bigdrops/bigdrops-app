# Compliance Hub WHT Receipts Permission Fix Report

This report was written by opencode on 2026-08-30 via Local Runner.

## Objective

Fix the Compliance Hub failing to load with the error "permission denied for table wht_receipts".

## Scope

Compliance Hub WHT Receipts panel and the tenant table `entity_bigdrops-main_main.wht_receipts`.

## Files changed

- `supabase/migrations/20260830010000_wht_receipts_tenant_grant.sql` (new)

No application code was changed. The frontend (`src/modules/compliance/repositories/complianceRepository.ts`, `src/pages/ComplianceHub.tsx`) already queries the correct tenant table via `tenantClient.from('wht_receipts')`.

## Skills used

NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

The tenant table `entity_bigdrops-main_main.wht_receipts` had FORCE ROW LEVEL SECURITY enabled and RLS policies (`wht_receipts_select` to `public`, and insert/update/delete to `authenticated`), but it had no table GRANT for the `authenticated`, `anon`, or `service_role` roles. PostgREST executes authenticated requests as the `authenticated` role. Without the SELECT privilege, Postgres returned "permission denied for table wht_receipts".

Siblings (`payments`, `receipts`, `tax_filings`, etc.) received the grant during provisioning; `wht_receipts` was missed.

The migration grants `SELECT, INSERT, UPDATE, DELETE` on the tenant table to `anon, authenticated, service_role`, matching the sibling pattern. Applied via `supabase db push`. No PostgREST schema reload was required (grants take effect immediately).

## Verification result

- `supabase db push`: passed, migration applied.
- Live grant check: `entity_bigdrops-main_main.wht_receipts` now grants SELECT/INSERT/UPDATE/DELETE to anon, authenticated, service_role.
- RLS policies confirmed present before and after the change.
- `bun run typecheck` / `bun run build`: not applicable (migration-only change, no code touched).

## Risks or limitations

- The public table `public.wht_receipts` is still present on the hosted database. If the `20260830000000_public_business_schema_purge.sql` migration is not yet applied in the hosted environment, the public table remains. It is not queried by the frontend and does not affect this fix.

## Deferred work

- None.
