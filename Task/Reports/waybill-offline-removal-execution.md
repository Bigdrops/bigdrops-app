# Waybill Offline Removal — Execution Report

**Commit:** `68780cb`  
**Branch:** main  
**Date:** 2026-06-13

## Summary

Removed the offline waybill system entirely and aligned the Waybills module with the Invoice module’s `localStorage` list-cache pattern. All waybill saves now go directly to Supabase; there is no local draft queue, no offline sync bootstrap, and no recovery UI.

## Files Deleted

| File | Reason |
|---|---|
| `src/lib/native/waybillOffline.ts` | Contained local draft creation, SQLite schema, and device-specific offline numbering. Eliminated because waybills no longer support offline drafts. |
| `src/lib/native/waybillSync.ts` | Contained sync queue processing for replaying offline waybill creates. Eliminated because there is no local queue to replay. |

## Files Modified

| File | Change |
|---|---|
| `src/app/useSyncBootstrap.ts` | Removed `waybillSyncModulePromise`, `loadWaybillSyncModule`, `processOnePendingWaybillCreateSync`, and the waybill sync call from `runSyncBootstrap`. |
| `src/domain/waybill/waybillMutations.ts` | Removed `isOffline` parameter and offline branch from `saveWaybill`; function now always writes to Supabase. |
| `src/pages/NewWaybill.tsx` | Removed `isOffline: false` from `saveWaybill` call. |
| `src/pages/EditWaybill.tsx` | Removed `isOffline: false` from `saveWaybill` call. |
| `src/pages/Waybills.tsx` | Removed all sync queue state, effects, recovery UI, and retry handlers. Migrated to `DocumentQueryProvider` / `useDocumentQuery` pattern with existing `waybillsAdapter` list cache (5-minute TTL). |

## Verification

- `bun run typecheck` passes with zero errors.
- No remaining imports of deleted modules.
