# CPS New/Edit Desktop Survival Architecture Audit

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Determine whether the working desktop CPS/BOQ New/Edit form survived the mobile/fold presentation work. Identify reusable production machinery for the approved `CostPricingSheetForm` without changing code.

## Scope

- Current source: routes, `CpsFormPage`, CPS components, `src/domain/cps`, `src/hooks/useCpsSave`.
- Git history: BOQ to CPS rename, pre-mobile baseline, direct-mount transition.
- No application code changed. No numbering changed. No calculations changed. No UI restored.

## Files Changed

- `docs/reports/cost-pricing-sheet/2026-10-03-cps-new-edit-desktop-survival-architecture-audit.md`

## Skills Used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

---

## Executive Finding

The desktop form did not survive as the mounted path. The presentation was replaced. The behavioral machinery survived in full in the current tree.

- Desktop presentation: replaced, but implementation remains in the current tree.
- Controller/editor: preserved, but no longer mounted.
- Domain logic: preserved, but no longer called by the New/Edit route.
- Persistence: preserved, but bypassed.
- Overall classification: **D. REPLACED, BUT IMPLEMENTATION REMAINS IN CURRENT TREE**.

The direct J3 mount bypassed `CostPricingSheetEditor`. That bypass is proven below.

---

## Current Mount Architecture

Chain today:

```text
Route /cost-pricing-sheets/new
→ src/components/app/AppShell.tsx (NewCps, lazy)
→ src/pages/NewCps.tsx
→ src/pages/CpsFormPage.tsx (mode="create")
→ src/components/cps/CostPricingSheetForm.tsx (prototype state, SAMPLE_ROWS)
```

```text
Route /cost-pricing-sheets/edit/:id
→ src/components/app/AppShell.tsx (EditCps, lazy)
→ src/pages/EditCps.tsx
→ src/pages/CpsFormPage.tsx (mode="edit")
→ src/components/cps/CostPricingSheetForm.tsx
```

Evidence:

- `src/pages/CpsFormPage.tsx` imports `CostPricingSheetForm` and its types from `@/components/cps/CostPricingSheetForm`.
- It passes `initialDocument`, `initialRows`, `clients`, `initialClient`, `modeLabel`, `onBack`. It does not pass `onSave`.
- It loads `cps_sheets` and `cps_rows` and computes a display number. It never calls `useCpsSave`.
- Zero source files import `CostPricingSheetEditor`. Grep over `src` returns matches only inside `CostPricingSheetEditor.tsx` itself.
- `CostPricingSheetForm.tsx` owns local state: `rowsRaw`, `doc`, `columns`, `client`, `badge`, `toast`. It has no Supabase call. Its photo path falls back to a local dataURL when no host callback exists.

Result: the New/Edit route shows prototype state only. Save, validation, import, markup, columns, and client selection workflows are inert or display-only.

---

## Pre-Mobile/Fold Architecture

Latest reliable baseline before direct mount: commit `4f5e2d88`, 2026-10-01 17:43, `feat(cps): add row operations and presentation updates`.

Terminology at baseline: CPS. The BOQ to CPS rename already happened in `a38dc30d` (2026-10-01 09:54) with SQL `20261001081028_rename_boq_to_cps.sql`. `0f113c42` removed the BOQ module.

Chain at baseline:

```text
Route /cost-pricing-sheets/new
→ AppShell (NewCps)
→ src/pages/NewCps.tsx
→ src/pages/CpsFormPage.tsx (mode="create")
→ src/components/cps/CostPricingSheetEditor.tsx
→ src/components/cps/CostPricingSheetFormPresentations.tsx
   → CostPricingSheetDesktopForm (desktop, no fold, no tablet)
   → CostPricingSheetMobileFoldForm (all other layouts)
```

Edit flow used the same chain with `mode="edit"`.

Controller responsibilities at baseline (`CpsFormPage` at `a38dc30d`):

- Holds `currentCpsRef` and `autoNumberRef`.
- Loads create number via `createEmptyCps`, `resolvePrefix`, `fetchAutoCursor`, `getNextCpsNumber`.
- Loads edit data via `normalizeDbCps` from `cps_sheets` plus ordered `cps_rows`.
- Keeps `initialSnapshot` for identity lock.
- Calls `useCpsSave` with `getCps`, `numberIsManual`, `navigate`.

