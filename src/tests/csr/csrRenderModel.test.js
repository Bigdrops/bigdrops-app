import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCsrRenderModel } from '../../domain/csr/csrRenderModel.ts'

function createMinimalCsr(overrides = {}) {
  return {
    csr_number: 'SASCSR-1001',
    date: '2025-06-01',
    status: 'Complete',
    client_name: 'Acme Corp',
    address: '',
    po_number: '',
    show_po: false,
    call_type: '',
    system_down: '',
    equipment_type: '',
    equipment_location: '',
    make: '',
    model: '',
    serial_no: '',
    capacity: '',
    engine_no: '',
    problem_reported: '',
    service_rendered: '',
    defects_found: '',
    engineer_remarks: '',
    customer_feedback: '',
    voltage: '',
    frequency: '',
    battery: '',
    temperature: '',
    pressure: '',
    hours: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    acknowledgement_name: '',
    recipientRole: '',
    technicianName: '',
    technicianSignatory: null,
    materialsRows: [],
    materialsText: '',
    materials_used: '',
    ...overrides,
  }
}

test('buildCsrRenderModel handles null call_type', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: null }))
  assert.equal(result.callTypeDisplay, '')
})

test('buildCsrRenderModel resolves BREAKDOWN call_type', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: 'breakdown' }))
  assert.equal(result.callTypeDisplay, 'BREAKDOWN')
})

test('buildCsrRenderModel resolves BD abbreviation', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: 'BD' }))
  assert.equal(result.callTypeDisplay, 'BREAKDOWN')
})

test('buildCsrRenderModel resolves MAINTENANCE call_type', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: 'Maintenance' }))
  assert.equal(result.callTypeDisplay, 'MAINTENANCE')
})

test('buildCsrRenderModel preserves Warranty call_type', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: 'Warranty' }))
  assert.equal(result.callTypeDisplay, 'Warranty')
})

test('buildCsrRenderModel preserves Paid Service call_type', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: 'Paid Service' }))
  assert.equal(result.callTypeDisplay, 'Paid Service')
})

test('buildCsrRenderModel preserves AMC call_type', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ call_type: 'AMC' }))
  assert.equal(result.callTypeDisplay, 'AMC')
})

test('buildCsrRenderModel resolves null system_down to empty', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ system_down: null }))
  assert.equal(result.systemDownDisplay, '')
})

test('buildCsrRenderModel resolves system_down true to DOWN', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ system_down: true }))
  assert.equal(result.systemDownDisplay, 'DOWN')
})

test('buildCsrRenderModel resolves system_down false to OPERATIONAL', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ system_down: false }))
  assert.equal(result.systemDownDisplay, 'OPERATIONAL')
})

test('buildCsrRenderModel resolves system_down string "yes"', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ system_down: 'yes' }))
  assert.equal(result.systemDownDisplay, 'DOWN')
})

test('buildCsrRenderModel passes engine_no through', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ engine_no: 'FG-40-2025-ENG' }))
  assert.equal(result.engine_no, 'FG-40-2025-ENG')
  assert.equal(result.engineNo, 'FG-40-2025-ENG')
})

test('buildCsrRenderModel defaults engine_no to empty string when null', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ engine_no: null }))
  assert.equal(result.engine_no, '')
})

test('buildCsrRenderModel passes battery value through', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ battery: '12.4V' }))
  assert.equal(result.battery, '12.4V')
})

test('buildCsrRenderModel defaults defects_found to "None reported" in defectsFound', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ defects_found: null }))
  assert.equal(result.defects_found, '')
  assert.equal(result.defectsFound, 'None reported')
})

test('buildCsrRenderModel passes defects_found through', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ defects_found: 'Cracked mounting bracket' }))
  assert.equal(result.defectsFound, 'Cracked mounting bracket')
})

test('buildCsrRenderModel uses materialsRows from csr', () => {
  const rows = [{ item: 'Fuse', quantity: 2, unit: 'pcs' }]
  const result = buildCsrRenderModel(createMinimalCsr({ materialsRows: rows }))
  assert.equal(result.materialsRows, rows)
})

test('buildCsrRenderModel defaults materialsRows to empty array', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ materialsRows: null }))
  assert.deepEqual(result.materialsRows, [])
})

test('buildCsrRenderModel computes comfortable layout density for minimal data', () => {
  const result = buildCsrRenderModel(createMinimalCsr())
  assert.equal(result.layoutDensity, 'comfortable')
})

test('buildCsrRenderModel computes tight layout density for verbose data', () => {
  const longStr = 'x'.repeat(200)
  const result = buildCsrRenderModel(
    createMinimalCsr({
      problem_reported: longStr,
      service_rendered: longStr,
      defects_found: longStr,
      engineer_remarks: longStr,
      materials_used: longStr,
      materialsRows: [{ item: 'A', quantity: 1, unit: 'pc' }],
    }),
  )
  assert.equal(result.layoutDensity, 'tight')
})

test('buildCsrRenderModel preserves csr_number', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ csr_number: 'SASCSR-9014' }))
  assert.equal(result.csr_number, 'SASCSR-9014')
})

test('buildCsrRenderModel passes technicianRemarks through engineer_remarks', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ engineer_remarks: 'Site access delayed 45 min' }))
  assert.equal(result.technicianRemarks, 'Site access delayed 45 min')
})

test('buildCsrRenderModel handles null engineer_remarks', () => {
  const result = buildCsrRenderModel(createMinimalCsr({ engineer_remarks: null }))
  assert.equal(result.technicianRemarks, '')
})
