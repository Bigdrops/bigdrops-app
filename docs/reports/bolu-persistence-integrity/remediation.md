# Bolu Persistence Integrity Remediation

**Date:** 2026-11-18 (updated same day after completion review)
**Audit Reference:** `docs/Reports/ai-BOLU/bolu-persistence-integrityverification-audit.md`
**Scope:** D1, D2, D4 (implementation), D3 (investigation only)
**Excluded:** D5, D6 (not addressed)

---

## Status: PARTIALLY COMPLETED

All in-scope implementation corrections are present and pass source/unit
verification. Material verification remains outstanding and is explicitly
listed in §12: genuine concurrent database testing is unavailable, the
migration has not been applied to any database environment, and a future-tenant
RPC provisioning gap was identified and is unresolved within the bounded scope.

---

## 1. Summary of Defects and Outcomes

| Defect | Scope | Outcome |
|--------|-------|---------|
| D1 | Implementation | Fixed — `findPersistedOperation` queries the dedicated `operation_id` column via `.eq()` instead of the type-invalid `custom_fields->>operation_id` filter |
| D2 | Implementation | Fixed in source — dedicated `operation_id` column + partial unique indexes, exact constraint-based 23505 replay classification, verified replay retrieval. DB concurrency behaviour NOT verified (no suitable environment) |
| D4 | Implementation | Fixed — `fetchDocumentPrefixesSafe` returns an explicit `status` union; malformed settings data now aborts; valid absence/default paths preserved |
| D3 | Investigation only | Unresolved — pending hosted PostgREST verification; no audit functions or callers modified |

---

## 2. D1 — Invoice Replay Lookup Type Mismatch

### Root Cause

`invoices.custom_fields` is a `text` column; `quotations.custom_fields` is
`jsonb`. The `->>` operator only works on `jsonb`/`json`. The original
`.filter('custom_fields->>operation_id', 'eq', opId)` errored against invoices,
and the `catch` block returned `null`, rendering the invoice replay guard inert.

### Fix

`src/lib/ai-assistant/bolu-document-service.ts`:

```typescript
// Before (broken on invoices):
.filter('custom_fields->>operation_id', 'eq', opId)

// After (dedicated column, type-safe):
.eq('operation_id', opId)
```

Verified by source and behavioural tests (`D1: …` PASS in both suites).

---

## 3. D2 — Database-Enforced Operation ID Uniqueness

### 3.1 Migration

`supabase/migrations/20261118120000_bolu_operation_idempotency.sql` (prepared,
NOT applied):

1. **Column:** Adds `operation_id text` (nullable) to `invoices` and
   `quotations` in `tenant_master_template` and all active `entity_%` schemas.
2. **Partial unique indexes:** `idx_invoices_operation_id_unique` and
   `idx_quotations_operation_id_unique`, each `WHERE operation_id IS NOT NULL`.
   Structural source tests confirm 26/26 invoice and 23/23 quotation INSERT
   column/placeholder alignment with `operation_id` mapped last via
   `NULLIF(payload->>'operation_id', '')` (empty string → NULL).
3. **Backfill:** See §3.2.
4. **Duplicate pre-check:** Before each index, duplicates are detected with
   `GROUP BY operation_id HAVING count(*) > 1`. On detection the migration
   raises `RAISE EXCEPTION` naming the tenant schema and document family
   (invoices / quotations). No financial record is deleted, merged, or
   arbitrarily modified; no winner is silently chosen.
5. **RPC reinstall:** The two save RPCs are recreated per existing tenant
   schema with `operation_id` in the INSERT column list. Function signatures
   are byte-identical to the canonical 5-argument signatures in
   `20261106230000_tenant_rpc_purchase_order_transaction.sql`, so
   `CREATE OR REPLACE` preserves caller compatibility.
6. **Schema cache:** `NOTIFY pgrst, 'reload schema'` is issued.

