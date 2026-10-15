# Phase B — Shared Document Form Descriptor Extraction Report

This report was written by Buffy on 2026-10-15 via Freebuff Desktop.

Skills used: vercel-composition-patterns, karpathy, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read. Three registered skills were loaded and applied.

- `vercel-composition-patterns` — rule `architecture-avoid-boolean-props`: do not add boolean props to customize behavior; use composition. Rule `patterns-explicit-variants`: create explicit variant components instead of boolean modes. This is the direct authority for the refactor.
- `karpathy` — simplicity first and surgical changes. The refactor adds one data module and one adapter and changes nothing else.
- `accessibility` — accessible names. The party clear control, the party button and the date fields keep their `aria-label` values, now read from the descriptor.

`docs/standard/document-form-consolidation-standard.md` was read. Rules 3, 4 and 5 were obeyed: one shared form UI is still used, no CSS file changed, and no route changed.

No TypeScript, React, or mobile-UI skill was loaded. The registered matches were `typescript-advanced-types`, `react-dev`, and `mobile-app-ui-design`. They were not needed: the descriptor is a plain object type and the components already define the project conventions. No unavailable skill was invented.

---

## Objective

Remove the binary `isQuotation` decision from the shared document form family.

Replace it with a typed document-family descriptor. Prepare the form for a third document type, Supplier Purchase Orders, without a second rewrite.

This phase is a compatibility refactor only. No Purchase Order feature is built.

## Scope

In scope: the descriptor contract, the descriptor definitions for Invoice and Quotation, the party-selector extension point, and the conversion of the shared form family to the descriptor.

Out of scope and not built: `purchase_orders` or `purchase_order_items` tables, PO routes, PO navigation, PO numbering, PO status, PO save strategy, PO PDF, PO search, PO conversion, and PO calculations. No PDF renderer was modified.

## Files changed

### New files

| File | Lines | Purpose |
|---|---|---|
| `src/components/document/documentDescriptor.ts` | 177 | Descriptor contract, Invoice and Quotation descriptors, resolver |
| `src/components/document/ClientPartySelector.tsx` | 42 | Default party-picker slot. Adapts `ClientSelector` to the neutral contract |
| `src/tests/critical/documentFormDescriptor.test.js` | 246 | 14 critical regression tests |

### Modified files

| File | Change | Net lines |
|---|---|---|
| `src/components/document/FormHeader.tsx` | Descriptor prop. 9 label ternaries and the party vocabulary replaced | +5 |
| `src/components/document/FormCommercialTerms.tsx` | Descriptor prop. 2 label ternaries replaced | +1 |
| `src/components/document/FormLineItems.tsx` | Dead `isQuotation` prop removed | −1 |
| `src/components/document/SharedDocumentForm.tsx` | Resolves the descriptor, threads it, adds the party slot and a descriptor override | +15 |
| `src/components/waybill/WaybillForm.tsx` | Dead `isQuotation={false}` pass-through removed | −1 |
| `src/tests/document/dateField.test.js` | Date-label assertions moved to the descriptor contract | +17 |

Total: **97 insertions, 61 deletions across 6 files**, plus 3 new files.

No file exceeds 600 lines. The largest is `SharedDocumentForm.tsx` at 551 lines.

## Changes made

1. Added `documentDescriptor.ts`. It defines the descriptor contract, the Invoice and Quotation descriptors, and the resolver that reproduces the retired classification rule.
2. Added `ClientPartySelector.tsx`. It adapts `ClientSelector` to the neutral party contract and holds the shared form's picker presentation flags.
3. Converted `FormHeader` from `isQuotation: boolean` to `descriptor: DocumentDescriptor`. The 9 label ternaries now read descriptor fields. The party label, party hint, empty copy, selected aria-label, clear aria-label, and the two party field keys all read from `descriptor.party`.
4. Converted `FormCommercialTerms` from `isQuotation: boolean` to `descriptor: DocumentDescriptor`. The payment headline and payment-note placeholder now read descriptor fields.
5. Removed the dead `isQuotation: boolean` prop from `FormLineItems`. It was declared but never destructured or read.
6. Converted `SharedDocumentForm` to resolve the descriptor with `resolveDocumentDescriptor`, accept an optional `descriptor` override, accept an optional `partySelector` slot, and read the party record keys from the descriptor. `handleClientChange` became `handlePartyChange`.
7. Routed the desktop action rail through the descriptor. It previously read `invoice.client_name` and rendered the literal `Client`, which a supplier-backed family could not use.
8. Removed the dead `isQuotation={false}` pass-through in `WaybillForm`.
9. Moved the two `dateField.test.js` label assertions to the descriptor contract and added the exact caption checks.
10. Added `documentFormDescriptor.test.js` with 14 critical tests.

