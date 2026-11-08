-- ============================================================
-- DOCUMENT SHARING PLATFORM — SECURITY HARDENING (REVISED)
-- ============================================================
-- Purpose: Production-grade security hardening of the unified document
--          sharing subsystem:
--   1. Storage access strictly bound to token possession via server-side
--      retrieval endpoint (direct anonymous & authenticated storage
--      downloads completely removed from external sharing bucket).
--   2. Storage upload authorization strictly validates creator identity,
--      tenant workspace membership, corresponding share record existence,
--      and strict filename convention.
--   3. General client UPDATE access to document_shares removed to prevent
--      reversal of share revocation; revocation controlled exclusively
--      through secure revoke_document_share RPC.
--   4. Field immutability trigger uses NULL-safe IS DISTINCT FROM on all
--      protected columns.
--   5. Source document tenant ownership validated on share insertion
--      with parameterized dynamic queries and schema-verified table mappings.
--   6. Public RPC stripped of internal storage paths and token-state
--      leaks (uniform unavailable response).
--   7. Search path hardened to 'pg_catalog' on all SECURITY DEFINER functions;
--      sensitive columns excluded from function execution context.
-- ============================================================

-- 1. Clean up previous policies on public.document_shares
DROP POLICY IF EXISTS "Public read document shares by token" ON public.document_shares;
DROP POLICY IF EXISTS "Authenticated insert document shares" ON public.document_shares;
DROP POLICY IF EXISTS "Creators can update their document shares" ON public.document_shares;
DROP POLICY IF EXISTS "Tenant members and creators can select document shares" ON public.document_shares;
DROP POLICY IF EXISTS "Authorized tenant members can insert document shares" ON public.document_shares;
DROP POLICY IF EXISTS "Authorized tenant members and creators can update document shares" ON public.document_shares;
DROP POLICY IF EXISTS "Authorized tenant members and creators can delete document shares" ON public.document_shares;

-- Explicitly revoke broad table SELECT and UPDATE from anon and authenticated
REVOKE ALL ON public.document_shares FROM anon;
REVOKE SELECT ON public.document_shares FROM anon;
REVOKE UPDATE ON public.document_shares FROM anon;
REVOKE UPDATE ON public.document_shares FROM authenticated;

