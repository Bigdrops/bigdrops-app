


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."device_installations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "installation_id" "text" NOT NULL,
    "user_id" "uuid",
    "platform" "text" DEFAULT 'android'::"text" NOT NULL,
    "device_code" "text" NOT NULL,
    "device_name" "text",
    "active" boolean DEFAULT true NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_by" "uuid",
    "assigned_automatically" boolean DEFAULT true NOT NULL,
    "last_seen_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_installations_device_code_format_check" CHECK (("device_code" ~ '^[A-Z]{2}$'::"text")),
    CONSTRAINT "device_installations_platform_check" CHECK (("platform" = 'android'::"text"))
);


ALTER TABLE "public"."device_installations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_revoke_device_assignment"("p_assignment_id" "uuid") RETURNS "public"."device_installations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  updated_row public.device_installations;
  requester_is_admin boolean := false;
begin
  -- EDIT THIS LINE if your admin flag/role field is different
  select coalesce(p.is_admin, false)
  into requester_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if not coalesce(requester_is_admin, false) then
    raise exception 'Only admins can revoke device assignments';
  end if;

  update public.device_installations
  set
    active = false,
    revoked_at = now(),
    updated_at = now()
  where id = p_assignment_id
    and active = true
  returning * into updated_row;

  if not found then
    raise exception 'active device assignment not found';
  end if;

  return updated_row;
end;
$$;


ALTER FUNCTION "public"."admin_revoke_device_assignment"("p_assignment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_device_assignment_code"("p_assignment_id" "uuid", "p_device_code" "text") RETURNS "public"."device_installations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  normalized_code text := upper(btrim(coalesce(p_device_code, '')));
  updated_row public.device_installations;
  requester_is_admin boolean := false;
begin
  -- EDIT THIS LINE if your admin flag/role field is different
  select coalesce(p.is_admin, false)
  into requester_is_admin
  from public.profiles p
  where p.id = auth.uid();

  if not coalesce(requester_is_admin, false) then
    raise exception 'Only admins can update device assignment codes';
  end if;

  if normalized_code !~ '^[A-Z]{2}$' then
    raise exception 'device code must be exactly two uppercase letters';
  end if;

  update public.device_installations di
  set
    device_code = normalized_code,
    assigned_automatically = false,
    assigned_by = auth.uid(),
    updated_at = now()
  where di.id = p_assignment_id
    and di.active = true
    and not exists (
      select 1
      from public.device_installations other
      where other.device_code = normalized_code
        and other.active = true
        and other.id <> di.id
    )
  returning * into updated_row;

  if not found then
    if exists (
      select 1
      from public.device_installations other
      where other.device_code = normalized_code
        and other.active = true
        and other.id <> p_assignment_id
    ) then
      raise exception 'device code is already assigned to another active installation';
    end if;

    raise exception 'active device assignment not found';
  end if;

  return updated_row;
end;
$_$;


ALTER FUNCTION "public"."admin_update_device_assignment_code"("p_assignment_id" "uuid", "p_device_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
        jsonb_build_object(
          'field', key,
          'old', old_val,
          'new', new_val
        )
      );
    end if;
  end loop;

  return result;
end;
$$;


ALTER FUNCTION "public"."compute_jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_android_device_assignment"("p_installation_id" "text", "p_user_id" "uuid", "p_device_name" "text" DEFAULT 'Android Device'::"text") RETURNS "public"."device_installations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  existing_row public.device_installations;
  result_row public.device_installations;
  candidate_code text;
  attempt integer;
begin
  if p_installation_id is null or btrim(p_installation_id) = '' then
    raise exception 'installation_id is required';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  -- Return existing active assignment for this installation if it exists
  select *
  into existing_row
  from public.device_installations
  where installation_id = btrim(p_installation_id)
    and active = true
  for update
  limit 1;

  if found then
    update public.device_installations
    set
      user_id = p_user_id,
      device_name = coalesce(nullif(btrim(p_device_name), ''), device_name, 'Android Device'),
      last_seen_at = now(),
      revoked_at = null
    where id = existing_row.id
    returning * into existing_row;

    return existing_row;
  end if;

  -- No active assignment yet for this installation: create one safely
  for attempt in 1..30 loop
    candidate_code := public.generate_device_code();

    begin
      insert into public.device_installations (
        installation_id,
        user_id,
        platform,
        device_code,
        device_name,
        active,
        assigned_at,
        assigned_automatically,
        last_seen_at
      )
      values (
        btrim(p_installation_id),
        p_user_id,
        'android',
        candidate_code,
        coalesce(nullif(btrim(p_device_name), ''), 'Android Device'),
        true,
        now(),
        true,
        now()
      )
      returning * into result_row;

      return result_row;

    exception
      when unique_violation then
        -- Another concurrent request may have created this installation already
        select *
        into existing_row
        from public.device_installations
        where installation_id = btrim(p_installation_id)
          and active = true
        limit 1;

        if found then
          update public.device_installations
          set
            user_id = p_user_id,
            device_name = coalesce(nullif(btrim(p_device_name), ''), device_name, 'Android Device'),
            last_seen_at = now(),
            revoked_at = null
          where id = existing_row.id
          returning * into existing_row;

          return existing_row;
        end if;

        -- Otherwise it was probably a code collision. Retry.
        if attempt = 30 then
          raise exception 'Could not allocate a unique device code after % attempts', attempt;
        end if;
    end;
  end loop;

  raise exception 'Unexpected failure ensuring Android device assignment';
end;
$$;


ALTER FUNCTION "public"."ensure_android_device_assignment"("p_installation_id" "text", "p_user_id" "uuid", "p_device_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_device_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
begin
  candidate :=
    substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1) ||
    substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);

  return candidate;
end;
$$;


