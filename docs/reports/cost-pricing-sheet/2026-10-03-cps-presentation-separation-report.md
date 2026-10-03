# CPS Presentation Separation Implementation Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Restore the production architecture `CpsFormPage` to `CostPricingSheetEditor` with two presentation destinations. Desktop uses the existing desktop frontend. Mobile/Fold uses the approved frontend. No prototype engine becomes production architecture.

## Scope

- `src/pages/CpsFormPage.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- This report.

`CostPricingSheetForm.tsx` was not changed in this task. Its pre-existing modification belongs to the earlier Theme Manager task. Desktop presentation files were not changed. No schema changed.

## Files Changed

- `src/pages/CpsFormPage.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-presentation-separation-report.md`

## Skills Used

Skills used: karpathy, react-dev, vercel-composition-patterns, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English

---

## Architecture Before

```text
CpsFormPage
→ CostPricingSheetForm (direct mount, prototype state, no save)
```

The page converted domain data to prototype props and mounted the J3-derived form. `CostPricingSheetEditor`, `useCpsSave`, validation, import, markup, columns, and client selection were bypassed. Save did nothing persistent.

## Architecture After

```text
CpsFormPage
→ CostPricingSheetEditor (shared production controller)
→ useLayoutMode (authoritative, unchanged)
├── Desktop → CostPricingSheetDesktopForm (existing frontend)
└── Mobile/Fold → CostPricingSheetForm (approved frontend)
```

One engine. Two presentations. Business rules live above the split.

## Layout Mode Mapping

Unchanged from the existing architecture. No new breakpoint. No CSS-only switch.

- Desktop renders when `isDesktop && !hasFold && !isTablet`.
- Source: `useLayoutMode` to `useFoldAwareness` (`layoutMode`, `hasSeparatingFold`).
- Mobile, tablet, and any foldable with a separating fold render the approved `CostPricingSheetForm`.
- Desktop cannot fall through to the mobile frontend. The branch is a single boolean tested once.

## Desktop Confirmation

Desktop renders `CostPricingSheetDesktopForm` from `CostPricingSheetFormPresentations.tsx`. That file was not changed. The desktop frontend was not rewritten, redesigned, or pointed at the mobile form. Its existing production behavior (client picker, import sheet, column manager, markup dialog, photo upload, desktop rail, save) is restored by the remount. No compatibility change to the desktop file was needed.

## Mobile/Fold Confirmation

Mobile/Fold renders the approved `CostPricingSheetForm`. The old `CostPricingSheetMobileFoldForm` is no longer referenced by the editor. It remains in `CostPricingSheetFormPresentations.tsx` as reference. It was not deleted. The approved form file was not changed, so its geometry, toolbar, group and item presentation, `:where(...)` reset, heading and label protection, responsive behavior, and Theme Manager light integration are intact.

## Editor Confirmation

`CostPricingSheetEditor` is the shared controller again. It owns document state, row operations, columns, import, markup, client, photo, totals, and save orchestration for both presentations. `CpsFormPage` holds the load path, number refs, snapshot, and `useCpsSave`, as before commit `826f06bb`.

## Changes Made

### CpsFormPage

Restored the production page structure from the pre-bypass baseline:

- Holds `currentCpsRef`, `autoNumberRef`, and `initialSnapshot`.
- Wires `useCpsSave` with manual-number detection and navigation.
- Mounts `CostPricingSheetEditor` with `initialCps`, `onSave`, `onCancel`, `saving`, and `mode`.
- Removed the direct `CostPricingSheetForm` mount and its page-local prototype converters. Conversion now lives in the editor adapter.

Numbering behavior is unchanged from baseline. Prefix resolution, cursor fetch, candidate computation, unique retry, and cursor advance run through the existing engine.

### CostPricingSheetEditor

- Desktop branch renders `CostPricingSheetDesktopForm` with the existing full `presentationProps`.
- Non-desktop branch renders a new module-level `CostPricingSheetMobileHost`. It feeds the approved form from production state and commits the save payload back to production state.
- The mobile host passes `key`, `modeLabel`, `onBack`, `onSave`, `initialDocument`, `initialRows`, `clients`, `initialClient`, and `initialColumns`. It does not pass theme props. The form keeps its internal theme behavior.
- Commit path builds a full domain `Cps` object, refreshes editor state and markup selection, then calls the production `onSave`. Production validation, payload build, persist, row replace, audit, and navigation run unchanged.

## Prototype Authority Removed

- Local `rowsRaw` no longer ends the journey. Mobile edits commit through `mergeMobilePayload` into domain rows and run production validation and save.
- Numeric `gid` never persists. The commit resolves every `gid` to the authoritative string `group_id` within the same payload. Unknown references resolve to null. No orphaned group reference can persist.
- Array position never becomes identity. Sections keep their existing `group_id` (or receive a fresh UUID when created in the form). Items keep their existing `_uiKey` and `id` where matched. Sort order is recomputed by `normalizeCpsRowOrder`.
- The form-local `Draft` and `Saved` badge stays a display label only. Save authority is `useCpsSave`.
- No prototype calculation was moved into the editor. No desktop CSS was copied into the mobile form. No mobile CSS was copied into the desktop form.

## Prototype Authority Intentionally Deferred

These prototype paths remain inside the approved form display layer. They do not feed production state except where noted:

- Display totals use prototype float math (`tcpOf`, `tspOf`, `profitOf`, `marginOf`, `words`). Production Decimal totals apply at save through `buildPayload`. Full replacement of the display math is left to the next task because it touches locked presentation output.
- The save button has no `saving` guard on Mobile/Fold. The form exposes no such prop. Double-submit protection is deferred.
- Photo attach uses the form-local dataURL path. `onRequestPhoto` is not wired because the host cannot produce a file picker without new UI. A committed dataURL persists to `image_url` and displays correctly.
- `onClientChange` and `onColumnsChange` are not wired. Column buttons, Import, Markup, and Clear All triggers remain inert on Mobile/Fold. Column visibility for display is seeded from the production column config once at mount.
- Client display on Mobile/Fold is read-only plus clear. Full `ClientSelector` integration belongs to a dedicated wiring task.

## Identity Strategy Used

- Forward (domain to form, once at mount): sections receive sequential numeric ids in row order. Items map string `group_id` to the matching numeric id through a key map. Unknown group references map to null. Non-contiguous members of one group map to one id.
- Reverse (form to domain, at save): numeric group ids resolve to stored string keys from the same payload pass. Groups created in the form receive a fresh UUID. Items match their prior domain row by `_uiKey` or `id` to preserve `custom_data`, notes, and rate fields. Unmatched items become new domain rows.
- The seed maps are built once per document mount. A stable `key` per document prevents accidental remounts. Repeat saves stay consistent because every commit resolves identity within its own payload.

## Production Behavior Restored on Desktop

By remounting the existing editor and desktop presentation, desktop regains: full metadata editing, client selection with snapshots, site and notes, add line item, add group, add item to group, insert, move, delete, sub-descriptions, make and brand, quantity and unit, CP and SP, production totals and economics, custom columns, column manager, JSON import, instant markup with preview and undo, clear-all confirmation, photo upload with policy, validation, create and update with unique-number retry, loading and saving states, error feedback, audit logging, and post-save navigation.

## Mobile/Fold Workflows Still Deferred

On Mobile/Fold these remain deferred by instruction: `ClientSelector` UI, add-new-client UI, JSON Import sheet, Columns sheet, Markup dialog, Clear-All confirmation, and replacement popups. The toolbar triggers stay inert. No fake behavior was added.

## Group-Delete Conflict Status

Still open. Unchanged by this task.

- Approved form: deleting a group ungroups and keeps its items.
- Production `removeCpsRow`: removes one index. Desktop path behavior is unchanged.
- Mobile commit path cannot orphan references: items of a deleted group save with null `group_id` because the form already ungrouped them. A dedicated task must still choose one rule for both presentations.

## Theme and Dark-Mode Status

- Approved form light-mode Theme Manager integration is untouched.
- No Theme Manager file changed. No non-color token mapped.
- Dark-mode integration remains deferred.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- `git diff --check`: passed. Only line-ending warnings on touched files.
- `git status`: 3 modified (`CostPricingSheetForm.tsx` pre-existing from Theme Manager task, plus this task `CostPricingSheetEditor.tsx`, `CpsFormPage.tsx`). 2 untracked pre-existing reports plus this report.
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Risks or Limitations

- Mobile display totals still use float math. Production math governs save only.
- Mobile save has no disabled-while-saving state on the form button.
- Mobile photo commits may store large dataURLs until upload wiring lands.
- Column edits are impossible on Mobile/Fold until the column workflow is wired. Display follows the production config at mount.
- Group-delete semantics still differ between presentations.
- No browser or device run was performed in this task.

## Deferred Work

- Replace mobile display math with production Decimal totals.
- Add a saving guard to the mobile save path.
- Wire `onRequestPhoto` to `uploadItemPhoto` with a host file picker.
- Wire `ClientSelector`, import, columns, markup, and clear-all workflows on Mobile/Fold.
- Decide one group-delete rule for both presentations.
- Decompose the single-file approved form in a separate task.
