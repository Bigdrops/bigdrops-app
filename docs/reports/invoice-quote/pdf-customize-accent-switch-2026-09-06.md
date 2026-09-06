# Accent Color Switch Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Add a functional Accent Color ON/OFF switch to Invoice and Quotation popups.
- OFF renders the template default accent. No stale custom accent stays active.
- Reduce popup height. Preserve unified architecture and persistence fixes.

## Scope

- Customization engine, shared card, Invoice and Quotation popups, resolver tests.
- No miniature, bank, output, pipeline, or calculation changes.

## Files changed

- `src/domain/pdf/customization/types.ts`
- `src/domain/pdf/customization/resolver.ts`
- `src/domain/pdf/customization/hooks.ts`
- `src/domain/pdf/customization/commercial.ts`
- `src/components/document-view/shared/DocumentCustomizeCard.tsx`
- `src/components/document-view/invoice/InvoiceOverlays.tsx`
- `src/pages/ViewQuotation.tsx`
- `src/tests/critical/pdfCustomizationResolver.test.ts`
- `docs/reports/invoice-quote/pdf-customize-accent-switch-2026-09-06.md` (this report)

## Skills used

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Behavioral reference

- No CSR or Waybill accent switch exists. Both omit accent entirely.
- The reference is the collapsible Switch-section pattern in `DocumentCustomizeCard` (Ink, Handwriting): header row with title, description, Switch; content hidden when off; enabling selects a deterministic default.
- The accent switch copies that treatment exactly. Re-enable selects the first swatch, per CSR ink behavior.

## State representation

- New optional `accentEnabled` in engine settings. New required `accentEnabled` in resolved settings and resolved customization.
- Migration: explicit flag wins. Stored custom color without flag means enabled. No stored color means disabled.
- Capability-disabled families resolve to disabled.

## OFF resolution

- OFF sets persisted preset `useCustomColors` to false on Save.
- Download bridge honors the explicit flag over legacy defaults.
- All templates gate custom colors through `resolveDesignTokens` or equivalent toggle checks.
- Each template then renders its own internal canonical default accent.
- No per-template map. No hard-coded fallback colors.

## Persistence

- Switch state live-writes to engine localStorage like other engine setters.
- Save commits the preset toggle plus output and template.
- Return restores switch state from engine and rendering from preset plus bridge.
- Template switch while OFF keeps OFF. New template default renders.

## Height impact

- OFF collapses swatches plus color input. One compact switch row remains.
- Remaining Invoice and Quotation blocks: Template, Accent switch row, Document Font, Layout toggles, Save.
- No control deleted. Touch targets unchanged. Miniatures untouched.

## Verification

- `bun run typecheck`: blocked by a pre-existing conflict (see below).
- `bun run audit:load`: skipped (no data-layer logic touched).
- `bun run build`: not run (hardware policy).
- `git status`: 8 intended files changed. No unrelated modifications.

## Pre-existing verification conflict

- `tsc` reports 2 errors in `src/modules/invoices/services/paymentAccountingService.ts` (lines 190, 223, `voided_at` snapshot typing).
- That file is untracked and belongs to another agent. It was not modified here.
- Zero errors originate from the 8 files changed in this task.
- Per concurrent-agent safety rules the foreign file was left untouched.

## Limitations

- Engine accent and font still live-write before Save. Full deferred commit needs a hook redesign.
- Re-enable resets to the first swatch. Previous custom color is not restored. This matches CSR ink behavior.
- No runtime or device measurement performed.
