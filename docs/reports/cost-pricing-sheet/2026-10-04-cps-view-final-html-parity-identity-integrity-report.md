# CPS View Final HTML Parity and Identity Integrity Report

This report was written by Muse Spark on 2026-10-04 via OpenCode.

## Objective

Close the remaining CPS View parity and integrity issues: prove the identity tile source, separate client hierarchy from branding, integrate the canonical tenant logo, and converge Edit and Download on the reference treatment. Retire the old HTML as an active design authority.

## Screenshots and References Inspected

- Current production CPS View screenshot (baseline to modify).
- Old reference CPS View screenshot (final parity authority for Edit, Download, and header composition).
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (monogram-as-company rule, soft edit buttons, client and context lines).
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (named in task scope; mobile candidate carried the dossier evidence used here).
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html` (prior canonical form authority, unchanged).

## Skills Used

Skills used: karpathy, react-dev, frontend-design
Documentation standard: ASD-STE100 Simplified Technical English

## Files Inspected

- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/pages/ViewCps.tsx`
- `src/domain/cps/viewData.ts`
- `src/domain/cps/normalize.ts`
- `src/domain/documentMedia.ts`
- `src/components/document-view/shared/DocumentBrandBlock.tsx`
- `src/components/document-view/invoice/InvoiceDocumentCard.tsx`
- `src/components/document-view/quotation/QuotationDocumentPreview.tsx`
- `src/pages/ViewInvoice.tsx`
- `src/hooks/useSettings.js` (via established call sites)
- `src/components/document-view/shared/FloatingDownloadButton.tsx`

---

## Exact Source of LI

`monogram(document.client_name)` in the Dossier identity block of `CostPricingSheetViewPresentations.tsx`. The client `Lorem Ipsum` yields `LI`. The tile therefore showed client initials while occupying the company-brand position. The reference HTML proves that position belongs to the company (`aria-label="Company: Adekunle Kontracts Ltd"` with `AK`).

## Document-Title Data Path

`data.document.title` from `buildCpsViewData`, rendered as the dossier heading with the established untitled fallback. Untouched.

## Client Data Path

Saved `client_name` plus `custom_fields.client_id` and `custom_fields.client_snapshot`, written by the editor client workflow, serialized by `denormalizeToDbCps`, rehydrated by `normalizeDbCps`, and passed through `buildCpsViewData` untouched. The View performs no client fetch.

## Client Snapshot Behavior

Snapshot shape `{ id, name, contact_person, phone, email, city, state }` is preserved at save and read at view. History is stable: later master-record edits cannot rewrite the displayed snapshot.

## Site and Context Behavior

`project_name` (site) and snapshot `contact_person` feed an optional second line. Either part missing vanishes; a fully absent context removes the line. The literal `No site` placeholder is deleted. Audit verdict: it was prototype fallback noise, not project convention. The established `No client` fallback stays for a genuinely missing client.

## Canonical Company and Tenant Logo Authority

`resolveCanonicalLogoUrl(settings)` from `src/domain/documentMedia.ts`, fed by `useSettings()`. It prefers persisted company logo fields in canonical order and rejects temporary URLs. Evidence of established consumers: `ViewInvoice`, `QuotationDocumentPreview`, `InvoiceDocumentCard`, quotation and invoice PDF actions, and the industry adapter. No CPS-specific setting was created. Tenant logo changes propagate automatically.

## Existing Branding Consumers Used as Evidence

Listed above. The fallback convention comes from `DocumentBrandBlock`: configured logo image, else company-name initials.

## Logo Fallback Hierarchy

Configured tenant logo, else tenant company-name initials, else the neutral `CP` module mark (the pre-existing monogram default). Client initials never enter the chain. Document-title initials never enter the chain. The fallback cannot imply client authorship.

## Edit Before and After

Before: mobile dossier Edit was a white outlined ghost control; desktop topbar Edit matched that ghost style. After: both carry the soft reference treatment (brand-soft surface, brand text, compact reference geometry, press feedback). Edit still calls the existing CPS Edit navigation in all three placements (mobile dossier, desktop topbar, desktop rail, which keeps its full-width primary CTA deliberately).

## Download Before and After

Before: saturated primary buttons in the mobile dossier and desktop topbar, plus the download FAB. After: dossier and topbar Download buttons carry the same soft reference treatment. Behavior is preserved exactly: the dossier and topbar Download controls were already inert (no CPS download workflow exists in the repository; no handler was added or removed), and the FAB path is untouched. No download semantics changed because none exist to change.

## Action Behavior Preservation

Edit navigation intact everywhere. Share, theme, More, customize, archive, delete, duplicate, convert, and FAB behaviors untouched. No handler was added to Download in any placement.

## Theme Manager Treatment

Soft buttons reuse the view token set (`--brand`, `--brand-soft`, with existing dark variants). The logo tile uses a white tile with line border, mirroring the established brand-block convention. No geometry tokens changed. Main-form geometry untouched.

## Calculation Freeze Confirmation

No calculation file changed. No formula changed. No View-local arithmetic introduced (verified by test). `calculateCpsTotals.ts` remains the Decimal authority; `buildCpsViewData` consolidation from the prior audit is untouched.

## View Calculation-Authority Preservation

View economics still arrive exclusively through `buildCpsViewData` and its engine totals. Presentations render and format only.

## Exact Files Changed

- `src/components/cps/CostPricingSheetViewPresentations.tsx` (brand mark, client hierarchy, context line, soft buttons, settings and logo imports).
- `src/components/cps/cost-pricing-sheet-view.css` (soft button variant, logo tile, client sub-line, actions layout).
- `src/tests/critical/cpsViewIdentity.test.js` (new, 6 tests).
- This report.

## Tests Added and Updated

New `cpsViewIdentity.test.js` establishes: no client-derived tile, canonical logo authority with company fallback, snapshot-first client hierarchy, no `No site` noise, soft Edit and Download treatment with Edit behavior intact, and no financial arithmetic in the view layer. No existing test was modified. Targeted view, normalize, serialization, and hooks suites pass (19 tests).

## Verification Commands and Results

- `bun run typecheck`: passed.
- Targeted tests: 19 passed, 0 failed.
- `git diff --check`: passed (line-ending notices only).
- `git status`: exact scope confirmed (2 modified files plus test and report from this task; remaining entries belong to concurrent tasks and were not touched).
- `bun run audit:load`: not run. No schema, query, or data-layer logic touched.
- Supabase and migration status: none created, none required, none pushed.
- Explicit confirmation: `bun run build` was not executed.

## Pre-Existing Working-Tree Changes Distinguished

Before this task the tree already contained concurrent work: modified editor, form, list, adapters, and view-data files plus the markup sheet, three tests, and three reports. This task touched none of those.

## Schema and Supabase Status

No migration. No hosted change. Read-only reasoning only.

## Remaining Limitations

- Download controls remain visually complete but functionally inert across the CPS View because no CPS download workflow exists in the repository. Wiring download is a separate task with no foundation in this pass.
- `modeLabel`-style vestigial props elsewhere are outside this scope and untouched.
- Device screenshot validation of the new identity block on small viewports remains human validation.

## HTML Parity Baseline Retired After This Task

HTML parity baseline retired after this task. The old CPS and BOQ HTML candidates no longer control CPS View design decisions. Future work starts from the production View as modified here.
