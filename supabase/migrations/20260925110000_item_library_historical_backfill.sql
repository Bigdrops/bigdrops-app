-- ============================================================
-- Item Library Historical Backfill
-- ============================================================
-- Controlled one-time relationship repair for historical null-linked
-- invoice_items and quotation_items.
--
-- The migration:
-- - creates a durable audit trail;
-- - recomputes classification per tenant;
-- - links Tier A exact existing matches;
-- - creates and links Tier B deterministic new catalog identities;
-- - leaves Tier C review rows and Tier D excluded rows untouched.

CREATE TABLE IF NOT EXISTS public.item_library_backfill_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'running',
    dry_run_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,
    started_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at timestamptz,
    CONSTRAINT item_library_backfill_batches_status_check
        CHECK (status IN ('running', 'completed', 'failed', 'skipped'))
);

ALTER TABLE public.item_library_backfill_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.item_library_backfill_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES public.item_library_backfill_batches(id),
    tenant_schema text NOT NULL,
    source_table text NOT NULL,
    source_row_id uuid NOT NULL,
    previous_item_id uuid,
    new_item_id uuid NOT NULL,
    execution_tier text NOT NULL,
    normalized_description text NOT NULL,
    canonical_item_id uuid NOT NULL,
    canonical_source text NOT NULL,
    canonical_created_by_batch boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_library_backfill_audit_source_table_check
        CHECK (source_table IN ('invoice_items', 'quotation_items')),
    CONSTRAINT item_library_backfill_audit_execution_tier_check
        CHECK (execution_tier IN ('tier_a_existing', 'tier_b_new')),
    CONSTRAINT item_library_backfill_audit_canonical_source_check
        CHECK (canonical_source IN ('existing_catalog', 'existing_alias', 'created_by_batch', 'existing_conflict')),
    CONSTRAINT item_library_backfill_audit_one_record_per_batch_row
        UNIQUE (batch_id, tenant_schema, source_table, source_row_id)
);

ALTER TABLE public.item_library_backfill_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_item_library_backfill_audit_batch
    ON public.item_library_backfill_audit(batch_id);

CREATE INDEX IF NOT EXISTS idx_item_library_backfill_audit_tenant_row
    ON public.item_library_backfill_audit(tenant_schema, source_table, source_row_id);

