# CPS Conversion Options, PDF, Prefix Production Pass Report

This report was written by Muse Spark on 2026-10-04 via OpenCode.

## Objective

Four workstreams: repair CPS to Quotation number allocation, add a compact pre-conversion commercial-options step, replace the rejected CPS React-PDF implementation with the PRD Forme architecture, and complete the BOQ to CPS default prefix migration.

## Files and Material Inspected

- `AGENTS.md`, `docs/PROJECTSKILLINDEX.md`, `supabase/database-workflow.md`.
- `docs/prd/cost-pricing-sheet/` in full, including the product domain architecture (price ownership, compatibility contract) and the presentation PDF view contract (Forme renderer decision, rendering rules, customization policy).
- `src/pages/ViewCps.tsx`, `src/pages/view-cps-actions.ts`, `src/domain/cps/conversion.ts`.
- `src/domain/quotation/normalize.ts`, `src/hooks/useQuotationSave.ts`, `src/pages/QuotationFormPage.tsx`, `src/components/quotation/quotationFormUtils.ts`.
- `src/domain/invoice/calculations.ts`, `types.ts`, `factories.ts` (calculation inputs, extra charges).
- `src/components/pdf/index.ts`, `types.ts`, `industryAdapter.ts`, `templates/Minimal.tsx`, `src/lib/pdf/` pipeline, `src/domain/pdf/customization/`.
- `docs/reports/pdf/poc/` Forme proofs, vendor notes, and `@formepdf` package APIs.
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx`, `src/domain/prefixConstants.ts`, hosted settings probes.

## Skills Used

Skills used: karpathy, react-dev, typescript-advanced-types, supabase
Documentation standard: ASD-STE100 Simplified Technical English

---

## Workstream 1: Number Allocation Divergence

Root cause: `ViewCps` called conversion without tenant prefixes, so `resolvePrefix(undefined, 'quotation')` fell back to the `QTN` default while normal creation resolves `settings.document_prefixes` to the tenant value (`SASQUO`). Same generator, cursor, and retry machinery otherwise.

Repair: one-line threading of `settings?.document_prefixes` into the conversion call. Both triggers converge already. No algorithm duplicated. No prefix hardcoded.

Proof of convergence: tenant-prefix unit test produces `SASQUO-000412` from the shared generator, and a structural test pins the threading.

## Workstream 2: Conversion Options Architecture

Flow: Convert tap, compact options sheet, Continue, existing confirm dialog, confirmed conversion with options. Cancel creates nothing and consumes no number because allocation happens inside conversion at confirm time.

Options model (`CpsConversionOptions` in `conversion.ts`): VAT rate, discount value with fixed or percent type and before or after timing, and extra charges in the existing `ExtraCharge` shape. Defaults are zero and empty, matching new-quotation form defaults, so default behavior applies no adjustment.

- VAT mapping: global rate persisted to the quotation `vat` column and calculation inputs, using existing VAT semantics.
- Discount mapping: value persisted to the `discount` column with existing type and timing keys in `custom_fields` plus calculation inputs, preserving the unset and zero distinction through explicit user entry.
- Additional charges mapping: normalized through `normalizeExtraCharges` into `custom_fields.extraCharges`, supporting label, value, and taxable flags.
- Totals derive from existing `computeDocument` authority over transferred selling prices plus options.
- Existing mapping untouched: items, SP to unit price, groups, order, descriptions, make, quantities, units, images, exclusions, lineage, and totals behavior verified unchanged by the untouched prior tests.

## Workstream 3: Rejected Implementation Removed

Deleted: `src/components/pdf/templates/CpsSchedule.tsx`. Removed: `generateCpsPdf` and `CpsPdf*` types from the shared pipeline. Rewrote `src/domain/cps/pdfDownloadHandler.ts` for the new architecture. Removed the old download wiring it referenced. Verified by repository search that no `generateCpsPdf`, `CpsSchedule`, or `CpsPdfModel` reference remains outside the removal-guarding tests. Invoice and quotation rendering untouched.

## Workstream 3: PRD Architecture Implemented

The PRD mandates pdfcn Forme with prepared data, a dedicated CPS template, document-font-only customization, portrait A4 first-class, and view and PDF parity over one prepared model. Installed `@formepdf` packages plus in-repo proofs provided the working pattern (native Table, Row, Cell with repeating headers, `renderDocument` to bytes, Helvetica standard fonts).

- `src/components/pdf/forme/CpsFormeDocument.tsx`: native Forme document with header and brand block, bill-to and site blocks, grouped schedule table with per-group selling subtotals, closing totals, notes, and fixed footer with number and page count. It renders prepared strings only and imports no calculation module.
- Shared pipeline reuse: `generateCpsFormePdf` uses the existing composite delivery, feedback bus, and filename sanitation. No parallel framework.
- One template connected. No registry change was required.
- Data authority: the handler prepares identity, parties, site, notes, rows, group subtotals, and totals exclusively through `computeCpsTotals` and `computeCpsRowEconomics`. CP appears only as a per-row cost figure inside the CPS commercial schedule, consistent with the PRD rule that CP renders in CPS output and never in converted quotations.
- Photography: company logo and item photos embed as data URIs resolved best-effort at download time, following the proof pattern.
- Fonts: Helvetica standard family. The customization policy default records Inter, but no shippable Inter bytes exist in the repository and the proof documents remote-byte fragility, so v1 renders the universally available standard family rather than depending on network fonts. This limitation is explicit below.
- Download convergence: action-row Download and the floating FAB both call the same `onDownload` authority with downloading guards. FAB geometry and bottom navigation untouched.

## Workstream 3: PRD Divergences Documented

- Column-visibility-aware PDF columns (PRD getPdfColumns rule) are future work; v1 renders the fixed commercial column set.
- Landscape orientation is future work; portrait A4 is first-class now.
- Custom font selection applies when a shippable font pipeline exists; Helvetica renders until then.

## Workstream 4: BOQ Default Root Cause

Active code resolved the CPS default from exactly two places, both reading stale BOQ identity: `DEFAULT_PREFIXES.cps_sheets` and the `getNextCpsNumber` fallback. The Settings UI, reset dialog, preview, fallback reads, and cursor clearing all derive from the default map, so one authoritative change repairs every surface. No database default stores a prefix value; the hosted check constraint is pattern-based and accepts any valid value, so no migration is required.

## Authoritative CPS Default After Repair

`CPS` in both locations, plus the matching standard-document line. Reset preview reads `CPS-000001` through the existing template. New unset-tenant allocation starts the CPS family with occupied skip per the standard contract. Custom values such as `SASCPS` keep working through the unchanged resolve path. Historical `BOQ` and `SASBOQ` numbers are untouched in code, queries, and storage.

## Whether Migration Was Required

No. Verified by schema inspection: no value default exists to migrate, and the format check is value-agnostic.

## Verification Results

- `bun run typecheck`: passed.
- Targeted suites: 193 passed, 0 failed across conversion (14, including numbering authority and 6 options tests), PDF (5 Forme tests), prefix (5), save serialization, row operations, normalize, markup, import, hooks order, list date, markup presentation, identity, calculation authority, numbering, and calculations.
- `bun run audit:load`: ran. Findings are pre-existing elsewhere. The conversion payload, Forme template, and narrowed selects introduce no new finding.
- `git diff --check`: passed (line-ending notices only).
- `git status`: exact scope confirmed (workstream files plus tests and this report; concurrent sessions own the remaining entries, untouched).
- Supabase push: none required and none performed. No manual hosted edits.
- Explicit confirmation: `bun run build` was not executed.
- Runtime validation requirement: live conversion with options, live CPS PDF download, and live prefix reset remain human validation on device.

## Remaining Runtime Validation Requirements

- Convert a populated CPS with and without options and confirm numbering, totals, groups, and exclusions on the created quotation.
- Download a CPS PDF on web and native and confirm layout, pagination, photos, totals parity with the view, and filename.
- Reset a non-production CPS prefix and confirm the `CPS-000001` preview and fresh sequence without touching history.