### 3.2 Invoice Historical Backfill Safety (corrected in this review)

`invoices.custom_fields` is `text`. The earlier implementation first used a
direct `::jsonb` cast (could abort on invalid JSON), then a broad
`EXCEPTION WHEN others` handler (silently skipped the whole batch after one
bad row), then a first-character/regex filter (rejects valid JSON with leading
whitespace; admits `{invalid}`). All three were corrected.

Current implementation: a PL/pgSQL `FOR v_rec IN EXECUTE format(...)` loop over
candidate rows (`operation_id IS NULL AND custom_fields IS NOT NULL AND
btrim(custom_fields) <> ''`), with the cast isolated in a **per-row**
`BEGIN … EXCEPTION WHEN invalid_text_representation … CONTINUE` block.

Per-row backfill happens **only** when all conditions hold:

- `custom_fields` is non-null and not whitespace-only;
- it parses as valid JSON (per-row exception handler isolates invalid JSON);
- `jsonb_typeof(v_parsed) = 'object'` (scalars, arrays, JSON null are skipped);
- `jsonb_typeof(v_parsed->'operation_id') = 'string'` and
  `NULLIF(btrim(...), '') IS NOT NULL` (missing, null, non-string, empty,
  whitespace-only values are skipped);
- the destination `operation_id IS NULL` (re-checked in the UPDATE).

Historical value handling:

| Historical value | Result |
|------------------|--------|
| Valid JSON object, non-empty string operation_id | Backfilled |
| Valid JSON object without operation_id | Left NULL |
| Valid JSON object with empty/whitespace operation_id | Left NULL |
| Valid JSON scalar / array / JSON null | Left NULL |
| Invalid JSON text | Left NULL, migration continues; counted and reported |
| Empty / whitespace-only text | Excluded by the candidate query |
| Existing dedicated operation_id | Preserved (not in candidate set; UPDATE re-checks) |

Skipped rows are counted (`v_skipped_invalid`, `v_skipped_shape`) and reported
with `RAISE NOTICE` per tenant schema — malformed data is never silently
skipped. Actual counts cannot be established here because the migration has
not been run against a database.

The quotation backfill (jsonb column, no cast risk) was aligned to the same
usability rule: only a non-empty string `operation_id` is written, preventing
empty strings from entering the partial unique index (`'' IS NOT NULL`).

### 3.3 Application: exact 23505 classification (strengthened in this review)

`PostgrestError` shape was verified from
`node_modules/@supabase/postgrest-js/src/PostgrestError.ts`: fields are
`message`, `details`, `hint`, `code` only. **There is no typed `constraint`
field**, so the constraint identity must be read from `message`/`details`
text. The former `/operation_id/.test(message)` contract was replaced.

`isOperationIdConflict(error, family)` now requires:

- `error.code === '23505'`;
- exact whole-identifier match of the family's known constraint name
  (`idx_invoices_operation_id_unique` / `idx_quotations_operation_id_unique`)
  in `message` or `details`;
- explicit rejection if the *other* family's constraint is named;
- a narrow documented fallback accepting PostgreSQL's `Key (operation_id)=`
  detail only when no named constraint is present at all — so unknown named
  constraints and document-number collisions are never guessed at.

`findVerifiedReplay(tenantClient, family, opId)` requires, before reporting a
successful replay: ready tenant client with a concrete schema; a row found via
the tenant-scoped client in the correct family table; and the row's persisted
`operation_id` exactly equal to the proposal's. A confirmed conflict that
cannot be verified returns a failure — never a false successful replay.

All four replay call sites (invoice RPC, invoice fallback, quotation RPC,
quotation fallback) plus the two pre-flight checks use these helpers.
`withUniqueRetry` continues to handle document-number collisions normally.

### 3.4 Concurrency Guarantees — Status by Requirement

