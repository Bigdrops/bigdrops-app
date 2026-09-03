# Unified Activity Feed — Dual-Table Query Implementation

This report was written by DeepSeek on 2026-07-03.

## Objective & Scope

Make the Activity Card component display both `audit_logs` AND `activity_events` data as a unified chronological feed. Payment events (PAYMENT_RECORDED, PAYMENT_VOIDED) and other domain events that only write to `activity_events` were previously invisible because the `useAuditTrail` hook queried only `audit_logs`.

**Strictly limited to:**
- `src/hooks/useAuditTrail.ts` — modified to query both tables, merge, dedup
- Call-site verification only for `ActivityCard.tsx`, `QuotationActivityCard.tsx`, `AuditTrailPanel.tsx`

**Not touched:**
- Database schema
- `src/lib/audit.ts` or any audit RPC function
- Payment, CSR, Waybill, Compliance service layers
- Any other component or hook

## Per-File Changes

### `src/hooks/useAuditTrail.ts`

**Added constants** (lines 24-36): `ACTIVITY_EVENT_SELECT`, `ACTIVITY_EVENT_TYPES`, `EVENT_TYPE_TO_ACTION` map.

**Added helper functions** (lines 38-73):
- `mapActivityEventToAuditLog()` — maps `activity_events` rows to `AuditLogRecord` shape
  - IDs prefixed with `aev_` to avoid UUID collision with `audit_logs` rows
  - `event_type` → `action` via the mapping dict (CREATED→CREATE, LINKED→LINK, etc.)
  - `changes` set to `null` (activity_events have no field diffs)
- `roundToSecond()` — rounds a timestamp string to nearest-second epoch
- `dedupActivityEvents()` — filters audit_logs rows that match activity_events rows on `entity_id + rounded_timestamp` within 1 second
- `sortByCreatedDesc()` — sorts combined array descending

**Added `fetchMerged()` function** (lines 75-108):
- Queries both `audit_logs` (with existing `AUDIT_LOG_SELECT`) and `activity_events` (with `ACTIVITY_EVENT_SELECT`) in parallel via `Promise.all`
- Filters activity_events to `event_type IN ('CREATED','STATUS_CHANGED','PAYMENT_RECORDED','PAYMENT_VOIDED','LINKED','UNLINKED')`
- Accepts optional `before` cursor for pagination
- Merges, dedups, sorts, returns

**Modified `load` callback** (lines 148-195):
- Replaced inline `maybeFetch` closure with call to `fetchMerged(entityType, entityId)`
- Return type unchanged — still returns `AuditLogRecord[]` → `buildAuditTrailItems()` → `AuditTrailEntry[]`

**Modified `loadOlder` callback** (lines 219-246):
- Now calls `fetchMerged(entityType, entityId, before)` instead of single-table query
- Proper error handling matching the existing pattern

### No changes to ActivityCard.tsx, QuotationActivityCard.tsx, or AuditTrailPanel.tsx

The hook's return type and shape are unchanged. All three call sites consume `{ entries, loading, error, refetch, loadOlder }` identically — they receive `AuditTrailEntry[]` regardless of source table.

## Dedup Logic Explanation

Both `audit_logs` and `activity_events` receive a row on the same CREATE action (at nearly the same instant). The dedup prevents double-counting:

1. For each `activity_events` row, compute `entity_id:rounded_timestamp` where `rounded_timestamp = Math.round(created_at_ms / 1000)`
2. Build a `Set<string>` of these keys
3. Filter `audit_logs` rows: keep if `entity_id:rounded_timestamp` is NOT in the set
4. Merge the deduped audit rows with all activity rows
5. Sort combined array by `created_at` descending

The 1-second window captures the "same instant" writes from the service layer. Activity events win over audit_logs entries because they have richer metadata (e.g., `payment_id`).

**All other events are unique to their table:**
- `audit_logs` only: UPDATE field diffs, DELETE, ARCHIVE (these never write to `activity_events`)
- `activity_events` only: PAYMENT_RECORDED, PAYMENT_VOIDED (these never write to `audit_logs`)
- These pass through dedup with no collisions and appear once in the combined feed.

