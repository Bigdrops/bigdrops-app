# PDF Rendering Migration Standards Reconciliation Report

This report was written by Replit Agent on 2026-09-07 via the Replit workspace.

## Objective

Reconcile the PDF Rendering Migration PRD with every standard file under
`docs/standard/`.

The PRD file exists as:

`docs/prd/pdf-rendering-migration/draft.md`

The task referred to `Draft.md`. The repository uses the lowercase filename
`draft.md`. No file was renamed.

## Scope

This report covers:

- PRD sections 8, 9, 10, 11, 14, 16, and 21.
- All 15 regular files directly under `docs/standard/`.
- Current React-PDF entry points and migration evidence.
- Standards that must remain authoritative.
- Standards that need a renderer-neutral rewrite.
- Missing evidence that blocks implementation.

This report does not implement the migration.

## Files changed

- Added `docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md`.
- No application file changed.
- No PRD file changed.
- No standard file changed.
- No dependency, configuration, migration, or database file changed.

## Skills used

Skills used: reading-uploaded-files, pdf-rendering-correctness, react-pdf, writing-clearly-and-concisely

Subagent used: pdf-standards-auditor, pdf-pipeline-auditor

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Repository baseline

The repository does not contain a pdfcn implementation or dependency.

Evidence:

- `package.json:58` still contains `@react-pdf/renderer`.
- No `pdfcn`, `pdfcndev`, Takumi, or Forme implementation was found.
- `docs/prd/pdf-rendering-migration/Prerequisites.md:12-13` leaves
  standards factoring and the current baseline unchecked.
- `docs/prd/Pdf-print-prd/PDF-Migration-Progress.md:6-41` leaves the
  infrastructure, document-family migrations, and cleanup unchecked.

The current commercial path is React-PDF based:

- `src/components/pdf/index.ts:33-113` selects templates, prepares the
  generator, and delivers the result.
- `src/components/pdf/renderers/PdfRenderer.tsx:1,49-52` uses
  `@react-pdf/renderer`.
- `src/lib/pdf/DefaultPdfGenerator.ts:8-18` calls `pdf(element).toBlob()`.
- `src/components/document-view/invoice/invoicePdfActions.ts:38,96-192`
  starts invoice PDF generation.
- `src/domain/quotation/pdfDownloadHandler.ts:35-40,56-165` starts
  quotation PDF generation.

Other direct React-PDF paths include Waybill, CSR, BOQ, RFQ, Receipt, and
Project documents. The following paths do not all use the same prepared-model
contract:

- Commercial documents use `PdfDocumentModel` and
  `adaptCommercialDocumentData`.
- Waybill has a prepared render model in
  `src/domain/waybill/engine/assembly.ts`.
- The current evidence is insufficient to prove that every BOQ/RFQ path uses
  a canonical prepared model.

## Current pipeline findings

### Customisation

The current commercial path has a pure customisation resolver:

- `src/domain/pdf/customization/resolver.ts:1-98`
- `src/components/document-view/invoice/invoicePdfActions.ts:12,188`
- `src/domain/quotation/pdfDownloadHandler.ts:10,40,161`

The current resolver supports accent colour and document font. It bridges the
resolved result into the existing `PdfDesignPreset` model. It is not a pdfcn
implementation.

The PRD correctly requires renderer-independent configuration in
`draft.md:259-278`.

### Orientation

The current commercial path already carries orientation as model data:

- `src/components/pdf/types.ts:53-56`
- `src/components/pdf/table.ts:28-33,123-185`
- `src/components/document-view/invoice/invoicePdfActions.ts:81-85`
- `src/domain/quotation/pdfDownloadHandler.ts:42-46`
- `src/components/pdf/renderers/PdfRenderer.tsx:21-52`

The current tests verify template orientation and preview CSS:

- `src/tests/pdf/pageLayoutPipeline.test.js:40-60`

