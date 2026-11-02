-- ============================================================
-- APP RELEASES STORAGE BUCKET & PUBLIC ACCESS
-- ============================================================
-- Purpose: Provision an idempotent public storage bucket for
--          Android APK binary releases (Supabase Storage).
-- Domain: Android App Updates & Distribution
-- Contract: Public read-only access for bucket 'app-releases'.
--           Write access stays exclusive to the service role.
-- ============================================================

-- 1. Ensure the 'app-releases' bucket exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-releases',
    'app-releases',
    true,
    104857600, -- 100 MB max for APK binaries
    ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/vnd.android.package-archive', 'application/octet-stream'];

-- 2. Ensure public read policy exists on storage.objects for 'app-releases'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public Access for app-releases'
    ) THEN
        CREATE POLICY "Public Access for app-releases"
            ON storage.objects FOR SELECT
            TO public
            USING (bucket_id = 'app-releases');
    END IF;
END $$;
