-- ============================================================================
-- Migration: entity_schema_listing_rpc
-- Date: 2026-09-05
-- ============================================================================
-- Read-only entity-schema inventory for the postgrest-schema-exposure
-- Edge Function.
--
-- Background: the Edge Function validates exposure candidates against
-- pg_namespace (authoritative DB state, fail-closed). It previously read
-- pg_namespace through PostgREST (supabase.from("pg_namespace")), but
-- pg_namespace is a system catalog, not a servable table, so every
-- invocation failed schema-cache validation and no queued schema was
-- ever processed. This function exposes the same authoritative answer
-- through a callable RPC instead. No tables, policies, triggers, or data
-- changes in this migration.
--
-- Security: SECURITY DEFINER because pg_namespace visibility differs by
-- role. No arguments (nothing to inject). Returns only names matching
-- the tenant schema shape. Executable by service_role only — the Edge
-- Function's key. Fail-closed: any error yields an empty set, and the
-- caller treats that as "cannot establish state, abort".
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_entity_schema_names()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT COALESCE(array_agg(nspname ORDER BY nspname), '{}'::text[])
    FROM pg_namespace
    WHERE nspname LIKE 'entity\_%'
      AND nspname <> 'tenant_master_template';
$function$;

COMMENT ON FUNCTION public.get_entity_schema_names IS
    'Read-only inventory of tenant schemas for PostgREST exposure '
    'validation. Service-role only. Fail-closed on error.';

REVOKE ALL ON FUNCTION public.get_entity_schema_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_entity_schema_names() TO service_role;
