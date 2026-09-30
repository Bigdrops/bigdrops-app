# BOQ v10 Phone + Fold Authoring Workspace Report

This report was written by Buffy on 2026-09-27 via Freebuff.

## Objective

Create a new standalone phone and fold BOQ prototype:

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v10.html`

The prototype is a touch document-authoring workspace. It is not a card stack with form fields. It is not v9 with new CSS values.

The work answers one question: can a fresh agent find a stronger phone and fold structure than v9?

## Scope

- One new self-contained HTML file. Inline CSS and JavaScript. No build tooling.
- One new report. Report only.
- No React source change. No SQL change. No Supabase change. No migration.
- No reference file change. v9 and the old reference stay byte-identical.

## Files changed

| File | Change |
|---|---|
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v10.html` | Created. Self-contained. 1012 lines, 59 KB. |
| `docs/reports/boq/boq-v10-phone-fold-authoring-workspace-report-2026-09-27.md` | Created. This report. |

Files not changed:

| File | Proof |
|---|---|
| `BOQ Full-Page Live Form-v9.html` | File time stamp 2026-09-26 21:55. It predates this session. `git status` shows no working-tree change. |
| `BOQ Full-Page Live Form.html` (old reference) | File time stamp 2026-09-26 01:17. `git status` shows no change. |
| `src/**` React source, SQL, migrations | `git status` shows no change. |

## Skills used

Skills used: mobile-app-ui-design, html-prototype, frontend-design

Documentation standard: ASD-STE100 Simplified Technical English

How each skill changed the work:

| Skill | Applied guidance |
|---|---|
| `mobile-app-ui-design` | 4 and 8 point spacing scale. 60/30/10 colour discipline. Thumb-zone bottom creation controls. Touch targets at or above 40 px. One idea per semantic zone. Monospace for money. Empty, error, disabled, and success states. No emoji icons. |
| `html-prototype` | Prototype fidelity over mockup fidelity. Native elements only. Named dialogs with `Escape` close, focus entry, and focus return. No essential action behind hover. No page-level horizontal overflow. Small direction-specific token set. Self-contained single file. |
| `frontend-design` | One committed conceptual direction (the document spine). Restraint over decoration. Sharp semantic accents instead of even colour. No generic AI aesthetic. |

## Changes made

### 1. Structural assumptions rejected from v9

| v9 assumption | Why v9 was rejected | v10 replaces it with |
|---|---|---|
| The number and the actions are a short top pocket. The rest of the item hangs below with no rail. | The pocket ended after about 130 px. Items are about 330 px tall. The result was up to 131 px of dead rail below the control pocket. This is the "aura". | A document spine. The spine spans the full item height, including the insert-below band. Three rail nodes distribute along that full height. |
| The delete control is a circle at the item corner with a centred 46 px hit area. | The hit area pushed the page 4 px past the viewport at 320 px width. | The delete tab stays on the perimeter. Its hit area grows inward and vertically only. |
| Groups are a 2 px border plus a tinted body. | The containment reads as a container, but the left edge is thin and repeated rules dilute it. | An 8 px group spine runs the full group height, from header to footer. |
| Fold only widens the wrapper and the field grids. | Wider phone. Not a new composition. Fields stretch, but the interaction stays vertically stacked. | Fold splits the item into an identity column and a data column. Metadata and commercial fields move beside the description. |
| The toolbar row holds Columns, Import, and Clear All as three chips. | It crowds a phone top bar. | One tools button. It opens a labelled tools sheet. |
| A single metadata row of small fields. | A hidden field left a "`--`" ghost cell. Nothing showed parity. | A metadata registry renders into a 2 column grid. An odd last field takes the free cell width. |

### 2. v9 behaviours preserved

These behaviours are identical. A browser harness confirmed each one.

