# PostgREST Schema Overwrite Bug — PGRST002

**Date:** 2026-09-04
**Severity:** Critical — Complete API outage
**Status:** Fixed (manual intervention), Edge Function hardened

---

## Summary

The `postgrest-schema-exposure` Edge Function overwrote the Management API `db_schema` with an incorrect/missing schema list, causing PostgREST to lose access to all entity schemas. The app returned `PGRST002: Schema not exposed in the API configuration` for every request.

---

## Root Cause

1. The Edge Function `postgrest-schema-exposure` had `PROJECT_REF` secret set to the **wrong project** (`bigdrops-main` instead of `xqlpekpkbszpdgtuwybh`).
2. When invoked, the GET → merge → PATCH flow operated on the wrong project's PostgREST config.
3. The PATCH payload was missing critical default schemas (`auth`, `storage`, `extensions`, `graphql_public`) and entity schemas (`entity_bigdrops-main_agbado`, `entity_bigdrops-main_ogombo`, `entity_bigdrops-main_alarm`).
4. A non-existent schema `entity_bigdrops-main_test_probe` was included.

**Management API config before fix:**
```
db_schema: "public,graphql_public,entity_bigdrops-main_main,entity_bigdrops-main_test_probe"
```

**Correct config after fix:**
```
db_schema: "public,graphql_public,entity_bigdrops-main_main,entity_bigdrops-main_agbado,entity_bigdrops-main_ogombo,entity_bigdrops-main_alarm"
```

---

## Impact

- Every REST API call returned `PGRST002`
- All entity schemas (`alarm`, `agbado`, `ogombo`) were inaccessible
- App was non-functional until manual PATCH restored correct schemas

---

## Fix Applied

1. **Manual PATCH** — Restored correct `db_schema` via Management API
2. **Secret corrected** — Updated `PROJECT_REF` to `xqlpekpkbszpdgtuwybh`
3. **Edge Function hardened** — Added safeguards (see below)

---

## Edge Function Hardening

Changes to `supabase/functions/postgrest-schema-exposure/index.ts`:

1. **Default schema guard** — Always include `public`, `auth`, `storage`, `extensions`, `graphql_public` in any PATCH payload, regardless of what the GET returns
2. **DB validation** — Query `pg_namespace` to verify a schema exists before adding it to the PATCH
3. **Removed `test_probe`** from any stale references

---

## Safeguards Added

| Guard | Purpose |
|-------|---------|
| `DEFAULT_SCHEMAS` constant | Never remove system schemas from PATCH payload |
| `pg_namespace` validation | Only expose schemas that actually exist in the database |
| `PROJECT_REF` env var check | Fail fast if secret is wrong |

---

## Lessons Learned

1. **Never trust GET → PATCH without validation.** The GET can return a stale/wrong config; blindly appending to it propagates errors.
2. **Default schemas must be hardcoded as non-removable.** Auth, storage, and extensions are required by Supabase internals.
3. **PROJECT_REF secret must be verified.** A wrong project ref means the Edge Function operates on a completely different database.
4. **Consider locking `db_schema` via a DB trigger** that rejects PATCH requests missing required schemas.

---

## Follow-up Actions

- [ ] Add monitoring: alert if `db_schema` doesn't include `public,auth,storage,extensions`
- [ ] Consider moving schema exposure to a DB-level trigger (cannot be bypassed by wrong API calls)
- [ ] Audit `_pending_postgrest_schemas` table for stale/wrong entries
