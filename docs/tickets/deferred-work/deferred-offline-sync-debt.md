# Deferred Offline Sync Debt — Quotation & CSR

This report was written by deepseek-v4-flash-free on 2026-08-18 via Local Runner.

---

## Objective

Document the current quotation and CSR offline-sync modules. Do not implement or repair offline sync in this pass. Mark the modules as DEFERRED OFFLINE DEBT. The final multi-tenancy cutover must proceed without depending on offline sync.

## Status

DEFERRED — NOT PART OF CURRENT TENANCY CUTOVER.

Reconciled on 2026-08-25 against the final tenancy state. The modules are reachable from `QuotationList.tsx`, `CSR.tsx`, and `src/app/useSyncBootstrap.ts`, but every public-table access is guarded by `canUseAndroidNativeSqlite()`, which is false on the web deployment. The feature is non-functional.

The modules are retained, not deleted. They address tables by string name and import no generated `database.types.ts` types, so they do not affect TypeScript safety after the public purge. This ticket is excluded from the purge dependency graph.

Purge gate record: `docs/Reports/multi-tenancy/public-purge-readiness-gate.md` (verdict: READY FOR PURGE).

## Current Quotation Offline-Sync Implementation

Files: `src/lib/native/quotationOffline.ts`, `src/lib/native/quotationSync.ts`.

Create path (`quotationOffline.ts`):

- `createOfflineQuotationDraft()` (`quotationOffline.ts` line 176) runs only on native Android (`canUseAndroidNativeSqlite()`), only when offline (`navigator.onLine === false`), only inside an allowed offline-access window, and only when a device assignment exists.
- It generates a number `SASQUO-{deviceCode}{seq}` from a counter stored in `app_meta` (`quotation_counter_{deviceCode}`).
- It inserts a draft row into the local SQLite table `quotations_local` with `sync_status = 'pending'`.
- It enqueues a sync item: `queue_key = 'quotation.create'`, payload `{ entity: "quotation", action: "create", localId, quotationNumber }` (lines 274-275).

Sync path (`quotationSync.ts`):

- `processNextPendingQuotationCreate()` (line 329) and `processQuotationCreateQueueItem()` (line 355) read the oldest `quotation.create` queue row where `status = 'pending'` (or by explicit id including `'failed'`).
- They load the local draft, then insert it into the `quotations` table with the raw `supabase` client (public schema) (lines 223-224).
- They then insert the parsed items into `quotation_items` (lines 262-263).
- If item insertion fails, they delete the parent quotation row (line 267) — rollback of the parent only.
- They update the local draft to `sync_status = 'synced' | 'failed'` and the queue row to `status = 'synced' | 'failed'` with an incremented `attempts`.
- Number-conflict errors are detected via `getOfflineNumberConflictMessage()` from `syncErrors.ts`.
- Item rows are converted through `toDbItem()` from `@/domain/invoice` (line 1).

Queue storage (`appStorage.ts`):

- Local SQLite table `sync_queue` with columns: `id`, `queue_key`, `payload`, `status`, `attempts`, `created_at`, `updated_at`.
- The table has no tenant column. Queue items are global to the device, not scoped to a workspace or entity.

## Current CSR Offline-Sync Implementation

Files: `src/lib/native/csrOffline.ts`, `src/lib/native/csrSync.ts`.

Create path (`csrOffline.ts`):

- `createOfflineCsrDraft()` (`csrOffline.ts` line 197) has the same guards as the quotation path: native Android only, offline only, allowed offline-access window, device assignment required.
- It generates a number `SASCSR-{deviceCode}{seq}` from a counter in `app_meta` (`csr_counter_{deviceCode}`).
- It inserts a draft into `csrs_local` with `sync_status = 'pending'`.
- It enqueues `queue_key = 'csr.create'`, payload `{ entity: "csr", action: "create", localId, csrNumber }` (lines 323-324).

Sync path (`csrSync.ts`):

- `processNextPendingCsrCreate()` (line 294) and `processCsrCreateQueueItem()` (line 320) read the oldest `csr.create` queue row.
- They load the local draft and insert it into the `csrs` table with the raw `supabase` client (public schema) (lines 187-188).
- There is no child-items table; the CSR is a single-row insert.
- They update the local draft and queue row statuses, same as the quotation path.
- Number-conflict errors use `getOfflineNumberConflictMessage()`.

## Invocation Points

Create (enqueue):

- `src/hooks/useQuotationSave.ts` line 219: calls `createOfflineQuotationDraft()` when offline.
- `src/pages/CsrFormPage.tsx` line 383: calls `createOfflineCsrDraft()`.
- Number preview: `src/pages/QuotationFormPage.tsx` line 186, `src/pages/CsrFormPage.tsx` line 99.

Sync (process):

- `src/app/useSyncBootstrap.ts` lines 75-76 and 110-111: `runSyncBootstrap()` calls `processNextPendingCsrCreate()` then `processNextPendingQuotationCreate()`.
- `src/App.tsx` line 464: `runSyncBootstrap('app bootstrap')` inside `init()`.
- `useSyncBootstrap.ts` lines 142-178: `runSyncBootstrap` is also called on document visibility change and on the browser `online` event.
- Manual retry: `src/pages/CSR.tsx` lines 98 and 204; `src/components/quotation/QuotationList.tsx` lines 75 and 153.

