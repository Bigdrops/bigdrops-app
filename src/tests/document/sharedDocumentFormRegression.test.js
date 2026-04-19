import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const newInvoicePath = path.resolve('src/pages/NewInvoice.jsx')
const editInvoicePath = path.resolve('src/pages/EditInvoice.jsx')
const quotationFormPath = path.resolve('src/components/quotation/QuotationForm.tsx')
const sharedFormPath = path.resolve('src/components/document/SharedDocumentForm.tsx')
const formHeaderPath = path.resolve('src/components/document/FormHeader.tsx')
const formCommercialTermsPath = path.resolve('src/components/document/FormCommercialTerms.tsx')
const formTotalsPath = path.resolve('src/components/document/FormTotals.tsx')
const formLineItemsPath = path.resolve('src/components/document/FormLineItems.tsx')

test('invoice and quotation editors render through the shared document form shell', () => {
  const newInvoiceSource = fs.readFileSync(newInvoicePath, 'utf8')
  const editInvoiceSource = fs.readFileSync(editInvoicePath, 'utf8')
  const quotationFormSource = fs.readFileSync(quotationFormPath, 'utf8')

  assert.match(newInvoiceSource, /import SharedDocumentForm from ['"]@\/components\/document\/SharedDocumentForm['"]/)
  assert.match(newInvoiceSource, /<SharedDocumentForm/)
  assert.match(editInvoiceSource, /import SharedDocumentForm from ['"]@\/components\/document\/SharedDocumentForm['"]/)
  assert.match(editInvoiceSource, /<SharedDocumentForm/)
  assert.match(quotationFormSource, /import SharedDocumentForm from ['"]@\/components\/document\/SharedDocumentForm['"]/)
  assert.match(quotationFormSource, /<SharedDocumentForm/)
})

test('shared document layout stays wide with minimal gutters across invoice and quotation pages', () => {
  const sharedFormSource = fs.readFileSync(sharedFormPath, 'utf8')
  const newInvoiceSource = fs.readFileSync(newInvoicePath, 'utf8')
  const editInvoiceSource = fs.readFileSync(editInvoicePath, 'utf8')
  const quotationFormSource = fs.readFileSync(quotationFormPath, 'utf8')

  assert.match(sharedFormSource, /mx-auto w-full max-w-4xl px-0 sm:px-2/)
  assert.match(newInvoiceSource, /mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2/)
  assert.match(editInvoiceSource, /mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2/)
  assert.match(quotationFormSource, /mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2/)
})

test('shared form sections stay flat and totals use soft document styling', () => {
  const headerSource = fs.readFileSync(formHeaderPath, 'utf8')
  const commercialTermsSource = fs.readFileSync(formCommercialTermsPath, 'utf8')
  const totalsSource = fs.readFileSync(formTotalsPath, 'utf8')

  assert.doesNotMatch(headerSource, /pageCardCls/)
  assert.doesNotMatch(commercialTermsSource, /pageCardCls/)
  assert.match(totalsSource, /border-\[var\(--bd-border-soft\)\]/)
  assert.doesNotMatch(totalsSource, /border-\[var\(--bd-text\)\]/)
})

test('shared line items still use the live invoice mobile item card implementation', () => {
  const lineItemsSource = fs.readFileSync(formLineItemsPath, 'utf8')

  assert.match(lineItemsSource, /import MobileItemCard from ['"]@\/components\/invoice\/MobileItemCard['"]/)
})
