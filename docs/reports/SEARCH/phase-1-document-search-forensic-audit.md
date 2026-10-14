# Phase 1 Document Search Forensic Audit

This report was written by Claude Sonnet 4.5 on 2026-10-14 via Kiro.

---

## Objective

Determine how document search currently works across all document types in the BOURXE platform. Identify coverage gaps, pagination defects, data authority boundaries, Item Library dependencies, and PostgreSQL search capabilities. Produce a concrete Phase 2 architecture recommendation for full-content cross-document search.

## Scope

All document types: quotations, invoices, waybills, CSRs, RFQs, cost and pricing sheets (CPS). Client workspace history. Item Library usage and discovery. Supabase/PostgreSQL capabilities. Multi-tenant schema design. RLS enforcement.

The acceptance reference document is SASQUO-382 (title: "Materials for Oil Separator and Used Oil Store", client: REX Forestry Ltd, date: 16 September 2026). This document must be locatable by the search terms: SASQUO-382, REX Forestry, Oil Separator, 12mm Concrete Rod.

## Files Changed

The only file created or modified by this audit is this report.

```
docs/Reports/SEARCH/phase-1-document-search-forensic-audit.md  (CREATED)
```

## Skills Used

supabase-postgres-best-practices, supabase, database-schema-designer, typescript-advanced-types, react-dev

## Documentation Standard

ASD-STE100 Simplified Technical English

---

## Verification

- git status (before audit): clean — nothing to commit, working tree clean
- git status (after audit): clean — only this report file added (untracked)
- bun run build: skipped (audit-only scope, hardware policy)
- bun run typecheck: skipped (audit-only scope, hardware policy)
- bun run lint: skipped (audit-only scope)
- bun run audit:load: skipped (audit-only scope)
- supabase db push: not applicable (no schema changes)
- Source code modified: NO
- Migrations modified: NO

---

## Section 1 — Current Search Path Map

### 1.1 Architecture Overview

The search system uses a centralized Document Query Platform. All document list pages wrap their content in `DocumentQueryProvider` (source: `src/context/DocumentQueryContext.tsx`). Each module has a registered adapter in `src/config/moduleAdapters.ts`. The adapter owns the Supabase query, cache key, and all filter logic.

When the user types in the search box, the component calls `patchUpdate({ search: value })`. The context re-runs the adapter's `fetcher` function. The adapter sends a new query to Supabase with ILIKE conditions. There is no client-side post-fetch search.

### 1.2 Quotations

**Entry point:** `src/pages/Quotations.tsx` → `src/components/quotation/QuotationList.tsx`

**Search hook:** `useDocumentQuery()` via `DocumentQueryContext`, adapter: `quotationsAdapter` in `src/config/moduleAdapters.ts`.

**Supabase query (search active):**
```
SELECT id, quotation_number, client_name, issue_date, valid_until, created_at, total, status, project_id
FROM quotations
WHERE archived_at IS NULL
  AND (quotation_number ILIKE '%<term>%' OR client_name ILIKE '%<term>%')
ORDER BY created_at DESC
```
Source: `moduleAdapters.ts` lines 331–332.

**SELECT columns:** `id, quotation_number, client_name, issue_date, valid_until, created_at, total, status, project_id`. Note: `quotation_title` is NOT selected. The adapter does not fetch `notes`, `quotation_title`, `terms`, or any item data.

**Columns searched:** `quotation_number` and `client_name` only.

**Not searched:** `quotation_title`, `notes`, `terms`, `po_number`, any quotation item field.

**Filtering layer:** Server-side SQL (ILIKE via PostgREST `.or()` filter). No client-side filtering of search terms.

**Pagination:** None. The query returns all matching rows. There is no LIMIT, no offset, and no cursor. The summary line reads `${quotations.length} quotations total` (QuotationList.tsx). There is no server-side total count separate from the result count.

**Sort:** `ORDER BY created_at DESC`.

**Cache:** 5-minute in-memory list cache (`bd:list:quotations:v1:all`). The cache is bypassed when any filter is active (including search). The adapter calls `hasActiveFilters(query)` before using the cache.

**Tenant routing:** The adapter uses `requireFetchClient(ctx)` which demands a ready `TenantClient`. The tenant client is schema-scoped: all queries go to the entity's tenant schema (e.g. `entity_bigdrops-main_main`). The public business tables were purged by migration `20260830000000`.

**RLS:** The quotations table has `authenticated_quotations_read` (USING true for authenticated role) and `quotations_authenticated_select` (auth.role() = 'authenticated'). All authenticated users in the tenant schema can read all quotations. There is no user-level row filter.

**Explicit answers:**
| Search field | Searched? | Evidence |
|---|---|---|
| Quotation number | YES | `quotation_number.ilike.%${term}%` — moduleAdapters.ts:332 |
| Client name | YES | `client_name.ilike.%${term}%` — moduleAdapters.ts:332 |
| Quotation title | NO | Not in SELECT or OR filter |
| Item descriptions | NO | Not fetched, not searched |
| Item specifications | NO | Not fetched, not searched |
| Item Library data | NO | Not involved in list query |

**CONFIRMED CURRENT STATE: Searching "Oil Separator" on the quotations list page does NOT find SASQUO-382.** The title field is not searched. Searching "REX Forestry" would find it only if the client_name column contains that text. Searching "12mm Concrete Rod" finds nothing — line items are never queried.

### 1.3 Invoices

**Adapter:** `invoicesAdapter` — `moduleAdapters.ts`

**SELECT:** `id, invoice_number, client_name, issue_date, due_date, created_at, total, status, project_id, custom_fields, payments(cash_amount, wht_amount, amount, voided_at)`

**Search query:**
```
invoice_number.ilike.%${term}%, client_name.ilike.%${term}%
```
Source: `moduleAdapters.ts` line 148.

