# BOQ V11 Item-Layout Recovery Report

This report was written by Solar Mini4 on 2026-09-27 via Local Runner.

## Objective

Recover the accepted pre-GLM item-row layout in the BOQ authoring prototype
`boq-form-candidate-v11.html` after a previous agent damaged the mobile
item-row composition. The goal is structural recovery of the item architecture
from the known-good pre-GLM baseline, plus selective retention of the
accepted post-baseline improvements (Sub Description interaction, Column
Settings, numeric formatting, Save affordances).

## Scope

- Single file edited: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v11.html`
- No React source changed
- No SQL or Supabase changed
- No dependency changes
- No unrelated prototype redesign

## Files Changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v11.html`
  (3 edits: CSS subrow/subtog/sub-prev-text, JS editSub, JS subHTML)

## Skills Used

NONE (static HTML/CSS/JS prototype recovery; no skill required for this scope)

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### 1. Structural code restored from pre-GLM baseline

- `.subrow` restored to reference composition:
  `display:flex;flex-direction:column;gap:6px;padding-left:10px;border-left:2px solid var(--line);transition:border-color .15s`
  The previous damaged rule `display:flex;flex-direction:column;gap:6px` omitted
  the left hairline and indentation that attach Sub Description to the item
  composition.
- `.subrow.has{border-left-color:var(--accent)}` restored so a populated Sub
  Description shows the accent left border.
- `.subtog` restored to reference composition:
  `display:flex;align-items:flex-start;gap:6px;width:100%;min-height:34px;padding:7px 0;text-align:left;...`
  The previous damaged rule `align-items:center` detached the control icon from
  the text label and lost the compact field styling.
- `.subtog.sub-add{align-items:center}` restored so the empty `Add sub
  description` row is compact with no reserved textarea-sized space.
- `.sub-prev-text` restored to the baseline clamp:
  `display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-size:10.5px;font-weight:600;letter-spacing:0;text-transform:none;line-height:1.45;color:var(--sub)`
  The previous damaged rule lacked `letter-spacing:0` and `text-transform:none`,
  which degraded the preview typography.
- `.subfield{min-height:58px}` preserved so the open editor has a stable
  minimum height and never collapses to a textless row.

### 2. JSON reclaim architecture removed

The damaged file had no active `reclaimKey()` / `.ihead-with-reclaim` /
`.reclaim` runtime mechanism in the JS functions reviewed. The item
`ihead` already uses the reference grid `grid-template-columns:34px
minmax(0,1fr)`. The CSS regressions recovered above restore the correct
layout without any three-column identity grid, no field hoisting, no
artificial empty grid tracks, and no negative-margin or abs-position hacks.

### 3. Sub Description recovered

- `.subrow` now carries the left hairline and indentation (baseline).
- `.subrow.has` applies the accent border for populated rows (baseline).
- Closed + empty: one compact `sub-add` button row labelled `Add sub
  description` with no editor space reserved.
- Closed + populated: the actual sub text is shown as a 2-line clamped
  `sub-prev-text` preview inside the same row.
- Open: the `subfield` textarea appears below the header, pushed later fields
  downward naturally.
- Tapping the populated preview row opens the editor (aria-expanded and
  onclick wired).
- `editSub()` restored to live preview patching: it updates the `has` class,
  the `sub-add` class, the chevron, the `sub-prev-text` label, and the
  `subrow` border. Empty + blurred closes straight back to the compact add
  row via `collapseIfEmpty()`.

### 4. Accepted Column Settings preserved

No change was made to the Column Settings implementation. The damaged file
retains the accepted post-baseline Column Manager: fixed Description row,
ordered columns with drag + up/down ordering, editable labels, TEXT/NUM
badges, visibility switches, reset-to-defaults with confirm. The `cols` and
`vis()` systems are untouched.

### 5. Numeric formatting preserved

No change was made to the numeric formatting pipeline. `naira()`, `fmtGroup()`,
`fmtMoney()`, `fmtQty()`, and `editNum()` remain identical to the baseline.
Raw numeric semantics are preserved underneath presentation formatting.

### 6. Save affordances preserved

No change was made to the Save surfaces. The file retains:
- the floating phone `.fab` Save shortcut,
- the end-of-form labelled `.savebar` `Save BOQ` completion action,
- the fold `.tb-save` sticky top-bar Save action,
- all wired to the same `save()` function.

## Verification Result

Limited verification was performed per user instruction. No automated build,
typecheck, lint, audit, or browser test was run.

- Inspected and diffed the two HTML files.
- Confirmed the subrow/subtog/sub-prev-text CSS now matches the baseline.
- Confirmed the JS `editSub()` and `subHTML()` functions now match the
  baseline.
- Confirmed the itemHTML DOM structure is unchanged and correct.
- No pre-existing unrelated git changes were reverted or overwritten. The
  working tree still shows all pre-existing modified files and the
  baseline `boq-form-candidate-v11-b4-glm-fucked-me.html` remains an untracked
  reference.

## Risks or Limitations

- Visual verification was not performed. The user will confirm manually.
- The only checks done were static inspection of the two files and their
  content. No browser render was captured.

## Deferred Work

- The user requested manual visual verification of the recovered item rows.
- The baseline `boq-form-candidate-v11-b4-glm-fucked-me.html` remains untracked
  and may be reviewed or rejected by the user.
