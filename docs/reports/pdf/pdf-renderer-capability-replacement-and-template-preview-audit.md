# PDF Renderer Capability Replacement and Template Preview Audit

**Audit date:** 2026-09-07  
**Repository:** BIGDROPS  
**Audit type:** Read-only architectural audit  
**Audited upstream source:** `shadcn-labs/pdfcn` at commit `88ca522c13dff7cd13d05c208fa47f970d32fd8c`

## 1. Executive Summary

BIGDROPS can use pdfcn as a source of renderer-facing components, but the
audited evidence does not justify retiring `@react-pdf/renderer` yet.

pdfcn is a source registry and component collection. It is not a drop-in
replacement runtime for the current BIGDROPS PDF service. It offers Takumi and
Forme integration examples, theme tokens, tables, page breaks, keep-together
primitives, headers, footers, images, QR codes, and signatures. It does not
provide the BIGDROPS document model, financial preparation, customization
resolver, delivery service, audit behavior, or migration contract.

The most important unproven capabilities are:

- physical A4 dimensions and first-class portrait/landscape output;
- repeated table headers across physical pages;
- long-table and overflow behavior;
- font loading and embedding for BIGDROPS font choices;
- document metadata and complete delivery integration;
- one-page or fit-to-page behavior;
- faithful miniature template previews for the template picker.

The current template picker also does not meet the new miniature requirement.
`TemplateMiniPreview` renders an 80px token-only illustration. It does not
derive its structure from the selected Invoice or Quotation template.

The target architecture can support faithful miniatures, but pdfcn does not
make that automatic. The clean boundary is:

```text
Canonical BIGDROPS document model
  → prepared presentation model
  → BIGDROPS-owned template definition
       ├─ PDF renderer adapter
       └─ miniature preview renderer
```

The picker must not depend directly on Takumi or Forme internals. A source-owned
template definition can make production output and miniatures structurally
consistent, but this requires a deliberate renderer-neutral layout contract or
an intentionally maintained miniature representation.

**Final verdict: `REACT-PDF CANNOT YET BE RETIRED`.**

## 2. Previous Report Separation / Clean Baseline

### 2.1 Previous artifact

The previous report is:

`docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md`

It must remain unchanged. This audit does not use it as the clean capability
replacement baseline.

The git history shows that the file began as a standards-only reconciliation
report at commit `951ca01c`. Later commits changed its objective and appended a
large renderer capability audit. The current file therefore combines:

1. the original standards reconciliation workstream; and
2. the later React-PDF versus pdfcn capability investigation.

The current file also contains two different closing conclusions:

- `REACT-PDF CANNOT YET BE RETIRED`; and
- `DIRECTIONALLY ALIGNED WITH REQUIRED AMENDMENTS`.

Those statements answer different questions. The first is a renderer
replacement decision. The second is a standards reconciliation conclusion.
They should not be treated as one clean decision.

### 2.2 Findings carried forward

This report carries forward only independently relevant findings:

- the current commercial path uses `PdfDocumentModel`, an adapter,
  React-PDF templates, `PdfRenderer`, `DefaultPdfGenerator`, and composite
  delivery;
- `IndustryTemplate` exercises the broadest commercial feature surface;
- `Ledger` demonstrates important fixed-header and keep-together behavior;
- pdfcn is a source registry built around Takumi and Forme;
- pdfcn's invoice example performs arithmetic in the rendering component and
  must not be copied into BIGDROPS;
- pdfcn has useful presentation primitives but does not prove BIGDROPS
  physical pagination, delivery, or one-page behavior.

The standards remain requirements. Their inclusion here does not mean that the
older standards report was itself a valid capability replacement audit.

### 2.3 Separation result

The previous report is a merged artifact. This new report establishes a clean
capability-replacement baseline and adds the faithful miniature-preview
requirement. No historical conclusion is accepted without direct evidence
from the current code, current standards, or the pinned upstream source.

## 3. Standards Capability Baseline

The repository contains 15 regular files directly under `docs/standard/`.
The renderer replacement must preserve the business and document contracts in
those files. The standards that directly constrain this audit are:

| Standard | Requirement relevant to replacement | Ownership |
|---|---|---|
| `pdf-migration-standard.md` | Common generator, delivery, filename, preview, and output-preservation contract | BIGDROPS pipeline |
| `pdf-customization-extension-standard.md` | Renderer-independent capabilities, policy, defaults, and resolver ownership | BIGDROPS customization engine |
| `document-column-standard.md` | Column visibility, ordering, row numbering, and cell mapping | BIGDROPS column layer |
| `lifecycle-ownership-standard.md` | Rendering components are presentation-only and cannot calculate or persist | BIGDROPS domain boundary |
| `document-transformation-standard.md` | Document transformations must preserve identity and lineage rules | BIGDROPS domain layer |
| `Commercial Party Architecture Standard.md` | Party authority and commercial-party presentation rules | BIGDROPS commercial domain |
| `receipt-standard.md` | Receipt identity, payment linkage, and immutable snapshots | BIGDROPS receipt domain |
| `audit-trail-standard.md` | Auditable lifecycle events and immutable event meaning | BIGDROPS audit layer |
| `document-image-upload-policy.md` | Canonical asset handling and image ownership | BIGDROPS media layer |
| `document-save-orchestration.md` | Save ownership and document state orchestration | BIGDROPS action/domain layer |
| `prefix-engine-settings-standard.md` | Numbering and prefix ownership | BIGDROPS identity layer |