**Not searched:** `invoice_title`, `notes`, `terms`, any invoice item field.

### 1.4 Waybills

**Adapter:** `waybillsAdapter`

**SELECT:** `id, waybill_number, type, client_name, date, created_at, status, project_id, invoice_id, vehicle_plate, delivery_location`

**Search query:**
```
waybill_number.ilike.%${term}%, client_name.ilike.%${term}%
```
Source: `moduleAdapters.ts` line 411.

Waybill items are stored as a JSONB array in the `items` column, not in a separate table. They are not fetched in the list and are not searchable.

### 1.5 CSRs

**Adapter:** `csrAdapter`

**SELECT:** `id, csr_number, client_name, equipment_type, make, date, created_at, status, linked_invoice_id, project_id`

**Search query:**
```
csr_number.ilike.%${term}%, client_name.ilike.%${term}%, equipment_type.ilike.%${term}%
```
Source: `moduleAdapters.ts` line 518. CSR is the only module that searches a third field (equipment_type).

### 1.6 RFQs

**Adapter:** `rfqsAdapter`

**SELECT:** `id, rfq_number, client_name, created_at, status, project_id, title`

**Search query:**
```
rfq_number.ilike.%${term}%, client_name.ilike.%${term}%, title.ilike.%${term}%
```
Source: `moduleAdapters.ts` line 568. RFQs search the title field. RFQ items (description, specification, notes) are not searched.

RFQs do not have a client_id column (confirmed: `20260520090002_quotations.sql`). RFQs have vendor_name, not client_name. The adapter uses `client_name` in its ILIKE — this field may be NULL for most RFQs.

### 1.7 Cost and Pricing Sheets (CPS)

**Adapter:** `cpsSheetsAdapter`

**SELECT:** `id, cps_number, client_name, created_at, issue_date, status, project_id, title, total`

**Search query:**
```
cps_number.ilike.%${term}%, client_name.ilike.%${term}%, title.ilike.%${term}%
```
Source: `moduleAdapters.ts` line 668.

### 1.8 Receipts

**Adapter:** `receiptsAdapter`

**SELECT:** `*`

**Search query:**
```
receipt_number.ilike.%${term}%, invoice_number.ilike.%${term}%, client_name.ilike.%${term}%
```
Source: `moduleAdapters.ts` line 615.

### 1.9 Summary Table

| Module | Number field searched | Client name | Title | Item content |
|---|---|---|---|---|
| Quotations | YES | YES | NO | NO |
| Invoices | YES | YES | NO | NO |
| Waybills | YES | YES | NO | NO |
| CSRs | YES | YES | equipment_type only | NO |
| RFQs | YES | YES (vendor_name mapped to client_name) | YES | NO |
| CPS Sheets | YES | YES | YES | NO |
| Receipts | YES | NO | NO | NO |

---

## Section 2 — Server-Side Pagination Audit

### 2.1 Current Pagination Behavior

No list adapter applies a server-side LIMIT or pagination cursor. All adapters call `.select(...)` without `.range()`, `.limit()`, or any offset. The Supabase client returns all rows that pass the WHERE filters.

Source: Every adapter's `fetcher` function in `src/config/moduleAdapters.ts` — no `.range()` or `.limit()` call exists in any adapter.

### 2.2 Relationship Between Search and Pagination

Because there is no pagination, the search defect described in Section 1 is not a pagination/search interaction problem. Search misses documents not because records are on a page that was not loaded, but because the columns searched are too narrow.

### 2.3 Implications for Large Datasets

The absence of pagination has a different risk. As document count grows, the initial no-filter load returns every document. This will cause performance degradation at scale. There is no server-side total count separate from the result count. The summary line `${quotations.length} quotations total` reflects loaded rows only.

### 2.4 Finding

**CONFIRMED CURRENT STATE: The primary search defect is not a pagination problem. It is a column coverage problem.** Filtering happens server-side in SQL, but the SQL only covers document number and client name. Documents are not hidden behind unloaded pages. They are simply not matched because the search terms do not appear in the two columns that are searched.

**This is a confirmed coverage defect, not a pagination defect.**

---

## Section 3 — Original Document Data Authority

### 3.1 Quotation Data Fields

The `quotations` table (source: `20260520090002_quotations.sql`) stores:

| Field | Type | Searchable today |
|---|---|---|
| id | uuid | NO |
| quotation_number | text NOT NULL | YES |
| quotation_title | text | NO |
| client_id | uuid | NO |
| client_name | text | YES |
| project_id | uuid | NO |
| issue_date | date | NO (date range filter only) |
| valid_until | date | NO |
| status | text | YES (via status filter) |
| notes | text | NO |
| terms | text | NO |
| po_number | text | NO |
| workmanship, transportation, shipping, discount, vat, wht, subtotal, total | numeric | amount range filter only |
| custom_fields | jsonb | NO |
| scope_type | text | NO |

The quotation adapter SELECTs only: `id, quotation_number, client_name, issue_date, valid_until, created_at, total, status, project_id`. The `quotation_title` column exists in the database but is never fetched during list queries and is not searched.

### 3.2 Quotation Items

The `quotation_items` table (source: `20260520090002_quotations.sql`) stores:

| Field | Type | Searchable today |
|---|---|---|
| id | uuid | NO |
| quotation_id | uuid | (FK) |
| description | text | NO |
| sub_description | text | NO |
| make | text | NO |
| quantity | numeric | NO |
| unit | text | NO |
| unit_price | numeric | NO |
| amount | numeric | NO |
| row_type | text | NO |
| group_id, group_name | text | NO |
| sort_order | integer | NO |
| item_id | uuid NULLABLE | NO |
| custom_data | jsonb | NO |

**The description field is the primary free-text field for original item content. It exists in the database. No current list query touches it.**

### 3.3 Item Library Linkage on Quotation Items