CREATE OR REPLACE FUNCTION public._item_library_backfill_tokenize(input text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT coalesce(
        array_agg(token ORDER BY token),
        ARRAY[]::text[]
    )
    FROM (
        SELECT DISTINCT token
        FROM regexp_split_to_table(
            regexp_replace(
                regexp_replace(
                    lower(coalesce(input, '')),
                    '\([^)]*\)|\[[^\]]*]|\{[^}]*}',
                    ' ',
                    'g'
                ),
                '[^a-z0-9]+',
                ' ',
                'g'
            ),
            '\s+'
        ) AS token
        WHERE length(token) > 2
          AND token NOT IN ('and', 'for', 'the', 'with')
    ) tokens;
$function$;

CREATE OR REPLACE FUNCTION public._item_library_backfill_token_overlap(left_tokens text[], right_tokens text[])
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT count(*)::integer
    FROM unnest(coalesce(left_tokens, ARRAY[]::text[])) left_token
    WHERE left_token = ANY(coalesce(right_tokens, ARRAY[]::text[]));
$function$;

CREATE OR REPLACE FUNCTION public._item_library_backfill_classify_tenant(p_schema_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_summary jsonb;
    v_count integer;
BEGIN
    IF p_schema_name IN (
        'entity_bigdrops-main_agam',
        'entity_bigdrops-main_issa-certified',
        'entity_bigdrops-main_ororo'
    ) THEN
        RETURN jsonb_build_object(
            'tenant_schema', p_schema_name,
            'status', 'skipped_incomplete_tenant'
        );
    END IF;

    IF to_regclass(format('%I.invoice_items', p_schema_name)) IS NULL
       OR to_regclass(format('%I.quotation_items', p_schema_name)) IS NULL
       OR to_regclass(format('%I.item_catalog', p_schema_name)) IS NULL
       OR to_regclass(format('%I.item_aliases', p_schema_name)) IS NULL THEN
        RETURN jsonb_build_object(
            'tenant_schema', p_schema_name,
            'status', 'skipped_missing_required_objects'
        );
    END IF;

    EXECUTE format(
        'SELECT count(*)
           FROM (
             SELECT normalized_name
             FROM %I.item_catalog
             WHERE is_active = true
             GROUP BY normalized_name
             HAVING count(*) > 1
           ) duplicates',
        p_schema_name
    )
    INTO v_count;

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Duplicate active normalized catalog identities: %',
            p_schema_name,
            v_count;
    END IF;

    DROP TABLE IF EXISTS ilb_rows;
    DROP TABLE IF EXISTS ilb_catalog;
    DROP TABLE IF EXISTS ilb_aliases;
    DROP TABLE IF EXISTS ilb_eligible;
    DROP TABLE IF EXISTS ilb_direct_counts;
    DROP TABLE IF EXISTS ilb_alias_counts;
    DROP TABLE IF EXISTS ilb_candidate_groups;
    DROP TABLE IF EXISTS ilb_refs;
    DROP TABLE IF EXISTS ilb_classified_rows;

    CREATE TEMP TABLE ilb_rows (
        source_table text NOT NULL,
        source_row_id uuid NOT NULL,
        item_id uuid,
        row_type text,
        description text,
        unit text,
        unit_price numeric,
        normalized_description text NOT NULL
    ) ON COMMIT DROP;

    EXECUTE format(
        'INSERT INTO ilb_rows (
             source_table,
             source_row_id,
             item_id,
             row_type,
             description,
             unit,
             unit_price,
             normalized_description
         )
         SELECT
             ''invoice_items'',
             id,
             item_id,
             row_type,
             description,
             unit,
             unit_price,
             %I.normalize_item_text(description)
         FROM %I.invoice_items
         WHERE item_id IS NULL
         UNION ALL
         SELECT
             ''quotation_items'',
             id,
             item_id,
             row_type,
             description,
             unit,
             unit_price,
             %I.normalize_item_text(description)
         FROM %I.quotation_items
         WHERE item_id IS NULL',
        p_schema_name,
        p_schema_name,
        p_schema_name,
        p_schema_name
    );

    CREATE TEMP TABLE ilb_catalog ON COMMIT DROP AS
    SELECT NULL::uuid AS item_id, NULL::text AS name, NULL::text AS normalized_name, NULL::boolean AS is_active
    WITH NO DATA;

    EXECUTE format(
        'INSERT INTO ilb_catalog (item_id, name, normalized_name, is_active)
         SELECT id, name, normalized_name, is_active
         FROM %I.item_catalog',
        p_schema_name
    );

    CREATE TEMP TABLE ilb_aliases ON COMMIT DROP AS
    SELECT NULL::uuid AS alias_id, NULL::uuid AS item_id, NULL::text AS alias_text,
           NULL::text AS normalized_alias_text, NULL::boolean AS is_active, NULL::boolean AS is_retired
    WITH NO DATA;

    EXECUTE format(
        'INSERT INTO ilb_aliases (
             alias_id,
             item_id,
             alias_text,
             normalized_alias_text,
             is_active,
             is_retired
         )
         SELECT id, item_id, alias_text, normalized_alias_text, is_active, is_retired
         FROM %I.item_aliases',
        p_schema_name
    );

    CREATE TEMP TABLE ilb_eligible ON COMMIT DROP AS
    SELECT *
    FROM ilb_rows
    WHERE coalesce(row_type, 'standard') = 'standard'
      AND normalized_description <> '';

    CREATE TEMP TABLE ilb_direct_counts ON COMMIT DROP AS
    SELECT
        e.source_table,
        e.source_row_id,
        count(c.item_id)::integer AS direct_target_count,
        min(c.item_id::text)::uuid AS direct_item_id
    FROM ilb_eligible e
    LEFT JOIN ilb_catalog c
      ON c.normalized_name = e.normalized_description
     AND c.is_active = true
    GROUP BY e.source_table, e.source_row_id;

    CREATE TEMP TABLE ilb_alias_counts ON COMMIT DROP AS
    SELECT
        e.source_table,
        e.source_row_id,
        count(a.alias_id)::integer AS alias_target_count,
        min(a.item_id::text)::uuid AS alias_item_id
    FROM ilb_eligible e
    LEFT JOIN ilb_aliases a
      ON a.normalized_alias_text = e.normalized_description
     AND a.is_active = true
     AND a.is_retired = false
    LEFT JOIN ilb_catalog c
      ON c.item_id = a.item_id
     AND c.is_active = true
    WHERE a.alias_id IS NULL
       OR c.item_id IS NOT NULL
    GROUP BY e.source_table, e.source_row_id;

    IF EXISTS (SELECT 1 FROM ilb_direct_counts WHERE direct_target_count > 1) THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Tier A target is not one-to-one.',
            p_schema_name;
    END IF;

    IF EXISTS (SELECT 1 FROM ilb_alias_counts WHERE alias_target_count > 1) THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Alias resolution is ambiguous.',
            p_schema_name;
    END IF;

    CREATE TEMP TABLE ilb_candidate_groups ON COMMIT DROP AS
    SELECT
        e.normalized_description,
        min(nullif(btrim(e.description), '')) AS display_name,
        count(*)::integer AS occurrence_count,
        public._item_library_backfill_tokenize(e.normalized_description) AS tokens,
        false AS near_catalog,
        false AS near_alias,
        false AS near_candidate,
        false AS is_tier_b
    FROM ilb_eligible e
    JOIN ilb_direct_counts d
      ON d.source_table = e.source_table
     AND d.source_row_id = e.source_row_id
    JOIN ilb_alias_counts a
      ON a.source_table = e.source_table
     AND a.source_row_id = e.source_row_id
    WHERE d.direct_target_count = 0
      AND a.alias_target_count = 0
    GROUP BY e.normalized_description;

    CREATE TEMP TABLE ilb_refs ON COMMIT DROP AS
    SELECT
        'catalog'::text AS ref_kind,
        normalized_name AS normalized_description,
        public._item_library_backfill_tokenize(normalized_name) AS tokens
    FROM ilb_catalog
    WHERE is_active = true
    UNION ALL
    SELECT
        'alias'::text AS ref_kind,
        a.normalized_alias_text AS normalized_description,
        public._item_library_backfill_tokenize(a.normalized_alias_text) AS tokens
    FROM ilb_aliases a
    JOIN ilb_catalog c
      ON c.item_id = a.item_id
     AND c.is_active = true
    WHERE a.is_active = true
      AND a.is_retired = false;

    CREATE INDEX ilb_candidate_groups_tokens_idx ON ilb_candidate_groups USING gin(tokens);
    CREATE INDEX ilb_refs_tokens_idx ON ilb_refs USING gin(tokens);

    UPDATE ilb_candidate_groups g
    SET near_catalog = true
    WHERE EXISTS (
        SELECT 1
        FROM ilb_refs r
        WHERE r.ref_kind = 'catalog'
          AND r.normalized_description <> g.normalized_description
          AND (
              (
                  length(r.normalized_description) >= 8
                  AND length(g.normalized_description) >= 8
                  AND (
                      position(g.normalized_description in r.normalized_description) > 0
                      OR position(r.normalized_description in g.normalized_description) > 0
                  )
              )
              OR (
                  g.tokens && r.tokens
                  AND public._item_library_backfill_token_overlap(g.tokens, r.tokens) >= 3
              )
          )
    );

    UPDATE ilb_candidate_groups g
    SET near_alias = true
    WHERE EXISTS (
        SELECT 1
        FROM ilb_refs r
        WHERE r.ref_kind = 'alias'
          AND r.normalized_description <> g.normalized_description
          AND (
              (
                  length(r.normalized_description) >= 8
                  AND length(g.normalized_description) >= 8
                  AND (
                      position(g.normalized_description in r.normalized_description) > 0
                      OR position(r.normalized_description in g.normalized_description) > 0
                  )
              )
              OR (
                  g.tokens && r.tokens
                  AND public._item_library_backfill_token_overlap(g.tokens, r.tokens) >= 3
              )
          )
    );

    UPDATE ilb_candidate_groups g
    SET near_candidate = true
    WHERE EXISTS (
        SELECT 1
        FROM ilb_candidate_groups other
        WHERE other.normalized_description <> g.normalized_description
          AND (
              (
                  length(other.normalized_description) >= 8
                  AND length(g.normalized_description) >= 8
                  AND (
                      position(g.normalized_description in other.normalized_description) > 0
                      OR position(other.normalized_description in g.normalized_description) > 0
                  )
              )
              OR (
                  g.tokens && other.tokens
                  AND public._item_library_backfill_token_overlap(g.tokens, other.tokens) >= 3
              )
          )
    );

    UPDATE ilb_candidate_groups
    SET is_tier_b = true
    WHERE near_catalog = false
      AND near_alias = false
      AND near_candidate = false;

    CREATE TEMP TABLE ilb_classified_rows (
        source_table text NOT NULL,
        source_row_id uuid NOT NULL,
        row_type text,
        description text,
        unit text,
        unit_price numeric,
        normalized_description text NOT NULL,
        execution_tier text NOT NULL,
        target_item_id uuid,
        canonical_source text
    ) ON COMMIT DROP;

    INSERT INTO ilb_classified_rows (
        source_table,
        source_row_id,
        row_type,
        description,
        unit,
        unit_price,
        normalized_description,
        execution_tier,
        target_item_id,
        canonical_source
    )
    SELECT
        e.source_table,
        e.source_row_id,
        e.row_type,
        e.description,
        e.unit,
        e.unit_price,
        e.normalized_description,
        CASE
            WHEN d.direct_target_count = 1 THEN 'tier_a_existing'
            WHEN d.direct_target_count = 0 AND a.alias_target_count = 1 THEN 'tier_a_existing'
            WHEN d.direct_target_count = 0 AND a.alias_target_count = 0 AND g.is_tier_b = true THEN 'tier_b_new'
            ELSE 'tier_c_review'
        END AS execution_tier,
        CASE
            WHEN d.direct_target_count = 1 THEN d.direct_item_id
            WHEN d.direct_target_count = 0 AND a.alias_target_count = 1 THEN a.alias_item_id
            ELSE NULL::uuid
        END AS target_item_id,
        CASE
            WHEN d.direct_target_count = 1 THEN 'existing_catalog'
            WHEN d.direct_target_count = 0 AND a.alias_target_count = 1 THEN 'existing_alias'
            WHEN d.direct_target_count = 0 AND a.alias_target_count = 0 AND g.is_tier_b = true THEN 'created_by_batch'
            ELSE NULL
        END AS canonical_source
    FROM ilb_eligible e
    JOIN ilb_direct_counts d
      ON d.source_table = e.source_table
     AND d.source_row_id = e.source_row_id
    JOIN ilb_alias_counts a
      ON a.source_table = e.source_table
     AND a.source_row_id = e.source_row_id
    LEFT JOIN ilb_candidate_groups g
      ON g.normalized_description = e.normalized_description;

    INSERT INTO ilb_classified_rows (
        source_table,
        source_row_id,
        row_type,
        description,
        unit,
        unit_price,
        normalized_description,
        execution_tier,
        target_item_id,
        canonical_source
    )
    SELECT
        r.source_table,
        r.source_row_id,
        r.row_type,
        r.description,
        r.unit,
        r.unit_price,
        r.normalized_description,
        'tier_d_excluded',
        NULL::uuid,
        NULL::text
    FROM ilb_rows r
    WHERE coalesce(row_type, 'standard') <> 'standard'
       OR normalized_description = '';

    SELECT jsonb_build_object(
        'tenant_schema', p_schema_name,
        'status', 'classified',
        'total_null_linked_rows', (SELECT count(*) FROM ilb_rows),
        'tier_a_occurrences', (SELECT count(*) FROM ilb_classified_rows WHERE execution_tier = 'tier_a_existing'),
        'tier_b_occurrences', (SELECT count(*) FROM ilb_classified_rows WHERE execution_tier = 'tier_b_new'),
        'tier_b_distinct_identities', (SELECT count(DISTINCT normalized_description) FROM ilb_classified_rows WHERE execution_tier = 'tier_b_new'),
        'tier_c_occurrences', (SELECT count(*) FROM ilb_classified_rows WHERE execution_tier = 'tier_c_review'),
        'tier_d_occurrences', (SELECT count(*) FROM ilb_classified_rows WHERE execution_tier = 'tier_d_excluded'),
        'invoice_mutation_candidates', (SELECT count(*) FROM ilb_classified_rows WHERE execution_tier IN ('tier_a_existing', 'tier_b_new') AND source_table = 'invoice_items'),
        'quotation_mutation_candidates', (SELECT count(*) FROM ilb_classified_rows WHERE execution_tier IN ('tier_a_existing', 'tier_b_new') AND source_table = 'quotation_items'),
        'reconciled', (
            (SELECT count(*) FROM ilb_rows)
            =
            (SELECT count(*) FROM ilb_classified_rows)
        )
    )
    INTO v_summary;

    IF coalesce((v_summary->>'reconciled')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Classification arithmetic does not reconcile.',
            p_schema_name;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM ilb_classified_rows
        WHERE execution_tier IN ('tier_a_existing', 'tier_b_new')
          AND (
              coalesce(row_type, 'standard') <> 'standard'
              OR normalized_description = ''
          )
    ) THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Tier C/D or empty/non-standard rows leaked into mutation set.',
            p_schema_name;
    END IF;

    RETURN v_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public._item_library_backfill_mutate_tenant(
    p_schema_name text,
    p_batch_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    classification_summary jsonb;
    after_summary jsonb;
    v_after_tier_c integer;
    v_after_tier_d integer;
    v_created_catalog_count integer := 0;
    v_linked_count integer := 0;
    v_invoice_linked_count integer := 0;
    v_quotation_linked_count integer := 0;
    v_disable_invoice_updated_at_trigger boolean := false;
    v_disable_quotation_updated_at_trigger boolean := false;
BEGIN
    classification_summary := public._item_library_backfill_classify_tenant(p_schema_name);

    IF classification_summary->>'status' <> 'classified' THEN
        RETURN classification_summary;
    END IF;

    EXECUTE format(
        'INSERT INTO %I.item_catalog (
             name,
             normalized_name,
             standard_price,
             metadata
         )
         SELECT
             min(nullif(btrim(c.description), '''')),
             c.normalized_description,
             0,
             jsonb_build_object(
                 ''source'', ''historical_backfill'',
                 ''created_by_batch_id'', $1::text
             )
         FROM ilb_classified_rows c
         WHERE c.execution_tier = ''tier_b_new''
         GROUP BY c.normalized_description
         ON CONFLICT (normalized_name) DO NOTHING',
        p_schema_name
    )
    USING p_batch_id;

    GET DIAGNOSTICS v_created_catalog_count = ROW_COUNT;

    EXECUTE format(
        'UPDATE ilb_classified_rows c
         SET
             target_item_id = ic.id,
             canonical_source = CASE
                 WHEN ic.metadata->>''created_by_batch_id'' = $1::text THEN ''created_by_batch''
                 ELSE ''existing_conflict''
             END
         FROM %I.item_catalog ic
         WHERE c.execution_tier = ''tier_b_new''
           AND ic.normalized_name = c.normalized_description
           AND ic.is_active = true',
        p_schema_name
    )
    USING p_batch_id;

    IF EXISTS (
        SELECT 1
        FROM ilb_classified_rows
        WHERE execution_tier IN ('tier_a_existing', 'tier_b_new')
          AND target_item_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. A mutation candidate has no target item.',
            p_schema_name;
    END IF;

    EXECUTE format(
        'INSERT INTO public.item_library_backfill_audit (
             batch_id,
             tenant_schema,
             source_table,
             source_row_id,
             previous_item_id,
             new_item_id,
             execution_tier,
             normalized_description,
             canonical_item_id,
             canonical_source,
             canonical_created_by_batch
         )
         SELECT
             $1,
             $2,
             c.source_table,
             c.source_row_id,
             ii.item_id,
             c.target_item_id,
             c.execution_tier,
             c.normalized_description,
             c.target_item_id,
             c.canonical_source,
             c.canonical_source = ''created_by_batch''
         FROM ilb_classified_rows c
         JOIN %I.invoice_items ii ON ii.id = c.source_row_id
         JOIN %I.item_catalog ic ON ic.id = c.target_item_id AND ic.is_active = true
         WHERE c.source_table = ''invoice_items''
           AND c.execution_tier IN (''tier_a_existing'', ''tier_b_new'')
           AND ii.item_id IS NULL
           AND coalesce(ii.row_type, ''standard'') = ''standard''
           AND %I.normalize_item_text(ii.description) = c.normalized_description
         ON CONFLICT (batch_id, tenant_schema, source_table, source_row_id) DO NOTHING',
        p_schema_name,
        p_schema_name,
        p_schema_name
    )
    USING p_batch_id, p_schema_name;

    EXECUTE format(
        'INSERT INTO public.item_library_backfill_audit (
             batch_id,
             tenant_schema,
             source_table,
             source_row_id,
             previous_item_id,
             new_item_id,
             execution_tier,
             normalized_description,
             canonical_item_id,
             canonical_source,
             canonical_created_by_batch
         )
         SELECT
             $1,
             $2,
             c.source_table,
             c.source_row_id,
             qi.item_id,
             c.target_item_id,
             c.execution_tier,
             c.normalized_description,
             c.target_item_id,
             c.canonical_source,
             c.canonical_source = ''created_by_batch''
         FROM ilb_classified_rows c
         JOIN %I.quotation_items qi ON qi.id = c.source_row_id
         JOIN %I.item_catalog ic ON ic.id = c.target_item_id AND ic.is_active = true
         WHERE c.source_table = ''quotation_items''
           AND c.execution_tier IN (''tier_a_existing'', ''tier_b_new'')
           AND qi.item_id IS NULL
           AND coalesce(qi.row_type, ''standard'') = ''standard''
           AND %I.normalize_item_text(qi.description) = c.normalized_description
         ON CONFLICT (batch_id, tenant_schema, source_table, source_row_id) DO NOTHING',
        p_schema_name,
        p_schema_name,
        p_schema_name
    )
    USING p_batch_id, p_schema_name;

    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = p_schema_name
          AND c.relname = 'invoice_items'
          AND t.tgname = 'trg_invoice_items_set_updated_at'
          AND NOT t.tgisinternal
    )
    INTO v_disable_invoice_updated_at_trigger;

    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = p_schema_name
          AND c.relname = 'quotation_items'
          AND t.tgname = 'trg_quotation_items_set_updated_at'
          AND NOT t.tgisinternal
    )
    INTO v_disable_quotation_updated_at_trigger;

    IF v_disable_invoice_updated_at_trigger THEN
        EXECUTE format(
            'ALTER TABLE %I.invoice_items DISABLE TRIGGER trg_invoice_items_set_updated_at',
            p_schema_name
        );
    END IF;

    IF v_disable_quotation_updated_at_trigger THEN
        EXECUTE format(
            'ALTER TABLE %I.quotation_items DISABLE TRIGGER trg_quotation_items_set_updated_at',
            p_schema_name
        );
    END IF;

    EXECUTE format(
        'UPDATE %I.invoice_items SET item_id = a.new_item_id
         FROM public.item_library_backfill_audit a
         WHERE a.batch_id = $1
           AND a.tenant_schema = $2
           AND a.source_table = ''invoice_items''
           AND a.source_row_id = invoice_items.id
           AND invoice_items.item_id IS NULL',
        p_schema_name
    )
    USING p_batch_id, p_schema_name;

    GET DIAGNOSTICS v_invoice_linked_count = ROW_COUNT;

    EXECUTE format(
        'UPDATE %I.quotation_items SET item_id = a.new_item_id
         FROM public.item_library_backfill_audit a
         WHERE a.batch_id = $1
           AND a.tenant_schema = $2
           AND a.source_table = ''quotation_items''
           AND a.source_row_id = quotation_items.id
           AND quotation_items.item_id IS NULL',
        p_schema_name
    )
    USING p_batch_id, p_schema_name;

    GET DIAGNOSTICS v_quotation_linked_count = ROW_COUNT;
    v_linked_count := v_invoice_linked_count + v_quotation_linked_count;

    IF v_disable_invoice_updated_at_trigger THEN
        EXECUTE format(
            'ALTER TABLE %I.invoice_items ENABLE TRIGGER trg_invoice_items_set_updated_at',
            p_schema_name
        );
    END IF;

    IF v_disable_quotation_updated_at_trigger THEN
        EXECUTE format(
            'ALTER TABLE %I.quotation_items ENABLE TRIGGER trg_quotation_items_set_updated_at',
            p_schema_name
        );
    END IF;

    after_summary := public._item_library_backfill_classify_tenant(p_schema_name);
    v_after_tier_c := coalesce((after_summary->>'tier_c_occurrences')::integer, 0);
    v_after_tier_d := coalesce((after_summary->>'tier_d_occurrences')::integer, 0);

    -- Guard: classification_summary.tier_c_occurrences = v_after_tier_c.
    IF coalesce((classification_summary->>'tier_c_occurrences')::integer, 0) <> v_after_tier_c THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Tier C changed from % to %.',
            p_schema_name,
            classification_summary->>'tier_c_occurrences',
            v_after_tier_c;
    END IF;

    -- Guard: classification_summary.tier_d_occurrences = v_after_tier_d.
    IF coalesce((classification_summary->>'tier_d_occurrences')::integer, 0) <> v_after_tier_d THEN
        RAISE EXCEPTION 'Item library backfill aborted for %. Tier D changed from % to %.',
            p_schema_name,
            classification_summary->>'tier_d_occurrences',
            v_after_tier_d;
    END IF;

    RETURN jsonb_build_object(
        'tenant_schema', p_schema_name,
        'status', 'mutated',
        'before', classification_summary,
        'after', after_summary,
        'created_catalog_count', v_created_catalog_count,
        'linked_count', v_linked_count,
        'invoice_linked_count', v_invoice_linked_count,
        'quotation_linked_count', v_quotation_linked_count
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_item_library_historical_backfill(
    p_batch_name text DEFAULT '2026-09-25 controlled historical item library backfill'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_batch_id uuid;
    v_existing_status text;
    v_schema_name text;
    v_dry_run jsonb := '[]'::jsonb;
    v_results jsonb := '[]'::jsonb;
    v_tenant_summary jsonb;
BEGIN
    INSERT INTO public.item_library_backfill_batches (batch_name, status)
    VALUES (p_batch_name, 'running')
    ON CONFLICT (batch_name) DO UPDATE
    SET batch_name = excluded.batch_name
    RETURNING id, status INTO v_batch_id, v_existing_status;

    SELECT status INTO v_existing_status
    FROM public.item_library_backfill_batches
    WHERE id = v_batch_id;

    IF v_existing_status = 'completed' THEN
        RETURN (
            SELECT result_summary
            FROM public.item_library_backfill_batches
            WHERE id = v_batch_id
        );
    END IF;

    FOR v_schema_name IN
        SELECT n.nspname
        FROM pg_namespace n
        WHERE n.nspname LIKE 'entity\_%' ESCAPE '\'
        ORDER BY n.nspname
    LOOP
        v_tenant_summary := public._item_library_backfill_classify_tenant(v_schema_name);
        v_dry_run := v_dry_run || jsonb_build_array(v_tenant_summary);
    END LOOP;

    UPDATE public.item_library_backfill_batches
    SET dry_run_summary = v_dry_run
    WHERE id = v_batch_id;

    FOR v_schema_name IN
        SELECT value->>'tenant_schema'
        FROM jsonb_array_elements(v_dry_run) value
        WHERE value->>'status' = 'classified'
        ORDER BY value->>'tenant_schema'
    LOOP
        v_tenant_summary := public._item_library_backfill_mutate_tenant(v_schema_name, v_batch_id);
        v_results := v_results || jsonb_build_array(v_tenant_summary);
    END LOOP;

    UPDATE public.item_library_backfill_batches
    SET
        status = 'completed',
        result_summary = v_results,
        completed_at = timezone('utc'::text, now())
    WHERE id = v_batch_id;

    RETURN v_results;
EXCEPTION
    WHEN OTHERS THEN
        IF v_batch_id IS NOT NULL THEN
            UPDATE public.item_library_backfill_batches
            SET
                status = 'failed',
                error_message = SQLERRM,
                completed_at = timezone('utc'::text, now())
            WHERE id = v_batch_id;
        END IF;

        RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public._item_library_backfill_tokenize(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._item_library_backfill_token_overlap(text[], text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._item_library_backfill_classify_tenant(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._item_library_backfill_mutate_tenant(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_item_library_historical_backfill(text) FROM PUBLIC;

DO $$
BEGIN
    PERFORM public.run_item_library_historical_backfill(
        '2026-09-25 controlled historical item library backfill'
    );
END;
$$;
