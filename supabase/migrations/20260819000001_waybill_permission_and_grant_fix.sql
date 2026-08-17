-- Domain: Waybills — Backfill Waybill Permissions and Table Grants
-- Created: 2026-08-19
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- The production entity entity_bigdrops-main_main has NO 'waybill'
-- rows in public.entity_permissions. The default permission seeder
-- _prov_seed_default_permissions() never granted the 'waybill'
-- resource for this entity. As a result:
--
--   - Waybills list returns 0 rows. The tenant waybills SELECT grant
--     exists, but the tenant RLS policy (resource 'waybill', action
--     'view') rejects every row for the workspace members.
--   - Waybill usage/download fails with
--     "permission denied for table blank_waybill_logs". The tenant
--     blank_waybill_logs table was cloned by 20260810040000 via
--     _prov_clone_table() + _prov_install_rls(), which grant nothing.
--
-- This migration:
--   1. Backfills 'waybill' view/create/edit/delete permission rows
--      for every user who already holds a permission on the live
--      entity (covers the workspace owner and any invited members).
--   2. Grants SELECT/INSERT/UPDATE/DELETE on the tenant waybills and
--      blank_waybill_logs tables to anon, authenticated, service_role,
--      mirroring plan-c-live-entity-backfill (20260817000000).
--
-- Idempotent (ON CONFLICT DO NOTHING; GRANT is idempotent).
-- Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. BACKFILL WAYBILL PERMISSION ROWS
-- ============================================================

DO $do$
DECLARE
    v_schema    text := 'entity_bigdrops-main_main';
    v_entity_id uuid;
BEGIN

    -- Resolve the production entity from the schema name (no hardcoded UUIDs).
    SELECT
        e.id
    INTO
        v_entity_id
    FROM public.entities e
    JOIN public.workspaces w
      ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema %', v_schema;
    END IF;

    -- Grant waybill permissions to every user that already holds a
    -- permission on this entity. Membership is signalled by holding at
    -- least one entity permission, so this covers the owner and all
    -- invited members without inventing a new membership model.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT
        v_entity_id,
        m.user_id,
        r.resource,
        a.action
    FROM (
        SELECT DISTINCT user_id
        FROM public.entity_permissions
        WHERE entity_id = v_entity_id
    ) AS m
    CROSS JOIN (
        VALUES ('waybill')
    ) AS r(resource)
    CROSS JOIN (
        VALUES ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    RAISE NOTICE
        'Backfilled waybill permissions for entity % (schema %)',
        v_entity_id, v_schema;

END;
$do$;

-- ============================================================
-- 2. TENANT TABLE GRANTS (mirror plan-c 20260817000000)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
    ON "entity_bigdrops-main_main".waybills
    TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON "entity_bigdrops-main_main".blank_waybill_logs
    TO anon, authenticated, service_role;