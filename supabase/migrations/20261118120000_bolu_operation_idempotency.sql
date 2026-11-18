-- ====================================================================
-- 20261118120000_bolu_operation_idempotency.sql
--
-- Adds a dedicated `operation_id` column with a partial unique index to
-- `invoices` and `quotations` in every tenant schema and in
-- `tenant_master_template`, so future tenants inherit the protection.
--
-- Canonical invoice and quotation save RPCs are updated by
-- 20261118130000_bolu_tenant_rpc_installer.sql, not by this migration.
--
-- This migration:
--   1. Adds `operation_id text` (nullable) to both tables in the template
--      and all active entity\_% schemas.
--   2. Creates partial unique indexes:
--        idx_invoices_operation_id_unique  WHERE operation_id IS NOT NULL
--        idx_quotations_operation_id_unique WHERE operation_id IS NOT NULL
--   3. Backfills `operation_id` from `custom_fields` for existing Bolu
--      documents whose `custom_fields` contains an `operation_id` key.
--      - For `quotations` (jsonb): extract via ->>'operation_id' when the
--        value is a non-empty string.
--      - For `invoices` (text): per-row safe JSON parsing via a PL/pgSQL
--        loop with a per-row exception handler. Invalid JSON, non-object
--        JSON, and missing/empty/non-string operation_id values are skipped
--        (counted and reported via RAISE NOTICE); no historical text is
--        rewritten and no non-NULL operation_id is overwritten.
--   4. Notifies PostgREST to reload the schema cache.
--
-- Pre-flight: existing duplicate operation_ids (if any) are detected and
-- cause a RAISE EXCEPTION that identifies the tenant schema and document
-- family. The migration fails safely — no unique index is created from
-- duplicate data, and no financial record is deleted, merged, or modified
-- to resolve the duplicates.
--
-- Transaction: this file is one migration executed transactionally by the
-- Supabase CLI. Any RAISE EXCEPTION rolls back the entire migration,
-- including all tenant columns, backfills, and index creations.
-- ====================================================================

DO $migration$
DECLARE
  r RECORD;
  t_exists boolean;
  v_col_exists boolean;
  v_dup_count integer;
  -- Per-row invoice backfill state (safe JSON parsing)
  v_rec RECORD;
  v_parsed jsonb;
  v_op text;
  v_backfilled integer := 0;
  v_skipped_invalid integer := 0;
  v_skipped_shape integer := 0;
