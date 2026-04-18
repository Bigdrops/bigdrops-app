import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const invoicesPagePath = path.resolve('src/pages/Invoices.jsx')
const viewInvoicePagePath = path.resolve('src/pages/ViewInvoice.tsx')
const revertHandlerPath = path.resolve('backend/BigDrops.Api/Commands/RevertInvoiceToQuotation/RevertInvoiceToQuotationHandler.cs')

test('invoice list quote action routes into the invoice detail revert flow', () => {
  const invoicesSource = fs.readFileSync(invoicesPagePath, 'utf8')
  const viewInvoiceSource = fs.readFileSync(viewInvoicePagePath, 'utf8')
  const revertHandlerSource = fs.readFileSync(revertHandlerPath, 'utf8')

  assert.match(invoicesSource, /const handleRevertToQuote = \(\) =>/)
  assert.match(invoicesSource, /openRevertModal:\s*true/)
  assert.match(invoicesSource, /quote:\s*handleRevertToQuote/)
  assert.doesNotMatch(invoicesSource, /Quotations are not available in this version\./)
  assert.match(viewInvoiceSource, /useLocation/)
  assert.match(viewInvoiceSource, /openRevertModal/)
  assert.match(viewInvoiceSource, /ui\.openModal\(MODAL_REVERT\)/)
  assert.match(revertHandlerSource, /image_url,\s*item_id/)
})