| Requirement | Status | Basis |
|-------------|--------|-------|
| Both families have DB-enforced unique indexes in every applicable existing tenant schema | Source verified | Migration loops all `entity_%` schemas with both tables; partial indexes created |
| Future tenant provisioning inherits columns and indexes | Source verified | `_prov_clone_table` uses `CREATE TABLE … LIKE … INCLUDING ALL`; template receives columns + indexes. **RPC bodies caveat below** |
| operation_id and document insert committed atomically | Source verified | Both RPCs are single PL/pgSQL functions performing the INSERT in one statement; operation_id is a column in that INSERT |
| Losing concurrent request retrieves the winning document after commit | **UNVERIFIED** | Code path exists (verified re-read after exact 23505) but only sequential mocks were executed; no genuine concurrent test |
| Rolled-back competing transaction leaves no false completed operation | Mechanism verified by source | Partial unique index covers committed rows only; unverified under real concurrency |
| Replay lookup verifies tenant and document family | Source + unit verified | `findVerifiedReplay` requires ready tenant/schema, family-specific table, and matching operation_id |
| Unrelated 23505 not mistaken for replay | Unit verified | 8 dedicated tests cover both exact constraints, both number-collision indexes, unrelated constraints, loose substrings, non-23505, and the fallback |
| **Future-tenant RPC gap** | **UNRESOLVED** | See §11 |

---

## 4. D4 — Fail-Safe Tenant Prefix Resolution

### 4.1 Implementation

`src/domain/documentNumbering.ts` exposes `PrefixFetchResult` with a
string-literal `status` discriminant (`'ok' | 'error'`). A string literal is
used because `tsconfig.json` has `strict: false`, which widens boolean
literals and prevents discriminated-union narrowing.

`fetchDocumentPrefixesSafe` classification:

| Settings state | Result |
|----------------|--------|
| Valid configured prefix (e.g. `{ invoice: 'SASINV' }`) | `{ status: 'ok', prefixes }` |
| Valid object, no configured prefix (`{}` or partial) | `{ status: 'ok', prefixes }`; `resolvePrefix` applies approved defaults |
| Genuinely absent settings row (`data === null, error === null`) | `{ status: 'ok', prefixes: undefined }` per the established missing-row policy |
| Row exists, `document_prefixes` null/undefined | `{ status: 'ok', prefixes: undefined }` (confirmed absence) |
| Malformed: string, number, array | `{ status: 'error', reason }` |
| Malformed: known prefix key with non-string or invalid value (fails `/^[A-Z0-9]{2,6}$/`) | `{ status: 'error', reason }` |
| Query / authorization error, exception, tenant not ready | `{ status: 'error', reason }` |

The `__auto_seq` reserved key holds a nested cursor object and is explicitly
exempt from prefix-value validation.

Both Bolu creation paths call `fetchDocumentPrefixesSafe` and abort with a
user-facing error on `status === 'error'` — before number allocation or any
insertion. Behavioural test `D4-corrected: Bolu invoice creation aborts when
settings contain malformed prefix data` proves the RPC is never called.

The deprecated `fetchDocumentPrefixes` remains for non-critical callers only
(cursor advance). No `useSettings()` refactor was performed.

---

## 5. D3 — Activity-Event Attribution (Investigation Only)

**Classification: UNRESOLVED — pending hosted PostgREST verification.**
No audit functions or callers were modified.

- Public-scoped `record_invoice_created`
  (`20260809040000_invoice_audit_schema_aware.sql`) falls back to
  `public.invoices` when `p_entity_id` is NULL.
- Tenant-scoped version
  (`20261106230000_tenant_rpc_purchase_order_transaction.sql`) uses
  `__SCHEMA_TEXT__` and queries its own schema, but does not use `p_entity_id`.
- Callers (`bolu-audit.ts`, `src/lib/audit.ts`) pass 4 arguments and wrap
  calls in try/catch with `console.warn`.
