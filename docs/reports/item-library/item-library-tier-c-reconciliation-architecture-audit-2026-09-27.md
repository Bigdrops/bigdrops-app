# Item Library Tier C Reconciliation Architecture Audit

This report was written by Codex on 2026-09-27 via Codex Desktop.

## Objective

Audit the current Item Library Tier C state and recommend a safe future human reconciliation architecture.

This audit is investigation only. It makes no application code change. It makes no database change. It does not mutate catalog, alias, invoice, quotation, or historical line-item data.

## Scope

Reviewed:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- historical Item Library planning and execution reports
- Cleanup snapshot and session reports
- direct-entry recognition report
- `supabase/migrations/20260925110000_item_library_historical_backfill.sql`
- `supabase/migrations/20260925093000_item_library_forward_ingestion.sql`
- Cleanup Hub components, exchange domain code, merge code, duplicate detection, repository code, and Item Library types
- current Supabase tenant data through read-only client selects

Not in scope:

- UI implementation
- migrations
- RPC changes
- test changes
- catalog merges
- alias creation
- historical row mutation
- Cleanup Hub behavior changes

## Files Changed

- `docs/reports/item-library/item-library-tier-c-reconciliation-architecture-audit-2026-09-27.md`

No application source file was changed.

## Skills Used

Skills used: supabase, react-dev, typescript-advanced-types, karpathy, database-schema-designer, supabase-postgres-best-practices, writing-clearly-and-concisely

Documentation standard: ASD-STE100 Simplified Technical English

## Audit Method

I inspected the historical backfill SQL and reports first.

I then inspected the current Cleanup Hub, duplicate detection, merge, export/import, direct-entry recognition, and Item Library repository code.

I ran read-only Supabase client selects with `@supabase/supabase-js`. The query script read:

- tenant `invoice_items`
- tenant `quotation_items`
- tenant `item_catalog`
- tenant `item_aliases`
- public backfill audit count

The script reproduced the historical classifier logic in memory:

- exact active catalog match
- exact active alias match to an active item
- Tier B if no near catalog, alias, or historical candidate evidence
- Tier C if ambiguous review evidence remains
- Tier D if row type is not standard or normalized description is empty

The script did not call the backfill mutation function. It did not call Cleanup apply. It did not write SQL.

## Quantitative Summary

| Metric | Value |
| --- | ---: |
| Historical Tier C occurrences at execution | 481 |
| Current unresolved Tier C occurrences | 481 |
| Historical Tier D occurrences at execution | 40 |
| Current Tier D-style excluded null rows | 41 |
| Current linked Tier C occurrences indicated by count delta | 0 |
| Current Tier C rows no longer qualifying by count delta | 0 |
| Current Tier C distinct raw descriptions | 342 |
| Current Tier C distinct normalized descriptions | 341 |
| Deterministic review-case count | 341 |
| Singleton review cases | 244 |
| Repeated review cases | 97 |
| Occurrences inside repeated cases | 237 |
| Safe workload reduction from exact normalized grouping | 29.1% |
| Current Tier C invoice occurrences | 132 |
| Current Tier C quotation occurrences | 349 |
| Current Tier D invoice rows | 14 |
| Current Tier D quotation rows | 27 |
| Public backfill audit rows | 686 |

Tenant distribution:

| Tenant schema | Current Tier C | Current Tier D | Status |
| --- | ---: | ---: | --- |
| `entity_bigdrops-main_main` | 481 | 41 | Classified |
| Ten other complete historical schemas | 0 | 0 | Classified |
| `entity_bigdrops-main_agam` | unavailable | unavailable | Historically incomplete |
| `entity_bigdrops-main_issa-certified` | unavailable | unavailable | Historically incomplete |
| `entity_bigdrops-main_ororo` | unavailable | unavailable | Historically incomplete |

Document-type distribution:

| Source document type | Tier C occurrences | Tier D rows |
| --- | ---: | ---: |
| Invoice | 132 | 14 |
| Quotation | 349 | 27 |

