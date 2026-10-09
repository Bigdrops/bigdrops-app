# CPS Instant Markup And Custom Columns Implementation Report

This report was written by Codex on 2026-10-09 via Codex desktop.

Date: 2026-10-09

Objective: Correct CPS Instant Markup pricing-base and reset behavior while preserving the completed CPS custom-column repair.

Scope: CPS Instant Markup domain logic, CPS editor markup session state, markup preview presentation, focused regression tests, and this report.

Skills used: systematic-debugging, typescript-advanced-types, vercel-react-best-practices, verification-before-completion, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Executive Summary

Implemented the coordinated repair for CPS Instant Markup, CPS custom columns, CPS JSON custom-field ingestion, and shared Invoice/CPS column identity protection.

The work keeps CP immutable, keeps repeatable markup as internal behavior only, removes user-facing "stack" terminology from active CPS markup UI, enables zero-CP item rows to participate in markup, carries CPS custom columns through Mobile/Fold, and gives CPS import parity for parser-approved `custom_fields`.

## 2026-10-09 Pricing-Base Correction Addendum

This addendum supersedes two earlier Instant Markup contracts in this report:

- Superseded: percentage and fixed markup always use current working SP.
- Corrected: percentage and fixed markup use positive current working SP. If working SP is not positive, they use CP.
- Superseded: Reset sets every item SP to zero.
- Corrected: Reset restores the exact row workspace from the Instant Markup session opening snapshot.

The corrected Instant Markup contract is:

- Percentage: `base × (1 + percentage / 100)`.
- Fixed value: `base + fixed value`.
- Base: `currentWorkingSp > 0 ? currentWorkingSp : cp`.
- CP is never mutated.
- Section rows remain excluded.
- Excluded item rows remain unchanged.
- Repeated markup continues from the latest previewed or working SP.
- Reset restores session-opening SP values and row data.
- Undo Reset restores the immediate pre-reset workspace.

## Sources And Skills Used

- Read `AGENTS.md`, project agent instructions, `docs/PROJECTSKILLINDEX.md`, `docs/standard/document-column-standard.md`, and `docs/standard/json-import-standard.md`.
- Loaded relevant skills: systematic debugging, React/TypeScript architecture, frontend form architecture, Supabase/data-flow auditing, verification-before-completion, and Karpathy.
- Implementation was based on:
  - `docs/reports/cost-pricing-sheet/2026-10-08-cps-instant-markup-custom-columns-zero-code-audit.md`
  - `docs/reports/invoice-quote/2026-10-08-invoice-column-settings-duplicate-regression-audit.md`

## Implemented Changes

### Instant Markup

- `src/domain/cps/instant-markup.ts`
  - Changed `isInstantMarkupEligible` so every CPS item row is eligible.
  - Removed the incorrect `cp > 0` eligibility gate.
  - Corrected the pricing base:
    - Use positive current working SP.
    - Otherwise use CP.
  - Corrected formulas:
    - Percentage: `base × (1 + percentage / 100)`
    - Fixed value: `base + value`
  - Added session reset cloning helpers so Reset can restore the opening workspace instead of zeroing SP.
  - CP remains untouched.

