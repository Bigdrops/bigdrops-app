import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const invoiceViewPagePath = path.resolve('src/components/document-view/invoice/InvoiceViewPage.tsx')
const advanceSectionPath = path.resolve('src/components/document-view/invoice/InvoiceAdvanceInvoicesSection.tsx')

test('invoice advance invoices display lives in its own invoice-only section component', () => {
  assert.ok(fs.existsSync(advanceSectionPath), 'expected InvoiceAdvanceInvoicesSection.tsx to exist')

  const invoiceViewPageSource = fs.readFileSync(invoiceViewPagePath, 'utf8')
  const advanceSectionSource = fs.readFileSync(advanceSectionPath, 'utf8')

  assert.match(invoiceViewPageSource, /import InvoiceAdvanceInvoicesSection from ['"]\.\/InvoiceAdvanceInvoicesSection['"]/)
  assert.match(invoiceViewPageSource, /<InvoiceAdvanceInvoicesSection items=\{gAdvanceInvoices\} \/>/)
  assert.doesNotMatch(invoiceViewPageSource, /<SupportingSection title="Advance Invoices">/)

  assert.match(advanceSectionSource, /section-label'\]}>Advance Invoices</)
  assert.match(advanceSectionSource, /className=\{styles\['advance-item-row'\]\}/)
  assert.match(advanceSectionSource, /onClick=\{adv\.onOpen\}/)
  assert.match(advanceSectionSource, /<ExternalLink size=\{14\} className=\{styles\['advance-chev'\]\} \/>/)
})
