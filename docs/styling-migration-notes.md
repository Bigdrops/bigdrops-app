# Styling Migration Notes

This repository is migrating inline app-surface styling toward a shadcn-aligned, class-based system in phased PRs.

## Scope

- Migrate static UI presentation first.
- Preserve business logic, routing, calculations, submit flows, and data contracts.
- Keep React PDF and print rendering in a separate exception lane.

## Allowed Inline Style Categories

Inline styles are still acceptable when they are:

1. Runtime-driven
   - computed width, height, top, left, right
   - transforms that depend on interaction state
   - dynamic z-index or positioning needed for overlays
2. Theme/data driven
   - preview accents or thumbnail drawing values that would be awkward as utility classes
3. PDF or print specific
   - React PDF style objects

## Default Migration Rules

- Replace static spacing, borders, radii, typography, colors, shadows, and non-dynamic gradients with class-based styling.
- Prefer shared presentational wrappers over repeating utility strings.
- Decompose dense files before migrating styling if layout and behavior are tightly coupled.
- Do not mix styling migration with logic refactors in the same PR.

## Foundation Primitives

The following presentation-only primitives are the approved starting point for migration work:

- `PageShell`
- `PageIntro`
- `SectionCard`
- `SurfacePanel`
- `ToolbarRow`
- `ActionBar`
- `EmptyState`

These primitives must not own fetching, mutations, routing, submit handlers, or business branching.

## Exception Lane

The following files are in the PDF/print exception lane and should not be converted to Tailwind utilities as part of normal app-surface migration:

- `src/components/csr/CSRPreviewTemplates.jsx`
- `src/components/pdf/base/renderItems.tsx`
