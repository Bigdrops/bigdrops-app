-- ============================================================
-- RENAME: BOQ domain to CPS across every tenant schema
-- ============================================================
-- Objective: remove the legacy BOQ names from the database.
--
-- Name map (CPS short names):
--   boqs          -> cps_sheets
--   boq_rows      -> cps_rows
--   boq_number    -> cps_number
--   boq_id        -> cps_sheet_id
--   source_boq_id -> source_cps_id
--
-- This migration also renames the primary keys, foreign keys, indexes, and
-- RLS policies that carry the old names. It moves the persisted settings
-- prefix key, the activity event entity type, and the workspace permission
-- resource id.
--
-- The document prefix VALUE stays unchanged, for example 'BOQ'. Therefore
-- existing document numbers and the automatic cursor families do not change.
--
-- Every step is guarded. The migration is safe to run twice.
-- ============================================================

-- ============================================================
-- 1. Tenant schemas: columns, tables, constraints, indexes, policies.
-- ============================================================
DO $do$
DECLARE
  v_schema record;
  v_row record;
  v_new text;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
       OR EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.relnamespace = n.oid AND c.relkind = 'r' AND c.relname = 'boqs'
          )
    ORDER BY n.nspname
  LOOP
    -- 1a. Columns. Rename the columns before the tables, so the guards stay simple.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_schema.schemaname AND table_name = 'boqs' AND column_name = 'boq_number'
    ) THEN
      EXECUTE format('ALTER TABLE %I.boqs RENAME COLUMN boq_number TO cps_number', v_schema.schemaname);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_schema.schemaname AND table_name = 'boq_rows' AND column_name = 'boq_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I.boq_rows RENAME COLUMN boq_id TO cps_sheet_id', v_schema.schemaname);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_schema.schemaname AND table_name = 'quotations' AND column_name = 'source_boq_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I.quotations RENAME COLUMN source_boq_id TO source_cps_id', v_schema.schemaname);
    END IF;

    -- 1b. Tables. Postgres rewrites foreign keys and views automatically.
    IF to_regclass(format('%I.boqs', v_schema.schemaname)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I.boqs RENAME TO cps_sheets', v_schema.schemaname);
      RAISE NOTICE 'Renamed %.boqs to cps_sheets', v_schema.schemaname;
    END IF;

    IF to_regclass(format('%I.boq_rows', v_schema.schemaname)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I.boq_rows RENAME TO cps_rows', v_schema.schemaname);
      RAISE NOTICE 'Renamed %.boq_rows to cps_rows', v_schema.schemaname;
    END IF;

    -- 1c. Constraints. Renaming a constraint also renames its backing index.
    FOR v_row IN
      SELECT c.relname AS relname, con.conname AS conname
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND con.conname LIKE '%boq%'
    LOOP
      v_new := replace(replace(replace(replace(replace(v_row.conname,
        'boq_rows', 'cps_rows'),
        'source_boq_id', 'source_cps_id'),
        'boqs', 'cps_sheets'),
        'boq_id', 'cps_sheet_id'),
        'boq', 'cps');
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
        v_schema.schemaname, v_row.relname, v_row.conname, v_new
      );
    END LOOP;

    -- 1d. Standalone indexes that no constraint owns.
    FOR v_row IN
      SELECT c.relname AS relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND c.relkind = 'i'
        AND c.relname LIKE '%boq%'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = c.oid)
    LOOP
      v_new := replace(replace(replace(replace(replace(v_row.relname,
        'boq_rows', 'cps_rows'),
        'source_boq_id', 'source_cps_id'),
        'boqs', 'cps_sheets'),
        'boq_id', 'cps_sheet_id'),
        'boq', 'cps');
      EXECUTE format(
        'ALTER INDEX %I.%I RENAME TO %I',
        v_schema.schemaname, v_row.relname, v_new
      );
    END LOOP;

    -- 1e. Row level security policies.
    FOR v_row IN
      SELECT pol.polname AS polname, c.relname AS relname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND pol.polname LIKE '%boq%'
    LOOP
      v_new := replace(replace(replace(replace(replace(v_row.polname,
        'boq_rows', 'cps_rows'),
        'source_boq_id', 'source_cps_id'),
        'boqs', 'cps_sheets'),
        'boq_id', 'cps_sheet_id'),
        'boq', 'cps');
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I RENAME TO %I',
        v_row.polname, v_schema.schemaname, v_row.relname, v_new
      );
    END LOOP;
  END LOOP;
