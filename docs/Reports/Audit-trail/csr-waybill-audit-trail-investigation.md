# CSR & Waybill Audit Trail Investigation

This report was written by MiMo Code Agent on 2026-07-03.

---

## 1. Objective & Scope

**Objective:** Identify all state-mutating actions in CSR and Waybill modules, map the service-layer structure for each, and propose which actions should be audited using the proven Invoice/Quotation pattern from `docs/STANDARD/audit-trail-standard.md`.

**Scope:**
- `src/domain/csr/` and CSR-related pages
- `src/domain/waybill/` and Waybill-related pages
- Service layers, lifecycle files, and mutation functions
- Database schema for `csrs` and `waybills` tables

**Excluded:**
- Implementation of audit functions
- Migration creation
- Changes to existing code

---

## 2. CSR Investigation

### 2.1 State-Mutating Actions

| Action | Function | Location | Evidence |
|--------|----------|----------|----------|
| CREATE | `createCsr()` | `src/domain/csr/csrService.ts:94-118` | Inserts into `csrs` table |
| UPDATE | `updateCsr()` | `src/domain/csr/csrService.ts:120-135` | Updates `csrs` table by ID |
| DELETE | `deleteCsr()` | `src/domain/csr/csrService.ts:163-172` | Deletes from `csrs` table |
| ARCHIVE | `archiveCsr()` | `src/domain/csr/csrService.ts:152-161` | Sets `archived_at` timestamp |
| ATTACH_INVOICE | `attachInvoiceToCsr()` | `src/domain/csr/csrService.ts:174-195` | Updates `linked_invoice_id` |
| STATUS_CHANGE | (inline in form) | `src/pages/NewCSR.tsx:74,98` | Sets `status` field during creation |

**Notes:**
- CSR has no separate lifecycle service — mutations live in `csrService.ts`
- Status is set during creation (e.g., "Field Entry Pending") but there is no dedicated `changeCsrStatus()` function
- No SIGN or ACKNOWLEDGE actions exist as separate mutations

### 2.2 Service Layer Structure

```
CSR Module Architecture:
  src/domain/csr/csrService.ts          ← All mutations (CRUD + archive + attach)
  src/pages/NewCSR.tsx                  ← CREATE (calls createCsr)
  src/pages/EditCSR.tsx                 ← UPDATE (calls updateCsr)
  src/pages/CSR.tsx                     ← DELETE, ARCHIVE, ATTACH_INVOICE (calls service functions)
```

**Observation:** CSR has a clean service layer in `csrService.ts`. All mutations go through this service. Pages import from the service, not from Supabase directly.

### 2.3 Current Audit Coverage

| Action | audit_logs | activity_events | Evidence |
|--------|-----------|----------------|----------|
| CREATE | ❌ | ❌ | `csrService.ts:94-118` — no audit call |
| UPDATE | ❌ | ❌ | `csrService.ts:120-135` — no audit call |
| DELETE | ❌ | ❌ | `csrService.ts:163-172` — no audit call |
| ARCHIVE | ❌ | ❌ | `csrService.ts:152-161` — no audit call |
| ATTACH_INVOICE | ❌ | ❌ | `csrService.ts:174-195` — no audit call |
| STATUS_CHANGE | ❌ | ❌ | `NewCSR.tsx:74,98` — no audit call |

**Finding:** CSR has zero audit coverage. No calls to `recordAuditLog()` or any activity_events RPC exist anywhere in the CSR domain or its pages.

### 2.4 Audit Proposal

Per `docs/STANDARD/audit-trail-standard.md`, the proven pattern requires:

