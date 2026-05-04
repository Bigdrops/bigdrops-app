import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const complianceHubPath = path.resolve('src/pages/ComplianceHub.tsx')
const complianceImportLayoutPath = path.resolve('src/components/import/JsonImportLayout.tsx')

test('compliance hub shell keeps workflow navigation but removes duplicate shell chrome', () => {
  const source = fs.readFileSync(complianceHubPath, 'utf8')

  assert.match(source, /type ComplianceSection = 'today' \| 'vat' \| 'wht' \| 'filings' \| 'obligations'/)
  assert.match(source, /label: 'Today'/)
  assert.match(source, /label: 'VAT'/)
  assert.match(source, /label: 'WHT Receipts'/)
  assert.match(source, /label: 'Filings'/)
  assert.match(source, /label: 'Obligations'/)
  assert.match(source, /<h1[^>]*>Compliance Hub<\/h1>/)
  assert.doesNotMatch(source, /Tax & Compliance/)
  assert.doesNotMatch(source, /Workspace filters/i)
  assert.doesNotMatch(source, /Workspace health/i)
})

test('compliance hub shell keeps settings access but removes dead global actions and fake action copy', () => {
  const source = fs.readFileSync(complianceHubPath, 'utf8')

  assert.match(source, /Tax Profile/)
  assert.match(source, /<Sheet open=\{settingsOpen\} onOpenChange=\{setSettingsOpen\}/)
  assert.match(source, /<ComplianceSettingsPanel \/>/)
  assert.doesNotMatch(source, /Add Filing/)
  assert.doesNotMatch(source, /Initialize Receipt/)
  assert.doesNotMatch(source, /Primary action/i)
  assert.doesNotMatch(source, /handlePrimaryAction/)
})

test('compliance import utility uses desktop side-sheet placement instead of forcing a bottom sheet everywhere', () => {
  const source = fs.readFileSync(complianceImportLayoutPath, 'utf8')

  assert.doesNotMatch(source, /side="bottom"/)
  assert.match(source, /side=\{isMobile \? 'bottom' : 'right'\}/)
})
