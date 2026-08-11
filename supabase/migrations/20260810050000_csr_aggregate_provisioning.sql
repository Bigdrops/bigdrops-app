-- Domain: Entity Provisioning Engine
-- Phase 5: Provision the CSR aggregate (blank_csr_logs)
-- Created: 2026-08-10
--
-- Change summary:
--   1. _prov_get_template_tables()  → add 'blank_csr_logs'
--   2. _prov_table_to_resource()    → map blank_csr_logs → 'csr'
--      (CSR aggregate resource already required by the permission model)
--
-- Scope guards:
--   - Function definitions only. No table structure, RLS, or data changes.
--   - No production-specific entity UUIDs are referenced.
--   - Existing entity_bigdrops-main_main schema is NOT modified here; the
--     existing-entity backfill + preserved-ID data copy is a separate,
--     human-executed migration (20260810060000).

-- ============================================================
-- 1. TEMPLATE TABLES (add blank_csr_logs)
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
RETURNS text[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'quotations', 'invoices', 'invoice_items', 'payments',
        'wht_receipts', 'csrs', 'waybills', 'blank_waybill_logs',
        'blank_csr_logs', 'tax_settings', 'receipts', 'letters', 'boqs', 'rfqs'
    ];
$function$;

-- ============================================================
-- 2. RESOURCE MAPPING
-- ============================================================
-- blank_csr_logs belongs to the CSR aggregate → 'csr' resource.
-- This keeps the required permission set at csr/* (no new permission
-- resource is invented).

CREATE OR REPLACE FUNCTION public._prov_table_to_resource(p_table text)
RETURNS text
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT CASE p_table
        WHEN 'invoices' THEN 'invoice'
        WHEN 'invoice_items' THEN 'invoice'
        WHEN 'waybills' THEN 'waybill'
        WHEN 'blank_waybill_logs' THEN 'waybill'
        WHEN 'quotations' THEN 'quotation'
        WHEN 'payments' THEN 'payment'
        WHEN 'wht_receipts' THEN 'payment'
        WHEN 'projects' THEN 'project'
        WHEN 'clients' THEN 'client'
        WHEN 'settings' THEN 'setting'
        WHEN 'signatories' THEN 'signatory'
        WHEN 'bank_accounts' THEN 'bank_account'
        WHEN 'csrs' THEN 'csr'
        WHEN 'blank_csr_logs' THEN 'csr'
        WHEN 'tax_settings' THEN 'tax_setting'
        WHEN 'receipts' THEN 'receipt'
        WHEN 'letters' THEN 'letter'
        WHEN 'boqs' THEN 'boq'
        WHEN 'rfqs' THEN 'rfq'
        ELSE p_table
    END;
$function$;
