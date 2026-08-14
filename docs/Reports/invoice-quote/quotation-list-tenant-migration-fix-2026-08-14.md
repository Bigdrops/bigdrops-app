# Quotation List Tenant Migration Fix Report

This report was written by DeepSeek (opencode) on 2026-08-14 via Local Runner.

## Objective

- Make the quotations list adapter read from the tenant schema.
- Match the waybills adapter pattern.
- Keep the change small and isolated to the fetcher.

## Scope

- `src/config/moduleAdapters.ts` quotations adapter fetcher.
- No invoice changes.
- No waybill changes.
- No database changes.
- No PDF changes.
- No save or view changes.

## Files Changed

- `src/config/moduleAdapters.ts` (modified)

## Skills Used

Skills used: supabase, supabase-postgres-best-practices, react-dev

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

- The quotations fetcher now accepts the `ctx` parameter.
- The fetcher now resolves the tenant client through `resolveFetchClient(ctx)`.
- The fetcher falls back to `supabase` when the tenant client is not ready.
- The query targets `quotations` on the resolved client.
- This mirrors the waybills adapter fetcher exactly.

## Verification

- `git diff -- src/config/moduleAdapters.ts`: only the quotations fetcher changed.
- `bun run audit:load`: passed. Existing warnings on `moduleAdapters.ts` are pre-existing. This change adds no `select('*')`.
- `bun run typecheck`: passed.
- `git status`: only `src/config/moduleAdapters.ts` modified by this task.
- `bun run build`: skipped due to hardware policy.

## Risks or Limitations

- The fix requires the caller to supply `ctx.tenantClient` after the tenant cutover.
- Pre-cutover callers without a tenant client fall back to the public schema.
- The list cache key did not change. Cached rows from the public schema may remain until the cache expires. The cache TTL is five minutes.

## Deferred Work

- SASQUO-287 data drift between public and tenant schemas remains. It is outside this task scope.
- A database sync trigger was considered and not created. It is outside this task scope.
