# CPS PRD Production Reconciliation Audit

This report was written by Codex on 2026-10-04 via Codex Desktop.

Skills used: karpathy, systematic-debugging, react-dev, typescript-advanced-types, frontend-design, pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Audit the current Cost & Pricing Sheet (CPS) product against the current PRD package.

This is a zero-code audit. No application code, tests, PRD file, standard, migration, package file, or configuration file was changed.

The report answers one main question:

Does the CPS PRD still describe the intended product, or has production moved beyond parts of it through approved work?

## Scope

Reviewed documentation:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `supabase/database-workflow.md`
- `docs/standard/document-transformation-standard.md`
- `docs/standard/prefix-engine-settings-standard.md`
- `docs/prd/cost-pricing-sheet/README.md`
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`
- `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md`
- `docs/prd/cost-pricing-sheet/01-boq-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-boq-document-lifecycle.md`
- `docs/prd/cost-pricing-sheet/03-boq-presentation-contract.md`
- `docs/prd/cost-pricing-sheet/waterfall-roadmap.html`
- CPS reports under `docs/reports/cost-pricing-sheet/`

Reviewed production areas:

- CPS routes and pages
- New and Edit CPS form orchestration
- Desktop, mobile, and fold CPS presentations
- CPS editor/controller
- CPS domain models, factories, normalization, calculations, row operations, import, conversion, PDF, and Instant Markup
- CPS View and View actions
- CPS to Quotation conversion
- Quotation row and number contracts used by conversion
- CPS PDF architecture and active Forme renderer path
- CPS PDF customization and download wiring
- Prefix and numbering code
- Relevant critical tests, read as evidence only

No tests were run. No typecheck was run. No build was run. No audit-load was run.

## Pre-Existing Working Tree State

Command run before audit:

`git status --short`

Pre-existing changes:

```text
 M docs/standard/prefix-engine-settings-standard.md
 M src/components/cps/CostPricingSheetEditor.tsx
 M src/components/cps/CostPricingSheetViewPresentations.tsx
 M src/components/cps/CpsMarkupSheet.tsx
 M src/components/pdf/index.ts
 D src/components/pdf/templates/CpsSchedule.tsx
 M src/components/pdf/types.ts
 M src/domain/cps/conversion.ts
 M src/domain/cps/instant-markup.ts
 M src/domain/cps/normalize.ts
 M src/domain/cps/pdfDownloadHandler.ts
 M src/domain/pdf/customization/cps.ts
 M src/domain/pdf/customization/hooks.ts
 M src/domain/prefixConstants.ts
 M src/pages/ViewCps.tsx
 M src/pages/view-cps-actions.ts
 M src/tests/critical/cpsCalculationAuthority.test.js
 M src/tests/critical/cpsConversion.test.js
 M src/tests/critical/cpsInstantMarkup.test.js
 M src/tests/critical/cpsMarkupPresentation.test.js
 M src/tests/critical/cpsPdf.test.js