The `item_id` column on `quotation_items` is nullable. It is a foreign key to `item_catalog.id` (installed by `20260520090005_items_catalog.sql`).

The forward ingestion trigger `trg_learn_item_catalog_quotation_items` (installed by `20260925093000_item_library_forward_ingestion.sql`) runs BEFORE INSERT on new rows. It tries to find or create a catalog entry. On failure, it issues `RAISE WARNING` and sets `item_id = NULL`. The trigger does not block the INSERT.

Historical rows before the trigger was installed may have `item_id IS NULL`. The historical backfill migration (`20260925110000`) populated Tier A (exact match) and Tier B (new catalog entry) rows but intentionally left Tier C and Tier D rows with `item_id IS NULL`. Some rows remain unlinked.

### 3.4 Can "12mm Concrete Rod" Be Found When item_id IS NULL?

**CONFIRMED CURRENT STATE: No.** The current search does not query `quotation_items.description` at all. The ILIKE pattern on the list adapter checks only `quotation_number` and `client_name`. Even if `item_id IS NULL`, the description field survives independently in the `quotation_items` table. It is not deleted or lost. It is simply never queried during document search.

**For a future search to find SASQUO-382 via "12mm Concrete Rod", the query must join `quotations` to `quotation_items` and apply an ILIKE (or full-text) filter on `quotation_items.description`. This works regardless of whether `item_id` is NULL or populated.**

### 3.5 Invoice Data Fields

The `invoices` table (source: `20260520090003_invoices.sql`) stores `invoice_title`, `notes`, `terms` — none currently searched. The `invoice_items` table has the same structure as `quotation_items` (description, sub_description, make, item_id).

### 3.6 Other Document Types

- **Waybills:** Items stored as JSONB in a single column (`items`). There are no separate item rows. The item descriptions live inside the JSONB blob and cannot be indexed with a standard B-tree index.
- **CSRs:** No item table. Rich text in `materials_used`, `service_rendered`, `engineer_remarks`. These fields are not searched.
- **RFQs:** Items in `rfq_items` table with `description`, `specification`, `notes`. Not searched.
- **CPS/BOQ:** Rows in `cps_rows` table (`boq_rows` renamed). Has `description`, `section_title`, `notes`, `cells` (JSONB). Not searched.

---

## Section 4 — Item Library Dependency Audit

### 4.1 What Item Library Usage History Tracks

The `item_price_summary_v` view (defined in `20260520090005_items_catalog.sql` and replicated per-tenant by `20260828000001_item_library_tenant_objects.sql`) aggregates usage across `invoice_items` and `quotation_items` by joining on `item_id`. It returns: `last_source_type`, `last_source_document_id`, `usage_count`, price statistics.

The `get_item_suggestions` function (same migration) uses `item_price_summary_v` to rank catalog entries. It does not expose document-level search results. It is a line-item autocomplete tool, not a document discovery tool.

### 4.2 Which Document Types Item Library Can Trace

Item Library traces documents only through `item_id` linkage in `invoice_items` and `quotation_items`. It cannot trace waybill items (JSONB), CSR free-text fields, or RFQ/CPS rows unless those tables were also linked (they are not, per migration evidence).

### 4.3 Behavior of Null-Linked Rows

If `item_id IS NULL` on a `quotation_items` row, that row does not appear in `item_price_summary_v` usage counts for that catalog item. The row is not returned by `get_item_suggestions` as a usage trace. The original quotation that contains that item is invisible to Item Library document discovery.

### 4.4 Distinction: Document Search vs Item Library Usage History

| Capability | Document Search | Item Library Usage History |
|---|---|---|
| Purpose | Find a document from a keyword | Find how an item has been used |
| Entry point | Global search / document list | Item detail sheet / autocomplete |
| Input | Free text | Catalog item identity |
| Output | Document records | Usage statistics, last document |
| Dependency on item_id | SHOULD NOT require it | REQUIRES it |
| Scope | All documents | Only invoice_items + quotation_items |

**CONFIRMED CURRENT STATE: Document search is today conflated with Item Library history.** The system has no independent document search. The user found SASQUO-382 by navigating to the client page and scrolling through quotation history — this is manual discovery, not search.

### 4.5 Impact of Incomplete Backfill

Historical rows that Tier C classification left unlinked (item_id IS NULL) are completely invisible to Item Library-based document discovery. Because there is no independent search path that reads `quotation_items.description` directly, these documents are permanently undiscoverable by content search.

---

## Section 5 — PostgreSQL Search Capability Audit

### 5.1 pg_trgm / Full-Text Search

**CONFIRMED CURRENT STATE: No pg_trgm extension, no GIN or GiST indexes, no tsvector columns, no to_tsvector or websearch_to_tsquery usage exist anywhere in the migration history.**

Evidence: A regex search across all 100+ migration files for `pg_trgm|tsvector|GIN|GiST|to_tsvector|websearch_to_tsquery|plainto_tsquery|similarity|CREATE EXTENSION` returned zero matches for any of these terms. The migrations use only B-tree indexes.

### 5.2 Existing Indexes Relevant to Search

From `20260520090002_quotations.sql`:
- `quotations_quotation_number_key` — unique B-tree on `quotation_number` (prefix/equality fast, ILIKE full scan)
- `idx_quotations_status_updated_at` — composite B-tree on (status, updated_at DESC)
- `idx_quotation_items_description` — B-tree on `quotation_items.description`
- `idx_quotation_items_item_id` — B-tree on `item_id`

From `20260520090003_invoices.sql`:
- `idx_invoice_items_description` — B-tree on `invoice_items.description`
- `idx_invoice_items_item_id` — B-tree on `item_id`

From `20260520090000_core_tables.sql`:
- `idx_clients_name` — B-tree on `clients.name`

**The B-tree indexes on description columns do not accelerate ILIKE '%term%' queries.** PostgreSQL cannot use a B-tree index for a leading-wildcard ILIKE. These indexes help only for prefix patterns (`'term%'`) or equality.

