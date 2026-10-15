# Phase 3 Document Search Extension Report

This report was written by Buffy on 2026-10-14 via Freebuff Desktop.

## Objective

Extend the proven document search authority to five more document types. Complete the client-scoped search UI and repair the search-active header state.

The five new types are RFQ, CPS, CSR, Waybill, and Receipt.

## Scope

In scope:

- Extend `search_documents` in every tenant schema. Do not replace it.
- Search the original source tables. Do not add an Item Library dependency.
- Wire client-scoped search into the client workspace.
- Repair the stale header count and the stale empty state.
- Keep quotation and invoice behavior frozen.

Out of scope:

- No new search authority per document type.
- No AI, vector, or external search service.
- No change to CPS pricing math, PDF rendering, or Item Library logic.

## Files Changed

New files:

- `supabase/migrations/20261014160000_document_search_phase3.sql`
- `src/domain/search/summary.ts`
- `src/components/client/workspace/ClientDocumentSearch.tsx`

Modified files:

- `src/domain/search/types.ts`
- `src/components/search/DocumentSearchResults.tsx`
- `src/components/layout/ModuleShell.tsx`
- `src/components/quotation/QuotationList.tsx`
- `src/pages/Invoices.tsx`
- `src/pages/ClientDetail.tsx`
- `src/tests/critical/documentSearchPlatform.test.js`

The two applied migrations were not touched:

- `20261014100000_document_search_platform.sql`
- `20261014120000_document_search_convergence.sql`

Test 45 proves this. Neither file mentions the new tables.

## Skills Used

Skills used: supabase-postgres-best-practices, supabase, karpathy, typescript-advanced-types, vercel-composition-patterns
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### 1. The existing search authority was extended

The migration replaces `public._prov_install_search(text)`. That function installs the tenant search body. The body now holds fourteen source CTEs. Twelve of them read a document table and cross join the normalized needle.

The `search_documents` signature is unchanged:

```
search_documents(p_term text, p_document_types text[], p_client_id uuid, p_limit integer)
```

The function is still `LANGUAGE sql STABLE`. It is still caller-rights. RLS still applies.

### 2. Client scope truth

The live schema decides which types can be client-scoped.

| Table | client_id column |
| --- | --- |
| quotations | yes |
| invoices | yes |
| csrs | yes |
| waybills | yes |
| receipts | yes |
| rfqs | no |
| cps_sheets | no |

RFQ and CPS are therefore skipped under a client scope. The four RFQ and CPS CTEs carry `AND p_client_id IS NULL`. The code never compares `client_name` text to invent a relationship.

### 3. Fields searched, per type

RFQ (`rfqs` + `rfq_items`):

- Header: `rfq_number`, `title`, `vendor_name`, `client_name`
- Items: `description`, `specification`, `notes`

CPS (`cps_sheets` + `cps_rows`):

- Header: `cps_number`, `title`, `client_name`, `notes`
- Rows: `description`, `cells->>'make_brand'`, `cells->>'specification'`, `section_title`, `notes`

The `cells` JSONB also holds `cp` and `sp`. Those are pricing values. The search never reads them. Test 48 proves this.

CSR (`csrs`):

- `csr_number`, `client_name`, `problem_reported`, `service_rendered`, `defects_found`
- `equipment_type`, `make`, `model`, `serial_no`, `engine_no`
- `engineer_remarks`, `equipment_location`, `address`, `customer_feedback`
- `materials_used`, through the extraction helper described in section 4

Waybill (`waybills`):

- Header: `waybill_number`, `client_name`, `delivery_location`, `vehicle_plate`, `notes`, `purpose`
- Items: `items[].description`

Receipt (`receipts`):

- `receipt_number`, `invoice_number`, `client_name`, `notes`, `payment_notes`

Numeric readings are not searched. CSR `voltage`, `frequency`, `pressure`, and `temperature` are excluded. Waybill `qty`, `unit`, and `condition` are excluded. Test 50 proves the waybill exclusion.