?? docs/reports/cost-pricing-sheet/2026-10-04-cps-conversion-options-pdf-prefix-production-pass.md
?? docs/reports/cost-pricing-sheet/2026-10-04-cps-instant-markup-stackable-pricing-pass.md
?? src/components/cps/CpsConversionOptionsSheet.tsx
?? src/components/pdf/forme/
?? src/domain/cps/pdfPreferences.ts
?? src/tests/critical/cpsPrefix.test.js
```

These files were treated as pre-existing work. They were not modified by this audit.

## Classification Key

Primary status values:

- EXACT: Production implements the PRD as written.
- EQUIVALENT: Production differs in shape but preserves the requirement and intent.
- EVOLVED: Production intentionally supersedes or extends the PRD.
- IMPROVISED: Production adds behavior without enough evidence that the PRD was superseded.
- CONTRADICTED: Production conflicts with a still-valid requirement.
- MISSING: The PRD requires behavior that production does not implement.
- OBSOLETE-PRD: A PRD statement is stale because later approved work superseded it.
- NOT-APPLICABLE: The requirement no longer applies for an evidenced reason.
- REQUIRES-PRODUCT-DECISION: Evidence is insufficient or contradictory.

Source-of-truth recommendation values:

- KEEP PRD / CHANGE PRODUCTION
- KEEP PRODUCTION / UPDATE PRD
- DOCUMENT PRODUCTION EXTENSION
- REMOVE OBSOLETE PRD REQUIREMENT
- NEEDS PRODUCT DECISION
- NO ACTION REQUIRED

## Traceability Matrix

| PRD Source | Requirement / Contract | Production Evidence | Status | Risk | Source-of-Truth Recommendation | Explanation |
|---|---|---|---|---|---|---|
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 1, 4, 25 | CPS is an internal costing and selling schedule with CP and SP as first-class fields. | `src/domain/cps/types.ts`, `src/domain/cps/calculateCpsTotals.ts`, `src/components/cps/CostPricingSheetEditor.tsx` | EXACT | LOW | NO ACTION REQUIRED | Production keeps CP and SP on CPS rows and uses them through CPS domain helpers. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 4 | Costing uses Decimal helpers. Do not duplicate formulas. | `src/domain/cps/calculateCpsTotals.ts`, `src/domain/cps/instant-markup.ts`, `src/domain/cps/viewData.ts`, `src/domain/cps/pdfDownloadHandler.ts` | EXACT | LOW | NO ACTION REQUIRED | Current code uses `computeCpsTotals` and `computeCpsRowEconomics`. Renderers consume prepared values. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 4.2 | CPS SP maps to shared commercial `unit_price`. | `src/domain/cps/calculations.ts`, `src/domain/cps/conversion.ts`, `src/tests/critical/cpsConversion.test.js` | EXACT | LOW | NO ACTION REQUIRED | Conversion maps `row.sp` to `unit_price`. Tests assert SP is the quotation price authority. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 4, 20 | CP must never reach Quotation. | `src/domain/cps/conversion.ts`, `src/tests/critical/cpsConversion.test.js` | EXACT | HIGH | NO ACTION REQUIRED | The conversion whitelist omits CP and strips CP-like keys from `custom_data`. Tests assert no CP transfer. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 20 and `02-boq-document-lifecycle.md` section 3.2 | Notes and project were originally copied to Quotation. | `src/domain/cps/conversion.ts`, later CPS conversion task requirements, `src/tests/critical/cpsConversion.test.js` | OBSOLETE-PRD | LOW | REMOVE OBSOLETE PRD REQUIREMENT | Later approved work requires CPS notes and site/project context not to transfer. Production follows the later rule. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 15, 20 and `02-boq-document-lifecycle.md` sections 2.5, 4.3 | Quotation conversion trail source must identify the CPS/BOQ source, not Quotation. | `src/domain/cps/conversion.ts`, `src/domain/documentConversion.ts` | CONTRADICTED | HIGH | KEEP PRD / CHANGE PRODUCTION | Current conversion calls `buildTrailLink({ type: 'quotation' })` for the CPS source. The PRD explicitly records this as a known defect. |
| `02-boq-document-lifecycle.md` section 3.6 | Conversion must use an explicit row whitelist and must not spread CPS rows into Quotation rows. | `src/domain/cps/conversion.ts` | EXACT | HIGH | NO ACTION REQUIRED | `ConvertedQuotationItem` is explicitly constructed. Unknown CPS keys are not spread to `quotation_items`. |
| `02-boq-document-lifecycle.md` section 3.8 | Conversion should allocate a normal Quotation number through the Quotation prefix authority. | `src/pages/view-cps-actions.ts`, `src/domain/quotation/normalize.ts`, `src/tests/critical/cpsConversion.test.js` | EXACT | MEDIUM | NO ACTION REQUIRED | Conversion resolves the tenant quotation prefix and calls `getNextQuotationNumber`. Tests cover the prefix path. |
| `02-boq-document-lifecycle.md` section 3.8 | Conversion should avoid orphan Quotation parents on row-write failure. | `src/pages/view-cps-actions.ts` | EQUIVALENT | MEDIUM | DOCUMENT PRODUCTION EXTENSION | Production deletes the parent if row insertion fails. The cursor can still advance, but no orphan parent remains. |
| `02-boq-document-lifecycle.md` section 3 | Conversion options are not part of the original mapping contract. | `src/components/cps/CpsConversionOptionsSheet.tsx`, `src/domain/cps/conversion.ts`, `2026-10-04-cps-conversion-options-pdf-prefix-production-pass.md` | EVOLVED | LOW | KEEP PRODUCTION / UPDATE PRD | Production adds a compact VAT, discount, and extra-charge step before conversion. Evidence shows this was intentional later work. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 21 and `document-transformation-standard.md` section 3 | Duplicate must preserve items, groups, pricing, photos, columns, and structure while shedding identity. | `src/pages/view-cps-actions.ts` | CONTRADICTED | HIGH | KEEP PRD / CHANGE PRODUCTION | `duplicateCpsRecord` fetches and inserts only the `cps_sheets` parent. It does not read or write `cps_rows`. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 22 | CPS lifecycle actions require audit and activity events. | `src/hooks/useCpsSave.ts`, `src/pages/view-cps-actions.ts`, `src/lib/audit.ts` evidence from imports and calls | MISSING | MEDIUM | KEEP PRD / CHANGE PRODUCTION | Save records a generic audit log. Conversion and duplicate do not show the specified CPS LINK/CREATED activity path. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 8, 13 | `cps_rows` should become the single authoritative row store after migration. | `src/domain/cps/normalize.ts`, `src/hooks/useCpsSave.ts` | CONTRADICTED | MEDIUM | NEEDS PRODUCT DECISION | Production persists `custom_fields.table_rows` and also writes `cps_rows`. This is a known split-brain risk in the PRD. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 8, 13 | Row parity fields should move out of opaque cells. | `src/domain/cps/normalize.ts`, `src/tests/critical/cpsNormalize.test.js` | CONTRADICTED | MEDIUM | KEEP PRD / CHANGE PRODUCTION | `denormalizeToDbCpsRow` still stores CP, SP, specification, make, image, and group data through `cells`. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 9, 17 | CPS should migrate from `table-document` to an invoice-like row contract. | `src/domain/cps/types.ts`, `src/domain/table-document/types.ts`, `src/components/cps/CostPricingSheetEditor.tsx` | EQUIVALENT | MEDIUM | NEEDS PRODUCT DECISION | Production still uses `TableDocumentRow` with CPS adapters. Behavior is mostly preserved, but the target architecture is not completed. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 9, 20 | Target row vocabulary is `group_header` and `standard`. | `src/domain/cps/row-operations.ts`, `src/domain/cps/conversion.ts`, `src/domain/cps/viewData.ts` | EQUIVALENT | LOW | DOCUMENT PRODUCTION EXTENSION | CPS storage uses `section` and `item`. Conversion maps sections to Quotation `group_header` rows. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 9, 10 | Group membership derives from `group_id`, not adjacency. | `src/domain/cps/viewData.ts`, `src/domain/cps/row-operations.ts`, `src/tests/critical/cpsRowOperations.test.js`, `src/tests/critical/cpsViewProductionRedesign.test.js` | EXACT | LOW | NO ACTION REQUIRED | Current row operations and View tests preserve non-contiguous group membership. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 9, 10 | Add Line Item creates an ungrouped item unless a group is explicitly selected. | `src/domain/cps/row-operations.ts`, `src/tests/critical/cpsRowOperations.test.js` | EXACT | LOW | NO ACTION REQUIRED | Tests assert grouped and ungrouped insert behavior. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 9 | Group deletion semantics should be stable across presentations. | `src/domain/cps/row-operations.ts`, `src/components/cps/CostPricingSheetForm.tsx`, `2026-10-03-cps-foundation-hardening-report.md` | REQUIRES-PRODUCT-DECISION | MEDIUM | NEEDS PRODUCT DECISION | Reports state mobile/fold ungroups members while desktop remove behavior was not standardized. This remains a product and implementation decision. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 10, 17 | JSON Import must support CPS groups in Add mode and avoid silent invalid grouping. | `src/domain/cps/importAdapter.ts`, `src/tests/critical/cpsImportView.test.js`, `src/tests/critical/jsonGroupImport.test.js` | EQUIVALENT | MEDIUM | NO ACTION REQUIRED | CPS has a dedicated import adapter and prompt rules. Evidence shows explicit group handling. |
| `01-cost-pricing-sheet-product-domain-architecture.md` sections 7, 17 | Columns must use shared column infrastructure with CPS built-ins and CP/SP semantics. | `src/components/cps/CostPricingSheetEditor.tsx`, `src/domain/table-document/templateRegistry.ts`, `src/components/useInvoiceColumns.tsx` by import use | EQUIVALENT | LOW | DOCUMENT PRODUCTION EXTENSION | Production uses shared column hooks with CPS built-ins. It does not fully match the planned file names but keeps the behavior. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 6 | Sub Description is a per-item field, not a dynamic column. | `src/components/cps/CostPricingSheetEditor.tsx`, `src/domain/cps/normalize.ts` | EXACT | LOW | NO ACTION REQUIRED | Sub Description is carried as row specification/sub-description data. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 11 | Photos use the shared image upload policy and persist to row image data. | `src/components/cps/CostPricingSheetEditor.tsx`, `src/domain/cps/normalize.ts`, `src/domain/cps/pdfDownloadHandler.ts` | EXACT | LOW | NO ACTION REQUIRED | The editor uses shared upload handling and rows carry `image_url`. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` sections 2, 8 | Form presentation must render prepared state and must not own persistence, numbering, or calculations. | `src/components/cps/CostPricingSheetEditor.tsx`, `src/components/cps/CostPricingSheetForm.tsx`, `src/domain/cps/calculateCpsTotals.ts` | EQUIVALENT | MEDIUM | DOCUMENT PRODUCTION EXTENSION | The editor/controller owns production wiring. The mobile/fold presentation has local buffers, but commit boundaries return to the editor/domain path. |
| `02-boq-document-lifecycle.md` section 1.4 | Save strategy `buildPayload` should not call totals helpers; totals should arrive precomputed. | `src/hooks/useCpsSave.ts` | EQUIVALENT | LOW | DOCUMENT PRODUCTION EXTENSION | Production computes authoritative costing in the save strategy before persistence. This differs by placement but does not duplicate formulas. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 14 and prefix standard | CPS number generation must use the prefix engine and tenant settings. | `src/domain/prefixConstants.ts`, `src/domain/cps/normalize.ts`, `src/pages/CpsFormPage.tsx`, `src/tests/critical/cpsPrefix.test.js` | EXACT | MEDIUM | NO ACTION REQUIRED | Current default is `CPS`. Tenant custom prefixes remain supported. Historical BOQ/SASBOQ numbers are not rewritten. |
| `01-cost-pricing-sheet-product-domain-architecture.md` and old BOQ docs | BOQ was the default naming model. | `src/domain/prefixConstants.ts`, `src/tests/critical/cpsPrefix.test.js`, recent prefix report | OBSOLETE-PRD | LOW | REMOVE OBSOLETE PRD REQUIREMENT | Production has moved to CPS naming while keeping legacy historical numbers valid. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 23 | Export should use the real row table and not a missing `boq_items` table. | `src/utils/exportCompilers.ts`, `src/services/exportFetchers.ts` by source search | EXACT | MEDIUM | NO ACTION REQUIRED | Current source references CPS row data rather than a missing BOQ item table. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` sections 3, 4 | View candidate was unresolved and production View work was blocked until a design decision. | `src/pages/ViewCps.tsx`, `src/components/cps/CostPricingSheetViewPresentations.tsx`, recent View reports | OBSOLETE-PRD | INFORMATIONAL | REMOVE OBSOLETE PRD REQUIREMENT | Later approved production screenshots superseded the old candidate gate. The retired HTML baseline is no longer design authority. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` sections 3, 6 | View must consume prepared values and show totals, groups, photos, and actions. | `src/domain/cps/viewData.ts`, `src/components/cps/CostPricingSheetViewPresentations.tsx` | EQUIVALENT | LOW | DOCUMENT PRODUCTION EXTENSION | View uses `buildCpsViewData` and domain calculations. It has evolved visually beyond the PRD candidate notes. |
| Recent View reports and current production baseline | CPS View must use real Mobile Bottom Nav, separated palette and More actions, action row, themed FAB, and no fake nav. | `src/pages/ViewCps.tsx`, `src/components/cps/CostPricingSheetViewPresentations.tsx`, `src/tests/critical/cpsViewProductionRedesign.test.js` | EVOLVED | LOW | KEEP PRODUCTION / UPDATE PRD | These are newer approved production decisions and should be folded into the PRD. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` section 5 | CPS PDF renderer must be pdfcn Forme, not React-PDF. | `src/components/pdf/index.ts`, `src/components/pdf/forme/CpsFormeDocument.tsx`, `src/domain/cps/pdfDownloadHandler.ts`, `src/tests/critical/cpsPdf.test.js` | EXACT | HIGH | NO ACTION REQUIRED | Active CPS PDF generation uses Forme. The deleted React-PDF CPS template is not active. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` section 5.4 | PDF templates must not calculate prices or query Supabase. | `src/components/pdf/forme/CpsFormeDocument.tsx`, `src/tests/critical/cpsPdf.test.js` | EXACT | HIGH | NO ACTION REQUIRED | Template tests check that the Forme template does not contain calculation calls. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` sections 5, 6 | View and PDF should consume one prepared model. | `src/domain/cps/viewData.ts`, `src/domain/cps/pdfDownloadHandler.ts` | EQUIVALENT | MEDIUM | DOCUMENT PRODUCTION EXTENSION | Both paths use CPS domain rows and calculations, but they have separate prepared-model builders. This preserves values but not a single shared model. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` section 5.4 | PDF column visibility should use `getPdfColumns` and `getPdfCellValue`. | `src/domain/cps/pdfDownloadHandler.ts`, `src/tests/critical/cpsPdf.test.js` | EQUIVALENT | LOW | DOCUMENT PRODUCTION EXTENSION | Production uses CPS-specific visible column resolution. It preserves CP/SP behavior, but does not directly use the named shared helpers. |
| CPS PDF implementation pass and PDF PRD default | One initial CPS template should be connected unless architecture requires a registry. | `src/domain/cps/pdfPreferences.ts`, `src/components/pdf/forme/CpsFormeDocument.tsx`, `src/tests/critical/cpsPdf.test.js` | IMPROVISED | MEDIUM | NEEDS PRODUCT DECISION | Current production exposes `schedule` and `compact` templates. A later test expects both. The PRD does not clearly authorize two initial templates. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` section 5.3 | CPS customization remains document-font-only. | `src/domain/pdf/customization/cps.ts`, `src/components/cps/CostPricingSheetViewPresentations.tsx`, `src/tests/critical/cpsPdf.test.js` | EVOLVED | LOW | KEEP PRODUCTION / UPDATE PRD | Production supports document font, accent color, orientation, and template selection. Later tests document the broader capability. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` section 3.1 | View Download and FAB should use the PDF download authority. | `src/pages/ViewCps.tsx`, `src/domain/cps/pdfDownloadHandler.ts`, `src/tests/critical/cpsPdf.test.js` | EXACT | MEDIUM | NO ACTION REQUIRED | View actions and FAB converge on `handleDownloadCpsPdf`. |
| `01-cost-pricing-sheet-product-domain-architecture.md` and older markup expectations | Instant Markup was initially CP-derived. | `src/domain/cps/instant-markup.ts`, `src/components/cps/CostPricingSheetEditor.tsx`, `src/tests/critical/cpsInstantMarkup.test.js`, `2026-10-04-cps-instant-markup-stackable-pricing-pass.md` | EVOLVED | MEDIUM | KEEP PRODUCTION / UPDATE PRD | Current production uses stackable current-SP pricing. The later report shows this was an approved semantic change. |
| Stackable Instant Markup pass | Markup reset must wipe working SP to zero and Undo Reset must restore a snapshot. | `src/domain/cps/instant-markup.ts`, `src/components/cps/CostPricingSheetEditor.tsx`, `src/components/cps/CpsMarkupSheet.tsx`, `src/tests/critical/cpsMarkupPresentation.test.js` | EXACT | MEDIUM | NO ACTION REQUIRED | Production has separate reset and post-apply undo state. Tests assert the state separation. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 17 | Shared calculation engine must not be modified for CPS CP. | `src/lib/Calculations.ts`, `src/domain/cps/calculations.ts` | EXACT | HIGH | NO ACTION REQUIRED | CPS maps SP to `unit_price` and delegates commercial totals. CP stays in CPS helpers. |
| `01-cost-pricing-sheet-product-domain-architecture.md` section 17 | Group commercial metadata should reuse Quotation group semantics. | `src/domain/cps/calculations.ts`, `src/domain/cps/conversion.ts` | EQUIVALENT | LOW | DOCUMENT PRODUCTION EXTENSION | Conversion carries group metadata. `computeCpsCommercialView` maps item `group_id` as null, so shared commercial grouping is not used for CPS view totals. |
| `03-cost-pricing-sheet-implementation-readiness-roadmap.md` and `waterfall-roadmap.html` | Implementation was originally gated by schema, View, and Forme readiness. | Current code under `src/domain/cps`, `src/pages/ViewCps.tsx`, `src/components/pdf/forme/` | EVOLVED | INFORMATIONAL | KEEP PRODUCTION / UPDATE PRD | Production has moved beyond the readiness roadmap. The roadmap should be treated as historical unless updated. |

