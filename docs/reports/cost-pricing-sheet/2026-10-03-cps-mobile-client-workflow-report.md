# CPS Mobile Client Workflow Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Reconnect the first deferred Mobile/Fold production workflow: client selection, change, and clear. Reuse the existing production `ClientSelector` through the shared editor. No new picker. No parallel engine.

## Scope

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- This report.

Desktop presentations, `ClientSelector`, validation, save, numbering, schema, and all other deferred workflows were not changed.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-mobile-client-workflow-report.md`

## Skills Used

Skills used: karpathy, react-dev
Documentation standard: ASD-STE100 Simplified Technical English

---

## Client Workflow Before

Mobile/Fold showed a static client row seeded once at mount. Tapping it did nothing. Clearing it cleared display state only. No selection, change, or add-new-client path existed. Production client state stayed empty, so production validation blocked every mobile save.

## Client Workflow After

```text
Mobile client control tap
→ onRequestClientSelection
→ editor setClientPickerOpen(true)
→ shared ClientSelector dialog (existing instance)
→ select / add-new / clear
→ patchClient (existing desktop contract)
→ editor production state updates immediately
→ live client prop mirrors into the form display
→ save persists through the existing CPS save path
```

One selector instance serves both presentations. Desktop wiring is untouched.

## Exact ClientSelector Reuse Path

The editor already mounts one `ClientSelector` at its root with `hideTrigger`, `allowClear`, `compact`, `dense`, and `hideHeader`. It receives `clientId` and `clientName` from editor state and writes through `patchClient`. This task adds no second instance and no new dialog state. The mobile host reuses the existing `clientPickerOpen` flag: the form control calls `onRequestClientSelection`, which sets that flag. The same dialog opens with the same props, the same client list query, and the same footer.

## Production State Authority

The editor `cps` object is authoritative. Selection writes `client_name` plus `custom_fields.client_id` and `custom_fields.client_snapshot` through the exact desktop shape. The form holds a mirror for display only. A controlled `client` prop plus a mirror effect keeps the display convergent: local state follows the authoritative value and never overrides it. No Supabase access entered the presentation. No client fetch exists in the form.

## client_id Behavior

Follows the existing contract. Selection sets `custom_fields.client_id` to the record id. Clear sets it to empty string. Nothing else writes it. Mobile and desktop share the field.

## client_snapshot Behavior

Follows the existing contract. Selection stores `{ id, name, contact_person, phone, email, city, state }` mapped from the selector record through the mobile display shape. Clear sets the snapshot to null. No stale snapshot survives clear. The save commit and the live clear path use one shared helper, so both write identical shapes.

## Create-Mode Behavior

Empty factory state shows the empty control. Selection updates production state and displays immediately. Production validation recognizes the selected `client_id`. Save persists through the existing path with numbering untouched.

## Edit-Mode Behavior

The persisted client hydrates the seed and the live mirror. The selector opens with the current `clientId` reflected. Changing or clearing updates production state immediately. Saving persists the change. No prototype-only edit logic was added.

## Clear-Client Behavior

The existing clear button keeps its placement and wording. It now writes through to production state: `client_name`, `client_id`, and `client_snapshot` all clear together. Display and production cannot diverge. The selector clear action follows the same contract.

## Add-New-Client Status

Enabled by reuse. The shared selector footer already contains Add New Client with its `ClientForm` modal, insert, auto-select, and success feedback. Mobile inherits it with no new code. Nothing was redesigned or rebuilt.

## Validation and Save Integration

No validation rule changed. Existing `validateCps` sees the mobile selection because it reads the same `custom_fields.client_id`. The prototype save pre-check mirrors the same requirement. The commit carries the mirrored client into the save payload. Saving and double-submit protection from foundation hardening is intact: the `saving` prop path was not touched.

## Desktop Preservation Confirmation

Desktop renders `CostPricingSheetDesktopForm`. Its client picker, `patchClient`, selector props, and dialog behavior are byte-identical in logic. The only editor additions are the shared snapshot helper (same shape as `patchClient`), the existing opener reused by mobile, and new props on the mobile-only host. No desktop path calls them.

## Mobile/Fold Visual Preservation Confirmation

The client card keeps its geometry, typography, and placement. The only presentation change is activatability: the static container gained `role="button"`, keyboard focusability, and tap/Enter/Space handling that calls the selection intent. The existing focus-visible ring applies. No dimensions, spacing, colors, or wording changed.

## Foundation-Hardening Regression Check

- Production Decimal display math: intact. No calculation line touched.
- Stable string row/group identity: intact. No identity line touched.
- Non-contiguous membership: intact.
- Saving and double-submit protection: intact.
- Production photo upload: intact.
- Theme Manager light integration: intact.
- Numeric `gid`: did not return. Float business math: did not return. dataURL upload: did not return.

## Deferred Workflows

Still deferred: Columns, JSON Import, Markup, Clear-All confirmation, dark-mode Theme Manager integration, autosave, dirty-state protection, component decomposition, group-delete standardization.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Targeted tests: 47 passed, 0 failed across `cpsRowOperations`, `cpsNormalize`, `cpsInstantMarkup`, `cpsImportView`, including client round-trip and picker-empty cases.
- `git diff --check`: passed. Only line-ending warnings on touched files.
- `git status`: 3 modified source files in expected scope (Page change is the prior separation restore, still uncommitted). 4 untracked pre-existing reports plus this report.
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not executed per hardware policy.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Risks or Limitations

- No browser or device run was performed. Selector rendering on small screens relies on its existing drawer behavior.
- The form mirror depends on the live client prop. If a future change stops passing it, the display freezes at seed. The prop contract is documented in the component interface.
