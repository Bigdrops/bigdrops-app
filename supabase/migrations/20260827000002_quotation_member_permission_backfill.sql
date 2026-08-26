-- Domain: Tenant permissions — Backfill all resources for team members
-- Created: 2026-08-27
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- Production regression after the multi-tenancy cutover: the workspace
-- owner can create quotations (and other business records) but team members
-- cannot. The root cause is a permission-SEEDING gap, not an RLS defect.
--
-- The tenant RLS policies (installed by _prov_install_rls) use:
--
--   WITH CHECK (has_entity_permission(<entity_id>, auth.uid(), <resource>, 'create'))
--
-- has_entity_permission() returns TRUE only when a matching row exists in
-- public.entity_permissions for (entity_id, user_id, resource, action).
--
-- The owner-only backfills (20260814000001 quotation, 20260819000001
-- waybill) seeded only workspace owners, and the default seeder
-- _prov_seed_default_permissions() runs only for the entity creator. Team
-- members who joined later (invitation or role assignment) received no
-- permission rows for these resources, so every tenant business write fails
-- for them with:
--
--   "new row violates row-level security policy for table <resource>"
--
-- This migration backfills every tenant resource for EVERY user who already
-- holds at least one permission on the live production entity. Membership is
-- signalled by holding any entity_permissions row, so this covers the owner
-- and all invited members without inventing a new membership model.
--
-- RLS is preserved. No GRANT to anon/other tenants. No SECURITY DEFINER
-- bypass. Rows are scoped to the single target entity. Non-members and
-- cross-tenant users still fail the check.
--
-- This is the comprehensive form of the per-resource fixes above; it clears
-- the same class of bug for all tenant tables at once.
--
-- Idempotent (ON CONFLICT DO NOTHING). Safe to re-run.
-- =====================================================================

DO $do$
DECLARE
    v_schema    text := 'entity_bigdrops-main_main';
    v_entity_id uuid;
BEGIN

    SELECT e.id INTO v_entity_id
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema %', v_schema;
    END IF;

    -- Grant all tenant resources (view/create/edit/delete) to every user
    -- that already holds a permission on this entity. Mirrors the waybill
    -- and quotation backfills; membership is signalled by holding at least
    -- one entity permission.
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
        VALUES
            ('invoice'),
            ('payment'),
            ('receipt'),
            ('setting'),
            ('quotation'),
            ('waybill'),
            ('project'),
            ('client'),
            ('signatory'),
            ('bank_account'),
            ('csr'),
            ('tax_setting'),
            ('letter'),
            ('boq'),
            ('rfq')
    ) AS r(resource)
    CROSS JOIN (
        VALUES ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    RAISE NOTICE
        'Backfilled all tenant resource permissions for entity % (schema %)',
        v_entity_id, v_schema;

END;
$do$;
