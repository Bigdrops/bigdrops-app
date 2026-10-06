# Orphan Public Diagnostic Function Removal Report

This report was written by Buffy on 2026-10-06 via Freebuff Desktop.

## Executive finding

Eight live functions in the `public` schema had no repository migration
provenance. A read-only catalog audit proved that no database object and no
repository file depends on any of them. All eight were removed in one forward
migration.

The critical finding was `public._push_migration(text)`. It was
`SECURITY DEFINER`, owned by `postgres`, executable by `anon`, and its body ran
caller-supplied SQL. It was removed after the removal was proven safe.

The removal used static security and dependency evidence only. No exploit
attempt was made. The function was never invoked. No SQL was ever submitted
through it.

## Objective

Remove orphaned diagnostic artifacts from `public`, or stop and report if
removal could not be proven safe.

## Scope

- One forward migration that removes 8 exact identities.
- One static regression test.
- One report.
- No application source change. No historical migration change. No tenant
  configuration change.

## Skills used

Skills used: supabase-postgres-best-practices, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## 1. Exact pre-cleanup identities

Every identity was read from the live catalog before removal. The task supplied
a candidate list. Each entry was verified independently.

| # | Complete identity | Language | Returns |
| --: | :-- | :-- | :-- |
| 1 | `public._push_migration(text)` | plpgsql | `void` |
| 2 | `public._remediation_exists_probe()` | plpgsql | `jsonb` |
| 3 | `public._test_catalog_update()` | plpgsql | `void` |
| 4 | `public._test_owner_check()` | sql | `TABLE(owned_by name, is_super boolean)` |
| 5 | `public._test_privs()` | plpgsql | `TABLE(test_name text, result text)` |
| 6 | `public._test_setauth()` | plpgsql | `TABLE(test_name text, result text)` |
| 7 | `public._test_super_owner()` | plpgsql | `void` |
| 8 | `public._test_whoami()` | sql | `TABLE(cu name, su name, auth_uid text, is_member boolean)` |

The supplied list matched the live catalog. No identity required correction.

## 2. Security, ownership, and grant matrix

| Function | Owner | Security | `proconfig` | Defaults | `anon` | `authenticated` | `service_role` | PUBLIC |
| :-- | :-- | :-- | :-- | --: | :-- | :-- | :-- | :-- |
| `_push_migration` | `postgres` | DEFINER | NULL | 0 | yes | yes | yes | yes |
| `_remediation_exists_probe` | `postgres` | INVOKER | NULL | 0 | yes | yes | yes | yes |
| `_test_catalog_update` | `postgres` | DEFINER | `search_path=public` | 0 | yes | yes | yes | yes |
| `_test_owner_check` | `postgres` | DEFINER | `search_path=public` | 0 | yes | yes | yes | yes |
| `_test_privs` | `postgres` | DEFINER | `search_path=public` | 0 | yes | yes | yes | yes |
| `_test_setauth` | `postgres` | DEFINER | `search_path=public` | 0 | yes | yes | yes | yes |
| `_test_super_owner` | `postgres` | DEFINER | `search_path=public` | 0 | yes | yes | yes | yes |
| `_test_whoami` | `postgres` | DEFINER | `search_path=public` | 0 | yes | yes | yes | yes |

Every function carried the PUBLIC grant `=X/postgres`. Executability by `anon`,
`authenticated`, and `service_role` was confirmed with
`has_function_privilege`, not inferred from the ACL text alone.

7 of the 8 were `SECURITY DEFINER`. Only `_remediation_exists_probe` was
`SECURITY INVOKER`.

`_push_migration` had no pinned `search_path`. A `SECURITY DEFINER` function
without a pinned `search_path` carries an additional hardening gap.

## 3. Stored definitions

### 3.1 `public._push_migration(text)` — the critical finding

```sql
CREATE OR REPLACE FUNCTION public._push_migration(script text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE script;
END;
$function$
```

The only argument is `script text`. The body executes it.

### 3.2 Bodies of the other seven

