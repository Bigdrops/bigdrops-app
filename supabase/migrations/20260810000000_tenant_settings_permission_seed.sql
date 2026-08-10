-- Domain: Entity Provisioning Engine / Phase 3 — Tenant Settings Write Path
-- Created: 2026-08-10
--
-- Purpose:
--   Extend the default permission contract so newly provisioned entities can
--   use the Settings UI. The tenant-schema `settings` RLS (installed by
--   _prov_install_rls via _prov_table_to_resource → 'setting') requires:
--       setting → view, create, edit, delete
--   The previous default seeder granted only invoice/payment/receipt, which
--   means the tenant settings row was readable (Phase 2 read migration worked
--   when the operator had granted 'setting' view) but NOT writable through the
--   schema-aware tenantClient. This migration adds the `setting` resource to
--   the canonical default permission set for all FUTURE provisioned entities.
--
-- Change:
--   1. _prov_seed_default_permissions(p_entity_id, p_user_id) redefined:
--        resources ('invoice'), ('payment'), ('receipt'), ('setting')
--        actions  ('view'), ('create'), ('edit'), ('delete')
--      Idempotent (ON CONFLICT DO NOTHING). No user UUID hardcoded.
--   2. provision_entity() is NOT redefined: step 8.7 already calls this
--      helper with the provisioning caller (auth.uid()), so the extended
--      contract applies automatically to every newly provisioned entity.
--
-- Scope guards:
--   - Function definition only. No table structure, RLS, or data changes.
--   - No production-specific user/entity UUIDs are referenced.
--   - The EXISTING production entity (entity_bigdrops-main_main) is NOT
--     touched here. Its `setting` permissions + settings data backfill are
--     handled by the human-executed migration 20260810010000.

-- ============================================================
-- DEFAULT PERMISSION SEEDER (redefined: adds 'setting')
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
            ('invoice'), ('payment'), ('receipt'), ('setting')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;
