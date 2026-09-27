# Item Library Direct Entry Recognition Report

This report was written by Codex on 2026-09-26 via Codex desktop.

## Objective

Implement deterministic Item Library recognition for directly typed invoice and quotation line-item descriptions.

## Scope

The change applies to the shared mobile line-item editor that `FormLineItems` uses for invoices and quotations.

The change does not modify Cleanup Hub, historical backfill, Tier C, Tier D, forward learning triggers, duplicate detection, or financial calculations.

## Files changed

- `src/components/invoice/MobileItemCard.tsx`
- `src/components/invoice/MobileItemCard.test.js`
- `src/modules/item-library/domain/invoiceSuggestionPriceContext.ts`
- `src/modules/item-library/hooks/useItemSuggestionEngine.ts`
- `src/modules/item-library/repositories/itemLibraryRepository.ts`
- `src/modules/item-library/services/itemLibraryService.ts`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/tests/item-library/directEntryRecognition.test.js`
- `docs/reports/item-library/item-library-direct-entry-recognition-2026-09-26.md`

## Skills used

Skills used: react-dev, typescript-advanced-types, webapp-testing, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Proven cause

Autocomplete selection called the suggestion engine selection path.

That path set:

- `description`
- canonical `item_id`
- `unit_price`
- selected item state for price history text

Direct typing used the suggestion fetch path only.

The row already tried to set `item_id` from an exact suggestion match. It did not mark the item as the selected or recognized item in the suggestion engine. Because of that, `priceContextText` stayed empty and the row did not show the last sold context.

The direct exact match also came from the limited suggestion list. That list is useful for display, but it is not a complete identity proof.

## Current selection flow

Explicit autocomplete selection still:

- uses the selected suggestion;
- writes canonical `item_id`;
- writes the selected description according to existing alias/catalog behavior;
- applies the existing supported `unit_price` value;
- closes the suggestion panel;
- shows price history context.

This behavior was preserved.

## New direct-recognition flow

Direct entry now uses a deterministic exact lookup.

The lookup checks:

- one active `item_catalog.normalized_name`;
- or one active, non-retired `item_aliases.normalized_alias_text` whose target item is active.

If the exact lookup finds exactly one canonical item, the row attaches that item ID and marks the source as `recognized`.

The typed description is not rewritten.

If no exact identity exists, the row remains unrecognized. Normal save behavior and database learning still apply.

## Exact-match rules

Allowed:

- exact active canonical normalized name;
- exact active and non-retired alias normalized text;
- casing and whitespace variants that the existing normalizer treats as equal.

Rejected:

- fuzzy matches;
- prefix matches;
- substring matches;
- identity-significant variants such as voltage, wattage, gauge, or product size changes;
- ambiguous exact matches across more than one item ID.

## Alias rules

Alias recognition is allowed only when:

- the alias is active;
- the alias is not retired;
- the target item exists;
- the target item is active;
- the normalized alias maps to exactly one item identity.

The UI keeps the typed alias text. It attaches the canonical target `item_id`.

## Invalidation behavior

Manual description edits still clear an existing linked item context.

The hook also rechecks an exact candidate against the current normalized description before it exposes the candidate. This prevents a stale result for text A from attaching after the user has typed text B.

If the next text exactly resolves to another item, the next lookup can attach that item.

## Price-control behavior

Direct recognition does not change `Rate`.

If the row has a zero or empty rate and a positive historical price exists, the row can show a secondary `Use ₦...` action.

The action is shown only for `recognized` direct-entry identity. It is not shown for explicit suggestion selection.

When the user presses the action, only `unit_price` changes. Existing document calculations recalculate totals.

If the user already entered a non-zero rate, no price action appears.

## Async protection

The suggestion engine keeps the existing fetch ID and cancellation guard.

The returned exact candidate is also checked against the current normalized description before the component can use it.

## Tenant isolation

All lookups use the existing `tenantClient`.

No client-supplied tenant identifier is trusted.

No cross-tenant query path was added.

## Verification

- Initial safe git status inspection: completed. The large tracked deletion/untracked pair anomaly was not present in the inspected task paths. An unrelated BOQ PRD file was already modified.
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/item-library/directEntryRecognition.test.js src/tests/item-library/invoiceSuggestionExactMatch.test.js src/tests/item-library/itemRowItemId.test.js`: passed, 10 tests.
- `node --test src/components/invoice/MobileItemCard.test.js src/tests/invoice/invoiceSuggestionWiring.test.js src/tests/item-library/itemLibraryForwardIngestionMigration.test.js`: passed, 12 tests.
- `bun run audit:load`: completed with exit code 0. It still reports pre-existing bloat and broad-query warnings.
- `bun run typecheck`: passed.
- `git diff --check -- <task files>`: passed. Git printed line-ending warnings only.
- `supabase db push`: not applicable. No migration was created.
- `bun run build`: skipped due to hardware policy.

## Unrelated verification noise

`src/tests/document/sharedDocumentFormRegression.test.js` was also sampled and failed for pre-existing reasons:

- it references missing `src/components/quotation/QuotationForm.tsx`;
- it has stale layout and line-item source assertions.

This task did not modify that test or the missing file path.

## Git status summary

Task changes:

- `src/components/invoice/MobileItemCard.test.js`
- `src/components/invoice/MobileItemCard.tsx`
- `src/modules/item-library/domain/invoiceSuggestionPriceContext.ts`
- `src/modules/item-library/hooks/useItemSuggestionEngine.ts`
- `src/modules/item-library/repositories/itemLibraryRepository.ts`
- `src/modules/item-library/services/itemLibraryService.ts`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/tests/item-library/directEntryRecognition.test.js`
- `docs/reports/item-library/item-library-direct-entry-recognition-2026-09-26.md`

Unrelated existing files remain outside this task:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v9.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop.html`
- `docs/reports/boq/boq-fullpage-v9-spacing-responsive-report-2026-09-26.md`
- `docs/reports/boq/boq-v9-phone-fold-and-desktop-split-report-2026-09-26.md`

## Risks or limitations

The frontend normalizer still mirrors the database `normalize_item_text()` function instead of calling it directly. This was pre-existing. The new exact lookup uses stored normalized database columns for identity checks, which keeps the authoritative match on the database side.

The Item Library repository remains oversized and still contains pre-existing fallback complexity. This task did not refactor that file.

## Deferred work

- Consolidate frontend and database normalization only in a separate normalization task.
- Replace stale document regression assertions in a separate test-maintenance task.
- Reduce Item Library repository size in a separate cleanup task.
