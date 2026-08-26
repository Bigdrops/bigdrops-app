# Client Contact Person PDF Regression Audit

This report was written by Manus on 2026-08-26 via GitHub repository audit.

## Objective

Determine whether the missing Client Contact Person line in generated PDFs is a pre-existing omission, a multitenancy regression, or another identifiable regression. This audit is read-only. No application code, migration, database data, configuration, or package file was changed.

## Scope

The audit covers the client schema and form, client picker, invoice and quotation document selection, invoice and quotation PDF input preparation, the shared commercial PDF renderer, relevant templates, multitenancy changes, and Git history.

Skills used: pdf-rendering-correctness, react-pdf, supabase, typescript-advanced-types
Documentation standard: ADS-STE100 Simplified Technical English

## 1. Executive Finding

**Classification: C. NON-MULTITENANCY REGRESSION.**

The client Contact Person value is persisted and fetched correctly. The invoice and quotation PDF action builders also place the value in `recipient.attention`. The value is lost in the shared commercial PDF preparation path: `src/components/pdf-new/engine/party.ts` does not accept or emit an `attention` line, and `src/components/pdf-new/industryAdapter.ts` creates the render-layer client object without attention. All current commercial templates use this prepared party-line path.

Git history shows that the earlier commercial PDF implementation rendered the attention value and that the current party-line refactor on 2026-06-27 removed that behavior. The reviewed multitenancy commits changed tenant-aware client access, but did not change the PDF action builders, the PDF party helper, the commercial adapter, or the document PDF loading path. The evidence therefore supports a non-multitenancy regression introduced by the PDF pipeline refactor.

## 2. Observed Behavior

The reported behavior is consistent with the repository evidence:

| Expected behavior | Repository result |
|---|---|
| Contact Person is visible when selecting a client | Confirmed. `ClientSelector` displays `client.contact_person`. |
| Contact Person is available on a newly created client | Confirmed. The create payload writes `contact_person`. |
| PDF contains `ATTN: <contact person>` | Not achieved by the current shared commercial templates. |

## 3. Canonical Contact Person Field

The canonical field is **`contact_person`**, with type `string` at database level and `string | null` or optional `string` in TypeScript models.

The persistence location is the `clients.contact_person` column defined in `supabase/migrations/20260520090000_core_tables.sql:87-99`, specifically line 97. The client workspace type defines the same property in `src/domain/clientWorkspace.ts:4-14`.

The reusable client form defines `contact_person` in `src/components/client/ClientForm.tsx:13-24`. It initializes the field at line 38, binds the input at lines 117-129, and returns the trimmed value in the save payload at lines 77-87. The inline create flow in `src/components/ClientSelector.tsx:100-118` writes `contact_person: data.contact_person.trim()` to the `clients` table.

**Fact:** The field exists in the persisted tenant client record and is written by the create/edit UI path.

## 4. Client Picker Trace

`src/components/ClientSelector.tsx:53-76` loads full client rows with:

```ts
tenantClient.from('clients').select('*').order('name')
```

The picker maps the returned client record at lines 78-84. Its description uses `client.contact_person` and `client.city`. The selected-client summary at lines 224-235 also renders `selectedClient.contact_person` when present.

The picker passes the complete selected client object to its callback at `src/components/ClientSelector.tsx:86-90`:

```ts
onClientChange(client?.id || '', client?.name || '', client)
```

**Fact:** The picker reads and displays the same persisted `contact_person` field. The picker is not the source of the missing PDF line.

## 5. Document Data-Flow Trace

The shared document form connects `ClientSelector` in `src/components/document/SharedDocumentForm.tsx:298-309`.

Its callback is defined at lines 124-128:

```ts
const handleClientChange = useCallback((id: string, name: string) => {
  if (props.mode === 'edit') return
  updateInvoice('client_id', id)
  updateInvoice('client_name', name)
}, [updateInvoice, props.mode])
```

