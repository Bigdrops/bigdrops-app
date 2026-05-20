-- Domain: Audit & Activity
-- Tables: activity_events, audit_logs
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_label text,
    event_type text NOT NULL,
    actor_id uuid,
    actor_label text,
    source text NOT NULL DEFAULT 'web'::text,
    scope_type text NOT NULL DEFAULT 'app'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    reason text
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_label text,
    action text NOT NULL,
    actor_id uuid,
    actor_label text,
    source text NOT NULL DEFAULT 'web'::text,
    scope_type text NOT NULL DEFAULT 'app'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    changes jsonb NOT NULL DEFAULT '[]'::jsonb,
    reason text
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE activity_events ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON public.activity_events USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON public.activity_events USING btree (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_scope ON public.activity_events USING btree (scope_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_scope ON public.audit_logs USING btree (scope_type, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- activity_events
CREATE POLICY authenticated_users_can_read_activity_events ON activity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY team_members_can_view_activity_events ON activity_events FOR SELECT TO authenticated USING (true);

-- audit_logs
CREATE POLICY team_members_can_view_all_audit_logs ON audit_logs FOR SELECT TO authenticated USING (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_activity_event(p_entity_type text, p_entity_id uuid, p_event_type text, p_entity_label text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_scope_type text DEFAULT 'app'::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text, p_dedupe_seconds integer DEFAULT 0)
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

  if p_entity_type not in ('invoice', 'quotation', 'project') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
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

CREATE OR REPLACE FUNCTION public.log_activity_event(p_entity_type text, p_entity_id uuid, p_entity_label text DEFAULT NULL::text, p_event_type text DEFAULT 'UPDATED'::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_scope_type text DEFAULT 'app'::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.activity_events;
begin
  insert into public.activity_events (
    entity_type, entity_id, entity_label, event_type,
    actor_id, actor_label, source, scope_type, metadata, reason
  )
  values (
    p_entity_type, p_entity_id, p_entity_label, p_event_type,
    p_actor_id, p_actor_label, p_source, p_scope_type,
    coalesce(p_metadata, '{}'::jsonb), p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.compute_jsonb_diff(old_data jsonb, new_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  result jsonb := '[]'::jsonb;
  key text;
  old_val jsonb;
  new_val jsonb;
begin
  for key in
    select distinct k from (
      select jsonb_object_keys(old_data) k
      union
      select jsonb_object_keys(new_data) k
    ) s
  loop
    old_val := old_data -> key;
    new_val := new_data -> key;

    if old_val is distinct from new_val then
      result := result || jsonb_build_array(
        jsonb_build_object('field', key, 'old', old_val, 'new', new_val)
      );
    end if;
  end loop;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_audit_log(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_scope_type text DEFAULT 'app'::text, p_reason text DEFAULT NULL::text)
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
