-- ============================================================
-- DOCUMENT SEARCH PLATFORM — Phase 1
-- ============================================================
-- Implements the reusable search_documents RPC for all tenant
-- schemas. First phase covers quotations and invoices. The
-- architecture is designed to be extended to RFQ, CPS, Waybill,
-- CSR, and other document types without a separate search system.
--
-- Key decisions:
--   - LANGUAGE sql STABLE, no SECURITY DEFINER (caller-rights
--     RLS, matching get_item_suggestions pattern).
--   - GIN trigram indexes using standard CREATE INDEX IF NOT EXISTS
--     (no CONCURRENTLY — unsafe inside supabase db push txn).
--   - item_id IS NOT required — description is always searched
--     independently of Item Library linkage.
--   - __SCHEMA__ / __SCHEMA_TEXT__ placeholder replacement matches
--     _prov_install_tenant_rpcs and _prov_install_item_library.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- A. Enable pg_trgm extension (idempotent)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- B. Create public._prov_install_search installer helper
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._prov_install_search(p_schema_name text)
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

    -- ── GIN trigram indexes ──────────────────────────────────
    -- quotations.quotation_title
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotations_quotation_title_trgm ON %I.quotations USING GIN (quotation_title gin_trgm_ops)',
        p_schema_name
    );

    -- quotation_items.description
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotation_items_description_trgm ON %I.quotation_items USING GIN (description gin_trgm_ops)',
        p_schema_name
    );

    -- quotation_items.make
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotation_items_make_trgm ON %I.quotation_items USING GIN (make gin_trgm_ops)',
        p_schema_name
    );

    -- invoices.invoice_title
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoices_invoice_title_trgm ON %I.invoices USING GIN (invoice_title gin_trgm_ops)',
        p_schema_name
    );

    -- invoice_items.description
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_description_trgm ON %I.invoice_items USING GIN (description gin_trgm_ops)',
        p_schema_name
    );

    -- invoice_items.make
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_make_trgm ON %I.invoice_items USING GIN (make gin_trgm_ops)',
        p_schema_name
    );

    -- ── search_documents RPC ─────────────────────────────────
    v_body := $b1$
