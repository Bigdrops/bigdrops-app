# Item Library Tier C Stage 2B Reconciliation Implementation Report

This report was written by Muse Spark on 2026-09-27 via OpenCode.

## Objective

Take over the interrupted Stage 2B implementation. Audit inherited work. Finish incomplete pieces. Repair defects. Apply the migration through the approved workflow. Verify database objects and actual RPC behavior. Complete the report.

MIGRATION APPLIED AND VERIFIED ON HOSTED PROJECT `xqlpekpkbszpdgtuwybh`.

No disposable project exists in repository configuration. `supabase/database-workflow.md` defines hosted-only work. Both Stage 2B migrations ran against the hosted project through `supabase db push`.

NO HISTORICAL IDENTITY MUTATIONS ARE ALLOWED outside explicit human Stage 2B actions. None were added beyond the specified four outcomes.

## Scope

In scope:

- Handoff audit of 16 inherited files.
- Migration review, repair, application, and verification.
- Application-layer completion and defect repair.
- Live RPC behavioral verification with synthetic test data.
- Focused regression tests, typecheck, audit, and diff checks.
- This report.

Out of scope:

- Stage 2A redesign.
- AI integration.
- Fuzzy automatic identity.
- Historical commercial-data rewriting.
- Automatic alias creation.
- Leave Unresolved persistence.
- Unrelated BOQ, Android, and direct-entry work.

## Files Changed

Inherited from Codex and preserved:

- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx`
- `src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx`
- `src/modules/item-library/domain/historicalReview.ts`
- `src/modules/item-library/domain/itemCleanupExchange.ts`
- `src/modules/item-library/hooks/useHistoricalReviewCases.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/modules/item-library/repositories/historicalReviewRepository.ts`
- `src/modules/item-library/services/itemLibraryService.ts`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/tests/item-library/historicalReview.test.js`
- `src/tests/item-library/itemCleanupExchangeFlagged.test.js`
- `src/tests/item-library/itemLibraryCleanupInteraction.test.js`
- `docs/reports/item-library/item-library-tier-c-historical-review-stage-1-2026-09-27.md`
- `supabase/migrations/20260927162405_item_library_tier_c_stage2b_reconciliation.sql`
- `src/tests/item-library/historicalReviewStage2bMigration.test.js`

Changed by this continuation session:

- `supabase/migrations/20260927162405_item_library_tier_c_stage2b_reconciliation.sql`
- `supabase/migrations/20260927173840_item_library_tier_c_stage2b_audit_trail_correction.sql`
- `src/modules/item-library/domain/historicalReview.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/tests/item-library/historicalReview.test.js`
- `docs/reports/item-library/item-library-tier-c-stage-2b-reconciliation-implementation-2026-09-27.md`

Untouched pre-existing work from other agents:

- BOQ design files and reports.
- Android plugin files.
- Direct-entry recognition files.
- Accounting and tax modules.

## Skills Used

Skills used: supabase, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Handoff Classification

| Requirement | Status | Evidence |
| --- | --- | --- |
| Tenant-local persistence structures | COMPLETE | Four tables match Stage 2A names and semantics. |
| Existing-tenant installation | COMPLETE after repair | Entity loop installs into 11 complete schemas. Three incomplete schemas skip loudly. |
| Template and future provisioning | COMPLETE after repair | Template holds four tables. Template list, resource map, and provision flow updated. |
| Link Existing RPC | COMPLETE | Atomic link with stale, conflict, and provenance paths. |
| Create Separate RPC | COMPLETE | Atomic create with race handling and rejection conversion. |
| Canonical Keep Separate RPC | COMPLETE | Ordered pairs, reuse, self-pair rejection. |
| Case-to-candidate Keep Separate RPC | COMPLETE | Membership-bound rejections with stale handling. |
| Keep Separate revocation | COMPLETE | Both revocation RPCs audited. No revoke UI. UI revocation is deferred. |
| Reconciliation provenance | COMPLETE | Decision header plus per-row provenance. |
| Membership hash and versioning | PARTIAL, repaired | Hash missed its FROM clause. Client and server ordering disagreed. Both fixed. |
| Merge guards and remapping | COMPLETE | Direct merge blocked. Third-item merge remaps or supersedes. |
| Cleanup Hub suppression | COMPLETE | Group filtering, card blocking, validation preflight, apply guard. |
| Cleanup snapshot and preflight | COMPLETE | Suppression changes payload identity. Imports reject violations. |
| Historical Review UI actions | COMPLETE | Link, create, keep separate, leave unresolved. Confirmations included. |
| Repository, service, and hook wiring | COMPLETE | Mutation paths wired with reload on apply. |
| Authorization | COMPLETE | Entity permission gate on every RPC. Verified live. |
| Stale checks | COMPLETE | Hash plus row-array comparison on every case RPC. Verified live. |
| Tests | COMPLETE | Migration contract, domain, repository, exchange, and interaction tests. |
| Implementation report | MISSING, completed here | No Stage 2B report existed. |

