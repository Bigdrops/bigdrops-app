# CSR & Waybill Audit Trail Trace Report

This report was written by MiMoCode on 2026-07-05 via Local Runner.

## Objective

Trace the exact execution path when a user creates a CSR and when a user creates a Waybill via the UI. Identify where audit functions are called, verify whether they actually execute, and explain why zero audit rows appear despite audit code existing in HEAD.

## Scope

Read-only code tracing. No modifications made.

---

## 1. Audit Architecture Overview

Two distinct audit systems exist in this codebase:

| System | Table | Function | Insert Condition |
|--------|-------|----------|-----------------|
| `recordAuditLog()` | `audit_logs` | `record_audit_log` RPC | Requires non-empty diff between old/new data |
| `recordCsrCreated()` / `recordWaybillCreated()` | `activity_events` | `record_csr_created` / `record_waybill_created` RPCs | Always inserts (with dedup window) |

Both systems write via PostgreSQL RPC functions called through `supabase.rpc()`.

---

## 2. CSR Creation Flow — FULL TRACE

### 2.1 UI Entry Point

**File:** `src/pages/NewCSR.tsx:253` — `handleSave` function

```
User clicks Save → handleSave() → validation → build csrData → withUniqueRetry() → supabase insert
```

### 2.2 Call Chain (line by line)

1. **`handleSave`** (`NewCSR.tsx:253`)
   - Validates CSR number is populated (line 254)
   - Validates client is selected for non-field CSRs (line 261)
   - Validates project assignment (line 266)
   - Builds `csrData` via `sanitizeCsrInsertPayload()` (line 277)

2. **Offline branch** (`NewCSR.tsx:286-303`): If `canUseOfflineCsrDrafts()` is true, calls `createOfflineCsrDraft()` — **NO audit calls** in this path.

3. **Online branch** (`NewCSR.tsx:306-321`):
   ```typescript
   const { data: savedCsr, error: saveError } = await withUniqueRetry(
     async (candidateNumber: string) => {
       csrData.csr_number = candidateNumber
       return supabase.from('csrs').insert([csrData]).select('id, csr_number').single()  // ← LINE 310: DIRECT INSERT
     },
     ...
   )
   ```

4. **After insert** (`NewCSR.tsx:327-352`):
   - For field CSRs: generates PDF, triggers download
   - Navigates to `/csr/${savedCsr.id}`
   - **NO audit calls anywhere in this path**

### 2.3 Database Write Location

**File:** `src/pages/NewCSR.tsx:310`
```typescript
supabase.from('csrs').insert([csrData]).select('id, csr_number').single()
```

This is a **direct Supabase client insert** — it writes to the `csrs` table via the PostgREST API, not through any RPC.

### 2.4 Audit Call Search

| Audit Function | Defined At | Called From | In CSR Creation Path? |
|----------------|-----------|-------------|----------------------|
| `recordCsrCreated()` | `src/lib/audit.ts:316` | `src/domain/csr/csrService.ts:129` | **NOT FOUND** |
| `recordAuditLog()` | `src/lib/audit.ts:120` | `src/domain/csr/csrService.ts:120` | **NOT FOUND** |

### 2.5 Why Audit Is NOT Called

**Root Cause:** `NewCSR.tsx` **bypasses `createCsr()` entirely**.

- `NewCSR.tsx` imports `createCsr` at line 22 but **never calls it** in `handleSave`
- Instead, `handleSave` performs a direct `supabase.from('csrs').insert()` at line 310
- The audit calls live inside `createCsr()` (`csrService.ts:120-130`), which is never invoked

**The audit code in `csrService.ts` is dead code from the UI's perspective.** It exists, is correctly written, but is never reached by the actual creation path.

### 2.6 Additional CSR Paths Without Audit

