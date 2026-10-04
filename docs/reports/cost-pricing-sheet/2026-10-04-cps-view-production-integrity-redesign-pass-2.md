# CPS View Production Integrity and Redesign Pass 2 Report

This report was written by Codex on 2026-10-04 via Codex desktop.

## Objective

Implement CPS View production integrity and redesign pass 2.

The task corrected group membership presentation integrity, revised group containers, revised the action row order, restored company-name visibility, fixed the visible Download FAB styling path, and preserved the real application mobile navigation.

## Screenshot Inspected

- `C:\Users\DELL\CrossDevice\Xiaomi 13T Pro (1)\storage\Pictures\file_00000000e90c82109c2e672006b7c996.png`

The screenshot was used only as a visual reference for density, action-row hierarchy, group containment, and FAB/nav coexistence.

The screenshot was not used as group membership authority. Persisted and normalized `group_id` remain authoritative.

The retired HTML baseline was not used as design authority.

## Skills Used

Skills used: frontend-design, react-dev, karpathy, safe-area-handling, systematic-debugging

Documentation standard: ASD-STE100 Simplified Technical English

## Files Inspected

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/standard/fab-standard.md`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/components/document-view/shared/FloatingDocumentButton.tsx`
- `src/components/Layout.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/domain/cps/viewData.ts`
- `src/domain/cps/normalize.ts`
- `src/domain/cps/row-operations.ts`
- `src/styles/formTheme.css`
- `src/lib/themeTokens.ts`
- `src/tests/critical/cpsViewProductionRedesign.test.js`
- `src/tests/critical/cpsSaveSerialization.test.js`
- `src/tests/critical/cpsRowOperations.test.js`
- `src/tests/document-view/documentOverlayTokenRegression.test.js`

## Group Integrity Trace

Persisted group identity:

- `denormalizeToDbCpsRow()` stores item membership in `cells.group_id`.
- `normalizeDbCps()` and `mapLegacyRowToRow()` read `row.group_id` or `cells.group_id`.
- The normalized document row exposes `group_id`.

View membership:

- `buildCpsViewData()` maps section rows to group rows and item rows to item rows.
- Group rows expose `groupId`.
- Item rows expose `groupId`.

Previous mismatch root cause:

- The old local component segment builder used `group_id` to count all members.
- It used the same counted members to compute the group subtotal.
- It rendered only adjacent members while the group was open.
- A non-contiguous grouped item could therefore appear outside the bounded group while the count and subtotal still included it.

This was a View presentation mismatch. Repository code did not prove hosted production data loss. Hosted data was not edited.

## Membership Authority

Before:

- Count used all known members by `group_id`.
- Subtotal used all known members by `group_id`.
- Rendered members used adjacency after the group header.

After:

- `buildCpsViewSegments()` in `src/domain/cps/viewData.ts` builds one membership set from normalized `groupId`.
- That one set drives rendered members, count, and subtotal.
- Ungrouped rows remain standalone.
- Rows with an unknown `group_id` remain standalone with a hidden diagnostic label.

Non-contiguous membership is preserved. The source row order is not mutated.

## Group Presentation

Before:

- Groups used generated alphabet labels and presentation-only group letters.
- Group members could visually separate from the group container.
- The group subtotal was not connected strongly enough to the members.

After:

- The actual group title is the primary identity.
- The group is a bounded container with a header, member rows, and a connected subtotal.
- The subtotal label is `Group Subtotal (n items)`.
- `Group A`, giant alphabet monograms, and `END OF GROUP` labels are absent.
- The container uses the available CPS content width and does not add an extra outer side gutter.

Group accent mapping:

- Border and header tint use `--bd-button-primary-bg`.
- Group icon foreground uses `--bd-action-icon-bg`.
- Soft action surfaces use `--bd-surface-action`, `--bd-surface-action-border`, and `--bd-surface-action-hover`.

No screenshot blue or orange color was hardcoded.

## Action Row

The action order is now:

1. Convert to Quote
2. Edit
3. Download

The row uses three equal columns.