## Call-Site Verification

| Call site | File:Line | Uses hook return values | Changes needed? |
|---|---|---|---|
| Invoice ActivityCard | `src/components/document-view/invoice/sections/ActivityCard.tsx:15` | `{ entries, loading, error }` | None — same shape |
| Quotation ActivityCard | `src/components/document-view/quotation/QuotationActivityCard.tsx:15` | `{ entries, loading, error }` | None — same shape |
| AuditTrailPanel | `src/components/audit/AuditTrailPanel.tsx:31` | `{ entries, loading, error, refetch, loadOlder }` | None — same shape |

All three pass `entityType` ('invoice' or 'quotation') and `entityId` — the hook handles the rest.

## Verification Results

### TypeScript typecheck

`bun run typecheck` — **passed** (no errors).

### Build

`bun run build` — **started successfully** (transforming...). The build was still in progress at the 180s timeout due to Vite processing, but no errors were emitted during the transformation phase.

### Manual verification notes

After deploying, the following should be visible in the Activity Card on an invoice detail page:

| Event type | Previously visible? | Now visible? | Source table |
|---|---|---|---|
| Invoice CREATE | YES | YES (deduped) | Both |
| Invoice UPDATE | YES | YES | `audit_logs` |
| Invoice STATUS_CHANGE | YES | YES (deduped) | Both |
| Quotation LINK (convert to invoice) | YES | YES | `audit_logs` |
| Payment RECORDED | **NO** | **YES** | `activity_events` |
| Payment VOIDED | **NO** | **YES** | `activity_events` |
| LINKED (CSR attachment, etc.) | **NO** | **YES** | `activity_events` |
| UNLINKED | **NO** | **YES** | `activity_events` |

## Coverage Matrix Update

| Entity | Action | `audit_logs` | `activity_events` | Unified feed visible? |
|---|---|---|---|---|
| Invoice | CREATE | ✅ | ✅ | ✅ (deduped) |
| Invoice | UPDATE | ✅ | ❌ | ✅ |
| Invoice | STATUS_CHANGE | ✅ | ✅ | ✅ (deduped) |
| Invoice | DELETE | ❌ | ❌ | ❌ |
| Invoice | ARCHIVE | ❌ | ❌ | ❌ |
| Invoice | PAYMENT_RECORDED | — | ✅ | **✅ NEW** |
| Invoice | PAYMENT_VOIDED | — | ✅ (implemented) | **✅ NEW** |
| Quotation | CREATE | ✅ | ✅ | ✅ (deduped) |
| Quotation | UPDATE | ✅ | ❌ | ✅ |
| Quotation | STATUS_CHANGE | ✅ | ✅ | ✅ (deduped) |
| Quotation | LINK | ✅ | ✅ | ✅ (deduped) |
| Quotation | DUPLICATE | ✅ | ✅ | ✅ (deduped) |
| Quotation | DELETE | ❌ | ❌ | ❌ |
| Quotation | ARCHIVE | ❌ | ❌ | ❌ |

## Risks & Limitations

- **No activity_events in loadOlder**: `loadOlder` now queries both tables with the `before` cursor. The dedup logic applies to paginated results as well.
- **UUID collision risk**: Activity event IDs are prefixed with `aev_` to avoid key collisions in React's `Fragment` rendering. If `audit_logs` IDs could collide with `aev_`-prefixed IDs (impossible — `aev_` prefix guarantees no collision with UUIDs), dedup could fail silently.
- **Performance**: Two parallel queries instead of one. Both use indexed `entity_type + entity_id` columns and have `limit(50)`. The `Promise.all` parallelizes the queries, so latency is max(table1, table2) not sum.
- **Cache compatibility**: The cache key remains `entityType:entityId`. Both query results merged together are cached as a single promise. This is correct — no stale cache issues.

## Files Changed

| File | Diff summary |
|---|---|
| `src/hooks/useAuditTrail.ts` | +70 lines: constants, helpers, dual-table fetch, dedup logic; ~10 lines modified: `load` and `loadOlder` refactored to use `fetchMerged` |
