# Waybill Mobile Fold Form Redesign Report

This report was written by Codex on 2026-10-08 via Codex desktop.

## Objective

Redesign the active Waybill New/Edit form for Mobile and Fold screens. Preserve Waybill business behavior, import behavior, persistence, PDF output, and document numbering.

## Scope

- Waybill form layout and responsive presentation.
- Waybill item-card density through the shared mobile item card.
- Waybill JSON import row merge behavior.
- Mobile form footer action composition.

## Files changed

- `src/components/waybill/WaybillForm.tsx`
- `src/components/invoice/MobileItemCard.tsx`
- `src/components/document/FormFooter.tsx`
- `src/components/document/document-cps-overrides.css`
- `src/tests/critical/waybillImportMerge.test.js`
- `docs/reports/waybill/waybill-mobile-fold-form-redesign-2026-10-08.md`

## Skills used

Skills used: frontend-design, tailwind-capacitor, vercel-composition-patterns, typescript-advanced-types, accessibility, emil-design-eng, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added a Waybill-specific form scope with compact document details, transport details, custody details, and item styling.
- Kept the existing Waybill type, client picker, manual number, PO number, date, time, and linked invoice behavior.
- Added the missing `Self Pick-Up` transport option to the active Transport Mode select.
- Kept pricing fields hidden for Waybill. No pricing fields were added to Waybill.
- Changed the shared item card to expose a Waybill item class. This lets Waybill use compact scoped styling without changing Invoice behavior.
- Changed Waybill JSON import to reuse a genuinely empty starter row before it appends imported rows.
- Preserved occupied Waybill rows during import. Existing user-entered item data is not overwritten.
- Preserved existing custom columns and added imported custom columns without replacing the prior list.
- Changed the shared form footer to support hiding the Draft button. Waybill uses this to show `Cancel` and `Save Waybill` as the primary mobile bottom actions.

## Verification result

- `bun run audit:load`: completed with exit code 0. Existing load-risk warnings remain in unrelated files.
- `bun run typecheck`: passed.
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/waybillImportMerge.test.js`: passed.
- `bun run test`: failed due to pre-existing unrelated critical test failures in CPS view, accounting integration wrapper tests, remediation/source transaction wrappers, and item cleanup export/import.
- `git diff --check`: no whitespace errors. Git reported existing LF/CRLF warnings.
- `supabase db push`: not applicable. No SQL changed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Not applicable. No schema, migration, query, or data-layer file was changed.

## Risks or limitations

- Visual validation was not performed on hardware. The project lead will validate on device.
- The working tree had pre-existing modified and untracked files before this task. Those files were not reverted.
- The full critical test suite has unrelated failures outside this Waybill change.

## Deferred work

- Resolve pre-existing `audit:load` warnings.
- Resolve unrelated critical test failures.
- Perform final phone and Fold hardware validation.