-- Ensure updated_at column exists for revocation tracking
ALTER TABLE public.document_shares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Source-document tenant ownership validation helper
CREATE OR REPLACE FUNCTION public.validate_share_source_document(
    p_tenant_id text,
    p_document_type text,
    p_document_id text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_schema_name text;
    v_entity_uuid uuid;
    v_doc_exists boolean := false;
    v_target_table text;
    v_doc_type text;
BEGIN
    IF p_tenant_id IS NULL OR p_document_type IS NULL OR p_document_id IS NULL THEN
        RETURN false;
    END IF;

    -- Validate UUID structure for tenant_id
    BEGIN
        v_entity_uuid := p_tenant_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    -- Resolve schema name via canonical engine helper
    SELECT public._prov_get_schema_name(v_entity_uuid)
    INTO v_schema_name;

    IF v_schema_name IS NULL THEN
        RETURN false;
    END IF;

    v_doc_type := pg_catalog.lower(pg_catalog.btrim(p_document_type));

    -- Map document type to tenant schema table verified against tenant_master_template
    CASE v_doc_type
        WHEN 'invoice' THEN v_target_table := 'invoices';
        WHEN 'quotation' THEN v_target_table := 'quotations';
        WHEN 'csr' THEN v_target_table := 'csrs';
        WHEN 'waybill' THEN v_target_table := 'waybills';
        WHEN 'rfq' THEN v_target_table := 'rfqs';
        WHEN 'receipt' THEN v_target_table := 'receipts';
        WHEN 'cps' THEN v_target_table := 'cps_sheets';
        ELSE RETURN false; -- Unknown document type fails closed
    END CASE;

    -- Verify source document existence within that specific tenant's schema
    -- Parameterized with USING $1 (no literal interpolation)
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_tables
        WHERE schemaname = v_schema_name AND tablename = v_target_table
    ) THEN
        IF v_doc_type = 'receipt' THEN
            EXECUTE pg_catalog.format(
                'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE id::text = $1 OR payment_id::text = $1)',
                v_schema_name, v_target_table
            ) INTO v_doc_exists USING p_document_id;
        ELSE
            EXECUTE pg_catalog.format(
                'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE id::text = $1)',
                v_schema_name, v_target_table
            ) INTO v_doc_exists USING p_document_id;
        END IF;

        IF v_doc_exists THEN
            RETURN true;
        END IF;
    END IF;

    -- Fallback for receipts: if not found in receipts table, check payments table
    IF v_doc_type = 'receipt' AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_tables
        WHERE schemaname = v_schema_name AND tablename = 'payments'
    ) THEN
        EXECUTE pg_catalog.format(
            'SELECT EXISTS (SELECT 1 FROM %I.payments WHERE id::text = $1)',
            v_schema_name
        ) INTO v_doc_exists USING p_document_id;
        RETURN v_doc_exists;
    END IF;

    -- Fallback for cps: check cost_pricing_sheets if cps_sheets didn't match
    IF v_doc_type = 'cps' AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_tables
        WHERE schemaname = v_schema_name AND tablename = 'cost_pricing_sheets'
    ) THEN
        EXECUTE pg_catalog.format(
            'SELECT EXISTS (SELECT 1 FROM %I.cost_pricing_sheets WHERE id::text = $1)',
            v_schema_name
        ) INTO v_doc_exists USING p_document_id;
        RETURN v_doc_exists;
    END IF;

    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_share_source_document(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_share_source_document(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.validate_share_source_document(text, text, text) TO authenticated;

-- 3. Immutability trigger: prevent ownership transfer or token reassignment on UPDATE
-- NULL-safe comparisons using IS DISTINCT FROM across all 8 protected columns
CREATE OR REPLACE FUNCTION public.enforce_document_shares_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'document_shares.id is immutable';
    END IF;
    IF NEW.token IS DISTINCT FROM OLD.token THEN
        RAISE EXCEPTION 'document_shares.token is immutable';
    END IF;
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'document_shares.tenant_id is immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'document_shares.created_by is immutable';
    END IF;
    IF NEW.document_type IS DISTINCT FROM OLD.document_type THEN
        RAISE EXCEPTION 'document_shares.document_type is immutable';
    END IF;
    IF NEW.document_id IS DISTINCT FROM OLD.document_id THEN
        RAISE EXCEPTION 'document_shares.document_id is immutable';
    END IF;
    IF NEW.pdf_path IS DISTINCT FROM OLD.pdf_path THEN
        RAISE EXCEPTION 'document_shares.pdf_path is immutable';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'document_shares.created_at is immutable';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_document_shares_immutability ON public.document_shares;
CREATE TRIGGER trg_enforce_document_shares_immutability
    BEFORE UPDATE ON public.document_shares
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_document_shares_immutability();

-- 4. Tenant-isolated RLS policies on public.document_shares
-- Notice: Direct table UPDATE policy is deliberately omitted to prevent revocation reversal.
-- Table updates are only executable via the controlled revoke_document_share function.
CREATE POLICY "Tenant members and creators can select document shares"
    ON public.document_shares
    FOR SELECT
    TO authenticated
    USING (
        (created_by IS NOT NULL AND auth.uid() = created_by)
        OR (
            tenant_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.entities e
                WHERE e.id::text = document_shares.tenant_id
                  AND public.is_workspace_member(e.workspace_id, auth.uid())
            )
        )
    );

CREATE POLICY "Authorized tenant members can insert document shares"
    ON public.document_shares
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = created_by
        AND tenant_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.entities e
            WHERE e.id::text = tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
        AND public.validate_share_source_document(tenant_id, document_type, document_id)
    );

CREATE POLICY "Authorized tenant members and creators can delete document shares"
    ON public.document_shares
    FOR DELETE
    TO authenticated
    USING (
        (created_by IS NOT NULL AND auth.uid() = created_by)
        OR (
            tenant_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.entities e
                WHERE e.id::text = document_shares.tenant_id
                  AND public.is_workspace_member(e.workspace_id, auth.uid())
            )
        )
    );