### 5.3 Current Search Performance Characteristics

All current ILIKE searches perform sequential scans of the column. For `quotation_number ILIKE '%SASQUO%'`, PostgreSQL can use the unique index for prefix matching. For full-substring ILIKE (e.g. `description ILIKE '%concrete rod%'`), a sequential scan of every row is required.

### 5.4 Supabase Environment

Supabase Postgres instances have both `pg_trgm` and full-text search available as built-in extensions. `pg_trgm` can be enabled with `CREATE EXTENSION IF NOT EXISTS pg_trgm`. GIN trigram indexes on text columns support substring ILIKE patterns with index acceleration.

---

## Section 6 — Search Authority Options

### Option A: Direct Joins / Subqueries (No Index Layer)

Add `quotation_title`, `notes`, and a subquery/EXISTS on `quotation_items.description` to the existing ILIKE filter in the adapter.

**Example:**
```sql
SELECT q.id, q.quotation_number, q.quotation_title, q.client_name, q.issue_date, q.total, q.status
FROM quotations q
WHERE q.archived_at IS NULL
  AND (
    q.quotation_number ILIKE '%oil separator%'
    OR q.client_name ILIKE '%oil separator%'
    OR q.quotation_title ILIKE '%oil separator%'
    OR EXISTS (
      SELECT 1 FROM quotation_items qi
      WHERE qi.quotation_id = q.id
        AND (qi.description ILIKE '%oil separator%' OR qi.make ILIKE '%oil separator%')
    )
  )
```

- **Ranking:** None — all matches equal.
- **Pagination:** Possible but complex when EXISTS subquery changes result set size.
- **RLS safety:** Runs inside the authenticated session; RLS applies to both tables.
- **Update complexity:** Zero — queries live data, no index maintenance.
- **Stale risk:** None.
- **Recovery:** N/A.
- **Cross-document:** Requires one query per document type; no unified result.
- **Performance:** Sequential scan on description columns. Acceptable for current data volume. Degrades linearly at scale.
- **Snippet support:** None without additional SQL.
- **Null item_id behavior:** Works correctly — description is read directly.

**Assessment:** Safe, correct, zero infrastructure cost. Suitable for immediate Phase 2 implementation. Does not require new migrations.

### Option B: Reusable RPC Union Across Document Types

A PostgreSQL function (SECURITY DEFINER or caller-rights STABLE) that accepts a search term and returns a unified result contract. The function executes per-type subqueries and returns a ranked, deduplicated result set.

- **Ranking:** Possible — score based on match source.
- **Pagination:** LIMIT/OFFSET inside the RPC.
- **RLS safety:** SECURITY DEFINER functions with explicit `set search_path` bypass RLS unless they call `auth.uid()` checks internally. Caller-rights STABLE functions inherit the caller's RLS — recommended.
- **Cross-document:** Unified results from all types in one call.
- **Performance:** Better with trigram indexes. Without them, still N full scans.
- **Snippet support:** Possible with `substring()` extraction.
- **Null item_id behavior:** Works correctly.

**Assessment:** Best long-term architecture. Requires a new migration to create the function. Recommended for Phase 2 after indexes are in place.

### Option C: Search Projection / Materialized Table

A separate `document_search_index` table with pre-flattened document content, updated by triggers or batch jobs.

- **Performance:** Excellent — one table, one index.
- **Stale risk:** High — triggers add write overhead; batch jobs may lag.
- **Recovery complexity:** Highest — requires rebuild logic, health monitoring.
- **Null item_id behavior:** Must be handled explicitly at index time.

**Assessment:** Premature for current data volume. Introduces write-path complexity and stale-index risk. Do not use in Phase 2 unless pg_trgm FTS is demonstrably insufficient.

### Option D: Generated tsvector Columns

Add a generated `search_vector tsvector` column to `quotations` (and a separate one on `quotation_items`) with a GIN index.

- **Performance:** Excellent for full-text ranking with `ts_rank`.
- **Complexity:** Requires ALTER TABLE migrations on all tenant schemas.
- **Cross-item search:** Joining documents and items via tsvector requires two GIN indexes and a UNION or subquery.
- **Null item_id behavior:** Works correctly — tsvector reads the description column, not item_id.

**Assessment:** Best long-term performance but highest migration complexity in a multi-tenant schema environment. Suitable for Phase 3 if trigram approach proves insufficient.

**Recommendation for Phase 2:** Implement Option B (reusable RPC) built on Option A (direct joins), with pg_trgm GIN indexes added to key columns. This gives correct results immediately, with index acceleration added in the same migration.

---

## Section 7 — Reusable Cross-Document Search Contract

Based on confirmed field names from repository evidence, the proposed result contract is:

```typescript
interface DocumentSearchResult {
  document_type: 'quotation' | 'invoice' | 'waybill' | 'csr' | 'rfq' | 'cps';
  document_id: string;            // uuid
  document_number: string;        // quotation_number, invoice_number, etc.
  title: string | null;           // quotation_title, invoice_title, rfqs.title, etc.
  client_id: string | null;       // uuid FK to clients
  client_name: string | null;     // denormalized display name
  document_date: string | null;   // issue_date, date, created_at
  match_source: 'number' | 'client' | 'title' | 'item_description' | 'item_make' | 'notes';
  matched_text: string;           // the matched fragment
  match_rank: number;             // higher = more relevant
  route: string;                  // e.g. '/quotations/<uuid>'
}
```

**Derived from confirmed table columns:**

| document_type | number field | title field | client fields | date field |
|---|---|---|---|---|
| quotation | quotation_number | quotation_title | client_id, client_name | issue_date |
| invoice | invoice_number | invoice_title | client_id, client_name | issue_date |
| waybill | waybill_number | NULL (no title) | NULL (client_id), client_name | date |
| csr | csr_number | title | client_id, client_name | date |
| rfq | rfq_number | title | NULL (no client_id), vendor_name | created_at |
| cps | cps_number | title | NULL (no confirmed client_id), client_name | issue_date |