Frequency buckets for deterministic review cases:

| Occurrences per normalized description | Review cases |
| --- | ---: |
| 1 | 244 |
| 2 | 74 |
| 3-5 | 21 |
| 6-10 | 2 |

Largest exact normalized-description cases:

| Normalized description | Occurrences | Main evidence |
| --- | ---: | --- |
| `primary air filter` | 8 | Primary/secondary distinction |
| `secondary air filter` | 8 | Primary/secondary distinction |
| `manual changeover switch` | 5 | Near historical candidate |
| `12v 75ah battery` | 4 | Voltage and capacity |
| `ecoplus fuel filter (long)` | 4 | Long/short qualifier |
| `fuse,blade 10a pn:2527-1016 doosan excavator dx340` | 4 | Amperage, part number, equipment |
| `fuse,blade 15a pn:2527-1017 doosan excavator dx340` | 4 | Amperage, part number, equipment |
| `fuse,blade 20a pn:2527-1018 doosan excavator dx340` | 4 | Amperage, part number, equipment |
| `fuse,blade 30a pn:2527-1025 doosan excavator dx340` | 4 | Amperage, part number, equipment |

Identity-significant token counts by occurrence:

| Token type | Tier C occurrences |
| --- | ---: |
| Model or part number | 74 |
| Equipment or application | 71 |
| Dimensions | 66 |
| Amperage | 56 |
| Material | 49 |
| Capacity or rating | 47 |
| Primary or secondary | 18 |
| Voltage | 17 |
| Wattage | 14 |
| Rating or grade | 4 |
| SWG or gauge | 2 |
| Diameter | 2 |

## Audit Question 1: What Is Tier C Today?

Historical execution recorded 481 Tier C occurrences and 40 Tier D rows.

Current read-only reconstruction finds 481 Tier C occurrences. They are all in `entity_bigdrops-main_main`.

The current count matches the historical execution count. This indicates that zero Tier C occurrences were linked or reclassified by later work. Exact row-level proof is not available because the backfill audit table stores only rows that were linked by Tier A and Tier B mutation. It does not store every untouched Tier C row.

Current Tier D-style excluded null rows are 41, not 40. The extra row is a `group_header` quotation row, for example `Gear Oil Pump Options`, with an update timestamp after the historical execution window. This does not change Tier C.

## Audit Question 2: Occurrences vs Distinct Descriptions

The current unresolved Tier C population is 481 occurrences.

Those occurrences collapse to 341 tenant-scoped normalized descriptions.

This is the safe deterministic review workload. It uses exact normalized equality only. It does not use fuzzy similarity.

Reviewing by tenant plus normalized description reduces the workload from 481 occurrence reviews to 341 review cases. That is a safe 29.1% reduction.

Further reduction would require fuzzy inference. That must remain advisory only.

## Audit Question 3: Safe Review Case

The safest future review case is:

`tenant_schema + normalized_description + eligible historical row set`

This preserves tenant isolation and groups only exact normalized descriptions.

A review case should show:

- raw description variants
- source document type
- source document number, if available
- source date
- unit
- make or brand
- quantity
- historical unit price
- client context, when relevant
- occurrence count
- current candidate catalog items
- candidate aliases
- surrounding group or category context, when available

These fields are evidence. They are not identity proof.

## Audit Question 4: Current Tier C Shapes

Current Tier C shapes:

| Shape | Cases |
| --- | ---: |
| Possible existing canonical evidence | 169 |
| Possible alias evidence | 142 |
| Possible historical sibling evidence | 254 |
| Specification-sensitive cases | 206 |
| No detected specification token | 135 |
| Repeated exact normalized cases | 97 |
| Singleton cases | 244 |

Representative cases include:

- `primary air filter`
- `secondary air filter`
- `12v 75ah battery`
- `charging alternator (24v)`
- `copper rewinding wire swg 18`
- `relay, 24vdc, 6a, 5-pin`
- `100mm air filter rain cap`
- `air filter rain cap 110mm`
- `air filter rain cap 130mm plastic`

