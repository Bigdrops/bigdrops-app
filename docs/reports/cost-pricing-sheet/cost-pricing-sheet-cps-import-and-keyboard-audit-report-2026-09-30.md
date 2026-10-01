# Cost & Pricing Sheet Import Contract and Keyboard Safety Report

This report was written by Buffy on 2026-09-30 via Freebuff.

## Objective

Audit and correct the Cost & Pricing Sheet JSON import contract.

Verify the legacy persistence mapping without a schema migration.

Audit and correct mobile/fold keyboard safety.

Prepare the human test loop.

## Scope

This task changed one domain adapter, two focused test files, and one CSS file.

This task did not create a migration. This task did not rename a database column.

This task did not redesign the CPS Form or the CPS View.

This task did not change locked financial semantics.

Skills used: capacitor-keyboard

Documentation standard: ASD-STE100 Simplified Technical English

## Evidence reviewed

- `AGENTS.md`
- `docs/standard/json-import-standard.md`
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md` section 10
- `docs/prd/cost-pricing-sheet/01-boq-domain-architecture.md` section 4 and section 10
- `docs/prd/.../form/cps/cost-price-sheet-form-candidate-v1-desktop.html` (accepted candidate import handler)
- `src/domain/import/types.ts` and `src/domain/import/promptGenerator.ts` (shared pipeline)
- `src/domain/invoice/importAdapter.ts` and `src/domain/quotation/importAdapter.ts`
- `docs/reports/cost-pricing-sheet/boq-fullpage-flat-outline-ux-pass-report-2026-09-25.md`
- `docs/reports/cost-pricing-sheet/boq-reconstruction-transplant-plan-2026-09-29.md`
- `docs/reports/cost-pricing-sheet/boq-quotation-compatibility-audit-2026-09-29.md`
- `supabase/migrations/20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql`

## 1. Canonical CPS JSON import contract after audit

```json
{
  "title": "string | null",
  "site": "string | null",
  "groups": [{ "id": "string | number | null", "name": "string", "itemIds": ["string | number"] }],
  "items": [
    {
      "temp_ref": "string | null",
      "group_id": "string | number | null",
      "description": "string | null",
      "sub_description": "string | null",
      "make": "string | null",
      "quantity": "number | null",
      "unit": "string | null",
      "cost_price": "number | null",
      "unit_price": "number | null",
      "image_url": "string | null",
      "notes": "string | null",
      "custom_fields": "object | null"
    }
  ]
}
```

Accepted aliases:

| Field | Canonical | Alias | Note |
|---|---|---|---|
| CP | `cost_price` | `cp` | Money out |
| SP | `unit_price` | `sp` | Money in |
| Quantity | `quantity` | `qty` | |
| Sub description | `sub_description` | `specification` | |
| Make | `make` | `make_brand` | |
| Group membership | `group_id` | `gid` | |
| Item identity | `temp_ref` | `id` | Membership resolution only |
| Site | `site` | `vendor_contact` | Legacy alias |

Tolerated but ignored: `client_name`, `vendor_name`. The schema accepts them so an external payload does not fail parsing. The import never applies them.

Rejected: any generic key such as `price`. The schema is strict.

## 2. Verdict on the inherited import rollback

Verdict: PARTIALLY CORRECT. Two defects remained.

Correct parts:

- The rollback restored `cost_price` and `unit_price` as the price keys. This matches the accepted CPS V1 candidate handler and the 2026-09-25 CPS import report.
- The interrupted rewrite used `selling_price` and `temp_ref` and dropped `cp`, `sp`, `qty`, `image_url`, and `custom_fields`. None of those names is the current CPS canonical name.
- The interrupted rewrite emitted all group rows before all item rows. The CPS presentation groups rows by adjacency. That assembly would have attached every item to the last group. The rollback restored group-adjacent assembly.

Incorrect parts that were corrected:

- Defect A: the rollback resolved item group membership by legacy `id`/`gid` only. The JSON import standard uses `temp_ref`. Corrected: `temp_ref` is now the identity reference, and `id`/`gid` remain as legacy aliases.
- Defect B: the rollback imported free-text client data into `vendor_name`. The documented human test loop selects the real client BEFORE import. The import then overwrote the client display name while `custom_fields.client_id` still pointed at the real client. The picker showed imported text, and the identity said something else. Corrected: the import no longer writes a client.

## 3. Exact CP and SP mapping

- CP: `item.cost_price ?? item.cp ?? ''` into `row.cp`.
- SP: `item.unit_price ?? item.sp ?? ''` into `row.sp`.

The two key sets are disjoint. No key maps to both sides. No generic price key exists.

The prompt now states the rule in clear words:

- `cost_price` is CP (money out). `unit_price` is SP (money in).
- Never put a cost value in `unit_price`. Never put a selling value in `cost_price`.
- Never copy one price into the other.

Test coverage proves the mapping and the failure case. `CPS JSON import rejects a generic price key` proves a `price` key is rejected.

## 4. Group identity and ordering behavior

- Groups exist ONLY when `groups[]` is present. The adapter never infers a group from layout, spacing, indentation, ordering, or description.
- Group identity: source `groups[].id` maps to a local synthetic id `group_<sourceId>`. Missing ids fall back to the array index.
- Membership: `group_id` or `gid` on the item. If absent, the adapter matches the group `itemIds` array against the item `temp_ref` (or legacy `id`).
- Ordering: the adapter emits each group followed by its items in source order. Ungrouped items follow in source order. The adapter never sorts.
- Bounded structural ordering: items placed after their group header. This is required because the CPS presentation attaches items to the preceding group header. Source order within a group and among ungrouped items is preserved.

## 5. Imported client data and the real client_id requirement

The import does not write `client_name`, `vendor_name`, `custom_fields.client_id`, or `custom_fields.client_snapshot`.

Reason: a Cost & Pricing Sheet requires a real selected client (`custom_fields.client_id`) before save. Imported text cannot resolve to a real client without a database lookup. The domain adapter has no database access. An invented match is prohibited.

Behavior: after import the picker still shows the user's real selected client. If no client was selected, the picker shows the empty state and save is blocked until the user picks a client. The client picker and the Add New Client flow own client selection.

## 6. Current persistence mapping for Client and Site / Project

| CPS state | Persisted location | Kind |
|---|---|---|
| Selected client name | `boqs.vendor_name` | Legacy column |
| Selected client identity | `custom_fields.client_id` | JSONB |
| Client snapshot | `custom_fields.client_snapshot` | JSONB |
| Site / Project | `boqs.vendor_contact` | Legacy column |
| Notes | `boqs.notes` | Column |

Migration debt (documented, not changed):

- `boqs` also has an unused `client_name` column. The CPS code prefers `vendor_name`. The domain target prefers `client_name` with `vendor_name` as fallback. This is a defect correction for a future migration task.
- `boqs.vendor_contact` stores Site / Project. The table has a `project_id` column.
- `custom_fields.client_id` is a text identity inside JSONB, not a foreign key. The `boqs` table has no `client_id` column.

The mapping is safe but semantically ugly. No speculative restructuring was performed, per the task constraint.

## 7. Client survives Create to View to Edit to Save to View

Yes.

- `custom_fields` is written by `denormalizeToDbBoq` and read by `normalizeDbBoq`. The JSONB copy carries `client_id` and `client_snapshot`.
- `useBoqSave.buildPayload` merges `costing` into `custom_fields` without removing `client_id`.
- `CostPricingSheetEditor` reads `custom_fields.client_id` into `ClientSelector`, which refetches the client list and restores the selected client.
- New test `CPS client identity, site, and notes survive the persistence round trip` proves the round trip.

## 8. Site / Project survives the same lifecycle

Yes. `vendor_contact` is a `boqs` column. `denormalizeToDbBoq` spreads it and `normalizeDbBoq` spreads it back. The same test proves it.

Legacy records without client identity hydrate safely. New test `CPS legacy record without client identity hydrates safely` proves it.

## 9. User-visible Vendor / Reference terminology

The CPS Form has no user-facing Vendor, Contractor, Contact, or Reference field. The metadata panel shows: Sheet title, Sheet number, Issue date, Client, Site / Project, Notes.

One non-field caption remains in the CPS View: `Site reference · tap to preview`. It labels a photo thumbnail. It is not a Reference or Contact field. It was left unchanged because the View is frozen. Report it as a cosmetic item.

The legacy identifiers `vendor_name`, `vendor_contact`, `boq_number`, and `custom_fields` remain internal only.

## 10. Static findings for Android keyboard behavior

Environment facts:

- `android/app/src/main/AndroidManifest.xml` uses `android:windowSoftInputMode="adjustResize"`.
- No Capacitor Keyboard plugin configuration exists. The project uses `visualViewport` instead.
- `KeyboardAwareness.tsx` is mounted globally in `AppShell.tsx`. It sets `html[data-keyboard-open="true"]` and `--app-keyboard-inset` while an editable element is focused and the keyboard inset is greater than 120px.

Findings:

- Presentation ownership is width and fold based. `useLayoutMode` reads `layoutMode` (width) and `hasSeparatingFold`. It never reads viewport height. The keyboard cannot switch desktop, mobile, or fold composition.
- `useFoldAwareness` recomputes only when `window.innerWidth` changes. A keyboard resize does not remount or switch the form.
- The form has no `100vh` lock. `.cps-form` uses `min-height: 100dvh`. Content can grow.
- The mobile form scrolls with the document. It has no nested page-level vertical scroll container. `Layout` adds no `overflow-y-auto`.
- The Instant Markup sheet owns its own internal scroll. That is an overlay scroll, not a page scroll.
- Phone inputs use `font-size: 16px` at a 599px maximum width. This reduces iOS zoom.
- No manual `scrollIntoView` runs on keyboard events. The browser scrolls the focused field natively.
- Correction applied: the mobile Instant Markup sheet now lifts above the keyboard. `html[data-keyboard-open="true"] .cps-overlay:not(.dock) { bottom: var(--app-keyboard-inset) }`.
- Correction applied: the sheet height is capped to the visible area. `max-height: min(86dvh, var(--bd-overlay-sheet-max-height))`.
- The Add New Client dialog already uses `--bd-overlay-dialog-max-height`. It was keyboard-safe before this task.

Physical device validation remains with the human tester.

## 11. Save FAB behavior while keyboard-sensitive inputs are active

The phone Save FAB is `position: fixed` with `bottom: calc(82px + env(safe-area-inset-bottom))`.

With `adjustResize`, the WebView bottom moves above the keyboard. A fixed FAB then sits 82px above the keyboard and can cover the focused input.

Correction applied: `html[data-keyboard-open="true"] .cps-phone-fab { display: none; }`.

- The FAB hides while the software keyboard is open.
- The FAB returns when the keyboard closes.
- The closed-keyboard CPS V1 composition is unchanged. Every new rule is gated on `html[data-keyboard-open="true"]`.
- The phone top bar Save is hidden below 600px. While the keyboard is open, the user closes the keyboard to reveal the FAB. This matches the accepted phone composition.

This follows the established BIGDROPS keyboard pattern. No new keyboard mechanism was introduced.

## 12. Focused test results

Focused CPS tests: 24 tests, 24 pass, 0 fail.

- `src/tests/critical/boqImportView.test.js`: 10 tests.
- `src/tests/critical/boqNormalize.test.js`: 5 tests.
- `src/tests/critical/boqInstantMarkup.test.js`: 9 tests.

New and strengthened coverage:

1. CP imports into CP.
2. SP imports into SP.
3. CP and SP cannot swap. A generic `price` key is rejected.
4. Explicit groups map correctly.
5. An ungrouped document stays ungrouped.
6. Item order survives import.
7. Photo URL survives import, normalization, and round trip.
8. Client identity survives normalization.
9. Site / Project, notes, and legacy records survive and hydrate.
10. Row TCP, TSP, Profit, and Margin stay authoritative and agree with the document totals.

## 13. Exact files changed

- `src/domain/boq/importAdapter.ts`
- `src/tests/critical/boqImportView.test.js`
- `src/tests/critical/boqNormalize.test.js`
- `src/components/cps/cost-pricing-sheet-form.css`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-cps-import-and-keyboard-audit-report-2026-09-30.md`