The callback signature receives only `id` and `name`; the selected client object, including `contact_person`, is not copied into the editable document state. This is a document-state limitation for the form path. It does not explain the observed view-PDF result by itself because the PDF view loaders fetch the full client record again.

For invoice view data, `src/hooks/useInvoiceDetailData.js:68-90` loads the invoice and then fetches the full client row at lines 80-83 with:

```js
tenantClient.from('clients').select('*').eq('id', data.client_id).single()
```

The result is stored at line 88. `src/components/document-view/invoice/useInvoiceActions.ts` passes the client object unchanged into `downloadInvoicePdfDocument` for normal and advance downloads.

For quotation view data, `src/pages/viewQuotationActions.ts:12-63` loads the quotation and fetches the full client row with the same `select('*')` pattern at lines 50-52. It returns the client object at line 58.

**Fact:** The editable shared form stores only client ID and name. The invoice and quotation view-PDF paths separately fetch the complete client record, so the current PDF symptom is not caused by failure to fetch the client during view-PDF generation.

## 6. PDF Input Trace

### Invoice

`src/components/document-view/invoice/invoicePdfActions.ts:15-37` receives a `client` object. It builds the recipient at lines 118-125:

```ts
recipient: {
  label: "Bill To",
  name: String(targetInvoice.client_name || ""),
  attention: String(client?.contact_person || ""),
  addressLines: ...,
  phone: String(client?.phone || ""),
  email: String(client?.email || ""),
}
```

Therefore, if the loaded client has a Contact Person, the invoice PDF model contains `recipient.attention` before the shared renderer starts.

### Quotation

`src/domain/quotation/pdfDownloadHandler.ts:79-86` builds the quotation recipient with:

```ts
attention: String(client?.contact_person || "")
```

The quotation path therefore supplies the same field to `generateQuotationPdf`.

### Model type

`src/components/pdf-new/types.ts:24-34` defines `PdfParty.attention?: string | null`. The model boundary explicitly supports the field.

**Fact:** For invoice and quotation PDFs, the current action builders supply Contact Person to the PDF model as `recipient.attention`.

## 7. PDF Template Analysis

The shared commercial PDF path does not render `recipient.attention`.

`src/components/pdf-new/engine/party.ts:2-8` defines `PartyInput` with name, address, city/state, phone, email, website, and custom information. It has no `attention` property. `buildPartyLines()` at lines 17-50 emits only those supported fields. It never creates an `ATTN`, `Attn`, or `attention` line.

`src/components/pdf-new/industryAdapter.ts:376-383` converts `model.recipient` into the render-layer `client` object. That object contains name, address, city/state, phone, and email. It does not copy `model.recipient.attention`.

`src/components/pdf-new/presentation/industry/PartyCard.tsx:30-64` calls `buildPartyLines(party)` and renders only the returned lines. The current commercial templates use the same helper:

| Template/family | Evidence | ATT N branch |
|---|---|---|
| Bolt | `src/components/pdf-new/templates/Bolt.tsx` calls `buildPartyLines` | None found |
| Crest | `src/components/pdf-new/templates/Crest.tsx` calls `buildPartyLines` | None found |
| Ember | `src/components/pdf-new/templates/Ember.tsx` calls `buildPartyLines` | None found |
| Evergreen | `src/components/pdf-new/templates/Evergreen.tsx` calls `buildPartyLines` | None found |
| Ledger | `src/components/pdf-new/templates/Ledger.tsx` calls `buildPartyLines` | None found |
| Minimal | `src/components/pdf-new/templates/Minimal.tsx` calls `buildPartyLines` | None found |
| Industry presentation | `src/components/pdf-new/presentation/industry/PartyCard.tsx` calls `buildPartyLines` | None found |

Repository-wide search of the current `src` and `supabase` paths found `attention` assignments in the invoice and quotation PDF input builders and the `PdfParty` type, but no current shared commercial rendering branch that formats the value as `ATTN: <contact person>`.

