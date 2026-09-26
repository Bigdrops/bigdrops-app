# BOQ Full-Page Live Form Flat Outline UX Pass Report

This report was written by OpenCode (mimo-v2.6-flash-free) on 2026-09-25 via Local Runner.

Skills used: frontend-design, mobile-app-ui-design
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Third focused UX correction pass on the BOQ full-page live form. Goals:

1. Replace the nested-card group model with a flat document outline.
2. Enlarge mobile touch targets to 36–44px.
3. Move group creation from the top toolbar to a permanent bottom creation pair.
4. Make the collapsed group state unmistakable.
5. Reduce card saturation.

All counting, enumeration, totals, import, and save behavior must stay unchanged.

## Scope

One file changed:

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`

No other file changed. The production React app, the import parser, the database, `boq-sample-v1.html`, and `MobileItemCard` files were not touched.

## 1. File modified

Only the target HTML changed. Git status after the work:

- Modified: the target HTML (this task). Diff: 84 insertions, 83 deletions.
- No uncommitted files remained from other agents. Their item-library work was committed at HEAD `361d25ec` before this task. No file of theirs was written or reverted.

## 2. Flat document outline

The group is a document outline, not a card stack.

- The old `.gwrap` card shell is deleted. No card sits inside a card.
- A group renders as two siblings: a structural header `.ghdr`, then a member spine `.gmemb`.
- `.ghdr` holds the chevron (`gchev`, 36px, `aria-expanded`), the title input (`.st`), a small count label (`N items`), and the remove button (`ear2`, 36px). The header shows no item enumeration.
- `.gmemb` is a thin left spine: `border-left: 2px` plus `margin-left: 14px` and `padding-left: 12px`. Members sit on the spine with slight indentation. There is no background shell.
- Grouped and ungrouped items use the same `.item` component. The group relationship shows only through spine indentation.
- Adjacency spacing uses CSS `:has()` rules so a header follows an item, a group, or the list top without gaps.
- The group-local `+ Add item to this group` (`.gadd`) renders inside the spine as the last child. It stays subordinate to the bottom creation pair.

## 3. Item component and management controls

- Each item is flat: `padding: 10px 0 10px 7px`, a transparent left border (turns red on error), and a bottom hairline. No fill, no radius, no shadow.
- Management controls live in a compact `.ihead` header zone at the top of the item: index chip (`.idx`, 24px), move up, move down, duplicate, then remove (`.mbtn.del` pushed right with `margin-left: auto`).
- `.mbtn` is 36×36px. The old `.uhead`/`.umid`/`.upock`/`.grip`/`.ear` markup and CSS are deleted.
- Content order: `.ihead` → description textarea → `.subrow` (sub-description toggle) → specification input → qty/unit/make grid → CP/SP → line profit → `+ Insert below`.
- The old full-height enumeration/control gutter is gone. The index is a small chip in `.ihead` only.

## 4. Count and enumeration semantics (unchanged)

- Count label: `N items · M groups`.
- Items count from `rows` regardless of membership. Groups never count.
- Collapse does not change counts.
- Group remove: `5 items · 2 groups` → `5 items · 1 groups`. Members are kept with `gid` reset to `null`.
- Numbering stays global and continuous. Member numbers are assigned before `groupHTML` runs. Sample: root item 01, Group A members 02 03 04, Group B member 05.
- Move, duplicate, insert, `addItemTo`, `addItem`, and `addGroup` recompute numbers for full display order.

## 5. Unmistakable collapse state

- Open header: dark gradient background, white text, light controls, `aria-expanded="true"`, count label without suffix.
- Collapsed header: `.ghdr.closed` switches to a white background with a dashed accent border, dark text, a rotated chevron, and light controls. The count label gains a `· collapsed` suffix. `aria-expanded="false"`.
- When collapsed, `.gmemb` and its `gadd` button are not rendered at all. Members stay in `rows`, keep their numbers, and still contribute to totals.
- Collapsed groups gain `margin-bottom: 8px` so the closed state reads as a stopped section.
- The toggle runs a full `renderItems()`.

## 6. Mobile touch targets

All primary targets meet the 36–44px band:

| Control | Size |
|---|---|
| `.mbtn` move/dup/remove, `.gchev`, `.ear2` | 36×36px |
| `.gadd`, `.ins`, `.subtog` | min-height 36px |
| `.x` close button | 36×36px |
| `.sw` column switch | 48×36px |
| `.tbn` toolbar buttons | height 36px |
| `.cbtn` / `.cbtn2` creation pair | height 44px |
| `.cta` sheet actions | height 44px |
| `.choice` sheet rows | min-height 44px |
| `.topbar .back` | min-height 36px |

The `.ihead` row width at 360px: index 24 + four 36px buttons + gaps ≈ 192px. `#items` content is ≈308px. No horizontal overflow at 360px.

## 7. Permanent bottom creation pair

