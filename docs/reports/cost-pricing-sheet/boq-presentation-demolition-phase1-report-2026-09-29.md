# BOQ Presentation Demolition (Phase 1) Report

This report was written by Buffy on 2026-09-29 via Freebuff.

## Objective

Remove the current BOQ form/editor presentation and the current BOQ view-page
presentation. Create a clean demolition boundary. Do not implement or port a
replacement BOQ design.

## Scope

In scope:

- BOQ create/new, edit, and form/editor presentation.
- BOQ customization panel and preview presentation.
- BOQ view-page presentation.
- BOQ React PDF renderer.
- Code that points to the removed presentation.

Out of scope:

- BOQ domain, calculation, numbering, and data contracts.
- BOQ list page.
- Shared document infrastructure.
- Supabase schema and migrations.
- Non-BOQ document families.

## Skills used: karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Files changed

### Deleted — BOQ presentation

| File | Reason |
| :--- | :--- |
| src/components/boq/BoqForm.tsx | Form presentation. |
| src/components/boq/BoqEditor.tsx | Editor presentation. |
| src/components/boq/BoqCustomizationPanel.tsx | Form customization panel. |
| src/components/boq/BoqPreview.tsx | Form and view preview. |
| src/components/boq/BoqPdfDocument.tsx | BOQ React PDF renderer. |
| src/components/document-view/boq/BoqViewPage.tsx | View-page composition. |
| src/components/document-view/boq/BoqViewPage.module.css | View-page styles. |
| src/components/document-view/boq/BoqSummaryStrip.tsx | View-page summary strip. |
| src/components/document-view/boq/BoqSummaryStrip.module.css | Summary strip styles. |
| src/components/document-view/boq/BoqPrimaryActions.tsx | View-page primary actions. |
| src/components/document-view/boq/BoqSecondaryActions.tsx | View-page secondary actions. |
| src/components/document-view/boq/BoqHeroMeta.tsx | View-page hero meta. |
| src/components/document-view/boq/BoqHeroMeta.module.css | Hero meta styles. |
| src/components/document-view/boq/BoqMoreSheet.tsx | View-page action sheet. |
| src/components/document-view/boq/BoqDocumentPreview.tsx | Standalone preview. |
| src/components/document-view/boq/BoqDocumentPreview.module.css | Standalone preview styles. |
| src/components/document-view/boq/boqViewMockData.ts | Preview mock data. |
| scripts/tmp-d2-render-boq-pdf.ts | Dead after renderer removal. |

The folder `src/components/document-view/boq/` is now empty and removed.

### Modified — route pages replaced with placeholders

| File | Change |
| :--- | :--- |
| src/pages/NewBoq.tsx | Replaced the form with a transitional placeholder. |
| src/pages/EditBoq.tsx | Replaced the form with a transitional placeholder. |
| src/pages/ViewBoq.tsx | Replaced the view page with a transitional placeholder. |

### Modified — test references to removed presentation

| File | Change |
| :--- | :--- |
| src/tests/document/dateField.test.js | Removed the deleted BoqForm.tsx entries. |
| src/tests/critical/documentNumbering.test.js | Removed the deleted NewBoq.tsx numbering check. |

### Preserved — BOQ domain and data

| File | Reason |
| :--- | :--- |
| src/domain/boq/types.ts | BOQ document contract. |
| src/domain/boq/normalize.ts | Database mapping and numbering. |
| src/domain/boq/factories.ts | Empty BOQ factory. |
| src/domain/boq/calculateBoqTotals.ts | Locked BOQ commercial model. |
| src/pages/view-boq-actions.ts | Persistence and conversion operations. |
| src/domain/pdf/customization/boq.ts | BOQ PDF customization metadata. |
| src/tests/critical/boqNormalize.test.js | Domain tests. |

### Preserved — BOQ list page

| File | Reason |
| :--- | :--- |
| src/pages/Boqs.tsx | List route. Not in the demolition target list. |
| src/components/boq/BoqList.tsx | List presentation. Uses shared infrastructure only. |

### Preserved — shared infrastructure

- src/components/table-document/ (shared table editor, preview, and PDF).
- src/components/document-view/shared/, hooks/, and types/.
- src/config/moduleAdapters.ts.
- src/services/exportFetchers.ts, src/utils/exportSchemas.ts, and src/utils/exportCompilers.ts.
- src/components/app/AppShell.tsx. Routes stay. Pages now render placeholders.
- All Supabase migrations and the database schema.

## Changes made

1. Audited the BOQ dependency graph from routes to domain.
2. Deleted the BOQ form/editor presentation components.
3. Deleted the BOQ view-page presentation folder.
4. Deleted the BOQ React PDF renderer and its dead render script.
5. Replaced three route pages with minimal transitional placeholders.
6. Removed test references to the deleted presentation.
7. Inspected imports after deletion. No dangling reference remains.

## Verification result

The user instructed static repository inspection only. The user excluded the
build, typecheck, lint, tests, and runtime checks. This task follows that
instruction.

- git status before changes: clean
- git diff --check: pass (clean)
- git status after changes: 18 deleted, 5 modified, 0 unintended
- Dangling reference scan: pass (0 matches for removed BOQ presentation modules)
- bun run audit:load: skipped per user instruction
- bun run typecheck: skipped per user instruction
- bun run lint: skipped per user instruction
- bun run test: skipped per user instruction
- supabase db push: not applicable (no SQL changed)
- bun run build: skipped due to hardware policy

## Supabase push status

Not applicable. This task changed no SQL and no schema. The task pushed no
migration.

## Risks or limitations

- The BOQ list page still links to `/boqs/new` and `/boqs/:id`. Both routes now
  show placeholders.
- The BOQ PDF renderer is removed. BOQ PDF export is unavailable until
  reconstruction.
- The placeholders use `Layout`. They reproduce no rejected BOQ UI.
- Git reports a line-ending hint for modified files. `git diff --check` stays
  clean. The change is cosmetic.

## Deferred work

- Build the replacement BOQ form and view in a separate task.
- Rebuild BOQ PDF output against the shared table-document layer.
- Decide the final behavior of the BOQ list entry points.
