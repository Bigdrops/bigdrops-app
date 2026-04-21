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
const advanceSheetPath = path.resolve('src/components/invoice/view/InvoiceAdvanceSheet.tsx')

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
  const customFields = typeof payload.custom_fields === 'string' ? JSON.parse(payload.custom_fields) : payload.custom_fields
  const config = customFields.advance_invoice
  assert.equal(config.parentId, 'parent-1')
  assert.equal(config.role, 'advance')
  assert.equal(config.mode, 'percent')
  assert.equal(config.value, 30)
  assert.equal(config.contractValue, 500000)
  assert.equal(payload.total, 150000)
  assert.equal(config.primaryLabel, ADVANCE_PRIMARY_LABEL_DEFAULT)
  assert.equal(config.secondaryLabel, ADVANCE_SECONDARY_LABEL_DEFAULT)
  assert.equal(payload.invoice_title, 'Main Invoice')
})

test('advance child flow can prefill edit state from an existing child invoice', () => {
  const draft = getAdvanceDraftFromInvoice({
    invoice_number: 'INV-001-A',
    total: 125000,
    custom_fields: {
      advance_invoice: {
        mode: 'percent',
        value: 25,
        contractValue: 500000,
        primaryLabel: 'Advance invoice due now',
        secondaryLabel: 'Balance upon completion',
      }
    }
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

test('active advance sheet wording matches the child advance invoice flow and excludes converter language', () => {
  const source = fs.readFileSync(advanceSheetPath, 'utf8')

  assert.match(source, /Create Advance Invoice/)
  assert.match(source, /Edit Advance Invoice/)
  assert.match(source, /Advance Invoice Details/)
  assert.match(source, /Parent Invoice/)
  assert.match(source, /Advance due now/)
  assert.match(source, /Balance after advance/)
  assert.doesNotMatch(source, /Standard Invoice/)
  assert.doesNotMatch(source, /Advance disabled/)
  assert.doesNotMatch(source, /Edit Config/)
  assert.doesNotMatch(source, /clear the advance configuration from this invoice/i)
})
