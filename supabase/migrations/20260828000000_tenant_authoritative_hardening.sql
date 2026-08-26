-- ============================================================
-- TENANT-AUTHORITATIVE HARDENING
-- ============================================================
-- Makes audit tenant-authoritative, removes dead public/business
-- code, backfills tenant audit/activity/letter data, and re-wires
-- provisioning so new entities receive financial views + triggers.
--
-- Safe patterns:
--   * RLS / auth / workspace infra stays in public.
--   * Business + audit data move to the tenant schema.
--   * Backfills preserve IDs (ON CONFLICT (id) DO NOTHING).
--   * All DROPs are IF EXISTS.
--
-- NOT run against public business data: no public table is purged.

-- ============================================================
-- PART 1 — Ensure tenant activity_events table exists
-- ============================================================
-- audit_logs already exists in tenant schemas; activity_events
-- does not. Clone its structure from public (LIKE ... INCLUDING ALL).
DO $$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'entity\_%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = v_schema AND table_name = 'activity_events'
        ) THEN
            PERFORM public._prov_clone_table('public', v_schema, 'activity_events');
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- PART 2 — Redirect audit RPCs to the tenant schema
-- ============================================================
-- The delegators (record_*_created/status_changed/etc.) call
-- public.record_activity_event, and the two base audit RPCs write
-- public.audit_logs / public.activity_events. Re-create each of
-- the 23 audit RPCs in-place, redirecting writes to the tenant
-- tables. Uses pg_get_functiondef so the real installed source is
-- preserved; only the public audit references are swapped.
DO $$
DECLARE
    v_schema text;
    v_schema_q text;
    v_proc record;
    v_def text;
BEGIN
    FOR v_schema IN
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'entity\_%'
    LOOP
        v_schema_q := format('%I', v_schema);

        FOR v_proc IN
            SELECT p.oid, p.proname
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = v_schema
              AND p.proname IN (
                'record_invoice_created',
                'record_invoice_status_changed',
                'record_payment_voided',
                'record_payment_attachment_uploaded',
                'record_waybill_created',
                'record_waybill_status_changed',
                'record_csr_created',
                'record_csr_status_changed',
                'record_csr_linked',
                'record_quotation_created',
                'record_quotation_status_changed',
                'record_quotation_linked',
                'record_project_updated',
                'record_project_note_added',
                'record_project_document_added',
                'record_project_linked_activity',
                'record_letter_created',
                'record_letter_updated',
                'record_letter_status_changed',
                'record_letter_duplicated',
                'record_letter_archived',
                'record_audit_log',
                'record_activity_event'
              )
        LOOP
            v_def := pg_get_functiondef(v_proc.oid);

            -- Redirect delegator calls to the tenant base RPC.
            v_def := replace(v_def,
                'public.record_activity_event(',
                v_schema_q || '.record_activity_event(');

            -- Redirect audit table writes to tenant tables.
            v_def := replace(v_def, 'public.audit_logs', v_schema_q || '.audit_logs');
            v_def := replace(v_def, 'public.activity_events', v_schema_q || '.activity_events');

            -- Return types: point at the tenant composite type so the
            -- RETURN row type and the declared RETURNS type stay consistent.
            v_def := replace(v_def, 'RETURNS activity_events', 'RETURNS ' || v_schema_q || '.activity_events');
            v_def := replace(v_def, 'RETURNS audit_logs', 'RETURNS ' || v_schema_q || '.audit_logs');

            -- The return type changes (public -> tenant composite), so the
            -- function must be dropped before CREATE OR REPLACE (42P13).
            EXECUTE format('DROP FUNCTION IF EXISTS %s.%I(%s)',
                v_schema_q,
                v_proc.proname,
                pg_get_function_identity_arguments(v_proc.oid));

            EXECUTE v_def;
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================
-- PART 3 — Backfill tenant audit / activity / letter data
-- ============================================================
-- Copy public-only rows into the tenant schema, preserving IDs.
-- Idempotent: ON CONFLICT (id) DO NOTHING.
DO $$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'entity\_%'
    LOOP
        EXECUTE format(
            'INSERT INTO %I.audit_logs SELECT * FROM public.audit_logs ON CONFLICT (id) DO NOTHING',
            v_schema
        );
        EXECUTE format(
            'INSERT INTO %I.activity_events SELECT * FROM public.activity_events ON CONFLICT (id) DO NOTHING',
            v_schema
        );
        EXECUTE format(
            'INSERT INTO %I.letters SELECT * FROM public.letters ON CONFLICT (id) DO NOTHING',
            v_schema
        );
    END LOOP;
END;
$$;

-- ============================================================
-- PART 4 — Drop dead code (no callers anywhere)
-- ============================================================
-- Closed dead cluster: run_notification_jobs was the only caller of
-- the four notification generators; no pg_cron / edge / frontend callers.
DROP FUNCTION IF EXISTS public.run_notification_jobs CASCADE;
DROP FUNCTION IF EXISTS public.generate_invoice_notifications CASCADE;
DROP FUNCTION IF EXISTS public.resolve_invoice_notifications CASCADE;
DROP FUNCTION IF EXISTS public.generate_quotation_notifications CASCADE;
DROP FUNCTION IF EXISTS public.resolve_quotation_notifications CASCADE;

-- Unused lifecycle helper (no DB references).
-- validate_waybill_items is NOT dropped: it is the body of the
-- check_items_json_structure CHECK constraint on waybills in both
-- public and every tenant schema. Dropping it CASCADE would remove
-- that item-shape validation.
DROP FUNCTION IF EXISTS public.log_activity_event CASCADE;

-- device_sequences: zero rows, no function refs, no frontend usage.
DROP TABLE IF EXISTS public.device_sequences CASCADE;
DO $$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'entity\_%'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.device_sequences CASCADE', v_schema);
    END LOOP;
END;
$$;

-- ============================================================
-- PART 5 — Wire triggers + financial views into provisioning
-- ============================================================
-- provision_entity (20260827000000) installed RPCs (step 8.9) but
-- never installed tenant triggers or financial views. New entities
-- therefore missed invoice_financials_v and audit triggers.
-- Re-create provision_entity adding both steps.
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
    PERFORM public._prov_validate_permissions(p_entity_id);

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

    BEGIN
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        v_schema_name := public._prov_get_schema_name(p_entity_id);

        PERFORM public._prov_update_status(p_entity_id, 'creating');

        PERFORM public._prov_create_schema(v_schema_name);

        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table('public', v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys('public', v_schema_name, v_table);
        END LOOP;

        -- 8.5 Seed canonical settings row (restored; dropped by 20260827000000)
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 8.6 Install canonical triggers (LIKE does not copy triggers)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_triggers('public', v_schema_name, v_table);
        END LOOP;

        -- 8.7 Install tenant financial views (invoice_financials_v etc.)
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 8.9 Install tenant lifecycle / audit RPCs
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
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
-- FINAL — Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