These tests do not prove the physical PDF dimensions or pdfcn behaviour.
The PRD requirements are in `draft.md:282-310`.

### Pagination

The current React-PDF templates use renderer controls such as `fixed` and
`wrap={false}`. Examples exist in:

- `src/components/pdf/templates/Ledger.tsx:71-88,180-208,410-411`

The Waybill render-model tests cover pagination policy data:

- `src/tests/critical/waybillRenderEngine.test.ts:145-150`
- `docs/reports/waybill/waybill-render-engine-phase3.md:19-33,41-45`

The repository does not prove that the target pdfcn architecture supports the
same controls. The PRD requirements are in `draft.md:313-330`.

### “1 Page” mode

No generalized one-page mode exists in the repository.

Evidence:

- Commercial generation exposes `compact`, not `onePage`, in
  `src/components/pdf/index.ts:17-22,96-110`.
- `src/components/pdf/renderers/PdfRenderer.tsx:4-19` receives `compact`,
  but no fit-to-page, scale, or controlled reflow implementation is present.
- `src/components/waybill/blankWaybillTemplate.tsx:3-5,258-261` has a
  fixed portrait A4 document, but this is not a generalized one-page mode.

The PRD defines one-page semantics in `draft.md:334-370`, but it does not
define measurable minimum readability limits or a physical-output test
contract.

### Existing pipeline and delivery

The current code contains:

- `src/components/pdf/industryAdapter.ts:309-460`
- `src/components/pdf/table.ts:116-185,188-234`
- `src/lib/pdf/PdfGenerator.ts`
- `src/lib/pdf/PdfDelivery.ts`
- `src/lib/pdf/PdfAsset.ts`
- `src/lib/pdf/DefaultPdfGenerator.ts`
- `src/lib/pdf/WebPdfDelivery.ts`
- `src/lib/pdf/NativePdfDelivery.ts`
- `src/lib/pdf/CompositePdfDelivery.ts`

These abstractions are React-PDF-backed. They are not pdfcn adapters.

The blank Waybill path bypasses the shared generator and delivery path:

`src/components/waybill/blankWaybillTemplate.tsx:7,256-314`

The PRD correctly requires a family-by-family pipeline audit in
`draft.md:420-448`. The migration plan must include this bypass as an
explicit migration boundary.

## Standards reconciliation table

