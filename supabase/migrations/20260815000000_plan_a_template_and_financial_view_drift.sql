-- Domain: Multi-Tenancy Reconciliation — Plan A (template + financial-view drift)
-- Created: 2026-08-15
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- Plan A fixes the provisioning root causes stated in the Final
-- Reconciliation Blueprint, section 3.7, Option D:
--
--   1. Template drift. The live template list has 19 tables.
--      project_documents and quotation_items exist in the tenant schema
--      but were never added to the template. A new entity provisioned
--      today would NOT receive them.
--
--   2. Financial-view drift. _prov_install_financial_views() installs
--      only invoice_financials_v. project_financials_v exists in the
--      tenant schema only because the projects aggregate data migration
--      (20260811000000) created it directly, not via the engine.
--      A new entity would NOT receive project_financials_v.
--
--   3. Live-entity repair. The production entity
--      entity_bigdrops-main_main has two defects on its tenant
--      project_documents table:
--
--      a. RLS resource mismatch. _prov_table_to_resource('project_documents')
--         returned 'project_documents' (the ELSE fallback) when the
--         aggregate data migration cloned the table, so the installed
--         tenant policies call has_entity_permission(..., 'project_documents',
--         ...). The permission model requires resource 'project_document',
--         so the policies would always evaluate FALSE.
--
--      b. Missing table grants. Only postgres has privileges. The app
--         roles (authenticated) have none, so reads and writes fail.
--
-- This migration:
--   1. Redefines _prov_get_template_tables() to add project_documents
--      and quotation_items, so future provisioning clones both.
--   2. Redefines _prov_table_to_resource() to map project_documents to
--      the 'project_document' resource (quotation_items already maps to
--      'quotation' via 20260814000002).
--   3. Redefines _prov_install_financial_views() to also create
--      project_financials_v, so future provisioning installs both views.
--   4. Repairs the confirmed production entity entity_bigdrops-main_main:
--      drops the wrongly-resourced policies on tenant project_documents,
--      reinstalls RLS with resource 'project_document', grants table
--      privileges to authenticated, and reinstalls the tenant financial
--      views via the redefined installer.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. TEMPLATE TABLES (add project_documents, quotation_items)
-- ============================================================
-- Order: project_documents after projects (FK to projects),
-- quotation_items after quotations (FK to quotations). The FK from
-- quotation_items to item_catalog is skipped until Plan B adds
-- item_catalog to the template (_prov_readd_foreign_keys only re-adds
-- FKs whose referenced table exists in the target schema).

CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
RETURNS text[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'project_documents', 'quotations', 'quotation_items',
        'invoices', 'invoice_items', 'payments', 'wht_receipts',
        'csrs', 'waybills', 'blank_waybill_logs', 'blank_csr_logs',
        'tax_settings', 'receipts', 'letters', 'boqs', 'rfqs'
    ];
$function$;

-- ============================================================
-- 2. RESOURCE MAPPING (redefined: adds project_documents → project_document)
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_table_to_resource(p_table text)
RETURNS text
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT CASE p_table
        WHEN 'invoices' THEN 'invoice'
        WHEN 'invoice_items' THEN 'invoice'
        WHEN 'waybills' THEN 'waybill'
        WHEN 'quotations' THEN 'quotation'
        WHEN 'quotation_items' THEN 'quotation'
        WHEN 'payments' THEN 'payment'
        WHEN 'wht_receipts' THEN 'payment'
        WHEN 'projects' THEN 'project'
        WHEN 'project_documents' THEN 'project_document'
        WHEN 'clients' THEN 'client'
        WHEN 'settings' THEN 'setting'
        WHEN 'signatories' THEN 'signatory'
        WHEN 'bank_accounts' THEN 'bank_account'
        WHEN 'csrs' THEN 'csr'
        WHEN 'tax_settings' THEN 'tax_setting'
        WHEN 'receipts' THEN 'receipt'
        WHEN 'letters' THEN 'letter'
        WHEN 'boqs' THEN 'boq'
        WHEN 'rfqs' THEN 'rfq'
        ELSE p_table
    END;
$function$;

-- ============================================================
-- 3. FINANCIAL VIEW INSTALLER (redefined: adds project_financials_v)
-- ============================================================
-- Keeps invoice_financials_v identical to the live definition.
-- Adds project_financials_v using the exact body installed for the
-- production entity by 20260811000000 (no financial formula changes).

