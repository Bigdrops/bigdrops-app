# PDF Renderer Capability Replacement and Standards Reconciliation Audit Report

This report was written by Replit Agent on 2026-09-07 via the Replit workspace.

## Objective

Audit whether the current React-PDF renderer can be replaced by the upstream
pdfcn component and renderer architecture without changing BIGDROPS business
behaviour or losing required PDF output capabilities.

The audit must:

- compare current React-PDF capabilities with pdfcn and its Takumi and Forme
  renderer bases;
- select and audit the strongest Invoice and Quotation benchmarks in this
  repository;
- inventory every capability needed by BIGDROPS PDF output;
- map every capability to a provider, adapter boundary, risk, and evidence;
- reconcile the result with every regular file under `docs/standard/`;
- give one of the required retirement decisions:
  `REACT-PDF CAN BE RETIRED`,
  `REACT-PDF CAN BE RETIRED AFTER SPECIFIC GAPS ARE CLOSED`, or
  `REACT-PDF CANNOT YET BE RETIRED`.

This report supersedes the earlier standards-only conclusion in this file.

The PRD file exists as:

`docs/prd/pdf-rendering-migration/draft.md`

The task referred to `Draft.md`. The repository uses the lowercase filename
`draft.md`. No file was renamed.

## Scope

This report covers:

- PRD sections 8, 9, 10, 11, 14, 16, and 21.
- All 15 regular files directly under `docs/standard/`.
- Current React-PDF entry points, prepared Invoice and Quotation paths, and
  delivery evidence.
- `IndustryTemplate` as the primary Invoice and Quotation benchmark, because it
  is the default shared commercial template and exercises the broadest common
  feature surface.
- `Ledger` as a secondary pagination benchmark, because it contains explicit
  fixed-header and keep-together behaviour.
- The pinned upstream `shadcn-labs/pdfcn` repository at commit
  `88ca522c13dff7cd13d05c208fa47f970d32fd8c`.
- Current provider capability, pdfcn source capability, underlying renderer
  capability, BIGDROPS adapter ownership, migration risk, and retirement gates.
- Standards that must remain authoritative.
- Standards that need a renderer-neutral rewrite.
- Missing evidence that blocks implementation.

This report does not implement the migration. It does not run the application,
build, typecheck, lint, tests, migrations, or dependency installation.

## Files changed

- Updated this existing report only:
  `docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md`.
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

The upstream repository is a Next.js documentation and registry project. It is
not a single drop-in `pdfcn` runtime package.

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

## Capability replacement audit

### Benchmark selection

The audit uses the same commercial template for both document families:

| Document family | Primary benchmark | Reason | Preparation path |
|---|---|---|---|
| Invoice | `src/components/pdf/presentation/industry/IndustryTemplate.tsx` | It is the default shared commercial template. It covers parties, configurable columns, grouped rows, totals, balance due, advance summaries, bank details, notes, terms, attachments, logos, item images, signatures, custom design, and fixed page footers. | `src/components/document-view/invoice/invoicePdfActions.ts` |
| Quotation | `src/components/pdf/presentation/industry/IndustryTemplate.tsx` | It uses the same broad renderer surface, while the preparation path has quotation-specific identity, validity date, client labels, and totals behaviour. | `src/domain/quotation/pdfDownloadHandler.ts` |
| Pagination secondary benchmark | `src/components/pdf/templates/Ledger.tsx` | It gives the clearest existing evidence for fixed table headers, `wrap={false}`, and long-table pagination controls. | Shared template selection path |

Invoice and Quotation are not treated as one business flow. Invoice
preparation calls `computeDocument()` and computes payment state before it builds
the PDF model. Quotation preparation uses its quotation preview model and
preview totals. Both paths then use the shared commercial model and renderer
selection. The audit therefore requires separate acceptance cases for both
families.

Both handlers contain a renderer-input fallback that calculates
`quantity * unit_price` when a row amount is missing. The authoritative
financial layer remains `src/lib/Calculations.ts`, but this fallback is a
boundary risk. A migration must pass complete prepared amounts and must not
copy arithmetic into a pdfcn component.

### Current renderer boundary

The current commercial pipeline is:

1. The Invoice or Quotation handler obtains saved document data and related
   presentation data.
2. The handler prepares `PdfDocumentModel` data, including resolved columns,
   page layout, formatted cells, totals, parties, media, and design settings.