| Standard File | Is it used by React-PDF pipeline today? (YES/NO/UNKNOWN) | Does the PRD require it to be factored in? (YES/NO) | Verdict: KEEP / REWRITE / RETIRE / MERGE | Reason with evidence (quote relevant PRD § or standard line) |
|---|---|---|---|---|
| `docs/standard/audit-trail-standard.md` | NO | YES | KEEP | This standard governs field diffs and domain events, not PDF rendering. Lines 57-82 define field-diff rules and lines 86-164 define event rules. PRD §16, `draft.md:476-496`, requires audit behaviour to remain unchanged. |
| `docs/standard/Commercial Party Architecture Standard.md` | NO | YES | REWRITE | The file contains only “coming soon” at line 1. PRD §16, `draft.md:480-492`, protects customer and supplier data, but the repository has no authoritative commercial-party rules to map. Define the party contract before migration. |
| `docs/standard/docs-commit-workflow-standard.md` | NO | NO | KEEP | This file governs documentation commits and secret scanning at lines 21-24. It does not define PDF behaviour. It remains active but is outside the renderer migration scope. |
| `docs/standard/document-column-standard.md` | YES | YES | KEEP | Lines 29-41 define column visibility and schema rules. Lines 184-207 define PDF column order, row number `#`, cell mapping, and persistence. This maps directly to the current table resolver and PRD §§6, 8, and 14. |
| `docs/standard/document-form-consolidation-standard.md` | NO | NO | KEEP | Lines 62-68 define FormPage orchestration and thin route delegators. The PRD is a rendering migration, not a form architecture migration. Preserve this standard without copying it into pdfcn. |
| `docs/standard/document-image-upload-policy.md` | NO | NO | KEEP | Lines 58-74 define accepted image types and shared validation. The rule is an input policy, not a PDF renderer rule. Preserve it because logos and attachments still depend on valid input files. |
| `docs/standard/document-save-orchestration.md` | NO | YES | KEEP | Lines 92-104 define save order, and lines 164-171 prohibit calculation inside save strategies. PRD §16, `draft.md:476-496`, prohibits business-logic changes. The migration must consume saved data and must not move save or calculation logic into PDF code. |
| `docs/standard/document-transformation-standard.md` | NO | YES | KEEP | Lines 23-32 protect saved identity, and lines 105-133 define duplicate behaviour. PRD §§12 and 16 require prepared data and unchanged business semantics. PDF migration must not create a second transformation or financial model. |
| `docs/standard/fab-standard.md` | NO | NO | KEEP | Lines 15-30 and 98-112 define application FAB presentation. The PRD does not change application navigation or action controls. |
| `docs/standard/json-import-standard.md` | NO | NO | KEEP | Lines 9-42 define strict import validation, and lines 124-201 define schema freeze and custom-column import behaviour. The PRD does not change import behaviour. |
| `docs/standard/lifecycle-ownership-standard.md` | UNKNOWN | YES | KEEP | Lines 54-79 and 402-415 require rendering components to remain presentation-only. PRD §§3, 4, and 12, `draft.md:118-154,374-398`, require the canonical model and business layer to remain renderer-independent. Current code evidence does not prove complete compliance for every document family, so usage is UNKNOWN. |
| `docs/standard/pdf-customization-extension-standard.md` | YES | YES | REWRITE | Lines 124-140 make the resolver authoritative, while lines 241-271 bind fonts and templates to `@react-pdf/renderer`. PRD §8, `draft.md:259-278`, requires renderer-independent customisation. Preserve the capability, policy, resolver, and preset concepts; rewrite the renderer-bound contract. |
| `docs/standard/pdf-migration-standard.md` | YES | YES | REWRITE | Lines 3-5 and 24-28 require `DefaultPdfGenerator`, `CompositePdfDelivery`, and `@react-pdf/renderer`. PRD §§1 and 17, `draft.md:9-33,500-518`, require gradual retirement of React-PDF. Replace the React-PDF mandate with a renderer-neutral migration contract and retain the no-business-change rules. |
| `docs/standard/prefix-engine-settings-standard.md` | YES | YES | KEEP | Lines 9-12, 115-161, and 195-208 protect runtime numbering and collision handling. PRD §16, `draft.md:480-492`, explicitly protects document numbering. The blank Waybill PDF path also consumes a number before download. |
| `docs/standard/receipt-standard.md` | YES | YES | REWRITE | Lines 31-73 and 226-239 define immutable receipt identity and snapshots. Lines 380-406 and 484-496 bind the receipt template to `@react-pdf/renderer`. Preserve the legal, snapshot, void, numbering, and audit rules; rewrite only the renderer-specific clauses. |

## A. Standards that map to the new pdfcn architecture

The following standards must remain authoritative for the target architecture:

### Keep without renderer changes

- `audit-trail-standard.md`
  - Audit events and field diffs remain business history.
  - The renderer must not create a second audit mechanism.
- `document-column-standard.md`
  - Column visibility, order, row numbering, and PDF cell mapping remain
    canonical.
- `document-save-orchestration.md`
  - PDF migration must not move persistence or financial calculation into the
    renderer.
- `document-transformation-standard.md`
  - PDF generation must not mutate saved identity, lineage, items, or pricing.
- `lifecycle-ownership-standard.md`
  - The domain owns calculations and invariants.
  - The renderer receives prepared data.
- `prefix-engine-settings-standard.md`
  - PDF downloads must preserve numbering, retry, and blank-download logging
    rules.

### Rewrite for pdfcn