The remaining four standards—`document-form-consolidation-standard.md`,
`fab-standard.md`, `json-import-standard.md`, and
`docs-commit-workflow-standard.md`—do not define a PDF renderer capability.
They still constrain adjacent application behavior, but they are not evidence
that a renderer can replace the current PDF backend.

The migration PRD adds the physical requirements that are most important to
this audit:

- A4 portrait is `210 × 297 mm`;
- A4 landscape is `297 × 210 mm`;
- orientation must recalculate page dimensions, content width, tables,
  margins, headers, footers, available height, and pagination;
- long tables, repeated headers, keep-together behavior, natural flow, and
  readable footer placement must be tested;
- “1 Page” means controlled fit-to-page behavior without deleting or hiding
  required content.

The standards and PRD therefore require more than visually similar components.
They require physical output, preserved document behavior, and strict ownership
of all financial and lifecycle meaning.

## 4. Benchmark Template Selection

### 4.1 Selected Invoice benchmark

The strongest Invoice benchmark is the shared `IndustryTemplate`:

`src/components/pdf/templates/Industry.tsx`  
→ `src/components/pdf/presentation/industry/IndustryTemplate.tsx`

It is the strongest benchmark because it exercises:

- document title and identity metadata;
- configurable headers and custom fields;
- company branding and logo;
- issuer and recipient party cards;
- configurable columns and row numbering;
- group headers and group subtotals;
- long descriptions and item images;
- bank details;
- totals, balance due, amount in words, and advance summary;
- rich-text notes and terms;
- attachments, additional fields, signatures, and fixed footers;
- A4 portrait/landscape and compact presentation.

It is a stronger replacement benchmark than a visually simpler template
because it exposes the greatest number of required seams.

### 4.2 Selected Quotation benchmark

The strongest Quotation benchmark is also `IndustryTemplate`. Invoice and
Quotation share the commercial renderer path, but their prepared identity
semantics differ:

- Invoice uses due date and invoice-number labels.
- Quotation uses validity date and quotation-number labels.
- The recipient semantics are prepared by the Quotation handler as
  “Prepared For”.

This is a stronger benchmark than evaluating Quotation only through its HTML
page preview because it exercises the actual shared production PDF path.

### 4.3 Secondary pagination benchmark

`src/components/pdf/templates/Ledger.tsx` is a secondary benchmark. It contains
an explicit fixed table header, `wrap={false}` blocks, fixed page footer,
attachments, rich text, signature, totals, and group behavior. It is useful
for pagination proof, but it is not selected as the primary commercial
benchmark because the Industry template covers more of the shared business
surface.

## 5. Invoice Capability Audit

### 5.1 Data path

The current Invoice path is:

```text
invoice/items/client/settings/payments
  → computeDocument() and calculateInvoiceFinancialState()
  → buildInvoicePreviewModel()
  → interpretPdfTableSettings() and buildPdfRowCells()
  → InvoicePdfModel
  → generateInvoicePdf()
  → adaptCommercialDocumentData()
  → IndustryTemplate
  → PdfRenderer
  → DefaultPdfGenerator
  → CompositePdfDelivery
```

Evidence:

- `invoicePdfActions.ts:1-79` obtains calculated totals, payment state, and
  prepared preview data.
- `invoicePdfActions.ts:81-95` resolves column and orientation settings.
- `invoicePdfActions.ts:96-188` builds the immutable renderer-facing model.
- `src/components/pdf/index.ts:33-113` selects the template, adapts the model,
  generates the PDF, and delivers it.
- `src/lib/pdf/DefaultPdfGenerator.ts:8-18` currently calls
  `@react-pdf/renderer`.

### 5.2 Industry structure

`IndustryTemplate.tsx` demonstrates the following production structure:

1. A4 page with a prepared orientation.
2. Header containing title, custom title, document metadata, custom fields, and
   a right-side logo.
3. Issuer and client party cards.
4. Fixed table header with configurable columns.
5. Group headers, line rows, item descriptions, images, and group subtotals.
6. Bank details and totals in a keep-together closing row.
7. Main total, balance due, amount in words, and advance summary.
8. Rich-text notes and terms.
9. Attachments and additional fields.
10. Signature block.
11. Fixed page footer with page number, document number, and company name.

This is a real structural contract. A replacement must preserve it without
moving its meaning into the renderer.

### 5.3 Invoice-specific ownership risk

The current action prepares monetary values before the template receives them.
The pdfcn sample invoice instead calculates
`quantity * unitPrice` and formats the result inside its render component.
That sample is useful as a layout reference only. BIGDROPS must continue to
use `src/lib/Calculations.ts` and prepared totals as the financial source of
truth.

## 6. Quotation Capability Audit

### 6.1 Data path

The current Quotation path is:

```text
quotation/items/settings/client/preview model/custom fields
  → prepared preview totals and detail rows
  → interpretPdfTableSettings() and buildPdfRowCells()
  → QuotationPdfModel
  → generateQuotationPdf()
  → adaptCommercialDocumentData()
  → IndustryTemplate
  → PdfRenderer
  → DefaultPdfGenerator
  → CompositePdfDelivery
```

