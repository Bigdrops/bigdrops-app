# Phase 2 Document Search Implementation Report

This report was written by Buffy on 2026-10-14 via Freebuff Desktop.

---

## Objective

Complete the interrupted Phase 2 document search workflow (`wf_734f3e428ff7035b`). Recover the work that Kiro committed, keep the valid part, finish the convergence pass, and supply one shared server-side search authority for quotations and invoices. Search must find documents by document number, client name, document title, item description, item make, and item sub-description. Search must not depend on Item Library linkage. A line item with `item_id IS NULL` must stay discoverable.

---

## Scope

- Recover and audit the last three commits and the current working tree.
- Repair the convergence defects in the document search migration.
- Apply the SQL repair through the Supabase workflow.
- Extend the test suite.
- Prove the result against the live database and the live REST interface.
- Write this report.

Out of scope: new document types (RFQ, CPS, CSR, waybill, receipts), the Item Library, PDF renderers, `src/lib/Calculations.ts`, and all existing migrations.

---

## Recovery Findings — The Last Three Commits

The working tree held no uncommitted source changes at recovery start. The three never-pushed commits belong to the document search workflow.

| Commit | Subject | Deliverables |
| --- | --- | --- |
| `54168aea` | `feat(search): add search_documents RPC with pg_trgm indexes [FEAT-001]` | `supabase/migrations/20261014100000_document_search_platform.sql` (471 lines) |
| `add38057` | `feat(search): TypeScript contract, service, hook, and results component [FEAT-002]` | `src/domain/search/types.ts`, `src/modules/search/documentSearchService.ts`, `src/hooks/useDocumentSearch.ts`, `src/components/search/DocumentSearchResults.tsx`, `src/config/moduleAdapters.ts` |
| `8e360fb2` | `feat(search): test suite and UI wiring for quotation and invoice lists [FEAT-003]` | `src/tests/critical/documentSearchPlatform.test.js` (24 tests), `src/components/quotation/QuotationList.tsx`, `src/pages/Invoices.tsx` |

Two untracked artifacts also belong to the workflow:

- `.agents/tasks/plan.md` — the Kiro plan.
- `docs/reports/SEARCH/phase-1-document-search-forensic-audit.md` — the Phase 1 audit.

### What Kiro Already Completed

- The plan and the Phase 1 audit.
- The migration. It was written **and already applied** before recovery started. `supabase_migrations.schema_migrations` held `version 20261014100000` with the `document_search_platform` name.
- Live installation. Eleven `entity_*` schemas and `tenant_master_template` carried `search_documents` and six trigram indexes each.
- The TypeScript contract, service, hook, and results component.
- The adapter quick fix. `quotation_title` and `invoice_title` were added to the SELECT list and the ILIKE filter of both adapters.
- List wiring. The quotation list and the invoice page render `DocumentSearchResults` when the search term is two characters or longer, and they navigate with `result.route`.
- 24 test guards. All 24 passed.

The valid work was preserved. No file was rewritten for style.

### What Was Missing

The workflow stopped before convergence. There was no functional test, no live acceptance check, and no repair of the following defects. All defects below were reproduced against the live database.

---

## Convergence Defects Found And Fixed

