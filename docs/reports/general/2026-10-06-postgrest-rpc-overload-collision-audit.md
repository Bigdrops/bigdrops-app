# PostgREST RPC Overload Collision Audit Report

This report was written by Buffy on 2026-10-06 via Freebuff Desktop.

## Objective

Determine whether any live PostgreSQL functions, exposed through the relevant
BIGDROPS schemas, have overload topology that can cause a PostgREST RPC
resolution failure (HTTP 300 / PGRST203).

This audit follows two confirmed incidents of the same failure class:

1. The Invoice RPC overload, repaired by
   `supabase/migrations/20261006130000_invoice_rpc_overload_hotfix.sql`.
2. `public.remediate_accounting_gap`, repaired by
   `supabase/migrations/20261006140000_remediate_accounting_gap_overload_repair.sql`.

This audit did not modify, deploy, or repair anything. It performed no mutating
SQL and no RPC probes.

## Scope

- One markdown report.
- Catalog inspection only.

## Skills used

Skills used: supabase-postgres-best-practices, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Method

1. Discover the live schema set from the catalog.
2. Group every callable identity by schema and function name.
3. Reconstruct each overload contract from the catalog.
4. Classify each group against the PostgREST collision model.
5. Establish repository provenance from `supabase/migrations/`.
6. Establish caller reachability from `src/`.
7. Read `git status` before and after the report.

The PostgREST collision model used in this audit:

> PostgREST selects an overload by the set of argument names in the request
> body. A provided name set matches a candidate function when every provided
> name is a parameter of that function and every remaining parameter has a
> default. Two candidates that both match is a collision.

This model is derived from the two prior incidents. It is an inference. See
section 10 for the fact/inference split.

## Report location note

The task requested `docs/Reports/`. This repository tracks 0 files under
`docs/Reports` and 915 files under `docs/reports`. On this case-insensitive
host both paths resolve to one directory. This report uses the tracked
lowercase path, `docs/reports/`. Creating a second capitalization would
duplicate documentation.

## 1. Audit surface

Namespaces discovered from `pg_namespace`.

| Namespace | Callable identities | Provisioned | PostgREST-exposed |
| :-- | --: | :-- | :-- |
| `public` | 118 | yes | yes |
| `graphql_public` | 1 | yes | yes |
| `entity_bigdrops-main_main` | 41 | yes | yes |
| `entity_bigdrops-main_agbado` | 41 | yes | yes |
| `entity_bigdrops-main_ogombo` | 41 | yes | yes |
| `entity_bigdrops-main_alarm` | 41 | yes | yes |
| `entity_bigdrops-main_adel` | 41 | yes | no |
| `entity_bigdrops-main_allan` | 41 | yes | no |
| `entity_bigdrops-main_anthropology` | 41 | yes | no |
| `entity_bigdrops-main_azerbaijan` | 41 | yes | no |
| `entity_bigdrops-main_jig` | 41 | yes | no |
| `entity_bigdrops-main_lomo` | 41 | yes | no |
| `entity_bigdrops-main_opaque` | 41 | yes | no |
| `entity_bigdrops-main_agam` | 0 | no | no |
| `entity_bigdrops-main_issa-certified` | 0 | no | no |
| `entity_bigdrops-main_ororo` | 0 | no | no |

Namespaces inspected: 16. Non-empty namespaces: 13. Total callable identities
examined: 570.

The PostgREST-exposed list is authoritative. It is the `pgrst.schemas` setting
of the `authenticator` role:

```
pgrst.schemas=public,graphql_public,entity_bigdrops-main_main,entity_bigdrops-main_agbado,entity_bigdrops-main_ogombo,entity_bigdrops-main_alarm
```

Two consequences follow.

- 7 provisioned tenant schemas hold 41 functions each but are not exposed.
  Their RPCs are not reachable through PostgREST, so they cannot produce
  PGRST203.
- The tenant schemas are uniform. All 11 provisioned schemas have an identical
  function-name set (one md5 hash, `0124dae95b3a19ffe18a36c95089ac5a`, over 41
  names). This is consistent with a single provisioning installer.

## 2. Overload inventory

Function names with more than one live identity, across `public`,
`graphql_public`, and every `entity_*` namespace, across all `prokind` values:

