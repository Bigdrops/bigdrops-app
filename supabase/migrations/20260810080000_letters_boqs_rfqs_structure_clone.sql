-- Letters, BOQs, RFQs structure-only clone (no data)
-- Created: 2026-08-10
--
-- These tables only have test data. Clone schema, skip data.
-- boq_rows and rfq_items stay in public (not in template tables).
-- Drop their incoming FKs that LIKE INCLUDING ALL copies.
--
-- All steps wrapped in a single DO block so early RETURN skips everything
-- on non-production environments where entity_bigdrops-main_main doesn't exist.

DO $$
DECLARE
  v_entity_id TEXT;
  v_table RECORD;
  v_letters INT;
  v_boqs INT;
  v_rfqs INT;
BEGIN
  SELECT e.id::text INTO v_entity_id
  FROM public.entities e
  JOIN public.workspaces w ON w.id = e.workspace_id
  WHERE w.slug = 'bigdrops-main'
    AND e.slug = 'main'
  LIMIT 1;

  IF v_entity_id IS NULL THEN
    RAISE NOTICE 'Production entity not found — skipping letters/boqs/rfqs clone (non-production environment)';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_entity_id) THEN
    EXECUTE format('CREATE SCHEMA %I', v_entity_id);
  END IF;

  -- ============================================================
  -- 1. Clone empty tables
  -- ============================================================

  FOR v_table IN
    SELECT unnest(ARRAY['letters', 'boqs', 'rfqs']) AS table_name
  LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I.%I (LIKE public.%I INCLUDING ALL)',
      v_entity_id, v_table.table_name, v_table.table_name
    );
    RAISE NOTICE 'Cloned %.% (empty)', v_entity_id, v_table.table_name;
  END LOOP;

  -- ============================================================
  -- 2. Drop incoming FKs from child tables not in template tables
  -- ============================================================

  EXECUTE format(
    'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS boq_rows_boq_id_fkey',
    v_entity_id, 'boqs'
  );

  EXECUTE format(
    'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS rfq_items_rfq_id_fkey',
    v_entity_id, 'rfqs'
  );

  RAISE NOTICE 'Dropped boq_rows/rfq_items FKs on tenant side';

  -- ============================================================
  -- 3. Enable RLS on tenant side
  -- ============================================================

  FOR v_table IN
    SELECT unnest(ARRAY['letters', 'boqs', 'rfqs']) AS table_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_entity_id, v_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', v_entity_id, v_table.table_name);
  END LOOP;

  RAISE NOTICE 'Enabled RLS on tenant letters/boqs/rfqs';

  -- ============================================================
  -- 4. Validate
  -- ============================================================

  EXECUTE format('SELECT count(*) FROM %I.letters', v_entity_id) INTO v_letters;
  EXECUTE format('SELECT count(*) FROM %I.boqs', v_entity_id) INTO v_boqs;
  EXECUTE format('SELECT count(*) FROM %I.rfqs', v_entity_id) INTO v_rfqs;

  IF v_letters > 0 OR v_boqs > 0 OR v_rfqs > 0 THEN
    RAISE EXCEPTION 'Expected empty tables: letters=%, boqs=%, rfqs=%', v_letters, v_boqs, v_rfqs;
  END IF;

  RAISE NOTICE 'Letters/BOQs/RFQs structure-only clone validated (all empty)';

END $$;