| Function | Body summary |
| :-- | :-- |
| `_remediation_exists_probe` | Reads `pg_proc` and `pg_namespace`. Reports whether `remediate_accounting_gap` exists in `public`. |
| `_test_owner_check` | Reads `pg_authid` for its own owner and superuser flag. |
| `_test_setauth` | `RESET ROLE`, `SET SESSION AUTHORIZATION authenticator`, calls `public._prov_expose_schema_to_postgrest('test_setauth')`, then resets. |
| `_test_super_owner` | Emits `RAISE NOTICE 'Function created with supabase_admin owner - SUCCESS'`. |
| `_test_whoami` | Returns `current_user`, `session_user`, `auth.uid()`, and membership in `postgres`. |
| `_test_catalog_update` | Attempts `UPDATE pg_db_role_setting SET setconfig = ARRAY['pgrst.schemas=public,graphql_public,test_from_function']` for `authenticator`. |
| `_test_privs` | Attempts `CREATE SCHEMA`, `ALTER ROLE authenticator SET pgrst.schemas`, `UPDATE` and `INSERT` on `pg_db_role_setting`, and `NOTIFY pgrst`. |

The names and bodies indicate a privilege and PostgREST-configuration
investigation. They are not application functions.

## 4. Dependency analysis

Every check below was performed against the live catalog before removal.

| Check | Query basis | Result |
| :-- | :-- | :-- |
| Objects depending on the 8 | `pg_depend`, function side (`refobjid`) | 0 rows |
| Triggers referencing the 8 | `pg_trigger.tgfoid` | 0 rows |
| Views and rules referencing the 8 | `pg_rewrite` dependencies | 0 rows |
| RLS policies referencing the 8 | `pg_policies.qual` / `with_check` | 0 rows |
| Column defaults referencing the 8 | `pg_attrdef` | 0 rows |
| Other function bodies referencing the 8 | `pg_proc.prosrc` text search, all schemas | 0 rows |

The only outgoing dependency of the 8 was `pg_language` and `pg_namespace`
(`deptype = 'n'`, normal). Nothing depended on them, and they depended on
nothing but the language and the schema.

This means `DROP FUNCTION` without `CASCADE` was sufficient, and no other
object could break.

## 5. Repository provenance analysis

A repository-wide search was made, not a migrations-only search.

| Function | Migrations | `src/` | Tests | Scripts | Docs | Config | Any tracked file |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `_push_migration` | none | none | none | none | none | none | **no reference** |
| `_remediation_exists_probe` | none | none | none | none | none | none | **no reference** |
| `_test_catalog_update` | none | none | none | none | none | none | **no reference** |
| `_test_owner_check` | none | none | none | none | none | none | **no reference** |
| `_test_privs` | none | none | none | none | none | none | **no reference** |
| `_test_setauth` | none | none | none | none | none | none | **no reference** |
| `_test_super_owner` | none | none | none | none | none | none | **no reference** |
| `_test_whoami` | none | none | none | none | none | none | **no reference** |

`git grep` across all tracked files returned nothing for any of the eight names.
The only mention anywhere in the working tree is the prior read-only audit
report, which documents them.

No migration creates any of the eight.

## 6. Caller analysis

| Function | `supabase.rpc` caller | Wrapper service | UI reference | Reachability |
| :-- | :-- | :-- | :-- | :-- |
| `_push_migration` | none | none | none | NO CALLER FOUND |
| `_remediation_exists_probe` | none | none | none | NO CALLER FOUND |
| `_test_catalog_update` | none | none | none | NO CALLER FOUND |
| `_test_owner_check` | none | none | none | NO CALLER FOUND |
| `_test_privs` | none | none | none | NO CALLER FOUND |
| `_test_setauth` | none | none | none | NO CALLER FOUND |
| `_test_super_owner` | none | none | none | NO CALLER FOUND |
| `_test_whoami` | none | none | none | NO CALLER FOUND |

"No caller found" is not proof that no external client uses a function. See
section 12.

## 7. Cleanup safety decision

Removal was authorized. All safety-gate conditions were satisfied.

| Gate condition | State |
| :-- | :-- |
| Orphaned diagnostic artifacts | yes |
| Legitimate application dependency | none found |
| Database object dependency | none |
| Repository contract or migration creator | none |
| Active caller | none |
| Uncertain identity | none; every identity verified |
| Trigger, view, policy, or default dependency | none |

The task rule stated: remove the functions if and only if the audit establishes
that they are orphaned with no legitimate dependency, and the audit discovered
no legitimate dependency. The rule was applied.

## 8. Migration created

```
supabase/migrations/20261006150000_remove_orphan_public_diagnostic_functions.sql
```

