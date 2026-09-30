# Cost & Pricing Sheet V13 Form Correction Report

This report was written by Codex on 2026-09-29 via Codex Desktop.

## Objective

Correct the production Cost & Pricing Sheet V13 Form implementation.

The correction had these goals:

- Use the accepted V13 desktop and mobile/fold candidates as the design contract.
- Align new and edit form orchestration with the document form consolidation standard.
- Align save behavior with the document save orchestration standard.
- Use the canonical document Save FAB and FormFooter pattern.
- Preserve the working Cost & Pricing Sheet calculation and Instant Markup logic.
- Restore V13 photo, import, and column-management surfaces.
- Preserve semantic theme-token use.

## Scope

This task changed the Cost & Pricing Sheet form path only.

This task did not implement:

- Cost & Pricing Sheet View.
- PDF rendering.
- Forme.
- PDF customization.
- Activity Trail UI.
- Related Documents UI.
- Repository-wide BOQ to Cost & Pricing Sheet renames.

## Files changed

- `src/pages/BoqFormPage.tsx`
- `src/pages/NewBoq.tsx`
- `src/pages/EditBoq.tsx`
- `src/hooks/useBoqSave.ts`
- `src/components/boq/BoqEditor.tsx`
- `src/components/boq/BoqEditorParts.tsx`
- `src/components/boq/BoqImportSheet.tsx`
- `src/domain/boq/columns.ts`
- `src/domain/boq/importAdapter.ts`
- `src/domain/boq/factories.ts`
- `src/domain/boq/normalize.ts`
- `src/domain/table-document/types.ts`
- `src/domain/table-document/rows.ts`
- `src/components/useInvoiceColumns.tsx`
- `src/lib/itemPhotoUpload.ts`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-v13-form-correction-report-2026-09-29.md`

## Skills used

Skills used: vercel-react-best-practices, typescript-advanced-types, tailwind-css-patterns, mobile-app-ui-design, accessibility, supabase, html-prototype, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Standards inspected

- `docs/standard/document-form-consolidation-standard.md`
- `docs/standard/document-save-orchestration.md`
- `docs/standard/fab-standard.md`
- `docs/standard/document-column-standard.md`
- `docs/standard/document-image-upload-policy.md`
- `docs/standard/json-import-standard.md`

## Design evidence inspected

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-desktop.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-mobile-fold.html`
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`
- `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md`

## Changes made

- Added `BoqFormPage.tsx` as the shared create/edit form page.
- Changed `NewBoq.tsx` and `EditBoq.tsx` into thin route delegators.
- Added `useBoqSave.ts` to route Cost & Pricing Sheet save through `useDocumentSave`.
- Moved BOQ-specific validation, serialization, persistence, row lifecycle, and audit emission into the document-save strategy boundary.
- Replaced the custom top-bar save action with canonical `FormFooter`.
- Reworked `BoqEditor.tsx` into a V13 form composition with metadata, pricing workspace, commercial summary, Instant Markup, photos, import, and column management.
- Extracted repeated editor UI into `BoqEditorParts.tsx`.
- Added a Cost & Pricing Sheet JSON import adapter and sheet.
- Added BOQ column definitions and deny-list behavior for required columns.
- Extended `useInvoiceColumns` so existing column infrastructure can use BOQ built-ins without changing invoice defaults.
- Added a shared item photo upload helper that uses the existing Cloudinary path and image policy.
- Extended legacy table row normalization to keep Cost & Pricing Sheet row metadata, photos, groups, rates, and custom data compatible with existing records.
- Removed raw default factory colors from new Cost & Pricing Sheet customization defaults.

## Mandatory conformance matrix

| Requirement | V13 Desktop | V13 Mobile | V13 Fold | Production implementation | Governing BIGDROPS standard | Status | Evidence/file reference |
|---|---|---|---|---|---|---|---|
| Page shell | Full-page form workspace with header, toolbar, editor, and pricing rail. | Compact authoring shell with touch-first actions. | Fold-aware composition, not plain phone or desktop. | Shared `BoqFormPage` renders one `BoqEditor` with layout mode. | `document-form-consolidation-standard.md` | PARTIAL | `src/pages/BoqFormPage.tsx`, `src/components/boq/BoqEditor.tsx` |
| Metadata | Header and project/client/site/reference fields. | Metadata appears as compact stacked fields. | Metadata remains visible with adapted density. | Metadata section is implemented and shared. | `document-form-consolidation-standard.md` | PASS | `src/components/boq/BoqEditor.tsx` |
| Row composition | Dense pricing rows with editable CP, SP, quantity, unit, and descriptions. | Card-like item authoring with touch controls. | Wider mobile surface with adapted pricing controls. | Rows use shared `RowEditor`; mobile is improved but not a full V13-specific card system. | `document-form-consolidation-standard.md`, accessibility guidance | PARTIAL | `src/components/boq/BoqEditorParts.tsx` |
| Groups | Structural group rows and continuous item rows. | Groups remain structural. | Groups remain structural. | Group creation and group headers are present. Markup excludes group rows through domain logic. | Cost & Pricing Sheet PRD | PASS | `src/components/boq/BoqEditor.tsx`, `src/domain/boq/instant-markup.ts` |
| CP/SP | CP is internal. SP is the selling rate. | Same behavior. | Same behavior. | CP and SP remain separate. Instant Markup mutates SP only. | `docs/standard/document-save-orchestration.md`, Cost & Pricing Sheet PRD | PASS | `src/domain/boq/calculations.ts`, `src/domain/boq/instant-markup.ts` |
| Commercial rail/summary | Desktop pricing rail is visible beside the editor. | Summary is compact and secondary. | Summary adapts beside or below content by mode. | Summary/rail is implemented with semantic tokens. Exact V13 rail density is not complete. | Theme and responsive standards | PARTIAL | `src/components/boq/BoqEditor.tsx` |
| Instant Markup entry | Toolbar action opens Instant Markup. | Touch action opens Instant Markup. | Same action is available. | Entry exists in desktop and mobile action areas. | Cost & Pricing Sheet PRD | PASS | `src/components/boq/BoqEditor.tsx` |
| Instant Markup workspace | Preview, row participation, Apply, Cancel, Undo. | Same command in mobile sheet/dialog treatment. | Same command and state. | Business behavior is preserved. Presentation uses a shared dialog, not a distinct V13 mobile workspace. | Accessibility standard, Cost & Pricing Sheet PRD | PARTIAL | `src/components/boq/BoqEditor.tsx`, `src/domain/boq/instant-markup.ts` |
| Photos | V13 has row photo controls. | Photo action is touch visible. | Photo behavior remains available. | Photo upload uses existing policy and Cloudinary path. Persistence uses custom field row data, not a dedicated row schema column. | `document-image-upload-policy.md` | PARTIAL | `src/lib/itemPhotoUpload.ts`, `src/domain/boq/normalize.ts` |
| Import | V13 exposes import. | Import is available in compact action set. | Import remains available. | Import sheet uses shared JSON import layout and BOQ adapter. Update/merge workflows are not complete. | `json-import-standard.md` | PARTIAL | `src/components/boq/BoqImportSheet.tsx`, `src/domain/boq/importAdapter.ts` |
| Column management | V13 exposes column controls. | Column controls are available through compact actions. | Column controls remain available. | Existing `ColumnManager` is reused with BOQ built-ins and required-column deny-list. Row rendering for arbitrary custom columns remains partial. | `document-column-standard.md` | PARTIAL | `src/domain/boq/columns.ts`, `src/components/useInvoiceColumns.tsx` |
| Save FAB | Production standard governs save action. | Mobile Save FAB/FormFooter required. | Fold must keep bottom clearance. | `FormFooter` is used with SaveAll semantics. | `fab-standard.md`, `document-save-orchestration.md` | PASS | `src/components/boq/BoqEditor.tsx`, `src/components/document/FormFooter.tsx` |
| Sheets/dialogs | Markup, import, and columns use production surfaces. | Touch-friendly modal/sheet behavior required. | Same accessible controls. | Existing Dialog and import layout are used. Full V13 mobile sheet choreography is partial. | Accessibility guidance | PARTIAL | `src/components/boq/BoqEditor.tsx`, `src/components/boq/BoqImportSheet.tsx` |
| Bottom-nav clearance | Production mobile footer must clear bottom navigation. | Required. | Required. | `FormFooter` provides canonical clearance behavior. | `fab-standard.md` | PASS | `src/components/boq/BoqEditor.tsx` |
| Theme behavior | V13 colors are visual intent only. | Same. | Same. | New UI uses semantic classes and theme tokens. No new raw color system was added. | Theme requirement, Tailwind conventions | PASS | `src/components/boq/BoqEditor.tsx`, `src/components/boq/BoqEditorParts.tsx` |
| Accessibility behavior | Keyboard and labels required. | Touch targets and labels required. | Same behavior. | Buttons, labels, dialogs, error text, and status text are present. Full screen-reader validation audit remains deferred. | Accessibility guidance | PARTIAL | `src/components/boq/BoqEditor.tsx`, `src/components/boq/BoqEditorParts.tsx` |

## Architecture confirmation

1. Are `NewBoq.tsx` and `EditBoq.tsx` now thin delegators?
   - Yes. Both route files delegate to `BoqFormPage`.

2. What shared `*FormPage.tsx` owns orchestration?
   - `src/pages/BoqFormPage.tsx`.

3. Is `useDocumentSave` now the canonical save path?
   - Yes. `useBoqSave` wraps `useDocumentSave` with a BOQ strategy.

4. Was manual duplicate Supabase/save orchestration removed?
   - Yes for route-level create/edit pages. BOQ-specific persistence remains inside the save strategy.

5. Is the canonical Save FAB/FormFooter used?
   - Yes. `BoqEditor` renders `FormFooter`.

6. Are desktop and mobile/fold intentionally separate compositions over shared state?
   - Partial. The implementation uses shared state and layout mode. It now adapts by layout mode, but it is not a complete independent translation of every mobile/fold candidate surface.

7. Is fold behavior intentionally implemented rather than obtained accidentally from CSS wrapping?
   - Partial. Fold mode is detected through the project layout hook and receives fold-aware layout classes. Some fold behavior still depends on responsive CSS composition.

8. Are photos implemented and backed by real infrastructure?
   - Partial. Photo upload uses the existing image policy and Cloudinary upload path. Persistence uses existing custom row data instead of a dedicated `boq_rows.image_url` schema field.

9. Is Import implemented and backed by real infrastructure?
   - Partial. Import uses shared JSON import UI and a BOQ adapter. Update and merge behavior remain limited.

10. Is column management implemented using established column semantics?
    - Partial. The shared column manager and visibility model are reused. Full BOQ custom-column rendering is still incomplete.

11. Were all new colors implemented through semantic theme tokens?
    - Yes. New production UI uses semantic theme utilities. New BOQ factory defaults no longer seed raw color values.

12. Were existing Instant Markup semantics preserved?
    - Yes. The existing domain logic and focused tests remain in place.

13. Were the authoritative calculation engines preserved without duplication?
    - Yes. Costing remains in the BOQ domain, and commercial projection remains in the adapter path. No deprecated invoice helpers were revived.

## Save orchestration result

The form now follows the shared save lifecycle:

- `BoqFormPage` owns create/edit orchestration.
- `useBoqSave` builds the BOQ save strategy.
- `useDocumentSave` owns save state, duplicate-save protection, feedback, success handling, and error handling.
- BOQ-specific serialization and row persistence stay inside the document-specific strategy.

## Calculation and Instant Markup result

Instant Markup behavior was preserved:

- Percentage mode derives `SP = CP x (1 + percentage / 100)`.
- Value mode derives `SP = CP + value`.
- Value is per unit.
- Markup derives from CP, not current SP.
- Excluded rows keep their SP.
- Group rows do not participate.
- Rows with missing or zero CP do not participate.
- Apply mutates SP only.
- Undo restores prior SP values.
- CP, VAT, discount, WHT, install rate, extra charges, and unrelated commercial settings are not mutated.

## Persistence and schema result

No database migration was added.

The correction keeps compatibility with existing BOQ/CPS records by:

- Reading legacy row cells.
- Writing extended row data through existing custom-field row storage.
- Preserving existing `boq_rows` parent/child persistence flow.
- Keeping CP internal to the Cost & Pricing Sheet domain.

The photo implementation does not add a dedicated database column. This is a limitation, not a hidden schema change.

## Verification

- `git status` before report: captured. The repository already contained many pre-existing modified, deleted, renamed, staged, and untracked files.
- `bun run audit:load`: passed with existing warnings. Warnings include pre-existing large-file and broad-select findings outside this correction.
- `bun run typecheck`: passed.
- Focused tests: passed with `bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/boqInstantMarkup.test.js src/tests/critical/boqNormalize.test.js`.
- `git diff --check`: passed. Git reported line-ending warnings only.
- `supabase db push`: not applicable. No SQL migration was created.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: not applicable.

No schema migration was created.

## Risks or limitations

- V13 desktop fidelity is improved, but some exact workspace density and dock behavior remain partial.
- V13 mobile/fold fidelity is improved, but the implementation is still not a complete separate mobile/fold composition for every candidate surface.
- Photos use real upload infrastructure, but persistence is through existing custom row data rather than a dedicated BOQ row photo schema.
- Import uses the shared JSON import surface, but update and merge workflows are limited.
- Column management uses established visibility semantics, but arbitrary custom BOQ column editing is not fully represented in the row editor.
- Accessibility uses established primitives and labels, but a full assistive-technology audit remains deferred.
- The working tree contains many pre-existing changes that were not part of this correction.

## Deferred work

- Complete the remaining exact V13 mobile/fold composition details.
- Add a dedicated BOQ photo persistence schema only if the active PRD requires it.
- Add full BOQ custom-column editing in the row editor.
- Add BOQ import update and merge behavior.
- Add a full accessibility verification pass with keyboard and screen-reader checks.
- Review pre-existing repository changes separately before merge.

## Final verdict

The correction moves the Cost & Pricing Sheet V13 Form from a partial implementation to a standards-aligned production path for orchestration, save behavior, FormFooter/FAB behavior, Instant Markup, photos, import, and column management.

The implementation is not yet a full PASS for every V13 desktop, mobile, and fold detail. The correct readiness classification is:

- Architecture: PASS.
- Save orchestration: PASS.
- Instant Markup: PASS.
- Calculation safety: PASS.
- Theme compliance for new code: PASS.
- Photos: PARTIAL.
- Import: PARTIAL.
- Column management: PARTIAL.
- Desktop design fidelity: PARTIAL.
- Mobile/fold design fidelity: PARTIAL.
