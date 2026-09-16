-- ============================================================
-- ADD SOURCE BOQ FK TO QUOTATIONS
-- ============================================================
-- Adds a direct foreign key from quotations to boqs so
-- BOQ→Quotation conversions are a first-class DB relationship,
-- not just a trail entry in custom_fields.
-- ON DELETE SET NULL: quotation survives BOQ deletion.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'tenant_master_template' AND tablename = 'quotations') THEN
    EXECUTE 'ALTER TABLE tenant_master_template.quotations ADD COLUMN IF NOT EXISTS source_boq_id uuid REFERENCES tenant_master_template.boqs(id) ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_quotations_source_boq_id ON tenant_master_template.quotations USING btree (source_boq_id) WHERE source_boq_id IS NOT NULL';
  ELSE
    RAISE NOTICE 'Skipping tenant_master_template.quotations alter for disposable (table missing) — no-op';
  END IF;
END $$;