**Root-cause location:** The value is available at PDF input construction, then ignored by the shared PDF adapter/helper before the party card renders.

## 8. Multitenancy Regression Analysis

The reviewed multitenancy changes do not affect the specific PDF data path.

The tenant hardening commit `9978bf46c03571b6ae95359a3e2667fec607d239` (`feat(tenancy): team company role assignment and tenant hardening`, dated 2026-08-27 in Git) changed the client picker data access from the global Supabase client to `tenantClient` for client fetching and creation. The client create diff changes the database client used for the operation; it does not remove or rename `contact_person`.

The earlier tenant-selection commit `b963ed4a0624eeb9ffc1b8a2be7d91f3b5229974` (`feat(multi-tenancy): pass-for-now, create/join, selection`) changed tenant gate and workspace-selection files. It did not change the invoice PDF action, quotation PDF handler, PDF party helper, commercial adapter, or invoice/quotation view loaders.

The reviewed tenant-related history also includes tenant-aware waybill, quotation conversion, settings, role, and provisioning changes. None of the inspected changes removes `contact_person` from the client schema, renames the field, changes the invoice/quotation PDF recipient construction, or changes the shared party-line renderer.

**Fact:** Multitenancy changed the client access context, but the view-PDF loaders still fetch `clients.select('*')`, and the PDF builders still assign `client.contact_person` to `recipient.attention`.

**Inference supported by the diff:** The tenant work is not the cause of the missing PDF line. The missing line occurs in a PDF rendering refactor that is independent of tenant access.

## 9. Historical/Git Evidence

The historical record distinguishes the current defect from the multitenancy work.

The earlier commercial PDF implementation at commit `1e3d1547f6fa2359a8186084065f55c25f8080d2` (`Implement shared minimal invoice/quotation PDF pipeline`, dated 2026-04-15) contained both of the following behaviors:

1. `src/domain/invoice/previewModel.ts` built client preview lines with `Attn: ${client.contact_person}` at lines 173-179 in that historical revision.
2. `src/components/pdf-new/templates/minimal.tsx` included `party?.attention` in `renderPartyBlock` at historical lines 110-121.

The same historical revision also contained `attention: String(client?.contact_person || '')` in invoice and quotation view paths. This proves that the repository previously had an attention-capable PDF path.

The current helper `src/components/pdf-new/engine/party.ts` was introduced by commit `82594d853a0fff684df4cccb2b6d90d17fa99f60`, dated 2026-06-27, with subject `00`. That commit introduced the new party-line helper and the presentation-layer commercial party card. The new helper does not include the historical `attention` field, and the new adapter does not copy it.

Current blame assigns the invoice `recipient.attention` line in `src/components/document-view/invoice/invoicePdfActions.ts:121` to commit `1a3216366df8d0d14e35cd41551e7e0dfd517189`, dated 2026-05-09. The current line therefore predates the June 27 party-helper refactor and remains present after multitenancy changes.

**Historical conclusion:** Contact Person/attention rendering existed before the current helper refactor. The relevant behavior was removed or bypassed by the PDF pipeline refactor, not by the tenant-aware client access changes.

## 10. Root Cause

**C. NON-MULTITENANCY REGRESSION**

The strongest evidence chain is:

1. `clients.contact_person` exists in the database schema.
2. Client creation writes `contact_person`.
3. The client picker fetches and displays `contact_person`.
4. Invoice and quotation view loaders fetch the full client record.
5. Invoice and quotation PDF builders assign the value to `recipient.attention`.
6. The PDF model type accepts `attention`.
7. The current shared party helper and adapter ignore the field.
8. The prior PDF implementation rendered the field.
9. The helper refactor occurred independently of the multitenancy changes.

The issue is therefore a **PDF template/rendering data transformation omission**, with a related editable document-state limitation because `SharedDocumentForm` stores only client ID and name on selection. The observed view-PDF failure is specifically attributable to the shared PDF preparation/rendering path.