-- 5. Hardened Public RPC: get_public_document_share
-- Hardened search_path = pg_catalog (prevents pg_temp hijacking).
-- Loads ONLY non-sensitive columns (omits tenant_id, created_by, and pdf_path).
-- Uniform failure response (prevents token-state discovery).
CREATE OR REPLACE FUNCTION public.get_public_document_share(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_token text;
    v_document_type text;
    v_document_number text;
    v_document_title text;
    v_metadata jsonb;
    v_created_at timestamptz;
    v_expires_at timestamptz;
    v_is_revoked boolean;
    v_sanitized text;
BEGIN
    IF p_token IS NULL THEN
        RETURN NULL;
    END IF;

    v_sanitized := pg_catalog.btrim(p_token);
    -- Enforce safe token structure: 16 to 64 alphanumeric or dash/underscore chars
    IF pg_catalog.length(v_sanitized) < 16 
       OR pg_catalog.length(v_sanitized) > 64 
       OR v_sanitized !~ '^[a-zA-Z0-9_-]+$' THEN
        RETURN NULL;
    END IF;

    -- Select ONLY the required non-sensitive public columns (omits tenant_id, created_by, pdf_path)
    SELECT
        s.token,
        s.document_type,
        s.document_number,
        s.document_title,
        s.metadata,
        s.created_at,
        s.expires_at,
        s.is_revoked
    INTO
        v_token,
        v_document_type,
        v_document_number,
        v_document_title,
        v_metadata,
        v_created_at,
        v_expires_at,
        v_is_revoked
    FROM public.document_shares s
    WHERE s.token = v_sanitized
    LIMIT 1;

    -- Uniform failure response for: non-existent, revoked, or expired tokens
    -- Prevents token-state discovery by external actors
    IF v_token IS NULL 
       OR v_is_revoked = true 
       OR (v_expires_at IS NOT NULL AND v_expires_at <= pg_catalog.now()) THEN
        RETURN NULL;
    END IF;

    -- Return strictly sanitized public fields
    -- Notice: storage_path, tenant_id, and created_by are NEVER returned
    RETURN pg_catalog.jsonb_build_object(
        'available', true,
        'token', v_token,
        'document_type', v_document_type,
        'document_number', v_document_number,
        'document_title', v_document_title,
        'metadata', v_metadata,
        'created_at', v_created_at,
        'expires_at', v_expires_at
    );
END;
$$;

-- Tight execution permissions
REVOKE ALL ON FUNCTION public.get_public_document_share(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_document_share(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_document_share(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_document_share(text) TO anon, authenticated;

-- 6. Hardened Revocation RPC: revoke_document_share
-- Hardened search_path = pg_catalog.
-- Restricted to authenticated users with tenant authorization.
CREATE OR REPLACE FUNCTION public.revoke_document_share(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_id uuid;
    v_created_by uuid;
    v_tenant_id text;
    v_caller_id uuid;
    v_is_authorized boolean := false;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL OR p_token IS NULL THEN
        RETURN false;
    END IF;

    SELECT
        s.id,
        s.created_by,
        s.tenant_id
    INTO
        v_id,
        v_created_by,
        v_tenant_id
    FROM public.document_shares s
    WHERE s.token = pg_catalog.btrim(p_token)
    LIMIT 1;

    IF v_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check if caller is creator
    IF v_created_by = v_caller_id THEN
        v_is_authorized := true;
    ELSIF v_tenant_id IS NOT NULL THEN
        -- Check if caller belongs to the tenant's workspace
        SELECT EXISTS (
            SELECT 1
            FROM public.entities e
            WHERE e.id::text = v_tenant_id
              AND public.is_workspace_member(e.workspace_id, v_caller_id)
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN false;
    END IF;

    UPDATE public.document_shares
    SET is_revoked = true,
        updated_at = pg_catalog.now()
    WHERE id = v_id;

    RETURN true;
END;
$$;

-- Tight execution permissions
REVOKE ALL ON FUNCTION public.revoke_document_share(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_document_share(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_document_share(text) TO authenticated;

-- 7. Storage Bucket & Policy Hardening
-- Bucket 'document-shares' is strictly private (public = false).
-- Direct client storage downloads (both anonymous and authenticated) are
-- completely removed from the external sharing bucket.
-- All PDF retrievals are routed through the trusted server-side streaming endpoint.
UPDATE storage.buckets
SET public = false
WHERE id = 'document-shares';

DROP POLICY IF EXISTS "Public Access for document-shares" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert for document-shares" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update for document-shares" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated tenant members can upload document shares" ON storage.objects;
DROP POLICY IF EXISTS "Token-scoped active share object access" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can read tenant document share objects" ON storage.objects;
DROP POLICY IF EXISTS "Authorized tenant members can upload document share objects" ON storage.objects;
DROP POLICY IF EXISTS "Authorized tenant members can update document share objects" ON storage.objects;
DROP POLICY IF EXISTS "Authorized tenant members can delete document share objects" ON storage.objects;

-- Upload policy: authenticated users who are members of the tenant that owns the share record
CREATE POLICY "Authorized tenant members can upload document share objects"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'document-shares'
        AND name ~ '^[a-zA-Z0-9_-]{16,64}\.pdf$'
        AND EXISTS (
            SELECT 1
            FROM public.document_shares s
            JOIN public.entities e ON e.id::text = s.tenant_id
            WHERE s.pdf_path = storage.objects.name
              AND s.created_by = auth.uid()
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- Update policy: authenticated users can update (upsert) only their own unrevoked share objects
CREATE POLICY "Authorized tenant members can update document share objects"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'document-shares'
        AND name ~ '^[a-zA-Z0-9_-]{16,64}\.pdf$'
        AND EXISTS (
            SELECT 1
            FROM public.document_shares s
            JOIN public.entities e ON e.id::text = s.tenant_id
            WHERE s.pdf_path = storage.objects.name
              AND s.created_by = auth.uid()
              AND s.is_revoked = false
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    )
    WITH CHECK (
        bucket_id = 'document-shares'
        AND name ~ '^[a-zA-Z0-9_-]{16,64}\.pdf$'
        AND EXISTS (
            SELECT 1
            FROM public.document_shares s
            JOIN public.entities e ON e.id::text = s.tenant_id
            WHERE s.pdf_path = storage.objects.name
              AND s.created_by = auth.uid()
              AND s.is_revoked = false
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- Delete policy: authorized tenant members can delete their own share objects
CREATE POLICY "Authorized tenant members can delete document share objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'document-shares'
        AND EXISTS (
            SELECT 1
            FROM public.document_shares s
            JOIN public.entities e ON e.id::text = s.tenant_id
            WHERE s.pdf_path = storage.objects.name
              AND s.created_by = auth.uid()
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- 8. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