| Behaviour | Status |
|---|---|
| BOQ calculations: total cost, total selling, gross profit, margin | Preserved. Formula text matches v9. |
| CP and SP arithmetic, line profit per row | Preserved. Live update on edit. |
| Amount in words | Preserved. Same word builder. |
| JSON import, contract keys, validation messages | Preserved. Same contract and same error strings. |
| Configurable columns and the locked CP and SP switches | Preserved. |
| Groups: add, rename, collapse, delete, delete keeps items | Preserved. |
| Row movement, duplicate, delete, insert below | Preserved. |
| Add item to group, global add item, global add group | Preserved. |
| Global enumeration. Group headers consume no number. | Preserved. |
| Save validation: number required, then description, qty, and SP per item | Preserved. |
| Dark mode, seed data, toast feedback | Preserved. |
| Sub-description data model and the open and closed state | Preserved. |

### 3. How v10 removes the enumeration aura

Three mechanisms work together.

1. **A document spine.** A one pixel line is drawn on `.item` itself. It runs from the item top to the item bottom. The item box contains the insert-below band. The line therefore continues across the row boundary and joins the next item. The list reads as one document, not as separate plots.
2. **A distributed rail.** The rail is a flex column with `justify-content: space-between`. It contains three nodes: the number, the move pair, and duplicate. The container stretches to the item height. The nodes therefore spread across the full height. The spine line passes behind them. The nodes mask the line and read as beads on a wire.
3. **No trailing gap.** Measured result at 390 px width: rail height 329 px equals content height 329 px. The last node bottom is 0 px above the rail bottom. The v9 measurement was 131 px.

The rail column is 42 px wide. The nodes are 34 px. The gap between nodes is 10 px. Hit areas do not overlap.

### 4. How the hanging delete works without content width

- The delete is an absolutely positioned 28 px tab at `top: -9px; right: -6px`. It is not a grid item. It consumes zero layout width.
- The item has 18 px top padding. The delete bottom is at 19 px from the item top. The description field starts at 18 px. The tab therefore does not cover editable text. A harness check asserts the measured geometry.
- The hit area is asymmetric: `left: -12px; right: 0; top: -8px; bottom: -8px`. It measures 40 px by 44 px. It grows into the item and downward. It never grows outward. The page therefore cannot scroll horizontally at 320 px width.
- The same tab is used for grouped items. Grouped items use the same anatomy. No separate or reduced variant exists.

### 5. How the item architecture supports future fields

Two field registries drive the item markup.

```js
var META_FIELDS = [ { key: 'qty', ... }, { key: 'unit', ... }, { key: 'make', ... } ];
var COMM_FIELDS = [ { key: 'cp', ... }, { key: 'sp', ... } ];
```

- A future optional field is one registry entry. For example: `{ key: 'material', ph: 'Material' }`.
- The metadata grid is always 2 columns. A fourth entry fills the empty cell. A fifth entry starts a new row. No page-wide column exists. No horizontal scroll exists. No three-across micro field exists.
- The rule `.meta-grid > .fld:last-child:nth-child(odd) { grid-column: 1 / -1 }` gives an odd last field the free cell width. This rule held with 3 fields and holds with 5.
- The commercial grid has the same odd-span rule. A future discount or tax field can join without a redesign.
- Architecturally tested but not enabled: discount, tax, rate, material, labour, location, phase, remarks. The tests live as comments in the registry. No new business field was added.
- The current configurable Columns behaviour still hides and shows the make field. A hidden field renders a quiet slot cell. The grid keeps its 2 column shape.

### 6. How the phone and fold compositions differ

One interaction model. One data model. One item component. The composition changes.

| Property | Narrow phone (base) | Large phone (at 430 px and above) | Fold (at 600 px and above) |
|---|---|---|---|
| Wrapper | 430 px maximum | 560 px maximum | 820 px maximum |
| Item tracks | rail + content | rail + content | rail + content |
| Content composition | one vertical stack | one vertical stack, looser rhythm | identity column beside data column |
| Description width | about 240 px at 320 px | about 290 px | about 390 px, or more |
| Metadata and commercial | below the description | below the description | beside the description, in a data column |
| Data column edge | none | none | 1 px divider plus 18 px inset |
| Sub-description | progressive disclosure, one line preview when content exists | same, with a taller field | existing content is exposed directly. No toggle. |
| Document details | 2 columns | 2 columns | 4 columns |
| Totals | stacked | stacked | cost and selling lines beside the profit block |
| Rail column | 42 px | 42 px | 46 px |

