-- Domain: Entity Provisioning Engine
-- Phase 3: Provision the invoice aggregate (invoice_items, wht_receipts)
-- Created: 2026-08-09
--
-- Change summary (Phase 3 of the tenant invoice migration):
--   1. _prov_get_template_tables()  → add 'invoice_items' and 'wht_receipts'
--   2. _prov_table_to_resource()    → map invoice_items → 'invoice',
--      wht_receipts → 'payment' (aggregate resources already required by the
--      permission model; no new permission resource is invented)
--   3. New _prov_install_triggers() → replicate canonical public triggers
--      (set_row_updated_at, stamp_row_ownership) onto cloned tenant tables,
--      because CREATE TABLE ... LIKE ... INCLUDING ALL does NOT copy triggers
--   4. provision_entity() redefined → installs triggers after clone/FK/seed,
--      before finalize. Settings seed step (8.5) preserved unchanged.
--
-- Scope guards:
--   - Function definitions only. No table structure, RLS, or data changes.
--   - No production-specific entity UUIDs are referenced.
--   - Existing entity_bigdrops-main_main schema is NOT modified here; the
--     existing-entity backfill + preserved-ID data copy is a separate,
--     human-executed migration (20260809020000).

-- ============================================================
-- 1. TEMPLATE TABLES (add invoice aggregate)
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
RETURNS text[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'quotations', 'invoices', 'invoice_items', 'payments',
        'wht_receipts', 'csrs', 'waybills', 'tax_settings', 'receipts',
        'letters', 'boqs', 'rfqs'
    ];
$function$;

-- ============================================================
-- 2. RESOURCE MAPPING
-- ============================================================
-- invoice_items belongs to the invoice aggregate → 'invoice' resource.
-- wht_receipts are payment-derived records → 'payment' resource.
-- This keeps the required permission set at invoice/* + payment/*
-- (no new permission resource is invented).

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
-- 3. TRIGGER PARITY HELPER
-- ============================================================
-- Replicates canonical triggers from the public template table onto the
-- cloned tenant table. Only the project's canonical trigger functions are
-- replicated; internal/system triggers are ignored. Trigger timing and
-- event masks are reconstructed from pg_trigger.tgtype so the tenant table
-- behaves identically to the public template.
--
-- Public template triggers today:
--   invoices   → trg_invoices_set_updated_at (set_row_updated_at),
--                trg_invoices_stamp_ownership (stamp_row_ownership)
--   receipts   → trg_receipts_set_updated_at, trg_receipts_stamp_ownership
--   payments, invoice_items, wht_receipts → no public triggers (none cloned)

CREATE OR REPLACE FUNCTION public._prov_install_triggers(
    p_source_schema text,
    p_target_schema text,
    p_table_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_trg record;
    v_events text;
    v_timing text;
BEGIN
    FOR v_trg IN
        SELECT
            t.tgname,
            t.tgtype,
            p.proname AS func_name
        FROM pg_trigger t
        JOIN pg_proc p ON p.oid = t.tgfoid
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = p_source_schema
          AND c.relname = p_table_name
          AND NOT t.tgisinternal
          AND p.proname IN ('set_row_updated_at', 'stamp_row_ownership')
        ORDER BY t.tgname
    LOOP
        -- tgtype bitmask: 1=ROW, 2=BEFORE, 4=INSERT, 8=DELETE, 16=UPDATE
        v_timing := CASE WHEN (v_trg.tgtype & 2) <> 0 THEN 'BEFORE' ELSE 'AFTER' END;

        v_events := NULL;
        IF (v_trg.tgtype & 4) <> 0 THEN v_events := 'INSERT'; END IF;
        IF (v_trg.tgtype & 16) <> 0 THEN
            v_events := coalesce(v_events || ' OR ', '') || 'UPDATE';
        END IF;
        IF (v_trg.tgtype & 8) <> 0 THEN
            v_events := coalesce(v_events || ' OR ', '') || 'DELETE';
        END IF;

        IF v_events IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I ON %I.%I',
            v_trg.tgname, p_target_schema, p_table_name
        );

        EXECUTE format(
            'CREATE TRIGGER %I %s %s ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.%I()',
            v_trg.tgname, v_timing, v_events,
            p_target_schema, p_table_name, v_trg.func_name
        );
    END LOOP;
END;
$function$;

-- ============================================================
-- 4. ORCHESTRATION FUNCTION (redefined: adds trigger step 8.6)
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
