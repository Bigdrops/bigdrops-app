import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const newInvoicePath = path.resolve('src/pages/NewInvoice.tsx')
const editInvoicePath = path.resolve('src/pages/EditInvoice.tsx')
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

  assert.match(sharedFormSource, /mx-auto w-full max-w-\[780px\] px-3 sm:px-4/)
  assert.match(sharedFormSource, /bd-form-shell bd-custom-scrollbar overflow-x-hidden px-0 pt-1 sm:pt-3/)
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
  assert.match(lineItemsSource, /enableItemSuggestions=\{true\}/)
})

test('shared totals rows keep timing-sensitive ordering in one shared runtime source', () => {
  const sharedFormSource = fs.readFileSync(sharedFormPath, 'utf8')
  const normalized = sharedFormSource.replace(/\s+/g, ' ')

  assert.match(
    normalized,
    /const summaryRows = \[ \{ label: 'Subtotal', value: rawSubtotal \}, \.\.\.\(timingMode === 'before' && discountAmount > 0 \? \[\{ label: 'Discount', value: -discountAmount, negative: true \}\] : \[\]\), \.\.\.taxableChargeRows, \.\.\.\(vatAmount > 0 \|\| Number\(invoice\.vat \|\| 0\) > 0 \? \[\{ label: 'VAT', value: vatAmount \}\] : \[\]\), \.\.\.\(timingMode === 'after' && discountAmount > 0 \? \[\{ label: 'Discount', value: -discountAmount, negative: true \}\] : \[\]\), \.\.\.nonTaxChargeRows, \.\.\.\(installRateTotal > 0 \? \[\{ label: 'Install Rate', value: installRateTotal \}\] : \[\]\), \.\.\.\(whtAmount > 0 \? \[\{ label: 'WHT', value: -whtAmount, negative: true \}\] : \[\]\), \]/,
  )
  assert.match(normalized, /finalLabel="Grand Total"/)
})
