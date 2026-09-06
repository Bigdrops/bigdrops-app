# Popup Composition Compression Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Find the real remaining height in the customization popups.
- Compress structure without removing controls.
- Assess all four surfaces honestly, without class-arithmetic PASS claims.

## Scope

- `src/components/document-view/shared/DocumentCustomizeCard.tsx` only.
- Carousel, sheet, engine, persistence, payments untouched.

## Files changed

- `src/components/document-view/shared/DocumentCustomizeCard.tsx`
- `docs/reports/invoice-quote/popup-composition-compression-2026-09-06.md` (this report)

## Skills used

Skills used: apple-design
Documentation standard: ASD-STE100 Simplified Technical English

## Height source findings

- `DocumentSheet` cleared. Mobile uses content height with a max cap. Base sheet adds no gap or padding. No forced height exists.
- Primitives cleared. Switch renders 28px. Select trigger renders 40px. Inputs render 28 to 36px. All usable.
- No empty mounted containers remain. All conditional sections gate correctly.
- No duplicated headings or controls remain.
- Remaining height is card chrome multiplied per section plus legitimate content.

## Changes

- Accent plus Document Font now share one Appearance card with a divider. One card chrome and one gap removed. Icon heads and all behavior preserved.
- Layout toggle rows render directly without the wrapper card. Rows are self-bordered. Adjacency preserves grouping.
- Toggle rows, switch behavior, accent persistence, font select, and Save untouched.

## Preserved behavior

- Accent ON renders custom color with swatches. OFF collapses and renders the template default.
- Template selection, fonts, compact, landscape, drafts, save, and close unchanged.
- CSR and Waybill render byte-identical pixel output. Their font-only card keeps exact dimensions.

## Four-surface assessment (visual, not measured)

| Document | Result | Relative height | Main remaining source |
|---|---|---|---|
| Invoice | PARTIAL | Close, now shorter than reference | Legitimate controls: accent, font, two toggles, save |
| Quotation | PARTIAL | Close, now shorter than reference | Same composition as Invoice |
| Waybill | PASS | Shorter than reference | Baseline pattern, unchanged |
| CSR | PASS | Shorter than reference | Baseline pattern, unchanged |

- No runtime measurement tooling exists in this environment.
- Comparison used the HTML reference artifact section by section.
- Commercial popups gain about 30 px from this change plus prior accent-collapse gains.
- No further safe compression exists without deleting controls or eroding touch targets.

## Verification

- `bun run typecheck`: passed, clean.
- `bun run audit:load`: skipped (UI-only change).
- `bun run build`: not run (hardware policy).
- `git diff`: one intended file. Other worktree entries belong to concurrent work and were left untouched.

## Limitations

- Height deltas are structural, not device-measured.
- Small-phone commercial popups still scroll. Content, not chrome, causes it.
