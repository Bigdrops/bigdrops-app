# Status Model Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove legacy draft-first and ceremony-driven status assumptions across Bigdrops document flows while preserving real operational behavior.

**Architecture:** Introduce consistent invoice and quotation status normalization first, then update create/duplicate/conversion/UI/reporting callers to use the new model. Keep non-invoice document changes narrow: remove default draft creation where the current lifecycle clearly implies a practical starting state, and leave risky flows called out rather than guessed.

**Tech Stack:** React, TypeScript/JavaScript, Supabase, Vite, Node test runner

---

### Task 1: Add regression coverage for the new status model

**Files:**
- Create: `src/tests/status/statusModelSweep.test.js`

- [ ] **Step 1: Write failing source-regression tests for invoice and quotation status rules**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('invoice and quotation flows no longer default to legacy workflow statuses', () => {
  const newInvoiceSource = read('src/pages/NewInvoice.jsx')
  const editInvoiceSource = read('src/pages/EditInvoice.jsx')
  const invoiceActionsSource = read('src/pages/viewInvoiceActions.ts')
  const quotationActionsSource = read('src/pages/viewQuotationActions.ts')
  const quotationStatusSource = read('src/components/quotation/quotationStatus.ts')

  assert.match(newInvoiceSource, /status:\s*'unpaid'/)
  assert.match(editInvoiceSource, /handleSave\('unpaid'\)/)
  assert.match(invoiceActionsSource, /status:\s*'unpaid'/)
  assert.match(quotationActionsSource, /status:\s*'open'/)
  assert.match(quotationActionsSource, /converted/)
  assert.doesNotMatch(quotationStatusSource, /draft|sent|accepted|rejected/)
})

