-- ============================================================================
-- Migration: exposure_probe_queue_state
-- Date: 2026-09-05
-- ============================================================================
-- Corrects is_tenant_schema_exposed() Gate 2 source of truth.
--
-- Finding: on hosted Supabase, the Management API PATCH /postgrest
-- (issued by the postgrest-schema-exposure Edge Function) does NOT
-- materialize into pg_db_role_setting, so reading the authenticator
-- pgrst.schemas role setting cannot observe API-applied exposure.
-- Verified live: after a successful PATCH (processed:1), the new schema
-- served 200s over REST while pg_db_role_setting still showed the old
-- list. A probe based on that catalog view would report FALSE forever
-- for API-exposed schemas.
--
-- Replacement rule (all DB-observable, still fail-closed):
--   Gate 1: the schema physically exists in pg_namespace.
--   Gate 2: no UNPROCESSED queue row remains for it. The edge processor
--   marks processed=true only after a successful Management API PATCH,
--   and releases (never marks) on any failure — so a pending row means
--   "not yet served", and its absence means "served or never queued
--   (pre-queue-era schemas, which are served)".
--
-- Membership/shape/fail-closed semantics are unchanged. This migration
-- only redefines the function body (CREATE OR REPLACE); nothing else.
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

    -- Gate 2: no unprocessed exposure work remains for this schema.
    IF EXISTS (
        SELECT 1 FROM public._pending_postgrest_schemas
        WHERE schema_name = p_schema_name
          AND processed = false
    ) THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Fail closed: any unexpected error means "not exposed".
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_tenant_schema_exposed IS
    'Read-only probe: TRUE only when the caller belongs to the owning '
    'workspace AND the tenant schema exists AND no unprocessed exposure '
    'queue row remains. Fail-closed on any mismatch.';