## Product And Domain Model

Current production implements the core CPS product identity.

Implemented exactly:

- CPS owns CP and SP.
- CP is internal to CPS.
- SP is the commercial price used when data enters the Quotation domain.
- Total cost, selling total, gross profit, row profit, and margin use CPS domain calculation helpers.
- Decimal-based calculation remains in the domain layer.

Implemented differently:

- Production still uses `TableDocumentRow` with `section` and `item`.
- The PRD target prefers invoice-like rows with `group_header` and `standard`.
- Production maps to the target shape at the conversion boundary.

Main mismatch:

- The row-store migration is incomplete. Production writes both parent `custom_fields.table_rows` and child `cps_rows`.
- `cps_rows` still carries much row detail inside the `cells` JSON object.
- The PRD expects a single authoritative row store with parity columns.

This is not a user-facing failure by itself, but it is a persistence architecture risk.

## Responsive Form Architecture

The PRD expected a consolidated page controller with dedicated CPS form UI.

Production now has:

- `src/pages/CpsFormPage.tsx` as the consolidated form page.
- `src/pages/NewCps.tsx` and `src/pages/EditCps.tsx` as thin delegators.
- `src/components/cps/CostPricingSheetEditor.tsx` as the main controller.
- Desktop and mobile/fold presentations under CPS components.

