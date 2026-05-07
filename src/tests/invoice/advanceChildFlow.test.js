import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
  buildAdvanceChildInvoicePayload,
  buildAdvanceParentInvoiceMetadata,
  calculateAdvanceAmount,
  getAdvanceDraftFromInvoice,
} from '../../domain/invoice/advanceChildFlow.ts'

const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')
const advanceSheetPath = path.resolve('src/components/invoice/view/InvoiceAdvanceSheet.tsx')
const viewInvoiceActionsPath = path.resolve('src/pages/viewInvoiceActions.ts')

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

test('advance parent metadata builder preserves canonical metadata and legacy child traceability without creating an invoice row payload', () => {
  const metadata = buildAdvanceParentInvoiceMetadata({
    parentInvoice: {
      invoice_number: 'INV-001',
      issue_date: '2026-04-21',
      due_date: '2026-04-30',
      total: 500000,
    },
    mode: 'percent',
    inputValue: '30',
    suffix: 'A',
    primaryLabel: ADVANCE_PRIMARY_LABEL_DEFAULT,
    secondaryLabel: ADVANCE_SECONDARY_LABEL_DEFAULT,
    legacyChildInvoiceId: 'child-1',
    legacyChildInvoiceNumber: 'INV-001-A',
    legacyChildInvoiceTotal: 150000,
  })

  assert.deepEqual(metadata, {
    enabled: true,
    amount: 150000,
    mode: 'percentage',
    value: 30,
    document_number: 'INV-001-A',
    issued_at: '2026-04-21',
    due_at: '2026-04-30',
    status: 'unpaid',
    primary_label: ADVANCE_PRIMARY_LABEL_DEFAULT,
    secondary_label: ADVANCE_SECONDARY_LABEL_DEFAULT,
    suffix: 'A',
    contract_value: 500000,
    legacy_child_invoice_id: 'child-1',
    legacy_child_invoice_number: 'INV-001-A',
    legacy_child_invoice_total: 150000,
  })
})

test('invoice view wiring uses the child advance sheet and stops deriving advance cards from the parent invoice mode toggle', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8')

  assert.match(source, /import InvoiceAdvanceSheet from ['"]@\/components\/invoice\/view\/InvoiceAdvanceSheet['"]/)
  assert.doesNotMatch(source, /import InvoiceAdvanceSheet from ['"]@\/components\/document-view\/invoice\/InvoiceAdvanceSheet['"]/)
  assert.doesNotMatch(source, /advanceInvoices=\{\s*invoice\.is_advance/s)
})

test('active advance sheet stays compact and removes setup-era wording', () => {
  const source = fs.readFileSync(advanceSheetPath, 'utf8')

  assert.match(source, /SheetTitle[^]*Advance Invoice/s)
  assert.match(source, /Secondary Label/)
  assert.match(source, /Save Advance Invoice/)
  assert.match(source, /Create Advance Invoice/)
  assert.doesNotMatch(source, /Advance Invoice Setup/)
  assert.doesNotMatch(source, /Advance Invoice Settings/)
  assert.doesNotMatch(source, /Child invoice for/i)
  assert.doesNotMatch(source, /Contract Value/)
  assert.doesNotMatch(source, /\?\s*'Edit Advance Invoice'/)
  assert.doesNotMatch(source, /Advance Invoice Details/)
})

test('advance invoice rows use row click only and do not bounce through the standalone child invoice page for downloads', () => {
  const viewInvoiceSource = fs.readFileSync(viewInvoicePath, 'utf8')
  const invoiceViewPageSource = fs.readFileSync(path.resolve('src/components/document-view/invoice/InvoiceViewPage.tsx'), 'utf8')

  assert.doesNotMatch(viewInvoiceSource, /navigate\(`\/invoices\/\$\{selectedAdvanceInvoice\.id\}`/)
  assert.doesNotMatch(viewInvoiceSource, /navigate\(`\/invoices\/\$\{advance\.id\}`/)
  assert.doesNotMatch(invoiceViewPageSource, /advance-item-trigger/)
  assert.doesNotMatch(invoiceViewPageSource, /DropdownMenu/)
  assert.doesNotMatch(invoiceViewPageSource, /MoreHorizontal/)
})

test('advance action writers no longer insert update or delete standalone child invoice rows', () => {
  const source = fs.readFileSync(viewInvoiceActionsPath, 'utf8')

  const createBlock = source.match(/export async function createAdvanceInvoiceRecord\([\s\S]*?\n}\n\nexport async function updateAdvanceInvoiceRecord/)
  const updateBlock = source.match(/export async function updateAdvanceInvoiceRecord\([\s\S]*?\n}\n\nexport async function deleteAdvanceInvoiceRecord/)
  const deleteBlock = source.match(/export async function deleteAdvanceInvoiceRecord\([\s\S]*?\n}\n\nexport async function revertInvoiceToQuotation/)

  assert.ok(createBlock)
  assert.ok(updateBlock)
  assert.ok(deleteBlock)
  assert.doesNotMatch(createBlock[0], /\.insert\(/)
  assert.doesNotMatch(updateBlock[0], /buildAdvanceChildInvoicePayload/)
  assert.doesNotMatch(updateBlock[0], /\.eq\('id', advanceInvoiceId\)/)
  assert.doesNotMatch(deleteBlock[0], /\.delete\(\)/)
  assert.match(createBlock[0], /saveParentAdvanceInvoiceConfig/)
  assert.match(updateBlock[0], /saveParentAdvanceInvoiceConfig/)
  assert.match(deleteBlock[0], /clearParentAdvanceInvoiceConfig/)
})
