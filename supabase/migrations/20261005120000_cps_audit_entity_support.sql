-- ============================================================
-- CPS AUDIT FOUNDATION — entity type and action support
-- ============================================================
-- Objective: allow Cost & Pricing Sheet lifecycle and field-level audit
-- records in audit_logs.
--
-- Context:
--   * audit_logs.entity_type currently allows only
--     ('invoice', 'quotation', 'project').
--   * audit_logs.action currently allows only
--     ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LINK', 'UNLINK').
--   * The CPS form already calls record_audit_log with entity_type
--     'cps_sheets'. That call fails the entity_type check, so CPS audit
--     writes are currently lost silently.
--
-- This migration only relaxes the two check constraints. It adds no table,
-- no column, and no function. Existing rows stay valid because the new
-- allowed sets are supersets of the old sets.
--
-- The loop covers public, tenant_master_template, and every existing
-- entity_% tenant schema. tenant_master_template carries the definition
-- that future tenant schemas inherit, so future tenants stay correct.
--
-- Safe to run more than once.
-- ============================================================

DO $do$
DECLARE
  v_schema record;
  v_entity_check text := $chk$CHECK (entity_type = ANY (ARRAY[
    'invoice'::text,
    'quotation'::text,
    'project'::text,
    'receipt'::text,
    'waybill'::text,
    'csr'::text,
    'rfq'::text,
    'letter'::text,
    'cps_sheets'::text
  ]))$chk$;
  v_action_check text := $chk$CHECK (action = ANY (ARRAY[
    'CREATE'::text,
    'UPDATE'::text,
    'DELETE'::text,
    'STATUS_CHANGE'::text,
    'LINK'::text,
    'UNLINK'::text,
    'ARCHIVE'::text,
    'UNARCHIVE'::text,
    'CONVERT'::text,
    'DUPLICATE'::text
  ]))$chk$;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'public'
       OR n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    -- Skip schemas that have no audit_logs table.
    IF to_regclass(format('%I.audit_logs', v_schema.schemaname)) IS NULL THEN
      CONTINUE;
    END IF;

    -- 1. Entity type: add cps_sheets and the other document families.
    IF EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND c.relname = 'audit_logs'
        AND con.conname = 'audit_logs_entity_type_check'
    ) THEN
      EXECUTE format('ALTER TABLE %I.audit_logs DROP CONSTRAINT audit_logs_entity_type_check', v_schema.schemaname);
    END IF;
    EXECUTE format('ALTER TABLE %I.audit_logs ADD CONSTRAINT audit_logs_entity_type_check %s', v_schema.schemaname, v_entity_check);

    -- 2. Action: add ARCHIVE, UNARCHIVE, CONVERT, DUPLICATE.
    IF EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND c.relname = 'audit_logs'
        AND con.conname = 'audit_logs_action_check'
    ) THEN
      EXECUTE format('ALTER TABLE %I.audit_logs DROP CONSTRAINT audit_logs_action_check', v_schema.schemaname);
    END IF;
    EXECUTE format('ALTER TABLE %I.audit_logs ADD CONSTRAINT audit_logs_action_check %s', v_schema.schemaname, v_action_check);
  END LOOP;
END $do$;

-- PostgREST caches the exposed schema shape.
NOTIFY pgrst, 'reload schema';
