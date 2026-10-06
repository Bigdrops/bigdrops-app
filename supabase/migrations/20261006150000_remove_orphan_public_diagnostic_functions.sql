-- ============================================================
-- REMOVE ORPHAN PUBLIC DIAGNOSTIC FUNCTIONS
-- ============================================================
-- A read-only catalog audit found 8 live functions in `public`
-- with no repository migration provenance. They are diagnostic
-- and probe artifacts left in production.
--
-- The critical one is public._push_migration(text). It is
-- SECURITY DEFINER, owned by postgres, executable by anon, and
-- its body runs caller-supplied SQL:
--
--   BEGIN
--     EXECUTE script;
--   END;
--
-- Audit evidence that these 8 are orphaned:
--   - no object depends on any of them (pg_depend, referring side)
--   - no trigger, view, rule, RLS policy, or column default uses them
--   - no other function body references them
--   - no tracked repository file references them
--   - no migration creates any of them
--   - their only outgoing dependencies are pg_language and pg_namespace
--
-- This migration removes all 8. It uses exact signature-qualified
-- DROP FUNCTION statements. It does not use CASCADE.
--
-- Identities removed:
--   public._push_migration(text)
--   public._remediation_exists_probe()
--   public._test_catalog_update()
--   public._test_owner_check()
--   public._test_privs()
--   public._test_setauth()
--   public._test_super_owner()
--   public._test_whoami()
--
-- This migration does not change pgrst.schemas, tenant exposure,
-- grants on any other object, or any application RPC.
-- ============================================================

-- Pre-condition. Refuse the removal if any dependent object exists.
-- Without CASCADE the DROP would fail anyway. This check states the
-- reason clearly and stops the whole migration, not one statement.
DO $pre$
DECLARE
    v_dependents integer;
BEGIN
    SELECT count(*)
    INTO v_dependents
    FROM pg_depend d
    WHERE d.refclassid = 'pg_proc'::regclass
      AND d.refobjid IN (
          SELECT p.oid
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN (
                '_push_migration',
                '_remediation_exists_probe',
                '_test_catalog_update',
                '_test_owner_check',
                '_test_privs',
                '_test_setauth',
                '_test_super_owner',
                '_test_whoami'
            )
      );

    IF v_dependents > 0 THEN
        RAISE EXCEPTION
            'refusing to remove orphan functions: % dependent object(s) found', v_dependents;
    END IF;
END;
$pre$;

DROP FUNCTION IF EXISTS public._push_migration(text);
DROP FUNCTION IF EXISTS public._remediation_exists_probe();
DROP FUNCTION IF EXISTS public._test_catalog_update();
DROP FUNCTION IF EXISTS public._test_owner_check();
DROP FUNCTION IF EXISTS public._test_privs();
DROP FUNCTION IF EXISTS public._test_setauth();
DROP FUNCTION IF EXISTS public._test_super_owner();
DROP FUNCTION IF EXISTS public._test_whoami();

-- Post-condition. Fail loudly if a target survived, or if an
-- unrelated RPC was lost.
DO $guard$
DECLARE
    v_remaining text;
BEGIN
    SELECT string_agg(p.proname, ', ' ORDER BY p.proname)
    INTO v_remaining
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
          '_push_migration',
          '_remediation_exists_probe',
          '_test_catalog_update',
          '_test_owner_check',
          '_test_privs',
          '_test_setauth',
          '_test_super_owner',
          '_test_whoami'
      );

    IF v_remaining IS NOT NULL THEN
        RAISE EXCEPTION
            'orphan removal incomplete, still present: %', v_remaining;
    END IF;

    IF to_regprocedure('public.remediate_accounting_gap(uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION 'unrelated RPC missing after removal: remediate_accounting_gap';
    END IF;

    IF to_regprocedure('public.resolve_notification(uuid, text)') IS NULL THEN
        RAISE EXCEPTION 'unrelated RPC missing after removal: resolve_notification(2)';
    END IF;

    IF to_regprocedure('public.upsert_notification(uuid, text, text, text, text, text, text, text, text, text, text, jsonb)') IS NULL THEN
        RAISE EXCEPTION 'unrelated RPC missing after removal: upsert_notification(12)';
    END IF;
END;
$guard$;

NOTIFY pgrst, 'reload schema';
