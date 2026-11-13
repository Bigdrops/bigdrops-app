import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { PDFDocument } from 'pdf-lib'

import {
  resolvePdfcnDocument,
  getPdfcnTemplate,
  listPdfcnTemplates,
  CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
  CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
  groupMaterialsVertically,
  renderPdfcnToBytes,
} from '../../components/pdf/pdfcn'

const FIXTURE_CSR_RAW = {
  csr_number: 'CSR-QSV91G-25381944',
  date: '2026-10-24',
  status: 'Complete',
  call_type: 'Preventive Maint.',
  service_basis: 'Contractual Maintenance',
  system_down: 'OPERATIONAL',

  company_name: 'Sun & Shield Power Solutions',

  client_name: '11PLC (formerly Mobil Oil Nig. Plc)',
  address: '1 Mobil Rd, Apapa, Lagos 102272, Lagos',
  account_ref: 'ACC-11PLC-084',
  po_number: 'PO-MOBIL-2026-88',

  equipment_location: 'Central Utility Plant, Powerhouse Bay 2',
  sub_location: 'Basement Level -1 (Generator House)',

  equipment_type: 'Gas Generator Set',
  make: 'Cummins',
  model: 'QSV91G',
  serial_no: '25381944',
  capacity: '1750 kVA / 1400 kWe',
  engine_no: 'ENG-QSV91G-7741',

  start_date: '2026-10-12',
  start_time: '08:00',
  end_date: '2026-10-24',
  end_time: '18:00',
  hours: '30,142.6 hrs',

  // 6 Operational readings
  voltage: '415',
  frequency: '50.1',
  battery: '26.4',
  temperature: '84',
  pressure: '4.6',

  problem_reported: 'Scheduled 30,000-Hour Major Top & Bottom End Overhaul.',
  service_rendered: 'Replaced cylinder liners, pistons, rings, bearings, and turbo cartridge.',
  defects_found: 'Cylinder 3 liner micro-pitting; Main journal bearing #4 showed bronze exposure.',
  engineer_remarks: 'Engine post-overhaul run verified at full sync load for 4 hours. All channels within spec.',
  customer_feedback: 'Satisfactory completion and handover.',

  technicianName: 'Engr. D. Adeleke',
  technicianRole: 'Lead Service Specialist',
  acknowledgement_name: 'Babajide Sanwo',
  recipientRole: 'Facility Maintenance Manager',

  materials: [
    { no: '01', description: 'Cylinder Liner Assembly', qty: '16', unit: 'pcs', partNo: '4089855' },
    { no: '02', description: 'Piston Assembly Standard', qty: '16', unit: 'pcs', partNo: '4089856' },
    { no: '03', description: 'Piston Ring Set', qty: '16', unit: 'sets', partNo: '4089857' },
    { no: '04', description: 'Connecting Rod Bearing Pair', qty: '16', unit: 'pairs', partNo: '4089858' },
    { no: '05', description: 'Main Journal Bearing Set', qty: '9', unit: 'sets', partNo: '4089859' },
    { no: '06', description: 'Thrust Bearing Washer Set', qty: '2', unit: 'sets', partNo: '4089860' },
    { no: '07', description: 'Cylinder Head Gasket Multi-Layer', qty: '16', unit: 'pcs', partNo: '4089861' },
    { no: '08', description: 'Intake Valve', qty: '32', unit: 'pcs', partNo: '4089862' },
    { no: '09', description: 'Exhaust Valve Nimonic', qty: '32', unit: 'pcs', partNo: '4089863' },
    { no: '10', description: 'Valve Stem Guide & Seal Kit', qty: '64', unit: 'kits', partNo: '4089864' },
    { no: '11', description: 'Pre-Chamber Spark Plug Shielded', qty: '16', unit: 'pcs', partNo: '4089865' },
    { no: '12', description: 'Ignition Extension Coil Boot Assembly', qty: '16', unit: 'pcs', partNo: '4089866' },
    { no: '13', description: 'Turbocharger Core Assembly Cartridge', qty: '2', unit: 'units', partNo: '4089867' },
    { no: '14', description: 'Charge Air Cooler Core Assembly', qty: '1', unit: 'unit', partNo: '4089868' },
    { no: '15', description: 'Full Engine Overhaul O-Ring & Elastomer Gasket Kit', qty: '1', unit: 'kit', partNo: '4089869' },
    { no: '16', description: 'Low-Ash Stationary Gas Engine Oil SAE 40', qty: '1200', unit: 'L', partNo: '4089870' },
    { no: '17', description: 'Spin-on Lube Oil Microglass Filter Element', qty: '6', unit: 'pcs', partNo: '4089871' },
    { no: '18', description: 'Crankcase Breather Coalescing Filter Cartridge', qty: '4', unit: 'pcs', partNo: '4089872' },
  ],
}