ALTER FUNCTION "public"."generate_device_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
    left join invoice_activity ia
      on ia.invoice_id = i.id
    left join public.invoice_financials_v f
      on f.id = i.id
    where lower(coalesce(i.status, 'unpaid')) in ('unpaid', 'partially_paid')
      and coalesce(ia.has_payment_recorded, false) = false
      and ia.recipient_user_id is not null
  loop
    age_days := floor(extract(epoch from (now() - rec.reminder_start_at)) / 86400);

    if age_days >= 30 then
      age_bucket := '30d';
    elsif age_days >= 14 then
      age_bucket := '14d';
    elsif age_days >= 7 then
      age_bucket := '7d';
    elsif age_days >= 3 then
      age_bucket := '3d';
    else
      age_bucket := null;
    end if;

    if age_bucket is not null then
      fp := 'invoice-aging:' || rec.id || ':' || age_bucket;

      perform public.upsert_notification(
        'global',
        'default',
        rec.recipient_user_id,
        'payment',
        'system_generated',
        'invoice_aging',
        fp,
        'Invoice needs payment follow-up',
        'No payment recorded for ' || coalesce(rec.invoice_number, rec.id::text) || ' after ' || age_days || ' days.',
        '/invoices/' || rec.id || '?focus=payment',
        'invoice',
        rec.id::text,
        case
          when age_days >= 14 then 'high'
          when age_days >= 7 then 'medium'
          else 'low'
        end,
        jsonb_build_object(
          'age_days', age_days,
          'age_bucket', age_bucket,
          'invoice_number', rec.invoice_number,
          'status', rec.status,
          'balance_due', rec.balance_due,
          'has_payment_recorded', rec.has_payment_recorded
        )
      );
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."generate_invoice_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_quotation_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
      q.id,
      q.quotation_number,
      q.status,
      q.created_at,
      coalesce(qa.created_event_at, q.created_at) as reminder_start_at,
      qa.recipient_user_id,
      coalesce(qa.has_linked_event, false) as has_linked_event,
      qa.linked_at
    from public.quotations q
    left join quotation_activity qa
      on qa.quotation_id = q.id
    where lower(coalesce(q.status, 'open')) = 'open'
      and coalesce(qa.has_linked_event, false) = false
      and qa.recipient_user_id is not null
  loop
    age_days := floor(extract(epoch from (now() - rec.reminder_start_at)) / 86400);

    if age_days >= 3 then
      fp := 'quotation-followup:' || rec.id || ':3d';

      perform public.upsert_notification(
        'global',
        'default',
        rec.recipient_user_id,
        'quotation',
        'system_generated',
        'quotation_followup',
        fp,
        'Quotation needs follow-up',
        'Follow up on ' || coalesce(rec.quotation_number, rec.id::text) || '. It has been open for ' || age_days || ' days.',
        '/quotations/' || rec.id || '?focus=status',
        'quotation',
        rec.id::text,
        case
          when age_days >= 14 then 'high'
          when age_days >= 7 then 'medium'
          else 'low'
        end,
        jsonb_build_object(
          'age_days', age_days,
          'quotation_number', rec.quotation_number,
          'status', rec.status,
          'has_linked_event', rec.has_linked_event
        )
      );
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."generate_quotation_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_device_code_counter_seeds"("p_installation_id" "text" DEFAULT NULL::"text", "p_device_code" "text" DEFAULT NULL::"text") RETURNS TABLE("device_code" "text", "csr_max" integer, "quotation_max" integer, "waybill_max" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  resolved_code text;
begin
  resolved_code := upper(btrim(coalesce(p_device_code, '')));

  if resolved_code = '' and p_installation_id is not null then
    select di.device_code
    into resolved_code
    from public.device_installations di
    where di.installation_id = btrim(p_installation_id)
      and di.active = true
    limit 1;
  end if;

  if resolved_code is null or resolved_code = '' then
    return;
  end if;

  return query
  select
    resolved_code,
    (
      select coalesce(max(substring(c.csr_number from '([0-9]+)$')::int), 0)
      from public.csrs c
      where c.csr_number like 'SASCSR-' || resolved_code || '%'
    ) as csr_max,
    (
      select coalesce(max(substring(q.quotation_number from '([0-9]+)$')::int), 0)
      from public.quotations q
      where q.quotation_number like 'SASQUO-' || resolved_code || '%'
    ) as quotation_max,
    (
      select coalesce(max(substring(w.waybill_number from '([0-9]+)$')::int), 0)
      from public.waybills w
      where w.waybill_number like 'SASWB-' || resolved_code || '%'
    ) as waybill_max;
end;
$_$;


ALTER FUNCTION "public"."get_device_code_counter_seeds"("p_installation_id" "text", "p_device_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_item_suggestions"("search_text" "text", "result_limit" integer DEFAULT 5) RETURNS TABLE("item_id" "uuid", "display_name" "text", "matched_text" "text", "is_alias" boolean, "standard_price" numeric, "last_sold_price" numeric, "usage_count" bigint, "rank_score" integer)
    LANGUAGE "sql" STABLE
    AS $$
  with q as (
    select public.normalize_item_text(coalesce(search_text, '')) as needle
  ),

  master_matches as (
    select
      c.id as item_id,
      c.name as display_name,
      c.name as matched_text,
      false as is_alias,
      c.standard_price,
      coalesce(s.last_sold_price, 0) as last_sold_price,
      coalesce(s.usage_count, 0)::bigint as usage_count,
      (
        case
          when public.normalize_item_text(c.name) = q.needle then 1000
          when public.normalize_item_text(c.name) like q.needle || '%' then 900
          when public.normalize_item_text(c.name) like '%' || q.needle || '%' then 700
          else 0
        end
        + least(coalesce(s.usage_count, 0)::int, 50)
      ) as rank_score
    from public.item_catalog c
    cross join q
    left join public.item_price_summary_v s on s.item_id = c.id
    where c.is_active = true
      and q.needle <> ''
      and public.normalize_item_text(c.name) like '%' || q.needle || '%'
  ),

  alias_matches as (
    select
      c.id as item_id,
      c.name as display_name,
      a.alias_text as matched_text,
      true as is_alias,
      c.standard_price,
      coalesce(s.last_sold_price, 0) as last_sold_price,
      coalesce(s.usage_count, 0)::bigint as usage_count,
      (
        case
          when public.normalize_item_text(a.alias_text) = q.needle then 850
          when public.normalize_item_text(a.alias_text) like q.needle || '%' then 800
          when public.normalize_item_text(a.alias_text) like '%' || q.needle || '%' then 650
          else 0
        end
        + least(coalesce(s.usage_count, 0)::int, 50)
      ) as rank_score
    from public.item_aliases a
    join public.item_catalog c on c.id = a.item_id
    cross join q
    left join public.item_price_summary_v s on s.item_id = c.id
    where c.is_active = true
      and a.is_active = true
      and a.is_retired = false
      and q.needle <> ''
      and public.normalize_item_text(a.alias_text) like '%' || q.needle || '%'
      and public.normalize_item_text(a.alias_text) <> public.normalize_item_text(c.name)
  ),

  combined as (
    select * from master_matches
    union all
    select * from alias_matches
  ),

  deduped as (
    select *
    from (
      select
        c.*,
        row_number() over (
          partition by item_id, matched_text, is_alias
          order by rank_score desc, usage_count desc, display_name asc
        ) as rn
      from combined c
    ) x
    where rn = 1
  )

  select
    item_id,
    display_name,
    matched_text,
    is_alias,
    standard_price,
    last_sold_price,
    usage_count,
    rank_score
  from deduped
  order by
    rank_score desc,
    usage_count desc,
    is_alias asc,
    display_name asc
  limit greatest(coalesce(result_limit, 5), 1);
$$;


ALTER FUNCTION "public"."get_item_suggestions"("search_text" "text", "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO profiles (id, email, is_approved, role)
    VALUES (
        new.id,
            new.email,
                CASE WHEN new.email IN ('jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com') THEN true ELSE false END,
                    CASE WHEN new.email IN ('jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com') THEN 'admin' ELSE 'engineer' END
                      );
                        RETURN new;
                        END;
                        $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_label" "text",
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_label" "text",
    "source" "text" DEFAULT 'web'::"text" NOT NULL,
    "scope_type" "text" DEFAULT 'app'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reason" "text",
    CONSTRAINT "activity_events_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['invoice'::"text", 'quotation'::"text", 'project'::"text"]))),
    CONSTRAINT "activity_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['CREATED'::"text", 'UPDATED'::"text", 'STATUS_CHANGED'::"text", 'PAYMENT_RECORDED'::"text", 'LINKED'::"text", 'UNLINKED'::"text", 'NOTE_ADDED'::"text", 'DOCUMENT_ADDED'::"text", 'ARCHIVED'::"text", 'UNARCHIVED'::"text"]))),
    CONSTRAINT "activity_events_source_check" CHECK (("source" = ANY (ARRAY['web'::"text", 'android'::"text", 'import'::"text", 'admin'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."activity_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text" DEFAULT NULL::"text", "p_event_type" "text" DEFAULT 'UPDATED'::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_scope_type" "text" DEFAULT 'app'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.activity_events;
begin
  insert into public.activity_events (
    entity_type,
    entity_id,
    entity_label,
    event_type,
    actor_id,
    actor_label,
    source,
    scope_type,
    metadata,
    reason
  )
  values (
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_event_type,
    p_actor_id,
    p_actor_label,
    p_source,
    p_scope_type,
    coalesce(p_metadata, '{}'::jsonb),
    p_reason
  )
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."log_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_event_type" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_item_text"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select trim(
    regexp_replace(
      lower(
        replace(
          replace(
            replace(
              coalesce(input, ''),
              'mm²', 'sqmm'
            ),
            'mm2', 'sqmm'
          ),
          '&', 'and'
        )
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;


ALTER FUNCTION "public"."normalize_item_text"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_event_type" "text", "p_entity_label" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_scope_type" "text" DEFAULT 'app'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_reason" "text" DEFAULT NULL::"text", "p_dedupe_seconds" integer DEFAULT 0) RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    'CREATED',
    'UPDATED',
    'STATUS_CHANGED',
    'PAYMENT_RECORDED',
    'LINKED',
    'UNLINKED',
    'NOTE_ADDED',
    'DOCUMENT_ADDED',
    'ARCHIVED',
    'UNARCHIVED'
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
    entity_type,
    entity_id,
    entity_label,
    event_type,
    actor_id,
    actor_label,
    source,
    scope_type,
    metadata,
    reason
  )
  values (
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_event_type,
    v_actor_id,
    p_actor_label,
    coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'),
    coalesce(p_metadata, '{}'::jsonb),
    p_reason
  )
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."record_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_event_type" "text", "p_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text", "p_dedupe_seconds" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_label" "text",
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_label" "text",
    "source" "text" DEFAULT 'web'::"text" NOT NULL,
    "scope_type" "text" DEFAULT 'app'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reason" "text",
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['CREATE'::"text", 'UPDATE'::"text", 'DELETE'::"text", 'STATUS_CHANGE'::"text", 'LINK'::"text", 'UNLINK'::"text"]))),
    CONSTRAINT "audit_logs_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['invoice'::"text", 'quotation'::"text", 'project'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_audit_log"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_action" "text", "p_old_data" "jsonb", "p_new_data" "jsonb", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_scope_type" "text" DEFAULT 'app'::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."audit_logs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  -- Skip if no real changes
  if jsonb_array_length(v_changes) = 0 then
    return null;
  end if;

  insert into public.audit_logs (
    entity_type,
    entity_id,
    entity_label,
    action,
    actor_id,
    actor_label,
    source,
    scope_type,
    changes,
    reason
  )
  values (
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_action,
    v_actor_id,
    p_actor_label,
    coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'),
    v_changes,
    p_reason
  )
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."record_audit_log"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_action" "text", "p_old_data" "jsonb", "p_new_data" "jsonb", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_invoice_created"("p_invoice_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'CREATED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'status', v_invoice.status,
      'project_id', v_invoice.project_id,
      'client_id', v_invoice.client_id,
      'total', v_invoice.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$$;


ALTER FUNCTION "public"."record_invoice_created"("p_invoice_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_invoice_status_changed"("p_invoice_id" "uuid", "p_old_status" "text" DEFAULT NULL::"text", "p_new_status" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_invoice.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_invoice_status_changed"("p_invoice_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_payment_recorded"("p_invoice_id" "uuid", "p_amount" numeric DEFAULT NULL::numeric, "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'PAYMENT_RECORDED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'amount', p_amount,
      'status', v_invoice.status,
      'total', v_invoice.total
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_payment_recorded"("p_invoice_id" "uuid", "p_amount" numeric, "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_project_document_added"("p_project_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'DOCUMENT_ADDED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_project_document_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_project_linked_activity"("p_project_id" "uuid", "p_linked_entity_type" "text", "p_linked_entity_id" "uuid", "p_linked_entity_label" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  if p_linked_entity_type not in ('invoice', 'quotation') then
    raise exception 'Unsupported linked entity type: %', p_linked_entity_type;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'LINKED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'linked_entity_type', p_linked_entity_type,
      'linked_entity_id', p_linked_entity_id,
      'linked_entity_label', p_linked_entity_label
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_project_linked_activity"("p_project_id" "uuid", "p_linked_entity_type" "text", "p_linked_entity_id" "uuid", "p_linked_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_project_note_added"("p_project_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'NOTE_ADDED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_project_note_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_project_updated"("p_project_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'UPDATED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_project_updated"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_quotation_created"("p_quotation_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'CREATED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'status', v_quotation.status,
      'project_id', v_quotation.project_id,
      'client_id', v_quotation.client_id,
      'total', v_quotation.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$$;


ALTER FUNCTION "public"."record_quotation_created"("p_quotation_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_quotation_linked"("p_quotation_id" "uuid", "p_invoice_id" "uuid" DEFAULT NULL::"uuid", "p_project_id" "uuid" DEFAULT NULL::"uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'LINKED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'invoice_id', p_invoice_id,
      'project_id', p_project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_quotation_linked"("p_quotation_id" "uuid", "p_invoice_id" "uuid", "p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_quotation_status_changed"("p_quotation_id" "uuid", "p_old_status" "text" DEFAULT NULL::"text", "p_new_status" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_actor_label" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."activity_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_quotation.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$$;


ALTER FUNCTION "public"."record_quotation_status_changed"("p_quotation_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_invoice_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.notifications n
  set
    state = 'resolved',
    resolved_at = now()
  where n.scope_type = 'global'
    and n.scope_id = 'default'
    and n.domain = 'payment'
    and n.generator_key = 'invoice_aging'
    and n.state <> 'resolved'
    and exists (
      select 1
      from public.invoices i
      where i.id::text = n.entity_id
        and (
          lower(coalesce(i.status, 'unpaid')) in ('paid', 'archived')
          or exists (
            select 1
            from public.activity_events ae
            where lower(ae.entity_type) = 'invoice'
              and ae.entity_id::text = n.entity_id
              and upper(ae.event_type) = 'PAYMENT_RECORDED'
          )
        )
    );
end;
$$;


ALTER FUNCTION "public"."resolve_invoice_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_notification"("p_user_id" "uuid", "p_fingerprint" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.notifications
  set
    state = 'resolved',
    resolved_at = now()
  where user_id = p_user_id
    and fingerprint = p_fingerprint;
end;
$$;


ALTER FUNCTION "public"."resolve_notification"("p_user_id" "uuid", "p_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_fingerprint" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."resolve_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_quotation_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.notifications n
  set
    state = 'resolved',
    resolved_at = now()
  where n.scope_type = 'global'
    and n.scope_id = 'default'
    and n.domain = 'quotation'
    and n.generator_key = 'quotation_followup'
    and n.state <> 'resolved'
    and exists (
      select 1
      from public.quotations q
      where q.id::text = n.entity_id
        and (
          lower(coalesce(q.status, 'open')) in ('converted', 'archived')
          or exists (
            select 1
            from public.activity_events ae
            where lower(ae.entity_type) = 'quotation'
              and ae.entity_id::text = n.entity_id
              and upper(ae.event_type) = 'LINKED'
          )
        )
    );
end;
$$;


ALTER FUNCTION "public"."resolve_quotation_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_invoice_to_quotation_transaction"("p_invoice_id" "uuid", "p_quotation_payload" "jsonb", "p_quotation_items_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_created_quotation JSONB;
    v_quotation_id UUID;
    v_row quotations;
    v_item JSONB;
BEGIN
    -- Insert quotation
    INSERT INTO quotations (
        quotation_number, po_number, quotation_title, client_id, client_name, project_id,
        issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping,
        discount, vat, wht, subtotal, install_rate_total, total, amount_in_words, custom_fields
    )
    SELECT
        p_quotation_payload->>'quotation_number',
        p_quotation_payload->>'po_number',
        p_quotation_payload->>'quotation_title',
        NULLIF(p_quotation_payload->>'client_id', '')::UUID,
        p_quotation_payload->>'client_name',
        NULLIF(p_quotation_payload->>'project_id', '')::UUID,
        (p_quotation_payload->>'issue_date')::DATE,
        (p_quotation_payload->>'valid_until')::DATE,
        -- STATUS MAPPING: invoice status → quotation status
        CASE 
            WHEN p_quotation_payload->>'status' IN ('unpaid', 'partially_paid', 'paid') THEN 'accepted'
            WHEN p_quotation_payload->>'status' = 'archived' THEN 'expired'
            ELSE 'draft'
        END,
        p_quotation_payload->>'notes',
        p_quotation_payload->>'terms',
        COALESCE((p_quotation_payload->>'workmanship')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'transportation')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'shipping')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'discount')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'vat')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'wht')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'subtotal')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'install_rate_total')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'total')::NUMERIC, 0),
        p_quotation_payload->>'amount_in_words',
        (p_quotation_payload->>'custom_fields')::JSONB
    RETURNING * INTO v_row;

    v_created_quotation := to_jsonb(v_row);
    v_quotation_id := v_row.id;

    -- Insert quotation items (all fields included)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_quotation_items_payload)
    LOOP
        INSERT INTO quotation_items (
            quotation_id, description, quantity, unit_price, amount, 
            unit, list_index, row_type, group_name,
            item_id, sub_description, make, install_rate, install_rate_override,
            vat_rate, discount_rate, group_id, sort_order, image_url, custom_data,
            section
        )
        VALUES (
            v_quotation_id,
            v_item->>'description',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            v_item->>'unit',
            (v_item->>'list_index')::INTEGER,
            v_item->>'row_type',
            v_item->>'group_name',
            NULLIF(v_item->>'item_id', '')::UUID,
            v_item->>'sub_description',
            v_item->>'make',
            (v_item->>'install_rate')::NUMERIC,
            (v_item->>'install_rate_override')::BOOLEAN,
            (v_item->>'vat_rate')::NUMERIC,
            (v_item->>'discount_rate')::NUMERIC,
            NULLIF(v_item->>'group_id', '')::UUID,
            COALESCE((v_item->>'sort_order')::INTEGER, (v_item->>'list_index')::INTEGER),
            v_item->>'image_url',
            (v_item->>'custom_data')::JSONB,
            v_item->>'section'
        );
    END LOOP;

    -- Delete invoice items and invoice
    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;
    DELETE FROM invoices WHERE id = p_invoice_id;

    RETURN v_created_quotation;
END;
$$;


ALTER FUNCTION "public"."revert_invoice_to_quotation_transaction"("p_invoice_id" "uuid", "p_quotation_payload" "jsonb", "p_quotation_items_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_notification_jobs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.generate_invoice_notifications();
  perform public.resolve_invoice_notifications();

  perform public.generate_quotation_notifications();
  perform public.resolve_quotation_notifications();
end;
$$;


ALTER FUNCTION "public"."run_notification_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_row_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_row_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."stamp_row_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by = auth.uid();
    end if;

    if new.updated_by is null then
      new.updated_by = coalesce(new.created_by, auth.uid());
    end if;

    if new.created_at is null then
      new.created_at = now();
    end if;

    if new.updated_at is null then
      new.updated_at = now();
    end if;
  elsif tg_op = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), new.updated_by);
    new.updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."stamp_row_ownership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_notification"("p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.notifications (
    user_id,
    domain,
    source,
    generator_key,
    fingerprint,
    title,
    message,
    route,
    entity_type,
    entity_id,
    severity,
    metadata
  )
  values (
    p_user_id,
    p_domain,
    p_source,
    p_generator_key,
    p_fingerprint,
    p_title,
    p_message,
    p_route,
    p_entity_type,
    p_entity_id,
    p_severity,
    p_metadata
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
$$;


ALTER FUNCTION "public"."upsert_notification"("p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.notifications (
    scope_type,
    scope_id,
    user_id,
    domain,
    source,
    generator_key,
    fingerprint,
    title,
    message,
    route,
    entity_type,
    entity_id,
    severity,
    metadata
  )
  values (
    p_scope_type,
    p_scope_id,
    p_user_id,
    p_domain,
    p_source,
    p_generator_key,
    p_fingerprint,
    p_title,
    p_message,
    p_route,
    p_entity_type,
    p_entity_id,
    p_severity,
    coalesce(p_metadata, '{}'::jsonb)
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
$$;


ALTER FUNCTION "public"."upsert_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bank_name" "text",
    "account_name" "text",
    "account_number" "text",
    "sort_code" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boq_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "boq_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "row_type" "text" NOT NULL,
    "description" "text",
    "unit" "text",
    "quantity" numeric,
    "section_title" "text",
    "cells" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    CONSTRAINT "boq_rows_row_type_check" CHECK (("row_type" = ANY (ARRAY['section_header'::"text", 'item'::"text", 'option'::"text"])))
);


ALTER TABLE "public"."boq_rows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "client_name" "text",
    "project_name" "text",
    "template_id" "text" DEFAULT 'bordered_schedule'::"text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."boqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "category" "text",
    "notes" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city" "text",
    "state" "text",
    "contact_person" "text",
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."csrs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "csr_number" "text" NOT NULL,
    "date" "date",
    "client_id" "uuid" DEFAULT "gen_random_uuid"(),
    "client_name" "text",
    "address" "text",
    "problem_reported" "text",
    "equipment_type" "text",
    "equipment_location" "text",
    "make" "text",
    "model" "text",
    "serial_no" "text",
    "capacity" "text",
    "voltage" "text",
    "frequency" "text",
    "battery" "text",
    "temperature" "text",
    "pressure" "text",
    "hours" "text",
    "materials_used" "text",
    "service_rendered" "text",
    "engineer_remarks" "text",
    "status" "text",
    "start_date" "date",
    "end_date" "date",
    "customer_feedback" "text",
    "acknowledgement_name" "text",
    "linked_invoice_id" "uuid" DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone,
    "start_time" "text",
    "end_time" "text",
    "po_number" "text",
    "show_po" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "project_id" "uuid",
    "defects_found" "text",
    "system_down" boolean DEFAULT false,
    "technician_signatory_id" "uuid",
    "call_type" "text"
);


ALTER TABLE "public"."csrs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_code" "text" NOT NULL,
    "doc_type" "text" NOT NULL,
    "last_sequence" integer DEFAULT 0
);


ALTER TABLE "public"."device_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_code" "text" NOT NULL,
    "device_name" "text" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."invoice_financials_v" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "invoice_number",
    NULL::"uuid" AS "client_id",
    NULL::"text" AS "client_name",
    NULL::"uuid" AS "project_id",
    NULL::"date" AS "issue_date",
    NULL::"text" AS "due_date",
    NULL::numeric AS "total_gross",
    NULL::"text" AS "status",
    NULL::numeric AS "cash_received",
    NULL::numeric AS "wht_received",
    NULL::numeric AS "settled_total",
    NULL::numeric AS "balance_due",
    NULL::"text" AS "computed_status";


ALTER VIEW "public"."invoice_financials_v" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text" NOT NULL,
    "sub_description" "text",
    "make" "text",
    "quantity" numeric,
    "unit" "text",
    "unit_price" numeric,
    "amount" numeric,
    "vat_rate" numeric,
    "install_rate" numeric,
    "install_rate_taxable" boolean,
    "show_install_rate" boolean,
    "sort_order" integer,
    "formula" "text",
    "row_type" "text",
    "group_name" "text",
    "invoice_id" "uuid" DEFAULT "gen_random_uuid"(),
    "image_url" "text",
    "custom_data" "jsonb" DEFAULT '{}'::"jsonb",
    "discount_rate" numeric DEFAULT 0,
    "install_rate_override" boolean DEFAULT false,
    "group_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "item_id" "uuid"
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "invoice_number" "text" NOT NULL,
    "client_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_name" "text",
    "issue_date" "date",
    "due_date" "text",
    "status" "text" DEFAULT 'unpaid'::"text",
    "subtotal" numeric,
    "vat" numeric,
    "wht" numeric,
    "discount" numeric,
    "workmanship" numeric,
    "transportation" numeric,
    "shipping" numeric,
    "install_rate_total" numeric,
    "total" numeric,
    "notes" "text",
    "terms" "text",
    "payment_terms" "text",
    "document_type" "text",
    "custom_fields" "text",
    "linked_quote_id" "uuid" DEFAULT "gen_random_uuid"(),
    "linked_csr_id" "uuid" DEFAULT "gen_random_uuid"(),
    "work_duration" "text",
    "amount_in_words" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_title" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "archived_at" timestamp with time zone,
    "project_id" "uuid",
    "po_number" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_type" "text" DEFAULT 'app'::"text",
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['unpaid'::"text", 'partially_paid'::"text", 'paid'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "alias_text" "text" NOT NULL,
    "normalized_alias_text" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_retired" boolean DEFAULT false NOT NULL,
    "source" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."item_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "normalized_name" "text" NOT NULL,
    "standard_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."item_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_import_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_name" "text",
    "source_type" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "item_import_batches_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'applied'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."item_import_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_merge_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid",
    "from_item_id" "uuid",
    "to_item_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "item_merge_log_action_check" CHECK (("action" = ANY (ARRAY['merge'::"text", 'alias_added'::"text", 'alias_retired'::"text", 'standard_price_updated'::"text", 'relinked_rows'::"text"])))
);


ALTER TABLE "public"."item_merge_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_id" "uuid" NOT NULL,
    "description" "text",
    "sub_description" "text",
    "make" "text",
    "quantity" numeric(14,2) DEFAULT 1 NOT NULL,
    "unit" "text",
    "unit_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "install_rate" numeric(14,2),
    "vat_rate" numeric(8,4),
    "discount_rate" numeric(8,4),
    "row_type" "text" DEFAULT 'standard'::"text" NOT NULL,
    "group_id" "text",
    "group_name" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "custom_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "formula" "text",
    "install_rate_override" boolean DEFAULT false,
    "install_rate_taxable" boolean,
    "show_install_rate" boolean,
    "item_id" "uuid",
    CONSTRAINT "quotation_items_row_type_check" CHECK (("row_type" = ANY (ARRAY['standard'::"text", 'group_header'::"text"])))
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."item_price_summary_v" AS
 WITH "usage_rows" AS (
         SELECT "ii"."item_id",
            "ii"."unit_price",
            "ii"."updated_at" AS "used_at",
            'invoice'::"text" AS "source_type",
            "ii"."invoice_id" AS "source_document_id"
           FROM "public"."invoice_items" "ii"
          WHERE (("ii"."item_id" IS NOT NULL) AND (COALESCE("ii"."row_type", 'standard'::"text") = 'standard'::"text"))
        UNION ALL
         SELECT "qi"."item_id",
            "qi"."unit_price",
            "qi"."updated_at" AS "used_at",
            'quotation'::"text" AS "source_type",
            "qi"."quotation_id" AS "source_document_id"
           FROM "public"."quotation_items" "qi"
          WHERE (("qi"."item_id" IS NOT NULL) AND (COALESCE("qi"."row_type", 'standard'::"text") = 'standard'::"text"))
        ), "last_usage" AS (
         SELECT DISTINCT ON ("usage_rows"."item_id") "usage_rows"."item_id",
            "usage_rows"."unit_price" AS "last_sold_price",
            "usage_rows"."used_at" AS "last_used_at",
            "usage_rows"."source_type" AS "last_source_type",
            "usage_rows"."source_document_id" AS "last_source_document_id"
           FROM "usage_rows"
          ORDER BY "usage_rows"."item_id", "usage_rows"."used_at" DESC
        ), "usage_agg" AS (
         SELECT "usage_rows"."item_id",
            "count"(*) AS "usage_count",
            "min"("usage_rows"."unit_price") AS "min_price",
            "max"("usage_rows"."unit_price") AS "max_price",
            "avg"("usage_rows"."unit_price") AS "avg_price"
           FROM "usage_rows"
          GROUP BY "usage_rows"."item_id"
        )
 SELECT "c"."id" AS "item_id",
    "c"."name",
    "c"."standard_price",
    "c"."is_active",
    COALESCE("a"."usage_count", (0)::bigint) AS "usage_count",
    "a"."min_price",
    "a"."max_price",
    "a"."avg_price",
    "l"."last_sold_price",
    "l"."last_used_at",
    "l"."last_source_type",
    "l"."last_source_document_id"
   FROM (("public"."item_catalog" "c"
     LEFT JOIN "usage_agg" "a" ON (("a"."item_id" = "c"."id")))
     LEFT JOIN "last_usage" "l" ON (("l"."item_id" = "c"."id")));


ALTER VIEW "public"."item_price_summary_v" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "event_key" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "threshold_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_preferences_channel_check" CHECK (("channel" = ANY (ARRAY['in_app'::"text", 'push'::"text", 'email'::"text"]))),
    CONSTRAINT "notification_preferences_threshold_check" CHECK ((("threshold_days" IS NULL) OR ("threshold_days" > 0)))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "generator_key" "text",
    "run_at" timestamp with time zone DEFAULT "now"(),
    "status" "text",
    "message" "text"
);


ALTER TABLE "public"."notification_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "source" "text" NOT NULL,
    "generator_key" "text" NOT NULL,
    "fingerprint" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "route" "text",
    "entity_type" "text",
    "entity_id" "text",
    "severity" "text" DEFAULT 'low'::"text" NOT NULL,
    "state" "text" DEFAULT 'unread'::"text" NOT NULL,
    "first_generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_type" "text" DEFAULT 'tenant'::"text" NOT NULL,
    "scope_id" "text" DEFAULT 'default'::"text" NOT NULL,
    CONSTRAINT "notifications_domain_check" CHECK (("domain" = ANY (ARRAY['payment'::"text", 'quotation'::"text", 'project'::"text", 'compliance'::"text", 'item_library'::"text", 'operations'::"text"]))),
    CONSTRAINT "notifications_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "notifications_source_check" CHECK (("source" = ANY (ARRAY['system_generated'::"text", 'event_driven'::"text"]))),
    CONSTRAINT "notifications_state_check" CHECK (("state" = ANY (ARRAY['unread'::"text", 'read'::"text", 'dismissed'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid",
    "amount" numeric NOT NULL,
    "date" "date" NOT NULL,
    "method" "text",
    "reference" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cash_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "wht_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "currency_code" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "wht_rate" numeric(5,2),
    "wht_type" "text",
    "wht_certificate_ref" "text",
    "recorded_by" "uuid",
    "voided_at" timestamp with time zone,
    "void_reason" "text",
    "source" "text" DEFAULT 'live'::"text",
    "bank_account_id" "uuid"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "is_approved" boolean DEFAULT false,
    "role" "text" DEFAULT 'engineer'::"text",
    "assigned_device_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "has_password" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "type" "text" DEFAULT 'other'::"text" NOT NULL,
    "title" "text",
    "reference_number" "text",
    "date" "date",
    "from_party" "text",
    "to_party" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw_input" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vat" numeric(14,2) DEFAULT 0,
    "wht" numeric(14,2) DEFAULT 0,
    "total" numeric(14,2) DEFAULT 0,
    "voucher_number" "text"
);


ALTER TABLE "public"."project_documents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."project_financials_v" AS
SELECT
    NULL::"uuid" AS "project_id",
    NULL::character varying AS "project_name",
    NULL::"uuid" AS "client_id",
    NULL::character varying AS "client_name",
    NULL::character varying AS "status",
    NULL::bigint AS "invoice_count",
    NULL::numeric AS "total_invoiced",
    NULL::numeric AS "cash_collected",
    NULL::numeric AS "wht_collected",
    NULL::numeric AS "total_collected",
    NULL::numeric AS "outstanding";


ALTER VIEW "public"."project_financials_v" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "client_id" "uuid",
    "client_name" character varying,
    "status" character varying DEFAULT 'active'::character varying,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "project_value" numeric,
    "po_number" character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "location" character varying,
    "archived_at" timestamp with time zone,
    "project_code" "text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_type" "text" DEFAULT 'app'::"text",
    CONSTRAINT "projects_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'on_hold'::character varying, 'cancelled'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_delivery_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "token_id" "uuid",
    "provider" "text" DEFAULT 'fcm'::"text" NOT NULL,
    "provider_message_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_delivery_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."push_delivery_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_device_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "device_id" "text",
    "app_version" "text",
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_device_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_number" "text" NOT NULL,
    "quotation_title" "text",
    "client_id" "uuid",
    "client_name" "text",
    "project_id" "uuid",
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "valid_until" "date",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "notes" "text",
    "terms" "text",
    "workmanship" numeric(14,2) DEFAULT 0 NOT NULL,
    "transportation" numeric(14,2) DEFAULT 0 NOT NULL,
    "shipping" numeric(14,2) DEFAULT 0 NOT NULL,
    "discount" numeric(14,2) DEFAULT 0 NOT NULL,
    "vat" numeric(14,2) DEFAULT 0 NOT NULL,
    "wht" numeric(14,2) DEFAULT 0 NOT NULL,
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "install_rate_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "amount_in_words" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "po_number" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "scope_type" "text" DEFAULT 'app'::"text",
    CONSTRAINT "quotations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'converted'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfq_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "description" "text",
    "quantity" numeric DEFAULT 0,
    "unit" "text",
    "specification" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."rfq_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_number" "text" NOT NULL,
    "title" "text",
    "vendor_name" "text",
    "vendor_contact" "text",
    "issue_date" "date",
    "expiry_date" "date",
    "show_brand_name" boolean DEFAULT false,
    "brand_name_override" "text",
    "background_mode" "text" DEFAULT 'palette'::"text",
    "background_primary" "text",
    "background_secondary" "text",
    "palette_name" "text",
    "text_color" "text",
    "accent_color" "text",
    "export_order_seed" integer,
    "notes" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."rfqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "company_name" "text",
    "company_tagline" "text",
    "company_address" "text",
    "company_city" "text",
    "company_phone" "text",
    "company_email" "text",
    "company_website" "text",
    "bank_name" "text",
    "bank_account_name" "text",
    "bank_account_number" "text",
    "bank_sort_code" "text",
    "footer_text" "text",
    "company_logo_url" "text",
    "signature_url" "text",
    "custom_info" "text" DEFAULT '[]'::"text",
    "app_background_color" "text",
    "app_card_color" "text",
    "app_theme_preset_id" "text",
    "app_theme_tokens" "jsonb"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signatories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "role" "text",
    "signature_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."signatories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_filings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settings_id" integer NOT NULL,
    "tax_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "amount_due" numeric(15,2) DEFAULT 0 NOT NULL,
    "amount_paid" numeric(15,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" "date",
    "receipt_reference" "text",
    "portal_reference" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tax_filings_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ready'::"text", 'filed'::"text", 'paid'::"text", 'overdue'::"text"]))),
    CONSTRAINT "tax_filings_tax_type_check" CHECK (("tax_type" = ANY (ARRAY['vat'::"text", 'wht'::"text", 'cit'::"text"])))
);


ALTER TABLE "public"."tax_filings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_input_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settings_id" integer NOT NULL,
    "date" "date" NOT NULL,
    "vendor_name" "text",
    "category" "text",
    "reference" "text",
    "net_amount" numeric(15,2) DEFAULT 0 NOT NULL,
    "vat_amount" numeric(15,2) DEFAULT 0 NOT NULL,
    "is_recoverable" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tax_input_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settings_id" integer NOT NULL,
    "tax_type" "text" NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "linked_filing_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tax_reminders_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'due'::"text", 'overdue'::"text", 'resolved'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "tax_reminders_tax_type_check" CHECK (("tax_type" = ANY (ARRAY['vat'::"text", 'wht'::"text", 'cit'::"text"])))
);


ALTER TABLE "public"."tax_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settings_id" integer NOT NULL,
    "tin" "text",
    "vat_enabled" boolean DEFAULT false NOT NULL,
    "vat_threshold" numeric(15,2) DEFAULT 0 NOT NULL,
    "threshold_basis" "text",
    "cit_category" "text",
    "year_end_month" integer,
    "year_end_day" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tax_settings_year_end_day_check" CHECK ((("year_end_day" IS NULL) OR (("year_end_day" >= 1) AND ("year_end_day" <= 31)))),
    CONSTRAINT "tax_settings_year_end_month_check" CHECK ((("year_end_month" IS NULL) OR (("year_end_month" >= 1) AND ("year_end_month" <= 12))))
);


ALTER TABLE "public"."tax_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_last_invoice_activity" AS
 SELECT "i"."id" AS "invoice_id",
    "i"."invoice_number",
    "i"."status",
    "max"("ae"."created_at") AS "last_activity_at"
   FROM ("public"."invoices" "i"
     LEFT JOIN "public"."activity_events" "ae" ON ((("ae"."entity_type" = 'invoice'::"text") AND ("ae"."entity_id" = "i"."id"))))
  GROUP BY "i"."id", "i"."invoice_number", "i"."status";


ALTER VIEW "public"."v_last_invoice_activity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_last_project_activity" AS
 SELECT "p"."id" AS "project_id",
    "p"."project_code",
    "p"."name" AS "project_name",
    "max"("ae"."created_at") AS "last_activity_at"
   FROM ("public"."projects" "p"
     LEFT JOIN "public"."activity_events" "ae" ON ((("ae"."entity_type" = 'project'::"text") AND ("ae"."entity_id" = "p"."id"))))
  GROUP BY "p"."id", "p"."project_code", "p"."name";


ALTER VIEW "public"."v_last_project_activity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_last_quotation_activity" AS
 SELECT "q"."id" AS "quotation_id",
    "q"."quotation_number",
    "q"."status",
    "max"("ae"."created_at") AS "last_activity_at"
   FROM ("public"."quotations" "q"
     LEFT JOIN "public"."activity_events" "ae" ON ((("ae"."entity_type" = 'quotation'::"text") AND ("ae"."entity_id" = "q"."id"))))
  GROUP BY "q"."id", "q"."quotation_number", "q"."status";


ALTER VIEW "public"."v_last_quotation_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waybills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "waybill_number" "text" NOT NULL,
    "type" "text" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone,
    "sender_name" "text",
    "receiver_name" "text",
    "receiver_signature_url" "text",
    "receiver_description" "text",
    "client_id" "uuid",
    "client_name" "text",
    "project_id" "uuid",
    "invoice_id" "uuid",
    "po_number" "text",
    "vehicle_plate" "text",
    "delivery_location" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    CONSTRAINT "waybills_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'dispatched'::"text", 'delivered'::"text"]))),
    CONSTRAINT "waybills_type_check" CHECK (("type" = ANY (ARRAY['internal'::"text", 'external'::"text"])))
);


ALTER TABLE "public"."waybills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wht_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "client_name" "text",
    "gross_base_amount" numeric(15,2),
    "wht_rate" numeric(15,2),
    "wht_amount" numeric(15,2),
    "receipt_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "receipt_number" "text",
    "receipt_file_url" "text",
    "received_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wht_receipts_status_check" CHECK (("receipt_status" = ANY (ARRAY['pending'::"text", 'requested'::"text", 'received'::"text", 'verified'::"text"])))
);


ALTER TABLE "public"."wht_receipts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boq_rows"
    ADD CONSTRAINT "boq_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boqs"
    ADD CONSTRAINT "boqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."csrs"
    ADD CONSTRAINT "csrs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_installations"
    ADD CONSTRAINT "device_installations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_sequences"
    ADD CONSTRAINT "device_sequences_device_code_doc_type_key" UNIQUE ("device_code", "doc_type");



ALTER TABLE ONLY "public"."device_sequences"
    ADD CONSTRAINT "device_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_device_code_key" UNIQUE ("device_code");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_aliases"
    ADD CONSTRAINT "item_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_catalog"
    ADD CONSTRAINT "item_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_import_batches"
    ADD CONSTRAINT "item_import_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_merge_log"
    ADD CONSTRAINT "item_merge_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_runs"
    ADD CONSTRAINT "notification_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_documents"
    ADD CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_delivery_logs"
    ADD CONSTRAINT "push_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_device_tokens"
    ADD CONSTRAINT "push_device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_quotation_number_key" UNIQUE ("quotation_number");



ALTER TABLE ONLY "public"."rfq_items"
    ADD CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signatories"
    ADD CONSTRAINT "signatories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_filings"
    ADD CONSTRAINT "tax_filings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_input_entries"
    ADD CONSTRAINT "tax_input_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_reminders"
    ADD CONSTRAINT "tax_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_settings"
    ADD CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_settings"
    ADD CONSTRAINT "tax_settings_settings_id_key" UNIQUE ("settings_id");



ALTER TABLE ONLY "public"."waybills"
    ADD CONSTRAINT "waybills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wht_receipts"
    ADD CONSTRAINT "wht_receipts_payment_id_key" UNIQUE ("payment_id");



ALTER TABLE ONLY "public"."wht_receipts"
    ADD CONSTRAINT "wht_receipts_pkey" PRIMARY KEY ("id");



CREATE INDEX "csrs_po_number_idx" ON "public"."csrs" USING "btree" ("po_number");



CREATE INDEX "idx_activity_events_actor" ON "public"."activity_events" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_activity_events_entity" ON "public"."activity_events" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "idx_activity_events_event_type" ON "public"."activity_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_activity_events_scope" ON "public"."activity_events" USING "btree" ("scope_type", "created_at" DESC);



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_audit_logs_actor" ON "public"."audit_logs" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_scope" ON "public"."audit_logs" USING "btree" ("scope_type", "created_at" DESC);



CREATE INDEX "idx_boq_rows_boq_sort" ON "public"."boq_rows" USING "btree" ("boq_id", "sort_order");



CREATE INDEX "idx_boqs_archived_active" ON "public"."boqs" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_boqs_archived_at" ON "public"."boqs" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_clients_archived_at" ON "public"."clients" USING "btree" ("archived_at");



CREATE INDEX "idx_clients_name" ON "public"."clients" USING "btree" ("name");



CREATE INDEX "idx_csrs_archived_active" ON "public"."csrs" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_csrs_archived_at" ON "public"."csrs" USING "btree" ("archived_at");



CREATE INDEX "idx_csrs_client_id" ON "public"."csrs" USING "btree" ("client_id");



CREATE INDEX "idx_csrs_created_at" ON "public"."csrs" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_csrs_csr_number_unique" ON "public"."csrs" USING "btree" ("csr_number") WHERE ("csr_number" IS NOT NULL);



CREATE INDEX "idx_csrs_project_id" ON "public"."csrs" USING "btree" ("project_id");



CREATE INDEX "idx_csrs_status" ON "public"."csrs" USING "btree" ("status");



CREATE INDEX "idx_csrs_technician_signatory_id" ON "public"."csrs" USING "btree" ("technician_signatory_id");



CREATE UNIQUE INDEX "idx_device_installations_active_code" ON "public"."device_installations" USING "btree" ("device_code") WHERE ("active" = true);



CREATE UNIQUE INDEX "idx_device_installations_active_installation" ON "public"."device_installations" USING "btree" ("installation_id") WHERE ("active" = true);



CREATE INDEX "idx_device_installations_last_seen_at" ON "public"."device_installations" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_device_installations_user_id" ON "public"."device_installations" USING "btree" ("user_id");



CREATE INDEX "idx_device_sequences_device_code" ON "public"."device_sequences" USING "btree" ("device_code");



CREATE INDEX "idx_devices_device_code" ON "public"."devices" USING "btree" ("device_code");



CREATE INDEX "idx_devices_user_id" ON "public"."devices" USING "btree" ("user_id");



CREATE INDEX "idx_invoice_items_description" ON "public"."invoice_items" USING "btree" ("description");



CREATE INDEX "idx_invoice_items_invoice_id" ON "public"."invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_items_item_id" ON "public"."invoice_items" USING "btree" ("item_id");



CREATE INDEX "idx_invoices_archived_at" ON "public"."invoices" USING "btree" ("archived_at");



CREATE INDEX "idx_invoices_client_id" ON "public"."invoices" USING "btree" ("client_id");



CREATE INDEX "idx_invoices_created_at" ON "public"."invoices" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invoices_created_by" ON "public"."invoices" USING "btree" ("created_by");



CREATE INDEX "idx_invoices_document_type" ON "public"."invoices" USING "btree" ("document_type");



CREATE INDEX "idx_invoices_project_id" ON "public"."invoices" USING "btree" ("project_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_status_created_at" ON "public"."invoices" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_invoices_updated_at" ON "public"."invoices" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_invoices_updated_by" ON "public"."invoices" USING "btree" ("updated_by");



CREATE INDEX "idx_item_aliases_is_active" ON "public"."item_aliases" USING "btree" ("is_active");



CREATE INDEX "idx_item_aliases_item_id" ON "public"."item_aliases" USING "btree" ("item_id");



CREATE UNIQUE INDEX "idx_item_aliases_normalized_alias_text" ON "public"."item_aliases" USING "btree" ("normalized_alias_text");



CREATE INDEX "idx_item_catalog_created_at" ON "public"."item_catalog" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_item_catalog_is_active" ON "public"."item_catalog" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_item_catalog_normalized_name" ON "public"."item_catalog" USING "btree" ("normalized_name");



CREATE INDEX "idx_item_merge_log_batch_id" ON "public"."item_merge_log" USING "btree" ("batch_id");



CREATE INDEX "idx_payments_invoice_id" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_profiles_assigned_device_code" ON "public"."profiles" USING "btree" ("assigned_device_code");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_is_approved" ON "public"."profiles" USING "btree" ("is_approved");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_project_documents_project_id" ON "public"."project_documents" USING "btree" ("project_id");



CREATE INDEX "idx_projects_archived_at" ON "public"."projects" USING "btree" ("archived_at");



CREATE INDEX "idx_projects_client_id" ON "public"."projects" USING "btree" ("client_id");



CREATE INDEX "idx_projects_created_by" ON "public"."projects" USING "btree" ("created_by");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_projects_status_updated_at" ON "public"."projects" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "idx_projects_updated_at" ON "public"."projects" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_projects_updated_by" ON "public"."projects" USING "btree" ("updated_by");



CREATE INDEX "idx_quotation_items_description" ON "public"."quotation_items" USING "btree" ("description");



CREATE INDEX "idx_quotation_items_item_id" ON "public"."quotation_items" USING "btree" ("item_id");



CREATE INDEX "idx_quotations_client_id" ON "public"."quotations" USING "btree" ("client_id");



CREATE INDEX "idx_quotations_created_by" ON "public"."quotations" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_quotations_quotation_number_unique" ON "public"."quotations" USING "btree" ("quotation_number") WHERE ("quotation_number" IS NOT NULL);



CREATE INDEX "idx_quotations_status" ON "public"."quotations" USING "btree" ("status");



CREATE INDEX "idx_quotations_status_updated_at" ON "public"."quotations" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "idx_quotations_updated_by" ON "public"."quotations" USING "btree" ("updated_by");



CREATE INDEX "idx_rfq_items_rfq_id" ON "public"."rfq_items" USING "btree" ("rfq_id");



CREATE INDEX "idx_rfqs_archived_active" ON "public"."rfqs" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_rfqs_archived_at" ON "public"."rfqs" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_rfqs_rfq_number" ON "public"."rfqs" USING "btree" ("rfq_number");



CREATE INDEX "idx_tax_reminders_due_date" ON "public"."tax_reminders" USING "btree" ("due_date");



CREATE INDEX "idx_waybills_archived_active" ON "public"."waybills" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_waybills_archived_at" ON "public"."waybills" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE UNIQUE INDEX "idx_waybills_waybill_number_unique" ON "public"."waybills" USING "btree" ("waybill_number") WHERE ("waybill_number" IS NOT NULL);



CREATE INDEX "invoices_po_number_idx" ON "public"."invoices" USING "btree" ("po_number");



CREATE UNIQUE INDEX "notification_preferences_unique_rule_idx" ON "public"."notification_preferences" USING "btree" ("user_id", "domain", "event_key", "channel", COALESCE("threshold_days", '-1'::integer));



CREATE INDEX "notification_preferences_user_idx" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "notifications_last_generated_idx" ON "public"."notifications" USING "btree" ("last_generated_at" DESC);



CREATE UNIQUE INDEX "notifications_scope_user_fingerprint_idx" ON "public"."notifications" USING "btree" ("scope_type", "scope_id", "user_id", "fingerprint");



CREATE INDEX "notifications_user_domain_idx" ON "public"."notifications" USING "btree" ("user_id", "domain");



CREATE INDEX "notifications_user_state_idx" ON "public"."notifications" USING "btree" ("user_id", "state");



CREATE INDEX "projects_po_number_idx" ON "public"."projects" USING "btree" ("po_number");



CREATE UNIQUE INDEX "projects_project_code_key" ON "public"."projects" USING "btree" ("project_code");



CREATE INDEX "push_delivery_logs_notification_id_idx" ON "public"."push_delivery_logs" USING "btree" ("notification_id");



CREATE INDEX "push_delivery_logs_user_id_idx" ON "public"."push_delivery_logs" USING "btree" ("user_id");



CREATE INDEX "push_device_tokens_user_active_idx" ON "public"."push_device_tokens" USING "btree" ("user_id") WHERE ("revoked_at" IS NULL);



CREATE UNIQUE INDEX "push_device_tokens_user_token_idx" ON "public"."push_device_tokens" USING "btree" ("user_id", "token");



CREATE INDEX "quotation_items_quotation_id_idx" ON "public"."quotation_items" USING "btree" ("quotation_id");



CREATE INDEX "quotation_items_sort_order_idx" ON "public"."quotation_items" USING "btree" ("quotation_id", "sort_order");



CREATE INDEX "quotations_archived_at_idx" ON "public"."quotations" USING "btree" ("archived_at");



CREATE INDEX "quotations_client_id_idx" ON "public"."quotations" USING "btree" ("client_id");



CREATE INDEX "quotations_issue_date_idx" ON "public"."quotations" USING "btree" ("issue_date" DESC);



CREATE INDEX "quotations_po_number_idx" ON "public"."quotations" USING "btree" ("po_number");



CREATE INDEX "quotations_project_id_idx" ON "public"."quotations" USING "btree" ("project_id");



CREATE INDEX "quotations_status_idx" ON "public"."quotations" USING "btree" ("status");



CREATE OR REPLACE VIEW "public"."invoice_financials_v" AS
 SELECT "i"."id",
    "i"."invoice_number",
    "i"."client_id",
    "i"."client_name",
    "i"."project_id",
    "i"."issue_date",
    "i"."due_date",
    "i"."total" AS "total_gross",
    "i"."status",
    COALESCE("sum"("p"."cash_amount"), (0)::numeric) AS "cash_received",
    COALESCE("sum"("p"."wht_amount"), (0)::numeric) AS "wht_received",
    COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric) AS "settled_total",
    ("i"."total" - COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric)) AS "balance_due",
        CASE
            WHEN (("i"."total" - COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric)) <= (0)::numeric) THEN 'paid'::"text"
            WHEN ((COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric) > (0)::numeric) AND (("i"."due_date")::"date" >= CURRENT_DATE)) THEN 'partial'::"text"
            WHEN ((("i"."total" - COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric)) > (0)::numeric) AND (("i"."due_date")::"date" < CURRENT_DATE)) THEN 'overdue'::"text"
            ELSE "i"."status"
        END AS "computed_status"
   FROM ("public"."invoices" "i"
     LEFT JOIN "public"."payments" "p" ON ((("p"."invoice_id" = "i"."id") AND ("p"."voided_at" IS NULL))))
  GROUP BY "i"."id";