This is an equivalent implementation of the PRD structure.

The mobile/fold form has evolved from prototype transplant work. Reports show that local prototype authority was removed in stages and replaced with production state and domain wiring. Some presentation comments still reflect its source history, but active production state now flows through the editor/controller.

## Groups

Implemented exactly:

- Group identity derives from `group_id`.
- Non-contiguous membership is supported.
- Add Line Item creates an ungrouped row.
- Add Item to Group assigns the explicit group id.
- View group count, rendered members, and subtotal use one membership set.
- Conversion carries group headers and member `group_id`.
- PDF model preparation derives groups from the same CPS row membership.

Requires product decision:

- Group deletion semantics are not fully reconciled across form presentations. Prior reports state mobile/fold deletes a group by ungrouping members. The desktop/domain `removeCpsRow` removes only the row at an index. This can be safe after normalization, but the product rule is not explicit enough.

No evidence was found that current View group rendering violates the repaired membership invariant.

## Instant Markup

The current Instant Markup implementation is a legitimate product evolution.

Old PRD position:

- Markup was originally described as CP-derived.

Current production position:

- Markup is current-SP stackable.
- Percentage operation: new SP = current SP times `(1 + percentage / 100)`.
- Fixed operation: new SP = current SP plus the fixed value.
- CP does not change.
- Preview compares current working SP to proposed next SP.
- Reset zeros working SP values.
- Undo Reset restores a captured pre-reset snapshot.
- Post-Apply undo remains a separate form-level undo state.

