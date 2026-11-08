-- ====================================================================
-- 20261107120000_document_numbering_uniqueness_constraints.sql
--
-- Adds tenant-wide uniqueness constraints for:
-- 1. invoices.invoice_number
-- 2. cps_sheets.cps_number
-- 3. rfqs.rfq_number
--
-- Also updates tenant_master_template so future tenants automatically
-- inherit the unique indexes via _prov_clone_table (INCLUDING ALL).
--
-- Preflight audit confirmed:
-- - Zero duplicates in cps_sheets across all schemas.
-- - Zero duplicates in rfqs across all schemas.
-- - Invoices in entity_bigdrops-main_main had two historical duplicate pairs
--   (SASINV-B028 and SASINV-B029 from May 2026).
-- - To strictly satisfy the requirement "Do not rename or delete historical
--   documents automatically", the unique index in schemas with legacy duplicates
--   exempts the secondary historical duplicate IDs while fully enforcing
--   uniqueness on all other historical rows and all future document creations.
-- ====================================================================

DO $migration$
DECLARE
  r RECORD;
  t_exists boolean;
  v_dup_ids uuid[];
BEGIN
  -- 1. Update tenant_master_template for all future tenant provisions
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique ON tenant_master_template.invoices (invoice_number) WHERE (invoice_number IS NOT NULL)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_cps_sheets_cps_number_unique ON tenant_master_template.cps_sheets (cps_number) WHERE (cps_number IS NOT NULL)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_rfqs_rfq_number_unique ON tenant_master_template.rfqs (rfq_number) WHERE (rfq_number IS NOT NULL)';

  -- 2. Apply unique constraints across all active tenant schemas
  FOR r IN (
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'entity_%' 
    ORDER BY schema_name
  ) LOOP
    -- Invoices
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = r.schema_name AND table_name = 'invoices'
    ) INTO t_exists;

    IF t_exists THEN
      -- Detect any historical duplicate records
      EXECUTE format('
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY invoice_number ORDER BY created_at ASC, id ASC) as rn
          FROM %I.invoices
          WHERE invoice_number IS NOT NULL
        )
        SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM ranked WHERE rn > 1;
      ', r.schema_name) INTO v_dup_ids;

      IF v_dup_ids IS NOT NULL AND array_length(v_dup_ids, 1) > 0 THEN
        -- Exclude secondary historical duplicate records to prevent failing creation and preserve history intact
        EXECUTE format('
          CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique
          ON %I.invoices (invoice_number)
          WHERE invoice_number IS NOT NULL AND id != ALL(%L::uuid[]);
        ', r.schema_name, v_dup_ids);
      ELSE
        EXECUTE format('
          CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique
          ON %I.invoices (invoice_number)
          WHERE invoice_number IS NOT NULL;
        ', r.schema_name);
      END IF;
    END IF;

    -- CPS Sheets
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = r.schema_name AND table_name = 'cps_sheets'
    ) INTO t_exists;

    IF t_exists THEN
      EXECUTE format('
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cps_sheets_cps_number_unique
        ON %I.cps_sheets (cps_number)
        WHERE (cps_number IS NOT NULL);
      ', r.schema_name);
    END IF;

    -- RFQs
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = r.schema_name AND table_name = 'rfqs'
    ) INTO t_exists;

    IF t_exists THEN
      EXECUTE format('
        CREATE UNIQUE INDEX IF NOT EXISTS idx_rfqs_rfq_number_unique
        ON %I.rfqs (rfq_number)
        WHERE (rfq_number IS NOT NULL);
      ', r.schema_name);
    END IF;
  END LOOP;
END $migration$;
