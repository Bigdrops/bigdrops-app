-- ============================================================
-- PROVISIONING TENANT-NEUTRAL REPAIR
-- ============================================================
-- Eliminates the last active dependency on entity_bigdrops-main_main
-- from the provisioning engine.
--
-- Changes:
--   1. Drop broken views from tenant_master_template
--      (they reference entity_bigdrops-main_main, not the target schema)
--   2. Create _prov_install_canonical_triggers() — creates triggers
--      directly from canonical function definitions, no source schema
--   3. Update provision_entity() step 9 to use the new function
--   4. Backfill: reinstall views on all existing tenant schemas

-- ============================================================
-- 1. DROP BROKEN VIEWS FROM TENANT_MASTER_TEMPLATE
-- ============================================================
-- These views were cloned from entity_bigdrops-main_main and contain
-- hardcoded references to that schema. They must be dropped so
-- LIKE cloning does not propagate broken views to new tenants.
-- _prov_install_financial_views() and _prov_install_item_library()
-- recreate them correctly during provisioning.

DROP VIEW IF EXISTS tenant_master_template.invoice_financials_v;
DROP VIEW IF EXISTS tenant_master_template.project_financials_v;
DROP VIEW IF EXISTS tenant_master_template.item_price_summary_v;

-- ============================================================
-- 2. CREATE _prov_install_canonical_triggers()
-- ============================================================
-- Creates the standard trigger set (set_row_updated_at,
-- stamp_row_ownership) on a target table without requiring a
-- source schema. Uses canonical public function definitions.
--
-- Trigger functions (set_row_updated_at, stamp_row_ownership)
-- already exist in the public schema and are called as public.X().
-- This function introspects the target table's columns to decide
-- which triggers apply.

CREATE OR REPLACE FUNCTION public._prov_install_canonical_triggers(
    p_target_schema text,
    p_table_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_has_updated_at boolean;
    v_has_created_by boolean;
BEGIN
    -- Check if table has updated_at column (for set_row_updated_at)
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_target_schema
          AND table_name = p_table_name
          AND column_name = 'updated_at'
    ) INTO v_has_updated_at;

    -- Check if table has created_by column (for stamp_row_ownership)
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_target_schema
          AND table_name = p_table_name
          AND column_name = 'created_by'
    ) INTO v_has_created_by;

    -- Install set_row_updated_at trigger if updated_at exists
    IF v_has_updated_at THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_set_updated_at ON %I.%I',
            p_table_name, p_target_schema, p_table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%s_set_updated_at BEFORE UPDATE ON %I.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at()',
            p_table_name, p_target_schema, p_table_name
        );
    END IF;

    -- Install stamp_row_ownership trigger if created_by exists
    IF v_has_created_by THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_stamp_ownership ON %I.%I',
            p_table_name, p_target_schema, p_table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%s_stamp_ownership BEFORE INSERT ON %I.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.stamp_row_ownership()',
            p_table_name, p_target_schema, p_table_name
        );
    END IF;
END;
$function$;

-- ============================================================
-- 3. UPDATE provision_entity() — replace Main dependency
-- ============================================================
-- Step 9 now calls _prov_install_canonical_triggers() instead of
-- _prov_install_triggers('entity_bigdrops-main_main', ...).

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
    v_template_schema text := 'tenant_master_template';
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

        -- 7. Clone template tables from master template
        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table(v_template_schema, v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        -- 8. Re-add foreign keys (re-pointing from template to target schema)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys(v_template_schema, v_schema_name, v_table);
        END LOOP;

        -- 9. Install tenant-local triggers (set_row_updated_at, stamp_row_ownership)
        --    Uses canonical definitions — no dependency on any specific tenant schema.
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_canonical_triggers(v_schema_name, v_table);
        END LOOP;

        -- 10. Build tenant-local financial views
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 11. Setup item library (normalize_item_text, get_item_suggestions, item_price_summary_v, merge_item_catalog_entries)
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);

        -- 12. Install tenant-local RPCs (audit, lifecycle, activity)
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        -- 13. Seed settings (correct argument order: entity_id first, schema second)
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 14. Seed default permissions (correct: entity_id + creator user_id)
        PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());

        -- 15. Finalize
        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- 16. Provisioning failure only — cleanup + mark failed
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
-- 4. BACKFALL: Reinstall views on all existing tenant schemas
-- ============================================================
-- Ensures all existing tenants get tenant-neutral views
-- (replacing any that were cloned from the template with Main refs).

DO $$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'entity\\_%'
          AND nspname <> 'tenant_master_template'
    LOOP
        BEGIN
            PERFORM public._prov_install_financial_views(v_schema);
            PERFORM public._prov_install_item_library(
                v_schema,
                (SELECT e.id FROM public.entities e
                 JOIN public.workspaces w ON w.id = e.workspace_id
                 WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
                 LIMIT 1)
            );
            RAISE NOTICE 'Reinstalled views for %', v_schema;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to reinstall views for %: %', v_schema, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ============================================================
-- 5. Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
