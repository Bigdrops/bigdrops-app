-- Public business schema purge — final tenancy cutover cleanup.
--
-- Evidence basis (live inspection on 2026-08-26, project xqlpekpkbszpdgtuwybh):
--   * All 32 public business tables have tenant replacements in entity_bigdrops-main_main;
--     tenant counts >= public counts for every table (tenant authoritative).
--   * Zero foreign keys cross the business-table set boundary in either direction,
--     so CASCADE cannot cascade into platform/auth/device infrastructure.
--   * Only hard/text dependencies FROM surviving tenant objects onto public functions:
--       - has_entity_permission via 128 tenant RLS policies
--       - validate_waybill_items via tenant waybills check_items_json_structure CHECK
--       - compute_jsonb_diff and _audit_resolve_invoice_schema via schema-qualified calls
--         inside tenant function bodies
--       - set_row_updated_at / stamp_row_ownership via tenant trigger functions
--   * All lifecycle/audit RPCs exist with identical signatures in the tenant schema;
--     no application code resolves any RPC in the public schema.
-- All statements are idempotent. Function drops use RESTRICT semantics with per-object
-- exception capture: an unexpected dependency leaves that function untouched and logs a
-- WARNING instead of aborting or cascading.

-- ============ PHASE A: public business views (before their tables) ============
DROP VIEW IF EXISTS public.invoice_financials_v;
DROP VIEW IF EXISTS public.project_financials_v;
DROP VIEW IF EXISTS public.item_price_summary_v;
DROP VIEW IF EXISTS public.v_last_invoice_activity;
DROP VIEW IF EXISTS public.v_last_project_activity;
DROP VIEW IF EXISTS public.v_last_quotation_activity;

-- ============ PHASE B: public business tables, live FK-depth order (deepest first) ============
-- depth 4
DROP TABLE IF EXISTS public.blank_waybill_logs CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.wht_receipts CASCADE;
-- depth 3
DROP TABLE IF EXISTS public.blank_csr_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.waybills CASCADE;
-- depth 2
DROP TABLE IF EXISTS public.csrs CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.project_documents CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.tax_reminders CASCADE;
-- depth 1
DROP TABLE IF EXISTS public.boq_rows CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.item_aliases CASCADE;
DROP TABLE IF EXISTS public.item_merge_log CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.rfq_items CASCADE;
DROP TABLE IF EXISTS public.tax_filings CASCADE;
DROP TABLE IF EXISTS public.tax_input_entries CASCADE;
DROP TABLE IF EXISTS public.tax_settings CASCADE;
-- depth 0
DROP TABLE IF EXISTS public.activity_events CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.boqs CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.item_catalog CASCADE;
DROP TABLE IF EXISTS public.item_import_batches CASCADE;
DROP TABLE IF EXISTS public.letters CASCADE;
DROP TABLE IF EXISTS public.rfqs CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.signatories CASCADE;