Note: Waybills have `client_name` but the `client_id` FK was not confirmed in the visible schema. This should be verified against the waybill DDL before implementing.

---

## Section 8 — Match Ranking

### 8.1 Proposed Priority Order

1. **Exact document number match** — rank 1000. Search term equals `quotation_number` exactly.
2. **Document number prefix match** — rank 900. Term is a prefix of the number.
3. **Document number substring match** — rank 800. Term appears anywhere in the number.
4. **Title exact match** — rank 750.
5. **Title substring match** — rank 650.
6. **Client name substring match** — rank 500.
7. **Item description exact match** — rank 400.
8. **Item description substring match** — rank 300.
9. **Notes / terms substring match** — rank 150.

### 8.2 Acceptance Scenario Ranking

| Search term | Match source | Result for SASQUO-382 | Rank |
|---|---|---|---|
| SASQUO-382 | quotation_number exact | Found immediately | 1000 |
| REX Forestry | client_name substring | Found via `client_name ILIKE '%REX Forestry%'` | 500 |
| Oil Separator | quotation_title substring | Found via `quotation_title ILIKE '%Oil Separator%'` | 650 |
| 12mm Concrete Rod | quotation_items.description substring | Found via JOIN, regardless of item_id | 300 |

### 8.3 Why SASQUO-382 Would Match in Each Case

- **"SASQUO-382":** The `quotation_number` column value is `SASQUO-382`. The ILIKE pattern `%SASQUO-382%` matches it directly. The unique B-tree index accelerates this if the term has no leading wildcard (prefix form).
- **"REX Forestry":** The `client_name` column stores the denormalized client name at time of creation. If it contains "REX Forestry Ltd", an ILIKE `%REX Forestry%` matches.
- **"Oil Separator":** The `quotation_title` column contains "Materials for Oil Separator and Used Oil Store". An ILIKE `%Oil Separator%` matches.
- **"12mm Concrete Rod":** The `quotation_items.description` column in one or more rows of SASQUO-382 contains this text. A JOIN from `quotations` to `quotation_items` with `qi.description ILIKE '%12mm Concrete Rod%'` matches. This path works even when `item_id IS NULL`.

---

## Section 9 — Client-Scoped Search

### 9.1 Current Client Page Behavior

`src/pages/ClientDetail.tsx` loads quotations for a client with:
```typescript
tenantClient
  .from('quotations')
  .select('id, quotation_number, status, total, issue_date')
  .eq('client_id', id)
  .order('issue_date', { ascending: false })
  .limit(10)
```
Source: ClientDetail.tsx, `loadOverview` function.

The overview loads the 10 most recent quotations. On "Load All", it fetches all quotations by client_id without a limit.

**No search capability exists on the client page.** There is no search field on ClientDetail. The user can only browse the list.

### 9.2 Scoped Search Design

A future search for "12mm Concrete Rod" scoped to REX Forestry Ltd must:

1. Accept `client_id` as a required scope parameter.
2. Apply `WHERE q.client_id = $client_id` to the base quotation query.
3. Apply the item-description JOIN as in Section 8.
4. Return only matching documents for that client.

The scope must be applied at the SQL level — not by client-side filtering of a pre-loaded list. This prevents the scoped search from omitting older documents that are not in the 10-row overview load.

---

## Section 10 — Indexing Failure / Recovery Architecture

### 10.1 Trigger-Based Forward Ingestion Failure

The `learn_item_catalog_for_line_item` trigger (`20260925093000`) catches all exceptions with `WHEN OTHERS THEN RAISE WARNING`. The INSERT succeeds even if item learning fails. The result is `item_id IS NULL` on the new row. There is no retry mechanism.

### 10.2 Recovery Strategy (Conceptual)

A recovery process must:

1. **Detect:** Query `quotation_items WHERE item_id IS NULL AND row_type = 'standard' AND description IS NOT NULL`. Compare with expected Tier C review rows (logged in `item_library_backfill_audit`). Rows that are not Tier C and have `item_id IS NULL` are candidates for repair.
2. **Classify:** Apply `normalize_item_text(description)` and look up `item_catalog.normalized_name`. Assign Tier A (exact match) or Tier B (create new identity).
3. **Repair:** UPDATE `quotation_items SET item_id = <resolved_id> WHERE id = <row_id>`.
4. **Idempotency:** Use the `item_library_backfill_audit` table to record each repaired row. Re-runs skip rows already in the audit table.
5. **Tenant scope:** Run per schema (entity_*) to respect tenant isolation.
6. **Failure reporting:** Rows that cannot be resolved remain in a "review" state. Log them to a health table.
7. **New tenant provisioning:** The provisioning engine already installs the forward ingestion trigger via `_prov_install_item_library`. New tenants are covered.

### 10.3 Cleanup Hub Assessment

The Cleanup Hub is designed for operational item merging and catalog maintenance. It is not the right location for infrastructure-level index repair. Index health monitoring belongs in a dedicated internal admin panel or background task. **Do not implement this in the Cleanup Hub.**

---

## Section 11 — Fallback Search

### 11.1 Capability

If a future search index (materialized table or tsvector) is missing or incomplete, the application can fall back to direct ILIKE queries on the source tables. The source tables always contain the authoritative data. The `description` column is not derived or dependent on any index.

### 11.2 Fallback Behavior

- Direct table queries return correct results but perform sequential scans.
- For a tenant with 5,000 quotation_items rows, a sequential scan is acceptable (milliseconds).
- For a tenant with 100,000+ rows, query time may increase to seconds.

### 11.3 Activation Condition

