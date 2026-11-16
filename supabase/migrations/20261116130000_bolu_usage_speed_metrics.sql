-- ============================================================
-- Migration: bolu_usage_speed_metrics
--
-- Purpose
--   Record how fast each provider actually answered, measured on our own
--   traffic, so two providers can be compared without trusting the vendor
--   numbers.
--
--   ttft_ms           Milliseconds from the upstream request leaving until the
--                     first generated content token.
--   generation_ms     Milliseconds between the first and the last generated
--                     content token. This is the window the token rate uses.
--   tokens_per_second Generated tokens per second over that window.
--
-- Notes
--   Every column is nullable. A request that failed, or that produced a
--   single chunk, has no measurable generation window, so it stores null
--   instead of a fabricated zero.
--
--   The summary function exposes a weighted token rate per provider: total
--   completion tokens over total generation time. A plain average of the
--   per-request rates would let a handful of one-word answers distort the
--   comparison between providers.
--
-- Security
--   The columns hold no customer content. The table stays closed to every
--   browser role and is read only through the service-role summary function.
-- ============================================================

ALTER TABLE public.app_ai_usage_ledger
    ADD COLUMN IF NOT EXISTS ttft_ms integer,
    ADD COLUMN IF NOT EXISTS generation_ms integer,
    ADD COLUMN IF NOT EXISTS tokens_per_second numeric(12,2);

COMMENT ON COLUMN public.app_ai_usage_ledger.ttft_ms IS
    'Milliseconds from the upstream request leaving until the first generated content token.';
COMMENT ON COLUMN public.app_ai_usage_ledger.generation_ms IS
    'Milliseconds between the first and the last generated content token.';
COMMENT ON COLUMN public.app_ai_usage_ledger.tokens_per_second IS
    'Generated tokens per second over the generation window.';

-- ------------------------------------------------------------
-- Summary function: one call returns totals, leaderboard, daily
-- series, provider breakdown and the measured speed per provider.
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
        'distinctUsers',    count(DISTINCT user_id)::bigint,
        'timedRequests',    count(ttft_ms)::bigint,
        'avgTtftMs',        round(avg(ttft_ms))::bigint,
        'weightedTokensPerSecond',
            CASE WHEN COALESCE(sum(generation_ms) FILTER (WHERE generation_ms > 0), 0) > 0
                 THEN round((COALESCE(sum(completion_tokens) FILTER (WHERE generation_ms > 0), 0)
                             / (sum(generation_ms) FILTER (WHERE generation_ms > 0) / 1000.0))::numeric, 2)
                 ELSE NULL END
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
            COALESCE(sum(cost_usd), 0)::numeric AS cost_usd,
            count(ttft_ms)::bigint AS timed_requests,
            round(avg(ttft_ms))::bigint AS avg_ttft_ms,
            round(avg(tokens_per_second)::numeric, 2) AS avg_tokens_per_second,
            CASE WHEN COALESCE(sum(generation_ms) FILTER (WHERE generation_ms > 0), 0) > 0
                 THEN round((COALESCE(sum(completion_tokens) FILTER (WHERE generation_ms > 0), 0)
                             / (sum(generation_ms) FILTER (WHERE generation_ms > 0) / 1000.0))::numeric, 2)
                 ELSE NULL END AS tokens_per_second
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

COMMENT ON FUNCTION public.app_ai_usage_summary(integer, integer) IS
    'Aggregated AI usage: totals, per-user leaderboard, daily series, provider breakdown and measured speed per provider. service_role only.';
