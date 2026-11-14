-- Migration: 20261114170000_bolu_provider_connections.sql
-- Domain: AI Assistant / Bolu Multi-Provider Management
-- Purpose: Additive multi-connection provider vault, runtime routing, and audit.
-- Security: All tables deny direct client access (anon + authenticated).
--           Accessible exclusively by server-side processes via Service Role.
-- Safety:   Additive only. The legacy app_ai_provider_config table is preserved
--           untouched. Existing ciphertext is copied as-is (same AES-256-GCM
--           envelope and key derivation), so credentials remain readable.
--
-- Single-primary invariant: enforced by construction. app_ai_provider_routing
-- is a singleton row holding ONE primary_connection_id foreign key. There is no
-- per-connection is_active flag, so two connections can never both be primary.
-- Activation is a single-row UPDATE (concurrency-safe, last write wins).

-- ============================================================
-- 1. Provider connections (encrypted credential vault)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_ai_provider_connections (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id         text NOT NULL,
    name                text NOT NULL,
    protocol            text NOT NULL CHECK (protocol IN ('openai', 'anthropic', 'openai-compatible')),
    auth_scheme         text NOT NULL CHECK (auth_scheme IN ('bearer', 'x-api-key')),
    base_url            text NOT NULL,
    model               text NOT NULL DEFAULT '',
    timeout_ms          integer NOT NULL DEFAULT 45000 CHECK (timeout_ms BETWEEN 5000 AND 120000),
    encrypted_key       text NOT NULL,
    key_nonce           text NOT NULL,
    key_tag             text NOT NULL,
    key_version         integer NOT NULL DEFAULT 1,
    masked_key          text NOT NULL,
    is_enabled          boolean NOT NULL DEFAULT true,
    verification_status text NOT NULL DEFAULT 'unverified'
                        CHECK (verification_status IN ('unverified', 'verified', 'failed')),
    last_verified_at    timestamptz,
    last_test_status    integer,
    last_test_message   text,
    discovered_models   jsonb NOT NULL DEFAULT '[]'::jsonb,
    models_fetched_at   timestamptz,
    migrated_from       text,
    allowed_models      text[] NOT NULL DEFAULT '{}'::text[],
    is_paid_tier        boolean NOT NULL DEFAULT true,
    in_pool             boolean NOT NULL DEFAULT false,
    health_status       text NOT NULL DEFAULT 'unknown'
                        CHECK (health_status IN ('healthy', 'cooling_down', 'exhausted', 'quarantined', 'unknown')),
    priority            integer NOT NULL DEFAULT 100,
    last_selected_at    timestamptz,
    account_cooldown_until timestamptz,
    model_cooldowns     jsonb NOT NULL DEFAULT '{}'::jsonb,
    consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
    last_error_code     text,
    last_error_message  text,
    last_success_at     timestamptz,
    last_failure_at     timestamptz,
    last_upstream_request_at timestamptz,
    total_selections    bigint NOT NULL DEFAULT 0 CHECK (total_selections >= 0),
    total_requests_started bigint NOT NULL DEFAULT 0 CHECK (total_requests_started >= 0),
    total_successful_requests bigint NOT NULL DEFAULT 0 CHECK (total_successful_requests >= 0),
    total_tokens        bigint NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
    known_balance_amount numeric(12,4),
    known_balance_currency text NOT NULL DEFAULT 'USD',
    known_balance_usd   numeric(12,4),
    balance_source      text NOT NULL DEFAULT 'unsupported'
                        CHECK (balance_source IN ('api', 'unsupported')),
    balance_updated_at  timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_app_ai_provider_connections_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_app_ai_provider_connections_provider
    ON public.app_ai_provider_connections USING btree (provider_id);
CREATE INDEX IF NOT EXISTS idx_app_ai_provider_connections_enabled
    ON public.app_ai_provider_connections USING btree (is_enabled);
CREATE INDEX IF NOT EXISTS idx_ai_connections_pool
    ON public.app_ai_provider_connections (in_pool, is_enabled, health_status, priority);
CREATE INDEX IF NOT EXISTS idx_ai_connections_last_selected
    ON public.app_ai_provider_connections (last_selected_at);

DROP TRIGGER IF EXISTS trg_app_ai_provider_connections_updated_at ON public.app_ai_provider_connections;
CREATE TRIGGER trg_app_ai_provider_connections_updated_at
    BEFORE UPDATE ON public.app_ai_provider_connections
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. Runtime routing (singleton: primary + approved fallbacks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_ai_provider_routing (
    id                    text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
    primary_connection_id uuid REFERENCES public.app_ai_provider_connections(id) ON DELETE SET NULL,
    fallback_enabled      boolean NOT NULL DEFAULT false,
    fallback_connection_ids uuid[] NOT NULL DEFAULT '{}',
    routing_enabled       boolean NOT NULL DEFAULT true,
    updated_at            timestamptz NOT NULL DEFAULT now(),
    updated_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS trg_app_ai_provider_routing_updated_at ON public.app_ai_provider_routing;
CREATE TRIGGER trg_app_ai_provider_routing_updated_at
    BEFORE UPDATE ON public.app_ai_provider_routing
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 3. Audit log (append-only; survives connection deletion)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_ai_provider_audit (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action        text NOT NULL,
    connection_id uuid,
    detail        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_ai_provider_audit_created
    ON public.app_ai_provider_audit USING btree (created_at DESC);

-- Legacy singleton marker; the existing credential migration below sets it true.
ALTER TABLE public.app_ai_provider_config
    ADD COLUMN IF NOT EXISTS migrated_to_connections boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3a. Compact persistent routing activity feed
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_ai_routing_events (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    connection_id     uuid REFERENCES public.app_ai_provider_connections(id) ON DELETE SET NULL,
    provider_id       text,
    model_id          text,
    event_type        text NOT NULL CHECK (event_type IN (
                        'selected', 'request_started', 'success', 'rate_limited',
                        'failover', 'quarantined', 'exhausted', 'recovered', 'all_exhausted'
                      )),
    http_status       integer,
    cooldown_seconds  integer,
    reason_summary    text
);

CREATE INDEX IF NOT EXISTS idx_ai_routing_events_created
    ON public.app_ai_routing_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_routing_events_conn
    ON public.app_ai_routing_events (connection_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_events_type
    ON public.app_ai_routing_events (event_type, created_at DESC);

-- ============================================================
-- 4. Row-Level Security — deny all direct client access
-- ============================================================
ALTER TABLE public.app_ai_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_provider_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_provider_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_routing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny client access to app_ai_provider_connections" ON public.app_ai_provider_connections;
CREATE POLICY "Deny client access to app_ai_provider_connections"
    ON public.app_ai_provider_connections FOR ALL TO authenticated, anon
    USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client access to app_ai_provider_routing" ON public.app_ai_provider_routing;
CREATE POLICY "Deny client access to app_ai_provider_routing"
    ON public.app_ai_provider_routing FOR ALL TO authenticated, anon
    USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client access to app_ai_provider_audit" ON public.app_ai_provider_audit;
CREATE POLICY "Deny client access to app_ai_provider_audit"
    ON public.app_ai_provider_audit FOR ALL TO authenticated, anon
    USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client access to app_ai_routing_events" ON public.app_ai_routing_events;
CREATE POLICY "Deny client access to app_ai_routing_events"
    ON public.app_ai_routing_events FOR ALL TO authenticated, anon
    USING (false) WITH CHECK (false);

-- ============================================================
-- 5. Additive migration of the legacy singleton credential
-- ============================================================
-- Copy the existing active legacy credential into a connection. Ciphertext,
-- nonce, tag and version are preserved verbatim so the existing master key
-- (BOLU_ENCRYPTION_KEY or the legacy service-role derivation) still decrypts it.
INSERT INTO public.app_ai_provider_connections (
    provider_id, name, protocol, auth_scheme, base_url, model, timeout_ms,
    encrypted_key, key_nonce, key_tag, key_version, masked_key,
    is_enabled, verification_status, migrated_from, created_by, updated_by
)
SELECT
    legacy.provider,
    'Migrated primary connection',
    'openai',
    'bearer',
    legacy.base_url,
    legacy.model,
    legacy.timeout_ms,
    legacy.encrypted_key,
    legacy.key_nonce,
    legacy.key_tag,
    legacy.key_version,
    legacy.masked_key,
    true,
    'unverified',
    'primary',
    legacy.updated_by,
    legacy.updated_by
FROM public.app_ai_provider_config legacy
WHERE legacy.id = 'primary'
  AND legacy.status = 'active'
  AND NOT EXISTS (
      SELECT 1 FROM public.app_ai_provider_connections c WHERE c.migrated_from = 'primary'
  );

-- Point routing at the migrated connection only when no primary is set yet.
INSERT INTO public.app_ai_provider_routing (id, primary_connection_id)
SELECT 'default', c.id
FROM public.app_ai_provider_connections c
WHERE c.migrated_from = 'primary'
ON CONFLICT (id) DO UPDATE
    SET primary_connection_id = EXCLUDED.primary_connection_id
    WHERE public.app_ai_provider_routing.primary_connection_id IS NULL;

UPDATE public.app_ai_provider_config
SET migrated_to_connections = true, updated_at = now()
WHERE id = 'primary'
  AND EXISTS (SELECT 1 FROM public.app_ai_provider_connections WHERE migrated_from = 'primary');

-- ============================================================
-- 6. RPC D1: Atomic selection (claim_eligible_ai_connection)
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

  SELECT c.id, c.provider_id, c.protocol, c.base_url, c.model, c.is_paid_tier, c.health_status
  INTO v_rec
  FROM public.app_ai_provider_connections c
  WHERE c.is_enabled = true
    AND c.in_pool = true
    AND c.health_status <> 'quarantined'
    AND c.provider_id = ANY(p_allowed_providers)
    AND (p_allow_paid = true OR c.is_paid_tier = false)
    AND (array_length(v_excluded, 1) IS NULL OR NOT (c.id = ANY(v_excluded)))
    AND (c.model = p_target_model OR p_target_model = ANY(c.allowed_models))
    AND (c.account_cooldown_until IS NULL OR c.account_cooldown_until <= v_now)
    AND (
      c.model_cooldowns IS NULL
      OR NOT (c.model_cooldowns ? p_target_model)
      OR (c.model_cooldowns->>p_target_model)::timestamptz <= v_now
    )
  ORDER BY
    c.priority ASC,
    c.last_selected_at ASC NULLS FIRST,
    c.consecutive_failures ASC,
    c.id ASC
  LIMIT 1
  FOR UPDATE OF c SKIP LOCKED;

  IF v_rec.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.app_ai_provider_connections
  SET last_selected_at = v_now,
      total_selections = total_selections + 1,
      updated_at = v_now
  WHERE id = v_rec.id;

  INSERT INTO public.app_ai_routing_events (connection_id, provider_id, model_id, event_type, reason_summary)
  VALUES (v_rec.id, v_rec.provider_id, p_target_model, 'selected', 'Connection claimed by router');

  connection_id := v_rec.id;
  provider_id := v_rec.provider_id;
  protocol := v_rec.protocol;
  base_url := v_rec.base_url;
  default_model := v_rec.model;
  selected_model := p_target_model;
  is_paid_tier := v_rec.is_paid_tier;
  RETURN NEXT;
END;
$$;

-- ============================================================
-- 7. RPC D2: Failure recording (record_ai_connection_failure)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_ai_connection_failure(
  p_connection_id uuid,
  p_model_id text,
  p_failure_category text,
  p_failure_scope text,
  p_http_status integer,
  p_cooldown_seconds integer,
  p_error_code text,
  p_reason_summary text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conn record;
  v_now timestamptz := clock_timestamp();
  v_cooldown_sec integer := COALESCE(p_cooldown_seconds, 300);
  v_event_type text := 'failover';
  v_model_cd jsonb;
BEGIN
  IF v_cooldown_sec < 5 THEN v_cooldown_sec := 5; END IF;
  IF v_cooldown_sec > 86400 THEN v_cooldown_sec := 86400; END IF;

  SELECT * INTO v_conn
  FROM public.app_ai_provider_connections
  WHERE id = p_connection_id
  FOR UPDATE;

  IF v_conn.id IS NULL THEN
    RETURN false;
  END IF;

  IF p_failure_category = 'authentication' OR (p_http_status IN (401, 403) AND p_failure_scope = 'account') THEN
    UPDATE public.app_ai_provider_connections
    SET consecutive_failures = consecutive_failures + 1,
        last_failure_at = v_now,
        last_error_code = p_error_code,
        last_error_message = substr(COALESCE(p_reason_summary, 'Authentication failed'), 1, 240),
        health_status = 'quarantined',
        updated_at = v_now
    WHERE id = p_connection_id;
    v_event_type := 'quarantined';

  ELSIF p_failure_scope = 'model' AND p_model_id IS NOT NULL AND btrim(p_model_id) <> '' THEN
    v_model_cd := to_jsonb((v_now + (v_cooldown_sec || ' seconds')::interval)::text);
    UPDATE public.app_ai_provider_connections
    SET consecutive_failures = consecutive_failures + 1,
        last_failure_at = v_now,
        last_error_code = p_error_code,
        last_error_message = substr(COALESCE(p_reason_summary, 'Model failure'), 1, 240),
        model_cooldowns = jsonb_set(COALESCE(model_cooldowns, '{}'::jsonb), ARRAY[p_model_id], v_model_cd),
        updated_at = v_now
    WHERE id = p_connection_id;
    v_event_type := CASE WHEN p_failure_category = 'rate_limit' THEN 'rate_limited' ELSE 'failover' END;

  ELSIF p_failure_category = 'quota_exhausted' THEN
    UPDATE public.app_ai_provider_connections
    SET consecutive_failures = consecutive_failures + 1,
        last_failure_at = v_now,
        last_error_code = p_error_code,
        last_error_message = substr(COALESCE(p_reason_summary, 'Quota exhausted'), 1, 240),
        account_cooldown_until = v_now + (v_cooldown_sec || ' seconds')::interval,
        health_status = 'exhausted',
        updated_at = v_now
    WHERE id = p_connection_id;
    v_event_type := 'exhausted';

  ELSIF p_failure_category = 'rate_limit' THEN
    UPDATE public.app_ai_provider_connections
    SET consecutive_failures = consecutive_failures + 1,
        last_failure_at = v_now,
        last_error_code = p_error_code,
        last_error_message = substr(COALESCE(p_reason_summary, 'Rate limited'), 1, 240),
        account_cooldown_until = v_now + (v_cooldown_sec || ' seconds')::interval,
        health_status = 'cooling_down',
        updated_at = v_now
    WHERE id = p_connection_id;
    v_event_type := 'rate_limited';

  ELSIF p_failure_scope = 'request' OR p_failure_category = 'invalid_request' THEN
    UPDATE public.app_ai_provider_connections
    SET last_error_code = p_error_code,
        last_error_message = substr(COALESCE(p_reason_summary, 'Invalid request'), 1, 240),
        updated_at = v_now
    WHERE id = p_connection_id;
    v_event_type := 'failover';

  ELSE
    UPDATE public.app_ai_provider_connections
    SET consecutive_failures = consecutive_failures + 1,
        last_failure_at = v_now,
        last_error_code = p_error_code,
        last_error_message = substr(COALESCE(p_reason_summary, 'Provider temporary failure'), 1, 240),
        account_cooldown_until = v_now + (v_cooldown_sec || ' seconds')::interval,
        health_status = 'cooling_down',
        updated_at = v_now
    WHERE id = p_connection_id;
    v_event_type := 'failover';
  END IF;

  INSERT INTO public.app_ai_routing_events (
    connection_id, provider_id, model_id, event_type, http_status, cooldown_seconds, reason_summary
  ) VALUES (
    p_connection_id, v_conn.provider_id, p_model_id, v_event_type, p_http_status, v_cooldown_sec,
    substr(COALESCE(p_reason_summary, 'Recorded failure'), 1, 240)
  );

  RETURN true;
END;
$$;

-- ============================================================
-- 8. RPC D3: Success recording (record_ai_connection_success)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_ai_connection_success(
  p_connection_id uuid,
  p_model_id text,
  p_tokens bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conn record;
  v_now timestamptz := clock_timestamp();
  v_tokens bigint := COALESCE(p_tokens, 0);
BEGIN
  IF v_tokens < 0 THEN v_tokens := 0; END IF;

  SELECT * INTO v_conn
  FROM public.app_ai_provider_connections
  WHERE id = p_connection_id
  FOR UPDATE;

  IF v_conn.id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.app_ai_provider_connections
  SET last_success_at = v_now,
      consecutive_failures = 0,
      total_successful_requests = total_successful_requests + 1,
      total_tokens = total_tokens + v_tokens,
      health_status = 'healthy',
      account_cooldown_until = NULL,
      updated_at = v_now
  WHERE id = p_connection_id;

  INSERT INTO public.app_ai_routing_events (connection_id, provider_id, model_id, event_type, reason_summary)
  VALUES (
    p_connection_id, v_conn.provider_id, p_model_id, 'success',
    CASE WHEN v_tokens > 0 THEN 'Success with ' || v_tokens || ' tokens' ELSE 'Inference succeeded' END
  );

  RETURN true;
END;
$$;

-- ============================================================
-- 9. RPC D4: Request-start recording (record_ai_request_started)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_ai_request_started(
  p_connection_id uuid,
  p_model_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conn record;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO v_conn
  FROM public.app_ai_provider_connections
  WHERE id = p_connection_id
  FOR UPDATE;

  IF v_conn.id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.app_ai_provider_connections
  SET total_requests_started = total_requests_started + 1,
      last_upstream_request_at = v_now,
      updated_at = v_now
  WHERE id = p_connection_id;

  INSERT INTO public.app_ai_routing_events (connection_id, provider_id, model_id, event_type, reason_summary)
  VALUES (p_connection_id, v_conn.provider_id, p_model_id, 'request_started', 'Upstream request started');

  RETURN true;
END;
$$;

-- ============================================================
-- 10. Execution grants: service_role only
-- ============================================================
REVOKE ALL ON FUNCTION public.claim_eligible_ai_connection FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_connection_failure FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_connection_success FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_request_started FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_eligible_ai_connection TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_connection_failure TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_connection_success TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_request_started TO service_role;

COMMENT ON TABLE public.app_ai_provider_connections IS 'Server-encrypted Bolu provider connections. Multiple accounts per provider supported. Client access denied.';
COMMENT ON TABLE public.app_ai_provider_routing IS 'Singleton runtime routing: one primary connection plus explicitly approved fallbacks. Client access denied.';
COMMENT ON TABLE public.app_ai_provider_audit IS 'Append-only audit of Bolu provider configuration operations. Client access denied.';
COMMENT ON TABLE public.app_ai_routing_events IS 'Redacted audit event feed for AI provider routing and failover operations. Client access denied.';
COMMENT ON COLUMN public.app_ai_provider_connections.in_pool IS 'Explicit opt-in to automatic pool selection. Default false.';
COMMENT ON COLUMN public.app_ai_provider_connections.is_paid_tier IS 'Paid/unknown-cost tier flag. Unknown providers default true and are excluded from automatic selection.';
COMMENT ON COLUMN public.app_ai_provider_routing.routing_enabled IS 'Global routing enable/disable switch. When false, claim_eligible_ai_connection returns empty without selecting rows.';
