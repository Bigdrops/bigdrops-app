-- Domain: Quotations — Fix quotation_items Grants and RLS (Root Cause Fix)
-- Created: 2026-08-14
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- The production entity entity_bigdrops-main_main has two defects on
-- its tenant quotation_items table:
--
--   1. Missing table grants. Only postgres has privileges. The app
--      roles (authenticated) have none, so INSERT fails with:
--
--        permission denied for table "quotation_items"
--
--   2. RLS resource mismatch. _prov_table_to_resource('quotation_items')
--      returned 'quotation_items' (the ELSE fallback) when the data
--      migration cloned the table, so the installed tenant policies
--      call has_entity_permission(..., 'quotation_items', ...). The
--      entity_permissions table only has 'quotation' rows, so the
--      policies always evaluate FALSE and the app sees zero items.
--
-- This migration:
--   1. Redefines _prov_table_to_resource() to map quotation_items to
--      the 'quotation' resource, so future provisioning installs the
--      correct RLS policies automatically.
--   2. Repairs the confirmed production entity entity_bigdrops-main_main:
--      drops the four wrongly-resourced policies on tenant
--      quotation_items, reinstalls RLS with resource 'quotation', and
--      grants table privileges to authenticated (matching the working
--      sibling item table invoice_items).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. RESOURCE MAPPING (redefined: adds quotation_items → quotation)
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
-- 2. PRODUCTION REPAIR (one-time, guarded, idempotent)
-- ============================================================

DO $do$
DECLARE
    v_schema       text := 'entity_bigdrops-main_main';
    v_table        text := 'quotation_items';
    v_entity_id    uuid;
    v_policy       text;
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

    -- 2.1 Drop the wrongly-resourced policies on tenant quotation_items.
    --     _prov_install_rls uses CREATE POLICY (no IF NOT EXISTS), so the
    --     old policies must be removed before reinstalling.
    FOR v_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = v_schema
          AND tablename = v_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_policy, v_schema, v_table);
        RAISE NOTICE 'Dropped policy % on %.%', v_policy, v_schema, v_table;
    END LOOP;

    -- 2.2 Reinstall RLS with the correct resource ('quotation').
    PERFORM public._prov_install_rls(
        v_schema,
        v_table,
        v_entity_id,
        'quotation'
    );
    RAISE NOTICE 'Reinstalled RLS on %.% with resource quotation', v_schema, v_table;

    -- 2.3 Grant table privileges to authenticated, matching invoice_items
    --     (the working sibling item table) which has DELETE/INSERT/SELECT/UPDATE.
    EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO authenticated',
        v_schema,
        v_table
    );
    RAISE NOTICE 'Granted SELECT, INSERT, UPDATE, DELETE on %.% to authenticated', v_schema, v_table;

    RAISE NOTICE '=== quotation_items permission repair COMPLETE ===';

END;
$do$;