CREATE OR REPLACE FUNCTION __SCHEMA__.search_documents(
    p_term text,
    p_document_types text[] DEFAULT NULL,
    p_client_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    document_type  text,
    document_id    uuid,
    document_number text,
    title          text,
    client_id      uuid,
    client_name    text,
    document_date  date,
    match_source   text,
    matched_text   text,
    match_rank     integer,
    route          text
)
LANGUAGE sql STABLE
AS $fn$
WITH needle AS (
    SELECT lower(trim(coalesce(p_term, ''))) AS n
),
-- ─── QUOTATION: number / client / title ───────────────────
q_header AS (
    SELECT
        'quotation'                                              AS document_type,
        q.id                                                     AS document_id,
        q.quotation_number                                       AS document_number,
        q.quotation_title                                        AS title,
        q.client_id,
        q.client_name,
        q.issue_date                                             AS document_date,
        CASE
            WHEN lower(q.quotation_number) = (SELECT n FROM needle) THEN 'number'
            WHEN lower(q.quotation_number) ILIKE '%' || p_term || '%' THEN 'number'
            WHEN lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%' THEN 'client'
            WHEN lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%' THEN 'title'
        END                                                      AS match_source,
        CASE
            WHEN lower(q.quotation_number) = (SELECT n FROM needle) THEN q.quotation_number
            WHEN lower(q.quotation_number) ILIKE '%' || p_term || '%' THEN q.quotation_number
            WHEN lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%' THEN q.client_name
            WHEN lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%' THEN q.quotation_title
        END                                                      AS matched_text,
        CASE
            WHEN lower(q.quotation_number) = (SELECT n FROM needle) THEN 1000
            WHEN lower(q.quotation_number) ILIKE p_term || '%'       THEN 900
            WHEN lower(q.quotation_number) ILIKE '%' || p_term || '%' THEN 800
            WHEN lower(coalesce(q.quotation_title,'')) = (SELECT n FROM needle) THEN 750
            WHEN lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%' THEN 650
            WHEN lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%' THEN 500
            ELSE 0
        END                                                      AS match_rank,
        '/quotations/' || q.id::text                            AS route
    FROM __SCHEMA__.quotations q
    WHERE q.archived_at IS NULL
      AND (p_client_id IS NULL OR q.client_id = p_client_id)
      AND (
          lower(q.quotation_number) ILIKE '%' || p_term || '%'
          OR lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%'
          OR lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%'
      )
),
-- ─── QUOTATION: item description / make / sub_description ─
q_items AS (
    SELECT
        'quotation'                                              AS document_type,
        q.id                                                     AS document_id,
        q.quotation_number                                       AS document_number,
        q.quotation_title                                        AS title,
        q.client_id,
        q.client_name,
        q.issue_date                                             AS document_date,
        CASE
            WHEN lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%' THEN 'item_description'
            WHEN lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%' THEN 'item_make'
            WHEN lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%' THEN 'item_sub_description'
        END                                                      AS match_source,
        CASE
            WHEN lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%' THEN qi.description
            WHEN lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%' THEN qi.make
            WHEN lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%' THEN qi.sub_description
        END                                                      AS matched_text,
        CASE
            WHEN lower(coalesce(qi.description,'')) = (SELECT n FROM needle) THEN 400
            WHEN lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%' THEN 300
            WHEN lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%' THEN 250
            WHEN lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/quotations/' || q.id::text                            AS route
    FROM __SCHEMA__.quotations q
    JOIN __SCHEMA__.quotation_items qi ON qi.quotation_id = q.id
    WHERE q.archived_at IS NULL
      AND (p_client_id IS NULL OR q.client_id = p_client_id)
      AND coalesce(qi.row_type, 'standard') = 'standard'
      -- item_id intentionally absent from WHERE: description is item_id-independent
      AND (
          lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%'
          OR lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%'
          OR lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%'
      )
),
-- ─── INVOICE: number / client / title ─────────────────────
i_header AS (
    SELECT
        'invoice'                                                AS document_type,
        i.id                                                     AS document_id,
        i.invoice_number                                         AS document_number,
        i.invoice_title                                          AS title,
        i.client_id,
        i.client_name,
        i.issue_date                                             AS document_date,
        CASE
            WHEN lower(i.invoice_number) = (SELECT n FROM needle) THEN 'number'
            WHEN lower(i.invoice_number) ILIKE '%' || p_term || '%' THEN 'number'
            WHEN lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%' THEN 'client'
            WHEN lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%' THEN 'title'
        END                                                      AS match_source,
        CASE
            WHEN lower(i.invoice_number) = (SELECT n FROM needle) THEN i.invoice_number
            WHEN lower(i.invoice_number) ILIKE '%' || p_term || '%' THEN i.invoice_number
            WHEN lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%' THEN i.client_name
            WHEN lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%' THEN i.invoice_title
        END                                                      AS matched_text,
        CASE
            WHEN lower(i.invoice_number) = (SELECT n FROM needle) THEN 1000
            WHEN lower(i.invoice_number) ILIKE p_term || '%'         THEN 900
            WHEN lower(i.invoice_number) ILIKE '%' || p_term || '%'  THEN 800
            WHEN lower(coalesce(i.invoice_title,'')) = (SELECT n FROM needle) THEN 750
            WHEN lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%' THEN 650
            WHEN lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%' THEN 500
            ELSE 0
        END                                                      AS match_rank,
        '/invoices/' || i.id::text                              AS route
    FROM __SCHEMA__.invoices i
    WHERE i.archived_at IS NULL
      AND (p_client_id IS NULL OR i.client_id = p_client_id)
      AND (
          lower(i.invoice_number) ILIKE '%' || p_term || '%'
          OR lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%'
          OR lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%'
      )
),
-- ─── INVOICE: item description / make / sub_description ───
i_items AS (
    SELECT
        'invoice'                                                AS document_type,
        i.id                                                     AS document_id,
        i.invoice_number                                         AS document_number,
        i.invoice_title                                          AS title,
        i.client_id,
        i.client_name,
        i.issue_date                                             AS document_date,
        CASE
            WHEN lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%' THEN 'item_description'
            WHEN lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%' THEN 'item_make'
            WHEN lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%' THEN 'item_sub_description'
        END                                                      AS match_source,
        CASE
            WHEN lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%' THEN ii.description
            WHEN lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%' THEN ii.make
            WHEN lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%' THEN ii.sub_description
        END                                                      AS matched_text,
        CASE
            WHEN lower(coalesce(ii.description,'')) = (SELECT n FROM needle) THEN 400
            WHEN lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%' THEN 300
            WHEN lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%' THEN 250
            WHEN lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/invoices/' || i.id::text                              AS route
    FROM __SCHEMA__.invoices i
    JOIN __SCHEMA__.invoice_items ii ON ii.invoice_id = i.id
    WHERE i.archived_at IS NULL
      AND (p_client_id IS NULL OR i.client_id = p_client_id)
      AND coalesce(ii.row_type, 'standard') = 'standard'
      -- item_id intentionally absent from WHERE: description is item_id-independent
      AND (
          lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%'
          OR lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%'
          OR lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%'
      )
),
-- ─── UNION (pre-dedup) ────────────────────────────────────
combined AS (
    SELECT * FROM q_header
    UNION ALL
    SELECT * FROM q_items
    UNION ALL
    SELECT * FROM i_header
    UNION ALL
    SELECT * FROM i_items
),
-- ─── DEDUP: one row per document, best-rank match_source ──
deduped AS (
    SELECT DISTINCT ON (document_type, document_id)
        document_type, document_id, document_number, title,
        client_id, client_name, document_date,
        match_source, matched_text, match_rank, route
    FROM combined
    WHERE match_rank > 0
      AND (p_document_types IS NULL OR document_type = ANY(p_document_types))
    ORDER BY document_type, document_id, match_rank DESC
)
SELECT
    document_type, document_id, document_number, title,
    client_id, client_name, document_date,
    match_source, matched_text, match_rank, route
