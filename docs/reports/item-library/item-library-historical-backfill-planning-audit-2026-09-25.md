# Item Library Historical Backfill Planning Audit

This report was written by Codex on 2026-09-25 via Codex Desktop.

## Objective

Plan a safe historical Item Library backfill.

Do not execute the backfill.

Do not modify historical document rows.

## Scope

This audit inspected tenant `invoice_items`, `quotation_items`, `item_catalog`, and `item_aliases`.

The audit used the new forward-ingestion contract in `supabase/migrations/20260925093000_item_library_forward_ingestion.sql` as the baseline.

## Files changed

- `docs/reports/item-library/item-library-historical-backfill-planning-audit-2026-09-25.md`

## Skills used

Skills used: superpowers:using-superpowers, supabase, supabase-postgres-best-practices

Documentation standard: ASD-STE100 Simplified Technical English

## Read-only evidence

Mandatory files read:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `supabase/database-workflow.md`
- `docs/reports/item-library-ingestion-cleanup-autocomplete-audit-2026-09-25.md`
- `docs/reports/item-library/item-library-forward-ingestion-repair-2026-09-25.md`
- `supabase/migrations/20260925093000_item_library_forward_ingestion.sql`
- Item Library schema, duplicate detection, merge, row type, and item field policy files

Database access was read-only.

No migration was created.

No backfill was executed.

## Forward-Ingestion Contract

The current learning trigger is `public.learn_item_catalog_for_line_item()`.

It runs before insert on tenant `invoice_items` and tenant `quotation_items`.

It routes by `TG_TABLE_SCHEMA`. It does not combine tenants.

It exits without change when:

- `NEW.item_id` is already present.
- `coalesce(NEW.row_type, 'standard') <> 'standard'`.
- Normalized description is empty.

Normalization lowercases text, trims repeated spaces, changes `mm²` and `mm2` to `sqmm`, and changes `&` to `and`.

The identity order is:

1. Exact active `item_catalog.normalized_name`.
2. Exact active, non-retired `item_aliases.normalized_alias_text` whose target catalog item is active.
3. Insert one new `item_catalog` row with `ON CONFLICT (normalized_name) DO NOTHING`.
4. Re-read the active catalog row after conflict.

Failures raise a warning and return the document row unchanged.

The trigger is concurrency-safe through the unique `normalized_name` index and `ON CONFLICT`.

Historical recovery must use this same identity order.

## Tenant Discovery

Fourteen tenant schemas were found.

Eleven schemas have all required objects:

- `entity_bigdrops-main_adel`
- `entity_bigdrops-main_agbado`
- `entity_bigdrops-main_alarm`
- `entity_bigdrops-main_allan`
- `entity_bigdrops-main_anthropology`
- `entity_bigdrops-main_azerbaijan`
- `entity_bigdrops-main_jig`
- `entity_bigdrops-main_lomo`
- `entity_bigdrops-main_main`
- `entity_bigdrops-main_ogombo`
- `entity_bigdrops-main_opaque`

Three schemas do not have the required document and Item Library objects:

- `entity_bigdrops-main_agam`
- `entity_bigdrops-main_issa-certified`
- `entity_bigdrops-main_ororo`

Those three schemas are not backfill candidates until their schema state is resolved.

## Current Historical Counts

Only three inspected schemas have null-linked document rows.

| Tenant schema | Invoice rows | Quotation rows | Linked invoice rows | Linked quotation rows | Null invoice rows | Null quotation rows | Eligible standard null rows | Non-standard null rows | Empty-description null rows | Null row date range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `entity_bigdrops-main_anthropology` | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 2026-09-05 to 2026-09-05 |
| `entity_bigdrops-main_azerbaijan` | 0 | 13 | 0 | 0 | 0 | 13 | 13 | 0 | 0 | 2026-09-22 to 2026-09-22 |
| `entity_bigdrops-main_main` | 2,110 | 3,111 | 1,803 | 2,225 | 307 | 886 | 1,153 | 40 | 0 | 2026-04-25 to 2026-09-25 |

