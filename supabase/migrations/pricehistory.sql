 =========================================================
-- Item Library / Price History Phase 1
-- Master items + aliases + source row linkage
-- Corrected to use updated_at on invoice_items / quotation_items
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1) Master item catalog
-- ---------------------------------------------------------
create table if not exists public.item_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  standard_price numeric(14,2) not null default 0,
  is_active boolean not null default true,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_item_catalog_normalized_name
  on public.item_catalog (normalized_name);

create index if not exists idx_item_catalog_is_active
  on public.item_catalog (is_active);

create index if not exists idx_item_catalog_created_at
  on public.item_catalog (created_at desc);

-- ---------------------------------------------------------
-- 2) Aliases
-- ---------------------------------------------------------
create table if not exists public.item_aliases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.item_catalog(id) on delete cascade,
  alias_text text not null,
  normalized_alias_text text not null,
  is_active boolean not null default true,
  is_retired boolean not null default false,
  source text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_item_aliases_normalized_alias_text
  on public.item_aliases (normalized_alias_text);

create index if not exists idx_item_aliases_item_id
  on public.item_aliases (item_id);

create index if not exists idx_item_aliases_is_active
  on public.item_aliases (is_active);

-- ---------------------------------------------------------
-- 3) Import batches
-- ---------------------------------------------------------
create table if not exists public.item_import_batches (
  id uuid primary key default gen_random_uuid(),
  import_name text null,
  source_type text null,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- ---------------------------------------------------------
-- 4) Merge / remap log
-- ---------------------------------------------------------
create table if not exists public.item_merge_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid null references public.item_import_batches(id) on delete set null,
  from_item_id uuid null references public.item_catalog(id) on delete set null,
  to_item_id uuid null references public.item_catalog(id) on delete set null,
  action text not null
    check (action in ('merge', 'alias_added', 'alias_retired', 'standard_price_updated', 'relinked_rows')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_item_merge_log_batch_id
  on public.item_merge_log (batch_id);

-- ---------------------------------------------------------
-- 5) Link source rows to master item
-- ---------------------------------------------------------
alter table public.invoice_items
  add column if not exists item_id uuid null references public.item_catalog(id) on delete set null;

alter table public.quotation_items
  add column if not exists item_id uuid null references public.item_catalog(id) on delete set null;

create index if not exists idx_invoice_items_item_id
  on public.invoice_items (item_id);

create index if not exists idx_quotation_items_item_id
  on public.quotation_items (item_id);

-- ---------------------------------------------------------
-- 6) Helpful search indexes on descriptions
-- ---------------------------------------------------------
create index if not exists idx_invoice_items_description
  on public.invoice_items (description);

create index if not exists idx_quotation_items_description
  on public.quotation_items (description);

-- ---------------------------------------------------------
-- 7) updated_at helper trigger
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_item_catalog_updated_at on public.item_catalog;
create trigger trg_item_catalog_updated_at
before update on public.item_catalog
for each row
execute function public.set_updated_at();

drop trigger if exists trg_item_aliases_updated_at on public.item_aliases;
create trigger trg_item_aliases_updated_at
before update on public.item_aliases
for each row
execute function public.set_updated_at();

drop trigger if exists trg_item_import_batches_updated_at on public.item_import_batches;
create trigger trg_item_import_batches_updated_at
before update on public.item_import_batches
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 8) Summary view for list page
-- ---------------------------------------------------------
create or replace view public.item_price_summary_v as
with usage_rows as (
  select
    ii.item_id,
    ii.unit_price,
    ii.updated_at as used_at,
    'invoice'::text as source_type,
    ii.invoice_id as source_document_id
  from public.invoice_items ii
  where ii.item_id is not null
    and coalesce(ii.row_type, 'standard') = 'standard'

  union all

  select
    qi.item_id,
    qi.unit_price,
    qi.updated_at as used_at,
    'quotation'::text as source_type,
    qi.quotation_id as source_document_id
  from public.quotation_items qi
  where qi.item_id is not null
    and coalesce(qi.row_type, 'standard') = 'standard'
),
last_usage as (
  select distinct on (item_id)
    item_id,
    unit_price as last_sold_price,
    used_at as last_used_at,
    source_type as last_source_type,
    source_document_id as last_source_document_id
  from usage_rows
  order by item_id, used_at desc
),
usage_agg as (
  select
    item_id,
    count(*) as usage_count,
    min(unit_price) as min_price,
    max(unit_price) as max_price,
    avg(unit_price) as avg_price
  from usage_rows
  group by item_id
)
select
  c.id as item_id,
  c.name,
  c.standard_price,
  c.is_active,
  coalesce(a.usage_count, 0) as usage_count,
  a.min_price,
  a.max_price,
  a.avg_price,
  l.last_sold_price,
  l.last_used_at,
  l.last_source_type,
  l.last_source_document_id
from public.item_catalog c
left join usage_agg a on a.item_id = c.id
left join last_usage l on l.item_id = c.id;

commit;

And here is the full corrected backfill SQL as one pasteable block too:

begin;

-- ---------------------------------------------------------
-- 1) Normalize helper
-- ---------------------------------------------------------
create or replace function public.normalize_item_text(input text)
returns text
language sql
immutable
as $$
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

-- ---------------------------------------------------------
-- 2) Seed master catalog from existing source rows
-- ---------------------------------------------------------
insert into public.item_catalog (name, normalized_name, standard_price)
select
  seed.description,
  seed.normalized_name,
  seed.latest_price
from (
  select distinct on (normalized_name)
    description,
    public.normalize_item_text(description) as normalized_name,
    coalesce(unit_price, 0) as latest_price,
    used_at
  from (
    select description, unit_price, updated_at as used_at
    from public.invoice_items
    where coalesce(row_type, 'standard') = 'standard'
      and nullif(trim(description), '') is not null

    union all

    select description, unit_price, updated_at as used_at
    from public.quotation_items
    where coalesce(row_type, 'standard') = 'standard'
      and nullif(trim(description), '') is not null
  ) raw_rows
  order by normalized_name, used_at desc
) seed
on conflict (normalized_name) do nothing;

-- ---------------------------------------------------------
-- 3) Seed aliases with same starting text
-- ---------------------------------------------------------
insert into public.item_aliases (item_id, alias_text, normalized_alias_text, source)
select
  c.id,
  c.name,
  c.normalized_name,
  'migration'
from public.item_catalog c
on conflict (normalized_alias_text) do nothing;

-- ---------------------------------------------------------
-- 4) Backfill invoice_items.item_id
-- ---------------------------------------------------------
update public.invoice_items ii
set item_id = c.id
from public.item_catalog c
where ii.item_id is null
  and coalesce(ii.row_type, 'standard') = 'standard'
  and public.normalize_item_text(ii.description) = c.normalized_name;

-- ---------------------------------------------------------
-- 5) Backfill quotation_items.item_id
-- ---------------------------------------------------------
update public.quotation_items qi
set item_id = c.id
from public.item_catalog c
where qi.item_id is null
  and coalesce(qi.row_type, 'standard') = 'standard'
  and public.normalize_item_text(qi.description) = c.normalized_name;

commit;

