# Item Library Ingestion, Cleanup, and Autocomplete Audit

This report was written by Codex on 2026-09-25 via Codex desktop.

## Objective

Audit the BIGDROPS Item Library, Cleanup Hub, and item autocomplete paths.

This task was audit-only. No application source, migration, configuration, or database state was changed.

## Scope

- Item Library storage, reads, and summary counts.
- Invoice and quotation line item save paths.
- Cleanup Hub issue generation.
- Form autocomplete retrieval and UI behavior.
- Tenant schema routing, tenant object installation, and tenant isolation.
- Live database evidence from the hosted Supabase project.

## Files changed

- `docs/Reports/item-library-ingestion-cleanup-autocomplete-audit-2026-09-25.md`

## Skills used

Skills used: superpowers:using-superpowers, supabase, supabase-postgres-best-practices, ponytail-audit

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Summary conclusion

The primary failure is confirmed.

New canonical Item Library records are not created by the active document save paths. Invoice and quotation saves persist line items with the current `item_id`. If a user enters a new description that has no exact existing suggestion, the row keeps `item_id = null`. No active frontend or SQL save path creates or upserts `item_catalog`.

Existing canonical records still receive fresh usage evidence indirectly. The `item_price_summary_v` view derives usage count, last price, and last-used date from `invoice_items` and `quotation_items` rows that already have `item_id`. This explains why existing items show September 2026 usage while new canonical items stopped appearing.

The live database confirms this separation:

| Measure | Result |
| --- | ---: |
| `item_catalog` rows | 1,394 |
| Active catalog rows | 1,391 |
| Active summary rows | 1,391 |
| `invoice_items` rows | 2,110 |
| `quotation_items` rows | 3,115 |
| Invoice rows with `item_id is null` | 307 |
| Quotation rows with `item_id is null` | 902 |
| Catalog creation window | 2026-04-24 02:55:31 UTC to 2026-04-24 03:06:35 UTC |
| Latest catalog `updated_at` | 2026-04-24 03:06:35 UTC |
| Latest linked invoice item update | 2026-09-23 10:36:10 UTC |
| Latest linked quotation item update | 2026-09-24 05:32:41 UTC |
| Latest quotation item update, any row | 2026-09-25 09:53:04 UTC |

Recent unlinked quotation examples from 2026-09-25 include `Replacement of Diode Kits Sets`, `Insulating Varnishes & Consumables`, `Rewinding of Main Alternator (50kVA)`, and `Automatic Voltage Regulator (AVR)`. These rows are document line items, but they are not canonical library records.

## Data flow map

Producer:

- Invoice and quotation forms use `FormLineItems` and `MobileItemCard`.
- `FormLineItems` enables suggestions for non-waybill contexts at `src/components/document/FormLineItems.tsx:280` and `src/components/document/FormLineItems.tsx:304`.
- Waybill context disables suggestions. `ITEM_FIELD_POLICY` stores waybill `item_id` only in `custom_data` at `src/components/shared/itemFieldPolicy.ts:32`.

Processing:

- `MobileItemCard` asks `useItemSuggestionEngine` for suggestions at `src/components/invoice/MobileItemCard.tsx:126`.
- The hook only fetches when the row is focused, has at least two characters, and is a standard row at `src/modules/item-library/hooks/useItemSuggestionEngine.ts:38`.
- Exact matches can auto-fill `item_id` at `src/components/invoice/MobileItemCard.tsx:141`.
- Manual text changes clear an existing `item_id` at `src/components/invoice/MobileItemCard.tsx:202`.

Persistence:

- `toDbItem()` carries `item.item_id ?? null` into invoice rows at `src/domain/invoice/factories.ts:91`.
- Invoice create and update call `save_invoice_with_items_transaction` when `entityId` exists at `src/hooks/useInvoiceSave.ts:269`.
- The tenant RPC inserts `invoice_items.item_id` from the payload only. It does not insert `item_catalog`. See `supabase/migrations/20260902120000_provisioning_engine_repair.sql:218`.
- Quotation save deletes and reinserts `quotation_items` at `src/hooks/useQuotationSave.ts:270`. It also writes only the existing row `item_id`.

Consumers:

- Item Library list reads `item_price_summary_v` through `getItemSummaryList()` at `src/modules/item-library/repositories/itemLibraryRepository.ts:279`.
- Counts read `item_price_summary_v`, `invoice_items`, and `quotation_items` at `src/modules/item-library/repositories/itemLibraryRepository.ts:410`.
- Autocomplete reads `get_item_suggestions` first, then falls back to `item_price_summary_v` at `src/modules/item-library/repositories/itemLibraryRepository.ts:196`.
- Cleanup Hub uses the same summary list and duplicate detection at `src/modules/item-library/pages/ItemLibraryPage.tsx:82` and `src/modules/item-library/pages/ItemLibraryPage.tsx:99`.

