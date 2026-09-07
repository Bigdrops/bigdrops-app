-- Increment 10: Record Capture Foundation
-- Extends tax_input_entries with evidence, payment reference fields.
-- Adds EXPENSE_RECORDED audit-trail event and receipt entity_type.

-- ============================================================
-- 1. Extend tax_input_entries
-- ============================================================

ALTER TABLE tax_input_entries
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tax_input_entries.payment_reference IS 'Bank transfer ref, receipt number, or similar identifier.';
COMMENT ON COLUMN tax_input_entries.evidence IS 'Array of {name, url, size} objects for uploaded receipts/invoices.';

-- ============================================================
-- 2. record_activity_event: add receipt + EXPENSE_RECORDED
-- ============================================================

-- 2a. public.record_activity_event (canonical whitelist)

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

  if p_entity_type not in ('invoice', 'quotation', 'project', 'csr', 'waybill', 'letter', 'receipt') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
    'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
    'ARCHIVED', 'UNARCHIVED',
    'DUPLICATE', 'EXPENSE_RECORDED'
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

    if found then
      return v_existing;
    end if;
  end if;

  insert into public.activity_events (
    entity_type, entity_id, event_type, entity_label,
    actor_id, actor_label, source, scope_type, metadata, reason
  ) values (
    p_entity_type, p_entity_id, p_event_type, p_entity_label,
    v_actor_id, p_actor_label, p_source, p_scope_type, p_metadata, p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$;

-- 2b. __SCHEMA__.record_activity_event (tenant-scoped RPC)

CREATE OR REPLACE FUNCTION __SCHEMA__.record_activity_event(
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
RETURNS __SCHEMA__.activity_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_existing __SCHEMA__.activity_events;
  v_row __SCHEMA__.activity_events;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  if p_entity_type not in ('invoice', 'quotation', 'project', 'csr', 'waybill', 'letter', 'receipt') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
    'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
    'ARCHIVED', 'UNARCHIVED',
    'DUPLICATE', 'EXPENSE_RECORDED'
  ) then
    raise exception 'Unsupported event_type: %', p_event_type;
  end if;

  if coalesce(p_dedupe_seconds, 0) > 0 then
    select ae.*
    into v_existing
    from __SCHEMA__.activity_events ae
    where ae.entity_type = p_entity_type
      and ae.entity_id = p_entity_id
      and ae.event_type = p_event_type
      and coalesce(ae.actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and ae.created_at >= now() - make_interval(secs => p_dedupe_seconds)
    order by ae.created_at desc
    limit 1;

    if found then
      return v_existing;
    end if;
  end if;

  insert into __SCHEMA__.activity_events (
    entity_type, entity_id, event_type, entity_label,
    actor_id, actor_label, source, scope_type, metadata, reason
  ) values (
    p_entity_type, p_entity_id, p_event_type, p_entity_label,
    v_actor_id, p_actor_label, p_source, p_scope_type, p_metadata, p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$;

-- 2c. record_expense_recorded RPC (domain event)

CREATE OR REPLACE FUNCTION public.record_expense_recorded(
  p_entry_id uuid,
  p_amount numeric,
  p_category text,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text
)
RETURNS public.activity_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  return public.record_activity_event(
    p_entity_type := 'receipt',
    p_entity_id := p_entry_id,
    p_event_type := 'EXPENSE_RECORDED',
    p_entity_label := p_category,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'amount', p_amount,
      'category', p_category
    )
  );
end;
$function$;

-- Tenant-scoped version
CREATE OR REPLACE FUNCTION __SCHEMA__.record_expense_recorded(
  p_entry_id uuid,
  p_amount numeric,
  p_category text,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text
)
RETURNS __SCHEMA__.activity_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  return __SCHEMA__.record_activity_event(
    p_entity_type := 'receipt',
    p_entity_id := p_entry_id,
    p_event_type := 'EXPENSE_RECORDED',
    p_entity_label := p_category,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'amount', p_amount,
      'category', p_category
    )
  );
end;
$function$;
