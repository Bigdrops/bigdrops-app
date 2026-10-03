# CPS Mobile Columns and Import Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Reconnect two deferred Mobile/Fold production workflows: Columns and JSON Import. Both toolbar controls invoke the existing production workflows through the shared editor. No new sheets. No new engines.

## Scope

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- This report.

Desktop presentations, sheets, domain modules, validation, save, numbering, schema, markup, and clear-all were not changed.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-mobile-columns-import-report.md`

## Skills Used

Skills used: karpathy, react-dev
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

Mobile toolbar intent flows into the editor. The editor owns the shared sheets and authoritative state. Live controlled props mirror production state back into the form.

## Desktop Preservation

Desktop renders `CostPricingSheetDesktopForm`. Its column manager, import sheet, triggers, and callbacks are untouched. Shared editor additions (column list mapper, row mapper extraction, revision bump on import apply) do not alter desktop data flow. Desktop import and column behavior is byte-identical in logic.

## Mobile/Fold Visual Preservation

The Columns and Import toolbar buttons keep their positions, labels, icons, and styling. They gained click handlers only. The form CSS block was not edited. No geometry, spacing, typography, card, group, item, breakpoint, Theme Manager, reset, or heading rule changed.

---

## Columns: Previous Mobile Behavior

Column configuration seeded once at mount from production config. No control could change it. The Columns toolbar button was inert.

## Production Column Component Reused

The existing inline `CpsColumnSheet` in `CostPricingSheetEditor.tsx`, driven by `useInvoiceColumns` with `normalizeCpsColumns` and `CPS_BUILTIN_COLUMNS`. No second sheet. The J3 ColumnsSheet was not restored. No implementation was copied into the form.

## Column-State Authority

Editor `columns` state from `useInvoiceColumns` is authoritative. It already syncs into `custom_fields.columnConfig` for persistence and feeds the desktop sheet. Mobile now reads the same state. The form holds a display mirror only.

## Exact Open and Close Flow

Mobile Columns tap → `onRequestColumns` → editor `setShowColumnManager(true)` → the shared `CpsColumnSheet` overlay opens → Done or overlay tap closes → existing `onClose` sets the flag false. Identical to desktop.

## Live Controlled-State Strategy

The host passes `liveColumns` mapped from editor state on every render. The form mirrors them through a shallow-compared effect that returns the previous state when nothing changed. Updates reflect immediately with no remount, no refresh, and no save cycle. Standalone preview (prop absent) keeps seed behavior. Effect loops are prevented by the equality guard plus mount-once seed semantics.

## Show and Hide Behavior

Production semantics preserved. Visibility maps from `visibilityMode !== 'hide_full'`. The sheet deny list still locks required columns. The form `vis()` gating reads the mirrored config.

## Label Behavior

Production labels flow through unchanged, including custom renames. The form falls back to its canonical labels only when a production label is absent.

## Ordering Behavior

Ordering lives in the production sheet (move up/down). Mobile renders fields in its fixed approved order and does not reorder production state. The production order contract is untouched.

## Reset and Default Behavior

Production reset restores built-in defaults through the existing `resetColumns`. The mirror carries the result into the form. Custom-column add and remove remain production-owned. Mobile cannot display production custom columns, so they persist untouched through save (both column config and row `custom_data` pass through the commit spread). The data contract was adapted at the boundary, not altered.

## Edit Hydration

Seed and live columns both derive from `normalizeCpsColumns` over the stored config, so first paint and subsequent mirrors agree. Stored configurations hydrate identically on both presentations.

## Persistence Behavior

Unchanged. Editor sync writes `columnConfig` into `custom_fields`. Save persists through the existing path.

---

## Import: Previous Mobile Behavior

The Import toolbar button was inert. No JSON path existed on Mobile/Fold.

## CpsImportSheet Reuse Path

The existing `CpsImportSheet` mounted at the editor root serves mobile. Mobile Import tap → `onRequestImport` → editor `setImportOpen(true)` → the shared sheet opens → existing parse, validate, preview, and apply run → existing `onApply` updates editor state. The J3 ImportSheet and parser were not restored. No JSON parsing exists in the form.

## importAdapter Reuse Confirmation

`src/domain/cps/importAdapter.ts` is untouched and authoritative: the `cpsImportSchema` Zod contract, `cost_price` to `cp` and `selling_price` to `sp` mapping, `grp_N` group identities, `temp_ref` item references, column-gated field application, and the client/site/photo/calculation exclusion boundary. No field was added, renamed, or reinterpreted. No BOQ contract was revived.

## Exact Current Import Contract Used

Paste JSON matching `cpsImportSchema` with `title`, `groups`, and `items`. Groups receive deterministic `grp_N` ids. Items receive order-preserving rows with explicit `group_id` references. Column visibility gates imported fields. Title applies when present. Client, site, photos, column config, and calculated values are never ingested (covered by existing tests).

## Import State-Update Strategy

Successful apply calls the existing editor `onApply`: `setCps`, markup selection rebuild, optional column normalization, plus a new rows-revision bump. The host passes fresh production rows and the revision into the form. A revision-gated effect replaces the form row buffer and the document title in one step. No remount. Unsaved document fields other than title survive because only rows and title sync. Local row edits yield to the import, matching desktop replace semantics.

## Group Identity Behavior

Imported groups arrive with adapter `grp_N` string ids. The string-identity seed maps them directly with no numeric layer and no adjacency inference. They persist under those ids.

## Item Identity Behavior

Imported items arrive with adapter row identity. The seed claims `_uiKey` or `id`. Commit matches live rows by the same keys. No array-position identity. No sequential presentation identity.

## Non-Contiguous Membership Behavior

Preserved. Membership filters by `group_id` across the whole list. Imported groups and items behave exactly like production-created rows. Existing row-operation tests confirm the semantics.

## Ungrouped Item Behavior

Preserved. Imported items without group references seed with null membership and render as ungrouped. No group is manufactured.

## Calculation Refresh Behavior

Display totals recompute automatically because they derive from the buffer through `computeCpsTotals`. Imported CP, SP, and quantity values flow through the same production Decimal path as manual entries. No separate import math exists.

## Client-State Behavior During Import

Unchanged. The adapter contract excludes client fields, and existing tests lock this boundary. The selected client survives import on both presentations.

## Column and Custom-Field Behavior During Import

Unchanged. Field gating follows the live production column config. Custom data is not ingested. After import, live column configuration continues to control mobile rendering.

## Validation and Error Behavior

Unchanged. The sheet owns parsing and validation UI. Invalid JSON never reaches `onApply`, so authoritative state cannot partially mutate. Atomicity matches desktop exactly.

---

## Regression Check

- ClientSelector: intact. No client line touched. Shared selector instance now also serves mobile entry, desktop props unchanged.
- Production Decimal math: intact. Display derives from the synced buffer through the same functions.
- Stable identity: intact. String ids end to end, no `gid`, no seq maps.
- Photo upload: intact. No photo line touched.
- Saving and double-submit: intact. The `saving` path was not touched.
- Theme Manager light integration: intact. No style line touched.

## Deferred Workflows

Still deferred: Markup, Clear-All confirmation, dark-mode Theme Manager integration, autosave, dirty-state protection, component decomposition, group-delete standardization. Markup and Clear All triggers remain inert.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Targeted tests: 47 passed, 0 failed across `cpsRowOperations`, `cpsNormalize`, `cpsInstantMarkup`, `cpsImportView`, including import contract, client exclusion, column gating, and calculation authority cases.
- `git diff --check`: passed. Only line-ending warnings on touched files.
- `git status`: 3 modified source files in expected scope (Page change is the prior separation restore, still uncommitted). 5 untracked pre-existing reports plus this report.
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not executed per hardware policy.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Risks or Limitations

- No browser or device run was performed. Sheet overlays on small screens rely on their existing responsive behavior already used by desktop fold layouts.
- Mobile cannot render production custom columns. They persist untouched. A future task may add display support.
- Import replaces in-progress mobile row edits, matching desktop replace semantics. This is intended, not data loss beyond the documented contract.