## Authoritative storage model

Canonical storage:

- `item_catalog` is the canonical item table.
- `item_aliases` stores aliases.
- `item_merge_log` stores merge activity.
- `item_price_summary_v` is a derived view.

Usage and price history:

- There is no separate price history table in the active code path.
- Usage and price history are inferred from `invoice_items` and `quotation_items`.
- `item_price_summary_v` joins catalog rows to line rows in `supabase/migrations/20260828000001_item_library_tenant_objects.sql:72`.

Normalization:

- SQL normalization is `normalize_item_text()` in tenant schemas. It lowercases, trims whitespace, changes `mm²` and `mm2` to `sqmm`, and changes `&` to `and`. See `supabase/migrations/20260828000001_item_library_tenant_objects.sql:40`.
- Client duplicate detection has a separate tokenizer and matcher at `src/modules/item-library/domain/duplicateDetection.ts:1`.

Deduplication:

- Suggestions are exact or substring searches. They do not create canonical rows.
- Duplicate detection is computed client-side from summary rows. It groups similar catalog names by token overlap at `src/modules/item-library/domain/duplicateDetection.ts:93`.
- Merge uses the `merge_item_catalog_entries` RPC and relinks invoice and quotation rows at `supabase/migrations/20260828000001_item_library_tenant_objects.sql:210`.

## New-item insertion versus existing-item update

| Capability | Current result | Evidence |
| --- | --- | --- |
| Create a new canonical record | Not found in active path | No frontend insert/upsert into `item_catalog`; save RPC only inserts document rows |
| Recognize an existing item | Works for suggestions | `get_item_suggestions` and exact-match logic |
| Update usage count | Works indirectly | View counts linked line rows |
| Update last-used date | Works indirectly | View uses linked line row dates |
| Update observed price | Works indirectly | View derives min/max/avg/latest price from linked rows |
| Append price history | No separate append path | No price history table found in active code |
| Associate more document usages | Works only if line row has `item_id` | Invoice and quotation line rows provide the association |

The A-G paths diverge. Canonical creation is missing. Existing-item updates are derived from linked document rows.

## Failure boundary

The failure boundary is between form save and canonical catalog insertion.

When a user selects an existing suggestion, `MobileItemCard` writes its `item_id`. The later document save preserves that value. The summary view then sees linked rows and updates usage and price-derived fields.

When a user types a new unique description, no suggestion exists. No code creates `item_catalog`. The line row is saved with `item_id = null`. The library, Cleanup Hub, and autocomplete cannot see that description as a canonical item.

This is not mainly a UI query cap. The live DB shows all catalog rows were created in April 2026, while linked line rows update through September 2026.

This is not proof of a failed write to all item-library objects. Existing linked rows still produce fresh usage.

## Multi-tenant audit

The active architecture is tenant-local.

- `createTenantClient()` sends reads and RPCs through `client.schema(schemaName)` at `src/lib/tenantClient.ts:11`.
- `ItemLibraryPage` reads `schemaName` from `useEntity()` at `src/modules/item-library/pages/ItemLibraryPage.tsx:72`.
- Item Library objects are installed into tenant schemas by `_prov_install_item_library()` at `supabase/migrations/20260828000001_item_library_tenant_objects.sql:23`.
- The public business schema was purged in `supabase/migrations/20260830000000_public_business_schema_purge.sql:20`.
- Grants for tenant item-library views and functions were added in `supabase/migrations/20260830020000_item_library_tenant_grants.sql:16`.

Live DB inspection found `item_catalog`, `item_aliases`, `item_merge_log`, `item_price_summary_v`, `invoice_items`, and `quotation_items` in each observed `entity_%` schema, including `entity_bigdrops-main_main`.

Tenant isolation looks correct for reads and current save paths. The missing piece is tenant-local learning logic. A repair must create catalog rows inside the same tenant schema as the document rows. It must not aggregate across tenants.

## Database evidence notes

`supabase/database-workflow.md` was read before DB inspection.

`supabase db diff --linked` was attempted first. It failed because the CLI tried to create a Docker-backed shadow database. Docker is forbidden by this repository. No local Supabase stack was started.

The installed CLI does not support `supabase db shell`. `supabase db query --linked` was used for read-only SQL. No mutation query was run.

