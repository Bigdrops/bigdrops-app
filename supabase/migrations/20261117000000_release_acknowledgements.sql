-- Domain: Release Acknowledgement Tracking
-- Table: public.release_acknowledgements
-- Purpose: Track which releases authenticated users have acknowledged,
--          supporting cross-device synchronization without compromising
--          anonymous users (who use device-local persistence).
--
-- Contract (additive, minimal — does not modify existing tables):
--   id                        auto-uuid primary key
--   user_id                   references auth.users on delete cascade
--   version_code              the release version code that was acknowledged
--   platform                  'web' | 'android' — which platform acknowledged this
--   acknowledged_at           when the acknowledgement occurred (server time)
--
-- RLS:
--   Authenticated users: select/insert/update their own rows only (user_id = auth.uid())
--   Anon users: no access to this table (handled via device-local localStorage)

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.release_acknowledgements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_code integer NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web', 'android')),
  acknowledged_at timestamp with time zone DEFAULT now(),
  CONSTRAINT release_acknowledgements_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.release_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Authenticated users: select own rows
CREATE POLICY release_acknowledgements_auth_select ON public.release_acknowledgements FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Authenticated users: insert own rows
CREATE POLICY release_acknowledgements_auth_insert ON public.release_acknowledgements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Authenticated users: update own rows
CREATE POLICY release_acknowledgements_auth_update ON public.release_acknowledgements FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- GRANTS
-- ============================================================

-- Authenticated users get access via their session; anon access is intentionally
-- omitted so anonymous users rely on device-local localStorage persistence.

-- ============================================================
-- COMMENT
-- ============================================================

comment on table public.release_acknowledgements is 'Tracks release acknowledgements per authenticated user and platform. Anonymous users use device-local localStorage (bigdrops.app_release_acknowledgements) instead.';
comment on column public.release_acknowledgements.user_id is 'Link to auth.users; each authenticated user can only access their own acknowledgement records.';
comment on column public.release_acknowledgements.version_code is 'The release versionCode that was acknowledged.';
comment on column public.release_acknowledgements.platform is 'Which platform acknowledged this release: ''web'' or ''android''.';
comment on column public.release_acknowledgements.acknowledged_at is 'When the acknowledgement occurred, using server time.';