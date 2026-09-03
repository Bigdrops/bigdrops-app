-- ============================================================
-- FIX: pg_cron processes ALTER ROLE for PostgREST schema config
-- 
-- Problem: SECURITY DEFINER functions cannot ALTER ROLE authenticator 
-- SET pgrst.schemas when called via PostgREST RPC (but CAN from CLI 
-- or pg_cron). Root cause: PostgREST's session setup interferes 
-- with ALTER ROLE privilege checks.
--
-- Solution: The provisioning function queues schema names into a 
-- pending table. A pg_cron job (which runs in a clean session) 
-- processes the queue and does the actual ALTER ROLE + NOTIFY.
-- ============================================================

-- 1. Pending schemas queue table
CREATE TABLE IF NOT EXISTS public._pending_postgrest_schemas (
  id bigserial PRIMARY KEY,
  schema_name text NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Function that pg_cron calls to process pending schemas
-- Runs in pg_cron's clean session (no PostgREST SET ROLE interference)
CREATE OR REPLACE FUNCTION public._process_pending_pgrst_schemas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_config_arr text[];
  v_current_val text;
  v_new_schemas text;
  v_auth_oid oid;
  i int;
BEGIN
  SELECT oid INTO v_auth_oid FROM pg_authid WHERE rolname = 'authenticator';

  FOR r IN SELECT ps.id, ps.schema_name FROM public._pending_postgrest_schemas ps WHERE NOT ps.processed ORDER BY ps.id
  LOOP
    SELECT setconfig INTO v_config_arr
    FROM pg_db_role_setting
    WHERE setrole = v_auth_oid;

    v_current_val := '';
    IF v_config_arr IS NOT NULL THEN
      FOR i IN 1..array_length(v_config_arr, 1) LOOP
        IF v_config_arr[i] LIKE 'pgrst.schemas=%' THEN
          v_current_val := substring(v_config_arr[i] FROM 15);
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_current_val IS NULL OR v_current_val = '' THEN
      v_current_val := 'public,graphql_public';
    END IF;

    IF NOT (v_current_val LIKE '%' || r.schema_name || '%') THEN
      v_new_schemas := v_current_val || ',' || r.schema_name;
      EXECUTE format('ALTER ROLE authenticator SET pgrst.schemas = %L', v_new_schemas);
      EXECUTE 'NOTIFY pgrst, ''reload config''';
    END IF;

    UPDATE public._pending_postgrest_schemas SET processed = true WHERE id = r.id;
  END LOOP;
END;
$$;

-- 3. Replace _prov_expose_schema_to_postgrest to queue instead of ALTER ROLE
CREATE OR REPLACE FUNCTION public._prov_expose_schema_to_postgrest(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_val text;
  v_config_arr text[];
  v_auth_oid oid;
  i int;
BEGIN
  SELECT oid INTO v_auth_oid FROM pg_authid WHERE rolname = 'authenticator';

  SELECT setconfig INTO v_config_arr
  FROM pg_db_role_setting
  WHERE setrole = v_auth_oid;

  v_current_val := '';
  IF v_config_arr IS NOT NULL THEN
    FOR i IN 1..array_length(v_config_arr, 1) LOOP
      IF v_config_arr[i] LIKE 'pgrst.schemas=%' THEN
        v_current_val := substring(v_config_arr[i] FROM 15);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_current_val IS NULL OR v_current_val = '' THEN
    v_current_val := 'public,graphql_public';
  END IF;

  IF NOT (v_current_val LIKE '%' || p_schema_name || '%') THEN
    INSERT INTO public._pending_postgrest_schemas (schema_name) VALUES (p_schema_name);
  END IF;
END;
$$;

-- 4. Schedule pg_cron job (runs every second, processes pending entries)
-- Safely unschedule any existing job with this name
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'process-pgrst-schemas' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'process-pgrst-schemas',
  '* * * * * *',
  $$SELECT public._process_pending_pgrst_schemas()$$
);
