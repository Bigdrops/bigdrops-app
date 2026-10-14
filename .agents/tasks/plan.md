# Implementation Plan — Phase 2 Document Search Platform

Prepared by: Kiro planning agent  
Date: 2026-10-14  
Workflow: wf_734f3e428ff7035b  

---

## Confirmed Table DDL (from migration sources)

### quotations (20260520090002_quotations.sql)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| quotation_number | text NOT NULL | Unique B-tree index |
| quotation_title | text | Nullable — NOT SEARCHED today |
| client_id | uuid | FK to clients |
| client_name | text | Searched today |
| project_id | uuid | FK |
| issue_date | date NOT NULL | |
| valid_until | date | |
| status | text | |
| notes | text | |
| terms | text | |
| po_number | text | |
| archived_at | timestamptz | Filter: IS NULL |
| created_at, updated_at | timestamptz | |
| workmanship, transportation, shipping, discount, vat, wht, subtotal, install_rate_total, total | numeric | DO NOT include in text search |
| scope_type | text | |

### quotation_items (20260520090002_quotations.sql)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| quotation_id | uuid | FK to quotations |
| description | text | Primary free-text — NOT SEARCHED today; MUST BE item_id-independent |
| sub_description | text | Nullable — safe to include |
| make | text | Nullable — safe to include |
| quantity | numeric | DO NOT include |
| unit | text | DO NOT include |
| unit_price, amount | numeric | DO NOT include |
| row_type | text | Filter: only 'standard' rows |
| group_id, group_name | text | |
| sort_order | integer | |
| item_id | uuid NULLABLE | MUST NOT be required for search |
| install_rate, vat_rate, discount_rate | numeric | DO NOT include |
| formula | text | DO NOT include |

### invoices (20260520090003_invoices.sql)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| invoice_number | text NOT NULL | |
| invoice_title | text | NOT SEARCHED today |
| client_id | uuid | FK |
| client_name | text | Searched today |
| project_id | uuid | FK |
| issue_date | date | |
| due_date | text | |
| status | text | |
| notes | text | |
| terms | text | |
| po_number | text | |
| archived_at | timestamptz | |
| created_at, updated_at | timestamptz | |
| subtotal, vat, wht, discount, workmanship, transportation, shipping, install_rate_total, total | numeric | DO NOT include in text search |
| document_type | text | |
| scope_type | text | |

### invoice_items (20260520090003_invoices.sql)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| invoice_id | uuid | FK to invoices |
| description | text NOT NULL | Primary free-text — MUST BE item_id-independent |
| sub_description | text | Nullable — safe to include |
| make | text | Nullable — safe to include |
| quantity | numeric | DO NOT include |
| unit | text | DO NOT include |
| unit_price, amount | numeric | DO NOT include |
| vat_rate, install_rate, discount_rate | numeric | DO NOT include |
| row_type | text | Filter: only 'standard' rows |
| group_id, group_name | text | |
| sort_order | integer | |
| item_id | uuid NULLABLE | MUST NOT be required for search |
| formula | text | DO NOT include |

---

## Confirmed Architecture Decisions

### Decision 1: RPC Architecture — Option B (new `useDocumentSearch` hook + tenant RPC)

**Rationale:** The existing `DocumentQueryProvider` + adapter pattern is purpose-built for list pages with filter/sort state. It is not designed for cross-document result rendering. Bolting a cross-type union result into the existing adapter contract would require changing the adapter return type (currently `any[]`) and the context state shape — a wide blast radius with no benefit. A new `useDocumentSearch` hook that calls `tenantClient.rpc('search_documents', ...)` directly follows the pattern already established in `src/lib/audit.ts`, `src/hooks/useInvoiceSave.ts`, and `src/domain/cps/feedbackStore.ts`. The adapter **search fields** are also widened (quotation_title, invoice_title added to OR filters) as a zero-infrastructure quick fix — this is orthogonal to the new RPC.

### Decision 2: Caller-rights STABLE function (no SECURITY DEFINER)

**Rationale:** The audit confirmed that the RPC is defined inside the tenant schema (e.g. `entity_bigdrops-main_main.search_documents`). Caller-rights functions inherit the caller's session, schema, and RLS automatically. SECURITY DEFINER is not needed and adds risk. This matches `get_item_suggestions` which is also `LANGUAGE sql STABLE` with no SECURITY DEFINER.

### Decision 3: `sub_description` and `make` included in search