Editor responsibilities at baseline (`CostPricingSheetEditor`):

- Owns `cps` state, row patches, client patch, column state, import/markup/column/client dialogs.
- Delegates layout to Desktop or MobileFold presentation via `useLayoutMode`.
- Calls `computeCpsCommercialView`, `computeCpsRowEconomics`, row operations, instant markup, photo upload.

Desktop and mobile were one controller with two presentations. They were not separate pages.

---

## Transition History

| Commit | Date | Change |
| --- | --- | --- |
| `a38dc30d` | 2026-10-01 09:54 | BOQ module migrated to CPS. `CpsFormPage` mounts `CostPricingSheetEditor`. `useCpsSave` active. |
| `0f113c42` | 2026-10-01 09:54 | BOQ files deleted (25 files, 3137 deletions). |
| `4f5e2d88` | 2026-10-01 17:43 | Row operations and presentation updates. Last full production baseline. |
| `826f06bb` | 2026-10-02 10:29 | Supplied form added under `supplied-form/`. `CpsFormPage` stops mounting `CostPricingSheetEditor`. `useCpsSave`, `initialSnapshot`, `currentCpsRef`, `autoNumberRef` removed from the page. This is the bypass commit. |
| `3ae4bd8f` | 2026-10-02 11:11 | Supplied form deleted. `CpsJ3Form.tsx` (2975 lines) added. Direct J3 mount continues. |
| `b44927eb` | 2026-10-03 11:47 | `CpsJ3Form.tsx` renamed to `CostPricingSheetForm.tsx`. Prototype popups removed (1212 deletions). Direct mount continues. |

The bypass happened in `826f06bb`. No later commit restored the editor.

---

## Desktop Survival Status

Classification: **D. REPLACED, BUT IMPLEMENTATION REMAINS IN CURRENT TREE**.

Split by layer:

| Layer | Status | Evidence |
| --- | --- | --- |
| Desktop presentation | D. Replaced, remains in tree | `CostPricingSheetDesktopForm` exists in `CostPricingSheetFormPresentations.tsx`. No route mounts it. |
| Mobile/fold presentation | B. Preserved, not mounted | `CostPricingSheetMobileFoldForm` exists in the same file. No route mounts it. |
| Controller/editor | B. Preserved, not mounted | `CostPricingSheetEditor.tsx` (637 lines) exists. Zero importers. |
| Domain logic | B. Preserved, not called by New/Edit | `src/domain/cps/*` exists: calculations, row operations, columns, import, markup, normalize, factories. |
| Persistence | B. Preserved, bypassed | `src/hooks/useCpsSave.ts` plus `useDocumentSave` exist. `CpsFormPage` no longer calls them. |
| Old UI restoration need | None | No restore required for this audit. |

---

## Production Capability Matrix

Status values: ACTIVE NOW, SURVIVES IN CURRENT TREE, HISTORICAL ONLY, PROTOTYPE ONLY, NOT FOUND. Reuse values: A direct function, B direct hook, C direct controller/editor, D direct domain function, E direct service/query, F reference only, G do not reuse.

