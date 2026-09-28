# Invoice Form V5 Design Candidates Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Refine the accepted Invoice V4 design candidate. Do not redesign it.

V4 is broadly accepted. Four corrections were requested:

1. Reject the V4 horizontal item action toolbar. Restore the established
   vertical enumeration and control rail on the left of the item.
   Use the accepted BOQ rail as the structural reference.
2. Remove Invoice and Quotation switching from the prototype.
3. Delete the post-selection "Use price" action.
4. Demote the selected Item Library history to muted helper metadata.

Two standalone HTML candidates were produced:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v5.html
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v5.html
```

## Scope

| Item | In scope | Out of scope |
| --- | --- | --- |
| Standalone HTML design prototypes | Yes | - |
| Production React or TypeScript code | No | Yes |
| Database schema, migrations, policies | No | Yes |
| Invoice or BOQ calculations and rules | No | Yes |
| Invoice V4 candidates | Read only | Modified? No |
| `boq-form-candidate-v12.html` | Read only, structural reference | Modified? No |
| `boq-form-candidate-v11.html` | Read only, structural reference | Modified? No |
| `invoice-form-inline.html` | Read only | Modified? No |

V5 is an evolution of V4. It is not a new form family, and it is not a return
to V3.

## Files changed

Added by this task:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v5.html
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v5.html
docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v5-2026-09-28.md
```

Temporary file, created and deleted by this task:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/.v5-verify.cjs
```

Already present in the working tree before this task. Not touched:

```text
 M .../form/invoice/invoice-form-candidate-mobile-fold-v4.html
?? .../form/invoice/invoice-form-candidate-desktop-v4.html
?? .../form/boq/boq-form-candidate-v12.html
?? docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v4-boq-v12-2026-09-28.md
```

## Skills used

Skills used: html-prototype, accessibility

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### 1. Vertical enumeration and control rail restored

The V4 horizontal toolbar is removed.

```text
Removed:  [01] [up] [down] [duplicate] ........ amount [X]

Restored: [X]
          [01] 
           |   Description ...
           |   Library history helper line
           |   Amount readout
           |   Photo / Sub description
          [up]
           |
          [down]
           |
          [dup]
          ---------------------------------------
          Qty        Unit        Rate
          Make       Part No.    Condition
