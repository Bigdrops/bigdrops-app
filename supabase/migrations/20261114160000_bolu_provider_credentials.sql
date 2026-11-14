-- Migration: 20261114160000_bolu_provider_credentials.sql
-- Domain: AI Assistant / Bolu Provider Configuration
-- Purpose: In-app encrypted credential storage for shared Bolu inference provider
-- Security: Table is strictly denied to direct client access (anon and authenticated);
--           Accessible exclusively by server-side processes via Supabase Service Role.

CREATE TABLE IF NOT EXISTS public.app_ai_provider_config (
    id text PRIMARY KEY DEFAULT 'primary',
    provider text NOT NULL DEFAULT 'amd',
    base_url text NOT NULL DEFAULT 'https://api.tokenfactory.amd.com/v1',
    model text NOT NULL DEFAULT 'DeepSeek-V4-Flash',
    timeout_ms integer NOT NULL DEFAULT 30000,
    encrypted_key text NOT NULL,
    key_nonce text NOT NULL,
    key_tag text NOT NULL,
    key_version integer NOT NULL DEFAULT 1,
    masked_key text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ensure updated_at is kept fresh
DROP TRIGGER IF EXISTS trg_app_ai_provider_config_updated_at ON public.app_ai_provider_config;
CREATE TRIGGER trg_app_ai_provider_config_updated_at
    BEFORE UPDATE ON public.app_ai_provider_config
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

-- Enable Row-Level Security
ALTER TABLE public.app_ai_provider_config ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access through PostgREST (anon and authenticated users).
-- Only serverless functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS.
DROP POLICY IF EXISTS "Deny public client access to app_ai_provider_config" ON public.app_ai_provider_config;
CREATE POLICY "Deny public client access to app_ai_provider_config"
    ON public.app_ai_provider_config
    FOR ALL
    TO authenticated, anon
    USING (false)
    WITH CHECK (false);

COMMENT ON TABLE public.app_ai_provider_config IS 'Stores server-encrypted AI provider credentials for Bolu assistant. Access denied to all browser/client sessions.';