**Rationale:** Both `quotation_items` and `invoice_items` have `sub_description` and `make` columns confirmed in DDL. They are structurally consistent across both tables. Including them adds discovery for manufacturer-branded items without financial data risk. Audit ranked item make below description (rank 250 vs 300).

### Decision 4: pg_trgm via `CREATE EXTENSION IF NOT EXISTS pg_trgm`

**Rationale:** Zero pg_trgm or GIN index usage exists in any migration. The extension is not yet enabled. On Supabase, `CREATE EXTENSION IF NOT EXISTS pg_trgm` can be run in a migration as postgres superuser — Supabase migrations run as the postgres role. Confirmed: no prior migration uses this pattern, but Supabase supports it. The migration must be written to be idempotent (`IF NOT EXISTS`).

### Decision 5: `CREATE INDEX CONCURRENTLY` is UNSAFE in migrations on Supabase

**Rationale:** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. `supabase db push` wraps each migration in a transaction. Zero migrations in this project use `CONCURRENTLY`. Use standard `CREATE INDEX IF NOT EXISTS ... USING GIN (... gin_trgm_ops)` without CONCURRENTLY. At ~2,799 quotation_items rows, non-concurrent index creation is instantaneous and safe.

### Decision 6: Install in `tenant_master_template` + all `entity_*` schemas + provision_entity

**Rationale:** All previous tenant object installers follow exactly this pattern: create a `_prov_install_*` helper, call it in a DO block for all existing entity schemas, call it in `provision_entity`. The new `_prov_install_search` helper matches this convention exactly.

### Decision 7: Test framework is Node.js built-in test runner

**Rationale:** Confirmed from `package.json`: `"test": "node --experimental-loader ./src/tests/resolve-alias.js --test \"src/tests/critical/*.test.js\""`. Tests use `import test from 'node:test'` and `import assert from 'node:assert/strict'`. New tests must match this pattern. Tests must live in `src/tests/critical/` to be picked up by the test command.

### Decision 8: New migration filename

**Rationale:** The latest migration is `20261006150000_remove_orphan_public_diagnostic_functions.sql`. The next timestamp must be later. Use: `20261014100000_document_search_platform.sql`.

### Decision 9: No `DocumentQueryContext` changes for search_documents

**Rationale:** The existing `DocumentQueryContext` and adapters are widened only for the quick-fix path (add `quotation_title` / `invoice_title` to select + OR filter). The `search_documents` RPC is consumed via a new `useDocumentSearch` hook, which is independent and does not need to go through `DocumentQueryContext`. This keeps the existing list pages unchanged except for the narrowly scoped adapter updates.

---

## Implementation Plan

- [ ] 1. **Widen quotationsAdapter and invoicesAdapter to include title fields**  
      In `src/config/moduleAdapters.ts`, update `quotationsAdapter.fetcher`:  
      — Change SELECT from `"id, quotation_number, client_name, ..."` to include `quotation_title`.  
      — Change the ILIKE OR filter to add `quotation_title.ilike.%${term}%`.  
      Do the same for `invoicesAdapter.fetcher`: add `invoice_title` to the SELECT and add `invoice_title.ilike.%${term}%` to the OR filter.  
      This is the "Phase 2a immediate fix" that makes "Oil Separator" find SASQUO-382 without any new infrastructure.  
      Files: `src/config/moduleAdapters.ts`  
      Verify: `bun run audit:load` passes; `bun run test` passes (existing tests do not break).

- [ ] 2. **Create the shared TypeScript search contract**  
      Create `src/domain/search/types.ts` with:  
      — `DocumentType` union: `'quotation' | 'invoice' | 'waybill' | 'csr' | 'rfq' | 'cps'`  
      — `MatchSource` union: `'number' | 'client' | 'title' | 'item_description' | 'item_make' | 'item_sub_description' | 'notes'`  
      — `DocumentSearchResult` interface with fields: `document_type`, `document_id` (string/uuid), `document_number`, `title` (string | null), `client_id` (string | null), `client_name` (string | null), `document_date` (string | null), `match_source`, `matched_text`, `match_rank` (number), `route` (string)  
      — `DocumentSearchParams` interface: `term` (string), `document_types` (DocumentType[] | null), `client_id` (string | null), `limit` (number, default 50)  
      — `DocumentSearchResponse` interface: `results` (DocumentSearchResult[]), `has_more` (boolean)  
      These types are derived from confirmed column names. Do not fabricate any field names.  
      Files: `src/domain/search/types.ts` (CREATE)  
      Verify: `bun run audit:load && bun run typecheck` — no type errors in the new file.

