/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'

import { IndustrialFormeDocument } from '../../components/pdf/forme/IndustrialFormeDocument'
import { IndustryFormeDocument } from '../../components/pdf/forme/IndustryFormeDocument'
import { MinimalFormeDocument } from '../../components/pdf/forme/MinimalFormeDocument'
import { LandscapeFormeDocument } from '../../components/pdf/forme/LandscapeFormeDocument'
import { EvergreenFormeDocument } from '../../components/pdf/forme/EvergreenFormeDocument'
import { ArchitecturalFormeDocument } from '../../components/pdf/forme/ArchitecturalFormeDocument'
import { ExecutiveFormeDocument } from '../../components/pdf/forme/ExecutiveFormeDocument'
import { HeritageHouseFormeDocument } from '../../components/pdf/forme/HeritageHouseFormeDocument'
import { MosaicFormeDocument } from '../../components/pdf/forme/MosaicFormeDocument'

import {
  prepareCpsCommercialDocument,
  DEFAULT_CPS_COLUMN_VISIBILITY,
} from '../../domain/pdf/resolver/commercial'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { resolveCommercialPdfRoute } from '../../components/pdf'

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
    id: 'cps-render-1',
    cps_number: 'SASBOQ-000042',
    title: 'Lekki Phase 1 Duplex',
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

const RENDERERS: Record<string, React.ComponentType<{ data: any; compact?: boolean }>> = {
  'industrial-forme': IndustrialFormeDocument,
  'industry-forme': IndustryFormeDocument,
  'minimal-forme': MinimalFormeDocument,
  'landscape-forme': LandscapeFormeDocument,
  'evergreen-forme': EvergreenFormeDocument,
  'architectural-forme': ArchitecturalFormeDocument,
  'executive-forme': ExecutiveFormeDocument,
  'heritage-forme': HeritageHouseFormeDocument,
  'mosaic-forme': MosaicFormeDocument,
}

for (const id of Object.keys(RENDERERS)) {
  test(`${id} produces non-empty PDF bytes for a CPS document`, { timeout: 60000 }, async () => {
    await ensureFormeFontFamily('Inter')
    await ensureFormeFontFamily('Noto Sans')

    const isLandscape = id === 'landscape-forme'
    const model = prepareCpsCommercialDocument(buildFixtureCps(), {
      settings,
      orientation: isLandscape ? 'landscape' : 'portrait',
    })
    const adapted = adaptCommercialDocumentData(model as any)
    assert.equal(adapted.documentKind, 'cps')
    assert.equal(adapted.title, 'COST & PRICING SHEET')

    const route = resolveCommercialPdfRoute(id.replace(/-forme$/, ''))
    assert.match(route, /-forme$/)

    const element = React.createElement(RENDERERS[route], { data: adapted, compact: false })
    const bytes = await renderPdfcnToBytes(element)
    assert.ok(bytes.length > 1000, `${route} produced suspiciously small PDF (${bytes.length} bytes)`)
    const header = Array.from(bytes.slice(0, 5)).map((b: number) => String.fromCharCode(b)).join('')
    assert.equal(header, '%PDF-')
  })
}

test('confidentiality toggle: hiding CP removes Unit CP and Total Cost columns', () => {
  const cps = buildFixtureCps()
  const visible = { ...DEFAULT_CPS_COLUMN_VISIBILITY, showCp: false }
  const model = prepareCpsCommercialDocument(cps, { settings, columnVisibility: visible })
  const keys = (model.columns || []).map((column) => column.key)
  assert.ok(!keys.includes('unitCp'))
  assert.ok(!keys.includes('totalCost'))

  const visibleWithCp = DEFAULT_CPS_COLUMN_VISIBILITY
  const modelWithCp = prepareCpsCommercialDocument(cps, { settings, columnVisibility: visibleWithCp })
  const keysWithCp = (modelWithCp.columns || []).map((column) => column.key)
  assert.ok(keysWithCp.includes('unitCp'))
  assert.ok(keysWithCp.includes('totalCost'))
})