- `pdf-customization-extension-standard.md`
  - Keep the capability, policy, resolver, defaults, and presentation-model
    rules.
  - Remove the requirement that fonts and templates use React-PDF APIs.
  - Define the pdfcn equivalent of `PdfDesignPreset`.
- `pdf-migration-standard.md`
  - Keep delivery, no-business-change, and output-preservation goals.
  - Replace the mandatory React-PDF generator with a renderer-neutral
    interface.
  - Define how React-PDF and pdfcn coexist during the phased migration.
- `receipt-standard.md`
  - Keep receipt identity, snapshot immutability, void lifecycle, numbering,
    and audit events.
  - Replace the React-PDF template requirement with a renderer-neutral
    `ReceiptPreviewData` contract.

### Missing authority

`Commercial Party Architecture Standard.md` is not an active standard. It
contains only `coming soon`. The migration cannot claim full commercial-party
compliance until the standard defines seller, customer, supplier, and party
mapping rules.

## B. React-PDF-specific standards or workarounds

The repository provides evidence for these React-PDF-specific concerns:

1. `pdf-migration-standard.md` requires React-PDF infrastructure.
   This is a renderer contract, not a core business rule. It must be rewritten
   before pdfcn implementation.

2. `pdf-customization-extension-standard.md` requires React-PDF font
   registration and React-PDF template boundaries.
   The resolver and capability policy are reusable. Font registration and
   template API rules are renderer-specific and must be replaced.

3. `receipt-standard.md` requires React-PDF for receipt generation.
   Receipt snapshot and audit rules are business rules. The PDF library
   requirement is renderer-specific and must be replaced.

4. Current templates use React-PDF pagination controls such as `fixed` and
   `wrap={false}`. This is confirmed in
   `src/components/pdf/templates/Ledger.tsx:71-88,180-208,410-411`.
   These controls are implementation details. They may be retired only after
   pdfcn tests prove equivalent pagination and content preservation.

5. Current orientation handling passes orientation to React-PDF templates and
   mirrors it in preview CSS. This is confirmed by
   `src/components/pdf/renderers/PdfRenderer.tsx:21-52` and
   `src/tests/pdf/pageLayoutPipeline.test.js:40-60`.
   The orientation data and business meaning must remain. The React-PDF
   implementation may change.

No standard may be classified as a React-PDF workaround only because its
filename contains “PDF”. The classification above uses repository evidence.

## C. Core business standards

These rules are renderer-independent and must not change during the migration:

- Tax, totals, discounts, and VAT calculations.
- Document numbering and collision handling.
- Customer, supplier, seller, and commercial-party data.
- Payment and receipt data.
- Document status and approval data.
- Audit events and field-diff history.
- Permissions and Supabase behaviour.
- Saved document identity and lineage.
- Receipt identity, snapshots, void rules, and immutable monetary values.
- Column visibility, ordering, row numbers, and custom-column schema rules.
- Prepared-data ownership and the rule that rendering components do not
  calculate or persist business values.

The PRD states these regression protections in `draft.md:476-496`.
The lifecycle ownership standard states the renderer boundary in
`docs/standard/lifecycle-ownership-standard.md:402-415`.
The receipt snapshot rules are in `docs/standard/receipt-standard.md:51-73`.

## Required amendments before implementation

The PRD is not ready to enter implementation without these amendments:

1. **Resolve the renderer-standard conflict.**
   Rewrite `pdf-migration-standard.md` so it no longer mandates
   `@react-pdf/renderer`, while preserving its delivery, output, and
   no-business-change requirements.

2. **Split renderer-neutral customisation from React-PDF details.**
   Rewrite `pdf-customization-extension-standard.md` to define the target
   preset and font/component contract without requiring React-PDF APIs.

3. **Rewrite the receipt renderer clause.**
   Keep receipt snapshot, numbering, void, audit, and monetary-value rules.
   Replace the React-PDF-only generation requirement with a renderer-neutral
   preview and template contract.

