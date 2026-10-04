# CPS View Runtime Integrity Pass 3 Report

This report was written by Codex on 2026-10-04 via Codex desktop.

## Objective

Implement CPS View Production Runtime Integrity Pass 3.

The task addressed five runtime defects:

- CPS View scroll and overflow ownership.
- Group container width.
- Actual rendered Download FAB styling.
- Separation of the palette action from More Actions.
- Removal of the `Approve sheet` More Action.

The runtime screenshots were treated as evidence of current defects. The retired CPS and BOQ HTML designs were not used.

## Skills Used

Skills used: frontend-design, react-dev, karpathy, safe-area-handling, systematic-debugging

Documentation standard: ASD-STE100 Simplified Technical English

## Files Inspected

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/standard/fab-standard.md`
- `src/pages/ViewCps.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/components/document-view/shared/FloatingDocumentButton.tsx`
- `src/components/Layout.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/pages/ViewCSR.tsx`
- `src/components/document-view/csr/CsrMoreSheet.tsx`
- `src/components/document-view/csr/CsrPrimaryActions.tsx`
- `src/components/document-view/shared/DocumentSheet.tsx`
- `src/components/document-view/shared/DocumentCustomizeCard.tsx`
- `src/components/document-view/hooks/useDocumentUIState.ts`
- `src/domain/pdf/customization/cps.ts`
- `src/domain/pdf/customization/csr.ts`
- `src/domain/pdf/customization/hooks.ts`
- `src/tests/critical/cpsViewProductionRedesign.test.js`

## Scroll and Overflow Root Cause

The Layout component owns the page content and the real mobile bottom navigation.

The CPS View added extra scroll behavior in its own layer:

- `.cps-view` used `min-height: 100dvh` inside the Layout content area.
- `.cps-view-wrap` added bottom padding with `--bd-app-bottom-nav-offset + safe-area + 112px`.
- `.cps-view-wrap .cps-doc-actions` was sticky at `top: 56px`.

This created duplicated layout ownership. The action row could stay pinned over content. The bottom padding could also create excessive end-of-document dead space.

After the fix:

- Layout remains the scroll owner.
- `.cps-view` uses `min-height: 100%`.
- `.cps-view-wrap` uses normal bottom padding of `24px`.
- Layout mobile padding and the real bottom navigation provide the navigation clearance.
- The document action row is normal flow content. It is not sticky or fixed.

## Group Width Change

The group membership and segmentation logic was frozen.

No change was made to:

- `buildCpsViewSegments()`
- normalized `groupId` authority
- count, rendered members, or subtotal authority
- non-contiguous group semantics
- ungrouped rows
- group subtotal calculation

The presentation change was only width-related:

- `.cps-view-wrap .cps-doc` changed from `margin: 14px 20px 0` to `margin: 14px 12px 0`.
- The bounded group shell still respects the page content boundary.
- The group shell uses more of the available mobile content width.
- Header, members, and subtotal remain one bounded visual unit.

## FAB Root Cause

The previous token change was not enough because the CPS reset had higher specificity than the CSS module button rule.

The reset was:

- `.cps-view button { background: none; border: 0; }`

The shared FAB class was:

- `.button { background: hsl(var(--bd-fab-bg)); ... }`

Inside `.cps-view`, the reset could erase the FAB background and border. This explains the runtime glass or white FAB even though `--bd-fab-bg` and `--bd-fab-text` existed.

## FAB Fix

The shared FAB still uses the standard component:

- `FloatingDownloadButton`
- `FloatingDocumentButton`
- custom Download SVG
- 50 by 50 px size
- 18 px radius
- ambient float wrapper

The CPS slot now reasserts the shared FAB token path with enough specificity:

- `.cps-fab-slot button`
- `background: hsl(var(--bd-fab-bg))`
- `color: hsl(var(--bd-fab-text))`
- SVG path uses `currentColor`

The bottom position still uses:

- `--bd-app-bottom-nav-offset`
- `env(safe-area-inset-bottom, 0px)`
- `16px` clearance

The old diagnostic console logging was removed from `FloatingDownloadButton.tsx`.

## CSR Palette Behavior

CSR View files inspected:

- `src/pages/ViewCSR.tsx`
- `src/components/document-view/csr/CsrMoreSheet.tsx`
- `src/components/document-view/shared/DocumentSheet.tsx`
- `src/components/document-view/shared/DocumentCustomizeCard.tsx`
- `src/components/document-view/hooks/useDocumentUIState.ts`

CSR behavior discovered:

- `DocumentTopNav.onCustomize` calls `ui.openSheet(SHEET_CUSTOMIZE)`.
- `SHEET_CUSTOMIZE` opens a `DocumentSheet`.
- The sheet contains `DocumentCustomizeCard`.
- `DocumentTopNav.onMore` calls `ui.openSheet(SHEET_MORE)`.
- `SHEET_MORE` opens `CsrMoreSheet`.

The palette action and More Actions are separate surfaces.

## CPS Palette and More Actions

CPS now follows the same ownership pattern:

- Palette button opens `CpsCustomizeSheet`.
- `CpsCustomizeSheet` uses shared `DocumentSheet`.
- `CpsCustomizeSheet` uses shared `DocumentCustomizeCard`.
- The CPS customization engine uses `usePdfCustomization()` with `documentFamily: 'cps_sheets'`.
- More button opens `MoreSheet`.

The CPS `...` authority remains `DocumentMoreSheet` through the local CPS `MoreSheet`.

The two top-bar buttons no longer call the same state setter.

## Approve Sheet Removal

The `Approve sheet` action was removed from CPS More Actions.

Removed presentation:

- `Approve sheet`
- `Mark this sheet as approved`
- `Reopen sheet`
- the local `Status` More Actions section

The existing status update callback in `ViewCps.tsx` was not deleted because this pass did not audit all possible external usage. The task required removal from the CPS View More Actions presentation.

## Action Row Theme Mapping

The order remains:

1. Convert to Quote
2. Edit
3. Download

The row remains three equal columns.

The visual treatment changed:

- Convert now uses a soft theme-accent surface.
- Edit and Download use action surface tokens.
- All controls use compatible height, radius, spacing, and icon scale.
- Convert no longer renders as an unrelated solid CTA.

Tokens used include:

- `--bd-button-primary-bg`
- `--bd-surface-action`
- `--bd-surface-action-border`
- `--bd-surface-action-hover`
- `--bd-action-icon-bg`

No screenshot orange was hardcoded.

## Behavior Freeze

Conversion was not repaired.

Direct Convert to Quote and More Actions Convert to Quotation still converge on the existing confirmation and `props.actions.onConvertToQuotation()` authority.

Download business wiring was not implemented.

Edit navigation was preserved.

No calculation, schema, numbering, save, import, PDF engine, conversion engine, or group-domain behavior was changed.

## Files Changed

- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/tests/critical/cpsViewProductionRedesign.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-runtime-integrity-pass-3.md`

