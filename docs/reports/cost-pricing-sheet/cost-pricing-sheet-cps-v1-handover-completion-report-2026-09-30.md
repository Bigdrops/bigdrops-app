# Cost & Pricing Sheet V1 Handover Completion Report

This report was written by Buffy on 2026-09-30 via Freebuff.

## Objective

Continue the interrupted Cost & Pricing Sheet (CPS) V1 production transplant.

Audit the inherited working tree. Preserve valid work. Correct invalid work.

Correct the production naming architecture. Remove candidate revision numbers (V1, V13, V4.1) from production component names.

Complete the CPS V1 transplant. Verify the result.

## Scope

This task changed presentation, naming, and domain-adapter code only.

This task did not change the database schema, Supabase queries, migration files, PDF rendering, Forme, or the Invoice and Quotation presentations.

This task did not edit the accepted candidate HTML files.

Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

## 1. Work inherited from the interrupted agent

The working tree contained two layers of work.

Layer A is the completed demolition and transplant:

- `BoqEditorParts.tsx` and `BoqFormPresentations.tsx` were deleted.
- `BoqEditor.tsx`, `BoqV13FormPresentations.tsx`, `boq-v13-form.css`, `BoqV41ViewPresentations.tsx`, `boq-v41-view.css`, and `ViewBoq.tsx` were rewritten.

Layer B is the interrupted CPS integration:

- `src/domain/boq/calculateBoqTotals.ts` added `computeBoqRowEconomics`.
- `src/components/boq/BoqEditor.tsx` added the real Client Picker and row economics.
- `src/components/boq/BoqV13FormPresentations.tsx` added the client picker, Site / Project, Notes, and the TCP / TSP / Profit / Margin trio.
- `src/components/boq/boq-v13-form.css` added the CPS presentation classes.
- `src/domain/boq/factories.ts` changed the default title.
- `src/hooks/useBoqSave.ts` added client-required save validation.
- `src/domain/boq/importAdapter.ts` rewrote the import contract.
- `src/tests/critical/boqImportView.test.js` matched the rewritten contract.

The previous typecheck result was unknown.

## 2. Inherited changes that were kept

- `calculateBoqTotals.ts`: `BoqRowEconomics` and `computeBoqRowEconomics` (see item 4).
- `factories.ts`: default title `Cost & Pricing Sheet`.
- `useBoqSave.ts`: `custom_fields.client_id` is required before save.
- `BoqEditor` integration of `ClientSelector` and `computeBoqRowEconomics`.
- Form presentation: client picker, Site / Project, Notes, TCP / TSP / Profit / Margin.
- Form CSS: CPS presentation classes.
- The separate desktop and mobile/fold presentations.
- The separate V4.1 View presentations.

## 3. Inherited changes that were corrected or reverted

| Inherited change | Decision | Reason |
|---|---|---|
| `importAdapter.ts` rewrite (`temp_ref`, `selling_price` contract) | Reverted to the last committed version | The rewrite changed the established import contract. It removed `unit_price`, `cp`, `sp`, `qty`, `image_url`, and `custom_fields` support. The accepted CPS V1 candidate uses `id`, `unit_price`, `cost_price`, and `image_url`. The rewrite was not required by the presentation task. |
| `boqImportView.test.js` rewrite | Reverted to the last committed version | The test was changed only to match the reverted adapter. The restored test covers photo metadata and custom fields. |
| `computeBoqRowEconomics` profit formula | Corrected | The function repeated the row-profit formula. Profit now delegates to the existing `computeRowProfit`. One row-profit formula now exists. |
| Production component names | Corrected | `BoqV13FormPresentations` and `BoqV41ViewPresentations` used candidate revision numbers as permanent production identities. |

## 4. Why `calculateBoqTotals.ts` had been modified

The interrupted agent added about 47 lines. The change adds one interface and one function.

- `BoqRowEconomics` describes row-level economics.
- `computeBoqRowEconomics(row)` returns quantity, CP, SP, TCP, TSP, profit, margin percent, and unit profit.

