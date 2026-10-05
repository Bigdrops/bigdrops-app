-- ============================================================
-- CPS ROW-LEVEL LINEAGE + DOWNSTREAM FEEDBACK AUTHORITY
-- ============================================================
-- Objective (Phase 2): give every CPS-origin downstream item a stable,
-- explicit identity back to the exact CPS row it came from, and give each
-- CPS conversion chain exactly one active downstream feedback authority.
--
--   CPS row X -> Quotation item Y -> Invoice item Z
--
-- Identity is explicit and immutable. It never depends on description, row
-- position, quantity, unit, price, group, image, catalog item_id, or any
-- fuzzy matching.
--
-- WHAT THIS MIGRATION ADDS
--   quotation_items / invoice_items (uniform lineage contract on both item
--   tables so the single shared item serializer always round-trips lineage):
--     source_cps_id           uuid  -- originating Cost & Pricing Sheet
--     source_cps_row_id       uuid  -- originating cps_rows.id (item rows)
--     source_quotation_id     uuid  -- originating Quotation document
--     source_quotation_item_id uuid -- originating Quotation item row
--
--   quotations (the CPS conversion target owns the chain's authority state):
--     feedback_authority               text  -- 'quotation' | 'invoice' | null
--     feedback_authority_document_id   uuid
--     feedback_authority_updated_at    timestamptz
--
-- WHY NO FOREIGN KEYS
--   Lineage is provenance evidence, not ownership. Phase 2 deliberately does
--   NOT erase ancestry when the source row or source document disappears
--   (deleting a CPS deletes its cps_rows; duplicating/reverting replaces
--   documents). An FK here would either block those deletions (NO ACTION) or
--   silently destroy the ancestry (ON DELETE SET NULL). Both are wrong for a
--   provenance record, so lineage is intentionally unconstrained and Phase 3
--   handles a missing origin explicitly. Lookups stay fast through the
--   partial indexes created below.
--
-- WHY NO BACKFILL
--   Historical CPS-derived Quotations/Invoices predate this contract. They
--   are classified "lineage unavailable" and are left NULL on purpose. No
--   heuristic backfill is performed. Legacy rows stay lineage-null.
--
-- SAFETY
--   Adds columns, one check constraint, and indexes only. No table rewrite,
--   no data change, no function change. Every step is guarded, so the
--   migration is safe to run more than once.
--
--   The loop covers public, tenant_master_template, and every existing
--   entity_% tenant schema. tenant_master_template carries the definition
--   future tenant schemas inherit, so future tenants stay correct.
-- ============================================================

DO $do$
DECLARE
  v_schema record;
  v_table text;
  v_column text;
  v_type text;
  v_comment text;
  v_authority_check text := $chk$CHECK (feedback_authority IS NULL OR feedback_authority IN ('quotation', 'invoice'))$chk$;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'public'
       OR n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    -- ------------------------------------------------------------
    -- 1. Item-level CPS lineage on both line-item tables.
    -- ------------------------------------------------------------
    FOREACH v_table IN ARRAY ARRAY['quotation_items', 'invoice_items'] LOOP
      IF to_regclass(format('%I.%I', v_schema.schemaname, v_table)) IS NULL THEN
        CONTINUE;
      END IF;

      FOREACH v_column IN ARRAY ARRAY[
        'source_cps_id',
        'source_cps_row_id',
        'source_quotation_id',
        'source_quotation_item_id'
      ] LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = v_schema.schemaname
            AND table_name = v_table
            AND column_name = v_column
        ) THEN
          CONTINUE;
        END IF;

        EXECUTE format(
          'ALTER TABLE %I.%I ADD COLUMN %I uuid',
          v_schema.schemaname, v_table, v_column
        );
      END LOOP;

      -- Lineage lookups are always "find every downstream row for this CPS
      -- row/document". Only rows that actually carry lineage need indexing.
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema.schemaname
          AND c.relname = v_table || '_cps_lineage_idx'
      ) THEN
        EXECUTE format(
          'CREATE INDEX %I ON %I.%I (source_cps_id, source_cps_row_id) WHERE source_cps_id IS NOT NULL',
          v_table || '_cps_lineage_idx', v_schema.schemaname, v_table
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema.schemaname
          AND c.relname = v_table || '_source_quotation_idx'
      ) THEN
        EXECUTE format(
          'CREATE INDEX %I ON %I.%I (source_quotation_id) WHERE source_quotation_id IS NOT NULL',
          v_table || '_source_quotation_idx', v_schema.schemaname, v_table
        );
      END IF;
    END LOOP;

    -- ------------------------------------------------------------
    -- 2. Active downstream feedback authority on the conversion target.
    -- ------------------------------------------------------------
    IF to_regclass(format('%I.quotations', v_schema.schemaname)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'quotations' AND column_name = 'feedback_authority'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.quotations ADD COLUMN feedback_authority text',
          v_schema.schemaname
        );
        EXECUTE format(
          'ALTER TABLE %I.quotations ADD CONSTRAINT quotations_feedback_authority_check %s',
          v_schema.schemaname, v_authority_check
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'quotations' AND column_name = 'feedback_authority_document_id'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.quotations ADD COLUMN feedback_authority_document_id uuid',
          v_schema.schemaname
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'quotations' AND column_name = 'feedback_authority_updated_at'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.quotations ADD COLUMN feedback_authority_updated_at timestamptz',
          v_schema.schemaname
        );
      END IF;
    END IF;
  END LOOP;
