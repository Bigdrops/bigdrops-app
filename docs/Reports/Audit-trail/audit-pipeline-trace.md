# Audit Pipeline Trace: CSR & Waybill

This report was written by MiMoCode on 2026-07-06 via Local Runner.

## Executive Summary

**Both CSR and Waybill audit pipelines are broken.** The `activity_events` table receives zero rows for both entity types. The root cause is a **migration regression**: migration `20260705100000_payment_attachments.sql` rewrote the `record_activity_event` function and **dropped `csr` and `waybill` from the entity_type whitelist**, undoing the work done by migration `20260703100000_add_csr_waybill_to_whitelist.sql`.

There is **no CHECK constraint** on the `activity_events` table itself — the validation is enforced entirely by a PL/pgSQL `IF` statement inside `record_activity_event()`.

---

## Part 1: CSR Audit Pipeline Trace

### Service Layer

**File:** `src/domain/csr/csrService.ts:95-132`

The `createCsr()` function:

1. Inserts CSR into `csrs` table (line 97-105)
2. On success, fires two audit calls **fire-and-forget** (lines 120-129):

```typescript
// Line 120 — writes to audit_logs via record_audit_log RPC
void recordAuditLog({
  entityType: 'csr',
  recordId: data.id,
  entityLabel: data.csr_number,
  action: 'CREATE',
  oldData: null,
  newData: csrData,
  trackedFields: CSR_TRACKED_FIELDS,
})

// Line 129 — writes to activity_events via record_csr_created RPC
void recordCsrCreated(data.id, data.csr_number)
```

Both calls use `void` (fire-and-forget) and are wrapped in a try/catch that swallows errors (line 130).

### Audit Function: recordCsrCreated

**File:** `src/lib/audit.ts:370-379`

```typescript
export async function recordCsrCreated(csrId: string, csrNumber: string | null, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_csr_created', {
    p_csr_id: csrId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}
```

### Database RPC: record_csr_created

**File:** `supabase/migrations/20260703100001_record_csr_waybill_events.sql:9-47`

This RPC:
1. Fetches the CSR row from `csrs` table
2. Calls `record_activity_event()` with:
   - `p_entity_type := 'csr'`
   - `p_event_type := 'CENT'` ← **THIS IS THE BLOCK POINT**

### Database: record_activity_event (current live version)

**File:** `supabase/migrations/20260705100000_payment_attachments.sql:43-112`

The current function checks:
```sql
-- Line 68-69
if p_entity_type not in ('invoice', 'quotation', 'project') then
  raise exception 'Unsupported entity_type: %', p_entity_type;
end if;
```

**`csr` is NOT in this list.** The RPC throws `Unsupported entity_type: csr` which propagates back to the client. Since the client uses `void` (fire-and-forget), the error is silently lost.

### CSR Pipeline Stop Point

| Check | Result |
|---|---|
| recordAuditLog() called? | **YES** — `src/domain/csr/csrService.ts:120` |
| recordCsrCreated() called? | **YES** — `src/domain/csr/csrService.ts:129` |
| RPC name | `record_csr_created` |
| audit_logs row count | **> 0** — `record_audit_log` RPC has no entity_type whitelist |
| activity_events row count | **0** — `record_activity_event` rejects `entity_type='csr'` |
| Error | `Unsupported entity_type: csr` (swallowed by void + try/catch) |

**Pipeline stops at:** `record_activity_event()` line 68 — entity_type whitelist excludes `csr`.

---

## Part 2: Waybill Audit Pipeline Trace

### Service Layer

**File:** `src/domain/waybill/waybillMutations.ts:82-117` (new mode)

The `saveWaybill()` function (new mode):

1. Inserts waybill into `waybills` table (line 84-98)
2. On success, fires two audit calls fire-and-forget (lines 106-115):

```typescript
// Line 106 — writes to audit_logs
void recordAuditLog({
  entityType: 'waybill',
  recordId: data?.id ?? '',
  entityLabel: waybillNumber,
  action: 'CREATE',
  oldData: null,
  newData: payload,
  trackedFields: WAYBILL_TRACKED_FIELDS,
})

// Line 115 — writes to activity_events
void recordWaybillCreated(data?.id ?? '')
```

Additional waybill audit calls exist in `src/pages/viewWaybillActions.ts`:
- `archiveWaybillRecord()` line 9 — `recordAuditLog` with action `ARCHIVE`
- `deleteWaybillRecord()` line 25 — `recordAuditLog` with action `DELETE`
- `updateWaybillStatus()` line 49, 59 — `recordAuditLog` + `recordWaybillStatusChanged`
- `duplicateWaybillRecord()` line 91, 100 — `recordAuditLog` + `recordWaybillCreated`

