# BOQ Group Footer Anatomy Fix Report

This report was written by Claude Opus 4.6 on 2026-09-25 via Antigravity.

## Objective

Fix the BOQ Full-Page Live Form prototype so every expanded Group has three visually identifiable regions: header, body, and footer. The previous agent removed the nested card but replaced it with only a thin 2px left spine, leaving Groups without a closing boundary.

## Scope

Single-file correction to the standalone HTML prototype. No React source, no calculations, no business logic.

## Files Changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### CSS Changes (replaced `.gmemb` / `.gadd` with `.gwrap` / `.gbody` / `.gfoot`)

1. **`.gwrap`** — outer wrapper div that contains header + body + footer. Provides `margin-top:16px` for group-to-group separation. When collapsed (`.gwrap.collapsed`), CSS hides `.gbody` and `.gfoot` via `display:none` and restores the header to full `border-radius:14px`.

2. **`.gwrap .ghdr`** — header now uses `border-radius:14px 14px 0 0` (top corners only) when expanded, visually connecting to the body below.

3. **`.gbody`** — shared surface for member items. Uses `background:rgba(30,58,95,.028)` (very subtle tinted surface), `border-left` and `border-right` of `1px solid rgba(30,58,95,.10)` to create side containment. Items inside `.gbody` get consistent padding and subtle separators.

4. **`.gbody-empty`** — placeholder text for Groups with zero members ("No items in this group yet").

5. **`.gfoot`** — closing footer bar. Uses `background:rgba(30,58,95,.045)` (slightly stronger than body), `border:1px solid rgba(30,58,95,.10)`, and `border-radius:0 0 14px 14px` (bottom corners only). This creates a visible end-cap that mirrors the header's rounded corners.

6. **`.gfoot-btn`** — the "Add item to this group" button inside the footer. Uses dashed border, 38px height, full-width flex layout, and hover states. Includes a plus icon SVG.

7. **Collapsed state** — `.gwrap.collapsed .gbody` and `.gwrap.collapsed .gfoot` get `display:none`. The header regains `border-radius:14px` to become a self-contained bar. No orphaned spine, no orphaned footer.

8. **Adjacency rules** — Updated selectors from `#items>.ghdr` / `#items>.gmemb` to `#items>.gwrap` / `#items>.gwrap.collapsed`.

### JavaScript Changes (replaced `groupHTML()`)

The function now emits:

```html
<div class="gwrap [collapsed]" data-gwrap="ID">
  <div class="ghdr [closed]" data-gid="ID">
    <!-- chevron, title input, count label, remove button -->
  </div>
  <div class="gbody">
    <!-- member items OR empty placeholder -->
  </div>
  <div class="gfoot">
    <button class="gfoot-btn">+ Add item to this group</button>
  </div>
</div>
```

All existing controls inside the header (chevron, title input, item count, remove button) are preserved without repositioning.

## What Replaced the Pixel-Line-Only Treatment

The thin 2px left spine (`.gmemb border-left:2px solid`) was replaced by:

- Subtle tinted background surface (`.gbody background`)
- 1px side borders connecting header to footer
- Matching border-radius on header top corners and footer bottom corners
- A footer bar with enough height and background weight to register as a structural end-cap

## Group Footer Description

The `.gfoot` is a horizontal bar at the bottom of each expanded Group. It has:
- A slightly tinted background (`rgba(30,58,95,.045)`)
- 1px border on all sides matching the body side borders
- Bottom-only rounded corners (`0 0 14px 14px`) that mirror the header's top corners
- Contains a dashed-border "Add item to this group" button with a plus icon
- 6px vertical padding and 10px horizontal padding

## How "Add Item" Integrates with Footer

The "Add item to this group" button is now the sole child of `.gfoot`. This gives the footer a functional purpose: it is both the structural termination of the Group and the action to extend the Group. The button spans the full footer width.

## Expanded Group Appearance

```
╭─────────────────────────────────────╮  ← .ghdr (dark gradient, rounded top)
│  ▼  Group A — Civil Works   3 items │
╰─────────────────────────────────────╯
┃                                     ┃  ← .gbody (subtle background, side borders)
┃  Item 02                            ┃
┃  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┃
┃  Item 03                            ┃
┃  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┃
┃  Item 04                            ┃
┃                                     ┃
╭─────────────────────────────────────╮  ← .gfoot (tinted background, rounded bottom)
│     ＋ Add item to this group       │
╰─────────────────────────────────────╯
```

## Collapsed Group Appearance

```
╭─────────────────────────────────────╮  ← .ghdr.closed (light dashed border, full radius)
│  ▸  Group A — Civil Works   3 items │
╰─────────────────────────────────────╯
```

Body and footer are hidden via `display:none`. No orphaned spine or footer.

## Empty Group Appearance

```
╭─────────────────────────────────────╮  ← .ghdr
│  ▼  New Group               0 items │
╰─────────────────────────────────────╯
┃                                     ┃  ← .gbody
┃   No items in this group yet        ┃  ← .gbody-empty
┃                                     ┃
╭─────────────────────────────────────╮  ← .gfoot
│     ＋ Add item to this group       │
╰─────────────────────────────────────╯
```

## Confirmation: Item Controls NOT Repositioned

The item header (`.ihead`) with move-up, move-down, duplicate, and delete buttons remains exactly as the previous agent placed them. No controls were moved, resized, or redesigned.

## Confirmation: Global Creation Pair Unchanged

The "Add line item" + "Add group" button pair (`.createpair`) remains below final content. No changes to position, styling, or behavior.

## Confirmation: Behavior, Calculations, Import Preserved

- `editRow()`, `editNum()`, `moveRow()`, `dupRow()`, `insertBelow()` — unchanged
- `renderTotals()`, `profit()`, `lineSell()`, `naira()`, `words()` — unchanged
- `doImport()` — unchanged (imports render through the same `groupHTML()` which now produces the three-part structure)
- `save()` validation — unchanged
- `toggleGroup()` — unchanged (toggles `collapsed` flag and calls `renderItems()`)
- `removeRow()` — unchanged (ungroups items when group removed)
- Column manager, sub-descriptions — unchanged

## Verification

- `git diff --check`: passed (exit code 0)
- `git status`: only target file modified + pre-existing untracked report from another agent
- `bun run typecheck`: not applicable (standalone HTML prototype)
- `bun run audit:load`: not applicable (standalone HTML prototype)
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy

## Final Git Status

```
 M docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html
?? docs/reports/boq/boq-fullpage-flat-outline-ux-pass-report-2026-09-25.md
?? docs/reports/boq/boq-group-footer-anatomy-fix-2026-09-25.md
```

## Risks or Limitations

- The prototype is standalone HTML with inline CSS and JS. The actual React implementation must replicate this three-part Group structure.
- The `.gbody` background tint (`rgba(30,58,95,.028)`) is extremely subtle. On some screens it may not register. The side borders and matched corner radii carry more visual weight.

## Deferred Work

- None. This was a targeted anatomy correction.
