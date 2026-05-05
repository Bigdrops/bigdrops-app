import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const whtReceiptsPanelPath = path.resolve('src/components/compliance/WhtReceiptsPanel.tsx')
const whtReceiptStatusStripPath = path.resolve('src/components/compliance/WhtReceiptStatusStrip.tsx')

test('wht receipts workflow is rebuilt as an operational attention-first surface', () => {
  const panelSource = fs.readFileSync(whtReceiptsPanelPath, 'utf8')
  const stripSource = fs.readFileSync(whtReceiptStatusStripPath, 'utf8')

  assert.match(panelSource, /WhtReceiptStatusStrip/)
  assert.match(panelSource, /WhtReceiptQueueRow/)
  assert.match(stripSource, /Untracked/)
  assert.match(stripSource, /Requested/)
  assert.match(stripSource, /Received/)
  assert.match(stripSource, /Verified/)
  assert.match(panelSource, /All WHT receipts are tracked\./)
  assert.match(panelSource, /No WHT receipt tracking yet\./)
  assert.doesNotMatch(panelSource, /Storage Tip:/)
  assert.doesNotMatch(panelSource, /WHT Deductions Tracking/)
})

test('wht receipts workflow keeps normalized sheet management and import utility access', () => {
  const source = fs.readFileSync(whtReceiptsPanelPath, 'utf8')

  assert.match(source, /side=\{isMobile \? 'bottom' : 'right'\}/)
  assert.match(source, /Initialize tracking/)
  assert.match(source, /Verify \/ Review/)
  assert.match(source, /View details/)
  assert.match(source, /Import JSON/)
})
