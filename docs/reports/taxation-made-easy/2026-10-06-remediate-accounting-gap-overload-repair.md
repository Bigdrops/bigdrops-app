# Remediate Accounting Gap Overload Repair Report

This report was written by Buffy on 2026-10-06 via Freebuff Desktop.

## Objective

Remove one conflicting overload of `public.remediate_accounting_gap`. The
conflict made the RPC unresolvable through PostgREST. Restore one canonical
and unambiguous RPC contract.

## Scope

- One forward migration. One database object removed.
- The canonical `text` implementation is preserved without change.
- No accounting logic, table, column, index, or data changed.
- Notification RPCs and CPS RPCs are out of scope and unchanged.

Skills used: supabase-postgres-best-practices, supabase, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Root cause

Two functions named `public.remediate_accounting_gap` existed at the same time.
They exposed the same application-facing argument-name set
(`p_entity_id`, `p_source_type`, `p_source_id`). They differed only in the type
of the third argument.

PostgREST selects an overload by the set of argument names in the request body.
It cannot select between two overloads that share an argument-name set.
Therefore every application call returned HTTP 300 PGRST203.

The cause is `CREATE OR REPLACE FUNCTION`. That statement cannot change an
argument type. A signature change therefore lands as an additional overload
instead of a replacement. The same cause produced the Invoice RPC overload
fixed earlier on 2026-10-06 in
`supabase/migrations/20261006130000_invoice_rpc_overload_hotfix.sql`.

## Pre-repair live catalog state

Both functions were `SECURITY DEFINER`, owner `postgres`, and had zero
argument defaults.

| OID | Complete identity arguments | `proconfig` | Body length | Body MD5 |
| :-- | :-- | :-- | --: | :-- |
| 17165 | `p_entity_id uuid, p_source_type text, p_source_id text` | `search_path=public` | 21274 | `c35ef83e12c24c4e448d60792075f523` |
| 17168 | `p_entity_id uuid, p_source_type text, p_source_id uuid` | NULL | 53 | `9d4d47a5b6603b613b039be1182be5fc` |

Function 17165 is the canonical implementation. Function 17168 is a stub. Its
complete body was:

```sql
BEGIN
  RETURN jsonb_build_object('ok', true);
END;
```

A live probe with the application argument-name set returned:

```
HTTP 300
{"code":"PGRST203","message":"Could not choose the best candidate function between:
 public.remediate_accounting_gap(p_entity_id => uuid, p_source_type => text, p_source_id => text),
 public.remediate_accounting_gap(p_entity_id => uuid, p_source_type => text, p_source_id => uuid)"}
```

The probe failed for a UUID-shaped value and for a non-UUID value. The value
shape does not change the result.

## Exact signature removed

```
public.remediate_accounting_gap(uuid, text, uuid)
```

## Exact canonical signature retained

```
public.remediate_accounting_gap(uuid, text, text)
```

## Migration filename

```
supabase/migrations/20261006140000_remediate_accounting_gap_overload_repair.sql
```

## Why the DROP cannot target the canonical implementation

The migration uses one signature-qualified statement:

```sql
DROP FUNCTION IF EXISTS public.remediate_accounting_gap(uuid, text, uuid);
```

PostgreSQL matches `DROP FUNCTION` on the complete argument-type list. The third
argument type differs between the two identities (`uuid` against `text`). The
statement can therefore never match the canonical identity.

The migration also:

- uses no `CASCADE`, so a hidden dependency fails the statement instead of
  removing other objects;
- contains exactly one `DROP FUNCTION` statement;
- contains no `CREATE FUNCTION` and no `CREATE OR REPLACE FUNCTION`, so it
  cannot rewrite the canonical implementation or add a replacement overload;
- runs a post-condition guard. The guard raises an exception if the canonical
  identity is absent, if the conflicting identity remains, or if the count of
  `remediate_accounting_gap` functions is not exactly one. A failed guard
  rolls the migration back.

## Regression protection added

New test file:

```
src/tests/critical/remediateAccountingGapOverload.test.js
```

The file holds 10 tests. It reads repository artifacts only. It does not
connect to the database. The tests assert:

| Test | Assertion |
| :-- | :-- |
| Forward-only | The repair migration sorts after the canonical migration. |
| Canonical unchanged | The canonical migration still declares `p_source_id text` and never declared `p_source_id uuid`. |
| Exact DROP | The file contains `DROP FUNCTION IF EXISTS public.remediate_accounting_gap(uuid, text, uuid);`. |
| Canonical safe | Exactly one `DROP FUNCTION` statement exists, and it does not target the canonical identity. |
| No CASCADE | The word `CASCADE` does not appear. |
| No redefinition | No `CREATE FUNCTION` or `CREATE OR REPLACE FUNCTION` appears. |
| No reintroduction | `p_source_id uuid` does not appear, and the conflicting identity appears only in the DROP and the guard. |
| Self-verification | The guard checks the canonical identity, the conflicting identity, and the variant count. |
| Cache reload | `NOTIFY pgrst, 'reload schema'` is present. |
| Blast radius | No notification RPC and no CPS RPC name appears. |
| Caller intact | `remediationService.ts` still calls the canonical RPC with the three argument names and adds no type cast. |