### 4. Two data hazards found in live data

Both hazards were found by reading the live columns before writing SQL.

**Hazard 1 — the CSR materials envelope.**

Live `csrs.materials_used` is a text column. Non-empty rows hold a JSON envelope with a fixed prefix:

```
__CSR_META_V1__{"version":1,"materialsRows":[{"item":"12v relay",...}],
  "materialsText":"1. 12v relay (1)","meta":{"showOperationalReadings":true,...}}
```

Every non-empty row carries this envelope. There are no plain-text rows.

A raw search of that column would match JSON keys. A search for `materialsRows` or `version` would hit every CSR. The result card would also print the whole envelope as `matched_text`.

The extension therefore installs a helper, `_search_csr_materials(text)`. The helper returns only text a user recognizes:

- It prefers `materialsText`, which is the list as it prints on the CSR.
- It falls back to the item names in `materialsRows`.
- It never returns the `meta` block.
- It returns legacy plain text unchanged, so older rows stay searchable.
- It returns `NULL` for a malformed envelope instead of raising.

The helper catches only SQLSTATE `22P02`. One bad row must never abort a search for a whole tenant. Any other error still surfaces. The migration contains no `EXCEPTION WHEN OTHERS`.

Live proof of the helper:

| Input | Result |
| --- | --- |
| Valid envelope | `1. Oil filter (1) 2. Air filter (2)` |
| `materialsRows` only | `12v relay Fuse` |
| Truncated envelope | `NULL` — no raise |
| Prefix with non-JSON text | `NULL` — no raise |
| Legacy plain text | `Replaced 5L engine oil` |
| Empty or `NULL` | `NULL` |

**Hazard 2 — the waybill `items` JSONB.**

`waybills.items` holds an array of objects with a `description` key. All 21 live rows are arrays. A future row could hold an object or a JSON null. `jsonb_array_elements` raises on a non-array. That would break every search for the tenant.

The extraction is therefore guarded:

```sql
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(w.items) = 'array' THEN w.items ELSE '[]'::jsonb END
) AS item
```

### 5. Ranking additions

The extension reuses the existing bands. It adds no new band.

| Band | Meaning | Types that use it |
| --- | --- | --- |
| 1000 | Exact document number | all |
| 900 | Number prefix | all |
| 800 | Number substring | all |
| 750 | Exact title | quotation, invoice, rfq, cps |
| 650 | Title substring | quotation, invoice, rfq, cps |
| 500 | Party name | all with a party field |
| 400 | Exact item or content description | quotation, invoice, rfq, cps, waybill |
| 300 | Item or content substring | quotation, invoice, rfq, cps, waybill, csr |
| 250 | Make, specification, equipment identity, location | rfq, cps, csr, waybill |
| 200 | Sub-description, notes, section, remarks | all |

CSR, Waybill, and Receipt have no title column. They skip the 750 and 650 bands.

`receipts.invoice_number` belongs to a different document. It uses the standard number bands and reports `match_source = 'reference_number'`.

### 6. Match source vocabulary

The RPC can now report twenty match sources. Test 64 checks that the TypeScript union matches the RPC in both directions.

`number`, `reference_number`, `client`, `vendor`, `title`, `notes`, `location`, `equipment_type`, `equipment`, `item_description`, `item_make`, `item_sub_description`, `item_notes`, `specification`, `section_title`, `problem_reported`, `service_rendered`, `materials_used`, `defects_found`, `engineer_remarks`

`equipment` covers make, model, serial number, and engine number. `location` covers delivery location, vehicle plate, equipment location, and address. `matched_text` shows the real field value, so the card stays precise.

### 7. Route mapping

Each branch builds the route the document already owns. Test 55 checks these routes against `AppShell.tsx`.