-- ============ PHASE C: obsolete public business RPC copies (RESTRICT, fail-safe) ============
-- C1: dead pre-entity overloads with no caller and no dependency.
-- C2: same-signature duplicates of tenant-schema RPCs whose only dependents died
--     with Phase A/B objects. RESTRICT keeps them alive if anything survives.
DO $$
DECLARE
  candidates text[] := ARRAY[
    -- dead overloads
    'record_payment_recorded(p_invoice_id uuid, p_amount numeric, p_actor_id uuid, p_actor_label text, p_source text, p_reason text)',
    'record_payment_recorded(p_invoice_id uuid, p_amount numeric, p_actor_id uuid, p_actor_label text, p_source text, p_reason text, p_payment_mode text, p_account_paid_to text, p_running_balance_after numeric, p_wht_amount numeric, p_entity_id uuid)',
    'record_invoice_created(p_invoice_id uuid, p_actor_id uuid, p_actor_label text, p_source text)',
    'record_invoice_status_changed(p_invoice_id uuid, p_old_status text, p_new_status text, p_actor_id uuid, p_actor_label text, p_source text, p_reason text)',
    'record_payment_voided(p_payment_id uuid, p_invoice_id uuid, p_amount numeric, p_actor_id uuid, p_actor_label text, p_source text, p_reason text)',
    'revert_invoice_to_quotation_transaction(p_invoice_id uuid, p_quotation_payload jsonb, p_quotation_items_payload jsonb)',
    -- duplicate copies of tenant-schema RPCs
    'delete_invoice_with_items_transaction(p_entity_id uuid, p_invoice_id uuid)',
    'get_item_suggestions(search_text text, result_limit integer)',
    'normalize_item_text(input text)',
    'record_activity_event(p_entity_type text, p_entity_id uuid, p_event_type text, p_entity_label text, p_actor_id uuid, p_actor_label text, p_source text, p_scope_type text, p_metadata jsonb, p_reason text, p_dedupe_seconds integer)',
    'record_audit_log(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid, p_actor_label text, p_source text, p_scope_type text, p_reason text)',
    'record_invoice_created(p_invoice_id uuid, p_actor_id uuid, p_actor_label text, p_source text, p_entity_id uuid)',
    'record_invoice_status_changed(p_invoice_id uuid, p_old_status text, p_new_status text, p_actor_id uuid, p_actor_label text, p_source text, p_reason text, p_entity_id uuid)',
    'record_payment_attachment_uploaded(p_payment_id uuid, p_invoice_id uuid, p_file_name text, p_file_size bigint, p_actor_id uuid, p_actor_label text, p_source text, p_entity_id uuid)',
    'record_payment_transaction(p_entity_id uuid, p_payment_payload jsonb)',
    'record_payment_voided(p_payment_id uuid, p_invoice_id uuid, p_amount numeric, p_actor_id uuid, p_actor_label text, p_source text, p_reason text, p_entity_id uuid)',
    'record_project_document_added(p_project_id uuid, p_actor_id uuid, p_actor_label text, p_source text, p_reason text, p_metadata jsonb)',
    'record_project_linked_activity(p_project_id uuid, p_linked_entity_type text, p_linked_entity_id uuid, p_linked_entity_label text, p_actor_id uuid, p_actor_label text, p_source text, p_reason text)',
    'record_project_note_added(p_project_id uuid, p_actor_id uuid, p_actor_label text, p_source text, p_reason text, p_metadata jsonb)',
    'record_project_updated(p_project_id uuid, p_actor_id uuid, p_actor_label text, p_source text, p_reason text, p_metadata jsonb)',
    'record_quotation_created(p_quotation_id uuid, p_actor_id uuid, p_actor_label text, p_source text)',
    'record_quotation_linked(p_quotation_id uuid, p_invoice_id uuid, p_project_id uuid, p_actor_id uuid, p_actor_label text, p_source text, p_reason text)',
    'record_quotation_status_changed(p_quotation_id uuid, p_old_status text, p_new_status text, p_actor_id uuid, p_actor_label text, p_source text, p_reason text)',
    'revert_invoice_to_quotation_transaction(p_invoice_id uuid, p_quotation_payload jsonb, p_quotation_items_payload jsonb, p_entity_id uuid)',
    'save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb, p_mode text)',
    -- helper whose last consumers were the purged public financial/activity views
    'invoice_persisted_status(p_computed text, p_current text, p_settled numeric)'
  ];
  c text;
BEGIN
  FOREACH c IN ARRAY candidates LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%s', c);
      RAISE NOTICE 'dropped public.%', c;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'KEPT public.% -> % (%)', c, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;

-- POSTMORTEM (live verification after apply):
--   public.invoice_persisted_status was NOT dropped: the tenant view
--   entity_bigdrops-main_main.invoice_financials_v has a hard pg_rewrite dependency on it.
--   The RESTRICT exception capture retained it as REQUIRED (tenant dependency).
--   All other candidates dropped cleanly.