| Path | File | Audit? |
|------|------|--------|
| Offline CSR creation | `src/lib/native/csrOffline.ts:224` | **NO** — writes to local SQLite only |
| Offline CSR sync | `src/lib/native/csrSync.ts:186-229` | **NO** — direct `supabase.from('csrs').insert()` |

---

## 3. Waybill Creation Flow — FULL TRACE

### 3.1 UI Entry Point

**File:** `src/pages/NewWaybill.tsx:108` — `handleSave` function

```
User clicks Save → handleSave() → saveWaybill() → supabase insert → audit calls
```

### 3.2 Call Chain (line by line)

1. **`handleSave`** (`NewWaybill.tsx:108-122`):
   ```typescript
   const result = await saveWaybill({
     waybill: data.waybill,
     items: data.items,
     custom_fields: data.customFields,
     mode: 'new',
     prefixes: settings?.document_prefixes,
   })
   ```

2. **`saveWaybill`** (`src/domain/waybill/waybillMutations.ts:9-149`):
   - Validates inputs (lines 19-34)
   - Enforces contract (line 38)
   - Generates waybill number (lines 42-51)
   - Builds payload (lines 68-80)
   - **For mode='new':** (line 82)
     ```typescript
     const { data, error } = await withUniqueRetry(
       async (candidateNumber: string) => {
         payload.waybill_number = candidateNumber
         return supabase.from('waybills').insert([payload]).select('id').single()  // ← LINE 87: INSERT
       },
       ...
     )
     ```

3. **After successful insert** (`waybillMutations.ts:104-116`):
   ```typescript
   // Audit: fire-and-forget after successful create
   try {
     void recordAuditLog({                    // ← LINE 106: FIRE-AND-FORGET
       entityType: 'waybill',
       recordId: data?.id ?? '',
       entityLabel: waybillNumber,
       action: 'CREATE',
       oldData: null,
       newData: payload,
       trackedFields: WAYBILL_TRACKED_FIELDS,
     })
     void recordWaybillCreated(data?.id ?? '') // ← LINE 115: FIRE-AND-FORGET
   } catch { /* ponytail: audit failure must not break mutation */ }
   ```

### 3.3 Database Write Location

**File:** `src/domain/waybill/waybillMutations.ts:87`
```typescript
supabase.from('waybills').insert([payload]).select('id').single()
```

### 3.4 Audit Call Search

| Audit Function | Defined At | Called From | In Waybill Creation Path? |
|----------------|-----------|-------------|--------------------------|
| `recordWaybillCreated()` | `src/lib/audit.ts:352` | `src/domain/waybill/waybillMutations.ts:115` | **FOUND at line 115** |
| `recordAuditLog()` | `src/lib/audit.ts:120` | `src/domain/waybill/waybillMutations.ts:106` | **FOUND at line 106** |

### 3.5 Waybill Audit Assessment

The audit calls **ARE present** in the Waybill creation path. Both `recordAuditLog()` and `recordWaybillCreated()` are called after a successful insert.

**However**, both are fire-and-forget (`void`), meaning:
- The RPC calls are dispatched but not awaited
- If the RPCs fail silently, no error is surfaced
- The catch block at line 116 swallows any synchronous errors

### 3.6 Why Waybill Audit Might Still Not Record

Three possible failure modes:

**A. `record_audit_log` RPC returns null (no insert)**
The SQL function (`migration 20260520090008_audit_activity.sql:210-212`) has:
```sql
if jsonb_array_length(v_changes) = 0 then
    return null;
end if;
```
For CREATE actions with `oldData: null`, `compute_jsonb_diff(null, newData)` should produce changes. But if all tracked fields in `newData` are null/undefined, the diff could be empty.

**B. `record_waybill_created` RPC fails silently**
The RPC reads the waybill from the DB (`select * into v_waybill from public.waybills where id = p_waybill_id`). If the insert hasn't committed by the time the RPC fires (race condition), the SELECT returns null and raises an exception — but the `void` prefix means this exception is unhandled.

