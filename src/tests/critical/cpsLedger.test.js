import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import React from 'react'
import { serialize } from '@formepdf/react'
import { computeCpsRowEconomics } from '../../domain/cps/calculateCpsTotals.ts'
import {
  buildCpsFormeModel,
  resolveExternalImageHref,
  selectCpsFormeDocument,
} from '../../domain/cps/pdfDownloadHandler.ts'
import { LedgerCpsDocument } from '../../components/pdf/forme/LedgerCpsDocument.tsx'
import { CpsScheduleDocument } from '../../components/pdf/forme/CpsFormeDocument.tsx'
import {
  CPS_PDF_TEMPLATES,
  readCpsPdfDisplayPreferences,
} from '../../domain/cps/pdfPreferences.ts'

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
    notes: 'Should never render in PDF',
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
    id: 'cps-ledger-1',
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
      row({ _key: 'cement', description: 'Portland cement', specification: 'B500B grade', quantity: 10, unit: 'bags', make_brand: 'Dangote', cp: 5200, sp: 6100, group_id: 'grp-a', image_url: 'https://example.com/cement.jpg' }),
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

function extractFormeText(node, output = []) {
  if (node === null || node === undefined) return output
  if (typeof node === 'string') {
    output.push(node)
    return output
  }
  if (Array.isArray(node)) {
    node.forEach((entry) => extractFormeText(entry, output))
    return output
  }
  if (typeof node !== 'object') return output
  const kind = node.kind
  if (kind && typeof kind === 'object') {
    if (typeof kind.content === 'string' && kind.content) output.push(kind.content)
    if (Array.isArray(kind.runs)) {
      kind.runs.forEach((run) => {
        if (run && typeof run.content === 'string' && run.content) output.push(run.content)
      })
    }
  }
  for (const value of Object.values(node)) {
    if (value !== kind) extractFormeText(value, output)
  }
  return output
}

function renderLedger(model) {
  return extractFormeText(serialize(React.createElement(LedgerCpsDocument, { model })))
}