- [ ] 3. **Create the documentSearchService module**  
      Create `src/modules/search/documentSearchService.ts` with a single exported function:  
      ```ts
      export async function searchDocuments(
        tenantClient: TenantClient,
        params: DocumentSearchParams
      ): Promise<DocumentSearchResponse>
      ```  
      The function calls `tenantClient.rpc('search_documents', { p_term, p_document_types, p_client_id, p_limit })`.  
      It maps the raw RPC result rows to `DocumentSearchResult[]`.  
      It sets `has_more = results.length >= params.limit`.  
      It validates `params.term` (min 2 chars; if shorter, return `{ results: [], has_more: false }` immediately without calling the RPC).  
      On error, it rethrows with a user-facing message prefix (`"Search failed: " + error.message`).  
      Follow the `src/lib/audit.ts` pattern for RPC calls (destructure `{ data, error }`, throw on error).  
      Files: `src/modules/search/documentSearchService.ts` (CREATE)  
      Verify: `bun run audit:load && bun run typecheck` — no type errors.

- [ ] 4. **Create the `useDocumentSearch` hook**  
      Create `src/hooks/useDocumentSearch.ts` with a React hook:  
      ```ts
      export function useDocumentSearch(): {
        search: string;
        setSearch: (term: string) => void;
        results: DocumentSearchResult[];
        loading: boolean;
        error: string | null;
        reset: () => void;
      }
      ```  
      — Accepts optional `defaultDocumentTypes?: DocumentType[]` and `clientId?: string | null` params.  
      — Manages local `search` state (string).  
      — Debounces by 350ms (use `useRef<ReturnType<typeof setTimeout>>` like `QuerySearchBar.tsx`).  
      — Calls `searchDocuments(tenantClient, { term, document_types, client_id, limit: 50 })` when search term is ≥ 2 chars.  
      — Clears results when term drops below 2 chars.  
      — Cancels in-flight requests (use a `cancelled` flag in `useEffect` cleanup, same pattern as `DocumentQueryContext.tsx`).  
      — Requires `tenantClient` from `useEntity()`.  
      Files: `src/hooks/useDocumentSearch.ts` (CREATE)  
      Verify: `bun run audit:load && bun run typecheck` — no type errors.

- [ ] 5. **Create the DocumentSearchResults component**  
      Create `src/components/search/DocumentSearchResults.tsx`.  
      Props: `results: DocumentSearchResult[]`, `loading: boolean`, `error: string | null`, `onNavigate: (result: DocumentSearchResult) => void`.  
      Renders a list of result cards. Each card shows:  
      — Document type badge (e.g. "Quotation", "Invoice") using existing badge styling in the project.  
      — Document number (bold).  
      — Title (if not null, secondary line).  
      — Client name (if not null, secondary line).  
      — Document date (formatted via `formatDisplayDate` from `@/lib/formatters/date` — already used in Invoices.tsx).  
      — `matched_text` snippet with the match source label (e.g. "Matched: 12mm Concrete Rod in item description").  
      — An accessible clickable row (button element) that calls `onNavigate(result)`.  
      Loading state: render 3 skeleton cards matching the skeleton pattern in `src/components/loading/AppLoadingStates.tsx`.  
      Empty state: render a neutral message ("No results for this search.").  
      Error state: render a small error notice.  
      No financial amounts or totals are shown in search results.  
      Files: `src/components/search/DocumentSearchResults.tsx` (CREATE)  
      Verify: `bun run audit:load && bun run typecheck` — no type errors.

- [ ] 6. **Wire DocumentSearch into the Quotation list page**  
      Update `src/components/quotation/QuotationList.tsx` to add a cross-document search panel.  
      Read this file first to understand its current layout structure before editing.  
      The search panel is shown only when `useDocumentSearch` returns results (i.e. the term is ≥ 2 chars).  
      When the search panel is active, it renders `<DocumentSearchResults>` instead of the normal list.  
      Navigation: call `useNavigate()` with `result.route` (e.g. `/quotations/<uuid>`).  
      The existing `QuerySearchBar` remains as-is — it drives both the existing ILIKE adapter and the new search hook simultaneously. Use the same search term for both.  
      Files: `src/components/quotation/QuotationList.tsx` (MODIFY)  
      Verify: `bun run audit:load && bun run typecheck` — no type errors.

