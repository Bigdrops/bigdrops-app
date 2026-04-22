begin;

create or replace function public.merge_item_catalog_entries(
  p_winner_item_id uuid,
  p_merged_item_ids uuid[]
)
returns jsonb
language plpgsql
as $$
declare
  v_winner public.item_catalog%rowtype;
  v_merged_ids uuid[];
  v_invoice_rows integer := 0;
  v_quotation_rows integer := 0;
  v_alias_text text;
  v_aliases_added text[] := '{}';
begin
  if p_winner_item_id is null then
    raise exception 'Winner item id is required';
  end if;

  select *
  into v_winner
  from public.item_catalog
  where id = p_winner_item_id;

  if not found then
    raise exception 'Winner item was not found';
  end if;

  select coalesce(array_agg(distinct merged_id), '{}')
  into v_merged_ids
  from unnest(coalesce(p_merged_item_ids, '{}')) as merged_id
  where merged_id is not null
    and merged_id <> p_winner_item_id;

  if coalesce(array_length(v_merged_ids, 1), 0) = 0 then
    raise exception 'At least one duplicate item is required';
  end if;

  update public.invoice_items
  set item_id = p_winner_item_id
  where item_id = any(v_merged_ids);
  get diagnostics v_invoice_rows = row_count;

  update public.quotation_items
  set item_id = p_winner_item_id
  where item_id = any(v_merged_ids);
  get diagnostics v_quotation_rows = row_count;

  for v_alias_text in
    select distinct alias_text
    from (
      select trim(c.name) as alias_text
      from public.item_catalog c
      where c.id = any(v_merged_ids)

      union all

      select trim(a.alias_text) as alias_text
      from public.item_aliases a
      where a.item_id = any(v_merged_ids)
    ) alias_candidates
    where nullif(alias_text, '') is not null
      and public.normalize_item_text(alias_text) <> public.normalize_item_text(v_winner.name)
  loop
    insert into public.item_aliases (
      item_id,
      alias_text,
      normalized_alias_text,
      is_active,
      is_retired,
      source,
      metadata
    )
    values (
      p_winner_item_id,
      v_alias_text,
      public.normalize_item_text(v_alias_text),
      true,
      false,
      'merge',
      jsonb_build_object('merged_into_item_id', p_winner_item_id)
    )
    on conflict (normalized_alias_text) do update
    set item_id = excluded.item_id,
        alias_text = excluded.alias_text,
        is_active = true,
        is_retired = false,
        source = excluded.source,
        metadata = coalesce(public.item_aliases.metadata, '{}'::jsonb) || excluded.metadata,
        updated_at = timezone('utc'::text, now())
    where public.item_aliases.item_id = any(v_merged_ids)
       or public.item_aliases.item_id = p_winner_item_id;

    v_aliases_added := array_append(v_aliases_added, v_alias_text);
  end loop;

  update public.item_aliases
  set is_active = false,
      is_retired = true,
      source = coalesce(source, 'merge'),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'retired_by_merge', true,
        'merged_into_item_id', p_winner_item_id
      )
  where item_id = any(v_merged_ids);

  update public.item_catalog
  set is_active = false,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'merged_into_item_id', p_winner_item_id,
        'merge_status', 'merged',
        'merged_at', timezone('utc'::text, now())
      )
  where id = any(v_merged_ids);

  update public.item_catalog
  set is_active = true,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_merge_applied_at', timezone('utc'::text, now())
      )
  where id = p_winner_item_id;

  insert into public.item_merge_log (from_item_id, to_item_id, action, details)
  select
    merged_id,
    p_winner_item_id,
    'merge',
    jsonb_build_object(
      'aliases_added', v_aliases_added,
      'relinked_invoice_rows', v_invoice_rows,
      'relinked_quotation_rows', v_quotation_rows
    )
  from unnest(v_merged_ids) as merged_id;

  insert into public.item_merge_log (from_item_id, to_item_id, action, details)
  values (
    null,
    p_winner_item_id,
    'relinked_rows',
    jsonb_build_object(
      'relinked_invoice_rows', v_invoice_rows,
      'relinked_quotation_rows', v_quotation_rows,
      'merged_item_ids', v_merged_ids
    )
  );

  return jsonb_build_object(
    'winner_item_id', p_winner_item_id,
    'merged_item_ids', v_merged_ids,
    'aliases_added', (
      select coalesce(jsonb_agg(alias_text order by alias_text), '[]'::jsonb)
      from (
        select distinct unnest(v_aliases_added) as alias_text
      ) deduped_aliases
    ),
    'retired_item_ids', v_merged_ids,
    'relinked_invoice_rows', v_invoice_rows,
    'relinked_quotation_rows', v_quotation_rows
  );
end;
$$;

commit;
