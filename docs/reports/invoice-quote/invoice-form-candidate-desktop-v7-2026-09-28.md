# Invoice Form Candidate Desktop V7 Report

This report was written by Muse Spark on 2026-09-28 via OpenCode.

## Objective

Create a dedicated desktop-first Invoice authoring workspace. The candidate
exploits desktop width with its own composition. It preserves the behavioral
hierarchy of accepted mobile/fold V7. It is not a stretched phone form, not
a spreadsheet, and not a click-to-reveal section partition.

## Scope

This is a design-prototype task. It creates one standalone HTML file.

The task does not change production React or TypeScript code, the database,
Supabase policies, migrations, or calculation rules.

## Files changed

| File | Change |
| --- | --- |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v7.html` | Created. 2,392 lines. Copied from desktop V5, then recomposed. |
| `docs/reports/invoice-quote/invoice-form-candidate-desktop-v7-2026-09-28.md` | Created. This report. |

No other file was created or modified by this task.

Reference files were read only:

- `.../form/invoice/invoice-form-candidate-mobile-fold-v7.html`
- `.../form/boq/boq-form-candidate-v12.html`
- `.../form/invoice/invoice-form-candidate-desktop-v5.html`
- `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v4-boq-v12-2026-09-28.md`
- `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v5-2026-09-28.md`

## Skills used: html-prototype, accessibility, mobile-app-ui-design

Documentation standard: ASD-STE100 Simplified Technical English

Notes on skill application:

- `html-prototype` supplied the fidelity model. Desktop V7 is a working
  prototype: all demo controls, states, and flows stay operable.
- `accessibility` supplied the WCAG 2.2 checks. Icon controls keep labels.
  The camera keeps a 44 px target. No check forced a design change.
- `mobile-app-ui-design` confirmed hierarchy priorities carried over from
  mobile V7: Description dominance, first-class Rate, muted library history.

## Prior failures avoided

| Failure | Desktop V7 answer |
| --- | --- |
| V1 dashboard shell with module navigation | No app shell. The page is the document. |
| V2 fixed module rail plus BOQ profit semantics | No left rail. No CP, SP, profit, margin, or vendor concept. |
| V3 one-section-at-a-time click-to-reveal index | All five sections exist simultaneously. The top-bar index holds anchors only. |
| V5 sticky totals sidebar owning a section | No sticky sidebar. Totals lives in the flow at full width. |
| V5 widened rail plus three-column field grid | No enumeration rail. Fields pack in pairs, never three across. |

## Changes made

### 1. Continuous document, no gating

Document details, Line items, Commercial, Totals, and Supporting info render
in one flow in document order. The section index contains anchor links only.
No tab role, no show/hide logic, no gating state exists in markup or script.
The dead two-region split wrapper from V5 was removed.

### 2. Desktop item card

Each item is a card with two parts.

Header strip: index badge, compact icon cluster (move up, move down,
duplicate, delete), and the line amount as a dark pill at the right end.
Amounts align down the page for rapid scanning.

Body: an identity zone beside a data zone (1.35 to 1 below 1240 px wrap).
Identity holds Description, Library context, Sub Description, and photo.
Data holds Rate full-width first, then remaining enabled fields in pairs.

### 3. Rate stays first-class

Rate spans the full data-zone width with an accent edge and larger input.
The camera action attaches at its right end. Rate is never buried among
optionals regardless of desktop width.

### 4. Visibility packs without holes

`packCells` filters by Column Manager visibility first, in fixed authoring
order: Qty, Make, Unit, Part no., Condition, VAT %, Disc %, Install, custom
columns. `pairGrids` chunks pairs. A trailing lone field spans full width.
No empty placeholders are emitted. With only Rate and Qty enabled, Qty spans
full width.

### 5. Library and Sub Description preserved

Discovery opens suggestions with name, price, use count, and reference.
Selected state closes suggestions and shows one muted helper line. No price
CTA exists. Sub Description shows actual populated text in a compact clamp.

### 6. Photo has no reserved column

Empty state is the 40 px camera action with a 44 px target. Uploaded state
is a 64 px thumbnail in the identity zone with its own remove control.

### 7. Groups unchanged in semantics

Permanently expanded. Delete X first on the left. Name, count, totals,
boundary, and footer preserved. No collapse control exists.

## Verification result

```
- git status, before: captured. Other agents' changes present, untouched.
- git status, after: only the desktop V7 candidate and this report added.
- bun run build: skipped. Permanently banned by the task.
- bun run typecheck: skipped. Excluded by the task.
- bun run lint: skipped. Excluded by the task.
- bun run audit:load: skipped. Excluded by the task.
- supabase db push: not applicable
```

Static checks, all passed (20 of 20 executed checks):

| Check | Result |
| --- | --- |
| Inline JavaScript parses (`node --check`) | passed, 1 block |
| Static markup tag balance | passed, no imbalance |
| `getElementById` targets resolve | passed, 31 against 55 |
| Inline handlers resolve | passed, 44 handlers |
| Generated item markup tag balance | passed |
| No mobile rail in card | passed |
| Control cluster left, amount pill right with `data-amt` | passed |
| Identity before data, Description dominant | passed |
| Rate full-width first, camera attached, pairs follow | passed |
| Rate plus Qty only: Qty full width, no empty grid | passed |
| Uploaded photo: thumbnail in identity, camera hidden | passed |
| Group X left, expanded, count plus total plus add | passed |
| Sections 1 to 5 present simultaneously | passed |
| Section index anchors resolve 5 of 5, no tab logic | passed |
| No sticky sidebar (top-bar stickiness only) | passed |
| No switcher, no collapse, no price CTA | passed |
| No BOQ-only semantics in visible text or built strings | passed |

Not verified: browser or device rendering. No visual check occurred.

## Supabase push status

Not applicable. This task changed no SQL and no database object.

## Risks or limitations

1. **No visual verification.** Geometry, density, and board behavior come
   from source inspection and executed markup, not a rendered page.
2. **Dead base CSS remains.** Old rail, three-column grid, and amount-row
   rules from V5 still exist in the stylesheet but match no markup. They
   have zero runtime effect. Removal is deferred cleanup.
3. **Below 1024 px the card stacks single-column.** The file is a
   desktop-first exercise. The stacked fallback is functional but not
   reviewed as a composition.
4. **The concurrent-agent risk is live.** Other agents hold uncommitted and
   untracked changes. None of those files were touched.

## Deferred work

1. Render desktop V7 at 1280 px and above and confirm card rhythm, board
   behavior, and amount scanning.
2. Remove the dead V5 item-composition CSS rules.
3. Decide whether the stacked sub-1024 px fallback needs review or an
   explicit minimum-width notice.