## 11. Scope of Impact

The affected scope is the current commercial invoice and quotation PDF family that uses `src/components/pdf-new/engine/party.ts` and `src/components/pdf-new/presentation/industry/PartyCard.tsx`.

This includes the Bolt, Crest, Ember, Evergreen, Ledger, Minimal, and Industry commercial templates identified in Section 7. The audit did not establish the behavior of unrelated PDF families such as receipts, RFQs, project documents, or waybills unless they use this same commercial party helper.

The editable shared document form also does not copy Contact Person into document state. That can affect any feature that expects the selected client object to remain embedded in unsaved document state. It is separate from the proven view-PDF rendering omission.

## 12. Recommended Next Action

Do not implement the fix in this audit.

A future implementation task should preserve the existing prepared-data boundary and add the Contact Person value to the shared commercial party render model. The implementation should render the value in the required format, `ATTN: <contact person>`, for each affected commercial template family. The future task should also decide, separately, whether document edit state must store a client snapshot or whether PDF actions should continue to load the canonical client record by `client_id`.

## 13. Audit Integrity

### Initial Git status

The initial status was captured immediately after cloning and before repository inspection:

```text
## main...origin/main
```

No short-status entries were present. The working tree was clean, and no pre-existing local changes were present in the cloned working tree.

### Final Git status

The final status was captured after this report was written:

```text
## main...origin/main
?? docs/Reports/client_contact_person_pdf_regression_audit.md
```

The only audit-attributable change is the requested report. No application source, migration, database, configuration, package, or unrelated file appears in the status output.

### Integrity confirmations

- No application source file was changed.
- No migration was changed.
- No database data was changed.
- No configuration file was changed.
- No package manifest or lockfile was changed.
- No unrelated file was created or modified.
- No migration was applied.
- No mutating SQL was run.
- No commit was created.
- `bun run build` was not run.
- `bun run typecheck` was not run.
- Linting was not run.

The final status verification confirmed the exact resulting status shown above.

## Evidence Index

| Evidence | Path or Git object |
|---|---|
| Client schema | `supabase/migrations/20260520090000_core_tables.sql:87-99` |
| Canonical client type | `src/domain/clientWorkspace.ts:4-14` |
| Client form field and save payload | `src/components/client/ClientForm.tsx:13-24`, `:70-87`, `:117-129` |
| Client picker query and display | `src/components/ClientSelector.tsx:73-90`, `:224-235` |
| Shared document selection state | `src/components/document/SharedDocumentForm.tsx:124-128`, `:298-309` |
| Invoice client fetch | `src/hooks/useInvoiceDetailData.js:68-90` |
| Invoice PDF recipient | `src/components/document-view/invoice/invoicePdfActions.ts:95-125` |
| Quotation PDF recipient | `src/domain/quotation/pdfDownloadHandler.ts:56-86` |
| PDF party type | `src/components/pdf-new/types.ts:24-34` |
| Current party-line omission | `src/components/pdf-new/engine/party.ts:2-50` |
| Current adapter omission | `src/components/pdf-new/industryAdapter.ts:376-383` |
| Current party rendering | `src/components/pdf-new/presentation/industry/PartyCard.tsx:30-64` |
| Historical attention rendering | `1e3d1547f6fa2359a8186084065f55c25f8080d2`, historical `src/components/pdf-new/templates/minimal.tsx:110-121` |
| Historical preview attention | `1e3d1547f6fa2359a8186084065f55c25f8080d2`, historical `src/domain/invoice/previewModel.ts:173-179` |
| Current helper refactor | `82594d853a0fff684df4cccb2b6d90d17fa99f60`, dated 2026-06-27 |
| Tenant hardening | `9978bf46c03571b6ae95359a3e2667fec607d239`, tenant-aware client access change |
| Tenant selection | `b963ed4a0624eeb9ffc1b8a2be7d91f3b5229974` |
