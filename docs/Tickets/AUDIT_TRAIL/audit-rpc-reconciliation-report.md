# RPC Reconciliation Audit Report

This report was written by OpenCode on 2026-07-09 via Local Runner.

## Executive Summary

Three RPC failures were investigated: `record_csr_created` (HTTP 404), `record_waybill_created` (HTTP 404), and `record_audit_log` (HTTP 400). Root causes are:

1. **Missing RPCs (404):** Migration `20260703100001_record_csr_waybill_events.sql` was either never deployed or failed to apply. Additionally, even if those RPCs existed, the `record_activity_event` function on which they depend was **regressed** by a later migration (`20260705100000_payment_attachments.sql:68-70`) that overwrote its entity_type whitelist, dropping `'csr'` and `'waybill'` support.

2. **Deployment Drift (400):** `record_audit_log` exists in the production schema cache but returns HTTP 400, indicating its deployed signature does not match the frontend payload. The canonical SQL signature (`20260520090008_audit_activity.sql:192`) and the frontend call (`src/lib/audit.ts:159`) are aligned in the codebase, so the production database has a divergent version. The fix is a DB-side redeployment of the canonical function.

---

## Missing RPCs — 404 Details

### record_csr_created

| Property | Value |
|----------|-------|
| Canonical definition | `supabase/migrations/20260703100001_record_csr_waybill_events.sql:9-47` |
| Error evidence | `docs/Tickets/AUDIT_TRAIL/csr-audit-rpc.md:10` — PGRST202 |
| Hint from PostgREST | "Perhaps you meant to call the function public.record_invoice_created" |
| Status | Function does not exist in production schema cache |

### record_waybill_created

| Property | Value |
|----------|-------|
| Canonical definition | `supabase/migrations/20260703100001_record_csr_waybill_events.sql:131-169` |
| Error evidence | `docs/Tickets/AUDIT_TRAIL/waybill-audit-rpc.md:23` — PGRST202 |
| Hint from PostgREST | "Perhaps you meant to call the function public.record_invoice_created" |
| Status | Function does not exist in production schema cache |

---

## Deployment Drift — 400 Details

### record_audit_log

| Property | Value |
|----------|-------|
| Canonical definition | `supabase/migrations/20260520090008_audit_activity.sql:192-227` |
| Error evidence | `docs/Tickets/AUDIT_TRAIL/csr-audit-rpc.md:2` and `waybill-audit-rpc.md:15` — HTTP 400 |
| Status | Function EXISTS in schema cache but payload is rejected |

---

## Canonical Function Definitions

| Function | Winning Migration | Path |
|----------|------------------|------|
| `record_activity_event` | `20260705100000_payment_attachments.sql` (LATEST version, but **faulty**) | `supabase/migrations/20260705100000_payment_attachments.sql:43-112` |
| `record_audit_log` | `20260520090008_audit_activity.sql` (single definition, never superseded) | `supabase/migrations/20260520090008_audit_activity.sql:192-227` |
| `record_csr_created` | `20260703100001_record_csr_waybill_events.sql` (single definition) | `supabase/migrations/20260703100001_record_csr_waybill_events.sql:9-47` |
| `record_waybill_created` | `20260703100001_record_csr_waybill_events.sql` (single definition) | `supabase/migrations/20260703100001_record_csr_waybill_events.sql:131-169` |
| `compute_jsonb_diff` | `20260520090008_audit_activity.sql` (single definition) | `supabase/migrations/20260520090008_audit_activity.sql:161-190` |

---

## Dependency Graph

