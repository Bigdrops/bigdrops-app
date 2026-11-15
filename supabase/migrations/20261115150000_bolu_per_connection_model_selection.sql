-- ============================================================
-- Migration: bolu_per_connection_model_selection
--
-- Purpose
--   The claim RPC filtered candidates by a single global target model:
--     c.model = p_target_model OR p_target_model = ANY(c.allowed_models)
--   A connection whose model differed from the policy target could never be
--   claimed. The policy target is derived from one catalogue default, so the
--   pool could only ever serve that one model. Every other provider in the
--   pool was dead weight, and cross-provider failover could never happen:
--   after one connection failed, no other connection matched the target.
--
-- Change
--   The target model becomes a PREFERENCE, not a hard filter.
--     - A connection that serves the target model is ranked first.
--     - Any other eligible connection stays claimable and is called with its
--       own model.
--     - selected_model reports the model actually sent upstream.
--
--   The effective model for a candidate is:
--     p_target_model when c.model = p_target_model
--                       or p_target_model is in c.allowed_models,
--     otherwise c.model.
--
--   The same expression keys the per-model cooldown check, so a cooled model
--   is skipped on the connection that serves it.
--
--   Ordering, locking, health, paid-tier, pool-membership and exclusion rules
--   are unchanged. The emergency shutdown guard is unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_eligible_ai_connection(
  p_allowed_providers text[],
  p_target_model text,
  p_allow_paid boolean,
  p_excluded_connection_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS TABLE (
  connection_id uuid,
  provider_id text,
  protocol text,
  base_url text,
  default_model text,
  selected_model text,
  is_paid_tier boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec record;
  v_now timestamptz := clock_timestamp();
  v_excluded uuid[] := COALESCE(p_excluded_connection_ids, '{}'::uuid[]);
  v_effective_model text;
BEGIN
  -- Atomic Emergency Shutdown Guard: fail closed if routing is globally disabled
  IF EXISTS (
    SELECT 1 FROM public.app_ai_provider_routing
    WHERE id = 'default' AND routing_enabled = false
  ) THEN
    RETURN;
  END IF;

  IF p_allowed_providers IS NULL OR array_length(p_allowed_providers, 1) IS NULL THEN
    RETURN;
  END IF;
  IF p_target_model IS NULL OR btrim(p_target_model) = '' THEN
    RETURN;
  END IF;

  SELECT c.id, c.provider_id, c.protocol, c.base_url, c.model, c.allowed_models,
         c.is_paid_tier, c.health_status
  INTO v_rec
  FROM public.app_ai_provider_connections c
  WHERE c.is_enabled = true
    AND c.in_pool = true
    AND c.health_status <> 'quarantined'
    AND c.provider_id = ANY(p_allowed_providers)
    AND (p_allow_paid = true OR c.is_paid_tier = false)
    AND (array_length(v_excluded, 1) IS NULL OR NOT (c.id = ANY(v_excluded)))
    AND (c.account_cooldown_until IS NULL OR c.account_cooldown_until <= v_now)
    AND (
      c.model_cooldowns IS NULL
      OR NOT (c.model_cooldowns ? (CASE
            WHEN (c.model = p_target_model OR p_target_model = ANY(c.allowed_models))
            THEN p_target_model ELSE c.model END))
      OR (c.model_cooldowns->>(CASE
            WHEN (c.model = p_target_model OR p_target_model = ANY(c.allowed_models))
            THEN p_target_model ELSE c.model END))::timestamptz <= v_now
    )
  ORDER BY
    (CASE
      WHEN (c.model = p_target_model OR p_target_model = ANY(c.allowed_models))
      THEN 0 ELSE 1 END),
    c.priority ASC,
    c.last_selected_at ASC NULLS FIRST,
    c.consecutive_failures ASC,
    c.id ASC
  LIMIT 1
  FOR UPDATE OF c SKIP LOCKED;

  IF v_rec.id IS NULL THEN
    RETURN;
  END IF;

  v_effective_model := CASE
    WHEN (v_rec.model = p_target_model OR p_target_model = ANY(v_rec.allowed_models))
    THEN p_target_model
    ELSE v_rec.model
  END;

  UPDATE public.app_ai_provider_connections
  SET last_selected_at = v_now,
      total_selections = total_selections + 1,
      updated_at = v_now
  WHERE id = v_rec.id;

  INSERT INTO public.app_ai_routing_events (connection_id, provider_id, model_id, event_type, reason_summary)
  VALUES (v_rec.id, v_rec.provider_id, v_effective_model, 'selected', 'Connection claimed by router');

  connection_id := v_rec.id;
  provider_id := v_rec.provider_id;
  protocol := v_rec.protocol;
  base_url := v_rec.base_url;
  default_model := v_rec.model;
  selected_model := v_effective_model;
  is_paid_tier := v_rec.is_paid_tier;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_eligible_ai_connection FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_eligible_ai_connection TO service_role;