**C. `getActor()` fails**
The `recordAuditLog` and `recordWaybillCreated` functions call `getActor()` which calls `supabase.auth.getSession()`. If the session is expired or the auth state is stale, this could fail silently.

### 3.7 Additional Waybill Path

**File:** `src/pages/viewWaybillActions.ts:100` — Waybill duplication
```typescript
void recordWaybillCreated(created.id)
```
This path also calls `recordWaybillCreated()` after duplicating a waybill.

---

## 4. Database RPC Analysis

### 4.1 RPC Function Targets

| RPC Function | Target Table | Defined In |
|-------------|-------------|-----------|
| `record_audit_log` | `audit_logs` | `migration 20260520090008_audit_activity.sql:192` |
| `record_csr_created` | `activity_events` | `migration 20260703100001_record_csr_waybill_events.sql:9` |
| `record_waybill_created` | `activity_events` | `migration 20260703100001_record_csr_waybill_events.sql:131` |

### 4.2 Entity Type Whitelist

The `record_activity_event` function (which all RPCs call) has a whitelist at line 29:
```sql
if p_entity_type not in ('invoice', 'quotation', 'project', 'csr', 'waybill') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
end if;
```
Both 'csr' and 'waybill' ARE in the whitelist (added by `migration 20260703100000_add_csr_waybill_to_whitelist.sql`).

### 4.3 Database Types Gap

`src/lib/database.types.ts` does NOT contain type definitions for `record_csr_created` or `record_waybill_created` RPCs. This means:
- The generated types are stale (not regenerated after the migration)
- TypeScript cannot type-check these RPC calls
- The calls at `audit.ts:318` and `audit.ts:354` are untyped

---

## 5. Summary

### CSR Module

| Question | Answer |
|----------|--------|
| Is `recordCsrCreated()` defined in the repo? | **YES** — `src/lib/audit.ts:316` |
| Is it called from the creation path? | **NO** — `NewCSR.tsx` bypasses `createCsr()` |
| Where SHOULD it be called? | Inside `createCsr()` at `src/domain/csr/csrService.ts:129` — but `createCsr()` is never invoked by the UI |
| Root cause | `NewCSR.tsx:310` does a direct `supabase.from('csrs').insert()` instead of calling `createCsr()` |

### Waybill Module

| Question | Answer |
|----------|--------|
| Is `recordWaybillCreated()` defined in the repo? | **YES** — `src/lib/audit.ts:352` |
| Is it called from the creation path? | **YES** — `src/domain/waybill/waybillMutations.ts:115` |
| Is `recordAuditLog()` called? | **YES** — `src/domain/waybill/waybillMutations.ts:106` |
| Why might audit still not record? | Fire-and-forget pattern (`void`) means RPC failures are silent; possible race condition or auth state issue |

### Key Discrepancy

The user reports "zero audit_logs rows" for both CSR and Waybill. The trace reveals:

1. **CSR:** Audit is definitively NOT called — the UI bypasses the service layer entirely. This is a clear code-path bug.

2. **Waybill:** Audit IS called, but uses fire-and-forget semantics. If the RPCs are failing (e.g., auth state, race condition, or the `record_audit_log` function returning null due to empty diff), failures would be invisible.

---

## 6. Verification Status

- `bun run typecheck`: Not run (read-only task)
- `bun run audit:load`: Not run (read-only task)
- `git status`: Not modified (read-only task)

---

## 7. Deferred Work

1. Fix `NewCSR.tsx` to call `createCsr()` instead of doing a direct insert
2. Add audit calls to the offline CSR sync path (`csrSync.ts:186-229`)
3. Investigate why Waybill audit calls (which ARE present) produce zero rows
4. Regenerate `database.types.ts` to include `record_csr_created` and `record_waybill_created` RPC types
5. Consider awaiting audit RPCs instead of fire-and-forget, or adding error logging
