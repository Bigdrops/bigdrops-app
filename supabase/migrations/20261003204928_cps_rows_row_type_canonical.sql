-- ============================================================
-- CPS rows: canonical row_type invariant (item, section)
-- ============================================================
-- Root cause: the hosted cps_rows_row_type_check still enforces the
-- May-2026 BOQ-era vocabulary ('section_header', 'item', 'option')
-- from the deleted remote schema dump
-- (20260519070601_remote_schema.sql). The BOQ -> CPS rename migration
-- renamed that constraint without changing its expression, while the
-- application domain canonically uses row_type 'item' for line items
-- and 'section' for group containers (see TableRowType in
-- src/domain/table-document/types.ts). Group rows therefore fail on
-- insert with: new row for relation "cps_rows" violates check
-- constraint "cps_rows_row_type_check".
--
-- This migration replaces the stale expression with the canonical
-- current contract. It does not translate groups to sections: the
-- application already emits 'section' for groups.
--
-- Data evidence (2026-10-03, all entity schemas): the only stored
-- cps_rows row carries row_type 'item'. No 'section_header' or
-- 'option' values exist. The migration still asserts this before
-- replacing the invariant, so unexpected legacy data fails loudly
-- instead of being silently accepted.
--
-- Guarded and rerunnable. Covers tenant_master_template and every
-- entity_* schema that already migrated boq_rows -> cps_rows.
-- ============================================================

DO $do$
DECLARE
  v_schema record;
  v_bad_count integer;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    IF to_regclass(format('%I.cps_rows', v_schema.schemaname)) IS NULL THEN
      CONTINUE;
    END IF;

    -- Refuse to narrow the invariant while unexpected values exist.
    EXECUTE format(
      'SELECT count(*) FROM %I.cps_rows WHERE row_type NOT IN (''item'', ''section'')',
      v_schema.schemaname
    ) INTO v_bad_count;
    IF v_bad_count > 0 THEN
      RAISE EXCEPTION 'cps_rows in schema % holds % row(s) outside the canonical (item, section) contract',
        v_schema.schemaname, v_bad_count;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.cps_rows DROP CONSTRAINT IF EXISTS cps_rows_row_type_check',
      v_schema.schemaname
    );
    EXECUTE format(
      'ALTER TABLE %I.cps_rows DROP CONSTRAINT IF EXISTS boq_rows_row_type_check',
      v_schema.schemaname
    );
    EXECUTE format(
      'ALTER TABLE %I.cps_rows ADD CONSTRAINT cps_rows_row_type_check CHECK (row_type = ANY (ARRAY[''item''::text, ''section''::text]))',
      v_schema.schemaname
    );
  END LOOP;
END $do$;

-- PostgREST caches the exposed schema shape. Reload it after the change.
NOTIFY pgrst, 'reload schema';