3. `src/components/pdf/industryAdapter.ts` converts that model to the
   renderer-facing `CommercialDocumentData`.
4. `src/components/pdf/renderers/PdfRenderer.tsx` creates a React-PDF
   `Document` and passes the selected page layout to the template.
5. `src/lib/pdf/DefaultPdfGenerator.ts` calls
   `pdf(element).toBlob()`.
6. `CompositePdfDelivery` selects web or native delivery.

The target architecture must preserve steps 1 through 3 and 6 as
renderer-neutral boundaries. Only the renderer-facing adapter, template
implementation, generation backend, and physical-output tests may change.

### Provider comparison matrix

Status values in this table mean:

- **PROVEN**: the inspected source demonstrates the capability.
- **PARTIAL**: a primitive or example exists, but BIGDROPS behaviour is not
  complete.
- **UNPROVEN**: a type, documentation statement, or preview exists, but the
  physical PDF behaviour was not demonstrated.
- **NO**: the inspected source does not provide the capability.
- **BIGDROPS**: the capability belongs outside a renderer.

| Capability | BIGDROPS requirement/source | Current implementation | Current provider | pdfcn support | Underlying renderer support | BIGDROPS-owned adapter logic | Migration risk | React-PDF remains required? | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Prepared commercial model | Renderer receives prepared data only. | `PdfDocumentModel` → `adaptCommercialDocumentData`. | React-PDF template boundary. | PARTIAL; components accept simple props, not the BIGDROPS model. | Takumi/Forme accept renderer-specific trees. | Map parties, columns, rows, totals, design, attachments, and media. | High if business data is recomputed. | YES until an equivalent adapter is proven. | `src/components/pdf/types.ts`; `src/components/pdf/industryAdapter.ts`; lifecycle standard. |
| Financial calculations | `computeDocument()` and shared invoice domain remain authoritative. | Invoice calls `computeDocument()`. Quotation reuses prepared preview data. | BIGDROPS domain layer. | NO business calculation contract. The sample invoice calculates line totals. | Both bases can render values but do not own BIGDROPS semantics. | Pass line amounts, VAT, discounts, WHT, totals, and balance as values. | Critical. | NO; React-PDF is not the owner. | `src/lib/Calculations.ts`; upstream `invoice-classic.tsx:159-166`. |
| Invoice output | Preserve identity, numbering, status, payments, balance, and invoice fields. | Full Industry model plus payment financial state. | React-PDF. | PARTIAL; `invoice-classic` is a visual sample with a smaller contract. | Takumi/Forme can render an invoice tree. | Invoice-specific model preparation and payment display. | High. | YES until parity tests pass. | `invoicePdfActions.ts`; `IndustryTemplate.tsx`. |
| Quotation output | Preserve quotation identity, validity date, client fields, and quote totals. | Separate quotation handler builds the shared model. | React-PDF. | PARTIAL; no BIGDROPS quotation block or contract. | Takumi/Forme can render an invoice-like tree. | Quotation-specific labels, validity date, and preview totals. | High. | YES until separate quotation tests pass. | `quotation/pdfDownloadHandler.ts`; `types.ts`. |
| Page size | Physical A4 output. | A4 is the only model size. | React-PDF `Page`. | UNPROVEN in the inspected Takumi path; theme types list A4. | Takumi `Page` accepts `size` but discards it in the shared primitive. Forme physical sizing was not proven from source. | Convert BIGDROPS page layout to backend page dimensions. | High. | YES until physical dimensions are tested. | `PdfRenderer.tsx`; `types.ts`; upstream `pdf-themes.ts`; `pdf-primitives.tsx:296-317`. |
| Portrait orientation | Physical A4 portrait. | Model defaults to portrait and templates pass orientation. | React-PDF. | UNPROVEN; orientation is declared in theme types but not wired through the Takumi `Page` primitive. | Takumi/Forme orientation behaviour was not demonstrated in a physical output test. | Map orientation to the selected backend and preview. | High. | YES until dimensions are proven. | `IndustryTemplate.tsx`; `pageLayoutPipeline.test.js`; upstream theme and primitive. |
| Landscape orientation | Physical A4 landscape when the resolved table requires it. | `interpretPdfTableSettings()` resolves the flag and model carries it. | React-PDF. | UNPROVEN; upstream examples and preview options use A4 without landscape evidence. | No inspected physical landscape output. | Supply backend width/height or orientation explicitly. | High. | YES until dimensions are proven. | `table.ts:231-234`; `PdfRenderer.tsx`; upstream `preview-config.tsx`. |
| Preview orientation | On-screen Invoice and Quotation preview mirrors the model. | CSS exposes `data-orientation`. | Browser preview, separate from PDF provider. | Not a pdfcn runtime capability. | Depends on BIGDROPS preview implementation. | Keep one layout model for preview and PDF. | Medium. | NO; this is BIGDROPS UI behaviour. | `pageLayoutPipeline.test.js:51-60`. |
| Page breaks | Support explicit page breaks. | React-PDF page primitives and template layout. | React-PDF. | PROVEN at primitive level in Takumi. | Takumi maps `break` to `breakBefore: "page"`. Forme equivalent was not proven. | Expose a renderer-neutral break intent. | Medium. | NO after backend tests. | Upstream Takumi `PageBreak`; `pdf-primitives.tsx:183-185`. |
| Keep-together blocks | Do not split rows, group headers, group footers, totals, or signatures. | `wrap={false}` is used on rows and closing sections. | React-PDF. | PARTIAL; Takumi maps `wrap={false}` to `breakInside: "avoid"` and table rows use it. | Takumi support is source-proven; Forme equivalent is unproven. | Preserve block boundaries and minimum-ahead policy. | High for long content. | YES until physical tests pass. | `IndustryTemplate.tsx`; `Ledger.tsx`; upstream `pdf-primitives.tsx:170-190`, `table.tsx:175-183`. |
| Long-table pagination | Long Invoice and Quotation tables must paginate without overlap or data loss. | Industry rows and Ledger controls exist. | React-PDF. | PARTIAL; table and row primitives exist. | Automatic long-table behaviour is not proven for either base. | Adapt BIGDROPS rows and test physical page count/content. | Critical. | YES until acceptance tests pass. | `IndustryTemplate.tsx`; `Ledger.tsx`; upstream table source. |
| Repeated table headers | Header must appear on every physical table page. | React-PDF uses a fixed header in the Industry template. | React-PDF. | UNPROVEN. `TableHeader` is a normal `View`; no repeat-header implementation was found. | Takumi/Forme repeat behaviour was not demonstrated. | Implement or prove a fixed/repeated header strategy. | Critical. | YES. | `IndustryTemplate.tsx`; upstream `table.tsx:23-25`. |
| One-page mode | Fit content to one page only when required content remains readable. | `compact` changes styles; there is no generalized `onePage` or scale contract. | React-PDF. | NO general one-page, fit-to-page, or controlled scaling mode found. | No inspected backend capability proves this. | Define readable minimums, scaling limits, and overflow fallback. | Critical. | YES. | `PdfRenderer.tsx`; `index.ts`; upstream repository search. |
| Overflow fallback | Never hide required content when one-page output is not safe. | No generalized fallback contract. | BIGDROPS/template behaviour. | NO. | No backend evidence. | Return multi-page output or an explicit failure according to the PRD. | Critical. | YES. | PRD §11; no matching pdfcn source. |
| Fonts and custom font selection | Preserve resolved header/body font settings. | `pdfFontRegistry.ts` registers local fonts and hyphenation; design preset carries font names. | React-PDF. | PARTIAL; theme types expose font families, but no BIGDROPS font registry or font asset contract exists. | Takumi/Forme font loading and output behaviour were not proven for BIGDROPS fonts. | Resolve approved assets, register them for the selected backend, and reject unavailable fonts. | High. | YES until embedding is proven. | `src/lib/pdfFontRegistry.ts`; `industryAdapter.ts:449-458`; upstream theme types. |
| Font embedding | Fonts must be embedded or otherwise stable in downloaded PDFs. | React-PDF registration exists, but this audit did not inspect generated bytes. | React-PDF. | UNPROVEN. | No pdfcn byte-level embedding proof. | Add byte and visual acceptance tests for each supported font. | High. | YES until proven. | `pdfFontRegistry.ts`; no pdfcn embedding test found. |
| Logos | Render the canonical issuer logo. | `resolveCanonicalLogoUrl()` feeds `Image`. | React-PDF. | PARTIAL; `PdfImage` and image examples exist. | Takumi route supplies image sources. Forme image path is not proven for BIGDROPS URLs. | Normalize asset URLs/data and handle missing or failed media. | Medium. | YES until output parity passes. | `industryAdapter.ts:361-365`; upstream `pdf-image.tsx`; Takumi route image source. |
| Item images | Preserve item image, dimensions, and link label. | Industry renders image thumbnail and `Open image` link. | React-PDF. | PARTIAL; `PdfImage` exists and links are primitive-level HTML links. | Takumi uses HTML-like image/link primitives; output link/image behaviour needs proof. | Normalize canonical media and preserve cell layout. | Medium. | YES until parity passes. | `IndustryTemplate.tsx:349-362`; upstream `pdf-image.tsx`, `pdf-primitives.tsx:238-270`. |
| QR codes | Render payment or verification QR data. | No commercial QR field is present in the selected BIGDROPS model. Receipt or other paths may differ. | React-PDF where used. | PROVEN as a component example. | Takumi `PdfQRCode` uses generated vector output; Forme equivalent was not proven. | Define QR data and ownership before adopting. | Medium. | Depends on document family. | Upstream `examples/takumi/qrcode.tsx`. |
| Signatures | Render signer name, role, date, and optional signature image. | Industry renders image, line, name, and role; date is in the model type but not visibly used by this template. | React-PDF. | PARTIAL; `PdfSignatureBlock` supports text signature data. | Image and physical signature output need proof. | Map BIGDROPS signatory policy and image asset. | Medium. | YES for Invoice and Quotation until parity passes. | `types.ts:130-135`; `IndustryTemplate.tsx:640-659`; upstream signature example. |
| Metadata | Preserve document title and useful PDF metadata. | `Document` boundary has no explicit title/author/subject metadata contract in the selected commercial path. | React-PDF. | UNPROVEN; Takumi `Document` only exposes a title data attribute in the inspected primitive. | Forme metadata output was not proven. | Define metadata fields and map them to backend APIs. | Medium. | YES until byte-level metadata tests pass. | `PdfRenderer.tsx`; upstream `pdf-primitives.tsx:273-293`. |
| Page numbers | Show actual current page and total page count. | Industry uses React-PDF render callback for `Page X of Y`. | React-PDF. | PARTIAL; pdfcn has a `PageNumber` component, but the example uses literal `Page 1 of 1`. | Takumi `Text.render` is accepted by the primitive but discarded; physical total-page behaviour is unproven. | Map page-number callback or use a tested fixed footer mechanism. | Critical. | YES. | `IndustryTemplate.tsx:661-675`; upstream `pdf-primitives.tsx:203-235`; page-number example. |
| Fixed header/footer | Keep the commercial footer on every page and preserve reserved space. | Industry footer is `fixed`; Ledger has fixed header evidence. | React-PDF. | PARTIAL; pdfcn header/footer components expose `fixed` and `sticky` props. | Takumi maps fixed/sticky to CSS positioning, but repeated physical output is unproven. Forme equivalent is unproven. | Preserve footer reserve, page number, document number, and company name. | Critical. | YES until multi-page tests pass. | `IndustryTemplate.tsx:661-676`; `Ledger.tsx`; upstream page-header/page-footer sources. |
| Columns and custom fields | Preserve visibility, ordering, row number, widths, custom formulas, and cell mapping. | `interpretPdfTableSettings()` resolves columns; adapter formats prepared cells. | BIGDROPS adapter plus React-PDF template. | PARTIAL; pdfcn table has width/alignment/variants, not BIGDROPS column policy. | Both bases can render table cells. | Keep `table.ts` and adapter as canonical; map to backend widths. | High. | YES until column regression tests pass. | `src/components/pdf/table.ts`; `document-column-standard.md`; upstream table source. |
| Totals, discounts, VAT, WHT, and balance | Preserve exact prepared financial display. | Adapter reads prepared totals and formats values. | BIGDROPS domain plus React-PDF presentation. | NO BIGDROPS financial contract. | Renderer only displays values. | Pass immutable prepared values; remove row arithmetic fallbacks. | Critical. | NO as a renderer ownership matter; YES until output parity. | `industryAdapter.ts:309-448`; `Calculations.ts`; lifecycle standard. |
| Notes, terms, and rich text | Preserve normalized text and required readable content. | HTML is normalized before rendering; Industry has rich-text rendering. | React-PDF. | PARTIAL; text/list primitives exist, but BIGDROPS rich-text normalization does not. | Takumi text primitives can display strings; rich-text layout needs proof. | Keep normalization and map only safe text blocks. | Medium. | YES until visual parity passes. | `industryAdapter.ts:432-433`; `IndustryTemplate.tsx:584-612`. |
| Attachments and reference links | Preserve labels and usable links without changing document data. | Adapter combines reference links and attachments. | React-PDF links/text. | PARTIAL; link primitive exists. | Link annotation/output behaviour needs proof. | Normalize attachment URLs and labels. | Medium. | YES until link output is tested. | `industryAdapter.ts:434-437`; upstream `Link`. |
| Preview | Reuse prepared models without making preview the source of truth. | Invoice and Quotation previews are separate UI paths. | Browser UI, not React-PDF. | pdfcn docs have live previews, but that is not BIGDROPS preview integration. | Takumi/Forme preview routes are demo routes. | Keep BIGDROPS preview contract and compare it with physical output. | Medium. | NO for preview itself. | `pageLayoutPipeline.test.js`; upstream API routes. |
| Blob generation | Produce an `application/pdf` Blob for the download service. | `DefaultPdfGenerator.generate()` calls `pdf(element).toBlob()`. | React-PDF. | PARTIAL; upstream routes return `Response` bytes, not a BIGDROPS `PdfAsset`. | Takumi `render()` and Forme `renderPdf()` return bytes. | Implement `PdfGenerator` and `PdfAsset` mapping. | High. | YES until generator contract passes. | `DefaultPdfGenerator.ts`; upstream API routes. |
| Web delivery | Download the generated PDF in the browser. | `WebPdfDelivery` receives `PdfAsset`. | BIGDROPS delivery layer. | NO direct delivery contract. | Backend bytes can feed a Blob. | Keep `CompositePdfDelivery` or a renderer-neutral equivalent. | Medium. | NO after generator contract passes. | `WebPdfDelivery.ts`; `PdfDelivery.ts`. |
| Native delivery | Save the generated PDF through Capacitor filesystem. | `NativePdfDelivery` handles native mode. | BIGDROPS delivery layer. | NO direct native contract. | Backend bytes can be saved as a file. | Preserve filename, MIME type, and native result semantics. | Medium. | NO after generator contract passes. | `NativePdfDelivery.ts`; `CompositePdfDelivery.ts`. |
| Error handling | Surface render and delivery failures with useful messages. | Generator and handlers catch errors; delivery has separate result types. | BIGDROPS services. | PARTIAL; upstream routes return HTTP 500 text. | Takumi/Forme errors require service normalization. | Map errors to `PdfAsset`/delivery error contracts and UI messages. | Medium. | NO after service tests pass. | Upstream API routes; `pdfDownloadHandler.ts:167-170`. |
| Physical-output test evidence | Prove dimensions, page count, headers, totals, no overlap, and one-page rules. | Existing tests are source/model/CSS tests, not byte/page inspection. | React-PDF tests are incomplete. | NO BIGDROPS physical-output suite. | No upstream suite for the required cases. | Add backend-specific physical PDF tests before retirement. | Critical. | YES. | `src/tests/pdf/`; `pageLayoutPipeline.test.js`; pdfcn package has no test suite in the inspected tree. |
| Receipt and other document families | Retire React-PDF only after every active family is migrated. | Direct React-PDF paths include Receipt, Waybill, CSR, BOQ, RFQ, and Project. | React-PDF in multiple paths. | NO complete family migration. | pdfcn samples cover invoice-like components, not BIGDROPS families. | Audit and migrate each family, including blank Waybill. | Critical. | YES. | `src/components/pdf/ReceiptPdf.tsx`; migration PRD §17; existing report family inventory. |

