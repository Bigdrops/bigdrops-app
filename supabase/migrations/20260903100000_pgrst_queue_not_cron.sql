-- ============================================================
-- FIX: Remove pg_cron queue processor (pg_net unavailable)
--      Use Edge Function + Management API instead
--
-- Problem: pg_cron + pg_net requires pg_net extension which is
--          unavailable on Supabase hosted. PostgREST config on
--          hosted projects is managed via Management API, not
--          via ALTER ROLE in pg_db_role_setting.
--
-- Solution: Drop pg_cron job and processor. Keep the queue table.
--           _prov_expose_schema_to_postgrest() inserts into queue.
--           Edge Function (postgrest-schema-exposure) reads queue
--           and calls Management API to expose schemas.
--           External cron (cron-job.org) provides server-side recovery.
-- ============================================================

-- 1. Unschedule pg_cron job
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'process-pgrst-schemas' LOOP
    PERFORM cron.unschedule(r.jobid);
    RAISE NOTICE 'Unscheduled pg_cron job: %', r.jobid;
  END LOOP;
END $$;

-- 2. Drop the pg_cron processor function (no longer needed)
DROP FUNCTION IF EXISTS public._process_pending_pgrst_schemas();

-- 3. Rewrite _prov_expose_schema_to_postgrest to just queue
--    (no ALTER ROLE, no NOTIFY — Edge Function handles that now)
CREATE OR REPLACE FUNCTION public._prov_expose_schema_to_postgrest(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into queue for Edge Function to process via Management API
  -- Skip if already queued (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM public._pending_postgrest_schemas
    WHERE schema_name = p_schema_name AND processed = false
  ) THEN
    INSERT INTO public._pending_postgrest_schemas (schema_name)
    VALUES (p_schema_name);
  END IF;
END;
$function$;

-- 4. Verify: queue table should still exist with any unprocessed rows
DO $$
DECLARE
  v_pending bigint;
  v_processed bigint;
BEGIN
  SELECT count(*) INTO v_pending FROM public._pending_postgrest_schemas WHERE NOT processed;
  SELECT count(*) INTO v_processed FROM public._pending_postgrest_schemas WHERE processed;
  RAISE NOTICE 'Queue status: pending=%, processed=%', v_pending, v_processed;
END $$;
