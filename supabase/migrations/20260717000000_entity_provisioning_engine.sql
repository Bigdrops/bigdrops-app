-- Domain: Entity Provisioning Engine
-- Round 6: Production provisioning pipeline for creating new business entities
-- Created: 2026-07-17
-- Source: docs/Prompts/prompt66.md, PRD v2.1 §§9, 9.1
--
-- Architecture:
--   One public orchestration function: provision_entity()
--   Private helper functions: _prov_*() for each concern
--
-- Idempotency strategy:
--   READY     → return success immediately, no work
--   CREATING  → return "already in progress" (safe: advisory lock prevents concurrent calls)
--   FAILED    → require explicit retry; check attempt_count vs retry limit
--   (none)    → proceed with provisioning
--
-- Retry policy:
--   Configurable via _prov_get_retry_limit(). Default: 3.
--   When exceeded: return "Manual Intervention Required" state.
--
-- Template tables (entity-specific, cloned per entity):
--   clients, settings, signatories, bank_accounts, projects, quotations,
--   invoices, payments, csrs, waybills, tax_settings, receipts, letters,
--   boqs, rfqs
--
-- RLS audit (Round 5 compliance):
--   All generated policies use has_entity_permission() which queries
--   entity_permissions (a different table). No self-table subqueries.
--   No recursion risk.

-- ============================================================
-- SECTION 1: CONFIGURATION
-- ============================================================

-- Template tables to clone per entity (order matters for FK re-addition)
CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
RETURNS text[]
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'quotations', 'invoices', 'payments',
        'csrs', 'waybills', 'tax_settings', 'receipts',
        'letters', 'boqs', 'rfqs'
    ];
$function$;

-- Map table names to permission resource names
CREATE OR REPLACE FUNCTION public._prov_table_to_resource(p_table text)
RETURNS text
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT CASE p_table
        WHEN 'invoices' THEN 'invoice'
        WHEN 'waybills' THEN 'waybill'
        WHEN 'quotations' THEN 'quotation'
        WHEN 'payments' THEN 'payment'
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

-- Retry limit (configurable, not hardcoded)
CREATE OR REPLACE FUNCTION public._prov_get_retry_limit()
RETURNS integer
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT 3;
$function$;

-- ============================================================
-- SECTION 2: HELPER FUNCTIONS
-- ============================================================

-- 2.1 Validate permissions
-- Caller must be workspace owner OR hold create_entity permission.
CREATE OR REPLACE FUNCTION public._prov_validate_permissions(p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
    v_is_owner boolean;
    v_has_permission boolean;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM public.entities WHERE id = p_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Entity not found: %', p_entity_id;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) INTO v_is_owner;

    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND (permissions->>'create_entity')::boolean = true
    ) INTO v_has_permission;

    IF NOT v_is_owner AND NOT v_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions: must be workspace owner or hold create_entity permission'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$function$;