### Capability inventory conclusion

pdfcn has useful presentation primitives. The strongest proven areas are:

- theme tokens;
- table variants and width/alignment controls;
- explicit page-break and keep-together primitives in Takumi;
- page-header and page-footer components;
- image, QR, and signature examples;
- source-level composability.

The strongest blockers are:

- physical page-size and orientation proof;
- repeated table headers across physical pages;
- actual page-number and total-page behaviour;
- one-page fit, scaling, readability limits, and overflow fallback;
- font loading and embedding;
- metadata;
- BIGDROPS generator and delivery contracts;
- physical-output acceptance tests;
- complete migration of all active React-PDF families.

The pdfcn sample invoice must not be copied unchanged. It performs line
arithmetic and formats money inside the render component. BIGDROPS must pass
prepared values from `src/lib/Calculations.ts` and its domain preview model.

### Standards cross-check against the capability matrix

The 15 regular files under `docs/standard/` remain covered by the detailed
reconciliation table below. The capability matrix changes the renderer
classification as follows:

- `audit-trail-standard.md`, `document-save-orchestration.md`,
  `document-transformation-standard.md`, `lifecycle-ownership-standard.md`,
  `prefix-engine-settings-standard.md`, and `document-column-standard.md`
  remain authoritative and renderer-neutral.