Evidence:

- `src/domain/cps/instant-markup.ts`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CpsMarkupSheet.tsx`
- `src/tests/critical/cpsInstantMarkup.test.js`
- `src/tests/critical/cpsMarkupPresentation.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-instant-markup-stackable-pricing-pass.md`

Recommendation:

- Keep production.
- Update the PRD to make stackable current-SP pricing normative.

## CPS View

The PRD View candidate section is obsolete.

The PRD originally left the View candidate unresolved and blocked production implementation until a later decision. Later approved work retired the old HTML candidates and made current production screenshots the active visual authority.

Current View production implements:

- Real application `Layout` and `MobileBottomNav`.
- No CPS-local fake bottom navigation.
- Top app bar with Back, number, status, Share, palette, and More.
- Separate document actions: Convert to Quote, Edit, Download.
- Palette and More as separate authorities.
- More Actions without Approve sheet.
- Company, client, and document title identity blocks.
- Group containers without generated Group A/B labels or END OF GROUP labels.
- Theme-aware FAB and action surfaces.
- Normal scroll ownership through the app layout.

This is EVOLVED relative to the PRD. The PRD should be updated to describe the approved production View contract.

## CPS To Quotation Conversion

Current conversion is mostly aligned with the valid commercial contract.

Implemented exactly:

- CPS SP becomes Quotation `unit_price`.
- CP does not transfer.
- CPS notes do not transfer under later approved rules.
- CPS site/project context does not transfer under later approved rules.
- Group headers and group membership transfer.
- Source row order is preserved.
- Quotation number allocation uses the normal Quotation prefix authority.
- Direct Convert and More Convert share the same authority through ViewCps actions.
- A parent Quotation is deleted if child row insertion fails.

Evolved:

- A compact commercial-options step now controls VAT, discount, and extra charges before conversion. The original PRD did not describe this. It should be documented as the new product contract.

Contradicted:

- The conversion trail labels the CPS source as `quotation`. The PRD requires a CPS/BOQ source type. The shared `buildTrailLink` type currently only accepts `invoice` and `quotation`, so the current code uses the wrong type instead of widening the lineage contract.

This lineage mismatch is a real contraindication.

## PDF Architecture

Active CPS PDF production follows the PRD renderer decision in the main points.

Implemented exactly:

- CPS uses Forme through `@formepdf/core` and `@formepdf/react`.
- CPS does not use a React-PDF CPS template.
- The CPS Forme template receives prepared model data.
- The template does not call calculation helpers or Supabase.
- Download surfaces route to the CPS Forme handler.

Implemented differently:

- View and PDF do not literally consume one shared prepared model. View uses `buildCpsViewData`; PDF uses `buildCpsFormeModel`.
- Both use the same CPS rows and calculation authorities, so value parity intent is preserved.

Improvised or needs decision:

- Current CPS PDF preferences expose two templates: `schedule` and `compact`.
- A recent implementation report described one initial production template.
- Current tests now assert both templates.
- This can be a valid product evolution, but the PRD and reports do not clearly record the approval boundary.

Customization evolution:

- The PRD describes document-font-only customization.
- Production now supports document font, accent color, orientation, and template selection.
- This should be written into the PRD if approved.

React-PDF remnants:

- Invoice and Quotation still use React-PDF paths.
- No active CPS React-PDF renderer path was identified.
- The old CPS React-PDF template file is deleted in the current working tree.

## Prefix And Numbering

Production has moved past the BOQ-era prefix assumptions.

Current intended policy:

- Canonical CPS default prefix is `CPS`.
- Reset target is `CPS`.
- Reset starts at `CPS-000001`.
- Custom tenant prefixes remain supported.
- Historical `BOQ` and `SASBOQ` numbers are not rewritten.

Evidence:

- `src/domain/prefixConstants.ts`
- `src/domain/cps/normalize.ts`
- `src/pages/CpsFormPage.tsx`
- `src/tests/critical/cpsPrefix.test.js`
- `docs/standard/prefix-engine-settings-standard.md`

The PRD still contains BOQ-era naming in several sections. That is documentation debt, not a production defect.

## Supporting Form Features

Client:

- Production uses saved client snapshot/name authority in View and conversion.
- This is aligned with the snapshot model.

Columns:

- Production uses shared column infrastructure with CPS built-ins.
- It is equivalent to the PRD, but the implementation still uses `table-document` wrappers.

JSON Import:

- Production has a CPS import adapter with group support.
- This is aligned in behavior.

Photos:

- Production uses shared image upload policy and row `image_url`.
- This is aligned.

Clear All:

- Production exposes Clear All through the editor/form flow.
- No PRD contradiction was identified.

Notes:

- CPS notes remain CPS data and PDF data.
- Notes are intentionally excluded from Quotation conversion under later approved work.

Totals:

- Production uses domain calculations.
- No renderer-owned financial formula was identified.

Save:

- Save uses `useCpsSave`, `useDocumentSave`, `withUniqueRetry`, and child-row persistence.
- Main open issue is split row storage.

FAB:

- View Download FAB is themed and wired to the CPS PDF handler.

Theme Manager:

- View and form use Theme Manager token paths in many production surfaces.
- Some CPS CSS still contains local semantic colors for cost and selling values. That is not an immediate PRD violation, but it should be documented if full Theme Manager ownership is a product goal.

## Contraindications

### 1. Conversion Trail Mislabels CPS Source

Current behavior:

- `mapCpsToQuotation` writes `conversionTrail.source` with `type: 'quotation'` for the CPS source.

Conflicting authority:

- `01-cost-pricing-sheet-product-domain-architecture.md` sections 15 and 20.
- `02-boq-document-lifecycle.md` section 4.3.
- `document-transformation-standard.md` lineage identity rules.

Why both cannot safely coexist:

- A Quotation converted from CPS must identify CPS as the source.
- Labeling the source as Quotation corrupts lineage semantics.
- Downstream audit, display, and recovery surfaces can misread the conversion chain.

Severity:

- HIGH

Recommended authority to preserve:

- Preserve the PRD and transformation standard. Change production lineage typing and source trail construction.

### 2. CPS Duplicate Loses Child Rows

Current behavior:

- `duplicateCpsRecord` duplicates only the `cps_sheets` parent row.
- It does not duplicate `cps_rows`.

Conflicting authority:

- `document-transformation-standard.md` Duplicate Law.
- `01-cost-pricing-sheet-product-domain-architecture.md` section 21.
- `02-boq-document-lifecycle.md` section 5.

Why both cannot safely coexist:

- A duplicate must preserve item work, pricing, groups, columns, photos, and structure.
- Parent-only duplication destroys the work that duplication exists to preserve.

Severity:

- HIGH

Recommended authority to preserve:

- Preserve the Duplicate Law and PRD. Change production duplicate behavior.

### 3. Split Row Store Remains Active

Current behavior:

- CPS saves row data in `custom_fields.table_rows` and also in `cps_rows`.
- Detailed row fields still live inside child-row `cells`.

Conflicting authority:

- `01-cost-pricing-sheet-product-domain-architecture.md` row-store migration sections.
- The PRD risk register identifies split-brain row stores as a medium risk.

Why both cannot safely coexist:

- Two row authorities can diverge.
- Normalization order can hide defects until save or reload.

Severity:

- MEDIUM

Recommended authority to preserve:

- Preserve the single-authoritative-row-store target unless product explicitly accepts the compatibility store as permanent.

### 4. Audit Event Coverage Is Incomplete

Current behavior:

- Save uses a generic audit log path.
- Specific CPS lifecycle activity events for conversion, duplicate, and price-state lineage were not identified.

Conflicting authority:

- `01-cost-pricing-sheet-product-domain-architecture.md` section 22.
- `02-boq-document-lifecycle.md` section 6.
- `document-transformation-standard.md` audit event rules.

Why both cannot safely coexist:

- CPS changes, conversion, and duplication must be explainable after the fact.
- Missing lifecycle events weaken audit history.

Severity:

- MEDIUM

Recommended authority to preserve:

- Preserve the audit contract and implement CPS-specific audit coverage in a later code task.

## CPS Evolution Register

| Evolution | Original PRD Position | Current Production Position | Evidence | Should New Behavior Become Normative | PRD Sections To Update |
|---|---|---|---|---|---|
| Stackable Instant Markup | CP-derived one-shot markup. | Current-SP stackable markup with workspace state. | `src/domain/cps/instant-markup.ts`, stackable markup report. | Yes. | Product/domain and presentation sections for Instant Markup. |
| Reset-to-zero and Undo Reset | Not specified. | Destructive reset plus one immediate snapshot undo. | `CpsMarkupSheet.tsx`, `CostPricingSheetEditor.tsx`, markup tests. | Yes. | Instant Markup workflow section. |
| Production CPS View | View candidate unresolved and old HTML candidates gated. | Current production screenshots and later reports are the design baseline. | View reports and current View source. | Yes. | View architecture and candidate sections. |
| Real Mobile Bottom Nav and shared FAB | Old candidate/nav details were unresolved. | CPS View uses the real app shell and shared FAB standard. | `ViewCps.tsx`, View tests. | Yes. | View responsive expectations. |
| Conversion options step | Not specified. | User confirms VAT, discount, and extra charges before conversion. | `CpsConversionOptionsSheet.tsx`, conversion report. | Yes, if product accepts it. | Conversion mapping section. |
| CPS prefix default | BOQ-era naming remains in PRD. | Default prefix is `CPS`; legacy numbers remain historical. | prefix standard, `prefixConstants.ts`, prefix tests. | Yes. | Numbering and prefix sections. |
| Forme CPS PDF | PRD selected Forme but marked it gated. | CPS has an active Forme download path. | `pdfDownloadHandler.ts`, `components/pdf/forme`, PDF tests. | Yes. | PDF readiness and implementation sections. |
| CPS PDF customization breadth | Document-font-only. | Font, accent, orientation, and template controls. | CPS customization source and PDF tests. | Needs product decision. | PDF customization section. |
| Two CPS PDF templates | One initial template implied by recent implementation request. | `schedule` and `compact` are both exposed. | `pdfPreferences.ts`, PDF tests. | Needs product decision. | PDF template section. |

## PRD Debt Register

| PRD Location | Stale Statement | Current Approved Behavior | Evidence | Recommended Documentation Change |
|---|---|---|---|---|
| Whole PRD package and legacy BOQ files | BOQ names are the primary product identity. | CPS is now canonical. BOQ/SASBOQ numbers are historical. | `prefixConstants.ts`, CPS prefix tests. | Rename active normative text to CPS and mark BOQ files as historical references. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` section 4 | View Page candidate unresolved. | Production View is active and old HTML candidates are retired. | Recent View reports and current source. | Replace candidate gate with current production View contract. |
| Conversion mapping sections | Notes and project copy to Quotation. | Later approved work excludes CPS notes and site/project context. | `conversion.ts`, conversion tests. | Remove or retire the old copy requirement. |
| Instant Markup sections | CP-derived markup model. | Current-SP stackable model. | Stackable markup source and report. | Write the stackable pricing contract. |
| PDF customization section | Document-font-only customization. | Production exposes font, accent, orientation, and template selection. | CPS PDF tests and customization source. | Decide and document approved customization scope. |
| PDF template sections and reports | One initial CPS PDF template. | Current code exposes two templates. | `pdfPreferences.ts`, PDF tests. | Decide whether two templates are now normative. |
| Row-store migration sections | `cps_rows` parity store is the single row authority. | Production still writes parent snapshot and `cells`. | `normalize.ts`, `useCpsSave.ts`. | Either keep the target and track implementation debt, or document the compatibility design. |
| Audit sections | CPS-specific audit and activity events exist. | Only generic audit evidence was identified. | `useCpsSave.ts`, View actions. | Keep the requirement and track implementation work. |

