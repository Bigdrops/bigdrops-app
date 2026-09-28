# Invoice Form V4 and BOQ V12 Design Candidates Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Reduce authoring friction in the Invoice form.

Make one targeted change to the BOQ group control.

V3 was rejected because it copied the accepted Invoice baseline without
resolving the known density problems. V4 is not a copy. V4 recomposes the
item row, the Item Library states, and the desktop document layout.

Deliverables:

1. `invoice-form-candidate-mobile-fold-v4.html`
2. `invoice-form-candidate-desktop-v4.html`
3. `boq-form-candidate-v12.html`

## Scope

| Item | In scope | Out of scope |
| --- | --- | --- |
| Standalone HTML design prototypes | Yes | - |
| Production React or TypeScript code | No | Yes |
| Database schema, migrations, policies | No | Yes |
| Invoice or BOQ calculation rules | No | Yes |
| `invoice-form-inline.html` | Read only | Modified? No |
| Invoice V1, V2, V3 candidates | Read only | Modified? No |
| `boq-form-candidate-v11.html` | Read only | Modified? No |

This is a design-prototype task. No production behaviour changed.

## Files changed

Added:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v4.html
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v4.html
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v12.html
docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v4-boq-v12-2026-09-28.md
```

Removed:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/.v4-verify.cjs
```

That last file was a temporary static checker. This task created it and
deleted it. No other file changed.

## Skills used

Skills used: html-prototype, accessibility

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

All text in this report uses ASD-STE100 Simplified Technical English.

## Changes made

### 1. Invoice mobile and fold V4

The file starts from `invoice-form-inline.html`. All capabilities of the
baseline remain. The item composition changed.

#### 1.1 Item row header replaces the enumeration rail

The baseline used a 34 px left rail. The rail held the row number, the move
buttons, and the duplicate button. A vertical line ran behind them. The line
extended past the rail into empty row height.

V4 deletes the rail. Row identity, reorder, duplicate, amount, and delete now
share one 28 px line at the top of the row.

```text
[ 01 ] [up] [down] [duplicate] ......... <amount> [X]
```

Each control keeps a 38 px touch target through an invisible hit area
(`.rbtn::after` and `.ear::after` with `inset:-5px`).

The dual-line spine is gone. No decoration runs through empty height.

#### 1.2 Description

The Description keeps its field dominance. It stays a full-width field at
13 px. It is one row high by default. A new `autoSize()` function sets the
height from `scrollHeight` after every item render.

Result: the field grows only when the text needs more lines.

#### 1.3 Item Library state A and state B

The prototype shows both states at the same time.

State A, discovery:

- The suggestion panel opens on focus or on typing 2 or more letters.
- A suggestion row shows the item name, the price, and one meta line.
- The meta line now reads: usage count, last reference number, and last used
  date, for example `30 uses · INV-2026-0131 · 2026-09-12`.
- Row 04 of the seeded document starts in this state. `state.suggestFor` is 6.

State B, selected:

- The old dashed price-context box is deleted.
- The old full-width "Use price" button is deleted.
- A new `libLineHTML()` function renders one contextual line under the
  Description:

```text
● Copper cable 4mm² · Last sold: ₦6,500.00 · INV-2026-0131 · 2026-09-12 · 30 uses   [Use ₦6,500.00]
```

- The price action is a 22 px text button. It appears only when the library
  price differs from the row rate.
- Row 02 of the seeded document is in this state. It carries
  `item_id: 'cat-cable'`.

A dashed prototype strip above the list names both states and points to the
two rows. The strip is scaffolding. It is not part of the shipped form.

#### 1.4 Photo and Sub Description

Both controls moved into one secondary row under the Description.

- `.srow` is a wrapping flex row.
- The Photo control is a 28 px dashed chip. A saved photo is a 38 px thumb.
- The Sub Description keeps the accepted BOQ V11 behaviour. Empty shows a
  compact add row. Populated shows the real text with a 2-line clamp. Tap
  opens the editor. Empty blur closes it.
- The editor takes a full line when it opens (`flex-basis:100%`).

The Sub Description content stays reviewable. No "view more" control was
added.

#### 1.5 Optional columns use horizontal space

The three stacked 2-column grids are replaced by two 3-column grids.

| Grid | Cells |
| --- | --- |
| Numbers | Qty, Unit, Rate, then VAT %, Disc %, Install when enabled |
| Optionals | Make, Part No., Condition, then any custom column that is visible |

- Each visible field costs one cell, not one full-width row.
- Qty, Unit, and Rate stay adjacent on the first line of the numbers grid.
- The field height inside a grid is 40 px.
- Custom columns from the Column Manager now render in the row. They did not
  render in the baseline.