Fold is not a centered phone. The identity column measured about 390 px at an 800 px viewport, against about 240 px on a narrow phone. The vertical stack of the item drops from four bands to two.

The meta viewport uses `viewport-fit=cover`. The Save FAB uses `env(safe-area-inset-bottom)`.

### 7. How group containment works

- **Header.** A dark gradient bar. It holds the collapse control, the group title, the member count, and the group delete.
- **Body.** The member list. Members are full `.item` components. Their rails, spines, CP and SP, profit, and delete tabs are identical to ungrouped items.
- **Footer.** A 2 px top border closes the container. The footer holds `+ Add item to this group`.
- **Containment.** The group wrapper has a 2 px border and an 8 px left spine. The spine runs the full group height. It cannot read as a random separator.
- **Collapsed group.** The wrapper drops its border and its background. The header becomes a self-contained card with its own 7 px left spine. The body and the footer are removed. No orphan spine and no orphan border remain.
- **Empty group.** The header, an empty-state panel with a dashed group border, and the footer all stay visible. Containment is obvious before the first member exists.

Row spacing uses one system for all four adjacency orders: item to item, item to group, group to item, and group to group. Items are separated by a compact 20 px insert-below band. The band carries a hairline rule and a low-contrast label. The rule starts after the rail, so the spine passes through without a break.

### 8. How the implementation conforms to `docs/standard/fab-standard.md`

| Rule | Implementation |
|---|---|
| Section 2, shape | 50 x 50 px, border radius 18 px, `shadow-lg` equivalent. |
| Section 2, icon size | icon 20 px, `stroke-width: 2`. |
| Section 3.2, role and icon | Save role. Lucide `SaveAll` icon, four paths. Not `Save`, not `CheckCircle`. |
| Section 3.2, background | `var(--bg-bd-button-primary-bg)`, the primary token. No hand-made surface. |
| Section 4, placement | Fixed. `right: 16px`, `bottom: calc(82px + env(safe-area-inset-bottom))`. |
| Section 6 rule 6 | One primary FAB on the view. No competing FAB. |
| Section 6 rule 7 | `@media (prefers-reduced-motion: reduce)` removes all motion, including FAB scale on hover and active. |
| No new variants | No glow, no gradient, no custom radius, no custom size. A harness check asserts this. |

The dark theme re-declares the token. `--bg-bd-button-primary-bg` becomes `#2563eb` so the FAB stays legible on the `#0b1220` page. This changes a token value only. It does not change the FAB shape, icon, or placement.

### 9. Verification performed

Static checks on the changed file:

| Check | Result |
|---|---|
| CSS brace balance | 227 open, 227 close. Pass. |
| Empty rule blocks | 0. Pass. |
| Empty custom property values | 0. Pass. |
| JavaScript syntax | Passed by `new Function` parse of the script block. |
| HTML tag balance | div 61/61, section 4/4, article 1/1, header 2/2, button 27/27, textarea 3/3, label 6/6, span 29/29, svg 20/20. Pass. |
| Element id resolution | 25 ids. 18 `getElementById` targets. 0 unresolved. 4 sheet ids present. |
| Inline handler resolution | 22 handlers. 0 undefined. |
| Behaviour function set | All 27 v9 business functions present. |
| Calculation parity | Profit, total cost, total selling, margin, and amount in words formula text matches v9. |
| Import contract parity | All contract keys present in both files. Error strings unchanged. |
| Save validation parity | Rule text identical to v9. |
| v9 unmodified | Time stamp and `git status` confirm no change. |
| Old reference unmodified | Time stamp and `git status` confirm no change. |
| No React, SQL, or Supabase change | `git status` confirms. |
| `git diff --check` | Clean. |

Browser checks. A Playwright harness ran the prototype in Chromium at 320, 390, 430, 500, and 800 px widths, in light and dark themes.

| Run | Result |
|---|---|
| Run 1, full suite before the focus change | 97 checks. 0 failures. |
| Run 2, regression suite after the focus change | 27 checks. 0 failures. |

Run 1 found three real defects. All three were fixed and re-verified.

