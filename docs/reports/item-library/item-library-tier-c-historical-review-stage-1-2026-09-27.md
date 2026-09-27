# Item Library Tier C Historical Review Stage 1 Report

This report was written by Muse Spark on 2026-09-27 via OpenCode.

## Objective

Complete the interrupted Stage 1 implementation. Stage 1 builds a read-only Historical Review workflow inside Item Library. It groups unresolved Tier C historical rows into deterministic review cases. It shows evidence. It changes no data.

NO HISTORICAL IDENTITY MUTATIONS ARE AVAILABLE IN STAGE 1.

## Scope

In scope:

- Audit of the interrupted working tree.
- Completion and verification of the read-only review workflow.
- Focused tests for grouping, evidence, specification visibility, and UI states.
- This report.

Out of scope:

- Link-to-existing mutation.
- Create-separate-item mutation.
- Alias creation.
- Catalog creation.
- Catalog merge.
- Durable Keep Separate.
- Durable Leave Unresolved.
- Cleanup apply.
- AI cleanup import/export.
- Historical commercial-data modification.
- Direct-entry recognition changes.
- Cleanup Hub changes.
- BOQ changes.

## Files Changed

Inherited from the interrupted agent. This session kept each file as found:

- `src/modules/item-library/domain/historicalReview.ts`
- `src/modules/item-library/repositories/historicalReviewRepository.ts`
- `src/modules/item-library/hooks/useHistoricalReviewCases.ts`
- `src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/modules/item-library/repositories/index.ts`
- `src/modules/item-library/hooks/index.ts`
- `src/modules/item-library/services/itemLibraryService.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/tests/item-library/historicalReview.test.js`

Changed by this continuation session:

- `src/modules/item-library/domain/historicalReview.ts`
- `src/tests/item-library/historicalReview.test.js`
- `docs/reports/item-library/item-library-tier-c-historical-review-stage-1-2026-09-27.md`

Untouched pre-existing work from other agents:

- Direct-entry recognition files.
- Mobile item card files.
- BOQ design files and reports.

## Skills Used

Skills used: karpathy, react-dev, typescript-advanced-types, supabase, webapp-testing, systematic-debugging, capacitor-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Handoff Audit Result

The interrupted tree held two independent work streams. This session separated them.

Stream 1 is Stage 1 Historical Review. It is the task of this report.

Stream 2 is direct-entry recognition with mobile price actions. It owns a separate report. This session did not modify it.

The audit found no TODO markers in Stage 1 files. It found no placeholder UI. It found no fake data. It found no hard-coded audit counts. Audit numbers (481, 341) appear in no runtime path. All counts derive from live tenant queries.

The audit found no enabled mutation controls. The four future actions render as disabled buttons with explicit Stage 2 labels.

## Changes Made

### Inherited architecture

One review case equals tenant plus exact normalized description plus eligible historical rows.

The domain layer (`historicalReview.ts`) is a pure function. It performs:

- Tenant-scoped exact normalized grouping.
- Exclusion of linked rows (`item_id` present).
- Exclusion of non-standard rows (Tier D).
- Exclusion of empty normalized descriptions (Tier D).
- Exclusion of exact canonical matches (resolved Tier A).
- Exclusion of exact single-target alias matches (resolved Tier A).
- Exclusion of Tier B rows with no near catalog, alias, or sibling evidence.
- Candidate evidence with deterministic or advisory strength.
- Specification token extraction for review aid.

The repository (`historicalReviewRepository.ts`) is read-only. It issues five parallel bounded selects. It performs no insert, update, delete, or RPC write. Pagination caps each source at 5000 rows and sets a truncation flag.

The panel (`ItemLibraryHistoricalReviewPanel.tsx`) provides:

- Review queue with search and filters.
- Case detail with occurrence history.
- Source-document evidence.
- Candidate list with evidence labels.
- Specification chips and difference warnings.
- Disabled future-action buttons.
- Loading, empty, and error states with retry.

The page (`ItemLibraryPage.tsx`) adds a distinct Historical Review mode. It does not alter Library or Cleanup Hub behavior.

### Continuation additions

This continuation added two tests:

- Identity-sensitive separation test. It proves Primary vs Secondary and 12V vs 24V rows form separate cases. It proves specification tokens stay visible. It proves all fuzzy candidates carry advisory strength only. It proves occurrences carry no `item_id` field.
- Loading, empty, and error state test. It proves the panel wires all three states plus retry and filter-empty copy.

The runtime fix session changed one production domain file. It corrected only the read-only specification evidence label for square-millimetre conductor area.

The runtime fix session added two more Historical Review tests:

- Square-millimetre cable sizes classify as cross-section evidence, not diameter.
- Plain linear millimetre values still classify as diameter evidence.

## Runtime Fix

### Observed Runtime Symptom

Android opened Item Library and the Historical Review tab. The page shell rendered. The page then showed the error state:

- `Historical Review could not load`
- `Failed to load Historical Review cases.`

Real review cases did not render.

### Exact Root Cause

The failed runtime path used a PostgREST embedded select from source rows to parent documents. The source row query tried to read parent document data with a relation such as:

- `invoice_items` with `invoices(...)`
- `quotation_items` with `quotations(...)`

The tenant schema does not declare the required foreign key relationship for that embed. PostgREST rejected the read before the domain builder could create review cases.