- [ ] 7. **Wire DocumentSearch into the Invoice list page**  
      Read `src/pages/Invoices.tsx` to identify where `InvoicesContent` renders the list.  
      Apply the same pattern as step 6: when the search term (from `useDocumentQuery('invoices').state.search`) is ≥ 2 chars, also call `useDocumentSearch` with `document_types: ['invoice']` and render `<DocumentSearchResults>` above or instead of the list.  
      Files: `src/pages/Invoices.tsx` (MODIFY)  
      Verify: `bun run audit:load && bun run typecheck` — no type errors.

- [ ] 8. **Create the Supabase migration — search_documents RPC + pg_trgm indexes**  
      Filename: `supabase/migrations/20261014100000_document_search_platform.sql`  
      
      The migration must perform these steps in order:
      
      **Step A: Enable pg_trgm extension (once, globally)**  
      ```sql
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      ```
      
      **Step B: Create `public._prov_install_search(p_schema_name text)` helper**  
      This function installs the GIN trigram indexes and the `search_documents` RPC into a named schema. It uses the `__SCHEMA__` / `__SCHEMA_TEXT__` placeholder replacement pattern from `_prov_install_tenant_rpcs` and `_prov_install_item_library`.
      
      The function body must:
      1. Create GIN trigram indexes (standard, not CONCURRENTLY) on:
         - `<schema>.quotations.quotation_title` → `idx_quotations_quotation_title_trgm`
         - `<schema>.quotation_items.description` → `idx_quotation_items_description_trgm`
         - `<schema>.quotation_items.make` → `idx_quotation_items_make_trgm`
         - `<schema>.invoices.invoice_title` → `idx_invoices_invoice_title_trgm`
         - `<schema>.invoice_items.description` → `idx_invoice_items_description_trgm`
         - `<schema>.invoice_items.make` → `idx_invoice_items_make_trgm`
         All with `IF NOT EXISTS`.
      2. Create `<schema>.search_documents(p_term text, p_document_types text[], p_client_id uuid, p_limit integer)` using `LANGUAGE sql STABLE` (no SECURITY DEFINER). The complete SQL body is specified below.
      
      **Complete SQL for search_documents function body:**
      ```sql
      CREATE OR REPLACE FUNCTION __SCHEMA__.search_documents(
          p_term text,
          p_document_types text[] DEFAULT NULL,
          p_client_id uuid DEFAULT NULL,
          p_limit integer DEFAULT 50
      )
      RETURNS TABLE (
          document_type  text,
          document_id    uuid,
          document_number text,
          title          text,
          client_id      uuid,
          client_name    text,
          document_date  date,
          match_source   text,
          matched_text   text,
          match_rank     integer,
          route          text
      )
      LANGUAGE sql STABLE
      AS $fn$
      WITH needle AS (
          SELECT lower(trim(coalesce(p_term, ''))) AS n
      ),
      -- ─── QUOTATION: number/client/title ───
      q_header AS (
          SELECT
              'quotation'                                          AS document_type,
              q.id                                                 AS document_id,
              q.quotation_number                                   AS document_number,
              q.quotation_title                                    AS title,
              q.client_id,
              q.client_name,
              q.issue_date                                         AS document_date,
              CASE
                  WHEN lower(q.quotation_number) = (SELECT n FROM needle) THEN 'number'
                  WHEN lower(q.quotation_number) ILIKE '%' || p_term || '%' THEN 'number'
                  WHEN lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%' THEN 'client'
                  WHEN lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%' THEN 'title'
              END                                                  AS match_source,
              CASE
                  WHEN lower(q.quotation_number) = (SELECT n FROM needle) THEN q.quotation_number
                  WHEN lower(q.quotation_number) ILIKE '%' || p_term || '%' THEN q.quotation_number
                  WHEN lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%' THEN q.client_name
                  WHEN lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%' THEN q.quotation_title
              END                                                  AS matched_text,
              CASE
                  WHEN lower(q.quotation_number) = (SELECT n FROM needle) THEN 1000
                  WHEN lower(q.quotation_number) ILIKE p_term || '%'       THEN 900
                  WHEN lower(q.quotation_number) ILIKE '%' || p_term || '%' THEN 800
                  WHEN lower(coalesce(q.quotation_title,'')) = (SELECT n FROM needle) THEN 750
                  WHEN lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%' THEN 650
                  WHEN lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%' THEN 500
                  ELSE 0
              END                                                  AS match_rank,
              '/quotations/' || q.id::text                        AS route
          FROM __SCHEMA__.quotations q
          WHERE q.archived_at IS NULL
            AND (p_client_id IS NULL OR q.client_id = p_client_id)
            AND (
                lower(q.quotation_number) ILIKE '%' || p_term || '%'
                OR lower(coalesce(q.client_name,'')) ILIKE '%' || p_term || '%'
                OR lower(coalesce(q.quotation_title,'')) ILIKE '%' || p_term || '%'
            )
      ),
      -- ─── QUOTATION: item description/make/sub_description ───
      q_items AS (
          SELECT
              'quotation'                                          AS document_type,
              q.id                                                 AS document_id,
              q.quotation_number                                   AS document_number,
              q.quotation_title                                    AS title,
              q.client_id,
              q.client_name,
              q.issue_date                                         AS document_date,
              CASE
                  WHEN lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%' THEN 'item_description'
                  WHEN lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%' THEN 'item_make'
                  WHEN lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%' THEN 'item_sub_description'
              END                                                  AS match_source,
              CASE
                  WHEN lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%' THEN qi.description
                  WHEN lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%' THEN qi.make
                  WHEN lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%' THEN qi.sub_description
              END                                                  AS matched_text,
              CASE
                  WHEN lower(coalesce(qi.description,'')) = (SELECT n FROM needle) THEN 400
                  WHEN lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%' THEN 300
                  WHEN lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%' THEN 250
                  WHEN lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%' THEN 200
                  ELSE 0
              END                                                  AS match_rank,
              '/quotations/' || q.id::text                        AS route
          FROM __SCHEMA__.quotations q
          JOIN __SCHEMA__.quotation_items qi ON qi.quotation_id = q.id
          WHERE q.archived_at IS NULL
            AND (p_client_id IS NULL OR q.client_id = p_client_id)
            AND coalesce(qi.row_type, 'standard') = 'standard'
            -- item_id intentionally excluded from WHERE — description is independent
            AND (
                lower(coalesce(qi.description,'')) ILIKE '%' || p_term || '%'
                OR lower(coalesce(qi.make,'')) ILIKE '%' || p_term || '%'
                OR lower(coalesce(qi.sub_description,'')) ILIKE '%' || p_term || '%'
            )
      ),
      -- ─── INVOICE: number/client/title ───
      i_header AS (
          SELECT
              'invoice'                                            AS document_type,
              i.id                                                 AS document_id,
              i.invoice_number                                     AS document_number,
              i.invoice_title                                      AS title,
              i.client_id,
              i.client_name,
              i.issue_date                                         AS document_date,
              CASE
                  WHEN lower(i.invoice_number) = (SELECT n FROM needle) THEN 'number'
                  WHEN lower(i.invoice_number) ILIKE '%' || p_term || '%' THEN 'number'
                  WHEN lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%' THEN 'client'
                  WHEN lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%' THEN 'title'
              END                                                  AS match_source,
              CASE
                  WHEN lower(i.invoice_number) = (SELECT n FROM needle) THEN i.invoice_number
                  WHEN lower(i.invoice_number) ILIKE '%' || p_term || '%' THEN i.invoice_number
                  WHEN lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%' THEN i.client_name
                  WHEN lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%' THEN i.invoice_title
              END                                                  AS matched_text,
              CASE
                  WHEN lower(i.invoice_number) = (SELECT n FROM needle) THEN 1000
                  WHEN lower(i.invoice_number) ILIKE p_term || '%'         THEN 900
                  WHEN lower(i.invoice_number) ILIKE '%' || p_term || '%'  THEN 800
                  WHEN lower(coalesce(i.invoice_title,'')) = (SELECT n FROM needle) THEN 750
                  WHEN lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%' THEN 650
                  WHEN lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%' THEN 500
                  ELSE 0
              END                                                  AS match_rank,
              '/invoices/' || i.id::text                          AS route
          FROM __SCHEMA__.invoices i
          WHERE i.archived_at IS NULL
            AND (p_client_id IS NULL OR i.client_id = p_client_id)
            AND (
                lower(i.invoice_number) ILIKE '%' || p_term || '%'
                OR lower(coalesce(i.client_name,'')) ILIKE '%' || p_term || '%'
                OR lower(coalesce(i.invoice_title,'')) ILIKE '%' || p_term || '%'
            )
      ),
      -- ─── INVOICE: item description/make/sub_description ───
      i_items AS (
          SELECT
              'invoice'                                            AS document_type,
              i.id                                                 AS document_id,
              i.invoice_number                                     AS document_number,
              i.invoice_title                                      AS title,
              i.client_id,
              i.client_name,
              i.issue_date                                         AS document_date,
              CASE
                  WHEN lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%' THEN 'item_description'
                  WHEN lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%' THEN 'item_make'
                  WHEN lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%' THEN 'item_sub_description'
              END                                                  AS match_source,
              CASE
                  WHEN lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%' THEN ii.description
                  WHEN lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%' THEN ii.make
                  WHEN lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%' THEN ii.sub_description
              END                                                  AS matched_text,
              CASE
                  WHEN lower(coalesce(ii.description,'')) = (SELECT n FROM needle) THEN 400
                  WHEN lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%' THEN 300
                  WHEN lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%' THEN 250
                  WHEN lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%' THEN 200
                  ELSE 0
              END                                                  AS match_rank,
              '/invoices/' || i.id::text                          AS route
          FROM __SCHEMA__.invoices i
          JOIN __SCHEMA__.invoice_items ii ON ii.invoice_id = i.id
          WHERE i.archived_at IS NULL
            AND (p_client_id IS NULL OR i.client_id = p_client_id)
            AND coalesce(ii.row_type, 'standard') = 'standard'
            -- item_id intentionally excluded — description is item_id-independent
            AND (
                lower(coalesce(ii.description,'')) ILIKE '%' || p_term || '%'
                OR lower(coalesce(ii.make,'')) ILIKE '%' || p_term || '%'
                OR lower(coalesce(ii.sub_description,'')) ILIKE '%' || p_term || '%'
            )
      ),
      -- ─── UNION (pre-dedup) ───
      combined AS (
          SELECT * FROM q_header
          UNION ALL
          SELECT * FROM q_items
          UNION ALL
          SELECT * FROM i_header
          UNION ALL
          SELECT * FROM i_items
      ),
      -- ─── DEDUP: one row per document, best-rank match_source wins ───
      deduped AS (
          SELECT DISTINCT ON (document_type, document_id)
              document_type, document_id, document_number, title,
              client_id, client_name, document_date,
              match_source, matched_text, match_rank, route
          FROM combined
          WHERE match_rank > 0
            AND (p_document_types IS NULL OR document_type = ANY(p_document_types))
          ORDER BY document_type, document_id, match_rank DESC
      )
      SELECT
          document_type, document_id, document_number, title,
          client_id, client_name, document_date,
          match_source, matched_text, match_rank, route
      FROM deduped
      ORDER BY match_rank DESC, document_date DESC NULLS LAST
      LIMIT greatest(coalesce(p_limit, 50), 1);
      $fn$;
      ```
      
      Notes on the SQL:
      - `DISTINCT ON (document_type, document_id)` ensures one result row per document even when multiple items match.
      - `item_id` does not appear in any WHERE clause — fully satisfies the null-item-id requirement.
      - No SECURITY DEFINER — caller's RLS applies.
      - `p_document_types IS NULL OR document_type = ANY(p_document_types)` enables client-scoped cross-type and single-type filtering.
      - `p_client_id IS NULL OR q.client_id = p_client_id` enables client-scoped search.
      
      **Step C: Install into tenant_master_template**  
      ```sql
      DO $$
      BEGIN
          IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'tenant_master_template') THEN
              PERFORM public._prov_install_search('tenant_master_template');
          END IF;
      END;
      $$;
      ```
      
      **Step D: Backfill all existing entity_* schemas**  
      ```sql
      DO $$
      DECLARE
          v_schema text;
      BEGIN
          FOR v_schema IN
              SELECT nspname FROM pg_namespace
              WHERE nspname LIKE 'entity\_%'
                AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = nspname AND tablename = 'quotations')
          LOOP
              BEGIN
                  PERFORM public._prov_install_search(v_schema);
                  RAISE NOTICE 'Installed search_documents for %', v_schema;
              EXCEPTION WHEN OTHERS THEN
                  RAISE WARNING 'Failed to install search_documents for %: %', v_schema, SQLERRM;
              END;
          END LOOP;
      END;
      $$;
      ```
      
      **Step E: Update provision_entity to call `_prov_install_search`**  
      Add the call after `_prov_install_item_library_reconciliation` and before `_prov_install_tenant_rpcs`:
      ```sql
      -- 11c. Install document search RPC and indexes
      PERFORM public._prov_install_search(v_schema_name);
      ```
      This requires redefining the `provision_entity` function (or the most recent canonical version). Model this after the pattern in `20261005150000` which fully redefines `_prov_install_tenant_rpcs` to add new RPCs and then backfills.
      
      **Step F: Reload PostgREST schema cache**  
      ```sql
      NOTIFY pgrst, 'reload schema';
      ```
      
      Files: `supabase/migrations/20261014100000_document_search_platform.sql` (CREATE)  
      Verify: `supabase db push` succeeds with no errors.