Evidence:

- `src/domain/quotation/pdfDownloadHandler.ts:12-31` receives prepared
  quotation and preview inputs.
- `pdfDownloadHandler.ts:40-55` resolves customization, columns, merge mode,
  and page orientation.
- `pdfDownloadHandler.ts:56-161` constructs the renderer-facing model.
- `pdfDownloadHandler.ts:163-165` selects the saved template and compact mode.

### 6.2 Quotation-specific behavior

The adapter changes labels and identity semantics based on document kind:

- `industryAdapter.ts:120-125` selects Invoice versus Quotation labels.
- `industryAdapter.ts:332-358` normalizes title, dates, PO number, and custom
  header fields.
- `pdfDownloadHandler.ts:59-68` supplies Quotation identity and validity date.
- `pdfDownloadHandler.ts:79-90` supplies the recipient, detail rows, and
  prepared commercial fields.

The replacement must therefore support shared visual structure without
collapsing Invoice and Quotation identity semantics into a generic sample
invoice.

## 7. Current React-PDF Capability Inventory

React-PDF currently provides the production host for:

- `Document`, `Page`, `View`, `Text`, `Image`, and `Link`;
- A4 page size and portrait/landscape orientation;
- flex-based layout and margins;
- fixed headers and footers;
- page numbers using `{ pageNumber, totalPages }`;
- `wrap={false}` for keep-together blocks;
- fixed table headers in the current Industry and Ledger templates;
- images, linked images, signatures, and rich text primitives;
- local font registration through `pdfFontRegistry.ts`;
- hyphenation control for quantity/unit tokens;
- physical PDF blob generation through `pdf(element).toBlob()`;
- browser and Capacitor delivery through the existing delivery abstractions.

React-PDF-specific implementation details include:

- React-PDF component imports in every production template;
- `fixed` and `wrap={false}` props;
- `StyleSheet` and React-PDF style values;
- `Font.register()` and `Font.registerHyphenationCallback()`;
- the `Document` boundary in `PdfRenderer`;
- `DefaultPdfGenerator`'s `pdf(element).toBlob()` call.

These are replaceable implementation details only after equivalent behavior is
proven. They do not include BIGDROPS ownership rules, prepared-data contracts,
or document identity.

## 8. pdfcn + Underlying Renderer Capability Inventory

### 8.1 What pdfcn is

The pinned README describes pdfcn as customizable React PDF components built on
Takumi and Forme. It advertises two rendering bases, registry components, live
documentation previews, themes, tables, forms, charts, and invoice blocks.
The repository is not one drop-in `pdfcn` runtime package.

BIGDROPS would need to select a renderer base, copy or adapt source, define an
integration boundary, and implement its own document-generation and delivery
services.

### 8.2 Themes and layout declarations

`registry/types/pdf-themes.ts:124-223` declares:

- primitive typography and spacing scales;
- semantic colors;
- body and heading typography;
- page margins;
- A4, Letter, and Legal;
- portrait and landscape.

Those types are useful design targets. They do not prove that the physical
renderer applies every value.

### 8.3 Takumi evidence

The Takumi primitive implementation at
`registry/bases/takumi/lib/pdf-primitives.tsx:296-317` accepts a `size` prop
but binds it to `_size` and does not use it. The `Page` primitive also has no
orientation prop. This means the theme declarations cannot be treated as
physical A4 or landscape proof.

The Takumi table implementation provides:

- table sections and cells;
- column widths and alignment;
- variants and zebra striping;
- `breakInside: "avoid"` for rows;
- optional no-wrap behavior.

However, `TableHeader` is a normal `View`. The inspected code does not prove
that it repeats a header across physical pages.

### 8.4 pdfcn invoice block

The Takumi invoice example:

- hard-codes `<Page size="A4">`;
- uses a source-owned page header and footer component;
- renders parties, a table, and totals;
- embeds a logo;
- writes a literal `Page 1 of 1`;
- calculates line totals and formats money inside the render block.

It demonstrates visual composition, not BIGDROPS-compatible physical
pagination, page counts, financial ownership, metadata, or delivery.

### 8.5 Forme evidence

The upstream Forme route demonstrates `serialize()` and `renderPdf()`. It does
not demonstrate the BIGDROPS model adapter, delivery abstraction, physical
orientation tests, repeated headers, font registry, or template-picker
miniatures.

### 8.6 Useful primitives

The audited source contains useful starting points for:

- page headers and footers;
- page breaks;
- keep-together blocks;
- tables;
- images;
- QR codes;
- signatures;
- page-number components;
- shared theme tokens.

These primitives are not, by themselves, a complete replacement contract.

## 9. Capability Replacement Matrix

Status meanings:

- **REPLACED:** equivalent behavior is proven in the target stack.
- **PARTIALLY REPLACED:** useful primitives exist, but BIGDROPS integration or
  acceptance proof is missing.
- **BIGDROPS-OWNED:** the capability must remain outside the renderer.
- **UNPROVEN:** declarations or examples exist, but physical or integrated
  behavior is not proven.
- **MISSING:** no suitable target capability was found.
- **NOT APPLICABLE:** not required by the selected Invoice/Quotation
  benchmark, although another document family may need it.

