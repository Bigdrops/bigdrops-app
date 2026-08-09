-- Domain: Phase 3 — Financial computation (tenant-aware invoice_financials_v)
-- Created: 2026-08-09
--
-- Purpose:
--   invoice_financials_v is currently public-schema based. After cutover
--   the authoritative invoice/payment rows live in the tenant schema, so
--   financial computation must operate against tenant data.
--
-- Architecture decision (documented, not silently chosen):
--   Tenant-local financial view. Views cannot be cloned via
--   CREATE TABLE LIKE, so provisioning gets a dedicated step
--   (_prov_install_financial_views) that creates the view in each entity
--   schema with schema-qualified table references. RLS on the underlying
--   tenant tables keeps the view tenant-safe (views inherit base-table RLS).
--
-- Status semantics (reconciled with the persisted CHECK constraint):
--   The live view emits PRESENTATION states: 'paid', 'partial', 'overdue'.
--   The persisted invoices.status vocabulary permits only:
--     'unpaid', 'partially_paid', 'paid', 'archived'
--   (invoices_status_check exists in production; absent from migrations —
--    production drift). 'overdue' is a useful computed state and is NOT
--   destroyed: it remains the computed_status the UI renders, while a new
--   persisted_status column maps presentation → persisted vocabulary so
--   the frontend can write a value the CHECK constraint accepts.
--
--   Mapping (presentation → persisted):
--     paid            → paid
--     partial         → partially_paid
--     overdue         → partially_paid (settled > 0) | unpaid (settled = 0)
--     otherwise       → current persisted status
--
-- Formulas: identical to the live view (balance_due, settled_total,
-- cash_received, wht_received, computed_status). No financial formula is
-- changed (Calculations.ts remains the locked TS authority).
--
-- Change:
--   1. Helper public._prov_install_financial_views(p_schema_name) creates
--      invoice_financials_v inside a tenant schema (idempotent).
--   2. provision_entity() redefined to call it (step 8.8).
--   3. DO block installs the view for the existing production entity
--      (entity_bigdrops-main_main) if its schema exists — no hardcoded
--      UUID; schema resolved from entities/workspaces slugs.

-- ============================================================
-- STATUS MAPPING HELPER (presentation → persisted)
-- ============================================================

CREATE OR REPLACE FUNCTION public.invoice_persisted_status(
    p_computed text,
    p_current text,
    p_settled numeric
)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $function$
    SELECT CASE
        WHEN p_computed = 'paid' THEN 'paid'
        WHEN p_computed = 'partial' THEN 'partially_paid'
        WHEN p_computed = 'overdue' THEN CASE WHEN coalesce(p_settled, 0) > 0 THEN 'partially_paid' ELSE 'unpaid' END
        ELSE coalesce(p_current, 'unpaid')
    END;
$function$;

-- ============================================================
-- TENANT FINANCIAL VIEW INSTALLER
-- ============================================================
-- Creates invoice_financials_v in the target schema, qualified to that
-- schema's invoices/payments tables. Idempotent.

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
END;
$function$;

-- ============================================================
-- ORCHESTRATION FUNCTION (redefined: adds financial view step 8.8)
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
    -- ============================================================
    -- PRE-FLIGHT — NO exception handler, errors propagate to caller
    -- ============================================================

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

    -- ============================================================
    -- PROVISIONING — nested block WITH exception handler
    -- ============================================================

    BEGIN
        -- 3. Acquire advisory lock (transaction-scoped)
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        -- 4. Get schema name
        v_schema_name := public._prov_get_schema_name(p_entity_id);

        -- 5. Update status to 'creating'
        PERFORM public._prov_update_status(p_entity_id, 'creating');

        -- 6. Create schema
        PERFORM public._prov_create_schema(v_schema_name);

        -- 7. Clone template tables
        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table('public', v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        -- 8. Re-add foreign keys
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys('public', v_schema_name, v_table);
        END LOOP;

        -- 8.5 Seed canonical settings row so the entity is usable immediately
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 8.6 Install canonical triggers (LIKE does not copy triggers)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_triggers('public', v_schema_name, v_table);
        END LOOP;

        -- 8.7 Grant default invoice-aggregate permissions to the provisioning caller
        IF auth.uid() IS NOT NULL THEN
            PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());
        END IF;

        -- 8.8 Install tenant-local financial views (invoice_financials_v)
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 9. Finalize
        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- 10. Provisioning failure only — cleanup + mark failed
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
-- INSTALL FOR THE EXISTING PRODUCTION ENTITY (idempotent)
-- ============================================================
-- Creates the tenant financial view for entity_bigdrops-main_main so the
-- migrated data is immediately reportable. Schema is resolved from
-- entities/workspaces slugs — no hardcoded UUID. No-op if not present.

DO $do$
DECLARE
    v_schema text;
BEGIN
    SELECT 'entity_' || w.slug || '_' || e.slug INTO v_schema
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE e.slug = 'main' AND w.slug = 'bigdrops-main'
    LIMIT 1;

    IF v_schema IS NOT NULL AND to_regclass(v_schema || '.invoices') IS NOT NULL THEN
        PERFORM public._prov_install_financial_views(v_schema);
        RAISE NOTICE 'Installed tenant financial view for %', v_schema;
    ELSE
        RAISE NOTICE 'Existing entity schema not found — skipping tenant financial view install';
    END IF;
END;
$do$;
