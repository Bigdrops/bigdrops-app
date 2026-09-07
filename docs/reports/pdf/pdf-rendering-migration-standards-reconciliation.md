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

## Direct comparison with upstream pdfcn

The upstream repository was audited after the initial BIGDROPS-only
reconciliation.

Source:

- Repository: `https://github.com/shadcn-labs/pdfcn`
- Branch: `main`
- Audited commit: `88ca522c13dff7cd13d05c208fa47f970d32fd8c`
- Commit date: 2026-09-07
- Commit subject: `feat: enhance PDF preview for mobile users with download option`

### What pdfcn is

The upstream repository is a private Next.js documentation and registry
project. It is not a single drop-in `pdfcn` runtime package.

Evidence:

- `README.md:5-10` describes pdfcn as customizable React PDF components built
  on Takumi and Forme.
- `README.md:26-34` lists two rendering bases, registry workflow,
  components, and blocks.
- `package.json:16-53` includes `takumi-pdf`, `@takumi-rs/helpers`,
  `@formepdf/core`, and `@formepdf/react`.
- The registry contains separate `registry/bases/takumi/` and
  `registry/bases/forme/` trees.
- The documented installation copies source through the shadcn registry, for
  example `content/docs/blocks/takumi/invoice-classic.mdx:19-40`.

BIGDROPS must therefore choose a renderer base and copy or adapt the required
source. Adding a package named `pdfcn` is not the complete integration.

### Rendering entry points

The upstream repository demonstrates two server-side paths:

- Takumi: `app/api/pdf/takumi/route.tsx:4-5,26-38` uses
  `fromJsx()` and `render()` from `takumi-pdf`.
- Forme: `app/api/pdf/forme/route.tsx:1-2,23-33` uses `serialize()` and
  `renderPdf()`.

The routes render named demo components. They do not define a BIGDROPS
document-generation service, Supabase adapter, invoice repository boundary,
delivery abstraction, audit integration, or migration coexistence contract.

### Data and financial-logic comparison

The sample invoice contract is much smaller than the BIGDROPS invoice model:

- `registry/bases/takumi/blocks/invoice-classic/invoice-classic.types.ts:1-32`
  includes invoice identity, company fields, a `billTo` object, items, a
  summary, payment terms, and notes.
- It does not define BIGDROPS column configuration, seller/supplier party
  identity, discounts, VAT line semantics, WHT, payment ledger state,
  attachments, audit metadata, document lineage, or permissions.
- `registry/bases/takumi/blocks/invoice-classic/invoice-classic.tsx:159-166`
  calculates each line total with
  `item.quantity * item.unitPrice` and `toFixed(2)` inside the render
  component.

That line-total calculation conflicts with BIGDROPS financial ownership rules.
BIGDROPS must prepare every monetary value before the pdfcn component receives
it. The upstream invoice block can be used as a visual starting point only. It
must not be adopted unchanged.

### Theme and customisation comparison

pdfcn provides useful design-system primitives:

- `registry/types/pdf-themes.ts:124-132` defines primitive scales.
- `registry/types/pdf-themes.ts:142-223` defines colour, typography, spacing,
  and page tokens.
- `registry/types/pdf-themes.ts:252-265` defines `PdfcnTheme`.
- `content/docs/theming/takumi/index.mdx:107-148` documents custom themes,
  A4/Letter/Legal page sizes, and portrait/landscape values.
- `registry/bases/takumi/components/theme-provider.tsx:10-34` supplies a
  theme to components.

This maps well to the BIGDROPS PDF design-system goal. It does not replace the
BIGDROPS customisation engine:

- pdfcn has no BIGDROPS capability and policy model.
- pdfcn has no document-level local-storage or tenant-settings bridge.
- pdfcn has no template-selection policy for BIGDROPS document families.
- pdfcn has no resolved `PdfDesignPreset` equivalent for the current
  BIGDROPS pipeline.

### Orientation comparison

pdfcn describes orientation in its theme type:

- `registry/types/pdf-themes.ts:217-223` permits A4, Letter, Legal, portrait,
  and landscape.
- `content/docs/theming/takumi/index.mdx:141-148` shows the same values.

The implementation evidence is incomplete:

- `registry/bases/takumi/lib/pdf-primitives.tsx:296-317` accepts `size` in
  `Page` but discards it as `_size`.
- The same `Page` primitive has no `orientation` prop.
- `examples/preview-config.tsx:47-55` sends `size: "a4"` to Takumi preview
  options but does not send a landscape option.
- The sample invoice hard-codes `<Page size="A4">` at
  `registry/bases/takumi/blocks/invoice-classic/invoice-classic.tsx:77-79`.

The theme type is therefore a useful target contract, not proof that
portrait/landscape output is wired and tested for BIGDROPS.

### Pagination comparison

pdfcn has useful low-level pagination controls:

