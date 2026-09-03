# Supabase Management API Investigation — PostgREST Schema Registration

This report was written by opencode on 2026-09-03 via Local Runner.

## Executive Summary

The "Invalid schema" problem is caused by PostgREST reading its Exposed Schemas from a **platform-level Management API config**, NOT from `pg_db_role_setting.pgrst.schemas`. The pg_cron queue approach writes to the correct Postgres catalog, but PostgREST on Supabase hosted never reads it. The fix is to call the Supabase Management API directly during provisioning.

---

## 1. Root Cause (Exact)

PostgREST on Supabase hosted reads its config from a **platform control-plane endpoint**:

```
GET  /v1/projects/{ref}/postgrest   → returns current config
PATCH /v1/projects/{ref}/postgrest  → updates config
```

The `db_schema` field is a **comma-separated string** of exposed schemas. This is the same value the Dashboard shows under Settings → API → Exposed Schemas.

**Our current approach** writes to `pg_db_role_setting.pgrst.schemas` via `ALTER ROLE authenticator SET pgrst.schemas = ...`. This is the PostgreSQL-level config. On Supabase hosted, PostgREST does **NOT** read this catalog. The platform intercepts and manages PostgREST config via its own control plane.

**Proof**: We confirmed `ALTER ROLE` succeeds (pg_cron job ran, `pgrst.schemas` updated in `pg_db_role_setting`), but PostgREST still returns `Invalid schema` for the new tenant.

## 2. Config Layer (pg_db_role_setting vs. Management API)

| Layer | Where | Who reads it | Effect on hosted Supabase |
|---|---|---|---|
| `pg_db_role_setting` | PostgreSQL catalog | Self-hosted PostgREST only | **No effect** — platform overrides |
| Management API `/v1/projects/{ref}/postgrest` | Supabase control plane | PostgREST on hosted | **Authoritative** — this is what PostgREST uses |

On Supabase hosted, the platform manages PostgREST config separately from PostgreSQL role settings. The Dashboard "Exposed Schemas" setting maps directly to the Management API's `db_schema` field.

## 3. Is `pgrst.schemas` a valid config key?

**Yes**, but only for self-hosted PostgREST. On Supabase hosted, the valid path is the Management API. The config key `pgrst.schemas` (not `pgrst.db_schemas`) is correct for the PostgreSQL catalog, but PostgREST on hosted doesn't read it.

The Management API field name is `db_schema` (singular, comma-separated string). Example from OpenAPI spec:

```json
{
  "db_schema": "public,storage,entity_bigdrops-main_alarm"
}
```

## 4. Official Mechanism (confirmed via OpenAPI spec)

**Endpoints** (from `api.supabase.com/api/v1-json`):

| Method | Path | OAuth Scope | Purpose |
|---|---|---|---|
| `GET` | `/v1/projects/{ref}/postgrest` | `rest:read` | Read current PostgREST config |
| `PATCH` | `/v1/projects/{ref}/postgrest` | `rest:write` | Update PostgREST config |

**GET response schema** (`PostgrestConfigWithJWTSecretResponse_Output`):

```json
{
  "db_schema": "public,storage",        // comma-separated string
  "max_rows": -9007199254740991,         // default: unlimited
  "db_extra_search_path": "public,extensions",
  "db_pool": null,                        // auto-configured
  "db_pool_acquisition_timeout": null     // defaults to 10
}
```

**PATCH request body** (`V1UpdatePostgrestConfigBody`):

```json
{
  "db_schema": "public,storage,entity_bigdrops-main_alarm"
}
```

**Key fields**:

| Field | Type | Notes |
|---|---|---|
| `db_schema` | `string` | Comma-separated list of exposed schemas. **PATCH replaces entire value** — not additive. |
| `max_rows` | `integer` | 0–1000000. Default -9007199254740991 = unlimited |
| `db_extra_search_path` | `string` | Extra search_path for PostgREST |
| `db_pool` | `integer` | 0–1000, null = auto |
| `db_pool_acquisition_timeout` | `integer` | 0–60 seconds |

**Auth**: Bearer token. Requires `rest:write` scope for PATCH. Personal Access Token (PAT) from supabase.com/account → Access Tokens.

## 5. Auth & Security

**Who can call the Management API?**

- **Personal Access Token (PAT)**: Created at supabase.com/account. Requires `rest:write` scope.
- **Service role key**: Cannot access Management API. Different auth system.
- **Anon key**: Cannot access Management API.

**Security requirements** (from user):
- Token must remain **server-side only** — never in browser/client code
- Token must be stored securely, not in `ALTER SYSTEM` settings
- Must use `supabase` CLI `--experimental secrets set` or equivalent server-side mechanism