- Which overload resolves depends on PostgREST `search_path`; this cannot be
  confirmed without a hosted environment.

---

## 6. Quotation RPC Review (exact evidence)

From `20261118120000_bolu_operation_idempotency.sql`:

- `INSERT INTO %I.quotations (...)` — **23 columns**, `operation_id` last.
- `VALUES ($1 … $23)` — **23 placeholders**, verified in order.
- `USING` clause — **23 arguments** in matching order; final argument
  `NULLIF(p_quotation_payload->>'operation_id', '')`.
- All pre-existing fields (quotation_number, po_number, quotation_title,
  client_id, client_name, project_id, issue_date, valid_until, status, notes,
  terms, workmanship, transportation, shipping, discount, vat, wht, subtotal,
  install_rate_total, total, amount_in_words, custom_fields) remain mapped to
  their original columns.
- Target schema is dynamic `%I` from `v_schema`, set to the tenant schema.
- Signature `(uuid, jsonb, jsonb, text, text)` with original defaults —
  unchanged, so existing callers are compatible.
- Invoice RPC similarly verified at **26 columns / 26 placeholders / 26
  arguments**.

Static source tests (`MIGRATION-STATIC: … alignment`) assert these counts.

---

## 7. Migration Transaction, Rerun, and Failure Safety

- **Transaction:** The file consists of two `DO` blocks plus a `NOTIFY`.
  Supabase CLI applies a migration file as a single transaction; any
  `RAISE EXCEPTION` (e.g. duplicate pre-check) rolls back all tenant columns,
  backfills, indexes, and RPC replacements together. **Hosted behaviour not
  executed — this is PostgreSQL/Supabase semantics from source, not a live
  test.**
- **Rerunnability:** Columns and indexes use `IF NOT EXISTS` guards; the
  backfill candidate set excludes non-NULL `operation_id`; RPCs use
  `CREATE OR REPLACE`. A second execution is therefore a no-op for populated
  rows and safe for unconverted rows. This is genuine structural idempotence,
  not merely the presence of guards.
- **Malformed invoice JSON:** handled per-row (§3.2); a bad row cannot abort
  the batch or migration.
- **Missing expected tenant table:** guarded by `information_schema.tables`
  `t_exists` checks — the schema is skipped rather than erroring.
- **Duplicate historical IDs:** fail-safe `RAISE EXCEPTION` naming schema and
  family; no destructive resolution. Recovery requires an authorized manual
  decision on the specific records, then re-run of the migration.
- **RPC installation failure / partial tenant failure:** because execution is
  transactional, failure rolls back the whole migration. No partial tenant
  state is expected; recovery is to fix the cause and re-apply. Unverified
  against a live database.
- **SQL syntax execution check:** NOT performed — no local PostgreSQL/`psql`
  and no non-production environment is available. DO/IF/LOOP block structure
  was inspected and is balanced.

---

## 8. D4 Correction Review (this task)

Confirmed via 24 D4-focused behavioural tests (all PASS):

- Malformed `document_prefixes` values → `status: 'error'`.
- Invalid individual prefix values cannot silently become valid absence.
- Absent settings row follows the established missing-row policy.
- Valid object with no configured prefix can use approved defaults.
- Failed reads and unavailable tenant context abort before number allocation
  and document insertion.
- String-literal `status` discriminant preserved.

---

## 9. Tenant Provisioning Review

- `tenant_master_template` receives both new columns and both partial unique
  indexes in the migration.
- `_prov_clone_table` (`20260717000000_entity_provisioning_engine.sql`) clones
  with `CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)` — PostgreSQL copies
  indexes under `INCLUDING ALL`, so template columns + indexes are inherited.
- Migration ordering is valid: `20261118120000_bolu_operation_idempotency.sql`
  is the latest timestamped migration and does not disturb existing document
  number-uniqueness indexes (`idx_*_invoice_number_unique`,
  `idx_quotations_quotation_number_unique`) — no DROP of indexes or columns.
