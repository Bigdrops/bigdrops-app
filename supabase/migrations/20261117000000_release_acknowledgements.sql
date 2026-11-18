-- Additive release acknowledgement storage. Anonymous acknowledgements stay
-- on-device; authenticated records are isolated by auth.uid() and RLS.

CREATE TABLE IF NOT EXISTS public.release_acknowledgements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_code integer NOT NULL CHECK (version_code > 0),
  platform text NOT NULL CHECK (platform IN ('web', 'android')),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT release_acknowledgements_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS release_acknowledgements_user_version_platform_key
  ON public.release_acknowledgements (user_id, version_code, platform);

ALTER TABLE public.release_acknowledgements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'release_acknowledgements'
      AND policyname = 'release_acknowledgements_auth_select'
  ) THEN
    CREATE POLICY release_acknowledgements_auth_select
      ON public.release_acknowledgements FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'release_acknowledgements'
      AND policyname = 'release_acknowledgements_auth_insert'
  ) THEN
    CREATE POLICY release_acknowledgements_auth_insert
      ON public.release_acknowledgements FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'release_acknowledgements'
      AND policyname = 'release_acknowledgements_auth_update'
  ) THEN
    CREATE POLICY release_acknowledgements_auth_update
      ON public.release_acknowledgements FOR UPDATE TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'release_acknowledgements'
      AND policyname = 'release_acknowledgements_auth_delete'
  ) THEN
    CREATE POLICY release_acknowledgements_auth_delete
      ON public.release_acknowledgements FOR DELETE TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END
$$;

REVOKE ALL ON TABLE public.release_acknowledgements FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.release_acknowledgements TO authenticated;

COMMENT ON TABLE public.release_acknowledgements IS
  'Release acknowledgements for authenticated users; anonymous acknowledgements remain device-local.';
COMMENT ON COLUMN public.release_acknowledgements.user_id IS
  'Owner of the acknowledgement; access is restricted to auth.uid() by RLS.';
COMMENT ON COLUMN public.release_acknowledgements.version_code IS
  'The acknowledged release version code.';
COMMENT ON COLUMN public.release_acknowledgements.platform IS
  'Platform where the release was acknowledged: web or android.';
COMMENT ON COLUMN public.release_acknowledgements.acknowledged_at IS
  'Server timestamp when the release was acknowledged.';