- `registry/bases/takumi/components/page-break/page-break.tsx:4-9` maps to
  `breakBefore: "page"`.
- `registry/bases/takumi/components/keep-together/keep-together.tsx:6-16`
  maps to `breakInside: "avoid"`.
- `registry/bases/takumi/components/table/table.tsx:112-183` prevents a row
  from breaking inside.
- `registry/bases/takumi/components/table/table.tsx:239-278` supports
  variants, zebra striping, and an optional `noWrap` wrapper.
- `content/docs/components/takumi/keep-together.mdx:99-120` documents
  `minPresenceAhead`.

The evidence does not show automatic repeated table headers across physical
pages. `TableHeader` is a normal `View` at
`registry/bases/takumi/components/table/table.tsx:23-25`. The evidence also
does not show a BIGDROPS-compatible totals, footer, or long-table acceptance
suite.

### One-page comparison

No `onePage`, fit-to-page, controlled scaling, minimum-readability threshold,
or overflow fallback was found in the upstream repository.

The sample invoice footer contains the literal `Page 1 of 1` at
`registry/bases/takumi/blocks/invoice-classic/invoice-classic.tsx:192-196`.
This is sample content, not a general page-count implementation.

pdfcn does not satisfy PRD §11 by itself. BIGDROPS must define and implement
one-page behaviour above the renderer or prove that a selected backend
provides the required capability.

### Business-rule and standard comparison

The upstream repository does not contain:

- audit-trail logic;
- Supabase access;
- document numbering or collision handling;
- commercial-party architecture;
- financial calculation ownership;
- payment or receipt ledgers;
- document transformation and lineage rules;
- BIGDROPS column configuration or column resolver;
- permissions or tenant settings;
- a BIGDROPS PDF delivery service.

These rules remain BIGDROPS responsibilities. pdfcn supplies presentation
components and renderer-facing primitives. It does not replace the
renderer-independent business standards.

### Direct pdfcn verdict

pdfcn is a viable source of renderer-facing primitives, theme tokens,
page-break controls, keep-together controls, table components, headers,
footers, images, QR codes, signatures, and invoice layout examples.

pdfcn is not, by itself, a replacement for:

- the BIGDROPS canonical document model;
- the BIGDROPS financial calculation layer;
- the BIGDROPS customisation resolver;
- audit and lifecycle standards;
- payment and receipt rules;
- commercial-party rules;
- orientation and one-page acceptance testing;
- Supabase and delivery integration.

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
| `docs/standard/document-column-standard.md` | YES | YES | KEEP | Lines 29-41 define column visibility and schema rules. Lines 184-207 define PDF column order, row number `#`, cell mapping, and persistence. pdfcn's table at `registry/bases/takumi/components/table/table.tsx:112-278` is presentation-only and has no BIGDROPS column resolver, so an adapter is required. |
| `docs/standard/document-form-consolidation-standard.md` | NO | NO | KEEP | Lines 62-68 define FormPage orchestration and thin route delegators. The PRD is a rendering migration, not a form architecture migration. Preserve this standard without copying it into pdfcn. |
| `docs/standard/document-image-upload-policy.md` | NO | NO | KEEP | Lines 58-74 define accepted image types and shared validation. The rule is an input policy, not a PDF renderer rule. Preserve it because logos and attachments still depend on valid input files. |
| `docs/standard/document-save-orchestration.md` | NO | YES | KEEP | Lines 92-104 define save order, and lines 164-171 prohibit calculation inside save strategies. PRD §16, `draft.md:476-496`, prohibits business-logic changes. The migration must consume saved data and must not move save or calculation logic into PDF code. |
| `docs/standard/document-transformation-standard.md` | NO | YES | KEEP | Lines 23-32 protect saved identity, and lines 105-133 define duplicate behaviour. PRD §§12 and 16 require prepared data and unchanged business semantics. PDF migration must not create a second transformation or financial model. |
| `docs/standard/fab-standard.md` | NO | NO | KEEP | Lines 15-30 and 98-112 define application FAB presentation. The PRD does not change application navigation or action controls. |
| `docs/standard/json-import-standard.md` | NO | NO | KEEP | Lines 9-42 define strict import validation, and lines 124-201 define schema freeze and custom-column import behaviour. The PRD does not change import behaviour. |
| `docs/standard/lifecycle-ownership-standard.md` | UNKNOWN | YES | KEEP | Lines 54-79 and 402-415 require rendering components to remain presentation-only. PRD §§3, 4, and 12, `draft.md:118-154,374-398`, require the canonical model and business layer to remain renderer-independent. pdfcn's sample invoice violates this boundary by calculating line totals at `registry/bases/takumi/blocks/invoice-classic/invoice-classic.tsx:159-166`; BIGDROPS must not copy that pattern. |
| `docs/standard/pdf-customization-extension-standard.md` | YES | YES | REWRITE | Lines 124-140 make the resolver authoritative, while lines 241-271 bind fonts and templates to `@react-pdf/renderer`. pdfcn supplies theme tokens and a provider at `registry/types/pdf-themes.ts:252-265` and `registry/bases/takumi/components/theme-provider.tsx:10-34`, but no BIGDROPS capability/policy resolver. Preserve the BIGDROPS resolver and map its output into a pdfcn theme. |
| `docs/standard/pdf-migration-standard.md` | YES | YES | REWRITE | Lines 3-5 and 24-28 require `DefaultPdfGenerator`, `CompositePdfDelivery`, and `@react-pdf/renderer`. pdfcn provides Takumi and Forme source registries, not those BIGDROPS services (`app/api/pdf/takumi/route.tsx:4-38`; `app/api/pdf/forme/route.tsx:1-33`). PRD §§1 and 17 require gradual retirement, so define a BIGDROPS adapter and delivery boundary. |
| `docs/standard/prefix-engine-settings-standard.md` | YES | YES | KEEP | Lines 9-12, 115-161, and 195-208 protect runtime numbering and collision handling. pdfcn has no numbering or collision service. PRD §16, `draft.md:480-492`, explicitly protects document numbering; BIGDROPS remains the owner. |
| `docs/standard/receipt-standard.md` | YES | YES | REWRITE | Lines 31-73 and 226-239 define immutable receipt identity and snapshots. Lines 380-406 and 484-496 bind the receipt template to `@react-pdf/renderer`. No receipt block or receipt business contract was found in the pdfcn registry. Preserve the receipt data contract and rewrite the renderer clause. |