The earlier audit reported 902 null quotation rows in `entity_bigdrops-main_main`.

The current read-only count is 886.

## Exact Match Classification

The table below uses the repaired trigger semantics.

| Tenant schema | Category | Occurrences | Distinct normalized descriptions | Invoice occurrences | Quotation occurrences | Future action | Automatic safety |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `entity_bigdrops-main_anthropology` | Exact existing catalog match | 0 | 0 | 0 | 0 | None | Not applicable |
| `entity_bigdrops-main_anthropology` | Exact alias-only match | 0 | 0 | 0 | 0 | None | Not applicable |
| `entity_bigdrops-main_anthropology` | Unique new candidate | 1 | 1 | 0 | 1 | Create one tenant-local canonical item | Safe after approval |
| `entity_bigdrops-main_azerbaijan` | Exact existing catalog match | 0 | 0 | 0 | 0 | None | Not applicable |
| `entity_bigdrops-main_azerbaijan` | Exact alias-only match | 0 | 0 | 0 | 0 | None | Not applicable |
| `entity_bigdrops-main_azerbaijan` | Unique new candidate | 13 | 13 | 0 | 13 | Create one tenant-local canonical item per normalized text | Safe after approval |
| `entity_bigdrops-main_main` | Exact existing catalog match | 109 | 43 | 36 | 73 | Relink to existing active catalog item | Safe |
| `entity_bigdrops-main_main` | Exact alias-only match | 0 | 0 | 0 | 0 | None | Not applicable |
| `entity_bigdrops-main_main` | Repeated unmatched candidate before ambiguity review | 465 | 208 | 156 | 309 | Split by diagnostic result | Conditional |
| `entity_bigdrops-main_main` | Unique unmatched candidate before ambiguity review | 579 | 579 | 101 | 478 | Split by diagnostic result | Conditional |
| `entity_bigdrops-main_main` | Non-standard row | 40 | 28 | 14 | 26 | Exclude | Not eligible |

Alias diagnostics found 93 occurrences that match active aliases in `entity_bigdrops-main_main`.

All 93 also match an active catalog name directly.

They are not counted as alias-only safe relinks.

## Mutually Exclusive Execution Tiers

This table is the proposed processing boundary for a later mutation task.

| Tenant schema | Tier | Occurrences | Distinct normalized descriptions | Proposed future action | Automatic safety level |
| --- | --- | ---: | ---: | --- | --- |
| `entity_bigdrops-main_anthropology` | Tier B: Safe new canonical candidate | 1 | 1 | Create one tenant-local catalog row and link the row | Safe after approval |
| `entity_bigdrops-main_azerbaijan` | Tier B: Safe new canonical candidate | 13 | 13 | Create tenant-local catalog rows and link rows | Safe after approval |
| `entity_bigdrops-main_main` | Tier A: Safe existing relink | 109 | 43 | Set `item_id` to the one exact active catalog target | Safe |
| `entity_bigdrops-main_main` | Tier B: Safe new canonical candidate, repeated | 237 | 114 | Create one canonical row per normalized text and link matching rows | Safe after approval |
| `entity_bigdrops-main_main` | Tier B: Safe new canonical candidate, unique | 342 | 342 | Create one canonical row per normalized text and link its row | Safe after approval |
| `entity_bigdrops-main_main` | Tier C: Human review | 465 | 331 | Leave untouched until reviewed | Not automatic |
| `entity_bigdrops-main_main` | Tier D: Excluded | 40 | 28 | Leave untouched | Not eligible |

Aggregate reconciliation:

| Measure | Count |
| --- | ---: |
| Total null-linked rows across inspected tenants | 1,207 |
| Tier A safe existing relink | 109 |
| Tier B safe new canonical candidates | 593 |
| Tier C human review | 465 |
| Tier D excluded | 40 |
| Reconciled total | 1,207 |

Safe automatic backfill population is 702 occurrences.

This includes Tier A and Tier B only.

## Repeated New Candidate Evidence

After ambiguity diagnostics, `entity_bigdrops-main_main` has 237 repeated safe-new occurrences across 114 normalized descriptions.