| Schema | Function | Variants | Argument-name-set relationship | Defaults | Classification | Provenance | Reachability | Risk |
| :-- | :-- | --: | :-- | :-- | :-- | :-- | :-- | :-- |
| `public` | `resolve_notification` | 2 | subset: 2 names inside 4 names | 0 / 0 | SAFE — NO CALLABLE OVERLAP | both repository-backed | NO CALLER FOUND | INFO |
| `public` | `upsert_notification` | 2 | subset: 12 names inside 14 names | 0 / 0 | SAFE — NO CALLABLE OVERLAP | both repository-backed | NO CALLER FOUND | INFO |

Every other function name has exactly one live identity.

| Metric | Count |
| :-- | --: |
| Overload groups (all prokinds) | 2 |
| Overload groups in tenant schemas | 0 |
| Exact same-argument-name-set collisions | 0 |
| Default/subset overlap cases | 0 |
| Functions with argument defaults (inventory) | 400, over 48 distinct names |
| Functions with defaults that also share a name with another function | 0 |

The last row is the operative fact. 400 functions carry defaults. None of them
belongs to an overload group. Therefore no default can extend any overload to
accept another overload's argument-name set.

## 3. Detailed analysis: the two safe groups

Both groups are declared in one migration,
`supabase/migrations/20260520090007_notifications.sql`, as intentional
`CREATE OR REPLACE` pairs. Both variants are live. No `DROP FUNCTION` cleanup
for either name exists in any migration.

### 3.1 `public.resolve_notification`

| Property | Variant A | Variant B |
| :-- | :-- | :-- |
| Identity arguments | `p_user_id uuid, p_fingerprint text` | `p_scope_type text, p_scope_id text, p_user_id uuid, p_fingerprint text` |
| Input argument names | `p_user_id`, `p_fingerprint` | `p_scope_type`, `p_scope_id`, `p_user_id`, `p_fingerprint` |
| Defaulted arguments | 0 | 0 |
| Returns | `void` | `void` |
| Security | SECURITY INVOKER | SECURITY INVOKER |
| `proconfig` | NULL | NULL |
| Owner | `postgres` | `postgres` |
| Body length / md5 | 170 / `d1cea9fd43241af68b1de0c459ac4082` | 225 / `6d56784e3b02ce55b1742fb50f6fd067` |
| OID (diagnostic only) | 17170 | 17171 |
| Repository provenance | line 213 | line 227 |

The bodies are functionally equivalent. Each runs one `UPDATE` on
`public.notifications` setting `state = 'resolved'`. Variant B adds
`scope_type` and `scope_id` predicates.

Classification: SAFE — NO CALLABLE OVERLAP.

Reasoning. The 2-name set is a strict subset of the 4-name set. A request with
only `p_user_id` and `p_fingerprint` matches variant A exactly. It cannot match
variant B, because variant B requires `p_scope_type` and `p_scope_id` and
neither has a default. Exactly one candidate remains. No collision.

### 3.2 `public.upsert_notification`

| Property | Variant A | Variant B |
| :-- | :-- | :-- |
| Input arguments | 12 | 14 |
| Lead arguments | `p_user_id` first | `p_scope_type`, `p_scope_id`, then `p_user_id` |
| Defaulted arguments | 0 | 0 |
| Returns | `void` | `void` |
| Security | SECURITY INVOKER | SECURITY INVOKER |
| `proconfig` | NULL | NULL |
| Owner | `postgres` | `postgres` |
| Body length / md5 | 824 / `02800ab993cc0f2d8e716de13501c3ea` | 1013 / `784616b02dd9f0ba7aec5708d8755f74` |
| OID (diagnostic only) | 17192 | 17193 |
| Repository provenance | line 153 | line 181 |

Variant A inserts into `public.notifications` and upserts on
`(user_id, fingerprint)`. Variant B does the same with `scope_type` and
`scope_id` and upserts on `(scope_type, scope_id, user_id, fingerprint)`.

The 12-name set is a strict subset of the 14-name set. Neither variant has a
default. A 12-name request matches only variant A. Classification: SAFE — NO
CALLABLE OVERLAP.

Internal SQL callers exist inside the same migration.
`generate_invoice_notifications` and `generate_quotation_notifications` call
`public.upsert_notification(...)` with 14 positional arguments. PL/pgSQL
resolves that call by argument count and types, not by JSON names. That
mechanism is separate from PostgREST resolution and is unambiguous.

The `42P10` error observed earlier from the 12-argument variant is out of
scope for this audit and is not diagnosed here.

## 4. `public.remediate_accounting_gap` confirmation

| Check | Value |
| :-- | :-- |
| Variant count | 1 |
| Identity | `p_entity_id uuid, p_source_type text, p_source_id text` |
| Defaulted arguments | 0 |

