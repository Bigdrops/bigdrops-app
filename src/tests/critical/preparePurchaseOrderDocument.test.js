import test from 'node:test'
import assert from 'node:assert/strict'

import {
  preparePurchaseOrderDocument,
  validatePreparedPurchaseOrderDocument,
  STANDARD_PURCHASE_ORDER_COLUMNS,
} from '../../domain/pdf/resolver/commercial/index.ts'
import {
  createEmptyPurchaseOrder,
  createEmptyPurchaseOrderItem,
} from '../../domain/purchase-order/types.ts'

function createSamplePO(overrides = {}) {
  const po = createEmptyPurchaseOrder({
    po_number: 'PO-2026-0001',
    po_date: '2026-11-08',
    supplier_id: 'supp-456',
    supplier_name: 'Dangote Cement Distribution Ltd',
    currency: 'NGN',
    subtotal: 150000,
    discount: 5000,
    vat: 10875,
    extra_charges: [
      { label: 'Offloading & Haulage', value: 12000, withTax: true },
    ],
    total: 167875,
    calculation_inputs: {
      vatPercent: 7.5,
      discountType: 'fixed',
      discountTiming: 'before_tax',
      discountValue: 5000,
    },
    notes: '<p>Deliver directly to Gate 2 security post.</p>',
    terms: '<p>Payment terms: Net 30 days upon inspection.</p>',
    ...overrides,
  })

  po.items = overrides.items ?? [
    {
      ...createEmptyPurchaseOrderItem(0),
      id: 'poi-1',
      description: 'Portland Cement Grade 42.5N',
      quantity: 20,
      unit: 'bags',
      unit_cost: 7500,
      line_total: 150000,
    },
  ]

  return po
}

test('preparePurchaseOrderDocument: identity and metadata compliance', () => {
  const po = createSamplePO()
  const doc = preparePurchaseOrderDocument(po)

  assert.equal(doc.identity.kind, 'purchase_order')
  assert.equal(doc.identity.number, 'PO-2026-0001')
  assert.equal(doc.identity.title, 'PURCHASE ORDER')
  assert.equal(doc.identity.issueDate, '2026-11-08')
  assert.equal(doc.identity.dueDate, null)
  assert.equal(doc.identity.validUntil, null)
  assert.equal(doc.identity.poNumber, 'PO-2026-0001')
  assert.equal(doc.identity.currency, 'NGN')
  assert.deepEqual(doc.pageLayout, { size: 'A4', orientation: 'portrait' })
  assert.equal(doc.mergeQtyUnit, true)
  assert.equal(doc.hideEmptyGroups, true)
})

test('preparePurchaseOrderDocument: preserves frozen supplier snapshot and sets recipient alias', () => {
  const po = createSamplePO()
  const options = {
    supplier: {
      name: 'Different Supplier Name In Options',
      contact_person: 'Alhaji Musa',
      phone: '+234 803 000 1122',
      email: 'musa@dangotecement.example',
      address: 'Plot 12 Industrial Layout',
      city: 'Ikeja',
      state: 'Lagos',
      tax_id: 'TIN-98765432-0001',
    },
  }

  const doc = preparePurchaseOrderDocument(po, options)

  // Frozen PO snapshot takes precedence as authoritative counterparty
  assert.equal(doc.supplier.name, 'Dangote Cement Distribution Ltd')
  assert.equal(doc.supplier.label, 'Order From · Supplier / Vendor')
  assert.equal(doc.supplier.attention, 'Alhaji Musa')
  assert.equal(doc.supplier.phone, '+234 803 000 1122')
  assert.equal(doc.supplier.email, 'musa@dangotecement.example')
  assert.equal(doc.supplier.taxId, 'TIN-98765432-0001')
  assert.deepEqual(doc.supplier.addressLines, [
    'Plot 12 Industrial Layout',
    'Ikeja, Lagos',
  ])

  // Recipient alias strictly points to supplier party for template compatibility
  assert.equal(doc.recipient, doc.supplier)
})

test('preparePurchaseOrderDocument: fallback supplier name when po snapshot is empty', () => {
  const po = createSamplePO({ supplier_name: '' })
  const options = {
    supplier: {
      name: 'Fallback Supplier Ltd',
      contact_person: 'Jane Doe',
    },
  }

  const doc = preparePurchaseOrderDocument(po, options)
  assert.equal(doc.supplier.name, 'Fallback Supplier Ltd')
  assert.equal(doc.recipient.name, 'Fallback Supplier Ltd')
})

