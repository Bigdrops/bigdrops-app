# CPS Form Stage 1 Direct Mount Report

This report was written by Codex on 2026-10-02 via Codex Desktop.

## Objective

Remove the old CPS form presentation from the active New and Edit render path.

Mount the supplied TSX form implementation as the active CPS form presentation.

Stop before Stage 2 production wiring.

## Scope

The change applies only to the CPS New and Edit form path.

CPS View is out of scope.

Database changes are out of scope.

## Files changed

- `src/pages/CpsFormPage.tsx`
- `src/components/cps/supplied-form/CostPricingSheetForm.tsx`
- `src/components/cps/supplied-form/CostPricingSheetIcons.tsx`
- `src/components/cps/supplied-form/CostPricingSheetOverlays.tsx`
- `src/components/cps/supplied-form/cost-pricing-sheet-form.css`
- `src/components/cps/supplied-form/cost-pricing-sheet-shared.ts`
- `docs/reports/cost-pricing-sheet/2026-10-02-cps-form-stage-1-direct-mount-report.md`

## Files deleted

No files were deleted.

## Skills used

Skills used: using-superpowers, vercel-composition-patterns, typescript-advanced-types, accessibility, vercel-react-best-practices, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Removed `CostPricingSheetEditor` from the active `CpsFormPage` render path.
- Added the supplied TSX form files under `src/components/cps/supplied-form/`.
- Mounted `CostPricingSheetForm` directly from `CpsFormPage`.
- Added a small adapter for initial CPS document, client, and row data.
- Deferred save, import, photo upload, client creation, and production calculations.

## Active render chain

New CPS:

`AppShell` -> `/cost-pricing-sheets/new` -> `NewCps` -> `CpsFormPage mode="create"` -> `CostPricingSheetForm`

Edit CPS:

`AppShell` -> `/cost-pricing-sheets/edit/:id` -> `EditCps` -> `CpsFormPage mode="edit"` -> `CostPricingSheetForm`

## Old presentation status

The old active presentation was:

- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`

These files still exist.

They are no longer mounted from the CPS New or Edit route.

There is no conditional fallback to the old presentation.

## Preserved infrastructure

The change did not delete CPS domain logic.

The change did not delete CPS persistence code.

The change did not delete CPS importer code.

The change did not delete Instant Markup domain code.

The change did not delete Cloudinary upload code.

The change did not delete ClientSelector or ClientForm code.

The change did not delete numbering code.

The change did not delete row-operation helpers.

## Verification

- `git status` before changes: clean.
- `bun run typecheck`: passed.
- `git diff`: scoped to CPS form page, new supplied-form files, and this report.
- `CPS View`: untouched.
- `src/domain/cps`: untouched.
- `supabase`: untouched.
- `supabase db push`: not applicable.
- `bun run audit:load`: skipped. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Not applicable.

No SQL changed.

No schema changed.

## Risks or limitations

The supplied form still uses prototype-local behavior in this stage.

The supplied form still uses prototype display math.

Save, import, photo upload, client creation, and production calculations remain deferred.

## Deferred work

Stage 2 must wire production BIGDROPS behavior into the supplied form after visual approval.