| Capability | BIGDROPS requirement | Current React-PDF implementation | pdfcn | Takumi/Forme | BIGDROPS-owned layer | Replacement status | Evidence |
|---|---|---|---|---|---|---|---|
| Document generation | Produce valid Invoice and Quotation PDFs | `DefaultPdfGenerator` creates a blob | Routes demonstrate generation | Takumi `render`; Forme `renderPdf` | Generator adapter and service | UNPROVEN | `DefaultPdfGenerator.ts:11-18`; upstream routes |
| A4 output | Physical A4 output | `Page size="A4"` | Theme declares A4 | Takumi `Page` discards `size` | Page contract and tests | UNPROVEN | `PdfRenderer.tsx:49-52`; `pdf-primitives.tsx:296-317` |
| Portrait | A4 portrait | Supported by current Page | Theme declares portrait | No Takumi orientation prop found | Layout resolver | UNPROVEN | `types.ts:53-56`; theme types |
| Landscape | First-class A4 landscape | Current Page receives orientation | Theme declares landscape | No physical proof or orientation prop | Layout and geometry tests | UNPROVEN | `IndustryTemplate.tsx:110-112`; theme types |
| Physical dimensions | 210×297 and 297×210mm | Renderer-backed but not verified here | Type-level page values only | Physical mapping not proven | Acceptance tests | UNPROVEN | PRD §9; Takumi Page source |
| Margins | Template-specific document margins | Style objects in templates | Theme margin tokens | Application of tokens not proven | Template definition | PARTIALLY REPLACED | `pdf-themes.ts:200-215` |
| Typography | Hierarchy, sizes, weights, line heights | Template styles and font props | Theme typography tokens | Font availability and metrics unproven | Design preset resolver | PARTIALLY REPLACED | `IndustryTemplate.tsx:115-185`; theme types |
| Fonts | Local registered fonts and stable metrics | `pdfFontRegistry.ts` | Theme accepts family names | Loading/embedding BIGDROPS fonts unproven | Font registry and assets | UNPROVEN | `pdfFontRegistry.ts:39-81` |
| Logos | Canonical company logo | `Image` with canonical URL | `PdfImage` exists | Asset fetch and delivery integration unproven | Media resolver | PARTIALLY REPLACED | `industryAdapter.ts:361-375`; pdfcn invoice block |
| Item images/assets | Canonical item assets and links | `Image` and `Link` | Image primitive exists | Asset policy and remote behavior unproven | Media and asset policy | PARTIALLY REPLACED | `IndustryTemplate.tsx:355-361`; image policy |
| Headers | Branded metadata/header structure | Template-specific React-PDF views | Page-header component exists | Composition possible; physical repetition unproven | Template definition | PARTIALLY REPLACED | `IndustryTemplate.tsx:112-194`; pdfcn page-header |
| Footers | Document number, company, page count, footer text | Fixed footer and render callback | Page-footer component exists | Total-page behavior unproven | Footer content and policy | PARTIALLY REPLACED | `IndustryTemplate.tsx:661-677`; pdfcn sample footer |
| Page numbers | Actual current/total physical pages | React-PDF render callback | Sample literal only; component exists | Integrated total-page proof missing | Footer contract | UNPROVEN | `IndustryTemplate.tsx:669-671`; sample `Page 1 of 1` |
| Commercial parties | Issuer, recipient, labels, addresses, contacts | Prepared `PdfParty` and party cards | Sample `billTo` only | No BIGDROPS party authority | Commercial domain | BIGDROPS-OWNED | `types.ts:24-34`; `industryAdapter.ts:361-385` |
| Document metadata | Immutable identity and document kind | Prepared identity model; generator metadata is empty | Document title prop exists | Complete metadata mapping unproven | Identity/lineage layer | BIGDROPS-OWNED | `types.ts:11-22`; `DefaultPdfGenerator.ts:16-17` |
| Configurable columns | Saved configuration resolved before render | Table resolver and adapter | Table accepts cells/widths | No BIGDROPS resolver | Column layer | BIGDROPS-OWNED | `table.ts:123-185` |
| Column visibility | Show, hide-display, hide-full semantics | `resolveColumnBehavior` | No matching contract | No matching contract | Column layer | BIGDROPS-OWNED | `table.ts:61-67`, `123-143` |
| Column ordering | Persisted configured order | `configuredColumns.forEach` | Generic child order only | No saved configuration | Column layer | BIGDROPS-OWNED | `table.ts:137-167` |
| Row numbering | Prepared stable line numbers | Adapter creates `cells.num` | No BIGDROPS numbering | Generic table cannot own it | Prepared model | BIGDROPS-OWNED | `industryAdapter.ts:181-239` |
| Tables | Commercial table with cells, widths, alignment | Industry and Ledger tables | Table component and variants | Cell/row layout exists | Table adapter | PARTIALLY REPLACED | `IndustryTemplate.tsx:229-383`; pdfcn table |
| Long tables | Preserve content across pages | Natural React-PDF flow plus fixed header | No accepted long-table proof | Row keep-together exists | Pagination tests | UNPROVEN | PRD §10; pdfcn table row `breakInside` |
| Table pagination | Predictable rows and totals | `wrap={false}` rows and closing blocks | `breakInside: avoid` | Physical behavior unproven | Pagination policy | UNPROVEN | `IndustryTemplate.tsx:270-331`; pdfcn table |
| Repeated table headers | Header on each physical page | Fixed header in Industry/Ledger | `TableHeader` is normal `View` | Repetition not shown | Template/pagination adapter | UNPROVEN | `Ledger.tsx:70-84`; pdfcn table `23-25` |
| Keep-together | Do not split related groups/totals/signatures | `wrap={false}` | `breakInside: avoid` | Useful primitive exists | Template grouping policy | PARTIALLY REPLACED | `Ledger.tsx:174-208`; pdfcn table `175-183` |
| Explicit page breaks | Controlled break support | React-PDF break support available | Page-break component exists | Physical result unproven | Template definition | PARTIALLY REPLACED | Upstream page-break primitive |
| Totals placement | Totals, balance, words, advance summary | Prepared totals and keep-together closing | Key/value example | Financial meaning absent | Totals preparation | BIGDROPS-OWNED | `IndustryTemplate.tsx:385-581`; invoice model |
| VAT/tax presentation | Preserve prepared tax values | Prepared rows and totals | Sample tax/GST field | No BIGDROPS tax semantics | Calculations and model | BIGDROPS-OWNED | `invoicePdfActions.ts:44-78` |
| Discounts | Preserve prepared discount values | Calculation and totals layer | No discount contract | No discount ownership | Calculations layer | BIGDROPS-OWNED | `invoicePdfActions.ts:70-76` |
| Payment information | Bank details and payment state | Prepared bank details and financial state | Generic content primitives | No payment ledger | Payment/domain layer | BIGDROPS-OWNED | `IndustryTemplate.tsx:385-428` |
| Notes and terms | Rich text, titles, legal content | Shared rich-text PDF renderer | Text/section primitives | Exact rich-text parity unproven | Prepared text model | PARTIALLY REPLACED | `IndustryTemplate.tsx:584-612` |
| Signatures | Image/name/role without business mutation | Signature block | Signature primitive exists | Asset/metric parity unproven | Signatory authority | PARTIALLY REPLACED | `IndustryTemplate.tsx:640-659` |
| QR codes | Only if a document family requires them | Not exercised by selected commercial benchmark | QR component exists | Not relevant to current benchmark | Document-family policy | NOT APPLICABLE | No Invoice/Quotation QR requirement found |
| Customization | Accent, font, template, density, orientation | Resolver bridges to preset | Theme tokens | No BIGDROPS policy/persistence | Customization engine | PARTIALLY REPLACED | `commercial.ts:44-87`; PRD §8 |
| Themes/design presets | Deterministic template-specific styling | `PdfDesignPreset` and template styles | `PdfcnTheme` tokens | Theme use is source-owned | Design system | PARTIALLY REPLACED | `commercial.ts:151-169`; pdfcn theme types |
| Compact mode | Preserve configured density variant | Compact styles passed to template | No general compact/fit contract found | No proof | Density policy | MISSING | `index.ts:17-22`, `96-110` |
| One-page / fit-to-page | Preserve all content with controlled fit | No generalized implementation | No fit-to-page contract found | No proof | Layout service | MISSING | PRD §11; no target implementation |
| HTML page preview | Preserve existing page preview | Separate Invoice/Quotation DOM components | Documentation previews are not BIGDROPS previews | Not a picker solution | UI preview layer | BIGDROPS-OWNED | `InvoiceDocumentCard.tsx`; `QuotationDocumentPreview.tsx` |
| Template-picker miniature | Faithful structural miniature | Generic token-only 80px preview | No dedicated picker miniature contract | PDF primitives do not solve DOM preview | Preview renderer | MISSING | `TemplateMiniPreview.tsx:1-109` |
| Generated PDF preview | Distinguish PDF viewer from picker card | Generation exists, viewer path not established here | Live docs preview exists | Not BIGDROPS delivery | Preview UX | UNPROVEN | pdfcn README; current generation path |
| Delivery | Web download, native save, feedback | Composite delivery is implemented | Upstream routes return renderer output only | No BIGDROPS delivery adapter | Delivery service | MISSING | `CompositePdfDelivery.ts:4-11`; migration standard |
| Prepared-data ownership | Renderer receives prepared values | `PdfDocumentModel` and adapter | Sample render block owns arithmetic | Must remain BIGDROPS | Domain/prepared model | BIGDROPS-OWNED | `types.ts:175-214`; pdfcn sample lines 159-166 |
| Business-logic separation | No calculation, persistence, audit, or lifecycle in renderers | Current templates are presentation-oriented | pdfcn sample violates BIGDROPS rule by calculating totals | Renderer must be constrained | Domain and action layers | BIGDROPS-OWNED | Lifecycle ownership standard; pdfcn sample |
| Document identity | Number, kind, dates, status, currency | `PdfDocumentIdentity` | Sample identity is presentation data | Identity remains domain-owned | Identity layer | BIGDROPS-OWNED | `types.ts:11-22` |
| Lineage | Preserve parent/child and transformation semantics | Prepared model carries advance semantics | No lineage model | Domain transformation layer | BIGDROPS-OWNED | BIGDROPS-OWNED | Transformation and PDF correctness standards |
| Audit requirements | Downloads and lifecycle events remain auditable | Feedback bus plus BIGDROPS audit layer | No audit integration | Domain-owned | BIGDROPS-OWNED | BIGDROPS-OWNED | `DefaultFeedbackBus` path; audit standard |
| Asset handling | Canonical URLs, image policy, failure behavior | Media resolvers and templates | Image primitives exist | URL/cache/failure policy unproven | Media layer | PARTIALLY REPLACED | `industryAdapter.ts:1-5`; pdfcn image primitive |
| Error handling | Failed generation and delivery are explicit | Feedback bus and thrown errors | Route examples do not define BIGDROPS error contract | Adapter/service required | Delivery and action layer | PARTIALLY REPLACED | `index.ts:115-121` |