Inspection only, not changed: the production component names stay under `src/components/cps/`. No candidate revision name returned to production.

## Verification result

```
Verification:
- bun run audit:load: not run (no query, schema, or data-layer change)
- bun run typecheck: passed
- focused CPS tests: passed (24/24)
- full test suite: 510/515 passed, 5 pre-existing environment failures
- git diff --check: passed
- git status: captured
- supabase db push: not applicable
- bun run build: skipped due to hardware policy
```

The 5 failures are pre-existing and unrelated. They fail before this task. They fail because `src/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL`, which is undefined in the node test runner:

- `invoiceAccountingIntegration.test.js`
- `paymentAccountingIntegration.test.js`
- `remediationContract.test.js`
- `sourceTransactionContract.test.js`
- `itemCleanupExportImport.test.js` (one assertion)

## Supabase push status

Supabase push status: not applicable.

No migration was created. No SQL changed.

## Risks or limitations

- Static inspection cannot prove Android keyboard behavior. Physical-device validation is required.
- The client display still uses the legacy `vendor_name` column. A future migration can move it to `client_name`.
- The import tolerates `client_name` and `vendor_name` but ignores them. A user may expect the imported client to appear. The prompt now says "Do not extract a client", so the AI should not produce it.
- The CPS presentation groups rows by adjacency. A source document with non-contiguous group membership maps to a single group block. This is an accepted model limit.
- The `Site reference` View caption remains.

## Deferred work

- Human test of the full loop: New → select or add client → JSON Import → inspect CP/SP and groups → edit → photo → Instant Markup → Save → View → Edit → Save → View.
- Human Android keyboard test for title, client search, Add Client, site, notes, description, sub-description, make, quantity, unit, CP, SP, import textarea, and Instant Markup.
- Future migration to move client name to `client_name`, site to a project field, and client identity to a foreign key.
- Future migration to add `cp` and `sp` to the shared `ImportFieldKey` and move the CPS adapter onto the shared import pipeline.
