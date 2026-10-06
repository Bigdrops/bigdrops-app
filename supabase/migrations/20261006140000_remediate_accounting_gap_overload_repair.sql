-- ============================================================
-- PUBLIC RPC OVERLOAD REPAIR — public.remediate_accounting_gap
-- ============================================================
-- One conflicting overload made the application RPC unresolvable.
-- PostgREST selects an overload by the set of argument names in the
-- request body. Two overloads that expose the same argument-name set
-- cannot be selected, so every application call returned HTTP 300
-- PGRST203 before this migration.
--
-- Identity removed (exact):
--   public.remediate_accounting_gap(uuid, text, uuid)
--
-- Identity retained (exact):
--   public.remediate_accounting_gap(uuid, text, text)
--
-- The retained identity is the canonical implementation. It was
-- created by 20260906140000_accounting_remediation.sql. This
-- migration does not create, replace, or modify that implementation.
-- The retained identity keeps its body, its SECURITY DEFINER
-- attribute, its search_path setting, and its grants.
--
-- Why the DROP cannot match the canonical function:
--   The DROP is signature-qualified. The third argument type differs
--   between the two identities (uuid against text). PostgreSQL
--   matches DROP FUNCTION on the exact argument-type list, so the
--   DROP can never target the canonical identity.
--
-- No CASCADE is used. If any object depended on the removed overload,
-- the statement would fail instead of silently removing other objects.
-- ============================================================

DROP FUNCTION IF EXISTS public.remediate_accounting_gap(uuid, text, uuid);

-- Post-condition guard. Fail loudly instead of leaving an ambiguous RPC.
DO $guard$
DECLARE
    v_variants integer;
BEGIN
    IF to_regprocedure('public.remediate_accounting_gap(uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION
            'remediate_accounting_gap repair: canonical (uuid, text, text) implementation is missing';
    END IF;

    IF to_regprocedure('public.remediate_accounting_gap(uuid, text, uuid)') IS NOT NULL THEN
        RAISE EXCEPTION
            'remediate_accounting_gap repair: conflicting (uuid, text, uuid) overload still exists';
    END IF;

    SELECT count(*)
    INTO v_variants
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'remediate_accounting_gap';

    IF v_variants <> 1 THEN
        RAISE EXCEPTION
            'remediate_accounting_gap repair: expected exactly one function, found %', v_variants;
    END IF;
END;
$guard$;

NOTIFY pgrst, 'reload schema';
