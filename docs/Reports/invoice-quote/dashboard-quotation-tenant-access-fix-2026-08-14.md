# Dashboard Quotation Tenant Access Fix Report

This report was written by DeepSeek (opencode) on 2026-08-14 via Local Runner.

## Objective

- Make the overview dashboard read quotations from the tenant schema.
- Match the classic dashboard variant behavior.
- Keep the change isolated.

## Scope

- `src/hooks/useDashboardData.ts`.
- Overview dashboard variant only.
- No database changes.
- No adapter changes.
- No PDF changes.

## Files Changed

- `src/hooks/useDashboardData.ts` (modified)

## Skills Used

Skills used: supabase, supabase-postgres-best-practices, react-dev

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

- The overview variant read quotations through the global `supabase` client.
- This caused quotations to be read from the public schema.
- The classic variant already read quotations through `tenantClient`.
- The overview variant now reads quotations through `tenantClient`.
- This matches the classic variant and the waybills adapter pattern.
- The `supabase` client remains in use for CSR, RFQ, and financial metrics queries.

## Verification

- `git diff -- src/hooks/useDashboardData.ts`: only the quotation query changed.
- `bun run audit:load`: passed. Existing warnings are pre-existing.
- `bun run typecheck`: passed.
- `git status`: only `src/hooks/useDashboardData.ts` modified. Other pending work is already committed.
- `bun run build`: skipped due to hardware policy.

## Risks or Limitations

- The overview dashboard already depended on `tenantClient` for invoices, waybills, and projects.
- This change makes the quotation query consistent with those.
- The dashboard cache TTL is two minutes. Cached public-schema rows may remain until expiration.

## Deferred Work

- CSR and RFQ queries still use the public schema. They are outside this task scope.