These are not exact catalog or alias matches.

They also did not trigger the diagnostic ambiguity checks.

Representative examples from the repeated pool include:

| Normalized description | Occurrences | Source mix | Rate range | Notes |
| --- | ---: | --- | --- | --- |
| `power supply v8(10amperes) 070436058 resemin` | 4 | invoice only | 635,680 to 635,680 | Stable exact identity string |
| `removal of burnt 30kva alternator and commissioning of another one` | 4 | invoice only | 120,000 to 120,000 | Service-like item; review policy can decide if services should enter catalog |

The future backfill must create one tenant-local canonical item per normalized description.

It must not create separate invoice and quotation catalog rows.

## Ambiguous and Near-Duplicate Population

Diagnostic fuzzy/token logic was used only to identify review candidates.

It was not used to classify a row as safe.

In `entity_bigdrops-main_main`, 465 unmatched occurrences across 331 normalized descriptions require human review.

Diagnostic reasons:

- 150 candidate descriptions were near an existing active catalog item.
- 127 candidate descriptions were near an existing active alias.
- 239 candidate descriptions were near another historical candidate.

These counts overlap.

Representative ambiguity examples:

| Normalized description | Occurrences | Diagnostic flags | Why automatic linking is dangerous |
| --- | ---: | --- | --- |
| `primary air filter` | 8 | Near catalog, near alias, near historical candidate | Filter type can be model-specific. Primary and secondary filters are separate identities. |
| `secondary air filter` | 8 | Near catalog, near alias, near historical candidate | Similar tokens do not prove the same part. |
| `12v 75ah battery` | 4 | Near catalog, near alias | Voltage and amp-hour rating are identity-significant. |
| `ecoplus fuel filter (long)` | 4 | Near catalog, near alias | Length can identify a different part. |
| `fuse,blade 10a pn:2527-1016 doosan excavator dx340` | 4 | Near historical candidate | Amp rating and part number are identity-significant. |
| `fuse,blade 15a pn:2527-1017 doosan excavator dx340` | 4 | Near historical candidate | Similar name with different rating and part number must not merge automatically. |
| `13a double socket` | 3 | Near catalog, near alias, near historical candidate | Rating and socket type are identity-significant. |

## Non-Item and Ineligible Rows

The current trigger excludes non-standard rows.

The current data has 40 excluded rows in `entity_bigdrops-main_main`.

| Row type | Invoice occurrences | Quotation occurrences | Reason |
| --- | ---: | ---: | --- |
| `group_header` | 14 | 26 | Group headers organize document sections. They are not item records. |

No empty-description null-linked rows were found in the inspected tenants.

## Invoice and Quotation Overlap

The overlap analysis used eligible standard null-linked rows.

| Tenant schema | Candidate descriptions in both invoice and quotation | Occurrences in both-source candidates | Invoice-only candidates | Invoice-only occurrences | Quotation-only candidates | Quotation-only occurrences | Candidate descriptions with raw variants |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `entity_bigdrops-main_anthropology` | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| `entity_bigdrops-main_azerbaijan` | 0 | 0 | 0 | 0 | 13 | 13 | 0 |
| `entity_bigdrops-main_main` | 113 | 301 | 128 | 157 | 589 | 695 | 7 |

A future backfill must create one tenant-local canonical row per safe normalized description.

It must then link all safe invoice and quotation occurrences to that same tenant-local item.

## Existing Catalog Quality

Catalog quality checks found:

| Check | Result |
| --- | --- |
| Duplicate exact normalized catalog names | 0 found |
| Multiple active catalog rows for the same normalized name | 0 found |
| Inactive rows shadowing active rows | 0 found |
| Active alias text resolving to multiple canonical targets | 0 found |
| Active aliases pointing to inactive or missing catalog rows | 0 found |
| Active alias text equal to active catalog normalized name | 997 normalized values in `entity_bigdrops-main_main` |

The catalog name uniqueness is sufficient for Tier A direct relinks.

The alias/catalog overlap means alias evidence is noisy.

Alias-only matches should remain a separate tier and should require a single active alias target with no direct catalog target.

