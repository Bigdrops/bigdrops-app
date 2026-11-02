# Landscape Forme Interior Rebuild Report

This report was written by Qoder on 2026-11-02 via Qoder Desktop.

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Rebuild the interior of the Landscape Forme commercial PDF template. Keep the landscape orientation, the ruler, the framing, and the engineering identity. Replace the former specimen-like interior with a commercial document that uses only fields from the application forms and the authoritative data contract.

## Scope

- Template: `landscape` (Forme route `landscape-forme`).
- Documents: invoice and quotation.
- Modes: normal and compact.
- Out of scope: Industry Forme, Industry React-PDF, Minimal Forme, shared layout infrastructure, database schema, and totals calculation.

## Files changed

| File | Type | Change |
| --- | --- | --- |
| `src/components/pdf/forme/LandscapeFormeDocument.tsx` | Production | Interior rebuild |
| `scripts/tmp-landscape-qa.ts` | QA harness (untracked) | 23-case render, raster, and text check |
| `docs/reports/invoice-quote/artifacts/landscape-forme/**` | Evidence (untracked) | PDFs, PNG rasters, manifest, failure log |
| `docs/reports/invoice-quote/2026-11-02-landscape-forme-interior-rebuild.md` | Report (untracked) | This report |

No other tracked file changed during the rebuild. The Landscape template implementation itself is part of commit `63f44ea3`.

## Authoritative field inventory

The template reads `CommercialDocumentData` from `src/components/pdf/industryAdapter.ts`. It does not read form state directly. It does not infer fields from the HTML specimen.

| Source field | Document location | Rule |
| --- | --- | --- |
| `company.companyLogoUrl` | FROM block | Shown when a logo URL exists |
| `company.name` | FROM heading; fixed footer | Shown when present |
| `company.tagline` + `showTagline` | Under company name | Shown only when enabled and non-empty |
| `company.customInfo[]` | Stacked label/value lines under the company identity | Empty values collapse |
| `company.address`, `company.cityState` | Address lines | Empty lines collapse |
| `company.phone`, `company.email`, `company.website` | Contact line | Separators appear only between present values |
| `title`, `customTitle` | Navy identity block | `customTitle` replaces `title` when present |
| `documentNumber`, `documentNumberLabel` | Navy identity block | Always shown |
| `issueDate`, `issueDateLabel` | Document Details | Shown when present |
| `dueDateOrValidityDate`, `dueDateOrValidityDateLabel` | Document Details | Invoice uses Due Date; quotation uses Valid Until |
| `poNumber`, `poNumberLabel` | Document Details | Shown when present |
| `customHeaderFields[]` | Document Details | Empty values collapse |
| `client.name`, `client.attention` | CLIENT block | Attention line shown when present |
| `client.address`, `client.cityState`, `client.phone`, `client.email` | CLIENT block | Empty lines collapse |
| `table.columns[]` | Schedule header and cells | Supports any authoritative column, including optional Make, Install Rate, VAT Rate, and Discount Rate |
| `table.rows[]` item rows | Schedule body | Item number, description, specification subline, and optional item image |
| `table.rows[]` group rows | Group header | Key, title, and group item count |
| `groupSubtotalLabel`, `groupSubtotalValue` | Group footer | Shown only when the source supplies a subtotal |
| `totals.lines[]` | Summary ledger | Deduction lines use an amber row |
| `totals.mainLine` | Hero total payable | Label and value come from the model |
| `totals.balanceDue` | Summary ledger | Shown only when it differs from the hero total |
| `advanceSummary` | Summary ledger | Advance amount and balance remain when supplied |
| `totals.amountInWords` | Words panel | Text comes from the existing resolver |
| `paymentDetails` + `showBankDetails` | Bank Details block | Shown only when enabled and supplied |
| `notes` | Notes box | Rich text and lists preserved |
| `terms` | Terms box | Rich text and lists preserved |
| `attachments[]` | References | Label and URL only |
| `additionalFields[]` | Additional Details | Two-column label/value grid |
| `signature.name`, `role`, `imageUrl`, `signedAt` | Signature block | Image and date are optional |
| `footer.extraText` | Footer note | Shown when present |
| `footer.companyName`, `footer.documentNumber` | Fixed navy footer | Company, sheet count, document number |
| `layout.orientation` | Page geometry | Landscape is forced for this template |

## Design and implementation summary

- Page: A4 landscape, 841.89 × 595.28 pt. Horizontal margin is 22 pt. Content width is 797.89 pt.
- Header: fixed 12-cell ruler. The ruler keeps the engineering identity and does not overlap body content.
- Footer: fixed navy band. It shows the company name, `Sheet X of Y`, and the document number.
- Masthead: two-column table. The FROM block holds identity, tagline, custom info, address, and contact data. The navy block holds the document title, optional subtitle, number label, and number.
- Client and details: two-column table. The CLIENT block is on the left. DOCUMENT DETAILS is a right-aligned label/value grid on a tinted surface.
- Schedule: navy band with item and group counts. The column header repeats on each page. The group header repeats on each page. Rows use zebra tinting. Descriptions use a main line and an optional specification line. Item images are optional. Groups can show a subtotal footer.
- Group continuity: a group with six or fewer image-free rows is kept on one page. Large groups can break. The group header and column header repeat after a break.
- Summary: two-column closing. The left column holds ledger lines, deductions, optional balance due, optional advance details, and optional bank details. The right column holds the total payable and amount in words.
- Closing: Notes and Terms are side by side when both are short. Long sections stack. Long plain-text notes split at clause boundaries into readable paragraphs.
- References and Additional Details use their own bands and collapse when empty.
- Signature: label, optional image, navy rule, name, role, and optional signed date. The block moves to the next page as a unit when space is insufficient.
- Totals are never calculated in the template. All monetary values, labels, and amount-in-words text come from the data contract.
- Currency glyphs use the existing `glyphRuns` resolver. No currency is hardcoded.
- Compact mode reduces padding and type scale. It keeps the same content and hierarchy.