## Migration Repairs

The inherited migration needed four corrections before and after application.

### Repair 1: Stale provisioning redefinitions

Codex copied an old `provision_entity` snapshot. The copy cloned tables from the `public` schema. It used a removed trigger installer. It dropped accounting triggers, tax triggers, chart seeding, permission seeding, and PostgREST exposure. It also used an old resource-map fallback.

Live ground truth confirmed the current baseline. This session replaced all three redefinitions with the live baseline plus only the reconciliation additions. Future tenants keep every existing provisioning step and gain the reconciliation install step.

### Repair 2: Missing hash source

`compute_historical_review_case_hash` defined an `eligible` row set but never selected from it. The function always returned `hr-v1-`. Every case mutation would fail stale. This session added the missing `FROM eligible`.

### Repair 3: Ordering contract

The client sorted row IDs with `localeCompare`. The server compared arrays ordered by UUID value. The database uses `en_US.UTF-8` collation. ICU and database collation can disagree on hyphenated IDs. Every affected mutation would fail stale.

This session changed the client to code-unit order. It changed the server hash to order by UUID value. Code-unit order equals UUID byte order for canonical IDs. A regression test pins the contract.

### Repair 4: Incomplete schemas

Three historically incomplete tenant schemas lack `item_catalog`. The backfill loop now skips them with a notice. Eleven schemas received the objects. The template received the tables.

### Repair 5: Forbidden audit writes

All six RPCs wrote `entity_type = 'item'` rows to tenant `activity_events`. That table restricts entity types to document workflows. Every keep, link, and create call raised error 23514. Live RPC testing exposed this defect.

The decision, pair, and rejection tables already record actor, timestamp, reason, snapshots, workflow, and context. A follow-up migration reinstalls all objects without the forbidden writes. Existing data survived because every object uses replace-if-exists semantics.

## Migration Application

Push history through the approved workflow:

1. First push failed on aggregate scope in the hash function. Fixed.
2. Second push failed on the missing hash source. Fixed.
3. Third push failed on an incomplete tenant schema. Guard added.
4. Fourth push applied the base migration. Verified below.
5. Live RPC testing exposed the audit-write defect.
6. A correction migration reinstalled fixed objects. Applied and verified.

Final migration state on the hosted project:

- `20260927162405_item_library_tier_c_stage2b_reconciliation.sql`: applied.
- `20260927173840_item_library_tier_c_stage2b_audit_trail_correction.sql`: applied.

## Post-Application Verification

Schema verification on the hosted project:

- Four new tables exist in 11 entity schemas and the template. Three incomplete schemas hold none.
- All eight tenant RPCs exist in 11 entity schemas with correct signatures.
- Sixteen RLS policies cover the four tables in the main tenant.
- `provision_entity` contains the reconciliation install step.
- The link RPC exists in 11 entity schemas.

Behavioral verification used synthetic test data in the main tenant. All residue was removed afterward. Residue counts returned zero in all five categories.

