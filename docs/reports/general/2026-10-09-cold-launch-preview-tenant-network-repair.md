# Cold Launch Preview Tenant Network Repair Report

This report was written by Codex on 2026-10-09 via Codex Desktop.

## Objective

Repair the `/cold-launch-preview` page so the Tenant Network is visible, active, theme-aware, and preview-only.

## Scope

The change is limited to the cold-launch preview page and its preview SVG tree component.

## Files changed

- `src/pages/ColdLaunchPreview.tsx`
- `src/components/cold-launch/PreviewTree.tsx`
- `docs/reports/general/2026-10-09-cold-launch-preview-tenant-network-repair.md`

Skills used: frontend-design, animate, accessibility, react-dev, typescript-advanced-types, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Restored the missing `.clp-run` state that reveals rings, paths, nodes, and signals.
- Replaced the four-state preview bar with one Normal / Connection Error toggle.
- Kept the same mounted Tree for Normal, Connection Error, retry, and recovery states.
- Added retry behavior that sends a recovery signal through affected branches and returns to Normal.
- Reduced logo dominance and made the network the primary visual feature.
- Adjusted Mobile, Fold, and Desktop SVG geometry for readable labels and visible branching.
- Connected the preview colors to existing theme semantic tokens, including `--primary`, `--primary-bright`, `--secondary`, `--ink`, `--line`, and `--attention`.
- Kept the cinematic dark surface while allowing the selected visual theme to control accents.
- Kept integrated guidance tips from the existing `LoadingTips` engine.
- Preserved reduced-motion behavior with a static readable network and clear error state.

## Verification result

- `bun run typecheck`: passed.
- Static check: `PreviewTree` is not keyed by network state or theme state.
- Static check: theme changes use CSS custom properties and do not require Tree remount.
- Static check: production startup files were not edited by this task.

## Supabase push status

Not applicable. No SQL, schema, query, or data-layer logic changed.

## Risks or limitations

- No pixel screenshot was captured in this run. A human visual pass should confirm branch density on narrow fold screens.
- The preview uses CSS custom properties from the current theme bridge. If a future theme omits semantic tokens, fallback values will apply.

## Deferred work

- Add a screenshot regression check for Mobile, Fold, and Desktop preview sizes if the project adds browser visual tests for this route.