With the default column set (Qty, Unit, Rate, Make, Part No., Condition) the
data zone is two grid rows. The baseline used five stacked rows.

#### 1.6 Amount

The full-width dark amount bar is deleted. The amount moved into the row
header as a two-line readout:

```text
3 × ₦184,000.00
₦552,000.00
```

The readout costs no extra row height. `renderTotals()` updates the readout
in place. It no longer targets `.amountbar`.

#### 1.7 Groups: left delete X, permanent expansion

Groups stay groups. Group contents stay visible. Group boundaries stay. The
group total stays. Membership stays. Only the control arrangement changed.

Before:

```text
[collapse/expand on left] Group name / count / group total [X delete on right]
```

After:

```text
[X delete on left] Group name / count / group total
```

- `toggleGroup()` is deleted.
- The `.gwrap.collapsed` CSS block is deleted.
- The `.gbtn .chev` rule is deleted.
- `collapsed` is removed from the seed data, `addGroup()`, and the import
  adapter.
- The `.gbody` and `.gfoot` of every group always render.
- Exactly one `gbtn` exists per group header. It is the delete X.

#### 1.8 Fold (600 px and above)

The fold is a recomposition of the phone model, not a desktop table.

- Wider wrap: 880 px.
- Item becomes two zones: identity zone on the left, data zone on the right,
  separated by a hairline.
- The data zone becomes a 2-column grid inside its narrower column.
- Commercial terms and Supporting info become 2-column boards.
- The prototype strip becomes one row.
- Description minimum height at fold is 60 px.

#### 1.9 Accessibility additions

- The toast is now a live region: `role="status"` and `aria-live="polite"`.
  Save validation messages are announced without moving focus.
- The Description field carries `aria-invalid="true"` when save validation
  fails on that row.

### 2. Invoice desktop V4

This is a separate composition. It answers a different design question.

The V3 desktop problem: the user had to click a section index to reveal each
section. That cost is removed.

- The document is continuous. All five sections are in the flow.
- The section index in the top bar is navigation only. Each chip is an anchor
  that scrolls to a section that is already present. No chip hides a section
  and no chip controls which section exists.
- Two regions sit side by side on a 1320 px canvas:
  - Main column: Document details, Line items, Commercial terms, Supporting
    info.
  - Sticky rail: Totals, with the persistent Save action.

Desktop-specific composition:

| Region | Treatment |
| --- | --- |
| Top bar | Section index plus Save, sticky |
| Document details | 4-column grid, wide fields span 2 columns |
| Line items | Identity column plus a 3-column data grid |
| Commercial terms | 3-column card board |
| Totals | Sticky rail, 72 px below the top bar |
| Supporting info | 2-column board |
| Column Manager, Import | Centred desktop dialogs, 760 px |

- `.docgrid` places the sections. `#sec4` spans the main rows in column 2 and
  uses `align-self:start` with `position:sticky`. Section order in the DOM is
  unchanged.
- `scroll-margin-top` is 84 px on each section. An anchor jump clears the
  sticky bar.
- The layout chip reports `Desktop` at 1024 px and above.
- No BOQ-only concept is present. No CP, SP, profit, margin, or vendor.

### 3. BOQ V12

`boq-form-candidate-v12.html` is a copy of the accepted BOQ V11 file. One
change was applied.

Changed:

- `.gwrap:not(.collapsed)` becomes `.gwrap`.
- The `.gwrap.collapsed` CSS block is deleted.
- The `.gbtn .chev` rule is deleted.
- `toggleGroup()` is deleted.
- `collapsed` is removed from the seed data, `addGroup()`, and the import
  adapter.
- The group header becomes `[X delete] Group name · item count`.
- The label no longer appends ` · collapsed`.
- The header note documents the V12 change.

Unchanged: group name, item count, group boundary, item membership, item
rendering, reorder, Sub Description, columns, import, totals, and layout.

The `diff` against BOQ V11 reports 63 changed lines. All changed lines are
inside the group control, its CSS, or the file header note.

Note on the group total: BOQ V11 has no group total in the group header. The
`gsum` element exists only in the Invoice prototype. V12 therefore preserves
the absence of a group total. To add one would be an unrelated BOQ redesign.

## Verification result

Static verification only. The task forbids build, typecheck, lint,
`audit:load`, browser automation, and Supabase commands.

```text
Verification:
- bun run audit:load: not run, excluded by the task instruction
- bun run typecheck: not run, excluded by the task instruction
- bun run build: skipped due to hardware policy
- inline JavaScript syntax: passed for all three files
- generated markup tag balance: passed for all three files
- getElementById targets: 37/37, 37/37, 17/17 resolved
- inline handlers: every on* attribute handler resolves to a declared function
  or a declared variable
- in-page anchors (desktop): 5/5 resolved
- git status: only the three V4/V12 files plus this report
- supabase db push: not applicable
```