```
record_csr_created(p_csr_id, ...)
  └── calls → record_activity_event(p_entity_type := 'csr', ...)
                ├── validates entity_type IN ('invoice','quotation','project','csr','waybill')
                ├── validates event_type IN ('CREATED','UPDATED','STATUS_CHANGED',...)
                └── inserts → activity_events TABLE

record_waybill_created(p_waybill_id, ...)
  └── calls → record_activity_event(p_entity_type := 'waybill', ...)
                ├── validates entity_type IN ('invoice','quotation','project','csr','waybill')
                ├── validates event_type IN (...)
                └── inserts → activity_events TABLE

record_audit_log(p_entity_type, p_entity_id, p_entity_label, p_action, p_old_data, p_new_data, ...)
  ├── calls → compute_jsonb_diff(old_data, new_data)
  │            └── compares keys from JSONB objects
  └── inserts → audit_logs TABLE

record_invoice_created (canonical pattern that CSR/Waybill RPCs mirror)
  └── calls → record_activity_event(p_entity_type := 'invoice', ...)
```

### Critical Choke Point: `record_activity_event` whitelist

The function `record_activity_event` has been redefined **four times** in migration history:

1. `20260520090008_audit_activity.sql:79` — original: entity_type IN `('invoice','quotation','project')`
2. `20260703000001_add_payment_voided_to_whitelist.sql:6` — adds `PAYMENT_VOIDED` to event_type; entity_type unchanged
3. `20260703100000_add_csr_waybill_to_whitelist.sql:4` — adds `'csr','waybill'` to entity_type whitelist
4. **`20260705100000_payment_attachments.sql:43`** — **REGRESSION**: overwrites with OLD entity_type whitelist `('invoice','quotation','project')` and adds `'ATTACHMENT_UPLOADED'` to event_type

Migration #4 (`payment_attachments`) **silently dropped** the `'csr'` and `'waybill'` entity types added by migration #3, because both redefine `record_activity_event` via `CREATE OR REPLACE FUNCTION` and neither inherits from the other.

---

## Signature Comparison — record_audit_log

### SQL Canonical Signature (`20260520090008_audit_activity.sql:192-197`)

```sql
CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_entity_type text,
  p_entity_id uuid,
  p_entity_label text,
  p_action text,
  p_old_data jsonb,
  p_new_data jsonb,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_scope_type text DEFAULT 'app'::text,
  p_reason text DEFAULT NULL::text
)
```

### Frontend Payload (`src/lib/audit.ts:159-171`)

```typescript
supabase.rpc('record_audit_log', {
  p_entity_type: entityType,       // AuditEntityType → text
  p_entity_id: recordId,           // string → uuid
  p_entity_label: entityLabel ?? null, // string|null → text
  p_action: action,                // AuditAction → text
  p_old_data,                      // object|null → jsonb
  p_new_data,                      // object|null → jsonb
  p_actor_id: actor.id,            // string|null → uuid
  p_actor_label: actor.label,      // string → text
  p_source: 'web',                 // literal → text
  p_scope_type: 'app',             // literal → text
  p_reason: reason ?? null,        // string|null → text
})
```

### database.types.ts Generated Signature (`src/lib/database.types.ts:2758-2771`)

```typescript
record_audit_log: {
  Args: {
    p_action: string
    p_actor_id?: string
    p_actor_label?: string
    p_entity_id: string
    p_entity_label: string
    p_entity_type: string
    p_new_data: Json
    p_old_data: Json
    p_reason?: string
    p_scope_type?: string
    p_source?: string
  }
}
```

### Comparison Verdict

All three sources — SQL, frontend, and generated types — are **aligned** in the codebase. All 11 parameter names, types, and ordering (by name, not position) match exactly. The HTTP 400 cannot be explained by any discrepancy in the repository source files. **The production database has a divergent version of the function.**

Possible causes for the divergence:
- The function was manually created/altered in the Supabase SQL editor
- An older migration was applied that defined different parameter names (e.g., without `p_` prefix, or different ordering)
- The function was dropped and recreated with a different signature by a manual intervention

---

## Manual SQL Execution Order (Step-by-Step)

The following order respects all inter-function dependencies:

### Step 1: Fix `record_activity_event` (regression repair)