| Type | Route in the RPC | Route in the app |
| --- | --- | --- |
| quotation | `/quotations/<id>` | `/quotations/:id` |
| invoice | `/invoices/<id>` | `/invoices/:id` |
| rfq | `/rfqs/<id>` | `/rfqs/:id` |
| cps | `/cost-pricing-sheets/<id>` | `/cost-pricing-sheets/:id` |
| csr | `/csr/<id>` | `/csr/:id` |
| waybill | `/waybills/<id>` | `/waybills/:id` |
| receipt | `/receipts/<id>` | `/receipts/:id` |

No route was invented.

### 8. Index changes

The migration adds nine trigram indexes per tenant. Eleven tenants received them. The live count is 99.

Each index is justified below. Every row class is a document header that is written once and rarely updated.

| Index | Field searched | Why it needs substring acceleration | Expected write overhead |
| --- | --- | --- | --- |
| `idx_rfqs_rfq_number_trgm` | `rfqs.rfq_number` | A user types or pastes part of a number. Mid-string matching cannot use a btree index. | One GIN entry per header insert. Headers are created once. |
| `idx_rfqs_title_trgm` | `rfqs.title` | Titles are the second-most used lookup and are matched mid-string. | One GIN entry per header insert. Titles change rarely. |
| `idx_rfqs_vendor_name_trgm` | `rfqs.vendor_name` | The vendor is the RFQ party. Party lookup is a high-value, low-cardinality search. | One GIN entry per header insert. |
| `idx_cps_sheets_cps_number_trgm` | `cps_sheets.cps_number` | Same identifier lookup as RFQ. | One GIN entry per header insert. |
| `idx_cps_sheets_title_trgm` | `cps_sheets.title` | Same title lookup as RFQ. | One GIN entry per header insert. |
| `idx_csrs_csr_number_trgm` | `csrs.csr_number` | Engineers quote a CSR number when they call. This is the primary CSR lookup. | One GIN entry per header insert. |
| `idx_waybills_waybill_number_trgm` | `waybills.waybill_number` | The number is printed on the paper waybill and is the usual search term. | One GIN entry per header insert. |
| `idx_receipts_receipt_number_trgm` | `receipts.receipt_number` | Primary receipt lookup. | One GIN entry per header insert. |
| `idx_receipts_invoice_number_trgm` | `receipts.invoice_number` | The invoice number is the second lookup path into a receipt, and it matches a different document's number. | One GIN entry per header insert. |

A GIN trigram index costs more per write than a btree index, because one value produces many trigram entries. That cost is bounded by document creation, not by line-item volume. No index sits on a table with per-line writes.

Free-text content columns of the new types are deliberately not indexed. Each tenant would gain roughly thirty indexes for an uncertain benefit at current volumes. The planner already prefers a sequential scan at these row counts.

The `items` JSONB column carries no GIN index. A text-expression index on JSONB needs a validated query pattern first. Correctness beats over-indexing here. Test 46 proves the absence.

### 9. Client-scoped search UI

A new component, `ClientDocumentSearch`, owns the search box and the results. The client workspace renders it around its history groups.

- The scope is `client_id`. It goes to the server. The browser never filters history.
- While a search is active, the component replaces the history groups. It does not show both.
- The header shows `searchResultSummary(...)`: `Searching...`, `No results`, `3 results`, or `3+ results`.
- A result navigates to the route the server built.

Test 70 proves the scope is server-side. Test 72 proves the history and the results never render together.

### 10. Header count and empty state repairs

Two UI defects were confirmed by reading the code.

**Defect 1 — the stale header count.**

`QuotationList` passed `summary={`${quotations.length} quotations total`}`. `Invoices` passed the same shape. The search sets `records` to an empty array, so the header read `0 quotations total` above several visible matches.

Both screens now show `searchResultSummary(...)` while a search is active. The normal count returns when the search clears.

`searchResultSummary` lives in `src/domain/search/summary.ts`. It is a plain module, so test 66 can call it directly.

**Defect 2 — the stale empty state.**

`ModuleShell` chose the empty state with `emptyState || (default)`. The search-aware callers passed `null`. `null || default` renders the default. The screen showed enriched results and `No quotations found` together.