## Tests and Verification

- `bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsViewProductionRedesign.test.js src/tests/critical/cpsViewIdentity.test.js src/tests/critical/cpsSaveSerialization.test.js src/tests/critical/cpsRowOperations.test.js src/tests/document-view/documentOverlayTokenRegression.test.js`: passed
- `bun run typecheck`: passed
- `git diff --check`: passed
- `git status --short`: completed
- `bun run audit:load`: not run; no schema, query, or data-layer logic changed
- `supabase db push`: not applicable
- `bun run build`: not run, per hardware policy

## Git Status Scope

The working tree had pre-existing modified and untracked files before this pass.

Pre-existing modified files included:

- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/CpsList.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/config/moduleAdapters.ts`
- `src/domain/cps/viewData.ts`
- `src/pages/ViewCps.tsx`

Pre-existing untracked files included prior CPS reports, prior CPS tests, `src/components/cps/CpsMarkupSheet.tsx`, and `docs/templates/html-temps/onboarding-candidates/`.

This pass added the runtime integrity report and changed only task-related files.

## Limitations

Runtime visual success was not claimed.

Phone validation is still required for:

- final scroll feel;
- group width on the target device;
- the orange-theme FAB appearance;
- safe-area clearance above the real mobile bottom navigation;
- palette sheet presentation on the phone viewport.
