# CPS View Production Redesign Pass 1 Report

This report was written by Codex on 2026-10-04 via Codex Desktop.

## Objective

Implement CPS View Production Redesign Pass 1.

The work separates document actions from document identity.

The work removes generated group-letter presentation.

The work removes the CPS-local fake mobile navigation.

The work keeps conversion, calculation, schema, and PDF behavior unchanged.

## Screenshots Inspected

- `C:/Users/DELL/AppData/Local/Temp/codex-clipboard-88c75657-fcee-4653-8142-eccd32e196c7.png`.
- The attached image showed the `docs/reports/cost-pricing-sheet` folder in File Explorer.
- The attached image did not show the CPS View UI.
- The written task text described the current production screenshot issues. That production description was used as the design baseline.
- The retired HTML baseline was not used as design authority.

## Scope

Files changed:

- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/pages/ViewCps.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/tests/critical/cpsViewProductionRedesign.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-production-redesign-pass-1.md`

Files inspected:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/standard/fab-standard.md`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/pages/ViewCps.tsx`
- `src/components/Layout.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/document-view/shared/DocumentPage.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/components/document-view/shared/FloatingDocumentButton.tsx`
- `src/pages/ViewWaybill.tsx`
- `src/pages/ViewQuotation.tsx`
- `src/tests/critical/cpsViewIdentity.test.js`
- `src/tests/document-view/documentOverlayTokenRegression.test.js`

## Skills Used

Skills used: using-superpowers, frontend-design, react-dev, karpathy, safe-area-handling

Documentation standard: ASD-STE100 Simplified Technical English

## Previous Upper Composition

The prior CPS View placed identity and document actions in the same region.

The mobile identity block contained Edit and Download controls.

The desktop top bar also contained Download and Edit controls.

This made title, client, logo, and actions compete for space.

## New Action And Identity Composition

The top document bar remains:

- Back.
- CPS number.
- Status.
- Share.
- Theme/customize.
- More.

The new document action row contains:

- Edit.
- Download.
- Convert to Quote.

The identity block now renders below the action row.

The identity block keeps:

- canonical tenant logo or tenant company fallback;
- CPS title;
- saved client snapshot or client display name;
- optional saved contact and site context.

## Edit Action

The direct Edit action uses the Lucide `Pencil` icon.

This matches the established edit icon used in CPS list and other production list actions.

The Edit behavior still uses the existing `props.onEdit` callback.

`ViewCps.tsx` still defines that callback as navigation to `/cost-pricing-sheets/edit/${cps.id}`.

The duplicate desktop side-rail Edit action was removed. Edit now belongs to the dedicated document action row.

## Download Action

The direct Download action remains visible in the action row.

It keeps the existing inert header behavior. No PDF workflow was added.

The floating Download FAB keeps its existing CPS behavior.

CPS passes no `onClick` handler to `FloatingDownloadButton`.

Therefore the current FAB only runs the shared diagnostic click handler and then has no CPS download business action.

This was preserved.

## Convert To Quote Authority

The existing More Actions authority was:

- More Actions item id: `convert`.
- Label: `Convert to Quotation`.
- Description: `Create a quotation from this sheet`.
- Existing page action: `actions.onConvertToQuotation`.

`ViewCps.tsx` still defines `actions.onConvertToQuotation`.

That action still calls `convertCpsToQuotation` from `./view-cps-actions`.

The direct Convert to Quote action opens the same confirmation state as the More Actions item.

Both paths call the same confirmation component.

That confirmation calls the same `props.actions.onConvertToQuotation` authority.

No new conversion route was added.

No new conversion engine was added.

Conversion was not fixed.

If the existing conversion path fails, the new direct button follows the same current behavior.

## Group Presentation

Before:

- Generated labels such as `Group A`.
- Giant alphabet monograms such as `A`.
- Footer text such as `End of Group A`.
- Table of contents entries such as `A · Electrical Materials`.

After:

- The real group title is the only visible group identity.
- Generated alphabet labels are removed.
- Giant alphabet monograms are removed.
- `END OF GROUP` labels are removed.
- The side table of contents uses the real group title.

The group header now has:

- a clear soft boundary;
- an inset semantic rail;
- more internal padding;
- deliberate spacing before member rows.

The member rail remains restrained and starts with the member area.

The group footer now shows a quiet `Subtotal` label and the existing subtotal value.

Subtotal arithmetic was not changed.

Non-contiguous membership remains supported because membership still derives from `row.groupId` and the group membership map.

Rows were not reordered.

Group ids were not changed.

Ungrouped rows were not wrapped in fake groups.

## Download FAB Standard

`docs/standard/fab-standard.md` was inspected.

The CPS Download FAB uses the shared `FloatingDownloadButton`.

The shared download FAB now conforms to the document-action FAB standard:

- 50 px by 50 px.
- 18 px border radius.
- semantic primary button background and text tokens.
- 20 px download icon.
- shared ambient float wrapper.
- hover scale `1.05`.
- active scale `0.95`.

The CPS FAB wrapper now uses:

`bottom: calc(var(--bd-app-bottom-nav-offset, 72px) + env(safe-area-inset-bottom, 0px) + 16px)`

This aligns the FAB with the real mobile bottom navigation and safe area.

## Mobile Navigation

The fake CPS bottom navigation source was:

- `CostPricingSheetViewPresentations.tsx`: local `<nav className="cps-bottom-nav">`.
- `cost-pricing-sheet-view.css`: `.cps-bottom-nav` styles.

That local navigation was removed.

The canonical real mobile navigation authority is:

- `src/components/Layout.tsx`
- `src/components/layout/MobileBottomNav.tsx`

`ViewCps.tsx` no longer passes `immersive` to `Layout`.

This lets `Layout` render the real application mobile navigation.

The page still passes `hidePageHeader`.

This preserves the CPS document top bar as the visible document bar.

There is one navigation authority.

## Freeze Confirmations

Calculation freeze:

- No calculation file was edited.
- No CPS formula was added.
- No `calculateCpsTotals`, `computeCpsRowEconomics`, `Decimal`, or presentation-owned arithmetic was introduced.

Domain/data freeze:

- No schema was changed.
- No migration was added.
- No Supabase write path was changed.
- No row type, group id, numbering, import, markup, photo, or PDF engine contract was changed.

## Tests Added Or Updated

Added:

- `src/tests/critical/cpsViewProductionRedesign.test.js`

The test checks:

- action and identity separation;
- direct Convert to Quote reuse of the existing conversion authority;
- removal of generated group-letter presentation;
- removal of CPS-local fake navigation;
- restoration of real app navigation through `Layout`;
- FAB standard conformance;
- calculation and schema freeze.

## Verification

- `bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsViewIdentity.test.js src/tests/critical/cpsViewProductionRedesign.test.js src/tests/document-view/documentOverlayTokenRegression.test.js`: passed.
- `bun run typecheck`: passed.
- `git diff --check`: passed.
- `rg` check for `Group A`, `Group B`, `Group C`, `END OF GROUP`, `cps-bottom-nav`, `String.fromCharCode`, `groupLetter`, `Edit3`, and removed fake-nav imports in active CPS view files: passed with no matches.
- `git status`: shows task changes plus pre-existing working-tree changes. See below.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.
- `bun run audit:load`: skipped because no schema, query, or data-layer logic was touched.

## Pre-Existing Working-Tree Changes

Pre-existing modified files before this task:

- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/CpsList.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/config/moduleAdapters.ts`
- `src/domain/cps/viewData.ts`

