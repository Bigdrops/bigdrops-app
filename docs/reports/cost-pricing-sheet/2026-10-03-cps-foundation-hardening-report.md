# CPS Foundation Hardening Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Remove remaining prototype authority in the Mobile/Fold path in four areas: display calculations, saving state, row/group identity, and photo upload. Preserve the restored architecture and both frozen presentations.

## Scope

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- This report.

`CpsFormPage`, desktop presentations, domain modules, numbering, schema, and deferred popup workflows were not changed.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-foundation-hardening-report.md`

## Skills Used

Skills used: karpathy, react-dev, typescript-advanced-types, vercel-composition-patterns
Documentation standard: ASD-STE100 Simplified Technical English

---

## Architecture Confirmation

Unchanged:

```text
CpsFormPage
→ CostPricingSheetEditor (shared production controller)
→ useLayoutMode (unchanged authority)
├── Desktop → CostPricingSheetDesktopForm
└── Mobile/Fold → CostPricingSheetForm
```

No new engine. No direct mount. No branch change.

## Desktop Preservation Confirmation

Desktop renders `CostPricingSheetDesktopForm`. That file was not touched. Desktop behavior (client picker, import, columns, markup, photos, save, calculations, validation, navigation) is untouched. No shared-contract change reached desktop. No compatibility edit was needed.

## Mobile/Fold Visual Preservation Confirmation

The approved form file changed in logic and types only. No geometry, width, height, spacing, gutter, breakpoint, toolbar, card, group, item, typography, placement, Theme Manager, reset, or heading/label rule changed. The CSS block was not edited. Rendered JSX structure is identical except for the pre-existing controls gaining a `disabled` attribute while saving and the hidden file input using the policy accept string.

## Production Calculation Source Used

`src/domain/cps/calculateCpsTotals.ts` through `decimal.js`:

- `computeCpsTotals` for the Mobile/Fold totals block.
- `computeCpsRowEconomics` for each Mobile/Fold item block.
- No new utility. No copied formula. No local Decimal code.

The form converts buffer rows to a domain view (`toDomainRowView`) and calls the same functions production save uses. Display and persistence share one business authority.

## Prototype Float Math Removed

Removed: `tcpOf`, `tspOf`, `profitOf`, `marginOf`. No other file imported them. Verified by repository search.

Kept as presentation-owned formatting: `naira`, `fmtMoney`, `fmtQty`, `fmtGroup`, `words`. The words readout now takes the authoritative computed selling total as input. Margin display keeps the exact prior rule (rounded whole percent on totals, one decimal on rows, em dash when selling total is zero).

## Saving-State Authority

Single authority: `useDocumentSave` saving flag, delivered through `useCpsSave` to the editor and into the form as a `saving` prop.

- All three Mobile/Fold save controls (top bar, section CTA, phone FAB) carry `disabled={saving}`.
- The `save()` handler returns immediately while saving.
- No local save-state authority was created. No button was redesigned.
- Desktop saving behavior is unchanged.
- The internal Draft/Saved badge remains purely visual. The host always passes `modeLabel`, which overrides it. No autosave was added.

## Double-Submit Protection

Guarded at two levels: native `disabled` on every save control plus an early return in the save handler. A second tap while a save is in flight cannot start another persist.

## Final Identity Model

Mobile/Fold rows use production-native string identity:

- Item `id` is a string. It seeds from domain `_uiKey` or `id`. New items receive a UUID at creation.
- Group `id` is a string. It seeds from domain `group_id`, `id`, or `_uiKey`. New groups receive a UUID at creation.
- Membership lives in `groupId: string | null`, which holds the domain `group_id` directly.
- The editor seed claims each id once and deduplicates defensively.
- The commit matches live rows by `_uiKey` or `id`, preserves their stored fields, and writes `group_id` from the payload identity.
- A payload group unknown to the live state persists under its own id as a real group. Nothing is inferred from array position.

## Numeric gid Status

Eliminated from the active Mobile/Fold path. Zero `gid` references remain in source except one boundary comment. `seqRef` and all sequential id assignment are removed. The editor seq maps (`groupKeyBySeq`, `rowKeyBySeq`) and the save-time key generator are removed.

## Stable Identity Across Edit and Reorder

- Reordering moves array positions only. Ids do not change.
- Repeat saves resolve the same live rows by `_uiKey` or `id`. No identity churn from presentation order.
- Existing `group_id` values survive edit and save. Sections match by `group_id` first.
- New groups arrive with UUIDs from birth. They persist under those UUIDs.
- Degenerate sections without identity adopt their payload id as `group_id`, which repairs rather than orphans them.

## Non-Contiguous Group Membership Confirmation

Preserved. `membersOf` filters the whole row list by `groupId`. `findCpsGroupInsertIndex` and the seed both scan all rows. The transitional numeric layer is gone, so there is no mapping step that could cluster members. Domain row-operation tests for non-contiguous membership pass unchanged.

## Group Semantics Confirmation

Locked semantics hold on Mobile/Fold:

- Add Line Item creates an ungrouped item (`groupId: null`).
- Add Item to Group assigns the explicit group id and inserts after its last member.
- Membership derives from `groupId` only.
- Visual order never confers membership (`sanitizeRows` nulls references to missing groups).

## Production Photo-Upload Path

Mobile/Fold photo attach now uses the production path:

- Policy: `isSupportedImageFile`, `getUnsupportedImageErrorMessage`, `IMAGE_ACCEPT_ATTRIBUTE` from `documentImageUploadPolicy`.
- Service: `uploadItemPhoto` (Cloudinary) from `itemPhotoUpload`.
- Errors surface through the existing form toast with production wording.
- A re-entry guard blocks concurrent uploads without changing control geometry.
- The hidden file input keeps its position and invisibility. No popup was added. Accessibility labels are unchanged.

## dataURL Persistence Confirmation

The FileReader and canvas-resize branch is removed. No code path in the form can produce a dataURL. Newly attached photos reach `image_url` only as uploaded remote URLs. Existing persisted remote URLs display unchanged. Legacy dataURL values already stored are displayed as before and are not regenerated.

## Prototype Machinery Removed

- Float business-math helpers (`tcpOf`, `tspOf`, `profitOf`, `marginOf`).
- Numeric `gid` model, sequential id counter, and array-position group maps.
- Editor save-time identity inference (`newMobileGroupKey`, seq maps).
- File-to-dataURL photo fallback.

## Prototype Machinery Intentionally Deferred

- `onClientChange` and `onColumnsChange` remain unwired on Mobile/Fold. Column visibility seeds from production config at mount. Client display is read-only plus clear.
- ClientSelector, import, columns, markup, and clear-all workflows remain deferred. Their triggers stay inert.
- The Draft/Saved badge stays as a visual label overridden by `modeLabel`.
- Component decomposition remains a separate task.

## Group-Delete Conflict Status

Still open and unchanged. Mobile/Fold keeps its semantic: deleting a group ungroups and keeps its items. Desktop `removeCpsRow` behavior is untouched. The commit cannot orphan references: an item keeps a `group_id` only when its group is emitted in the same payload, otherwise it saves as ungrouped. Cross-presentation standardization remains deferred.

## Deferred Workflows

Not implemented in this task: full ClientSelector integration, add-new-client, JSON Import sheet, Columns sheet, Markup dialog, Clear-All confirmation, replacement popups, dark-mode Theme Manager integration, autosave, dirty-state protection, component decomposition.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Targeted tests: 47 passed, 0 failed across `cpsRowOperations`, `cpsNormalize`, `cpsInstantMarkup`, `cpsImportView`.
- `git diff --check`: passed. Only line-ending warnings on touched files.
- `git status`: 3 modified source files in the expected scope (`CpsFormPage` change is the prior separation restore, still uncommitted). 3 untracked pre-existing reports plus this report.
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not executed per hardware policy.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Risks or Limitations

- No browser or device run was performed. Visual preservation is by static diff discipline (JSX structure and CSS untouched).
- Legacy dataURL photos already stored will keep round-tripping until separately cleaned.
- Pathological duplicate `group_id` values across two sections resolve first-wins at seed and remain stable without crashing. Deduplication of such data is out of scope.
- The mobile save button has no spinner. Protection is `disabled` plus handler guard.