The conflicting `(uuid, text, uuid)` identity is absent. The completed repair is
intact. No further repair is required or proposed.

Reachability: DORMANT. `src/modules/accounting/remediationService.ts` calls the
RPC, but no repository file imports that service, and no UI references
remediation.

## 5. Repository / live drift

A drift sweep compared live `public` functions against
`CREATE ... FUNCTION public.<name>` declarations in `supabase/migrations/`,
excluding extension-owned functions.

9 live `public` functions were not matched by that pattern. One is a false
positive. 8 have no repository reference at all.

| Function | Identity | Returns | Security | `proconfig` | Public executable | Repository reference |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `_push_migration` | `(script text)` | `void` | DEFINER | NULL | yes (anon) | NONE |
| `_remediation_exists_probe` | `()` | `jsonb` | INVOKER | NULL | yes (anon) | NONE |
| `_test_catalog_update` | `()` | `void` | DEFINER | `search_path=public` | yes (anon) | NONE |
| `_test_owner_check` | `()` | `TABLE(...)` | DEFINER | `search_path=public` | yes (anon) | NONE |
| `_test_privs` | `()` | `TABLE(...)` | DEFINER | `search_path=public` | yes (anon) | NONE |
| `_test_setauth` | `()` | `TABLE(...)` | DEFINER | `search_path=public` | yes (anon) | NONE |
| `_test_super_owner` | `()` | `void` | DEFINER | `search_path=public` | yes (anon) | NONE |
| `_test_whoami` | `()` | `TABLE(...)` | DEFINER | `search_path=public` | yes (anon) | NONE |
| `validate_waybill_items` | `(items jsonb)` | `boolean` | INVOKER | NULL | yes (anon) | 3 migrations |

`validate_waybill_items` is a false positive. It is declared without the
`public.` qualifier at
`supabase/migrations/20260611000000_waybill_schema_final.sql:76`, so the
qualified search pattern missed it. It is repository-backed and is not drift.

The 8 remaining functions have no reference in any migration. Their origin is
unknown. This report classifies them as repository/live drift. It does not
claim they were created manually, because no evidence proves the creation
method.

### 5.1 Bodies of the drifting functions

Bodies observed from `pg_proc.prosrc`. Newlines are flattened.

| Function | Body |
| :-- | :-- |
| `_push_migration` | `BEGIN EXECUTE script; END;` |
| `_remediation_exists_probe` | Reads `pg_proc` and `pg_namespace`. Reports whether `remediate_accounting_gap` exists. Returns a `jsonb` message. |
| `_test_owner_check` | Reads `pg_authid` for the owner and superuser flag of itself. |
| `_test_setauth` | `RESET ROLE; SET SESSION AUTHORIZATION authenticator;` then calls `public._prov_expose_schema_to_postgrest('test_setauth')`, then resets. Catches exceptions and returns the SQLSTATE. |
| `_test_super_owner` | `RAISE NOTICE 'Function created with supabase_admin owner - SUCCESS';` |
| `_test_whoami` | Returns `current_user`, `session_user`, `auth.uid()`, and membership in `postgres`. |
| `_test_catalog_update` | Attempts `UPDATE pg_db_role_setting SET setconfig = ARRAY['pgrst.schemas=public,graphql_public,test_from_function']` for the `authenticator` role. Catches exceptions. |
| `_test_privs` | Attempts `CREATE SCHEMA`, `ALTER ROLE authenticator SET pgrst.schemas`, `UPDATE` and `INSERT` on `pg_db_role_setting`, and `NOTIFY pgrst`. Catches exceptions per test. |

The names and bodies indicate a privilege and PostgREST-configuration
investigation. They are not application functions.

### 5.2 Whether those attempts took effect

Two read-only checks were made.

- `pg_db_role_setting` for `authenticator` currently holds
  `pgrst.schemas=public,graphql_public,<4 tenant schemas>`. It does not contain
  `test_from_function` or `test_setauth`.
- No schema matching `_test%` or `test%` exists.

Therefore the attempted `pgrst.schemas` modifications are not reflected in the
current settings, and the attempted test schema is absent. This does not prove
the functions failed. It shows the modifications did not persist.

## 6. Security-relevant exposure (outside overload scope)

This section is reported because the audit covered drift. It is not an overload
finding. It is not repaired here.

Confirmed:

- All 8 drifting functions are executable by `anon` and by `authenticated`.
  This was verified with `has_function_privilege`.