Pre-existing untracked files before this task:

- `docs/reports/cost-pricing-sheet/2026-10-03-cps-list-date-prefix-root-cause-report.md`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-mobile-instant-markup-presentation-replacement-report.md`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-calculation-authority-audit.md`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-final-html-parity-identity-integrity-report.md`
- `src/components/cps/CpsMarkupSheet.tsx`
- `src/tests/critical/cpsCalculationAuthority.test.js`
- `src/tests/critical/cpsListDate.test.js`
- `src/tests/critical/cpsMarkupPresentation.test.js`
- `src/tests/critical/cpsViewIdentity.test.js`

This task worked with the pre-existing CPS View identity changes.

No pre-existing file was reverted or cleaned.

## Supabase Push Status

Supabase push status: not applicable.

No SQL changed.

No migration was created.

## Risks Or Limitations

The direct Download action remains inert because the existing header Download behavior was inert.

The CPS Download FAB remains without a CPS download business handler because that was the existing behavior.

Conversion was not repaired.

The attached image did not show the CPS UI. The written production screenshot description guided the UI changes.

## Deferred Work

- Implement or repair CPS PDF download wiring in a separate task.
- Repair CPS conversion only in a separate task that authorizes conversion work.
- Add visual browser verification when a stable local data fixture is available.
