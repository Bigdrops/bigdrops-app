-- ============================================================
-- CPS CONVERSION CHAIN IDENTITY + AUDIT METADATA LOCATION
-- ============================================================
-- Phase 2.5 — integrity hardening for the CPS downstream-feedback contract.
--
-- WHAT THIS MIGRATION ADDS
--
-- 1. audit_logs.metadata jsonb
--    A first-class location for structured audit metadata, replacing the
--    Phase 1 bridge that hid the CPS payload inside audit_logs.changes under
--    the reserved key '_cps'. Existing rows keep their '_cps' change entry and
--    stay readable: the formatter reads `metadata` first and falls back to the
--    legacy change entry. New CPS events write `metadata` only, so the same
--    authoritative payload never lives in two places.
--
-- 2. quotations.conversion_chain_id uuid
--    Stable identity for one CPS -> Quotation conversion chain. A single CPS
--    document can be converted more than once; each conversion gets its own
--    chain so downstream lifecycle events correlate to the right chain instead
--    of to the CPS document as a whole. The CPS document id stays separate
--    (quotations.source_cps_id) and is never overloaded with chain identity.
--
-- 3. invoices.conversion_chain_id uuid
--    The same chain id, carried onto the Invoice, so a downstream event can
--    name its chain without walking back through documents.
--
-- 4. invoices.source_quotation_id uuid  (+ UNIQUE partial index)
--    The Quotation document an Invoice was converted from, persisted
--    explicitly. This is document-level ancestry AND the database-level
--    idempotency guard:
--
--        ONE QUOTATION CONVERSION -> AT MOST ONE ACTIVE INVOICE
--
--    A retried conversion can therefore never create a second competing
--    Invoice, and no later conversion attempt can silently replace the
--    Invoice that already owns downstream feedback authority. The guard is
--    enforced by the database, not by UI state or document status text.
--
-- NO BACKFILL
--    Historical quotations/invoices have no chain id and no source_quotation_id.
--    They stay NULL ("chain unavailable"). No heuristic backfill is performed.
--
-- SAFETY
--    Adds nullable columns, one defaulted jsonb column, and indexes. No data
--    rewrite, no function change. Every step is guarded and re-runnable.
--    The loop covers public, tenant_master_template, and every existing
--    entity_% tenant schema, so future tenants inherit the definition.
-- ============================================================

DO $do$
DECLARE
  v_schema record;
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
    -- 1. Structured audit metadata
    -- ------------------------------------------------------------
    IF to_regclass(format('%I.audit_logs', v_schema.schemaname)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'audit_logs' AND column_name = 'metadata'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.audit_logs ADD COLUMN metadata jsonb NOT NULL DEFAULT ''{}''::jsonb',
          v_schema.schemaname
        );
      END IF;
    END IF;

    -- ------------------------------------------------------------
    -- 2. Conversion chain identity on the CPS conversion target
    -- ------------------------------------------------------------
    IF to_regclass(format('%I.quotations', v_schema.schemaname)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'quotations' AND column_name = 'conversion_chain_id'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.quotations ADD COLUMN conversion_chain_id uuid',
          v_schema.schemaname
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema.schemaname
          AND c.relname = 'quotations_conversion_chain_idx'
      ) THEN
        EXECUTE format(
          'CREATE INDEX quotations_conversion_chain_idx ON %I.quotations (conversion_chain_id) WHERE conversion_chain_id IS NOT NULL',
          v_schema.schemaname
        );
      END IF;
    END IF;

    -- ------------------------------------------------------------
    -- 3. Chain identity + explicit source document on the Invoice
    -- ------------------------------------------------------------
    IF to_regclass(format('%I.invoices', v_schema.schemaname)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'invoices' AND column_name = 'conversion_chain_id'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.invoices ADD COLUMN conversion_chain_id uuid',
          v_schema.schemaname
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = v_schema.schemaname
          AND table_name = 'invoices' AND column_name = 'source_quotation_id'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.invoices ADD COLUMN source_quotation_id uuid',
          v_schema.schemaname
        );
      END IF;

      -- Idempotency guard: at most one Invoice per Quotation conversion.
      -- Partial, so every non-converted invoice (NULL source) stays valid.
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema.schemaname
          AND c.relname = 'invoices_source_quotation_uniq'
      ) THEN
        EXECUTE format(
          'CREATE UNIQUE INDEX invoices_source_quotation_uniq ON %I.invoices (source_quotation_id) WHERE source_quotation_id IS NOT NULL',
          v_schema.schemaname
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema.schemaname
          AND c.relname = 'invoices_conversion_chain_idx'
      ) THEN
        EXECUTE format(
          'CREATE INDEX invoices_conversion_chain_idx ON %I.invoices (conversion_chain_id) WHERE conversion_chain_id IS NOT NULL',
          v_schema.schemaname
        );
      END IF;
    END IF;
  END LOOP;
END
$do$;

-- ------------------------------------------------------------
-- 4. Column documentation (best effort; schema-qualified)
-- ------------------------------------------------------------
DO $do$
DECLARE
  v_schema record;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'public'
       OR n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    IF to_regclass(format('%I.audit_logs', v_schema.schemaname)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = v_schema.schemaname
           AND table_name = 'audit_logs' AND column_name = 'metadata'
       ) THEN
      EXECUTE format(
        'COMMENT ON COLUMN %I.audit_logs.metadata IS %L',
        v_schema.schemaname,
        'Structured audit metadata. For CPS events this holds the CPS payload (event, actorType, chainId, parentEventId, sourceContext, related, summary, detail, changeGroups). Legacy CPS rows keep their payload inside changes under the reserved key _cps; readers must fall back to it.'
      );
    END IF;

    IF to_regclass(format('%I.quotations', v_schema.schemaname)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = v_schema.schemaname
           AND table_name = 'quotations' AND column_name = 'conversion_chain_id'
       ) THEN
      EXECUTE format(
        'COMMENT ON COLUMN %I.quotations.conversion_chain_id IS %L',
        v_schema.schemaname,
        'Stable id for one CPS -> Quotation -> Invoice conversion chain. Distinct from source_cps_id: one CPS document may own several chains. NULL for quotations with no CPS ancestry and for legacy rows.'
      );
    END IF;

    IF to_regclass(format('%I.invoices', v_schema.schemaname)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = v_schema.schemaname
           AND table_name = 'invoices' AND column_name = 'source_quotation_id'
       ) THEN
      EXECUTE format(
        'COMMENT ON COLUMN %I.invoices.source_quotation_id IS %L',
        v_schema.schemaname,
        'Quotation this Invoice was converted from. UNIQUE per tenant: one Quotation conversion can own at most one active Invoice, which makes conversion retries idempotent at the database level.'
      );
      EXECUTE format(
        'COMMENT ON COLUMN %I.invoices.conversion_chain_id IS %L',
        v_schema.schemaname,
        'Conversion chain id carried from the source Quotation, so downstream events can name their chain directly.'
      );
    END IF;
  END LOOP;
END
$do$;
