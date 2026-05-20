-- Domain: Items Catalog
-- Tables: item_catalog, item_aliases, item_import_batches, item_merge_log
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS item_catalog (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    normalized_name text NOT NULL,
    standard_price numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS item_aliases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    alias_text text NOT NULL,
    normalized_alias_text text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    is_retired boolean NOT NULL DEFAULT false,
    source text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS item_import_batches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    import_name text,
    source_type text,
    status text NOT NULL DEFAULT 'pending'::text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS item_merge_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    batch_id uuid,
    from_item_id uuid,
    to_item_id uuid,
    action text NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE item_catalog ADD CONSTRAINT item_catalog_pkey PRIMARY KEY (id);
ALTER TABLE item_aliases ADD CONSTRAINT item_aliases_pkey PRIMARY KEY (id);
ALTER TABLE item_import_batches ADD CONSTRAINT item_import_batches_pkey PRIMARY KEY (id);
ALTER TABLE item_merge_log ADD CONSTRAINT item_merge_log_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_catalog_normalized_name ON public.item_catalog USING btree (normalized_name);
CREATE INDEX IF NOT EXISTS idx_item_catalog_is_active ON public.item_catalog USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_item_catalog_created_at ON public.item_catalog USING btree (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_aliases_normalized_alias_text ON public.item_aliases USING btree (normalized_alias_text);
CREATE INDEX IF NOT EXISTS idx_item_aliases_item_id ON public.item_aliases USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_item_aliases_is_active ON public.item_aliases USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_item_merge_log_batch_id ON public.item_merge_log USING btree (batch_id);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE item_aliases ADD CONSTRAINT item_aliases_item_id_fkey FOREIGN KEY (item_id) REFERENCES item_catalog(id);
ALTER TABLE item_merge_log ADD CONSTRAINT item_merge_log_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES item_import_batches(id);
ALTER TABLE item_merge_log ADD CONSTRAINT item_merge_log_from_item_id_fkey FOREIGN KEY (from_item_id) REFERENCES item_catalog(id);
ALTER TABLE item_merge_log ADD CONSTRAINT item_merge_log_to_item_id_fkey FOREIGN KEY (to_item_id) REFERENCES item_catalog(id);

-- Cross-domain FKs (invoice_items and quotation_items reference item_catalog)
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES item_catalog(id);
ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES item_catalog(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE item_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_merge_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_item_catalog_updated_at BEFORE UPDATE ON public.item_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_item_aliases_updated_at BEFORE UPDATE ON public.item_aliases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_item_import_batches_updated_at BEFORE UPDATE ON public.item_import_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.normalize_item_text(input text)
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
$function$;

CREATE OR REPLACE FUNCTION public.get_item_suggestions(search_text text, result_limit integer DEFAULT 5)
 RETURNS TABLE(item_id uuid, display_name text, matched_text text, is_alias boolean, standard_price numeric, last_sold_price numeric, usage_count bigint, rank_score integer)
 LANGUAGE sql
 STABLE
AS $function$
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
$function$;
