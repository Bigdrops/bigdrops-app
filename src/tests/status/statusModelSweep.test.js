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

  assert.doesNotMatch(invoicesSource, /mark-sent|Mark Sent|Draft|Overdue/)
  assert.doesNotMatch(viewInvoiceSource, /status:\s*'sent'|Marked as sent|draft quotation/)
  assert.doesNotMatch(viewQuotationSource, /Mark Sent|Marked as sent|Marked as accepted|Marked as rejected/)
  assert.match(viewQuotationSource, /converted/)
})

test('other document clones do not silently create new draft records', () => {
  const rfqActionsSource = read('src/pages/viewRFQActions.ts')
  const boqActionsSource = read('src/pages/viewBOQActions.ts')
  const csrActionsSource = read('src/pages/viewCSRActions.ts')
  const waybillActionsSource = read('src/pages/viewWaybillActions.ts')
  const advanceChildFlowSource = read('src/domain/invoice/advanceChildFlow.ts')

  assert.doesNotMatch(rfqActionsSource, /status:\s*'draft'/)
  assert.doesNotMatch(boqActionsSource, /status:\s*'draft'/)
  assert.doesNotMatch(csrActionsSource, /status:\s*'draft'/)
  assert.doesNotMatch(waybillActionsSource, /status:\s*'draft'/)
  assert.match(advanceChildFlowSource, /status:\s*'unpaid'/)
})

test('status defaults and reporting surfaces avoid legacy draft-first assumptions', () => {
  const statusFormatterSource = read('src/lib/formatters/status.js')
  const reportsSource = read('src/pages/Reports.tsx')
  const dashboardSource = read('src/pages/Dashboard.jsx')
  const mobileHelpersSource = read('src/components/invoice/mobileFormHelpers.js')

  assert.match(statusFormatterSource, /fallback = 'open'/)
  assert.match(reportsSource, /type ReceivablesFilter = 'all' \| 'unpaid' \| 'paid' \| 'past_due'/)
  assert.match(reportsSource, /Past Due/)
  assert.doesNotMatch(mobileHelpersSource, /Save Draft/)
  assert.doesNotMatch(dashboardSource, /\bDraft\b/)
})
