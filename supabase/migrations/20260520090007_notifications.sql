-- Domain: Notifications
-- Tables: notifications, notification_preferences, notification_runs, push_device_tokens, push_delivery_logs
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    domain text NOT NULL,
    source text NOT NULL,
    generator_key text NOT NULL,
    fingerprint text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    route text,
    entity_type text,
    entity_id text,
    severity text NOT NULL DEFAULT 'low'::text,
    state text NOT NULL DEFAULT 'unread'::text,
    first_generated_at timestamp with time zone NOT NULL DEFAULT now(),
    last_generated_at timestamp with time zone NOT NULL DEFAULT now(),
    read_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    resolved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    scope_type text NOT NULL DEFAULT 'tenant'::text,
    scope_id text NOT NULL DEFAULT 'default'::text
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    domain text NOT NULL,
    event_key text NOT NULL,
    channel text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    threshold_days integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_runs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    generator_key text,
    run_at timestamp with time zone DEFAULT now(),
    status text,
    message text
);

CREATE TABLE IF NOT EXISTS push_device_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    device_id text,
    app_version text,
    last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_delivery_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notification_id uuid,
    user_id uuid NOT NULL,
    token_id uuid,
    provider text NOT NULL DEFAULT 'fcm'::text,
    provider_message_id text,
    status text NOT NULL DEFAULT 'pending'::text,
    error text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