END $do$;

-- ============================================================
-- 2. Document prefix key: boq -> cps_sheets.
-- ============================================================
-- The stored prefix VALUE is copied without change, so document numbers and
-- the automatic cursor families stay the same.
DO $do$
DECLARE
  v_schema record;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'tenant_master_template' OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    IF to_regclass(format('%I.settings', v_schema.schemaname)) IS NOT NULL THEN
      EXECUTE format($fmt$
        UPDATE %I.settings
        SET document_prefixes = (document_prefixes - 'boq')
              || jsonb_build_object('cps_sheets', document_prefixes -> 'boq')
        WHERE document_prefixes ? 'boq'
      $fmt$, v_schema.schemaname);

      IF EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema.schemaname
          AND c.relname = 'settings'
          AND con.conname = 'check_document_prefixes_format'
      ) THEN
        EXECUTE format('ALTER TABLE %I.settings DROP CONSTRAINT check_document_prefixes_format', v_schema.schemaname);
        EXECUTE format($fmt$
          ALTER TABLE %I.settings ADD CONSTRAINT check_document_prefixes_format CHECK (
            document_prefixes IS NULL OR (
              jsonb_typeof(document_prefixes) = 'object'
              AND (document_prefixes ->> 'waybill') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'invoice') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'cps_sheets') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'rfq') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'quotation') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'project') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'csr') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'receipt') ~ '^[A-Z0-9]{2,6}$'
            )
          )
        $fmt$, v_schema.schemaname);
      END IF;
    END IF;
  END LOOP;
END $do$;

-- ============================================================
-- 3. Activity event entity type: boq -> cps_sheets.
-- ============================================================
DO $do$
DECLARE
  v_schema record;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'tenant_master_template' OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    IF to_regclass(format('%I.activity_events', v_schema.schemaname)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM pg_constraint con
         JOIN pg_class c ON c.oid = con.conrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = v_schema.schemaname
           AND c.relname = 'activity_events'
           AND con.conname = 'activity_events_entity_type_check'
       ) THEN
      -- Drop first. Existing rows still hold the old value.
      EXECUTE format('ALTER TABLE %I.activity_events DROP CONSTRAINT activity_events_entity_type_check', v_schema.schemaname);
      EXECUTE format($fmt$UPDATE %I.activity_events SET entity_type = 'cps_sheets' WHERE entity_type = 'boq'$fmt$, v_schema.schemaname);
      EXECUTE format($fmt$
        ALTER TABLE %I.activity_events ADD CONSTRAINT activity_events_entity_type_check
          CHECK (entity_type = ANY (ARRAY['invoice','quotation','project','receipt','waybill','csr','rfq','cps_sheets']))
      $fmt$, v_schema.schemaname);
    END IF;
  END LOOP;
END $do$;

-- ============================================================
-- 4. Workspace permission resource id: boq -> cps_sheets.
-- ============================================================
-- The three helper functions hard code the old names. Read each definition
-- from the catalog and re-create it with the new names, so the rest of the
-- body stays byte for byte identical.
DO $do$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = '_perm_pair_is_canonical';
  IF v_def IS NOT NULL THEN
    v_def := replace(v_def, '''boq''', '''cps_sheets''');
    EXECUTE v_def;
  END IF;

  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = '_prov_table_to_resource';
  IF v_def IS NOT NULL THEN
    v_def := replace(v_def, '''boqs''', '''cps_sheets''');
    v_def := replace(v_def, '''boq_rows''', '''cps_rows''');
    v_def := replace(v_def, '''boq''', '''cps_sheets''');
    EXECUTE v_def;
  END IF;

  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = '_prov_get_template_tables';
  IF v_def IS NOT NULL THEN
    v_def := replace(v_def, '''boqs''', '''cps_sheets''');
    v_def := replace(v_def, '''boq_rows''', '''cps_rows''');
    EXECUTE v_def;
  END IF;
END $do$;

-- Stored permission rows in the workspace layer.
UPDATE public.permission_template_items SET resource = 'cps_sheets' WHERE resource = 'boq';
UPDATE public.entity_permissions SET resource = 'cps_sheets' WHERE resource = 'boq';
UPDATE public.workspace_invitation_entity_grants SET resource = 'cps_sheets' WHERE resource = 'boq';

-- PostgREST caches the exposed schema shape. Reload it after the table renames.
NOTIFY pgrst, 'reload schema';
