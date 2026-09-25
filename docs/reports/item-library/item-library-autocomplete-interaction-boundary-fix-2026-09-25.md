# Item Library Autocomplete Interaction Boundary Fix Report

This report was written by Codex on 2026-09-25 via Codex desktop.

## Objective

Fix the Item Library autocomplete dismissal regression.

The suggestion panel must stay open when the user scrolls inside it. A dismissed panel must be able to reopen for the same valid row and query.

## Scope

This task changed only the mobile line-item autocomplete interaction boundary and focused autocomplete tests.

This task did not change:

- Item Library ingestion.
- Historical backfill data.
- Tier C data.
- Tier D data.
- Normalization.
- Canonical matching.
- Merge behavior.
- Supabase schema.
- Financial calculations.
- Cleanup Hub behavior.

## Files changed

- `src/components/invoice/MobileItemCard.tsx`
- `src/components/invoice/MobileItemCard.test.js`
- `docs/reports/item-library/item-library-autocomplete-interaction-boundary-fix-2026-09-25.md`

## Skills used

Skills used: accessibility, vercel-react-best-practices, typescript-advanced-types, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Approved design source

The approved design source was:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/15-interaction-model.md`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/21-surfaces-and-overlays.md`

The `frontend-design` skill was not used for this task.

## Root cause

The suggestion list is an internal scroll surface.

The previous implementation attached a captured `scroll` listener to `window`. The handler closed the panel for every scroll event. It did not inspect the event target.

When the user dragged inside the suggestion list, the list scrolled. The captured window listener received the scroll event and closed the panel. This incorrectly treated internal list scrolling as outside interaction.

The reopen problem had the same state cause. The close action set `descriptionFocused` to `false` while the valid description text remained unchanged. If the textarea still had DOM focus, tapping it again did not reliably fire a new focus event. The valid query stayed present, but the panel state stayed closed.

## Changes made

- Added a shared autocomplete-boundary check with `suggestionRootRef`.
- Updated outside pointer dismissal to ignore events inside the autocomplete boundary.
- Updated captured scroll dismissal to ignore scroll events whose target is inside the autocomplete boundary.
- Preserved parent or page scroll dismissal when the scroll event target is outside the autocomplete boundary.
- Added an explicit reopen path for textarea pointer interaction.
- Kept focus-based reopen for keyboard and normal focus movement.
- Reopened suggestion state during description edits.
- Reset the active option when the field is entered again.

## Preserved behavior

- Selecting a suggestion still closes the panel.
- True outside pointer interaction still closes the panel.
- Escape still closes the panel.
- Moving to another field or row still closes the previous row.
- Clearing the query below the minimum length still closes through the existing query eligibility rule.
- The suggestion engine and canonical `item_id` selection behavior are unchanged.
- Opaque surface styling is unchanged.
- Compact `100dvh` max-height styling is unchanged.
- Listbox and option ARIA semantics are unchanged.
- Arrow key and Enter behavior are unchanged.

## Mobile behavior

Touch down inside the list stays inside the autocomplete boundary.

Dragging inside the list scrolls the list and keeps the panel open.

Touch release after internal list scroll does not close the panel.

Tapping a suggestion selects it and closes the panel.

Tapping the description field again can reopen suggestions for the unchanged valid query.

## Tests

Focused tests were strengthened in `src/components/invoice/MobileItemCard.test.js`.

The tests now verify:

- The opaque and compact surface contract remains.
- The old 150 ms blur timeout was not restored.
- Internal suggestion scrolling is guarded by the autocomplete boundary.
- Outside pointer dismissal remains target-aware.
- No event propagation trap was added.
- Pointer and focus paths can reopen suggestions for unchanged text.
- Editing text can reopen suggestions.
- Canonical `item_id` selection still uses the field policy path.

The current test infrastructure for this component is source-level static verification. It does not include jsdom or React Testing Library for runtime pointer and scroll simulation. This limitation remains.

## Verification

- Focused autocomplete tests:
  - `node --experimental-loader ./src/tests/resolve-alias.js --test src/components/invoice/MobileItemCard.test.js src/tests/invoice/invoiceSuggestionWiring.test.js`: passed, 8 tests.
- `bun run typecheck`: blocked by known unrelated error:
  - `src/pages/settings/AdminSettingsSection.tsx(38,148): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.`
  - This task did not modify `src/pages/settings/AdminSettingsSection.tsx`.
- Scoped `git diff --check`:
  - `git diff --check -- src/components/invoice/MobileItemCard.tsx src/components/invoice/MobileItemCard.test.js`: passed.
- Full `git diff --check`: passed with line-ending warnings only.
- `bun run audit:load`: not applicable. No query, schema, or data-layer logic changed.
- `supabase db push`: not applicable. No database change was made.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: not applicable.

No schema change was made.

## Git status

Final relevant status:

- `src/components/invoice/MobileItemCard.tsx`: modified by this task.
- `src/components/invoice/MobileItemCard.test.js`: modified by this task.
- `docs/reports/item-library/item-library-autocomplete-interaction-boundary-fix-2026-09-25.md`: added by this task.

An unrelated modified file is also present:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`

This task did not modify that file.

## Risks or limitations

- Runtime behavior is verified by code inspection and focused source-level tests. The repository does not currently provide a DOM interaction test harness for this component.
- The autocomplete remains an inline overlay. A future shared combobox primitive could provide stronger runtime interaction tests.

## Deferred work

- Add a DOM-capable component test harness for mobile row autocomplete interactions.
- Consider a shared lightweight combobox primitive after the app standardizes one.
