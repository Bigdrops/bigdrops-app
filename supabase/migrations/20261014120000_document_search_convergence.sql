-- ============================================================
-- DOCUMENT SEARCH PLATFORM — Phase 2 convergence
-- ============================================================
-- Repairs the document search platform shipped in
-- 20261014100000_document_search_platform.sql.  That migration is
-- already applied and is NOT modified; this migration replaces the
-- tenant objects it created and keeps every later tenant on the
-- corrected definition.
--
-- Defects corrected here (all reproduced against the live database):
--
--   1. Term normalisation was inconsistent.  Only the exact-equality
--      comparisons used the normalised needle; every ILIKE predicate
--      used the raw p_term.  A term with surrounding whitespace
--      matched nothing: search_documents('  Oil Separator  ')
--      returned 0 rows while search_documents('Oil Separator')
--      returned 1.  The needle is now normalised once and every
--      predicate uses it.
--
--   2. Empty and whitespace-only terms returned the whole document
--      set:  search_documents('') returned 50 rows (the default
--      limit) and search_documents('   ') returned 3 rows.  The
--      needle relation is now empty for a blank term, so the search
--      returns no rows and does not scan the document tables.
--
--   3. LIKE metacharacters in user input were passed through as
--      wildcards: search_documents('%') and search_documents('_')
--      each returned 50 rows.  Backslash, percent and underscore are
--      now backslash-escaped in the needle, so input is matched
--      literally.
--
--   4. Every predicate wrapped the column in lower(), e.g.
--      lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%'.
--      A function on the column makes the GIN trigram indexes
--      unusable and forced a sequential scan.  ILIKE is already
--      case-insensitive, so the wrapper is gone and the predicates
--      now read the raw columns.  Measured effect is recorded in
--      docs/reports/SEARCH/phase-2-document-search-implementation.md.
--
--   5. The backfill block swallowed every installation error with
--      EXCEPTION WHEN OTHERS THEN RAISE WARNING.  Structurally
--      incomplete tenant schemas are now classified explicitly and
--      reported by name, and a failure in a schema that does hold
--      the document tables now aborts the migration.
--
--   6. DISTINCT ON ... ORDER BY ranked only on match_rank, so two
--      matches of equal rank left the winning match_source and
--      matched_text unspecified.  Deterministic tie-breakers were
--      added to the dedup and to the final ordering.
--
--   7. public._prov_install_search(text) is SECURITY DEFINER and
--      accepted a caller-supplied schema name with EXECUTE granted
--      to PUBLIC.  The caller can no longer name an arbitrary schema
--      and the execute grants were revoked.
--
-- Design is otherwise unchanged: caller-rights LANGUAGE sql STABLE,
-- original source tables only, item_id is never a search
-- prerequisite.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- A. Enable pg_trgm extension (idempotent)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- B. Replace public._prov_install_search with the corrected installer
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
    -- Only provisioning-owned schemas may be targeted.  The caller must
    -- never be able to name an arbitrary schema.
    IF left(p_schema_name, 7) <> 'entity_' AND p_schema_name <> 'tenant_master_template' THEN
        RAISE EXCEPTION
            'Refusing to install document search into schema % — only entity_* schemas and tenant_master_template are allowed',
            p_schema_name;
    END IF;

    v_schema_ident := quote_ident(p_schema_name);

    -- ── GIN trigram indexes ──────────────────────────────────
    -- Every column that the RPC matches with ILIKE carries a trigram
    -- index, so each branch of the OR predicates is indexable.
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number_trgm ON %I.quotations USING GIN (quotation_number gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotations_client_name_trgm ON %I.quotations USING GIN (client_name gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotations_quotation_title_trgm ON %I.quotations USING GIN (quotation_title gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotation_items_description_trgm ON %I.quotation_items USING GIN (description gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotation_items_make_trgm ON %I.quotation_items USING GIN (make gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_quotation_items_sub_description_trgm ON %I.quotation_items USING GIN (sub_description gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_trgm ON %I.invoices USING GIN (invoice_number gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoices_client_name_trgm ON %I.invoices USING GIN (client_name gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoices_invoice_title_trgm ON %I.invoices USING GIN (invoice_title gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_description_trgm ON %I.invoice_items USING GIN (description gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_make_trgm ON %I.invoice_items USING GIN (make gin_trgm_ops)',
        p_schema_name
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_sub_description_trgm ON %I.invoice_items USING GIN (sub_description gin_trgm_ops)',
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
WITH term AS (
    -- Normalise once.  Both the exact comparisons and the substring
    -- comparisons use this single value.
    SELECT lower(btrim(coalesce(p_term, ''))) AS raw
),
needle AS (
    -- Escape LIKE metacharacters so user input is matched literally.
    -- chr(92) is a backslash; using it keeps this body independent of
    -- standard_conforming_strings.
    --
    -- The relation is empty when the term is blank, so an empty or
    -- whitespace-only term produces no rows and never reaches the
    -- document tables.
    SELECT replace(
               replace(
                   replace(raw, chr(92), chr(92) || chr(92)),
                   '%', chr(92) || '%'),
               '_', chr(92) || '_') AS n
    FROM term
    WHERE raw <> ''
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
        -- The order below mirrors the rank CASE exactly, so the reported
        -- source and text always belong to the winning match.  Every
        -- branch that can score above zero is covered, so a scored row
        -- can never report a null source or a null matched text.
        CASE
            WHEN q.quotation_number ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(q.quotation_title,'') ILIKE '%' || nd.n || '%' THEN 'title'
            WHEN coalesce(q.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
        END                                                      AS match_source,
        CASE
            WHEN q.quotation_number ILIKE '%' || nd.n || '%' THEN q.quotation_number
            WHEN coalesce(q.quotation_title,'') ILIKE '%' || nd.n || '%' THEN q.quotation_title
            WHEN coalesce(q.client_name,'') ILIKE '%' || nd.n || '%' THEN q.client_name
        END                                                      AS matched_text,
        CASE
            WHEN q.quotation_number ILIKE nd.n                    THEN 1000
            WHEN q.quotation_number ILIKE nd.n || '%'             THEN 900
            WHEN q.quotation_number ILIKE '%' || nd.n || '%'      THEN 800
            WHEN coalesce(q.quotation_title,'') ILIKE nd.n       THEN 750
            WHEN coalesce(q.quotation_title,'') ILIKE '%' || nd.n || '%' THEN 650
            WHEN coalesce(q.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            ELSE 0
        END                                                      AS match_rank,
        '/quotations/' || q.id::text                            AS route
    FROM __SCHEMA__.quotations q
    CROSS JOIN needle nd
    WHERE q.archived_at IS NULL
      AND (p_client_id IS NULL OR q.client_id = p_client_id)
      AND (
          q.quotation_number ILIKE '%' || nd.n || '%'
          OR coalesce(q.client_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(q.quotation_title,'') ILIKE '%' || nd.n || '%'
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
            WHEN coalesce(qi.description,'') ILIKE '%' || nd.n || '%' THEN 'item_description'
            WHEN coalesce(qi.make,'') ILIKE '%' || nd.n || '%' THEN 'item_make'
            WHEN coalesce(qi.sub_description,'') ILIKE '%' || nd.n || '%' THEN 'item_sub_description'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(qi.description,'') ILIKE '%' || nd.n || '%' THEN qi.description
            WHEN coalesce(qi.make,'') ILIKE '%' || nd.n || '%' THEN qi.make
            WHEN coalesce(qi.sub_description,'') ILIKE '%' || nd.n || '%' THEN qi.sub_description
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(qi.description,'') ILIKE nd.n          THEN 400
            WHEN coalesce(qi.description,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(qi.make,'') ILIKE '%' || nd.n || '%'   THEN 250
            WHEN coalesce(qi.sub_description,'') ILIKE '%' || nd.n || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/quotations/' || q.id::text                            AS route
    FROM __SCHEMA__.quotations q
    JOIN __SCHEMA__.quotation_items qi ON qi.quotation_id = q.id
    CROSS JOIN needle nd
    WHERE q.archived_at IS NULL
      AND (p_client_id IS NULL OR q.client_id = p_client_id)
      AND (qi.row_type IS NULL OR qi.row_type = 'standard')
      -- item_id is intentionally absent: description is searched
      -- independently of Item Library linkage.
      AND (
          coalesce(qi.description,'') ILIKE '%' || nd.n || '%'
          OR coalesce(qi.make,'') ILIKE '%' || nd.n || '%'
          OR coalesce(qi.sub_description,'') ILIKE '%' || nd.n || '%'
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
        -- The order below mirrors the rank CASE exactly, so the reported
        -- source and text always belong to the winning match.
        CASE
            WHEN i.invoice_number ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(i.invoice_title,'') ILIKE '%' || nd.n || '%' THEN 'title'
            WHEN coalesce(i.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
        END                                                      AS match_source,
        CASE
            WHEN i.invoice_number ILIKE '%' || nd.n || '%' THEN i.invoice_number
            WHEN coalesce(i.invoice_title,'') ILIKE '%' || nd.n || '%' THEN i.invoice_title
            WHEN coalesce(i.client_name,'') ILIKE '%' || nd.n || '%' THEN i.client_name
        END                                                      AS matched_text,
        CASE
            WHEN i.invoice_number ILIKE nd.n                      THEN 1000
            WHEN i.invoice_number ILIKE nd.n || '%'               THEN 900
            WHEN i.invoice_number ILIKE '%' || nd.n || '%'        THEN 800
            WHEN coalesce(i.invoice_title,'') ILIKE nd.n         THEN 750
            WHEN coalesce(i.invoice_title,'') ILIKE '%' || nd.n || '%' THEN 650
            WHEN coalesce(i.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            ELSE 0
        END                                                      AS match_rank,
        '/invoices/' || i.id::text                              AS route
    FROM __SCHEMA__.invoices i
    CROSS JOIN needle nd
    WHERE i.archived_at IS NULL
      AND (p_client_id IS NULL OR i.client_id = p_client_id)
      AND (
          i.invoice_number ILIKE '%' || nd.n || '%'
          OR coalesce(i.client_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(i.invoice_title,'') ILIKE '%' || nd.n || '%'
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
            WHEN coalesce(ii.description,'') ILIKE '%' || nd.n || '%' THEN 'item_description'
            WHEN coalesce(ii.make,'') ILIKE '%' || nd.n || '%' THEN 'item_make'
            WHEN coalesce(ii.sub_description,'') ILIKE '%' || nd.n || '%' THEN 'item_sub_description'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(ii.description,'') ILIKE '%' || nd.n || '%' THEN ii.description
            WHEN coalesce(ii.make,'') ILIKE '%' || nd.n || '%' THEN ii.make
            WHEN coalesce(ii.sub_description,'') ILIKE '%' || nd.n || '%' THEN ii.sub_description
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(ii.description,'') ILIKE nd.n          THEN 400
            WHEN coalesce(ii.description,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(ii.make,'') ILIKE '%' || nd.n || '%'   THEN 250
            WHEN coalesce(ii.sub_description,'') ILIKE '%' || nd.n || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/invoices/' || i.id::text                              AS route
    FROM __SCHEMA__.invoices i
    JOIN __SCHEMA__.invoice_items ii ON ii.invoice_id = i.id
    CROSS JOIN needle nd
    WHERE i.archived_at IS NULL
      AND (p_client_id IS NULL OR i.client_id = p_client_id)
      AND (ii.row_type IS NULL OR ii.row_type = 'standard')
      -- item_id is intentionally absent: description is searched
      -- independently of Item Library linkage.
      AND (
          coalesce(ii.description,'') ILIKE '%' || nd.n || '%'
          OR coalesce(ii.make,'') ILIKE '%' || nd.n || '%'
          OR coalesce(ii.sub_description,'') ILIKE '%' || nd.n || '%'
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
-- match_source and matched_text are tie-breakers so that a document
-- with several equally ranked matches always reports the same winner.
deduped AS (
    SELECT DISTINCT ON (document_type, document_id)
        document_type, document_id, document_number, title,
        client_id, client_name, document_date,
        match_source, matched_text, match_rank, route
    FROM combined
    WHERE match_rank > 0
      AND (p_document_types IS NULL OR document_type = ANY(p_document_types))
    ORDER BY document_type, document_id, match_rank DESC, match_source, matched_text
)
SELECT
    document_type, document_id, document_number, title,
    client_id, client_name, document_date,
    match_source, matched_text, match_rank, route
FROM deduped
ORDER BY match_rank DESC, document_date DESC NULLS LAST, document_number, document_id
LIMIT greatest(coalesce(p_limit, 50), 1);
$fn$;
$b1$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    IF to_regprocedure(format('%I.search_documents(text,text[],uuid,integer)', p_schema_name)) IS NULL THEN
        RAISE EXCEPTION 'search_documents was not created in schema %', p_schema_name;
    END IF;
END;
$install$;

-- The installer is SECURITY DEFINER and must not be reachable by API
-- roles — the caller must never supply an arbitrary schema name.
REVOKE ALL ON FUNCTION public._prov_install_search(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._prov_install_search(text) FROM anon;
REVOKE ALL ON FUNCTION public._prov_install_search(text) FROM authenticated;

-- ─────────────────────────────────────────────────────────────
-- C. Reinstall into tenant_master_template and every eligible
--    entity_* schema.
--
--    A schema that is missing the document tables was never fully
--    provisioned; it is skipped and named explicitly.  Any failure in
--    a schema that does hold the document tables aborts the migration
--    so that tenant drift cannot pass silently.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_schema    text;
    v_missing   text;
    v_installed text[] := ARRAY[]::text[];
    v_skipped   text[] := ARRAY[]::text[];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'tenant_master_template') THEN
        PERFORM public._prov_install_search('tenant_master_template');
        v_installed := array_append(v_installed, 'tenant_master_template');
    ELSE
        RAISE WARNING 'tenant_master_template schema is missing — future tenants will not receive document search';
    END IF;

    FOR v_schema IN
        SELECT nspname FROM pg_namespace
        WHERE nspname LIKE 'entity\_%'
        ORDER BY nspname
    LOOP
        SELECT string_agg(t.expected, ', ' ORDER BY t.expected)
          INTO v_missing
          FROM (VALUES ('quotations'), ('quotation_items'), ('invoices'), ('invoice_items')) AS t(expected)
         WHERE NOT EXISTS (
                 SELECT 1 FROM pg_tables
                 WHERE schemaname = v_schema AND tablename = t.expected
               );

        IF v_missing IS NOT NULL THEN
            RAISE WARNING 'document search skipped: schema % is missing table(s) %', v_schema, v_missing;
            v_skipped := array_append(v_skipped, v_schema);
            CONTINUE;
        END IF;

        -- Eligible schema: let any error propagate and fail the migration.
        PERFORM public._prov_install_search(v_schema);
        v_installed := array_append(v_installed, v_schema);
    END LOOP;

    RAISE NOTICE 'document search installed in % schema(s): %',
        coalesce(array_length(v_installed, 1), 0), array_to_string(v_installed, ', ');

    IF array_length(v_skipped, 1) IS NOT NULL THEN
        RAISE NOTICE 'document search skipped in % structurally incomplete schema(s): %',
            array_length(v_skipped, 1), array_to_string(v_skipped, ', ');
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- D. Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
