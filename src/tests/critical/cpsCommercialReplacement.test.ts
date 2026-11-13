import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'

import {
  CPS_PDF_TEMPLATES,
  readCpsPdfDisplayPreferences,
  resolveActiveTemplateId,
  writeCpsPdfDisplayPreferences,
} from '../../domain/cps/pdfPreferences'
import {
  resolveCpsPdfColumns,
  buildCpsCommercialModel,
} from '../../domain/cps/pdfDownloadHandler'
import { resolveCommercialPdfRoute } from '../../components/pdf'
import {
  prepareCpsCommercialDocument,
} from '../../domain/pdf/resolver/commercial'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'

const ALL_COMMERCIAL_IDS = [
  'industrial',
  'industry',
  'minimal',
  'landscape',
  'evergreen',
  'architectural',
  'executive',
  'heritage',
  'mosaic',
] as const

const settings = {
  company_name: 'BOURXE Procurement Ltd',
  company_address: '14 Marina, Lagos',
  company_city: 'Lagos',
  company_state: 'Lagos',
  company_email: 'procurement@bourxe.example',
  company_phone: '+234 1 234 5678',
  company_tin: 'TIN 20384847',
}

function buildFixtureCps(overrides: Record<string, unknown> = {}) {
  const base = {
    id: 'cps-repl-1',
    cps_number: 'SASBOQ-000007',
    title: 'Duplex Build',
    project_name: 'Lekki Phase 1',
    client_name: 'Wellspring Homes Ltd',
    issue_date: '2026-10-04',
    notes: 'Rates include supply to site.',
    status: 'open',
    currency: 'NGN',
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
      {
        id: 'sec-a',
        row_type: 'section',
        section_title: 'Civil Works',
        group_id: 'grp-a',
      },
      {
        id: 'cement',
        row_type: 'item',
        description: 'Portland cement',
        quantity: 10,
        unit: 'bags',
        make_brand: 'Dangote',
        cp: 5200,
        sp: 6100,
        group_id: 'grp-a',
        sort_order: 1,
        _uiKey: 'cement',
      },
      {
        id: 'sand',
        row_type: 'item',
        description: 'Sharp sand',
        quantity: 2,
        unit: 'trips',
        cp: 28000,
        sp: 32000,
        group_id: 'grp-a',
        sort_order: 2,
        _uiKey: 'sand',
      },
      {
        id: 'electrical-section',
        row_type: 'section',
        section_title: 'Electrical',
        group_id: 'grp-e',
      },
      {
        id: 'cable',
        row_type: 'item',
        description: '16mm single core cable',
        specification: 'Pure copper',
        quantity: 12,
        unit: 'runs',
        cp: 8500,
        sp: 10400,
        group_id: 'grp-e',
        sort_order: 3,
        _uiKey: 'cable',
      },
    ],
    ...overrides,
  }
  return base as any
}

test('CPS preferences expose exactly the nine commercial template ids', () => {
  assert.deepEqual(
    CPS_PDF_TEMPLATES.map((template) => template.id).sort(),
    [...ALL_COMMERCIAL_IDS].sort(),
  )
  assert.equal(readCpsPdfDisplayPreferences().templateId, 'industry')
})

test('retired ledger / schedule / compact ids migrate to industry', () => {
  assert.equal(resolveActiveTemplateId('ledger'), 'industry')
  assert.equal(resolveActiveTemplateId('schedule'), 'industry')
  assert.equal(resolveActiveTemplateId('compact'), 'industry')
  assert.equal(resolveActiveTemplateId('unknown-id'), 'industry')
  assert.equal(resolveActiveTemplateId('industry'), 'industry')
})

test('all nine ids resolve to deterministic Forme routes', () => {
  for (const id of ALL_COMMERCIAL_IDS) {
    assert.match(resolveCommercialPdfRoute(id), /-forme$/)
    const route = resolveCommercialPdfRoute(id)
    assert.match(route, /-forme$/)
  }
  assert.equal(resolveCommercialPdfRoute('industry-forme'), 'industry-forme')
  assert.equal(resolveCommercialPdfRoute('modern-minimal'), 'minimal-forme')
})

test('commercial model preserves grouped structure and totals', () => {
  const cps = buildFixtureCps()
  const model = prepareCpsCommercialDocument(cps, { settings })
  assert.equal(model.identity.kind, 'cps')
  assert.equal(model.identity.number, 'SASBOQ-000007')
  assert.ok(model.items.length > 4)
  const groupHeaders = model.items.filter((item) => item.rowType === 'group_header')
  assert.equal(groupHeaders.length, 2)
  assert.equal(model.totals.rows.find((row) => row.key === 'cps-margin')?.format, 'percent')
})

test('confidentiality: hide-cp removes Unit CP and Total Cost columns but keeps selling', () => {
  const cps = buildFixtureCps()
  const visible = resolveCpsPdfColumns(cps.custom_fields?.columnConfig || [
    { key: 'cp', visibilityMode: 'hide_display' },
  ])
  assert.equal(visible.showCp, false)
  assert.equal(visible.showUnit, true)
  const model = buildCpsCommercialModel({
    cps,
    settings,
    columnVisibility: visible,
  })
  const keys = (model.columns || []).map((column) => column.key)
  assert.ok(!keys.includes('unitCp'))
  assert.ok(!keys.includes('totalCost'))
  assert.ok(keys.includes('sp'))
  assert.ok(keys.includes('amount'))
})

test('volume: default visibility shows Unit CP, Unit SP and Total Cost', () => {
  const cps = buildFixtureCps()
  const visible = resolveCpsPdfColumns(undefined)
  assert.equal(visible.showCp, true)
  assert.equal(visible.showMake, true)
  const model = buildCpsCommercialModel({ cps, settings })
  const keys = (model.columns || []).map((column) => column.key)
  assert.deepEqual(keys, ['num', 'description', 'quantity', 'unit', 'make', 'unitCp', 'sp', 'amount', 'totalCost'])
})

test('writer cycle persists and re-reads prefs (with stubbed storage)', () => {
  const previousWindow = (globalThis as any).window
  const storage = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => { storage.set(key, String(value)) },
    removeItem: (key: string) => { storage.delete(key) },
    clear: () => storage.clear(),
  }
  Object.defineProperty(globalThis, 'window', { value: { localStorage }, configurable: true })
  try {
    writeCpsPdfDisplayPreferences({ templateId: 'evergreen', orientation: 'portrait' })
    assert.equal(readCpsPdfDisplayPreferences().templateId, 'evergreen')
    writeCpsPdfDisplayPreferences({ templateId: 'schedule' as any, orientation: 'landscape' })
    assert.equal(readCpsPdfDisplayPreferences().templateId, 'industry')
    assert.equal(readCpsPdfDisplayPreferences().orientation, 'landscape')
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as any).window
    } else {
      Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true })
    }
  }
})

test('adapted document data renders COST & PRICING SHEET identity and client party', () => {
  const cps = buildFixtureCps()
  const model = prepareCpsCommercialDocument(cps, { settings })
  const adapted = adaptCommercialDocumentData(model)
  assert.equal(adapted.documentKind, 'cps')
  assert.equal(adapted.title, 'COST & PRICING SHEET')
  assert.equal(adapted.documentNumber, 'SASBOQ-000007')
  assert.equal(adapted.client?.name, 'Wellspring Homes Ltd')
})
