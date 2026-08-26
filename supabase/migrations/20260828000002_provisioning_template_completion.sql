-- ============================================================
-- PROVISIONING TEMPLATE COMPLETION
-- ============================================================
-- The live tenant schema has 32 business tables. The provisioning
-- template cloned only 17. New entities therefore missed 15
-- business tables (item library, tax filings/entries/reminders,
-- BOQ/quotations/RFQ line items, project documents, blank logs,
-- and the tenant audit tables).
--
-- This migration extends the template to the full authoritative
-- 32-table set and maps each new table to the resource already
-- used by the production tenant's RLS policies.
--
-- device_sequences is intentionally absent (dropped by
-- 20260828000000_tenant_authoritative_hardening.sql).

-- ============================================================
-- 1. Extend the provisioning table template
-- ============================================================
CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'project_documents',
        'quotations', 'quotation_items',
        'invoices', 'invoice_items', 'payments',
        'wht_receipts',
        'csrs', 'blank_csr_logs',
        'waybills', 'blank_waybill_logs',
        'tax_settings', 'tax_filings', 'tax_input_entries', 'tax_reminders',
        'receipts', 'letters',
        'boqs', 'boq_rows',
        'rfqs', 'rfq_items',
        'item_catalog', 'item_import_batches', 'item_aliases', 'item_merge_log',
        'audit_logs', 'activity_events'
    ];
$function$;

-- ============================================================
-- 2. Extend the table -> resource mapping
-- ============================================================
-- Resources mirror the production tenant RLS policies exactly.
CREATE OR REPLACE FUNCTION public._prov_table_to_resource(p_table text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT CASE p_table
        WHEN 'invoices' THEN 'invoice'
        WHEN 'invoice_items' THEN 'invoice'
        WHEN 'waybills' THEN 'waybill'
        WHEN 'blank_waybill_logs' THEN 'waybill'
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
        WHEN 'blank_csr_logs' THEN 'csr'
        WHEN 'tax_settings' THEN 'tax_setting'
        WHEN 'tax_filings' THEN 'tax_setting'
        WHEN 'tax_input_entries' THEN 'tax_setting'
        WHEN 'tax_reminders' THEN 'tax_setting'
        WHEN 'receipts' THEN 'receipt'
        WHEN 'letters' THEN 'letter'
        WHEN 'boqs' THEN 'boq'
        WHEN 'boq_rows' THEN 'boq'
        WHEN 'rfqs' THEN 'rfq'
        WHEN 'rfq_items' THEN 'rfq'
        WHEN 'item_catalog' THEN 'item'
        WHEN 'item_aliases' THEN 'item'
        WHEN 'item_import_batches' THEN 'item'
        WHEN 'item_merge_log' THEN 'item'
        WHEN 'audit_logs' THEN 'audit'
        WHEN 'activity_events' THEN 'audit'
        ELSE p_table
    END;
$function$;

-- ============================================================
-- FINAL — Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