| # | Defect | Evidence Before The Repair | Repair |
| --- | --- | --- | --- |
| 1 | Term normalisation was inconsistent. Only the exact-equality comparisons used the normalised needle. Every ILIKE predicate used raw `p_term`. | `search_documents('Oil Separator')` returned 1 row. `search_documents('  Oil Separator  ')` returned 0 rows. | One needle is computed from `lower(btrim(coalesce(p_term,'')))` and every predicate uses it. The padded term now returns 1 row. |
| 2 | An empty or whitespace-only term was unsafe. | `''` returned 50 rows (the default limit). `'   '` returned 3 rows. No scan guard existed. | The needle relation is empty when the term is blank, so the search returns no rows. EXPLAIN shows the four document tables are "never executed". |
| 3 | LIKE metacharacters in user input acted as wildcards. | `'%'` returned 50 rows. `'_'` returned 50 rows. | Backslash, percent, and underscore are backslash-escaped in the needle. `'%'` now returns the 4 rows that contain a literal percent sign. `'_'` returns 0 rows. |
| 4 | Every predicate wrapped the column in `lower()`. A function on the column makes a trigram index unusable. | The plan contained `lower(coalesce(description,'')) ~~* '%12mm Concrete Rod%'` and used a sequential scan. | `ILIKE` is already case-insensitive, so the wrapper is gone. The plan now contains no `lower()` call and can use `idx_quotation_items_description_trgm`. |
| 5 | `has_more` was `results.length >= limit`. A full page claimed that more rows existed. | Exactly two matches with `limit: 2` reported `has_more: true`. | The service requests `limit + 1` rows, returns `limit` rows, and reports `has_more` only when the extra row arrives. |
| 6a | Header `match_source` and `matched_text` returned NULL for a pure-substring document number match. The rank still scored 800. | `search_documents('QUO-38')` returned 10 rows with `match_source = NULL`, `matched_text = NULL`, `match_rank = 800`. | The source case covers every branch that can score. The same query now returns 10 rows with 0 null sources. |
| 6b | Header `match_source` preferred client over title, but `match_rank` prefers title (650) over client (500). A document that matched both reported rank 650 with the client text. | Review of the deployed body. | The source case now follows the rank precedence: number, then title, then client. |
| 7 | Deduplication and final ordering were not deterministic on a rank tie. | Two items of one document can both score 300. | `match_source` and `matched_text` were added to the `DISTINCT ON` order. `document_number` and `document_id` were added to the final order. |
| 8 | The backfill swallowed every installation error with `EXCEPTION WHEN OTHERS THEN RAISE WARNING`. | Code review. A tenant that failed to install was invisible. | Structurally incomplete schemas are classified by the tables they are missing and are reported by name. A failure in a schema that holds all four document tables aborts the migration. |
| 9 | `public._prov_install_search(text)` is SECURITY DEFINER and accepted a caller-supplied schema name. Execute was granted to PUBLIC. | `has_function_privilege('anon', ...)` and `('authenticated', ...)` both returned `true`. | The installer rejects any name that is not `entity_*` or `tenant_master_template`, and execute was revoked from PUBLIC, `anon`, and `authenticated`. The owner keeps execute, so `provision_entity` still works. |
| 10 | Six searched columns had no index: `client_name` on both headers, both document numbers, and both `sub_description` columns. A trigram index can only serve an OR predicate when every branch of the OR is indexed. | Index inspection of the live schema. | Each schema now carries 12 trigram indexes, so every OR branch is indexable. |

Defect 6a was introduced by the convergence rewrite itself and was caught by the live acceptance harness before the work was reported.

---

## Final Architecture

```
Quotation list / Invoice page
        │  (term, document_types, client_id)
        ▼
useDocumentSearch  ─►  searchDocuments service  ─►  tenantClient.rpc('search_documents')
        │                       │                                │
        │                       └── requests limit + 1          ▼
        │                                            <tenant>.search_documents()
        ▼                                                      │
DocumentSearchResults                                          ├─ quotations      + quotation_items
  (badge, number, title, client, match source,                 ├─ invoices        + invoice_items
   matched text, date, route)                                  ├─ rank, dedup, route
                                                               └─ caller-rights RLS
```

Properties of the authority:

| Property | Value |
| --- | --- |
| Language and volatility | `LANGUAGE sql STABLE`, no `SECURITY DEFINER` |
| Data authority | `quotations`, `quotation_items`, `invoices`, `invoice_items` only |
| Item Library dependency | None. `item_id` appears nowhere in the function body. |
| Tenant routing | The function lives inside the tenant schema. The client selects the schema. |
| Schema safety | Every object is schema-qualified. No dynamic SQL and no caller-supplied schema name. |
| Row filtering | `archived_at IS NULL`; `row_type` is NULL or `standard` |
| Deduplication | `DISTINCT ON (document_type, document_id)` |
| Ranking | 1000, 900, 800, 750, 650, 500, 400, 300, 250, 200. No AI or vector ranking. |
| Shared contract | One `RETURNS TABLE` shape for both document types |