The "Canonical safe" assertion was tested against a negative control. A
migration that drops the canonical identity is detected. The control confirms
the assertion is not vacuous.

## Deployment method and result

Command:

```bash
supabase db push --linked
```

The command applied exactly one migration. The pending set was checked before
the push. No other migration was pending.

```
Applying migration 20261006140000_remediate_accounting_gap_overload_repair.sql...
Finished supabase db push.
```

Exit code: 0.

## Post-repair live catalog state

| OID | Complete identity arguments | `proconfig` | Body length | Body MD5 |
| :-- | :-- | :-- | --: | :-- |
| 17165 | `p_entity_id uuid, p_source_type text, p_source_id text` | `search_path=public` | 21274 | `c35ef83e12c24c4e448d60792075f523` |

| Check | Result |
| :-- | :-- |
| Variant count | 1 |
| `to_regprocedure('public.remediate_accounting_gap(uuid, text, text)')` | resolves |
| `to_regprocedure('public.remediate_accounting_gap(uuid, text, uuid)')` | NULL |
| OID after repair | 17165 (unchanged) |
| Body MD5 after repair | `c35ef83e12c24c4e448d60792075f523` (unchanged) |
| Grants | `=X/postgres \| postgres=X/postgres \| anon=X/postgres \| authenticated=X/postgres \| service_role=X/postgres` (unchanged) |
| Migration state | Local equals Remote at `20261006140000` |

The OID and the body MD5 are unchanged. This proves the canonical function was
not rewritten.

## Safe PostgREST resolution result

Probe: one request with the application argument-name set and a
non-existent `p_source_id` value.

```
HTTP 200
{"result": "NOT_REPAIRABLE", "explanation": "Remediation requires the journal/create permission on this entity."}
```

`PGRST203` did not occur. The request resolved to the canonical function. The
canonical function then executed its own accounting validation and returned the
`NOT_REPAIRABLE` code at the `journal/create` permission gate.

The probe performed no accounting remediation. The result is a resolution
success and a business-gate rejection. It is not a successful remediation.

## Conservation of unrelated RPCs

| RPC | State after repair |
| :-- | :-- |
| `resolve_notification` | 2 overloads, identities unchanged |
| `upsert_notification` | 2 overloads, identities unchanged |
| `save_invoice_with_items_transaction` | present in 11 of 11 provisioned tenant schemas |
| `save_quotation_with_items_transaction` | present in 11 of 11 provisioned tenant schemas |
| `apply_cps_item_feedback_transaction` | present in 11 of 11 provisioned tenant schemas |

## Discrepancy between repository history and live evidence

The repository declares exactly one `remediate_accounting_gap` function. The
canonical migration `20260906140000_accounting_remediation.sql` creates the
`text` identity. No migration file creates the `uuid` identity.

Live production contained both identities. OID order shows that the stub was
created after the canonical function. The stub therefore arrived out of band,
from a manual statement or from a migration that was later removed.

This migration does not repair the historical record. It removes the live
conflict. The historical migration stays unchanged.

## Verification

```
Verification:
- bun run audit:load: passed (exit 0; 871 files; 36 oversized, 8 broad selects, 1 component fetch, 4 heavy limits — identical to the established baseline; neither new file is flagged)
- bun run typecheck: passed (exit 0)
- focused test (remediateAccountingGapOverload.test.js): passed (10 tests, 10 pass, 0 fail)
- bun run test: 818 tests, 805 pass, 13 fail — the 13 failures are byte-identical to the documented pre-existing baseline (3 loader, 4 browser-environment, 5 stale cpsViewProductionRedesign, 1 itemCleanupExportImport); the new test is not among them
- git diff --check: passed (exit 0)
- git status: only the two intended new files added by this task; all pre-existing concurrent changes preserved
- supabase db push: passed (exit 0)
- bun run build: not executed (hardware policy)
```

## Files changed

| File | Change |
| :-- | :-- |
| `supabase/migrations/20261006140000_remediate_accounting_gap_overload_repair.sql` | New. Removes the conflicting overload. |
| `src/tests/critical/remediateAccountingGapOverload.test.js` | New. Contract guard. |

No historical migration was modified. No application source file was modified.

## Risks or limitations

- The origin of the conflicting stub is unknown. The repository does not
  contain the statement that created it.
- `remediateAccountingGap` has no production caller. Nothing imports
  `remediationService.ts`. The repair restores the RPC contract. It does not
  make the remediation feature reachable.
- `src/tests/critical/remediationContract.test.js` already failed before this
  task, in the browser environment. It could not verify this contract. The new
  guard test supplies that verification.
- `supabase/migrations/_temp_debug.sql` is a tracked file with no timestamp
  prefix. It is not a valid migration. The push skipped it. It predates this
  task and this task did not touch it.
- Docker was not used. It was not required. The push used the hosted database.

## Deferred work

- Decide the fate of `supabase/migrations/_temp_debug.sql`. This is a separate
  task.
- Diagnose the `42P10` error from the 12-argument `upsert_notification`
  variant. This is explicitly out of scope.
- Decide whether to wire `remediationService.ts` to a caller or mark the
  service as dormant.
- Sweep the catalog for other function pairs that share both a name and an
  identical argument-name set.
