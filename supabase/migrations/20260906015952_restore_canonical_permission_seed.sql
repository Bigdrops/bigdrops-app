-- ============================================================================
-- Migration: restore_canonical_permission_seed
-- Date: 2026-09-06
-- ============================================================================
-- Restores the canonical creator permission baseline that migration
-- 20260905142503_accounting_persistence narrowed by accident.
--
-- Root cause: 20260905142503 redefined
-- public._prov_seed_default_permissions() with only 7 resources
-- (invoice, payment, receipt, setting, account, period, journal),
-- dropping quotation, rfq, boq, item, tax_setting, the audit/device
-- view-only grants, and the ('*', view/create/edit/delete) wildcard
-- baseline required by PRD v2.1 §9.3. Entities provisioned under the
-- narrowed version (e.g. Opaque, 2026-09-05) deny legitimate creator
-- operations such as blank_waybill_logs INSERT — not because RLS is
-- wrong (table/policies/grants are complete and correct), but because
-- the creator holds no matching grant.
--
-- This migration:
--   1. Redefines the seeder with the full canonical set: the 9
--      full-action resources, audit/device view-only, the wildcard
--      baseline, PLUS account/period/journal (accounting intent kept).
--      Idempotent via ON CONFLICT DO NOTHING. No user UUID hardcoded.
--   2. Backfills ONLY (entity_id, user_id) pairs that provably went
--      through the narrowed seeder: pairs holding account/* rows on an
--      entity where NO user holds a ('*','view') grant. account rows
--      cannot come from role assignment (no template contains account/
--      journal/period) or invitations (none recorded), so limited
--      members can never match this predicate — no privilege escalation.
--      Idempotent via ON CONFLICT DO NOTHING.
--
-- Archived/failed entities are intentionally included if they match:
-- restoring baseline grants on an archived entity changes no behavior
-- (archived entities are unusable) and keeps the rule uniform with no
-- per-entity special cases.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Canonical seeder (full baseline + accounting resources)
-- ──────────────────────────────────────────────────────────────────────

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
    -- Full-action resources: the 9 canonical tenant resources plus the
    -- accounting resources introduced by 20260905142503.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('invoice'), ('payment'), ('receipt'), ('setting'),
            ('quotation'), ('rfq'), ('boq'), ('item'), ('tax_setting'),
            ('account'), ('period'), ('journal')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    -- View-only resources: audit, device.
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
    -- resources so no tenant table is denied to them.
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

COMMENT ON FUNCTION public._prov_seed_default_permissions IS
    'Canonical creator baseline: 12 full-action resources, audit/device '
    'view-only, and the (*, view/create/edit/delete) wildcard. '
    'Idempotent. Restored 2026-09-06 after accidental narrowing.';

-- ──────────────────────────────────────────────────────────────────────
-- 2. Backfill pairs stranded by the narrowed seeder
-- ──────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_pair record;
BEGIN
    FOR v_pair IN
        SELECT DISTINCT ep.entity_id, ep.user_id
        FROM public.entity_permissions ep
        WHERE ep.resource = 'account'
          AND NOT EXISTS (
              SELECT 1 FROM public.entity_permissions w
              WHERE w.entity_id = ep.entity_id
                AND w.resource = '*'
                AND w.action = 'view'
          )
    LOOP
        PERFORM public._prov_seed_default_permissions(v_pair.entity_id, v_pair.user_id);
        RAISE NOTICE 'Restored canonical baseline for entity %, user %',
            v_pair.entity_id, v_pair.user_id;
    END LOOP;
END;
$$;