test('PDFCN Master Resolver: Deterministic Template Registration and Discovery', () => {
  const landscape = getPdfcnTemplate('csr', CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID)
  assert.ok(landscape, 'Landscape Blueprint template must be registered')
  assert.equal(landscape?.defaultPageConfig.orientation, 'landscape')
  assert.deepEqual(landscape?.defaultPageConfig.size, { width: 841.89, height: 595.28 })

  const portrait = getPdfcnTemplate('csr', CSR_PORTRAIT_REFERENCE_TEMPLATE_ID)
  assert.ok(portrait, 'Portrait Reference template must be registered')
  assert.equal(portrait?.defaultPageConfig.orientation, 'portrait')
  assert.equal(portrait?.defaultPageConfig.size, 'A4')

  // Check aliases from prompt
  const aliasLandscape = getPdfcnTemplate('csr', 'csr-blueprint-technical-drawinglandscape.html')
  assert.ok(aliasLandscape, 'Landscape alias must resolve')

  const aliasPortrait = getPdfcnTemplate('csr', 'csr-final-pdfcn-reference.html')
  assert.ok(aliasPortrait, 'Portrait alias must resolve')

  const csrTemplates = listPdfcnTemplates('csr')
  assert.ok(csrTemplates.length >= 2, 'At least 2 CSR templates registered')
})

test('PDFCN Master Resolver: Rejects Unsupported Template Identifiers Gracefully', () => {
  const result = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: 'non-existent-template-id',
    rawDocument: FIXTURE_CSR_RAW,
  })

  assert.equal(result.success, false)
  assert.ok(result.error?.includes('Unsupported template "non-existent-template-id"'))
  assert.equal(result.element, undefined)
})

test('PDFCN Master Resolver: Rejects Incomplete Required Data with Clear Errors', () => {
  const invalidRaw = { ...FIXTURE_CSR_RAW, csr_number: '', client_name: '' }
  const result = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
    rawDocument: invalidRaw,
  })

  assert.equal(result.success, false)
  assert.ok(result.validationErrors && result.validationErrors.length > 0)
  assert.ok(result.validationErrors.some((e) => e.includes('CSR Number is required')))
  assert.ok(result.validationErrors.some((e) => e.includes('Client name is required')))
})

test('Canonical CSR Data Contract: Exact Label, Materials Grouping & Non-Fabricated Readings', () => {
  const result = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
    rawDocument: FIXTURE_CSR_RAW,
  })

  assert.equal(result.success, true)
  const prepared = result.envelope?.data
  assert.ok(prepared, 'Prepared CSR data must exist')

  // 1. Location Label Requirement
  assert.equal(prepared?.location.label, 'Site / Equipment Location')
  assert.equal(prepared?.location.site, 'Central Utility Plant, Powerhouse Bay 2')

  // 2. Service Provider distinct from Client
  assert.equal(prepared?.serviceProvider.name, 'Sun & Shield Power Solutions')
  assert.notEqual(prepared?.serviceProvider.name, prepared?.client.name)
  assert.equal(prepared?.client.name, '11PLC (formerly Mobil Oil Nig. Plc)')

  // 3. Operational Readings 6 channels
  assert.equal(prepared?.readings.voltage.value, '415')
  assert.equal(prepared?.readings.frequency.value, '50.1')
  assert.equal(prepared?.readings.battery.value, '26.4')
  assert.equal(prepared?.readings.temperature.value, '84')
  assert.equal(prepared?.readings.pressure.value, '4.6')
  assert.equal(prepared?.readings.hours.value, '30,142.6 hrs')

  // 4. Materials Schedule 18 items and Vertical Reading Groups (Col 1: 01,05,09,13,17; Col 2: 02,06,10,14,18; Col 3: 03,07,11,15; Col 4: 04,08,12,16)
  assert.equal(prepared?.materials.length, 18)
  const groups = prepared?.materialGroups
  assert.equal(groups?.length, 4)

  assert.deepEqual(groups?.[0].map((i) => i.no), ['01', '05', '09', '13', '17'])
  assert.deepEqual(groups?.[1].map((i) => i.no), ['02', '06', '10', '14', '18'])
  assert.deepEqual(groups?.[2].map((i) => i.no), ['03', '07', '11', '15'])
  assert.deepEqual(groups?.[3].map((i) => i.no), ['04', '08', '12', '16'])

  // 5. Sign-offs
  assert.equal(prepared?.signatories.serviceEngineer.roleTitle, 'SERVICE ENGINEER SIGN-OFF')
  assert.equal(prepared?.signatories.clientRepresentative.roleTitle, 'CLIENT REPRESENTATIVE SIGN-OFF')
})