The sanitized live error was:

```text
PGRST200: Could not find a relationship between 'invoice_items' and 'invoices' in the schema cache.
```

### Live Evidence

Read-only inspection used the same tenant-scoped `TenantClient` schema path as the application repository. The old embedded source-row read failed with `PGRST200`.

The fixed flat source-row read succeeded. A read-only tenant query returned:

| Metric | Current result |
| --- | ---: |
| Review cases | 341 |
| Unresolved occurrences | 481 |
| Invoice occurrences | 132 |
| Quotation occurrences | 349 |
| Tier D excluded rows | 41 |
| Truncated | false |

The first returned case was `Primary Air Filter`. It had 8 occurrences, 1 possible existing item, and visible `Role: PRIMARY` evidence.

Anonymous unauthenticated reads returned zero rows. That is not the Android logged-in application path. Service-role read-only inspection was used only to prove current tenant data and query shape without mutation.

### Fix

The repository keeps source-row reads flat. It loads parent invoice and quotation records in batched follow-up reads. This avoids PostgREST embed resolution and keeps document evidence available.

The source-row regression test now verifies that `invoice_items` and `quotation_items` selects do not use embedded relation syntax. Parent document reads remain flat and separate.

### Why Tests Missed It

Earlier automated coverage used stubs and domain fixtures. The stubs did not model PostgREST relationship validation. They allowed embedded relation syntax to appear correct even though the tenant schema could not execute it.

The new regression checks the repository query contract. It prevents source-row embeds from returning.

### Square-Millimetre Correction

The specification extractor previously matched the `6 mm` part of `6 mm²` before it could classify conductor area. The UI therefore labelled cable cross-sectional area as `Diameter`.

The extractor now classifies:

- `6 mm²` as `Cross-section 6 MM²`
- `16 mm2` as `Cross-section 16 MM2`

Plain linear values such as `20 mm` remain `Diameter`.

This evidence stays advisory. It does not establish identity. It does not link historical rows.

### Read-Only Confirmation

Stage 1 still has no historical identity mutation capability. The runtime fix adds no link action, catalog creation, alias creation, merge path, Keep Separate persistence, Leave Unresolved persistence, or AI workflow.

## Verification Result

Verification:

- Live read probe: old embedded source-row query failed with `PGRST200`; fixed tenant-routed repository read returned 341 cases and 481 occurrences.
- Focused Historical Review tests: 11 passed, 0 failed.
- Relevant Item Library regression tests: 33 passed, 0 failed.
- Direct-entry recognition regression tests: 5 passed, 0 failed.
- Cleanup snapshot and hook-order regression tests: 17 passed, 0 failed.
- `bun run audit:load`: completed with exit code 0. It reported pre-existing load-risk warnings outside this task.
- `bun run typecheck`: passed.
- `git diff --check` on task files: passed.
- `git status`: final status is recorded in the task response. No pre-existing file was reverted.
- `supabase db push`: not applicable (no migration).
- `bun run build`: skipped due to hardware policy.

The full `bun run test` wrapper was not used as a completion gate. An exploratory run still loaded unrelated critical tests and failed on pre-existing browser-environment and cleanup-export assertions outside this task scope. The task-scoped Bun test command passed.

## Supabase Push Status

Not applicable. Stage 1 adds no migration and no RPC.

## Candidate Evidence Semantics

Deterministic evidence means exact text equality:

- Exact catalog name.
- Existing alias with one active target.

Advisory evidence means similarity only:

- Similar catalog item.
- Similar alias wording.

The UI labels each candidate with its strength. Advisory candidates never establish identity. No code path writes `item_id` from a candidate.

## Specification Highlighting

The extractor detects role, voltage, wattage, amperage, gauge, diameter, capacity, dimension, part number, model, rating, and material tokens.

The UI shows case specifications as chips. It shows candidate specifications beside them. It renders an explicit warning when a candidate differs on a shared specification kind.

This is a visual aid. It is not an identity engine.

## Navigation Placement

Item Library header holds three modes: Library, Cleanup Hub, Historical Review.

Historical Review renders full-width. It reuses Tailwind tokens, shadcn primitives, and Lucide icons. It creates no new visual system.

## Mobile Behavior

The queue stacks above the detail on narrow screens. Cards use readable type and minimum 44px touch targets. Filters scroll horizontally. No tables are used. No nested scroll traps exist. Content scrolls with the page.

Wider screens place queue and detail in two columns.

## Risks or Limitations

- Review data loads up to 5000 rows per source into memory. Large tenants see a truncation notice. This is acceptable for Stage 1 inspection.
- Pagination by `updated_at` can skip rows under concurrent writes. This affects a read-only view only.
- Long queues push case detail down on mobile. Search and filters reduce the list.
- Exact-match resolution requires exactly one target. Duplicate canonical names stay in Tier C for human review. This is fail-safe by design.

## Deferred Work

Stage 2 requires:

- Link-to-existing apply path with stale checks.
- Create-separate-item apply path with stale checks.
- Durable Keep Separate data model, if product requires it.
- Leave Unresolved semantics, if product requires it.
- Audit provenance for reviewer and timestamp.
- Export/import support after in-app semantics stabilize.
- Race handling for rows changed after review load.
- Candidate suppression for reviewed-separate pairs.
