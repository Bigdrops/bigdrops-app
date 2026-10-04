import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { computeCpsRowEconomics, computeCpsTotals } from '../../domain/cps/calculateCpsTotals.ts'
import { buildCpsPdfModel } from '../../domain/cps/pdfDownloadHandler.ts'

function buildFixtureCps() {
  const row = (patch) => ({
    id: patch._key,
    _uiKey: patch._key,
    row_type: 'item',
    sort_order: 0,
    section_title: '',
    description: '',
    specification: '',
    quantity: 1,
    unit: 'pcs',
    notes: '',
    make_brand: '',
    cp: 0,
    sp: 0,
    image_url: null,
    group_id: null,
    vat_rate: null,
    discount_rate: null,
    install_rate: null,
    install_rate_override: null,
    install_rate_taxable: null,
    custom_data: {},
    ...patch,
  })
  return {
    id: 'cps-pdf-1',
    cps_number: 'SASBOQ-000007',
    title: 'Duplex Build',
    client_name: 'Wellspring Homes Ltd',
    project_name: 'Lekki Phase 1',
    issue_date: '2026-10-04',
    notes: 'Rates include supply to site.',
    status: 'open',
    custom_fields: {
      client_id: 'client-1',
      client_snapshot: {
        id: 'client-1',
        name: 'Wellspring Homes Ltd',
        contact_person: 'Adaeze Okonkwo',
        phone: '0803 555 0192',
        email: 'adaeze@wellspring.ng',
        city: 'Lagos',
        state: 'Lagos',
      },
    },
    table_columns: [],
    table_rows: [
      { ...row({ _key: 'sec-a' }), row_type: 'section', section_title: 'Group A', group_id: 'grp-a', quantity: 0 },
      row({ _key: 'cement', description: 'Portland cement', quantity: 10, unit: 'bags', make_brand: 'Dangote', cp: 5200, sp: 6100, group_id: 'grp-a' }),
      row({ _key: 'sand', description: 'Sharp sand', quantity: 2, unit: 'trips', cp: 28000, sp: 32000, group_id: null }),
    ],
  }
}

const settings = {
  company_name: 'Bigdrops Ltd',
  company_logo_url: 'https://example.com/logo.png',
  company_address: '14 Marina, Lagos',
  company_phone: '0800 000 0000',
  company_email: 'hello@bigdrops.ng',
}

test('CPS PDF model carries identity, parties, site, and notes', () => {
  const model = buildCpsPdfModel({ cps: buildFixtureCps(), settings })
  assert.equal(model.identity.number, 'SASBOQ-000007')
  assert.equal(model.identity.title, 'Duplex Build')
  assert.equal(model.identity.issueDate, '2026-10-04')
  assert.equal(model.company.name, 'Bigdrops Ltd')
  assert.equal(model.company.logoUrl, 'https://example.com/logo.png')
  assert.equal(model.client.name, 'Wellspring Homes Ltd')
  assert.equal(model.client.contactPerson, 'Adaeze Okonkwo')
  assert.equal(model.site, 'Lekki Phase 1')
  assert.equal(model.notes, 'Rates include supply to site.')
})

test('CPS PDF rows and groups use authoritative engine economics', () => {
  const cps = buildFixtureCps()
  const model = buildCpsPdfModel({ cps, settings })
  const expectedTotals = computeCpsTotals(cps.table_rows)
  assert.deepEqual(model.totals, expectedTotals)

  const cement = model.rows.find((row) => row.description === 'Portland cement')
  assert.ok(cement && cement.kind === 'item')
  const engine = computeCpsRowEconomics(cps.table_rows[1])
  assert.equal(cement.totalCost, engine.total_cost_price)
  assert.equal(cement.totalSelling, engine.total_selling_price)
  assert.equal(cement.profit, engine.profit)
  assert.equal(cement.marginPercent, engine.margin_percent)

  assert.equal(model.groups.length, 1)
  assert.equal(model.groups[0].id, 'grp-a')
  assert.equal(model.groups[0].itemCount, 1)
  assert.equal(model.groups[0].subtotal, 10 * 6100)
})

test('CPS PDF template implements no calculations', () => {
  const templateSource = readFileSync(
    new URL('../../components/pdf/templates/CpsSchedule.tsx', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    'computeCpsTotals',
    'computeCpsRowEconomics',
    'computeDocument',
    'instant-markup',
    'Decimal',
    'useCpsSave',
  ]) {
    assert.ok(
      !templateSource.includes(forbidden),
      `CPS template must not contain ${forbidden}; values arrive prepared`,
    )
  }
})

test('CPS PDF generator is exported from the shared pipeline', async () => {
  const pipeline = await import('../../components/pdf/index.ts')
  assert.equal(typeof pipeline.generateCpsPdf, 'function')
})

test('CPS download surfaces converge on the production handler', () => {
  const viewSource = readFileSync(
    new URL('../../components/cps/CostPricingSheetViewPresentations.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(viewSource.includes('onClick={props.onDownload}'), 'FAB must call onDownload')
  const downloadButtons = viewSource.match(/onClick=\{onDownload\}/g) || []
  assert.ok(downloadButtons.length >= 1, 'action-row Download must call onDownload')

  const pageSource = readFileSync(
    new URL('../../pages/ViewCps.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(pageSource.includes('handleDownloadCpsPdf'), 'view must use the CPS download handler')
})