No existing calculation, save handler, validation rule, numbering rule, route, permission, or database object was modified.

## Branch inventory — before and after

The `isQuotation` identifier appeared 24 times in 5 files. The table classifies every occurrence.

### Before

| File | Occurrences | Classification |
|---|---|---|
| `FormHeader.tsx` | 11 | 9 **presentation** ternaries (`44`, `88`, `92`, `98`, `105`, `127`, `129`, `137`, `139`), 1 prop declaration, 1 destructure |
| `FormCommercialTerms.tsx` | 4 | 2 **presentation** ternaries (`131`, `159`), 1 prop declaration, 1 destructure |
| `SharedDocumentForm.tsx` | 7 | 1 **document life-cycle** classification (`241`), 2 **presentation** titles (`292`, `410`), 4 prop pass-throughs (`311`, `325`, `351`, `425`) |
| `FormLineItems.tsx` | 1 | 1 prop declaration. **Zero reads.** Dead prop |
| `WaybillForm.tsx` | 1 | 1 dead pass-through feeding the dead prop |
| **Total** | **24** | |

### Classification by category

| Category | Count | Disposition |
|---|---|---|
| Presentation (labels and titles) | 13 | **Extracted** into the descriptor |
| Document life-cycle (family classification) | 1 | **Extracted** into `resolveDocumentDescriptor` |
| Party selection | 0 | No branch existed |
| Commercial terms | 0 | No branch existed. The 2 `FormCommercialTerms` sites are labels, not rules |
| Calculation | 0 | No branch existed |
| Persistence | 0 | No branch existed |
| Navigation | 0 | No branch existed |
| PDF | 0 | No branch existed |
| Dead prop (declaration, pass-through, zero reads) | 3 | **Removed** |
| Prop declarations and destructures | 7 | Replaced by one `descriptor` prop |
| **Total** | **24** | |

No branch encoded an Invoice or Quotation business rule. Every branch selected English wording or the document title. The extraction was therefore total.

### After

| File | `isQuotation` occurrences |
|---|---|
| `FormHeader.tsx` | 0 |
| `FormCommercialTerms.tsx` | 0 |
| `FormLineItems.tsx` | 0 |
| `SharedDocumentForm.tsx` | 0 |
| `WaybillForm.tsx` | 0 |
| `documentDescriptor.ts` | 0. The resolver uses a local `isQuotationFamily` boolean derived from the same three inputs |

Test 5 of the new suite asserts this zero count.

## Descriptor contract

`documentDescriptor.ts` is a pure data module. It has no JSX, no component import and no application import. The critical test harness loads it directly under Node, which does not transpile JSX. Test 11 asserts this.

```ts
export type DocumentFamily = 'invoice' | 'quotation'

export type PartySelectorSlotProps = {
  partyId: string | null
  partyName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPartyChange: (id: string, name: string) => void
}

export type DocumentPartyDescriptor = {
  term: string
  roleHint: string
  emptyLabel: string
  noneLabel: string
  selectedAriaPrefix: string
  clearAriaLabel: string
  idField: string
  nameField: string
}

export type DocumentDescriptor = {
  family: DocumentFamily
  title: string
  titleFieldLabel: string
  titleFieldPlaceholder: string
  numberLabel: string
  unsavedMeta: string
  issueDateLabel: string
  dueDateLabel: string
  paymentHeadline: string
  paymentNotePlaceholder: string
  party: DocumentPartyDescriptor
}
```

Exports: `INVOICE_DESCRIPTOR`, `QUOTATION_DESCRIPTOR`, and `resolveDocumentDescriptor(input)`.

