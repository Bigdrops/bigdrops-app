# CSR Concept Redesign Report

This report was written by Buffy on 2026-10-26 via Freebuff Desktop.

## Objective

Produce three visually and structurally different HTML concepts for the BOUXRE Customer Service Report (CSR). The product owner will review the concepts and choose one or two.

## Scope

- Design exploration only.
- Three self-contained A4 HTML prototypes.
- No production code, template, renderer, manifest, or lockfile changed.
- No Takumi or Forme integration.

## Files changed

| File | Action |
| --- | --- |
| `docs/reports/pdf/poc/csr/csr-concept-01.html` | Replaced the rejected prototype |
| `docs/reports/pdf/poc/csr/csr-concept-02.html` | Replaced the rejected prototype |
| `docs/reports/pdf/poc/csr/csr-concept-03.html` | Replaced the rejected prototype |
| `docs/reports/pdf/csr-concept-redesign-report.md` | New report (this file) |

The `docs/reports/pdf/poc/csr/` directory was untracked before this task. It held the earlier rejected concepts at the same three paths. No second directory was created.

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Field source

Field inventory came from the CSR form and domain model:

- `src/components/csr/CsrFormScreen.tsx` — sections 01 to 10.
- `src/domain/csr/csrRenderModel.ts` — render model and display fields.
- `src/components/csr/csrUtils.ts` — materials rows, meta defaults, sign-off meta.
- `src/components/csr/preview-templates/` — label wording and footer pattern.
- `docs/reports/pdf/csr-one-page-pdf-renderer-investigation.md` — A4 page budget and fixed footer requirement.

Render rule applied: the render layer is read-only. Values appear exactly as supplied. Empty fields stay blank with a neutral `—`. No value was computed, merged, or invented.

## Changes made

### Structural descriptions (defined before build)

| Concept | Composition | Reading order | Column strategy |
| --- | --- | --- | --- |
| 01 Industrial Engineering Record | Masthead band, then a two-column sheet. Document-control rail on the left, technical column on the right. Sign-off sits at the base of the rail. | Rail fields first (`§A` document, `§B` service parameters, `§C` service window), then right column: equipment schedule, measured values, clause-numbered service record, parts schedule. | Fixed 54 mm rail + 1 mm-hairline separator + wide technical column. |
| 02 Editorial Field-Service Report | Masthead, standfirst lede, then a narrative column beside a narrow technical column, then a full-width ledger, then a colophon. | Title, problem reported as lede, narrative sections 01–04, technical data in the right column, ledger, colophon sign-off. | Asymmetric: serif narrative with numbered margin labels, narrow right data column, full-width ledger. |
| 03 Field Technician Service Sheet | Single column of nine numbered sections. Each section has a solid header bar and boxed form fields. | Strict top-down form order: 1 client and site, 2 service parameters, 3 equipment, 4 reported problem, 5 work performed, 6 findings and action, 7 measured values, 8 parts, 9 sign-off. | Single column with internal 3-column field grids, 2-column findings split, 2-column sign-off. |

Other axes of difference:

| Axis | 01 | 02 | 03 |
| --- | --- | --- | --- |
| Typography | Sans + mono, tracked small labels | Georgia serif display + sans labels | Uppercase sans/mono form labels |
| Readings | Instrument register strip with tick marks and vertical rules | Mono value rows in a data list | Boxed field grid (3 x 2) |
| Narrative | Clauses 3.1–3.5 with hanging labels | Serif running text with margin labels | Text boxes with functional split (work, observation, corrective action) |
| Materials | Parts schedule (No. / Item / Qty / Unit) | Leader-dot ledger rows | Parts schedule with tick column |
| Sign-off | Inside the left rail, ruled signature lines | Colophon baselines across the page foot | Two bordered signature boxes with name/title/date cells |
| Colour | Graphite, warm white, safety orange | Warm ivory, ink, terracotta | Paper monochrome, blue-black accent |
| Status meaning | Written text `OPERATIONAL` | Written text `OPERATIONAL` | Tick box plus written text `OPERATIONAL` / `DOWN` |

### Print mechanics (all three)

