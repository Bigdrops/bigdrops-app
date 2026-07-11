-- Letter audit RPCs: record_letter_created, record_letter_updated,
-- record_letter_status_changed, record_letter_duplicated, record_letter_archived.
-- Also fixes entity_type whitelist regression from 20260705100000
-- that dropped 'csr' and 'waybill'.

-- ============================================================
-- LETTER RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_letter_created(
  p_letter_id uuid,
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
  v_letter public.letters;
begin
  select * into v_letter from public.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'CREATED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_letter.status,
      'subject', v_letter.subject,
      'recipient_name', v_letter.recipient_name
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_letter_updated(
  p_letter_id uuid,
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
  v_letter public.letters;
begin
  select * into v_letter from public.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'UPDATED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_letter.status
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_letter_status_changed(
  p_letter_id uuid,
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
  v_letter public.letters;
begin
  select * into v_letter from public.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_letter.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_letter_duplicated(
  p_letter_id uuid,
  p_source_letter_id uuid,
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
  v_letter public.letters;
begin
  select * into v_letter from public.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'DUPLICATE',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'source_letter_id', p_source_letter_id,
      'status', v_letter.status
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_letter_archived(
  p_letter_id uuid,
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
  v_letter public.letters;
begin
  select * into v_letter from public.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'ARCHIVED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', v_letter.status,
      'new_status', 'archived'
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

-- ============================================================
-- FIX entity_type whitelist: add 'letter' + restore 'csr'/'waybill'
-- Migration 20260705100000 regressed the whitelist to
-- ('invoice','quotation','project'), dropping 'csr' and 'waybill'.
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

  if p_entity_type not in ('invoice', 'quotation', 'project', 'csr', 'waybill', 'letter') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
    'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
    'ARCHIVED', 'UNARCHIVED',
    'DUPLICATE'
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