Current alias-only safe relink count is zero.

## Future Backfill Algorithm

The later mutation task should use a tenant-local job or migration.

It must not run across tenants as a shared catalog.

Recommended architecture:

1. Build a tenant-local staging CTE or temporary table of historical candidate rows.
2. Include only rows where `item_id is null`.
3. Exclude rows where `coalesce(row_type, 'standard') <> 'standard'`.
4. Exclude rows where normalized description is empty.
5. Normalize with the same SQL expression as the active trigger.
6. Resolve exact active catalog targets.
7. Resolve exact active alias targets only when no exact catalog target exists.
8. Mark rows with more than one target as review-only.
9. Mark fuzzy or token-similar rows as review-only.
10. Insert Tier B catalog rows with `ON CONFLICT (normalized_name) DO NOTHING`.
11. Re-read the inserted or existing active catalog ID by normalized name.
12. Update only Tier A and approved Tier B historical rows.
13. Update only `item_id`.
14. Do not update descriptions, quantities, units, prices, taxes, totals, statuses, clients, or document IDs.
15. Write an audit row for each mutation batch.

Pseudocode:

```sql
begin;

-- Per tenant schema only.
with historical_rows as (
  select 'invoice' as source_type, id, description, row_type, item_id
  from tenant.invoice_items
  where item_id is null
  union all
  select 'quotation', id, description, row_type, item_id
  from tenant.quotation_items
  where item_id is null
),
eligible as (
  select *, tenant.normalize_item_text(description) as normalized_name
  from historical_rows
  where coalesce(row_type, 'standard') = 'standard'
),
classified as (
  -- Resolve Tier A, Tier B, Tier C, Tier D.
),
new_catalog as (
  insert into tenant.item_catalog (name, normalized_name, standard_price, metadata)
  select chosen_name, normalized_name, 0,
         jsonb_build_object('source', 'historical_backfill', 'batch_id', :batch_id)
  from classified
  where tier = 'B'
  on conflict (normalized_name) do nothing
  returning id, normalized_name
),
resolved_targets as (
  select normalized_name, id
  from tenant.item_catalog
  where normalized_name in (select normalized_name from classified where tier in ('A', 'B'))
    and is_active = true
)
update tenant.invoice_items ii
set item_id = rt.id
from classified c
join resolved_targets rt on rt.normalized_name = c.normalized_name
where c.source_type = 'invoice'
  and c.tier in ('A', 'B')
  and ii.id = c.id
  and ii.item_id is null;

-- Repeat for quotation_items.

commit;
```

The implementation must be idempotent.

It must use `ON CONFLICT`.

It must update rows with `item_id is null` only.

It must record batch counts before and after mutation.

It must leave Tier C and Tier D untouched.

It must run after the live trigger migration.

The trigger does not fight the backfill because it runs only on insert. Historical updates should only set `item_id`.

## Rollback and Recovery Design

A future mutation task should write a backfill audit table or structured batch report before commit.

Minimum audit fields:

- batch ID
- tenant schema
- source table
- source row ID
- previous `item_id`
- new `item_id`
- tier
- normalized description
- timestamp

Rollback can use this audit evidence to set `item_id` back to null for a batch.

New catalog rows created by the batch can be deactivated only if no non-backfill rows link to them.

Do not delete catalog rows.

## Before and After Verification Metrics

Before mutation, measure per tenant:

- active canonical catalog count
- historical eligible null-linked count
- exact existing catalog match count
- exact alias-only match count
- safe new repeated candidate count
- safe new unique candidate count
- human-review ambiguous count
- excluded count
- invoice-only, quotation-only, and both-source candidate counts
- document total checksum
- line monetary checksum

After mutation, measure per tenant:

- active canonical catalog count delta
- relinked historical occurrence count
- newly created canonical count
- remaining eligible null-linked count
- remaining ambiguous count
- excluded count unchanged
- no cross-tenant links
- no duplicate canonical creation
- document totals unchanged
- line descriptions unchanged
- line quantities unchanged
- line units unchanged
- line rates unchanged
- line taxes unchanged
- document status unchanged
- client relationships unchanged
- document identity unchanged

