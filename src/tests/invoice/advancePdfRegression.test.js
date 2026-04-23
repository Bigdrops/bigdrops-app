import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')
const viewInvoiceActionsPath = path.resolve('src/pages/viewInvoiceActions.ts')
const advanceSummaryPath = path.resolve('src/domain/invoice/advanceSummary.ts')

test('advance summary exposes percentage labels for the PDF callout', () => {
  const source = fs.readFileSync(advanceSummaryPath, 'utf8')

  assert.match(source, /primaryLabelWithPercent:/)
  assert.match(source, /secondaryLabelWithPercent:/)
  assert.match(source, /`\$\{[^`]*primaryLabel[^`]*\(\$\{Math\.round\(advancePercent\)\}%\)`/)
  assert.match(source, /`\$\{[^`]*secondaryLabel[^`]*\(\$\{Math\.round\(balancePercent\)\}%\)`/)
})

test('advance invoice pdf download reuses parent items and removes legacy advance totals rows', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8')

  assert.match(source, /targetItems:\s*Array\.isArray\(items\)\s*\?\s*items\s*:\s*\[\]/)
  assert.match(source, /rows:\s*\(Array\.isArray\(targetPreviewModel\?\.previewTotals\)\s*\?\s*targetPreviewModel\.previewTotals\s*:\s*\[\]\)\.map/)
})

test('advance invoice creation flow opens the existing child and skips duplicate creation attempts', () => {
  const viewInvoiceSource = fs.readFileSync(viewInvoicePath, 'utf8')
  const viewInvoiceActionsSource = fs.readFileSync(viewInvoiceActionsPath, 'utf8')

  assert.match(viewInvoiceSource, /relatedAdvanceInvoices\)\s*&&\s*relatedAdvanceInvoices\.length\s*>\s*0/)
  assert.match(viewInvoiceActionsSource, /select\('id,\s*invoice_number,\s*invoice_title,\s*total,\s*custom_fields'\)/)
  assert.match(viewInvoiceActionsSource, /return\s*\{\s*invoice:\s*existingAdvance,\s*created:\s*false\s*\}/)
})