END
$do$;

-- ------------------------------------------------------------
-- 3. Column documentation (best effort; schema-qualified).
-- ------------------------------------------------------------
DO $do$
DECLARE
  v_schema record;
  v_table text;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'public'
       OR n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    FOREACH v_table IN ARRAY ARRAY['quotation_items', 'invoice_items'] LOOP
      IF to_regclass(format('%I.%I', v_schema.schemaname, v_table)) IS NULL THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'COMMENT ON COLUMN %I.%I.source_cps_id IS %L',
        v_schema.schemaname, v_table,
        'Phase 2: originating Cost & Pricing Sheet id for a CPS-converted row. NULL for rows created directly in this document.'
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.%I.source_cps_row_id IS %L',
        v_schema.schemaname, v_table,
        'Phase 2: originating cps_rows.id. Set for CPS item rows only; NULL for group/section rows and for document-added rows. Provenance evidence: survives deletion of the source row.'
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.%I.source_quotation_id IS %L',
        v_schema.schemaname, v_table,
        'Phase 2: originating Quotation document id carried into the Invoice. NULL on quotation_items and on document-added rows.'
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.%I.source_quotation_item_id IS %L',
        v_schema.schemaname, v_table,
        'Phase 2: originating Quotation item row id carried into the Invoice. NULL on quotation_items and on document-added rows.'
      );
    END LOOP;

    IF to_regclass(format('%I.quotations', v_schema.schemaname)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = v_schema.schemaname
           AND table_name = 'quotations' AND column_name = 'feedback_authority'
       ) THEN
      EXECUTE format(
        'COMMENT ON COLUMN %I.quotations.feedback_authority IS %L',
        v_schema.schemaname,
        'Phase 2: active downstream feedback authority for this CPS conversion chain. ''quotation'' after CPS -> Quotation, ''invoice'' after Quotation -> Invoice. NULL when the quotation has no CPS ancestry.'
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.quotations.feedback_authority_document_id IS %L',
        v_schema.schemaname,
        'Phase 2: document id that currently owns feedback authority (the quotation itself, or the invoice that superseded it).'
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.quotations.feedback_authority_updated_at IS %L',
        v_schema.schemaname,
        'Phase 2: when the authority last moved. Authority never moves backwards on a stale edit.'
      );
    END IF;
  END LOOP;
END
$do$;
