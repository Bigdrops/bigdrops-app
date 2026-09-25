# BOQ Form Prototype V4 Report

This report was written by opencode on 2026-09-25 via opencode.

## Objective

Create `BOQ Full-Page Live Form v4.html` as a new design-direction candidate. Base: the locked BOQ commercial model and the real live invoice and quotation mechanics (Groups, JSON import, Column Settings, Save FAB). Rule: do not copy the live-form visuals and do not copy V3. V4 uses inline-first editing instead of a bottom-sheet item editor.

## Scope

Design-direction HTML only. No production React, TypeScript, SQL, or Supabase changes.

File created:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/BOQ Full-Page Live Form v4.html`

Files preserved, not modified:

- `BOQ Full-Page Live Form.html` (V1)
- `BOQ Full-Page Live Form v2.html`
- `BOQ Full-Page Live Form v3.html`
- All production sources under `src/`

## Skills used

frontend-design, html-prototype

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

1. Wrote the full V4 file in four chunks: document shell and tokens, body markup, pure-logic block, and the UI script.
2. Added grid CSS for wide tiers: `.gwrap` grid, `--gcols` column template, and grid header rules.
3. Added four CSS fixes after the first review:
   - `.mval.hero.neg` — a negative Gross Profit now renders in the attention colour. The earlier `.mval.neg` rule lost the specificity fight with `.mval.hero`.
   - `.iconbtn[disabled]` and `.gmenu button[disabled]` — disabled controls now look disabled.
   - `.gcell-profit.neg` and `.gcell-profit.pos` — grid-mode profit cells now colour-code negative and positive values.

## What was preserved from the locked BOQ model

- Metadata fields from `src/domain/boq/types.ts`: boq_number, issue_date, vendor_name, vendor_contact, notes. No invented fields.
- Locked math from `src/domain/boq/calculateBoqTotals.ts`: line profit = (SP − CP) × Qty, derived and read-only. Total Cost = Σ CP×Qty. Total Selling Price = Σ SP×Qty. Gross Profit = Total SP − Total Cost. Amount in words = Total Selling Price.
- Totals show exactly three metrics plus words. No VAT, no WHT, no discount, no margin KPI.
- Money format: `₦` with `toLocaleString('en-NG')`, ported from `src/lib/formatters/money.ts`. Amount in words ported from `numberToWords`, including the zero case and the word-form kobo.
- Groups, not sections. `row_type: 'group_header'` rows are display headers only: collapse, rename, item count. They are excluded from totals. No group subtotal.
- Ungrouped items render before the first group. Removing a group header moves its items to the ungrouped block. Nothing is deleted.

## What is new in V4 compared with V3

- Inline-first editing. Phone rows tap to expand in place. Tablet and desktop edit cells in place. Sheets are used only for Import JSON, Column Settings, and destructive confirms.
- Column Settings uses plain show/hide toggles. V3 used three visibility modes. Hidden columns keep their data. Totals are unaffected.
- Column reorder swaps with a neighbour only when both rows are non-fixed. Fixed rows: description, quantity, unit.
- Column defaults follow `BOQ_COLUMNS` in `src/domain/table-document/templateRegistry.ts`: description, specification (hidden), quantity, unit, make/brand, CP, SP. The Profit readout is always shown.
- Group controls are collapse, inline rename, add item, move up/down, and remove. Items are never deleted by a group removal.
- Tiers follow `src/lib/native/foldAwareness.ts`: phone below 600 px, tablet 600–1199 px, desktop 1200 px and above. A resize listener re-renders when the tier changes and updates the tier chip.

## How Save, validation, and the FAB work

- Save requires a description on every item. Draft and the FAB require a BOQ number and at least one item.
- Error text: `BOQ number is required to save a draft.`, `Add at least one item before saving.`, `Every item needs a description before save.`
- Validation marks the input, shows the message by `mNumber`, pulses the offending row, and scrolls it into view. The error clears when the BOQ number is edited.
- Save flow: FAB spinner, all save triggers disabled during a 900 ms simulated request, then one transient toast. The FAB runs the draft path.

## How Import JSON works

- Two modes in a segmented control: Add (append) and Update (patch by `row_number`).
- Preview runs before apply: row count, groups to create, skipped rows, unknown keys. The cap is 500 rows.
- Errors: `Malformed JSON: ...`, `Item list is empty.`, `No usable rows found. Check the alias keys.`
- Update requires `row_number` in range 1..itemCount. Apply re-parses, then toasts `Imported N rows.` or `Updated N rows.`
- The import text area is cleared each time the sheet opens.

## Verification

Verification used static and script checks only. Visual and on-device checks remain with the project lead. A browser session was not used, per the standing instruction to leave visuals to the user.

- Inline script extracted and passed `node --check`: 903 lines.
- Pure logic block extracted and passed `node --check`: 199 lines.
- Assertion self-check in Node: 47 checks, all passed.
  - Money format and amount-in-words matched production behaviour, including the word-form kobo and the hyphen-free tens form.
  - Totals math on mixed group and ungrouped rows matched the locked model.
  - Import Add, Update, alias keys, malformed payloads, empty payloads, unknown keys, group create/join counts, and both validation paths behaved as specified.
- Static cross-checks: all 37 JS element-id references exist in markup; CSS braces balanced 182/182; no leftover build markers; every `data-act` value has a `handleAct` case; 27 event listeners present (delegation, no inline `onclick`).
- Spec spot-checks: import sheet clears on open, `[data-close]` delegation present, BOQ number edits clear their error, `init()` runs.
- `git status` checked before and after. Result: the working tree is clean. Concurrent sessions committed their own work plus the V4 file during this task. HEAD verified to contain all four CSS fixes and both PURE markers. V3 and all production sources untouched by this task.
- `supabase db push`: not applicable. No SQL changed.
- `bun run build` not run, per hardware policy.
- `bun run typecheck` and `bun run audit:load` not run. The change touches no TypeScript or configuration, so the verification gate does not apply to this artifact-only task.

## Pre-existing changes observed

- The baseline showed many modified, deleted, and untracked files from other sessions. All were left untouched.
- `BOQ Full-Page Live Form v3.html` was untracked at baseline and became tracked during this task. This task did not commit it.

## Risks or limitations

- An HTML prototype cannot prove native Android behaviour. Expand-in-place and button reorder demonstrate the interaction a production build would wire to real gesture handlers.
- Import preview runs client-side against in-memory rows only. Row-number stability under concurrent edits is a production concern.
- The save flow uses a fixed 900 ms delay. It does not talk to a backend.
- The prototype does not claim hidden-in-editor equals hidden-in-PDF. PDF visibility stays governed by document fillable settings.

## Deferred work

- User visual review of the three tiers in a browser.
- Decision on editor versus PDF column visibility semantics.
- Production implementation planning, if this candidate is approved.