Reason: the CPS V1 presentation shows per-row TCP, TSP, Profit, and Margin. No authoritative row-level function existed. `computeBoqTotals()` is aggregate only. `viewData.ts` computed the same row values inline.

Review decision: KEEP, with one correction.

- The function uses the locked formulas.
- TCP = CP × quantity.
- TSP = SP × quantity.
- Profit = TSP − TCP.
- Margin = Profit ÷ TSP.
- The function uses the Decimal path.
- The function does not change financial semantics.
- The profit value now delegates to `computeRowProfit`. This removes the duplicate formula.

## 5. Old production presentation filenames removed or renamed

| Old path | New path |
|---|---|
| `src/components/boq/BoqEditor.tsx` | `src/components/cps/CostPricingSheetEditor.tsx` |
| `src/components/boq/BoqV13FormPresentations.tsx` | `src/components/cps/CostPricingSheetFormPresentations.tsx` |
| `src/components/boq/boq-v13-form.css` | `src/components/cps/cost-pricing-sheet-form.css` |
| `src/components/boq/BoqV41ViewPresentations.tsx` | `src/components/cps/CostPricingSheetViewPresentations.tsx` |
| `src/components/boq/boq-v41-view.css` | `src/components/cps/cost-pricing-sheet-view.css` |

The CSS scope selectors changed from `.cps-v13` to `.cps-form` and from `.cps-v41` to `.cps-view`.

## 6. Final durable CPS production component filenames

| File | Exported production component |
|---|---|
| `src/components/cps/CostPricingSheetEditor.tsx` | `CostPricingSheetEditor` |
| `src/components/cps/CostPricingSheetFormPresentations.tsx` | `CostPricingSheetDesktopForm`, `CostPricingSheetMobileFoldForm` |
| `src/components/cps/CostPricingSheetViewPresentations.tsx` | `CostPricingSheetDesktopView`, `CostPricingSheetMobileFoldView` |

The shared form prop type is `CostPricingSheetFormProps`.

The boundary is now:

```text
src/components/cps/        Cost & Pricing Sheet application and presentation
src/components/boq/        legacy BOQ compatibility components (list, import sheet)
src/domain/boq/            legacy BOQ-compatible domain and persistence
```

## 7. Candidate revision numbers in production names

No candidate revision number remains in a new production component name.

`V1`, `V13`, and `V4.1` are removed from production file names, component names, and CSS scope selectors.

A repository search for `BoqV13`, `BoqV41`, `BoqEditor`, `cps-v13`, `cps-v41`, `boq-v13-form`, and `boq-v41-view` returns no match in `src`.

`V1` and `V4.1` remain only in the accepted candidate HTML file names and the historical reports. Design history is not a production identity.

## 8. BOQ identifiers that remain for legacy compatibility

These identifiers remain because they are persistence or domain compatibility contracts:

- Database tables `boqs` and `boq_rows`.
- Type `Boq` in `src/domain/boq/types.ts`.
- Normalization functions `normalizeDbBoq`, `denormalizeToDbBoq`, `denormalizeToDbBoqRow`, `getNextBoqNumber`.
- Calculations `computeBoqTotals`, `computeBoqRowEconomics`, `computeBoqCommercialView`.
- Hook `useBoqSave`.
- Page `BoqFormPage` and routes `/boqs`, `/boqs/edit/:id`.
- Components `BoqList` and `BoqImportSheet`.
- Legacy columns `vendor_name` and `vendor_contact`.

Reason: a rename of these identifiers changes the persistence contract, the routes, or unrelated modules. The user instruction did not authorize a database or repository-wide rename.

Note: the CPS form stores the selected client name in the legacy `vendor_name` column and the Site / Project value in the legacy `vendor_contact` column. The presentation shows neither a Vendor field nor a Reference or Contact field.

## 9. Source of the Client Picker and Add Client behavior

The CPS form reuses `src/components/ClientSelector.tsx`.

