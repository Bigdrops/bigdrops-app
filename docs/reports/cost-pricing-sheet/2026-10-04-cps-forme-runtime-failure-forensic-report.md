# CPS Forme Runtime Failure Forensic Report

This report was written by Codex on 2026-10-04 via Codex desktop.

## Objective

Investigate the CPS PDF runtime failure after the Vite WASM build fix.

Do not make a speculative renderer change.

Find the first failing boundary in the CPS Forme PDF path. Repair only that boundary when the cause is proven.

## Scope

Files changed:

- `src/components/pdf/forme/fonts.ts`
- `src/components/pdf/index.ts`
- `src/domain/cps/pdfDownloadHandler.ts`
- `src/lib/errorMessages.ts`
- `src/tests/critical/cpsPdf.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-forme-runtime-failure-forensic-report.md`

Skills used: using-superpowers, systematic-debugging, pdf-rendering-correctness, test-driven-development, verification-before-completion
Documentation standard: ASD-STE100 Simplified Technical English

## Documents Read

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/prd/pdf-rendering-migration/Readme.md`
- `docs/prd/pdf-rendering-migration/draft.md`
- `docs/prd/pdf-rendering-migration/functional-req.md`
- `docs/prd/pdf-rendering-migration/test-plan.md`
- `docs/prd/pdf-rendering-migration/Prerequisites.md`
- `docs/prd/pdf-rendering-migration/risk-register.md`
- `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md`
- `docs/reports/pdf/forme-invoice-poc-report.md`
- `docs/reports/pdf/forme-industry-poc-report.md`
- `docs/reports/pdf/poc/render-forme.tsx`
- `docs/reports/pdf/poc/forme-invoice-document.tsx`
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`

## Original Forme POC Result

The original Forme POC proved that Forme can render the invoice fixture under Bun.

The proof used:

- `renderDocument()` from `@formepdf/core`
- `Font.register()` from `@formepdf/react`
- A local Inter TTF file at `docs/reports/pdf/poc/assets/inter-var.ttf`
- Data URI image input
- Native Forme table rendering

The POC rendered:

- A4 portrait
- A4 landscape
- Long tables
- Dynamic page numbers
- Naira glyphs with Inter TTF
- Native table header repetition

## What The POC Did Not Prove

The POC did not prove:

- Browser runtime
- Vite production runtime
- Vercel runtime
- Android Chrome runtime
- CPS production download delivery
- CPS customization font binding
- `@fontsource` WOFF files in Forme

The POC report explicitly records Browser/Vite, Vercel, and Android as untested.

## POC Environment

The POC ran under Bun.

It did not run in Android Chrome. It did not run from Vercel. It did not prove a Vite production browser bundle.

## Current CPS Call Graph

The current CPS download path is:

```text
CPS Download tap
→ ViewCps uses handleDownloadCpsPdf
→ handleDownloadCpsPdf
→ dynamic imports for generator, template, fonts, React
→ readCpsPdfDisplayPreferences()
→ resolveFull(... loadSettings('cps_sheets'))
→ ensureFormeFontFamily(customization.documentFont)
→ logo and item photo data URI preparation
→ buildCpsFormeModel()
→ selectCpsFormeDocument()
→ React.createElement(SelectedDocument, { model })
→ generateCpsFormePdf()
→ import @formepdf/core/browser
→ renderDocument(element)
→ Uint8Array byte validation
→ Blob creation
→ CompositePdfDelivery
→ WebPdfDelivery or NativePdfDelivery
```

## Failing Boundary

The first proven failing boundary was the font boundary.

The POC proved that Forme accepts TTF bytes and rejects WOFF/WOFF2 bytes with the font parser error `unknown magic`.

The CPS default customization uses `documentFont: 'Inter'`.

The CPS font resolver loaded `Inter` from the shared PDF font registry. That registry points to `@fontsource` WOFF files.

Therefore CPS passed WOFF bytes into Forme during PDF rendering. That boundary was not proven by the POC and is incompatible with the POC result.

## Underlying Exception

The original production registry entry `err_1791138019300_n2c18t` cannot be recovered from repository inspection. The registry stores entries in the browser `localStorage` key `bd-error-registry`.

Before this change, `feedback.error('Download failed', { description: error.message })` registered only the string title. The registry diagnostic did not include the original CPS/Forme exception.

The underlying Forme font exception for this boundary is `unknown magic`, as recorded by the Forme POC when WOFF/WOFF2 bytes were registered.

## Why Build Passed But Runtime Failed

`vite-plugin-wasm` fixed static WASM bundling.

The build does not render a CPS PDF. It does not register the selected CPS font, parse WOFF bytes in Forme, create a Blob, or run Android Chrome delivery.

The failure occurred after bundling, when the live CPS PDF pipeline tried to render with a Forme-incompatible font source.

## Difference Between Proof And CPS Path

Working proof:

- Bun runtime.
- `@formepdf/core` default entry.
- Inter registered from a local TTF file.
- POC image data URI.
- No production CPS delivery path.

Failing CPS path:

- Browser runtime on Vercel and Android Chrome.
- Production code imported Forme through the application PDF generator.
- CPS default font resolved to Inter.
- Inter came from `@fontsource` WOFF files.
- The existing registry did not preserve the original exception.

## Changes Made

The Forme font resolver now returns `Helvetica` when a shared font source is not TTF or OTF. It does not register WOFF files with Forme.

The CPS Forme generator now imports `@formepdf/core/browser`. This matches the package browser contract and keeps Node APIs out of the browser runtime path.

The CPS generator now wraps stages:

- `forme-init`
- `render`
- `bytes`
- `delivery`

The CPS handler now wraps stages:

- `prepare`
- `customization`
- `font`
- `template`

The feedback registry diagnostic now preserves cause chains. The user-facing toast stays friendly.

## Regression Tests Added

The CPS PDF test now verifies:

- CPS Forme falls back to `Helvetica` instead of registering WOFF shared fonts.
- CPS diagnostics preserve stage and cause information.
- CPS browser runtime uses `@formepdf/core/browser`.

## Verification

- `bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsPdf.test.js`: passed
- `bunx eslint src/components/pdf/forme/fonts.ts src/components/pdf/index.ts src/domain/cps/pdfDownloadHandler.ts src/lib/errorMessages.ts src/tests/critical/cpsPdf.test.js`: passed
- `bun run typecheck`: passed
- `git diff --check`: passed
- `git status`: modified intended files only
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy
- `bun run audit:load`: skipped because no data, schema, query, or load-risk logic changed

## Supabase Push Status

Not applicable. No SQL or schema changed.

## Risks Or Limitations

This task does not prove production runtime success. The human must retest the deployed Vercel application in Android Chrome.

The exact old registry entry is not available from repository state.

CPS custom document fonts now fall back to `Helvetica` until a Forme-compatible TTF or OTF font asset is added.

## Runtime Retest Request

Retest this exact path:

```text
CPS → Download PDF
```

If it still fails, return the new registry ID and the expanded diagnostic text. The diagnostic must now include the failing stage and the original exception cause.

## Deferred Work

Add Forme-compatible TTF or OTF assets for CPS document-font customization.

Add a browser harness for Forme CPS rendering before any further renderer migration work.