These are review candidates only.

## Audit Question 5: Identity-Significant Tokens

The current duplicate and backfill similarity logic can flag high-similarity rows that differ by identity-significant tokens.

The logic tokenizes descriptions and uses substring or token overlap. It does not contain a full semantic guard for:

- primary vs secondary
- voltage
- wattage
- amperage
- SWG or gauge
- dimensions
- diameter
- capacity
- model
- part number
- material
- rating
- equipment or application

This is acceptable for candidate discovery. It is not sufficient for automatic identity mutation.

Similarity must remain advisory.

## Audit Question 6: Current Leave Separate Behavior

Current status: PARTIALLY durable for user flow, not durable in data.

Manual duplicate review:

- `ItemLibraryDuplicateMergeCard` implements the visible `Leave separate` button.
- The button clears `selectedMergedIds`.
- It does not write to the database.
- It does not change catalog metadata.
- It does not change a durable duplicate-review record.
- The same pair can be suggested again after reload or a later duplicate scan.

AI cleanup import:

- `ignored_group_ids`, `ignored_item_ids`, and `review_required_item_ids` exist in the import contract.
- Validation maps them into preview state.
- The preview lives in component state.
- It is not stored as a durable reviewed-separate relationship.

Therefore, "Leave separate" does not currently survive as a durable Item Library fact.

## Audit Question 7: Durable Keep Separate

No existing durable mechanism is equivalent to:

"These two canonical identities were reviewed and are intentionally different."

The inspected schema has:

- `item_catalog`
- `item_aliases`
- `item_import_batches`
- `item_merge_log`
- `invoice_items.item_id`
- `quotation_items.item_id`

These objects can store positive identity, aliases, imports, and merge audit. They do not store negative identity relationships.

Minimum future capability:

- tenant-scoped reviewed-separate relationship
- unordered pair semantics for canonical item A and canonical item B
- optional reviewed candidate rejection between a historical review case and a catalog item
- reviewer and timestamp provenance
- optional reason
- reversible status
- stale handling if either item is merged, retired, or materially renamed

If one item is later merged, the decision must either follow the surviving item or become stale. If one item is retired, candidate generation should not use it unless the UI explicitly includes inactive items.

## Audit Question 8: Keep Separate vs Leave Unresolved

The current system cannot durably distinguish:

- "I reviewed these. They are different."
- "I cannot decide yet."

Current ignored/review-required arrays only affect an imported cleanup preview. Manual Leave separate only changes local card selection.

Future UX must separate these actions:

- Keep separate: positive human decision that specific candidate identities must remain distinct.
- Leave unresolved: no identity decision.

Silence, dismissal, or skipped review must not become a durable negative identity assertion.

## Audit Question 9: Link To Existing

Future `Link to existing` should update identity linkage only.

Eligible rows:

- tenant-local `invoice_items` and `quotation_items`
- `item_id is null`
- row type is standard
- normalized description still matches the review case
- row still belongs to the review case

The mutation should:

- set `item_id` to the selected active catalog item
- preserve description
- preserve price
- preserve unit
- preserve make
- preserve quantity
- preserve tax and totals
- preserve source document data

It should not create an alias automatically. Alias creation should be a separate explicit decision.

Catalog usage and history should update through existing `item_id` links and summary views.

## Audit Question 10: Create Separate Item

Future `Create separate item` should create one tenant-local canonical item for the approved normalized description and then link approved historical rows.

Required canonical fields:

- `name`
- `normalized_name`
- `is_active`
- optional standard price only if the product policy permits it
- metadata/provenance if the future design requires audit context

The mutation must handle races:

- If the item was created after review load, re-check normalized uniqueness.
- If a matching active catalog item now exists, stop and ask the user to link or review.
- If the approved rows changed, fail stale.

Services and workmanship are valid Item Library identities when reusable. The workflow must not assume product-only semantics.

Tier D structural rows must stay excluded.

## Audit Question 11: Staleness and Concurrency

Future apply must revalidate:

- tenant schema
- source row exists
- source row still has `item_id is null`
- source row is still standard
- normalized description still equals the review case key
- target catalog item exists
- target catalog item is active
- alias state still supports any alias-based evidence
- review case membership has not changed
- no required durable keep-separate rule blocks the target

Fail-safe behavior:

STALE REVIEW => DO NOT OVERWRITE NEWER STATE.

## Audit Question 12: Tier D Boundary

Tier D is excluded by:

`coalesce(row_type, 'standard') <> 'standard' OR normalized_description = ''`

Current Tier D-style rows are `group_header` rows. They include section labels and option headings.

Examples:

- `Phase I: Primary Hardware`
- `Mechanical Works`
- `Gear Oil Pump Options`
- `TP-Link 300Mbps Wireless Adaptor Options`
- empty group headers

Future Tier C grouping must always apply the same standard-row gate before review-case creation.

## Audit Question 13: Candidate Generation

Reusable candidate mechanisms:

| Mechanism | Use |
| --- | --- |
| Exact active catalog normalized match | Deterministic evidence |
| Exact active non-retired alias with one active target | Deterministic evidence |
| Current suggestion engine | Candidate discovery only |
| Duplicate detection groups | Candidate discovery only |
| Token overlap and substring evidence | Display-only advisory evidence |
| Historical sibling similarity | Display-only advisory evidence |

Candidate discovery can say "these may be related."

Only a human decision can say "link this historical row set to that identity" for Tier C.

## Audit Question 14: Review Workload Reduction

Safe deterministic workload reduction:

- Start: 481 current Tier C occurrences.
- Exact tenant-normalized grouping: 341 review cases.
- Reduction: 140 fewer review units.
- Percentage reduction: 29.1%.

Further consolidation must be shown separately as advisory. It must not reduce the required human decision count automatically.

## Audit Question 15: Proposed Future Review UX

A future review card or sheet should show:

- normalized review-case description
- raw variants
- occurrence count
- invoice vs quotation count
- last used date
- source documents
- unit, make, quantity, and price range
- candidate existing items
- why each candidate was shown
- identity-significant differences
- current decision state

Actions:

- Link to existing
- Create separate item
- Keep separate
- Leave unresolved
- Split case, only if exact-normalized rows contain materially different raw/context evidence

The UI must not use "Merge" for historical linking. Catalog merge and historical link reconciliation are different operations.

## Audit Question 16: Relationship To Cleanup Hub

Recommendation: create a distinct Historical Review workflow inside Item Library.

Reason:

- Cleanup Hub currently handles catalog identity cleanup and catalog merges.
- Tier C reconciliation links historical document rows.
- Catalog merge retires catalog items and moves aliases/history.
- Historical link reconciliation should set `item_id` on selected historical rows only.
- Mixing these flows risks user confusion.

The future workflow can reuse Cleanup infrastructure concepts:

- snapshot identity
- export/import contract
- validation before mutation
- stale rejection
- batch review

It should not reuse the merge UI as-is.

## Audit Question 17: Data and Schema Requirements

Required for a complete durable workflow:

- repository/RPC support for tenant-scoped historical review cases
- apply path for link-to-existing
- apply path for create-separate-item plus historical linkage
- stale checks before mutation
- audit provenance for who decided and when

Required if Keep separate must be durable:

- a tenant-scoped durable negative relationship or reviewed-separate concept
- reversible status
- candidate-generation exclusion or warning support
- handling for item merge, retirement, and material rename

Optional:

- export/import support for external review
- saved review sessions
- batch snapshots
- review notes
- confidence labels for candidate generation

No schema change is needed for this audit report. A future implementation likely needs schema or RPC work if durable Keep separate and audit provenance are required.

## Audit Question 18: Current Cleanup Safety Interaction

Reusable concepts:

- `snapshot_id`
- validation before apply
- stale payload rejection
- duplicate proposal rejection
- zero applyable merges when structural validation fails
- session lifecycle tests

Keep separate from Tier C:

- catalog merge execution
- duplicate-group `group_id` semantics
- catalog cleanup AI result schema
- merge confirmation wording

Tier C review needs a different action vocabulary because it links historical rows. It does not merge catalog identities.

## Audit Question 19: Direct-Entry Recognition

Direct-entry recognition now attaches known identity only when:

- normalized typed text exactly matches one active canonical item
- or normalized typed text exactly matches an active non-retired alias with one active active-catalog target

It does not auto-link fuzzy candidates.

This reduces the future growth rate of deterministic misses in live forms. It does not resolve existing Tier C rows. It also does not remove the need for Tier C human review because Tier C contains ambiguous historical rows by design.

## Audit Question 20: Final Architecture Recommendation

PROVEN CURRENT BEHAVIOR:

1. One current Tier C occurrence is one null-linked standard invoice or quotation row that the historical classifier cannot safely link automatically.
2. Current Tier C has 481 occurrences and 341 tenant-normalized descriptions.
3. Current Cleanup Hub Leave separate is not durable.
4. No durable Keep separate mechanism exists.
5. Cleanup Hub catalog merge and historical linking are different operations.
6. Tier D rows are excluded by row type or empty normalized description.

PROPOSED FUTURE BEHAVIOR:

1. One Tier C review case is `tenant_schema + normalized_description + eligible source row set`.
2. Display raw variants, occurrence count, source documents, dates, unit, make, quantity, price range, surrounding context, and candidate catalog evidence.
3. Generate candidates from exact catalog, exact alias, suggestion, duplicate, and similarity evidence. Mark fuzzy evidence as advisory.
4. Link to existing sets `item_id` on approved null-linked historical rows only.
5. Create separate item creates one tenant-local canonical identity, then links approved rows.
6. Keep separate records a positive human decision that candidate identities are different.
7. Keep separate needs a durable tenant-scoped reviewed-separate capability if the decision must suppress repeat suggestions.
8. Leave unresolved records no identity decision.
9. Stale cases fail closed.
10. Repeated exact normalized occurrences apply as one deterministic review case unless context proves they must split.
11. Tenant isolation is preserved by schema-local review and schema-local mutation.
12. Tier D remains excluded by the standard-row gate.
13. The workflow should live as a distinct Historical Review mode inside Item Library.
14. Durable Keep separate and audit provenance likely require future schema/RPC work.
15. Implementation sequence:
    - add read-only review-case query
    - add review UI without mutation
    - add link-to-existing with stale checks
    - add create-separate-item with stale checks
    - add durable Keep separate if product requires it
    - add export/import only after in-app semantics are stable

## Risks and Limitations

The current audit reconstructs Tier C from current database state and migration logic. It cannot prove original Tier C row IDs because the historical audit table stores linked A/B rows only.

The current Tier D count is 41. This is one more than the historical 40. The extra row is a current `group_header` row and remains outside Tier C.

The current duplicate and similarity logic can surface risky candidates. That is acceptable only when the UI labels it as evidence, not proof.

## Deferred Work

- Implement a read-only Tier C review-case query.
- Decide whether durable Keep separate is required for launch.
- Design the tenant-scoped reviewed-separate data model if required.
- Define apply RPCs for link-to-existing and create-separate-item.
- Add stale-review tests before any mutation feature ships.

## Verification

- `git status` before investigation: captured. Pre-existing source, test, PRD, BOQ report, and direct-entry recognition report changes were present.
- Previous Git index anomaly: not present. No tracked deletion plus matching untracked source-file anomaly was seen.
- Read-only Supabase inspection: completed with Supabase client selects only.
- Tenant/catalog/historical mutation: not performed.
- Cleanup apply operation: not performed.
- Application source changes: none.
- Test changes: none.
- Migration changes: none.
- `bun run build`: skipped by explicit instruction.
- `bun run typecheck`: skipped by explicit instruction for this audit-only task.
- lint: skipped by explicit instruction for this audit-only task.
- broad tests: skipped by explicit instruction for this audit-only task.
- `supabase db push`: not applicable.

