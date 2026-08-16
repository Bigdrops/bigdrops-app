-- Domain: Multi-Tenancy Reconciliation — creator wildcard permission
-- Created: 2026-08-18
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- PRD multi-tenancy-prd-v2.1 §9.3 requires the creating user to receive
-- a wildcard grant on the new entity: resource '*' with actions
-- view, create, edit, delete, applied in the same provisioning
-- transaction before the entity is marked 'ready'.
--
-- The current seeder _prov_seed_default_permissions() grants an
-- enumerated resource set (invoice, payment, receipt, setting,
-- quotation, rfq, boq, item, tax_setting full; audit, device view-only).
-- It omits several resources mapped by _prov_table_to_resource():
-- client, project, project_document, waybill, csr, letter, signatory,
-- bank_account. Because tenant RLS policies call has_entity_permission()
-- with those resource names, the creator of a newly provisioned entity
-- cannot open those tables.
--
-- This migration redefines _prov_seed_default_permissions() to also
-- grant the wildcard rows ('*', view/create/edit/delete) to the creating
-- user. has_entity_permission() already matches 'resource = ''*''' so no
-- other change is required. Existing enumerated grants are preserved.
--
-- Idempotent via ON CONFLICT DO NOTHING. Safe to re-run. Affects NEW
-- entities only; backfilling the live production entity is out of scope.
-- =====================================================================

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
    -- PRD §9.3: wildcard grant for the creating user.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('*')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    -- Full-action resources: view, create, edit, delete
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('invoice'), ('payment'), ('receipt'), ('setting'), ('quotation'),
            ('rfq'), ('boq'), ('item'), ('tax_setting')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    -- View-only resources: audit, device
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('audit'), ('device')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;