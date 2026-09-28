# Invoice Form V7 Candidate Report

This report was written by Muse Spark on 2026-09-28 via OpenCode.

Correction recorded below was written by Muse Spark on 2026-09-28 via
OpenCode. It modifies the V7 candidate in place. No V8 was created.

## Objective

Create Invoice mobile/fold V7. V7 integrates the accepted phone row prototype
(`mobile-row-composition.html`) into this complete Invoice form and adds a
deliberate fold adaptation of the same hierarchy.

V7 keeps every V6 capability. It changes only the item-row composition.

## Scope

This is a design-prototype task. It creates one standalone HTML file.

The task does not change production React or TypeScript code, the database,
Supabase policies, migrations, or calculation rules.

## Files changed

| File | Change |
| --- | --- |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v7.html` | Created. 2,363 lines. Copied from V6, then edited. |
| `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-v7-2026-09-28.md` | Created. This report. |

No other file was created or modified by this task.

Reference files were read only:

- `.../form/invoice/mobile-row-composition.html`
- `.../form/invoice/invoice-form-candidate-mobile-fold-v6.html`
- `.../form/boq/boq-form-candidate-v12.html`
- `.../form/invoice/invoice-form-inline.html`
- `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-v6-2026-09-28.md`

## Skills used: html-prototype, accessibility, mobile-app-ui-design, safe-area-handling

Documentation standard: ASD-STE100 Simplified Technical English

Notes on skill application:

- `html-prototype` supplied the fidelity model and the handoff rules. V7 is a
  working prototype: all demo controls, states, and flows stay operable.
- `accessibility` supplied the WCAG 2.2 checks. The camera button keeps an
  accessible name and a 44 px target. The delete box keeps its label and hit
  area. No check changed the file beyond the planned composition.
- `mobile-app-ui-design` confirmed the row decisions: expose fields directly,
  keep primary content dominant, keep touch targets usable.
- `safe-area-handling` confirmed the viewport and inset rules. V7 keeps the
  `viewport-fit=cover` meta tag and the safe-area padding from V6.

## Changes made

### 1. The first grid row is the Condition + Photo closer

V6 placed Photo beside the unpaired field when the field count was odd, or as
a chip in the identity stack when even. V7 removes both positions.

The first grid row is now always the accepted closer when the Condition column
is visible: Condition as the normal field, plus a 40 px icon-scale camera
button with a 44 px touch target. The row spans the full grid width, so the
space beside the enumeration rail closes with real fields.

When the Condition column is hidden, no closer renders. The grid starts with
the Qty | Unit pair. No empty slot remains.

### 2. The uploaded photo has two deliberate placements

Empty: only the camera icon shows. It is icon-scale, not a box.

Uploaded: the camera control is removed by CSS (`.has-photo .cam`). Condition
stretches across the released width. No blank photo cell remains. No new photo
row appears.

- Phone: a compact 60 px thumbnail sits right-aligned above the terminal
  total band. It reads as attached evidence.
- Fold: the phone thumbnail hides. A 64 px thumbnail shows in the left
  identity zone below Make, where the extra width gives it room.

Both thumbnails carry a small remove control. `addPhoto` and `removePhoto`
are unchanged.

### 3. Remaining fields use two per row, with BOQ V12 odd handling

Qty | Unit stays the fixed first pair. Rate, VAT %, Disc %, Install, Part no.,
and custom columns fill one shared two-column grid.

A trailing odd cell claims the full row via the BOQ V12 CSS rule. That rule is
now the primary odd-field handling, not a fallback. No three-across phone
composition exists.

### 4. The permanent right gutter is gone

V6 reserved a 26 px right inset on the identity zone, the data zone, and the
amount band for the delete box. V7 removes all three insets.

- The delete box stays a compact corner junction where the row hairline meets
  the row edge.
- The Description carries internal right padding instead, so text never runs
  under the X.
- Fields and the total band run edge to edge.

### 5. The row total stays terminal

The amount band keeps its anatomy: label left, mono value right, dark result
surface. It is full width now, after the fields, before Insert below. It is
not centred. Live in-place updates while typing still work: the band keeps its
`data-amt` attribute and the render loop is unchanged.

### 6. Everything else is preserved

- The 28 px vertical enumeration rail: number, move pair, duplicate.
- Description dominance and auto-size growth.
- Compact Sub Description with actual-text preview.
- Item Library discovery state and the muted selected-state helper line. The
  line has no button and no CTA.
- Make in the identity stack after Sub Description.
- Groups permanently expanded, group delete X first on the left, group
  boundary, count, membership, totals, and footer.
- Column Manager, import, commercial terms, supporting info, totals math,
  dark mode, sheets, save flow, and all demo seed data.
- No Invoice/Quotation switcher exists.

## Post-implementation comparison

### V7 against mobile-row-composition.html

| Aspect | Accepted prototype | V7 |
| --- | --- | --- |
| Enumeration rail, left | 40 px rail, number, move, duplicate | Same anatomy at the Invoice 28 px size |
| First row | Condition + icon camera, full width | Same structure and behavior |
| Empty photo | Icon-scale control | Same, 40 px visible, 44 px target |
| Uploaded photo, phone | Camera gone, Condition stretches, thumb above total | Same |
| Field rhythm | Two per row | Same |
| Total | Terminal, right, dark surface | Same |
| Description | Dominant, grows with content | Same |

Intentional differences, each permitted or required:

1. The delete X is the Invoice corner box with a stub, not the prototype
   circle. This preserves the Invoice family junction language from BOQ V12.
   The Description uses internal padding for the same protection.
2. Sub Description is the interactive BOQ V12 compact row, not static text.
   This preserves working Invoice behavior.
3. The Library helper line sits under Description. This preserves working
   Invoice behavior.
4. Make sits in the identity stack. BOQ V12 gives it that position. The fold
   thumbnail sits below it.
5. The rail is 28 px, not 40 px. This preserves the accepted V5 correction.

No phone geometry differs from the accepted prototype beyond these items.

### V7 against boq-form-candidate-v12.html

| Aspect | BOQ V12 | V7 |
| --- | --- | --- |
| Rail anatomy and position | Vertical, left, scoped to identity | Same |
| Field rhythm | Two per row | Same |
| Odd handling | Trailing cell claims full row | Same rule, now primary |
| Make position | Identity stack after Sub Description | Same |
| Result band | Dark band, label left, value right, last | Same position and anatomy |
| Groups | Expanded, X left, no collapse | Same, plus Invoice group totals |
| Delete | Corner junction with hairline | Same |

Intentional differences, each required:

1. Photo lives in the closer row, not as a companion or full-row cell. BOQ
   has no photo field. The BOQ rule still governs odd fields.
2. Row math is the Invoice contract (Qty x Rate, discount, VAT, WHT). No CP,
   SP, profit, margin, or vendor concept appears in user-visible text.
3. Group totals stay visible. This preserves working Invoice behavior.
4. Rail and Description keep Invoice density (28 px rail, 46 px Description).

## Verification result

```
- git status, before: captured. Working tree already held other agents' changes.
- git status, after: one new file in task scope, invoice-form-candidate-mobile-fold-v7.html
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
| Inline JavaScript parses (`node --check`) | passed, 80,176 characters |
| Static markup tag balance | passed, no imbalance |
| `getElementById` targets resolve | passed, 31 references against 50 ids |
| Inline handlers resolve | passed, 44 handlers |
| Two-column field grid present | passed |
| No three-across item grid | passed |
| BOQ trailing-odd-cell rule present | passed |
| Condition + Photo closer present | passed |
| No V6 photo leftovers (`photoCellHTML`, `photoRowHTML`, `photoInGrid`, `photocell`, `photochip`, `photothumb`) | passed |
| No permanent right gutter (`padding-right:26px`, `margin-right:26px`) | passed |
| No Invoice/Quotation switcher | passed |
| No group collapse code or state | passed |
| Group delete X first, on the left | passed |
| Row total terminal, not centred | passed |
| Empty Photo is icon-scale with 44 px target | passed |
| Uploaded Photo removes the camera control | passed |
| Phone thumbnail with terminal total; fold thumbnail below Make | passed |
| Selected library history is muted text with no button | passed |
| No BOQ-only semantics in user-visible text | passed, 0 hits |
| Live amount patch still targets `data-amt` | passed |

