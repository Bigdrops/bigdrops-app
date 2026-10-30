# CSR Portrait Display Font Report

This report was written by Qoder on 2026-10-30 via Qoder Desktop.

## Objective

Add a heavy display typeface to the portrait CSR template (`csr-reference-portrait`) for section numerals, section titles, masthead identity, client name, equipment model, and equipment capacity. Keep body text, labels, metadata, identifiers, quantities, and monospaced values unchanged.

## Scope

- Portrait CSR template only (`csr-reference-portrait`).
- Display typography registration and application.
- Font asset licensing and embedding.
- Focused tests and render verification.

Out of scope: canonical CSR contract, PDFCN master resolver, Forme pipeline, tenant branding, logo and signature handling, A4 geometry, portrait materials algorithm, sign-off layout, and the landscape template (`csr-blueprint-landscape`).

## Files Changed

- `public/fonts/ArchivoBlack-Regular.ttf` (new, 90,988 bytes)
- `public/fonts/ArchivoBlack-OFL.txt` (new)
- `src/components/pdf/pdfcn/csr/csrPortraitFonts.ts` (new)
- `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx` (modified)
- `src/tests/critical/csrPortraitDisplayFont.test.js` (new)
- `docs/reports/CSR/2026-10-30-csr-portrait-display-font-report.md` (new)

## Skills Used

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Font Selection And Licensing

- The specification requested Arial Black from `C:\Windows\Fonts\ariblk.ttf`.
- The file exists on this host.
- Arial Black is a Microsoft font. Its license does not permit redistribution.
- The task rules prohibit copying or committing a non-redistributable font.
- Selected alternative: **Archivo Black**. It is the closest widely available Arial Black analogue and has the SIL Open Font License 1.1.
- Source: `https://raw.githubusercontent.com/google/fonts/main/ofl/archivoblack/ArchivoBlack-Regular.ttf` (official Google Fonts repository).
- The license text is bundled at `public/fonts/ArchivoBlack-OFL.txt`.
- No font was downloaded from an untrusted source.

## Registration Method

- `src/components/pdf/pdfcn/csr/csrPortraitFonts.ts` exports one constant: `CSR_PORTRAIT_DISPLAY_FONT = 'Archivo Black'`.
- The module registers the TTF with Forme through `Font.register({ family, src, fontWeight })`.
- It registers weight 400 and weight 700 on the same file so bold display styles resolve to the embedded face.
- The source path is runtime-aware: a filesystem path for Bun and Node renders, and a public URL for browser renders.
- Registration is idempotent through a module-level guard.
- `CsrPortraitReferenceTemplate.tsx` uses one shared `DISPLAY` style object. Change the constant to retarget all display headings.

## Display Scope

The display font is applied to:

- Section numerals.
- Section titles.
- Masthead provider name.
- Yellow metadata panel title.
- Client name.
- Equipment model name.
- Equipment capacity.

The display font is not applied to:

- Body narratives.
- Field labels and values.
- Reading values and units.
- Monospaced identifiers and quantities.
- Sign-off panel titles.
- System-state value.
- Footer metadata.
- Materials cards.

## Verification Result

- Class checks: display styles keep `fontWeight: 'bold'`; body and mono styles keep their existing families.
- `bun test src/tests/critical/csrPortraitDisplayFont.test.js`: 2 pass, 0 fail.
  - The TTF is present and registered with the expected source path.
  - The generated PDF embeds the font.
- `bun test src/tests/critical/csrPortraitMaterials.test.js`: 3 pass, 0 fail.
- `bun test src/tests/critical/pdfcnMasterResolver.test.js`: 10 pass, 0 fail.
- PDF embedding probe: the file contains `/BaseFont /ArchivoBlack-Bold` and `/FontFile2`. The embedded subset has `Length1 13540`; the source TTF is 90,988 bytes. No silent Helvetica fallback occurred.
- Render matrix (portrait):
  - 4 materials rows: 1 page. File size 68,784 bytes (58,546 bytes before the font).
  - 6, 8, 13, 18, and 24 materials rows: 2 pages.
  - All pages measure 210.0 mm by 297.0 mm.
- Landscape template: output bytes are identical to the baseline for the 4, 6, 8, 13, 18, and 24 row fixtures.
- Visual inspection at 2x rasterization:
  - The display face is visible on all target elements.
  - No heading wraps unexpectedly, clips, or overlaps.
  - Model and capacity stay legible and aligned.
  - Materials table heading repeats on continuation pages.
  - Footer clearance and sign-off spacing match the baseline.
- Long-value fixture comparison against a no-registration baseline: block geometry is identical. Pre-existing footer overlap and capacity wrapping are unchanged, so the font caused no regression.
- `bun run audit:load`: exit code 0.
- `bun run typecheck`: exit code 0.
- ESLint on the touched template, font module, and test: exit code 0.
- `bun run build`: not run, per the hardware policy.
- Full suite:
  - `bun test src/tests/critical`: 1540 pass, 13 fail.
  - `bun run test` (Node 24 runner): 1341 pass, 18 fail.
  - All failures are outside this task. Causes are pre-existing CPS, PO, theme-toggle, and cleanup-import assertions, plus Node 24 strip-only TypeScript limits (`.tsx`, parameter properties). No font test fails.

## Supabase Push Status

Not applicable. No SQL, migration, or database schema changed.

## Risks Or Limitations

- The browser rendering path was not exercised. The public URL follows the Vite public-asset convention, and the browser core fetches string sources.
- Archivo Black is an analogue, not a metric clone of Arial Black. Glyph widths differ slightly. The inspected layouts keep their structure.
- A long-value fixture has pre-existing footer overlap and capacity wrapping. These conditions existed before this task and were not changed.
- Pre-existing lint warnings remain at `src/components/pdf/pdfcn/csr/index.ts:37` and `:51`. This task did not add them.
- The working tree has pre-existing changes in landscape and other CSR files. This task did not touch them.

## Deferred Work

- Exercise the portrait CSR in a real browser render if the browser pipeline becomes a supported output path.
- Resolve the pre-existing footer overlap for the 6-field, long-capacity fixture in a separate task if it occurs in production data.
- Replace Archivo Black only if a redistributable face that matches Arial Black metrics becomes available.