BEGIN

  -- ============================================================
  -- 1. tenant_master_template — future tenant provisioning
  -- ============================================================

  -- invoices
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_master_template'
      AND table_name = 'invoices'
      AND column_name = 'operation_id'
  ) INTO v_col_exists;

  IF NOT v_col_exists THEN
    EXECUTE 'ALTER TABLE tenant_master_template.invoices ADD COLUMN operation_id text';
  END IF;

  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_operation_id_unique '
          || 'ON tenant_master_template.invoices (operation_id) '
          || 'WHERE operation_id IS NOT NULL';

  -- quotations
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_master_template'
      AND table_name = 'quotations'
      AND column_name = 'operation_id'
  ) INTO v_col_exists;

  IF NOT v_col_exists THEN
    EXECUTE 'ALTER TABLE tenant_master_template.quotations ADD COLUMN operation_id text';
  END IF;

  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_operation_id_unique '
          || 'ON tenant_master_template.quotations (operation_id) '
          || 'WHERE operation_id IS NOT NULL';

  -- ============================================================
  -- 2. All active tenant schemas
  -- ============================================================

  -- Treat a missing provisioning-status row as legacy ready: older tenants may
  -- predate public.entity_provisioning_status but are still active tenant schemas.
  -- Known non-ready schemas are left to the normal provisioning path.
  FOR r IN (
    SELECT DISTINCT public._prov_get_schema_name(e.id) AS schema_name
    FROM public.entities e
    LEFT JOIN public.entity_provisioning_status eps ON eps.entity_id = e.id
    WHERE public._prov_get_schema_name(e.id) LIKE 'entity\_%'
      AND COALESCE(eps.status, 'ready') = 'ready'
    ORDER BY schema_name
  ) LOOP

    -- ---- invoices ----
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = r.schema_name AND table_name = 'invoices'
    ) INTO t_exists;

    IF t_exists THEN
      -- Add column if absent
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = r.schema_name
          AND table_name = 'invoices'
          AND column_name = 'operation_id'
      ) INTO v_col_exists;

      IF NOT v_col_exists THEN
        EXECUTE format('ALTER TABLE %I.invoices ADD COLUMN operation_id text', r.schema_name);
      END IF;

      -- Backfill `operation_id` for invoices from the text `custom_fields`.
      --
      -- SAFETY CONTRACT: invoices.custom_fields is `text`, so a direct
      -- `::jsonb` cast aborts on invalid historical JSON. A first-character
      -- or regex test is NOT proof of valid JSON. We therefore parse each
      -- candidate row inside its own BEGIN/EXCEPTION block so a single
      -- malformed value cannot abort the batch or the migration.
      --
      -- Per row, backfill ONLY when every condition holds:
      --   * custom_fields is non-null and not whitespace-only;
      --   * it parses as valid JSON;
      --   * the JSON value is an object (not scalar/array/JSON null);
      --   * it contains a non-empty, usable operation_id string;
      --   * the destination operation_id is currently NULL.
      -- Otherwise the historical record is left completely unchanged.
      -- Invalid JSON rows are counted and reported (never silently skipped).
      v_backfilled := 0;
      v_skipped_invalid := 0;
      v_skipped_shape := 0;

      FOR v_rec IN EXECUTE format(
        'SELECT id, custom_fields FROM %I.invoices '
        || 'WHERE operation_id IS NULL '
        || '  AND custom_fields IS NOT NULL '
        || '  AND btrim(custom_fields) <> %L',
        r.schema_name, ''
      ) LOOP
        BEGIN
          v_parsed := v_rec.custom_fields::jsonb;
        EXCEPTION WHEN invalid_text_representation THEN
          -- Invalid JSON text: leave the row unchanged and continue.
          v_skipped_invalid := v_skipped_invalid + 1;
          CONTINUE;
        END;

        -- Valid JSON but not an object (scalar, array, or JSON null): skip.
        IF jsonb_typeof(v_parsed) IS DISTINCT FROM 'object' THEN
          v_skipped_shape := v_skipped_shape + 1;
          CONTINUE;
        END IF;

        -- Missing, JSON-null, non-string, empty, or whitespace-only
        -- operation_id: skip. Bolu always writes operation_id as a JSON
        -- string, so a number/boolean/object here is not a usable key.
        IF jsonb_typeof(v_parsed->'operation_id') IS DISTINCT FROM 'string' THEN
          v_skipped_shape := v_skipped_shape + 1;
          CONTINUE;
        END IF;
        v_op := NULLIF(btrim(v_parsed->>'operation_id'), '');
        IF v_op IS NULL THEN
          v_skipped_shape := v_skipped_shape + 1;
          CONTINUE;
        END IF;

        -- Never overwrite an existing dedicated operation_id. The row was
        -- selected with operation_id IS NULL; re-check in the UPDATE for
        -- safety under any concurrent activity.
        EXECUTE format('UPDATE %I.invoices SET operation_id = $1 WHERE id = $2 AND operation_id IS NULL', r.schema_name)
          USING v_op, v_rec.id;
        v_backfilled := v_backfilled + 1;
      END LOOP;

      RAISE NOTICE 'Backfill % invoices: % populated, % skipped (invalid JSON), % skipped (no usable object/operation_id)',
        r.schema_name, v_backfilled, v_skipped_invalid, v_skipped_shape;

      -- Check for duplicates before creating the unique index
      EXECUTE format('
        SELECT count(*) FROM (
          SELECT operation_id FROM %I.invoices
          WHERE operation_id IS NOT NULL
          GROUP BY operation_id HAVING count(*) > 1
        ) d
      ', r.schema_name) INTO v_dup_count;

      IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'Duplicate operation_id values found in % invoices (% groups). Resolve duplicates before creating unique index.', r.schema_name, v_dup_count;
      END IF;

      EXECUTE format('
        CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_operation_id_unique
        ON %I.invoices (operation_id)
        WHERE operation_id IS NOT NULL
      ', r.schema_name);
    END IF;

    -- ---- quotations ----
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = r.schema_name AND table_name = 'quotations'
    ) INTO t_exists;

    IF t_exists THEN
      -- Add column if absent
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = r.schema_name
          AND table_name = 'quotations'
          AND column_name = 'operation_id'
      ) INTO v_col_exists;

      IF NOT v_col_exists THEN
        EXECUTE format('ALTER TABLE %I.quotations ADD COLUMN operation_id text', r.schema_name);
      END IF;

      -- Backfill from custom_fields for quotations (already jsonb — no text
      -- cast is involved, so no parse exception is possible). Apply the same
      -- usability rule as invoices: only a non-empty string operation_id is
      -- backfilled. An empty string would participate in the partial unique
      -- index ('' IS NOT NULL) and cause spurious duplicate failures.
      EXECUTE format('
        UPDATE %I.quotations
        SET operation_id = NULLIF(btrim(custom_fields->>''operation_id''), '''')
        WHERE operation_id IS NULL
          AND custom_fields IS NOT NULL
          AND jsonb_typeof(custom_fields) = ''object''
          AND jsonb_typeof(custom_fields->''operation_id'') = ''string''
          AND NULLIF(btrim(custom_fields->>''operation_id''), '''') IS NOT NULL
      ', r.schema_name);

      -- Check for duplicates before creating the unique index
      EXECUTE format('
        SELECT count(*) FROM (
          SELECT operation_id FROM %I.quotations
          WHERE operation_id IS NOT NULL
          GROUP BY operation_id HAVING count(*) > 1
        ) d
      ', r.schema_name) INTO v_dup_count;

      IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'Duplicate operation_id values found in % quotations (% groups). Resolve duplicates before creating unique index.', r.schema_name, v_dup_count;
      END IF;

      EXECUTE format('
        CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_operation_id_unique
        ON %I.quotations (operation_id)
        WHERE operation_id IS NOT NULL
      ', r.schema_name);
    END IF;

  END LOOP;

END $migration$;

-- ============================================================
-- 3. Canonical RPC installation is intentionally not performed here
-- ============================================================
-- This migration changes schema and data only. Invoice and quotation
-- save RPCs are installed by the canonical installer in
-- 20261118130000_bolu_tenant_rpc_installer.sql.

-- ============================================================
-- 4. Notify PostgREST to reload the schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