## 10. Faithful Miniature Template Preview Audit

### 10.1 Requirement

The template picker must show a miniature that is recognizably derived from the
actual document template. It must represent structure, not only color.

For Invoice and Quotation, the miniature must communicate, at minimum:

- header and logo placement;
- document title and metadata grouping;
- issuer/vendor and customer areas;
- table header, row geometry, and amount column;
- totals position and emphasis;
- typography hierarchy;
- major spacing and density;
- branding and template-specific treatment;
- portrait or landscape orientation.

It does not need to contain real customer data or every legal field. It does
need deterministic fixture content that exercises the template's layout.

### 10.2 Current BIGDROPS preview behavior

The current picker does not meet this requirement:

- `TemplateMiniPreview.tsx:1-14` describes a fixed 80px token-only thumbnail.
- `TemplateMiniPreview.tsx:44-106` draws a generic header, meta chips, table
  lines, and totals bar.
- `CommercialTemplatePicker.tsx:6-55` supplies colors, labels, and a generic
  `commercial` layout for every commercial template.
- `TemplatePickerCarousel.tsx:67-71` renders the same miniature component for
  every option.

The current page previews are separate HTML implementations:

- `InvoiceDocumentCard.tsx:38-185` renders a branded invoice-like DOM card.
- `QuotationDocumentPreview.tsx:50-210` renders a quotation-like DOM card.
- The associated CSS files define their own geometry and typography.

