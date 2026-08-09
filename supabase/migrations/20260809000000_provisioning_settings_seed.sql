-- Domain: Entity Provisioning Engine
-- Fix: Seed a canonical settings row (id=1) when provisioning a new entity
-- Created: 2026-08-09
--
-- Problem:
--   provision_entity() only clones table structure; it never inserts a
--   default settings row. Every newly provisioned entity starts with an
--   empty settings table, causing a blank company name in the UI and
--   requiring manual SQL after entity creation.
--
-- Change:
--   Adds private helper _prov_seed_settings(p_entity_id, p_schema_name) and
--   redefines provision_entity() to call it after tables are cloned and
--   foreign keys re-added, but before the provisioning status is set to 'ready'.
--
--   The seed INSERT supplies only id and company_name. All other columns
--   (document_prefixes, custom_info, theme tokens, etc.) rely entirely on
--   the table's existing column DEFAULT clauses.
--
-- Scope guard:
--   - Function definitions only. No table structure, RLS, or data changes.
--   - No one-time backfill for already-provisioned schemas (out of scope).
--   - Existing entity_bigdrops-main_main.settings stays untouched.

-- ============================================================
-- SEED HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_seed_settings(
    p_entity_id uuid,
    p_schema_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_display_name text;
BEGIN
    -- Retrieve the entity's display name from public.entities
    SELECT display_name INTO v_display_name
    FROM public.entities
    WHERE id = p_entity_id;

    IF v_display_name IS NULL THEN
        RAISE EXCEPTION 'Entity not found: %', p_entity_id
            USING ERRCODE = 'P0001';
    END IF;

    -- Insert the canonical settings row. Only id and company_name are
    -- supplied; every other column falls back to the cloned table's
    -- column DEFAULT clauses. Idempotent across re-provisioning attempts.
    EXECUTE format(
        'INSERT INTO %I.settings (id, company_name) VALUES (1, %L) ON CONFLICT (id) DO NOTHING',
        p_schema_name,
        v_display_name
    );
END;
$function$;

-- ============================================================
-- ORCHESTRATION FUNCTION (redefined: adds seed step 8.5)
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
    -- Only provisioning failures (steps 3+) trigger cleanup + failed status
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