### Check results in detail

| Check | Mobile/Fold V4 | Desktop V4 | BOQ V12 |
| --- | --- | --- | --- |
| Inline JS syntax | OK, 1355 lines | OK, 1355 lines | OK, 696 lines |
| Generated markup balance | OK | OK | OK |
| Removed-composition leftovers | NONE | NONE | NONE |
| Item Library state A present | Yes | Yes | n/a |
| Item Library state B present | Yes | Yes | n/a |
| Group delete X first in header | Yes | Yes | Yes |
| Group collapse chevron present | No | No | No |
| Group header control count | 1 | 1 | 1 |
| Group contents always rendered | Yes | Yes | Yes |
| Group total kept | Yes | Yes | Absent in V11, absent in V12 |
| Sections present at once (desktop) | n/a | 5 of 5 | n/a |
| Section gating or tabs | n/a | None | n/a |

### Original files unchanged

File modification times and git status confirm that the read-only inputs were
not touched:

| File | Modified time | State |
| --- | --- | --- |
| `invoice-form-inline.html` | 2026-09-27 23:13 | unchanged |
| `invoice-form-candidate-mobile-fold-v3.html` | 2026-09-28 06:12 | unchanged |
| `invoice-form-candidate-desktop-v3.html` | 2026-09-28 06:15 | unchanged |
| `boq-form-candidate-v11.html` | 2026-09-27 18:16 | unchanged |

All four times are earlier than the first V4 write.

### BOQ-only semantics scan

The scan reports `line profit`, `gross profit`, and `vendor`. All three occur
only in the file header comment. That comment lists the concepts that are
excluded from the Invoice prototype. There is no such field, label, or
calculation in the form.

### Concurrent repository activity

Another agent committed to the repository during this session. Commit
`f9f2cfb8` moved the pre-existing modified and untracked files into history.
That commit also included the in-progress V4 mobile/fold file.

The final `git status` therefore reads:

```text
 M .../invoice/invoice-form-candidate-mobile-fold-v4.html
?? .../invoice/invoice-form-candidate-desktop-v4.html
?? .../boq/boq-form-candidate-v12.html
```

The `M` entry is the V4 mobile/fold file. Its diff against HEAD is 19
insertions and 9 deletions. That diff is the final part of this task: the
amount readout update, the comment correction, and the two accessibility
additions.

No pre-existing work was reverted, overwritten, or deleted by this task.

## Supabase push status

Supabase push status: not applicable.

This task changed no SQL, no migration, no policy, and no database object.

## Risks or limitations

1. No browser or visual verification was performed. The task excludes browser
   automation and the hardware policy excludes the build. The density
   improvement is reasoned from the component heights in the source. It is
   not measured on a device.
2. The suggestion panel for the seeded discovery row shows one row. The
   catalog has six items and matching is substring-based on the typed text.
   The value of the strip is the row content: name, price, use count,
   reference, and date.
3. The desktop sticky rail is limited to Totals. Totals is short enough to
   stay fully visible. If Totals grows, the sticky behaviour needs review.
4. The prototype strip in both Invoice prototypes is scaffolding. Remove it
   before the design is used as a specification.
5. `priceContextText()` is now unused. It remains in the file. Removal needs
   a separate task because the same function name appears in related
   prototypes.
6. The `.amount-bg` and `--on-dark` tokens are now unused in the Invoice V4
   files. They are harmless. They were left in place to keep the change
   surgical.
7. The seeded `suggestFor` value changed from 8 to 6. This is scaffolding for
   state review. It does not model a business rule.
8. `addGroup()` still creates a group with `showSubtotal: false`. That is the
   baseline behaviour and it is unchanged.

## Deferred work

1. Visual and interaction review at 360 px, 430 px, 820 px, and 1440 px.
2. Keyboard review of the new row header: tab order, focus ring, and the
   disabled state of the move buttons.
3. A focus-not-obscured rule. Section anchors already clear the sticky bar.
   A rule on every focused field was tested in review and rejected. It can
   cause unwanted scroll on a click into a field near the top of the viewport.
4. Add a skip link on the desktop variant that jumps to the line items.
5. Delete the unused `priceContextText()` function in a dedicated task.
6. Consider a group total for BOQ. BOQ V11 has none. This needs an explicit
   task because it is a BOQ behaviour change.
7. Confirm the `aria-invalid` message text. The current announcement is the
   toast text only.
