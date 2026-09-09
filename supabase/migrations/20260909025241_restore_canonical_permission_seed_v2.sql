-- ============================================================================
-- Migration: restore_canonical_permission_seed_v2
-- Date: 2026-09-09
-- ============================================================================
-- Restores the canonical creator permission baseline that migration
-- 20260906103000_source_transactions narrowed by accident.
--
-- Root cause: 20260906103000 redefined
-- public._prov_seed_default_permissions() with only 8 resources
-- (invoice, payment, receipt, setting, account, period, journal,
-- source_transaction), dropping quotation, rfq, boq, item, tax_setting,
-- the audit/device view-only grants, and the ('*', view/create/edit/delete)
-- wildcard baseline required by PRD v2.1 §9.3. This overwrote the canonical
-- restore from 20260906015952. Entities provisioned under the narrowed
-- version (e.g. Adel, 2026-09-08: 32 rows, 0 wildcard) deny legitimate
-- creator operations such as blank_waybill_logs INSERT — not because RLS is
-- wrong (table/policies/grants are complete; blank_waybill_logs maps to the
-- 'waybill' resource), but because the creator holds no matching grant.
-- The wildcard baseline is the mechanism that covers waybill/csr/client/
-- project and every other non-enumerated resource.
--
-- This migration:
--   1. Redefines the seeder with the full canonical set from 20260906015952
--      (12 full-action resources, audit/device view-only, wildcard
--      baseline) PLUS the source_transaction full-action resource, which is
--      the one legitimate addition from 20260906103000 and must be kept.
--      Idempotent via ON CONFLICT DO NOTHING. No user UUID hardcoded.
--   2. Backfills ONLY (entity_id, user_id) pairs that provably went through
--      the narrowed seeder: pairs holding source_transaction rows on an
--      entity where NO user holds a ('*','view') grant. source_transaction
--      rows cannot come from role assignment (no template contains them),
--      invitations, or the canonical seeder (it never had them before this
--      migration), so unaffected members can never match this predicate —
--      no privilege escalation. Adds missing rows only; removes nothing.
--      Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Canonical seeder (full baseline + source_transaction)
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
    -- Full-action resources: the 12 canonical tenant resources plus the
    -- source_transaction resource introduced by 20260906103000.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('invoice'), ('payment'), ('receipt'), ('setting'),
            ('quotation'), ('rfq'), ('boq'), ('item'), ('tax_setting'),
            ('account'), ('period'), ('journal'),
            ('source_transaction')
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
    -- resources (including waybill, csr, client, project) so no tenant
    -- table is denied to them.
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
    'Canonical creator baseline: 13 full-action resources (incl. '
    'source_transaction), audit/device view-only, and the '
    '(*, view/create/edit/delete) wildcard. Idempotent. Restored '
    '2026-09-09 after narrowing by 20260906103000.';

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
        WHERE ep.resource = 'source_transaction'
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
