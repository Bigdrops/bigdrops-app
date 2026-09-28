# Invoice Form V6 Candidate Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Create Invoice mobile/fold V6. V6 converges the Invoice line-item composition with the accepted BOQ V12 mobile composition.

The task made four corrections to V5:

1. Move the row amount to the end of the item.
2. Use two fields per row on mobile. V5 put three fields in one row.
3. Compose an odd field count deliberately. Give the unpaired field a companion.
4. Keep the V5 vertical enumeration rail.

## Scope

This is a design-prototype task. It changes one standalone HTML file.

The task does not change production React or TypeScript code, the database, Supabase policies, migrations, or calculation rules.

## Files changed

| File | Change |
| --- | --- |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v6.html` | Created. 2,369 lines, 150 KB. |
| `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-v6-2026-09-28.md` | Created. This report. |

No other file was created or modified by this task.

Reference files were read only:

- `.../form/invoice/invoice-form-candidate-mobile-fold-v5.html`
- `.../form/boq/boq-form-candidate-v12.html`
- `.../form/invoice/invoice-form-inline.html`

## Skills used: html-prototype, accessibility, mobile-app-ui-design, frontend-design

Documentation standard: ASD-STE100 Simplified Technical English

Notes on skill application:

- `html-prototype` supplied the fidelity model and the handoff rules. It also supplied the rule that source inspection is not a substitute for visual testing. See "Risks or limitations".
- `accessibility` supplied the WCAG 2.2 checks. Two checks changed the file. See "Changes made", item 8.
- `mobile-app-ui-design` confirmed the central instruction of the task: expose content directly, do not hide it behind taps.
- `frontend-design` was loaded but not applied as a visual direction. That skill asks for a new bold aesthetic. This task owns no visual direction. The prototype series defines the design language. The user instruction is to converge with it, not to replace it.

## Changes made

### 1. The row amount moves to the end of the item

The amount was a compact line in the identity zone in V5. It is now a result band at the end of the item.

The band uses the existing `--amount-bg` and `--on-dark` tokens. These tokens already existed in the V5 file. The band holds a small uppercase label on the left and a 14.5 px mono value on the right.

The source of this change is `invoice-form-inline.html`. That file already places its `class="amountbar"` element after the field zone and before Insert below. V6 restores that order. BOQ V12 places its line-profit band in the same relative position.

New mobile read order:

```
identity / controls -> Description -> Item Library context -> Sub Description / Photo
-> item fields -> row amount -> Insert below
```

### 2. Mobile fields now use two per row

V5 used `grid-template-columns:repeat(3,minmax(0,1fr))`. V6 uses `repeat(2,minmax(0,1fr))`.

The field zone now holds two grids:

- a fixed `Qty | Unit` pair, the same fixed pair BOQ V12 keeps;
- one grid for the remaining visible columns.

Field order in the second grid: Rate, VAT %, Disc %, Install, Part no., Condition, then custom columns.

The CSS also keeps the BOQ V12 auto-wrap rule:

```css
.fgrid > *:last-child:nth-child(odd) { grid-column: 1 / -1 }
```

That rule makes a trailing odd cell claim the full row. V6 keeps it as a fallback. See item 3 for the primary behaviour.

### 3. An odd field count now gets a companion

The default column configuration shows five fields: Qty, Unit, Rate, Part no., and Condition. Five is an odd count. One field would sit alone.

V6 gives the unpaired field the Photo control as a companion cell:

```
[ Qty      | Unit      ]
[ Rate     | Part no.  ]
[ Condition| Photo     ]
```

The rule is one line in `itemHTML`:

```js
var photoInGrid = cells.length % 2 === 1;
```

When the count is even the grid is already balanced. V6 then keeps Photo as a compact chip in the identity stack. V6 never forces Photo into a slot that does not need it.

Result by configuration:

| Visible fields in the second grid | Result |
| --- | --- |
| Odd (1, 3, 5, 7) | Last cell paired with the Photo cell |
| Even (2, 4, 6, 8) | Photo stays a compact chip in the identity stack |
| Grid holds one cell and no photo cell is added | BOQ full-row rule applies |

The Photo control is one control with two presentations: a full grid cell (`photoCellHTML`) and a compact chip (`photoRowHTML`). Both have a real label. Both keep the existing remove action.

### 4. The enumeration rail is preserved

V6 keeps the V5 rail without change:

- 28 px column;
- item number at the top;
- the move up / move down pair in the middle;
- duplicate at the bottom;
- the connecting line between the first and last control;
- row delete as a separate box in the item's top-right corner.

V6 does not return to the V4 horizontal item toolbar.

### 5. Make moves into the identity stack

Make was a grid cell in V5. It is now a field in the identity stack, after the Sub Description.

This is the position `invoice-form-inline.html` uses. It is also the position BOQ V12 uses. BOQ V12 renders its `make` input as the third child of the identity stack.

This move also produces the five-field default configuration that item 3 describes.

### 6. The Item Library keeps two states

V6 does not change either state.

- State A, discovery. Typing two or more letters opens suggestions. Each row shows item name, last price, use count, and last reference. The last item row opens in this state.
- State B, selected. The suggestion panel closes. The history becomes one muted line under the Description: `LIBRARY  Last sold: NGN ... · INV-2026-0131 · 2026-09-12 · 30 uses`.

There is no "Use price" action. There is no outlined price control. There is no green accent. The line carries no handler.

### 7. Groups keep the accepted V4/V5/V12 decision

- Groups stay permanently expanded.
- No collapse or expand control exists.
- The group delete X is the first control, on the left.
- Exactly one X exists per group header.
- The group name, item count, boundary, and membership stay.
- The group total display stays.

### 8. Fold is recomposed, not stretched

The fold tier (600 px and above) keeps the phone authoring model and redistributes it:

- identity stack in the left column;
- field grids in the right column;
- the amount band spans both columns below them;
- Insert below spans both columns last;
- the phone right inset is released to the fields, because the delete box sits in the left column at this width.

### 9. Two runtime defects are fixed

The V6 file is the first candidate that was executed, not only parsed. A DOM shim ran the inline script. That run found two defects. Both defects exist in `invoice-form-inline.html`, V4, and V5.

**Defect 1. The supporting-info cards never open.**

`renderSupportInfo()` reads the variable `open`. It never declared that variable. In a browser the name resolves to `window.open`, so every card read `undefined` and rendered collapsed. `toggleTerm()` re-rendered only the commercial-terms region, so a tap on a supporting card changed nothing.

Fix:

- `renderSupportInfo()` now declares `var open = state.openTerms;`;
- `toggleTerm()` now re-renders both regions.

**Defect 2. The cards render `aria-expanded="undefined"`.**

`state.openTerms` is a sparse map. A card that was never toggled passed `undefined` into the `aria-expanded` attribute. The attribute value was the string `undefined`. This is not a valid ARIA value.

Fix: `termCard()` coerces the value once with `var isOpen = !!open;` and uses `isOpen` for the class and the attribute.

After the fix, the generated markup contains 10 card headers with `aria-expanded="false"` and no `undefined` value.

## V5 vs BOQ V12 vs V6

### Structural comparison

| Aspect | Invoice V5 | BOQ V12 | Invoice V6 |
| --- | --- | --- | --- |
| Enumeration / control rail | 28 px vertical rail; number, move pair, duplicate; spine scoped to the identity zone | 34 px vertical rail; same three control groups | 28 px vertical rail; same structure as V5. Converged with BOQ in anatomy, not in size. |
| Description | `textarea`, min-height 46 px, auto-sized | `textarea`, min-height 64 px | `textarea`, min-height 46 px, auto-sized. Keeps the V5 density win. |
| Sub Description | Row beside Photo, in a secondary row | Row in the identity stack, 34 px toggle | Row in the identity stack, 28 px toggle. Converged with BOQ in placement. |
| Photo | Compact chip beside the Sub Description | Not modelled | Grid companion cell when the field count is odd; compact chip in the identity stack when even. Different by necessity: BOQ has no photo field. |
| Mobile fields per row | 3 | 2 | 2. Converged with BOQ. |
| Odd field handling | Not applicable. The three-across grid left no orphan. | Trailing odd cell claims the full row | Trailing odd field pairs with Photo. The BOQ full-row rule stays in the CSS as the fallback. |
| Row summary placement | Compact line in the identity zone, before the fields | Dark line-profit band after the data zone | Dark amount band after the field grids, before Insert below. Converged with BOQ in position and in band anatomy. |
| Delete control | 26 px box, top-right of the identity zone | 34 px box, top-right of the item | 26 px box, top-right of the identity zone. Same as V5. |
| Insert Below | After the data zone | After the data zone | After the amount band. Follows the amount, as in the baseline and BOQ. |
| Group treatment | X first on the left, permanently expanded, group total shown | X first on the left, permanently expanded, no group total in the header | Same as V5. |
| Rail extent (phone) | 127 px | 160 px | 127 px |
| Estimated row height (phone) | ~300 px | ~368 px | ~430 px |

### Where V6 converges with BOQ V12

1. Enumeration rail. Same vertical control architecture, same left-side position, same relationship to the item.
2. Field rhythm. Two fields per row at comfortable width.
3. The fixed numeric pair. Qty and Unit stay together as the first pair, as BOQ keeps them.
4. Result placement. The row result is the last element of the data zone.
5. Result anatomy. A dark band with a small uppercase label on the left and a mono value on the right.
6. Make position. Make lives in the identity stack after the Sub Description.
7. The odd-cell rule. V6 keeps the BOQ `:nth-child(odd)` full-row rule.

### Where V6 stays different, and why

1. **Row height.** V6 estimates at about 430 px per row against about 368 px for BOQ V12. Invoice shows five fields by default. BOQ shows four. The fifth field costs one 56 px row. Invoice also has the Item Library line and a taller amount band.
2. **The Photo companion.** BOQ leaves an odd trailing field spanning the full row. V6 pairs that field with Photo. Invoice has a supporting control that belongs in the item body. BOQ has none. A full-width Photo field would read as a stretched orphan. The BOQ rule stays as the fallback.
3. **The rail size.** The BOQ rail is 34 px. The V5 rail is 28 px. The task says to preserve the V5 correction. V6 keeps 28 px. The rail is shorter than the BOQ rail by 33 px.
4. **The Description height.** BOQ uses 64 px. V6 uses 46 px, which is the V5 density improvement the task asked to preserve.
5. **Group total.** Invoice shows a group total. BOQ V12 does not model one. The task says to preserve the Invoice group total.
6. **Field grouping.** The baseline uses three separate `.fgrid` groups. V6 uses one grid for all remaining columns. Reason: the baseline leaves an empty grid row when a whole group is hidden, and three separate groups produce more than one possible orphan. The task asks for one possible "final single/unpaired field". One grid gives exactly that and yields the five-field default.
7. **Row height against V5.** V6 is about 130 px taller per row than V5. This is the cost of the two-per-row instruction. V5 was the outlier. The baseline `invoice-form-inline.html` estimates at about 500 px per row, so V6 is still about 14% shorter than the baseline.

### Estimated row height, arithmetic

These figures come from the CSS box model. No device measured them.

| Component | BOQ V12 | Invoice V6 |
| --- | --- | --- |
| Item padding-top | 14 | 12 |
| Identity zone (rail vs stack, the taller wins) | 160 | 146 |
| Data zone, margin + grids + result band | 164 | 242 |
| Insert below, margin + line | 30 | 30 |
| Total | 368 | 430 |

Invoice V6 data zone detail: 10 px margin + 56 px `Qty | Unit` row + 8 px gap + 120 px two-row second grid + 8 px gap + 40 px amount band = 242 px.

## Verification result

```
- git status, before: captured. Working tree already held other agents' changes.
- git status, after:  one new file in task scope, invoice-form-candidate-mobile-fold-v6.html
- bun run build: skipped. Permanently banned by the task and by AGENTS.md section 5.
- bun run typecheck: skipped. Excluded by the task.
- bun run lint: skipped. Excluded by the task.
- bun run audit:load: skipped. Excluded by the task.
- supabase db push: not applicable
```

Static checks, all passed:

| Check | Result |
| --- | --- |
| Inline `<script>` blocks | 1 |
| Inline JavaScript parses | passed, 1,365 lines |
| Inline script executes against a DOM shim | passed |
| Generated line-item markup tag balance | passed, 17,166 characters |
| `getElementById` targets resolve | passed, 32 references against 64 ids |
| Inline handlers resolve | passed, 62 handlers |
| Two-column field grid present | passed |
| BOQ trailing-odd-cell rule present | passed |
| No three-across item grid | passed |
| Odd count drives the Photo companion | passed |
| Make in the identity stack | passed |
| Amount band after the field grids | passed |
| Insert below after the amount band | passed |
| No V5 leftovers (`photoHTML`, `.amtrow`, `.mgrid`, `.srow`) | passed |
| No Invoice/Quotation switcher | passed |
| No "Use price" action | passed |
| Selected history is one muted line | passed |
| One group control per header, first, dangerous style | passed |
| No group collapse code or state | passed |
| Group total preserved | passed |
| No BOQ-only semantics in user-visible text | passed, 5,593 characters scanned |
| Card `aria-expanded` values are booleans | passed, no `undefined` |
| Supporting cards can open | passed |
| Focus clears the sticky bars | passed |
| Toast is a live region | passed |
| Title reads V6 | passed |

Protection check:

| File | State |
| --- | --- |
| `invoice-form-inline.html` | unchanged. Modified time 2026-09-27 23:13. |
| `invoice-form-candidate-mobile-fold-v4.html` | unchanged by this task. Modified time 2026-09-28 07:03. |
| `invoice-form-candidate-mobile-fold-v5.html` | unchanged. Modified time 2026-09-28 07:20. |
| `invoice-form-candidate-desktop-v5.html` | unchanged. Modified time 2026-09-28 07:20. |
| `boq-form-candidate-v11.html` | unchanged. Modified time 2026-09-27 18:16. |
| `boq-form-candidate-v12.html` | unchanged. Modified time 2026-09-28 07:00. |

No production application source file was modified.

## Supabase push status

Not applicable. This task changed no SQL and no database object.

## Risks or limitations

1. **No visual verification.** The task bans browser automation. The task bans `bun run build`. The density and layout claims come from the CSS box model and from executed markup, not from a rendered page. Confirmed by execution: DOM structure, attribute values, handler resolution, and text content. Not confirmed: rendered geometry, contrast in the browser, and behaviour under a real layout engine.
2. **The 44 px touch-target recommendation is not met on the rail.** The rail buttons are 28 px, with hit areas that extend to about 38 px. This exceeds the WCAG 2.2 AA minimum of 24 x 24 px. It does not reach the 44 px recommendation. The compact rail is a V5 decision that this task preserves.
3. **The photo companion depends on the column configuration.** A reviewer who hides an optional column sees the other presentation of that grid. The scaffold strip names this and states the action that switches between them.
4. **The two defect fixes make V6 differ from V5 in behaviour.** The difference is a repair, not a design change. Reviewers should expect the supporting-info cards to open in V6 and not to open in V5.
5. **Spacing does not sit on one numeric grid.** The prototype uses 5, 6, 7, 8, 10, and 12 px gaps. This is inherited from the baseline. A re-grid would be a redesign, which this task forbids.
6. **The concurrent-agent risk is live.** Other agents changed many files during this task. None of those files were touched.

## Deferred work

1. Render V6 in a browser and confirm the geometry, the Photo companion in both configurations, and the fold split. This is the largest open item.
2. Measure the real row height against V5 and against `invoice-form-inline.html` on a device.
3. Check contrast for the muted Item Library line (`--faint` on `--bg`) against WCAG 2.2 AA for small text.
4. Decide whether the supporting-info fixes should also be applied to V4, V5, and the inline baseline. Those files are protected in this task.
5. Decide whether the Invoice field grids should group semantically, as the baseline does with three separate groups.
6. Align the prototype spacing to one numeric scale, if the project adopts one.