## A. Standards that map to the new pdfcn architecture

The following standards must remain authoritative for the target architecture:

### Direct mapping to pdfcn capabilities

The upstream audit supports this mapping:

- BIGDROPS design tokens can map to `PdfcnTheme`. The upstream theme has
  colour, typography, spacing, and page tokens.
- BIGDROPS page-break rules can map to Takumi `breakBefore: "page"`.
- BIGDROPS keep-together rules can map to Takumi `breakInside: "avoid"`.
- BIGDROPS table presentation can use pdfcn table components.
- BIGDROPS column visibility, ordering, row numbers, and cell-value mapping
  still require a BIGDROPS adapter.
- BIGDROPS customisation policy and resolved presets still require a BIGDROPS
  resolver. `PdfcnTheme` is a target presentation object, not the policy
  engine.
- BIGDROPS financial calculations, numbering, audit, receipts, parties,
  lifecycle, permissions, and Supabase behaviour have no equivalent in the
  upstream repository and remain BIGDROPS-owned.

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
    The upstream repository provides two bases: Takumi and Forme. Phase 1 must
    select one or define a supported coexistence model, pin the backend
    versions, define the BIGDROPS adapter, and define the generation and
    delivery boundary. The upstream project is a registry and component
    source, not a complete BIGDROPS runtime service.

10. **Keep all financial calculation outside pdfcn components.**
    The upstream invoice example calculates a line total in
    `registry/bases/takumi/blocks/invoice-classic/invoice-classic.tsx:159-166`.
    The BIGDROPS adapter must pass prepared line totals, tax, discounts, and
    totals. The migration must not copy this calculation into production
    templates.

11. **Define orientation and table-header plumbing.**
    The upstream theme type declares orientation, but the Takumi `Page`
    primitive discards its `size` argument and has no orientation prop at
    `registry/bases/takumi/lib/pdf-primitives.tsx:296-317`. The PRD must define
    the selected backend's physical page-size and orientation implementation.
    It must also define how long tables repeat headers because the upstream
    `TableHeader` is a normal `View`.

12. **Reconcile historical documentation with current paths.**
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
- upstream pdfcn exists, but it is a Takumi/Forme registry and component
  source, not a BIGDROPS integration or complete runtime service;
- the upstream invoice example performs financial calculation in the render
  component;
- upstream theme orientation is not enough to prove physical orientation
  output, and no general one-page mode exists;
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
- Upstream pdfcn audit: passed against
  `shadcn-labs/pdfcn@88ca522c13dff7cd13d05c208fa47f970d32fd8c`.

## Risks or limitations

- BIGDROPS does not contain a pdfcn integration. The upstream repository
  provides useful source components, but target runtime behaviour depends on
  the selected Takumi or Forme backend and still requires BIGDROPS adapters.
- The upstream invoice example contains renderer-side line-total arithmetic.
  This is unsafe for direct adoption under BIGDROPS financial ownership rules.
- The upstream theme declares orientation, but the inspected Takumi page
  primitive does not wire orientation and the preview route uses A4 size only.
- The upstream repository has no general one-page mode or physical-output
  acceptance suite for BIGDROPS requirements.
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