Protection check:

| File | State |
| --- | --- |
| `mobile-row-composition.html` | unchanged by this task |
| `boq-form-candidate-v12.html` | unchanged by this task |
| `invoice-form-inline.html` | unchanged by this task |
| `invoice-form-candidate-mobile-fold-v5.html` | unchanged by this task |
| `invoice-form-candidate-mobile-fold-v6.html` | unchanged by this task |

No production application source file was modified.

## Supabase push status

Not applicable. This task changed no SQL and no database object.

## Risks or limitations

1. **No visual verification.** Browser testing was not performed. Density and
   layout claims come from the CSS box model and from parsed markup, not from
   a rendered page. Geometry, contrast in the browser, and fold behavior under
   a real layout engine remain unconfirmed.
2. **The 44 px touch-target recommendation is not met on the rail.** The rail
   buttons are 28 px with hit areas near 38 px. This passes the WCAG 2.2 AA
   minimum of 24 px. It does not reach the 44 px recommendation. This is an
   inherited V5 decision.
3. **The closer row depends on the Condition column.** A reviewer who hides
   Condition sees no closer row. The scaffold strip names this. The grid still
   balances because every grid is full width.
4. **Spacing does not sit on one numeric grid.** The prototype uses 2, 5, 6,
   8, 10, and 12 px gaps. This is inherited from the baseline. A re-grid
   would be a redesign, which this task forbids.
5. **The concurrent-agent risk is live.** Other agents hold uncommitted and
   untracked changes. None of those files were touched.

## Deferred work