function naira(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

test('Ledger is registered as a selectable template; schedule stays default', () => {
  assert.deepEqual(
    CPS_PDF_TEMPLATES.map((template) => template.id).sort(),
    ['compact', 'industry', 'ledger', 'schedule'],
  )
  assert.equal(CPS_PDF_TEMPLATES.find((template) => template.id === 'ledger')?.label, 'Ledger')
  assert.equal(readCpsPdfDisplayPreferences().templateId, 'schedule')
  assert.equal(selectCpsFormeDocument('ledger'), 'ledger')
  assert.equal(selectCpsFormeDocument('unknown-template'), 'schedule')
})

test('shared model carries authoritative extended cost, split qty/unit, currency, image href, group cost', () => {
  const cps = buildFixtureCps()
  const model = buildCpsFormeModel({
    cps,
    settings,
    photoDataUris: { cement: 'data:image/png;base64,AAA' },
  })

  const cementRow = cps.table_rows.find((row) => row.id === 'cement')
  const engine = computeCpsRowEconomics(cementRow)
  const cement = model.rows.find((row) => row.description === 'Portland cement')
  assert.ok(cement && cement.kind === 'item')
  assert.equal(cement.totalCostText, naira(engine.total_cost_price))
  assert.equal(cement.quantityValue, 10)
  assert.equal(cement.unitText, 'bags')
  assert.equal(cement.imageHref, 'https://example.com/cement.jpg')
  assert.equal(cement.imageDataUri, 'data:image/png;base64,AAA')

  const sand = model.rows.find((row) => row.description === 'Sharp sand')
  assert.ok(sand && sand.kind === 'item')
  assert.equal(sand.imageHref, null)
  assert.equal(sand.imageDataUri, null)
  assert.equal(sand.unitText, 'trips')

  assert.equal(model.currency, 'NGN')
  assert.equal(model.groups[0].costSubtotalText, naira(engine.total_cost_price))
})

test('client phone and email route to client lines, never company lines', () => {
  const model = buildCpsFormeModel({ cps: buildFixtureCps(), settings })
  assert.deepEqual(model.companyLines, ['14 Marina, Lagos'])
  assert.deepEqual(model.clientLines, ['Adaeze Okonkwo', 'Lagos', '0803 555 0192', 'adaeze@wellspring.ng'])
})

test('external image href validation allows only structurally valid HTTPS', () => {
  assert.equal(resolveExternalImageHref('https://example.com/photo.jpg'), 'https://example.com/photo.jpg')
  assert.equal(resolveExternalImageHref('http://example.com/photo.jpg'), null)
  assert.equal(resolveExternalImageHref('javascript:alert(1)'), null)
  assert.equal(resolveExternalImageHref('data:image/png;base64,AAA'), null)
  assert.equal(resolveExternalImageHref('file:///etc/passwd'), null)
  assert.equal(resolveExternalImageHref('not a url'), null)
  assert.equal(resolveExternalImageHref(''), null)
  assert.equal(resolveExternalImageHref(null), null)
  assert.equal(resolveExternalImageHref(undefined), null)
})

test('Ledger renders the reference hierarchy from prepared data', () => {
  const model = buildCpsFormeModel({
    cps: buildFixtureCps(),
    settings,
    photoDataUris: { cement: 'data:image/png;base64,AAA' },
  })
  const texts = renderLedger(model)

  assert.ok(texts.includes('COST & PRICING SHEET'), 'doc identity must dominate')
  assert.ok(texts.includes('Duplex Build'), 'actual title must render')
  assert.ok(texts.includes('SASBOQ-000007'), 'document number must render')
  assert.ok(texts.includes('Wellspring Homes Ltd'), 'client name must render')
  assert.ok(texts.includes('0803 555 0192'), 'client phone must render in client zone')
  assert.ok(texts.includes('Lekki Phase 1'), 'project/site must render')
  assert.ok(texts.includes('Total Cost'), 'financial strip must render')
  assert.ok(texts.includes('2 line items'), 'schedule counter must render')
  assert.ok(texts.includes('Unit CP'), 'seven-column headers must render')
  assert.ok(texts.includes('Unit SP'))
  assert.ok(texts.includes('Total Sell'))
  assert.ok(texts.includes('Group A'), 'group title must render')
  assert.ok(texts.includes('1 ITEM'), 'member counter must render')
  assert.ok(texts.includes('DANGOTE'), 'make must render as navy tag')
  assert.ok(texts.includes('Rates include supply to site.'), 'notes must render')
  assert.ok(!texts.includes('OPEN'), 'no status presentation')
  assert.ok(!texts.some((text) => text.toLowerCase().includes('subtotal')), 'no subtotal helper wording')
  assert.ok(!texts.some((text) => /group\s*0\d/i.test(text)), 'no group enumeration')
  assert.ok(!texts.some((text) => /commercial\s*group/i.test(text)), 'no Commercial Group helper')
  assert.ok(!texts.some((text) => /ledger\s*ipsum/i.test(text)), 'no Ledger Ipsum content')
  assert.ok(!texts.includes('Ledger'), 'template name must not leak into content')
  assert.ok(!texts.some((text) => /prepared\s*by|reviewed\s*by|approved\s*by/i.test(text)), 'no approval block')
  assert.ok(!texts.some((text) => /open\s*image|attachment|site\s*reference/i.test(text)), 'no image helper text')
})

test('Ledger omits missing client and site zones without placeholders', () => {
  const cps = buildFixtureCps()
  cps.client_name = ''
  cps.project_name = ''
  cps.custom_fields = {}
  const model = buildCpsFormeModel({ cps, settings })
  assert.equal(model.clientName, '')
  assert.deepEqual(model.clientLines, [])
  assert.equal(model.site, '')
  const texts = renderLedger(model)
  assert.ok(!texts.includes('Wellspring Homes Ltd'), 'absent client must not render')
  assert.ok(!texts.includes('Lekki Phase 1'), 'absent site must not render')
  assert.ok(!texts.some((text) => /no\s*client|n\/a|—/i.test(text)), 'no placeholder rows')
  assert.ok(texts.includes('Bigdrops Ltd'), 'company identity must render in brand and footer')
  assert.ok(texts.some((text) => text.includes('Page ')), 'page identity must render')
})

test('Ledger group footer carries authoritative CP/SP figures without labels', () => {
  const cps = buildFixtureCps()
  const model = buildCpsFormeModel({ cps, settings })
  const texts = renderLedger(model)
  const engine = computeCpsRowEconomics(cps.table_rows.find((row) => row.id === 'cement'))

  assert.ok(texts.includes(naira(engine.total_cost_price)), 'group CP total must render')
  assert.ok(texts.includes(naira(engine.total_selling_price)), 'group SP total must render')
})

test('Ledger implements no calculations and no hardcoded demo content', () => {
  const source = readFileSync(
    new URL('../../components/pdf/forme/LedgerCpsDocument.tsx', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    'computeCpsTotals',
    'computeCpsRowEconomics',
    'computeDocument',
    'instant-markup',
    'Decimal',
    'parseFloat',
    'quantity *',
    'qty *',
    '* quantity',
    'Ledger Ipsum',
    'Sun & Shield',
    'ledger.example',
    'wrap={false}',
  ]) {
    assert.ok(!source.includes(forbidden), `Ledger must not contain ${forbidden}`)
  }
  assert.ok(source.includes("size=\"A4\"") || source.includes("size={'A4'}") || source.includes('pageSize'), 'Ledger must declare portrait geometry')
  assert.ok(!source.includes('landscape'), 'Ledger must not assume landscape')
})

test('existing schedule template ignores Ledger-only fields', () => {
  const model = buildCpsFormeModel({ cps: buildFixtureCps(), settings })
  const texts = extractFormeText(serialize(React.createElement(CpsScheduleDocument, { model })))
  assert.ok(!texts.includes('Total Cost'), 'schedule must not gain Ledger columns')
  assert.ok(!texts.includes('Total Sell'), 'schedule must not gain Ledger labels')
})