CREATE OR REPLACE VIEW "public"."project_financials_v" AS
 SELECT "proj"."id" AS "project_id",
    "proj"."name" AS "project_name",
    "proj"."client_id",
    "proj"."client_name",
    "proj"."status",
    "count"(DISTINCT "i"."id") AS "invoice_count",
    COALESCE("sum"("i"."total"), (0)::numeric) AS "total_invoiced",
    COALESCE("sum"("p"."cash_amount"), (0)::numeric) AS "cash_collected",
    COALESCE("sum"("p"."wht_amount"), (0)::numeric) AS "wht_collected",
    COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric) AS "total_collected",
    (COALESCE("sum"("i"."total"), (0)::numeric) - COALESCE("sum"(("p"."cash_amount" + "p"."wht_amount")), (0)::numeric)) AS "outstanding"
   FROM (("public"."projects" "proj"
     LEFT JOIN "public"."invoices" "i" ON (("i"."project_id" = "proj"."id")))
     LEFT JOIN "public"."payments" "p" ON ((("p"."invoice_id" = "i"."id") AND ("p"."voided_at" IS NULL))))
  GROUP BY "proj"."id";



CREATE OR REPLACE TRIGGER "notifications_set_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "quotation_items_set_updated_at" BEFORE UPDATE ON "public"."quotation_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "quotations_set_updated_at" BEFORE UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_device_installations_updated_at" BEFORE UPDATE ON "public"."device_installations" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_invoices_set_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "trg_invoices_stamp_ownership" BEFORE INSERT OR UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_row_ownership"();