### What the descriptor does not own

| Concern | Owner | Reason |
|---|---|---|
| Calculations | The page save strategy | `buildCalculationInputs` and `computeDocument` are unchanged |
| Persistence of number and date | `invoice_number`, `issue_date`, `due_date` | These keys are the shared persistence contract. Every sales family uses them |
| Authorization | The permission layer | A descriptor holds no access decision |
| Doc title and number state keys | `invoiceTitle`, `invoice_number` | Unchanged |

Only the **party** field names are descriptor-owned. That is the one contract a Supplier PO must change, because it must store `supplier_id` and `supplier_name`.

### Resolver rule, preserved verbatim

```ts
const documentType = String(input.documentType || '').toUpperCase()
const isQuotationFamily =
  documentType.includes('QUOT') ||
  /quotation/i.test(String(input.title ?? '')) ||
  /quotation/i.test(String(input.modeLabel ?? ''))
```

The old inline rule compared `/quotation/i` against `title` and `modeLabel` without a null guard. The resolver wraps both in `String(... ?? '')`, which produces the same result for every value the pages pass. Test 4 covers explicit document type, title fallback, mode-label fallback, and the no-signal default.

### Invoice and Quotation descriptor values

| Field | Invoice | Quotation |
|---|---|---|
| `title` | `Invoice` | `Quotation` |
| `unsavedMeta` | `New invoice` | `New quotation` |
| `titleFieldLabel` | `Invoice Title` | `Quotation Title` |
| `titleFieldPlaceholder` | `e.g. Monthly Maintenance` | `e.g. Website Overhaul` |
| `numberLabel` | `Invoice No.` | `Quotation No.` |
| `issueDateLabel` | `Issue Date` | `Quotation Date` |
| `dueDateLabel` | `Due Date` | `Valid Until` |
| `paymentHeadline` | `When this invoice is due` | `When this quotation is due` |
| `paymentNotePlaceholder` | `e.g. Due in 14 days` | `e.g. 14 days validity` |
| `party.*` | Shared client vocabulary | Shared client vocabulary |

Every value is byte-identical to the retired ternary. Tests 1, 2 and 3 assert each string.

## Protected business-rule branches

These branches were found during the audit and deliberately **not** converted. The descriptor does not own them.

| Branch | Location | Why it is protected |
|---|---|---|
| Party identity is immutable in edit mode | `SharedDocumentForm.tsx`, `handlePartyChange`: `if (props.mode === 'edit') return` | A document life-cycle rule. It applies to every family equally, so it is not a family property |
| Party picker is closed in edit mode | `open={props.mode === 'edit' ? false : showClientPicker}` | Same life-cycle rule |
| Client field routes to the lock dialog in edit mode | `FormHeader.tsx`: `isEdit ? () => onLockedFieldClick?.('client') : onOpenClientPicker` | Identity-lock behaviour required by `document-form-consolidation-standard.md` §2.4 |
| Document number is read-only in edit mode | `FormHeader.tsx`: `isEdit ? <input readOnly ... /> : <Input ... />` | Same identity-lock rule |
| Totals row order | `SharedDocumentForm.tsx`, `summaryRows` | Financial presentation order is timing-sensitive and shared. Unchanged |
| Financial prop contract | `rawSubtotal`, `vatAmount`, `whtAmount`, `totalPayable`, `finalLabel="Grand Total"` | Owned by the save strategy and `Calculations.ts`. Unchanged |
| `client_id` and `client_name` are the sales-family party keys | Descriptor `party.idField` / `party.nameField` | Preserved as descriptor **data**, so the values written are still exactly `client_id` and `client_name` |

The descriptor also does not change the pre-existing Invoice-flavoured wording that both families already render, for example `Invoice additions` and `Optional invoice-level reduction`. Those strings are not `isQuotation` branches. Changing them would alter existing Quotation presentation, which the task forbids. They are recorded as an observation only.

## Party selector extension point

The boundary has two halves.

**Half 1 — vocabulary and binding.** `descriptor.party` declares the party noun, every party label, and the record field names. The shared form writes `descriptor.party.idField` and `descriptor.party.nameField`. It no longer contains the literals `client_id` or `client_name`.

