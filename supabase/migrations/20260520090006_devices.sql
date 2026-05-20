-- Domain: Devices
-- Tables: devices, device_installations, device_sequences
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    device_code text NOT NULL,
    device_name text NOT NULL,
    registered_at timestamp with time zone DEFAULT now(),
    last_seen timestamp with time zone DEFAULT now(),
    user_id uuid
);

CREATE TABLE IF NOT EXISTS device_installations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    installation_id text NOT NULL,
    user_id uuid,
    platform text NOT NULL DEFAULT 'android'::text,
    device_code text NOT NULL,
    device_name text,
    active boolean NOT NULL DEFAULT true,
    assigned_at timestamp with time zone NOT NULL DEFAULT now(),
    assigned_by uuid,
    assigned_automatically boolean NOT NULL DEFAULT true,
    last_seen_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_sequences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    device_code text NOT NULL,
    doc_type text NOT NULL,
    last_sequence integer DEFAULT 0
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE device_installations ADD CONSTRAINT device_installations_pkey PRIMARY KEY (id);
ALTER TABLE device_sequences ADD CONSTRAINT device_sequences_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS devices_device_code_key ON public.devices USING btree (device_code);
CREATE INDEX IF NOT EXISTS idx_devices_device_code ON public.devices USING btree (device_code);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_installations_active_code ON public.device_installations USING btree (device_code) WHERE (active = true);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_installations_active_installation ON public.device_installations USING btree (installation_id) WHERE (active = true);
CREATE INDEX IF NOT EXISTS idx_device_installations_user_id ON public.device_installations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_device_installations_last_seen_at ON public.device_installations USING btree (last_seen_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS device_sequences_device_code_doc_type_key ON public.device_sequences USING btree (device_code, doc_type);
CREATE INDEX IF NOT EXISTS idx_device_sequences_device_code ON public.device_sequences USING btree (device_code);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE devices ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE device_installations ADD CONSTRAINT device_installations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE device_installations ADD CONSTRAINT device_installations_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sequences ENABLE ROW LEVEL SECURITY;

-- devices
CREATE POLICY admin_manages_devices ON devices FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));
CREATE POLICY users_read_own_device ON devices FOR SELECT TO public
  USING (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true))))));

-- device_sequences
CREATE POLICY read_sequences ON device_sequences FOR SELECT TO public
  USING (((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (device_code = ( SELECT profiles.assigned_device_code FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true))))));
CREATE POLICY update_sequences ON device_sequences FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (device_code = ( SELECT profiles.assigned_device_code FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true))))));
CREATE POLICY delete_sequences ON device_sequences FOR DELETE TO public
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_device_installations_updated_at BEFORE UPDATE ON public.device_installations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_device_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
begin
  candidate :=
    substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1) ||
    substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);

  return candidate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_android_device_assignment(p_installation_id text, p_user_id uuid, p_device_name text DEFAULT 'Android Device'::text)
 RETURNS device_installations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  for attempt in 1..30 loop
    candidate_code := public.generate_device_code();

    begin
      insert into public.device_installations (
        installation_id, user_id, platform, device_code, device_name,
        active, assigned_at, assigned_automatically, last_seen_at
      )
      values (
        btrim(p_installation_id), p_user_id, 'android', candidate_code,
        coalesce(nullif(btrim(p_device_name), ''), 'Android Device'),
        true, now(), true, now()
      )
      returning * into result_row;

      return result_row;

    exception
      when unique_violation then
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

        if attempt = 30 then
          raise exception 'Could not allocate a unique device code after % attempts', attempt;
        end if;
    end;
  end loop;

  raise exception 'Unexpected failure ensuring Android device assignment';
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_device_code_counter_seeds(p_installation_id text DEFAULT NULL::text, p_device_code text DEFAULT NULL::text)
 RETURNS TABLE(device_code text, csr_max integer, quotation_max integer, waybill_max integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_device_assignment_code(p_assignment_id uuid, p_device_code text)
 RETURNS device_installations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  normalized_code text := upper(btrim(coalesce(p_device_code, '')));
  updated_row public.device_installations;
  requester_is_admin boolean := false;
begin
  select coalesce(
    (select true from public.profiles p where p.id = auth.uid() and p.role = 'admin'),
    false
  ) into requester_is_admin;

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
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_device_assignment(p_assignment_id uuid)
 RETURNS device_installations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  updated_row public.device_installations;
  requester_is_admin boolean := false;
begin
  select coalesce(
    (select true from public.profiles p where p.id = auth.uid() and p.role = 'admin'),
    false
  ) into requester_is_admin;

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
$function$;
