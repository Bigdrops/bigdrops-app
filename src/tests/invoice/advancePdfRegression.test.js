import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')
const viewInvoiceActionsPath = path.resolve('src/pages/view-invoice-actions.ts')
const advanceSummaryPath = path.resolve('src/domain/invoice/advanceSummary.ts')
const advanceChildFlowPath = path.resolve('src/domain/invoice/advanceChildFlow.ts')

test('advance summary exposes percentage labels for the PDF callout', () => {
  const source = fs.readFileSync(advanceSummaryPath, 'utf8')

  assert.match(source, /primaryLabelWithPercent:/)
  assert.match(source, /secondaryLabelWithPercent:/)
  assert.match(source, /`\$\{[^`]*primaryLabel[^`]*\(\$\{Math\.round\(advancePercent\)\}%\)`/)
  assert.match(source, /`\$\{[^`]*secondaryLabel[^`]*\(\$\{Math\.round\(balancePercent\)\}%\)`/)
})

test('advance summary uses stored parent contract value instead of recalculating against the child total', () => {
  const summarySource = fs.readFileSync(advanceSummaryPath, 'utf8')
  const flowSource = fs.readFileSync(advanceChildFlowPath, 'utf8')

  assert.match(flowSource, /contractValue,/)
  assert.match(flowSource, /const advanceConfig = \{[^}]*value: numericInput,[^}]*contractValue,/s)
  assert.match(summarySource, /const parentMetadata = getAdvanceInvoiceMetadata\(invoice\)/)
  assert.match(summarySource, /const contractValue = Math\.max\([\s\S]*parentMetadata\?\.contract_value[\s\S]*advanceConfig\?\.contractValue[\s\S]*invoice\?\.total/s)
  assert.match(summarySource, /const thisAdvance = Math\.max\([\s\S]*parentMetadata\?\.amount[\s\S]*invoice\?\.total/s)
  assert.match(summarySource, /const balanceRemaining = Math\.max\(0, contractValue - thisAdvance\)/)
})

test('advance invoice pdf download reuses parent items and removes legacy advance totals rows', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8')

  assert.match(source, /targetItems:\s*Array\.isArray\(items\)\s*\?\s*items\s*:\s*\[\]/)
  assert.match(source, /rows:\s*\(Array\.isArray\(targetPreviewModel\?\.previewTotals\)\s*\?\s*targetPreviewModel\.previewTotals\s*:\s*\[\]\)\.map/)
})

test('advance invoice creation flow opens the existing child and skips duplicate creation attempts', () => {
  const viewInvoiceSource = fs.readFileSync(viewInvoicePath, 'utf8')
  const viewInvoiceActionsSource = fs.readFileSync(view-invoice-actionsPath, 'utf8')

  assert.match(viewInvoiceSource, /visibleAdvanceInvoices\.length\s*>\s*0/)
  assert.match(viewInvoiceActionsSource, /select\('id,\s*invoice_number,\s*invoice_title,\s*total,\s*custom_fields'\)/)
  assert.match(viewInvoiceActionsSource, /return\s*\{\s*invoice:\s*existingAdvance,\s*created:\s*false\s*\}/)
})

test('advance invoice delete flow logs the real rpc error, validates the child id, and falls back to parent cleanup', () => {
  const viewInvoiceSource = fs.readFileSync(viewInvoicePath, 'utf8')
  const viewInvoiceActionsSource = fs.readFileSync(view-invoice-actionsPath, 'utf8')

  assert.match(viewInvoiceActionsSource, /console\.log\('advance delete id',\s*advanceInvoiceId\)/)
  assert.match(viewInvoiceActionsSource, /console\.error\('advance child delete failed \(continuing anyway\):',\s*deleteError\)/)
  assert.match(viewInvoiceActionsSource, /select\('id,\s*custom_fields'\)\s*\.eq\('id',\s*advanceInvoiceId\)/s)
  assert.match(viewInvoiceActionsSource, /console\.error\('advance delete id mismatch',[^)]*parentInvoiceId[^)]*advanceInvoiceId/s)
  assert.match(viewInvoiceActionsSource, /await clearParentAdvanceInvoiceConfig\(\{[^}]*parentInvoiceId[^}]*parentCustomFields/s)
  assert.match(viewInvoiceActionsSource, /throw new Error\(getSafeAdvanceDeleteMessage\(/)

  assert.match(viewInvoiceSource, /await deleteAdvanceInvoiceRecord\(\{\s*advanceInvoiceId:\s*String\(selectedAdvanceInvoice\.id\),\s*parentInvoiceId:\s*String\(invoice\.id\),\s*parentCustomFields:\s*invoice\.custom_fields,/s)
  assert.match(viewInvoiceSource, /const hasParentAdvanceConfig = Boolean\(customFields\?\.advance_invoice\)/)
  assert.match(viewInvoiceSource, /const activeAdvanceRecord = useMemo\(/)
  assert.match(viewInvoiceSource, /const visibleAdvanceInvoices = hasParentAdvanceConfig && activeAdvanceRecord \? \[activeAdvanceRecord\] : \[\]/)
  assert.match(viewInvoiceSource, /setInvoice\(\(current(?::\s*any)?\) => \{/)
})
