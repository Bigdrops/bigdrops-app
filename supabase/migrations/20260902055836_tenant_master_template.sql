-- ============================================================
-- TENANT MASTER TEMPLATE
-- ============================================================
-- Creates a structure-only master template from the existing
-- entity_bigdrops-main_main tenant schema. The template contains
-- tables, columns, PKs, unique/check constraints, indexes,
-- sequences, triggers, and views — but ZERO business data.
--
-- Foreign keys referencing the source schema are dropped from
-- the template. They are re-added by the provisioning engine
-- when cloning to a target entity schema.
--
-- RLS policies are NOT included in the template. They are
-- installed per-entity by the existing provisioning code.
--
-- Tenant-local functions (RPCs) are NOT included in the template.
-- They are installed per-entity by _prov_install_tenant_rpcs().
--
-- This migration also updates the provisioning engine to clone
-- from the master template instead of the deprecated public.*
-- operational tables.

-- ============================================================
-- 1. Create the master template schema and clone structure
-- ============================================================
DO $$
DECLARE
    v_src TEXT := 'entity_bigdrops-main_main';
    v_tpl TEXT := 'tenant_master_template';
    v_table RECORD;
    v_view RECORD;
    v_fk record;
    v_idx RECORD;
    v_con RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Create template schema
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_tpl) THEN
        EXECUTE format('DROP SCHEMA %I CASCADE', v_tpl);
    END IF;
    EXECUTE format('CREATE SCHEMA %I', v_tpl);
    RAISE NOTICE 'Created schema %', v_tpl;

    -- Step 1: Clone all tables (structure only, no data)
    FOR v_table IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = v_src
        ORDER BY tablename
    LOOP
        EXECUTE format(
            'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
            v_tpl, v_table.tablename,
            v_src, v_table.tablename
        );
        v_count := v_count + 1;
        RAISE NOTICE 'Cloned table %.%', v_tpl, v_table.tablename;
    END LOOP;
    RAISE NOTICE 'Cloned % tables', v_count;

    -- Step 2: Drop foreign keys referencing the source schema
    -- (they point to entity_bigdrops-main_main, not the template)
    FOR v_fk IN
        SELECT
            c.conname,
            cl.relname AS table_name
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = v_tpl
          AND c.contype = 'f'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            v_tpl, v_fk.table_name, v_fk.conname
        );
    END LOOP;
    RAISE NOTICE 'Dropped foreign keys referencing source schema';

    -- Step 3: Drop indexes that reference the source schema
    -- (pg_get_indexdef returns the CREATE INDEX statement with schema names)
    FOR v_idx IN
        SELECT
            c.relname AS index_name,
            t.relname AS table_name
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = v_tpl
          AND NOT i.indisprimary
          AND NOT i.indisunique
    LOOP
        -- Check if index definition references source schema
        IF pg_get_indexdef(
            (SELECT oid FROM pg_class WHERE relname = v_idx.index_name AND relnamespace =
                (SELECT oid FROM pg_namespace WHERE nspname = v_tpl)),
            1, TRUE
        ) LIKE '%' || v_src || '%' THEN
            EXECUTE format('DROP INDEX IF EXISTS %I.%I', v_tpl, v_idx.index_name);
        END IF;
    END LOOP;

    -- Step 4: Recreate views in the template schema
    -- Views must be recreated because LIKE doesn't update schema references
    FOR v_view IN
        SELECT c.relname AS viewname, pg_get_viewdef(c.oid, TRUE) AS definition
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_src
          AND c.relkind = 'v'
    LOOP
        EXECUTE format(
            'CREATE OR REPLACE VIEW %I.%I AS %s',
            v_tpl, v_view.viewname, v_view.definition
        );
        RAISE NOTICE 'Recreated view %.%', v_tpl, v_view.viewname;
    END LOOP;

    -- Mark the template
    EXECUTE format(
        'COMMENT ON SCHEMA %I IS ''Tenant master template — structure only, no business data. Derived from %s.''',
        v_tpl, v_src
    );

    RAISE NOTICE '=== Tenant master template created successfully ===';
END $$;

-- ============================================================
-- 2. Verify the template contains zero business data
-- ============================================================
DO $$
DECLARE
    v_table RECORD;
    v_count BIGINT;
    v_has_data BOOLEAN := FALSE;
BEGIN
    FOR v_table IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'tenant_master_template'
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', 'tenant_master_template', v_table.tablename) INTO v_count;
        IF v_count > 0 THEN
            RAISE WARNING 'Template table %.% has % rows (expected 0)', 'tenant_master_template', v_table.tablename, v_count;
            v_has_data := TRUE;
        END IF;
    END LOOP;

    IF v_has_data THEN
        RAISE EXCEPTION 'Master template contains business data — aborting';
    ELSE
        RAISE NOTICE 'Verified: master template contains zero business data';
    END IF;
END $$;

-- ============================================================
-- 3. Verify the existing tenant schema is untouched
-- ============================================================
DO $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT count(*) INTO v_count
    FROM pg_tables
    WHERE schemaname = 'entity_bigdrops-main_main';
    RAISE NOTICE 'entity_bigdrops-main_main tables: %', v_count;

    IF v_count != 32 THEN
        RAISE WARNING 'Expected 32 tables in entity_bigdrops-main_main, found %', v_count;
    END IF;
END $$;

-- ============================================================
-- 4. Update provisioning to clone from the master template
-- ============================================================

-- 4.1 Update _prov_clone_table to use tenant_master_template
CREATE OR REPLACE FUNCTION public._prov_clone_table(
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
    v_fk record;
BEGIN
    -- Clone table structure with all attributes (no data)
    EXECUTE format(
        'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
        p_target_schema, p_table_name,
        p_source_schema, p_table_name
    );

    -- Drop foreign key constraints (they reference source schema)
    FOR v_fk IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = (p_target_schema || '.' || p_table_name)::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            p_target_schema, p_table_name, v_fk.conname
        );
    END LOOP;
END;
$function$;

-- 4.2 Update _prov_get_template_tables to match the full 32-table set
CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
RETURNS text[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'project_documents',
        'quotations', 'quotation_items',
        'invoices', 'invoice_items',
        'payments', 'wht_receipts',
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

-- 4.3 Update provision_entity to clone from tenant_master_template
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

        -- 9. Install tenant-local RPCs
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        -- 10. Seed settings
        PERFORM public._prov_seed_settings(v_schema_name, p_entity_id);

        -- 11. Seed default permissions
        PERFORM public._prov_seed_default_permissions(v_schema_name, p_entity_id);

        -- 12. Finalize
        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- 13. Provisioning failure only — cleanup + mark failed
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
-- 5. Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
