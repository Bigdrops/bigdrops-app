# Item Library Interaction Layer Improvements Report

This report was written by Codex on 2026-09-25 via Codex desktop.

## Objective

Improve the Item Library Cleanup Hub and form autocomplete interaction layer.

The Cleanup Hub must remain a human review surface. It must not become an automatic cleanup engine.

The form autocomplete panel must be compact, opaque, accessible, and easy to dismiss.

## Scope

This task changed only Item Library review UI, mobile line-item autocomplete UI, and focused tests.

This task did not change:

- Item Library ingestion.
- Historical backfill data.
- Tier C unresolved rows.
- Tier D group header rows.
- Database schema.
- Supabase RPC behavior.
- Financial calculation behavior.

## Files changed

- `src/components/invoice/MobileItemCard.tsx`
- `src/components/invoice/MobileItemCard.test.js`
- `src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx`
- `src/tests/invoice/invoiceSuggestionWiring.test.js`
- `src/tests/item-library/itemLibraryCleanupInteraction.test.js`
- `docs/reports/item-library/item-library-interaction-layer-improvements-2026-09-25.md`

## Skills used

Skills used: frontend-design, accessibility, react-dev, typescript-advanced-types, tailwind-css-patterns, vercel-react-best-practices, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Standards reviewed

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- Adaptive Mobile-First UI/UX overlay, interaction, accessibility, and mobile-first PRD sections.
- Existing Item Library reports from 2026-09-25.

## Cleanup Hub changes

- The review copy now states that similarity is review evidence, not identity proof.
- The UI now tells the user to keep records separate when model, rating, size, material, or application differences matter.
- Duplicate group cards now show a concise review-only warning.
- Duplicate group cards now show a small summary of total use count and price range when price data exists.
- The merge card now says to merge only true duplicates.
- The merge card now gives the user a visible "Leave separate" action.
- The merge confirmation now explains the surviving primary item, retired merged items, alias handling, linked history, and future suggestions.

## Cleanup behavior

No automatic fuzzy merge was added.

No Tier C rows were attached to catalog items.

No Tier C rows were converted to aliases.

No Tier D rows were changed.

Existing merge behavior still uses the current merge path. This task did not create a second merge implementation.

## Autocomplete changes

- The suggestion panel now uses an opaque application surface with `bg-bd-card-bg`.
- The panel now uses a stronger stack level than ordinary form rows.
- The panel uses a compact max height that accounts for dynamic viewport height.
- Result rows now show item name first.
- Result rows show concise price context as client last price, last used price, standard price, or no price.
- Secondary metadata is limited to alias, usage count, and last source document number when available.
- The old blur timeout was removed.

## Interaction behavior

- Selecting a suggestion closes the panel.
- Pointer interaction outside the suggestion area closes the panel.
- Escape closes the panel.
- Form scroll closes the panel to prevent orphaned overlays.
- Moving focus out of the description field closes the panel unless focus moves into the suggestion panel.
- Clearing or changing the query resets the active suggestion index.

## Accessibility behavior

- The description field exposes combobox metadata when suggestions are enabled.
- The suggestion surface uses `role="listbox"`.
- Each suggestion uses `role="option"`.
- The active option is connected with `aria-activedescendant`.
- Arrow Down and Arrow Up move the active option.
- Enter selects the active option.
- The active option has a visible selected state.

## Responsive and mobile behavior

- The panel max height is limited with `max-h-[min(13rem,calc(100dvh-14rem))]`.
- The panel scrolls internally when more results exist.
- The inline panel does not expand into a full search workflow.
- More results are indicated with a compact footer.
- The software keyboard case was handled by limiting panel height against `100dvh`.

## Light and dark behavior

- The panel uses an opaque card background token.
- The panel uses readable text tokens.
- The panel uses border and ring tokens for a clear boundary.
- The selected and hover states use existing surface tokens.
- No blur-only transparency fix was used.

## Verification

- Focused tests:
  - `node --experimental-loader ./src/tests/resolve-alias.js --test src/components/invoice/MobileItemCard.test.js src/tests/invoice/invoiceSuggestionWiring.test.js src/tests/item-library/itemLibraryCleanupInteraction.test.js src/tests/item-library/catalogCleanupSession.test.js src/tests/item-library/itemCleanupExchangeFlaggedRegression.test.js`: passed, 16 tests.
- `bun run typecheck`: blocked by known unrelated error:
  - `src/pages/settings/AdminSettingsSection.tsx(38,148): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.`
  - This task did not modify `src/pages/settings/AdminSettingsSection.tsx`.
- `git diff --check`: blocked by an unrelated modified file:
  - `docs/reports/multi-tenancy/phase-2-scope-extraction-report-v2.md`
  - The file has trailing whitespace.
  - This task did not modify that file.
- Scoped whitespace checks for this task: passed.
  - `git diff --check -- src/components/invoice/MobileItemCard.test.js src/components/invoice/MobileItemCard.tsx src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx src/tests/invoice/invoiceSuggestionWiring.test.js`: passed.
  - `rg -n "[ \t]+$" docs/reports/item-library/item-library-interaction-layer-improvements-2026-09-25.md src/tests/item-library/itemLibraryCleanupInteraction.test.js`: no matches.
- `bun run audit:load`: not applicable. No schema, query, or data-layer logic changed.
- `supabase db push`: not applicable. No database change was made.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: not applicable.

No schema change was made.

## Git status

Pre-existing protected untracked files were present before this task:

- `docs/reports/boq/boq-form-prototype-v4-report-2026-09-25.md`
- `docs/reports/item-library/item-library-historical-backfill-execution-report-2026-09-25.md`
- `docs/reports/item-library/item-library-historical-backfill-planning-audit-2026-09-25.md`
- `src/tests/item-library/itemLibraryHistoricalBackfillMigration.test.js`
- `supabase/migrations/20260925110000_item_library_historical_backfill.sql`

An additional untracked PRD HTML file is present in the workspace:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq-sample-v1.html`

During final verification, an unrelated modified file also appeared:

- `docs/reports/multi-tenancy/phase-2-scope-extraction-report-v2.md`

This task did not modify those protected files.

## Risks or limitations

- The autocomplete tests are static because the current local test pattern for these components is source-level verification.
- The panel is still inline with the row instead of a portal overlay. This keeps the change small, but a future shared overlay primitive can reduce stacking risk further.
- The Cleanup Hub still uses the existing client-side duplicate group generation. This task changed the review semantics and merge warnings, not the detection algorithm.

## Deferred work

- Tier C historical ambiguity remains deferred. Those rows need a separate, explicit human review workflow before mutation.
- A future task can move the autocomplete panel to a shared overlay primitive if the app standardizes one for combobox behavior.
- A future task can reduce remaining Item Library repository fallback complexity after separate risk review.