`ModuleShell` now treats the two cases differently:

```tsx
emptyState === undefined ? (default) : emptyState
```

An absent `emptyState` still renders the default. An explicit `null` renders nothing.

No other caller passes `null`. All nine other callers pass a JSX element. The change affects only the two search-aware screens.

### 11. Tenant coverage policy

The eligibility check now lists every table the RPC reads:

`quotations`, `quotation_items`, `invoices`, `invoice_items`, `rfqs`, `rfq_items`, `cps_sheets`, `cps_rows`, `csrs`, `waybills`, `receipts`

A schema that misses a table is skipped and named at `WARNING` level. A schema that holds every table must succeed. Any failure there aborts the migration. The migration contains no `EXCEPTION WHEN OTHERS`.

## Verification Result

### Preflight

The migration ran inside a rolled-back transaction before it was applied. The same assertion script ran in both passes.

The rollback was proven non-destructive. After the preflight, `to_regprocedure('entity_bigdrops-main_main._search_csr_materials(text)')` returned `NULL`, and a CSR search returned zero rows.

### Live acceptance

`PHASE3 ASSERTIONS COMPLETE` — every assertion passed.

```
A.20 entity_bigdrops-main_main          :: 20 provenance/reachability checks passed
A.01 entity_bigdrops-main_anthropology  :: 1 provenance/reachability check passed
A.01 entity_bigdrops-main_azerbaijan    :: 1 provenance/reachability check passed
A.total                                 :: 22 checks passed, 180 skipped (no live rows)
B.csr-materials  :: envelope hidden; matched_text = "1. 12v relay (1)"
C.term-safety    :: blank/whitespace=0 rows; limit honoured; padding tolerated;
                    % and _ literal; rank ordered; no duplicates
D.client-scope   :: 22 of 50 unscoped row(s) kept; no leakage; no rfq/cps
D.type-filter    :: invoice-only filter returned no other type
E.routes         :: 50 distinct document_type/route shapes match the app route map
```

The assertions are self-deriving. Each probe term is read from the live table first, then round-tripped through `search_documents`. Provenance probes use the longest value in the column. A short value such as `Net` can also match an RFQ title, and deduplication then reports the higher-ranked title match.

Proven in `entity_bigdrops-main_main`: quotation number, invoice number, RFQ number, RFQ item description, RFQ specification, CPS number, CPS row description, CPS `make_brand`, CSR number, CSR service text, CSR problem text, CSR make, CSR materials text, Waybill number, Waybill JSON item text, Waybill delivery location, Waybill vehicle plate, Receipt number, Receipt linked invoice number, Receipt client name.

Ten tenant schemas hold no documents. Their coverage is structural only.

### Regression evidence for quotation and invoice

- Exact numbers round-trip in every schema that holds one.
- `item_id` remains absent from every search predicate. Test 60 proves this for the whole body.
- Term normalization is unchanged. Blank and whitespace terms return zero rows. Padded terms behave like trimmed terms.
- `%` and `_` stay literal. `RF_` and `RFQ_` match nothing.
- Deduplication is deterministic. One row per document, including a waybill that matches several JSON items.
- Ordering is deterministic. No rank inversion in 40 rows.
- Type filtering, client scope, and `has_more` are unchanged.

### Test suite

The focused suite grew from 44 to 72 tests. All 72 pass.

Full suite: 1156 tests, 1141 pass, 15 fail.

The 15 failures are pre-existing. A stash comparison proves it:

| State | Tests | Pass | Fail |
| --- | --- | --- | --- |
| Without this work | 1128 | 1113 | 15 |
| With this work | 1156 | 1141 | 15 |

The failing suites are `cpsIndustry`, `cpsLedger`, `cpsPdf`, `invoiceAccountingIntegration`, `paymentAccountingIntegration`, `remediationContract`, and `sourceTransactionContract`. No failing suite references a file this task changed.