test('preparePurchaseOrderDocument: procurement line items mapping and unit_cost preservation', () => {
  const po = createSamplePO({
    items: [
      {
        ...createEmptyPurchaseOrderItem(0),
        id: 'item-1',
        description: 'Hardcore filling',
        quantity: 5,
        unit: 'trips',
        unit_cost: 35000,
        line_total: 175000,
      },
      {
        ...createEmptyPurchaseOrderItem(1),
        id: 'item-2',
        description: 'Compaction labour',
        quantity: 2,
        unit: 'days',
        unit_cost: 15000,
        line_total: 30000,
      },
    ],
  })

  const doc = preparePurchaseOrderDocument(po)

  assert.equal(doc.items.length, 2)

  const [item1, item2] = doc.items

  // Item 1
  assert.equal(item1.id, 'item-1')
  assert.equal(item1.rowType, 'line')
  assert.equal(item1.groupId, null)
  assert.equal(item1.groupLabel, null)
  assert.equal(item1.description, 'Hardcore filling')
  assert.equal(item1.quantity, 5)
  assert.equal(item1.unit, 'trips')
  assert.equal(item1.unitCost, 35000)
  assert.equal(item1.unitPrice, undefined)
  assert.equal(item1.amount, 175000)

  // Item 2
  assert.equal(item2.id, 'item-2')
  assert.equal(item2.unitCost, 15000)
  assert.equal(item2.unitPrice, undefined)
  assert.equal(item2.amount, 30000)

  // Standard columns definition
  assert.deepEqual(doc.columns, STANDARD_PURCHASE_ORDER_COLUMNS)
})

test('preparePurchaseOrderDocument: preserves authoritative totals, VAT, discount, and extra charges', () => {
  const po = createSamplePO({
    subtotal: 200000,
    discount: 10000,
    extra_charges: [
      { label: 'Freight', value: 15000, withTax: true },
      { label: 'Offloading', value: 5000, withTax: false },
    ],
    vat: 15375,
    total: 220375,
  })

  const doc = preparePurchaseOrderDocument(po)

  assert.equal(doc.totals.mode, 'standard')
  assert.equal(doc.totals.balanceDue, null)
  assert.equal(doc.totals.advanceSummary, null)

  const rows = doc.totals.rows
  assert.equal(rows.length, 6)

  assert.deepEqual(rows[0], {
    key: 'subtotal',
    label: 'Procurement Subtotal',
    amount: 200000,
  })

  assert.deepEqual(rows[1], {
    key: 'discount',
    label: 'PO Discount',
    amount: -10000,
    tone: 'muted',
  })

  assert.deepEqual(rows[2], {
    key: 'charge-freight',
    label: 'Freight',
    amount: 15000,
  })

  assert.deepEqual(rows[3], {
    key: 'charge-offloading',
    label: 'Offloading',
    amount: 5000,
  })

  assert.deepEqual(rows[4], {
    key: 'vat',
    label: 'VAT (7.5%)',
    amount: 15375,
  })

  assert.deepEqual(rows[5], {
    key: 'total',
    label: 'Total Order Amount',
    amount: 220375,
    emphasis: true,
    tone: 'primary',
  })

  // Amount in words
  assert.ok(typeof doc.totals.amountInWords === 'string')
  assert.ok(doc.totals.amountInWords.length > 0)
})

test('preparePurchaseOrderDocument: strict absence of bank details and WHT on outgoing PO', () => {
  const po = createSamplePO()
  const options = {
    settings: {
      company_name: 'Bourxe Contracting Nigeria Ltd',
      company_address: '10 Marina Street',
      company_city: 'Lagos Island',
      company_state: 'Lagos',
      // Even if company has bank details configured in settings, they MUST NOT appear on PO
      bank_name: 'First Bank Nigeria',
      account_number: '0123456789',
    },
  }

  const doc = preparePurchaseOrderDocument(po, options)

  // Bank details MUST be strictly null
  assert.equal(doc.bankDetails, null)

  // No WHT row in totals
  const whtRow = doc.totals.rows.find((r) => r.key === 'wht' || /wht/i.test(r.label))
  assert.equal(whtRow, undefined)
})

