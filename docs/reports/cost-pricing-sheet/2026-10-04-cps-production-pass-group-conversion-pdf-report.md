# CPS Production Pass Report: Group Rollback, Conversion Integrity, Native PDF

This report was written by Muse Spark on 2026-10-04 via OpenCode. It continues work handed over from a stuck Codex session whose partial conversion draft was completed and verified here.

## Objective

Three independent objectives: revert the Pass 5 group breakout regression, repair CPS to Quotation conversion data integrity, and implement native CPS PDF rendering with one connected template.

## Files and Material Inspected

- `AGENTS.md`, `docs/PROJECTSKILLINDEX.md`, `supabase/database-workflow.md`.
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md` (§5 price ownership, §6 compatibility contract, §7 columns).
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md` (§5 pdfcn Forme decision and rendering rules, §6 view-PDF parity).
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-composition-pass-5.md` (breakout description).
- `src/pages/ViewCps.tsx`, `src/pages/view-cps-actions.ts`, `src/domain/cps/conversion.ts` (stuck-session draft).
- `src/domain/quotation/normalize.ts`, `src/domain/quotation/previewModel.ts`, `src/components/quotation/quotationFormUtils.ts`, `src/hooks/useQuotationSave.ts`.
- `src/domain/invoice/factories.ts` (`toDbItem`), `src/domain/documentConversion.ts`.
- `supabase/migrations/20260520090002_quotations.sql` (both table contracts).
- Hosted probes: converted quotation `QTN-000001` parent (populated, zero totals) with zero `quotation_items` rows.
- PDF: `src/components/pdf/index.ts`, `types.ts`, `industryAdapter.ts`, `templates/Minimal.tsx`, `src/lib/pdf/` pipeline, `src/domain/pdf/customization/` (including `cps.ts`), `src/components/document-view/shared/FloatingDownloadButton.tsx`.

## Skills Used

Skills used: karpathy, react-dev, typescript-advanced-types, pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

---

## Workstream 1: Group Container Rollback

Investigation result: there is nothing to revert. Repository search proves `--cps-group-breakout` never landed in any commit (`git log -S` empty) and does not exist in the working tree. Current group shell styling is plain flow layout (`.cps-view-wrap .cps-grp { margin-top: 18px }`) with no negative margins. The surviving `--cps-content-inset` variable and the negative-margin rule on `.cps-view-wrap .cps-doc-actions` belong to the accepted action-row composition, not the rejected group breakout.

No code changed for this workstream. Group membership, count, subtotal single-set authority, order, titles, nomenclature removal, monogram removal, and calculations are intact and covered by existing suites.

## Workstream 2: Conversion Root Cause

Observed failure: converted quotation `QTN-000001` persisted with title and client but `subtotal 0`, `total 0`, and zero `quotation_items` rows. The user-facing Untitled and ₦0 row is the quotation empty and placeholder rendering over an itemless document.

Exact loss point: `convertCpsToQuotation` fed CPS-shaped rows into the invoice-shaped `toQuotationItemRow` serializer, which spreads every input key into the insert payload. CPS-only columns (`section_title`, `specification`, `make_brand`, `cp`, `sp`, `notes`, `install_rate_taxable`) are not columns of `quotation_items`, so the hosted insert failed. The parent insert and cursor advance had already committed, leaving the orphaned empty quotation. Both Convert triggers already converged on this one function, so both were affected identically.

## Workstream 2: Repair

- `src/domain/cps/conversion.ts`: completed and corrected the handover draft into `mapCpsToQuotation`, which emits only valid `quotation_items` columns in CPS source order (group headers in place, members by `group_id`, non-contiguous order preserved). CPS SP becomes `unit_price`; CP, notes, and site or project never transfer through any channel, including `custom_data`, which is scrubbed against a forbidden-key list. Totals derive through `computeDocument` over transferred prices. Client maps from snapshot with display-name fallback. Group metadata, lineage trail, fresh number, current issue date, and null notes, terms, and project complete the payload.
- `src/pages/view-cps-actions.ts`: `convertCpsToQuotation` now uses the mapper, keeps existing numbering and cursor behavior, and deletes the created parent if the row insert fails, so a failed conversion can no longer orphan an empty quotation.
- `src/pages/ViewCps.tsx`: passes the CPS document directly instead of pre-mapping rows.
- The invoice-shaped serializer stays untouched for its legitimate RFQ and invoice callers.

## Source to Target Conversion Field Mapping

Description, sub-description (from CPS specification), make (from CPS make_brand), quantity, unit, SP to unit_price, VAT, discount, install rates and flags, image URL, row kind (section to group_header), group id, group name, and client identity and snapshot transfer. Amount recomputes as quantity times unit price per the quotation convention. Title renames to quotation title. Numbering allocates fresh. Lineage writes the source trail.

## Explicit Exclusion Mapping

CP never maps and is scrubbed from custom data. Notes persist as null. Site and project persist as null project and absent metadata. The serialized payload was asserted to contain no CP key, no site text, and no notes text.

## Group Conversion Behavior

Headers emit in source position with titles and self-identifying group keys. Members keep their `group_id` references wherever they stand. The quotation domain resolves membership by `group_id` on load, so clustering was unnecessary and source order is preserved.

## Persistence Path

Mapper, parent insert, cursor advance, row insert with compensating parent cleanup. No migration was required. Existing schemas already support the contract.

## Whether Any Schema Change Was Required

No. The `quotation_items` and `quotations` contracts support every mapped field. No migration created or pushed.

## Workstream 3: CPS PDF Architecture Discovered

Production PDF rendering is the legacy React-PDF pipeline: shared generator, delivery, fonts, and feedback in `src/lib/pdf`, template switch with commercial templates, and per-family `generate*Pdf` entry points. The Forme packages are installed but unintegrated (proofs only). The PRD mandates Forme eventually, but building Forme integration here would create the parallel framework this task forbids, against POC-documented gaps. The repair extends the working production pipeline instead, which the task permits through shared-infrastructure reuse. `PdfDocumentType` already anticipates `cps_sheets`.

## CPS Renderer Integration Point

`generateCpsPdf` in `src/components/pdf/index.ts`, modeled on `generateQuotationPdf`: shared fonts, generator, composite delivery, and feedback bus, with the CPS template constructed directly and no commercial adapter in between (the adapter hardcodes invoice and quotation labeling).

## Initial CPS Template Identity

`CpsSchedule` in `src/components/pdf/templates/` (registered by direct construction, no registry change needed for a single template): A4 portrait header with company identity and document meta, bill-to and site blocks, grouped schedule table with per-group selling subtotals, closing totals, optional notes, and fixed footer with number and page count.

## CPS PDF Data and Calculation Authority

`buildCpsPdfModel` in `src/domain/cps/pdfDownloadHandler.ts` prepares identity, parties, site, and notes from saved CPS and settings state, plus rows, group subtotals, and totals exclusively through `computeCpsRowEconomics` and `computeCpsTotals`. The template formats values only and imports no calculation module. Document font flows from the existing CPS customization policy with Inter default. Item photos render when present through the established image pattern.

## Download Wiring

`ViewCps` resolves settings and CPS font policy, exposes `onDownload` with a downloading guard, and threads it through view props to the shared action-row Download button and the download FAB (both previously inert, now connected with disabled states). Edit, Share, theme, More, customize, rail, navigation, and FAB geometry are unchanged.

## Exact Group-Width Rollback Performed

None required. Evidence above shows the rejected rule never landed.

## Tests Added and Updated

- `src/tests/critical/cpsConversion.test.js` (6 tests): populated mapping, exact-column allowlist against the migration schema, group and membership order, SP to price with quotation-authority totals, exclusion proof across all channels, and no Untitled collapse.
- `src/tests/critical/cpsPdf.test.js` (5 tests): model identity and parties, engine-equal rows and subtotals, template calculation ban, generator registration through dynamic import, and download-surface convergence.
- No existing test modified.

## Verification Results

- `bun run typecheck`: passed.
- Targeted suites: 180 passed, 0 failed across conversion, PDF, save serialization, row operations, normalize, markup, import, hooks order, list date, markup presentation, identity, calculation authority, numbering, and calculations.
- `bun run audit:load`: ran. Findings are pre-existing elsewhere. The narrowed conversion payload and unchanged query shapes introduce no new finding.
- `git diff --check`: passed (line-ending notices only).
- `git status`: this task owns modified `view-cps-actions.ts`, `ViewCps.tsx`, `pdf/index.ts`, `pdf/types.ts`, `CostPricingSheetViewPresentations.tsx` (download props only), plus new `conversion.ts` (completed handover draft), `CpsSchedule.tsx`, `pdfDownloadHandler.ts`, two test files, and this report. All other entries belong to concurrent tasks and were not touched.
- Supabase push: none required and none performed. No manual hosted edits.
- Explicit confirmation: `bun run build` was not executed.

## Remaining Limitations

- Runtime phone validation was not performed: a live conversion of a populated CPS and a live CPS PDF download still need human confirmation on device.
- The pre-existing orphaned empty quotation from the bug era was left in place; historical documents were not modified.
- PDF column-visibility awareness (PRD rule on `getPdfColumns`) is future work; the first template renders the fixed commercial column set.
- Landscape orientation is future work; portrait A4 is first-class now.
- Concurrent sessions are editing nearby view files. Every edit in this task was re-read immediately before writing, but a final human review of the combined tree is recommended before commit.
