-- =====================================================================
-- Creator auto-grant must include a wildcard baseline grant.
-- PRD v2.1 §9.3 (2026-08-16 amendment): every NEW entity's creator
-- receives ('*', view/create/edit/delete) so no tenant table is denied
-- to them. Plan B (20260816000000) seeded enumerated resources only and
-- omitted waybill, client, project, project_document, signatory,
-- bank_account, csr, letter.
--
-- Redefines _prov_seed_default_permissions() to ALSO insert the
-- wildcard grant. Existing enumerated grants are preserved exactly.
-- New entities only; existing-entity backfill remains Plan C scope.
-- Idempotent (ON CONFLICT DO NOTHING). Safe to re-run.
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

    -- PRD v2.1 §9.3: baseline wildcard grant for the creator. Covers all
    -- resources, including waybill, client, project, project_document,
    -- signatory, bank_account, csr, letter.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES ('*')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;