`ClientSelector` is the shared production component. `src/components/document/SharedDocumentForm.tsx` renders it. `src/pages/InvoiceFormPage.tsx` and `src/pages/QuotationFormPage.tsx` render `SharedDocumentForm`.

The CPS form uses the same component. It does not use a fake client list, candidate demo data, or a free-text field.

## 10. How Add Client returns and selects the client in CPS

The flow is the live production flow:

1. The user opens the client picker from the metadata panel.
2. `ClientSelector` renders the searchable `Combobox` with a real Supabase client query.
3. The user selects **Add New Client**.
4. `ClientSelector` opens the `ClientForm` dialog.
5. On save, `ClientSelector` inserts the row into `clients`, refetches the list, and selects the new client.
6. `ClientSelector` calls `onClientChange(clientId, clientName, client)`.
7. `CostPricingSheetEditor.patchClient` stores `custom_fields.client_id`, `custom_fields.client_snapshot`, and `vendor_name`.
8. The metadata panel shows the new client name and it is immediately selected.

No CPS-only Add Client implementation exists. Add Client is not a toast.

## 11. Vendor and Reference / Contact confirmation

The CPS form metadata panel has these fields only: Sheet title, Sheet number, Issue date, Client, Site / Project, Notes.

A static search for user-facing `Vendor`, `Contractor`, `Reference`, and `Bill of Quantities` text in `src/components/cps/` returns no match.

Only the legacy field identifiers `vendor_name` and `vendor_contact` remain, as described in item 8.

## 12. Source of TCP, TSP, Profit, and Margin values

The values are authoritative domain values.

- Row values come from `computeBoqRowEconomics()` in `src/domain/boq/calculateBoqTotals.ts`.
- Document totals come from `computeBoqTotals()` through `computeBoqCommercialView()` in `src/domain/boq/calculations.ts`.
- The editor computes row economics and passes them to the presentation.
- The presentation formats the values. The presentation does not calculate them.

The Margin definition is `Profit ÷ TSP`. It is consistent at row level and document level.

## 13. JSON Import status

Operational.

The interrupted rewrite is reverted. The import adapter accepts the established contract: `title`, `client_name`, `site`, `groups`, and `items` with `cost_price`/`cp`, `unit_price`/`sp`, `quantity`/`qty`, `sub_description`/`specification`, `make`/`make_brand`, `image_url`, and `custom_fields`.

The **Import** toolbar action opens `BoqImportSheet`. The focused import test passes.

## 14. Cloudinary photo status

Operational.

- The row photo control uses `uploadItemPhoto()` and `IMAGE_ACCEPT_ATTRIBUTE`.
- Add, replace, and remove photo actions remain.
- The restored import contract accepts `image_url`.
- The restored normalization test verifies the photo metadata round trip.
- The View shows the persisted photo.

## 15. Instant Markup status

Operational.

- The dialog uses `previewInstantMarkup()` and `applyInstantMarkup()` from `src/domain/boq/instant-markup.ts`.
- Percentage and value modes remain.
- Include and exclude participation remains.
- Undo remains.
- Group headers never participate.
- Reapply derives SP from CP and does not compound.
- All nine Instant Markup tests pass.

## 16. Static keyboard-safety findings

- Presentation selection uses `layoutMode` (width) and `hasSeparatingFold`. It does not use visual viewport height.
- `useFoldAwareness` recomputes only when `window.innerWidth` changes. A software keyboard does not switch the presentation.
- The form does not use a `100vh` lock. There is no `100vh` rule in the form CSS.
- The form root uses `min-height: 100dvh`. Content can grow.
- Phone inputs use `font-size: 16px` at a 599px maximum width. This reduces iOS zoom risk.
- The phone Save FAB is fixed at `bottom: calc(82px + env(safe-area-inset-bottom))`.
- The Instant Markup sheet uses `max-height: 86dvh` with internal scrolling only.
- Desktop and mobile/fold DOM compositions remain separate.

Human device validation of the software keyboard is still required.

## 17. Typecheck and test results

Verification:

- `bun run typecheck`: passed. No output.
- Focused CPS tests: passed. 15 tests, 15 pass, 0 fail.
  - `src/tests/critical/boqInstantMarkup.test.js`
  - `src/tests/critical/boqNormalize.test.js`
  - `src/tests/critical/boqImportView.test.js`
- Full suite: 506 tests, 501 pass, 5 fail.
- The 5 failures are pre-existing and unrelated. They fail on the inherited tree before this task. They fail because `src/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL`, which is undefined in the node test runner.
  - `invoiceAccountingIntegration.test.js`
  - `paymentAccountingIntegration.test.js`
  - `remediationContract.test.js`
  - `sourceTransactionContract.test.js`
  - `itemCleanupExportImport.test.js` (one assertion)
- `git diff --check`: passed. Git reports line-ending warnings only.
- `git status`: captured before and after. See items 2, 3, and 18.
- `bun run audit:load`: not run. No query, schema, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy.

## 18. Exact final files changed

Created:

- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-form.css`
- `src/components/cps/cost-pricing-sheet-view.css`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-cps-v1-handover-completion-report-2026-09-30.md`

Removed (moved to `src/components/cps/`):

- `src/components/boq/BoqEditor.tsx`
- `src/components/boq/BoqV13FormPresentations.tsx`
- `src/components/boq/boq-v13-form.css`
- `src/components/boq/BoqV41ViewPresentations.tsx`
- `src/components/boq/boq-v41-view.css`

Modified:

- `src/pages/BoqFormPage.tsx` (import and component name)
- `src/pages/ViewBoq.tsx` (import and component names)
- `src/domain/boq/calculateBoqTotals.ts` (row-economics deduplication)

Reverted to the last committed version:

- `src/domain/boq/importAdapter.ts`
- `src/tests/critical/boqImportView.test.js`

Pre-existing changes that this task did not touch:

- `docs/prompts/prompt66.md`
- `src/components/Layout.tsx`
- `src/components/layout/DesktopSidebar.tsx`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-presentation-demolition-report-2026-09-30.md`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-v13-v41-presentation-transplant-report-2026-09-30.md`
- `src/components/boq/BoqEditorParts.tsx` (deleted by the demolition)
- `src/components/boq/BoqFormPresentations.tsx` (deleted by the demolition)

## Verification result

```
Verification:
- bun run audit:load: not run (no query, schema, or data-layer change)
- bun run typecheck: passed
- focused CPS tests: passed (15/15)
- full test suite: 501/506 passed, 5 pre-existing environment failures
- git diff --check: passed
- git status: captured
- supabase db push: not applicable
- bun run build: skipped due to hardware policy
```

## Supabase push status

Supabase push status: not applicable.

No migration was created. No SQL changed.

## Risks or limitations

- Browser screenshot validation was not run. Static inspection and typecheck cannot prove pixel-level fidelity.
- Human phone and fold keyboard testing is still required.
- The `clients` insert in `ClientSelector` is the live production path. The CPS form now depends on a client before save.
- Legacy `vendor_name` and `vendor_contact` columns store the client name and the Site / Project value. A future schema migration can rename these columns.
- The old presentation paths remain as intent-to-add index entries. They resolve on the next `git add -A`.
- Five critical tests fail in the node test runner because Supabase environment variables are absent. This is pre-existing.
- `bunx eslint src/components/cps` reports one inherited error (`set-state-in-effect` for the column-sync effect in `CostPricingSheetEditor.tsx`) and two inherited warnings (logical-expression dependencies). `BoqFormPage.tsx` and `ViewBoq.tsx` also report inherited errors (ref access during render, explicit `any`). These are inherited. This task did not introduce a new lint error.

## Deferred work

- Human desktop visual test against the accepted CPS V1 candidate.
- Human phone and fold visual test.
- Human mobile keyboard test for metadata, row, CP, SP, quantity, import, and Instant Markup inputs.
- Rename the legacy `vendor_name` and `vendor_contact` columns in a separate, approved schema task.
- PDF and Forme work.
