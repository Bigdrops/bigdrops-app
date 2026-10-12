# CSR Shell And Mobile Header Report

This report was written by Codex on 2026-10-12 via Codex Desktop.

## Objective

Restore the standard desktop CSR application shell and reduce the mobile/fold CSR header.

## Scope

- CSR New and Edit route layout integration.
- Existing CSR mobile/fold header presentation.
- Existing CSR presentation dispatch.

## Files Changed

- `src/components/Layout.tsx`
- `src/pages/CsrFormPage.tsx`
- `src/components/csr/CsrFormPresentations.tsx`

Skills used: redesign-existing-projects, mobile-app-ui-design, tailwind-css-patterns, vercel-composition-patterns, typescript-advanced-types, accessibility, karpathy, verification-before-completion
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Added the `desktopShell` Layout option.
- Used `desktopShell` with `immersive` on CSR New and Edit routes.
- Reused the existing `DesktopSidebar` without a new control or duplicate sidebar.
- Kept mobile/fold routes immersive.
- Removed the CSR route content-width cap on desktop/tablet.
- Reduced the mobile/fold title from `15px` to `8.5px`.
- Reduced mobile/fold header top padding from `12px` to `4px`.
- Reduced mobile/fold title-to-metadata spacing from `8px` to `4px`.
- Reduced mobile/fold header bottom padding from `8px` to `4px`.

## Verification Result

- `bun run audit:load`: completed with exit code 0. Existing repository warnings remain.
- `bun run typecheck`: completed with no TypeScript diagnostics.
- `git diff --check`: passed.
- Route review: CSR New and Edit use `immersive` with `desktopShell`.
- Sidebar review: Layout mounts the existing `DesktopSidebar` when `desktopShell` is true.
- Presentation review: foldable devices remain in the mobile/fold presentation. Tablet and desktop use the desktop/tablet presentation.
- Action review: STANDARD and FIELD remain absent from the visible header. The blank CSR download action remains absent.
- Decoration review: the CSR decorative background declarations were not changed.
- `bun run build`: not run by hardware policy.

## Supabase Push Status

Not applicable. No SQL, schema, query, or data-layer logic changed.

## Risks Or Limitations

- User screenshot review is still required for visual acceptance.
- `src/components/Layout.tsx` had unrelated pre-existing changes. This task changed only the Layout properties and desktop sidebar condition.

## Deferred Work

- Restore the blank CSR download action only through `docs/tickets/csr-download-restoration.md`.
