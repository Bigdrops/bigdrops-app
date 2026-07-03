-- CSR audit RPCs: record_csr_created, record_csr_status_changed, record_csr_linked
-- Waybill audit RPCs: record_waybill_created, record_waybill_status_changed
-- Each mirrors the corresponding invoice/quotation RPC pattern.

-- ============================================================
-- CSR RPCs
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.record_csr_status_changed(
  p_csr_id uuid,
  p_old_status text DEFAULT NULL::text,
  p_new_status text DEFAULT NULL::text,
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

CREATE OR REPLACE FUNCTION public.record_csr_linked(
  p_csr_id uuid,
  p_invoice_id uuid,
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

-- ============================================================
-- WAYBILL RPCs
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.record_waybill_status_changed(
  p_waybill_id uuid,
  p_old_status text DEFAULT NULL::text,
  p_new_status text DEFAULT NULL::text,
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
