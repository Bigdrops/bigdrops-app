# Cold Launch Preview — Workspace Tree Repair Report

Preview-only repair of `/cold-launch-preview`. Production startup, readiness
gates, authentication, offline entitlement, and backend code were not changed.

## Objective

Restore the recognizable Workspace-based tree. Remove clipping, label crossings,
oversized error arcs, unreadable error text, and the dark overlays that hid the
tree. Keep the connection-error and retry simulation, the guidance tips, and the
theme-driven accents.

## Files changed

- `src/components/cold-launch/preview-tree-geometry.ts` (new) — pure layout maths.
- `src/components/cold-launch/PreviewTree.tsx` — renderer only.
- `src/pages/ColdLaunchPreview.tsx` — preview styles, error card, brand anchor.

The tree geometry was separated from the renderer. The old file exported a
non-component function, which broke React Fast Refresh and forced full page
reloads on every edit.

Another agent worked in the same two files during this task. It introduced the
reserved band contract (`--clp-top`, `--clp-comm`), the borderless tip surface,
and the stacked communication zone. This report covers the combined result.

## Changes made

- Workspace groups are the primary unit: Sales, Operations, Finance Workspace.
- Products group by workflow: RFQ, Quotation, Invoice (Sales); Cost & Pricing
  Sheets, Waybill, Customer Service Reports (Operations); Payments (Finance).
- Geometry is measured from the live container size in CSS pixels. The SVG maps
  1:1 to its box, so no node is scaled off screen.
- Long names wrap to two lines. Labels stay readable at 10.5 px and above.
- Every path is anchored to a node surface. Paths therefore stop at the label
  box and never cross label text.
- The hub drops below 44% only when a short viewport cannot hold the lower
  lobes. The brand block follows the hub, so the logo stays the network centre.
- The tree renders inside its own band. The top controls and the lower
  communication zone cannot cover it.
- Affected branches lose their glow, dim, and fragment. The dash pattern is
  0.9% of the path length, so no oversized arcs appear.
- The error card is compact and high contrast. The Retry button is a 44 px
  target with an empty pointer-events chain.
- Off-screen branches stay short. They leave the viewport near the network
  boundary and do not cross the screen.

## Verification

- `git status` before and after: recorded. No production startup file changed.
- `bun run typecheck`: passed.
- `bunx eslint src/components/cold-launch src/pages/ColdLaunchPreview.tsx`: passed.
- `bun run audit:load`: not run. No schema, query, or data-layer change was made.
- `bun run build`: not run. Prohibited by the 4 GB RAM limit.

Static geometry checks (temporary harness, deleted after use) ran on nine
container sizes: 320x448, 340x508, 390x572, 430x660, 560x644, 768x768,
1280x464, 1440x544, 1920x832. Each size passed these checks:

- All ten featured surfaces stay inside the container.
- No two label surfaces overlap.
- The brand block stays inside the container and clear of every node.
- No path enters a node that it does not belong to.
- At least three branches leave the container.

Live browser checks passed at 1440x800, 390x844, and 1280x720:

- Normal state: 10 nodes, 0 overlaps, 0 nodes outside the viewport.
- Error state: 2 nodes and 4 branches affected. 0 nodes under the error card.
  0 nodes under the tips. The error card and the tips do not overlap.
- Retry: the state moves normal to error to retrying to normal. The same node
  and SVG elements stay mounted through every step.
- Theme: switching the accent tokens changed the branch stroke from amber to
  teal on the same elements. No remount occurred.

## Risks and limitations

- Screenshots were not captured. The preview webview stopped compositing frames
  after the dev server restarted during the task. Verification used live DOM
  measurement instead. A visual feel-check on a real device is still open.
- The tips stay visible during the error state. They fit inside the reserved
  band on the tested sizes. A much shorter viewport could need them hidden.
- Off-screen branch angles are a judgement call. They read as continuations at
  the tested sizes.
- Another agent holds concurrent edits in the same files. Re-read them before
  a commit.

## Deferred work

- Confirm the final composition on a physical phone and a fold device.
- Add the geometry checks as a permanent regression test.
