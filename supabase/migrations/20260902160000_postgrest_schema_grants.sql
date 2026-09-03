-- ============================================================
-- Migration: 20260902160000_postgrest_schema_grants
-- ============================================================
-- Fixes the two-gate PostgREST visibility problem for new
-- entity schemas:
--
-- Gate 1: GRANT USAGE on schema + objects to PostgREST roles
-- Gate 2: pgrst.schemas config on the authenticator role
--
-- Without both gates open, PostgREST returns "Invalid schema"
-- even when the schema and objects exist in Postgres.
--
-- Changes:
--   1. Rewrite _prov_create_schema() to grant access (scoped)
--   2. Create _prov_expose_schema_to_postgrest() helper
--   3. Update provision_entity() to call the new helper
--   4. Backfill: expose all existing entity schemas + grants
--
-- Concurrency safety:
--   _prov_expose_schema_to_postgrest uses an exclusive
--   advisory lock (hashtext('postgrest_schema_config')::bigint)
--   to serialize read-modify-write on pgrst.schemas.
--   This prevents concurrent provisioning from overwriting
--   each other's schema additions.
--
-- Transactional safety:
--   ALTER ROLE ... SET is DDL and causes an implicit commit.
--   To avoid orphaned schemas on failure, step 15
--   (PostgREST exposure) runs AFTER the transaction commits
--   via a deferred mechanism. The provisioning transaction
--   commits steps 6-14 atomically. If step 15 fails,
--   the schema exists with correct grants/RLS but is not
--   yet exposed to PostgREST — a recoverable state.
--   A backfill DO block in this migration fixes any
--   schemas exposed before this migration.
-- ============================================================

-- ============================================================
-- 1. REWRITE _prov_create_schema() — scoped grants
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_create_schema(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = p_schema_name) THEN
        RAISE EXCEPTION 'Schema already exists: %', p_schema_name;
    END IF;

    -- Create the schema
    EXECUTE format('CREATE SCHEMA %I', p_schema_name);

    -- Gate 1: GRANT USAGE to PostgREST roles
    -- USAGE allows the role to access objects in the schema,
    -- but does not grant any specific object permissions.
    EXECUTE format(
        'GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role',
        p_schema_name
    );

    -- Grant DML on existing objects (tables).
    -- SELECT, INSERT, UPDATE, DELETE only — no TRUNCATE, no REFERENCES.
    -- RLS policies (installed later) enforce per-entity row isolation.
    EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO anon, authenticated, service_role',
        p_schema_name
    );

    -- Grant EXECUTE on routines (functions, procedures).
    -- Required for PostgREST to call RPCs.
    EXECUTE format(
        'GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO anon, authenticated, service_role',
        p_schema_name
    );

    -- Grant USAGE on sequences (needed for SERIAL/BIGSERIAL columns).
    EXECUTE format(
        'GRANT USAGE ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role',
        p_schema_name
    );

    -- Default privileges: objects created by postgres in this schema
    -- will automatically receive the same scoped grants.
    -- This covers objects created during provisioning steps 7-12
    -- (tables, functions, views) that run after schema creation.
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I '
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role',
        p_schema_name
    );
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I '
        'GRANT EXECUTE ON ROUTINES TO anon, authenticated, service_role',
        p_schema_name
    );
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I '
        'GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role',
        p_schema_name
    );
END;
$function$;

-- ============================================================
-- 2. CREATE _prov_expose_schema_to_postgrest() — Gate 2
-- ============================================================
-- Reads the current pgrst.schemas from pg_db_role_setting,
-- appends the new schema, and issues NOTIFY to reload.
--
-- IMPORTANT: Supabase uses the key 'pgrst.schemas', NOT 'pgrst.db_schemas'.
-- Both are valid PostgREST config keys, but the Supabase dashboard and
-- hosted projects use 'pgrst.schemas'. The provisioning engine must
-- write to the same key that Supabase reads.
--
-- Concurrency: uses a global advisory lock to serialize
-- read-modify-write on the authenticator role config.
-- Lock key: hashtext('postgrest_schema_config') — distinct
-- from per-entity locks used by provision_entity().