```

The structure follows the accepted BOQ rail:

| Element | Placement |
| --- | --- |
| `.ihead` | Grid: 28px rail column, then the identity column |
| `.idx` | Row number, top of the rail |
| `.rmid` | Move up and move down, middle of the rail |
| Duplicate | Bottom of the rail |
| `.ear` | Delete box, top-right corner of the identity zone |

Details:

- The rail column is 28px wide. The buttons are 28px. An invisible hit area
  (`inset:-5px`) holds the real touch target at 38px.
- `.rail` uses `justify-content:space-between`. The spine runs from the first
  control to the last control. The rail stretches to the identity zone only,
  so the spine follows real controls and does not run through empty row
  height.
- The rail is 127px tall in its natural state. The identity zone of a typical
  row is 116px to 135px. The two heights are close, so the rail adds almost no
  empty height.
- Delete stays a separate destructive item action. It is not a rail control.
  This matches the accepted BOQ pattern.
- A 26px right inset on `.ihead` reserves the corner for the delete box. The
  Description no longer runs under the delete box. In BOQ V11 the description
  area extends under the box. The inset is a small, deliberate adaptation.
- The row hairline ends where the delete box starts (`right:26px`), so the
  line reads into the box. The box has a short stub line out of its bottom.
  At 600px and above the delete box is inside the identity zone, so the
  hairline returns to full width.
- The delete box is now a child of `.ihead` rather than of `.item`. At fold
  width the box therefore sits at the top-right of the identity zone instead
  of over the data zone.

The row amount readout is preserved as one compact right-aligned line inside
the identity zone (`.amtrow`). It is not a block and it adds no row height.
`renderTotals()` updates it in place.

### 2. Invoice and Quotation switching removed

Removed:

- The document type segmented control from Document details.
- The `docTypeSeg`, `dtInvoice`, and `dtQuotation` elements.
- The `setDocType()` function.
- `docType` from the document model.
- The document-type branch in the save confirmation message.

Kept:

- The fixed Invoice labels: Invoice title, Invoice no, Issue date, Due date.
- The `seg` component. Discount type, discount timing, and WHT type still use
  it. Those are Invoice controls.

No control, state, or space remains for document type switching. The three
remaining occurrences of the word "Quotation" are documentation comments that
explain the removal.

### 3. Post-selection "Use price" action removed

Removed:

- The `libuse` button from the selected Item Library context.
- The `usePrice()` function.
- The `.libline .libuse` CSS rules.
- The `priceContextText()` function. It became dead code when the V4 price
  context box was replaced, and nothing calls it now.

### 4. Selected Item Library history demoted

Before:

```text
● Copper cable 4mm² · Last sold: ₦6,500.00 · INV-2026-0131 · 2026-09-12 · 30 uses   [Use ₦6,500.00]
```

After:

```text
LIBRARY  Last sold: ₦6,500.00 · INV-2026-0131 · 2026-09-12 · 30 uses
```

- The green status dot is deleted.
- The outlined price button is deleted.
- The price is no longer emphasised. It uses the same muted colour as the rest
  of the line.
- The line uses the mono family at 9px in `--faint`. That is the same family
  as the other secondary form metadata, such as field labels.
- A small "LIBRARY" label states the provenance. It is not a control.
- The line is static text. It has no handler and no interactive element.

The information answers "what was this sold for, and where and when". It does
not suggest that the historical price is preferred. The editable Rate field
remains the only price authority in the row.

### 5. Discovery state unchanged

The search and discovery state is untouched.

- Typing 2 or more letters in the Description opens the suggestion panel.
- Suggestion rows show the item name, the price, and a meta line with the use
  count, the last reference, and the last date.
- Selecting a suggestion fills the Description and closes the panel.
- Row 04 of the seeded document starts in the discovery state
  (`suggestFor: 6`).
- Row 02 starts in the selected state (`item_id: 'cat-cable'`).

One small correction: the selection confirmation said "rate filled from
standard price". The function does not change the rate. The message now reads
"Library item applied". This keeps the prototype honest about which field the
user controls.

### 6. V4 behaviour preserved

Unchanged from V4:

| Item | State |
| --- | --- |
| Dense 3-column data grids | Kept |
| Description dominance and auto-sizing | Kept |
| Item Library discovery state | Kept |
| Compact Item Library selected context | Kept, restyled as muted text |
| Photo and Sub Description secondary row | Kept |
| Horizontal use of optional Invoice fields | Kept |
| Fold recomposition into identity and data zones | Kept |
| Continuous desktop document, no section gating | Kept |
| Groups permanently expanded | Kept |
| Group delete X on the left | Kept |
| No group collapse control | Kept |
| Toast live region and `aria-invalid` on the Description | Kept |
| Invoice-only semantics | Kept |

Fold changes follow from the rail:

- The identity zone is now `.ihead`, which contains the rail.
- The data zone stays in the second column.
- The identity zone is slightly wider (1.25fr) so the Description keeps its
  width beside the rail.

Desktop changes follow from the rail:

- The same continuous two-region document as V4.
- The section index is navigation only. It does not gate section visibility.
- The item keeps the rail plus a 3-column data grid.

## Verification result

Static verification only. The task forbids build, typecheck, lint,
`audit:load`, browser automation, and Supabase commands.

```text
Verification:
- bun run audit:load: not run, excluded by the task instruction
- bun run typecheck: not run, excluded by the task instruction
- bun run build: skipped due to hardware policy
- inline JavaScript syntax: passed for both files
- markup tag balance: passed for both files
- inline handler resolution: passed for both files
- DOM ID resolution: passed for both files
- desktop anchor integrity: 5 of 5 resolved
- document type switcher removed: confirmed
- "Use price" action removed: confirmed
- selected Item Library context is passive: confirmed
- vertical enumeration rail in use: confirmed
- group delete X on the left: confirmed
- group collapse control absent: confirmed
- git status: only the intended V5 files
- supabase db push: not applicable
```

### Check results

| Check | Mobile/Fold V5 | Desktop V5 |
| --- | --- | --- |
| Inline JS syntax | OK, 1325 lines | OK, 1325 lines |
| Generated markup tag balance | OK | OK |
| Inline handlers unresolved | NONE, 62 distinct | NONE, 62 distinct |
| `getElementById` targets | 31 of 31 resolve | 31 of 31 resolve |
| In-page anchors | none present | 5 of 5 resolve |
| V4 toolbar leftovers | NONE | NONE |
| Document type switcher | NONE | NONE |
| "Use price" action | NONE | NONE |
| `.libline` muted, no accent or green | Yes | Yes |
| Selected context renders no button | Yes | Yes |
| Discovery state intact | Yes | Yes |
| Vertical rail present, `.rail` and `.rmid` | Yes | Yes |
| Delete box inside the identity zone | Yes | Yes |
| Group delete X first in the header | Yes | Yes |
| Group header control count | 1 | 1 |
| Group collapse chevron | Absent | Absent |
| Group contents always rendered | Yes | Yes |
| Group collapse code present | No | No |
| Sections present at once | n/a | 5 of 5 |
| Section gating or hidden sections | n/a | None |

### BOQ-only semantics scan

The scan reports `line profit`, `gross profit`, and `vendor`. All three occur
only in the file header comment. That comment lists the concepts that are
excluded from the Invoice prototype. No such field, label, or calculation
exists in the form.

### Input files unchanged

| File | Modified time | State |
| --- | --- | --- |
| `invoice-form-candidate-mobile-fold-v4.html` | 2026-09-28 07:03 | unchanged |
| `invoice-form-candidate-desktop-v4.html` | 2026-09-28 07:03 | unchanged |
| `boq-form-candidate-v12.html` | 2026-09-28 07:00 | unchanged |

All three times are earlier than the first V5 write at 07:20.

### Final git status

```text
 M .../invoice/invoice-form-candidate-mobile-fold-v4.html
