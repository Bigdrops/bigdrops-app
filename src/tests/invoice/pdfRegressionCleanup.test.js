import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const previewModelPath = path.resolve('src/domain/invoice/previewModel.ts')
const documentMediaPath = path.resolve('src/domain/documentMedia.js')
const industryStylesPath = path.resolve('src/components/pdf-new/templates/industryStyles.ts')

test('invoice preview detail rows exclude duplicate title and client header entries', () => {
  const source = fs.readFileSync(previewModelPath, 'utf8')

  assert.doesNotMatch(source, /\{\s*label:\s*'Client'/)
  assert.doesNotMatch(source, /\{\s*label:\s*'Title'/)
  assert.match(source, /\{\s*label:\s*'PO Number'/)
  assert.match(source, /\{\s*label:\s*'Payment Terms'/)
})

test('advance invoices keep the shared totals block and balance due rows', () => {
  const source = fs.readFileSync(previewModelPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /const previewTotals: PreviewTotalRow\[] = \[ \.\.\.buildSummaryRows\(\{/)
  assert.doesNotMatch(source, /Contract Value/)
  assert.doesNotMatch(source, /This Advance/)
  assert.match(source, /previewBalanceDue: pdfOutput\?\.showBalanceDue === false \? null : \{/)
  assert.match(source, /previewBalanceDueAmount: pdfOutput\?\.showBalanceDue === false \? null : balanceDue/)
})

test('merged qty and unit render as a tight single token', () => {
  const source = fs.readFileSync(documentMediaPath, 'utf8')

  assert.match(source, /return `\$\{quantityText\}\$\{unitText\}`/)
  assert.doesNotMatch(source, /\\u00A0/)
})

test('industry pdf header keeps a wider logo and stable horizontal meta layout', () => {
  const source = fs.readFileSync(industryStylesPath, 'utf8')

  assert.match(source, /headerRight:\s*\{[^}]*width:\s*96/s)
  assert.match(source, /logo:\s*\{[^}]*width:\s*86,[^}]*height:\s*86/s)
  assert.match(source, /metaLabel:\s*\{[^}]*flexShrink:\s*0/s)
  assert.match(source, /metaValue:\s*\{[^}]*flexShrink:\s*1/s)
})