## Regression window

The live data shows all `item_catalog` rows in `entity_bigdrops-main_main` were created on 2026-04-24. No catalog row has a later `created_at` or `updated_at`.

Repository history shows these relevant changes:

- `c8d6d127 feat: implement flagged item cleanup workflow and sync Android build configuration`
- `1dcb6643 feat: implement item library management module with hooks, repository services, and UI components`
- `0aa38214 refactor(item): unify suggestion engine and optimize query performance`
- `1f237cad feat(tenancy): final application tenancy cutover`
- `20260828000001_item_library_tenant_objects.sql` moved item-library view and functions into tenant schemas.
- `20260830020000_item_library_tenant_grants.sql` fixed tenant read grants.

The strongest evidence is not a later regression in the summary query. The active architecture appears to have imported or seeded catalog rows on 2026-04-24, then never implemented live learning for new descriptions. Multi-tenancy later preserved tenant-local reads but did not add a learning/upsert path.

Confidence: high for the active failure boundary. Medium for the exact historical cause, because the audit did not find a removed live-learning function. It may never have existed.

## Cleanup Hub

Cleanup Hub is downstream of the canonical catalog.

- It loads the same `summaryItems` array as the Library at `src/modules/item-library/pages/ItemLibraryPage.tsx:82`.
- It computes duplicates from those summary rows at `src/modules/item-library/pages/ItemLibraryPage.tsx:99`.
- Its badge count is `allDuplicateGroups.length` at `src/modules/item-library/pages/ItemLibraryPage.tsx:105`.
- Advanced cleanup export uses `getItemSummaryList(limit)` and duplicate groups at `src/modules/item-library/services/itemLibraryService.ts:63`.

Cleanup Hub is not independently proving catalog completeness. It can correctly process an incomplete catalog. Its issue count excludes new unlinked descriptions because those descriptions are not canonical catalog items.

## Count semantics

- `All (1,391)` means active canonical rows from `item_price_summary_v`. Code: `getItemFilterCounts()` at `src/modules/item-library/repositories/itemLibraryRepository.ts:410`.
- `Invoice (2,110)` means all rows in `invoice_items`, not distinct canonical invoice items.
- `Quotation (3,115)` means all rows in `quotation_items`, not distinct canonical quotation items.
- `200 shown` is the UI load limit from `useItemHistoryList(200, ...)` at `src/modules/item-library/pages/ItemLibraryPage.tsx:82`.
- Cleanup issue count means duplicate groups found in the loaded canonical summary rows.

The differing counts do not prove corruption. They mix canonical catalog rows with document-line occurrence counts.

## Autocomplete data path

Autocomplete path:

1. `FormLineItems` enables suggestions for invoice and quotation rows.
2. `MobileItemCard` calls `useItemSuggestionEngine`.
3. `useItemSuggestionEngine` calls `loadSuggestions(trimmed, 10, clientId, tenantClient)`.
4. `loadSuggestions()` normalizes and ranks results.
5. `getItemSuggestions()` calls tenant RPC `get_item_suggestions`.
6. If RPC returns no rows, it falls back to `item_price_summary_v`.
7. It then loads invoice and quotation history for suggestion price context.

Limits:

- Suggestions are capped at 10.
- Fetching needs focus and at least two characters.
- Query results are not globally cached. The hook cancels stale async runs.
- Item Library list cache is tenant-scoped by schema name in `useItemHistoryList()`.

Autocomplete incompleteness is mostly downstream of missing catalog creation. Retrieval also cannot return unlinked line descriptions because it reads catalog and summary objects.

## Autocomplete UX defects

No UI changes were made.

Observed and code-supported defects:

- The dropdown uses `bg-[var(--bd-surface)]`. If the theme token is translucent, underlying form text remains visible. Code: `src/components/invoice/MobileItemCard.tsx:236`.
- The dropdown is inside a relatively positioned row and uses `z-10`. It can lose stacking battles with floating actions or other overlays.
- Blur dismissal uses a 150 ms timeout at `src/components/invoice/MobileItemCard.tsx:228`. This is fragile for keyboard, touch, and assistive tech.
- No Escape key handler is present.
- No explicit outside-click handler is present.
- Suggestion rows are buttons but there is no active descendant pattern or keyboard navigation.
- Mobile height is capped at 280 px. This is safer than unbounded height, but it can still consume much of the viewport with the keyboard open.
- The result rows show only name and price. They omit source, date, and client price context in the dropdown.

## Code-weight audit

Large files:

| File | Lines |
| --- | ---: |
| `src/modules/item-library/domain/itemCleanupExchange.ts` | 978 |
| `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx` | 966 |
| `src/modules/item-library/pages/ItemLibraryPage.tsx` | 579 |
| `src/modules/item-library/repositories/itemLibraryRepository.ts` | 486 |
| `src/modules/item-library/types/itemLibrary.ts` | 308 |

Necessary complexity:

- Tenant-aware repository calls.
- Merge safety for real UUIDs versus synthetic fallback IDs.
- Cleanup import/export validation.
- Summary and detail views over catalog, aliases, and document line history.

Accidental or removable complexity:

- Separate normalization exists in SQL, suggestion ranking, imported fallback grouping, and duplicate detection.
- `getItemSuggestions()` has multiple compatibility paths and swallowed exceptions.
- `getItemSummaryList()` has heavy fallback logic with 5,000-row scans.
- Cleanup Hub and Library share the same list state but have different expectations.
- The advanced cleanup component has too many responsibilities in one file.

Uncertain complexity:

- Imported fallback items may be needed for historical unlinked rows. They are useful for diagnostics, but they also obscure the missing canonical learning path.

## Confirmed facts

- Active catalog rows are tenant-local.
- The `entity_bigdrops-main_main` catalog has 1,394 rows, 1,391 active.
- All catalog rows were created on 2026-04-24.
- Linked document line rows still update in September 2026.
- There are 1,209 unlinked invoice or quotation item rows.
- Save paths persist `item_id` but do not create canonical catalog rows.
- Cleanup Hub issue count is computed from loaded canonical summary rows.
- Autocomplete reads canonical catalog-derived structures, not raw unlinked descriptions.

## High-confidence root cause

The live ingestion pipeline does not have a canonical creation step for new descriptions.

The intended learning loop stops after document line persistence. Existing item usage works only when `item_id` is already present. New descriptions remain unlinked line rows.

## Secondary defects

- Cleanup Hub is incomplete because its input catalog is incomplete.
- Source counts mix line occurrence counts with canonical counts.
- Suggestion RPC errors are swallowed before fallback.
- Autocomplete UI has legibility and interaction defects.
- The implementation has accidental complexity around duplicate logic, fallbacks, and large cleanup files.

## Unresolved questions

- Whether an older one-time import script created the April 24 catalog rows.
- Whether a removed learning function existed before current git history.
- Whether non-main tenant schemas contain tenant-specific item counts that need separate remediation.
- Whether imported fallback rows should become first-class canonical rows during repair or only diagnostics.

## Repair plan

1. Add a tenant-local learning service or RPC that accepts document line rows after successful invoice and quotation save.
2. For each standard row with a non-empty description, normalize the description in the tenant schema.
3. If normalized text matches an active catalog item or alias, write that `item_id` back to the saved line row.
4. If no match exists, insert a new `item_catalog` row in the same tenant schema.
5. Use a unique constraint on normalized catalog name to make insertion idempotent.
6. Keep usage and price history derived from document rows unless a separate price history table is explicitly required.
7. Backfill historical unlinked invoice and quotation rows in a separate reviewed migration or controlled job.
8. Update Cleanup Hub only after ingestion is corrected.
9. Fix autocomplete UI in a separate UI task.
10. Add tests for new-item creation, existing-item relink, tenant isolation, null-item backfill, and suggestion retrieval.

## Verification

- `git status` before work: dirty with pre-existing changes in unrelated files.
- `supabase/database-workflow.md`: read before DB inspection.
- `supabase db diff --linked`: attempted, blocked by Docker shadow database requirement.
- `supabase db query --linked`: passed for read-only evidence queries.
- `bun run audit:load`: skipped by user instruction for this audit-only task.
- `bun run typecheck`: skipped by user instruction for this audit-only task.
- `bun run lint`: skipped by user instruction for this audit-only task.
- `bun run build`: skipped by hard hardware policy and user instruction.
- `supabase db push`: not applicable. No SQL changed.

## Supabase push status

Not applicable. No migration or schema change was made.

## Risks or limitations

- The DB probe used `supabase db query --linked` because this CLI has no `db shell` command.
- `supabase db diff --linked` could not complete without Docker.
- The report did not mutate data, so it does not prove the repair path.
- Historical root-cause confidence is lower than active failure-boundary confidence.

## Deferred work

- Implement tenant-local item learning.
- Backfill unlinked historical line rows.
- Add ingestion tests and tenant isolation tests.
- Improve autocomplete accessibility and visual contrast.
- Split or simplify heavy cleanup files after the data path is fixed.