?? .../invoice/invoice-form-candidate-desktop-v4.html
?? .../invoice/invoice-form-candidate-desktop-v5.html
?? .../invoice/invoice-form-candidate-mobile-fold-v5.html
?? .../boq/boq-form-candidate-v12.html
?? docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v4-boq-v12-2026-09-28.md
```

The two V5 files are the only additions of this task. The other four entries
already existed before this task. The V4 mobile/fold entry is a modification
from the earlier V4 task. It is not from this task.

No production source file was created, modified, or deleted.

## Supabase push status

Supabase push status: not applicable.

This task changed no SQL, no migration, no policy, and no database object.

## Risks or limitations

1. No browser or visual verification was performed. The task excludes browser
   automation and the hardware policy excludes the build. The rail height and
   row height are reasoned from the CSS values in the source. They are not
   measured on a device.
2. The rail is 127px tall. A row without a library history line has a 116px
   identity zone. The rail therefore sets the row height on those rows and
   leaves about 11px of empty space beside the description. The alternative is
   a rail that cannot hold all three controls.
3. The 26px right inset on `.ihead` costs 26px of Description width. It removes
   an overlap between the Description and the delete box. The overlap exists in
   the BOQ V11 reference. If the reviewer prefers exact BOQ geometry, remove
   the inset.
4. Delete moves from the item's top-right corner to the identity zone's
   top-right corner at fold width. This avoids an overlap with the data zone.
   Phone width shows no change.
5. The "LIBRARY" label is a new element. It is static text, but it is also new
   copy. The reviewer may prefer no label at all.
6. The save confirmation message is now always "Invoice saved". This is
   correct because the document type switch is gone.
7. The prototype strip above the line items is scaffolding. Remove it before
   the design is used as a specification.
8. `.libline` now uses the mono family. If the house style requires the body
   family for helper metadata, change one line.

## Deferred work

1. Visual and interaction review at 360px, 430px, 820px, and 1440px.
2. Keyboard review of the rail: tab order, focus ring, and the disabled state
   of the move buttons at the first and last row.
3. Decide whether the "LIBRARY" label stays.
4. Decide whether the 26px right inset stays, or return to exact BOQ geometry.
5. Check the fold composition where the delete box sits on the boundary
   between the identity zone and the data zone.
6. Confirm the shipped Item Library selection behaviour for the Rate field,
   and align the confirmation message with the live implementation.
