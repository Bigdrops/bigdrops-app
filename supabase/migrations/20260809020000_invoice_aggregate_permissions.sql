-- Domain: Entity Provisioning Engine / Phase 3 (Phase 4 — Permission architecture)
-- Created: 2026-08-09
--
-- Purpose:
--   Provide a reusable, idempotent permission-seeding mechanism so the
--   provisioning/default-role architecture can supply the invoice aggregate
--   permissions required by tenant RLS:
--       invoice  → view, create, edit, delete
--       payment  → view, create, edit, delete
--       receipt  → view, create, edit, delete
--   (wht_receipts resolves to the 'payment' resource; invoice_items to 'invoice'.)
--
-- Change:
--   1. New helper _prov_seed_default_permissions(p_entity_id, p_user_id):
--        grants the canonical aggregate permission set to one user, idempotently
--        (ON CONFLICT DO NOTHING). Reusable — no production user UUID hardcoded.
--   2. provision_entity() redefined: after settings seed + trigger install,
--        grants the default permission set to the provisioning caller
--        (auth.uid()) so a freshly provisioned entity is immediately usable.
--
-- Scope guards:
--   - Function definitions only. No table structure, RLS, or data changes.
--   - No production-specific user/entity UUIDs are referenced.
--   - Existing entity_bigdrops-main_main is untouched (permissions for the
--     production user are granted by the human operator during rollout using
--     this same helper; see 20260809030000_invoice_aggregate_data_migration.sql).

-- ============================================================
-- DEFAULT PERMISSION SEEDER
-- ============================================================

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
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('invoice'), ('payment'), ('receipt')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- ============================================================
-- ORCHESTRATION FUNCTION (redefined: adds permission step 8.7)
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

        -- 8.7 Grant default invoice-aggregate permissions to the provisioning
        --     caller so the entity is usable immediately.
        IF auth.uid() IS NOT NULL THEN
            PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());
        END IF;

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