### Rank Bands

| Rank | Match |
| --- | --- |
| 1000 | Exact document number |
| 900 | Document number prefix |
| 800 | Document number substring |
| 750 | Exact title |
| 650 | Title substring |
| 500 | Client name |
| 400 | Exact item description |
| 300 | Item description substring |
| 250 | Item make |
| 200 | Item sub-description |

The `match_source` case uses the same precedence, so `match_source` and `matched_text` always describe the winning match.

### Row Type Semantics

The filter is `row_type IS NULL OR row_type = 'standard'`. The NULL branch is necessary. In the live main tenant, 1676 of 2137 `invoice_items` rows have `row_type = NULL`, and all 1676 carry a description, a positive quantity, and a non-zero amount. They are normal line items. `group_header` rows (14 invoices, 29 quotations) are group labels and are excluded. This keeps the behaviour of the first migration, which treated NULL as `standard`.

---

## Files Changed

| File | Change |
| --- | --- |
| `supabase/migrations/20261014120000_document_search_convergence.sql` | **New.** 472 lines. Repairs the installer and the RPC, then reinstalls both into `tenant_master_template` and every eligible `entity_*` schema. |
| `src/modules/search/documentSearchService.ts` | `has_more` now uses the `limit + 1` probe. Doc comment updated. |
| `src/domain/search/types.ts` | `has_more` and `results` documentation corrected. |
| `src/hooks/useDocumentSearch.ts` | `has_more` is state and is returned to callers. |
| `src/components/search/DocumentSearchResults.tsx` | Accepts an optional `hasMore` prop and shows one muted line when more matches exist. |
| `src/components/quotation/QuotationList.tsx` | Passes `hasMore`. |
| `src/pages/Invoices.tsx` | Passes `hasMore`. |
| `src/tests/critical/documentSearchPlatform.test.js` | 24 tests became 44. The RPC contract tests now read the **effective** definition. |

No existing migration was modified. No protected file was touched.

---

## Migration Application Status

| Item | Status |
| --- | --- |
| `20261014100000_document_search_platform.sql` | Already applied before recovery. Not modified. |
| `20261014120000_document_search_convergence.sql` | Applied. Recorded in `supabase_migrations.schema_migrations`. |
| Schemas with the corrected RPC | 12 (`tenant_master_template` + 11 `entity_*`) |
| Schemas with the old body | 0 |
| Trigram indexes | 144 (12 per schema) |
| Schemas skipped, with reason | 3 (`entity_bigdrops-main_agam`, `entity_bigdrops-main_issa-certified`, `entity_bigdrops-main_ororo`). Each schema is missing the `quotations`, `quotation_items`, `invoices`, and `invoice_items` tables. |
| Future tenants | `provision_entity` step 11d calls `_prov_install_search`, which holds the corrected body. The template schema carries the corrected body too. |
| PostgREST | `NOTIFY pgrst, 'reload schema'` was issued. `main` is in `pgrst.schemas`. |

Two safety procedures were used:

1. **Pre-flight in a rolled-back transaction.** The migration was executed inside `BEGIN … ROLLBACK` before it was pushed. This caught a real defect: `v_installed || 'tenant_master_template'` was resolved as an array concatenation and failed with "malformed array literal". The code now uses `array_append`.
2. **Migration repair.** The first push was recorded. The acceptance harness then found defect 6a. The recorded version was cleared with `supabase migration repair --status reverted 20261014120000`, the file was corrected, and `supabase db push` was run again. The migration is idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`), so the second run was safe.

---

## Live Acceptance Evidence

All checks ran against `entity_bigdrops-main_main` on the hosted project. The harness returned **39 of 39 PASS**.

### Reference Fixture

| Field | Value |
| --- | --- |
| Quotation | `SASQUO-382` |
| Client | `REX Forestry Ltd` (stored as `Rex Forestry Ltd`) |
| Title | `Materials for Oil Separator and Used Oil Store` |
| Line item | `12mm Concrete Rod` (15 line items, all `row_type = 'standard'`, all active) |
| Invoice | `SASINV101` |
| Invoice title | `Supply of Electrical Lighting Fixtures & Ceiling Fans` |
| Null-linkage line | `18W Panel Light`, `item_id IS NULL` |

### The Four Required SASQUO-382 Searches

| Search term | Result | `match_source` | `match_rank` | `matched_text` |
| --- | --- | --- | --- | --- |
| `SASQUO-382` | 1 row | `number` | 1000 | `SASQUO-382` |
| `Rex Forestry` | 50 rows, contains `SASQUO-382` | `client` | 500 | `Rex Forestry Ltd` |
| `Oil Separator` | 1 row | `title` | 650 | `Materials for Oil Separator and Used Oil Store` |
| `12mm Concrete Rod` | 1 row | `item_description` | 400 | `12mm Concrete Rod` |

`Concrete Rod` also returns `SASQUO-382` at rank 300, which proves the item-description substring band.

### Required Check Groups

| Group | Checks | Result |
| --- | --- | --- |
| Quotation coverage (number exact, case, substring, client, title, item description exact and substring, make `Abro 1800`, sub-description `threaded`) | Q1–Q8 | PASS |
| Quotation term handling (padded term) | Q9 | PASS |
| Quotation deduplication (two `Cutting Disc` items in one document return one row) | Q10 | PASS |
| Archived quotation exclusion (`SASQ-1089`, `SASQ-1090`) | Q11–Q12 | PASS |
| Invoice coverage (number, client, title, item description, item make `AKT`, item sub-description `Servo controlled`) | I1–I7 | PASS |
| Best rank wins over an item match in the same document (invoice title 650 beats item 300) | I8 | PASS |
| Mixed search returns both types; type filters exclude the other type | S1–S4 | PASS |
| Client scope is server-side (`p_client_id`) and every returned row carries that client | S5–S6 | PASS |
| Empty, whitespace-only, and NULL terms return nothing | S7–S9 | PASS |
| `%` and `_` are matched literally | S10–S11 | PASS |
| `p_limit` is honoured; the RPC returns 51 rows when 51 are requested | S12–S13 | PASS |
| Tenant isolation (a second tenant sees only its own documents) | S14–S17 | PASS |

Every check also asserted four invariants over every returned row: `document_type` is `quotation` or `invoice`; the type filter is respected; `route` equals `/quotations/<id>` or `/invoices/<id>` for the row's own id; `match_rank` is one of the ten defined bands; `match_source` and `matched_text` are never NULL; and no `(document_type, document_id)` pair repeats.

### Null Item Linkage

| Proof | Result |
| --- | --- |
| Structural: `item_id` does not appear in the RPC body | Confirmed. Test 10 guards this. |
| Live invoice row with `item_id IS NULL`: `18W Panel Light` via `18W Panel` | Found, `match_source = item_description`, `match_rank = 300`. |
| Live invoice row with `item_id IS NULL`: exact description | Found, `match_rank = 400`. |

The null-linkage proof needs no data change: `SASINV101` already holds three `item_id IS NULL` lines.

### Caller Rights, RLS, And The Real Client Path

| Check | Result |
| --- | --- |
| `search_documents` is caller-rights | `prosecdef = false` |
| Execute grants on the tenant RPC | `anon`, `authenticated`, `service_role` = true |
| Execute grant on the installer after the repair | `anon` = false, `authenticated` = false, owner = true |
| RLS on the four source tables | Row security is enabled, 4 policies each |
| `SET LOCAL ROLE authenticated` with no JWT, then search `SASQUO-382` | 0 rows. RLS blocks the caller. |
| `POST /rest/v1/rpc/search_documents` with `Accept-Profile: entity_bigdrops-main_main` and the anon key | HTTP 200, body `[]` |
| Control: `POST /rest/v1/rpc/search_documents_does_not_exist` | HTTP 404 |

The 200 with an empty body proves the function is present in the PostgREST schema cache and reaches the client path. The 404 control proves the 200 came from a real route.

---

## Performance Measurement

The probe term was `12mm Concrete Rod` against the main tenant.

| Measure | Before the repair | After the repair |
| --- | --- | --- |
| Predicate in the plan | `lower(coalesce(description,'')) ~~* '…'` | `coalesce(description,'') ~~* '…'` |
| `lower()` calls in the live plan | Present | 0 |
| Execution time of the probe | 35.1 ms | 23.6 ms |
| Planning time of the probe | 24.2 ms | 11.5 ms |
| Rows read from `quotation_items` | 3219 (all) | 3191 (all) |
| Trigram index reachable | No | Yes |

The planner still chooses a sequential scan for this table. That is the cheaper plan at 3191 rows. The repair removes the structural blocker, which is what matters for growth:

```
EXPLAIN SELECT count(*) FROM <tenant>.quotation_items
WHERE description ILIKE '%12mm Concrete Rod%';   -- SET enable_seqscan = off

