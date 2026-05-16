-- =============================================================================
-- Staging RLS policy for audit_logs
-- Apply via Supabase SQL Editor or `supabase db push` on staging instance
-- =============================================================================

-- 1. Ensure authenticated access is granted
GRANT SELECT ON public.audit_logs TO authenticated;

-- 2. Owner-scoped SELECT policy (drop existing if recreating)
-- Prevents cross-entity leakage: user can only see audit logs for entities
-- they own (invoices and quotations joined by user_id = auth.uid()).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'audit_logs_select_owner'
  ) THEN
    DROP POLICY audit_logs_select_owner ON public.audit_logs;
  END IF;
END $$;

CREATE POLICY audit_logs_select_owner
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    entity_id IN (
      SELECT id FROM invoices  WHERE user_id = auth.uid()
      UNION
      SELECT id FROM quotations WHERE user_id = auth.uid()
    )
  );

-- 3. Prevent any INSERT/UPDATE/DELETE from authenticated users (immutable audit)
-- Uncomment when ready to enforce at DB level:
-- REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