- `NOTIFY pgrst, 'reload schema'` is issued.

**Gap (§11):** `_prov_install_tenant_rpcs` still contains RPC bodies without
`operation_id`; it is called by the provisioning engine
(`_prov_provision_entity` step 12 in `20260902120000_provisioning_engine_repair.sql`).
Future tenants therefore inherit the columns/indexes but would receive the
stale RPC bodies that do not populate `operation_id`.

---

## 10. Verification Evidence

Commands run (environment: local Windows host, Bun, no local DB):

| Command | Result |
|---------|--------|
| `bun run audit:load` | Exit 0 (pre-existing warnings only) |
| `bun run typecheck` (`tsc --noEmit`) | Exit 0, 0 errors |
| `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/ai-assistant/bolu-persistence-integrity-remediation.test.js` | **43 tests, 43 pass, 0 fail** |
| `node … --test src/tests/ai-assistant/bolu-canonical-persistence-and-context.test.js` | **27 tests, 27 pass, 0 fail** |
| `node … --test "src/tests/critical/*.test.js"` | 1584 tests, 1580 pass, **4 fail** — identical to pre-existing baseline |

The 4 critical failures (`dashboardThemeExperiment.test.js` ×2,
`documentShareSecurity.test.js`, `original HTML reference remains untouched`)
were present before this work and none of these files import the modified
modules; they are not attributed to this task.

`bun run build` was NOT run. No migration was pushed or applied.

### Verification-type distinction

- **Source inspection:** migration structure, provisioning path, PostgREST
  error shape, RPC alignment — completed.
- **Unit / behavioural tests:** 70 targeted tests pass (43 + 27) — completed.
- **Static SQL syntax execution check:** NOT performed (no local PostgreSQL).
- **Database integration / genuine concurrent requests:** NOT performed (no
  authorized local or non-production database).
- **Hosted migration applied:** NO.
- **Production verification:** NO.

---

## 11. Remaining Risks and Unavailable Checks

1. **Concurrent behaviour UNVERIFIED.** The unique indexes provide the DB
   mechanism, and the application re-read/verification path is unit-tested,
   but genuine concurrent requests (invoice and quotation, same operation ID)
   were not executed. Required: a local or non-production database.
2. **Future-tenant RPC gap (UNRESOLVED).** `_prov_install_tenant_rpcs` installs
   stale RPC bodies without `operation_id`. Future tenants get columns/indexes
   but the installer-supplied RPC would not write `operation_id`, so the unique
   index would not be exercised for their Bolu documents. Fixing this requires
   updating the canonical installer (a large provisioning refactor) — outside
   this bounded scope. Needs separate authorization.
3. **Migration not applied anywhere.** No local, non-production, or production
   application. Backfill skip counts and live DDL behaviour are unknown.
4. **No SQL syntax execution check** (no `psql`/local Postgres).
5. **D3 unresolved** — requires hosted PostgREST resolution check.
6. **Manual save paths** (`useInvoiceSave.ts`, `useQuotationSave.ts`) still
   receive prefixes from React state; no `useSettings()` refactor was
   authorized.
7. **4 pre-existing critical test failures** remain unrelated.

### Migration deployment states (kept separate)

- Source prepared: **YES**
- Applied locally: **NO**
- Applied to non-production: **NO**
- Deployed to production: **NO**
- Hosted behaviour verified: **NO**

No `supabase db push`, production mutation, or destructive Git operation was
performed. Unrelated pre-existing Git work (including deleted `.commandcode`
skills and `docs/prd/` line-ending changes) was preserved.

---

## 12. Final Status Determination

**PARTIALLY COMPLETED.** Implementation is present and unit/source verified,
but material verification remains outstanding (genuine concurrency, live
migration application, SQL execution) and the future-tenant RPC provisioning
gap is unresolved. COMPLETED is not claimed.
