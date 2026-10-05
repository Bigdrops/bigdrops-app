import test from 'node:test'
import assert from 'node:assert/strict'
import { accessSync, readFileSync } from 'node:fs'

import React from 'react'
import { serialize } from '@formepdf/react'
import { computeCpsRowEconomics, computeCpsTotals } from '../../domain/cps/calculateCpsTotals.ts'
import {
  buildCpsFormeModel,
  selectCpsFormeDocument,
} from '../../domain/cps/pdfDownloadHandler.ts'
import '../../components/pdf/cpsPreparedModel.ts'
import { CpsScheduleDocument } from '../../components/pdf/forme/CpsFormeDocument.tsx'
import { LedgerCpsDocument } from '../../components/pdf/forme/LedgerCpsDocument.tsx'
import { CpsIndustryDocument } from '../../components/pdf/forme/CpsIndustryDocument.tsx'
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
    id: 'cps-industry-1',
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
      row({ _key: 'sand', description: 'Sharp sand', quantity: 2, unit: 'trips', cp: 28000, sp: 32000, group_id: null, image_url: 'http://example.com/sand.jpg' }),
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

function findImageNodes(node, output = []) {
  if (node === null || node === undefined) return output
  if (Array.isArray(node)) {
    node.forEach((entry) => findImageNodes(entry, output))
    return output
  }
  if (typeof node !== 'object') return output
  if (node.kind && node.kind.type === 'Image') output.push(node)
  for (const value of Object.values(node)) {
    if (value !== node.kind) findImageNodes(value, output)
  }
  return output
}

function renderIndustry(model) {
  return extractFormeText(serialize(React.createElement(CpsIndustryDocument, { model })))
}

function modelCurrency(model) {
  return model.currency
}