- `pdf-customization-extension-standard.md`, `pdf-migration-standard.md`, and
  the React-PDF clause of `receipt-standard.md` require a renderer-neutral
  rewrite before migration work starts.
- `Commercial Party Architecture Standard.md` is still a placeholder. It
  cannot provide complete party mapping authority.
- Image upload, form consolidation, FAB, and JSON import standards remain
  outside this renderer replacement, but their inputs and document workflows
  must not regress.

## Retirement decision

**REACT-PDF CANNOT YET BE RETIRED**

This is a capability verdict, not a statement that replacement is impossible.
The current evidence does not prove that pdfcn can preserve the required
physical PDF behaviour. React-PDF must remain installed while any active
production document depends on it and until the following gates pass:

1. Select and pin one pdfcn backend. Do not treat Takumi and Forme as
   interchangeable without separate evidence.
2. Implement a BIGDROPS renderer adapter that consumes the existing prepared
   Invoice and Quotation models.
3. Prove A4 portrait and landscape dimensions in generated PDFs.
4. Prove long-table pagination, repeated headers, keep-together blocks, fixed
   footers, actual page counts, and totals placement.
5. Define and test one-page mode, minimum readable text size, maximum scale
   reduction, and the multi-page fallback.
6. Prove custom font loading and font embedding for supported BIGDROPS fonts.
7. Prove logos, item images, links, signatures, metadata, and any required QR
   output.