4. **Create an authoritative commercial-party standard.**
   The current file is only a placeholder. Define the seller, customer,
   supplier, party identity, and canonical-model mapping rules before mapping
   document families.

5. **Add a complete standard-to-target mapping matrix.**
   The PRD must identify each active standard, its authoritative rules, its
   target pdfcn owner, and whether the rule is preserved, rewritten, or
   retired after Phase 4. The current prerequisite at
   `docs/prd/pdf-rendering-migration/Prerequisites.md:12` correctly identifies
   this gate, but the PRD does not complete it.

6. **Define the migration boundary for every direct React-PDF path.**
   Include Invoice, Quotation, Waybill, CSR, BOQ, RFQ, Receipt, Project, and
   the blank Waybill download path. The current repository has multiple
   delivery paths, including a direct blank Waybill download.

7. **Add physical-output acceptance tests.**
   The PRD must require tests for:
   - physical page count;
   - A4 portrait dimensions;
   - A4 landscape dimensions;
   - long tables;
   - repeating headers;
   - keep-together blocks;
   - totals and footer placement;
   - content preservation in one-page mode;
   - no overlap or hidden required content.

8. **Define measurable one-page limits.**
   Specify minimum readable text size, minimum spacing, maximum scale reduction,
   and the required fallback when one-page output violates those limits.
   `draft.md:346-370` defines priorities and forbidden omissions but does not
   define measurable acceptance limits.

9. **Define the pdfcn dependency and backend.**
   The PRD names pdfcn but the repository has no package, version, adapter, or
   supported backend. Phase 1 must specify these before implementation.

10. **Reconcile historical documentation with current paths.**
    The architecture report uses historical `pdf-new` paths, while the current
    implementation uses `src/components/pdf/`. The migration baseline must use
    current paths and current runtime evidence.

## Overall Reconciliation Verdict

**ALIGNED WITH REQUIRED AMENDMENTS**

The PRD has the correct strategic direction:

- keep business data and calculations outside the renderer;
- use a canonical document model;
- migrate by document family;
- preserve existing documents during migration;
- retire React-PDF only after all consumers are removed.

The PRD is not implementation-ready because:

- the active migration standard mandates React-PDF;
- the customisation and receipt standards contain React-PDF-specific clauses;
- the commercial-party standard is a placeholder;
- pdfcn is not present in the repository;
- the migration does not yet have physical-output and one-page acceptance tests;
- the current pipeline has multiple direct React-PDF paths and delivery
  exceptions.

The amendments listed in the previous section are the only required changes
identified by this reconciliation. No application code, PRD, standard,
configuration, dependency, migration, or database data was changed as part
of this audit.

## Verification result

- PRD read: passed using `docs/prd/pdf-rendering-migration/draft.md`.
- Standards inventory: passed; 15 regular files under `docs/standard/` were
  inspected.
- Current PDF pipeline audit: passed as a read-only repository inspection.
- Application files changed: none.
- Database, migration, and configuration changes: none.
- `git status` before report creation: only pre-existing untracked
  `attached_assets/`.
- Test commands: not run because this task is a read-only documentation audit.
- `bun run build`: skipped per repository policy and task scope.

## Risks or limitations

- The repository does not contain the target pdfcn implementation, so target
  runtime behaviour is UNKNOWN.
- Existing historical reports may describe paths that no longer exist.
- Preview and model tests do not prove physical PDF page dimensions or page
  counts.
- The current evidence does not prove that every BOQ/RFQ renderer consumes a
  canonical prepared model.
- The placeholder commercial-party standard prevents complete party-architecture
  reconciliation.

## Deferred work

- Implementing pdfcn infrastructure.
- Rewriting the three renderer-bound standards.
- Defining the commercial-party architecture standard.
- Adding physical-output and one-page regression tests.
- Migrating document families.
- Removing React-PDF after Phase 4 validation.