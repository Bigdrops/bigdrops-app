-- ============================================================
-- Item Library Forward Ingestion Repair
-- ============================================================
-- Future invoice_items and quotation_items inserts learn item_catalog
-- identity in the same transaction. This migration installs triggers
-- only. It does not backfill historical rows with null item_id.

CREATE OR REPLACE FUNCTION public.learn_item_catalog_for_line_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema_name text := TG_TABLE_SCHEMA;
    v_normalized_name text;
    v_catalog_name text;
    v_item_id uuid;
BEGIN
    IF NEW.item_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF coalesce(NEW.row_type, 'standard') <> 'standard' THEN
        RETURN NEW;
    END IF;

    EXECUTE format(
        'SELECT %I.normalize_item_text($1)',
        v_schema_name
    )
    INTO v_normalized_name
    USING NEW.description;

    IF v_normalized_name = '' THEN
        RETURN NEW;
    END IF;

    EXECUTE format(
        'SELECT id
           FROM %I.item_catalog
          WHERE normalized_name = $1
            AND is_active = true
          LIMIT 1',
        v_schema_name
    )
    INTO v_item_id
    USING v_normalized_name;

    IF v_item_id IS NULL THEN
        EXECUTE format(
            'SELECT ia.item_id
               FROM %I.item_aliases ia
               JOIN %I.item_catalog ic ON ic.id = ia.item_id
              WHERE ia.normalized_alias_text = $1
                AND ia.is_active = true
                AND ia.is_retired = false
                AND ic.is_active = true
              LIMIT 1',
            v_schema_name,
            v_schema_name
        )
        INTO v_item_id
        USING v_normalized_name;
    END IF;

    IF v_item_id IS NULL THEN
        v_catalog_name := nullif(btrim(NEW.description), '');

        EXECUTE format(
            'INSERT INTO %I.item_catalog (
                 name,
                 normalized_name,
                 standard_price,
                 metadata
             )
             VALUES (
                 $1,
                 $2,
                 $3,
                 jsonb_build_object(
                     ''source'', ''document_line_learning'',
                     ''source_table'', $4
                 )
             )
             ON CONFLICT (normalized_name) DO NOTHING
             RETURNING id',
            v_schema_name
        )
        INTO v_item_id
        USING v_catalog_name, v_normalized_name, coalesce(NEW.unit_price, 0), TG_TABLE_NAME;

        IF v_item_id IS NULL THEN
            EXECUTE format(
                'SELECT id
                   FROM %I.item_catalog
                  WHERE normalized_name = $1
                    AND is_active = true
                  LIMIT 1',
                v_schema_name
            )
            INTO v_item_id
            USING v_normalized_name;
        END IF;
    END IF;

    NEW.item_id := v_item_id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Item library learning skipped on %.%: %',
            TG_TABLE_SCHEMA,
            TG_TABLE_NAME,
            SQLERRM;
        RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.learn_item_catalog_for_line_item() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._install_item_library_learning_triggers(
    p_schema_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_namespace
        WHERE nspname = p_schema_name
    ) THEN
        RAISE NOTICE 'Schema % does not exist. Item library learning triggers were skipped.', p_schema_name;
        RETURN;
    END IF;

    IF to_regclass(format('%I.invoice_items', p_schema_name)) IS NOT NULL THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_learn_item_catalog_invoice_items ON %I.invoice_items',
            p_schema_name
        );

        EXECUTE format(
            'CREATE TRIGGER trg_learn_item_catalog_invoice_items
             BEFORE INSERT ON %I.invoice_items
             FOR EACH ROW
             EXECUTE FUNCTION public.learn_item_catalog_for_line_item()',
            p_schema_name
        );
    END IF;

    IF to_regclass(format('%I.quotation_items', p_schema_name)) IS NOT NULL THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_learn_item_catalog_quotation_items ON %I.quotation_items',
            p_schema_name
        );

        EXECUTE format(
            'CREATE TRIGGER trg_learn_item_catalog_quotation_items
             BEFORE INSERT ON %I.quotation_items
             FOR EACH ROW
             EXECUTE FUNCTION public.learn_item_catalog_for_line_item()',
            p_schema_name
        );
    END IF;
END;
$function$;

-- Keep future tenant provisioning safe. New tenant schemas copy triggers
-- from tenant_master_template through _prov_install_triggers().
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
              'set_updated_at',
              'learn_item_catalog_for_line_item'
          )
        ORDER BY t.tgname
    LOOP
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
            v_trg.tgname,
            p_target_schema,
            p_table_name
        );

        EXECUTE format(
            'CREATE TRIGGER %I %s %s ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.%I()',
            v_trg.tgname,
            v_timing,
            v_events,
            p_target_schema,
            p_table_name,
            v_trg.func_name
        );
    END LOOP;
END;
$function$;

DO $$
BEGIN
    PERFORM public._install_item_library_learning_triggers('tenant_master_template');
END;
$$;

DO $$
DECLARE
    v_schema_name text;
BEGIN
    FOR v_schema_name IN
        SELECT n.nspname
        FROM pg_namespace n
        WHERE n.nspname LIKE 'entity\_%' ESCAPE '\'
        ORDER BY n.nspname
    LOOP
        PERFORM public._install_item_library_learning_triggers(v_schema_name);
    END LOOP;
END;
$$;
