# CPS View Composition Pass 4 Report

This report was written by Codex on 2026-10-04 via Codex Desktop.

## Objective

Implement CPS View Production Composition Pass 4.

The scope was limited to three changes:

- Separate company identity, client identity, and CPS document identity.
- Improve the CPS action row while keeping the order Convert to Quote, Edit, Download.
- Remove the remaining group-specific horizontal gutter at the layout owner.

The Quotation View screenshot was used as a production reference for information architecture only. CPS was not converted into the Quotation View design.

## Scope

This pass changed presentation only.

It did not change:

- CPS conversion behavior.
- CPS download business behavior.
- CPS calculation logic.
- CPS save logic.
- CPS group membership logic.
- FAB implementation.
- Mobile Bottom Nav implementation.
- Palette and More separation.

## Screenshots Inspected

- CPS runtime screenshot from the user.
- Quotation View runtime screenshot from the user.

The screenshots were used as runtime evidence. The Quotation screenshot was not used as a design to copy.

## Skills Used

Skills used: frontend-design, react-dev, karpathy, systematic-debugging, safe-area-handling

Documentation standard: ASD-STE100 Simplified Technical English

## Quotation View Files Inspected

- `src/pages/ViewQuotation.tsx`
- `src/components/document-view/quotation/QuotationActionRow.module.css`
- `src/components/document-view/quotation/QuotationDocumentPreview.tsx`
- `src/components/document-view/quotation/QuotationViewPage.tsx`
- `src/components/document-view/shared/DocumentActionButtons.tsx`
- `src/components/document-view/shared/DocumentActionButtons.module.css`

## Quotation Principles Reused

The Quotation View separates these responsibilities:

- Company brand block.
- Document title and metadata.
- Client information.
- Direct actions.

CPS now uses the same separation principle.

## Quotation Choices Not Copied

CPS did not copy:

- The Quotation header layout.
- The Quotation Convert to Invoice button geometry.
- The Quotation typography scale.
- The Quotation preview cards.
- Quotation business labels or semantics.

## Previous CPS Identity Hierarchy

The previous CPS identity area rendered company, client, and document title in one vertical cluster:

- Company logo.
- Company name.
- Client name.
- CPS title.

This made the concepts read as one identity block.

## Final CPS Identity Hierarchy

CPS now renders three explicit regions:

- Company: tenant logo and tenant company name.
- Client: saved client name and optional saved context.
- Document: CPS document title.

The client region appears before the document region.

## Identity Authorities

Company logo authority:

- `resolveCanonicalLogoUrl(settings)`.

Company name authority:

- `settings.company_name`.

Client authority:

- Saved `client_snapshot.name`.
- Then `document.client_name`.
- Then `No client`.

Document title authority:

- `document.title`.
- Then `Untitled Cost & Pricing Sheet`.

Optional context authority:

- Saved `client_snapshot.contact_person`.
- Saved document project/site value when present.

No live client fetch was added.

## Action Row Before and After

Before:

- Convert to Quote had a separate treatment that still read as unresolved.
- Edit and Download used soft controls.

After:

- Order remains Convert to Quote, Edit, Download.
- The row remains a stable three-column action family.
- Convert uses a document-conversion icon and a theme-derived emphasized surface.
- Edit and Download use the same family geometry and icon capsule.

## Convert to Quote Design Rationale

The new Convert treatment gives priority without making it a large slab.

The icon source is Lucide `FileOutput`.

The button uses Theme Manager tokens:

- `--bd-button-primary-bg`
- `--bd-button-primary-text`
- `--bd-action-icon-bg`
- `--bd-surface-action`
- `--bd-surface-action-border`

No screenshot orange was hardcoded.

## Behavior Freeze

Convert to Quote still opens the same confirm flow used by More Actions.

The conversion engine was not repaired.

Edit still uses the existing edit callback.

Download still uses the existing direct action row behavior.

Download/PDF wiring was not implemented.

## Group Width Root Cause

The remaining group gutter came from the mobile width chain:

- `.cps-view-wrap` had no horizontal content padding.
- `.cps-dossier` and `.cps-summary` each supplied their own side spacing.
- `.cps-doc` supplied a separate side margin for the row and group region.

The prior margin reduction did not remove the gutter because the group-specific owner was still `.cps-doc`.

## Group Width Correction

The mobile wrapper now owns the single canonical content boundary:

- `.cps-view-wrap { padding: 8px 20px 24px; }`

Chrome rows that must align with the page edge opt out:

- `.cps-view-wrap .cps-view-appbar { margin: 0 -20px; }`
- `.cps-view-wrap .cps-doc-actions { margin: 0 -20px; }`

Content sections now use the wrapper width:

- `.cps-view-wrap .cps-dossier { padding: 16px 0 4px; }`
- `.cps-view-wrap .cps-summary { margin: 14px 0 0; }`
- `.cps-view-wrap .cps-doc { margin: 14px 0 0; }`

The group shell now uses 100% of the normal CPS document-content width.

## Group Semantics

`buildCpsViewSegments()` was not changed.

Group membership semantics were not changed.

The pass preserved:

- Normalized `groupId` authority.
- Count/member/subtotal authority.
- Non-contiguous membership.
- Source row order.
- Ungrouped rows.

## Frozen Areas

FAB implementation was frozen.

These files were not changed by this pass:

- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`

Mobile Bottom Nav was frozen.

Palette and More separation remains:

- Palette opens CPS customization.
- More opens CPS More Actions.

`Approve sheet` remains absent.

## Files Changed

This pass changed:

- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/tests/critical/cpsViewProductionRedesign.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-composition-pass-4.md`

The repository had pre-existing modified and untracked files before this pass.

## Tests Added or Updated

Updated:

- `src/tests/critical/cpsViewProductionRedesign.test.js`

The test now checks:

- Convert action token treatment.
- `FileOutput` conversion icon.
- Wrapper-owned mobile content width.
- No extra `.cps-doc` group gutter.
- Explicit company, client, and document identity regions.

## Verification

- Targeted tests: passed.
- `bun run typecheck`: passed.
- `git diff --check`: passed with line-ending warnings only.
- `git status --short`: shows pre-existing repository changes plus this pass.
- `supabase db push`: not applicable.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy.

Targeted test command:

```bash
bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsViewProductionRedesign.test.js src/tests/critical/cpsViewIdentity.test.js src/tests/critical/cpsSaveSerialization.test.js src/tests/critical/cpsRowOperations.test.js src/tests/document-view/documentOverlayTokenRegression.test.js src/tests/document-view/quotationViewChromeTokenRegression.test.js
```

## Git Status Scope

Pre-existing tracked changes were present before this pass in CPS, FAB, module adapter, domain, and page files.

Pre-existing untracked reports and tests were also present.

This pass did not revert or clean those files.

## Risks and Limitations

Runtime phone validation is still required.

This report does not claim visual runtime success because no live phone screenshot was captured after the pass.

## Deferred Work

Deferred work remains unchanged:

- CPS conversion repair.
- CPS PDF/download business wiring.
- Any broader document-view design system extraction.