## Raster evidence

All PDFs and rasters are in `docs/reports/invoice-quote/artifacts/landscape-forme/`.

| Case | Type | Items | Pages |
| --- | --- | --- | --- |
| invoice-standard | Invoice | 8 | 2 |
| invoice-single | Invoice | 1 | 2 |
| invoice-large | Invoice | 60 | 5 |
| invoice-large-ungrouped | Invoice | 45 | 4 |
| invoice-longdesc | Invoice | 14 | 4 |
| invoice-longclient | Invoice | 6 | 2 |
| invoice-longcompany | Invoice | 6 | 2 |
| invoice-missing | Invoice | 4 | 1 |
| invoice-optional-cols | Invoice | 10 | 3 |
| invoice-deductions | Invoice | 8 | 2 |
| invoice-zero | Invoice | 4 | 2 |
| invoice-rich-notes | Invoice | 6 | 3 |
| invoice-long-notes | Invoice | 6 | 3 |
| invoice-no-bank | Invoice | 6 | 2 |
| invoice-no-signature | Invoice | 6 | 2 |
| invoice-images | Invoice | 5 | 2 |
| invoice-signature-image | Invoice | 5 | 2 |
| invoice-additional-fields | Invoice | 5 | 2 |
| invoice-compact | Invoice | 30 | 3 |
| invoice-custom-font | Invoice | 6 | 2 |
| quotation-standard | Quotation | 10 | 3 |
| quotation-long | Quotation | 30 | 4 |
| quotation-missing | Quotation | 3 | 1 |

Total: 23 cases, 58 pages. Every page was rasterized at 2× (1684 × 1191 px) and inspected.

## Defect ledger

| Defect | Class | Fix | Status |
| --- | --- | --- | --- |
| Group subtotal orphaned from its rows | Pagination | Keep image-free groups of six rows or fewer together | Fixed |
| Balance row duplicated the hero total | Content | Suppress balance due when the value equals the main total | Fixed |
| Summary columns unbalanced when bank details were present | Visual hierarchy | Move bank details under the ledger | Fixed |
| References band orphaned at page bottom | Pagination | Keep short reference lists with their band | Fixed |
| Long plain-text notes rendered as one dense paragraph | Visual hierarchy | Split at clause and sentence boundaries | Fixed |
| Stray rule above the signature label | Geometry | Reorder label, image, rule, and name | Fixed |
| QA harness required title and number on every page | Harness | Check them on page 1 only | Fixed |
| QA harness used a hardcoded amount-in-words string | Harness | Use the existing money formatter | Fixed |
| QA custom-font case used a non-selectable font | Harness | Use Inter | Fixed |
| Bordered Notes/Terms boxes show only side borders after a page break | Pagination | Accepted Forme split behaviour; no content loss | Accepted |
| Small group can move to the next page and leave blank space | Pagination | Accepted trade-off for group integrity | Accepted |

## Verification

Verification:
- `bun run typecheck`: passed
- `bun test src/tests/pdf/formeCommercialBatch1.test.ts src/tests/pdf/pageLayoutPipeline.test.js src/tests/pdf/templateIds.test.js`: 11 pass, 0 fail
- `bun test src/tests/pdf/formeIndustrialTemplate.test.ts src/tests/pdf/formeIndustryRefinement.test.ts src/tests/pdf/formeIndustryTemplate.test.ts src/tests/pdf/dualIndustryRendererRouting.test.ts`: 44 pass, 0 fail
- `bunx eslint src/components/pdf/forme/LandscapeFormeDocument.tsx`: no findings
- `bun run scripts/tmp-landscape-qa.ts`: 23 cases, 58 pages, 0 failures
- `bun run audit:load`: not run; no schema, query, or data-layer change
- `bun run build`: skipped by project policy
- `git status`: no modified tracked files; only untracked QA, evidence, and report files
- `supabase db push`: not applicable

## Risks or limitations

- Forme splits a bordered `View` across pages. Continuation pages can show side borders only. Content is not lost.
- The ruler and fixed footer reduce the body area. Long clauses can use several pages. The body never overlaps the footer.
- Optional monetary columns compress the description column. The template still renders ten columns at 797.89 pt.
- `Noto Sans` is not a selectable body font. The template uses Inter for body text.
- The QA fixture uses a 1 × 1 red pixel for the logo and item images. The red blocks in the raster evidence are test data, not placeholders in the template.

## Deferred work

- Native visual regression snapshots for future template changes.
- A permanent QA harness location outside `scripts/tmp-*` if the team wants repeatable template checks.

## Template impact

This rebuild changed only `LandscapeFormeDocument.tsx`. Industry Forme and Minimal Forme were not edited. Their test suites pass. The Landscape route still resolves to `landscape-forme` for invoices and quotations. Preview and download keep the same resolved landscape page layout.