test('Operational Readings: Missing Values Kept Null Without Fabricating Zeros', () => {
  const missingReadingsRaw = {
    ...FIXTURE_CSR_RAW,
    voltage: '',
    frequency: null,
    battery: undefined,
  }

  const result = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
    rawDocument: missingReadingsRaw,
  })

  assert.equal(result.success, true)
  const readings = result.envelope?.data.readings
  assert.equal(readings?.voltage.value, null, 'Empty voltage string maps to null')
  assert.equal(readings?.frequency.value, null, 'Null frequency maps to null')
  assert.equal(readings?.battery.value, null, 'Undefined battery maps to null')
  assert.equal(readings?.temperature.value, '84', 'Present temperature remains intact')
})

test('Forme / PDFCN Engine: End-to-End PDF Byte Generation for Landscape Blueprint', async () => {
  const resolution = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
    rawDocument: FIXTURE_CSR_RAW,
  })

  assert.equal(resolution.success, true)
  assert.ok(resolution.element, 'Element must be created')

  const bytes = await renderPdfcnToBytes(resolution.element)
  assert.ok(bytes instanceof Uint8Array, 'PDF bytes must be Uint8Array')
  assert.ok(bytes.length > 1000, `PDF size must be substantial (got ${bytes.length} bytes)`)

  const header = String.fromCharCode(...bytes.slice(0, 5))
  assert.equal(header, '%PDF-', 'Must start with PDF signature %PDF-')

  const pdf = await PDFDocument.load(bytes)
  const pageCount = pdf.getPageCount()
  assert.ok(pageCount >= 1, 'Landscape blueprint must produce at least one page')
  for (let index = 0; index < pageCount; index += 1) {
    const size = pdf.getPage(index).getSize()
    assert.equal(Math.round(size.width), 842, `Landscape page ${index + 1} width must be 842pt (A4 landscape)`)
    assert.equal(Math.round(size.height), 595, `Landscape page ${index + 1} height must be 595pt (A4 landscape)`)
  }
})

test('Forme / PDFCN Engine: End-to-End PDF Byte Generation for Portrait Reference', async () => {
  const resolution = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
    rawDocument: FIXTURE_CSR_RAW,
  })

  assert.equal(resolution.success, true)
  assert.ok(resolution.element, 'Element must be created')

  const bytes = await renderPdfcnToBytes(resolution.element)
  assert.ok(bytes instanceof Uint8Array, 'PDF bytes must be Uint8Array')
  assert.ok(bytes.length > 1000, `PDF size must be substantial (got ${bytes.length} bytes)`)

  const header = String.fromCharCode(...bytes.slice(0, 5))
  assert.equal(header, '%PDF-', 'Must start with PDF signature %PDF-')

  const pdf = await PDFDocument.load(bytes)
  const pageCount = pdf.getPageCount()
  assert.ok(pageCount >= 1, 'Portrait reference must produce at least one page')
  for (let index = 0; index < pageCount; index += 1) {
    const size = pdf.getPage(index).getSize()
    assert.equal(Math.round(size.width), 595, `Portrait page ${index + 1} width must be 595pt (A4 portrait)`)
    assert.equal(Math.round(size.height), 842, `Portrait page ${index + 1} height must be 842pt (A4 portrait)`)
  }
})