function naira(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

test('shared CPS prepared model lives outside template ownership', () => {
  const templateSource = readFileSync(
    new URL('../../components/pdf/forme/CpsFormeDocument.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(!templateSource.includes('export interface CpsForme'), 'template must not own the shared model')
  assert.ok(!templateSource.includes('export type CpsForme'), 'template must not own shared column keys')

  const modelSource = readFileSync(
    new URL('../../components/pdf/cpsPreparedModel.ts', import.meta.url),
    'utf8',
  )
  assert.ok(modelSource.includes('export interface CpsPdfModel'), 'shared module must own the document model')
  assert.ok(modelSource.includes('export interface CpsPdfRow'), 'shared module must own the row model')
  assert.ok(modelSource.includes('export interface CpsPdfGroup'), 'shared module must own the group model')
  assert.ok(!modelSource.includes('@formepdf/react'), 'shared model must stay renderer-neutral')
  assert.ok(!modelSource.includes('computeCps'), 'shared model must not calculate')

  const model = buildCpsFormeModel({ cps: buildFixtureCps(), settings })
  assert.equal(modelCurrency(model), 'NGN')
})

test('no active Lorem identity remains', () => {
  assert.ok(!CPS_PDF_TEMPLATES.some((template) => template.id === 'lorem'), 'registry must not list lorem')
  assert.equal(selectCpsFormeDocument('lorem'), 'schedule', 'retired lorem id must fall back safely')

  const ledgerSource = readFileSync(
    new URL('../../components/pdf/forme/LedgerCpsDocument.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(!/lorem/i.test(ledgerSource), 'ledger implementation must not reference lorem')

  const handlerSource = readFileSync(
    new URL('../../domain/cps/pdfDownloadHandler.ts', import.meta.url),
    'utf8',
  )
  assert.ok(!handlerSource.includes("'lorem'"), 'handler must not select lorem')

  accessSync(new URL('../../components/pdf/forme/LedgerCpsDocument.tsx', import.meta.url))
  assert.throws(
    () => accessSync(new URL('../../components/pdf/forme/LoremCpsDocument.tsx', import.meta.url)),
    'retired lorem file must be gone',
  )
})

test('registry exposes Schedule, Compact, Ledger, Industry with Schedule default', () => {
  assert.deepEqual(
    CPS_PDF_TEMPLATES.map((template) => template.id),
    ['schedule', 'compact', 'ledger', 'industry'],
  )
  assert.deepEqual(
    CPS_PDF_TEMPLATES.map((template) => template.label),
    ['Schedule', 'Compact', 'Ledger', 'Industry'],
  )
  assert.equal(readCpsPdfDisplayPreferences().templateId, 'schedule')
  assert.equal(selectCpsFormeDocument('ledger'), 'ledger')
  assert.equal(selectCpsFormeDocument('industry'), 'industry')
  assert.equal(selectCpsFormeDocument('unknown-template'), 'schedule')
})

test('Industry renders CPS hierarchy without foreign document concepts', () => {
  const model = buildCpsFormeModel({
    cps: buildFixtureCps(),
    settings,
    photoDataUris: { cement: 'data:image/png;base64,AAA', sand: 'data:image/png;base64,BBB' },
  })
  const texts = renderIndustry(model)

  assert.ok(texts.includes('COST & PRICING SHEET'), 'industry must carry CPS identity')
  assert.ok(texts.includes('Duplex Build'), 'industry must carry the actual title')
  assert.ok(texts.includes('SASBOQ-000007'), 'industry must carry the document number')
  assert.ok(texts.includes('Wellspring Homes Ltd'), 'industry must carry the client')
  assert.ok(texts.includes('0803 555 0192'), 'industry must carry client contact')
  assert.ok(texts.includes('Lekki Phase 1'), 'industry must carry the site')
  assert.ok(texts.includes('Group A'), 'industry must carry actual group titles')
  assert.ok(texts.includes('Portland cement'), 'industry must carry line items')
  assert.ok(texts.includes('Rates include supply to site.'), 'industry must carry notes')
  assert.ok(!texts.includes('OPEN'), 'industry must not present status')
  assert.ok(!texts.some((text) => /group\s*0\d/i.test(text)), 'no group enumeration')
  assert.ok(!texts.some((text) => /commercial\s*group/i.test(text)), 'no helper terminology')
  assert.ok(!texts.some((text) => text.toLowerCase().includes('subtotal')), 'no subtotal wording')
  for (const foreign of ['Due Date', 'Balance Due', 'Payment Instructions', 'Valid Until', 'Accepted', 'Signature', 'Prepared By']) {
    assert.ok(!texts.includes(foreign), `industry must not leak ${foreign}`)
  }
})

test('Industry totals and group figures stay authoritative', () => {
  const cps = buildFixtureCps()
  const model = buildCpsFormeModel({ cps, settings })
  const expected = computeCpsTotals(cps.table_rows)
  const texts = renderIndustry(model)

  assert.ok(texts.includes(naira(expected.total_cost)), 'industry must show authoritative cost')
  assert.ok(texts.includes(naira(expected.total_selling_price)), 'industry must show authoritative selling')
  const cementRow = computeCpsRowEconomics(cps.table_rows.find((row) => row.id === 'cement'))
  assert.ok(texts.includes(naira(cementRow.total_cost_price)), 'industry must show authoritative row cost')
})

test('Industry image nodes carry validated href and never suppress thumbnails', () => {
  const model = buildCpsFormeModel({
    cps: buildFixtureCps(),
    settings,
    photoDataUris: { cement: 'data:image/png;base64,AAA', sand: 'data:image/png;base64,BBB' },
  })
  const tree = serialize(React.createElement(CpsIndustryDocument, { model }))
  const images = findImageNodes(tree)
  assert.ok(images.length >= 2, 'both thumbnails must render')
  const bySrc = new Map(images.map((node) => [node.kind.src, node]))
  assert.equal(bySrc.get('data:image/png;base64,AAA')?.href, 'https://example.com/cement.jpg')
  assert.equal(bySrc.get('data:image/png;base64,BBB')?.href, undefined)
})

test('Industry introduces no financial math', () => {
  const source = readFileSync(
    new URL('../../components/pdf/forme/CpsIndustryDocument.tsx', import.meta.url),
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
    'Group 01',
    'Commercial Group',
  ]) {
    assert.ok(!source.includes(forbidden), `Industry must not contain ${forbidden}`)
  }
  assert.ok(source.includes('size="A4"'), 'Industry must declare portrait geometry')
})

test('schedule and compact render unchanged from the shared model', () => {
  const model = buildCpsFormeModel({ cps: buildFixtureCps(), settings })
  const scheduleTexts = extractFormeText(serialize(React.createElement(CpsScheduleDocument, { model })))
  assert.ok(scheduleTexts.includes('COST & PRICING SHEET'), 'schedule identity intact')
  assert.ok(!scheduleTexts.includes('Total Cost'), 'schedule keeps its own columns')
  assert.ok(!scheduleTexts.some((text) => /industry/i.test(text)), 'schedule stays out of industry semantics')
})