Properties:

- One forward migration. No historical migration was modified.
- 8 `DROP FUNCTION IF EXISTS` statements, each schema-qualified and
  signature-qualified.
- No `CASCADE`. Verified on the executable SQL, not on comments.
- No `CREATE FUNCTION`, `REPLACE`, wrapper, or rename.
- A pre-condition block that reads `pg_depend` and raises if any dependent
  object exists.
- A post-condition block that raises if any target survived, and that asserts
  three unrelated RPCs still exist.
- `NOTIFY pgrst, 'reload schema'` so the removed functions leave the PostgREST
  cache.
- No change to `pgrst.schemas`, to tenant exposure, or to any other grant.

Every `to_regprocedure()` string used by the post-condition was executed against
the live database before deployment, to confirm it resolves. A wrong string
would have failed the guard and rolled back the migration.

## 9. Exact functions removed

```
public._push_migration(text)
public._remediation_exists_probe()
public._test_catalog_update()
public._test_owner_check()
public._test_privs()
public._test_setauth()
public._test_super_owner()
public._test_whoami()
```

## 10. Deployment

The pending migration set was inspected before deployment. Exactly one migration
was pending, this cleanup. No unrelated migration was pending. Deployment used
the hosted Supabase workflow, `supabase db push --linked`.

```
Applying migration 20261006150000_remove_orphan_public_diagnostic_functions.sql...
Finished supabase db push.
```

Exit code: 0. Docker was not used.

## 11. Post-cleanup catalog verification

All checks were read-only. No RPC execution probe was performed.

| # | Check | Expected | Observed |
| --: | :-- | :-- | :-- |
| 1 | Target identities remaining | 0 | 0 |
| 2 | `public` callable identities | 110 (118 - 8) | 110 |
| 3 | `remediate_accounting_gap(uuid, text, text)` | present | present |
| 4 | `resolve_notification(uuid, text)` | present | present |
| 5 | `upsert_notification(12 args)` | present | present |
| 6 | `ingest_source_transaction(...)` | present | present |
| 7 | Tenant schemas | 11 | 11 |
| 8 | Tenant functions | 451 (11 x 41) | 451 |
| 9 | `authenticator` `pgrst.schemas` | unchanged 6 entries | unchanged |
| 10 | Migration state | synchronized | Local equals Remote at `20261006150000` |

`pgrst.schemas` still reads:

```
public,graphql_public,entity_bigdrops-main_main,entity_bigdrops-main_agbado,entity_bigdrops-main_ogombo,entity_bigdrops-main_alarm
```

A residual drift re-check now returns only `validate_waybill_items`. That entry
is a known false positive. It is repository-backed but declared without the
`public.` qualifier at
`supabase/migrations/20260611000000_waybill_schema_final.sql:76`, so a
qualified search pattern misses it. All genuine drift is gone.

## 12. Verification

```
Verification:
- bun run audit:load: passed (exit 0; 871 files; 36 oversized, 8 broad selects, 1 component fetch, 4 heavy limits — identical to baseline)
- bun run typecheck: passed (exit 0)
- focused test (removeOrphanPublicDiagnosticFunctions.test.js): passed (10 tests, 10 pass, 0 fail)
- bun run test: 828 tests, 815 pass, 13 fail — the 13 failures are byte-identical to the documented pre-existing baseline (3 loader, 5 cpsViewProductionRedesign, 4 browser-environment, 1 itemCleanupExportImport); the new test is not among them
- git diff --check: passed (exit 0)
- supabase db push: passed (exit 0)
- post-cleanup catalog verification: passed (section 11)
- exploit probe: NOT performed (prohibited)
- bun run build: not executed (hardware policy)
```

The static test asserts: a single forward migration; all 8 exact identities;
8 signature-qualified `DROP FUNCTION` statements; no executable `CASCADE`; no
function creation or replacement; no `DROP`, `CREATE`, `ALTER`, `GRANT`, or
`REVOKE` statement naming any protected RPC; the protected-RPC post-conditions;
the dependency pre-condition; the absence post-condition; the PostgREST reload;
and no change to `pgrst.schemas`, role settings, or tenant schemas.

## 13. Files changed

