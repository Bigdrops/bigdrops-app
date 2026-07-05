# CSR Audit Wiring Fix

This report was written by MiMoCode on 2026-07-05 via Local Runner.

## Objective

Replace `NewCSR.tsx`'s direct Supabase insert with a call to `createCsr()` from `csrService.ts`, so audit calls (`recordCsrCreated`, `recordAuditLog`) execute when a CSR is created via the UI.

## Problem

`NewCSR.tsx:310` performed a raw `supabase.from('csrs').insert()` — bypassing `createCsr()` which contains the audit wiring at `csrService.ts:120-129`. The audit code existed but was dead code from the UI's perspective.

## Fix Applied

**File:** `src/pages/NewCSR.tsx` (lines 307-316)

**Before:**
```typescript
return supabase.from('csrs').insert([csrData]).select('id, csr_number').single()
```

**After:**
```typescript
try {
  const result = await createCsr(csrData)
  return { data: result, error: null }
} catch (err) {
  return { data: null, error: err as any }
}
```

**Why the wrapper:** `createCsr()` throws on error and returns `CreatedCsr` directly, but `withUniqueRetry` expects `{ data: T | null; error: PostgrestError | null }`. The try/catch bridges this contract gap while preserving the uniqueness retry logic.

**What's preserved:**
- `withUniqueRetry` still handles unique constraint violations (error code 23505)
- `createCsr()` handles network retries via its internal `withRetry()` wrapper
- `createCsr()` calls `sanitizeCsrInsertPayload()` internally (already called before the retry loop, so this is a no-op double-sanitize)
- `createCsr()` fires `recordAuditLog()` and `recordCsrCreated()` after successful insert
- Error handling, UX flow, and redirect logic unchanged

## Verification Gate

| Check | Result |
|-------|--------|
| `bun run audit:load` | Passed — no new warnings |
| `bun run typecheck` | Passed — zero errors |
| `git diff` | Only `src/pages/NewCSR.tsx` modified by this task |

## Audit Trail After Fix

When a CSR is now created via the UI:

1. `NewCSR.tsx` → `withUniqueRetry` → `createCsr(csrData)`
2. `createCsr()` inserts into `csrs` table via Supabase
3. On success, `createCsr()` fires:
   - `recordAuditLog()` → writes to `audit_logs` table via `record_audit_log` RPC
   - `recordCsrCreated()` → writes to `activity_events` table via `record_csr_created` RPC

## Deferred Work

1. Offline CSR sync path (`csrSync.ts:186-229`) still does a direct insert without audit — separate fix needed
2. Waybill audit (already wired in `waybillMutations.ts`) may still fail silently due to fire-and-forget pattern — investigate if zero rows persist
3. `database.types.ts` is stale — missing type definitions for `record_csr_created` and `record_waybill_created` RPCs
