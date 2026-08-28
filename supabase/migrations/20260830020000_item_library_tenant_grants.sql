-- Grant item-library tenant objects to application roles
-- Created: 2026-08-30
--
-- Root cause: the item-library objects installed into tenant schemas by
-- 20260828000001_item_library_tenant_objects.sql (the view
-- "item_price_summary_v" and the functions normalize_item_text,
-- get_item_suggestions, merge_item_catalog_entries) were created but never
-- granted to the application roles. PostgREST executes queries as
-- `authenticated`, which had no SELECT privilege on the view (and no EXECUTE
-- on the functions it calls). The Item Library "load summary" query
-- (`client.from('item_price_summary_v')`) therefore failed and surfaced as
-- "Failed to load item library".
--
-- This mirrors the grant pattern used for every other tenant table.

DO $$
DECLARE
  v_entity record;
  v_schema text;
BEGIN
  FOR v_entity IN
    SELECT e.id FROM public.entities e WHERE e.id IS NOT NULL
  LOOP
    v_schema := public._prov_get_schema_name(v_entity.id);
    IF v_schema IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'GRANT SELECT ON %I.item_price_summary_v TO anon, authenticated, service_role',
      v_schema
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.normalize_item_text(text) TO anon, authenticated, service_role',
      v_schema
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.get_item_suggestions(text, integer) TO anon, authenticated, service_role',
      v_schema
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.merge_item_catalog_entries(uuid, uuid[]) TO anon, authenticated, service_role',
      v_schema
    );

    RAISE NOTICE 'Granted item-library objects in schema %', v_schema;
  END LOOP;
END $$;