The current canonical version (`20260705100000_payment_attachments.sql:43-112`) dropped `'csr'` and `'waybill'` from the entity_type whitelist. Must merge the entity_type update from `20260703100000_add_csr_waybill_to_whitelist.sql:29` with the event_type updates from `payment_attachments.sql:72-77`.

**Why this must be Step 1:** Both `record_csr_created` and `record_waybill_created` call `record_activity_event` with entity types `'csr'` and `'waybill'`. Without this fix, deploying those RPCs would result in runtime exceptions: "Unsupported entity_type: csr".

### Step 2: Deploy `record_csr_created` and supporting CSR RPCs

All CSR RPCs from `20260703100001_record_csr_waybill_events.sql:9-125` depend on Step 1.

### Step 3: Deploy `record_waybill_created` and supporting Waybill RPCs

All Waybill RPCs from `20260703100001_record_csr_waybill_events.sql:131-209` depend on Step 1.

### Step 4: Redeploy `record_audit_log`

Re-deploy the canonical definition from `20260520090008_audit_activity.sql:192-227`. This is independent of Steps 1-3 (no dependency on `record_activity_event`).

---

## SQL Blocks

### Block 1: Fix `record_activity_event` (entity_type + event_type whitelist)

```sql
-- Merge: entity_type from add_csr_waybill_to_whitelist + event_type from payment_attachments
CREATE OR REPLACE FUNCTION public.record_activity_event(
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_entity_label text DEFAULT NULL::text,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_scope_type text DEFAULT 'app'::text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL::text,
  p_dedupe_seconds integer DEFAULT 0
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_existing public.activity_events;
  v_row public.activity_events;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  if p_entity_type not in ('invoice', 'quotation', 'project', 'csr', 'waybill') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
    'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
    'ARCHIVED', 'UNARCHIVED'
  ) then
    raise exception 'Unsupported event_type: %', p_event_type;
  end if;

  if coalesce(p_dedupe_seconds, 0) > 0 then
    select ae.*
    into v_existing
    from public.activity_events ae
    where ae.entity_type = p_entity_type
      and ae.entity_id = p_entity_id
      and ae.event_type = p_event_type
      and coalesce(ae.actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and ae.created_at >= now() - make_interval(secs => p_dedupe_seconds)
    order by ae.created_at desc
    limit 1;

    if v_existing.id is not null then
      return v_existing;
    end if;
  end if;

  insert into public.activity_events (
    entity_type, entity_id, entity_label, event_type,
    actor_id, actor_label, source, scope_type, metadata, reason
  )
  values (
    p_entity_type, p_entity_id, p_entity_label, p_event_type,
    v_actor_id, p_actor_label, coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'), coalesce(p_metadata, '{}'::jsonb), p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$;
```

### Block 2: Deploy `record_csr_created` RPC

```sql
CREATE OR REPLACE FUNCTION public.record_csr_created(
  p_csr_id uuid,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr public.csrs;
begin
  select * into v_csr from public.csrs where id = p_csr_id;
  if v_csr.id is null then
    raise exception 'CSR not found: %', p_csr_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'csr',
    p_entity_id := v_csr.id,
    p_event_type := 'CREATED',
    p_entity_label := v_csr.csr_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_csr.status,
      'client_name', v_csr.client_name,
      'equipment_type', v_csr.equipment_type,
      'project_id', v_csr.project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$;
```

### Block 3: Deploy `record_waybill_created` RPC

```sql
CREATE OR REPLACE FUNCTION public.record_waybill_created(
  p_waybill_id uuid,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_waybill public.waybills;
begin
  select * into v_waybill from public.waybills where id = p_waybill_id;
  if v_waybill.id is null then
    raise exception 'Waybill not found: %', p_waybill_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'waybill',
    p_entity_id := v_waybill.id,
    p_event_type := 'CREATED',
    p_entity_label := v_waybill.waybill_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_waybill.status,
      'type', v_waybill.type,
      'client_name', v_waybill.client_name,
      'project_id', v_waybill.project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$;
```

