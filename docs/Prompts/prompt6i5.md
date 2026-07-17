# Round 5 — Fix Confirmed RLS Recursion + Sweep for Other Instances

Two recursion bugs are CONFIRMED, not suspected — reproduced by running all
three existing migrations against real Postgres 16 as a non-superuser role.
Do not re-verify these two; implement the fixes directly:

1. workspace_members_select_self (20260714000001_multi_tenancy_rls.sql)
   self-queries workspace_members from within its own SELECT policy.
   Confirmed via "infinite recursion detected in policy for relation
   workspace_members" on direct execution.

2. is_platform_operator() (20260716000000_..._platform_operators.sql) is
   not SECURITY DEFINER, and platform_operators_select_owner's USING clause
   calls it — so its internal SELECT against platform_operators is itself
   subject to that same policy. Confirmed via "stack depth limit exceeded"
   showing repeated recursive calls into is_platform_operator() in the
   error trace.

Required fixes, in a new append-only migration (do not modify the three
existing files):

A. Add public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
   as SECURITY DEFINER, STABLE, SET search_path = public. Rewrite
   workspace_members_select_self to call it instead of self-querying.

B. Add SECURITY DEFINER and SET search_path = public to
   is_platform_operator()'s definition (CREATE OR REPLACE, in the new file).

C. Sweep every other RLS policy across all three existing files for the
   same pattern — a policy that queries its own table, or a non-
   SECURITY-DEFINER function called from a policy on the table that
   function queries. My own test run only exercised the six lifecycle
   steps; it did not exhaustively trigger every policy path. Report any
   additional instance found, fixed or not, before proceeding.

D. Re-run the full six-step lifecycle test AS A NON-SUPERUSER ROLE
   (not postgres/table owner — RLS is bypassed for those regardless of
   policy correctness). Report actual pass/fail per step, not a summary.

E. git diff summary of the new migration file only.

Do not modify workspace_members_select_self or is_platform_operator()
in their original files — CREATE OR REPLACE FUNCTION and DROP POLICY /
CREATE POLICY in the new migration file achieve the same runtime effect
without touching migration history.