**Token storage options**:
1. **Supabase secrets** (via `supabase secrets set`): Best option. Not accessible from client code.
2. **Environment variable in Vercel**: For serverless functions. Not accessible from DB.
3. **PostgreSQL table** (encrypted): Accessible from DB functions but adds complexity.

**Recommended**: Store token in Supabase secrets. Access it from Edge Functions or pg_net calls.

## 6. pg_cron Solution Validity

**The pg_cron queue approach is invalid for the core problem.** Here's why:

| Assumption | Reality |
|---|---|
| PostgREST reads `pg_db_role_setting.pgrst.schemas` | On hosted Supabase, PostgREST reads from Management API |
| `ALTER ROLE authenticator SET pgrst.schemas` registers schema with PostgREST | This only affects PostgreSQL catalog. PostgREST ignores it on hosted |
| pg_cron processes queue and registers schema | pg_cron correctly runs `ALTER ROLE`, but PostgREST never sees it |

**What pg_cron DOES correctly**:
- Processes the queue in a clean session (bypasses SEC DEFINER restriction)
- `ALTER ROLE` succeeds and persists in catalog
- Idempotent processing

**What pg_cron DOES NOT do**:
- Actually register the schema with PostgREST on hosted Supabase

**Decision**: The pg_cron queue mechanism should be **replaced** with a Management API call, not supplemented. Keeping both creates confusion about which is the source of truth.

## 7. Proposed Provisioning Flow

### Option A: pg_net HTTP from PostgreSQL (preferred — all-SQL)

```
provision_entity()
  → Steps 1-14: schema creation, table cloning, grants (unchanged)
  → Step 15: _prov_expose_schema_to_postgrest()
      → Inserts into _pending_postgrest_schemas
      → pg_cron job processes queue:
          → Reads token from supabase_secrets table
          → pg_net.http_post() to Management API:
              GET current config → merge new schema → PATCH back
          → Marks processed
  → Step 16: status = 'ready' (same transaction)
  → After commit: pg_cron picks up and exposes schema
```

**Advantages**: No Edge Functions, no cold starts, all-SQL, same pattern as current pg_cron.
**Risk**: `pg_net` may require extensions that aren't available or `postgres` role may lack `net.http_post()` permission.

### Option B: Edge Function (fallback)

```
provision_entity()
  → Steps 1-14: unchanged
  → Step 15: _prov_expose_schema_to_postgrest() inserts into pending table
  → Step 16: status = 'ready' (same transaction)
  → pg_cron job (every 5 seconds):
      → Reads unprocessed entries
      → Calls Edge Function via HTTP (supabase functions invoke)
      → Edge Function: reads token from env, GET + PATCH Management API
      → Marks processed
```

**Advantages**: Native Deno HTTP, token in env vars, simpler code.
**Risk**: Edge Function cold start (~200ms), dependency on pg_cron + Edge Function coordination.

### Option C: pg_net + pg_cron hybrid (simplest)

```
provision_entity()
  → Steps 1-14: unchanged
  → Step 15: _prov_expose_schema_to_postgrest() 
      → Builds HTTP request payload
      → Inserts into _pending_postgrest_schemas with payload
      → pg_cron job (every 2 seconds):
          → SELECT net.http_post(
              url := 'https://api.supabase.com/v1/projects/xqlpekpkbszpdgtuwybh/postgrest',
              headers := '{"Authorization": "Bearer <token>", "Content-Type": "application/json"}',
              body := '{"db_schema": "public,storage,...,new_schema"}'
            )
          → Marks processed
```

**Note**: This requires fetching current config first (GET), which means two HTTP calls per schema. Alternatively, if we maintain the schema list in a PostgreSQL table, we can build the PATCH payload directly.

## 8. Concurrency Safety

**Problem**: Two concurrent provisioning requests could race on the Management API PATCH. PATCH replaces the entire `db_schema` value. If request A reads `public,storage` and request B reads `public,storage` before either patches, one request's new schema is lost.

**Solutions** (ordered by simplicity):

1. **PostgreSQL advisory lock** (recommended): `pg_advisory_xact_lock(hashtext('pgrst_schema_registration'))` — serializes all Management API calls. Simple, correct, minimal contention (provisioning is rare).

2. **Optimistic concurrency**: GET → check if new schema already in response → PATCH. If conflict, retry. More complex but higher throughput.

3. **Accept eventual consistency**: If PATCH is eventually consistent on Supabase side, two concurrent patches may both succeed. Risky assumption.