## Why the Bootstrap/Context Architecture Is Unsuitable

The app bootstrap flushes the sync queue before tenant context exists:

- `App.tsx` line 464 runs `runSyncBootstrap('app bootstrap')` inside `init()`. The `WorkspaceProvider`/`EntityProvider` tree mounts later (lines 576-577).
- At bootstrap time no tenant schema is resolved. `tenantClient.isReady` is `false` and its `from()`/`rpc()` throw (see `src/lib/tenantClient.ts` lines 12-23).

The sync modules bypass the tenant layer entirely:

- Both `quotationSync.ts` and `csrSync.ts` import the raw `supabase` client (`../../supabase`) and write to public-schema tables. They never use `tenantClient`.
- The queue payload stores `entity` as a document-type label (`"quotation"`, `"csr"`), not tenant identity. No `workspace_id`, `entity_id`, or schema name is persisted.
- The `sync_queue` table has no tenant column.

Consequence: queued operations cannot be replayed into the correct tenant schema. The architecture has no reliable tenant-scoped offline synchronization.

## Current Public-Schema Dependencies

The following calls write entity-scoped business data directly to public schema:

- `src/lib/native/quotationSync.ts` line 223: `supabase.from("quotations").insert(...)`.
- `src/lib/native/quotationSync.ts` line 262: `supabase.from("quotation_items").insert(...)`.
- `src/lib/native/quotationSync.ts` line 267: `supabase.from("quotations").delete().eq("id", ...)`.
- `src/lib/native/csrSync.ts` line 187: `supabase.from("csrs").insert(...)`.

These are the only public business-table accesses remaining outside the deferred modules. They must be excluded from the cutover scope. They are DEFERRED OFFLINE DEBT.

## Tenant Identity That Must Be Persisted With Queued Operations

A future queue item must store, per queued operation:

- `workspace_id`.
- `entity_id` (business identity).
- `schema_name` (resolved tenant schema).
- `user_id` and device identity.
- The document-type label (existing `entity` field) as a separate field.

## Requirements for a Future Proper Offline Architecture

- Queue items must be scoped to tenant context (workspace, entity, schema).
- Sync must use the `tenantClient` schema-aware client. It must never write entity-scoped business data to public schema.
- The sync flush must run after tenant context resolves, not during app bootstrap.
- Document numbers must be generated per tenant to avoid cross-tenant collisions.
- Device assignment must be validated against the active tenant.

## Required Handling of Offline Operations

- Create: insert local draft with a stable local id and a queue item. Sync on reconnect or manual retry.
- Update: queue update operations with the remote record id and changed fields.
- Delete: queue delete operations with the remote record id.
- Retry: track `attempts`, add backoff, and allow manual retry of failed items. Existing code stores `attempts` but has no backoff or cap.
- Ordering: preserve creation order within a tenant. Existing code orders by `created_at`, `id` but only inside a single module.
- Conflict resolution: handle unique-number conflicts. Existing `getOfflineNumberConflictMessage()` detects them; a future flow must resolve them (reject, renumber, or merge).
- Rollback: on child-item failure, delete the created parent (existing pattern) and expose any partial writes.
- Authentication: persist the session identity at enqueue time and re-validate at flush time.
- Tenant switching: scope the queue per tenant and do not flush one tenant's items into another tenant.
- Migration and versioning of queued records when the local queue schema changes.
- Explicit online/offline state handling surfaced to the user.
- End-to-end tests of the tenant-aware sync path before reactivation.

## Reactivation Criteria

Re-enable offline sync only after the tenant-aware architecture above is implemented and verified end to end. Until then, offline sync must not write to any business table.

## DEFERRED OFFLINE DEBT

The modules above are unreachable or non-functional in the current production application:

- They write to public-schema business tables that are now entity-scoped.
- The bootstrap flush runs before tenant context is available.
- No implementation work or repair is allowed in this pass.

## Files Changed

- `docs/tickets/Deferred-Work/deferred-offline-sync-debt.md` (this document).

## Skills Used

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Verification

- Code read and verified: `quotationOffline.ts`, `quotationSync.ts`, `csrOffline.ts`, `csrSync.ts`, `appStorage.ts`, `useSyncBootstrap.ts`, `App.tsx`, `tenantClient.ts`, `CSR.tsx`, `QuotationList.tsx`, `useQuotationSave.ts`, `CsrFormPage.tsx`, `QuotationFormPage.tsx`.
- No offline-sync code was modified.
- `bun run audit:load`: not run (no code changes).
- `bun run typecheck`: not run (no code changes).

## Risks or Limitations

- The exact public-schema line numbers refer to the current source. Future edits may shift them.
- `quotationSync.ts` items insert is not transactionally protected with the parent insert; a parent orphan on failure is mitigated by the delete rollback, but the window is not atomic.
- Sync attempts have no cap or backoff; a failing item retries every flush.

## Deferred Work

- Rebuild offline sync on the tenant-aware architecture described above.
- Move queued operations into tenant-scoped storage.
- Re-enable sync flush after tenant context resolves.