### Block 4: Redeploy `record_audit_log` (canonical)

```sql
CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_entity_type text,
  p_entity_id uuid,
  p_entity_label text,
  p_action text,
  p_old_data jsonb,
  p_new_data jsonb,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_scope_type text DEFAULT 'app'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS audit_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_changes jsonb;
  v_row public.audit_logs;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  v_changes := public.compute_jsonb_diff(
    coalesce(p_old_data, '{}'::jsonb),
    coalesce(p_new_data, '{}'::jsonb)
  );

  if jsonb_array_length(v_changes) = 0 then
    return null;
  end if;

  insert into public.audit_logs (
    entity_type, entity_id, entity_label, action,
    actor_id, actor_label, source, scope_type, changes, reason
  )
  values (
    p_entity_type, p_entity_id, p_entity_label, p_action,
    v_actor_id, p_actor_label, coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'), v_changes, p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$;
```

---

## record_audit_log Analysis

### Evidence-Based Conclusion

| Evidence | Source | Implication |
|----------|--------|-------------|
| HTTP 400 (not 404) | `csr-audit-rpc.md:2`, `waybill-audit-rpc.md:15` | Function EXISTS in schema cache |
| SQL signature vs frontend payload match in codebase | `20260520090008_audit_activity.sql:192` vs `audit.ts:159` | No source-level mismatch |
| Only one migration defines this function | `20260520090008_audit_activity.sql` | No overwrites in any later migration file |
| database.types.ts matches both | `database.types.ts:2758-2771` | Generated types confirm the signature |

**Verdict: The fix is a DB update, NOT a code change.**

The canonical function signature in the migration file and the frontend payload are identical. The production database has a divergent version that must be overwritten by re-executing the canonical `CREATE OR REPLACE FUNCTION` from the migration.

### Why a Code Change Would Be Wrong

If the frontend were changed to match the deployed (divergent) signature, it would:
1. Break the type safety in `database.types.ts`
2. Diverge from the migration file, creating future deployment conflicts
3. Perpetuate the drift rather than resolve it

---

## Final Recommendation

### Immediate (Production Fix)

Execute SQL Blocks in this exact order via Supabase SQL Editor or migration runner:

1. **Block 1** — Fix `record_activity_event` whitelist regression (adds `'csr'`, `'waybill'` to entity_type)
2. **Block 2** — Create `record_csr_created` RPC
3. **Block 3** — Create `record_waybill_created` RPC
4. **Block 4** — Redeploy canonical `record_audit_log` (resolves 400 drift)

### Preventative

1. **Add a migration-level conflict detector**: Before any `CREATE OR REPLACE FUNCTION public.record_activity_event(...)`, verify that no entity types are being silently dropped. Consider code review checklist item: "Does this `CREATE OR REPLACE FUNCTION` preserve all existing whitelist entries?"

2. **Create a consolidated `record_activity_event` migration**: The function has been redefined 4 times, each diverging slightly. A dedicated standalone migration (`20260709000000_consolidate_record_activity_event.sql`) should be the single source of truth going forward, including:
   - entity_type: `('invoice', 'quotation', 'project', 'receipt', 'waybill', 'csr', 'rfq', 'boq')`
   - event_type: `('CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED', 'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED', 'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED', 'ARCHIVED', 'UNARCHIVED', 'RECEIPT_GENERATED', 'RECEIPT_VOIDED')`

3. **Regenerate `database.types.ts`** after deploying to ensure type definitions include `record_csr_created`, `record_waybill_created`, and the corrected `record_audit_log`.

### Risks of Inaction

| Risk | Severity | Description |
|------|----------|-------------|
| Silent audit gaps | High | CSR and Waybill CREATED events are missing from activity_events; compliance trail is incomplete |
| Continued console noise | Medium | Error logs filled with 404 and 400 responses, masking real issues |
| State-dependent failures | Medium | If `record_audit_log` calls succeed for some flows but fail for others, audit_logs will be inconsistent |