## Implementation Debt Register

| Requirement | Current Implementation | Consequence | Recommended Future Implementation Action | Priority |
|---|---|---|---|---|
| Correct CPS lineage in converted Quotation. | Conversion trail source uses `type: 'quotation'`. | Wrong source type can corrupt audit and document lineage. | Widen trail type to include CPS/BOQ and write the correct source type. | HIGH |
| Duplicate must preserve rows and structure. | `duplicateCpsRecord` inserts only the parent CPS row. | Duplicate loses items, groups, CP/SP, photos, and row work. | Rewrite duplicate to copy child rows and permitted settings while clearing identity. | HIGH |
| Single authoritative row store. | Parent `custom_fields.table_rows` and child `cps_rows` both carry row data. | Row sources can diverge. | Complete the row-store migration or document the compatibility layer as permanent. | MEDIUM |
| Parity child-row persistence. | `cps_rows` still stores key fields in `cells`. | Schema-level query and audit clarity remain limited. | Move supported row fields to explicit child-row columns if schema supports it. | MEDIUM |
| CPS lifecycle audit events. | Dedicated conversion, duplicate, and row-price audit events were not identified. | Audit cannot fully explain CPS lifecycle events. | Implement CPS audit emitters and activity events. | MEDIUM |
| Group delete product rule. | Mobile/fold and desktop paths have different deletion semantics. | Users can get different behavior by device or view path. | Define one group-delete rule and apply it across presentations. | MEDIUM |
| Shared View/PDF prepared model. | View and PDF build separate models over the same domain data. | Parity depends on parallel builders. | Consider one CPS prepared model if parity drift appears. | LOW |
| PDF column helper parity. | CPS PDF uses CPS-specific column resolution. | Shared PDF column rules can drift. | Adopt shared helpers or document why CPS requires its own resolver. | LOW |
| Two CPS PDF templates. | Production exposes `schedule` and `compact`. | Product intent is unclear against prior one-template direction. | Decide whether both templates remain. | MEDIUM |

