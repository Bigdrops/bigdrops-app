import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const complianceOverviewPath = path.resolve('src/components/compliance/ComplianceOverview.tsx')
const complianceKpiStripPath = path.resolve('src/components/compliance/ComplianceKpiStrip.tsx')
const complianceActionQueuePath = path.resolve('src/components/compliance/ComplianceActionQueue.tsx')
const complianceHubPath = path.resolve('src/pages/ComplianceHub.tsx')

test('compliance today view is wired as an operational queue instead of a decorative overview', () => {
  const overviewSource = fs.readFileSync(complianceOverviewPath, 'utf8')
  const kpiSource = fs.readFileSync(complianceKpiStripPath, 'utf8')
  const queueSource = fs.readFileSync(complianceActionQueuePath, 'utf8')

  assert.match(overviewSource, /ComplianceKpiStrip/)
  assert.match(overviewSource, /ComplianceActionQueue/)
  assert.match(kpiSource, /What needs my attention now\?/)
  assert.match(queueSource, /No urgent compliance actions right now\./)
  assert.doesNotMatch(overviewSource, /Input VAT Efficiency/)
  assert.doesNotMatch(overviewSource, /Filing Health/)
  assert.doesNotMatch(overviewSource, /Next Actions/)
})

test('compliance today queue can route records into the real compliance workflows', () => {
  const overviewSource = fs.readFileSync(complianceOverviewPath, 'utf8')
  const hubSource = fs.readFileSync(complianceHubPath, 'utf8')

  assert.match(overviewSource, /onNavigateSection/)
  assert.match(overviewSource, /sourceType: 'WHT'/)
  assert.match(overviewSource, /sourceType: 'Filing'/)
  assert.match(overviewSource, /sourceType: 'Obligation'/)
  assert.match(hubSource, /onNavigateSection=\{setSection\}/)
})
