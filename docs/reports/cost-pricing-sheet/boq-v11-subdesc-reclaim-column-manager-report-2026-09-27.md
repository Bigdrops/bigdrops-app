# BOQ v11 Phone Composition Correction + Column Manager Port Report

This report was written by Buffy on 2026-09-27 via Freebuff.

## Objective

Refine the accepted V11 phone + fold prototype after two human review passes:

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v11.html`

Pass 1 added Sub Description states, numeric separators, Save affordances, a Column Manager port, and a rail-space reclamation layout. Pass 2 corrected the composition against a user-supplied reference image: the reclamation layout created a narrow Description with Make / Brand in a separate right-hand position and a large dead region. That mechanism is removed. The phone item is a compact vertical stack beside the rail.

## Scope

- One standalone prototype file changed. Inline CSS and JavaScript.
- One report updated. Report only.
- No React source change. No SQL change. No Supabase change. No dependency change.
- No build, typecheck, lint, Playwright, or browser automation for this pass, per instruction. The user performs visual verification.

## Files changed

| File | Change |
|---|---|
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v11.html` | Modified. Phone item composition corrected to the reference layout. |
| `docs/reports/boq/boq-v11-subdesc-reclaim-column-manager-report-2026-09-27.md` | Updated. This report. |

Concurrent-agent note: `git status` before and after work shows the V11 file staged (`A`) plus working-tree modifications (`AM`) from this task; the staged snapshot is another agent's commit state. Item-library source, tests, report, and migration files belong to another agent and were not touched.

## Skills used

Skills used: mobile-app-ui-design, html-prototype

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### 1. Removed the failed reclamation mechanism

Deleted completely, not patched:

- `.ihead-with-reclaim` three-column identity grid, base and fold variants.
- `.reclaim` slot styling, including the end-aligned and fold band variants.
- `reclaimKey()` selection logic.
- `META_FIELDS` registry (Make returned to its explicit render position).
- The hoisted Make input and its `metaHTML` skip rule.

No negative margins, absolute positioning, or geometry patches remain.

### 2. Compact vertical stack (reference composition)

The identity grid is back to two columns: rail + content. The content column is one continuous stack:

```
Description (normal available width beside the rail)
+ Add sub description | actual sub text preview | Sub description editor
Make / Brand (full available width)
--- full-width zone below the identity zone ---
Qty | Unit
CP | SP
Line profit
```

- Description keeps the original width relationship to the rail. Long descriptions wrap naturally.
- Make / Brand directly follows the Sub Description row. No dead region. One instance.
- Open editor sits between Description and Make in normal flow; everything below moves down naturally. Closing restores the compact stack. Empty editor collapse returns to the "+ Add sub description" row (`collapseIfEmpty` on blur).
- Closed + populated shows the actual Sub Description text clamped to 2 lines. Tapping it opens the editor directly. There is no third "show more" state and no status message anywhere ("Sub description added" is absent from the file).
- Fold inherits the same stack; no three-column or two-band reclaim variant exists at any width.

### 3. Sub Description row styled per the reference

The row is now a compact field-style control: full content width, bordered, `--soft` background, 44 px minimum height, note/plus icon, label, chevron. Closed + populated shows the actual text inside the same row. Open shows the "Sub description" header row with the editable field below it, matching the reference image.

### 4. Column Settings work preserved

The accepted Column Manager port is intact and untouched by this correction:

- Fixed Description row with editable label and Fixed badge.
- Ordered column rows: grip drag, up/down buttons (`moveColumn` guard semantics: description locked, index 0 clamped, bounds checked, no-op unchanged), editable labels, TEXT/NUM badges, visibility switches.
- Reset to defaults with the confirm dialog. Canonical seven-key BOQ table-document contract (`{key, label, visible}`) with `resolveBoqColumns` integrity semantics.
- `vis('make')` still gates the Make field; `vis('specification')` still gates the Sub Description row. Hidden columns remove their fields; no hard-coded replacement content.

### 5. Carried forward, unchanged

- Live thousands separators on CP, SP, and Qty; raw numeric model; caret-safe editing; decimal and leading-dot entry; registry numeric fields format through the same pipeline.
- Phone Save FAB, end-of-form labeled `Save BOQ` after Totals, fold persistent labeled top-bar `Save BOQ`; one shared `save()`; FAB hidden at fold.
- Inline Columns / Import / Clear All, enumeration rail, group behavior, CP/SP distinction, fold recomposition, locked calculations, import contract, validation text.

## Verification result

Per instruction, static inspection only:

```
Verification:
- script syntax: parses (new Function), 0 errors
- CSS: 273 open / 273 close braces, 0 empty rule blocks
- HTML tag balance: div 45/45, section 3/3, header 1/1, button 19/19, textarea 1/1, label 5/5, span 15/15, svg 12/12, p 2/2, b 8/8, small 4/4 - all balanced
- mechanism removal scan: zero occurrences of reclaimKey, ihead-with-reclaim, .reclaim, META_FIELDS, sub-add in the file
- forbidden phrase scan: "Sub description added" absent
- required tokens present: Add sub description, sub-prev-text, Save BOQ, tb-save, savebar, cm-sec, cm-badge, fmtQty, data-numin
- git diff --check: clean
- git status: scoped to the V11 prototype + this report; other changes belong to concurrent agents
- bun run build / typecheck / lint: not run, per instruction
- Playwright / browser automation: not run, per instruction
- supabase db push: not applicable
```

## Supabase push status

supabase db push: not applicable. No SQL and no schema change.

## Risks or limitations

1. **No automated behavioral run.** The instruction excluded browser automation. Composition behavior is verified by code inspection against the reference image description; the user performs visual acceptance.
2. **The staged V11 file carries another agent's commit state.** This task's edits are working-tree modifications on top.
3. **Open-state editor keeps the header row visible.** The header plus editor is two stacked elements; the closed state remains the single compact row shown in the reference.

## Deferred work

- Human visual acceptance at 320, 390, 430, 600, and 800 px in both themes.
- Carry the corrected compact-stack composition and the column-manager-driven visibility into the React BOQ module when adopted.