CREATE OR REPLACE FUNCTION public._prov_install_financial_views(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Drop any stale copy, then create the view qualified to the tenant schema
    EXECUTE format('DROP VIEW IF EXISTS %I.invoice_financials_v', p_schema_name);

    EXECUTE format($fmt$
        CREATE VIEW %I.invoice_financials_v AS
        SELECT
            i.id,
            i.invoice_number,
            i.client_id,
            i.client_name,
            i.project_id,
            i.issue_date,
            i.due_date,
            coalesce(i.total, 0) AS total_gross,
            i.status,
            coalesce(sum(p.cash_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS cash_received,
            coalesce(sum(p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS wht_received,
            coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS settled_total,
            coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS balance_due,
            CASE
                WHEN coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) <= 0 THEN 'paid'
                WHEN coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) > 0
                     AND coalesce(i.due_date, '9999-12-31')::date >= CURRENT_DATE THEN 'partial'
                WHEN coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) > 0
                     AND coalesce(i.due_date, '9999-12-31')::date < CURRENT_DATE THEN 'overdue'
                ELSE i.status
            END AS computed_status,
            public.invoice_persisted_status(
                CASE
                    WHEN coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) <= 0 THEN 'paid'
                    WHEN coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) > 0
                         AND coalesce(i.due_date, '9999-12-31')::date >= CURRENT_DATE THEN 'partial'
                    WHEN coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) > 0
                         AND coalesce(i.due_date, '9999-12-31')::date < CURRENT_DATE THEN 'overdue'
                    ELSE i.status
                END,
                i.status,
                coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0)
            ) AS persisted_status
        FROM %I.invoices i
        LEFT JOIN %I.payments p ON p.invoice_id = i.id
        GROUP BY i.id, i.invoice_number, i.client_id, i.client_name, i.project_id,
                 i.issue_date, i.due_date, i.total, i.status
    $fmt$, p_schema_name, p_schema_name, p_schema_name);

    -- Drop any stale copy, then create project_financials_v qualified to the
    -- tenant schema. Identical to the body installed for the production
    -- entity by 20260811000000.
    EXECUTE format('DROP VIEW IF EXISTS %I.project_financials_v', p_schema_name);

    EXECUTE format($fmt$
        CREATE VIEW %I.project_financials_v AS
        SELECT
            pr.id AS project_id,
            pr.name AS project_name,
            pr.client_id,
            pr.client_name,
            pr.status,
            count(DISTINCT i.id) AS invoice_count,
            coalesce(sum(i.total), 0) AS total_invoiced,
            coalesce(sum(p_agg.cash_total), 0) AS cash_collected,
            coalesce(sum(p_agg.wht_total), 0) AS wht_collected,
            coalesce(sum(p_agg.cash_total + p_agg.wht_total), 0) AS total_collected,
            coalesce(sum(i.total), 0) - coalesce(sum(p_agg.cash_total + p_agg.wht_total), 0) AS outstanding
        FROM %I.projects pr
        LEFT JOIN %I.invoices i ON i.project_id = pr.id
        LEFT JOIN LATERAL (
            SELECT
                coalesce(sum(p.cash_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS cash_total,
                coalesce(sum(p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS wht_total
            FROM %I.payments p
            WHERE p.invoice_id = i.id
        ) p_agg ON true
        GROUP BY pr.id, pr.name, pr.client_id, pr.client_name, pr.status
    $fmt$, p_schema_name, p_schema_name, p_schema_name, p_schema_name);
END;
$function$;

-- ============================================================
-- 4. PRODUCTION REPAIR (one-time, guarded, idempotent)
-- ============================================================

DO $do$
DECLARE
    v_schema       text := 'entity_bigdrops-main_main';
    v_table        text := 'project_documents';
    v_entity_id    uuid;
    v_policy       text;
    v_has_wrong    boolean;
BEGIN

    -- Resolve the production entity from the schema name (no hardcoded UUIDs).
    SELECT
        e.id
    INTO
        v_entity_id
    FROM public.entities e
    JOIN public.workspaces w
      ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema %', v_schema;
    END IF;

    -- 4.1 Repair tenant project_documents only if the table exists and
    --     still carries the wrongly-resourced policies (the ELSE fallback
    --     resource 'project_documents').
    IF to_regclass(v_schema || '.project_documents') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM pg_policy pol
            JOIN pg_class c ON c.oid = pol.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = v_schema
              AND c.relname = v_table
              AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%''project_documents''%'
        ) INTO v_has_wrong;

        IF v_has_wrong THEN
            FOR v_policy IN
                SELECT policyname
                FROM pg_policies
                WHERE schemaname = v_schema
                  AND tablename = v_table
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_policy, v_schema, v_table);
                RAISE NOTICE 'Dropped policy % on %.%', v_policy, v_schema, v_table;
            END LOOP;

            PERFORM public._prov_install_rls(
                v_schema,
                v_table,
                v_entity_id,
                'project_document'
            );
            RAISE NOTICE 'Reinstalled RLS on %.% with resource project_document', v_schema, v_table;
        ELSE
            RAISE NOTICE '%.% policies already use the correct resource — skipping reinstall', v_schema, v_table;
        END IF;

        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO authenticated',
            v_schema,
            v_table
        );
        RAISE NOTICE 'Granted SELECT, INSERT, UPDATE, DELETE on %.% to authenticated', v_schema, v_table;
    ELSE
        RAISE NOTICE '%.project_documents not present — skipping project_documents repair', v_schema;
    END IF;

    -- 4.2 Reinstall the tenant financial views via the redefined installer
    --     so project_financials_v is created by the engine (idempotent).
    IF to_regclass(v_schema || '.invoices') IS NOT NULL THEN
        PERFORM public._prov_install_financial_views(v_schema);
        RAISE NOTICE 'Reinstalled tenant financial views for %', v_schema;
    ELSE
        RAISE NOTICE '%.invoices not present — skipping financial view reinstall', v_schema;
    END IF;

    RAISE NOTICE '=== Plan A repair COMPLETE ===';

END;
$do$;