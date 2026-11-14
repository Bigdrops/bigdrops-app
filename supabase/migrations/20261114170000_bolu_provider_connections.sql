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
    protocol            text NOT NULL CHECK (protocol IN ('openai', 'anthropic')),
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
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_app_ai_provider_connections_provider
    ON public.app_ai_provider_connections USING btree (provider_id);
CREATE INDEX IF NOT EXISTS idx_app_ai_provider_connections_enabled
    ON public.app_ai_provider_connections USING btree (is_enabled);

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

-- ============================================================
-- 4. Row-Level Security — deny all direct client access
-- ============================================================
ALTER TABLE public.app_ai_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_provider_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_provider_audit ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE public.app_ai_provider_connections IS 'Server-encrypted Bolu provider connections. Multiple accounts per provider supported. Client access denied.';
COMMENT ON TABLE public.app_ai_provider_routing IS 'Singleton runtime routing: one primary connection plus explicitly approved fallbacks. Client access denied.';
COMMENT ON TABLE public.app_ai_provider_audit IS 'Append-only audit of Bolu provider configuration operations. Client access denied.';