**Recommendation**: Advisory lock. Provisioning is a rare, high-stakes operation. Serializing it is correct and simple.

## 9. Failure & Retry

| Failure mode | Current behavior | Proposed behavior |
|---|---|---|
| Management API timeout | pg_cron retries forever | pg_cron retries with exponential backoff (1s, 2s, 4s, max 30s) |
| Management API auth error | N/A | Log error, mark as failed, alert operator. Do not retry. |
| Management API rate limit (429) | N/A | Wait and retry after delay |
| Token expired | N/A | Mark as failed, require manual token refresh |
| Partial PATCH (some schemas applied) | N/A | GET after PATCH to verify. If not applied, retry. |

**Retry strategy**: pg_cron processes queue every 2 seconds. Failed entries retry up to 5 times with exponential backoff. After 5 failures, mark as `failed` and require manual intervention.

## 10. Tenant Preservation

**No existing tenants are modified.** The Management API PATCH replaces the entire `db_schema` value. When processing a new schema, we must:

1. GET current `db_schema` value (e.g., `"public,storage,entity_bigdrops-main_main"`)
2. Append new schema: `"public,storage,entity_bigdrops-main_main,entity_bigdrops-main_alarm"`
3. PATCH with merged value

This preserves all existing schemas. The PATCH is **additive from our perspective** (we always merge before writing).

## 11. Main Tenant Safety

`entity_bigdrops-main_main` is actively used and MUST NOT be disrupted.

**Safety guarantee**: The merge step (GET → append → PATCH) always includes existing schemas. We never PATCH with a subset. If GET fails, we do not PATCH (fail-safe).

**Additional safeguard**: Before PATCH, validate that the merged schema list includes `entity_bigdrops-main_main`. If not, abort and log error.

## 12. Files Modified

| File | Change | Migration |
|---|---|---|
| `supabase/migrations/20260903080000_pgrst_management_api.sql` | **NEW** — Replace pg_cron queue with Management API approach: pending table, pg_cron fn, expose fn, secrets table | New migration |
| `supabase/migrations/20260903070000_pgrst_cron_queue.sql` | **SUPERSEDED** — Old pg_cron queue approach. Keep for rollback but mark as superseded. | Existing |

## 13. Migration Approach

1. Create new migration `20260903080000_pgrst_management_api.sql`:
   - Create `supabase_secrets` table (if not exists) for Management API token
   - Create `_pending_postgrest_schemas` table (reuse existing from cron queue migration)
   - Create `_prov_expose_schema_to_postgrest()` function (new version: inserts into pending)
   - Create `_process_pending_pgrst_schemas()` function (new version: calls Management API via pg_net)
   - Schedule pg_cron job (replace existing job ID 9)

2. Store Management API token: `supabase secrets set PGRST_MANAGEMENT_TOKEN=<pat_token>`

3. Verify: create entity via UI → check PostgREST accepts new schema without Dashboard intervention

## 14. Verification

**Unit test**: Create entity → wait 5 seconds → query `GET /v1/projects/{ref}/postgrest` → confirm new schema in `db_schema`

**Integration test**: Create entity → query PostgREST endpoint for new schema → confirm 200 (not 404/Invalid schema)

**Regression test**: Create entity → confirm existing entities (Main) still work → query their endpoints → confirm 200

**Concurrency test**: Create 2 entities simultaneously → both succeed → both schemas in `db_schema`

## 15. Acceptance Result

After implementation:
1. Create entity via UI → schema provisioned → PostgREST accepts queries → no manual Dashboard step
2. Existing entity `entity_bigdrops-main_main` still works
3. No `Invalid schema` error for new entities
4. Management API token stored securely (server-side only)

## 16. Remaining Limitations

1. **~2-5 second delay**: pg_cron processes queue every 2 seconds. New schema not immediately available to PostgREST. Acceptable for provisioning flow.
2. **Management API dependency**: If Management API is down, schema registration fails. Retry handles transient failures. Permanent failure requires manual intervention.
3. **Token management**: PAT must be refreshed periodically (Supabase PATs don't expire by default, but best practice is rotation).
4. **Rate limits**: Management API has rate limits. Provisioning is rare, so this is unlikely to be hit.
5. **pg_net availability**: Must verify `pg_net` extension is available and `postgres` role can call `net.http_post()`. If not, fall back to Edge Function approach.

---

## Recommendation

**Implement Option A (pg_net HTTP from PostgreSQL)** as primary approach. Fall back to Option B (Edge Function) if pg_net is not available.

The pg_cron queue mechanism is **replaced**, not supplemented. The Management API is the single source of truth for PostgREST config on hosted Supabase.