CREATE OR REPLACE TRIGGER "trg_item_aliases_updated_at" BEFORE UPDATE ON "public"."item_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_item_catalog_updated_at" BEFORE UPDATE ON "public"."item_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_item_import_batches_updated_at" BEFORE UPDATE ON "public"."item_import_batches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_projects_set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "trg_projects_stamp_ownership" BEFORE INSERT OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_row_ownership"();



CREATE OR REPLACE TRIGGER "trg_quotations_set_updated_at" BEFORE UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quotations_stamp_ownership" BEFORE INSERT OR UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_row_ownership"();



ALTER TABLE ONLY "public"."boq_rows"
    ADD CONSTRAINT "boq_rows_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "public"."boqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."csrs"
    ADD CONSTRAINT "csrs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."csrs"
    ADD CONSTRAINT "csrs_technician_signatory_id_fkey" FOREIGN KEY ("technician_signatory_id") REFERENCES "public"."signatories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_installations"
    ADD CONSTRAINT "device_installations_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_installations"
    ADD CONSTRAINT "device_installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."item_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_aliases"
    ADD CONSTRAINT "item_aliases_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."item_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_merge_log"
    ADD CONSTRAINT "item_merge_log_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."item_import_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_merge_log"
    ADD CONSTRAINT "item_merge_log_from_item_id_fkey" FOREIGN KEY ("from_item_id") REFERENCES "public"."item_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_merge_log"
    ADD CONSTRAINT "item_merge_log_to_item_id_fkey" FOREIGN KEY ("to_item_id") REFERENCES "public"."item_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_documents"
    ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_delivery_logs"
    ADD CONSTRAINT "push_delivery_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_delivery_logs"
    ADD CONSTRAINT "push_delivery_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."push_device_tokens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."item_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rfq_items"
    ADD CONSTRAINT "rfq_items_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_filings"
    ADD CONSTRAINT "tax_filings_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_input_entries"
    ADD CONSTRAINT "tax_input_entries_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_reminders"
    ADD CONSTRAINT "tax_reminders_linked_filing_id_fkey" FOREIGN KEY ("linked_filing_id") REFERENCES "public"."tax_filings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tax_reminders"
    ADD CONSTRAINT "tax_reminders_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_settings"
    ADD CONSTRAINT "tax_settings_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waybills"
    ADD CONSTRAINT "waybills_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."waybills"
    ADD CONSTRAINT "waybills_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."waybills"
    ADD CONSTRAINT "waybills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."wht_receipts"
    ADD CONSTRAINT "wht_receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wht_receipts"
    ADD CONSTRAINT "wht_receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated read" ON "public"."csrs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read" ON "public"."invoices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read activity events" ON "public"."activity_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable delete access for authenticated users on tax_input_entri" ON "public"."tax_input_entries" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert access for authenticated users on tax_input_entri" ON "public"."tax_input_entries" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for authenticated users on tax_input_entries" ON "public"."tax_input_entries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update access for authenticated users on tax_input_entri" ON "public"."tax_input_entries" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Team members can view activity events" ON "public"."activity_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Team members can view all audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can delete projects" ON "public"."projects" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can update projects" ON "public"."projects" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view projects" ON "public"."projects" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."activity_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin manages devices" ON "public"."devices" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin updates profiles" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles_1"."role" = 'admin'::"text")))));