| Action | audit_logs (dual-write) | activity_events (domain event) | New RPC Needed? |
|--------|------------------------|-------------------------------|-----------------|
| CREATE | ✅ Required | ✅ Required | Yes — `record_csr_created` |
| UPDATE | ✅ Required | ❌ Not required (per standard, UPDATE is audit_logs only) | No |
| DELETE | ❌ Gap (per standard) | ❌ Gap (per standard) | Yes — `record_csr_deleted` |
| ARCHIVE | ❌ Gap (per standard) | ❌ Gap (per standard) | Yes — `record_csr_archived` |
| ATTACH_INVOICE | ✅ Required (LINK action) | ✅ Required | Yes — `record_csr_linked` |
| STATUS_CHANGE | ✅ Required | ✅ Required | Yes — `record_csr_status_changed` |

**Recommended Implementation Order:**
1. CREATE — highest priority, new entity type
2. STATUS_CHANGE — tracks lifecycle progression
3. ATTACH_INVOICE — tracks document lineage
4. UPDATE — field-level change tracking
5. DELETE/ARCHIVE — gap per standard, lower priority

**New RPCs Needed:**
- `record_csr_created` — mirrors `record_invoice_created`
- `record_csr_status_changed` — mirrors `record_invoice_status_changed`
- `record_csr_linked` — mirrors `record_quotation_linked`
- `record_csr_deleted` — new event type
- `record_csr_archived` — new event type

**Entity Type:** Add `'csr'` to `record_activity_event()` whitelist (`20260520090008_audit_activity.sql:92-94`)

**Tracked Fields:** Define `CSR_TRACKED_FIELDS` in `audit.ts`:
```ts
export const CSR_TRACKED_FIELDS = [
  'csr_number', 'client_id', 'client_name', 'equipment_type',
  'make', 'status', 'linked_invoice_id', 'project_id',
  'date', 'start_date', 'end_date', 'po_number',
]
```

---

## 3. Waybill Investigation

### 3.1 State-Mutating Actions

| Action | Function | Location | Evidence |
|--------|----------|----------|----------|
| CREATE | `saveWaybill()` (mode='new') | `src/domain/waybill/waybillMutations.ts:8-103` | Inserts into `waybills` table |
| UPDATE | `saveWaybill()` (mode='edit') | `src/domain/waybill/waybillMutations.ts:104-113` | Updates `waybills` table by ID |
| DELETE | `deleteWaybillRecord()` | `src/pages/viewWaybillActions.ts:8-11` | Deletes from `waybills` table |
| ARCHIVE | `archiveWaybillRecord()` | `src/pages/viewWaybillActions.ts:3-6` | Sets `archived_at` timestamp |
| STATUS_CHANGE | `updateWaybillStatus()` | `src/pages/viewWaybillActions.ts:13-16` | Updates `status` field |
| DUPLICATE | `duplicateWaybillRecord()` | `src/pages/viewWaybillActions.ts:18-43` | Creates new waybill from existing |

**Notes:**
- Waybill mutations are split: `saveWaybill()` lives in `domain/waybill/waybillMutations.ts`, but DELETE/ARCHIVE/STATUS_CHANGE/DUPLICATE live inline in `pages/viewWaybillActions.ts`
- `viewWaybillActions.ts` contains direct Supabase calls, not going through a service layer
- No separate waybill lifecycle service exists

### 3.2 Service Layer Structure

```
Waybill Module Architecture:
  src/domain/waybill/waybillMutations.ts     ← CREATE + UPDATE (saveWaybill)
  src/pages/viewWaybillActions.ts            ← DELETE, ARCHIVE, STATUS_CHANGE, DUPLICATE
  src/pages/NewWaybill.tsx                   ← CREATE (calls saveWaybill)
  src/pages/EditWaybill.tsx                  ← UPDATE (calls saveWaybill)
  src/pages/ViewWaybill.tsx                  ← DELETE, ARCHIVE, STATUS_CHANGE, DUPLICATE
```

**Observation:** Waybill has a split architecture. CREATE/UPDATE go through `waybillMutations.ts`, but other mutations are inline in `viewWaybillActions.ts` with direct Supabase calls. This is less clean than CSR's single-service pattern.

### 3.3 Current Audit Coverage

