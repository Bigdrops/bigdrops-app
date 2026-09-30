# BOQ Form Prototype v2 Report

This report was written by Buffy on 2026-09-17 via Freebuff.

## Objective

Revise the BOQ facelift design prototype per the design review. Replace the
permanently expanded item mini-forms with a compact scanning state plus a
focused row editor. Keep the locked BOQ commercial model. Stay design
direction only: no production code changes.

## Scope

One new HTML artifact:

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/BOQ Full-Page Live Form v2.html`

The v1 prototype (`BOQ Full-Page Live Form.html`) remains in place for
comparison. No production React, TypeScript, SQL, or Supabase files
changed.

## Skills used

Skills used: html-prototype
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made, by revision area

### 1. Line-item workbench

- Compact scanning row: index chip, one-line description, qty + unit +
  CP-to-SP mono meta line, optional spec/brand chips, right-aligned
  Selling Price total and derived line profit. Three-line vertical
  rhythm; no expanded fields.
- Tapping a row opens a focused bottom-sheet editor with Description,
  Specification, Qty, Unit, Make/Brand, CP, SP. Profit shows inside the
  sheet as a derived read-only readout and updates live while the user
  types. Done applies changes to the compact row and totals. Escape and
  backdrop tap dismiss without applying.
- Seed data is a realistic 20-row, 5-section BOQ (civil, blockwork,
  finishes, electrical, labour) to prove scanning scale.

### 2. Row management

- Add Item, Add Section via an Add chooser sheet; insert-below inside
  the Manage mode; duplicate, move up/down, and delete as a 30px hanging
  ear behind an explicit Manage toggle. Routine actions (Add, Columns)
  are primary; delete is hidden until Manage is on and stays visually
  distinct (ink ear, red hover).
- No fake drag-and-drop. Nudge arrows are the reorder treatment. Marked
  as fallback interaction consistent with the PRD line-item rules.

### 3. Touch targets and typography

- Row controls, sheet inputs (44px), switches (50x30), toolbar buttons
  (44px), section banner buttons (40px inside a 48px banner), ear delete
  (30px, appears only in Manage mode). All exceed or meet the 44px
  minimum; the 20-22px always-visible stacks from v1 are gone.
- Functional text floor raised: labels 9px, row description 12px, meta
  10px, totals 11-17px, words line 9.5px. The 6-7px text from v1 is
  removed except for the always-shown tag, which is non-functional.

### 4. Totals

- Only Total Cost, Total Selling Price, Gross Profit, Amount in Words.
- Margin metric removed. Amount in words is Total Selling Price.

### 5. Document Details — verified against the live model

Checked `src/domain/boq/types.ts`. The Boq interface has: boq_number,
title, vendor_name, vendor_contact, issue_date, notes (plus template and
PDF customization fields). Mapped prototype fields:

| Field | Live model | Kept |
|---|---|---|
| BOQ Title | `title` | Yes |
| BOQ Number | `boq_number` | Yes |
| Issue Date | `issue_date` | Yes |
| Vendor Name | `vendor_name` | Yes |
| Vendor Contact | `vendor_contact` | Yes |
| Notes | `notes` | Yes, added |
| Project | Not a Boq field | Removed from v1 candidate |

No new persistence invented.

### 6. Column management — semantics corrected

The live model is `TableDocumentColumn { key, label, visible }`
persisted in `table_columns`; the row editor consumes `visible`. The v1
claim "shown on rows and the BOQ PDF" was NOT established by the model
or the PRD. v2:

- Toggle copy now says "shown/hidden in the row editor".
- An annotated note in the Columns sheet marks editor-vs-PDF visibility
  as unresolved.
- Column keys use the real model keys (specification, make_brand, cp,
  sp). CP/SP toggles remain exposed because the live model allows it;
  hiding them disables their editor inputs only.

### 7. Destructive actions

Clear All moved out of the toolbar into a confirm dialog reachable from
the overflow menu on the top bar. Delete-per-row is gated behind Manage
mode. Confirmation follows the centered dialog pattern from the CSR/Waybill
live forms.

### 8. Save action

FAB retained, safe-area aware. Perpetual halo animation removed. Save
feedback: transient toast, badge change (Draft / Editing / Saved), and a
one-time green FAB state that reverts after 1.6s.

### 9. Validation and feedback

Save validation finds the first offending row (empty description, qty <=
0, SP <= 0), pulses its compact row border red, auto-scrolls it into
view, and shows one error toast. The pulse and error state clear after
2.6s. No recurring toast.

### 10. Adaptive tiers

- Phone stays the source design. The same stacked IA persists at all
  widths.
- `>=600px` (tablet/fold medium): shell widens to 720px, padding grows,
  Document Details grids go three-column. Grow/shrink only, matching the
  `foldAwareness` data-attribute approach (`layoutMode` medium/mobile).
- `>=1200px` (desktop/expanded): shell widens to 960px, four-column
  grids, hover affordance on rows. Same flow, no dual-pane.
- Unspecified tier behaviors are kept conservative and are marked as
  candidate in the CSS comments.

## Verification

Git status was captured before starting, before this report, and after
completion.

- bun run build: not run (hardware policy; HTML-only task)
- bun run typecheck / lint / audit:load: not run (not required for
  design-direction HTML per the task gate)
- supabase db push: not applicable
- Production files modified: none (git status shows only the pre-existing
  changes from prior tasks plus the two prototype HTML files)

Behavior checks performed:

- JS syntax: `node --check` passes on the extracted inline script.
- Locked math extracted and executed in Node:
  - Aggregate cost `₦10,040,090.00`, selling `₦11,938,500.00`, gross
    profit `₦1,898,410.00` over the seeded rows — matches
    CP×Qty / SP×Qty / sell−cost.
  - Row profit `(6100−5200)×400 = ₦360,000.00` matches (SP−CP)×Qty.
  - `words()` renders `ZERO NAIRA ONLY` at 0, correct kobo handling at
    123.45, and correct magnitude words for the aggregate.
- 20 rows x 5 sections render in the compact list (structure check).
- Margin element: absent from HTML source (string check).
- Perpetual halo keyframes: absent from HTML source (string check).
- Visual and touch interaction on a real device: NOT VERIFIED by this
  session (no browser automation available). Flagged for the design
  reviewer.

## Risks or limitations

- HTML prototypes cannot prove native Android behavior (ripples,
  predictive back, haptics). The sheet is a stand-in for the production
  interaction; no library is prescribed.
- The 30px hanging-ear delete is below 44px by design: it is only
  visible in Manage mode, is offset from the row, and destructive
  confirmation is via the delete's irreversibility plus the visible row
  removal. If the reviewer wants 44px there, the row grows ~8px. Marked
  as a candidate decision.
- CP/SP hidden-column states disable the editor inputs but the compact
  row still shows their computed values; the live model does the same
  (visibility filters editor fields, totals still aggregate). Annotated
  in the sheet.

## Deferred work

- Reviewer pass on real phone widths (visual judgment).
- Decide editor-vs-PDF column visibility semantics; then update the note
  in the Columns sheet and, separately, production if needed.
- Decide whether Manage mode or swipe actions become the production row
  deletion interaction.