**Half 2 — the picker component.** `SharedDocumentForm` renders `<PartySelector />`, resolved as:

```tsx
const PartySelector: PartySelectorComponent = props.partySelector || ClientPartySelector
```

`ClientPartySelector` is the default. It maps the neutral contract onto `ClientSelector` and holds the shared form's own presentational flags (`compact`, `dense`, `hideHeader`, `hideTrigger`, `allowClear={false}`).

A future Supplier PO therefore needs no edit to `SharedDocumentForm`. It passes:

```tsx
<SharedDocumentForm descriptor={PURCHASE_ORDER_DESCRIPTOR} partySelector={SupplierPartySelector} ... />
```

`SupplierSelector` already exists from the Supplier Domain Foundation. The thin `SupplierPartySelector` adapter is Phase C work. The neutral contract takes `partyId` / `partyName`, so a supplier id never travels in a client-named prop. Tests 7, 8 and 9 assert this boundary.

`SharedDocumentForm` no longer imports `ClientSelector` directly. Test 7 asserts that.

## Responsive preservation

No layout code changed. Verified mechanically:

| Check | Result |
|---|---|
| CSS files in the diff | **0** |
| Breakpoint or layout tokens added or removed (`md:`, `lg:`, `sm:`, `hidden`, `grid-cols`, `max-w-`, `min-h-`) | **0** |
| `useLayoutMode`, `isMobile`, `useFoldAwareness`, `hasFold` calls changed | **0** |
| `className` token strings changed | **0**. Four `className` lines changed. In each, only the interpolated expression or the child text changed. Every token string is byte-identical |

The four changed `className` lines are:

| Before | After |
|---|---|
| `className={`cps-clientpick ${invoice.client_name ? 'filled' : ''}`}` | `className={`cps-clientpick ${invoice[descriptor.party.nameField] ? 'filled' : ''}`}` |
| `<span className="cps-label">Client <span className="cps-req">*</span></span>` | `<span className="cps-label">{descriptor.party.term} <span className="cps-req">*</span></span>` |
| `<span className="...text-bd-text-muted">Client</span>` | `<span className="...text-bd-text-muted">{party.term}</span>` |
| `<b className="...text-bd-text">{clientName \|\| 'No client selected'}</b>` | `<b className="...text-bd-text">{partyName \|\| party.noneLabel}</b>` |

Mobile, fold-close, fold-open, tablet and desktop behaviour are therefore untouched. Sticky actions, item editing, and the responsive CSS in `document-cps-overrides.css` are untouched.

## Verification result

```
Verification:
- bun run audit:load: not run — no schema, query, or data-layer logic changed (per the task gate)
- bun run typecheck: passed (exit 0, 0 errors)
- bun run test: 1229 tests, 1214 pass, 15 fail — all 15 pre-existing (see below)
- new descriptor tests: 14 tests, 14 pass, 0 fail (exit 0)
- dateField.test.js: 9 tests, 9 pass, 0 fail (exit 0)
- sharedDocumentFormRegression.test.js: 2 pass, 3 fail — identical before and after
- responsivePickerRegression.test.js: 5 pass, 1 fail — identical before and after
- git diff --check: clean (exit 0)
- git status: only scoped changes plus pre-existing work
- supabase db push: not applicable — no SQL changed
- bun run build: skipped due to hardware policy
```

### Test-count evidence

| Measure | Before this phase | After this phase |
|---|---|---|
| Critical suite tests | 1215 | **1229** |
| Critical suite pass | 1200 | **1214** |
| Critical suite fail | 15 | **15** |

The suite grew by exactly 14 tests, which is the new `documentFormDescriptor.test.js`. The failure count did not change.

### Pre-existing failure baseline, proven not assumed

A detached Git worktree at `HEAD` was used to run the affected test files without this task's changes. The results are identical.

| Test file | At `HEAD` | With this phase |
|---|---|---|
| `dateField.test.js` | 9 pass / 0 fail | 9 pass / 0 fail |
| `sharedDocumentFormRegression.test.js` | 2 pass / 3 fail | 2 pass / 3 fail |
| `responsivePickerRegression.test.js` | 5 pass / 1 fail | 5 pass / 1 fail |

