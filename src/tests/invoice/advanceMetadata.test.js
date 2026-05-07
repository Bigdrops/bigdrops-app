import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAdvanceInvoiceMetadata,
  clearAdvanceInvoiceMetadata,
  getAdvanceInvoiceMetadata,
  isAdvanceInvoiceChild,
  isAdvanceInvoiceParent,
  mergeAdvanceInvoiceMetadata,
} from '../../domain/invoice/advanceMetadata.ts'
import { getAdvanceSummaryValues } from '../../domain/invoice/advanceSummary.ts'

test('reads legacy parent metadata into canonical advance metadata', () => {
  const metadata = getAdvanceInvoiceMetadata({
    invoice_number: 'INV-001',
    total: 100000,
    advance_invoice: {
      role: 'parent',
      childInvoiceId: 'child-1',
      mode: 'percentage',
      value: 30,
      suffix: 'A',
      primaryLabel: 'Advance',
      secondaryLabel: 'Balance',
      contractValue: 100000,
    },
  })

  assert.deepEqual(metadata, {
    enabled: true,
    amount: 30000,
    mode: 'percentage',
    value: 30,
    document_number: 'INV-001',
    primary_label: 'Advance',
    secondary_label: 'Balance',
    contract_value: 100000,
    legacy_child_invoice_id: 'child-1',
  })
})

test('child row is detected but not treated as parent metadata', () => {
  const childCustomFields = {
    advance_invoice: {
      role: 'advance',
      parentId: 'parent-1',
    },
  }

  assert.equal(isAdvanceInvoiceChild(childCustomFields), true)
  assert.equal(isAdvanceInvoiceParent(childCustomFields), false)
  assert.equal(getAdvanceInvoiceMetadata(childCustomFields), null)
})

test('writer preserves unrelated custom fields', () => {
  const merged = mergeAdvanceInvoiceMetadata(
    { terms: { foo: true } },
    buildAdvanceInvoiceMetadata({
      enabled: true,
      amount: 5000,
      mode: 'fixed',
      value: 5000,
    }),
  )

  assert.deepEqual(merged, {
    terms: { foo: true },
    advance_invoice: {
      enabled: true,
      amount: 5000,
      mode: 'fixed',
      value: 5000,
    },
  })
})

test('clearer removes only advance metadata', () => {
  const cleared = clearAdvanceInvoiceMetadata({
    terms: { foo: true },
    advance_invoice: { enabled: true, amount: 5000 },
  })

  assert.deepEqual(cleared, {
    terms: { foo: true },
  })
})

test('reader handles canonical snake_case metadata', () => {
  const metadata = getAdvanceInvoiceMetadata({
    advance_invoice: {
      enabled: true,
      amount: 5000,
      mode: 'fixed',
      value: 5000,
      document_number: 'INV-001-A',
    },
  })

  assert.deepEqual(metadata, {
    enabled: true,
    amount: 5000,
    mode: 'fixed',
    value: 5000,
    document_number: 'INV-001-A',
  })
})

test('advance summary can build from canonical parent metadata without child-row totals', () => {
  const summary = getAdvanceSummaryValues({
    total: 100000,
    custom_fields: {
      advance_invoice: {
        enabled: true,
        amount: 30000,
        mode: 'percentage',
        value: 30,
        contract_value: 100000,
        primary_label: 'Advance',
        secondary_label: 'Balance',
      },
    },
  })

  assert.deepEqual(summary, {
    contractValue: 100000,
    thisAdvance: 30000,
    balanceRemaining: 70000,
    advancePercent: 30,
    balancePercent: 70,
    primaryLabel: 'Advance',
    secondaryLabel: 'Balance',
    primaryLabelWithPercent: 'Advance (30%)',
    secondaryLabelWithPercent: 'Balance (70%)',
  })
})

test('advance summary falls back to child-row totals only when parent metadata is absent', () => {
  const summary = getAdvanceSummaryValues({
    total: 25000,
    custom_fields: {
      advance_invoice: {
        role: 'advance',
        parentId: 'parent-1',
        contractValue: 100000,
        primaryLabel: 'Advance',
        secondaryLabel: 'Balance',
      },
    },
  })

  assert.deepEqual(summary, {
    contractValue: 100000,
    thisAdvance: 25000,
    balanceRemaining: 75000,
    advancePercent: 25,
    balancePercent: 75,
    primaryLabel: 'Advance',
    secondaryLabel: 'Balance',
    primaryLabelWithPercent: 'Advance (25%)',
    secondaryLabelWithPercent: 'Balance (75%)',
  })
})
