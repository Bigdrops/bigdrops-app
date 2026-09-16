-- ============================================================
-- FIX: Expand _prov_install_triggers() filter to catch all
-- canonical trigger functions, including set_updated_at
-- ============================================================
-- The item_catalog, item_aliases, and item_import_batches tables
-- use set_updated_at() triggers. The previous filter only caught
-- set_row_updated_at and stamp_row_ownership, so these triggers
-- were silently skipped during provisioning.

CREATE OR REPLACE FUNCTION public._prov_install_triggers(
    p_source_schema text,
    p_target_schema text,
    p_table_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_trg record;
    v_events text;
    v_timing text;
BEGIN
    FOR v_trg IN
        SELECT
            t.tgname,
            t.tgtype,
            p.proname AS func_name
        FROM pg_trigger t
        JOIN pg_proc p ON p.oid = t.tgfoid
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = p_source_schema
          AND c.relname = p_table_name
          AND NOT t.tgisinternal
          AND p.proname IN (
              'set_row_updated_at',
              'stamp_row_ownership',
              'set_updated_at'
          )
        ORDER BY t.tgname
    LOOP
        -- tgtype bitmask: 1=ROW, 2=BEFORE, 4=INSERT, 8=DELETE, 16=UPDATE
        v_timing := CASE WHEN (v_trg.tgtype & 2) <> 0 THEN 'BEFORE' ELSE 'AFTER' END;

        v_events := NULL;
        IF (v_trg.tgtype & 4) <> 0 THEN v_events := 'INSERT'; END IF;
        IF (v_trg.tgtype & 16) <> 0 THEN
            v_events := coalesce(v_events || ' OR ', '') || 'UPDATE';
        END IF;
        IF (v_trg.tgtype & 8) <> 0 THEN
            v_events := coalesce(v_events || ' OR ', '') || 'DELETE';
        END IF;

        IF v_events IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I ON %I.%I',
            v_trg.tgname, p_target_schema, p_table_name
        );

        EXECUTE format(
            'CREATE TRIGGER %I %s %s ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.%I()',
            v_trg.tgname, v_timing, v_events,
            p_target_schema, p_table_name, v_trg.func_name
        );
    END LOOP;
END;
$function$;