- 7 of the 8 are `SECURITY DEFINER` and owned by `postgres`.
- `_push_migration` has the body `BEGIN EXECUTE script; END;`. Its only
  argument is `script text`.

Inferred, not proven:

- A `SECURITY DEFINER` function runs with the privileges of its owner.
  Therefore a caller of `_push_migration` may execute arbitrary SQL as
  `postgres`.

Unknown, not tested:

- Whether PostgREST accepts a request to `_push_migration`, and what the
  `postgres` role can actually execute. This audit did not probe the function.
  Probing was prohibited, and a probe would have executed arbitrary SQL against
  production.

This finding deserves immediate separate review by a human. It is outside the
authorized scope of this audit.

## 7. Acceptance criteria answers

| # | Question | Answer |
| --: | :-- | :-- |
| 1 | How many schemas were audited? | 16 namespaces inspected. 13 are non-empty. 6 are PostgREST-exposed. |
| 2 | How many total live functions were examined? | 570 callable identities. |
| 3 | How many function names have multiple identities? | 2. Both in `public`. |
| 4 | How many overload groups are safe? | 2. Both are SAFE — NO CALLABLE OVERLAP. |
| 5 | How many exact same-argument-name-set collisions exist? | 0. |
| 6 | How many default/subset overlap cases exist? | 0. |
| 7 | Which collisions have active application callers? | None. There are no collisions. Neither notification RPC has an application caller. |
| 8 | Which suspicious identities lack repository provenance? | 8 `public` functions (section 5). None of them is an overload. Both overloaded notification identities are repository-backed. |
| 9 | Does `remediate_accounting_gap` now have exactly one canonical identity? | Yes. One identity, `(uuid, text, text)`, 0 defaults. |
| 10 | Are `resolve_notification` and `upsert_notification` safe from PostgREST overload ambiguity? | Yes. Neither overload pair has any defaulted argument, so no request name set matches two candidates. |
| 11 | Are there any tenant/entity-schema overload collisions remaining? | No. Zero overload groups exist in any tenant schema. |
| 12 | Which findings deserve a separate repair task? | The 8 drifting `public` functions, in particular `_push_migration`. See the queue. |

## 8. Prioritized remediation queue

Not implemented by this task.

| Priority | Item | Basis |
| :-- | :-- | :-- |
| P0 | None. | No overload is breaking an active production path. |
| P1 | Review `public._push_migration` and remove or restrict it. | Drift, `SECURITY DEFINER`, `anon`-executable, body executes arbitrary SQL. Escalate to P0 if a human confirms exploitability. |
| P2 | None. | No dangerous collision is dormant. |
| P3 | Review the 7 other drifting `public` functions. | Drift plus `anon`-executable privilege or configuration probes. |
| P3 | Reconciled `pgrst.schemas`: 7 provisioned tenant schemas are not exposed. | Confirm whether this is intended. It is not a defect on its own. |
| INFO | `resolve_notification` overload pair. | Legitimate, intentional, safe. No action. |
| INFO | `upsert_notification` overload pair. | Legitimate, intentional, safe. No action. |
| INFO | `remediate_accounting_gap`. | Repair confirmed complete. No action. |

## 9. Classification ledger

| Item | PostgREST classification |
| :-- | :-- |
| `public.resolve_notification` | SAFE — NO CALLABLE OVERLAP |
| `public.upsert_notification` | SAFE — NO CALLABLE OVERLAP |
| `public.remediate_accounting_gap` | SAFE — single identity |
| All tenant-schema functions | SAFE — single identity per name |
| `validate_waybill_items` | SAFE — single identity, repository-backed |
| 8 drifting `public` functions | Not overloads. Classified as REPOSITORY/LIVE DRIFT. |

No group was classified DANGEROUS — IDENTICAL NAME SET.
No group was classified SUSPICIOUS — DEFAULT/SUBSET OVERLAP.
No group required SPECIAL CASE — MANUAL REVIEW for overload reasons. The drift
findings require manual review for provenance and security reasons, not for
overload ambiguity.

## 10. CONFIRMED FACT / INFERENCE / UNKNOWN

### CONFIRMED FACT

- 16 namespaces were inspected. 570 callable identities exist.
- Exactly 2 function names have multiple identities. Both are in `public`.
- `resolve_notification` has 2 identities with 0 defaults each.
- `upsert_notification` has 2 identities with 0 defaults each.
- `remediate_accounting_gap` has exactly 1 identity, `(uuid, text, text)`.
- Both notification overload pairs are declared as `CREATE OR REPLACE` pairs in
  `supabase/migrations/20260520090007_notifications.sql`.
