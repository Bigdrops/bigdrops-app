-- ============================================================
-- Ensure invoice_persisted_status function exists
-- Source: 20260809060000_invoice_financials_tenant_view.sql
-- Lost on fresh reset; must survive public schema purge.
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
