import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('FormCommercialTerms does not render dash above NOT SET or NONE when values are unset', () => {
  const source = fs.readFileSync(path.resolve('src/components/document/FormCommercialTerms.tsx'), 'utf8')

  // Verify SettingRow checks for valid value before rendering <b> tag
  assert.match(source, /const hasValue = Boolean\(value && value !== '—' && value !== '-' && value\.trim\(\) !== ''\)/)
  assert.match(source, /\{hasValue \? <b>\{value\}<\/b> : null\}/)

  // Verify unset values default to empty string rather than '—' or '-'
  assert.match(source, /const discountDisplay = discountValue > 0\s*\?\s*\(discountType === 'percent' \? `\$\{discountValue\}%` : formatCurrency\(discountValue\)\)\s*:\s*''/)
  assert.match(source, /const vatDisplay = vatValue > 0 \? `\$\{vatValue\}%` : ''/)
  assert.match(source, /const whtDisplay = whtValue > 0\s*\?\s*\(whtType === 'percent' \? `\$\{whtValue\}%` : formatCurrency\(whtValue\)\)\s*:\s*''/)
  assert.match(source, /value=\{additionalFields\.length \? String\(additionalFields\.length\) : ''\}/)
})

test('Select Bank Account picker sheet uses high-contrast theme-aware classes instead of white text on pale background', () => {
  const source = fs.readFileSync(path.resolve('src/components/PdfOutputSettings.tsx'), 'utf8')

  // Banned broken pattern
  assert.doesNotMatch(source, /bg-bd-border-strong text-bd-surface/)
  assert.doesNotMatch(source, /text-\[hsl\(var\(--bd-surface\)\/0\.8\)\]/)

  // Active button styling
  assert.match(source, /active\s*\?\s*"border-primary\/60 bg-primary\/10 text-bd-text/)

  // DEFAULT badge keeps legible status success tokens
  assert.match(source, /border-bd-status-success-border bg-bd-status-success-bg.*text-bd-status-success-text/)
})

test('InvoiceDocumentCard renders previewNotesSections including additional fields and notes', () => {
  const source = fs.readFileSync(path.resolve('src/components/document-view/invoice/InvoiceDocumentCard.tsx'), 'utf8')

  assert.match(source, /const notesSections: any\[\] = Array\.isArray\(previewModel\?\.previewNotesSections\)/)
  assert.match(source, /\{notesSections\.length > 0 &&/)
  assert.match(source, /section\?\.kind === 'fields' && Array\.isArray\(section\?\.fields\)/)
  assert.match(source, /className=\{styles\.notesFieldsGrid\}/)
  assert.match(source, /className=\{styles\.notesFieldLabel\}/)
  assert.match(source, /className=\{styles\.notesFieldValue\}/)
})

test('QuotationDocumentPreview renders section.kind === fields for additional document fields', () => {
  const source = fs.readFileSync(path.resolve('src/components/document-view/quotation/QuotationDocumentPreview.tsx'), 'utf8')

  assert.match(source, /section\?\.kind === 'fields' && Array\.isArray\(section\?\.fields\)/)
  assert.match(source, /className="notes-fields-grid"/)
  assert.match(source, /className="notes-field-label"/)
  assert.match(source, /className="notes-field-value"/)
})

test('invoice and quotation PDF generators map non-empty additionalFields into document model', () => {
  const invoicePdfActions = fs.readFileSync(path.resolve('src/components/document-view/invoice/invoicePdfActions.ts'), 'utf8')
  const quotationPdfHandler = fs.readFileSync(path.resolve('src/domain/quotation/pdfDownloadHandler.ts'), 'utf8')
  const industryAdapter = fs.readFileSync(path.resolve('src/components/pdf/industryAdapter.ts'), 'utf8')

  // Invoice PDF passes additionalFields and additionalSections
  assert.match(invoicePdfActions, /normalizeAdditionalFieldEntries\(/)
  assert.match(invoicePdfActions, /additionalSections:\s*validAdditionalFields\.map/)
  assert.match(invoicePdfActions, /additionalFields:\s*validAdditionalFields/)

  // Quotation PDF passes additionalFields and additionalSections
  assert.match(quotationPdfHandler, /normalizeAdditionalFieldEntries\(/)
  assert.match(quotationPdfHandler, /additionalSections:\s*validAdditionalFields\.map/)
  assert.match(quotationPdfHandler, /additionalFields:\s*validAdditionalFields/)

  // Industry adapter accepts model.additionalFields and model.additionalSections
  assert.match(industryAdapter, /additionalFields:\s*\[\s*\.\.\.\(\(model as any\)\.additionalFields/)
})