The fallback should activate automatically when no separate search index exists. Since Phase 2 proposes direct joins (Option B RPC), the fallback IS the primary path. There is no separate index layer to fail.

**Recommended approach:** Favor correctness over performance. A 2-second search that returns correct results is better than a 50ms search that silently omits unlinked items.

### 11.4 User Transparency

Users should not see error messages when the fallback is active. Performance degradation, if it occurs, should be communicated only if query time exceeds 5 seconds.

---

## Section 12 — Security / RLS / Tenant Isolation

### 12.1 Tenant Schema Model

Confirmed by migration `20260902055836_tenant_master_template.sql` and `20260830000000_public_business_schema_purge.sql`: the system uses **schema-per-tenant**. Each entity has its own PostgreSQL schema named `entity_<workspace-slug>_<entity-slug>` (e.g. `entity_bigdrops-main_main`). Business tables exist only in tenant schemas. The public schema contains only platform tables (workspaces, entities, entity_permissions, profiles).

The `TenantClient` in the frontend connects to the entity's schema via the PostgREST schema header. All document queries execute within the tenant's schema.

### 12.2 RLS Authorities

Within each tenant schema, RLS policies grant access to all authenticated users (no per-row user filter for quotations, invoices, etc.). The effective tenant isolation is at the schema level: PostgREST only exposes the schema the authenticated user's entity is bound to.

### 12.3 Cross-Tenant Risk in a Unified Search RPC

A unified search RPC defined in the tenant schema (`entity_X.search_documents(term)`) executes only within that schema. It cannot cross tenant boundaries. **Cross-tenant leakage is not possible when the RPC lives in the tenant schema.**

A unified search RPC defined in the `public` schema with a `schema_name` parameter would be dangerous — it could be called with an arbitrary schema. Do not define global search RPCs in the public schema.

### 12.4 SECURITY DEFINER Risk

RPCs like `get_item_suggestions` use `SECURITY DEFINER SET search_path TO 'public'`. They read through tenant table RLS (which is permissive for authenticated users), but execute as the function owner (postgres). If a future search RPC uses SECURITY DEFINER, it must:

- Set `search_path` to the tenant schema explicitly.
- Call `auth.uid()` checks if any row-level restriction is needed.
- Never accept a schema name as a user-supplied parameter.

**Recommended:** Use caller-rights STABLE functions (no SECURITY DEFINER) for search RPCs. These inherit the caller's session, schema, and RLS context automatically.

### 12.5 Client-Scoped Search Security

A search scoped by `client_id` applies an additional WHERE clause. This restricts results to the specified client. It does not weaken security. The tenant schema boundary still prevents cross-tenant access.

---

## Section 13 — Performance and Query Plan

### 13.1 Current Index Coverage

The B-tree index `idx_quotation_items_description` exists on `quotation_items.description`. B-tree indexes do not accelerate `ILIKE '%term%'` (leading wildcard). They accelerate only prefix patterns (`'term%'`) and equality.

For ILIKE substring search, PostgreSQL performs a sequential scan. At 2,799 quotation_items rows (confirmed count from `20260810010000_quotation_data_migration.sql`), this is fast. At 50,000+ rows, it will be noticeable.

### 13.2 JOIN Cardinality

A join from `quotations` to `quotation_items` (one-to-many) returns multiple rows per quotation when multiple items match. The search query must use DISTINCT or a UNION to return one document row per matching document. An EXISTS subquery is the cleanest approach:

```sql
EXISTS (SELECT 1 FROM quotation_items qi WHERE qi.quotation_id = q.id AND qi.description ILIKE '%term%')
```

EXISTS short-circuits on the first match and avoids row multiplication.

### 13.3 pg_trgm Suitability

`pg_trgm` GIN indexes accelerate ILIKE substring patterns efficiently. For `description ILIKE '%concrete rod%'`, a GIN trigram index reduces the scan to matching trigrams only. This is the recommended index type for Phase 2.

### 13.4 FTS Suitability

PostgreSQL FTS (`tsvector` / `tsquery`) is better for natural language ranking but loses substring matching (searching "12mm" may not match "12mm Concrete Rod" if the lexeme is normalized away). For technical product descriptions (engineering items, materials), trigram ILIKE is more reliable than FTS lexeme matching.

### 13.5 Duplicate Rows Risk

A JOIN search across quotations and quotation_items must deduplicate. Use `DISTINCT ON (q.id)` or an EXISTS subquery to return at most one result row per document, even when multiple items match the search term.

### 13.6 COUNT Cost

Do not add `SELECT COUNT(*)` to the search query by default. COUNT on a post-filter result requires scanning all matching rows. Return a `has_more` boolean instead.

---

## Section 14 — External Infrastructure

No external search infrastructure is needed. PostgreSQL with pg_trgm GIN indexes is sufficient for the current and projected data volume. The confirmed quotation_items count of ~2,799 rows per production tenant is well within PostgreSQL ILIKE scan capacity. Even at 100,000 rows, trigram GIN indexes handle substring search with sub-100ms response times.

No Redis, Elasticsearch, Meilisearch, Typesense, Algolia, vector embeddings, or AI search is warranted.

---

## Section 15 — Acceptance Scenario Analysis

### Scenario 1: Search "SASQUO-382"

1. User types "SASQUO-382" in the quotations list search box.
2. Adapter sends: `quotation_number ILIKE '%SASQUO-382%' OR client_name ILIKE '%SASQUO-382%'`.
3. `quotation_number = 'SASQUO-382'` — exact match. Document returned.
4. **Result: FOUND.** This works today. Reason: document number is already searched.

### Scenario 2: Search "REX Forestry"

1. User types "REX Forestry".
2. Adapter sends: `quotation_number ILIKE '%REX Forestry%' OR client_name ILIKE '%REX Forestry%'`.
3. `client_name = 'REX Forestry Ltd'` — substring match on "REX Forestry". Document returned.
4. **Result: FOUND (likely today).** If `client_name` was stored as "REX Forestry Ltd", the ILIKE matches.

