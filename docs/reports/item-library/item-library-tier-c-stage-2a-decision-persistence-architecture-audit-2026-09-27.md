# Item Library Tier C Stage 2A Decision Persistence Architecture Audit

This report was written by Codex on 2026-09-27 via Codex Desktop.

## Objective

Audit the current BIGDROPS Item Library, Cleanup Hub, and Historical Review architecture before Stage 2 implementation.

This report defines the recommended decision and persistence design for Tier C Historical Review Stage 2B.

## Scope

This was an audit-only task.

The investigation covered:

- Stage 1 Historical Review domain, repository, UI, types, tests, and report.
- Item Library catalog, alias, merge, normalization, and history architecture.
- Cleanup Hub duplicate detection, merge flow, export/import, snapshot validation, and Leave separate behavior.
- Historical source rows in `invoice_items` and `quotation_items`.
- Forward learning and historical backfill migrations.
- Tenant provisioning and tenant-local table patterns.
- Audit and provenance conventions.

No application code was changed.

## Files Changed

- `docs/reports/item-library/item-library-tier-c-stage-2a-decision-persistence-architecture-audit-2026-09-27.md`

## Skills Used

Skills used: supabase, supabase-postgres-best-practices, database-schema-designer, typescript-advanced-types, writing-clearly-and-concisely, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Created this architecture report.
- No source, test, migration, SQL, package, or configuration file was changed.
- No database mutation was performed.

## Evidence Inspected

Repository evidence:

- `src/modules/item-library/domain/historicalReview.ts`
- `src/modules/item-library/repositories/historicalReviewRepository.ts`
- `src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/modules/item-library/repositories/itemLibraryRepository.ts`
- `src/modules/item-library/domain/duplicateDetection.ts`
- `src/modules/item-library/domain/itemCleanupExchange.ts`
- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/lib/tenantClient.ts`
- `src/lib/audit.ts`
- `supabase/migrations/20260828000001_item_library_tenant_objects.sql`
- `supabase/migrations/20260915194332_tenant_template_seed.sql`
- `supabase/migrations/20260925093000_item_library_forward_ingestion.sql`
- `supabase/migrations/20260925110000_item_library_historical_backfill.sql`
- `docs/reports/item-library/item-library-tier-c-reconciliation-architecture-audit-2026-09-27.md`
- `docs/reports/item-library/item-library-tier-c-historical-review-stage-1-2026-09-27.md`
- Item Library cleanup and direct-entry reports under `docs/reports/item-library/`

The audit used repository and schema inspection only. It did not run write SQL.

## Pre-Existing Worktree State

The initial `git status --short` showed pre-existing changes outside this task:

- Added BOQ PRD diagnostic and HTML files under `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/`.
- Modified `docs/reports/item-library/item-library-tier-c-historical-review-stage-1-2026-09-27.md`.
- Modified `src/modules/item-library/domain/historicalReview.ts`.
- Modified `src/tests/item-library/historicalReview.test.js`.
- Untracked BOQ PRD verification scripts.

This task did not edit those files.

## 1. Current Mutation And Identity Architecture

### Canonical Item Identity

The tenant-local table `item_catalog` is the source of truth for reusable Item Library identities.

Relevant fields are:

- `id`
- `name`
- `normalized_name`
- `standard_price`
- `is_active`
- `metadata`
- `created_at`
- `updated_at`

The tenant template creates a unique index on `item_catalog(normalized_name)`.

`is_active = false` is the current retired state.

### Normalized Identity

The tenant-local SQL function `normalize_item_text(input text)` is the authoritative persistence normalizer.

It:

- Lowercases text.
- Normalizes `mm2` and `mm²` to `sqmm`.
- Converts `&` to `and`.
- Removes punctuation outside allowed item text characters.
- Collapses whitespace.

Stage 1 uses a compatible frontend normalizer for read-only grouping and display. Future writes must use the tenant SQL normalizer again inside the mutation RPC.

### Aliases

The tenant-local table `item_aliases` maps alternate normalized text to one catalog item.

Relevant fields are:

- `item_id`
- `alias_text`
- `normalized_alias_text`
- `is_active`
- `is_retired`
- `source`
- `metadata`

An alias is valid for deterministic recognition only when:

- It is active.
- It is not retired.
- Its target catalog item is active.
- The normalized alias maps to one active target.

### Historical Linkage

Historical document rows store identity through:

- `invoice_items.item_id`
- `quotation_items.item_id`

The historical commercial data remains in the document row:

- Description.
- Quantity.
- Unit.
- Make.
- Unit price.
- Tax.
- Discount.
- Totals.
- Source document metadata.

The historical backfill migration updated only `item_id` for approved A/B rows. It did not rewrite commercial history.

### Forward Learning

The function `public.learn_item_catalog_for_line_item()` runs before inserts on tenant `invoice_items` and `quotation_items`.

It:

- Skips rows that already have `item_id`.
- Skips non-standard rows.
- Normalizes the row description.
- Links to an exact active catalog item when one exists.
- Links to an exact valid alias when one exists.
- Creates a new catalog item only when no exact catalog or alias exists.

This trigger remains the safety net for future saves.

### Merge Semantics

The tenant-local RPC `merge_item_catalog_entries(p_winner_item_id, p_merged_item_ids)` is the current safe merge path.

It:

- Requires item edit permission through `public.has_entity_permission`.
- Validates the winner exists.
- Moves former item names and aliases to the winner.
- Updates `invoice_items.item_id` and `quotation_items.item_id` from merged items to the winner.
- Retires merged items.
- Writes `item_merge_log`.

This is a catalog merge operation. It is not the same as Tier C historical linking.

### Cleanup Hub Candidate Generation

Cleanup duplicate detection is advisory.

`duplicateDetection.ts` uses:

- Token similarity.
- Overlap thresholds.
- Prefix and contains evidence.
- Normalized phrase comparison.

It creates possible duplicate groups. It does not prove identity.

### Cleanup Hub Apply

Cleanup apply routes through `mergeItems()` in `itemLibraryRepository.ts`, which calls `merge_item_catalog_entries`.

Cleanup export/import now uses `snapshot_id` and full preflight validation in `itemCleanupExchange.ts`. Invalid structural payloads expose zero applyable merges.

### Current Leave Separate Behavior

Current Cleanup Hub Leave separate is not durable.

`ItemLibraryDuplicateMergeCard.tsx` clears selected merged IDs and local submission error state. It does not write to the database.

Cleanup import can also carry ignored groups in memory, but this is export/import/session state. It is not a durable negative identity decision.

### Audit And Provenance

Current tenant audit infrastructure includes:

- `audit_logs`
- `activity_events`
- `src/lib/audit.ts`
- `record_audit_log` RPC

The historical A/B backfill also created public audit tables:

- `item_library_backfill_batches`
- `item_library_backfill_audit`

Those tables prove the project accepts row-level Item Library provenance for historical repairs. They do not represent ongoing Tier C decisions.

## 2. Decision Semantics

### Link Existing

Meaning:

- A human confirms that one unresolved historical review case represents an existing active catalog item.

Records that should change:

- `invoice_items.item_id` for eligible invoice rows in the case.
- `quotation_items.item_id` for eligible quotation rows in the case.
- Stage 2 audit/provenance records.

Records that must never change:

- Description.
- Quantity.
- Unit.
- Make.
- Price.
- Tax.
- Discount.
- Totals.
- Source document metadata.
- Catalog names.
- Aliases, unless a later explicit alias decision exists.

Durability:

- Durable. The row `item_id` is the applied identity.

Reversibility:

- Reversal should be a separate audited unlink or correction operation.
- It must not be an untracked client-side edit.

Required provenance:

- Actor.
- Timestamp.
- Source workflow.
- Review case key.
- Source rows.
- Previous `item_id`.
- New `item_id`.
- Target item snapshot.
- Stale checks used.

Stale when:

- The row no longer exists.
- The row now has an `item_id`.
- The row is no longer standard.
- The normalized description changed.
- The review case membership changed.
- The target item is not active.
- A conflicting exact catalog or alias state appeared.
- A Keep Separate decision blocks the selected target.

### Create Separate Item

Meaning:

- A human confirms that the unresolved historical description is a legitimate reusable product or service, and no suitable active catalog item exists.

Records that should change:

- A new active `item_catalog` row is created.
- Eligible historical rows in the case receive the new `item_id`.
- Stage 2 audit/provenance records are written.

Records that must never change:

- Historical descriptions.
- Historical prices.
- Historical quantities.
- Historical units.
- Historical taxes.
- Historical totals.
- Existing unrelated catalog rows.
- Aliases, unless a separate explicit alias action exists.

Durability:

- Durable. The new catalog item and row links are persistent.

Reversibility:

- Requires a correction flow.
- Retiring the new catalog item alone is not enough if historical rows remain linked incorrectly.

Required provenance:

- Actor.
- Timestamp.
- Source workflow.
- Review case key.
- Canonical name used.
- Normalized name.
- Created item ID.
- Source rows linked.
- Previous and new row identity state.

Stale when:

- Another item with the same normalized name appears before apply.
- The review case membership changes.
- Any source row is no longer eligible.
- The selected canonical name normalizes to empty.
- A candidate exact alias/catalog state becomes deterministic.

### Keep Separate

Meaning:

- A human confirms that two identities or candidate relationships are not the same item.

Examples:

- Primary Air Filter is not Secondary Air Filter.
- 6 W light is not 18 W light.
- SWG 17 is not SWG 17.5.
- 12 V and 24 V variants are not the same when voltage is identity-significant.

Records that should change:

- A durable negative-identity record.
- Audit/provenance records.

Records that must never change:

- Catalog item names.
- Aliases.
- Historical `item_id`.
- Prices and commercial data.
- Cleanup merge history.

Durability:

- Durable until revoked, superseded, or made stale by a merge conflict.

Reversibility:

- Yes. Reversal must be explicit and audited.

Required provenance:

- Actor.
- Timestamp.
- Source workflow.
- Item IDs or review case key.
- Item/name snapshots.
- Reason or note when available.
- Related cleanup group or review case ID.

Stale when:

- An involved item is merged.
- An involved item is retired and no active resolution is available.
- A historical review case key changes because normalization or case membership changed.
- A later authoritative merge would contradict the decision.

### Leave Unresolved

Meaning:

- The user makes no identity decision.

Records that should change:

- None for Stage 2B identity semantics.

Records that must never change:

- `item_id`.
- Catalog records.
- Aliases.
- Negative-identity records.
- Commercial history.

Durability:

- Not durable as an identity decision.

Reversibility:

- Not applicable because no identity assertion is stored.

Required provenance:

- None for Stage 2B.
- Optional later workflow metrics may record that a case was viewed or deferred, but that is not identity evidence.

Stale when:

- Not applicable.

## 3. Durable Keep Separate Data Model

Existing schema cannot correctly represent durable negative identity.

Current aliases represent alternate names for the same item. They cannot represent "not the same item."

Current merge log records item consolidation. It cannot represent reviewed-separate pairs.

Current Cleanup ignored state is session-local. It cannot survive reloads, exports, imports, or new sessions.

### Recommended Persistence

Stage 2B should add two tenant-local negative-identity structures.

#### Table 1: `item_reviewed_separate_pairs`

Purpose:

- Durable canonical item to canonical item exclusion.
- Consumed by Cleanup Hub and future cleanup import/AI proposals.

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `item_a_id uuid not null references item_catalog(id)`
- `item_b_id uuid not null references item_catalog(id)`
- `status text not null default 'active'`
- `reason text null`
- `source_workflow text not null`
- `source_context jsonb not null default '{}'::jsonb`
- `item_a_snapshot jsonb not null default '{}'::jsonb`
- `item_b_snapshot jsonb not null default '{}'::jsonb`
- `created_by uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `revoked_by uuid null`
- `revoked_at timestamptz null`
- `revoked_reason text null`
- `superseded_by_merge_log_id uuid null references item_merge_log(id)`

