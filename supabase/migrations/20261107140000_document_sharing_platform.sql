-- ============================================================
-- DOCUMENT SHARING PLATFORM & PUBLIC ACCESS STORAGE
-- ============================================================
-- Purpose: Provision an authoritative, document-scoped public
--          sharing mechanism and dedicated storage bucket for
--          BOURXE generated document PDFs.
-- Domain: Document Platform / External Sharing
-- Security: RLS-gated table public.document_shares with
--           token-scoped anonymous read access, revocable by creators.
--           Public read-only bucket 'document-shares' for shared PDFs.
-- ============================================================

-- 1. Create table public.document_shares
CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    document_type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    document_number TEXT NOT NULL,
    document_title TEXT,
    pdf_path TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_shares_token ON public.document_shares(token);
CREATE INDEX IF NOT EXISTS idx_document_shares_doc ON public.document_shares(document_type, document_id);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS policies on public.document_shares
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'document_shares'
          AND policyname = 'Public read document shares by token'
    ) THEN
        CREATE POLICY "Public read document shares by token"
            ON public.document_shares FOR SELECT
            TO public
            USING (is_revoked = false AND (expires_at IS NULL OR expires_at > now()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'document_shares'
          AND policyname = 'Authenticated insert document shares'
    ) THEN
        CREATE POLICY "Authenticated insert document shares"
            ON public.document_shares FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'document_shares'
          AND policyname = 'Creators can update their document shares'
    ) THEN
        CREATE POLICY "Creators can update their document shares"
            ON public.document_shares FOR UPDATE
            TO authenticated
            USING (auth.uid() = created_by);
    END IF;
END $$;

-- 3. Ensure 'document-shares' storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'document-shares',
    'document-shares',
    true,
    20971520, -- 20 MB max
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf'];

-- 4. Storage policies for 'document-shares'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public Access for document-shares'
    ) THEN
        CREATE POLICY "Public Access for document-shares"
            ON storage.objects FOR SELECT
            TO public
            USING (bucket_id = 'document-shares');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Authenticated insert for document-shares'
    ) THEN
        CREATE POLICY "Authenticated insert for document-shares"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'document-shares');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Authenticated update for document-shares'
    ) THEN
        CREATE POLICY "Authenticated update for document-shares"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (bucket_id = 'document-shares');
    END IF;
END $$;

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