### Scenario 3: Search "Oil Separator"

1. User types "Oil Separator".
2. Adapter sends: `quotation_number ILIKE '%Oil Separator%' OR client_name ILIKE '%Oil Separator%'`.
3. Neither column contains "Oil Separator". `quotation_title = 'Materials for Oil Separator and Used Oil Store'` — but this column is not searched.
4. **Result: NOT FOUND. This is a confirmed defect.** The fix requires adding `quotation_title.ilike.%${term}%` to the adapter's OR clause.

### Scenario 4: Search "12mm Concrete Rod"

1. User types "12mm Concrete Rod".
2. Adapter sends: `quotation_number ILIKE '%12mm Concrete Rod%' OR client_name ILIKE '%12mm Concrete Rod%'`.
3. Neither column contains this text. The item description exists in `quotation_items` but is never queried.
4. **Result: NOT FOUND. This is a confirmed defect.** The fix requires a JOIN to `quotation_items` with a description ILIKE filter.

### Scenario 5: item_id IS NULL — Document Still Discoverable

With the proposed fix (direct description JOIN), the query reads `quotation_items.description` directly. The `item_id` column value is irrelevant. Even when `item_id IS NULL`, the description text is present and the ILIKE matches.

**Result: SASQUO-382 is discoverable when item_id IS NULL.** This satisfies the critical architectural requirement.

### Scenario 6: Client-Scoped Search

A search for "12mm Concrete Rod" scoped to REX Forestry Ltd's client page:
1. Query: `SELECT ... FROM quotations q JOIN quotation_items qi ... WHERE q.client_id = '<rex_forestry_uuid>' AND qi.description ILIKE '%12mm Concrete Rod%'`.
2. Results filtered to REX Forestry Ltd's documents only.
3. SASQUO-382 is returned.
4. Scope applied server-side in SQL.

### Scenario 7: Result Contract

Each result row includes: `document_number` (SASQUO-382), `title` (Materials for Oil Separator and Used Oil Store), `client_name` (REX Forestry Ltd), `document_date` (2026-09-16), `match_source` (item_description), `matched_text` (12mm Concrete Rod), `document_type` (quotation).

### Scenario 8: Route to Document

`route = '/quotations/<document_id>'`. The frontend navigates using `useNavigate()` to this path, which loads `ViewQuotation.tsx`.

### Scenario 9: Tenant Permissions Enforced

The search RPC executes within the tenant schema. The PostgREST schema header restricts access to the authenticated entity's schema. RLS policies on `quotations` and `quotation_items` allow all authenticated users within the tenant. Cross-tenant access is structurally impossible.

---

## Section 16 — Phase 2 Architecture Recommendation

### 16.1 Scope of Phase 2

Phase 2 adds full-content document search to the quotations list. It extends to invoices and other document types in a subsequent sub-phase. It does not change the existing list behavior, pagination, or Item Library.

### 16.2 Search Authority

**Direct join queries over original source tables.** No materialized index layer. No external service.

- `quotations` + `quotation_items` for quotation content
- `invoices` + `invoice_items` for invoice content
- `rfqs` + `rfq_items` for RFQ content
- `csrs` for CSR service reports (no item table)
- `cps_sheets` + `cps_rows` for CPS content

### 16.3 Query / RPC Approach

**Option B: A single STABLE SQL function per tenant schema.**

```sql
CREATE OR REPLACE FUNCTION <schema>.search_documents(
    p_term text,
    p_document_types text[] DEFAULT NULL,
    p_client_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    document_type text,
    document_id uuid,
    document_number text,
    title text,
    client_id uuid,
    client_name text,
    document_date date,
    match_source text,
    matched_text text,
    match_rank integer,
    route text
)
LANGUAGE sql STABLE
```

The function body performs a UNION of per-type subqueries. Each subquery applies the ILIKE conditions to the correct fields and assigns a rank score. The combined result is ordered by `match_rank DESC` and limited to `p_limit` rows.

**The function uses NO SECURITY DEFINER.** It inherits the caller's session, which enforces schema isolation and RLS automatically.

### 16.4 Ranking Strategy

Use the ranking hierarchy from Section 8. Document number exact match ranks highest (1000). Item description substring ranks lower (300). The rank is computed in SQL using CASE expressions, matching the existing `get_item_suggestions` rank pattern.

### 16.5 Indexes Required

Add the following to each tenant schema via a migration that iterates `entity_*` schemas:

```sql
-- Trigram index for quotation title
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_title_trgm
    ON <schema>.quotations USING GIN (quotation_title gin_trgm_ops);

-- Trigram index for quotation item description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_items_description_trgm
    ON <schema>.quotation_items USING GIN (description gin_trgm_ops);

-- Same pattern for invoice_title, invoice_items.description
```

`CREATE EXTENSION IF NOT EXISTS pg_trgm` must be run once in the shared Supabase Postgres instance (requires superuser / Supabase dashboard). It applies globally — not per schema.

The `CONCURRENTLY` option allows index creation without table locks in production.

### 16.6 Migration Requirements

**One new migration** to:
1. Enable `pg_trgm` extension (once, in `public` schema).
2. Create trigram GIN indexes on target columns in `tenant_master_template` and all existing `entity_*` schemas.
3. Create the `search_documents` RPC in `tenant_master_template` and all existing `entity_*` schemas.
4. Update `provision_entity` to install the new RPC via `_prov_install_tenant_rpcs`.

### 16.7 Tenant Provisioning

The `provision_entity` function (`20260828000001`) already calls `_prov_install_tenant_rpcs`. Add `search_documents` to the set of RPCs installed at provisioning time. New tenants receive the search function automatically.

