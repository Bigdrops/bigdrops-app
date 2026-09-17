-- ============================================================
-- FIX: Add source_boq_id to ALL entity schemas
-- ============================================================
-- The original migration (20260914130000) only targeted
-- tenant_master_template. Existing entity schemas never received
-- the column, so BOQ→Quotation conversion fails at INSERT time
-- on production.
--
-- This migration dynamically finds every schema with a
-- quotations table and adds source_boq_id + index to each.
-- Idempotent: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.

DO $do$
DECLARE
  v_schema record;
BEGIN
  FOR v_schema IN
    SELECT schemaname
    FROM pg_tables
    WHERE tablename = 'quotations'
      AND schemaname NOT LIKE 'pg_%'
      AND schemaname != 'information_schema'
  LOOP
    -- Add column (FK to boqs in the same schema)
    EXECUTE format(
      'ALTER TABLE %I.quotations ADD COLUMN IF NOT EXISTS source_boq_id uuid REFERENCES %I.boqs(id) ON DELETE SET NULL',
      v_schema.schemaname,
      v_schema.schemaname
    );

    -- Add partial index
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_quotations_source_boq_id ON %I.quotations USING btree (source_boq_id) WHERE source_boq_id IS NOT NULL',
      v_schema.schemaname
    );

    RAISE NOTICE 'Added source_boq_id to %.quotations', v_schema.schemaname;
  END LOOP;
END $do$;