test('PDFCN CSR Customization & Picker Registration Compliance', async () => {
  const { isPdfcnCsrTemplate } = await import('../../components/pdf')
  const { CSR_TEMPLATE_OPTIONS, getCsrTemplateVariant } = await import('../../components/csr/CSRPreviewContent')

  // Verify isPdfcnCsrTemplate discrimination
  assert.equal(isPdfcnCsrTemplate('csr-blueprint-landscape'), true)
  assert.equal(isPdfcnCsrTemplate('csr-reference-portrait'), true)
  assert.equal(isPdfcnCsrTemplate('csr-blueprint-technical-drawinglandscape.html'), true)
  assert.equal(isPdfcnCsrTemplate('csr-final-pdfcn-reference.html'), true)
  assert.equal(isPdfcnCsrTemplate('8'), true, 'Industry (legacy id 8) is a Forme template after migration')
  assert.equal(isPdfcnCsrTemplate('3'), true, 'Zinc Light (legacy id 3) is a Forme template after migration')
  assert.equal(isPdfcnCsrTemplate('6'), true, 'Minimal (legacy id 6) is a Forme template after migration')
  assert.equal(isPdfcnCsrTemplate('7'), false, 'Unknown CSR id is not a PDFCN template')
  assert.equal(isPdfcnCsrTemplate('-1'), false)
  assert.equal(isPdfcnCsrTemplate(''), false)
  assert.equal(isPdfcnCsrTemplate(null), false)
  assert.equal(isPdfcnCsrTemplate(undefined), false)

  // Verify options registration
  const keys = CSR_TEMPLATE_OPTIONS.map((o) => o.key)
  assert.ok(keys.includes('8'), 'Must include legacy Industry (8)')
  assert.ok(keys.includes('3'), 'Must include legacy Zinc Light (3)')
  assert.ok(keys.includes('6'), 'Must include legacy Minimal (6)')
  assert.ok(keys.includes('csr-blueprint-landscape'), 'Must include Landscape Blueprint')
  assert.ok(keys.includes('csr-reference-portrait'), 'Must include Portrait Reference')

  const blueprintOption = CSR_TEMPLATE_OPTIONS.find((o) => o.key === 'csr-blueprint-landscape')
  assert.equal(blueprintOption?.badge, 'A4 Landscape')
  assert.equal(blueprintOption?.orientation, 'landscape')

  const referenceOption = CSR_TEMPLATE_OPTIONS.find((o) => o.key === 'csr-reference-portrait')
  assert.equal(referenceOption?.badge, 'A4 Portrait')
  assert.equal(referenceOption?.orientation, 'portrait')

  // Verify variant mapping
  assert.equal(getCsrTemplateVariant('csr-blueprint-landscape'), 'blueprint')
  assert.equal(getCsrTemplateVariant('csr-reference-portrait'), 'reference')
  assert.equal(getCsrTemplateVariant('8'), 'industry')
  assert.equal(getCsrTemplateVariant('3'), 'zinc')
  assert.equal(getCsrTemplateVariant('6'), 'minimal')
})

