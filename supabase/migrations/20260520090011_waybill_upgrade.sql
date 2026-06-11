-- ============================================================
-- Waybill Module Upgrade
-- Phase 1-2: DDL fixes, constraints, indexes, sequence logs
-- ============================================================

-- 1. Add missing custom_fields column (must be jsonb for JSON column in the DB)
ALTER TABLE waybills
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2. Add check constraints (matching current TypeScript types exactly)
ALTER TABLE waybills
  DROP CONSTRAINT IF EXISTS check_waybill_type,
  ADD CONSTRAINT check_waybill_type CHECK (type IN ('internal', 'external'));

ALTER TABLE waybills
  DROP CONSTRAINT IF EXISTS check_waybill_status,
  ADD CONSTRAINT check_waybill_status CHECK (status IN ('draft', 'dispatched', 'delivered'));

-- 3. Add missing INSERT RLS policy (only SELECT, DELETE, UPDATE existed)
DROP POLICY IF EXISTS waybills_authenticated_insert ON waybills;
CREATE POLICY waybills_authenticated_insert ON waybills
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Add missing indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_waybills_client_id ON public.waybills USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_waybills_invoice_id ON public.waybills USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_waybills_project_id ON public.waybills USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_waybills_status ON public.waybills USING btree (status);
CREATE INDEX IF NOT EXISTS idx_waybills_created_at ON public.waybills USING btree (created_at DESC);

-- 5. Add foreign key for created_by (currently an orphan column)
ALTER TABLE waybills
  DROP CONSTRAINT IF EXISTS waybills_created_by_fkey,
  ADD CONSTRAINT waybills_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Create blank_waybill_logs table for sequence reconciliation & audit
CREATE TABLE IF NOT EXISTS blank_waybill_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    waybill_number text NOT NULL,
    printed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    printed_at timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE blank_waybill_logs ADD CONSTRAINT blank_waybill_logs_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blank_waybill_logs_number ON public.blank_waybill_logs USING btree (waybill_number);

ALTER TABLE blank_waybill_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY blank_waybill_logs_authenticated_select ON blank_waybill_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY blank_waybill_logs_authenticated_insert ON blank_waybill_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Drop duplicate RLS policies that overlap with the new ones
--    (waybills_authenticated_select, delete, update remain)
--    No cleanup needed for existing policies, the INSERT was the only missing one.