Trigram indexes must also be installed at provisioning time via a new `_prov_install_search_indexes(p_schema_name)` helper, called from `provision_entity` after `_prov_install_item_library`.

### 16.8 Client-Scoped Search

Pass `p_client_id` to `search_documents`. The function adds `AND q.client_id = p_client_id` to each subquery when the parameter is not NULL. The client detail page can call this RPC to search within one client's documents.

On the client page, add a search input field that calls `search_documents` via the tenant RPC client. Results replace the current static list.

### 16.9 Result Contract

Use the contract defined in Section 7. The frontend maps `route` directly to `useNavigate()` calls.

### 16.10 Fallback Behavior

If `search_documents` is unavailable (RPC not yet installed on an older tenant schema), the frontend falls back to the existing ILIKE filter on `quotation_number` and `client_name`. The fallback returns partial results but does not fail. A warning banner notifies the user that content search is unavailable for this workspace.

### 16.11 Index Health and Recovery

Phase 2 does not require a separate index health subsystem. The search RPC reads live tables. There is no separate index to become stale.

The Item Library item_id repair (Section 10) is a separate concern. It improves usage history accuracy but is not required for document search to work. Document search via the RPC is independent of item_id values.

### 16.12 Affected Application Areas

| Area | Change required |
|---|---|
| `src/config/moduleAdapters.ts` — quotationsAdapter | Add `quotation_title` to SELECT; add title to OR filter (immediate quick fix) |
| `src/config/moduleAdapters.ts` — invoicesAdapter | Add `invoice_title` to SELECT and OR filter |
| New: `src/modules/search/searchRpc.ts` | Wrapper to call `search_documents` RPC |
| New: `src/components/search/GlobalSearch.tsx` | Cross-document search UI component |
| `src/pages/ClientDetail.tsx` | Add search input wired to scoped RPC call |
| Supabase migration | pg_trgm extension, GIN indexes, `search_documents` RPC |

### 16.13 Phased Implementation Order

**Phase 2a (immediate, minimal migration required):**
1. Update `quotationsAdapter` to SELECT `quotation_title` and include it in the ILIKE OR filter. This fixes the "Oil Separator" scenario with zero infrastructure cost.
2. Update `invoicesAdapter` similarly for `invoice_title`.

**Phase 2b (standard migration):**
1. Enable `pg_trgm` extension.
2. Add GIN trigram indexes to `quotation_title`, `quotation_items.description`, `invoice_title`, `invoice_items.description`.
3. Create `search_documents` RPC in all tenant schemas and `tenant_master_template`.
4. Update `provision_entity` to install the new RPC and indexes.

**Phase 2c (UI):**
1. Add a global search entry point in the application navigation.
2. Add a search field to the client detail page.
3. Display structured search results with document type, number, title, client, date, matched text.

**Phase 2d (extended coverage):**
1. Extend `search_documents` to cover `rfq_items.specification`, `cps_rows.description`, `csrs.materials_used`.

### 16.14 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| pg_trgm extension requires Supabase dashboard action | High | Enable via Supabase dashboard; not blockable |
| GIN index build time on large tables | Low (current volume ~3K rows) | Use CONCURRENTLY |
| Duplicate quotation rows from item JOIN | Certain | Use EXISTS subquery, not JOIN |
| Cross-tenant leakage from global RPC | Zero | RPC defined per tenant schema |
| Trigram false positives for short terms | Low | Require minimum 3-character search term |
| Rank ties when multiple items match | Low | Secondary sort by document_date DESC |

### 16.15 Performance Assumptions

At the confirmed production volume of ~321 quotations and ~2,799 quotation_items (per `20260810010000` migration), the direct ILIKE query without any trigram index will return results in under 100ms. Trigram indexes are an optimization for scale, not a prerequisite for correctness.

---

## Findings Summary

| Finding | Type | Severity |
|---|---|---|
| `quotation_title` is not searched in the quotations list | Confirmed defect | HIGH |
| Line-item descriptions are never searched | Confirmed defect | HIGH |
| "Oil Separator" does not find SASQUO-382 today | Confirmed defect | HIGH |
| "12mm Concrete Rod" does not find SASQUO-382 today | Confirmed defect | HIGH |
| Item Library is not a substitute for document search | Architectural gap | HIGH |
| No pg_trgm, GIN, or FTS capability currently deployed | Gap | MEDIUM |
| B-tree index on description does not accelerate ILIKE | Confirmed limitation | MEDIUM |
| No server-side pagination (all rows returned) | Performance risk | MEDIUM |
| Null item_id rows are invisible to Item Library discovery | Confirmed behavior | MEDIUM |
| `quotation_title` column exists in DB but is not selected in list query | Confirmed gap | HIGH |
| Client page has no search capability | Confirmed gap | HIGH |
| Tenant schema isolation prevents cross-tenant leakage | Confirmed safe | — |
| Phase 2 fix does not require Item Library linkage | Confirmed safe path | — |

---

## Risks and Limitations

- This audit reads migration files as the authority for schema state. Undocumented manual schema changes (if any) are not visible.
- The exact value of `quotations.client_name` for SASQUO-382 was not confirmed by live query. The analysis assumes it was stored as "REX Forestry Ltd" or a substring thereof.
- Waybill items are in a JSONB column. Searching inside JSONB requires `jsonb_to_text` casting or explicit key extraction, which is more complex than the item-table approach.
- The `rfqs` module stores vendor contact data, not client data. The `client_name` ILIKE filter may match nothing for most RFQ records.

## Deferred Work

- Phase 2 implementation (all items above deferred to implementation phase)
- Item Library null-id repair (separate concern, deferred)
- Waybill JSONB item search (requires JSONB text extraction, deferred to Phase 2d)
- CSR materials_used / service_rendered search (deferred to Phase 2d)
- Pagination of search results (not needed until document volume grows significantly)
- Snippet extraction (showing the matched fragment in context) — deferred to Phase 2c