Bitmap Heap Scan on quotation_items
  ->  Bitmap Index Scan on idx_quotation_items_description_trgm
```

For an empty term, all four document table scans are **never executed**:

```
->  Seq Scan on quotations q          (never executed)
->  Seq Scan on quotation_items qi    (never executed)
->  Seq Scan on invoices i            (never executed)
->  Seq Scan on invoice_items ii      (never executed)
Execution Time: 2.881 ms
```

---

## Verification

```
Verification:
- bun run audit:load: passed — 42 oversized files, 8 broad selects, 1 component fetch, 4 heavy limits. The same counts were measured before this work.
- bun run typecheck: passed — exit code 0, no diagnostics.
- focused document search tests: passed — 44 tests, 44 pass, 0 fail.
- full test suite: 1128 tests, 1113 pass, 15 fail. The same 15 failures occur with this work removed.
- supabase db push: passed — 20261014120000_document_search_convergence.sql applied.
- git diff --check: passed — no whitespace errors.
- git status after convergence: 7 modified files, 3 untracked artifacts. No unrelated file was changed.
- bun run build: skipped due to hardware policy.
```

### Test Suite Quality

The suite grew from 24 file-structure guards to 44 tests.

- Tests 10–18 now read the **effective** definition, that is the last migration that defines the RPC. Asserting the first draft would pass while the deployed function behaved differently.
- Tests 25–37 guard every convergence repair: normalisation, escaping, blank-term safety, the absent `lower()` wrapper, needle joins, dedup determinism, `match_source` precedence, installer hardening, and index completeness.
- Tests 38–44 exercise `documentSearchService` against a stub tenant client: `has_more` in all three cases, the `limit + 1` request, short-term short-circuit, term trimming, filter forwarding, and error propagation.

Two mutation checks prove that the new tests detect the defects:

| Mutation | Test result |
| --- | --- |
| Restore `has_more: rawRows.length >= limit` | Test 40 fails |
| Restore `lower(coalesce(qi.description,''))` | Test 29 fails |

Both files were restored byte-identical after the mutation checks.

### Pre-existing Test Failures

Fifteen tests fail in the repository. They fail identically with this work removed, so they are not regressions.

| Failing suite | Cause |
| --- | --- |
| `invoiceAccountingIntegration`, `paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract` | Import-time failure: `VITE_SUPABASE_URL` is undefined in the Node test runner |
| `cpsIndustry`, `cpsLedger`, `cpsPdf` | Same import-time failure |
| CPS view and action-order assertions, theme toggle assertions, `validateFlaggedCleanupImport` | Unrelated UI assertions in files that this work does not touch |

Lint on the changed files reports no new error. The counts are the same as `HEAD`.

| File | Problems at `HEAD` | Problems now |
| --- | --- | --- |
| `src/pages/Invoices.tsx` | 22 (21 errors, 1 warning) | 22 (21 errors, 1 warning) |
| `src/components/quotation/QuotationList.tsx` | 24 (21 errors, 3 warnings) | 24 (21 errors, 3 warnings) |
| `src/hooks/useDocumentSearch.ts` | 2 (`react-hooks/set-state-in-effect`) | 2 (the same rule) |
| `src/tests/critical/documentSearchPlatform.test.js` | 5 (1 `process` global, 4 unnecessary escapes) | 5 (the same findings) |
| `documentSearchService.ts`, `types.ts`, `DocumentSearchResults.tsx` | 0 | 0 |

---

## Supabase Push Status

Applied. `supabase db push` reported `Applying migration 20261014120000_document_search_convergence.sql… Finished supabase db push.` The version is recorded. `supabase migration list` shows no other pending migration.

---

## Risks Or Limitations

1. **The browser UI was not exercised.** The list pages need a signed-in session. The database path, the REST path, and the TypeScript path were verified. A visual check of `DocumentSearchResults` inside the quotation list and the invoice page remains open.
2. **Sequential scans remain at the current data size.** The planner prefers them. The trigram indexes are usable now, but their benefit appears only as tables grow.
3. **Twelve indexes per tenant add write cost.** Line item inserts maintain six more indexes than before. The added indexes cover columns that the search reads.
4. **`MatchSource` still lists `notes`.** The RPC has no notes band, so a notes search is not implemented. The union member is unused.
5. **`anon` keeps execute on the tenant RPC.** Row Level Security returns no tenant rows to an anonymous caller, which the REST check confirms. The grant is inherited from the platform default privileges.
6. **Only four tenant schemas are exposed to PostgREST.** `pgrst.schemas` lists `main`, `agbado`, `ogombo`, and `alarm`. This is pre-existing platform behaviour and outside this task. Search is installed in all eleven provisioning-complete `entity_*` schemas.
7. **The `limit + 1` probe costs one extra row per search.** This is the price of a correct `has_more`.

---

## Deferred Work

### Client-Scoped Search In The Client Detail Screen

The backend supports client-scoped search and it is proven server-side (checks S5 and S6). The `useDocumentSearch` hook already accepts `client_id`. The remaining step is small: pass the client id from the client detail screen and render `DocumentSearchResults`. No backend change is needed.

### Future Document Types

The architecture is additive. RFQ, CPS, CSR, waybill, and receipts need no second search system.

1. Add a header CTE and an item CTE to `search_documents`, each cross joined to `needle` and each filtered by `archived_at` and the type filter.
2. Add the new names to `UNION ALL` in the `combined` CTE.
3. Choose rank bands. Reuse 1000–500 for header fields so ranking stays comparable across types.
4. Extend the `DocumentType` union in `src/domain/search/types.ts`. The union propagates to the result type, the hook, and the component.
5. Add the label and the route prefix to `DOC_TYPE_LABELS` in `DocumentSearchResults`.
6. Add the route to the caller's navigation map.

The deduplication, ranking, `route`, `match_source`, `matched_text`, `has_more`, and tenant handling need no change.

---

## Skills Used

Skills used: supabase-postgres-best-practices

Documentation standard: ASD-STE100 Simplified Technical English

---

## Appendix A — Acceptance Harness

The harness was run with `supabase db query --linked -f <file>`. It builds a temporary table, iterates 37 parameter sets, and evaluates every invariant per row. It ran as one transaction and left no object behind.

```sql
CREATE TEMP TABLE probe_out(seq int, check_name text, detail text, ok boolean);

