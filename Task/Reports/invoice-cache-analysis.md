# Invoice Cache Analysis

Date: 2026-06-13
Source: `src/pages/Invoices.tsx`, `src/hooks/useInvoiceList.ts`, `src/lib/cache/listCache.ts`

## 1. What caches the invoice list?

The invoice list uses a **dual-layer caching strategy**:

1. **`localStorage` via `src/lib/cache/listCache.ts`** — The primary cache layer. Functions `readListCache`, `writeListCache`, `isListCacheFresh`, and `invalidateListCache` wrap `window.localStorage`. The cache key is `"bd:list:invoices:v1:all"` and the TTL is **5 minutes**.

2. **Native SQLite via `src/lib/native/invoiceCache.ts`** — A secondary fallback cache used when the app is offline on a native Android device. The hook `useInvoiceList` calls `cacheInvoiceList(allRows)` after a successful Supabase fetch, and falls back to `getCachedInvoiceList()` when offline.

There is **no React Query or SWR** involved. The `Invoices.tsx` page itself does not call `useInvoiceList` directly; instead it uses the **Document Query Platform** (`useDocumentQuery("invoices")` from `src/context/DocumentQueryContext.tsx`), which is a custom React context + reducer pattern that delegates fetching to module adapters.

## 2. How is the cache invalidated or refreshed?

- **`invalidateListCache(INVOICE_CACHE_KEY)`** — Explicitly removes the localStorage entry. Called after every mutation that changes invoice data (archive, delete, clone).
- **TTL expiry** — `isListCacheFresh` checks if `Date.now() - fetchedAt < ttlMs` (5 minutes). If stale, a fresh Supabase fetch is triggered.
- **Filter/search changes** — Changing `clientFilter`, `dateFilter`, `search`, or `sortBy` resets the local state and re-fetches from Supabase (or re-filters the cached rows if the cache is fresh).
- **`patchUpdate({ search: state.search })`** — After mutations, the page sometimes triggers a re-fetch by updating the query state, which causes the `DocumentQueryProvider`'s `useEffect` to re-run the adapter's `fetcher`.

## 3. Does the cache persist across page navigation?

Yes. Because the cache lives in `localStorage` (and optionally SQLite on native), it persists:
- Across page navigations within the same browser session.
- Across browser restarts (localStorage is persistent until explicitly cleared or invalidated).
- On native Android, the SQLite cache persists across app restarts.

The `DocumentQueryProvider` re-evaluates on each mount and will serve from cache if fresh, or re-fetch if stale.

## 4. Is there any SQLite involvement in the invoice list?

Yes, but only as an **offline fallback**, not as the primary path:
- `src/lib/native/invoiceCache.ts` provides `cacheInvoiceList` and `getCachedInvoiceList`.
- `useInvoiceList.ts` checks `canUseNativeSqlite()` and `navigator.onLine === false` before falling back to the SQLite cache.
- The online path is a direct Supabase query with `localStorage` caching.

---

## Summary

| Aspect | Invoice List |
|---|---|
| Primary cache | `localStorage` (`listCache.ts`) |
| Offline fallback | Native SQLite (`invoiceCache.ts`) |
| TTL | 5 minutes |
| Invalidation | `invalidateListCache()` after mutations |
| Persistence | Across sessions / app restarts |
| List page pattern | `DocumentQueryProvider` + module adapter (`waybillsAdapter` already exists) |