8. Implement a renderer-neutral generator that returns the existing
   `PdfAsset` contract and preserves web and native delivery.
9. Add physical-output tests for both Invoice and Quotation using long and
   short documents, portrait and landscape layouts, custom columns, grouped
   rows, totals, notes, signatures, and media.
10. Audit and migrate every remaining direct React-PDF family, including
    Receipt, Waybill, CSR, BOQ, RFQ, Project, and blank Waybill paths.
11. Remove React-PDF only after production consumers are gone and the
    migration exit tests pass.

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

## Standards Reconciliation Sub-verdict

**DIRECTIONALLY ALIGNED WITH REQUIRED AMENDMENTS**

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

The amendments listed in the previous section are the standards and PRD
amendments identified by the standards reconciliation. The stricter renderer
replacement decision is recorded in `## Retirement decision` above.

## Verification result

- PRD read: passed using `docs/prd/pdf-rendering-migration/draft.md`.
- Standards inventory: passed; 15 regular files under `docs/standard/` were
  inspected.
- Current Invoice and Quotation pipeline audit: passed as a read-only
  repository inspection.
- Primary benchmark selection: recorded for Invoice and Quotation; secondary
  Ledger pagination benchmark recorded.
- Capability matrix: recorded for current React-PDF, pdfcn, Takumi, Forme,
  BIGDROPS adapter ownership, migration risk, and retirement status.
- Application files changed: none.
- Database, migration, and configuration changes: none.
- `git status` before the audit: only pre-existing untracked
  `attached_assets/Pasted-PDF-Renderer-Capability-Replacement-Audit-Objective-Per_1788794350816.txt`.
- `git status` after the report update: this report is the only
  task-scoped modified file; the pre-existing attached asset remains
  unmodified and untracked.
- No application, build, typecheck, lint, migration, or test command was run
  because this task is a strictly read-only audit.
- `bun run build`: skipped per repository policy and task scope.
- Upstream pdfcn audit: passed against
  `shadcn-labs/pdfcn@88ca522c13dff7cd13d05c208fa47f970d32fd8c`, reacquired
  from the upstream repository for this audit.

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
- Selecting and pinning the pdfcn backend and implementing the BIGDROPS
  generator adapter.
- Migrating document families.
- Removing React-PDF after Phase 4 validation.