ALTER TABLE notification_runs ADD CONSTRAINT notification_runs_pkey PRIMARY KEY (id);
ALTER TABLE push_device_tokens ADD CONSTRAINT push_device_tokens_pkey PRIMARY KEY (id);
ALTER TABLE push_delivery_logs ADD CONSTRAINT push_delivery_logs_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS notifications_user_state_idx ON public.notifications USING btree (user_id, state);
CREATE INDEX IF NOT EXISTS notifications_user_domain_idx ON public.notifications USING btree (user_id, domain);
CREATE INDEX IF NOT EXISTS notifications_last_generated_idx ON public.notifications USING btree (last_generated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_scope_user_fingerprint_idx ON public.notifications USING btree (scope_type, scope_id, user_id, fingerprint);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_unique_rule_idx ON public.notification_preferences USING btree (user_id, domain, event_key, channel, COALESCE(threshold_days, '-1'::integer));
CREATE INDEX IF NOT EXISTS notification_preferences_user_idx ON public.notification_preferences USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS push_device_tokens_user_token_idx ON public.push_device_tokens USING btree (user_id, token);
CREATE INDEX IF NOT EXISTS push_device_tokens_user_active_idx ON public.push_device_tokens USING btree (user_id) WHERE (revoked_at IS NULL);

CREATE INDEX IF NOT EXISTS push_delivery_logs_user_id_idx ON public.push_delivery_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS push_delivery_logs_notification_id_idx ON public.push_delivery_logs USING btree (notification_id);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE push_delivery_logs ADD CONSTRAINT push_delivery_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES notifications(id);
ALTER TABLE push_delivery_logs ADD CONSTRAINT push_delivery_logs_token_id_fkey FOREIGN KEY (token_id) REFERENCES push_device_tokens(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_delivery_logs ENABLE ROW LEVEL SECURITY;

-- notifications
CREATE POLICY users_can_view_their_notifications ON notifications FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY users_can_update_their_notifications ON notifications FOR UPDATE TO public USING ((auth.uid() = user_id));

-- notification_preferences
CREATE POLICY notification_preferences_select_own ON notification_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY notification_preferences_delete_own ON notification_preferences FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY notification_preferences_update_own ON notification_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

-- push_device_tokens
CREATE POLICY push_tokens_select ON push_device_tokens FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY push_tokens_update ON push_device_tokens FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

-- push_delivery_logs
CREATE POLICY push_delivery_logs_select_own ON push_delivery_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_notification(p_user_id uuid, p_domain text, p_source text, p_generator_key text, p_fingerprint text, p_title text, p_message text, p_route text, p_entity_type text, p_entity_id text, p_severity text, p_metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.notifications (
    user_id, domain, source, generator_key, fingerprint,
    title, message, route, entity_type, entity_id, severity, metadata
  )
  values (
    p_user_id, p_domain, p_source, p_generator_key, p_fingerprint,
    p_title, p_message, p_route, p_entity_type, p_entity_id, p_severity, p_metadata
  )
  on conflict (user_id, fingerprint)
  do update set
    title = excluded.title,
    message = excluded.message,
    route = excluded.route,
    severity = excluded.severity,
    metadata = excluded.metadata,
    last_generated_at = now(),
    state = case
      when notifications.state = 'resolved' then 'unread'
      else notifications.state
    end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_notification(p_scope_type text, p_scope_id text, p_user_id uuid, p_domain text, p_source text, p_generator_key text, p_fingerprint text, p_title text, p_message text, p_route text, p_entity_type text, p_entity_id text, p_severity text, p_metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.notifications (
    scope_type, scope_id, user_id, domain, source, generator_key, fingerprint,
    title, message, route, entity_type, entity_id, severity, metadata
  )
  values (
    p_scope_type, p_scope_id, p_user_id, p_domain, p_source, p_generator_key, p_fingerprint,
    p_title, p_message, p_route, p_entity_type, p_entity_id, p_severity, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (scope_type, scope_id, user_id, fingerprint)
  do update set
    title = excluded.title,
    message = excluded.message,
    route = excluded.route,
    severity = excluded.severity,
    metadata = excluded.metadata,
    last_generated_at = now(),
    state = case
      when notifications.state = 'resolved' then 'unread'
      else notifications.state
    end,
    resolved_at = case
      when notifications.state = 'resolved' then null
      else notifications.resolved_at
    end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_notification(p_user_id uuid, p_fingerprint text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update public.notifications
  set
    state = 'resolved',
    resolved_at = now()
  where user_id = p_user_id
    and fingerprint = p_fingerprint;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_notification(p_scope_type text, p_scope_id text, p_user_id uuid, p_fingerprint text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update public.notifications
  set
    state = 'resolved',
    resolved_at = now()
  where scope_type = p_scope_type
    and scope_id = p_scope_id
    and user_id = p_user_id
    and fingerprint = p_fingerprint;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  rec record;
  age_days int;
  age_bucket text;
  fp text;
begin
  for rec in
    with invoice_activity as (
      select
        ae.entity_id::uuid as invoice_id,
        min(ae.created_at) filter (
          where upper(ae.event_type) in ('INVOICE_CREATED', 'CREATED')
        ) as created_event_at,
        (
          array_agg(ae.actor_id order by ae.created_at asc)
          filter (
            where ae.actor_id is not null
              and upper(ae.event_type) in ('INVOICE_CREATED', 'CREATED')
          )
        )[1] as recipient_user_id,
        bool_or(upper(ae.event_type) = 'PAYMENT_RECORDED') as has_payment_recorded,
        max(ae.created_at) filter (
          where upper(ae.event_type) = 'PAYMENT_RECORDED'
        ) as last_payment_recorded_at
      from public.activity_events ae
      where lower(ae.entity_type) = 'invoice'
      group by ae.entity_id::uuid
    )
    select
      i.id,
      i.invoice_number,
      i.status,
      i.created_at,
      coalesce(ia.created_event_at, i.created_at) as reminder_start_at,
      ia.recipient_user_id,
      coalesce(ia.has_payment_recorded, false) as has_payment_recorded,
      ia.last_payment_recorded_at,
      coalesce(f.balance_due, 0) as balance_due
    from public.invoices i
    left join invoice_activity ia on ia.invoice_id = i.id
    left join public.invoice_financials_v f on f.id = i.id
    where lower(coalesce(i.status, 'unpaid')) in ('unpaid', 'partially_paid')
      and coalesce(ia.has_payment_recorded, false) = false
      and ia.recipient_user_id is not null
  loop
    age_days := floor(extract(epoch from (now() - rec.reminder_start_at)) / 86400);

    if age_days >= 30 then age_bucket := '30d';
    elsif age_days >= 14 then age_bucket := '14d';
    elsif age_days >= 7 then age_bucket := '7d';
    elsif age_days >= 3 then age_bucket := '3d';
    else age_bucket := null;
    end if;

    if age_bucket is not null then
      fp := 'invoice-aging:' || rec.id || ':' || age_bucket;

      perform public.upsert_notification(
        'global', 'default', rec.recipient_user_id,
        'payment', 'system_generated', 'invoice_aging', fp,
        'Invoice needs payment follow-up',
        'No payment recorded for ' || coalesce(rec.invoice_number, rec.id::text) || ' after ' || age_days || ' days.',
        '/invoices/' || rec.id || '?focus=payment',
        'invoice', rec.id::text,
        case when age_days >= 14 then 'high' when age_days >= 7 then 'medium' else 'low' end,
        jsonb_build_object(
          'age_days', age_days, 'age_bucket', age_bucket,
          'invoice_number', rec.invoice_number, 'status', rec.status,
          'balance_due', rec.balance_due, 'has_payment_recorded', rec.has_payment_recorded
        )
      );
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_invoice_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update public.notifications n
  set state = 'resolved', resolved_at = now()
  where n.scope_type = 'global'
    and n.scope_id = 'default'
    and n.domain = 'payment'
    and n.generator_key = 'invoice_aging'
    and n.state <> 'resolved'
    and exists (
      select 1 from public.invoices i
      where i.id::text = n.entity_id
        and (
          lower(coalesce(i.status, 'unpaid')) in ('paid', 'archived')
          or exists (
            select 1 from public.activity_events ae
            where lower(ae.entity_type) = 'invoice'
              and ae.entity_id::text = n.entity_id
              and upper(ae.event_type) = 'PAYMENT_RECORDED'
          )
        )
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_quotation_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  rec record;
  age_days int;
  fp text;
begin
  for rec in
    with quotation_activity as (
      select
        ae.entity_id::uuid as quotation_id,
        min(ae.created_at) filter (
          where upper(ae.event_type) in ('QUOTATION_CREATED', 'CREATED')
        ) as created_event_at,
        (
          array_agg(ae.actor_id order by ae.created_at asc)
          filter (
            where ae.actor_id is not null
              and upper(ae.event_type) in ('QUOTATION_CREATED', 'CREATED')
          )
        )[1] as recipient_user_id,
        bool_or(upper(ae.event_type) = 'LINKED') as has_linked_event,
        max(ae.created_at) filter (
          where upper(ae.event_type) = 'LINKED'
        ) as linked_at
      from public.activity_events ae
      where lower(ae.entity_type) = 'quotation'
      group by ae.entity_id::uuid
    )
    select
      q.id, q.quotation_number, q.status, q.created_at,
      coalesce(qa.created_event_at, q.created_at) as reminder_start_at,
      qa.recipient_user_id,
      coalesce(qa.has_linked_event, false) as has_linked_event,
      qa.linked_at
    from public.quotations q
    left join quotation_activity qa on qa.quotation_id = q.id
    where lower(coalesce(q.status, 'open')) = 'open'
      and coalesce(qa.has_linked_event, false) = false
      and qa.recipient_user_id is not null
  loop
    age_days := floor(extract(epoch from (now() - rec.reminder_start_at)) / 86400);

    if age_days >= 3 then
      fp := 'quotation-followup:' || rec.id || ':3d';

      perform public.upsert_notification(
        'global', 'default', rec.recipient_user_id,
        'quotation', 'system_generated', 'quotation_followup', fp,
        'Quotation needs follow-up',
        'Follow up on ' || coalesce(rec.quotation_number, rec.id::text) || '. It has been open for ' || age_days || ' days.',
        '/quotations/' || rec.id || '?focus=status',
        'quotation', rec.id::text,
        case when age_days >= 14 then 'high' when age_days >= 7 then 'medium' else 'low' end,
        jsonb_build_object(
          'age_days', age_days, 'quotation_number', rec.quotation_number,
          'status', rec.status, 'has_linked_event', rec.has_linked_event
        )
      );
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_quotation_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update public.notifications n
  set state = 'resolved', resolved_at = now()
  where n.scope_type = 'global'
    and n.scope_id = 'default'
    and n.domain = 'quotation'
    and n.generator_key = 'quotation_followup'
    and n.state <> 'resolved'
    and exists (
      select 1 from public.quotations q
      where q.id::text = n.entity_id
        and (
          lower(coalesce(q.status, 'open')) in ('converted', 'archived')
          or exists (
            select 1 from public.activity_events ae
            where lower(ae.entity_type) = 'quotation'
              and ae.entity_id::text = n.entity_id
              and upper(ae.event_type) = 'LINKED'
          )
        )
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.run_notification_jobs()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.generate_invoice_notifications();
  perform public.resolve_invoice_notifications();
  perform public.generate_quotation_notifications();
  perform public.resolve_quotation_notifications();
end;
$function$;