test('preparePurchaseOrderDocument: preserves notes and terms as HTML and stripped plainText', () => {
  const po = createSamplePO({
    notes: '<p>Deliver to site warehouse by <strong>8:00 AM</strong>.</p>',
    terms: '<div>All items subject to quality inspection upon delivery.</div>',
  })

  const doc = preparePurchaseOrderDocument(po)

  assert.notEqual(doc.notes, null)
  assert.equal(doc.notes.title, 'Notes')
  assert.equal(doc.notes.content, '<p>Deliver to site warehouse by <strong>8:00 AM</strong>.</p>')
  assert.equal(doc.notes.plainText, 'Deliver to site warehouse by 8:00 AM.')
  assert.equal(doc.notes.format, 'html')

  assert.notEqual(doc.terms, null)
  assert.equal(doc.terms.title, 'Terms and Conditions')
  assert.equal(doc.terms.content, '<div>All items subject to quality inspection upon delivery.</div>')
  assert.equal(doc.terms.plainText, 'All items subject to quality inspection upon delivery.')
  assert.equal(doc.terms.format, 'html')
})

test('preparePurchaseOrderDocument: delivery destination and procurement signatories mapping', () => {
  const po = createSamplePO()
  const options = {
    delivery: {
      site: 'Dangote Refinery Lekki Project Site',
      contactPerson: 'Engr. Tunde Adeleke',
      phone: '+234 802 111 2233',
      addressLines: ['Km 20 Lekki-Epe Expressway', 'Ibeju-Lekki, Lagos'],
      notes: 'Heavy trucks enter through North Gate.',
    },
    signatories: {
      requisitioner: {
        name: 'Amina Bello',
        title: 'Site Procurement Officer',
        signatureUrl: 'https://example.com/sig-amina.png',
        signedAt: '2026-11-08',
      },
      authorizer: {
        name: 'Chief Obinna Okonkwo',
        title: 'Project Managing Director',
        signatureUrl: 'https://example.com/sig-obinna.png',
        signedAt: '2026-11-08',
      },
    },
  }

  const doc = preparePurchaseOrderDocument(po, options)

  // Delivery destination
  assert.notEqual(doc.deliveryDestination, null)
  assert.equal(doc.deliveryDestination.site, 'Dangote Refinery Lekki Project Site')
  assert.equal(doc.deliveryDestination.contactPerson, 'Engr. Tunde Adeleke')

  // Dual procurement signatories
  assert.notEqual(doc.procurementSignatories, null)
  assert.equal(doc.procurementSignatories.requisitioner.name, 'Amina Bello')
  assert.equal(doc.procurementSignatories.authorizer.name, 'Chief Obinna Okonkwo')

  // Generic signature MUST be strictly null on PO to prevent client acceptance misattribution
  assert.equal(doc.signature, null)
})

test('preparePurchaseOrderDocument: accepts wrapped input envelope { purchaseOrder, options }', () => {
  const po = createSamplePO()
  const doc = preparePurchaseOrderDocument({
    purchaseOrder: po,
    options: {
      title: 'LOCAL PURCHASE ORDER (LPO)',
    },
  })

  assert.equal(doc.identity.title, 'LOCAL PURCHASE ORDER (LPO)')
  assert.equal(doc.identity.number, 'PO-2026-0001')
})

test('preparePurchaseOrderDocument: is a pure function that never mutates input', () => {
  const po = createSamplePO()
  const originalJson = JSON.stringify(po)

  preparePurchaseOrderDocument(po)

  assert.equal(JSON.stringify(po), originalJson)
})