- `@page { size: 210mm 297mm; margin: 0; }`.
- Sheet fixed at 210 x 297 mm. Content uses flex/grid flow.
- No `position: absolute` layout, no `overflow: hidden`, no `text-overflow`, no fixed-height narrative box, no ellipsis.
- Review toolbar is hidden in `@media print`.
- No network asset, no `@import`, no external image, no emoji, no animation, no `@keyframes`, no pulsing indicator.

## Verification result

Data fidelity (fixed-string match, all three files):

- All four narrative texts: present, verbatim, in all three files.
- Voltage string `392 V average across 3 phases`: present in all three. No per-phase value added.
- Equipment values: Generator, Cummins, NT-855-G6, blank serial, 25598493, 350 kVA, Plot C89 address: present in all three.
- Readings: 50 Hz, 27.3 V, 74 °C, 704 kPa, 9329.4: present in all three.
- Dates 2026-10-26: present in all three.
- Materials: Fuel Filter FS1212 (2), Oil Filter LF9009 (1), Water Filter WF2074 (1), Engine Oil (50, Litres): present in all three. No unit added to the filters.

Field coverage: CSR number, report date, client account, client address, customer contact, P.O. number, call type, service basis, system status, status after service, service start, service end, equipment type, equipment location, make, capacity, model, serial number, engine number, problem reported, service rendered, defects found, engineer remarks, customer feedback, six operational readings, materials rows, customer acknowledgement (name/title/signature/date), technician sign-off (name/role/signature/date), footer line. Label wording differs by concept; coverage is equivalent.

Physical page count (real print, not CSS claim):

| Concept | Method | Pages | MediaBox (pt) |
| --- | --- | --- | --- |
| 01 | Chrome headless `--print-to-pdf` on `file://` | 1 | 594.96 x 841.92 (A4) |
| 02 | Chrome headless `--print-to-pdf` on `file://` | 1 | 594.96 x 841.92 (A4) |
| 03 | Chrome headless `--print-to-pdf` on `file://` | 1 | 594.96 x 841.92 (A4) |

Page objects and `/Count` both returned 1 for each file.

The first print run failed for 02 (2 pages, 20 px over) and 03 (2 pages, 68 px over). Spacing was corrected from measured overflow, then the print was repeated. Layout measurements after the fix: 01 both columns end at 1084 px of a 1123 px page; 02 no column hole over 19 px, 17 px free above the colophon; 03 42 px free above the footer.

- bun run audit:load: not applicable (no TypeScript source changed)
- bun run typecheck: not applicable (no TypeScript source changed)
- git status: unchanged except the three prototype files inside the pre-existing untracked `docs/reports/pdf/poc/csr/` directory and this report
- supabase db push: not applicable
- bun run build: skipped due to hardware policy

Git status was read before and after the task. The modified production files listed at task start (`src/components/csr/*`, `src/pages/*`, `src/domain/csr/csrService.ts`, PRD and prompt docs) were not touched by this task.

## Risks or limitations

- Final screenshot capture failed because the host window was covered. Visual review of all three concepts was completed earlier in the session at the top and bottom of each page. The later edits were spacing and label changes, and each was re-measured and re-printed.
- Page count evidence comes from this machine's Chrome print engine. Another engine may round differently. Free space is 17 to 42 px, so a very small drift is tolerable, not a guarantee on every renderer.
- The fixture does not supply CSR number, report date, client name, client address, contact, P.O. number, call type, service basis, status after service, times, serial number, customer feedback, or names. These render as `—` or an empty field. No placeholder text such as "Client Name On File" was used.
- No approved BOUXRE logo file exists in the repository. The concepts use the `BOUXRE` wordmark as text. No logo mark was drawn.
- Footer text is a settings value (`branding.footerText`) that the fixture does not supply. Each concept uses a neutral document-control footer: company name, document title, service date, `Page 1 of 1`.
- Fixed string `OPERATIONAL` in concept 03 is written as `Operational` with `text-transform: uppercase`; the printed result is `OPERATIONAL`.

## Deferred work

- Production CSR template implementation.
- Renderer selection (Forme or Takumi) and density logic.
- Concept selection by the product owner.