1. Render V7 in a browser and confirm phone geometry, both photo states, and
   the fold split on a real device.
2. Measure the real row height against V6 and the inline baseline.
3. Check contrast for the muted library line against WCAG 2.2 AA for small
   text.
4. Decide whether the V6 supporting-info defect fixes need any follow-up in
   V7. V7 inherits the fixed code unchanged.

## Correction: authoring-hierarchy field packing

### Defect

V7 created too many full-width single-field rows. Condition owned the first
row, and the per-grid CSS odd rule misfired once the closer row shared a
grid with data cells.

### Change

The candidate now uses a deliberate Invoice authoring hierarchy. Column
Manager controls visibility only, never order.

Phone order: Description, Library helper, Sub Description, Rate + compact
Photo action, remaining enabled fields packed two per row, terminal Amount.

Packing order after Rate: Qty, Make, Unit, Part no., Condition, then VAT %,
Disc %, Install, then extra custom columns. `packCells` filters by
visibility first. `pairGrids` chunks the filtered list into pairs. A
trailing lone field spans full width. No empty placeholders are emitted.

Make moved from the identity stack into the packed sequence after Qty. Its
binding is unchanged. Condition binding is unchanged. Rate binding is
unchanged.

Rate-hidden edge state: no Rate row renders. A lone compact camera action
shows in the identity stack when no image exists, so Photo stays attachable
with no blank cell. Thumbnails are unchanged.

Fold is unchanged in structure: identity zone plus data zone, Rate first,
pairs below, thumbnail at the end of the identity zone.

### Files changed by this correction

| File | Change |
| --- | --- |
| `.../form/invoice/invoice-form-candidate-mobile-fold-v7.html` | Modified in place. 2,376 lines. |
| `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-v7-2026-09-28.md` | This section added. |

No V8 was created. No other file was modified.

### Skills used by this correction: html-prototype, mobile-app-ui-design

Documentation standard: ASD-STE100 Simplified Technical English

### Verification result for this correction

```
- git status, before: captured. Other agents' changes present, untouched.
- git status, after: only the V7 candidate and this report changed.
- bun run build: skipped. Permanently banned by the task.
- bun run typecheck: skipped. Excluded by the task.
- bun run lint: skipped. Excluded by the task.
- bun run audit:load: skipped. Excluded by the task.
- supabase db push: not applicable
```

Static checks, all passed:

| Check | Result |
| --- | --- |
| Inline JavaScript parses (`node --check`) | passed |
| Static markup tag balance | passed, no imbalance |
| `getElementById` targets resolve | passed, 31 against 50 |
| Inline handlers resolve | passed, 44 handlers |
| Packing states executed in node (18 tests) | passed, 18 of 18 |
| Default order Rate, Qty, Make, Unit, Part no., Condition | passed |
| Only Rate + Qty enabled: Qty full width, no empty grid | passed |
| Odd remainder pairs then spans full | passed |
| Even remainder pairs fully, no blank | passed |
| Rate hidden: no Rate row, chip only when imageless | passed |
| Generated item markup tag balance | passed |
| Uploaded state: camera hidden by CSS, thumb with total | passed |
| Switcher absent | passed |
| Group collapse absent; group X first on left | passed |
| Enumeration rail unchanged by this task | passed, rail rules identical |
| No empty grid divs or placeholder cells | passed |
| Amount terminal (`space-between`), not centred | passed |
| No BOQ-only semantics in user-visible text | passed, 0 hits |

Not verified: browser, device, or fold rendering. No visual check occurred.

## Correction 2: Rate row moved beside the duplicate control

### Change

On phone, the Rate + camera row moved upward out of the data zone and into
the identity stack as its last row, after Sub Description. The rail uses
space-between, so the duplicate control rests at the rail bottom directly
beside the Rate row. The camera stays at the far right of the same row.

Implementation: `rateRow` is emitted inside `.idesc` instead of inside a
standalone `.fgrid` in `.idata`. No new row, no wrapper, no extra vertical
gap. `.idata` now holds only the packed pairs and the terminal Amount.

Fold needs no change: the Rate row travels with the left identity column,
so Rate stays first-class and hierarchy is preserved on both widths.

Rail, Description, Library behavior, Sub Description, packing rules, groups,
and the amount band are unchanged.

### Verification result for correction 2

| Check | Result |
| --- | --- |
| Inline JavaScript parses (`node --check`) | passed |
| Packing states executed in node (18 tests) | passed, 18 of 18 |
| Static markup tag balance | passed |
| `getElementById` targets resolve | passed, 31 against 50 |
| Inline handlers resolve | passed, 44 handlers |
| Rate row emitted inside `.idesc`, absent from `.idata` | passed |
| Camera remains last cell of the Rate row grid | passed |
| Rail CSS untouched | passed |
| Fold CSS untouched | passed |
| No BOQ-only semantics in user-visible text | passed, 0 hits |

Not verified: rendered alignment on a device. No visual check occurred.
