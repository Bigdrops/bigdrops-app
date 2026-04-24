begin;

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

insert into public.item_aliases (item_id, alias_text, normalized_alias_text, source)
select
  c.id,
  c.name,
  c.normalized_name,
  'backfill'
from public.item_catalog c
on conflict (normalized_alias_text) do nothing;

update public.invoice_items ii
set item_id = c.id
from public.item_catalog c
where ii.item_id is null
  and coalesce(ii.row_type, 'standard') = 'standard'
  and nullif(trim(ii.description), '') is not null
  and public.normalize_item_text(ii.description) = c.normalized_name;

update public.quotation_items qi
set item_id = c.id
from public.item_catalog c
where qi.item_id is null
  and coalesce(qi.row_type, 'standard') = 'standard'
  and nullif(trim(qi.description), '') is not null
  and public.normalize_item_text(qi.description) = c.normalized_name;

commit;
