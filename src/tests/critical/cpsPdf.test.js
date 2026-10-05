import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import React from 'react'
import { serialize } from '@formepdf/react'
import { computeCpsRowEconomics, computeCpsTotals } from '../../domain/cps/calculateCpsTotals.ts'
import {
  ensureFormeFontFamily,
  resetFormeFontCache,
} from '../../components/pdf/forme/fonts.ts'
import {
  CpsCompactDocument,
  CpsScheduleDocument,
} from '../../components/pdf/forme/CpsFormeDocument.tsx'
import {
  buildCpsFormeModel,
  resolveCpsFormeVisibleColumns,
  resolveCpsPdfColumns,
  selectCpsFormeDocument,
} from '../../domain/cps/pdfDownloadHandler.ts'
import { CPS_CAPABILITIES } from '../../domain/pdf/customization/cps.ts'
import {
  CPS_PDF_TEMPLATES,
  readCpsPdfDisplayPreferences,
} from '../../domain/cps/pdfPreferences.ts'
import { extractDiagnostic } from '../../lib/errorMessages.ts'

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

function buildGroupedFixtureCps() {
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
    ...buildFixtureCps(),
    title: 'CPS Form Test',
    table_rows: [
      { ...row({ _key: 'electrical-section' }), row_type: 'section', section_title: 'Electrical Materials', group_id: 'grp-electrical', quantity: 0 },
      { ...row({ _key: 'generator-section' }), row_type: 'section', section_title: 'Generator Parts', group_id: 'grp-generator', quantity: 0 },
      row({
        _key: 'cable',
        description: '16mm single core cable',
        specification: 'Pure copper cable in conduit',
        quantity: 12,
        unit: 'rolls',
        make_brand: 'Coleman',
        cp: 85000,
        sp: 100000,
        group_id: 'grp-electrical',
      }),
      row({
        _key: 'breaker',
        description: '125A MCCB breaker',
        specification: 'Three-phase protection',
        quantity: 4,
        unit: 'pcs',
        make_brand: 'Schneider',
        cp: 95000,
        sp: 120000,
        group_id: 'grp-electrical',
      }),
      row({
        _key: 'labour',
        description: 'Installation labour',
        quantity: 1,
        unit: 'lot',
        cp: 200000,
        sp: 260000,
        group_id: null,
      }),
      row({
        _key: 'avr',
        description: 'Automatic voltage regulator',
        quantity: 2,
        unit: 'pcs',
        make_brand: 'Leroy-Somer',
        cp: 180000,
        sp: 220000,
        group_id: 'grp-generator',
        image_url: 'https://example.com/optional-missing-image.jpg',
      }),
    ],
  }
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

function renderFormeText(Component, model) {
  return extractFormeText(serialize(React.createElement(Component, { model })))
}

function indexesOf(texts, value) {
  const indexes = []
  texts.forEach((text, index) => {
    if (text === value) indexes.push(index)
  })
  return indexes
}

function assertExactlyOnce(texts, value) {
  const indexes = indexesOf(texts, value)
  assert.equal(indexes.length, 1, `${value} should appear exactly once`)
}

const settings = {
  company_name: 'Bigdrops Ltd',
  company_logo_url: 'https://example.com/logo.png',
  company_address: '14 Marina, Lagos',
  company_phone: '0800 000 0000',
  company_email: 'hello@bigdrops.ng',
}

test('CPS Forme model carries identity, parties, site, and notes', () => {
  const model = buildCpsFormeModel({ cps: buildFixtureCps(), settings })
  assert.equal(model.number, 'SASBOQ-000007')
  assert.equal(model.title, 'Duplex Build')
  assert.equal(model.issueDate, '2026-10-04')
  assert.equal(model.companyName, 'Bigdrops Ltd')
  assert.equal(model.clientName, 'Wellspring Homes Ltd')
  assert.ok(model.clientLines.some((line) => line.includes('Adaeze')))
  assert.ok(model.clientLines.some((line) => line.includes('Lagos')))
  assert.equal(model.site, 'Lekki Phase 1')
  assert.equal(model.notes, 'Rates include supply to site.')
})