Those page previews are useful references, but they are not the selected PDF
template implementations. They do not prove that a chosen `Ledger`, `Crest`,
`Minimal`, `Evergreen`, `Bolt`, or `Ember` miniature follows that template.

### 10.3 PDF preview versus template miniature

These are different products:

| Product | Meaning | Data | Cost | Suitable for picker? |
|---|---|---|---|---|
| Generated PDF preview | Shows an actual generated document | Prepared document data | PDF generation plus viewer/thumbnail cost | Usually too expensive for every card |
| Template-picker miniature | Shows the structure and visual identity of a template | Deterministic fixture data or a small layout model | Must be fast and cacheable | Yes |

A PDF viewer or a thumbnail of one generated PDF proves only that one document
rendered. It does not prove that the picker can efficiently show every
available template, every orientation, or a template before user data is
available.

### 10.4 Does pdfcn materially change the situation?

pdfcn improves the starting point in two ways:

1. It encourages source-owned reusable blocks such as page headers, tables,
   sections, and invoice blocks.
2. Its theme and primitive tokens provide a common vocabulary for PDF styling.

It does not provide:

- a BIGDROPS Invoice or Quotation template definition;
- a DOM renderer for those definitions;
- a miniature contract;
- a cache or stale-preview policy;
- a route from picker options to the selected template's actual structure.

Therefore pdfcn makes structural reuse possible, but not effortless. The
miniature requirement is not evidence that React-PDF can be retired.

## 11. Preview Architecture Options

| Approach | Fidelity | Performance/caching | Duplication and stale risk | Renderer coupling | Assessment |
|---|---|---|---|---|---|
| Reuse the same React-PDF template component in the DOM | Potentially high if it worked | Poor for many cards; difficult to cache at component level | Low source duplication, high host mismatch risk | High | Reject as the default |
| Reuse pdfcn primitives directly | Medium to high for primitives | Good if components stay small | Medium; PDF style semantics still differ from CSS | Medium to high if picker imports Takumi internals | Useful only behind an adapter |
| Render a shared definition into lightweight HTML/DOM | High for structure and responsive behavior | Good; lazy render and cache by template/version/orientation | Low if definition is canonical | Low when definition is BIGDROPS-owned | Preferred direction |
| Use a renderer-independent intermediate layout representation | High if the representation captures real geometry and tokens | Good; deterministic fixture rendering and caching | Low long-term, higher initial design cost | Low | Strongest long-term boundary |
| Maintain dedicated miniature representations | Medium to high if deliberately benchmarked | Excellent | High stale risk unless tested against production definitions | Low | Acceptable fallback, not ideal |
| Generate static preview images | High for approved states | Excellent CDN/cache behavior | High when templates or fonts change | None at runtime | Good for stable catalog previews |
| Generate a real PDF fixture and thumbnail it | Highest visual fidelity | Slow/expensive; asynchronous cache required | Low visual drift, but fixture/version management needed | Coupled to PDF backend | Good verification artifact, not the only picker path |

### 11.1 Recommended architecture

Use a BIGDROPS-owned template definition with explicit regions and tokens:

```text
Prepared commercial model
  + template id
  + page layout
  + resolved design tokens
  + deterministic miniature fixture
      ↓
BIGDROPS CommercialTemplateDefinition
  + header slots
  + party slots
  + table geometry
  + totals geometry
  + notes/signature/footer slots
  + typography and spacing tokens
      ├─ Takumi/Forme PDF adapter
      └─ HTML miniature adapter
```

The PDF adapter may use pdfcn components. The miniature adapter must not import
Takumi or Forme internals. Both adapters consume the same structural
definition and prepared data, but they may use host-specific primitives for
physical pagination versus responsive card layout.

If the definition becomes more complex than the current templates, a dedicated
miniature renderer is safer than pretending that one React component can
render both hosts without an explicit abstraction.

## 12. Invoice Miniature Benchmark

A faithful Industry Invoice miniature should show:

| Region | What the miniature must communicate |
|---|---|
| Page frame | Portrait or landscape aspect ratio and main page margins |
| Header | Title/identity block, metadata grouping, and logo position |
| Parties | Two visually distinct issuer and recipient blocks |
| Table | Header band, description area, numeric columns, row count, and group treatment where relevant |
| Totals | Right-weighted totals area with a visibly emphasized grand total |
| Optional zones | A small indication of bank details, notes, signature, or footer when the selected preset uses them |
| Typography | Title, label, body, and amount hierarchy |
| Branding | Accent, surface, border, logo treatment, and template-specific geometry |

The current generic miniature reproduces only a header bar, two meta bars, a
generic table band, two lines, and an accent totals bar. It does not reproduce
the Industry header/party/table/totals geometry or its variable optional zones.

A shared template definition could derive these regions from the actual
Industry structure. A color-token object cannot.

## 13. Quotation Miniature Benchmark

A faithful Industry Quotation miniature should use the same broad structure
while exposing the Quotation-specific semantics:

| Region | What the miniature must communicate |
|---|---|
| Page frame | Quotation orientation and density |
| Header | Quotation title, number, issue date, validity date, and logo placement |
| Parties | Issuer and “Prepared For”/recipient areas |
| Table | Configurable quotation line-item geometry and amount column |
| Totals | Quotation total hierarchy and amount-in-words treatment when enabled |
| Optional zones | Notes, terms, payment details, signature, attachments, and footer |
| Typography | Shared commercial hierarchy, not a generic invoice-only hierarchy |
| Branding | The selected template's actual accent, surfaces, borders, fonts, and spacing |

The Quotation HTML page preview already provides useful structural reference
regions, but it is not the production template definition. A new preview
renderer should consume the same prepared Quotation semantics and selected
template definition rather than copy the HTML page preview independently.

## 14. Business Logic Ownership Boundary

Neither pdfcn templates nor miniature preview components may own:

- financial calculations;
- VAT, WHT, or discount calculations;
- payment state;
- numbering;
- document identity;
- document lineage;
- commercial-party authority;
- audit behavior;
- permissions;
- saved document state.

Production PDF and miniature preview paths should consume appropriate prepared
data:

```text
BIGDROPS domain/calculation layer
  → prepared document model
  → presentation-only template definition
  → PDF adapter or miniature adapter
```

The pdfcn invoice example's inline arithmetic is an upstream example, not a
BIGDROPS pattern to copy. The renderer must display prepared values. It must
not reconstruct line totals, totals rows, payment state, or party authority.

## 15. React-PDF Retirement Assessment

1. **What does React-PDF currently provide?**  
   The current production path provides the physical document host, A4 page
   construction, orientation props, flex layout, fixed headers and footers,
   page-number callbacks, keep-together controls, images, links, local fonts,
   rich text primitives, blob generation, and the host used by the current
   delivery service.

2. **Which capabilities are provided by pdfcn?**  
   Source components for themes, tables, headers, footers, sections, images,
   page breaks, keep-together blocks, QR codes, signatures, and invoice examples.
   These are reusable source capabilities, not a complete BIGDROPS integration.

3. **Which capabilities are provided by Takumi/Forme underneath pdfcn?**  
   Takumi provides the inspected JSX-to-PDF path, renderer primitives, style
   mapping, table rows, page breaks, and `breakInside` hints. Forme provides a
   separate serialization/render path. Exact physical A4, orientation,
   repeated headers, font embedding, total page counts, and BIGDROPS delivery
   remain unproven.

4. **Which capabilities remain BIGDROPS-owned?**  
   Canonical models, calculations, prepared values, columns, party authority,
   identity, lineage, customizations, assets, payment state, audit, delivery,
   filename policy, and error policy.

5. **Which React-PDF-specific workarounds could become unnecessary?**  
   The React-PDF `Document`/`Page` host, React-PDF `StyleSheet` styles,
   `fixed`/`wrap={false}` props, React-PDF font registration, and
   `pdf(element).toBlob()` call could be replaced if equivalent contracts are
   proven. The underlying layout policies and prepared data must not be
   removed merely because their current syntax is renderer-specific.

6. **Which capabilities remain unmatched?**  
   Physical page behavior, reliable portrait/landscape output, repeated table
   headers, long-table acceptance, one-page fit behavior, BIGDROPS fonts,
   complete metadata, delivery integration, and faithful picker miniatures.