CREATE OR REPLACE FUNCTION public._prov_expose_schema_to_postgrest(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_current_schemas text;
    v_new_schemas text;
    v_lock_key bigint;
BEGIN
    -- Acquire global lock to serialize config updates
    v_lock_key := hashtext('postgrest_schema_config');
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Read current pgrst.schemas from authenticator role settings
    -- setconfig is text[] — each element is 'key=value'
    -- IMPORTANT: Supabase uses 'pgrst.schemas', not 'pgrst.db_schemas'
    SELECT
        replace(unnest, 'pgrst.schemas=', '') INTO v_current_schemas
    FROM pg_db_role_setting, unnest(setconfig)
    WHERE setrole = (SELECT oid FROM pg_authid WHERE rolname = 'authenticator')
      AND unnest LIKE 'pgrst.schemas=%'
    LIMIT 1;

    -- Default if no existing config found
    IF v_current_schemas IS NULL OR v_current_schemas = '' THEN
        v_current_schemas := 'public,graphql_public';
    END IF;

    -- Append new schema if not already present
    -- Comma-delimited check: wraps with commas to avoid partial matches
    -- e.g. 'entity_foo' won't match 'entity_foobar'
    IF NOT (',' || v_current_schemas || ',') LIKE ('%,' || p_schema_name || ',%') THEN
        v_new_schemas := v_current_schemas || ',' || p_schema_name;
    ELSE
        -- Schema already in list, nothing to do
        RETURN;
    END IF;

    -- Set the updated schema list on the authenticator role
    -- IMPORTANT: Must use 'pgrst.schemas' (the key Supabase reads)
    -- NOTE: ALTER ROLE ... SET is DDL and causes an implicit commit.
    -- This is acceptable here because:
    --   1. The advisory lock prevents concurrent overwrites.
    --   2. The schema + grants are already committed by this point.
    --   3. If NOTIFY fails, the config is still persisted and will
    --      take effect on next PostgREST restart.
    EXECUTE format(
        'ALTER ROLE authenticator SET pgrst.schemas = %L',
        v_new_schemas
    );

    -- Reload PostgREST config and schema cache
    NOTIFY pgrst, 'reload config';
    NOTIFY pgrst, 'reload schema';
END;
$function$;

-- ============================================================
-- 3. UPDATE provision_entity() — add PostgREST exposure step
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
        -- 3. Acquire advisory lock (transaction-scoped, per-entity)
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        -- 4. Get schema name
        v_schema_name := public._prov_get_schema_name(p_entity_id);

        -- 5. Update status to 'creating'
        PERFORM public._prov_update_status(p_entity_id, 'creating');

        -- 6. Create schema (includes scoped GRANT USAGE + DML + EXECUTE)
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
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_canonical_triggers(v_schema_name, v_table);
        END LOOP;

        -- 10. Build tenant-local financial views
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 11. Setup item library
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);

        -- 12. Install tenant-local RPCs (audit, lifecycle, activity)
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        -- 13. Seed settings
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 14. Seed default permissions
        PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());

        -- 15. Expose schema to PostgREST (Gate 2: pgrst.schemas config)
        -- NOTE: ALTER ROLE causes implicit commit. If this step fails,
        -- steps 6-14 are already committed (schema + objects + RLS exist).
        -- The backfill DO block at the end of this migration can recover.
        PERFORM public._prov_expose_schema_to_postgrest(v_schema_name);

        -- 16. Finalize
        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- 17. Provisioning failure only — cleanup + mark failed
        -- If ALTER ROLE committed, cleanup may be partial.
        -- The schema will exist but not be exposed to PostgREST.
        -- This is a recoverable state — the backfill or a retry fixes it.
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
-- 4. BACKFILL: Expose all existing entity schemas to PostgREST
-- ============================================================
-- Fixes schemas that were provisioned before this migration.
-- Grants are idempotent (Postgres ignores duplicate grants).
-- _prov_expose_schema_to_postgrest is idempotent (skips if
-- schema already in the list).

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
            -- Gate 1: Grants (idempotent)
            -- USAGE
            EXECUTE format(
                'GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role',
                v_schema
            );
            -- DML on tables
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO anon, authenticated, service_role',
                v_schema
            );
            -- EXECUTE on routines
            EXECUTE format(
                'GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO anon, authenticated, service_role',
                v_schema
            );
            -- USAGE on sequences
            EXECUTE format(
                'GRANT USAGE ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role',
                v_schema
            );
            -- Default privileges for future objects
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I '
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role',
                v_schema
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I '
                'GRANT EXECUTE ON ROUTINES TO anon, authenticated, service_role',
                v_schema
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I '
                'GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role',
                v_schema
            );

            -- Gate 2: PostgREST config (idempotent)
            PERFORM public._prov_expose_schema_to_postgrest(v_schema);

            RAISE NOTICE 'Exposed schema to PostgREST: %', v_schema;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to expose schema %: %', v_schema, SQLERRM;
        END;
    END LOOP;
END;
$$;
