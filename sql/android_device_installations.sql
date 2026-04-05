create extension if not exists pgcrypto;

create table if not exists public.device_installations (
  id uuid primary key default gen_random_uuid(),
  installation_id text not null,
  user_id uuid references public.profiles (id) on delete set null,
  platform text not null default 'android',
  device_code text not null,
  device_name text,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_automatically boolean not null default true,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_installations_platform_check check (platform = 'android'),
  constraint device_installations_device_code_format check (device_code ~ '^[A-Z]{2}$')
);

create unique index if not exists idx_device_installations_active_code
on public.device_installations (device_code)
where active = true;

create unique index if not exists idx_device_installations_active_installation
on public.device_installations (installation_id)
where active = true;

create index if not exists idx_device_installations_user_id
on public.device_installations (user_id);

create unique index if not exists idx_csrs_csr_number_unique
on public.csrs (csr_number);

create unique index if not exists idx_quotations_quotation_number_unique
on public.quotations (quotation_number);

create unique index if not exists idx_waybills_waybill_number_unique
on public.waybills (waybill_number);

insert into public.device_installations (
  installation_id,
  user_id,
  platform,
  device_code,
  device_name,
  active,
  assigned_at,
  assigned_automatically,
  created_at,
  updated_at
)
select
  'legacy-user-' || coalesce(d.user_id::text, lower(d.device_code)),
  d.user_id,
  'android',
  upper(d.device_code),
  'Legacy Android Device',
  true,
  now(),
  false,
  now(),
  now()
from public.devices d
where d.device_code is not null
  and upper(d.device_code) ~ '^[A-Z]{2}$'
  and not exists (
    select 1
    from public.device_installations di
    where di.device_code = upper(d.device_code)
      and di.active = true
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_device_installations_updated_at on public.device_installations;
create trigger trg_device_installations_updated_at
before update on public.device_installations
for each row
execute function public.touch_updated_at();

create or replace function public.generate_device_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate :=
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int);

    exit when not exists (
      select 1
      from public.device_installations
      where device_code = candidate
        and active = true
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.ensure_android_device_assignment(
  p_installation_id text,
  p_user_id uuid,
  p_device_name text default 'Android Device'
)
returns public.device_installations
language plpgsql
security definer
as $$
declare
  existing_row public.device_installations;
  inserted_row public.device_installations;
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
  where installation_id = p_installation_id
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

    update public.profiles
    set assigned_device_code = existing_row.device_code
    where id = p_user_id;

    return existing_row;
  end if;

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
    p_installation_id,
    p_user_id,
    'android',
    public.generate_device_code(),
    coalesce(nullif(btrim(p_device_name), ''), 'Android Device'),
    true,
    now(),
    true,
    now()
  )
  returning * into inserted_row;

  update public.profiles
  set assigned_device_code = inserted_row.device_code
  where id = p_user_id;

  return inserted_row;
end;
$$;

create or replace function public.admin_update_device_assignment_code(
  p_assignment_id uuid,
  p_device_code text
)
returns public.device_installations
language plpgsql
security definer
as $$
declare
  normalized_code text := upper(btrim(coalesce(p_device_code, '')));
  updated_row public.device_installations;
begin
  if normalized_code !~ '^[A-Z]{2}$' then
    raise exception 'device code must be exactly two uppercase letters';
  end if;

  if exists (
    select 1
    from public.device_installations
    where device_code = normalized_code
      and active = true
      and id <> p_assignment_id
  ) then
    raise exception 'device code is already assigned to another active installation';
  end if;

  update public.device_installations
  set
    device_code = normalized_code,
    assigned_automatically = false,
    assigned_by = auth.uid()
  where id = p_assignment_id
  returning * into updated_row;

  if not found then
    raise exception 'device assignment not found';
  end if;

  if updated_row.user_id is not null then
    update public.profiles
    set assigned_device_code = updated_row.device_code
    where id = updated_row.user_id;
  end if;

  return updated_row;
end;
$$;

create or replace function public.get_device_code_counter_seeds(
  p_installation_id text default null,
  p_device_code text default null
)
returns table (
  device_code text,
  csr_max integer,
  quotation_max integer,
  waybill_max integer
)
language plpgsql
security definer
as $$
declare
  resolved_code text;
begin
  resolved_code := upper(btrim(coalesce(p_device_code, '')));

  if resolved_code = '' and p_installation_id is not null then
    select di.device_code
    into resolved_code
    from public.device_installations di
    where di.installation_id = p_installation_id
      and di.active = true
    limit 1;
  end if;

  if resolved_code is null or resolved_code = '' then
    return;
  end if;

  return query
  select
    resolved_code,
    coalesce(max(substring(c.csr_number from '([0-9]+)$')::int), 0) as csr_max,
    coalesce(max(substring(q.quotation_number from '([0-9]+)$')::int), 0) as quotation_max,
    coalesce(max(substring(w.waybill_number from '([0-9]+)$')::int), 0) as waybill_max
  from public.device_installations di
  left join public.csrs c on c.csr_number like 'SASCSR-' || resolved_code || '%'
  left join public.quotations q on q.quotation_number like 'SASQUO-' || resolved_code || '%'
  left join public.waybills w on w.waybill_number like 'SASWB-' || resolved_code || '%'
  where di.device_code = resolved_code
  group by resolved_code;
end;
$$;
