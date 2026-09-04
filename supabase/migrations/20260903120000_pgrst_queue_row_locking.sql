-- ============================================================
-- FIX: Add row-level locking to _pending_postgrest_schemas
--
-- Problem: Concurrent Edge Function invocations can claim the
--          same pending rows, causing duplicate PATCH calls
--          and potential race conditions on the PostgREST config.
--
-- Solution: Add locked_at column + two RPC functions:
--   claim_pending_pgrst_schemas() — SELECT FOR UPDATE, skips
--     already-locked rows, re-claims stale locks (>60s).
--   release_pgrst_locks(p_ids) — Clears locks on failure/retry.
-- ============================================================

-- 1. Add locked_at column for row-level locking
ALTER TABLE public._pending_postgrest_schemas
  ADD COLUMN IF NOT EXISTS locked_at timestamptz DEFAULT null;

-- 2. Claim function: lock unprocessed, unlocked rows
--    Sets locked_at so the Edge Function can hold the claim
--    beyond the RPC transaction boundary.
CREATE OR REPLACE FUNCTION public.claim_pending_pgrst_schemas()
RETURNS SETOF public._pending_postgrest_schemas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Lock unprocessed rows that are either:
  --   not locked, OR locked > 60s ago (stale from crashed invocation)
  -- Sets locked_at = now() so concurrent invocations skip these rows
  -- even after the RPC transaction commits and PG locks release.
  -- ORDER BY via CTE (UPDATE...RETURNING doesn't support ORDER BY).
  RETURN QUERY
  WITH candidates AS (
    SELECT p.id
    FROM public._pending_postgrest_schemas p
    WHERE p.processed = false
      AND (p.locked_at IS NULL OR p.locked_at < now() - interval '60 seconds')
    ORDER BY p.id
    LIMIT 100
  )
  UPDATE public._pending_postgrest_schemas p
  SET locked_at = now()
  FROM candidates c
  WHERE p.id = c.id
  RETURNING p.*;
END;
$function$;

-- 3. Release function: clear locks on failure so rows can be retried
CREATE OR REPLACE FUNCTION public.release_pgrst_locks(p_ids bigint[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public._pending_postgrest_schemas
  SET locked_at = null
  WHERE id = ANY(p_ids);
END;
$function$;