| # | Capability | Status | Reuse | Source |
| --- | --- | --- | --- | --- |
| 1 | New document init | SURVIVES IN CURRENT TREE | A | `src/domain/cps/factories.ts` (`createEmptyCps`). Page uses it for display only. |
| 2 | Edit document loading | SURVIVES IN CURRENT TREE | E | `src/domain/cps/normalize.ts` (`normalizeDbCps`). Page still queries `cps_sheets` and `cps_rows`. |
| 3 | Number allocation | SURVIVES IN CURRENT TREE | E | Display path active in page (`getNextCpsNumber`, `fetchAutoCursor`, `resolvePrefix`). Persist path bypassed in `useCpsSave` (`withUniqueRetry`, `advanceAutoCursor`). |
| 4 | Title | SURVIVES IN CURRENT TREE | C | Editor `patchCps`. New form edits local `doc` only. |
| 5 | Issue date | SURVIVES IN CURRENT TREE | C | Same as title. |
| 6 | Client selection | SURVIVES IN CURRENT TREE | C | `ClientSelector` plus Editor `patchClient` (`client_id`, `client_snapshot`). New form is display-only. |
| 7 | Add-new-client flow | SURVIVES IN CURRENT TREE | C | `ClientSelector` component remains. New form removed `onAddNewClient`. |
| 8 | Site/project | SURVIVES IN CURRENT TREE | C | Editor `patchCps({ project_name })`. |
| 9 | Notes | SURVIVES IN CURRENT TREE | C | Editor `patchCps({ notes })`. |
| 10 | Add Line Item | SURVIVES IN CURRENT TREE | D | `appendCpsRow(rows, 'item')` in `row-operations.ts`. |
| 11 | Add Group | SURVIVES IN CURRENT TREE | D | `appendCpsRow(rows, 'section')`. |
| 12 | Add Item to Group | SURVIVES IN CURRENT TREE | D | `insertCpsRow` with `groupId` plus `findCpsGroupInsertIndex`. |
| 13 | Group membership | SURVIVES IN CURRENT TREE | F | Domain uses string `group_id`. Prototype uses numeric `gid`. Semantics match. Identity type differs. Needs a mapper. |
| 14 | Row deletion | SURVIVES IN CURRENT TREE | D | `removeCpsRow`. |
| 15 | Group deletion | SURVIVES IN CURRENT TREE | F | `removeCpsRow` deletes one index. Prototype ungroups kept items. Behavior differs. Needs a decision before reuse. |
| 16 | Row/group ordering | SURVIVES IN CURRENT TREE | D | Splice plus `normalizeCpsRowOrder`. Prototype move is sibling-scoped. |
| 17 | Description | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ description })`. |
| 18 | Sub-description | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ specification })` with toggle UI. |
| 19 | Make | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ make_brand })`. |
| 20 | Quantity | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ quantity })`. |
| 21 | Unit | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ unit })`. |
| 22 | Cost price / CP | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ cp })`. |
| 23 | Selling price / SP | SURVIVES IN CURRENT TREE | C | Editor `updateRow({ sp })`. |
| 24 | Amount calculations | SURVIVES IN CURRENT TREE | D | `computeCpsTotals`, `computeCpsRowEconomics` (Decimal). Prototype float math is PROTOTYPE ONLY. |
| 25 | Margin/profit | SURVIVES IN CURRENT TREE | D | Same sources. `profit = (SP - CP) x Qty`. `margin = profit / TSP`. |
| 26 | Decimal arithmetic | SURVIVES IN CURRENT TREE | D | `decimal.js` in `calculateCpsTotals.ts` and `instant-markup.ts`. |
| 27 | Image handling | SURVIVES IN CURRENT TREE | E | `uploadItemPhoto`, `documentImageUploadPolicy`, Editor `handlePhotoUpload`. Prototype dataURL path is PROTOTYPE ONLY. |
| 28 | Custom fields | SURVIVES IN CURRENT TREE | D | `custom_data` plus `customColumns` via `useInvoiceColumns`. |
| 29 | Column config | SURVIVES IN CURRENT TREE | D | `src/domain/cps/columns.ts` (`normalizeCpsColumns`, deny list). Editor `CpsColumnSheet`. |
| 30 | JSON import | SURVIVES IN CURRENT TREE | C | `CpsImportSheet` plus `importAdapter.ts` (zod contract, `cost_price` to `cp`, `selling_price` to `sp`). |
| 31 | Markup | SURVIVES IN CURRENT TREE | D | `instant-markup.ts` (`previewInstantMarkup`, `applyInstantMarkup`, undo, 2dp). Prototype float markup was removed and must not return. |
| 32 | Clear-all | SURVIVES IN CURRENT TREE | C | Presentations clear dialog calls `onPatchCps({ table_rows: [] })`. |
| 33 | Validation | SURVIVES IN CURRENT TREE | B | `validateCps` in `useCpsSave`: number present, client selected, description present, quantity above zero, SP above zero, number identity locked on edit. |
| 34 | Create/save | SURVIVES IN CURRENT TREE | B | `cpsSaveStrategy` persist with `withUniqueRetry`. Bypassed. |
| 35 | Edit/update | SURVIVES IN CURRENT TREE | B | Update `cps_sheets`, delete and reinsert `cps_rows`, audit log. Bypassed. |
| 36 | Loading/saving state | SURVIVES IN CURRENT TREE | B | Page loading state active. `saving` via `useDocumentSave` bypassed. |
| 37 | Error handling | SURVIVES IN CURRENT TREE | B | `feedback.error` plus `getUserFacingMutationMessage`. |
| 38 | Success/navigation | SURVIVES IN CURRENT TREE | B | `getNavigationTarget` returns `/cost-pricing-sheets/:id`. |
| 39 | Dirty-state protection | NOT FOUND | G | `useDocumentSave` has validate, build, persist, afterSave, navigate. It has no dirty guard. |
| 40 | Autosave/draft | NOT FOUND | G | `Draft` and `Saved` badge in the new form is prototype state only. |