test('validatePreparedPurchaseOrderDocument: validates contract rules', () => {
  const po = createSamplePO()
  const validDoc = preparePurchaseOrderDocument(po)

  const result = validatePreparedPurchaseOrderDocument(validDoc)
  assert.equal(result.valid, true)
  assert.equal(result.errors.length, 0)

  // Invalid: missing number
  const noNumberDoc = { ...validDoc, identity: { ...validDoc.identity, number: '' } }
  assert.equal(validatePreparedPurchaseOrderDocument(noNumberDoc).valid, false)

  // Invalid: missing supplier
  const noSupplierDoc = { ...validDoc, supplier: { name: '' }, recipient: { name: '' } }
  assert.equal(validatePreparedPurchaseOrderDocument(noSupplierDoc).valid, false)

  // Invalid: empty items
  const noItemsDoc = { ...validDoc, items: [] }
  assert.equal(validatePreparedPurchaseOrderDocument(noItemsDoc).valid, false)

  // Invalid: non-null bankDetails
  const withBankDoc = { ...validDoc, bankDetails: { bankName: 'Forbidden Bank' } }
  assert.equal(validatePreparedPurchaseOrderDocument(withBankDoc).valid, false)

  // Invalid: non-null balanceDue
  const withBalanceDoc = { ...validDoc, totals: { ...validDoc.totals, balanceDue: 50000 } }
  assert.equal(validatePreparedPurchaseOrderDocument(withBalanceDoc).valid, false)

  // Invalid: non-null generic signature (must be null to prevent client acceptance misattribution)
  const withSignatureDoc = { ...validDoc, signature: { name: 'Unauthorized Customer Signature' } }
  assert.equal(validatePreparedPurchaseOrderDocument(withSignatureDoc).valid, false)

  // Invalid: item carries generic unitPrice (procurement cost must not be aliased to sales price)
  const withUnitPriceDoc = {
    ...validDoc,
    items: [{ ...validDoc.items[0], unitPrice: 7500 }],
  }
  assert.equal(validatePreparedPurchaseOrderDocument(withUnitPriceDoc).valid, false)
})

test('preparePurchaseOrderDocument: procurement cost is strictly preserved in unitCost and never populates unitPrice', () => {
  const po = createSamplePO({
    items: [
      {
        ...createEmptyPurchaseOrderItem(0),
        id: 'poi-diesel',
        description: 'Automotive Gas Oil (AGO / Diesel)',
        quantity: 1000,
        unit: 'litres',
        unit_cost: 1250,
        line_total: 1250000,
      },
      {
        ...createEmptyPurchaseOrderItem(1),
        id: 'poi-drums',
        description: 'Storage Drums 200L',
        quantity: 5,
        unit: 'units',
        unit_cost: 18000,
        line_total: 90000,
      },
    ],
  })

  const doc = preparePurchaseOrderDocument(po)

  for (const item of doc.items) {
    // Authoritative procurement cost must be present
    assert.ok(typeof item.unitCost === 'number' && item.unitCost > 0)
    // Generic sales price must be strictly undefined / not populated
    assert.equal(item.unitPrice, undefined)
    // Mathematical consistency: amount matches quantity x unitCost
    assert.equal(item.amount, item.quantity * item.unitCost)
  }
})

test('preparePurchaseOrderDocument: dual procurement authorization remains strictly distinct and never maps to doc.signature', () => {
  const po = createSamplePO()
  const requisitioner = {
    name: 'Engr. Fatima Garba',
    title: 'Site Mechanical Engineer',
    signatureUrl: 'https://example.com/sig-fatima.png',
    signedAt: '2026-11-08T10:00:00Z',
  }
  const authorizer = {
    name: 'Alhaji Ibrahim Danladi',
    title: 'Procurement Director',
    signatureUrl: 'https://example.com/sig-ibrahim.png',
    signedAt: '2026-11-08T14:30:00Z',
  }

  const doc = preparePurchaseOrderDocument(po, {
    signatories: { requisitioner, authorizer },
  })

  // 1. Internal procurement signatories are preserved and distinct
  assert.equal(doc.procurementSignatories.requisitioner.name, 'Engr. Fatima Garba')
  assert.equal(doc.procurementSignatories.requisitioner.title, 'Site Mechanical Engineer')
  assert.equal(doc.procurementSignatories.authorizer.name, 'Alhaji Ibrahim Danladi')
  assert.equal(doc.procurementSignatories.authorizer.title, 'Procurement Director')
  assert.notEqual(doc.procurementSignatories.requisitioner, doc.procurementSignatories.authorizer)

  // 2. Generic doc.signature remains strictly null
  assert.equal(doc.signature, null)

  // 3. Document passes contract validation with dual signatories and null doc.signature
  const validation = validatePreparedPurchaseOrderDocument(doc)
  assert.equal(validation.valid, true)
})
