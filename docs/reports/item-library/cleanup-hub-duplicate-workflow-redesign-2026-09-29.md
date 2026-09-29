# Cleanup Hub Duplicate Workflow Redesign Report

This report was written by Codex on 2026-09-29 via Codex desktop.

## Objective

Redesign the Cleanup Hub user experience around cleanup problems.

Make Duplicate Items show duplicate groups only.

Make AI an assistive capability inside the duplicate cleanup workflow.

## Scope

This task changed Item Library and Cleanup Hub user interface code.

This task changed focused tests for cleanup, duplicate review, Local AI, model selection, navigation, and Unlinked Items copy.

This task did not change SQL, Supabase schema, native Android code, or financial calculation code.

## Before Mental Model

The old flow mixed catalog browsing with duplicate cleanup.

Duplicate Items could show the normal catalog list, with ordinary item counts and non-duplicate rows.

The old flow also made Manual review, Local AI, and External AI look like separate cleanup destinations.

The model picker and job-size picker used native selection controls. On Android WebView, these controls could open an unclear blank surface.

Historical Review appeared as a top-level concept. That label did not explain the cleanup task.

## After Mental Model

The new flow separates library browsing from cleanup work.

Library is for reusable item management.

Cleanup Hub is for cleanup problems.

Cleanup Hub shows:

- Duplicate Items.
- Unlinked Items.
- Clean & Standardize Catalog.
- Past Changes.

Duplicate Items now opens one duplicate resolver workspace.

The workspace shows duplicate groups only. It does not show the ordinary catalog list as the primary cleanup view.

Manual review is the default group interaction.

Local AI is available as bulk assistance inside Duplicate Items.

External AI export and import stay available as a secondary action.

Unlinked Items uses the existing Historical Review capability, but the user-facing label now explains the task.

## Files Changed

- `src/modules/item-library/types/itemLibrary.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/modules/item-library/components/ItemLibraryListPanel.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx`
- `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx`
- `src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx`
- `src/modules/item-library/hooks/useHistoricalReviewCases.ts`
- `src/tests/item-library/itemLibraryCleanupInteraction.test.js`
- `src/tests/item-library/historicalReview.test.js`
- `src/tests/item-library/itemLibraryNavigation.test.js`
- `docs/reports/item-library/cleanup-hub-duplicate-workflow-redesign-2026-09-29.md`

## Skills Used

Skills used: libraries-dev, accessibility, mobile-android-design, capacitor-best-practices, tailwind-capacitor, vercel-react-best-practices, typescript-advanced-types, redesign-existing-projects, webapp-testing, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Replaced the top-level Item Library navigation with Library and Cleanup Hub.
- Moved the user-facing Historical Review workload into Cleanup Hub as Unlinked Items.
- Removed the separate Manual, Local AI, and External AI duplicate workflow split.
- Made Duplicate Items open the duplicate group workspace directly.
- Added Local AI bulk review assistance inside the Duplicate Items workspace.
- Kept External AI export and import available as a secondary action.
- Added AI status badges to duplicate group cards.
- Added advisory AI suggestion display to the single-group resolver.
- Removed native model and job-size select controls from the Local AI panel.
- Added an app-controlled model sheet with concise model labels and install state.
- Removed job-size controls for small duplicate workloads.
- Used app-controlled review-count buttons for larger duplicate workloads.
- Removed the Local AI command input from the primary duplicate cleanup workflow.
- Updated Unlinked Items copy while preserving existing historical reconciliation semantics.
- Added focused tests for the new cleanup information architecture and duplicate workflow.

## Verification Result

- `bun test src/tests/item-library/itemLibraryCleanupInteraction.test.js src/tests/item-library/cleanupLocalAIJob.test.js src/tests/item-library/cleanupLocalAI.test.js src/tests/local-ai/modelManager.test.js src/tests/item-library/historicalReview.test.js src/tests/item-library/itemLibraryNavigation.test.js`: passed, 55 tests.
- `bun run typecheck`: passed.
- `git diff --check`: passed. Git reported line-ending warnings only.
- `bun run audit:load`: skipped. This task did not change schema, query, or data-layer logic.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.
- `git status`: not clean. It includes task changes and pre-existing unrelated changes.

## Supabase Push Status

Not applicable.

No migration was added.

No Supabase schema change was made.

## Risks Or Limitations

- The native inference grammar failure remains outside this task.
- Manual duplicate cleanup remains available when Local AI fails.
- AI suggestions remain advisory. They do not merge records, create aliases, link historical rows, or change financial values.
- The Cleanup Hub count for Unlinked Items uses the existing Historical Review hook. The panel also uses that hook when opened.

## Deferred Work

- Fix the native inference grammar failure in a separate task.
- Review the final UI on a physical Android device.
- Consider a dedicated advanced menu if more external cleanup tools are added later.
