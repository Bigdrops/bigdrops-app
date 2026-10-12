# Onboarding Rejected Experiment Deletion Report

This report was written by Codex on 2026-10-11 via Codex desktop.

## Objective

Delete the rejected independent onboarding experiments and the rejected C01-C07 candidate system.

## Scope

The cleanup removed active source code for:

- Independent Onboarding V2.
- Independent Onboarding V3.
- C01-C07 onboarding candidates.

The cleanup preserved the original PhotoHero onboarding preview and its route.

## Files Changed

Deleted files:

- `src/components/onboarding/OnboardingV2Experience.tsx`
- `src/components/onboarding/OnboardingV3Experience.tsx`
- `src/pages/OnboardingV2Preview.tsx`
- `src/pages/OnboardingV3Preview.tsx`
- `src/components/onboarding/photo-hero-v2-candidates.tsx`
- `src/tests/critical/onboardingV2Independent.test.js`
- `src/tests/critical/onboardingV3Experience.test.js`

Modified files:

- `src/components/onboarding/PhotoHeroV2Preview.tsx`
- `src/components/app/AppShell.tsx`
- `src/lib/designLabPreviews.ts`
- `src/tests/critical/photoHeroV2LightMode.test.js`
- `src/tests/critical/dashboardThemeExperiment.test.js`
- `src/tests/critical/invoiceThemeExperiment.test.js`

## Skills Used

Skills used: react-dev, typescript-advanced-types, reducing-entropy, superpowers:systematic-debugging, superpowers:verification-before-completion, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Removed the V2 and V3 lazy imports from `AppShell`.
- Removed the `/onboarding-v2-preview` route.
- Removed the `/onboarding-v3-preview` route.
- Removed the independent V2 Design Lab entry.
- Removed the independent V3 Design Lab entry.
- Removed the C01-C07 candidate import from `PhotoHeroV2Preview`.
- Removed the candidate state from `PhotoHeroV2Preview`.
- Removed the candidate selector UI from the preview controls.
- Removed the candidate rendering branch.
- Removed the `CandidateReview` component.
- Removed candidate-only CSS selectors and keyframes.
- Updated surviving tests to assert that rejected entries and routes stay removed.

## Preserved Components

The following active PhotoHero parts remain:

- `/photohero-preview`
- `src/components/onboarding/PhotoHeroV2Preview.tsx`
- `src/components/onboarding/photo-hero-v2-theme.ts`
- Original slide sequence: Intro, Invoicing, Logistics, Projects, Sign up.
- Original moving truck and `oh2-wheelspin` animation.
- Existing PhotoHero authentication preview.
- Official BX logo usage.
- BOURXE public branding.
- Five theme families.
- Light and Dark support.

## Verification Result

Verification:

- Explicit deleted file existence check: all seven files returned `False`.
- Active source reference search for rejected modules, routes, and candidate branch symbols: no active component/page/lib references found.
- Original PhotoHero preservation search: `PhotoHeroV2Preview`, `LogisticsSlide`, `KJA-459XY`, `oh2-wheelspin`, and `BOURXE` remain.
- `bun run typecheck`: passed.
- `bun test src/tests/critical/photoHeroV2LightMode.test.js src/tests/critical/designLab.test.js src/tests/critical/moreNavigation.test.js src/tests/critical/dashboardThemeExperiment.test.js src/tests/critical/invoiceThemeExperiment.test.js src/tests/critical/productionComposition.test.js`: passed, 76 tests.

- `git diff --check`: passed with line-ending warnings on pre-existing dirty files.
- Final `git status --short`: confirmed the rejected source files and obsolete test files are absent from the working tree. It also confirmed unrelated pre-existing dirty and untracked files remain.

## Supabase Push Status

Supabase push status: not applicable. No schema, query, migration, or data-layer logic changed.

## Risks Or Limitations

- Historical reports still mention V2, V3, or candidates. They were not deleted because the task prohibited deleting historical reports.
- The working tree had many pre-existing dirty and untracked files before this deletion task. This cleanup did not revert them.
- No browser or device visual validation was performed.

## Deferred Work

- Device review can confirm the original PhotoHero preview still feels correct on mobile, fold, tablet, and desktop.
