# BOQ Full-Page Live Form Group Containment and Import Report

This report was written by OpenCode (mimo-v2.6-flash-free) on 2026-09-25 via Local Runner.

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Redesign the BOQ full-page live form for section A–F of the task. Goals:

1. True group containment.
2. Correct item counting and enumeration.
3. Per-item collapsible sub-description.
4. Restored JSON import with the real contract.
5. Item management separated from item content.
6. No permanent enumeration gutter.
7. Group-local and global row creation.
8. Group collapse.

All calculation, validation, and save behavior must stay unchanged.

## Scope

One file changed:

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`

No other file changed. The production React app, the import parser, the database, `boq-sample-v1.html`, and `MobileItemCard` files were not touched.

## 1. File modified

Only the target HTML changed. Git status after the work:

- Modified: the target HTML (this task).
- Modified: `src/components/invoice/MobileItemCard.tsx` and `.test.js` (another agent, untouched).
- Untracked: one report in `docs/reports/item-library/` (another agent, untouched).

## 2. Group model

- A group row is `{id, type:'group', title, collapsed}`.
- A member item stores `gid` = group id. A root item has `gid = null`.
- The render walk prints groups via `groupHTML(r)`. It prints members inside `.gmemb`. It prints only root items at top level.
- Orphan `gid` values reset to `null` before counting.
- Group controls: chevron (`gchev`), title input, item count, remove button.
- Remove group: members become root items. Items are never deleted with the group.
- Group creation: toolbar "Group" button. Item creation inside a group: "+ Add item to this group" (`addItemTo`). Global creation: "Add line item" (`addItem`), tooltip "Adds an ungrouped item".

## 3. Count semantics

- Count label: `N items · M groups`.
- Items count from `rows` regardless of membership.
- Groups never count as items.
- Collapse does not change counts. Example check: 5 items, 2 groups stay the same after a group collapses.
- Group remove: 5 items, 2 groups → 5 items, 1 groups. No item is lost.

## 4. Enumeration

- Numbering is global and continuous. Assignment happens in one display-order walk.
- Member numbers are assigned before `groupHTML` runs. `itemHTML` reads `nums[id]`.
- Sample: root item → 01, Group A members → 02 03 04, Group B member → 05.
- After a move, numbers recompute for the full display order.
- The number lives in the upper zone only (`.uhead`, 28px + 1fr grid). No full-height gutter.
- Move up/down and duplicate buttons sit in `.umid .upock`. The drag grip sits in `.uhead`.

## 5. Group collapse

- `collapsed: true` hides `.gmemb` and the group's add button. The header stays visible.
- Collapsed members still count. The label shows their numbers in the full sequence.
- Chevron rotates when closed. Toggle runs a full `renderItems()`.

## 6. Sub-description behavior

- One toggle per item (`.subtog`) inside `.subrow`, indented 36px.
- Collapsed by default (`subOpen` false). Open state and text survive other re-renders (`r.sub`).
- Toggle with content shows the accent class `has`. Chevron rotates when open.
- Open action runs `renderItems()` then focuses `.subta`.
- Text input updates the model and patches only the `has` class. No re-render. This keeps focus during typing.

## 7. JSON import contract

- Toolbar "Import" opens the `#ovImport` sheet (`openSheet('import')`).
- Input: `#impTa` textarea. Action: "Import & Replace".
- Parser is local. The production parser (`quotationImportAdapter`) is not modified.
- Mapping: `description`, `sub_description`, `quantity`, `unit`, `unit_price`, `cost_price`/`cp`, `spec`, `make`, `group_id`, group membership via `groups[].itemIds`, top-level `title` → `#fTitle`.
- Missing `quantity` imports as 0. No value is invented.
- Ignored keys: notes, terms, po_number, extra_charges. This is stated in the sheet note and in the toast area copy.
- Validation collects all errors into `#impErr` (red, pre-wrap). Failure shows a failure toast. Failed import never replaces `rows`.
- Checked failures: empty input, invalid JSON, array root, missing `items`, non-array `groups`, bad group name, unknown `group_id`, `itemIds` reference to a missing payload item.
- Success: `rows = [...groupRows, ...itemRows]`, close sheet, render, toast `Imported N items · M groups`.

## 8. Duplicate and row actions location

- Duplicate button moved to `.umid .upock` next to move up/down.
- `.uctl` keeps the specification input only.
- `dupRow(id)` copies by id, keeps `gid`, appends " (copy)", resets `subOpen`.
- `insertBelow(id)` inserts a blank row with the same `gid`, then scrolls to it.
- `moveRow(id, dir)` uses splice semantics: remove first, then insert at the recomputed target index. A swap would cross group boundaries and corrupt membership. Guarded by sibling index bounds.

## 9. UX lessons

- Full re-render on each keystroke destroyed input focus. Model-only `editRow` fixes it.
- A swap-based move broke when members and roots were interleaved. Splice by sibling list is correct.
- Groups must not count as items. The old label used `rows.length - items`, which double-counted.
- Move buttons must stay inside the compact upper zone. A full-height action column wastes width on phones.
- Import must fail loudly. Silent partial imports hide bad data.

## 10. Interaction checks

A Node harness with a DOM stub ran the extracted script and checked:

- Count label `5 items · 2 groups` on load.
- Global numbering `01`–`05` across roots and both groups.
- Count stable after collapse and after group remove.
- `moveRow` reorders and renumbers. Up at index 0 is a no-op.
- Group remove ungroups members. Row count unchanged.
- Import: bad `group_id`, invalid JSON, non-array `groups`, missing `items` all produce visible errors.
- Import success: membership, quantity 400, unit_price 6100, cost_price 5200, title set, count `1 items · 1 groups`.
- Missing quantity imports as 0.
- Failed import leaves `rows` unchanged.
- `dupRow` keeps `gid` and adds "(copy)". `insertBelow` grows `rows`. `addItemTo` adds to the group member list.

Result: `ALL OK`.

## 11. Git scope

- Baseline: `git status --short` before edits. Target file only.
- After edits: same scope. The other agent's files were not written.
- No `git reset`, `checkout`, `restore`, `clean`, or `stash` ran.

## 12. No-build confirmation

- `bun run build`: not run (hardware policy).
- `bun run typecheck`: not run (not required for this HTML task).
- `bun run lint`: not run (not required for this HTML task).
- Checks run:
  - `node --check` on the extracted `<script>`: passed.
  - `git diff --check`: passed (only pre-existing CRLF warnings).
  - Logic harness: `ALL OK`.

## Verification

- `node --check`: passed
- `git diff --check`: passed
- `git status`: target HTML modified; other changes belong to other agents and were not touched
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy

## Risks or limitations

- The import parser is local to this HTML file. It is not the production parser. Behavior matches the contract in `docs/standard/json-import-standard.md`, but drift is possible if the production contract changes.
- The logic harness uses a DOM stub. It does not prove CSS layout. Visual checks need a browser.
- Group rows have no move buttons. Groups stay in creation order. This is a deliberate simplification.

## Deferred work

- Group reorder (move group up/down).
- Drag-and-drop. The grip is a visual affordance only.
- Browser visual pass on phone widths.