Theme Manager mapping:

- Convert to Quote uses `--bd-button-primary-bg` and `--bd-button-primary-text`.
- Edit uses action-surface tokens.
- Download uses action-surface tokens.

Convert behavior remains frozen. The direct action and More Actions item both open the same confirmation and call `props.actions.onConvertToQuotation()`.

The conversion engine was not changed or repaired.

Edit behavior remains `props.onEdit()`.

Download business behavior was not implemented.

## Identity Hierarchy

Final hierarchy:

1. Company logo and company name
2. Client name
3. CPS document title
4. Optional saved contact or project context

Company name authority:

- `useSettings()` supplies `settings.company_name`.
- `resolveCanonicalLogoUrl(settings)` supplies the company logo.

Client authority:

- Saved `client_snapshot.name` is first.
- `document.client_name` is the fallback.

The document title remains visible. The text `No site` was not restored.

## FAB Root Cause and Fix

Root cause:

- The previous FAB path depended on primary-button fallback tokens and did not force the SVG path to inherit the final foreground.
- In the rendered screenshot, that cascade produced a near-white control with a missing or washed-out icon.

Fix:

- `FloatingDownloadButton.module.css` now uses `--bd-fab-bg` for the background.
- It uses `--bd-fab-text` for the foreground.
- The SVG and SVG path use `currentColor`.
- The button keeps the standard 50 by 50 size and 18 px radius.
- The CPS wrapper positions it with `--bd-app-bottom-nav-offset` plus safe area.

Download behavior was preserved. No PDF or CPS download workflow was added.

## Mobile Navigation

The fake CPS navigation did not return.

The real navigation authority remains:

- `src/components/Layout.tsx`
- `src/components/layout/MobileBottomNav.tsx`

The CPS FAB clears the real mobile navigation through the shared bottom-nav offset token.

## Calculation and Domain Freeze

No schema change was made.

No migration was created.

No Supabase push was required.

No hosted data was edited.

No calculation formula was changed.

The task did not modify:

- `calculateCpsTotals.ts`
- `calculations.ts`
- `instant-markup.ts`
- Decimal behavior
- row economics formulas
- document total formulas
- conversion engine
- PDF engine

## Files Changed

- `src/domain/cps/viewData.ts`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/tests/critical/cpsViewProductionRedesign.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-production-integrity-redesign-pass-2.md`

## Tests Added or Updated

- Updated `src/tests/critical/cpsViewProductionRedesign.test.js`.

Coverage added:

- Action order is Convert to Quote, Edit, Download.
- One group membership set drives count, rendered members, and subtotal.
- Non-contiguous `A, ungrouped, A` membership remains valid.
- Ungrouped rows remain ungrouped.
- Group nomenclature does not return.
- Bounded group container uses Theme Manager tokens.
- Company name renders before client and title.
- FAB uses canonical `--bd-fab-bg` and `--bd-fab-text` tokens.
- FAB icon remains tied to foreground color.

## Verification

- `bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsViewProductionRedesign.test.js src/tests/critical/cpsViewIdentity.test.js src/tests/critical/cpsSaveSerialization.test.js src/tests/critical/cpsRowOperations.test.js src/tests/document-view/documentOverlayTokenRegression.test.js`: passed
- `bun run typecheck`: passed
- `git diff --check`: passed
- `git status --short`: completed; working tree still contains pre-existing changes and this task report
- `bun run audit:load`: not run; no schema, query, or data-layer logic was changed
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy

## Pre-Existing Working Tree Changes

Pre-existing modified files before this pass included:

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

Pre-existing untracked files included prior CPS reports, CPS tests, `src/components/cps/CpsMarkupSheet.tsx`, and `docs/templates/html-temps/onboarding-candidates/`.

These pre-existing changes were not reverted.

## Remaining Limitations

- Runtime visual success was not claimed. No browser screenshot verification was performed in this pass.
- Hosted production data was not queried or edited. The report states the code-path root cause, not the live database contents.
- CPS conversion remains in its existing state.
- CPS PDF/download business wiring remains deferred.