- No `DROP FUNCTION` cleanup exists for either notification name.
- 400 functions carry defaults over 48 distinct names. None is in an overload
  group.
- `pgrst.schemas` for `authenticator` lists `public`, `graphql_public`, and 4
  tenant schemas.
- 7 provisioned tenant schemas are not exposed to PostgREST.
- All 11 provisioned tenant schemas have an identical 41-name function set.
- 8 live `public` functions have no reference in any migration.
- Those 8 functions are executable by `anon` and `authenticated`. 7 are
  `SECURITY DEFINER`.
- `_push_migration` has the body `BEGIN EXECUTE script; END;`.
- `pg_db_role_setting` does not contain `test_from_function` or `test_setauth`.
- No `_test%` or `test%` schema exists.
- No application code calls `resolve_notification` or `upsert_notification`
  through `supabase.rpc`. Only generated types reference them.

### INFERENCE

- The PostgREST collision model in the Method section. It is derived from the
  two prior incidents.
- Therefore the two notification groups are safe: no default means no
  additional callable name set.
- The reported absence of PGRST203 risk in tenant schemas, because no tenant
  function name has more than one identity.
- `_push_migration` may permit arbitrary SQL execution as `postgres`.
- The 7 non-exposed tenant schemas are not reachable through PostgREST, so they
  cannot produce PGRST203.
- The 8 drifting functions are diagnostic artifacts of a privilege
  investigation.

### UNKNOWN / UNPROVEN

- The origin and creation method of the 8 drifting functions.
- Whether the 8 drifting functions succeed when called, and their exact impact.
  This audit did not probe them, by design.
- Whether any external or non-repository client calls the notification RPCs.
  "No caller found" is not proof of no usage.
- Whether the 7 non-exposed tenant schemas were intended to be exposed.
- Whether `_test_privs` or `_test_catalog_update` ever succeeded. Current
  settings show no persistence, which is not the same as failure.
- Whether the `42P10` error in the 12-argument `upsert_notification` variant is
  a real defect. Out of scope.

## 11. Changes made

Exactly one file was created. No file was modified.

| File | Change |
| :-- | :-- |
| `docs/reports/general/2026-10-06-postgrest-rpc-overload-collision-audit.md` | New audit report. |

Not changed: `src/`, `supabase/migrations/`, database objects, tests,
configuration, package files.

## 12. Verification

```
Verification:
- bun run audit:load: not run (report-only task; host resources conserved)
- bun run typecheck: not run (no source changed)
- bun run lint: not run (no source changed)
- bun run test: not run (no code or test changed)
- bun run build: not executed (hardware policy)
- supabase db push: not run (no migration created or changed)
- database mutations: none (read-only catalog inspection only)
- RPC probes: none (prohibited by task scope)
- git status before report: 39 entries (21 modified, 18 untracked), all pre-existing
- git status after report: see below
```

Git status before the report, recorded as the baseline:

- 21 modified files. All are concurrent-agent work on document forms, hooks, and
  tests. None belongs to this task.
- 18 untracked files. These are prior CPS reports, generators, migrations, and
  tests from earlier work. None belongs to this task.

The pre-existing set was preserved. No pre-existing file was reverted,
overwritten, or staged.

## 13. Risks or limitations

- The audit relies on catalog inspection. It did not execute RPCs, so the
  PostgREST resolution model is an inference supported by two prior incidents
  and by PostgreSQL default semantics, not a fresh live reproduction.
- The `pgrst.schemas` value is read from role settings. PostgREST caches the
  schema list. A cached value could differ until the next reload.
- Reachability was assessed from the repository only. External clients are
  unknown.
- The drift sweep used textual matching against migration files. One false
  positive was found and corrected. Other declaration styles could hide
  further false positives.
- The security finding in section 6 was not tested. Testing would have
  executed arbitrary SQL in production.

## 14. Deferred work

- Human security review of `public._push_migration` and the 7 other drifting
  functions.
- Decide whether the 8 drifting functions should be removed, restricted, or
  documented.
- Confirm whether 7 provisioned tenant schemas should be added to
  `pgrst.schemas`.
- Diagnose the `42P10` error in the 12-argument `upsert_notification` variant.
- Add a permanent catalog guard that fails when two functions in one schema
  share a name and an identical argument-name set.