### Audit Function: recordWaybillCreated

**File:** `src/lib/audit.ts:406-415`

```typescript
export async function recordWaybillCreated(waybillId: string, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_waybill_created', {
    p_waybill_id: waybillId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}
```

### Database RPC: record_waybill_created

**File:** `supabase/migrations/20260703100001_record_csr_waybill_events.sql:131-169`

This RPC calls `record_activity_event()` with:
- `p_entity_type := 'waybill'`
- `p_event_type := 'CENT'`

### Waybill Pipeline Stop Point

| Check | Result |
|---|---|
| recordAuditLog() called? | **YES** — `src/domain/waybill/waybillMutations.ts:106` |
| recordWaybillCreated() called? | **YES** — `src/domain/waybill/waybillMutations.ts:115` |
| RPC name | `record_waybill_created` |
| audit_logs row count | **> 0** — `record_audit_log` RPC has no entity_type whitelist |
| activity_events row count | **0** — `record_activity_event` rejects `entity_type='waybill'` |
| Error | `Unsupported entity_type: waybill` (swallowed by void + try/catch) |

**Pipeline stops at:** `record_activity_event()` line 68 — entity_type whitelist excludes `waybill`.

---

## Part 3: Event Type Inventory

### All RPCs that write to activity_events

| RPC Name | Defined In | Entity Type | Event Type |
|---|---|---|---|
| `record_invoice_created` | `20260520090003_invoices.sql:203` | `invoice` | `CREATED` |
| `record_invoice_status_changed` | `20260520090003_invoices.sql:242` | `invoice` | `STATUS_CHANGED` |
| `record_payment_recorded` (original) | `20260520090003_invoices.sql:279` | `invoice` | `PAYMENT_RECORDED` |
| `record_payment_recorded` (enriched) | `20260705000000_enrich_payment_metadata.sql:5` | `invoice` | `PAYMENT_RECORDED` |
| `record_quotation_created` | `20260520090002_quotations.sql:249` | `quotation` | `CREATED` |
| `record_quotation_status_changed` | `20260520090002_quotations.sql:288` | `quotation` | `STATUS_CHANGED` |
| `record_quotation_linked` | `20260520090002_quotations.sql:325` | `quotation` | `LINKED` |
| `record_project_updated` | `20260520090001_projects.sql:100` | `project` | `UPDATED` |
| `record_project_note_added` | `20260520090001_projects.sql:142` | `project` | `NOTE_ADDED` |
| `record_project_document_added` | `20260520090001_projects.sql:176` | `project` | `DOCUMENT_ADDED` |
| `record_project_linked_activity` | `20260520090001_projects.sql:210` | `project` | `LINKED` |
| `record_payment_voided` | `20260703000000_record_payment_voided.sql` | `invoice` | `PAYMENT_VOIDED` |
| `record_csr_created` | `20260703100001_record_csr_waybill_events.sql:9` | `csr` | `CREATED` |
| `record_csr_status_changed` | `20260703100001_record_csr_waybill_events.sql:49` | `csr` | `STATUS_CHANGED` |
| `record_csr_linked` | `20260703100001_record_csr_waybill_events.sql:89` | `csr` | `LINKED` |
| `record_waybill_created` | `20260703100001_record_csr_waybill_events.sql:131` | `waybill` | `CREATED` |
| `record_waybill_status_changed` | `20260703100001_record_csr_waybill_events.sql:171` | `waybill` | `STATUS_CHANGED` |
| `record_payment_attachment_uploaded` | `20260705100000_payment_attachments.sql:118` | `invoice` | `ATTACHMENT_UPLOADED` |

### Event types emitted by the application

| Event Type | Entity Type(s) | RPCs Using It | In Whitelist? |
|---|---|---|---|
| `CREATED` | invoice, quotation, csr, waybill | record_*_created | YES |
| `UPDATED` | project | record_project_updated | YES |
| `STATUS_CHANGED` | invoice, quotation, csr, waybill | record_*_status_changed | YES |
| `PAYMENT_RECORDED` | invoice | record_payment_recorded | YES |
| `PAYMENT_VOIDED` | invoice | record_payment_voided | YES |
| `ATTACHMENT_UPLOADED` | invoice | record_payment_attachment_uploaded | YES |
| `LINKED` | quotation, csr, project | record_*_linked | YES |
| `UNLINKED` | (none currently) | — | YES |
| `NOTE_ADDED` | project | record_project_note_added | YES |
| `DOCUMENT_ADDED` | project | record_project_document_added | YES |
| `ARCHIVED` | (none currently) | — | YES |
| `UNARCHIVED` | (none currently) | — | YES |

