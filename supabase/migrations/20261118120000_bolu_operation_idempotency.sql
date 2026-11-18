-- ====================================================================
-- 20261118120000_bolu_operation_idempotency.sql
--
-- Adds a dedicated `operation_id` column with a partial unique index to
-- `invoices` and `quotations` in every tenant schema and in
-- `tenant_master_template`, so future tenants inherit the protection.
--
-- Also updates `save_invoice_with_items_transaction` and
-- `save_quotation_with_items_transaction` RPCs in every tenant schema to
-- persist `operation_id` from the payload, making the column atomic with
-- the document insert.
--
-- This migration:
--   1. Adds `operation_id text` (nullable) to both tables in the template
--      and all active entity_% schemas.
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
--   4. Reinstalls the two save RPCs with operation_id included in the INSERT.
--   5. Notifies PostgREST to reload the schema cache.
--
-- Pre-flight: existing duplicate operation_ids (if any) are detected and
-- cause a RAISE EXCEPTION that identifies the tenant schema and document
-- family. The migration fails safely — no unique index is created from
-- duplicate data, and no financial record is deleted, merged, or modified
-- to resolve the duplicates.
--
-- Transaction: this file is one migration executed transactionally by the
-- Supabase CLI. Any RAISE EXCEPTION rolls back the entire migration,
-- including all tenant columns, backfills, indexes, and RPC replacements.
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

  FOR r IN (
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'entity_%'
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
-- 3. Reinstall save RPCs with operation_id in the INSERT
-- ============================================================
-- The _prov_install_tenant_rpcs function is the canonical installer for
-- tenant-scoped RPCs. We update it to include operation_id in the INSERT
-- statements of both save_invoice_with_items_transaction and
-- save_quotation_with_items_transaction, then re-call it for every
-- existing tenant schema.
--
-- To avoid copying the entire (very large) function body, we use a targeted
-- approach: for each tenant schema, directly recreate the two RPCs with
-- the added column. This is safe because CREATE OR REPLACE preserves the
-- function signature and only changes the body.

DO $rpc_update$
DECLARE
  r RECORD;
  v_schema text;
  v_schema_ident text;
BEGIN

  FOR r IN (
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'entity_%'
    ORDER BY schema_name
  ) LOOP
    v_schema := r.schema_name;
    v_schema_ident := quote_ident(v_schema);

    -- Verify the invoices table has operation_id before installing the RPC
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_schema
        AND table_name = 'invoices'
        AND column_name = 'operation_id'
    ) THEN
      -- save_invoice_with_items_transaction: add operation_id to the INSERT
      EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.save_invoice_with_items_transaction(
            p_entity_id uuid,
            p_invoice_payload jsonb,
            p_items jsonb DEFAULT ''[]''::jsonb,
            p_mode text DEFAULT ''create''::text,
            p_cps_feedback jsonb DEFAULT NULL::jsonb
        )
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path TO ''public''
        AS $function$
        declare
          v_schema text;
          v_invoice_id uuid;
          v_row record;
          v_item jsonb;
          v_count integer := 0;
        begin
          v_schema := %L;

          IF p_mode = ''create'' THEN
            IF NOT public.has_entity_permission(p_entity_id, auth.uid(), ''invoice'', ''create'') THEN
              RAISE EXCEPTION ''Insufficient permissions: invoice/create required''
                USING ERRCODE = ''insufficient_privilege'';
            END IF;
          ELSE
            IF NOT public.has_entity_permission(p_entity_id, auth.uid(), ''invoice'', ''edit'') THEN
              RAISE EXCEPTION ''Insufficient permissions: invoice/edit required''
                USING ERRCODE = ''insufficient_privilege'';
            END IF;
          END IF;

          IF p_mode = ''create'' THEN
            EXECUTE format(
              $q$
              INSERT INTO %%I.invoices (
                  invoice_number, po_number, invoice_title, client_id,
                  client_name, project_id, issue_date, due_date, status,
                  document_type, payment_terms, notes, terms, workmanship,
                  transportation, shipping, discount, vat, wht, custom_fields,
                  work_duration, subtotal, install_rate_total, total,
                  amount_in_words, operation_id
              )
              VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                  $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                  $22, $23, $24, $25, $26
              )
              RETURNING id
              $q$,
              v_schema
            )
            INTO v_invoice_id
            USING
              p_invoice_payload->>''invoice_number'',
              p_invoice_payload->>''po_number'',
              p_invoice_payload->>''invoice_title'',
              NULLIF(p_invoice_payload->>''client_id'', '''')::uuid,
              p_invoice_payload->>''client_name'',
              NULLIF(p_invoice_payload->>''project_id'', '''')::uuid,
              (p_invoice_payload->>''issue_date'')::date,
              p_invoice_payload->>''due_date'',
              COALESCE(p_invoice_payload->>''status'', ''unpaid''),
              p_invoice_payload->>''document_type'',
              p_invoice_payload->>''payment_terms'',
              p_invoice_payload->>''notes'',
              p_invoice_payload->>''terms'',
              COALESCE((p_invoice_payload->>''workmanship'')::numeric, 0),
              COALESCE((p_invoice_payload->>''transportation'')::numeric, 0),
              COALESCE((p_invoice_payload->>''shipping'')::numeric, 0),
              COALESCE((p_invoice_payload->>''discount'')::numeric, 0),
              COALESCE((p_invoice_payload->>''vat'')::numeric, 0),
              COALESCE((p_invoice_payload->>''wht'')::numeric, 0),
              p_invoice_payload->>''custom_fields'',
              p_invoice_payload->>''work_duration'',
              COALESCE((p_invoice_payload->>''subtotal'')::numeric, 0),
              COALESCE((p_invoice_payload->>''install_rate_total'')::numeric, 0),
              COALESCE((p_invoice_payload->>''total'')::numeric, 0),
              p_invoice_payload->>''amount_in_words'',
              NULLIF(p_invoice_payload->>''operation_id'', '''');

            -- Insert items
            FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, ''[]''::jsonb)) LOOP
              EXECUTE format(
                $q2$
                INSERT INTO %%I.invoice_items (
                  invoice_id, description, quantity, unit_price, unit,
                  row_type, sort_order, total, sub_description, make,
                  discount_rate, install_rate, install_rate_taxable,
                  vat_rate, group_id, group_name, item_id, custom_data
                )
                VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15, $16, $17, $18
                )
                $q2$,
                v_schema
              )
              USING
                v_invoice_id,
                v_item->>''description'',
                COALESCE((v_item->>''quantity'')::numeric, 1),
                COALESCE((v_item->>''unit_price'')::numeric, 0),
                v_item->>''unit'',
                COALESCE(v_item->>''row_type'', ''standard''),
                COALESCE((v_item->>''sort_order'')::integer, v_count),
                COALESCE((v_item->>''total'')::numeric, 0),
                v_item->>''sub_description'',
                v_item->>''make'',
                NULLIF(v_item->>''discount_rate'', '''')::numeric,
                NULLIF(v_item->>''install_rate'', '''')::numeric,
                COALESCE((v_item->>''install_rate_taxable'')::boolean, false),
                NULLIF(v_item->>''vat_rate'', '''')::numeric,
                NULLIF(v_item->>''group_id'', '''')::uuid,
                v_item->>''group_name'',
                NULLIF(v_item->>''item_id'', '''')::uuid,
                COALESCE(v_item->''custom_data'', ''{}''::jsonb);
              v_count := v_count + 1;
            END LOOP;

          ELSE
            -- Update mode: preserve operation_id (do not change it on edit)
            EXECUTE format(
              $q$
              UPDATE %%I.invoices SET
                po_number = $2, invoice_title = $3, client_name = $4,
                project_id = NULLIF($5, '''')::uuid, issue_date = ($6)::date,
                due_date = $7, status = $8, payment_terms = $9, notes = $10,
                terms = $11, workmanship = $12, transportation = $13,
                shipping = $14, discount = $15, vat = $16, wht = $17,
                subtotal = $18, install_rate_total = $19, total = $20,
                amount_in_words = $21, custom_fields = $22,
                work_duration = $23, updated_at = now()
              WHERE id = $1
              RETURNING id
              $q$,
              v_schema
            )
            INTO v_invoice_id
            USING
              (p_invoice_payload->>''id'')::uuid,
              p_invoice_payload->>''po_number'',
              p_invoice_payload->>''invoice_title'',
              p_invoice_payload->>''client_name'',
              p_invoice_payload->>''project_id'',
              p_invoice_payload->>''issue_date'',
              p_invoice_payload->>''due_date'',
              COALESCE(p_invoice_payload->>''status'', ''unpaid''),
              p_invoice_payload->>''payment_terms'',
              p_invoice_payload->>''notes'',
              p_invoice_payload->>''terms'',
              COALESCE((p_invoice_payload->>''workmanship'')::numeric, 0),
              COALESCE((p_invoice_payload->>''transportation'')::numeric, 0),
              COALESCE((p_invoice_payload->>''shipping'')::numeric, 0),
              COALESCE((p_invoice_payload->>''discount'')::numeric, 0),
              COALESCE((p_invoice_payload->>''vat'')::numeric, 0),
              COALESCE((p_invoice_payload->>''wht'')::numeric, 0),
              COALESCE((p_invoice_payload->>''subtotal'')::numeric, 0),
              COALESCE((p_invoice_payload->>''install_rate_total'')::numeric, 0),
              COALESCE((p_invoice_payload->>''total'')::numeric, 0),
              p_invoice_payload->>''amount_in_words'',
              p_invoice_payload->>''custom_fields'',
              p_invoice_payload->>''work_duration'';

            -- Replace items on update
            IF v_invoice_id IS NOT NULL THEN
              EXECUTE format('DELETE FROM %%I.invoice_items WHERE invoice_id = $1', v_schema)
                USING v_invoice_id;
              FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, ''[]''::jsonb)) LOOP
                EXECUTE format(
                  $q3$
                  INSERT INTO %%I.invoice_items (
                    invoice_id, description, quantity, unit_price, unit,
                    row_type, sort_order, total, sub_description, make,
                    discount_rate, install_rate, install_rate_taxable,
                    vat_rate, group_id, group_name, item_id, custom_data
                  )
                  VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18
                  )
                  $q3$,
                  v_schema
                )
                USING
                  v_invoice_id,
                  v_item->>''description'',
                  COALESCE((v_item->>''quantity'')::numeric, 1),
                  COALESCE((v_item->>''unit_price'')::numeric, 0),
                  v_item->>''unit'',
                  COALESCE(v_item->>''row_type'', ''standard''),
                  COALESCE((v_item->>''sort_order'')::integer, v_count),
                  COALESCE((v_item->>''total'')::numeric, 0),
                  v_item->>''sub_description'',
                  v_item->>''make'',
                  NULLIF(v_item->>''discount_rate'', '''')::numeric,
                  NULLIF(v_item->>''install_rate'', '''')::numeric,
                  COALESCE((v_item->>''install_rate_taxable'')::boolean, false),
                  NULLIF(v_item->>''vat_rate'', '''')::numeric,
                  NULLIF(v_item->>''group_id'', '''')::uuid,
                  v_item->>''group_name'',
                  NULLIF(v_item->>''item_id'', '''')::uuid,
                  COALESCE(v_item->''custom_data'', ''{}''::jsonb);
                v_count := v_count + 1;
              END LOOP;
            END IF;
          END IF;

          -- Return the saved row as jsonb
          EXECUTE format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.invoices WHERE id = $1) t', v_schema)
            INTO v_row
            USING v_invoice_id;

          RETURN jsonb_build_object('invoice', v_row, 'item_count', v_count);
        END;
        $function$
      ', v_schema, v_schema);
    END IF;

    -- Verify the quotations table has operation_id before installing the RPC
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_schema
        AND table_name = 'quotations'
        AND column_name = 'operation_id'
    ) THEN
      -- save_quotation_with_items_transaction: add operation_id to the INSERT
      EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.save_quotation_with_items_transaction(
            p_entity_id uuid,
            p_quotation_payload jsonb,
            p_items jsonb DEFAULT ''[]''::jsonb,
            p_mode text DEFAULT ''create''::text,
            p_cps_feedback jsonb DEFAULT NULL::jsonb
        )
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path TO ''public''
        AS $function$
        declare
          v_schema text;
          v_quotation_id uuid;
          v_row jsonb;
          v_item jsonb;
          v_count integer := 0;
        begin
          v_schema := %L;

          IF p_mode = ''create'' THEN
            IF NOT public.has_entity_permission(p_entity_id, auth.uid(), ''quotation'', ''create'') THEN
              RAISE EXCEPTION ''Insufficient permissions: quotation/create required''
                USING ERRCODE = ''insufficient_privilege'';
            END IF;
          ELSE
            IF NOT public.has_entity_permission(p_entity_id, auth.uid(), ''quotation'', ''edit'') THEN
              RAISE EXCEPTION ''Insufficient permissions: quotation/edit required''
                USING ERRCODE = ''insufficient_privilege'';
            END IF;
          END IF;

          IF p_mode = ''create'' THEN
            EXECUTE format(
              $q$
              INSERT INTO %%I.quotations (
                  quotation_number, po_number, quotation_title, client_id,
                  client_name, project_id, issue_date, valid_until, status,
                  notes, terms, workmanship, transportation, shipping,
                  discount, vat, wht, subtotal, install_rate_total, total,
                  amount_in_words, custom_fields, operation_id
              )
              VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                  $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
              )
              RETURNING id
              $q$,
              v_schema
            )
            INTO v_quotation_id
            USING
              p_quotation_payload->>''quotation_number'',
              p_quotation_payload->>''po_number'',
              p_quotation_payload->>''quotation_title'',
              NULLIF(p_quotation_payload->>''client_id'', '''')::uuid,
              p_quotation_payload->>''client_name'',
              NULLIF(p_quotation_payload->>''project_id'', '''')::uuid,
              (p_quotation_payload->>''issue_date'')::date,
              (p_quotation_payload->>''valid_until'')::date,
              COALESCE(p_quotation_payload->>''status'', ''open''),
              p_quotation_payload->>''notes'',
              p_quotation_payload->>''terms'',
              COALESCE((p_quotation_payload->>''workmanship'')::numeric, 0),
              COALESCE((p_quotation_payload->>''transportation'')::numeric, 0),
              COALESCE((p_quotation_payload->>''shipping'')::numeric, 0),
              COALESCE((p_quotation_payload->>''discount'')::numeric, 0),
              COALESCE((p_quotation_payload->>''vat'')::numeric, 0),
              COALESCE((p_quotation_payload->>''wht'')::numeric, 0),
              COALESCE((p_quotation_payload->>''subtotal'')::numeric, 0),
              COALESCE((p_quotation_payload->>''install_rate_total'')::numeric, 0),
              COALESCE((p_quotation_payload->>''total'')::numeric, 0),
              p_quotation_payload->>''amount_in_words'',
              COALESCE(NULLIF(p_quotation_payload->>''custom_fields'', ''''), ''{}'')::jsonb,
              NULLIF(p_quotation_payload->>''operation_id'', '''');

            -- Insert items
            FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, ''[]''::jsonb)) LOOP
              EXECUTE format(
                $q2$
                INSERT INTO %%I.quotation_items (
                  quotation_id, description, quantity, unit_price, unit,
                  row_type, sort_order, total, sub_description, make,
                  discount_rate, install_rate, install_rate_taxable,
                  vat_rate, group_id, group_name, item_id, custom_data
                )
                VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15, $16, $17, $18
                )
                $q2$,
                v_schema
              )
              USING
                v_quotation_id,
                v_item->>''description'',
                COALESCE((v_item->>''quantity'')::numeric, 1),
                COALESCE((v_item->>''unit_price'')::numeric, 0),
                v_item->>''unit'',
                COALESCE(v_item->>''row_type'', ''standard''),
                COALESCE((v_item->>''sort_order'')::integer, v_count),
                COALESCE((v_item->>''total'')::numeric, 0),
                v_item->>''sub_description'',
                v_item->>''make'',
                NULLIF(v_item->>''discount_rate'', '''')::numeric,
                NULLIF(v_item->>''install_rate'', '''')::numeric,
                COALESCE((v_item->>''install_rate_taxable'')::boolean, false),
                NULLIF(v_item->>''vat_rate'', '''')::numeric,
                NULLIF(v_item->>''group_id'', '''')::uuid,
                v_item->>''group_name'',
                NULLIF(v_item->>''item_id'', '''')::uuid,
                COALESCE(v_item->''custom_data'', ''{}''::jsonb);
              v_count := v_count + 1;
            END LOOP;

          ELSE
            -- Update mode: preserve operation_id (do not change it on edit)
            EXECUTE format(
              $q$
              UPDATE %%I.quotations SET
                po_number = $2, quotation_title = $3, client_name = $4,
                project_id = NULLIF($5, '''')::uuid, issue_date = ($6)::date,
                valid_until = ($7)::date, status = $8, notes = $9,
                terms = $10, workmanship = $11, transportation = $12,
                shipping = $13, discount = $14, vat = $15, wht = $16,
                subtotal = $17, install_rate_total = $18, total = $19,
                amount_in_words = $20, custom_fields = $21, updated_at = now()
              WHERE id = $1
              RETURNING id
              $q$,
              v_schema
            )
            INTO v_quotation_id
            USING
              (p_quotation_payload->>''id'')::uuid,
              p_quotation_payload->>''po_number'',
              p_quotation_payload->>''quotation_title'',
              p_quotation_payload->>''client_name'',
              p_quotation_payload->>''project_id'',
              p_quotation_payload->>''issue_date'',
              p_quotation_payload->>''valid_until'',
              COALESCE(p_quotation_payload->>''status'', ''open''),
              p_quotation_payload->>''notes'',
              p_quotation_payload->>''terms'',
              COALESCE((p_quotation_payload->>''workmanship'')::numeric, 0),
              COALESCE((p_quotation_payload->>''transportation'')::numeric, 0),
              COALESCE((p_quotation_payload->>''shipping'')::numeric, 0),
              COALESCE((p_quotation_payload->>''discount'')::numeric, 0),
              COALESCE((p_quotation_payload->>''vat'')::numeric, 0),
              COALESCE((p_quotation_payload->>''wht'')::numeric, 0),
              COALESCE((p_quotation_payload->>''subtotal'')::numeric, 0),
              COALESCE((p_quotation_payload->>''install_rate_total'')::numeric, 0),
              COALESCE((p_quotation_payload->>''total'')::numeric, 0),
              p_quotation_payload->>''amount_in_words'',
              COALESCE(NULLIF(p_quotation_payload->>''custom_fields'', ''''), ''{}'')::jsonb;

            -- Replace items on update
            IF v_quotation_id IS NOT NULL THEN
              EXECUTE format('DELETE FROM %%I.quotation_items WHERE quotation_id = $1', v_schema)
                USING v_quotation_id;
              FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, ''[]''::jsonb)) LOOP
                EXECUTE format(
                  $q3$
                  INSERT INTO %%I.quotation_items (
                    quotation_id, description, quantity, unit_price, unit,
                    row_type, sort_order, total, sub_description, make,
                    discount_rate, install_rate, install_rate_taxable,
                    vat_rate, group_id, group_name, item_id, custom_data
                  )
                  VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18
                  )
                  $q3$,
                  v_schema
                )
                USING
                  v_quotation_id,
                  v_item->>''description'',
                  COALESCE((v_item->>''quantity'')::numeric, 1),
                  COALESCE((v_item->>''unit_price'')::numeric, 0),
                  v_item->>''unit'',
                  COALESCE(v_item->>''row_type'', ''standard''),
                  COALESCE((v_item->>''sort_order'')::integer, v_count),
                  COALESCE((v_item->>''total'')::numeric, 0),
                  v_item->>''sub_description'',
                  v_item->>''make'',
                  NULLIF(v_item->>''discount_rate'', '''')::numeric,
                  NULLIF(v_item->>''install_rate'', '''')::numeric,
                  COALESCE((v_item->>''install_rate_taxable'')::boolean, false),
                  NULLIF(v_item->>''vat_rate'', '''')::numeric,
                  NULLIF(v_item->>''group_id'', '''')::uuid,
                  v_item->>''group_name'',
                  NULLIF(v_item->>''item_id'', '''')::uuid,
                  COALESCE(v_item->''custom_data'', ''{}''::jsonb);
                v_count := v_count + 1;
              END LOOP;
            END IF;
          END IF;

          -- Return the saved row as jsonb
          EXECUTE format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.quotations WHERE id = $1) t', v_schema)
            INTO v_row
            USING v_quotation_id;

          RETURN jsonb_build_object('quotation', v_row, 'item_count', v_count);
        END;
        $function$
      ', v_schema, v_schema);
    END IF;

  END LOOP;

END $rpc_update$;

-- ============================================================
-- 4. Notify PostgREST to reload the schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