FROM deduped
ORDER BY match_rank DESC, document_date DESC NULLS LAST
LIMIT greatest(coalesce(p_limit, 50), 1);
$fn$;
$b1$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

END;
$install$;

-- ─────────────────────────────────────────────────────────────
-- C. Install into tenant_master_template
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'tenant_master_template') THEN
        PERFORM public._prov_install_search('tenant_master_template');
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- D. Backfill all existing entity_* schemas
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT nspname FROM pg_namespace
        WHERE nspname LIKE 'entity\_%'
          AND EXISTS (
              SELECT 1 FROM pg_tables
              WHERE schemaname = nspname AND tablename = 'quotations'
          )
    LOOP
        BEGIN
            PERFORM public._prov_install_search(v_schema);
            RAISE NOTICE 'Installed search_documents for %', v_schema;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to install search_documents for %: %', v_schema, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- E. Update provision_entity to call _prov_install_search
--    (canonical version from 20260927162405, step 11d added)
-- ─────────────────────────────────────────────────────────────
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
    v_template_schema text := 'tenant_master_template';
BEGIN
    -- 1. Validate permissions
    PERFORM public._prov_validate_permissions(p_entity_id);

    -- 2. Idempotency check
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
        -- 3. Acquire advisory lock (transaction-scoped, per-entity)
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        -- 4. Get schema name
        v_schema_name := public._prov_get_schema_name(p_entity_id);

        -- 5. Update status to 'creating'
        PERFORM public._prov_update_status(p_entity_id, 'creating');

        -- 6. Create schema (includes scoped GRANT USAGE + DML + EXECUTE)
        PERFORM public._prov_create_schema(v_schema_name);

        -- 7. Clone template tables from master template
        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table(v_template_schema, v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        -- 8. Re-add foreign keys (re-pointing from template to target schema)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys(v_template_schema, v_schema_name, v_table);
        END LOOP;

        -- 9. Install tenant-local triggers (set_row_updated_at, stamp_row_ownership)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_canonical_triggers(v_schema_name, v_table);
        END LOOP;

        -- 9b. Install accounting enforcement triggers
        PERFORM public._prov_install_accounting_triggers(v_schema_name);

        -- 9c. Install tax immutability triggers
        PERFORM public._prov_install_tax_triggers(v_schema_name);

        -- 10. Build tenant-local financial views
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 11. Setup item library
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);

        -- 11b. Setup item library reconciliation (Stage 2B)
        PERFORM public._prov_install_item_library_reconciliation(v_schema_name, p_entity_id);

        -- 11d. Install document search RPC and indexes
        PERFORM public._prov_install_search(v_schema_name);

        -- 12. Install tenant-local RPCs (audit, lifecycle, activity)
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        -- 13. Seed settings
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 13b. Seed accounting chart of accounts (deterministic, idempotent)
        PERFORM public._prov_seed_chart_of_accounts(v_schema_name);

        -- 14. Seed default permissions (now includes tax resource)
        PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());

        -- 15. Expose schema to PostgREST (Gate 2: pgrst.schemas config)
        PERFORM public._prov_expose_schema_to_postgrest(v_schema_name);

        -- 16. Finalize
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

-- ─────────────────────────────────────────────────────────────
-- F. Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
