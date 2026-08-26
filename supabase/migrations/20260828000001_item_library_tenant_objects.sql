-- ============================================================
-- ITEM-LIBRARY TENANT OBJECTS
-- ============================================================
-- Installs the item-library functions and view into tenant
-- schemas. These are the objects the frontend resolves through
-- tenantClient (schema-scoped RPC + table access):
--
--   normalize_item_text(input text)
--   item_price_summary_v            (view)
--   get_item_suggestions(search_text, result_limit)
--   merge_item_catalog_entries(p_winner_item_id, p_merged_item_ids)
--
-- merge_item_catalog_entries follows the frontend contract from
-- itemLibraryRepository.ts. It re-points invoice_items and
-- quotation_items to the winner, migrates the merged items' names
-- and aliases to the winner, retires the merged items, and writes
-- item_merge_log rows. It gates on the 'item' resource ('edit')
-- so only item editors can merge.
--
-- Bodies use __SCHEMA__ / __ENTITY_ID__ placeholders replaced at
-- install time, matching _prov_install_tenant_rpcs.

CREATE OR REPLACE FUNCTION public._prov_install_item_library(
    p_schema_name text,
    p_entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $install$
DECLARE
    v_schema_ident text;
    v_body text;
BEGIN
    v_schema_ident := quote_ident(p_schema_name);

    -- 1. normalize_item_text (IMMUTABLE, pure text transform)
    v_body := $b1$
CREATE OR REPLACE FUNCTION __SCHEMA__.normalize_item_text(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
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
$function$
;
$b1$;
    EXECUTE replace(v_body, '__SCHEMA__', v_schema_ident);

    -- 2. item_price_summary_v (view; reads through base-table RLS)
    v_body := $b2$
DROP VIEW IF EXISTS __SCHEMA__.item_price_summary_v;
CREATE VIEW __SCHEMA__.item_price_summary_v AS
SELECT
    ic.id AS item_id,
    ic.name,
    ic.standard_price,
    ic.is_active,
    count(ii.id) AS usage_count,
    min(ii.unit_price) AS min_price,
    max(ii.unit_price) AS max_price,
    avg(ii.unit_price) AS avg_price,
    (array_agg(ii.unit_price ORDER BY coalesce(inv.created_at, ii.updated_at) DESC))[1] AS last_sold_price,
    max(coalesce(inv.created_at, ii.updated_at)) AS last_used_at,
    (array_agg(
        CASE WHEN inv.id IS NOT NULL THEN 'invoice' ELSE 'quotation' END
        ORDER BY coalesce(inv.created_at, ii.updated_at) DESC
    ))[1] AS last_source_type,
    (array_agg(
        coalesce(inv.id, qi.quotation_id)
        ORDER BY coalesce(inv.created_at, ii.updated_at) DESC
    ))[1] AS last_source_document_id
FROM __SCHEMA__.item_catalog ic
LEFT JOIN __SCHEMA__.invoice_items ii ON ii.item_id = ic.id
LEFT JOIN __SCHEMA__.invoices inv ON inv.id = ii.invoice_id
LEFT JOIN __SCHEMA__.quotation_items qi ON qi.item_id = ic.id
GROUP BY ic.id, ic.name, ic.standard_price, ic.is_active;
$b2$;
    EXECUTE replace(v_body, '__SCHEMA__', v_schema_ident);

    -- 3. get_item_suggestions (SQL, STABLE; reads through RLS)
    v_body := $b3$
CREATE OR REPLACE FUNCTION __SCHEMA__.get_item_suggestions(search_text text, result_limit integer DEFAULT 5)
 RETURNS TABLE(item_id uuid, display_name text, matched_text text, is_alias boolean, standard_price numeric, last_sold_price numeric, usage_count bigint, rank_score integer)
 LANGUAGE sql
 STABLE
AS $function$
  with q as (
    select __SCHEMA__.normalize_item_text(coalesce(search_text, '')) as needle
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
          when __SCHEMA__.normalize_item_text(c.name) = q.needle then 1000
          when __SCHEMA__.normalize_item_text(c.name) like q.needle || '%' then 900
          when __SCHEMA__.normalize_item_text(c.name) like '%' || q.needle || '%' then 700
          else 0
        end
        + least(coalesce(s.usage_count, 0)::int, 50)
      ) as rank_score
    from __SCHEMA__.item_catalog c
    cross join q
    left join __SCHEMA__.item_price_summary_v s on s.item_id = c.id
    where c.is_active = true
      and q.needle <> ''
      and __SCHEMA__.normalize_item_text(c.name) like '%' || q.needle || '%'
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
          when __SCHEMA__.normalize_item_text(a.alias_text) = q.needle then 850
          when __SCHEMA__.normalize_item_text(a.alias_text) like q.needle || '%' then 800
          when __SCHEMA__.normalize_item_text(a.alias_text) like '%' || q.needle || '%' then 650
          else 0
        end
        + least(coalesce(s.usage_count, 0)::int, 50)
      ) as rank_score
    from __SCHEMA__.item_aliases a
    join __SCHEMA__.item_catalog c on c.id = a.item_id
    cross join q
    left join __SCHEMA__.item_price_summary_v s on s.item_id = c.id
    where c.is_active = true
      and a.is_active = true
      and a.is_retired = false
      and q.needle <> ''
      and __SCHEMA__.normalize_item_text(a.alias_text) like '%' || q.needle || '%'
      and __SCHEMA__.normalize_item_text(a.alias_text) <> __SCHEMA__.normalize_item_text(c.name)
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
$function$
;
$b3$;
    EXECUTE replace(v_body, '__SCHEMA__', v_schema_ident);

    -- 4. merge_item_catalog_entries (plpgsql, SECURITY DEFINER, gated)
    v_body := $b4$
CREATE OR REPLACE FUNCTION __SCHEMA__.merge_item_catalog_entries(
    p_winner_item_id uuid,
    p_merged_item_ids uuid[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_winner_name text;
    v_merged_id uuid;
    v_merged_name text;
    v_aliases_added text[] := '{}';
    v_retired uuid[] := '{}';
    v_relinked_invoice bigint := 0;
    v_relinked_quotation bigint := 0;
    v_moved bigint;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT name INTO v_winner_name FROM __SCHEMA__.item_catalog WHERE id = p_winner_item_id;
    IF v_winner_name IS NULL THEN
        RAISE EXCEPTION 'Winner item not found: %', p_winner_item_id;
    END IF;

    FOREACH v_merged_id IN ARRAY coalesce(p_merged_item_ids, '{}'::uuid[])
    LOOP
        IF v_merged_id IS NULL OR v_merged_id = p_winner_item_id THEN
            CONTINUE;
        END IF;

        SELECT name INTO v_merged_name FROM __SCHEMA__.item_catalog WHERE id = v_merged_id;
        IF v_merged_name IS NULL THEN
            CONTINUE;
        END IF;

        -- 1. Keep the merged item's name as an alias on the winner.
        IF v_merged_name <> v_winner_name THEN
            INSERT INTO __SCHEMA__.item_aliases (item_id, alias_text, normalized_alias_text, source)
            VALUES (p_winner_item_id, v_merged_name, __SCHEMA__.normalize_item_text(v_merged_name), 'merge')
            ON CONFLICT (normalized_alias_text) DO NOTHING;

            IF FOUND THEN
                v_aliases_added := array_append(v_aliases_added, v_merged_name);
            END IF;
        END IF;

        -- 2. Move the merged item's existing aliases to the winner.
        UPDATE __SCHEMA__.item_aliases
           SET item_id = p_winner_item_id, is_retired = true
         WHERE item_id = v_merged_id;

        -- 3. Re-point invoice_items.
        UPDATE __SCHEMA__.invoice_items SET item_id = p_winner_item_id WHERE item_id = v_merged_id;
        GET DIAGNOSTICS v_moved = ROW_COUNT;
        v_relinked_invoice := v_relinked_invoice + v_moved;

        -- 4. Re-point quotation_items.
        UPDATE __SCHEMA__.quotation_items SET item_id = p_winner_item_id WHERE item_id = v_merged_id;
        GET DIAGNOSTICS v_moved = ROW_COUNT;
        v_relinked_quotation := v_relinked_quotation + v_moved;

        -- 5. Retire the merged item (soft-delete preserves history + FKs).
        UPDATE __SCHEMA__.item_catalog SET is_active = false WHERE id = v_merged_id;
        v_retired := array_append(v_retired, v_merged_id);

        -- 6. Record the merge.
        INSERT INTO __SCHEMA__.item_merge_log (from_item_id, to_item_id, action, details)
        VALUES (v_merged_id, p_winner_item_id, 'merge', jsonb_build_object('aliases_added', to_jsonb(v_aliases_added)));
    END LOOP;

    RETURN jsonb_build_object(
        'winner_item_id', p_winner_item_id,
        'merged_item_ids', coalesce(p_merged_item_ids, '{}'::uuid[]),
        'aliases_added', to_jsonb(v_aliases_added),
        'retired_item_ids', to_jsonb(v_retired),
        'relinked_invoice_rows', v_relinked_invoice,
        'relinked_quotation_rows', v_relinked_quotation
    );
END;
$function$
;
$b4$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;
END;
$install$;

-- ============================================================
-- BACKFILL — install into every existing tenant schema
-- ============================================================
DO $$
DECLARE
    v_entity record;
    v_schema text;
BEGIN
    FOR v_entity IN
        SELECT e.id
        FROM public.entities e
        WHERE e.id IS NOT NULL
    LOOP
        v_schema := public._prov_get_schema_name(v_entity.id);
        IF v_schema IS NOT NULL THEN
            PERFORM public._prov_install_item_library(v_schema, v_entity.id);
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- Re-wire provision_entity to install item-library objects
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_entity(p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_idempotency text;
    v_schema_name text;
    v_table text;
    v_resource text;
    v_tables text[];
    v_lock_key bigint;
BEGIN
    PERFORM public._prov_validate_permissions(p_entity_id);

    v_idempotency := public._prov_check_idempotency(p_entity_id);

    IF v_idempotency = 'ready' THEN
        v_schema_name := public._prov_get_schema_name(p_entity_id);
        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity already provisioned'
        );
    END IF;

    IF v_idempotency = 'creating' THEN
        RETURN jsonb_build_object(
            'status', 'creating',
            'message', 'Provisioning already in progress'
        );
    END IF;

    BEGIN
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        v_schema_name := public._prov_get_schema_name(p_entity_id);

        PERFORM public._prov_update_status(p_entity_id, 'creating');

        PERFORM public._prov_create_schema(v_schema_name);

        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table('public', v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys('public', v_schema_name, v_table);
        END LOOP;

        -- 8.5 Seed canonical settings row (restored; dropped by 20260827000000)
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 8.6 Install canonical triggers (LIKE does not copy triggers)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_triggers('public', v_schema_name, v_table);
        END LOOP;

        -- 8.7 Install tenant financial views (invoice_financials_v etc.)
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 8.8 Install tenant item-library objects
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);

        -- 8.9 Install tenant lifecycle / audit RPCs
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        PERFORM public._prov_cleanup_on_error(v_schema_name);
        PERFORM public._prov_update_status(p_entity_id, 'failed', SQLERRM);

        RETURN jsonb_build_object(
            'status', 'failed',
            'error', SQLERRM,
            'schema_name', v_schema_name
        );
    END;
END;
$function$;

-- ============================================================
-- FINAL — Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
