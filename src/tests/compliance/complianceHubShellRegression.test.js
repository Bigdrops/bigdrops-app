import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const complianceHubPath = path.resolve('src/pages/ComplianceHub.tsx')

test('compliance hub shell uses workflow sections instead of equal-weight overview/settings tabs', () => {
  const source = fs.readFileSync(complianceHubPath, 'utf8')

  assert.match(source, /type ComplianceSection = 'today' \| 'vat' \| 'wht' \| 'filings' \| 'obligations'/)
  assert.doesNotMatch(source, /type ComplianceTab = 'overview'/)
  assert.doesNotMatch(source, /TabsTrigger[\s\S]*Settings/)
  assert.match(source, /label: 'Today'/)
  assert.match(source, /label: 'VAT'/)
  assert.match(source, /label: 'WHT Receipts'/)
  assert.match(source, /label: 'Filings'/)
  assert.match(source, /label: 'Obligations'/)
})

test('compliance hub shell exposes a shared filter bar and shell-owned settings sheet', () => {
  const source = fs.readFileSync(complianceHubPath, 'utf8')

  assert.match(source, /label: 'Period'/)
  assert.match(source, /label: 'Tax Type'/)
  assert.match(source, /label: 'Status'/)
  assert.match(source, /label: 'Evidence'/)
  assert.match(source, /<Sheet open=\{settingsOpen\} onOpenChange=\{setSettingsOpen\}/)
  assert.match(source, /<ComplianceSettingsPanel \/>/)
})

test('compliance hub shell maps primary actions to the active workflow section', () => {
  const source = fs.readFileSync(complianceHubPath, 'utf8')

  assert.match(source, /today: \{[\s\S]*label: 'Add Filing'/)
  assert.match(source, /vat: \{[\s\S]*label: 'Add VAT Input'/)
  assert.match(source, /wht: \{[\s\S]*label: 'Initialize Receipt'/)
  assert.match(source, /filings: \{[\s\S]*label: 'New Filing'/)
  assert.match(source, /obligations: \{[\s\S]*label: 'Add Obligation'/)
})