CREATE POLICY "approved users only" ON "public"."clients" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true)))));



CREATE POLICY "approved users only" ON "public"."csrs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true)))));



CREATE POLICY "approved users only" ON "public"."invoice_items" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true)))));



CREATE POLICY "approved users only" ON "public"."invoices" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true)))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_delete_tax_filings" ON "public"."tax_filings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth_delete_tax_reminders" ON "public"."tax_reminders" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth_insert_tax_filings" ON "public"."tax_filings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_tax_reminders" ON "public"."tax_reminders" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_read_tax_filings" ON "public"."tax_filings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_read_tax_reminders" ON "public"."tax_reminders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth_update_tax_filings" ON "public"."tax_filings" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "auth_update_tax_reminders" ON "public"."tax_reminders" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "authenticated quotation_items read" ON "public"."quotation_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated quotation_items write" ON "public"."quotation_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated quotations read" ON "public"."quotations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated quotations write" ON "public"."quotations" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bank_accounts_authenticated_delete" ON "public"."bank_accounts" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "bank_accounts_authenticated_insert" ON "public"."bank_accounts" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "bank_accounts_authenticated_select" ON "public"."bank_accounts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "bank_accounts_authenticated_update" ON "public"."bank_accounts" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."boq_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "boq_rows_delete_own" ON "public"."boq_rows" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."boqs"
  WHERE (("boqs"."id" = "boq_rows"."boq_id") AND ("boqs"."user_id" = "auth"."uid"())))));



