-- Domain: Quotations — Grant Quotation Permissions (Root Cause Fix)
-- Created: 2026-08-14
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- The default permission seeder _prov_seed_default_permissions() never
-- granted the 'quotation' resource. The production entity
-- entity_bigdrops-main_main therefore has NO quotation rows in
-- public.entity_permissions. The tenant RLS policy for quotations
-- (resource 'quotation') blocks both SELECT and INSERT for workspace
-- owners, producing:
--
--   "new row violates row-level security policy for table quotations"
--
-- when creating a quotation.
--
-- This migration:
--   1. Redefines _prov_seed_default_permissions() to include the
--      'quotation' resource (view/create/edit/delete), so every newly
--      provisioned entity receives quotation permissions automatically
--      (provision_entity() step 8.7 calls this helper).
--   2. Backfills quotation permissions for the confirmed production
--      entity entity_bigdrops-main_main for its workspace owner(s).
--
-- Idempotent (ON CONFLICT DO NOTHING). Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. DEFAULT PERMISSION SEEDER (redefined: adds 'quotation')
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
            ('invoice'), ('payment'), ('receipt'), ('setting'), ('quotation')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- ============================================================
-- 2. PRODUCTION BACKFILL (one-time, guarded, idempotent)
-- ============================================================

DO $do$
DECLARE
    v_schema       text := 'entity_bigdrops-main_main';
    v_entity_id    uuid;
    v_workspace_id uuid;
    v_owner        record;
BEGIN

    -- Resolve the production entity from the schema name (no hardcoded UUIDs).
    SELECT
        e.id,
        e.workspace_id
    INTO
        v_entity_id,
        v_workspace_id
    FROM public.entities e
    JOIN public.workspaces w
      ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema %', v_schema;
    END IF;

    FOR v_owner IN
        SELECT user_id
        FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND role = 'owner'
    LOOP
        PERFORM public._prov_seed_default_permissions(
            v_entity_id,
            v_owner.user_id
        );
        RAISE NOTICE
            'Granted default permissions (incl. quotation) to workspace owner %',
            v_owner.user_id;
    END LOOP;

    RAISE NOTICE
        '=== Quotation permission backfill COMPLETE ===';

END;
$do$;
