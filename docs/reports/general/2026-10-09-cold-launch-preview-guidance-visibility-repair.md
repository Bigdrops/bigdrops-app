# Cold Launch Preview Guidance Visibility Repair

This report was written by Codex on 2026-10-09 via Codex desktop.

## Objective

Keep rotating BIGDROPS guidance tips visible during all `/cold-launch-preview` network states.

## Scope

This task changed the preview page only. It did not change production startup, authentication, offline entitlement, database, or backend logic.

## Files changed

- `src/pages/ColdLaunchPreview.tsx`
- `docs/reports/general/2026-10-09-cold-launch-preview-guidance-visibility-repair.md`

## Skills used

Skills used: frontend-design, animate, accessibility, react-dev, typescript-advanced-types, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Kept the guidance hook mounted once in the preview page.
- Removed the hidden prop from the preview tip renderer.
- Removed network-state CSS that hid guidance tips during error and retry states.
- Split the lower launch surface into persistent guidance and conditional connection feedback regions.
- Kept retry feedback compact and touch-accessible.
- Preserved the existing network animation and preview-only retry state.

## Verification result

- `bun run typecheck`: passed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `git status`: not clean. The worktree had pre-existing unrelated changes before this task.
- `bun run build`: not run. The hardware policy prohibits it.
- `supabase db push`: not applicable.

## Supabase push status

Not applicable. No Supabase files or SQL files changed.

## Risks or limitations

- A final device pass is still useful on very short mobile browser viewports.
- The lower communication band is compact. Very long future tip text can need additional copy review.

## Deferred work

- None.