Recommended constraints:

- `item_a_id <> item_b_id`
- `status in ('active', 'revoked', 'stale')`
- Canonical ordering rule: `item_a_id` must be lower than `item_b_id`.
- Unique active pair: `(item_a_id, item_b_id)` where `status = 'active'`.

#### Table 2: `historical_review_candidate_rejections`

Purpose:

- Durable reviewed-separate relationship between a historical normalized review case and an existing catalog candidate.
- Needed when the historical case does not yet have its own catalog item.

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `normalized_description text not null`
- `case_membership_hash text not null`
- `candidate_item_id uuid not null references item_catalog(id)`
- `status text not null default 'active'`
- `reason text null`
- `source_workflow text not null default 'historical_review'`
- `source_context jsonb not null default '{}'::jsonb`
- `case_snapshot jsonb not null default '{}'::jsonb`
- `candidate_snapshot jsonb not null default '{}'::jsonb`
- `created_by uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `revoked_by uuid null`
- `revoked_at timestamptz null`
- `revoked_reason text null`

Recommended constraints:

- `status in ('active', 'revoked', 'stale')`
- Unique active relation: `(normalized_description, candidate_item_id)` where `status = 'active'`.

### Relation Types

Stage 2B needs more than one relation type.

Required:

- Canonical item to canonical item, for Cleanup Hub suppression and merge blocking.
- Historical normalized case to canonical item, for Historical Review candidate suppression.

Not required in Stage 2B:

- Normalized case to normalized case.

Reason:

- A historical case without a catalog identity is not yet a durable item.
- Two unresolved normalized descriptions can remain advisory siblings.
- A durable case-to-case negative relation would add complexity before a mutation workflow needs it.

### Relationship To Aliases

Keep Separate must not create, retire, or move aliases.

If an alias later makes a rejected relationship deterministic, the apply RPC must fail closed and ask for review.

### Relationship To Historical Review Cases

Case-level rejections must include:

- `normalized_description`
- Membership hash.
- Occurrence count.
- Source row summary.

This lets the system detect that the reviewed case changed.

### Relationship To Cleanup Hub

Cleanup Hub should consume active canonical item pairs before it builds or applies merge proposals.

Case-to-candidate rejections should not directly suppress Cleanup Hub pairs until the historical case becomes a catalog item.

If Create Separate later creates a catalog item for the case, the RPC should offer to convert active case-to-candidate rejections into canonical item-to-item pairs. This conversion should be explicit inside the RPC and audited.

## 4. Unordered Pair Correctness

A Keep Separate decision for item A and item B must equal the same decision for item B and item A.

Recommended mechanism:

- Store ordered columns `item_a_id` and `item_b_id`.
- The mutation RPC orders IDs before insert.
- Add a database check that prevents equal IDs.
- Add a unique partial index on active ordered pairs.

Duplicate behavior:

- A duplicate active submission for the same ordered pair should return the existing active decision.
- A reversed active submission should also return the existing active decision.
- A revoked pair can be created again as a new active decision, with the old decision kept for audit.

This design makes pair identity deterministic and prevents duplicate negative relationships.

## 5. Merge Interaction

Keep Separate must interact with catalog merge before mutation occurs.

### Direct Conflict

If item A is marked Keep Separate from item B, a later merge of A into B, or B into A, conflicts with the human decision.

Recommended rule:

- Block the merge unless the user explicitly revokes the Keep Separate decision first.
- Do not silently override the human decision.

### Merge Into A Third Item

If item A is marked Keep Separate from item B, and A later merges into item C:

Recommended rule:

- The merge RPC must run in a transaction.
- It must remap the active Keep Separate relationship from A-B to C-B.
- If C-B already has an active Keep Separate decision, mark the old A-B decision as superseded.
- If C equals B after ancestry resolution, block the merge unless the Keep Separate decision is revoked.

### Retirement Without Merge

If item A or B is retired without merge:

- The decision remains in audit history.
- Cleanup candidate generation should ignore inactive catalog items.
- The active suppression effect becomes inactive because one side is no longer active.

### Rename

Renaming an item should not invalidate a canonical item-to-item Keep Separate decision.

Reason:

- The decision is item-ID based.
- Name snapshots exist for audit only.

### Alias Movement

Alias movement caused by merge must follow the same merge interaction rules.

Aliases must not silently bypass Keep Separate. If an alias points to a candidate that was rejected for a historical case, Link Existing must fail closed unless the user resolves the conflict.

### Normalization Change

A future normalization change can affect case-to-candidate rejections.

Recommended rule:

- Store a normalizer version or migration marker in the case snapshot.
- Mark affected case-to-candidate rejections stale when the normalized key changes.
- Do not use stale case-level exclusions as authoritative constraints until reviewed.

### Conflicting States

An authoritative merge after Keep Separate is a conflict.

Recommended integrity rule:

- Prevent the conflict by default.
- If a future admin override is introduced, it must revoke or supersede the Keep Separate decision in the same transaction.

## 6. Historical Link Existing

Future Link Existing should change only identity linkage.

Allowed data changes:

- `invoice_items.item_id`
- `quotation_items.item_id`
- Reconciliation provenance tables.
- Tenant audit/activity log.

Forbidden data changes:

- Description.
- Unit.
- Make.
- Quantity.
- Unit price.
- Tax.
- Discount.
- Totals.
- Document numbers.
- Document dates.
- Catalog names.
- Aliases.

### Required Stale Checks

The mutation must validate, inside a transaction:

- The tenant context is authorized.
- The actor has the required item permission.
- Each source row exists in the tenant schema.
- Each source row has `item_id is null`.
- Each source row is standard.
- Each source row has a non-empty normalized description.
- Each source row belongs to the reviewed normalized case.
- The current row set matches the submitted case membership hash.
- The target item exists in the same tenant schema.
- The target item is active.
- No exact active catalog or alias state now points to another item for the same normalized description.
- No active case-to-candidate rejection blocks this target.
- No active canonical Keep Separate relation blocks this target after ancestry resolution.
- No Tier D row is included.

### Atomicity

Link Existing should be case-atomic.

Recommended rule:

- Link all eligible rows in the review case, or link none.

Reason:

- Partial apply makes the review case difficult to reason about.
- Partial apply can hide stale rows and leave a mixed identity state.

If any row is stale, the RPC should fail closed and return a review-needed result.

## 7. Create Separate Item

Future Create Separate should run in one transaction.

Steps:

1. Validate tenant and actor permission.
2. Lock the current eligible row set for the review case.
3. Recompute normalization with `normalize_item_text`.
4. Validate that the reviewed case membership hash still matches.
5. Validate that no active item with the same normalized name exists.
6. Insert the new `item_catalog` row.
7. Link eligible historical rows to the new item.
8. Write reconciliation provenance.
9. Write audit/activity events.

### Canonical Name Source

The default canonical name should come from human-confirmed text.

Recommended default:

- The most frequent raw description variant in the case.

The UI should allow the user to adjust the canonical name before apply.

The RPC must normalize the final name and reject an empty normalized value.

### Standard Price

Do not infer standard price from historical prices by default.

Recommended rule:

- Default `standard_price` to `0`.
- Allow a separate explicit pricing action in a later workflow if needed.

### Race Handling

If another active item with the same normalized name appears between review and apply:

- Abort Create Separate.
- Return a conflict that tells the UI to refresh.
- Let the user choose Link Existing after refresh.

### Aliases

Do not create aliases automatically during Create Separate.

Reason:

- Raw variants may include meaningful specification differences.
- Alias creation is an identity assertion and needs its own explicit decision.

### Services And Workmanship

Services and workmanship can be legitimate Item Library identities.

The action must not assume the item is a physical product.

### Tier D Exclusion

The RPC must reject:

- Non-standard rows.
- Empty normalized descriptions.
- Structural/group rows.

## 8. Leave Unresolved

Recommended Stage 2B behavior:

- Do not persist Leave Unresolved as identity evidence.

Reason:

- Leave Unresolved means no identity decision.
- It must not suppress future candidates.
- It must not become a negative identity assertion.

UX effect:

- The case can remain in the queue.
- The UI can close the detail view.
- A future workflow may add "defer" or "review note" metadata, but this must be labelled as workflow state, not identity state.

If a future deferral feature is needed, it should use a separate workflow table. It must not share the Keep Separate table.

## 9. Cleanup Hub Integration

Durable Keep Separate should affect Cleanup Hub at candidate generation and apply time.

### Candidate Suppression

Recommended rule:

- Suppress known active reviewed-separate pairs before Cleanup cards are built.

If a group contains only reviewed-separate pairs:

- Do not show it as an active duplicate review item.

If a group contains mixed relationships:

- Keep the group visible.
- Mark reviewed-separate pairs clearly.
- Prevent those pairs from being selected for merge.

### Snapshot And Fingerprint

Cleanup export snapshot generation should account for active reviewed-separate suppression.

Recommended rule:

- The visible group set and active exclusion state must affect the snapshot.
- If a Keep Separate decision changes after export, old import results should fail snapshot validation before mutation.

### Current Leave Separate Evolution

Current Leave separate is local only.

Stage 2B should change it to:

- Ask for confirmation when persisting a durable Keep Separate relationship.
- Write active item-to-item exclusion through the safe RPC.
- Keep the existing non-destructive behavior for navigation and review state.

### Imported Cleanup Proposals

If an imported Cleanup result proposes a merge that violates active Keep Separate:

- Preflight must reject the payload before mutation.
- The error must use human language.
- Technical item IDs can appear only in secondary diagnostics.

Recommended user message:

- "This proposal includes items that were already reviewed and marked separate. Nothing was applied."

Future AI and imports must not silently override a human Keep Separate decision.

## 10. Future AI Compatibility

This report does not design AI infrastructure.

The required domain contract is:

- Active human Keep Separate decisions are authoritative constraints.
- AI may recommend review, but it cannot silently merge or override these decisions.
- AI should either receive active negative-identity evidence or operate on a pre-filtered candidate set.
- Revoked and stale decisions must be distinguishable from active decisions.
- AI uncertainty must remain reviewable by a human.

Future AI needs stable domain data:

- Active canonical item-to-item exclusions.
- Active historical case-to-candidate exclusions.
- Status: active, revoked, or stale.
- Source workflow.
- Human reason or note.
- Item snapshots.
- Case snapshots.
- Merge ancestry or resolved active item IDs.

## 11. Audit And Provenance

Existing audit infrastructure is useful but incomplete for Stage 2B.

Recommended approach:

- Use tenant `audit_logs` or `activity_events` for user-visible audit events.
- Add Item Library reconciliation-specific tables for row-level provenance.

### Recommended Tables

#### `item_historical_reconciliation_decisions`

Purpose:

- One decision header per Stage 2B apply action.

Recommended fields:

- `id`
- `decision_type`
- `normalized_description`
- `case_membership_hash`
- `target_item_id`
- `created_item_id`
- `status`
- `reason`
- `source_workflow`
- `source_context`
- `created_by`
- `created_at`

#### `item_historical_reconciliation_rows`

Purpose:

- One provenance row per historical source row affected.

Recommended fields:

- `decision_id`
- `source_table`
- `source_row_id`
- `previous_item_id`
- `new_item_id`
- `normalized_description`
- `row_snapshot`
- `created_at`

### Required Audit Events

Link Existing:

- Record target item, row count, row IDs, and previous/new `item_id`.

Create Separate Item:

- Record created catalog item, normalized name, linked rows, and source case.

Keep Separate:

- Record item pair or case-candidate relation, reason, workflow, and source context.

Keep Separate Revocation:

- Record the original decision, actor, reason, and timestamp.

Leave Unresolved:

- No identity audit event if no persistence occurs.
- Optional workflow deferral audit can be added later if product needs it.

## 12. Tenant Provisioning

If Stage 2B adds schema objects, implementation must update all tenant paths.

Required provisioning updates:

- Tenant migration for existing `entity_%` schemas.
- `tenant_master_template` table definitions.
- Tenant install/helper functions that provision Item Library objects.
- Indexes and constraints.
- RPC definitions if mutation RPCs are added.
- Grants and RLS policy conventions, if direct table access is allowed.
- Permission/resource mapping if a new reconciliation permission is introduced.

Recommended permissions:

- Reuse existing Item Library edit permission for mutation if product policy accepts it.
- Add a narrower reconciliation permission only if the existing model requires separation.

Required validation before production:

- Disposable tenant migration validation.
- Existing tenant schema install validation.
- Future tenant provisioning validation.
- `supabase db push` during the implementation task.

No migration was created in this audit.

## 13. Security And Authorization

Future mutations must not trust client-supplied tenant schema or IDs.

Recommended model:

- Use tenant-scoped RPCs for all Stage 2B write actions.
- Resolve authorization with the existing entity permission model.
- Validate `auth.uid()` server-side.
- Validate all item IDs and source row IDs inside the tenant schema.
- Reject cross-tenant IDs.
- Reject source rows that are not in the current tenant schema.

The client can submit:

- Review case key.
- Case membership hash.
- Source row IDs.
- Target item ID.
- Optional reason.

The server must verify all of it before mutation.

## 14. Transaction And Concurrency Model

Stage 2B writes require RPC transactions.

Client-side multi-write sequences are not safe enough.

### Link Existing

Transaction boundary:

- Lock source rows.
- Validate staleness.
- Validate target.
- Update row `item_id`.
- Write reconciliation provenance.
- Write audit event.

### Create Separate Item

Transaction boundary:

- Lock source rows.
- Validate case membership.
- Check normalized name uniqueness.
- Insert catalog item.
- Update row `item_id`.
- Write reconciliation provenance.
- Write audit event.

### Keep Separate

Transaction boundary:

- Lock involved catalog rows in deterministic order.
- Validate active item state.
- Canonicalize pair order.
- Insert or return existing active decision.
- Write audit event.

### Keep Separate Revocation

Transaction boundary:

- Lock decision row.
- Validate status is active.
- Set revoked status and reason.
- Write audit event.

### Merge With Keep Separate

Transaction boundary:

- Lock involved catalog rows in deterministic order.
- Validate no active Keep Separate conflict.
- Remap or supersede related Keep Separate pairs.
- Perform existing merge operations.
- Write merge log and audit events.

### Race Outcomes

Recommended fail-closed behavior:

- Stale review screen: reject and require refresh.
- Concurrent catalog creation: reject Create Separate and require refresh.
- Concurrent linking: reject case apply if membership changed.
- Simultaneous merge: reject or retry after refresh.
- Duplicate/reversed Keep Separate: return existing active decision.

## 15. Stage 2B Implementation Plan

### Phase 1: Schema And Domain Foundation

Likely files:

- New Supabase migration.
- Tenant template migration section.
- Tenant Item Library install/provisioning function.
- Item Library types.
- New domain helpers for case membership hash and pair ordering.

Tasks:

- Add reconciliation provenance tables.
- Add canonical item-to-item Keep Separate table.
- Add historical case-to-candidate rejection table.
- Add indexes and constraints.
- Add status semantics.
- Add pair-ordering helper.

### Phase 2: Repository And RPC Mutation Layer

Likely files:

- Tenant migration RPCs.
- Item Library repository.
- Item Library service.
- Type definitions.

Tasks:

- Add RPC for Link Existing.
- Add RPC for Create Separate.
- Add RPC for Keep Separate.
- Add RPC for Keep Separate revocation.
- Add server-side stale checks.
- Add audit/provenance writes.

### Phase 3: Historical Review Actions

Likely files:

- Historical Review panel.
- Historical Review hook/service.
- Candidate cards.
- Confirmation UI.

Tasks:

- Enable Link to existing.
- Enable Create separate item.
- Enable Keep separate on case candidates.
- Keep Leave unresolved non-mutating.
- Add clear confirmation text.
- Preserve read-only occurrence inspection.

### Phase 4: Cleanup Hub Integration

Likely files:

- Duplicate detection or cleanup candidate builder.
- Cleanup panel.
- Cleanup exchange validation.
- Merge apply path.
- Merge RPC.

Tasks:

- Suppress active reviewed-separate pairs.
- Include exclusion state in cleanup snapshot semantics.
- Reject imported merge proposals that violate Keep Separate.
- Convert current Leave separate into durable Keep Separate where appropriate.
- Prevent merge RPC from violating active Keep Separate.

### Phase 5: Tests And Runtime Validation

Tasks:

- Add database/RPC tests.
- Add repository tests.
- Add Historical Review action tests.
- Add Cleanup Hub regression tests.
- Run required project verification.
- Run Supabase migration workflow.

## 16. Acceptance Test Matrix

Minimum Stage 2B test matrix:

| Area | Test |
| --- | --- |
| Link Existing | Link one exact historical case to an active existing item. |
| Link Existing | Historical description remains unchanged. |
| Link Existing | Historical quantity, unit, price, tax, discount, and totals remain unchanged. |
| Link Existing | Already-linked row causes stale failure and zero case mutation. |
| Link Existing | Target retired before apply fails safely. |
| Link Existing | Non-standard row cannot be linked. |
| Link Existing | Tier D row cannot be linked. |
| Link Existing | Cross-tenant target item is rejected. |
| Link Existing | Active case-to-candidate Keep Separate blocks the link. |
| Create Separate | Create catalog item and link eligible rows atomically. |
| Create Separate | Service/workmanship description can become a catalog item. |
| Create Separate | Normalized-name race fails and requires refresh. |
| Create Separate | Existing exact item conflict prevents duplicate catalog creation. |
| Create Separate | No alias is created automatically. |
| Keep Separate | Primary Air Filter and Secondary Air Filter persist as reviewed separate. |
| Keep Separate | A-B and B-A cannot create duplicate active exclusions. |
| Keep Separate | Duplicate active submission returns existing decision. |
| Keep Separate | Revoked decision can be created again as a new active decision. |
| Keep Separate | Case-to-candidate rejection suppresses that candidate for the same case. |
| Cleanup Hub | Reviewed-separate pair is suppressed or clearly labelled according to the final UX rule. |
| Cleanup Hub | Import proposal that merges reviewed-separate pair is rejected in preflight. |
| Cleanup Hub | Cleanup snapshot changes when active reviewed-separate suppression changes visible groups. |
| Merge | Merge blocked when it contradicts active Keep Separate. |
| Merge | Merge into third item remaps or supersedes Keep Separate deterministically. |
| Merge | Conflicting remap becomes stale or blocked according to RPC rule. |
| Security | Client-supplied tenant schema cannot mutate another tenant. |
| Security | Unauthorized actor cannot apply decisions. |
| Concurrency | Concurrent link changes cause stale failure. |
| Concurrency | Simultaneous Keep Separate reversed submissions produce one active row. |
| Semantics | Advisory similarity never auto-links. |
| Semantics | Leave Unresolved creates no identity assertion. |
| Regression | Forward learning remains unchanged. |
| Regression | Cleanup snapshot/preflight remains intact. |
| Regression | Current catalog merge semantics remain intact except new Keep Separate guard. |

## 17. Final Recommendation

Implement Stage 2B with explicit tenant-local persistence and RPC-backed transactions.

### Exact Persistence Model

Add tenant-local:

- `item_reviewed_separate_pairs`
- `historical_review_candidate_rejections`
- `item_historical_reconciliation_decisions`
- `item_historical_reconciliation_rows`

Use `audit_logs` or `activity_events` for high-level audit events.

Use the reconciliation tables for row-level provenance.

### Decision Semantics

Use these rules:

- Link Existing updates only historical `item_id` fields and provenance.
- Create Separate creates one catalog item, links eligible historical rows, and writes provenance.
- Keep Separate creates durable negative identity evidence.
- Leave Unresolved performs no identity persistence.

### Transaction Strategy

Use tenant RPCs for all writes.

Each write action must validate stale state inside the transaction. Case-level historical actions must apply all rows or none.

### Cleanup Hub Integration Strategy

Cleanup Hub must consume active canonical item-to-item Keep Separate decisions before candidate display and before apply.

Imported cleanup proposals that violate Keep Separate must fail preflight with zero mutations.

Cleanup snapshots must account for active reviewed-separate suppression.

### Historical Review Stage 2B Strategy

Add enabled actions to the Stage 1 read-only surface only after the RPC and persistence layer exists.

Keep case grouping as:

- Tenant.
- Exact normalized description.
- Current eligible historical row set.

Do not add fuzzy auto-linking.

### Tenant And Provisioning Implications

Stage 2B requires schema work.

Implementation must update:

- Existing tenant schemas.
- `tenant_master_template`.
- Item Library tenant install/provisioning functions.
- Indexes, constraints, grants, and RPCs.
- Permission mapping if a new permission is selected.

### Main Risks

- Merge interaction can contradict active Keep Separate if the merge RPC is not updated.
- Case-to-candidate rejections can become stale after normalization changes.
- Partial historical linking can produce confusing review state.
- Aliases can create new deterministic evidence after a review screen loads.
- Future AI/import flows can suggest unsafe merges unless Keep Separate is part of preflight.

### Implementation Order

1. Add schema, constraints, and RPCs.
2. Add repository/service methods.
3. Add Historical Review actions.
4. Add Cleanup Hub suppression and preflight integration.
5. Add tests and runtime validation.

## Verification Result

Verification:

- `git status` before investigation: completed. Pre-existing unrelated changes were present and left untouched.
- `git diff --check -- docs/reports/item-library/item-library-tier-c-stage-2a-decision-persistence-architecture-audit-2026-09-27.md`: passed.
- `git status` after completion: completed. The only task-created file is this report. Pre-existing unrelated changes remain present.
- `bun run build`: skipped due to hardware policy.
- `bun run typecheck`: not run. This is an audit-only task.
- Test suites: not run. This is an audit-only task.
- `supabase db push`: not run. No schema change was made.

## Supabase Push Status

Supabase push status: not applicable.

No migration or schema change was created.

## Risks Or Limitations

- This report is based on repository and migration evidence. It did not run a live database query.
- Stage 2B will require schema and RPC work. That work must follow `supabase/database-workflow.md`.
- Current Cleanup Hub Leave separate remains non-durable until Stage 2B implements persistence.
- Existing merge RPC does not yet enforce durable Keep Separate because the persistence model does not exist.

## Deferred Work

- Implement Stage 2B schema and RPCs.
- Add tenant provisioning changes.
- Add Historical Review mutation UI.
- Add Cleanup Hub durable Keep Separate integration.
- Add migration and RPC tests.
- Add runtime validation on a disposable tenant before production rollout.

