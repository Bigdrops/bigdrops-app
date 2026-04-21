import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
  buildAdvanceChildInvoicePayload,
  calculateAdvanceAmount,
  getAdvanceDraftFromInvoice,
} from '../../domain/invoice/advanceChildFlow.ts'

const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')

test('advance child flow defaults match the restored popup copy', () => {
  assert.equal(ADVANCE_SUFFIX_DEFAULT, 'A')
  assert.equal(ADVANCE_PRIMARY_LABEL_DEFAULT, 'Advance invoice due now')
  assert.equal(ADVANCE_SECONDARY_LABEL_DEFAULT, 'Balance upon completion')
})

test('advance child flow calculates percent and fixed amounts from the parent total', () => {
  assert.equal(calculateAdvanceAmount({ contractValue: 250000, mode: 'percent', inputValue: '40' }), 100000)
  assert.equal(calculateAdvanceAmount({ contractValue: 250000, mode: 'fixed', inputValue: '95000' }), 95000)
})

test('advance child flow builds a child payload without converting the parent invoice into advance mode', () => {
  const payload = buildAdvanceChildInvoicePayload({
    parentInvoice: {
      id: 'parent-1',
      invoice_number: 'INV-001',
      invoice_title: 'Main Invoice',
      client_id: 'client-1',
      client_name: 'Acme Ltd',
      project_id: 'project-1',
      issue_date: '2026-04-21',
      due_date: '2026-04-30',
      notes: 'Parent notes',
      terms: 'Parent terms',
      total: 500000,
      custom_fields: '{"foo":"bar"}',
    },
    mode: 'percent',
    inputValue: '30',
    suffix: 'A',
    primaryLabel: ADVANCE_PRIMARY_LABEL_DEFAULT,
    secondaryLabel: ADVANCE_SECONDARY_LABEL_DEFAULT,
  })

  assert.equal(payload.invoice_number, 'INV-001-A')
  assert.equal(payload.thread_id, 'parent-1')
  assert.equal(payload.thread_role, 'advance')
  assert.equal(payload.is_advance, true)
  assert.equal(payload.advance_mode, 'percent')
  assert.equal(payload.advance_value, 30)
  assert.equal(payload.total_contract_value, 500000)
  assert.equal(payload.total, 150000)
  assert.equal(payload.advance_primary_label, ADVANCE_PRIMARY_LABEL_DEFAULT)
  assert.equal(payload.advance_secondary_label, ADVANCE_SECONDARY_LABEL_DEFAULT)
  assert.equal(payload.invoice_title, 'Main Invoice')
})

test('advance child flow can prefill edit state from an existing child invoice', () => {
  const draft = getAdvanceDraftFromInvoice({
    invoice_number: 'INV-001-A',
    total: 125000,
    total_contract_value: 500000,
    advance_mode: 'percent',
    advance_value: 25,
    advance_primary_label: 'Advance invoice due now',
    advance_secondary_label: 'Balance upon completion',
  })

  assert.deepEqual(draft, {
    mode: 'percent',
    inputValue: '25',
    suffix: 'A',
    primaryLabel: 'Advance invoice due now',
    secondaryLabel: 'Balance upon completion',
  })
})

test('invoice view wiring uses the child advance sheet and stops deriving advance cards from the parent invoice mode toggle', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8')

  assert.match(source, /import InvoiceAdvanceSheet from ['"]@\/components\/invoice\/view\/InvoiceAdvanceSheet['"]/)
  assert.doesNotMatch(source, /import InvoiceAdvanceSheet from ['"]@\/components\/document-view\/invoice\/InvoiceAdvanceSheet['"]/)
  assert.doesNotMatch(source, /advanceInvoices=\{\s*invoice\.is_advance/s)
})
