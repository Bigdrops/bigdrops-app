# Crest Template — Full Implementation Report

## Summary

Crest is a production-grade React-PDF presentation template for commercial documents. It follows a warm, elegant aesthetic with a dark ink header band, gold accent, warm paper background, and Cormorant Garamond serif typography throughout.

## Files Created/Modified

| File | Change |
|---|---|
| `src/components/pdf-new/templates/Crest.tsx` | **Created** — Full template (295 lines) |
| `src/components/pdf-new/templates/CrestStyles.ts` | **Rewritten** — Full stylesheet (642 lines, ~70 style tokens) |
| `src/lib/pdfSharedFonts.ts` | **Modified** — Added Cormorant Garamond registration |

## Template Sections

1. **Header Band** — Dark ink (#2d1f3a) background with gold (#b28b3d) accent bar underneath. Company name, title, and document meta rows (number, dates, PO) on left; company logo on right.

2. **Party Cards** — Two-column flex layout using `buildPartyLines` engine helper. Each side rendered as a bordered panel (`CrestPartyCard` component in-file). "Name" type lines rendered bold.

3. **Custom Fields Strip** — Gold-accent-dim (#f9f3e6) background row showing `customHeaderFields` as label/value chips.

4. **Table** — React-PDF `View`-based rows with:
   - Table header row (dark ink bg, white text) rendered as `fixed`
   - Group header rows (accent-dim bg, serif label, all-caps via `toTitleCase`)
   - Group footer rows with conditional subtotal display
   - Alternating even/odd row bands
   - Description cells with `getDescriptionMain`/`getDescriptionSub`
   - Tight single-line cells (qty/unit) with `hyphenationCallback`
   - Image thumbnails via `row.imageUrl`
   - Column widths from `resolveColumnLayout`

5. **Totals Card** — Panel-style box with:
   - Totals lines from `buildTotalsLines`
   - Main total line with gold accent border
   - Amount-in-words in italic serif on accent-dim background
   - Balance due on gold background with white text
   - Advance summary box with gold left border

6. **Bank Details** — Optional panel alongside totals when `showBankDetails` is true, rendered as label/value rows.

7. **Notes / Terms** — Rich-text sections via `renderPdfRichText` with fallback to `plainText`.

8. **Attachments** — `CrestOptionalList` in-file component using `buildAttachmentItems` engine helper, rendering links where possible.

9. **Additional Fields** — Simple label/value list.

10. **Signature** — Image placeholder with signature line, signer name, and role.

11. **Footer** — Fixed footer with page numbering (`Page X of Y`), extra text, tagline, and document metadata.

## Font Registration

- **Font:** Cormorant Garamond (serif)
- **Variants registered:** latin-500-normal (mapped to fontWeight 400), latin-600-normal (mapped to fontWeight 700), latin-500-italic
- **Mechanism:** `REGISTERED_LOCKED_SHARED_FONTS` in `pdfSharedFonts.ts` — auto-registered by `registerPdfFonts()` in `pdfFontRegistry.ts`
- **Constants exported:** `CREST_FONT_FAMILY = 'Cormorant Garamond'`
- **Sans font:** Inter (pre-registered)

## Color Palette

| Token | Hex |
|---|---|
| INK | #2d1f3a |
| ACCENT | #b28b3d |
| ACCENT_DIM | #f9f3e6 |
| PAPER | #fdfbf7 |
| RULE | #c5bdaa |
| LIGHT_RULE | #e4ddd0 |
| PANEL | #f7f3ed |
| LINK | #3d2b4f |
| LINK_BG | #f2eaf6 |
| WHITE | #ffffff |
| MUTED_TEXT | #5c5344 |
| WARM_BLACK | #1a1512 |

## Engine Helpers Used

- `buildPartyLines` — Party line extraction
- `buildAttachmentItems` — Attachment normalization
- `resolveColumnLayout` — Column width resolution
- `resolveTextAlignment` — Text alignment from column defs
- `buildTotalsLines` — Totals line extraction
- `getMainTotal` — Main total line
- `getBalanceDue` — Balance due line
- `getAmountInWords` — Amount-in-words string
- `buildAdvanceSummary` — Advance/balance summary
- `getAccentTint` — Row tinting

## Core Utilities Used

- `safeText` — Safe string conversion
- `getDescriptionMain` / `getDescriptionSub` — Description cell extraction
- `renderPdfRichText` — Rich text rendering
- `PdfCurrencyText` — Currency value rendering

## Architecture Notes

- All sections are in a single `Crest.tsx` file with two in-file sub-components (`CrestPartyCard`, `CrestOptionalList`)
- No `presentation/crest/` directory — Crest does not follow the Industry re-export pattern
- Template already wired in `src/components/pdf-new/index.ts` — no registry changes needed
- No business logic duplication — all calculations delegated to engine helpers
- No package.json or tsconfig changes needed beyond the initial `bun add @fontsource/cormorant-garamond@5.2.11`

## Verification

- `bun run audit:load` — Passed (no new warnings)
- `bun run typecheck` — Passed (0 errors)
- `bun run build` — Timed out (full app build, not template-specific)