| File | Change |
| :-- | :-- |
| `supabase/migrations/20261006150000_remove_orphan_public_diagnostic_functions.sql` | New. Removes the 8 orphan identities. |
| `src/tests/critical/removeOrphanPublicDiagnosticFunctions.test.js` | New. Static contract guard. |
| `docs/reports/general/2026-10-06-orphan-public-diagnostic-function-removal.md` | New. This report. |

No application source file was modified. No historical migration was modified.
No configuration was modified.

## 14. Git status comparison

| Point | Modified | Untracked |
| :-- | --: | --: |
| Before this task | 22 | 19 |
| After this task | 22 | 23 |

The modified count is unchanged. No pre-existing change was reverted, staged, or
overwritten. Four untracked files were added:

- three by this task (the migration, the test, and this report);
- one by a concurrent agent,
  `src/tests/document/invoiceMobileFoldCorrections.test.js`, which this task did
  not create and did not touch.

## 15. CONFIRMED FACT / INFERENCE / UNKNOWN

### CONFIRMED FACT

- All 8 identities existed in `public` before removal, with the identities in
  section 1.
- `_push_migration(text)` had the stored body `BEGIN EXECUTE script; END;`.
- 7 of the 8 were `SECURITY DEFINER`. `_remediation_exists_probe` was
  `SECURITY INVOKER`.
- All 8 were owned by `postgres`.
- All 8 were executable by `anon`, `authenticated`, and `service_role`, and
  carried the PUBLIC grant.
- `_push_migration` had no pinned `search_path`.
- No database object depended on any of the 8.
- No tracked repository file referenced any of the 8.
- No migration created any of the 8.
- No application code called any of the 8.
- All 8 are now absent from `public`.
- `public` dropped from 118 to 110 callable identities, exactly 8 fewer.
- The unrelated RPCs remain present.
- `pgrst.schemas` and the tenant schemas are unchanged.
- Migration state is synchronized at `20261006150000`.

### INFERENCE

- The 8 functions are diagnostic artifacts of a privilege and
  PostgREST-configuration investigation.
- `_push_migration` could execute caller-supplied SQL with the privileges of its
  owner, `postgres`, because it is `SECURITY DEFINER`.
- The PUBLIC grant made `_push_migration` reachable by the `anon` role through
  PostgREST, because `public` is in `pgrst.schemas`.
- The absence of the `test_from_function` and `test_setauth` entries in
  `pg_db_role_setting` indicates those configuration attempts did not persist.

### UNKNOWN / UNPROVEN

- Who created the 8 functions, and by what mechanism. No evidence proves manual
  creation.
- Whether any of the 8 was ever invoked, by anyone.
- Whether an external, non-repository actor or tool ever called
  `_push_migration`. This is the residual risk of the removal. No repository
  artifact references it, but an external tool outside the repository would not
  appear in any check this audit could make.
- Whether any of the 8 ever succeeded at a privileged operation. The absence of
  persisted settings is not proof of failure.
- Whether `_push_migration` was in fact exploitable. This was never tested.

No compromise is claimed. No evidence of compromise was found. No evidence of
compromise was sought by exploitation.

## 16. Note on the security decision

`public._push_migration` was removed on the basis of static security and
dependency evidence. Its removal was not based on an exploit attempt. The
function was never called, and no SQL was ever submitted through it, as the task
required.

The finding was not softened. A `SECURITY DEFINER` function owned by `postgres`,
PUBLIC-granted, that runs caller-supplied SQL is unnecessary in production once
no dependency exists.

## 17. Risks or limitations

- The security exposure of `_push_migration` is inferred from its grant and its
  body. It was not proven by exploitation, by design.
- Reachability was assessed from the repository and the catalog only. An
  external caller outside the repository is not detectable by these checks.
- The residual drift list uses textual matching against migration files. One
  false positive was found and identified as such. Other declaration styles
  could produce further false positives.
- PostgREST caches its schema. The `NOTIFY` reload was issued, but a stale cache
  could persist until the next reload.

## 18. Deferred work

- Confirm that no external tool depended on `_push_migration`.
- Keep the temporary debug file `supabase/migrations/_temp_debug.sql` out of
  scope. It is tracked and timestamp-less, and `supabase db push` skips it.
- Add a permanent catalog guard that fails when a live `public` function has no
  repository provenance.
- Review whether `public._prov_expose_schema_to_postgrest(text)` should remain
  PUBLIC-executable. It is repository-backed and was not in scope.
