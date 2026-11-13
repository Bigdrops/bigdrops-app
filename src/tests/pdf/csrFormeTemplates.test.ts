import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { isPdfcnCsrTemplate, registerAllCsrPdfcnTemplates } from '../../components/pdf/pdfcn/csr'
import { resolvePdfcnDocument } from '../../components/pdf/pdfcn'
import { renderPdfcnToBlob } from '../../components/pdf/pdfcn/adapter'
import { buildCsrRenderModel } from '../../domain/csr/csrRenderModel'
import { buildCsrPreviewData, getCsrBranding } from '../../components/csr/csrUtils'
import { normalizeRfqTemplateId } from '../../domain/rfq/templates'

const settings = {
  company_name: 'BOUXRE Engineering Ltd',
  company_tagline: 'Reliable Engineering & Energy Solutions',
  company_address: 'Plot 14 Victoria Island, Lagos',
  company_phone: '+234 801 234 5678',
  company_email: 'operations@bouxre.ng',
}

const csr = buildCsrRenderModel({
  csr_number: 'SASCSR-0042',
  date: '2026-11-10',
  status: 'Complete',
  client_name: 'Dangote Industries Ltd',
  address: '1 Alfred Rewane Road, Ikoyi',
  phone: '+234 802 987 6543',
  email: 'procurement@dangote.com',
  po_number: 'PO-99120',
  show_po: true,
  call_type: 'Maintenance',
  service_basis: 'Paid Service',
  system_down: 'No',
  equipment_type: 'Industrial Motor',
  make: 'Siemens',
  model: '1LE0001',
  serial_no: 'E6F203923',
  capacity: '450 kW',
  engine_no: 'EN-2024-88213',
  hours: '12,450',
  voltage: '415 V',
  frequency: '50 Hz',
  battery: '12.6 V',
  temperature: '38',
  pressure: '6.2 bar',
  start_date: '2026-11-10',
  start_time: '08:00',
  end_date: '2026-11-10',
  end_time: '15:30',
  problem_reported: 'Hydraulic motor tripped on overload.',
  service_rendered: 'Overload relay reset and motor windings tested.',
  defects_found: '- Worn drive-end bearing',
  engineer_remarks: 'Monitor for breakout noise.',
  customer_feedback: 'Delivered within agreed window.',
  remarks: '',
  technician_name: 'Engr. Tunde Bakare',
  technician_role: 'Senior Field Engineer',
} as any)

const previewData = buildCsrPreviewData(csr as any, {
  signatories: [{ id: 'sig-1', name: 'Engr. Tunde Bakare', role: 'Senior Field Engineer' }],
  client: { address: '1 Alfred Rewane Road, Ikoyi', city: 'Lagos', state: 'Lagos State' },
  technicianSignatory: { id: 'sig-1', name: 'Engr. Tunde Bakare', role: 'Senior Field Engineer' },
})

const branding = getCsrBranding(settings)

function resolveForTemplate(templateId: string) {
  return resolvePdfcnDocument({
    documentType: 'csr',
    templateId,
    rawDocument: { ...csr, ...previewData } as any,
    options: {
      serviceProvider: {
        name: branding.companyName,
        subtitle: branding.companyTagline,
        address: branding.addressLine,
        contact: branding.phoneEmailLine,
      },
    },
  })
}

const ALL_TEMPLATE_IDS = ['8', '3', '6', 'csr-blueprint-landscape', 'csr-reference-portrait'] as const

for (const templateId of ALL_TEMPLATE_IDS) {
  test(`CSR template ${templateId} renders valid Forme bytes`, async () => {
    const resolution = resolveForTemplate(templateId)
    assert.equal(resolution.success, true, `expected success for ${templateId}`)
    assert.ok(resolution.element, 'resolution must include element')
    const blob = await renderPdfcnToBlob(resolution.element!)
    assert.equal(blob.type, 'application/pdf')
    assert.ok(blob.size > 1000, 'pdf must be non-empty')
  })
}

test('every CSR template id passes isPdfcnCsrTemplate', () => {
  for (const id of ALL_TEMPLATE_IDS) {
    assert.equal(isPdfcnCsrTemplate(id), true, `${id} must be a PDFCN id`)
  }
})

test('legacy 3/6/8 ids resolve to their Forme implementations', async () => {
  for (const [legacyId] of [['3', 'csr-zinc'], ['6', 'csr-minimal'], ['8', 'csr-industry']] as const) {
    const resolution = resolvePdfcnDocument({
      documentType: 'csr',
      templateId: legacyId,
      rawDocument: { ...csr, ...previewData } as any,
    })
    assert.equal(resolution.success, true, `${legacyId} must resolve`)
    assert.equal(resolution.envelope?.templateId, legacyId)
  }
})

test('blank CSR download path renders through Zinc', () => {
  const blank = buildCsrPreviewData({ ...csr, csr_number: 'BLANK-0001' } as any, { technicianSignatory: null })
  const resolution = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: '3',
    rawDocument: { ...csr, ...blank, csr_number: 'BLANK-0001' } as any,
  })
  assert.equal(resolution.success, true)
})

test('CSR resolver rejects unknown templates', () => {
  const resolution = resolvePdfcnDocument({ documentType: 'csr', templateId: 'does-not-exist', rawDocument: csr as any })
  assert.equal(resolution.success, false)
  assert.ok(resolution.error?.includes('does-not-exist'), 'error should name the unknown template')
})

test('RFQ legacy normalization is unaffected', () => {
  assert.equal(normalizeRfqTemplateId('modern'), 'mosaic')
})