### Current entity_type whitelist (LIVE version)

From `20260705100000_payment_attachments.sql:68`:

```
'invoice', 'quotation', 'project'
```

**MISSING:** `csr`, `waybill`

### Current event_type whitelist (LIVE version)

From `20260705100000_payment_attachments.sql:72-77`:

```
'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
'ARCHIVED', 'UNARCHIVED'
```

This is **complete** — all event types used in the codebase are present.

---

## Migration Regression Analysis

### Migration chain for record_activity_event

| # | Migration | entity_type whitelist | event_type whitelist |
|---|---|---|---|
| 1 | `20260520090008` (original) | `invoice, quotation, project` | `CREATED, UPDATED, STATUS_CHANGED, PAYMENT_RECORDED, LINKED, UNLINKED, NOTE_ADDED, DOCUMENT_ADDED, ARCHIVED, UNARCHIVED` |
| 2 | `20260703000001` | `invoice, quotation, project` (unchanged) | Added `PAYMENT_VOIDED` |
| 3 | `20260703100000` | Added `csr`, `waybill` → `invoice, quotation, project, csr, waybill` | Unchanged |
| 4 | `20260705100000` | **RESET to `invoice, quotation, project`** | Added `ATTACHMENT_UPLOADED` |

**Regression:** Migration 4 (`20260705100000_payment_attachments.sql`) does a full `CREATE OR REPLACE FUNCTION` of `record_activity_event`. The author copied the function body from an earlier version (before migration 3) and added `ATTACHMENT_UPLOADED`, but forgot to include `csr` and `waybill` in the entity_type check.

---

## Constraint Gap Analysis

### No CHECK constraint exists

The `activity_events` table has **no CHECK constraint** on `event_type` or `entity_type`. The only table constraint is the primary key. All validation is done inside the `record_activity_event()` PL/pgSQL function.

### Event types in code but NOT in whitelist

None — all event types used in RPCs are present in the whitelist.

### Entity types in code but NOT in whitelist

| Entity Type | Used By | In Whitelist? |
|---|---|---|
| `csr` | record_csr_created, record_csr_status_changed, record_csr_linked | **NO** |
| `waybill` | record_waybill_created, record_waybill_status_changed | **NO** |

### Event types in whitelist but NOT used in code

| Event Type | Status |
|---|---|
| `UNLINKED` | No RPC currently emits this |
| `ARCHIVED` | No RPC currently emits this (only audit_logs, not activity_events) |
| `UNARCHIVED` | No RPC currently emits this |

These are harmless — they're forward-compatible placeholders.

---

## Conclusion

### Where does CSR pipeline stop?

**The CSR pipeline stops inside `record_activity_event()` at the entity_type whitelist check (line 68).** Both `recordAuditLog()` (writes to `audit_logs`) and `recordCsrCreated()` (attempts to write to `activity_events`) are called. The `audit_logs` write succeeds. The `activity_events` write fails with `Unsupported entity_type: csr` because migration `20260705100000_payment_attachments.sql` reverted the entity_type whitelist back to `('invoice', 'quotation', 'project')`, removing `csr`.

### Where does Waybill pipeline stop?

**Same location.** The Waybill pipeline stops inside `record_activity_event()` at the entity_type whitelist check. Both `recordAuditLog()` and `recordWaybillCreated()` are called. The `audit_logs` write succeeds. The `activity_events` write fails with `Unsupported entity_type: waybill` for the same reason.

### What should the comprehensive entity_type whitelist include?

```sql
'invoice', 'quotation', 'project', 'csr', 'waybill'
```

### What should the comprehensive event_type whitelist include?

```sql
'CREATED', 'UPDATED', 'STATUS_CHANGED',
'PAYMENT_RECORDED', 'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
'LINKED', 'UNLINKED',
'NOTE_ADDED', 'DOCUMENT_ADDED',
'ARCHIVED', 'UNARCHIVED'
```

### Recommended fix

A single new migration that does `CREATE OR REPLACE FUNCTION public.record_activity_event(...)` with both whitelists complete:

- **entity_type:** `('invoice', 'quotation', 'project', 'csr', 'waybill')`
- **event_type:** `('CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED', 'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED', 'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED', 'ARCHIVED', 'UNARCHIVED')`

---

## Verification

- `bun run typecheck` — passed (no code changes made)
- `bun run build` — skipped per AGENTS.md hardware policy
- Database queries — not executed (read-only investigation, no Supabase CLI access)
- All findings traced to specific file:line references