- `src/components/cps/CpsMarkupSheet.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
  - Removed user-facing "Stack", "Stacked", "Preview Next Stack", and "Apply Working SP" language.
  - Replaced UI copy/actions with Instant Markup vocabulary.
  - Kept repeated preview-to-working-SP behavior through renamed internal handler `handleApplyPreviewMarkup`.
  - Added an Instant Markup session-opening row snapshot.
  - Changed Reset to restore that opening snapshot.
  - Kept Undo Reset separate from post-Apply undo.
  - Added Base display in the preview row context.

### CPS Custom Columns

- `src/components/cps/CostPricingSheetForm.tsx`
  - Mobile/Fold column resolver now accepts `custom_` columns.
  - Mobile/Fold item rows now carry `customData`.
  - Visible custom columns now render editable row inputs.
  - Mobile row-to-domain conversion preserves `custom_data`.

- `src/components/cps/CostPricingSheetEditor.tsx`
  - Maps domain `row.custom_data` into Mobile/Fold `customData`.
  - Maps Mobile/Fold `customData` back into domain `row.custom_data`.
  - Sanitizes arbitrary domain custom data into scalar values before it enters the mobile form.

### CPS JSON `custom_fields` Import

- `src/domain/cps/importAdapter.ts`
  - Allows item-level `custom_fields`.
  - Reuses existing matching CPS custom columns by normalized logical label.
  - Creates new custom columns only from parser-approved `custom_fields`.
  - Collapses superficial variants such as `Part no ` and `PART NO` into one custom column.
  - Maps built-in-like custom field names such as `Unit`, `CP`, and `SP` to built-in CPS fields instead of creating duplicate custom columns.
  - Preserves the old behavior that unknown root/item fields outside the approved schema are rejected.
  - Does not materialize a default `columnConfig` on imports that have no existing column config and no imported custom fields.

- `src/components/cps/CpsImportSheet.tsx`
  - Uses a dynamic CPS import prompt built from the current sheet configuration.
  - Visible custom columns are listed under `custom_fields`; hidden custom columns are excluded.

### Shared Column Identity Protection

- `src/domain/financial/columnIdentity.ts`
  - Added shared logical-label identity helpers using the same normalization semantics already used by JSON import.
  - Provides collision checks for custom/custom and built-in/custom labels.
  - Provides unique default custom-column label and key generation.

- `src/domain/import/utils.ts`
  - Reuses the shared identity helper for `toSnakeCase`.
  - Reuses shared unique custom-column key generation.

- `src/components/useInvoiceColumns.tsx`
  - Manual Add Custom Column still creates `New Column`, `New Column 2`, etc.
  - Rename now refuses a logical-label collision.
  - Existing duplicate saved configurations are not rewritten or destroyed.

- `src/domain/cps/columns.ts`
  - CPS custom-column creation now avoids logical duplicates.

## Tests Added Or Updated

- `src/tests/critical/cpsInstantMarkup.test.js`
  - Guards CP fallback when working SP is zero.
  - Guards existing positive SP as the markup base.
  - Guards repeated operations from latest working SP.
  - Guards Reset restoration from the session-opening snapshot.
  - Guards Undo Reset state shape through pre-reset workspace cloning.
  - Guards row id, group id, CP, and `custom_data` preservation.
  - Guards zero-SP percentage behavior and fixed-value behavior.

- `src/tests/critical/cpsMarkupPresentation.test.js`
  - Guards removal of active markup "stack" terminology.
  - Guards Mobile/Fold custom column and custom row data propagation.
  - Guards editor Reset against the old destructive zero-SP helper.

- `src/tests/critical/cpsImportView.test.js`
  - Guards CPS `custom_fields` ingestion.
  - Guards custom-column reuse, superficial-label dedupe, built-in collision handling, and dynamic import prompt output.

- `src/tests/critical/financialColumnIdentity.test.js`
  - Guards shared label identity normalization.
  - Guards duplicate/collision blocking.
  - Guards Invoice hook usage of the shared add/rename protections.

## Verification

Commands run:

```bash
bun test src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsMarkupPresentation.test.js src/tests/critical/cpsImportView.test.js src/tests/critical/financialColumnIdentity.test.js
bun test src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsMarkupPresentation.test.js
bun run typecheck
rg -n "\bStack(?:ed|ing)?\b|Next Stack|Apply Working SP" src/components/cps src/domain/cps -S
```

Results:

- Focused tests: 52 passed, 0 failed.
- Instant Markup correction focused tests: 27 passed, 0 failed.
- Typecheck: passed.
- Active CPS source scan for forbidden Instant Markup wording: no matches.

Not run:

- `bun run build` was not run per project instruction.
- `bun run audit:load` was not run because no schema/query/data-layer contract changed.
- No migrations or Supabase writes were run.

## Working Tree Note

Pre-existing unrelated working-tree changes were present before this task, including Android launcher assets, design-direction files, and the two zero-code audit reports. They were not reverted or modified by this implementation.

During final verification, additional unrelated Android/report changes were visible in `git status`; they remain untouched.

## Exact Files Changed By This Task

- `docs/reports/cost-pricing-sheet/2026-10-09-cps-instant-markup-custom-columns-implementation.md`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CpsImportSheet.tsx`
- `src/components/cps/CpsMarkupSheet.tsx`
- `src/components/useInvoiceColumns.tsx`
- `src/domain/cps/columns.ts`
- `src/domain/cps/importAdapter.ts`
- `src/domain/cps/instant-markup.ts`
- `src/domain/financial/columnIdentity.ts`
- `src/domain/import/utils.ts`
- `src/tests/critical/cpsImportView.test.js`
- `src/tests/critical/cpsInstantMarkup.test.js`
- `src/tests/critical/cpsMarkupPresentation.test.js`
- `src/tests/critical/financialColumnIdentity.test.js`
