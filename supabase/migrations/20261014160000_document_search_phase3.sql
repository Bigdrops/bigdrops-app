-- ============================================================
-- DOCUMENT SEARCH PLATFORM — Phase 3 extension
-- ============================================================
-- Extends the shared tenant search authority to five more document
-- types.  The architecture is unchanged: one search_documents
-- function per tenant schema, caller-rights, original source tables,
-- deterministic ranking and deduplication.
--
-- New coverage:
--   rfq      → rfqs + rfq_items
--   cps      → cps_sheets + cps_rows
--   csr      → csrs
--   waybill  → waybills (item text inside the items JSONB column)
--   receipt  → receipts
--
-- Quotation and invoice coverage is copied forward byte for byte.
-- Their ranking, routes and behaviour are frozen.
--
-- Table and column names below were read from the live database, not
-- from historical notes.
--
-- ── Client scoping truth ────────────────────────────────────
-- Only these tables own a client_id column:
--   quotations, invoices, csrs, waybills, receipts
-- These tables do NOT own a client_id column:
--   rfqs        (vendor_name and client_name are text only)
--   cps_sheets  (client_name is text only)
-- A client-scoped search therefore returns nothing from rfq and cps.
-- Matching a client by comparing client_name text would invent a
-- relationship the schema does not declare, so it is not done.
--
-- ── Title bands ─────────────────────────────────────────────
-- csrs, waybills and receipts have no title column, so those types
-- skip the 750 / 650 title bands.
--
-- ── Related reference numbers ───────────────────────────────
-- receipts.invoice_number is the number of a different document.  It
-- uses the standard number bands (1000 / 900 / 800) with
-- match_source = 'reference_number', so the result explains that the
-- match came from the linked invoice number.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- A. Replace the tenant search installer
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

    -- ── Phase 2 trigram indexes (unchanged) ──────────────────
    -- Every column that the quotation and invoice predicates match with
    -- ILIKE carries a trigram index.
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

    -- ── Phase 3 trigram indexes (identifier columns only) ────
    -- Identifier columns are typed or pasted from a document, so they are
    -- the highest-value substring searches, and they are the lowest-churn
    -- columns in each table.
    --
    -- Free-text content columns of the new types are deliberately NOT
    -- indexed.  Each tenant would gain roughly thirty indexes for an
    -- uncertain benefit at current volumes, and the planner already
    -- prefers a sequential scan at these row counts.  Revisit when the
    -- new document types reach the volume of invoice_items.
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_rfqs_rfq_number_trgm ON %I.rfqs USING GIN (rfq_number gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_rfqs_title_trgm ON %I.rfqs USING GIN (title gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_rfqs_vendor_name_trgm ON %I.rfqs USING GIN (vendor_name gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_cps_sheets_cps_number_trgm ON %I.cps_sheets USING GIN (cps_number gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_cps_sheets_title_trgm ON %I.cps_sheets USING GIN (title gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_csrs_csr_number_trgm ON %I.csrs USING GIN (csr_number gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_waybills_waybill_number_trgm ON %I.waybills USING GIN (waybill_number gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number_trgm ON %I.receipts USING GIN (receipt_number gin_trgm_ops)',
        p_schema_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_receipts_invoice_number_trgm ON %I.receipts USING GIN (invoice_number gin_trgm_ops)',
        p_schema_name
    );

    -- ── search_documents RPC ─────────────────────────────────
    v_body := $b1$
-- ─────────────────────────────────────────────────────────────
-- Helper: human-readable CSR material text
--
-- Live rows store materials_used as a text column whose value is a JSON
-- envelope with a fixed prefix, for example:
--
--   __CSR_META_V1__{"version":1,"materialsRows":[{"item":"12v relay",
--     "quantity":"1","unit":""}],"materialsText":"1. 12v relay (1)",
--     "meta":{"showOperationalReadings":true, ... }}
--
-- Searching that value as raw text would match JSON keys and report the
-- whole envelope as matched_text.  This helper returns only the material
-- names a user would recognise: the rendered materialsText list plus the
-- item names in materialsRows.  The meta settings block is never returned.
--
-- Legacy plain-text rows are returned unchanged, so older data stays
-- searchable.  A malformed or truncated envelope returns NULL rather than
-- raising: one bad row must never abort a search for the whole tenant.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION __SCHEMA__._search_csr_materials(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $mat$
DECLARE
    v_prefix constant text := '__CSR_META_V1__';
    v_body   text;
    v_json   jsonb;
    v_out    text;
BEGIN
    IF p_value IS NULL OR btrim(p_value) = '' THEN
        RETURN NULL;
    END IF;

    -- Not an envelope: plain text is searchable exactly as stored.
    IF left(p_value, length(v_prefix)) <> v_prefix THEN
        RETURN p_value;
    END IF;

    v_body := substring(p_value FROM length(v_prefix) + 1);

    -- Only a body that opens as a JSON object is parsed at all.
    IF v_body !~ '^\s*\{' THEN
        RETURN NULL;
    END IF;

    BEGIN
        v_json := v_body::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN
        -- 22P02: the envelope does not parse (truncated, or written by an
        -- older build).  Skipping this one row is better than raising, which
        -- would abort every search for the whole tenant.  Only the JSON parse
        -- failure is caught — any other error still surfaces.
        RETURN NULL;
    END;

    -- materialsText is the list exactly as it prints on the CSR, so it is
    -- preferred: matched_text then reads like the document.  The item names
    -- are only a fallback for rows whose rendered list is empty.
    v_out := nullif(btrim(coalesce(v_json ->> 'materialsText', '')), '');

    IF v_out IS NULL AND jsonb_typeof(v_json -> 'materialsRows') = 'array' THEN
        v_out := nullif(btrim((
            SELECT string_agg(r ->> 'item', ' ')
              FROM jsonb_array_elements(v_json -> 'materialsRows') AS r
             WHERE coalesce(r ->> 'item', '') <> ''
        )), '');
    END IF;

    RETURN v_out;
END;
$mat$;

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
-- ─── RFQ: number / title / vendor / client ────────────────
-- rfqs has no client_id column, so this branch is skipped entirely for
-- a client-scoped search.
rfq_header AS (
    SELECT
        'rfq'                                                    AS document_type,
        r.id                                                     AS document_id,
        r.rfq_number                                             AS document_number,
        r.title                                                  AS title,
        NULL::uuid                                               AS client_id,
        r.client_name,
        r.issue_date                                             AS document_date,
        CASE
            WHEN r.rfq_number ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(r.title,'') ILIKE '%' || nd.n || '%' THEN 'title'
            WHEN coalesce(r.vendor_name,'') ILIKE '%' || nd.n || '%' THEN 'vendor'
            WHEN coalesce(r.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
        END                                                      AS match_source,
        CASE
            WHEN r.rfq_number ILIKE '%' || nd.n || '%' THEN r.rfq_number
            WHEN coalesce(r.title,'') ILIKE '%' || nd.n || '%' THEN r.title
            WHEN coalesce(r.vendor_name,'') ILIKE '%' || nd.n || '%' THEN r.vendor_name
            WHEN coalesce(r.client_name,'') ILIKE '%' || nd.n || '%' THEN r.client_name
        END                                                      AS matched_text,
        CASE
            WHEN r.rfq_number ILIKE nd.n                         THEN 1000
            WHEN r.rfq_number ILIKE nd.n || '%'                  THEN 900
            WHEN r.rfq_number ILIKE '%' || nd.n || '%'           THEN 800
            WHEN coalesce(r.title,'') ILIKE nd.n                 THEN 750
            WHEN coalesce(r.title,'') ILIKE '%' || nd.n || '%'   THEN 650
            WHEN coalesce(r.vendor_name,'') ILIKE '%' || nd.n || '%' THEN 500
            WHEN coalesce(r.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            ELSE 0
        END                                                      AS match_rank,
        '/rfqs/' || r.id::text                                   AS route
    FROM __SCHEMA__.rfqs r
    CROSS JOIN needle nd
    WHERE r.archived_at IS NULL
      AND p_client_id IS NULL
      AND (
          r.rfq_number ILIKE '%' || nd.n || '%'
          OR coalesce(r.title,'') ILIKE '%' || nd.n || '%'
          OR coalesce(r.vendor_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(r.client_name,'') ILIKE '%' || nd.n || '%'
      )
),
-- ─── RFQ: item description / specification / notes ────────
rfq_items AS (
    SELECT
        'rfq'                                                    AS document_type,
        r.id                                                     AS document_id,
        r.rfq_number                                             AS document_number,
        r.title                                                  AS title,
        NULL::uuid                                               AS client_id,
        r.client_name,
        r.issue_date                                             AS document_date,
        CASE
            WHEN coalesce(ri.description,'') ILIKE '%' || nd.n || '%' THEN 'item_description'
            WHEN coalesce(ri.specification,'') ILIKE '%' || nd.n || '%' THEN 'specification'
            WHEN coalesce(ri.notes,'') ILIKE '%' || nd.n || '%' THEN 'item_notes'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(ri.description,'') ILIKE '%' || nd.n || '%' THEN ri.description
            WHEN coalesce(ri.specification,'') ILIKE '%' || nd.n || '%' THEN ri.specification
            WHEN coalesce(ri.notes,'') ILIKE '%' || nd.n || '%' THEN ri.notes
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(ri.description,'') ILIKE nd.n          THEN 400
            WHEN coalesce(ri.description,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(ri.specification,'') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(ri.notes,'') ILIKE '%' || nd.n || '%'  THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/rfqs/' || r.id::text                                   AS route
    FROM __SCHEMA__.rfqs r
    JOIN __SCHEMA__.rfq_items ri ON ri.rfq_id = r.id
    CROSS JOIN needle nd
    WHERE r.archived_at IS NULL
      AND p_client_id IS NULL
      AND (
          coalesce(ri.description,'') ILIKE '%' || nd.n || '%'
          OR coalesce(ri.specification,'') ILIKE '%' || nd.n || '%'
          OR coalesce(ri.notes,'') ILIKE '%' || nd.n || '%'
      )
),
-- ─── CPS: number / title / client / notes ─────────────────
-- cps_sheets has no client_id column, so this branch is skipped
-- entirely for a client-scoped search.
cps_header AS (
    SELECT
        'cps'                                                    AS document_type,
        s.id                                                     AS document_id,
        s.cps_number                                             AS document_number,
        s.title                                                  AS title,
        NULL::uuid                                               AS client_id,
        s.client_name,
        s.issue_date                                             AS document_date,
        CASE
            WHEN coalesce(s.cps_number,'') ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(s.title,'') ILIKE '%' || nd.n || '%' THEN 'title'
            WHEN coalesce(s.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
            WHEN coalesce(s.notes,'') ILIKE '%' || nd.n || '%' THEN 'notes'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(s.cps_number,'') ILIKE '%' || nd.n || '%' THEN s.cps_number
            WHEN coalesce(s.title,'') ILIKE '%' || nd.n || '%' THEN s.title
            WHEN coalesce(s.client_name,'') ILIKE '%' || nd.n || '%' THEN s.client_name
            WHEN coalesce(s.notes,'') ILIKE '%' || nd.n || '%' THEN s.notes
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(s.cps_number,'') ILIKE nd.n            THEN 1000
            WHEN coalesce(s.cps_number,'') ILIKE nd.n || '%'     THEN 900
            WHEN coalesce(s.cps_number,'') ILIKE '%' || nd.n || '%' THEN 800
            WHEN coalesce(s.title,'') ILIKE nd.n                 THEN 750
            WHEN coalesce(s.title,'') ILIKE '%' || nd.n || '%'   THEN 650
            WHEN coalesce(s.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            WHEN coalesce(s.notes,'') ILIKE '%' || nd.n || '%'   THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/cost-pricing-sheets/' || s.id::text                    AS route
    FROM __SCHEMA__.cps_sheets s
    CROSS JOIN needle nd
    WHERE s.archived_at IS NULL
      AND p_client_id IS NULL
      AND (
          coalesce(s.cps_number,'') ILIKE '%' || nd.n || '%'
          OR coalesce(s.title,'') ILIKE '%' || nd.n || '%'
          OR coalesce(s.client_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(s.notes,'') ILIKE '%' || nd.n || '%'
      )
),
-- ─── CPS: row description / make / specification / section ─
-- Only the text-bearing keys of the cells JSONB are read.  The live
-- rows carry {"cp", "sp", "make_brand", "specification"}; cp and sp are
-- pricing values and are never searched.
cps_rows AS (
    SELECT
        'cps'                                                    AS document_type,
        s.id                                                     AS document_id,
        s.cps_number                                             AS document_number,
        s.title                                                  AS title,
        NULL::uuid                                               AS client_id,
        s.client_name,
        s.issue_date                                             AS document_date,
        CASE
            WHEN coalesce(cr.description,'') ILIKE '%' || nd.n || '%' THEN 'item_description'
            WHEN coalesce(cr.cells->>'make_brand','') ILIKE '%' || nd.n || '%' THEN 'item_make'
            WHEN coalesce(cr.cells->>'specification','') ILIKE '%' || nd.n || '%' THEN 'specification'
            WHEN coalesce(cr.section_title,'') ILIKE '%' || nd.n || '%' THEN 'section_title'
            WHEN coalesce(cr.notes,'') ILIKE '%' || nd.n || '%' THEN 'item_notes'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(cr.description,'') ILIKE '%' || nd.n || '%' THEN cr.description
            WHEN coalesce(cr.cells->>'make_brand','') ILIKE '%' || nd.n || '%' THEN cr.cells->>'make_brand'
            WHEN coalesce(cr.cells->>'specification','') ILIKE '%' || nd.n || '%' THEN cr.cells->>'specification'
            WHEN coalesce(cr.section_title,'') ILIKE '%' || nd.n || '%' THEN cr.section_title
            WHEN coalesce(cr.notes,'') ILIKE '%' || nd.n || '%' THEN cr.notes
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(cr.description,'') ILIKE nd.n          THEN 400
            WHEN coalesce(cr.description,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(cr.cells->>'make_brand','') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(cr.cells->>'specification','') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(cr.section_title,'') ILIKE '%' || nd.n || '%' THEN 200
            WHEN coalesce(cr.notes,'') ILIKE '%' || nd.n || '%'  THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/cost-pricing-sheets/' || s.id::text                    AS route
    FROM __SCHEMA__.cps_sheets s
    JOIN __SCHEMA__.cps_rows cr ON cr.cps_sheet_id = s.id
    CROSS JOIN needle nd
    WHERE s.archived_at IS NULL
      AND p_client_id IS NULL
      AND (
          coalesce(cr.description,'') ILIKE '%' || nd.n || '%'
          OR coalesce(cr.cells->>'make_brand','') ILIKE '%' || nd.n || '%'
          OR coalesce(cr.cells->>'specification','') ILIKE '%' || nd.n || '%'
          OR coalesce(cr.section_title,'') ILIKE '%' || nd.n || '%'
          OR coalesce(cr.notes,'') ILIKE '%' || nd.n || '%'
      )
),
-- ─── CSR: number / client / equipment / service text ──────
-- csrs has no title column, so the 750 / 650 bands are skipped.
csr_header AS (
    SELECT
        'csr'                                                    AS document_type,
        c.id                                                     AS document_id,
        c.csr_number                                             AS document_number,
        NULL::text                                               AS title,
        c.client_id,
        c.client_name,
        c.date                                                   AS document_date,
        CASE
            WHEN coalesce(c.csr_number,'') ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(c.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
            WHEN coalesce(c.problem_reported,'') ILIKE '%' || nd.n || '%' THEN 'problem_reported'
            WHEN coalesce(c.service_rendered,'') ILIKE '%' || nd.n || '%' THEN 'service_rendered'
            WHEN coalesce(c.materials_text,'') ILIKE '%' || nd.n || '%' THEN 'materials_used'
            WHEN coalesce(c.defects_found,'') ILIKE '%' || nd.n || '%' THEN 'defects_found'
            WHEN coalesce(c.equipment_type,'') ILIKE '%' || nd.n || '%' THEN 'equipment_type'
            WHEN coalesce(c.make,'') ILIKE '%' || nd.n || '%'
              OR coalesce(c.model,'') ILIKE '%' || nd.n || '%'
              OR coalesce(c.serial_no,'') ILIKE '%' || nd.n || '%'
              OR coalesce(c.engine_no,'') ILIKE '%' || nd.n || '%' THEN 'equipment'
            WHEN coalesce(c.engineer_remarks,'') ILIKE '%' || nd.n || '%' THEN 'engineer_remarks'
            WHEN coalesce(c.equipment_location,'') ILIKE '%' || nd.n || '%'
              OR coalesce(c.address,'') ILIKE '%' || nd.n || '%' THEN 'location'
            WHEN coalesce(c.customer_feedback,'') ILIKE '%' || nd.n || '%' THEN 'notes'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(c.csr_number,'') ILIKE '%' || nd.n || '%' THEN c.csr_number
            WHEN coalesce(c.client_name,'') ILIKE '%' || nd.n || '%' THEN c.client_name
            WHEN coalesce(c.problem_reported,'') ILIKE '%' || nd.n || '%' THEN c.problem_reported
            WHEN coalesce(c.service_rendered,'') ILIKE '%' || nd.n || '%' THEN c.service_rendered
            WHEN coalesce(c.materials_text,'') ILIKE '%' || nd.n || '%' THEN c.materials_text
            WHEN coalesce(c.defects_found,'') ILIKE '%' || nd.n || '%' THEN c.defects_found
            WHEN coalesce(c.equipment_type,'') ILIKE '%' || nd.n || '%' THEN c.equipment_type
            WHEN coalesce(c.make,'') ILIKE '%' || nd.n || '%' THEN c.make
            WHEN coalesce(c.model,'') ILIKE '%' || nd.n || '%' THEN c.model
            WHEN coalesce(c.serial_no,'') ILIKE '%' || nd.n || '%' THEN c.serial_no
            WHEN coalesce(c.engine_no,'') ILIKE '%' || nd.n || '%' THEN c.engine_no
            WHEN coalesce(c.engineer_remarks,'') ILIKE '%' || nd.n || '%' THEN c.engineer_remarks
            WHEN coalesce(c.equipment_location,'') ILIKE '%' || nd.n || '%' THEN c.equipment_location
            WHEN coalesce(c.address,'') ILIKE '%' || nd.n || '%' THEN c.address
            WHEN coalesce(c.customer_feedback,'') ILIKE '%' || nd.n || '%' THEN c.customer_feedback
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(c.csr_number,'') ILIKE nd.n            THEN 1000
            WHEN coalesce(c.csr_number,'') ILIKE nd.n || '%'     THEN 900
            WHEN coalesce(c.csr_number,'') ILIKE '%' || nd.n || '%' THEN 800
            WHEN coalesce(c.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            WHEN coalesce(c.problem_reported,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(c.service_rendered,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(c.materials_text,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(c.defects_found,'') ILIKE '%' || nd.n || '%' THEN 300
            WHEN coalesce(c.equipment_type,'') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(c.make,'') ILIKE '%' || nd.n || '%'    THEN 250
            WHEN coalesce(c.model,'') ILIKE '%' || nd.n || '%'   THEN 250
            WHEN coalesce(c.serial_no,'') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(c.engine_no,'') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(c.engineer_remarks,'') ILIKE '%' || nd.n || '%' THEN 200
            WHEN coalesce(c.equipment_location,'') ILIKE '%' || nd.n || '%' THEN 200
            WHEN coalesce(c.address,'') ILIKE '%' || nd.n || '%' THEN 200
            WHEN coalesce(c.customer_feedback,'') ILIKE '%' || nd.n || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/csr/' || c.id::text                                    AS route
    FROM (
        -- materials_text is the human-readable part of materials_used.
        -- Searching the raw column would match JSON keys and show the
        -- envelope as matched_text, so only the extracted text is used.
        SELECT sr.*,
               __SCHEMA__._search_csr_materials(sr.materials_used) AS materials_text
          FROM __SCHEMA__.csrs sr
    ) c
    CROSS JOIN needle nd
    WHERE c.archived_at IS NULL
      AND (p_client_id IS NULL OR c.client_id = p_client_id)
      AND (
          coalesce(c.csr_number,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.client_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.problem_reported,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.service_rendered,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.materials_text,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.defects_found,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.equipment_type,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.make,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.model,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.serial_no,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.engine_no,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.engineer_remarks,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.equipment_location,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.address,'') ILIKE '%' || nd.n || '%'
          OR coalesce(c.customer_feedback,'') ILIKE '%' || nd.n || '%'
      )
),
-- ─── WAYBILL: number / client / location ──────────────────
-- waybills has no title column, so the 750 / 650 bands are skipped.
waybill_header AS (
    SELECT
        'waybill'                                                AS document_type,
        w.id                                                     AS document_id,
        w.waybill_number                                         AS document_number,
        NULL::text                                               AS title,
        w.client_id,
        w.client_name,
        w.date                                                   AS document_date,
        CASE
            WHEN coalesce(w.waybill_number,'') ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(w.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
            WHEN coalesce(w.delivery_location,'') ILIKE '%' || nd.n || '%'
              OR coalesce(w.vehicle_plate,'') ILIKE '%' || nd.n || '%' THEN 'location'
            WHEN coalesce(w.notes,'') ILIKE '%' || nd.n || '%'
              OR coalesce(w.purpose,'') ILIKE '%' || nd.n || '%' THEN 'notes'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(w.waybill_number,'') ILIKE '%' || nd.n || '%' THEN w.waybill_number
            WHEN coalesce(w.client_name,'') ILIKE '%' || nd.n || '%' THEN w.client_name
            WHEN coalesce(w.delivery_location,'') ILIKE '%' || nd.n || '%' THEN w.delivery_location
            WHEN coalesce(w.vehicle_plate,'') ILIKE '%' || nd.n || '%' THEN w.vehicle_plate
            WHEN coalesce(w.notes,'') ILIKE '%' || nd.n || '%' THEN w.notes
            WHEN coalesce(w.purpose,'') ILIKE '%' || nd.n || '%' THEN w.purpose
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(w.waybill_number,'') ILIKE nd.n       THEN 1000
            WHEN coalesce(w.waybill_number,'') ILIKE nd.n || '%' THEN 900
            WHEN coalesce(w.waybill_number,'') ILIKE '%' || nd.n || '%' THEN 800
            WHEN coalesce(w.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            WHEN coalesce(w.delivery_location,'') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(w.vehicle_plate,'') ILIKE '%' || nd.n || '%' THEN 250
            WHEN coalesce(w.notes,'') ILIKE '%' || nd.n || '%'  THEN 200
            WHEN coalesce(w.purpose,'') ILIKE '%' || nd.n || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/waybills/' || w.id::text                               AS route
    FROM __SCHEMA__.waybills w
    CROSS JOIN needle nd
    WHERE w.archived_at IS NULL
      AND (p_client_id IS NULL OR w.client_id = p_client_id)
      AND (
          coalesce(w.waybill_number,'') ILIKE '%' || nd.n || '%'
          OR coalesce(w.client_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(w.delivery_location,'') ILIKE '%' || nd.n || '%'
          OR coalesce(w.vehicle_plate,'') ILIKE '%' || nd.n || '%'
          OR coalesce(w.notes,'') ILIKE '%' || nd.n || '%'
          OR coalesce(w.purpose,'') ILIKE '%' || nd.n || '%'
      )
),
-- ─── WAYBILL: item descriptions inside the items JSONB ────
-- The items column holds an array of objects with a description key, for
-- example [{"qty": 1, "unit": "CM", "condition": "good", "description": "Kidney"}].
-- Only the description key is read.  Quantity, unit and condition are
-- metadata and are never searched.  One waybill that matches several
-- items is still returned once, because of the DISTINCT ON below.
waybill_items AS (
    SELECT
        'waybill'                                                AS document_type,
        w.id                                                     AS document_id,
        w.waybill_number                                         AS document_number,
        NULL::text                                               AS title,
        w.client_id,
        w.client_name,
        w.date                                                   AS document_date,
        'item_description'                                       AS match_source,
        item->>'description'                                     AS matched_text,
        CASE
            WHEN coalesce(item->>'description','') ILIKE nd.n   THEN 400
            WHEN coalesce(item->>'description','') ILIKE '%' || nd.n || '%' THEN 300
            ELSE 0
        END                                                      AS match_rank,
        '/waybills/' || w.id::text                               AS route
    FROM __SCHEMA__.waybills w
    -- jsonb_array_elements raises on an object or a null, which would abort
    -- the whole search for that tenant.  The CASE guarantees the argument is
    -- always an array; every live row is an array today, but no row type is
    -- allowed to make the search fall over.
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(w.items) = 'array' THEN w.items ELSE '[]'::jsonb END
    ) AS item
    CROSS JOIN needle nd
    WHERE w.archived_at IS NULL
      AND (p_client_id IS NULL OR w.client_id = p_client_id)
      AND coalesce(item->>'description','') ILIKE '%' || nd.n || '%'
),
-- ─── RECEIPT: receipt number / linked invoice / client ─────
-- receipts has no title column, so the 750 / 650 bands are skipped.
-- invoice_number belongs to a different document, so it reports
-- match_source = 'reference_number'.
receipt_header AS (
    SELECT
        'receipt'                                                AS document_type,
        rc.id                                                    AS document_id,
        rc.receipt_number                                        AS document_number,
        NULL::text                                               AS title,
        rc.client_id,
        rc.client_name,
        rc.payment_date                                          AS document_date,
        CASE
            WHEN coalesce(rc.receipt_number,'') ILIKE '%' || nd.n || '%' THEN 'number'
            WHEN coalesce(rc.invoice_number,'') ILIKE '%' || nd.n || '%' THEN 'reference_number'
            WHEN coalesce(rc.client_name,'') ILIKE '%' || nd.n || '%' THEN 'client'
            WHEN coalesce(rc.notes,'') ILIKE '%' || nd.n || '%'
              OR coalesce(rc.payment_notes,'') ILIKE '%' || nd.n || '%' THEN 'notes'
        END                                                      AS match_source,
        CASE
            WHEN coalesce(rc.receipt_number,'') ILIKE '%' || nd.n || '%' THEN rc.receipt_number
            WHEN coalesce(rc.invoice_number,'') ILIKE '%' || nd.n || '%' THEN rc.invoice_number
            WHEN coalesce(rc.client_name,'') ILIKE '%' || nd.n || '%' THEN rc.client_name
            WHEN coalesce(rc.notes,'') ILIKE '%' || nd.n || '%' THEN rc.notes
            WHEN coalesce(rc.payment_notes,'') ILIKE '%' || nd.n || '%' THEN rc.payment_notes
        END                                                      AS matched_text,
        CASE
            WHEN coalesce(rc.receipt_number,'') ILIKE nd.n      THEN 1000
            WHEN coalesce(rc.receipt_number,'') ILIKE nd.n || '%' THEN 900
            WHEN coalesce(rc.receipt_number,'') ILIKE '%' || nd.n || '%' THEN 800
            WHEN coalesce(rc.invoice_number,'') ILIKE nd.n      THEN 1000
            WHEN coalesce(rc.invoice_number,'') ILIKE nd.n || '%' THEN 900
            WHEN coalesce(rc.invoice_number,'') ILIKE '%' || nd.n || '%' THEN 800
            WHEN coalesce(rc.client_name,'') ILIKE '%' || nd.n || '%' THEN 500
            WHEN coalesce(rc.notes,'') ILIKE '%' || nd.n || '%' THEN 200
            WHEN coalesce(rc.payment_notes,'') ILIKE '%' || nd.n || '%' THEN 200
            ELSE 0
        END                                                      AS match_rank,
        '/receipts/' || rc.id::text                              AS route
    FROM __SCHEMA__.receipts rc
    CROSS JOIN needle nd
    WHERE rc.archived_at IS NULL
      AND (p_client_id IS NULL OR rc.client_id = p_client_id)
      AND (
          coalesce(rc.receipt_number,'') ILIKE '%' || nd.n || '%'
          OR coalesce(rc.invoice_number,'') ILIKE '%' || nd.n || '%'
          OR coalesce(rc.client_name,'') ILIKE '%' || nd.n || '%'
          OR coalesce(rc.notes,'') ILIKE '%' || nd.n || '%'
          OR coalesce(rc.payment_notes,'') ILIKE '%' || nd.n || '%'
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
    UNION ALL
    SELECT * FROM rfq_header
    UNION ALL
    SELECT * FROM rfq_items
    UNION ALL
    SELECT * FROM cps_header
    UNION ALL
    SELECT * FROM cps_rows
    UNION ALL
    SELECT * FROM csr_header
    UNION ALL
    SELECT * FROM waybill_header
    UNION ALL
    SELECT * FROM waybill_items
    UNION ALL
    SELECT * FROM receipt_header
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

REVOKE ALL ON FUNCTION public._prov_install_search(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._prov_install_search(text) FROM anon;
REVOKE ALL ON FUNCTION public._prov_install_search(text) FROM authenticated;

-- ─────────────────────────────────────────────────────────────
-- B. Reinstall into tenant_master_template and every eligible
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
          -- Every table the RPC reads must be present.  A schema that holds
          -- the quotation and invoice tables but lost one of the newer ones
          -- would fail to create the function; it is skipped by name instead.
          FROM (VALUES
                   ('quotations'), ('quotation_items'), ('invoices'), ('invoice_items'),
                   ('rfqs'), ('rfq_items'), ('cps_sheets'), ('cps_rows'),
                   ('csrs'), ('waybills'), ('receipts')
               ) AS t(expected)
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

NOTIFY pgrst, 'reload schema';