- The toolbar `Group` button is removed. `onclick="addGroup()"` now appears exactly once in the file: in the creation pair.
- The old `.addline` single button is replaced by `.createpair`: a two-column grid directly under `#items`, always present even when the list is empty.
- Left: filled `.cbtn` `+ Add line item` (`addItem()`), title "Adds an ungrouped item".
- Right: dashed `.cbtn2` `+ Add group` (`addGroup()`), title "Adds an empty group".
- Both buttons are 44px tall, ≈150px wide at 360px. `#items` keeps `gap: 0` so the pair sits close to the last row and stays visible without a toolbar trip.

## 8. Color and saturation

- Rows carry no background fill. Separation comes from a bottom hairline and the left status border.
- Group identity comes from the dark header band plus the muted spine (`rgba(30,58,95,.18)`), not from stacked tinted panels.
- Closed headers return to white with a dashed border, which lowers visual weight for collapsed sections.
- Accent color is reserved for the primary creation button and interactive states.

## 9. Preserved semantics

The previous pass contract is untouched:

- JSON import full contract: invalid JSON, empty input, array root, missing `items`, non-array `groups`, bad group name, unknown `group_id`, `itemIds` reference to a missing payload item all produce visible errors in `#impErr`.
- Failed import never replaces `rows`.
- Import success maps `description`, `sub_description`, `quantity`, `unit`, `unit_price`, `cost_price`/`cp`, `spec`, `make`, `group_id`, `groups[].itemIds`, and top-level `title`.
- Missing quantity imports as 0.
- `removeRow` on a group ungroups members (keep-items).
- `moveRow` uses splice by sibling list. Move-up at index 0 is a no-op.
- `editRow` is model-only (no re-render on keystroke). `editNum` runs `renderTotals()` + `patchProfit(id)`.
- Sub-description toggle, CP/SP columns, totals, and save validation are unchanged.

## 10. Interaction and structure checks

A Node harness (DOM stub + extracted `<script>` + assertions) ran and printed `ALL OK`:

- Count `5 items · 2 groups`; numbers 01–05.
- Rendered markup contains `.ihead`, `.ghdr`, `.gmemb`, `.gadd`, `aria-expanded`.
- No legacy markup: no `gwrap`, `uhead`, `umid`, `upock`, `grip`, or `class="ear"`.
- Collapse: `.ghdr closed` with `data-gid`, only one `.gmemb` remains (the other group is open), `· collapsed` suffix, `aria-expanded="false"`, counts unchanged. Expand restores `.gmemb`.
- Move, group remove (ungroup + count), duplicate, insert, `addItemTo`, `addGroup`, `addItem`, move-up guard.
- Import failures: bad `group_id`, invalid JSON, empty input, array root, non-array `groups`, missing `items`.
- Import success: membership, qty 400, cp 5200, sp 6100, title `T`, count `1 items · 1 groups`, numbering restarts at 1.
- Failed import leaves `rows` length unchanged. Missing quantity → 0.

Static checks on the raw HTML (21 assertions, all pass): `createpair` present and placed after `#items`; `onclick="addGroup()"` exactly once; no `addline`, no `.gwrap`/`.grow`, no `.uhead`/`.upock`/`.grip`/`.ear` CSS; no Group button in the toolbar; target sizes 36/44px for `.mbtn`, `.cbtn`, `.tbn`, `.cta`, `.sw`, `.choice`, `.subtog`, `.ins`, `.gchev`, `.ear2`; `#items` `gap:0`.

## 11. Git scope

- Baseline captured before edits. After edits: only the target HTML is modified.
- No `git reset`, `checkout`, `restore`, `clean`, or `stash` ran.
- The six item-library files that were uncommitted at the start of this task are now committed by another agent at HEAD `361d25ec`. They were not touched by this task.

## 12. No-build confirmation

- `bun run build`: not run (hardware policy).
- `bun run typecheck`: not run (not required for this HTML task).
- `bun run lint`: not run (not required for this HTML task).
- Checks run:
  - `node --check` on the extracted `<script>` (18,611 bytes): passed.
  - `git diff --check`: passed (only the pre-existing CRLF warning).
  - DOM-stub logic harness: `ALL OK`.
  - Static structure checker: `ALL STATIC PASS` (21 assertions).

## Verification

- `bun run audit:load`: passed. It reported only pre-existing warnings in `src/` (oversized files, broad selects). None relate to this HTML file.
- `bun run typecheck`: not applicable (static HTML task).
- `git status`: only the target HTML is modified.
- `git diff --check`: passed.
- Logic harness: `ALL OK`.
- Static checker: `ALL STATIC PASS`.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- The harness uses a DOM stub. It proves logic and emitted markup strings. It does not prove CSS layout. Visual checks need a browser at 360px, 390px, and 430px.
- The adjacency spacing relies on the CSS `:has()` selector. Browsers without `:has()` support would lose only spacing nuance, not function.
- The import parser is local to this HTML file. It is not the production parser. Drift is possible if the production contract changes.
- Group rows still have no move buttons. Groups stay in creation order. This is a deliberate simplification.

## Deferred work

- Group reorder (move group up/down).
- Drag-and-drop. No grip affordance exists now; add it only if users ask.
- Browser visual pass on phone widths (360/390/430px) to confirm no horizontal scroll.
