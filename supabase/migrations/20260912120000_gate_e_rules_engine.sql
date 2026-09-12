-- Gate E: Tax Rules Engine
-- Adds immutability trigger + unique constraint on tax_rule_versions.
-- Seed data for NTA 2025 statutory rules is in a separate migration.

-- ── Function: prevent UPDATE/DELETE on tax_rule_versions ─────────────
-- Rule versions are append-only. Once published, they cannot be modified.
-- This protects the frozen rule snapshots that Gate E computation depends on.

CREATE OR REPLACE FUNCTION public.tax_rule_version_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'ERRCODE: tax_rule_version_immutability — tax_rule_versions is append-only; UPDATE is not permitted'
            USING ERRCODE = '25001';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'ERRCODE: tax_rule_version_immutability — tax_rule_versions is append-only; DELETE is not permitted'
            USING ERRCODE = '25001';
    END IF;
    RETURN NULL;
END;
$function$;

-- ── Function: install tax_rule_version trigger per entity schema ─────

CREATE OR REPLACE FUNCTION public._prov_install_tax_rule_version_guard(p_schema text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    EXECUTE format(
        'CREATE TRIGGER tax_rule_version_guard '
        'AFTER UPDATE OR DELETE ON %I.tax_rule_versions '
        'FOR EACH ROW EXECUTE FUNCTION public.tax_rule_version_guard()',
        p_schema
    );
END;
$function$;

-- ── Unique constraint: one active rule version per type per date ─────
-- Prevents duplicate effective rules for the same type and effective_date
-- within an entity schema. Uses a partial unique index to allow multiple
-- historical versions with different effective_dates.

CREATE OR REPLACE FUNCTION public._prov_install_tax_rule_version_unique(p_schema text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rule_versions_type_date '
        'ON %I.tax_rule_versions (rule_type, effective_date)',
        p_schema
    );
END;
$function$;

-- ── Backfill: install trigger + index on existing entity schemas ─────

DO $block$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT n.nspname
        FROM pg_namespace n
        JOIN pg_class c ON c.relnamespace = n.oid
        WHERE c.relname = 'tax_rule_versions'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n.nspname
    LOOP
        PERFORM public._prov_install_tax_rule_version_guard(v_schema);
        PERFORM public._prov_install_tax_rule_version_unique(v_schema);
    END LOOP;
END;
$block$;