DO $probe$
DECLARE
    v_rex   uuid;
    r       record;
    w       record;
    v_total int; v_bad int; v_hits int; v_forbid int;
    v_detail text; v_seen text[]; v_ok boolean;
BEGIN
    SELECT client_id INTO v_rex
      FROM "entity_bigdrops-main_main".quotations
     WHERE quotation_number = 'SASQUO-382';

    FOR r IN
        SELECT * FROM (VALUES
          ('entity_bigdrops-main_main', 1, 'Q1 exact quotation number', 'SASQUO-382',
           ARRAY['quotation'], NULL::uuid, 'SASQUO-382', 'number', 1000, 1, NULL::int, NULL::text, 50),
          -- … 36 further rows: quotation, invoice, shared, scope, limit, isolation …
        ) AS t(schema_name, seq, check_name, term, types, client_id,
               expect_doc, expect_source, expect_rank, min_total, max_total, forbid_doc, lim)
    LOOP
        v_total := 0; v_bad := 0; v_hits := 0; v_forbid := 0;
        v_detail := ''; v_seen := ARRAY[]::text[];

        FOR w IN EXECUTE format(
            'SELECT document_type, document_id, document_number, client_id, match_source, '
            'matched_text, match_rank, route FROM %I.search_documents($1, $2, $3, $4)',
            r.schema_name
        ) USING r.term, r.types, r.client_id, r.lim
        LOOP
            v_total := v_total + 1;
            v_seen  := array_append(v_seen, w.document_type || ':' || w.document_id::text);

            IF w.document_type NOT IN ('quotation','invoice') THEN v_bad := v_bad + 1; END IF;
            IF r.types IS NOT NULL AND NOT (w.document_type = ANY(r.types)) THEN v_bad := v_bad + 1; END IF;
            IF w.route <> (CASE w.document_type WHEN 'quotation' THEN '/quotations/' ELSE '/invoices/' END)
                          || w.document_id::text THEN v_bad := v_bad + 1; END IF;
            IF w.match_rank NOT IN (1000,900,800,750,650,500,400,300,250,200) THEN v_bad := v_bad + 1; END IF;
            IF w.match_source IS NULL THEN v_bad := v_bad + 1; END IF;
            IF w.matched_text IS NULL THEN v_bad := v_bad + 1; END IF;
            IF r.client_id IS NOT NULL AND w.client_id IS DISTINCT FROM r.client_id THEN v_bad := v_bad + 1; END IF;
            IF r.expect_doc IS NOT NULL AND w.document_number = r.expect_doc
               AND w.match_source = r.expect_source
               AND (r.expect_rank IS NULL OR w.match_rank = r.expect_rank)
            THEN v_hits := v_hits + 1; END IF;
            IF r.forbid_doc IS NOT NULL AND w.document_number = r.forbid_doc THEN v_forbid := v_forbid + 1; END IF;
        END LOOP;

        v_ok := (v_bad = 0)
            AND (v_total = (SELECT count(DISTINCT s) FROM unnest(v_seen) s))
            AND (r.min_total IS NULL OR v_total >= r.min_total)
            AND (r.max_total IS NULL OR v_total <= r.max_total)
            AND (r.expect_doc IS NULL OR v_hits >= 1)
            AND (r.forbid_doc IS NULL OR v_forbid = 0);

        INSERT INTO probe_out VALUES (r.seq, r.check_name, format('total=%s bad=%s', v_total, v_bad), v_ok);
    END LOOP;
END;
$probe$;

SELECT seq, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, check_name, detail
FROM probe_out ORDER BY seq;
```

## Appendix B — The `limit + 1` Rule

```
Caller asks for 50.

RPC is asked for 51.
  Rows returned: 51  →  results = first 50, has_more = true
  Rows returned: 50  →  results = 50,       has_more = false
  Rows returned:  7  →  results =  7,       has_more = false

The extra row is never shown to the caller.
```
