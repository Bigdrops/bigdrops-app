-- ============================================================================
-- Migration: tenant_schema_exposure_check
-- Date: 2026-09-05
-- ============================================================================
-- Read-only exposure probe for tenant schemas.
--
-- Background: provision_entity() marks an entity 'ready' once its schema,
-- tables, RLS, and seed data exist, but PostgREST exposure (Gate 2:
-- pgrst.schemas config applied asynchronously via queue + Edge Function)
-- can lag behind. The application must not treat provisioning 'ready' as
-- operationally ready while PostgREST still rejects the schema.
--
-- This migration adds ONE read-only function and changes nothing else:
-- no tables, no policies, no triggers, no data changes.
--
-- Security: SECURITY DEFINER only because pg_db_role_setting is not
-- readable by authenticated roles. The function:
--   - accepts only names matching the tenant schema shape,
--   - resolves the owning workspace from public.entities (never trusts
--     caller-supplied workspace/entity ids),
--   - requires the caller to be a member of that workspace (RLS-style
--     membership check inside the function body),
--   - fail-closes (FALSE) on any error, mismatch, or missing object.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_schema_exposed(p_schema_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_workspace_id uuid;
    v_caller_id uuid := auth.uid();
    v_config text;
BEGIN
    -- Shape guard: tenant schemas only (slugs are lowercase/digits/_/-).
    IF p_schema_name IS NULL OR p_schema_name !~ '^entity_[a-z0-9_-]+$' THEN
        RETURN FALSE;
    END IF;

    IF v_caller_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Resolve the owning workspace from the registry (authoritative).
    SELECT e.workspace_id INTO v_workspace_id
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE ('entity_' || w.slug || '_' || e.slug) = p_schema_name
    LIMIT 1;

    IF v_workspace_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Caller must belong to the owning workspace.
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = v_caller_id
    ) AND NOT public.is_platform_operator(v_caller_id, 'owner') THEN
        RETURN FALSE;
    END IF;

    -- Gate 1: schema physically exists.
    IF NOT EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = p_schema_name
    ) THEN
        RETURN FALSE;
    END IF;

    -- Gate 2: schema present in the authenticator PostgREST config.
    SELECT replace(unnest, 'pgrst.schemas=', '') INTO v_config
    FROM pg_db_role_setting, unnest(setconfig)
    WHERE setrole = (SELECT oid FROM pg_authid WHERE rolname = 'authenticator')
      AND unnest LIKE 'pgrst.schemas=%'
    LIMIT 1;

    IF v_config IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN (',' || v_config || ',') LIKE ('%,' || p_schema_name || ',%');
EXCEPTION WHEN OTHERS THEN
    -- Fail closed: any unexpected error means "not exposed".
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_tenant_schema_exposed IS
    'Read-only probe: TRUE only when the caller belongs to the owning '
    'workspace AND the tenant schema exists AND it is listed in the '
    'authenticator pgrst.schemas config. Fail-closed on any mismatch.';

REVOKE ALL ON FUNCTION public.is_tenant_schema_exposed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_schema_exposed(text) TO authenticated;
