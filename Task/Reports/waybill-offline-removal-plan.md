# Waybill Offline Removal Plan

Date: 2026-06-13
Based on: `Task/reports/invoice-cache-analysis.md`

## Objective
Scrap the local SQLite offline waybill system entirely and replace it with the same caching pattern used by the Invoice module. All waybill saves go directly to Supabase. The waybill list uses `localStorage` caching via the existing `waybillsAdapter`.

---

## What Exists Today (to be removed)

| File / Module | What to remove |
|---|---|
| `src/lib/native/waybillOffline.ts` | Entire file — CREATE TABLE, `createOfflineWaybillDraft`, `peekNextOfflineWaybillNumber`, bootstrap logic |
| `src/lib/native/waybillSync.ts` | Entire file — sync queue processing, `processWaybillCreateQueueItem`, `listPendingOrFailedWaybillCreateQueueItems` |
| `src/app/useSyncBootstrap.ts` | Remove `waybillSyncModulePromise` import and waybill sync bootstrap logic |
| `src/components/waybill/WaybillForm.tsx` | Any `isOffline` prop handling, offline save branching |
| `src/domain/waybill/waybillMutations.ts` | Remove `createOfflineWaybillDraft` import, remove offline branch (`isOffline: true` path) |
| `src/pages/NewWaybill.tsx` | Remove any `isOffline` flag passing |
| `src/pages/Waybills.tsx` | Remove sync queue UI, `processWaybillCreateQueueItem` calls, `listPendingOrFailedWaybillCreateQueueItems` calls, `showWaybillSyncRecovery` block |
| `src/lib/native/sqlite.ts` (if waybill-only) | Remove if nothing else uses it |

---

## Step-by-Step Execution Plan

### 1. Remove `waybillOffline.ts`
- Delete the file.
- Remove any imports of `createOfflineWaybillDraft`, `OfflineWaybillStatus`, etc.

### 2. Remove `waybillSync.ts`
- Delete the file.
- Remove any imports of `processWaybillCreateQueueItem`, `listPendingOrFailedWaybillCreateQueueItems`, `WaybillCreateQueueItem`.

### 3. Update `useSyncBootstrap.ts`
- Remove the `waybillSyncModulePromise` dynamic import.
- Remove the `waybillSyncingRef` and associated one-shot sync effect for waybills.

### 4. Update `waybillMutations.ts`
- Remove `import { createOfflineWaybillDraft, type OfflineWaybillStatus } from '@/lib/native/waybillOffline'`.
- Remove the entire `if (isOffline) { ... }` branch.
- The `saveWaybill` function now always goes to Supabase directly.
- Remove `isOffline` from the params type if it was only used for the offline branch.

### 5. Update `NewWaybill.tsx`
- Remove `isOffline: false` from the `saveWaybill` call (or set it to always be online).
- If `NewWaybill.tsx` imports anything from `waybillOffline.ts`, remove it.

### 6. Update `Waybills.tsx`
- Remove imports: `canUseNativeSqlite`, `listPendingOrFailedWaybillCreateQueueItems`, `processWaybillCreateQueueItem`, `WaybillCreateQueueItem`.
- Remove state: `syncQueueItems`, `syncQueueLoading`, `retryingQueueItemId`, `showWaybillSyncRecovery`.
- Remove `loadWaybillSyncQueue` function and its `useEffect`.
- Remove `handleRetryQueueItem` function.
- Remove the entire `beforeListContent` block that renders the "Offline sync recovery" UI.
- Simplify `Waybills.tsx` to match the Invoice list pattern (it already uses `useDocumentQuery("waybills")`).

### 7. Verify Caching Works
- The `waybillsAdapter` in `src/config/moduleAdapters.ts` already has:
  - `cacheKey: "bd:list:waybills:v1:all"`
  - `cacheTtlMs: 5 * 60 * 1000`
  - `readListCache` / `writeListCache` / `isListCacheFresh` usage
  - `invalidateListCache` is called manually after archive/delete via `patchUpdate`
- Confirm the adapter's `fetcher` correctly handles all query states.

### 8. Run `bun run typecheck`
- Fix any remaining import errors from removed modules.
- Ensure no references to deleted files remain.

### 9. Commit and Push
```
git add -A && git commit -m "refactor: remove offline waybill system, use invoice-style caching" && git push origin main
```

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Other modules import deleted waybill offline files | Low | Grep for all imports before deletion |
| Sync queue tables left orphaned in DB | Low | DB cleanup can be a separate task |
| Users with existing offline waybills lose data | Medium | Offline waybills were never synced to remote; this is expected |
| `useSyncBootstrap.ts` breaks other modules | Low | Only remove waybill-specific lines |

---

## Verification Checklist

- [ ] `waybillOffline.ts` deleted
- [ ] `waybillSync.ts` deleted
- [ ] `waybillMutations.ts` has no offline branch
- [ ] `Waybills.tsx` has no sync queue UI or logic
- [ ] `useSyncBootstrap.ts` has no waybill sync code
- [ ] `bun run typecheck` passes with zero errors
- [ ] Manual test: create waybill → appears in list → archive/delete works → list refreshes