| Action | audit_logs | activity_events | Evidence |
|--------|-----------|----------------|----------|
| CREATE | ❌ | ❌ | `waybillMutations.ts:81-103` — no audit call |
| UPDATE | ❌ | ❌ | `waybillMutations.ts:104-113` — no audit call |
| DELETE | ❌ | ❌ | `viewWaybillActions.ts:8-11` — no audit call |
| ARCHIVE | ❌ | ❌ | `viewWaybillActions.ts:3-6` — no audit call |
| STATUS_CHANGE | ❌ | ❌ | `viewWaybillActions.ts:13-16` — no audit call |
| DUPLICATE | ❌ | ❌ | `viewWaybillActions.ts:18-43` — no audit call |

**Finding:** Waybill has zero audit coverage. No calls to `recordAuditLog()` or any activity_events RPC exist anywhere in the Waybill domain or its pages.

### 3.4 Audit Proposal

| Action | audit_logs (dual-write) | activity_events (domain event) | New RPC Needed? |
|--------|------------------------|-------------------------------|-----------------|
| CREATE | ✅ Required | ✅ Required | Yes — `record_waybill_created` |
| UPDATE | ✅ Required | ❌ Not required | No |
| DELETE | ❌ Gap | ❌ Gap | Yes — `record_waybill_deleted` |
| ARCHIVE | ❌ Gap | ❌ Gap | Yes — `record_waybill_archived` |
| STATUS_CHANGE | ✅ Required | ✅ Required | Yes — `record_waybill_status_changed` |
| DUPLICATE | ✅ Required (CREATE action) | ✅ Required | Reuse `record_waybill_created` |

**Recommended Implementation Order:**
1. CREATE — highest priority
2. STATUS_CHANGE — tracks delivery lifecycle
3. UPDATE — field-level change tracking
4. DUPLICATE — reuse CREATE event
5. DELETE/ARCHIVE — gap per standard

**New RPCs Needed:**
- `record_waybill_created` — mirrors `record_invoice_created`
- `record_waybill_status_changed` — mirrors `record_invoice_status_changed`
- `record_waybill_deleted` — new event type
- `record_waybill_archived` — new event type

**Entity Type:** Add `'waybill'` to `record_activity_event()` whitelist (`20260520090008_audit_activity.sql:92-94`)

**Tracked Fields:** Define `WAYBILL_TRACKED_FIELDS` in `audit.ts`:
```ts
export const WAYBILL_TRACKED_FIELDS = [
  'waybill_number', 'type', 'status', 'client_id', 'client_name',
  'project_id', 'invoice_id', 'purpose', 'sender_name', 'receiver_name',
  'date', 'delivery_location', 'vehicle_plate',
]
```

---

## 4. Comparative Analysis

| Aspect | CSR | Waybill |
|--------|-----|---------|
| Service layer | Clean single service (`csrService.ts`) | Split between `waybillMutations.ts` and `viewWaybillActions.ts` |
| Direct Supabase in pages | No | Yes (`viewWaybillActions.ts`) |
| Audit coverage | Zero | Zero |
| Entity type in whitelist | Not present | Not present |
| Tracked fields defined | No | No |
| Status change function | None (inline in form) | `updateWaybillStatus()` exists |
| Duplicate function | None | `duplicateWaybillRecord()` exists |

---

## 5. Dependencies & Prerequisites

### 5.1 New RPCs Required

| RPC | Pattern Source | Table |
|-----|---------------|-------|
| `record_csr_created` | `record_invoice_created` | `csrs` |
| `record_csr_status_changed` | `record_invoice_status_changed` | `csrs` |
| `record_csr_linked` | `record_quotation_linked` | `csrs` |
| `record_csr_deleted` | New | `csrs` |
| `record_csr_archived` | New | `csrs` |
| `record_waybill_created` | `record_invoice_created` | `waybills` |
| `record_waybill_status_changed` | `record_invoice_status_changed` | `waybills` |
| `record_waybill_deleted` | New | `waybills` |
| `record_waybill_archived` | New | `waybills` |

### 5.2 Whitelist Updates Required

