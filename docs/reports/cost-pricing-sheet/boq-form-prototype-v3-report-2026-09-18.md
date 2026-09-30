# BOQ Form Prototype V3 Report

This report was written by Buffy on 2026-09-18 via Freebuff.

## Objective

Create `BOQ Full-Page Live Form v3.html` as a separate design-direction candidate. Base: the V1 BOQ live form. Additions: invoice responsive architecture, invoice Save FAB + footer, invoice Column Settings semantics, invoice JSON Import, and invoice-style Groups replacing Sections.

## Scope

Design-direction HTML only. No production React, TypeScript, SQL, or Supabase changes.

File created:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/BOQ Full-Page Live Form v3.html`

Files preserved, not modified:

- `BOQ Full-Page Live Form.html` (V1, kept for comparison)
- `BOQ Full-Page Live Form v2.html`
- All production sources under `src/`

## Skills used

html-prototype

Documentation standard: ASD-STE100 Simplified Technical English

## What was preserved from the original BOQ form

- Slate Navy visual language: tokens, gradient buttons, card shadows, mono inputs.
- Continuous form flow: Document Details, then Line Items, then Totals. No tabs.
- BOQ metadata fields verified against `src/domain/boq/types.ts`: boq_number, issue_date, vendor_name, vendor_contact, notes. No invented fields.
- Locked commercial model: line profit = (SP − CP) × Qty, derived and read-only. Total Cost = Σ CP×Qty. Total Selling Price = Σ SP×Qty. Gross Profit = Total SP − Total Cost. Amount in words = Total Selling Price. No VAT, no WHT, no discount.
- Totals show only the locked three metrics plus words. No margin KPI.
- Mobile compact scan row and focused bottom-sheet item editor from the V2 concept, refined.

## What was borrowed from the invoice form

Study references: `src/components/ColumnManager.tsx`, `src/components/document/FormFooter.tsx`, `src/components/document/FormLineItems.tsx`, `src/components/items/JsonItemsImportSheet.tsx`, `src/components/invoice/MobileGroupCard.tsx`.

1. Groups architecture: flat row list with `row_type: 'group_header'` and order-derived membership, as in FormLineItems. Group name inline edit, collapse, per-group add, move up/down, remove with items kept, optional group subtotal.
2. Save FAB + footer bar: FormFooter pattern. Three-button footer (Cancel, Draft, Save) plus a floating save FAB. Saving shows a spinner and disables both triggers. Feedback is one transient toast. No perpetual animation.
3. Column Settings: ColumnManager semantics with three modes per column. Shown = editable column. Value kept = hidden but counted and printed (candidate). Off = removed from editor, data kept. Fixed rows for description, qty, unit, total. Editable labels, reorder, custom columns, reset to BOQ defaults.
4. JSON Import: JsonItemsImportSheet pattern. Add mode appends rows and creates or joins groups. Update mode patches rows by row_number. Preview before apply. Structured errors. Unknown keys reported. Rows over 500 rejected. Add never modifies existing rows. Update is validated against current row count first.
5. Responsive grid editing: on fold and desktop widths, rows render as an inline grid with per-column editable inputs, a sticky header, and drag handles. On phone, rows render as compact scan lines.

## How Mobile, Fold, and Desktop differ

Tier detection uses viewport width and a `data-tier` attribute on body. This mirrors the `foldAwareness.ts` data-attribute philosophy.

- Phone (below 768 px): single column, compact scan rows, tap-to-open focused editor sheet, 44 px minimum touch targets, safe-area aware footer.
- Fold (768 px and above): wider shell, inline grid rows with direct cell editing, more columns visible without the editor sheet, group headers stay stacked above their items. Layout changes, not stretch.
- Desktop (1200 px and above): document-editor shell at 1120 px, four-column details grid, full column set including Specification and custom columns, a Profit column, and richer toolbar. Same information architecture as phone, adapted.

Mobile stays the source design. Wider tiers expose the same rows in grid form.

## How the Save FAB works

- FAB sits above the footer, right side, safe-area aware. It runs the same validation as the footer Save.
- On save: spinner on the FAB, both save triggers disabled, success toast, state returns to idle. Draft validates fewer rules (BOQ number and non-empty items), Save requires a description on every item.
- Validation pulses the offending field or row, scrolls it into view, shows one transient toast, and self-clears. On phone it opens the focused editor for the offending row.

## What Column Settings features were brought over

- Three visibility modes per configurable column (Shown, Value kept, Off), matching the invoice ColumnManager modes show, hide_display, hide_full.
- Fixed rows: description, qty, unit, total cannot be removed.
- Configurable rows: specification, make/brand, CP, SP. CP and SP are marked as totals contributors because they feed the locked totals math.
- Label editing, reorder by buttons and drag, add custom columns, remove custom columns, reset to defaults.
- A visible note marks editor-versus-PDF visibility as unresolved. The prototype does not claim hidden-in-editor equals hidden-in-PDF.
- Deviation from invoice, intentional: CP and SP always feed Total Cost and Total Selling Price regardless of mode. Locked math wins.

## How Import JSON works

- Two modes, segmented control: Add (append) and Update (patch by row_number). Update is disabled when the document has no items.
- Accepted shape: an array of items, or an object with an `items` array. Keys accept aliases: description/desc/item, quantity/qty, cp/cost_price/cost, sp/selling_price/price, make/brand, group/group_name/section.
- Add mode: rows without a group go above the first group. Rows with a group name join an existing group or create one. Preview shows row count, groups to create, skipped rows, and unknown keys.
- Update mode: requires row_number within the current item count. Only supplied fields patch. Untouched rows keep values. Validation happens before any mutation.
- Rejections: malformed JSON, non-array payloads, empty item lists, more than 500 rows, Update rows without row_number, out-of-range row numbers. All give specific error text.

## How Sections were replaced with Groups

- No `section` row type exists anywhere in the prototype code.
- Groups use the invoice flat model: a group_header row followed by its item rows in document order. Membership follows order, so add, insert, duplicate, delete, import, and reorder need no separate membership bookkeeping.
- Group controls: rename, collapse, add item, move up/down, remove (items kept as ungrouped), optional subtotal.
- Ungrouped items render in a neutral "Ungrouped items" block above the first group, matching the invoice ungrouped-row behavior.
- BOQ, then Groups, then Items, then configurable columns, then totals. This matches the invoice and quotation structure, so a future BOQ to quotation conversion maps groups and items directly.

## BOQ-specific behavior intentionally kept different from invoice

- CP and SP columns and the CP field in the editor sheet. Invoice has no cost price.
- Derived line profit readout, never editable, in rows, editor sheet, and desktop Profit column.
- Amount in words bound to Total Selling Price.
- No VAT, WHT, discount, or additional-charge fields anywhere.
- Totals card holds exactly Total Cost, Total Selling Price, Gross Profit, and words.

## Verification

Verification used static and script checks only. Visual and on-device checks remain with the project lead. A browser session was not used, per the standing instruction to leave visuals to the user.

- Inline JS extracted and passed `node --check`.
- Pure logic block extracted and executed in Node: 33 checks, all passed.
  - Totals math on mixed group and ungrouped rows matched the locked model.
  - money() and words() matched the shipped production formatters, including the unhyphenated tens form.
  - Import Add, Update, alias keys, malformed payloads, empty payloads, out-of-range row_number, and the 500-row cap all behaved as specified. Update parse verified as pure, with no mutation of existing rows.
- Acceptance greps passed: no margin KPI, no perpetual save animation, no vaul import, no section row type, groups architecture present, three column modes, import modes present, FAB and footer present, words bound to selling total, no VAT/WHT/discount inputs, safe-area handled, reduced motion respected, touch targets at 44 px or more.
- `git status` checked before and after. Result: only the new V3 file, this report, and pre-existing changes from other sessions. No production source modified.
- `bun run build` not run, per hardware policy.
- `bun run typecheck` and `bun run audit:load` not run. The change touches no TypeScript or configuration, so the verification gate does not apply to this artifact-only task.

## Pre-existing changes observed

- `docs/reports/boq/boq-renovation-audit-report.md` shows as deleted in the working tree. This predates the task and was left untouched.
- `docs/reports/general/2026-09-18-git-workflow-commit-report.md` is untracked from another session. Left untouched.

## Risks or limitations

- An HTML prototype cannot prove native Android behavior. Drag reorder uses HTML5 drag events on desktop widths; touch drag is not simulated. The focused editor, nudge buttons, and explicit menu actions demonstrate the interactions a production build would wire to real gesture handlers.
- Group drag reorder is restricted to same-list moves, matching invoice parity. Cross-group moves use the editor nudge controls.
- Column mode "Value kept" marks PDF printing as candidate behavior. Production PDF visibility is governed separately by document fillable settings.

## Deferred work

- User visual review of the three tiers in a browser.
- Decision on editor versus PDF column visibility semantics.
- Production implementation planning, if this candidate is approved.
