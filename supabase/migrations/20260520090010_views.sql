-- Domain: Views
-- Views: invoice_financials_v, project_financials_v, item_price_summary_v,
--        v_last_invoice_activity, v_last_project_activity, v_last_quotation_activity
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports
--
-- NOTE: The CSV export only provides column definitions (as CREATE TABLE).
-- These are actually views in Supabase. The view definitions below are
-- reconstructed from the column signatures and domain logic.

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW invoice_financials_v AS
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
        WHEN coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) > 0 THEN 'partially_paid'
        ELSE 'unpaid'
    END AS computed_status
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.client_id, i.client_name, i.project_id, i.issue_date, i.due_date, i.total, i.status;

CREATE OR REPLACE VIEW project_financials_v AS
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
FROM projects pr
LEFT JOIN invoices i ON i.project_id = pr.id
LEFT JOIN LATERAL (
    SELECT
        coalesce(sum(p.cash_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS cash_total,
        coalesce(sum(p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS wht_total
    FROM payments p
    WHERE p.invoice_id = i.id
) p_agg ON true
GROUP BY pr.id, pr.name, pr.client_id, pr.client_name, pr.status;

CREATE OR REPLACE VIEW item_price_summary_v AS
SELECT
    ic.id AS item_id,
    ic.name,
    ic.standard_price,
    ic.is_active,
    count(ii.id) AS usage_count,
    min(ii.unit_price) AS min_price,
    max(ii.unit_price) AS max_price,
    avg(ii.unit_price) AS avg_price,
    (array_agg(ii.unit_price ORDER BY coalesce(inv.created_at, ii.updated_at) DESC))[1] AS last_sold_price,
    max(coalesce(inv.created_at, ii.updated_at)) AS last_used_at,
    (array_agg(
        CASE WHEN inv.id IS NOT NULL THEN 'invoice' ELSE 'quotation' END
        ORDER BY coalesce(inv.created_at, ii.updated_at) DESC
    ))[1] AS last_source_type,
    (array_agg(
        coalesce(inv.id, qi.quotation_id)
        ORDER BY coalesce(inv.created_at, ii.updated_at) DESC
    ))[1] AS last_source_document_id
FROM item_catalog ic
LEFT JOIN invoice_items ii ON ii.item_id = ic.id
LEFT JOIN invoices inv ON inv.id = ii.invoice_id
LEFT JOIN quotation_items qi ON qi.item_id = ic.id
GROUP BY ic.id, ic.name, ic.standard_price, ic.is_active;

CREATE OR REPLACE VIEW v_last_invoice_activity AS
SELECT
    ae.entity_id AS invoice_id,
    i.invoice_number,
    i.status,
    max(ae.created_at) AS last_activity_at
FROM activity_events ae
JOIN invoices i ON i.id = ae.entity_id
WHERE lower(ae.entity_type) = 'invoice'
GROUP BY ae.entity_id, i.invoice_number, i.status;

CREATE OR REPLACE VIEW v_last_project_activity AS
SELECT
    ae.entity_id AS project_id,
    pr.project_code,
    pr.name AS project_name,
    max(ae.created_at) AS last_activity_at
FROM activity_events ae
JOIN projects pr ON pr.id = ae.entity_id
WHERE lower(ae.entity_type) = 'project'
GROUP BY ae.entity_id, pr.project_code, pr.name;

CREATE OR REPLACE VIEW v_last_quotation_activity AS
SELECT
    ae.entity_id AS quotation_id,
    q.quotation_number,
    q.status,
    max(ae.created_at) AS last_activity_at
FROM activity_events ae
JOIN quotations q ON q.id = ae.entity_id
WHERE lower(ae.entity_type) = 'quotation'
GROUP BY ae.entity_id, q.quotation_number, q.status;

-- ============================================================
-- EVENT TRIGGER (auto-enable RLS on new tables)
-- ============================================================

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