**File:** `supabase/migrations/20260520090008_audit_activity.sql:92-94`

Current whitelist: `'invoice', 'quotation', 'project'`

Required additions: `'csr'`, `'waybill'`

### 5.3 Audit Function Additions Required

**File:** `src/lib/audit.ts`

New exports needed:
- `recordCsrCreated()`, `recordCsrStatusChanged()`, `recordCsrLinked()`
- `recordWaybillCreated()`, `recordWaybillStatusChanged()`

New tracked field constants:
- `CSR_TRACKED_FIELDS`
- `WAYBILL_TRACKED_FIELDS`

### 5.4 Service Layer Refactoring (Recommended)

**Waybill:** Consider moving `deleteWaybillRecord()`, `archiveWaybillRecord()`, `updateWaybillStatus()`, and `duplicateWaybillRecord()` from `viewWaybillActions.ts` into a new `waybillService.ts` to match the CSR pattern. This would:
- Centralize all mutations in one service
- Make audit wiring cleaner
- Match the architectural pattern established by Invoice/Quotation

---

## 6. Summary

### 6.1 Findings

| Module | Mutations Found | Audit Coverage | Gap Severity |
|--------|----------------|----------------|--------------|
| CSR | 6 (CREATE, UPDATE, DELETE, ARCHIVE, ATTACH_INVOICE, STATUS_CHANGE) | 0% | High |
| Waybill | 6 (CREATE, UPDATE, DELETE, ARCHIVE, STATUS_CHANGE, DUPLICATE) | 0% | High |

### 6.2 What Needs to Be Built

**For both modules:**
1. Add entity type to `record_activity_event()` whitelist
2. Create audit RPC functions in new migrations
3. Add audit functions to `src/lib/audit.ts`
4. Wire audit calls into service layer mutations
5. Define tracked fields constants

**For Waybill specifically:**
6. Consider consolidating `viewWaybillActions.ts` into a service layer

### 6.3 No Implementation Required Yet

This report is investigation-only. All findings are observations from source code. No code was modified.

---

## 7. Verification

| Command | Status | Notes |
|---------|--------|-------|
| `bun run audit:load` | ✅ | No changes to codebase |
| `bun run typecheck` | N/A | No code changes |
| `bun run build` | N/A | No code changes |

**Code Modified:** None. This is a read-only investigation.

---

## 8. Evidence Appendix

### 8.1 CSR Source Files

| File | Lines | Content |
|------|-------|---------|
| `src/domain/csr/csrService.ts` | 1-195 | All CSR mutations (CRUD, archive, attach) |
| `src/pages/NewCSR.tsx` | 1-382 | CSR creation page |
| `src/pages/EditCSR.tsx` | 1-131 | CSR edit page |
| `src/pages/CSR.tsx` | 1-347 | CSR list with delete/archive/attach |
| `supabase/migrations/20260520090004_csrs.sql` | 1-131 | CSR + Waybill schema |

### 8.2 Waybill Source Files

| File | Lines | Content |
|------|-------|---------|
| `src/domain/waybill/waybillMutations.ts` | 1-114 | CREATE + UPDATE |
| `src/pages/viewWaybillActions.ts` | 1-43 | DELETE, ARCHIVE, STATUS_CHANGE, DUPLICATE |
| `src/pages/ViewWaybill.tsx` | 1-573 | Waybill view page |
| `src/pages/NewWaybill.tsx` | 1-110 | Waybill creation page |
| `src/pages/EditWaybill.tsx` | 1-55 | Waybill edit page |
| `supabase/migrations/20260611000000_waybill_schema_final.sql` | 1-179 | Waybill schema finalization |

### 8.3 Audit Pattern References

| File | Lines | Content |
|------|-------|---------|
| `src/lib/audit.ts` | 1-282 | Existing audit functions |
| `supabase/migrations/20260520090008_audit_activity.sql` | 79-135 | `record_activity_event()` with entity whitelist |
| `docs/STANDARD/audit-trail-standard.md` | 1-229 | Audit trail standard |