### Other checks

- `bun run typecheck`: exit 0, no diagnostics.
- `bun run audit:load`: identical to baseline. 42 oversized files, 8 broad selects, 1 component fetch, 4 heavy limits. Files scanned rose from 915 to 916 for the new component. `ClientDetail.tsx` fell from 648 to 592 lines and left the oversized list.
- Lint: every changed file matches its `HEAD` count exactly. The two new files report no problems.
- `git diff --check`: exit 0.
- `bun run build`: not run. The hardware policy in `AGENTS.md` bans it.

## Supabase Push Status

Applied and verified.

- `supabase db push` applied `20261014160000_document_search_phase3.sql`.
- `supabase migration list --linked` shows the timestamp on both sides.
- The migration was re-pushed once, after `supabase migration repair --status reverted`. The first push deployed a blanket `EXCEPTION WHEN OTHERS` in the helper. The repair restored the file's exception scope to `22P02` only. History holds one correct migration, not a repair chain.
- 12 schemas hold the new RPC and the helper: 11 `entity_*` schemas plus `tenant_master_template`.
- Zero schemas hold the earlier body.
- `provision_entity` calls `_prov_install_search` and clones the template. Future tenants inherit the extension.
- PostgREST serves the RPC. `POST /rest/v1/rpc/search_documents` with `Content-Profile: entity_bigdrops-main_main` returned HTTP 200. An unauthenticated call returned `[]`, because RLS applies to caller-rights search. `tenant_master_template` is not an exposed schema.

## Risks or Limitations

- **The helper is a new function in each tenant schema.** It is `IMMUTABLE` and caller-rights. It costs one JSON parse per CSR row, only when a CSR row matches. At current volumes this is negligible.
- **Only one tenant holds live documents.** Provenance is proven across every new type in `entity_bigdrops-main_main`. Ten other tenants prove structure only. The assertions are written so they will check those tenants automatically once they hold data.
- **The browser UI was not exercised.** The client workspace and the two list screens need a signed-in session. The database, REST, TypeScript, and test paths are verified. The rendered panels are not.
- **`location` and `equipment` group several columns into one label.** The card shows the real matched text, so the user still sees which value matched. The label is coarser than the field.
- **`rfqs.vendor_name` is empty in every live row.** Vendor search is implemented and indexed. It has no live acceptance fixture. A source test proves the branch reads the column.
- **The RFQ party appears through the match line, not the party line.** The result contract carries `client_name` only. An RFQ has no `client_id` and its `client_name` column is null, so a vendor hit is reported as `vendor: <name>` in the why-it-matched line. The truth is preserved; the value is not relabelled as a client. Adding a separate party column would change the frozen phase-2 result contract. See Deferred Work.
- **One CSR field has no live fixture.** `engineer_remarks` is searched and labelled. No live row holds a usable value, so it carries no acceptance evidence. `problem_reported`, `service_rendered`, `materials_used`, and `equipment` (make) all do.
- **Free-text columns of the new types are unindexed.** This is deliberate. Revisit when the new types reach the row count of `invoice_items`.
- **Waybill `custom_data` is not searched.** That sub-object holds `make`, `part_no`, and an Item Library `item_id`. Searching `item_id` would create the Item Library dependency the task forbids. The rest is deferred, not removed.

## Deferred Work

- Verify the client workspace search and the repaired header in a signed-in browser session.
- Search waybill `custom_data.make` and `custom_data.part_no` once the field's write path is confirmed stable.
- Add trigram indexes for the new free-text columns when volumes justify them.
- Split the `location` and `equipment` match sources into precise per-field names, once the result card can render a longer label.
- Extend the same client-scoped search block to the remaining workspaces, such as the project detail screen.
- Decide whether the result contract should carry a neutral `party_name`. That would let an RFQ show its vendor in the card's party line instead of only in the match line. It changes the `RETURNS TABLE` shape, so it needs its own migration and a TypeScript update.