No capability is ACTIVE NOW through the approved form. No capability is HISTORICAL ONLY. All production behavior survives in the current tree.

---

## Reusable Machinery

Use directly where types match:

- `src/domain/cps/factories.ts`: `createEmptyCps`.
- `src/domain/cps/normalize.ts`: `normalizeDbCps`, `denormalizeToDbCps`, `denormalizeToDbCpsRow`, `getNextCpsNumber`.
- `src/domain/cps/calculateCpsTotals.ts`: `computeCpsTotals`, `computeCpsRowEconomics`, `computeRowProfit`.
- `src/domain/cps/calculations.ts`: `computeCpsCommercialView`.
- `src/domain/cps/row-operations.ts`: `appendCpsRow`, `insertCpsRow`, `removeCpsRow`, `normalizeCpsRowOrder`, `findCpsGroupInsertIndex`, `getCpsSectionGroupId`.
- `src/domain/cps/columns.ts`: `CPS_BUILTIN_COLUMNS`, `CPS_HIDE_FULL_DENY_LIST`, `normalizeCpsColumns`.
- `src/domain/cps/importAdapter.ts`: `cpsImportSchema`, import mapper.
- `src/domain/cps/instant-markup.ts`: preview, apply, undo, eligibility, row keys.
- `src/components/cps/CpsImportSheet.tsx`: import dialog.
- `src/components/ClientSelector.tsx`: client picker.
- `src/hooks/useCpsSave.ts` with `src/hooks/useDocumentSave.ts`: validation, payload, persist, rows, audit, navigation.
- `src/lib/itemPhotoUpload.ts` with `src/lib/documentImageUploadPolicy.ts`: upload and file policy.
- `src/domain/documentNumbering.ts` with `src/domain/prefixConstants.ts`: cursor fetch, cursor advance, prefix resolve, serial width 6.

Best candidate host: `CostPricingSheetEditor`. It already wires all of the above to `CostPricingSheetDesktopForm` and `CostPricingSheetMobileFoldForm`.

---

## Bypassed Machinery

The direct mount bypasses all of this:

- `CostPricingSheetEditor` (state, handlers, dialogs, save).
- `CostPricingSheetFormPresentations` (Desktop and MobileFold production presentations).
- `CpsImportSheet` (no caller from the new form).
- `ClientSelector` production wiring (new form shows a static client row).
- Column manager (`CpsColumnSheet` inside the editor).
- Instant markup dialog (`InstantMarkupDialog` inside the editor).
- `useCpsSave` and `useDocumentSave` (validation, unique retry, row persist, audit, navigation).
- `computeCpsCommercialView` and row economics (new form computes its own prototype totals).
- `row-operations.ts` (new form has its own `addItem`, `addGroup`, `insertBelow`, `moveRow`, `dupRow`, `removeRow`).
- `uploadItemPhoto` (new form uses local dataURL fallback).

`CpsFormPage` still uses `createEmptyCps`, `normalizeDbCps`, `getNextCpsNumber`, `fetchAutoCursor`, and `resolvePrefix`. Those calls feed display props only. They do not persist.

---

## Historical-Only Machinery

None required for production reuse.