Each failure was then traced to a file this task did not touch:

| Failure | Cause | File |
|---|---|---|
| `invoice and quotation editors render through the shared document form shell` | Reads `src/components/quotation/QuotationForm.tsx`, which does not exist. The component moved to `QuotationFormPage.tsx` | Not changed by this task |
| `shared document layout stays wide...` | Expects `max-w-[780px]` and `px-0 pt-1 sm:pt-3`. Absent at `HEAD` | `SharedDocumentForm.tsx`, expectation stale |
| `shared line items still use the live invoice mobile item card implementation` | Expects `enableItemSuggestions={true}`. `HEAD` and current code use `ctx !== 'waybill'` | Not changed by this task |
| `action sheet call sites use only approved list or grid layouts` | Expects `layout="list-compact"` in `Dashboard.tsx` | Not changed by this task |

All 15 critical-suite failures live in `cpsIndustry`, `cpsLedger`, `cpsPdf`, `cpsViewProductionRedesign`, `invoiceAccountingIntegration`, `itemCleanupExportImport`, `paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`, and `themeToggleExposure`. None of these references a file this task changed.

### Rendered-output equivalence — executed, not inferred

The strongest available check was run. The retired implementation and the new implementation were both rendered to HTML through the real React components and compared.

Method: a temporary Git worktree held the `HEAD` sources. A temporary build script used the repository's own `esbuild` to bundle a render entry twice, once against `HEAD` and once against the working tree. `react-dom/server` `renderToStaticMarkup` rendered `FormHeader` and `FormCommercialTerms` for both families. Visible text, `placeholder` values and `aria-label` values were extracted and compared.

```
diff out-old.json out-new.json
IDENTICAL: rendered output is byte-for-byte equal
```

The rendered Invoice and Quotation output is byte-for-byte identical before and after the refactor. Representative values from the render:

| Element | Invoice | Quotation |
|---|---|---|
| Section meta | `New invoice` | `New quotation` |
| Title field label | `Invoice Title` | `Quotation Title` |
| Title placeholder | `e.g. Monthly Maintenance` | `e.g. Website Overhaul` |
| Number field | `Invoice No.` | `Quotation No.` |
| First date | `Issue Date` | `Quotation Date` |
| Second date | `Due Date` | `Valid Until` |
| Party label | `Client` | `Client` |
| Party hint | `Bill to · Client` | `Bill to · Client` |
| Party aria-label | `Client Acme Ltd` | `Client Acme Ltd` |
| Payment headline | `When this invoice is due` | `When this quotation is due` |
| Payment placeholder | `e.g. Due in 14 days` | `e.g. 14 days validity` |

The render harness lived outside the repository. It was deleted after use. `git worktree list` shows one worktree. No harness file is in the diff.

## Supabase push status

**Not applicable.** This phase changed no SQL. No migration was created. No table, function, policy, grant, or permission changed. `supabase db push` was not run and is not required.

## Risks or limitations

- The descriptor is a second source of truth for label text. A future edit to a label must change the descriptor, not the component. Test 5 fails if a component reintroduces a literal branch.
- `FormHeader` has two pre-existing dead props, `modeLabel` and `title`. They are declared in `FormHeaderProps` and never read. `karpathy` requires that pre-existing dead code is reported, not deleted. They are recorded here and left in place.
- The descriptor contract is deliberately not generic. It has no pluggable text-function layer and no per-field overrides. Adding one would be speculative.
- The 15 pre-existing test failures remain. They were not fixed, in line with the task scope and `concurrent-agent-safety.md`.
- `bun run build` was not run, by hardware policy. Type safety is checked by `tsc --noEmit` only.
- The `bun run audit:load` gate was skipped by instruction. File size was checked manually instead: no changed file exceeds 600 lines.
- The render check covers `FormHeader` and `FormCommercialTerms`. It does not cover `FormLineItems` or `SharedDocumentForm`, which require runtime providers. Those two files are covered by type check and source assertions.

## Existing failures left untouched