CREATE POLICY "boq_rows_insert_own" ON "public"."boq_rows" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."boqs"
  WHERE (("boqs"."id" = "boq_rows"."boq_id") AND ("boqs"."user_id" = "auth"."uid"())))));



CREATE POLICY "boq_rows_select_own" ON "public"."boq_rows" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."boqs"
  WHERE (("boqs"."id" = "boq_rows"."boq_id") AND ("boqs"."user_id" = "auth"."uid"())))));



CREATE POLICY "boq_rows_update_own" ON "public"."boq_rows" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."boqs"
  WHERE (("boqs"."id" = "boq_rows"."boq_id") AND ("boqs"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."boqs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "boqs_delete_own" ON "public"."boqs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "boqs_insert_own" ON "public"."boqs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "boqs_select_own" ON "public"."boqs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "boqs_update_own" ON "public"."boqs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_authenticated_delete" ON "public"."clients" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "clients_authenticated_insert" ON "public"."clients" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "clients_authenticated_select" ON "public"."clients" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "clients_authenticated_update" ON "public"."clients" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."csrs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "csrs_authenticated_delete" ON "public"."csrs" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "csrs_authenticated_insert" ON "public"."csrs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "csrs_authenticated_select" ON "public"."csrs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "csrs_authenticated_update" ON "public"."csrs" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "delete sequences" ON "public"."device_sequences" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."device_installations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert sequences" ON "public"."device_sequences" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))) OR ("device_code" = ( SELECT "profiles"."assigned_device_code"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))));



ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_items_authenticated_delete" ON "public"."invoice_items" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invoice_items_authenticated_insert" ON "public"."invoice_items" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invoice_items_authenticated_select" ON "public"."invoice_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invoice_items_authenticated_update" ON "public"."invoice_items" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_authenticated_delete" ON "public"."invoices" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invoices_authenticated_insert" ON "public"."invoices" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invoices_authenticated_select" ON "public"."invoices" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invoices_authenticated_update" ON "public"."invoices" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."item_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_import_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_merge_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification preferences delete own" ON "public"."notification_preferences" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notification preferences insert own" ON "public"."notification_preferences" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notification preferences select own" ON "public"."notification_preferences" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notification preferences update own" ON "public"."notification_preferences" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_authenticated_delete" ON "public"."payments" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "payments_authenticated_insert" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "payments_authenticated_select" ON "public"."payments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "payments_authenticated_update" ON "public"."payments" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."project_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_documents_authenticated_delete" ON "public"."project_documents" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "project_documents_authenticated_insert" ON "public"."project_documents" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "project_documents_authenticated_select" ON "public"."project_documents" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_authenticated_delete" ON "public"."projects" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "projects_authenticated_insert" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "projects_authenticated_select" ON "public"."projects" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "projects_authenticated_update" ON "public"."projects" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "push delivery logs select own" ON "public"."push_delivery_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens insert" ON "public"."push_device_tokens" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens select" ON "public"."push_device_tokens" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens update" ON "public"."push_device_tokens" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."push_delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_device_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotation_items_authenticated_delete" ON "public"."quotation_items" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quotation_items_authenticated_insert" ON "public"."quotation_items" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quotation_items_authenticated_select" ON "public"."quotation_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quotation_items_authenticated_update" ON "public"."quotation_items" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotations_authenticated_delete" ON "public"."quotations" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quotations_authenticated_insert" ON "public"."quotations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quotations_authenticated_select" ON "public"."quotations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quotations_authenticated_update" ON "public"."quotations" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "read sequences" ON "public"."device_sequences" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))) OR ("device_code" = ( SELECT "profiles"."assigned_device_code"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))));



ALTER TABLE "public"."rfq_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rfq_items_authenticated_delete" ON "public"."rfq_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "rfq_items_authenticated_insert" ON "public"."rfq_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "rfq_items_authenticated_select" ON "public"."rfq_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rfq_items_authenticated_update" ON "public"."rfq_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."rfqs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rfqs_authenticated_delete" ON "public"."rfqs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "rfqs_authenticated_insert" ON "public"."rfqs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "rfqs_authenticated_select" ON "public"."rfqs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rfqs_authenticated_update" ON "public"."rfqs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_authenticated_select" ON "public"."settings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "settings_authenticated_update" ON "public"."settings" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "settings_select" ON "public"."settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "settings_update" ON "public"."settings" FOR UPDATE TO "authenticated" USING (("id" = 1)) WITH CHECK (("id" = 1));



CREATE POLICY "settings_upsert" ON "public"."settings" FOR INSERT TO "authenticated" WITH CHECK (("id" = 1));



ALTER TABLE "public"."signatories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signatories_authenticated_delete" ON "public"."signatories" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "signatories_authenticated_insert" ON "public"."signatories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "signatories_authenticated_select" ON "public"."signatories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "signatories_authenticated_update" ON "public"."signatories" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."tax_filings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_input_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tax_settings_authenticated_delete" ON "public"."tax_settings" FOR DELETE TO "authenticated" USING (("settings_id" = 1));



CREATE POLICY "tax_settings_authenticated_insert" ON "public"."tax_settings" FOR INSERT TO "authenticated" WITH CHECK (("settings_id" = 1));



CREATE POLICY "tax_settings_authenticated_select" ON "public"."tax_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "tax_settings_authenticated_update" ON "public"."tax_settings" FOR UPDATE TO "authenticated" USING (("settings_id" = 1)) WITH CHECK (("settings_id" = 1));



CREATE POLICY "update sequences" ON "public"."device_sequences" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"text")))) OR ("device_code" = ( SELECT "profiles"."assigned_device_code"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))));