Deleted BOQ files (`BoqEditor`, `BoqFormPresentations`, `useBoqSave`, BOQ domain) were migrated to CPS equivalents in `a38dc30d`. The CPS equivalents remain. Git history is useful as evidence only:

- `62ffac14:src/pages/BoqFormPage.tsx` shows the same Editor architecture under BOQ names.
- `0f113c42` deleted BOQ after migration. No unique BOQ behavior was found that CPS lacks.

Do not restore BOQ files.

---

## Numbering Path

Locked rule: do not change prefixes, cursor logic, preview logic, or allocation.

Previous production path (baseline, `a38dc30d` page plus `useCpsSave`):

1. Resolve prefix with `resolvePrefix(settings?.document_prefixes, 'cps_sheets')`. Default is `BOQ`.
2. Read existing numbers from `cps_sheets.cps_number`.
3. Read cursor with `fetchAutoCursor(tenantClient, family)` where family is `{prefix}-`.
4. Compute candidate with `getNextCpsNumber(rows, prefix, cursor)`.
5. On save, retry with `withUniqueRetry`. Manual numbers stay fixed. Auto numbers advance the cursor with `advanceAutoCursor`.
6. Format is `{PREFIX}-{6-digit sequence}` via `formatDocumentNumber`. Example: `SASBOQ-000004` means a custom `SASBOQ` prefix in settings, sequence 4.

Current path:

1. Same resolve, fetch, and `getNextCpsNumber` run in `CpsFormPage.loadCreate`.
2. The number feeds `initialDocument.sheetNumber` display only.
3. `useCpsSave` never runs. No unique retry. No cursor advance. No row persist.
4. Edit mode locks nothing. The identity-lock check lives in bypassed `validateCps`.

Finding: display numbering still uses the real engine. Allocation and persistence are bypassed.

---

## Calculation Authority

Authoritative path: `src/domain/cps/calculateCpsTotals.ts` with `decimal.js`.

- Total Cost = sum of `CP x Qty` for item rows.
- Total Selling Price = sum of `SP x Qty` for item rows.
- Gross Profit = Total Selling Price minus Total Cost.
- Margin = Gross Profit divided by Total Selling Price, times 100. Zero when TSP is zero.
- Row TCP = `CP x Qty`. Row TSP = `SP x Qty`. Row profit = `(SP - CP) x Qty` via `computeRowProfit`. Unit profit = `SP - CP`.
- `computeCpsCommercialView` also builds a `computeDocument` commercial view from `src/lib/Calculations.ts` with SP as `unit_price`. Section rows map to group headers.
- Instant markup derives SP from CP with 2 decimal places: percentage mode `SP = CP x (1 + pct/100)`, value mode `SP = CP + value`.

Prototype math in `CostPricingSheetForm.tsx` is float-based and local. It is PROTOTYPE ONLY. Do not treat it as authority. Do not resurrect the removed prototype markup math.

---

## Group Semantics

Locked constraint:

- Base Add Line Item creates an ungrouped row.
- Add Item to Group assigns membership explicitly.
- Membership derives from `row.group_id`.
- Membership must not depend on adjacency.
- Non-contiguous membership must remain representable.

Production domain status: compatible.

- `row-operations.ts` stores `group_id` on the item. `findCpsGroupInsertIndex` scans all rows for the group id. It does not assume adjacency.
- `groupSegments` in `CostPricingSheetFormPresentations.tsx` counts membership with a Map over all rows. Non-contiguous items count correctly.
- `createCpsRow` for items sets `group_id` from the explicit option. Base append passes null.

Prototype status: semantically compatible, identity incompatible.

- Prototype `membersOf` and `siblingsOf` filter by numeric `gid` across the whole array. Non-contiguous membership is representable.
- Prototype `addItem` creates `gid: null`. Prototype `addItemTo(gid)` assigns explicitly. Group delete keeps items as ungrouped.
- Conflict: prototype identity is a numeric row id (`gid`). Domain identity is a string (`group_id`, UUID or `_uiKey`). Current `toCpsRows` in `CpsFormPage` derives numeric `gid` from array order. That mapping loses stable identity and has no reverse mapper.

Report only. No code resolution in this task.

