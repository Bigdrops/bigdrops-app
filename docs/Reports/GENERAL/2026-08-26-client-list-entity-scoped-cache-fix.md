# Client List Entity-Scoped Cache Fix Report

This report was written by GLM on 2026-08-26 via OpenCode.

## Objective

Make the Client List localStorage cache safe and correct without changing the tenant data architecture.

The confirmed bug: AddClient inserted a client and navigated to /clients. Clients.tsx served a fresh non-empty cache from the fixed key `bd:list:clients:v1:all`. The new client did not appear until app restart or TTL expiry. The key also lacked entity identity, so entities could read each other's cached rows.

## Scope

- Client List cache identity.
- Client creation invalidation.
- No database, schema, RLS, permissions, provisioning, or tenantClient routing changes.

## Files changed

- `src/lib/cache/listCache.ts` — added `clientListCacheKey(schemaName)`.
- `src/pages/Clients.tsx` — entity-scoped cache reads and writes.
- `src/pages/AddClient.tsx` — invalidation after successful insert.
- `src/components/pdf-new/industryAdapter.ts` — added optional `attention` field to the `client` member of `CommercialDocumentData` (follow-up).

## Skills used

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

### Cache-key strategy

The fixed key `bd:list:clients:v1:all` was replaced by `bd:list:clients:v1:<schemaName>`. The key builder lives in `listCache.ts`:

```ts
clientListCacheKey(schemaName) => `bd:list:clients:v1:${schemaName}`
```

`schemaName` is the established stable tenant identity from `useEntity()`. It is `null` until provisioning status is `'ready'`, so it cannot act as an ambiguous identity.

### Client List read/write

In `Clients.tsx` the fetch effect now computes its key per run:

- The effect returns early when `schemaName` is unknown. No cache read or write happens before the active entity identity exists.
- Reads use the current entity's key. Writes use the same key in both the fetch path and the delete path.
- The effect depends on `tenantClient.schemaName`, so an entity switch re-runs the effect against the new entity's key. The cleanup guard prevents late writes from the previous entity's in-flight fetch into component state; that fetch still writes to its own entity's key, which preserves correct isolation.

### Invalidation after client creation

In `AddClient.tsx`, after a successful insert:

```ts
feedback.success('Client created')
if (schemaName) invalidateListCache(clientListCacheKey(schemaName))
navigate('/clients')
```

The sequence follows the required flow. Insert succeeds, then the current entity's client-list key is removed, then navigation happens. Client List finds no valid entry and refetches through `tenantClient`.

No global invalidation runs. Other resources keep their keys intact. The 10-minute TTL and all other cache semantics stay unchanged. Filters, search, category behavior, and ordering are untouched.

## Scenario verification (static reasoning)

1. Create client in Entity A: invalidation removes A's key; navigation triggers a tenantClient refetch; the new client appears.
2. Cache remains useful: a fresh non-empty A cache still renders immediately with no forced fetch.
3. Entity switch: each effect run binds to one `schemaName`; B never reads A's key; no-cache states fetch directly.
4. Entity with no cache: tenantClient queries Entity C; results are stored under C's key.
5. Create with no prior cache: invalidation of a missing key is a harmless removal; the later fetch populates A's key.
6. Existing filters: no filter, search, or ordering code changed.

## Verification result

Bun is available. Commands ran with Bun.

Verification:
- bun run audit:load: passed
- bun run typecheck: passed (after follow-up type fix)
- git status: contains intended changes only
- bun run build: skipped due to hardware policy

Typecheck detail: the initial run reported one error in `src/components/pdf-new/industryAdapter.ts(379,11)`. A stash-and-retest cycle reproduced it identically on HEAD, which proved the error predated this fix. The project lead then requested its removal. Root cause: `CommercialDocumentData['client']` lacked the `attention` property that `adaptCommercialDocumentData` writes and `engine/party.ts` renders as an "ATTN:" line. The fix adds `attention?: string | null` to that type member, matching the optional shape in `types.ts`. No runtime behavior changed.

Diff inspection findings:
- tenantClient usage: unchanged
- client schema: unchanged
- public Supabase fallback: none introduced
- global cache invalidation: none introduced
- unrelated refactors: none

## Risks or limitations

- Stale legacy entries under the old fixed key remain in user storage. They are never read again and expire by staleness. Cleanup was out of scope.
- Other flows that mutate clients (for example edit pages) do not invalidate the cache. Creation invalidation was the confirmed scope of this task.

## Deferred work

- Apply the same entity-scoped pattern to other module list caches when their stale-cache behavior gets confirmed.
- Optionally prune orphaned `bd:list:clients:v1:all` keys during a future maintenance pass.
