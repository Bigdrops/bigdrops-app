-- ============================================================
-- Migration: bolu_usage_ledger
--
-- Purpose
--   Track what every user actually consumes from the shared AI provider pool.
--   The plumbing half existed (app_ai_provider_connections.total_tokens and the
--   record_ai_connection_success RPC accept p_tokens) but nothing ever supplied
--   a token count, so the column stayed at zero and no request could be
--   attributed to a person or a tenant.
--
--   This migration adds the request-level ledger that makes the numbers
--   answerable: who asked, in which tenant, which provider and model served
--   them, how many tokens went out and in, and what that cost.
--
-- Security
--   The ledger holds tenant and user activity. Client access is denied for
--   every browser role. Reads go through the SECURITY DEFINER summary
--   function, which is granted to service_role only, and the API route that
--   calls it is restricted to platform administrators.
--
-- Notes
--   user_email is a snapshot so a leaderboard row survives account deletion.
--   token_source distinguishes a provider-reported count from a local estimate.
--   cost_usd is null when the price is unknown; zero is never used to mean
--   "unknown".
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_ai_usage_ledger (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    tenant_id         uuid REFERENCES public.entities(id) ON DELETE SET NULL,
    user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email        text,
    conversation_id   uuid,
    provider_id       text,
    model_id          text,
    connection_id     uuid,
    prompt_tokens     integer,
    completion_tokens integer,
    total_tokens      integer,
    cost_usd          numeric(18,8),
    cost_currency     text NOT NULL DEFAULT 'USD',
    token_source      text NOT NULL DEFAULT 'unavailable'
                      CHECK (token_source IN ('provider', 'estimated', 'unavailable')),
    success           boolean NOT NULL DEFAULT true,
    latency_ms        integer
);

CREATE INDEX IF NOT EXISTS idx_app_ai_usage_ledger_created
    ON public.app_ai_usage_ledger USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_ai_usage_ledger_user
    ON public.app_ai_usage_ledger USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_ai_usage_ledger_tenant
    ON public.app_ai_usage_ledger USING btree (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_ai_usage_ledger_provider
    ON public.app_ai_usage_ledger USING btree (provider_id, model_id, created_at DESC);

-- ------------------------------------------------------------
-- Row-Level Security: deny every direct client read and write.
-- ------------------------------------------------------------
ALTER TABLE public.app_ai_usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny client access to app_ai_usage_ledger" ON public.app_ai_usage_ledger;
CREATE POLICY "Deny client access to app_ai_usage_ledger"
    ON public.app_ai_usage_ledger FOR ALL TO authenticated, anon
    USING (false)
    WITH CHECK (false);

REVOKE ALL ON TABLE public.app_ai_usage_ledger FROM anon, authenticated;

-- ------------------------------------------------------------
-- Summary function: one call returns totals, leaderboard, daily
-- series and provider breakdown.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_ai_usage_summary(
    p_days integer DEFAULT 30,
    p_limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_since timestamptz := now() - (GREATEST(COALESCE(p_days, 30), 1) || ' days')::interval;
    v_max integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);
    v_totals jsonb;
    v_leaderboard jsonb;
    v_by_day jsonb;
    v_by_provider jsonb;
BEGIN
    SELECT jsonb_build_object(
        'requests',         count(*)::bigint,
        'promptTokens',     COALESCE(sum(prompt_tokens), 0)::bigint,
        'completionTokens', COALESCE(sum(completion_tokens), 0)::bigint,
        'totalTokens',      COALESCE(sum(total_tokens), 0)::bigint,
        'costUsd',          COALESCE(sum(cost_usd), 0)::numeric,
        'unknownCostRows',  count(*) FILTER (WHERE cost_usd IS NULL)::bigint,
        'estimatedRows',    count(*) FILTER (WHERE token_source = 'estimated')::bigint,
        'unavailableRows',  count(*) FILTER (WHERE token_source = 'unavailable')::bigint,
        'failedRequests',   count(*) FILTER (WHERE NOT success)::bigint,
        'distinctUsers',    count(DISTINCT user_id)::bigint
    )
    INTO v_totals
    FROM public.app_ai_usage_ledger
    WHERE created_at >= v_since;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_leaderboard
    FROM (
        SELECT
            l.user_id,
            COALESCE(l.user_email, p.email, u.email, 'unknown') AS user_label,
            count(*)::bigint AS requests,
            COALESCE(sum(l.prompt_tokens), 0)::bigint AS prompt_tokens,
            COALESCE(sum(l.completion_tokens), 0)::bigint AS completion_tokens,
            COALESCE(sum(l.total_tokens), 0)::bigint AS total_tokens,
            COALESCE(sum(l.cost_usd), 0)::numeric AS cost_usd,
            count(*) FILTER (WHERE l.cost_usd IS NULL)::bigint AS unknown_cost_rows,
            count(DISTINCT l.tenant_id)::bigint AS tenants,
            max(l.created_at) AS last_seen
        FROM public.app_ai_usage_ledger l
        LEFT JOIN public.profiles p ON p.id = l.user_id
        LEFT JOIN auth.users u ON u.id = l.user_id
        WHERE l.created_at >= v_since
          AND l.user_id IS NOT NULL
        GROUP BY l.user_id, l.user_email, p.email, u.email
        ORDER BY sum(l.total_tokens) DESC NULLS LAST, count(*) DESC
        LIMIT v_max
    ) t;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.day), '[]'::jsonb)
    INTO v_by_day
    FROM (
        SELECT
            date_trunc('day', created_at)::date AS day,
            count(*)::bigint AS requests,
            COALESCE(sum(total_tokens), 0)::bigint AS total_tokens,
            COALESCE(sum(cost_usd), 0)::numeric AS cost_usd
        FROM public.app_ai_usage_ledger
        WHERE created_at >= v_since
        GROUP BY date_trunc('day', created_at)::date
        ORDER BY day
    ) t;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.total_tokens DESC), '[]'::jsonb)
    INTO v_by_provider
    FROM (
        SELECT
            COALESCE(provider_id, 'unknown') AS provider_id,
            COALESCE(model_id, 'unknown') AS model_id,
            count(*)::bigint AS requests,
            COALESCE(sum(prompt_tokens), 0)::bigint AS prompt_tokens,
            COALESCE(sum(completion_tokens), 0)::bigint AS completion_tokens,
            COALESCE(sum(total_tokens), 0)::bigint AS total_tokens,
            COALESCE(sum(cost_usd), 0)::numeric AS cost_usd
        FROM public.app_ai_usage_ledger
        WHERE created_at >= v_since
        GROUP BY provider_id, model_id
        ORDER BY sum(total_tokens) DESC
        LIMIT v_max
    ) t;

    RETURN jsonb_build_object(
        'since', v_since,
        'totals', v_totals,
        'leaderboard', v_leaderboard,
        'byDay', v_by_day,
        'byProvider', v_by_provider
    );
END;
$$;

REVOKE ALL ON FUNCTION public.app_ai_usage_summary(integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.app_ai_usage_summary(integer, integer) TO service_role;

COMMENT ON TABLE public.app_ai_usage_ledger IS 'Per-request AI consumption ledger. Client access denied; read through app_ai_usage_summary.';
COMMENT ON FUNCTION public.app_ai_usage_summary(integer, integer) IS 'Aggregated AI usage: totals, per-user leaderboard, daily series and provider breakdown. service_role only.';