Additional conflict: group deletion differs. Domain `removeCpsRow` deletes one index and can orphan items. Prototype ungroups kept items. Editor presentation and prototype disagree here. A future task must choose one rule.

---

## Recommended Wiring Architecture

Smallest architecture supported by evidence:

```text
CpsFormPage
→ CostPricingSheetEditor
→ CostPricingSheetForm (approved presentation)
```

Notes:

- Keep `CpsFormPage` as route loader. Restore `currentCpsRef`, `autoNumberRef`, `initialSnapshot`, and `useCpsSave`.
- Keep `CostPricingSheetEditor` as controller. It already owns state, validation, columns, import, markup, client, photo, and save.
- Replace the presentation layer under the editor with the approved `CostPricingSheetForm`, not the old Desktop/MobileFold files. The old presentations stay as reference.
- Feed the approved form through a mapper: domain `TableDocumentRow` to prototype `CpsRow`, and back. Resolve the numeric `gid` versus string `group_id` mismatch in that mapper.
- Route Editor callbacks (`onSave`, validation, import apply, markup apply, column change, client change, photo upload) into the approved form props. The approved form already defines `onSave`, `onClientChange`, `onColumnsChange`, and `onRequestPhoto` slots.
- Do not mount the old Desktop form. Do not copy old CSS into the new form.

Alternative if the mapper proves too costly: keep the editor state shape and give the approved form a domain-native row model. That is larger work. Prefer the mapper first.

---

## Recommended Wiring Order

Safe linear sequence for future implementation. Each step is a separate task:

1. Add a row mapper between `TableDocumentRow` (`group_id`) and approved `CpsRow` (`gid`). Cover ungrouped rows, grouped rows, and non-contiguous membership. No UI change.
2. Reconnect read paths: create init and edit load already exist. Verify `toCpsRows` preserves stable group identity through the mapper.
3. Reconnect calculations: replace prototype float totals with `computeCpsTotals` and `computeCpsRowEconomics`. Verify TCP, TSP, profit, margin.
4. Reconnect validation and save: restore `useCpsSave` behind the approved form `onSave`. Verify create, update, identity lock, error and navigation behavior.
5. Reconnect client selection: wire `ClientSelector` to `initialClient` and `onClientChange`.
6. Reconnect photo upload: wire `onRequestPhoto` to `uploadItemPhoto` with the file policy.
7. Reconnect columns: wire `normalizeCpsColumns` and the column manager to `initialColumns` and `onColumnsChange`.
8. Reconnect JSON import: wire `CpsImportSheet` plus `importAdapter` to row state.
9. Reconnect instant markup: wire `instant-markup.ts` preview, apply, and undo. Keep the removed prototype float path deleted.
10. Reconnect numbering end to end: verify auto versus manual, unique retry, and cursor advance. Verify `SASBOQ-000004` style prefixes still resolve.
11. Decide group-delete rule: ungroup-kept versus delete-index. Align editor, domain, and approved form. Then implement one rule.

---

## Verification Result

Verification:

- `git status` before audit: 1 modified (`src/components/cps/CostPricingSheetForm.tsx`), 1 untracked (`2026-10-03-cps-form-theme-manager-integration-report.md`).
- `git status` after audit: 1 modified (same pre-existing file), 2 untracked (pre-existing report plus this audit report).
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run per task instruction (zero-code audit).
- `bun run typecheck`: not run per task instruction.
- `bun run build`: skipped due to hardware policy and task instruction.

No application source file changed. Only this report was created.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Risks or Limitations

- Static audit only. No browser run. No device verification.
- `toCpsRows` numeric mapping was read, not executed. Edge cases with duplicate group ids need mapper tests later.
- Client add-new flow was verified at component-existence level. Full picker behavior needs a wiring task.
- Dirty-state and autosave do not exist in `useDocumentSave`. A future task must decide if they are needed.
- Group-delete rule conflicts between editor and prototype. This audit reports the conflict. It does not resolve it.

## Deferred Work

- No wiring implemented.
- No mapper implemented.
- No validation restored.
- No save restored.
- No import, markup, columns, client, or photo wired.
- No old desktop UI restored.
- No presentation changed.
