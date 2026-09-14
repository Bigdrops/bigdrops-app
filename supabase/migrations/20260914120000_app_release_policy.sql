-- Domain: Android App Updates
-- Table: app_release_policy (BIGDROPS-controlled mandatory-update policy)
-- Created: 2026-09-14
-- Purpose: Separate update POLICY from APK distribution. GitHub Releases
--          carries release/asset data only; this table decides which
--          versionCode is mandatory, when the 3-day grace period starts,
--          and which asset name is approved for in-app download.
--
-- Contract (kept small and explicit):
--   id                    single row (id = 1)
--   version_code          required Android versionCode of the target release
--   version_name          human-readable versionName (display only)
--   mandatory             false = optional update, true = 3-day grace applies
--   effective_at          when the mandatory countdown starts (server time)
--   apk_asset_prefix      required asset name prefix, e.g. 'BIGDROPS-test-release-'
--   web_release_url       approved external release/download destination
--   release_notes         optional display text
--
-- The client rejects rows with a null/nonpositive version_code or a null
-- mandatory flag rather than treating them as a valid update.

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_release_policy (
    id integer NOT NULL DEFAULT 1,
    version_code integer,
    version_name text,
    mandatory boolean NOT NULL DEFAULT false,
    effective_at timestamp with time zone,
    apk_asset_prefix text NOT NULL DEFAULT 'BIGDROPS-test-release-',
    web_release_url text,
    release_notes text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT app_release_policy_pkey PRIMARY KEY (id),
    CONSTRAINT app_release_policy_single_row CHECK (id = 1),
    CONSTRAINT app_release_policy_version_code_positive
        CHECK (version_code IS NULL OR version_code > 0),
    CONSTRAINT app_release_policy_web_url_https
        CHECK (web_release_url IS NULL OR web_release_url ~* '^https://')
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.app_release_policy ENABLE ROW LEVEL SECURITY;

-- Every app instance (including pre-login states) must be able to learn
-- that a mandatory update exists. Read-only for anon and authenticated.
CREATE POLICY app_release_policy_read_all
    ON public.app_release_policy FOR SELECT
    TO anon, authenticated
    USING (true);

-- Writes stay exclusive to the service role / dashboard. No insert,
-- update, or delete policy is granted, so RLS denies them by default.

-- ============================================================
-- RPC: public policy + trusted server clock in one call
-- ============================================================

-- Returns the active policy row and now() from the database server.
-- The client uses server_now as the trusted anchor for the 3-day
-- deadline instead of the device clock. Exposed to anon because the
-- update gate must work before login.

CREATE OR REPLACE FUNCTION public.get_active_android_release_policy()
RETURNS TABLE (
    version_code integer,
    version_name text,
    mandatory boolean,
    effective_at timestamp with time zone,
    apk_asset_prefix text,
    web_release_url text,
    release_notes text,
    server_now timestamp with time zone
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT
        p.version_code,
        p.version_name,
        p.mandatory,
        p.effective_at,
        p.apk_asset_prefix,
        p.web_release_url,
        p.release_notes,
        now() AS server_now
    FROM public.app_release_policy p
    WHERE p.id = 1
$function$;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT ON public.app_release_policy TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_android_release_policy() TO anon, authenticated;

-- ============================================================
-- SEED: inactive policy (no mandatory update until BIGDROPS sets one)
-- ============================================================

INSERT INTO public.app_release_policy (id, version_code, version_name, mandatory, effective_at)
VALUES (1, NULL, NULL, false, NULL)
ON CONFLICT (id) DO NOTHING;
