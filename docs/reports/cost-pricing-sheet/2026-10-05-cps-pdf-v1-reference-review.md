# CPS PDF v1 Reference Review Report

This report was written by Muse Spark on 2026-10-05 via Opencode.

## Objective

- Review `docs/templates/html-temps/cps-pdf-v1.html` as saved, against production Forme CPS output.
- Map each reference concept to representable, model-change, or unsupported.
- Answer the clickable-thumbnail question with installed-package evidence.
- Give the design council one recommendation. No code changes.

## Scope

- Read-only investigation. Zero application edits. Zero HTML edits.
- Reference is exploratory. It is not approved for adoption.
- A4 portrait is fixed. No landscape recommendation.
- Status presentation, signatures, group enumeration, and "Commercial Group" text are out of direction.

## Files Changed

- NONE. This report is the only file created.
- Pre-existing worktree changes (another agent's contiguous-domain task) were left untouched.

## Skills Used

Skills used: pdf-rendering-correctness, karpathy, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

Note: `frontend-design` is not a registered skill. The index holds no such skill. `design-artifact` served as the HTML-artifact design lens.

## Reference State (As Saved)

- Title: "CPS — Portrait A4 Concept". Canvas 794 px. Print block: A4 portrait, zero margin.
- Header grid 178 px / 1 fr / 150 px: brand rail, document identity, meta sidebar.
- Brand: logo box, company name, tagline, address, phone, email lines.
- Identity: "COST & PRICING SHEET" (20 px navy), accent rule, "Title" label, document title.
- Meta: document number (mono), Issued row, Currency row. No status row.
- Context band: Client zone (name, address, contact person, phone, email) plus Project/Site zone (name, scope, locality). Separate zones.
- Financial strip: Total Cost, Selling Total, Gross Profit, Margin (navy cell).
- Schedule: "Cost Schedule" plus item counter. Seven columns: No. / Description-Specification / Qty / Unit CP / Unit SP / Total Cost / Total Sell.
- Rows: serial, bold description, muted spec, navy uppercase make tag, qty with small unit, four money cells.
- One thumbnail wrapped in `<a href="external-url" target="_blank">`. Hover zoom is screen-only.
- Groups: full bordered wall, navy header (title plus "N Items" pill), inset member rows, figures-only footer (CP total, SP total, no subtotal label).
- Closeout: Notes (no signature block) plus four-row totals box.
- Footer: company left, number plus page right.

## Mapping: Reference Concept to Production Forme

Status key: YES (supported), PARTIAL (works with limits), MODEL (needs prepared-model addition), VIEW (presentation-only change), NO (unsupported or data missing).

| # | Reference concept | Production equivalent | Status | Data and model implication | Presentation implication | Risk |
|---|---|---|---|---|---|---|
| 1 | A4 portrait geometry | `pageSize()` returns `A4`; margins 38 pt | YES | None | Margin parity is a design choice, not a defect | None |
| 2 | Brand rail (logo, name, tag, address, phone, email) | Logo plus company name in `DocHeader`; address lines render under "From" parties zone | PARTIAL | No tagline field is threaded; address lines exist in `companyLines` | Move company lines into the rail; tagline needs a source check | Low |
| 3 | Doc-type prominence | Accent eyebrow plus title in `DocHeader` | YES | None | Type scale delta only (20/15 px vs 10/18 px) | None |
| 4 | Document title | `model.title` | YES | None | None | None |
| 5 | Number, issued date | `model.number`, `model.issueDate` | YES | None | None | None |
| 6 | Currency row (NGN) | No model field; NGN literal already established in CPS view layer (`ViewCps.tsx:28-29`) | VIEW | None; reuse the existing constant, never hardcode a second one | Add one meta row | Low; decide row vs suffix |
| 7 | Client name | `model.clientName` | YES | None | None | None |
| 8 | Client contact, phone, email | Snapshot holds all three, but the handler routes phone/email into `companyLines` (`pdfDownloadHandler.ts:196,205`) | MODEL | Reroute into client lines; data already exists | Rearrange only | Low; current routing is arguably a defect |
| 9 | Client street address | Snapshot holds id, name, contact, phone, email, city, state. No street field (`CostPricingSheetEditor.tsx:257-265`) | NO | Genuinely unavailable; do not invent | Drop the street line; city/state suffice | Low if accepted |
| 10 | Project/site as separate zone | `model.site` zone | YES | None | None | None |
| 11 | Financial strip (4 metrics) | `model.totals` holds all four values; rendered once at closeout | VIEW | None | Render the same array twice | Low |
| 12 | Seven-column schedule | Six column keys; no Total Cost column | MODEL | `row.cost` exists in view data (`viewData.ts:144`) but `toItemRow` drops it; add one prepared field | Add one column behind CP visibility | Low |
| 13 | Description/spec hierarchy | Bold description plus muted spec | YES | None | Type scale delta only | None |
| 14 | Navy uppercase make tag | Muted make subline | VIEW | None | Restyle only | None |
| 15 | Qty with small unit | Single `quantityText` string ("10 bags") | PARTIAL | Clean fix is two model fields (quantity, unit); data exists in view rows. Do not string-parse. | Stacked layout | Low |
| 16 | Standalone rows | Item segments | YES | None | None | None |
| 17 | Full bordered group wall | Flat header band plus subtotal rows; no surrounding border | VIEW | None | Border-segment technique (see §Group feasibility) | Medium; pagination |
| 18 | Group title | `CpsFormeGroup.title`, header band | YES | None | None | None |
| 19 | "N Items" counter | `itemCount` rendered as subline; reference uses a header pill | VIEW | None | Move into header | None |
| 20 | Group footer CP plus SP figures | Only selling subtotal accumulated (`viewData.ts:84` sums `selling`) | MODEL | Accumulate `row.cost` per segment; data exists per row | Two figure cells | Low |
| 21 | Thumbnails | `imageDataUri`, 58 px vs reference 40 px | YES | None | Size delta only | None |
| 22 | Closeout totals (4 rows) | `DocTotals` with margin emphasis | YES | None | None | None |
| 23 | Notes (conditional) | `DocNotes`, null when empty | YES | None | None | None |
| 24 | Footer identity | Number plus page X of Y; company name absent | VIEW | `companyName` already in model | Add left cell | None |

## Image Question: Can a Forme Item Image Be Clickable

Short answer: the API supports it, but no repository proof shows it works in output. Treat as unproven until one proof test runs.

1. External URI hyperlinks: yes at vendor level. Core README states "PDF generation with links, bookmarks, images, and SVG" (`node_modules/@formepdf/core/README.md`).
2. Primitive: `<Image href="https://...">`. Type doc: "Optional hyperlink URL — makes the image clickable" (`@formepdf/react/dist/types.d.ts:140-141`). Text links use `<Link href>` inside `<Text>`; SVG also takes `href`.
3. Image wrapping: not needed. `href` is a direct `Image` prop. Serializer copies it to the node (`serialize.js:579-580`).
4. Overlay positioning: unnecessary. Direct support exists, so no overlay design is required.
5. Browser path: expected to survive. `renderDocument` serializes, resolves fonts/images, then calls WASM (`core/dist/browser.js:39-51`). `resolveImagesInNode` rewrites only `kind.src`; it never reads `href` (`browserHelpers.js:47-66`). The href string reaches the engine untouched.
6. Viewer behavior (assessment, not repo evidence): standard URI link annotations open in compliant viewers (Acrobat, Chrome, Edge, Firefox, Android viewers). Some viewers confirm before opening external URLs. No repository test proves the annotation is emitted.
7. External annotation, no fetch. Nothing in the pipeline fetches `href`. The linked file is never embedded.
8. Yes. Thumbnail keeps rendering from `imageDataUri` while `href` carries the original URL. The two fields are independent (`src` vs `href`).
9. Rendered image: `CpsFormeRow.imageDataUri` ← `photoDataUris[row.key]` ← fetched data URI of `row.image_url` (`pdfDownloadHandler.ts:252-263`). Original URL: `row.image_url` on table rows, preserved into view rows as `imageUrl` (`viewData.ts:149`).
10. The URL stops at the `photoDataUris` map. Only the data URI crosses into `buildCpsFormeModel`. The original URL is discarded there.
11. Prepared-model and handler addition only. Add one row field (for example `imageHref`) plus a parallel URL map. No schema change: `image_url` is already persisted per row.
12. Security: yes, concerns exist. Arbitrary external targets are a phishing surface (a trusted-looking sheet linking elsewhere). Recommend: accept `https` only, reject `javascript:` and non-HTTP schemes, prefer already-trusted upload hosts. Also note generation-time fetch of `http` (non-TLS) image `src` can fail under a secure page; Supabase URLs are `https`, so current data is safe.

Prior art and explicit gaps:

- The migration audit already flags this: "Asset policy and remote behavior unproven" and "Link annotation/output behaviour needs proof" (`pdf-renderer-capability-replacement-and-template-preview-audit.md:437`; `pdf-rendering-migration-standards-reconciliation.md:369,378,452`).
- The legacy Industry template pairs a thumbnail with a separate "Open image" text link (`IndustryTemplate.tsx:355-361`). That caption-link pattern is the proven fallback if image-href output ever fails proof.
- POC Forme documents render `Image` without `href`. No Forme output test covers links.

## Portrait Feasibility: Seven Columns

Viable, with conditions. Arithmetic on A4 (595.28 pt, current 38 pt side margins, 519.28 pt content):

- Reference proportions scaled to content width give the description roughly 280 pt, but that assumes 44–52 pt money columns. At 9 pt mono, a 12-character figure ("₦108,836,100") needs about 65 pt plus padding. Columns that narrow will overflow.
- Current template uses 78/88 pt money columns at 9 pt and fits. Seven columns at that scale consume about 424 pt fixed, leaving about 95 pt for description.
- Conditions: money type at 8–8.5 pt, thumbnail capped at 40–46 px, narrow No./Qty columns, description floor near 110 pt, group border plus padding budgeted near 20 pt.
- Pressure points in order: long specs (wrap to 3–4 lines and inflate row height), large NGN totals (widest cell governs), thumbnails inside the description column (vertical cost per row), group wall padding (steals horizontal room on every member row), page-break widows (a tall wrapped row can strand a group footer).

## Group Feasibility: Bounded Wall Across Pages

- Per-edge borders are type-supported (`borderTopWidth`, `borderLeftColor`, and siblings in `FormeStyle`). A segmented wall (top on header, left/right on edge cells, bottom on footer) is the practical construction. It paginates naturally and breaks cleanly at page edges.
- A single unbroken container around header plus members plus footer is not practical. Forme `Table` children must be rows; a `View` cannot wrap table rows. Do not design for it.
- `wrap: false` (keep-together) exists per node and the current template already uses it for totals and notes. Never apply it to a whole group: a group taller than one page would overflow instead of breaking.
- Group header rows are body rows, not `<Row header>`. Only the column header row auto-repeats (vendor README; current template relies on it). A group title will not repeat after a page break. A "(cont.)" repeat needs split awareness the engine does not expose; do not require it.
- Footer attachment: keep the footer with the last member only if the engine proves row-pair keep-together. That behavior is unproven. Default rule: let the footer flow; never orphan it alone is desirable but not enforceable today. Proof test decides.
- Recommendation: segmented wall, header band plus count pill, figures-only footer, no keep-together on groups, repeat only the column header. Accept wall discontinuity at page breaks as standard print behavior.

## Acceptance Answers

1. What changed vs production: portrait 7-column schedule with Total Cost, financial strip, client/project band, full group wall with count pill and figures-only footer, clickable thumbnails, company footer, no status, no signatures.
2. Maps cleanly: geometry, identity, title, number, date, client name, site zone, description hierarchy, standalone rows, group title, thumbnails, closeout totals, notes, page identity.
3. Need model changes: Total Cost column, group cost subtotal, qty/unit split (clean form), client phone/email reroute, image href field, footer company.
4. Need presentation only: currency row, financial strip, make tag, count pill placement, group wall segments, footer company cell.
5. Not supported or missing data: client street address (no source field); unbroken group container (engine structure); group header repeat after break (unproven); image-href output (unproven).
6. Clickable thumbnail: API yes, output proof no.
7. How: `<Image src={dataUri} href={originalUrl}>`. Limits: one proof test still required; viewer confirm prompts possible.
8. Blocker: no blocker proven; missing proof is the gap.
9. Original URL preserved: no. It stops at the `photoDataUris` map in the handler.
10. Seven columns in portrait: yes, with smaller money type, capped thumbnails, and a description floor.
11. Pagination risks: tall wrapped rows, stranded footers, wall discontinuity, non-repeating group headers.
12. Adjustments before approval: drop street address line; decide currency row vs suffix; confirm "Margin" vs "Profit Margin" label; keep portrait default; run the link proof test; define compact-template relationship.

## Risks Or Limitations

- This review is static only. No render, build, typecheck, or lint ran, per task instruction.
- WASM internals are opaque. Claims about annotation emission rest on vendor docs and serializer source, not observed output.
- Another agent's contiguous-domain changes are in the worktree and were not examined beyond status capture.
- `frontend-design` is not a registered skill; its absence is recorded, not worked around silently.

## Deferred Work

- One proof test: render a single `<Image href>` through `renderDocument`, inspect bytes for the URI annotation. Exit criterion for the recommendation below.
- Row-pair keep-together probe for group footers (same test harness).
- Compact template relationship decision (council).
- Client street address: product decision (extend snapshot vs drop the line).

## Verification

Verification:

- git status before: captured; six modified plus three untracked files, all pre-existing and untouched
- git status after: captured below; identical apart from this report
- Application edits: none (zero)
- HTML reference edits: none (zero)
- bun run audit:load: not run per task instruction
- bun run typecheck: not run per task instruction
- lint: not run per task instruction
- supabase db push: not applicable
- bun run build: not run per task instruction

## RECOMMENDATION

C. A specific Forme/data limitation must be resolved before design approval.

Reason: the clickable thumbnail is the reference headline interaction, and image-href annotation output is unproven in the installed stack despite full API support. One proof test (single image plus href through `renderDocument`, byte-inspect for the URI annotation) closes it. Approve the design after that test passes, with the street-address line dropped and the listed model additions scoped in planning.