| Failure | Detail |
|---|---|
| 15 critical-suite failures | Environmental or stale-expectation. `sourceTransactionContract` fails reading `VITE_SUPABASE_URL`. `themeToggleExposure` fails on `CsrFormScreen.tsx` and the RFQ header. CPS and accounting contract tests fail on their own files. None references a file this task changed |
| 3 `sharedDocumentFormRegression` failures | One reads a deleted path, two expect stale layout and suggestion literals |
| 1 `responsivePickerRegression` failure | Expects `layout="list-compact"` in `Dashboard.tsx` |
| Pre-existing `isQuotation` in `ViewQuotation.tsx` | A local variable for a linked-document list, not part of the shared form family. Out of scope |
| Dead props `modeLabel` and `title` in `FormHeaderProps` | Reported, not deleted |
| Invoice-flavoured wording in `FormCommercialTerms` | `Invoice additions` and `Optional invoice-level reduction` render for both families today. Not an `isQuotation` branch. Changing them would alter existing Quotation presentation |

## Deferred work

- Phase C — build `PurchaseOrderFormPage.tsx`, `NewPurchaseOrder.tsx`, `EditPurchaseOrder.tsx`, a `PURCHASE_ORDER_DESCRIPTOR`, and a `SupplierPartySelector` adapter.
- Add the `purchase_order` family to `DocumentFamily` when Phase C defines it.
- Extend `FormLineItems` with descriptor-driven column labels only if a real PO column difference appears. No branch exists today.
- Fix the stale expectations in `sharedDocumentFormRegression.test.js` and `responsivePickerRegression.test.js`.
- Remove the pre-existing dead props `modeLabel` and `title` from `FormHeaderProps`.
- Decide whether the shared form should stop rendering Invoice-flavoured commercial-terms wording for quotations.

## Future PO integration notes

A Supplier PO page reuses the descriptor and the party slot. It changes nothing in `SharedDocumentForm`.

| Need | Provided by | Action for Phase C |
|---|---|---|
| Document title and number label | `descriptor.title`, `descriptor.numberLabel` | Add `PURCHASE_ORDER_DESCRIPTOR` |
| Date labels | `descriptor.issueDateLabel`, `descriptor.dueDateLabel` | Set PO-specific labels |
| Party vocabulary | `descriptor.party.*` | Set `Supplier` vocabulary and `noneLabel` |
| Party record binding | `descriptor.party.idField`, `nameField` | Set `supplier_id`, `supplier_name` |
| Party picker | `partySelector` slot | Add a thin `SupplierPartySelector` adapter over the existing `SupplierSelector` |
| Layout, sticky actions, rail, sheets | `SharedDocumentForm` | Reuse. No change |
| Calculations | The page save strategy | Reuse `buildCalculationInputs` and `computeDocument` |
| Family classification | `resolveDocumentDescriptor` | Pass `descriptor` explicitly. Classification by title is not reliable for a PO |

Two constraints from the audit stay in force. A PO must not post to the source-transaction boundary, so it needs its own save RPC. A PO has no `client_id`, so document search must skip it under a client scope, following the RFQ and CPS precedent.

## Future CPS PDFcn/FormePDF direction

This phase changed no PDF code. The direction is recorded for the later PO PDF phase.

| Item | Current fact | Consequence for the PO PDF |
|---|---|---|
| React PDF engine | `src/components/pdf/` with `generatePdf`, `PdfDocumentModel`, `PdfRenderer`, 7 templates | Not the selected engine for Supplier PO |
| CPS engine | A separate engine using `@formepdf/core` and `generateCpsFormePdf` | The selected architecture for Supplier PO |
| Engine choice | The audit states the two engines are not interchangeable | The CPS engine must be inspected before the PO PDF phase. Do not assume parity |
| Calculation boundary | `document-transformation-standard.md` forbids calculation in renderers | The PO PDF must receive prepared data from a domain payload builder |
| Visual reference | The React PDF templates are a quality benchmark | Use for visual comparison only |

The PO PDF phase must create a dedicated template. It must present supplier, buyer, PO number, issue date, item descriptions, quantities, unit costs, taxes, extra charges, and totals. It must support pagination, long descriptions, and multi-page item tables. It must not rename a CPS heading, and it must not copy the React PDF implementation.