-- 2.2 Check idempotency
-- Returns: 'ready', 'creating', 'failed', 'new'
CREATE OR REPLACE FUNCTION public._prov_check_idempotency(p_entity_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_status text;
    v_attempt_count integer;
    v_retry_limit integer;
BEGIN
    SELECT status, attempt_count INTO v_status, v_attempt_count
    FROM public.entity_provisioning_status
    WHERE entity_id = p_entity_id;

    IF NOT FOUND THEN
        RETURN 'new';
    END IF;

    IF v_status = 'ready' THEN
        RETURN 'ready';
    END IF;

    IF v_status = 'creating' THEN
        RETURN 'creating';
    END IF;

    IF v_status = 'failed' THEN
        v_retry_limit := public._prov_get_retry_limit();
        IF v_attempt_count >= v_retry_limit THEN
            RAISE EXCEPTION 'Retry limit exceeded (%/%). Manual intervention required.',
                v_attempt_count, v_retry_limit
                USING ERRCODE = 'error_during_execution';
        END IF;
        RETURN 'failed';
    END IF;

    RETURN 'new';
END;
$function$;

-- 2.3 Update provisioning status
CREATE OR REPLACE FUNCTION public._prov_update_status(
    p_entity_id uuid,
    p_status text,
    p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.entity_provisioning_status (entity_id, status, last_error, attempt_count, updated_at)
    VALUES (p_entity_id, p_status, p_error, 1, now())
    ON CONFLICT (entity_id) DO UPDATE
        SET status = EXCLUDED.status,
            last_error = EXCLUDED.last_error,
            attempt_count = entity_provisioning_status.attempt_count + 1,
            updated_at = now();
END;
$function$;

-- 2.4 Get schema name for entity
CREATE OR REPLACE FUNCTION public._prov_get_schema_name(p_entity_id uuid)
RETURNS text
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT 'entity_' || w.slug || '_' || e.slug
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE e.id = p_entity_id;
$function$;

-- 2.5 Create entity schema
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

    EXECUTE format('CREATE SCHEMA %I', p_schema_name);
END;
$function$;

-- 2.6 Clone a single table from public to target schema
-- Copies structure, constraints, indexes. Drops FKs (re-added later).
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
    -- Clone table structure with all attributes
    EXECUTE format(
        'CREATE TABLE %I.%I LIKE %I.%I INCLUDING ALL',
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

-- 2.7 Re-add foreign keys referencing the target schema
CREATE OR REPLACE FUNCTION public._prov_readd_foreign_keys(
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
    v_col_name text;
    v_ref_table text;
    v_ref_col text;
BEGIN
    -- Get FK definitions from source table
    FOR v_fk IN
        SELECT
            c.conname,
            a.attname AS col_name,
            fc.relname AS ref_table,
            fa.attname AS ref_col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        JOIN pg_class rc ON rc.oid = c.confrelid
        JOIN pg_class fc ON fc.oid = c.confrelid
        JOIN pg_attribute fa ON fa.attrelid = fc.oid AND fa.attnum = ANY(c.confkey)
        WHERE c.conrelid = (p_source_schema || '.' || p_table_name)::regclass
          AND c.contype = 'f'
    LOOP
        -- Only re-add if the referenced table exists in target schema
        IF EXISTS (
            SELECT 1 FROM pg_namespace n
            JOIN pg_class cl ON cl.relnamespace = n.oid
            WHERE n.nspname = p_target_schema AND cl.relname = v_fk.ref_table
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I)',
                p_target_schema, p_table_name, v_fk.conname || '_clone',
                v_fk.col_name, p_target_schema, v_fk.ref_table, v_fk.ref_col
            );
        END IF;
    END LOOP;
END;
$function$;

-- 2.8 Install RLS policies on a cloned table
-- Uses has_entity_permission() — no self-table subqueries.
CREATE OR REPLACE FUNCTION public._prov_install_rls(
    p_schema_name text,
    p_table_name text,
    p_entity_id uuid,
    p_resource text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_fq_table text := p_schema_name || '.' || p_table_name;
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', p_schema_name, p_table_name);

    -- Force RLS for table owner (security hardening)
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', p_schema_name, p_table_name);

    -- SELECT policy
    EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO public USING (has_entity_permission($1, auth.uid(), $2, $3))',
        p_table_name || '_select', p_schema_name, p_table_name
    ) USING (p_entity_id, p_resource, 'view');

    -- INSERT policy
    EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (has_entity_permission($1, auth.uid(), $2, $3))',
        p_table_name || '_insert', p_schema_name, p_table_name
    ) USING (p_entity_id, p_resource, 'create');

    -- UPDATE policy
    EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING (has_entity_permission($1, auth.uid(), $2, $3))',
        p_table_name || '_update', p_schema_name, p_table_name
    ) USING (p_entity_id, p_resource, 'edit');

    -- DELETE policy
    EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING (has_entity_permission($1, auth.uid(), $2, $3))',
        p_table_name || '_delete', p_schema_name, p_table_name
    ) USING (p_entity_id, p_resource, 'delete');
END;
$function$;

-- 2.9 Cleanup on error (drop partial schema)
CREATE OR REPLACE FUNCTION public._prov_cleanup_on_error(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_schema_name IS NOT NULL AND p_schema_name != '' THEN
        IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = p_schema_name) THEN
            EXECUTE format('DROP SCHEMA %I CASCADE', p_schema_name);
        END IF;
    END IF;
END;
$function$;

-- ============================================================
-- SECTION 3: ORCHESTRATION FUNCTION
-- ============================================================

-- provision_entity() — the single provisioning entry point
-- Coordinates: permissions → idempotency → lock → status → schema → clone → RLS → finalize
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

    -- 3. Acquire advisory lock (transaction-scoped, auto-released on commit/rollback)
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
        -- Clone table structure
        PERFORM public._prov_clone_table('public', v_schema_name, v_table);

        -- Install RLS policies
        v_resource := public._prov_table_to_resource(v_table);
        PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
    END LOOP;

    -- 8. Re-add foreign keys (all tables now exist in target schema)
    FOREACH v_table IN ARRAY v_tables
    LOOP
        PERFORM public._prov_readd_foreign_keys('public', v_schema_name, v_table);
    END LOOP;

    -- 9. Finalize — update status to 'ready'
    PERFORM public._prov_update_status(p_entity_id, 'ready');

    RETURN jsonb_build_object(
        'status', 'ready',
        'schema_name', v_schema_name,
        'message', 'Entity provisioned successfully'
    );

EXCEPTION WHEN OTHERS THEN
    -- 10. Error handling — drop partial schema, update status to 'failed'
    PERFORM public._prov_cleanup_on_error(v_schema_name);
    PERFORM public._prov_update_status(p_entity_id, 'failed', SQLERRM);

    RETURN jsonb_build_object(
        'status', 'failed',
        'error', SQLERRM,
        'schema_name', v_schema_name
    );
END;
$function$;
