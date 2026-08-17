-- Domain: Phase 3 — Audit architecture (schema-aware waybill/CSR audit RPCs)
-- Created: 2026-08-21
--
-- Purpose:
--   Mirrors migration 20260809040000_invoice_audit_schema_aware.sql for
--   waybills and CSRs. After cutover, waybill/CSR data is tenant-authoritative
--   while audit/activity storage remains global (public.activity_events /
--   public.audit_logs). The waybill/CSR audit RPCs hardcode public.waybills /
--   public.csrs, so they raise "not found" for tenant-written rows.
--
-- Note:
--   The linked production DB never applied migrations 20260703100000
--   (record_activity_event whitelist) or 20260703100001 (waybill/CSR audit
--   RPCs). This migration therefore BOTH:
--     (a) extends the record_activity_event entity_type whitelist with
--         'waybill' and 'csr', and
--     (b) creates the waybill/CSR audit RPCs in schema-aware form.
--
-- Change:
--   Each waybill/CSR audit RPC gains an optional `p_entity_id uuid
--   DEFAULT NULL` parameter (appended to preserve named-arg call sites).
--   When provided, the entity row is resolved from the tenant schema via
--   _prov_get_schema_name(). When NULL (pre-cutover callers / legacy
--   records), the lookup falls back to public. Exactly one schema is read
--   per call.
--
-- RPCs created/updated (all keep SECURITY DEFINER + explicit SET
-- search_path TO 'public' per project conventions):
--   record_waybill_created
--   record_waybill_status_changed
--   record_csr_created
--   record_csr_status_changed
--   record_csr_linked
--   record_activity_event (whitelist only; signature unchanged)
--
-- Scope guards:
--   - Function definitions only. Audit WRITES remain global (unchanged).
--   - No RLS, table, or permission changes.
--   - No production-specific UUIDs.

-- ============================================================
-- SHARED HELPER: resolve the schema that owns a waybill
-- ============================================================

CREATE OR REPLACE FUNCTION public._audit_resolve_waybill_schema(
    p_entity_id uuid,
    p_waybill_id uuid
)
RETURNS text
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
BEGIN
    IF p_entity_id IS NULL THEN
        RETURN 'public';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RETURN 'public';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema
          AND c.relname = 'waybills'
          AND c.relkind = 'r'
    ) THEN
        RETURN v_schema;
    END IF;

    RETURN 'public';
END;
$function$;

-- ============================================================
-- SHARED HELPER: resolve the schema that owns a CSR
-- ============================================================

CREATE OR REPLACE FUNCTION public._audit_resolve_csr_schema(
    p_entity_id uuid,
    p_csr_id uuid
)
RETURNS text
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
BEGIN
    IF p_entity_id IS NULL THEN
        RETURN 'public';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RETURN 'public';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema
          AND c.relname = 'csrs'
          AND c.relkind = 'r'
    ) THEN
        RETURN v_schema;
    END IF;

    RETURN 'public';
END;
$function$;

-- ============================================================
-- record_activity_event: extend entity_type whitelist
-- ============================================================

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
    'PAYMENT_VOIDED',
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

-- ============================================================
-- record_waybill_created
-- ============================================================

-- Drop the pre-cutover 5-arg signature (migration 20260703100001) if it was
-- ever applied, so the new schema-aware signature replaces it instead of
-- coexisting as an overload (which would leave tenant reads broken).
DROP FUNCTION IF EXISTS public.record_waybill_created(uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.record_waybill_created(
    p_waybill_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_waybill public.waybills;
  v_schema text;
begin
  v_schema := public._audit_resolve_waybill_schema(p_entity_id, p_waybill_id);

  execute format('select * from %I.waybills where id = %L', v_schema, p_waybill_id)
    into v_waybill;

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

-- ============================================================
-- record_waybill_status_changed
-- ============================================================

-- Drop the pre-cutover 7-arg signature (migration 20260703100001).
DROP FUNCTION IF EXISTS public.record_waybill_status_changed(uuid, text, text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.record_waybill_status_changed(
    p_waybill_id uuid,
    p_old_status text DEFAULT NULL::text,
    p_new_status text DEFAULT NULL::text,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_waybill public.waybills;
  v_schema text;
begin
  v_schema := public._audit_resolve_waybill_schema(p_entity_id, p_waybill_id);

  execute format('select * from %I.waybills where id = %L', v_schema, p_waybill_id)
    into v_waybill;

  if v_waybill.id is null then
    raise exception 'Waybill not found: %', p_waybill_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'waybill',
    p_entity_id := v_waybill.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_waybill.waybill_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_waybill.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

-- ============================================================
-- record_csr_created
-- ============================================================

-- Drop the pre-cutover 5-arg signature (migration 20260703100001).
DROP FUNCTION IF EXISTS public.record_csr_created(uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.record_csr_created(
    p_csr_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr public.csrs;
  v_schema text;
begin
  v_schema := public._audit_resolve_csr_schema(p_entity_id, p_csr_id);

  execute format('select * from %I.csrs where id = %L', v_schema, p_csr_id)
    into v_csr;

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

-- ============================================================
-- record_csr_status_changed
-- ============================================================

-- Drop the pre-cutover 7-arg signature (migration 20260703100001).
DROP FUNCTION IF EXISTS public.record_csr_status_changed(uuid, text, text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.record_csr_status_changed(
    p_csr_id uuid,
    p_old_status text DEFAULT NULL::text,
    p_new_status text DEFAULT NULL::text,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr public.csrs;
  v_schema text;
begin
  v_schema := public._audit_resolve_csr_schema(p_entity_id, p_csr_id);

  execute format('select * from %I.csrs where id = %L', v_schema, p_csr_id)
    into v_csr;

  if v_csr.id is null then
    raise exception 'CSR not found: %', p_csr_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'csr',
    p_entity_id := v_csr.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_csr.csr_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_csr.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

-- ============================================================
-- record_csr_linked
-- ============================================================

-- Drop the pre-cutover 6-arg signature (migration 20260703100001).
DROP FUNCTION IF EXISTS public.record_csr_linked(uuid, uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.record_csr_linked(
    p_csr_id uuid,
    p_invoice_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr public.csrs;
  v_schema text;
begin
  v_schema := public._audit_resolve_csr_schema(p_entity_id, p_csr_id);

  execute format('select * from %I.csrs where id = %L', v_schema, p_csr_id)
    into v_csr;

  if v_csr.id is null then
    raise exception 'CSR not found: %', p_csr_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'csr',
    p_entity_id := v_csr.id,
    p_event_type := 'LINKED',
    p_entity_label := v_csr.csr_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'linked_invoice_id', p_invoice_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;