- [ ] 9. **Write tests for the search migration and service**  
      Create `src/tests/critical/documentSearchPlatform.test.js` using the same pattern as `itemLibraryForwardIngestionMigration.test.js`:  
      — Load the migration file by glob pattern `*_document_search_platform.sql`.  
      — Use `node:test` + `node:assert/strict`.  
      
      **Test scenarios (24 required):**
      
      1. Migration file exists and is readable.
      2. Migration contains `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
      3. Migration creates `_prov_install_search` function in `public`.
      4. `_prov_install_search` creates `idx_quotations_quotation_title_trgm` GIN index.
      5. `_prov_install_search` creates `idx_quotation_items_description_trgm` GIN index.
      6. `_prov_install_search` creates `idx_quotation_items_make_trgm` GIN index.
      7. `_prov_install_search` creates `idx_invoices_invoice_title_trgm` GIN index.
      8. `_prov_install_search` creates `idx_invoice_items_description_trgm` GIN index.
      9. `_prov_install_search` creates `idx_invoice_items_make_trgm` GIN index.
      10. `search_documents` RPC body contains `quotation_items` JOIN with no `item_id` in WHERE.
      11. `search_documents` RPC body contains `invoice_items` JOIN with no `item_id` in WHERE.
      12. `search_documents` RPC body handles `p_client_id IS NULL OR q.client_id = p_client_id`.
      13. `search_documents` RPC body handles `p_client_id IS NULL OR i.client_id = p_client_id`.
      14. `search_documents` uses `DISTINCT ON (document_type, document_id)` for deduplication.
      15. `search_documents` uses `LIMIT greatest(coalesce(p_limit, 50), 1)`.
      16. `search_documents` does NOT use SECURITY DEFINER.
      17. `search_documents` uses `LANGUAGE sql STABLE`.
      18. `search_documents` searches `quotation_title` (not just quotation_number/client_name).
      19. `search_documents` searches `invoice_title` (not just invoice_number/client_name).
      20. `search_documents` ranks document number exact match at 1000.
      21. `search_documents` ranks item description match at 300 (substring).
      22. Migration backfills all `entity_*` schemas.
      23. Migration installs into `tenant_master_template`.
      24. Migration ends with `NOTIFY pgrst, 'reload schema'`.
      
      Additionally, verify adapter changes via existing module adapter patterns:
      
      — Test that `moduleAdapters.ts` now contains `quotation_title` in the quotations SELECT string.
      — Test that `moduleAdapters.ts` now contains `invoice_title` in the invoices SELECT string.
      — Test that the quotation ILIKE OR filter includes `quotation_title`.
      — Test that the invoice ILIKE OR filter includes `invoice_title`.
      
      Note: These are structural tests reading migration/source files — they do not require a live database. This matches the test pattern used throughout `src/tests/critical/`.
      
      Files: `src/tests/critical/documentSearchPlatform.test.js` (CREATE)  
      Verify: `bun run test` — all new tests pass; existing tests do not break.

- [ ] 10. **Push the migration**  
      Run `supabase db push`. Read the full output. If it fails, fix the error in the SQL file and push again. Repeat until the push succeeds. Do not mark the task complete if the push fails.  
      After a successful push, reload the PostgREST cache:  
      ```bash
      supabase db shell
      ```
      Then:  
      ```sql
      NOTIFY pgrst, 'reload schema';
      ```
      (The migration already contains this NOTIFY, so this is a confirmation step.)  
      Files: none (operation only)  
      Verify: `supabase db push` exits with code 0 and reports no errors.

- [ ] 11. **Final verification**  
      Run in order:  
      1. `bun run audit:load` — must pass.  
      2. `bun run typecheck` — must pass (no type errors in new files).  
      3. `bun run test` — all tests pass including the new `documentSearchPlatform.test.js`.  
      Confirm: no changes to `src/lib/Calculations.ts`, no changes to any PDF renderer, no changes to Item Library files.

---

## Files to Create

| File | Purpose |
|---|---|
| `supabase/migrations/20261014100000_document_search_platform.sql` | pg_trgm extension, GIN indexes, search_documents RPC, provisioning hook |
| `src/domain/search/types.ts` | Shared TypeScript contract (DocumentSearchResult, DocumentSearchParams, DocumentSearchResponse, DocumentType, MatchSource) |
| `src/modules/search/documentSearchService.ts` | RPC wrapper that calls tenantClient.rpc('search_documents', ...) |
| `src/hooks/useDocumentSearch.ts` | React hook: debounced search, cancellation, results state |
| `src/components/search/DocumentSearchResults.tsx` | Result card list component |
| `src/tests/critical/documentSearchPlatform.test.js` | 24+ structural tests for migration and adapter correctness |

## Files to Modify

| File | Change |
|---|---|
| `src/config/moduleAdapters.ts` | Add `quotation_title` to quotationsAdapter SELECT + ILIKE filter; add `invoice_title` to invoicesAdapter SELECT + ILIKE filter |
| `src/components/quotation/QuotationList.tsx` | Wire `useDocumentSearch` + render `<DocumentSearchResults>` |
| `src/pages/Invoices.tsx` | Wire `useDocumentSearch` + render `<DocumentSearchResults>` |

## Files Explicitly Prohibited from Change

- `src/lib/Calculations.ts`
- Any file under `src/components/pdf/` or any PDF renderer
- Item Library files: `src/domain/cps/`, `src/modules/item-library/`
- Any existing migration file

---

## Dependency Order

1 → 2 → 3 → 4 → 5 → 6 → 7 (all TypeScript, can overlap)  
8 (migration, independent of TypeScript)  
9 (tests depend on 1, 2, 3, 8)  
10 (push depends on 8)  
11 (final gate, depends on all)

Steps 2–5 are independent of each other; the implementer may write them in any order within that group. Steps 6 and 7 depend on step 5 (the component must exist before wiring). Step 8 is independent of all TypeScript steps. Step 10 depends only on step 8.

---

## Acceptance Validation Against Reference Document

| Search term | Table searched | How matched | item_id required? | Expected result |
|---|---|---|---|---|
| `SASQUO-382` | `quotations.quotation_number` | ILIKE exact match, rank 1000 | No | Found: SASQUO-382 |
| `REX Forestry` | `quotations.client_name` | ILIKE substring, rank 500 | No | Found: SASQUO-382 |
| `Oil Separator` | `quotations.quotation_title` | ILIKE substring, rank 650 | No | Found: SASQUO-382 (also fixed in adapter step 1) |
| `12mm Concrete Rod` | `quotation_items.description` | JOIN + ILIKE, rank 300 | No (item_id IS NULL allowed) | Found: SASQUO-382 |

---

## Risks and Notes

| Risk | Mitigation |
|---|---|
| pg_trgm may already be enabled on Supabase dashboard | `CREATE EXTENSION IF NOT EXISTS` is idempotent — no problem |
| GIN index creation fails on older Postgres (pre-9.1) | Supabase Postgres is 15+ — not a risk |
| Duplicate rows from item JOIN | `DISTINCT ON (document_type, document_id)` eliminates them |
| `provision_entity` has been redefined many times — latest version must be used | The implementer must read the latest `provision_entity` body from `20261005150000` before adding the new step |
| Short search terms (1 char) cause expensive full-table scans | `useDocumentSearch` enforces min 2 chars; service layer validates before calling RPC |
| Client-scoped search on ClientDetail.tsx deferred to this phase | `useDocumentSearch` accepts `clientId` param — ClientDetail.tsx integration is a follow-up and is NOT part of this plan |

---

## Out of Scope

- ClientDetail.tsx search integration (next sub-phase).
- RFQ, CPS, Waybill, CSR extension of `search_documents` (Phase 2d per audit recommendation).
- Snippet extraction (showing matched fragment in context) — deferred.
- Server-side pagination of search results — deferred until volume warrants it.
- Item Library null-id repair — separate concern, separate task.