## Confirmed Facts

- The forward-ingestion repair is installed in the migration files.
- The forward path is tenant-local and insert-only.
- Current inspected null-linked total is 1,207 rows.
- Current `entity_bigdrops-main_main` null-linked count is 1,193 rows.
- Current `entity_bigdrops-main_main` quotation null count is 886, not the older 902.
- The current direct exact safe relink population is 109 rows.
- The current alias-only safe relink population is 0 rows.
- The current safe-new candidate population is 593 rows.
- The current human-review population is 465 rows.
- The current excluded population is 40 rows.
- No historical row was modified during this audit.
- No canonical item was created during this audit.
- No alias was created during this audit.

## Safe Automatic Backfill Population

Do not execute it in this task.

The safe automatic population is 702 occurrences:

- 109 Tier A existing catalog relinks.
- 593 Tier B new canonical candidate links.

Tier B must still be explicitly approved before mutation because it creates catalog records.

## Human-Review Population

The human-review population is 465 occurrences.

Main ambiguity classes:

- Near existing catalog names.
- Near existing aliases.
- Near other historical candidates.
- Specification-bearing differences such as rating, capacity, model, length, and part number.

Fuzzy logic must not relink these rows automatically.

## Excluded Population

The excluded population is 40 occurrences.

All excluded occurrences are `group_header` rows.

They are document section headers, not reusable item records.

## Unresolved Cases

- Whether services and labour-like rows should become canonical Item Library records.
- Whether the 14 small non-main tenant candidates should be reviewed by tenant owners before Tier B creation.
- Whether alias/catalog overlap in `entity_bigdrops-main_main` is expected alias design or cleanup debt.
- Whether a later job should store client/document diversity counts in an audit table without exposing business data.

## Proposed Backfill Execution Order

1. Freeze the forward-ingestion trigger contract.
2. Review and approve Tier B policy for service-like descriptions.
3. Run a dry-run classifier per tenant.
4. Export Tier C for human review.
5. Execute Tier A relinks.
6. Execute approved Tier B canonical creation.
7. Link all approved Tier B occurrences.
8. Verify before/after metrics.
9. Produce a mutation report.
10. Leave Tier C and Tier D untouched.

## Go/No-Go Conditions

Go only if:

- The classifier query reconciles all null-linked rows per tenant.
- Exact catalog targets are one-to-one.
- Alias-only targets are one-to-one and do not conflict with direct catalog names.
- Tier B policy is approved.
- Tier C rows are excluded from the mutation set.
- Tier D rows are excluded from the mutation set.
- A rollback audit trail exists before update.
- The migration runs per tenant.
- The mutation updates only `item_id`.
- Verification proves document totals and monetary values are unchanged.

No-go if:

- Any tenant has duplicate active normalized catalog names.
- Any candidate maps to more than one active target.
- Any mutation set contains group headers or empty descriptions.
- Any mutation query can cross tenant schemas.
- Any planned update changes financial or document identity fields.

## Verification Result

Verification:

- `git status` before work: dirty with pre-existing untracked file `docs/reports/boq/boq-form-prototype-v4-report-2026-09-25.md`.
- `supabase/database-workflow.md`: read before DB access.
- Read-only Supabase queries: passed.
- `bun run build`: skipped by hard hardware policy and user instruction.
- `bun run typecheck`: skipped by user instruction for audit-only task.
- `bun run lint`: skipped by user instruction for audit-only task.
- `supabase db push`: not applicable. No SQL changed.

## Supabase Push Status

Not applicable.

No migration was created.

No schema change was made.

## Risks or Limitations

- Ambiguity diagnostics are conservative.
- Diagnostic fuzzy/token matches are not identity proof.
- Client diversity was not exposed in the report to reduce business-data disclosure.
- The report does not authorize mutation.

## Deferred Work

- Create a reviewed dry-run classifier for a later mutation task.
- Export Tier C review data for human approval.
- Implement the idempotent backfill only after approval.
- Add a mutation audit trail for rollback.