| RPC behavior | Result |
| --- | --- |
| Canonical keep separate creates one ordered pair | Applied |
| Duplicate submission returns the existing decision | Applied with reuse flag |
| Reversed submission returns the existing decision | Applied with reuse flag |
| Self pair fails closed | Failed with reason, zero rows |
| Revocation audits actor and timestamp | Applied |
| Second revocation reports stale | Stale |
| Recreation after revoke creates a new row | Applied |
| Case keep separate binds to current membership | Applied |
| Link to a rejected candidate fails | Conflict, zero mutation |
| Wrong membership hash fails | Stale with current hash, zero mutation |
| Revocation unblocks the link | Applied, one row linked |
| Second link reports stale | Stale, zero mutation |
| Linked row keeps description, quantity, unit, price, amount, make | Verified unchanged |
| Decision header and per-row provenance recorded | Verified |
| Create with an existing name fails | Conflict, zero mutation |
| Create succeeds with price zero and no aliases | Applied and verified |
| Direct contradictory merge raises error 23000 | Blocked, zero mutation |
| Third-item merge remaps the pair | Applied, pair moved in place |
| Merge of the remapped pair raises error 23000 | Blocked |
| Call without authentication raises error 42501 | Denied |
| Cross-tenant IDs without rights raise error 42501 | Denied before data access |
| Multi-row case links atomically | Applied, two rows, one decision |
| Server hash matches client membership format | Verified |

## Application Changes

This session made two small application corrections:

- Membership row IDs sort by code unit. This matches server UUID ordering.
- The safety-state retry button records load failure instead of raising an unhandled rejection.

No Stage 2B application file was redesigned. No unrelated file was modified.

## Test Results

Focused suites:

- Historical Review domain, repository, UI, and mutation tests: 15 passed.
- Stage 2B migration contract tests: 4 passed.
- Cleanup exchange tests including preflight rejection: 13 passed.
- Cleanup interaction tests: 2 passed.
- Direct-entry and suggestion regression tests: 12 passed.
- Catalog cleanup session tests: 7 passed.
- Item row and price context tests: 6 passed.

Wider run: 57 passed, 2 failed. Both failures are pre-existing and unrelated. One test imports a `.tsx` component the Node runner cannot load. One test references a removed `Layout.jsx` path. Neither file belongs to Stage 2B. Neither file was modified.

## Verification

Verification:

- Focused Historical Review tests: passed.
- Stage 2B migration tests: passed.
- Cleanup Hub tests: passed.
- Snapshot and preflight regression tests: passed.
- Direct-entry regression tests: passed.
- `bun run audit:load`: completed. All flags are pre-existing outside Stage 2B.
- `bun run typecheck`: passed.
- `git diff --check` on task files: passed.
- Live schema verification: passed.
- Live RPC behavioral verification: passed.
- Synthetic test data residue: zero.
- `supabase db push`: succeeded for both migrations.
- `bun run build`: skipped due to hardware policy.

## Supabase Push Status

Supabase push status: applied and verified.

- `20260927162405`: applied. Eleven schemas plus template installed.
- `20260927173840`: applied. Objects reinstalled without forbidden audit writes.
- No production data was edited by hand. All writes used migrations or tested RPCs.
- No dashboard SQL editor was used for schema changes.

## Handoff Note

A repository process committed the inherited Stage 2B application work mid-session as `b5f4454c`. The commit captured the application, test, and early migration repairs. This session left that commit intact.

The working tree holds the final migration repairs, the correction migration, and this report as uncommitted changes. The live database runs the corrected installer. The recorded base migration applied with the audit-write defect. The correction migration supersedes those installer bodies. End-state objects are identical to the working-tree migration sources.

## Risks or Limitations

- The replacement merge RPC requires an active winner. The original allowed an inactive winner. The interface always selects active winners. Behavior is otherwise preserved.
- Concurrent merge transactions on overlapping items can deadlock. Postgres aborts one transaction. The outcome stays safe. No data corrupts.
- Full provisioning dry-run was not possible without creating entities. Template tables, the installer path, and the provision flow step were each verified separately.
- Revocation has RPC coverage but no UI control. A future task should add explicit revoke actions with confirmation.
- `Leave unresolved` stores nothing. Future deferral metrics need a separate workflow table. They must not reuse Keep Separate tables.
- The forward-learning trigger auto-links or auto-creates catalog rows on insert. Test setup accounted for it. Production behavior is unchanged.

## Deferred Work

- Revocation controls in Historical Review and Cleanup Hub.
- Export and import support for external reconciliation review.
- Saved review sessions and review notes.
- Confidence labels for candidate generation.
- AI consumption of active exclusion evidence.
- Workflow deferral metrics separate from identity state.