## Contraindication Summary

Architectural contraindications identified:

1. CPS conversion trail mislabels the source as Quotation.
2. CPS duplicate loses child rows and conflicts with the Duplicate Law.
3. CPS row persistence still has two active row authorities.
4. CPS audit event coverage does not satisfy the documented lifecycle contract.

No calculation-authority contraindication was identified.

No active CPS React-PDF renderer contraindication was identified.

No hosted database mutation was performed.

## Final Verdict

1. Is current CPS production substantially PRD-compliant?

Yes for core financial behavior, groups, conversion row mapping, prefix policy, View production behavior, and PDF renderer choice. No for duplicate, lineage source type, row-store migration completion, and audit event completeness.

2. Which parts are exact?

Core CP/SP ownership, Decimal costing, SP to Quotation `unit_price`, CP exclusion from Quotation, group membership by `group_id`, non-contiguous group support, prefix default `CPS`, Quotation numbering during conversion, Forme CPS PDF renderer, and renderer no-calculation boundaries.

3. Which parts are equivalent but implemented differently?

The form controller architecture, CPS row vocabulary, column infrastructure, View/PDF value parity, PDF column resolution, and save calculation placement are equivalent in behavior but not identical to the PRD wording.

4. Which parts have legitimately evolved beyond the PRD?

