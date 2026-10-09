# PhotoHero, Cold Launch, Branding, and Navigation Cleanup

This report was written by Codex on 2026-10-09.

## Objective

Remove the rejected PhotoHero V3 candidate. Keep PhotoHero V2 as the only PhotoHero preview. Improve Cold Launch theme contrast without changing the approved Tenant Tree structure. Remove developer preview links and obsolete footer branding from ordinary navigation. Set the Android launcher label to BOURXE.

## Files Changed

- `src/pages/PhotoHeroPreview.tsx`
- `src/pages/ColdLaunchPreview.tsx`
- `src/components/cold-launch/PreviewTree.tsx`
- `src/components/layout/navData.ts`
- `src/components/layout/MobileSidebar.tsx`
- `src/components/Layout.tsx`
- `src/pages/MoreOptions.tsx`
- `src/tests/critical/moreNavigation.test.js`
- `android/app/src/main/res/values/strings.xml`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md`
- `docs/reports/general/2026-10-09-photohero-coldlaunch-branding-cleanup.md`

## Removed V3 Artifacts

- Removed `src/components/onboarding/BourxePhotoHeroV3Preview.tsx`.
- Removed `docs/reports/general/2026-10-09-bourxe-photohero-v3-app-preview.md`.
- Removed the V2/V3 selector from `/photohero-preview`.
- Removed the rejected V3 candidate section from the app-entry and onboarding PRD.
- No standalone `BOURXE_Onboarding-PhotoHero-v3.html` file was present in the onboarding design folder.

## PhotoHero V2 Preservation

- `BIGDROPS_Onboarding-PhotoHero-v2.html` remains the sole PhotoHero design source used by `/photohero-preview`.
- The app wrapper still loads V2 in a sandboxed iframe and substitutes the official BX launcher icon at runtime.
- The V2 source hash before cleanup was `BFC077497F90E16922C466B6A08E36F83E781607E6E00955E38ABCB84EF450CD`.
- The V2 source hash after cleanup is `BFC077497F90E16922C466B6A08E36F83E781607E6E00955E38ABCB84EF450CD`.

## Cold Launch Theme and Contrast Changes

- The central public brand label now reads `BOURXE`.
- The official BX launcher artwork remains unchanged.
- The tree geometry, workspace/product topology, signal paths, failure state, retry state, tips hook, and preview controls were not structurally changed.
- The preview now derives accent, border, surface, text, and status colors from the existing `--bd-*` theme tokens.
- HSL-channel tokens are wrapped with `hsl(var(--token))`.
- The cinematic base is kept deep across light and dark appearance modes while accent energy follows the selected visual theme.
- Node surfaces, control surfaces, tip text, Replay, error text, and Retry styling were strengthened for readability.
- Reduced-transparency users get near-opaque controls with backdrop filters disabled.

## Navigation Cleanup

- Removed Cold Launch Preview and PhotoHero Preview from normal desktop navigation groups.
- Removed Cold Launch Preview and PhotoHero Preview from the mobile drawer management list.
- Removed Cold Launch Preview and PhotoHero Preview from the More Options page.
- Removed the redundant mobile drawer footer identity block that showed the workspace initials/name at the bottom.
- Kept the top BX + BOURXE header, company switcher, and Sign Out action.
- Kept `/cold-launch-preview` and `/photohero-preview` routes registered in the authenticated app shell.

## Android Label Change

- Changed `@string/app_name` and `@string/title_activity_main` from `BigDrops` to `BOURXE`.
- Did not change `applicationId`, namespace, package name, MainActivity, signing configuration, version code, version name, permissions, app links, or launcher artwork.

## Static Verification Results

- `bun run typecheck`: failed on the pre-existing dirty file `src/components/cps/CostPricingSheetEditor.tsx` with parse errors beginning at line 1194. This cleanup did not modify that file.
- `git diff --check`: passed. Only line-ending warnings were reported by Git for Windows.
- V3 reference search found no active source references. Only this cleanup report mentions the removed V3 artifact.
- `/cold-launch-preview` and `/photohero-preview` remain registered in `src/components/app/AppShell.tsx`.
- `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, and `capacitor.config.ts` have no diff.
- `bun run build`: not run, per hardware policy.
- `bun run audit:load`: not run because no schema, query, or data-layer logic changed.

## Visual Verification Limitation

No runtime screenshot pass is recorded in this cleanup report. Contrast improvements are source-level changes based on the existing theme token bridge, not measured rendered WCAG results.
