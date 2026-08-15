-- Domain: Multi-Tenancy Reconciliation — Plan B (template, resources, permissions)
-- Created: 2026-08-16
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- Plan A delivered the 21-table provisioning template and fixed the
-- financial-view drift. Plan B completes the template so every NEW
-- entity receives the full 32-table tenant schema with correct
-- permission resources and default owner permissions.
--
-- This migration:
--   1. Redefines _prov_get_template_tables() to add the 11 Plan B
--      tables: item_catalog, item_aliases, item_import_batches,
--      item_merge_log, rfq_items, boq_rows, tax_input_entries,
--      tax_filings, tax_reminders, audit_logs, device_sequences.
--
--      The 21 tables from Plan A keep their exact relative order.
--      The 11 new tables are inserted at FK-safe positions so that
--      _prov_readd_foreign_keys() can re-add every foreign key when a
--      new entity is provisioned. In particular, item_catalog is placed
--      BEFORE quotation_items and invoice_items so their item_id
--      foreign keys are finally re-added (Plan A noted these were
--      skipped because item_catalog was not in the template).
--
--   2. Redefines _prov_table_to_resource() to map the 11 new tables:
--        rfq_items            -> rfq
--        boq_rows             -> boq
--        item_catalog         -> item
--        item_aliases         -> item
--        item_import_batches  -> item
--        item_merge_log       -> item
--        tax_input_entries    -> tax_setting
--        tax_filings          -> tax_setting
--        tax_reminders        -> tax_setting
--        audit_logs           -> audit
--        device_sequences     -> device
--
--   3. Redefines _prov_seed_default_permissions() so every NEW entity
--      receives owner permissions for the new resources:
--        rfq, boq, item, tax_setting  -> view, create, edit, delete
--        audit, device                 -> view only
--
--      Existing resource seeding (invoice, payment, receipt, setting,
--      quotation with all four actions) is preserved exactly.
--
-- Idempotent. Safe to re-run. Does NOT touch the production entity
-- (existing-entity backfill is Plan C).
-- =====================================================================

-- ============================================================
-- 1. TEMPLATE TABLES (32 tables, FK-safe order)
-- ============================================================
-- Order rules:
--   - The 21 Plan A tables keep their relative order.
--   - item_catalog sits before quotation_items and invoice_items so
--     their item_id FKs can be re-added.
--   - boq_rows after boqs; rfq_items after rfqs.
--   - tax_input_entries, tax_filings, tax_reminders after tax_settings,
--     with tax_filings before tax_reminders (linked_filing_id FK).
--   - item_aliases and item_merge_log after item_catalog;
--     item_import_batches before item_merge_log (batch_id FK).
--   - audit_logs and device_sequences have no FKs; they sit last.

CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
RETURNS text[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'project_documents', 'item_catalog',
        'quotations', 'quotation_items',
        'invoices', 'invoice_items',
        'payments', 'wht_receipts',
        'csrs', 'waybills', 'blank_waybill_logs', 'blank_csr_logs',
        'tax_settings', 'tax_input_entries', 'tax_filings', 'tax_reminders',
        'receipts', 'letters',
        'boqs', 'boq_rows',
        'rfqs', 'rfq_items',
        'item_aliases', 'item_import_batches', 'item_merge_log',
        'device_sequences', 'audit_logs'
    ];
$function$;

-- ============================================================
-- 2. RESOURCE MAPPING (redefined: adds the 11 Plan B tables)
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
        WHEN 'tax_input_entries' THEN 'tax_setting'
        WHEN 'tax_filings' THEN 'tax_setting'
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
        WHEN 'device_sequences' THEN 'device'
        ELSE p_table
    END;
$function$;

-- ============================================================
-- 3. DEFAULT PERMISSION SEEDER (redefined: adds new resources)
-- ============================================================
-- Preserves existing resources (invoice, payment, receipt, setting,
-- quotation) with all four actions. Adds rfq, boq, item, tax_setting
-- with all four actions. Adds audit and device with view only.
-- Idempotent via ON CONFLICT DO NOTHING.

CREATE OR REPLACE FUNCTION public._prov_seed_default_permissions(
    p_entity_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Full-action resources: view, create, edit, delete
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('invoice'), ('payment'), ('receipt'), ('setting'), ('quotation'),
            ('rfq'), ('boq'), ('item'), ('tax_setting')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    -- View-only resources: audit, device
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('audit'), ('device')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;