CREATE POLICY "users read own device" ON "public"."devices" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_approved" = true))))));



CREATE POLICY "users read own profile" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."waybills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waybills_authenticated_delete" ON "public"."waybills" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "waybills_authenticated_insert" ON "public"."waybills" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "waybills_authenticated_select" ON "public"."waybills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "waybills_authenticated_update" ON "public"."waybills" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."wht_receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wht_receipts_authenticated_delete" ON "public"."wht_receipts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "wht_receipts_authenticated_insert" ON "public"."wht_receipts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "wht_receipts_authenticated_select" ON "public"."wht_receipts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "wht_receipts_authenticated_update" ON "public"."wht_receipts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON TABLE "public"."device_installations" TO "anon";
GRANT ALL ON TABLE "public"."device_installations" TO "authenticated";
GRANT ALL ON TABLE "public"."device_installations" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_revoke_device_assignment"("p_assignment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_revoke_device_assignment"("p_assignment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_revoke_device_assignment"("p_assignment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_revoke_device_assignment"("p_assignment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_device_assignment_code"("p_assignment_id" "uuid", "p_device_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_device_assignment_code"("p_assignment_id" "uuid", "p_device_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_device_assignment_code"("p_assignment_id" "uuid", "p_device_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_device_assignment_code"("p_assignment_id" "uuid", "p_device_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_android_device_assignment"("p_installation_id" "text", "p_user_id" "uuid", "p_device_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_android_device_assignment"("p_installation_id" "text", "p_user_id" "uuid", "p_device_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_android_device_assignment"("p_installation_id" "text", "p_user_id" "uuid", "p_device_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_android_device_assignment"("p_installation_id" "text", "p_user_id" "uuid", "p_device_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_device_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_device_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_device_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_quotation_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_quotation_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_quotation_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_device_code_counter_seeds"("p_installation_id" "text", "p_device_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_device_code_counter_seeds"("p_installation_id" "text", "p_device_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_device_code_counter_seeds"("p_installation_id" "text", "p_device_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_device_code_counter_seeds"("p_installation_id" "text", "p_device_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_item_suggestions"("search_text" "text", "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_item_suggestions"("search_text" "text", "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_item_suggestions"("search_text" "text", "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_events" TO "anon";
GRANT ALL ON TABLE "public"."activity_events" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_events" TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_event_type" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_event_type" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_event_type" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_item_text"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_item_text"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_item_text"("input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_event_type" "text", "p_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text", "p_dedupe_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."record_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_event_type" "text", "p_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text", "p_dedupe_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_activity_event"("p_entity_type" "text", "p_entity_id" "uuid", "p_event_type" "text", "p_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_metadata" "jsonb", "p_reason" "text", "p_dedupe_seconds" integer) TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON FUNCTION "public"."record_audit_log"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_action" "text", "p_old_data" "jsonb", "p_new_data" "jsonb", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_audit_log"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_action" "text", "p_old_data" "jsonb", "p_new_data" "jsonb", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_audit_log"("p_entity_type" "text", "p_entity_id" "uuid", "p_entity_label" "text", "p_action" "text", "p_old_data" "jsonb", "p_new_data" "jsonb", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_scope_type" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_invoice_created"("p_invoice_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_invoice_created"("p_invoice_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_invoice_created"("p_invoice_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_invoice_status_changed"("p_invoice_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_invoice_status_changed"("p_invoice_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_invoice_status_changed"("p_invoice_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_payment_recorded"("p_invoice_id" "uuid", "p_amount" numeric, "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_payment_recorded"("p_invoice_id" "uuid", "p_amount" numeric, "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_payment_recorded"("p_invoice_id" "uuid", "p_amount" numeric, "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_project_document_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_project_document_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_project_document_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_project_linked_activity"("p_project_id" "uuid", "p_linked_entity_type" "text", "p_linked_entity_id" "uuid", "p_linked_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_project_linked_activity"("p_project_id" "uuid", "p_linked_entity_type" "text", "p_linked_entity_id" "uuid", "p_linked_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_project_linked_activity"("p_project_id" "uuid", "p_linked_entity_type" "text", "p_linked_entity_id" "uuid", "p_linked_entity_label" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_project_note_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_project_note_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_project_note_added"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_project_updated"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_project_updated"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_project_updated"("p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_quotation_created"("p_quotation_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_quotation_created"("p_quotation_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_quotation_created"("p_quotation_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_quotation_linked"("p_quotation_id" "uuid", "p_invoice_id" "uuid", "p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_quotation_linked"("p_quotation_id" "uuid", "p_invoice_id" "uuid", "p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_quotation_linked"("p_quotation_id" "uuid", "p_invoice_id" "uuid", "p_project_id" "uuid", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_quotation_status_changed"("p_quotation_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_quotation_status_changed"("p_quotation_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_quotation_status_changed"("p_quotation_id" "uuid", "p_old_status" "text", "p_new_status" "text", "p_actor_id" "uuid", "p_actor_label" "text", "p_source" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_invoice_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_invoice_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_invoice_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_notification"("p_user_id" "uuid", "p_fingerprint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_notification"("p_user_id" "uuid", "p_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_notification"("p_user_id" "uuid", "p_fingerprint" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_fingerprint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_fingerprint" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_quotation_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_quotation_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_quotation_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_invoice_to_quotation_transaction"("p_invoice_id" "uuid", "p_quotation_payload" "jsonb", "p_quotation_items_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."revert_invoice_to_quotation_transaction"("p_invoice_id" "uuid", "p_quotation_payload" "jsonb", "p_quotation_items_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_invoice_to_quotation_transaction"("p_invoice_id" "uuid", "p_quotation_payload" "jsonb", "p_quotation_items_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_notification_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_notification_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_notification_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."stamp_row_ownership"() TO "anon";
GRANT ALL ON FUNCTION "public"."stamp_row_ownership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."stamp_row_ownership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_notification"("p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_notification"("p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_notification"("p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_notification"("p_scope_type" "text", "p_scope_id" "text", "p_user_id" "uuid", "p_domain" "text", "p_source" "text", "p_generator_key" "text", "p_fingerprint" "text", "p_title" "text", "p_message" "text", "p_route" "text", "p_entity_type" "text", "p_entity_id" "text", "p_severity" "text", "p_metadata" "jsonb") TO "service_role";
























GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."boq_rows" TO "anon";
GRANT ALL ON TABLE "public"."boq_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."boq_rows" TO "service_role";



GRANT ALL ON TABLE "public"."boqs" TO "anon";
GRANT ALL ON TABLE "public"."boqs" TO "authenticated";
GRANT ALL ON TABLE "public"."boqs" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."csrs" TO "anon";
GRANT ALL ON TABLE "public"."csrs" TO "authenticated";
GRANT ALL ON TABLE "public"."csrs" TO "service_role";



GRANT ALL ON TABLE "public"."device_sequences" TO "anon";
GRANT ALL ON TABLE "public"."device_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."device_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_financials_v" TO "anon";
GRANT ALL ON TABLE "public"."invoice_financials_v" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_financials_v" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."item_aliases" TO "anon";
GRANT ALL ON TABLE "public"."item_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."item_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."item_catalog" TO "anon";
GRANT ALL ON TABLE "public"."item_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."item_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."item_import_batches" TO "anon";
GRANT ALL ON TABLE "public"."item_import_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."item_import_batches" TO "service_role";



GRANT ALL ON TABLE "public"."item_merge_log" TO "anon";
GRANT ALL ON TABLE "public"."item_merge_log" TO "authenticated";
GRANT ALL ON TABLE "public"."item_merge_log" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON TABLE "public"."item_price_summary_v" TO "anon";
GRANT ALL ON TABLE "public"."item_price_summary_v" TO "authenticated";
GRANT ALL ON TABLE "public"."item_price_summary_v" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notification_runs" TO "anon";
GRANT ALL ON TABLE "public"."notification_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_runs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_documents" TO "anon";
GRANT ALL ON TABLE "public"."project_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."project_documents" TO "service_role";



GRANT ALL ON TABLE "public"."project_financials_v" TO "anon";
GRANT ALL ON TABLE "public"."project_financials_v" TO "authenticated";
GRANT ALL ON TABLE "public"."project_financials_v" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."push_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."push_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."push_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."push_device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_device_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."rfq_items" TO "anon";
GRANT ALL ON TABLE "public"."rfq_items" TO "authenticated";
GRANT ALL ON TABLE "public"."rfq_items" TO "service_role";



GRANT ALL ON TABLE "public"."rfqs" TO "anon";
GRANT ALL ON TABLE "public"."rfqs" TO "authenticated";
GRANT ALL ON TABLE "public"."rfqs" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."signatories" TO "anon";
GRANT ALL ON TABLE "public"."signatories" TO "authenticated";
GRANT ALL ON TABLE "public"."signatories" TO "service_role";



GRANT ALL ON TABLE "public"."tax_filings" TO "anon";
GRANT ALL ON TABLE "public"."tax_filings" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_filings" TO "service_role";



GRANT ALL ON TABLE "public"."tax_input_entries" TO "anon";
GRANT ALL ON TABLE "public"."tax_input_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_input_entries" TO "service_role";



GRANT ALL ON TABLE "public"."tax_reminders" TO "anon";
GRANT ALL ON TABLE "public"."tax_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."tax_settings" TO "anon";
GRANT ALL ON TABLE "public"."tax_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_settings" TO "service_role";



GRANT ALL ON TABLE "public"."v_last_invoice_activity" TO "anon";
GRANT ALL ON TABLE "public"."v_last_invoice_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."v_last_invoice_activity" TO "service_role";



GRANT ALL ON TABLE "public"."v_last_project_activity" TO "anon";
GRANT ALL ON TABLE "public"."v_last_project_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."v_last_project_activity" TO "service_role";



GRANT ALL ON TABLE "public"."v_last_quotation_activity" TO "anon";
GRANT ALL ON TABLE "public"."v_last_quotation_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."v_last_quotation_activity" TO "service_role";



GRANT ALL ON TABLE "public"."waybills" TO "anon";
GRANT ALL ON TABLE "public"."waybills" TO "authenticated";
GRANT ALL ON TABLE "public"."waybills" TO "service_role";



GRANT ALL ON TABLE "public"."wht_receipts" TO "anon";
GRANT ALL ON TABLE "public"."wht_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."wht_receipts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