test('PDFCN Adaptive Materials Partitioning: 1, 3, 4, 8, 18, and 24 items', async () => {
  const { getAdaptiveMaterialColumns } = await import('../../components/pdf/pdfcn')

  const makeItems = (n) =>
    Array.from({ length: n }, (_, i) => ({
      no: String(i + 1).padStart(2, '0'),
      description: `Part Description ${i + 1}`,
      qty: String(i + 1),
      unit: 'pcs',
      partNo: `P-${1000 + i}`,
    }))

  // 1 item
  const res1 = getAdaptiveMaterialColumns(makeItems(1), 'portrait')
  assert.equal(res1.colCount, 1)
  assert.equal(res1.layoutMode, 'single')
  assert.equal(res1.columns[0].length, 1)

  // 3 items
  const res3 = getAdaptiveMaterialColumns(makeItems(3), 'portrait')
  assert.equal(res3.colCount, 1)
  assert.equal(res3.layoutMode, 'single')
  assert.equal(res3.columns[0].length, 3)

  // 4 items — Portrait uses single table for maximum legibility; Landscape uses 2 balanced columns
  const res4Port = getAdaptiveMaterialColumns(makeItems(4), 'portrait')
  assert.equal(res4Port.colCount, 1)
  assert.equal(res4Port.layoutMode, 'single')
  assert.equal(res4Port.columns[0].length, 4)

  const res4Land = getAdaptiveMaterialColumns(makeItems(4), 'landscape')
  assert.equal(res4Land.colCount, 2)
  assert.equal(res4Land.layoutMode, 'dual')
  assert.equal(res4Land.columns[0].length, 2)
  assert.equal(res4Land.columns[1].length, 2)

  // 8 items — Dual columns in both portrait and landscape
  const res8 = getAdaptiveMaterialColumns(makeItems(8), 'portrait')
  assert.equal(res8.colCount, 2)
  assert.equal(res8.layoutMode, 'dual')
  assert.equal(res8.columns[0].length, 4)
  assert.equal(res8.columns[1].length, 4)

  // 18 items — Ceiling capacity 4-column layout with vertical sequence
  const res18 = getAdaptiveMaterialColumns(makeItems(18), 'landscape')
  assert.equal(res18.colCount, 4)
  assert.equal(res18.layoutMode, 'quad')
  assert.deepEqual(res18.columns[0].map((i) => i.no), ['01', '05', '09', '13', '17'])
  assert.deepEqual(res18.columns[1].map((i) => i.no), ['02', '06', '10', '14', '18'])
  assert.deepEqual(res18.columns[2].map((i) => i.no), ['03', '07', '11', '15'])
  assert.deepEqual(res18.columns[3].map((i) => i.no), ['04', '08', '12', '16'])

  // 24 items — Ceiling capacity 4-column layout preserving all 24 items
  const res24 = getAdaptiveMaterialColumns(makeItems(24), 'portrait')
  assert.equal(res24.colCount, 4)
  assert.equal(res24.layoutMode, 'quad')
  assert.equal(res24.columns[0].length, 6)
  assert.equal(res24.columns[1].length, 6)
  assert.equal(res24.columns[2].length, 6)
  assert.equal(res24.columns[3].length, 6)

  // Verify total count and no duplication for 24 items
  const flattened24 = res24.columns.flat()
  assert.equal(flattened24.length, 24)
  const uniqueNos = new Set(flattened24.map((i) => i.no))
  assert.equal(uniqueNos.size, 24, 'All 24 items must be distinct and preserved')
})

test('PDFCN Asset Restoration & Clean Customer-Facing Copy', async () => {
  const { resolvePdfcnDocument, renderPdfcnToBytes, CSR_PORTRAIT_REFERENCE_TEMPLATE_ID, CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID } = await import('../../components/pdf/pdfcn')

  const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  const rawWithAssets = {
    ...FIXTURE_CSR_RAW,
    company_logo_url: pngBase64,
    technicianSignatureUrl: pngBase64,
    materials: [
      { no: '01', description: 'Fuel Filter FS1212', qty: '2', unit: 'pcs', partNo: 'FS1212' },
      { no: '02', description: 'Oil Filter LF9009', qty: '1', unit: 'pcs', partNo: 'LF9009' },
      { no: '03', description: 'Water Filter WF2074', qty: '1', unit: 'pcs', partNo: 'WF2074' },
      { no: '04', description: 'Engine Oil', qty: '50', unit: 'Litres', partNo: 'SAE40' },
    ],
  }

  // 1. Portrait reference generation with image assets
  const portraitRes = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
    rawDocument: rawWithAssets,
  })
  assert.equal(portraitRes.success, true)
  assert.equal(portraitRes.envelope?.data.serviceProvider.logoUrl, pngBase64)
  assert.equal(portraitRes.envelope?.data.signatories.serviceEngineer.signatureUrl, pngBase64)

  const portBytes = await renderPdfcnToBytes(portraitRes.element)
  assert.ok(portBytes.length > 1000)

  // 2. Landscape blueprint generation with image assets
  const landscapeRes = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
    rawDocument: rawWithAssets,
  })
  assert.equal(landscapeRes.success, true)
  const landBytes = await renderPdfcnToBytes(landscapeRes.element)
  assert.ok(landBytes.length > 1000)

  // 3. Fallback when assets are absent — does not fail, renders vector mark and blank line
  const rawWithoutAssets = {
    ...FIXTURE_CSR_RAW,
    company_logo_url: null,
    technicianSignatureUrl: null,
  }
  const fallbackRes = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
    rawDocument: rawWithoutAssets,
  })
  assert.equal(fallbackRes.success, true)
  assert.equal(fallbackRes.envelope?.data.serviceProvider.logoUrl, null)
  assert.equal(fallbackRes.envelope?.data.signatories.serviceEngineer.signatureUrl, null)

  const fallbackBytes = await renderPdfcnToBytes(fallbackRes.element)
  assert.ok(fallbackBytes.length > 1000)
})