test('CPS Forme rows and groups use authoritative engine economics', () => {
  const cps = buildFixtureCps()
  const model = buildCpsFormeModel({ cps, settings })
  const expectedTotals = computeCpsTotals(cps.table_rows)
  assert.equal(model.totals[1].display, `₦${expectedTotals.total_selling_price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  const cement = model.rows.find((row) => row.description === 'Portland cement')
  assert.ok(cement && cement.kind === 'item')
  const engine = computeCpsRowEconomics(cps.table_rows[1])
  assert.equal(cement.totalText, `₦${engine.total_selling_price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  assert.equal(model.groups.length, 1)
  assert.equal(model.groups[0].id, 'grp-a')
  assert.equal(model.groups[0].itemCount, '1')
})

test('CPS Forme model renders each eligible item exactly once in group sections', () => {
  const cps = buildGroupedFixtureCps()
  const model = buildCpsFormeModel({ cps, settings })
  const itemRows = model.rows.filter((row) => row.kind === 'item')

  assert.deepEqual(itemRows.map((row) => row.description), [
    '16mm single core cable',
    '125A MCCB breaker',
    'Automatic voltage regulator',
    'Installation labour',
  ])
  assert.equal(new Set(itemRows.map((row) => row.key)).size, itemRows.length)

  const sequence = model.rows.map((row) => {
    if (row.kind === 'group') return `group:${row.title}`
    if (row.kind === 'group-subtotal') return `subtotal:${row.title}`
    return `item:${row.description}`
  })

  assert.deepEqual(sequence, [
    'group:Electrical Materials',
    'item:16mm single core cable',
    'item:125A MCCB breaker',
    'subtotal:Electrical Materials subtotal',
    'group:Generator Parts',
    'item:Automatic voltage regulator',
    'subtotal:Generator Parts subtotal',
    'item:Installation labour',
  ])
})

test('CPS Forme serialized schedule tree contains grouped members between heading and subtotal', () => {
  const model = buildCpsFormeModel({ cps: buildGroupedFixtureCps(), settings })
  const texts = renderFormeText(CpsScheduleDocument, model)

  assertExactlyOnce(texts, '16mm single core cable')
  assertExactlyOnce(texts, '125A MCCB breaker')
  assertExactlyOnce(texts, 'Automatic voltage regulator')
  assertExactlyOnce(texts, 'Installation labour')
  assert.ok(texts.includes('SASBOQ-000007'))

  const electrical = texts.indexOf('Electrical Materials')
  const cable = texts.indexOf('16mm single core cable')
  const breaker = texts.indexOf('125A MCCB breaker')
  const electricalSubtotal = texts.indexOf('Electrical Materials subtotal')
  assert.ok(electrical < cable)
  assert.ok(cable < breaker)
  assert.ok(breaker < electricalSubtotal)

  const generator = texts.indexOf('Generator Parts')
  const avr = texts.indexOf('Automatic voltage regulator')
  const generatorSubtotal = texts.indexOf('Generator Parts subtotal')
  assert.ok(generator < avr)
  assert.ok(avr < generatorSubtotal)
})

test('CPS Forme totals and group subtotals remain tied to calculation authority', () => {
  const cps = buildGroupedFixtureCps()
  const model = buildCpsFormeModel({ cps, settings })
  const expectedTotals = computeCpsTotals(cps.table_rows)
  const electricalRows = cps.table_rows.filter((row) => row.row_type === 'item' && row.group_id === 'grp-electrical')
  const electricalSubtotal = electricalRows.reduce(
    (sum, row) => sum + computeCpsRowEconomics(row).total_selling_price,
    0,
  )
  const generatorSubtotal = computeCpsRowEconomics(cps.table_rows.find((row) => row.id === 'avr')).total_selling_price

  assert.equal(model.groups.find((group) => group.id === 'grp-electrical')?.subtotalText, `₦${electricalSubtotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  assert.equal(model.groups.find((group) => group.id === 'grp-generator')?.subtotalText, `₦${generatorSubtotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  assert.equal(model.totals[0].display, `₦${expectedTotals.total_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  assert.equal(model.totals[1].display, `₦${expectedTotals.total_selling_price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  assert.equal(model.totals[2].display, `₦${expectedTotals.gross_profit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  assert.equal(model.totals[3].display, `${Number(expectedTotals.margin_percent || 0).toFixed(1)}%`)
})

test('CPS Forme schedule and compact serialize from the same prepared data authority', () => {
  const model = buildCpsFormeModel({
    cps: buildGroupedFixtureCps(),
    settings,
    orientation: 'landscape',
    columnVisibility: { showMake: false, showUnit: false, showCp: false, showSpec: false },
  })

  assert.equal(model.orientation, 'landscape')
  assert.deepEqual(model.visibleColumns, ['no', 'description', 'qty', 'sp', 'total'])
  assert.equal(model.number, 'SASBOQ-000007')
  assert.equal(model.rows.find((row) => row.description === '16mm single core cable')?.make, '')
  assert.equal(model.rows.find((row) => row.description === '16mm single core cable')?.quantityText, '12')

  const scheduleTexts = renderFormeText(CpsScheduleDocument, model)
  const compactTexts = renderFormeText(CpsCompactDocument, model)
  for (const description of [
    '16mm single core cable',
    '125A MCCB breaker',
    'Installation labour',
    'Automatic voltage regulator',
  ]) {
    assertExactlyOnce(scheduleTexts, description)
    assertExactlyOnce(compactTexts, description)
  }
})

test('CPS Forme portrait serialization tolerates missing optional images', () => {
  const model = buildCpsFormeModel({
    cps: buildGroupedFixtureCps(),
    settings,
    orientation: 'portrait',
    photoDataUris: {},
  })
  const texts = renderFormeText(CpsScheduleDocument, model)

  assert.equal(model.orientation, 'portrait')
  assert.equal(model.rows.find((row) => row.description === 'Automatic voltage regulator')?.imageDataUri, null)
  assertExactlyOnce(texts, 'Automatic voltage regulator')
})

test('CPS Forme template implements no calculations', () => {
  const templateSource = readFileSync(
    new URL('../../components/pdf/forme/CpsFormeDocument.tsx', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    'computeCpsTotals',
    'computeCpsRowEconomics',
    'computeDocument',
    'instant-markup',
    'Decimal',
    'parseFloat',
  ]) {
    assert.ok(
      !templateSource.includes(forbidden),
      `CPS Forme template must not contain ${forbidden}; values arrive prepared`,
    )
  }
})

test('exactly one CPS PDF architecture is active', async () => {
  const pipeline = await import('../../components/pdf/index.ts')
  assert.equal(typeof pipeline.generateCpsFormePdf, 'function')
  assert.equal(pipeline.generateCpsPdf, undefined)

  const indexSource = readFileSync(
    new URL('../../components/pdf/index.ts', import.meta.url),
    'utf8',
  )
  assert.ok(indexSource.includes('@formepdf/core/browser'), 'browser runtime must use the Forme browser entry')
  assert.ok(!indexSource.includes('templates/CpsSchedule'), 'rejected react-pdf template must stay removed')
})

test('CPS download surfaces converge on the Forme handler', () => {
  const viewSource = readFileSync(
    new URL('../../components/cps/CostPricingSheetViewPresentations.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(viewSource.includes('onClick={props.onDownload}'), 'FAB must call onDownload')

  const pageSource = readFileSync(
    new URL('../../pages/ViewCps.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(pageSource.includes('handleDownloadCpsPdf'), 'view must use the CPS download handler')
  assert.ok(!pageSource.includes('generateCpsPdf'), 'rejected react-pdf generator must stay unwired')
})

test('CPS PDF display preferences default to schedule portrait', () => {
  const prefs = readCpsPdfDisplayPreferences()
  assert.equal(prefs.templateId, 'schedule')
  assert.equal(prefs.orientation, 'portrait')
  assert.deepEqual(
    CPS_PDF_TEMPLATES.map((template) => template.id).sort(),
    ['compact', 'industry', 'ledger', 'schedule'],
  )
})

test('CPS Forme document selection falls back to schedule', () => {
  assert.equal(selectCpsFormeDocument('compact'), 'compact')
  assert.equal(selectCpsFormeDocument('schedule'), 'schedule')
  assert.equal(selectCpsFormeDocument('unknown-template'), 'schedule')
})

test('CPS PDF columns default to fully visible, SP and description never hide', () => {
  const defaults = resolveCpsPdfColumns(undefined)
  assert.deepEqual(defaults, { showMake: true, showUnit: true, showCp: true, showSpec: true })

  const hidden = resolveCpsPdfColumns([
    { key: 'cp', visibilityMode: 'hide_full' },
    { key: 'sp', visibilityMode: 'hide_full' },
    { key: 'description', visibilityMode: 'hide_display' },
    { key: 'unit', visibilityMode: 'hide_display' },
  ])
  assert.equal(hidden.showCp, false)
  assert.equal(hidden.showUnit, false)
  assert.equal(hidden.showSpec, true)
  assert.deepEqual(Object.keys(hidden).sort(), ['showCp', 'showMake', 'showSpec', 'showUnit'])
  // SP and description carry no visibility flag: they always render
  assert.ok(resolveCpsFormeVisibleColumns(hidden).includes('sp'))
})

test('CPS Forme visible columns exclude hidden CP with no placeholder', () => {
  assert.deepEqual(resolveCpsFormeVisibleColumns({ showMake: true, showUnit: true, showCp: true, showSpec: true }), ['no', 'description', 'qty', 'cp', 'sp', 'total'])
  assert.deepEqual(resolveCpsFormeVisibleColumns({ showMake: false, showUnit: false, showCp: false, showSpec: false }), ['no', 'description', 'qty', 'sp', 'total'])
})

test('CPS Forme model carries font, accent, orientation, and honors hidden fields', () => {
  const cps = buildFixtureCps()
  const model = buildCpsFormeModel({
    cps,
    settings,
    fontFamily: 'Inter',
    accent: '#175cd3',
    orientation: 'landscape',
    columnVisibility: { showMake: false, showUnit: false, showCp: false, showSpec: false },
  })
  assert.equal(model.fontFamily, 'Inter')
  assert.equal(model.accent, '#175cd3')
  assert.equal(model.orientation, 'landscape')
  assert.deepEqual(model.visibleColumns, ['no', 'description', 'qty', 'sp', 'total'])

  const cement = model.rows.find((row) => row.description === 'Portland cement')
  assert.ok(cement && cement.kind === 'item')
  assert.equal(cement.make, '')
  assert.equal(cement.specification, '')
  assert.equal(cement.quantityText, '10')
})

test('CPS Forme model defaults to Helvetica with no accent in portrait', () => {
  const model = buildCpsFormeModel({ cps: buildFixtureCps(), settings })
  assert.equal(model.fontFamily, 'Helvetica')
  assert.equal(model.accent, null)
  assert.equal(model.orientation, 'portrait')
  assert.ok(model.visibleColumns.includes('cp'))

  const cement = model.rows.find((row) => row.description === 'Portland cement')
  assert.ok(cement && cement.kind === 'item')
  assert.equal(cement.make, 'Dangote')
  assert.equal(cement.quantityText, '10 bags')
})

test('CPS customization capabilities enable accent color', () => {
  assert.equal(CPS_CAPABILITIES.accentColor, true)
  assert.equal(CPS_CAPABILITIES.documentFont, true)
})

test('CPS Forme font resolver falls back instead of registering WOFF shared fonts', async () => {
  resetFormeFontCache()
  const fontFamily = await ensureFormeFontFamily('Inter')
  assert.equal(fontFamily, 'Helvetica')
})

test('CPS PDF diagnostics preserve pipeline stage and cause', () => {
  const underlying = new Error('unknown magic')
  const staged = new Error('CPS PDF render failed: unknown magic', { cause: underlying })
  const diagnostic = extractDiagnostic(new Error('Download failed', { cause: staged }))

  assert.ok(diagnostic.includes('Download failed'))
  assert.ok(diagnostic.includes('CPS PDF render failed: unknown magic'))
  assert.ok(diagnostic.includes('unknown magic'))
  assert.ok(diagnostic.includes('Caused by:'))
})

test('CPS Forme templates expose schedule and compact with shared column model', () => {
  const templateSource = readFileSync(
    new URL('../../components/pdf/forme/CpsFormeDocument.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(templateSource.includes('export function CpsScheduleDocument'), 'schedule template must exist')
  assert.ok(templateSource.includes('export function CpsCompactDocument'), 'compact template must exist')
  assert.ok(templateSource.includes('visibleColumns'), 'templates must render visible columns only')
  assert.ok(templateSource.includes('orientation'), 'templates must honor orientation')
  assert.ok(templateSource.includes('fontFamily'), 'templates must honor the selected font')
  assert.ok(templateSource.includes('imageDataUri: null'), 'compact template must strip photos')
})

test('CPS download handler reads prefs, resolves font, and selects the template', () => {
  const handlerSource = readFileSync(
    new URL('../../domain/cps/pdfDownloadHandler.ts', import.meta.url),
    'utf8',
  )
  assert.ok(handlerSource.includes('readCpsPdfDisplayPreferences'), 'handler must read display prefs')
  assert.ok(handlerSource.includes('ensureFormeFontFamily'), 'handler must resolve a shippable font')
  assert.ok(handlerSource.includes('selectCpsFormeDocument'), 'handler must select the template')
  assert.ok(handlerSource.includes('resolveCpsPdfColumns'), 'handler must gate columns by visibility')
})

test('CPS customize sheet wires template, accent, and orientation controls', () => {
  const viewSource = readFileSync(
    new URL('../../components/cps/CostPricingSheetViewPresentations.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(viewSource.includes('CPS_PDF_TEMPLATES'), 'sheet must offer all registered templates')
  assert.ok(viewSource.includes('showAccentColor'), 'sheet must expose accent color')
  assert.ok(viewSource.includes('showLandscape'), 'sheet must expose orientation')
})
