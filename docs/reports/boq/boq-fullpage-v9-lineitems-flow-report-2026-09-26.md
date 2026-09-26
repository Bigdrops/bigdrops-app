# BOQ Full-Page v9 Line Items Flow Report

This report was written by opencode (mimo-v2.6-flash-free) on 2026-09-26 via Local Runner.

## Objective

Make the Line Items region read as continuous document flow. Remove the outer card shell. Compress the gap after the Insert Below button to 12–16px per side of the row separator. Keep rows as a list. Preserve groups, CP-SP semantics, FAB, enumeration, and JSON Import.

## Scope

Only the Line Items section of `BOQ Full-Page Live Form-v9.html`. Structural CSS and one markup class. No calculation, behavior, or prototype changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v9.html`

## Skills used: NONE

## Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

1. Added `section.flowsec{margin-top:16px}`. This rule sets margin only. It sets no background, border, padding, shadow, or radius.
2. Changed the Line Items markup from `<section class="card">` to `<section class="flowsec">`. The section no longer has the card shell.
3. Changed `.item` padding from `10px 0` to `14px 0 0`. The Insert Below button keeps its 36px touch height. The closing space after the button text is about 13px. The opening space before the next row is 14px.
4. Changed `.gbody>.item` padding from `10px 0` to `14px 0 0` for grouped rows.
5. Changed `#items>.gwrap+.item` margin from 18px to 14px. Changed `#items>.gwrap.collapsed+.item` margin from 12px to 8px. Total group-to-row distance stays the same as before.

Result: the row separator sits about 13px below the Insert Below text and about 14px above the next row. The section is now an unboxed flow region on the page surface. Group containers remain the strongest visual unit.

## Verification result

Static verification only. No build and no database work.

- CSS brace balance: passed (final depth 0)
- Dark block position: passed (closes before `*{box-sizing`)
- Inline script syntax (`vm.Script`): passed
- Prior repair spot checks (16): all passed
- Line Items flow checks (16): all passed (flowsec class, item padding, group margins, JSON Import in toolbar, create pair at end, hanging `.ear` delete, global enumeration `.idx`, group header/footer, `.gwrap` envelope, collapse, FAB standard tokens, CP-SP classes)
- `git diff --check`: passed (exit 0)
- `git status`: the target file is ` M`. This includes the earlier repair session in the same working tree. No other file was changed by this task.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Visual check in a browser was not done. Verification is static only.
- The section loses card padding, so rows are about 24px wider than before. The grid layout absorbs this.
- Group bodies keep white backgrounds in dark mode. This is pre-existing behavior and was not in scope.

## Deferred work

- A live browser pass at mobile, tablet, and desktop widths.