7. **Which capabilities require a BIGDROPS adapter?**  
   Every production path requires model mapping, column resolution, design
   preset mapping, asset resolution, page layout mapping, totals display,
   delivery, feedback, errors, and migration coexistence.

8. **Can the strongest Invoice template be reproduced without React-PDF?**  
   Probably, with a source-owned template definition and a proven Takumi or
   Forme adapter. It is not proven by the audited pdfcn source.

9. **Can the strongest Quotation template be reproduced without React-PDF?**  
   Probably, using the same commercial definition with Quotation identity and
   prepared semantics. It is not proven by the audited source.

10. **Can the standards still be satisfied without React-PDF?**  
    Yes in principle, but only after the target renderer proves physical
    geometry, pagination, fonts, delivery, content preservation, and all
    document-family acceptance criteria.

11. **Does the target architecture make faithful miniatures materially easier?**  
    It makes shared source-owned blocks and tokens more plausible. It does not
    supply a picker miniature system. The significant work moves to defining a
    renderer-neutral template contract or a tested miniature adapter.

12. **Does miniature-preview capability strengthen the case for retiring
    React-PDF?**  
    No. It strengthens the case for a source-owned template definition. It
    does not prove that pdfcn can replace the physical PDF renderer.

## 16. Final Verdict

**`REACT-PDF CANNOT YET BE RETIRED`.**

This is an evidence verdict, not a claim that replacement is impossible.
Retirement is blocked because the target stack has not proved:

1. physical A4 portrait and landscape output;
2. BIGDROPS-compatible long-table pagination and repeated headers;
3. font loading and embedding;
4. one-page or controlled-fit behavior;
5. complete generator, metadata, delivery, and error integration;
6. faithful Invoice and Quotation production output;
7. a source-owned miniature path for the template picker.

The current evidence supports progressive investigation, not dependency
removal.

## 17. Required Proof-of-Concept Work

The following work is required before a retirement decision can change:

1. **Select one renderer base.**  
   Choose Takumi or Forme for the first commercial proof. Do not evaluate
   pdfcn as if both bases were one runtime.

2. **Build a read-only model adapter.**  
   Feed the existing prepared `PdfDocumentModel` into the selected renderer.
   Prove that all monetary values, parties, identity, and columns arrive
   already prepared.

3. **Prove physical geometry.**  
   Generate and inspect A4 portrait and A4 landscape output. Measure page
   dimensions, margins, content width, header geometry, footer geometry, and
   table width.

4. **Prove pagination.**  
   Use long descriptions, many rows, group headers, group subtotals, images,
   notes, terms, signatures, and attachments. Verify repeated headers,
   keep-together behavior, totals placement, footer placement, and no
   accidental blank pages.

5. **Prove fonts and assets.**  
   Register the actual BIGDROPS fonts locally, render logos and item images,
   and define failure behavior for unavailable assets.

6. **Prove metadata and delivery.**  
   Map document identity and metadata, preserve filenames, return a PDF asset,
   route web/native delivery, and emit success/failure feedback through the
   existing contract.

7. **Prove controlled one-page behavior.**  
   Define minimum readable sizes and test fit/reflow behavior. Do not use a
   destructive content shortcut.

8. **Build the miniature proof.**  
   Define one Industry Invoice and one Industry Quotation using a
   BIGDROPS-owned template definition. Render the same definition through:
   - a PDF adapter; and
   - a lightweight HTML miniature adapter.

9. **Compare output.**  
   Compare the PDF fixture, page raster, HTML miniature, and current production
   template for header, parties, table, totals, typography, spacing, branding,
   and orientation.

10. **Add versioned preview caching.**  
    Cache by template identifier, definition version, design preset, font
    version, and orientation. Define what happens when a template changes.

No proof-of-concept, build, typecheck, lint, runtime validation, dependency
installation, migration, or configuration change was performed for this
read-only audit.

## 18. Recommendations for the Adaptive UI/UX Architect

Use the following requirements when updating the Adaptive Mobile-First UI/UX
PRD:

1. Define a template miniature as a structural representation, not a color
   swatch or generic document icon.
2. Require Invoice and Quotation miniatures to show header, parties, table,
   totals, typography hierarchy, spacing, branding, and orientation.
3. Keep the template picker independent from Takumi, Forme, React-PDF, and
   generated-PDF viewer internals.
4. Prefer a BIGDROPS-owned template definition with separate PDF and HTML
   renderers.
5. Use deterministic fixture data for picker miniatures. Do not require live
   customer data or financial calculation in the picker.
6. Support lazy rendering and versioned caching so a mobile carousel does not
   generate a full PDF for every card.
7. Treat a generated PDF thumbnail as an optional high-fidelity verification
   artifact, not as the only picker implementation.
8. Specify portrait and landscape as distinct miniature aspect ratios.
9. Add a visual regression requirement that compares each miniature with its
   selected production template after template changes.
10. Do not make React-PDF retirement a prerequisite for the miniature feature.
    The miniature architecture should remain valid whether the production PDF
    backend is React-PDF, Takumi, Forme, or another proven renderer.

This report is the only file created by this audit. No application source,
template, PRD, standard, package, dependency, configuration, database,
migration, or previous report was modified. The pre-existing untracked
objective attachment was not created or changed by this audit.