Stackable Instant Markup, Reset-to-zero and Undo Reset, production CPS View design, real Mobile Bottom Nav, Theme Manager View actions, conversion options, CPS prefix policy, active Forme PDF, and expanded PDF customization appear to be approved evolution.

5. Which parts are undocumented improvisations?

Two active CPS PDF templates are the clearest improvisation. Current tests expect both, but the earlier implementation direction and report language do not clearly authorize two templates as the product standard.

6. Which still-valid PRD requirements are contradicted?

Conversion lineage source typing, Duplicate Law behavior, single row-store target, row parity persistence, and CPS audit event coverage are contradicted or missing.

7. Which requirements are missing?

Dedicated CPS audit/activity events and full duplicate behavior are missing. The single authoritative row-store migration is incomplete.

8. Which PRD sections are now obsolete?

The View candidate gate, BOQ-era naming assumptions, CP-derived markup assumptions, and old conversion requirements that copied notes/project to Quotation are obsolete.

9. Are there architectural contraindications?

Yes. The strongest are wrong conversion lineage type and parent-only duplicate. Both conflict with shared document transformation and audit expectations.

10. Should the next action be fix production, update the PRD, both, or neither?

Both.

Recommended next order:

1. Fix production defects that break still-valid contracts: conversion lineage, duplicate behavior, audit event coverage, and row-store authority.
2. Update the PRD to document approved product evolution: stackable markup, current View contract, conversion options, CPS prefix policy, Forme PDF status, and PDF customization scope.
3. Make product decisions on two CPS PDF templates and group-delete behavior before implementation work continues there.

## Verification

Commands run:

- `git status --short`: completed before audit work.
- `git diff --check -- docs/reports/cost-pricing-sheet/2026-10-04-cps-prd-production-reconciliation-audit.md`: passed.
- `git diff -- docs/reports/cost-pricing-sheet/2026-10-04-cps-prd-production-reconciliation-audit.md`: returned no patch because the report is a new untracked file.
- `git diff --no-index -- NUL docs/reports/cost-pricing-sheet/2026-10-04-cps-prd-production-reconciliation-audit.md`: inspected the new-file patch. Git returned exit code 1 because a diff exists. That is expected for `--no-index`.
- `git status --short`: completed after report creation.

Post-audit status:

```text
 M docs/standard/prefix-engine-settings-standard.md
 M src/components/cps/CostPricingSheetEditor.tsx
 M src/components/cps/CostPricingSheetViewPresentations.tsx
 M src/components/cps/CpsMarkupSheet.tsx
 M src/components/pdf/index.ts
 D src/components/pdf/templates/CpsSchedule.tsx
 M src/components/pdf/types.ts
 M src/domain/cps/conversion.ts
 M src/domain/cps/instant-markup.ts
 M src/domain/cps/normalize.ts
 M src/domain/cps/pdfDownloadHandler.ts
 M src/domain/pdf/customization/cps.ts
 M src/domain/pdf/customization/hooks.ts
 M src/domain/prefixConstants.ts
 M src/pages/ViewCps.tsx
 M src/pages/view-cps-actions.ts
 M src/tests/critical/cpsCalculationAuthority.test.js
 M src/tests/critical/cpsConversion.test.js
 M src/tests/critical/cpsInstantMarkup.test.js
 M src/tests/critical/cpsMarkupPresentation.test.js
 M src/tests/critical/cpsPdf.test.js
?? docs/reports/cost-pricing-sheet/2026-10-04-cps-conversion-options-pdf-prefix-production-pass.md
?? docs/reports/cost-pricing-sheet/2026-10-04-cps-instant-markup-stackable-pricing-pass.md
?? docs/reports/cost-pricing-sheet/2026-10-04-cps-pdf-customization-completion-pass.md
?? docs/reports/cost-pricing-sheet/2026-10-04-cps-prd-production-reconciliation-audit.md
?? src/components/cps/CpsConversionOptionsSheet.tsx
?? src/components/pdf/forme/
?? src/domain/cps/pdfPreferences.ts
?? src/tests/critical/cpsPrefix.test.js
```

Only `docs/reports/cost-pricing-sheet/2026-10-04-cps-prd-production-reconciliation-audit.md` was created by this audit. The other modified and untracked paths are pre-existing or concurrent work and were not changed by this audit.

Commands not run by requirement:

- `bun run build`: forbidden for this audit.
- `bun run typecheck`: forbidden for this audit.
- `bun run lint`: forbidden for this audit.
- `bun run test`: forbidden for this audit.
- `bun run audit:load`: forbidden for this audit.
- Supabase migration or push: not applicable.

## Risks And Limitations

- This audit inspected current source and tests as evidence. It did not execute the app.
- It did not validate runtime screens on a phone.
- Pre-existing uncommitted code changes were treated as current implementation reality because the audit request asks for current production/source reconciliation.
- Reports were treated as chronology evidence, not automatic authority.
- Where reports and current code differ, current code was used as the implementation fact.

## Deferred Work

- Update the CPS PRD after product decisions are confirmed.
- Fix production lineage source typing.
- Fix CPS duplicate behavior.
- Complete or explicitly document the row-store migration boundary.
- Add CPS lifecycle audit events.
- Decide whether two CPS PDF templates are approved.
- Decide the uniform group-delete rule.