test('legacy invoice and quotation UI actions are removed from primary surfaces', () => {
  const invoicesSource = read('src/pages/Invoices.jsx')
  const viewInvoiceSource = read('src/pages/ViewInvoice.tsx')
  const viewQuotationSource = read('src/pages/ViewQuotation.tsx')

  assert.doesNotMatch(invoicesSource, /mark-sent|Mark Sent|Draft|Overdue|Partial/)
  assert.doesNotMatch(viewInvoiceSource, /status:\s*'sent'|Marked as sent|draft quotation/)
  assert.doesNotMatch(viewQuotationSource, /Mark Sent|Mark Accepted|Mark Rejected|accepted|rejected/)
  assert.match(viewQuotationSource, /converted/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/tests/status/statusModelSweep.test.js`
Expected: FAIL because the codebase still contains `draft`, `sent`, `accepted`, `rejected`, `partial`, and related UI text.

- [ ] **Step 3: Implement the minimal production changes to satisfy the new rules**

Update the invoice and quotation sources identified by the failing assertions so the status model becomes:

```txt
Invoices: unpaid, partially_paid, paid, archived
Quotations: open, converted, archived
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/tests/status/statusModelSweep.test.js`
Expected: PASS

### Task 2: Sweep invoice status creation, payment, clone, and reporting flows

**Files:**
- Modify: `src/pages/NewInvoice.jsx`
- Modify: `src/pages/EditInvoice.jsx`
- Modify: `src/pages/viewInvoiceActions.ts`
- Modify: `src/hooks/useInvoiceMutations.ts`
- Modify: `src/hooks/useInvoiceDetailData.js`
- Modify: `src/domain/invoice/viewModel.js`
- Modify: `src/domain/invoice/actions.js`
- Modify: `src/components/invoice/exportInvoiceCsv.ts`
- Modify: `src/components/document-view/invoice/InvoiceMoreSheet.tsx`
- Modify: `src/components/document-view/invoice/InvoiceHtmlView.tsx`
- Modify: `src/pages/Invoices.jsx`
- Modify: `src/pages/ViewInvoice.tsx`
- Modify: `src/pages/Reports.tsx`
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/hooks/useDashboardData.ts`
- Modify: `src/pages/ComplianceHub.tsx`

- [ ] **Step 1: Replace invoice creation and clone defaults with `unpaid`**

```txt
New invoice save actions:
- primary save -> unpaid
- floating/default save -> unpaid
- duplicate/clone prefill -> unpaid
- conversion from quotation -> unpaid
```

- [ ] **Step 2: Replace legacy computed invoice workflow labels**

```txt
partial -> partially_paid
draft/sent/overdue fallbacks -> unpaid where a default is required
archive remains driven by archived_at, not fake workflow steps
```

- [ ] **Step 3: Remove invoice UI actions that fake workflow progress**

```txt
Remove:
- Save Draft
- Mark Sent

Keep:
- Record payment
- Archive
- Delete
- Revert/convert flows
```

- [ ] **Step 4: Update list/report/dashboard filters and badges**

```txt
Allowed invoice surfaces:
- unpaid
- partially_paid
- paid
- archived
```

- [ ] **Step 5: Run targeted regression test**

Run: `node --test src/tests/status/statusModelSweep.test.js`
Expected: PASS

### Task 3: Sweep quotation status creation, conversion, clone, and display flows

**Files:**
- Modify: `src/domain/quotation/types.ts`
- Modify: `src/domain/quotation/normalize.ts`
- Modify: `src/components/quotation/quotationStatus.ts`
- Modify: `src/components/quotation/QuotationList.tsx`
- Modify: `src/components/quotation/QuotationForm.tsx`
- Modify: `src/components/quotation/QuotationDetail.tsx`
- Modify: `src/components/quotation/exportQuotationCsv.ts`
- Modify: `src/components/document-view/quotation/QuotationMoreSheet.tsx`
- Modify: `src/components/document-view/quotation/QuotationViewPage.tsx`
- Modify: `src/pages/viewQuotationActions.ts`
- Modify: `src/pages/ViewQuotation.tsx`
- Modify: `src/pages/ViewRfq.tsx`
- Modify: `src/pages/ViewBoq.tsx`
- Modify: `src/hooks/useDashboardData.ts`

- [ ] **Step 1: Replace quotation status unions and formatters**

```ts
export type QuotationStatus = 'open' | 'converted' | 'archived'
```

- [ ] **Step 2: Replace quotation creation and clone defaults with `open`**

```txt
Create quotation -> open
Duplicate quotation -> open
RFQ/BOQ conversion to quotation -> open
Invoice revert-to-quotation -> open
```

- [ ] **Step 3: Replace quotation conversion completion with `converted`**

```txt
When quotation becomes an invoice, mark quotation status as converted.
Do not rely on accepted/rejected/sent workflow buttons.
```

- [ ] **Step 4: Remove fake quotation workflow UI**

```txt
Remove:
- Save Draft
- Mark Sent
- Mark Accepted
- Mark Rejected

Keep:
- Convert to invoice
- Archive
- Delete
```

- [ ] **Step 5: Re-run targeted regression test**

Run: `node --test src/tests/status/statusModelSweep.test.js`
Expected: PASS

### Task 4: Remove obvious draft-first defaults from other document modules without inventing new workflows

**Files:**
- Modify: `src/pages/viewRFQActions.ts`
- Modify: `src/pages/viewBOQActions.ts`
- Modify: `src/pages/viewCSRActions.ts`
- Modify: `src/pages/viewWaybillActions.ts`
- Modify: `src/pages/ViewRfq.tsx`
- Modify: `src/pages/ViewBoq.tsx`
- Modify: `src/pages/ViewCSR.tsx`
- Modify: `src/pages/ViewWaybill.tsx`

- [ ] **Step 1: Replace default draft clone/create statuses only where the practical starting state is already implied**

```txt
RFQ -> open
CSR -> in_progress
Waybill -> dispatched
BOQ -> leave for manual review if code does not clearly prove a safe starting state
```

- [ ] **Step 2: Preserve current practical lifecycle controls unless they are clearly fake workflow ceremony**

```txt
Keep operational states like:
- RFQ open/closed
- CSR in_progress/completed
- Waybill dispatched/delivered/returned
```

- [ ] **Step 3: If a document type lacks enough evidence for a safe rewrite, leave code intact and document it in the final report**

Run: `rg -n "status:\\s*'draft'|\\|\\| 'draft'|fallback: 'draft'" src/pages src/components src/domain src/hooks`
Expected: only intentionally retained risky spots remain, if any

### Task 5: Verify build and typecheck

**Files:**
- No code changes expected

- [ ] **Step 1: Run targeted status regression test**

Run: `node --test src/tests/status/statusModelSweep.test.js`
Expected: PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: exit 0

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: exit 0
