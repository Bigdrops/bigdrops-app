-- Fix: Grant SELECT on invoice_financials_v to authenticated role.
--
-- Root cause:
--   _prov_install_financial_views() creates the view as SECURITY DEFINER
--   (owner = superuser) but never grants SELECT to authenticated. PostgREST
--   queries as authenticated → 403 Forbidden → Dashboard KPIs show zero.
--
-- Scope:
--   Iterates all tenant schemas that have invoice_financials_v and grants
--   SELECT to authenticated. Idempotent — safe to re-run.

DO $do$
DECLARE
    v_rec record;
BEGIN
    FOR v_rec IN
        SELECT schemaname
        FROM pg_views
        WHERE viewname = 'invoice_financials_v'
          AND schemaname LIKE 'entity_%'
    LOOP
        EXECUTE format(
            'GRANT SELECT ON %I.invoice_financials_v TO authenticated',
            v_rec.schemaname
        );
        RAISE NOTICE 'Granted SELECT on %.invoice_financials_v to authenticated', v_rec.schemaname;
    END LOOP;
END;
$do$;