1. The rail left a 131 px unused gutter below the last control. Cause: `margin: auto` on the middle node instead of distribution on the rail. Fix: `justify-content: space-between` on the rail.
2. The delete tab overlapped the description field box by 5 px. Fix: item top padding raised to 18 px.
3. The delete hit area pushed the page 4 px past the viewport at 320 px. Fix: asymmetric hit area.

Browser checks include: no page errors. Truthful item and group counts. Global enumeration 01 to 05 in DOM order. Rail height equals content height. No gutter below the last rail node. Delete geometry and hit-area behaviour by hit test. Compact 20 px insert band. CP and SP colour and accent difference. 2 column metadata and the odd-span rule. Sub-description preview, disclosure, and fold exposure. Group header, body, footer, collapse, and empty state. Creation pair after the final content. Add item, add item to group, duplicate, delete, move, insert below. Totals and live profit. Fold recomposition and relative identity column width. No horizontal overflow at 320, 390, and 500 px. Dark theme tokens. FAB size, radius, placement, shadow, and icon. Import success and import failure. Column hide and show. Clear all. Save success and blocked save. Dialog names, `Escape` close, focus entry, and focus return.

Not run, with reason:

- `bun run build`: not run. The project bans it on this host.
- `bun run typecheck`, `bun run lint`, `bun run audit:load`: not run. No repository source, SQL, or configuration changed. The task class is a standalone prototype. AGENTS.md section 5 gates apply to code changes.
- `supabase db push`: not applicable. No SQL changed.

### 10. Final visual acceptance gate

Automated and static checks do not accept the visual design. They prove structure, geometry, and behaviour only.

The final visual acceptance gate is human inspection in a browser. Open the file and judge the composition at 320, 390, 430, 600, and 800 px, in light and dark mode. No agent can close this gate.

## Supabase push status

supabase db push: not applicable. No SQL and no schema change.

## Risks or limitations

1. **No human visual acceptance yet.** Automated checks are not visual acceptance. A person must open the file and judge the composition.
2. **A concurrent commit captured one scratch file.** At 2026-09-27 03:25:54 a commit named `docs(boq): v9/v10 full-page forms + reports` committed the working tree. It included my temporary Playwright harness, `.v10-smoke-test.cjs`. I removed that harness after the run. The working tree therefore reports one deletion: `D .v10-smoke-test.cjs`. This is my own scratch file. No pre-existing work was reverted, and I ran no destructive git command.
3. **Enumeration is positional.** Row movement changes which row holds which number. This is v9 behaviour and it is preserved on purpose.
4. **The rail spreads on tall items.** When a specification field is open, the gap between rail nodes grows. This is the intended alternative to a dead gutter. A person should confirm that it reads as deliberate.
5. **Fonts load from Google Fonts.** Offline rendering falls back to the system sans-serif stack.
6. **Focus is not trapped inside a sheet.** `Tab` can leave an open sheet. Focus entry, `Escape` close, and focus return are implemented.
7. **The fold breakpoint is 600 px.** Widths from 600 px to 820 px use the fold composition. The layout does not model a true dual-panel fold device.

## Deferred work

- Human browser review of the file at 320, 390, 430, 600, and 800 px in both themes.
- Enable one registry entry, for example Material, to demonstrate a real future field end to end.
- Add focus trapping and `aria-hidden` on background content while a sheet is open.
- Carry the spine and rail anatomy into the React BOQ form when the module is ported.
- Compare v10 with `BOQ Full-Page Live Form-desktop.html` and decide whether the two files become one responsive prototype.

## Verification result

```
Verification:
- bun run audit:load: not run. No repository source changed. Reason recorded in section 9.
- bun run typecheck: not run. Standalone prototype. Reason recorded in section 9.
- static prototype check (css braces, js parse, tag balance, ids, handlers): passed
- calculation, import, and validation parity against v9: passed
- browser harness run 1: 97 checks passed, 0 failed
- browser harness run 2: 27 checks passed, 0 failed
- git status: 1 prototype created, 1 report created, 1 scratch harness removed
- git diff --check: clean
- v9 unchanged: confirmed
- old reference unchanged: confirmed
- supabase db push: not applicable
- bun run build: skipped due to hardware policy
```
