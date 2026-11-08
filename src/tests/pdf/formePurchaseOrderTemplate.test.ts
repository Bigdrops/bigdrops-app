import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { IndustryFormeDocument } from '../../components/pdf/forme/IndustryFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import {
  preparePurchaseOrderDocument,
  validatePreparedPurchaseOrderDocument,
  type PreparedPurchaseOrderDocument,
} from '../../domain/pdf/resolver/commercial'
import { createEmptyPurchaseOrder, createEmptyPurchaseOrderItem } from '../../domain/purchase-order/types'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import { generatePurchaseOrderPdfBlob } from '../../components/pdf'
import { resolvePdfcnDocument } from '../../components/pdf/pdfcn'
import { registerCommercialPdfcnTemplates } from '../../components/pdf/pdfcn/commercial'

function createSamplePO(overrides: Record<string, any> = {}) {
  const po = createEmptyPurchaseOrder({
    id: 'po-101',
    po_number: 'PO-2026-0089',
    po_date: '2026-11-08',
    supplier_id: 'supp-77',
    supplier_name: 'Meridian Industrial Wholesale Ltd',
    currency: 'NGN',
    subtotal: 10260000,
    discount: 260000,
    vat: 750000,
    extra_charges: [
      { label: 'Inbound freight to site', value: 250000, withTax: true },
    ],
    total: 11000000,
    calculation_inputs: {
      vatPercent: 7.5,
      discountType: 'fixed',
      discountTiming: 'before_tax',
      discountValue: 260000,
    },
    notes: '<p>Deliver directly to Gate 2 security post.</p>',
    terms: '<p>Supplier payment terms: Net 30 days upon inspection.</p>',
    ...overrides,
  })

  po.items = overrides.items ?? [
    {
      ...createEmptyPurchaseOrderItem(0),
      id: 'poi-1',
      description: 'Portland Cement Grade 42.5N',
      quantity: 1200,
      unit: 'bags',
      unit_cost: 8550,
      line_total: 10260000,
    },
  ]

  return po
}

test('IndustryFormeDocument: renders canonical Purchase Order with procurement semantics', async () => {
  const po = createSamplePO()
  const requisitioner = {
    name: 'Mr. Chukwuemeka Daniels',
    title: 'Purchasing Officer',
    signatureUrl: null,
  }
  const authorizer = {
    name: 'Mrs. Folashade Adeyemi',
    title: 'Finance Director',
    signatureUrl: null,
  }
  const delivery = {
    label: 'Delivery Destination',
    site: 'Northgate Foods Factory — Phase 2',
    addressLines: ['Km 18, Lagos-Ibadan Expressway', 'Mowe, Ogun State'],
    contactPerson: 'Mr. Ifeanyi Eze',
    phone: '+234 800 555 0120',
    notes: 'Mon-Fri 08:00-16:00 receiving window',
  }

  const preparedPo = preparePurchaseOrderDocument(po, {
    signatories: { requisitioner, authorizer },
    delivery,
    settings: {
      company_name: 'BOURXE Procurement Ltd',
      company_address: '14 Commercial Avenue',
      company_city: 'Yaba',
      company_state: 'Lagos',
      company_email: 'procurement@bourxe.example',
      company_phone: '+234 1 234 5678',
    },
  })

  assert.equal(validatePreparedPurchaseOrderDocument(preparedPo).valid, true)

  const adapted = adaptCommercialDocumentData(preparedPo)

  // 1. Adaptation invariants
  assert.equal(adapted.documentKind, 'purchase_order')
  assert.equal(adapted.isProcurement, true)
  assert.equal(adapted.title, 'PURCHASE ORDER')
  assert.equal(adapted.documentNumber, 'PO-2026-0089')
  assert.equal(adapted.documentNumberLabel, 'PO Number')
  assert.equal(adapted.issueDateLabel, 'PO Date')
  assert.equal(adapted.issueDate, '2026-11-08')
  assert.equal(adapted.dueDateOrValidityDate, null)
  assert.equal(adapted.poNumber, null, 'poNumber is omitted to avoid duplicate PO Number label')
  assert.equal(adapted.showBankDetails, false)
  assert.equal(adapted.paymentDetails, null)
  assert.equal(adapted.signature, null)
  assert.ok(adapted.deliveryDestination)
  assert.ok(adapted.procurementSignatories)

  // 2. Render & Serialize IndustryFormeDocument
  const element = React.createElement(IndustryFormeDocument, { data: adapted })
  const serialized = await serialize(element)
  const xml = typeof serialized === 'string' ? serialized : JSON.stringify(serialized)

  // Document identity
  assert.match(xml, /PURCHASE ORDER/)
  assert.match(xml, /PO-2026-0089/)
  assert.match(xml, /PO Date/)
  assert.doesNotMatch(xml, /Due Date/)
  assert.doesNotMatch(xml, /Valid Until/)

  // Party counterparty: Supplier, not client
  assert.match(xml, /Meridian Industrial Wholesale Ltd/)
  assert.match(xml, /Order From · Supplier/)

  // Table columns: Unit Cost, not Unit Price
  assert.match(xml, /Unit Cost/)
  assert.doesNotMatch(xml, /Unit Price/)

  // Line item contents
  assert.match(xml, /Portland Cement Grade 42\.5N/)
  assert.match(xml, /1200/)
  assert.match(xml, /bags/)
  assert.match(xml, /8,550/)

  // Bank details strictly absent
  assert.doesNotMatch(xml, /Bank Details/)
  assert.doesNotMatch(xml, /Account Number/)
  assert.doesNotMatch(xml, /Sort Code/)

  // Delivery destination rendered
  assert.match(xml, /Delivery Destination/)
  assert.match(xml, /Northgate Foods Factory — Phase 2/)
  assert.match(xml, /Mr\. Ifeanyi Eze/)

  // Procurement authorization rendered
  assert.match(xml, /Mr\. Chukwuemeka Daniels/)
  assert.match(xml, /Purchasing Officer/)
  assert.match(xml, /Mrs\. Folashade Adeyemi/)
  assert.match(xml, /Finance Director/)

  // No client acceptance or customer acknowledgement
  assert.doesNotMatch(xml, /Client Acceptance/)
  assert.doesNotMatch(xml, /Client Receiving Acknowledgement/)
  assert.doesNotMatch(xml, /Client Executive Acknowledgment/)
})

test('Master Deterministic Resolver resolves Purchase Order for industry and industry-forme', () => {
  registerCommercialPdfcnTemplates()

  const po = createSamplePO()
  const preparedPo = preparePurchaseOrderDocument(po)

  const resolution = resolvePdfcnDocument({
    documentType: 'purchase_order',
    templateId: 'industry',
    rawDocument: preparedPo,
  })

  assert.equal(resolution.success, true, 'Resolution for industry purchase_order must succeed')
  assert.ok(resolution.envelope, 'Envelope must be returned')
  assert.equal(resolution.envelope?.documentType, 'purchase_order')
  assert.equal(resolution.envelope?.templateId, 'industry')
  assert.ok(resolution.element, 'React element must be created')

  const formeResolution = resolvePdfcnDocument({
    documentType: 'purchase_order',
    templateId: 'industry-forme',
    rawDocument: preparedPo,
  })

  assert.equal(formeResolution.success, true, 'Resolution for industry-forme purchase_order must succeed')
  assert.equal(formeResolution.envelope?.templateId, 'industry-forme')
})

test('generatePurchaseOrderPdfBlob creates valid PDF bytes with approved fonts', async () => {
  await ensureFormeFontFamily('Inter')

  const po = createSamplePO()
  const preparedPo = preparePurchaseOrderDocument(po)

  const result = await generatePurchaseOrderPdfBlob({
    model: preparedPo,
    templateId: 'industry',
  })

  assert.ok(result.blob, 'Blob must be created')
  assert.ok(result.blob.size > 1000, 'Blob size must be non-trivial PDF bytes')
  assert.equal(result.filename, 'PO-2026-0089.pdf')

  // Verify PDF header magic bytes %PDF-
  const buffer = await result.blob.arrayBuffer()
  const header = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)))
  assert.equal(header, '%PDF-')
})

test('Regression: Invoice and Quotation rendering through IndustryFormeDocument remain unchanged', async () => {
  const invoiceModel = {
    identity: {
      id: 'inv-1',
      kind: 'invoice' as const,
      number: 'INV-2026-0001',
      title: 'Invoice',
      issueDate: '2026-11-01',
      dueDate: '2026-11-15',
      poNumber: 'CLIENT-PO-44',
      status: 'issued',
      currency: 'NGN',
    },
    issuer: {
      name: 'BOURXE Engineering Ltd',
      addressLines: ['Plot 14 Victoria Island', 'Lagos'],
    },
    recipient: {
      name: 'Dangote Industries Ltd',
      addressLines: ['1 Alfred Rewane Road', 'Ikoyi, Lagos'],
    },
    items: [
      {
        id: 'item-1',
        description: 'Industrial Inverter 15kVA',
        quantity: 1,
        unit: 'unit',
        unitPrice: 2500000,
        amount: 2500000,
        cells: {
          description: 'Industrial Inverter 15kVA',
          quantity: 1,
          unit_price: 2500000,
          amount: 2500000,
        },
      },
    ],
    columns: [
      { key: 'description', label: 'Description', kind: 'builtin' as const, align: 'left' as const },
      { key: 'quantity', label: 'Qty', kind: 'builtin' as const, align: 'center' as const },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin' as const, align: 'right' as const },
      { key: 'amount', label: 'Amount', kind: 'builtin' as const, align: 'right' as const },
    ],
    totals: {
      rows: [
        { label: 'Subtotal', amount: 2500000 },
        { label: 'Total Due', amount: 2500000, emphasis: true },
      ],
    },
    bankDetails: {
      bankName: 'Access Bank Plc',
      accountName: 'BOURXE Engineering Ltd',
      accountNumber: '0123456789',
      sortCode: '044150149',
    },
  }

  const adapted = adaptCommercialDocumentData(invoiceModel as any)
  assert.equal(adapted.documentKind, 'invoice')
  assert.equal(adapted.isProcurement, false)
  assert.equal(adapted.title, 'INVOICE')
  assert.equal(adapted.documentNumberLabel, 'Invoice Number')
  assert.equal(adapted.dueDateOrValidityDateLabel, 'Due Date')
  assert.equal(adapted.poNumber, 'CLIENT-PO-44')
  assert.equal(adapted.showBankDetails, true)
  assert.ok(adapted.paymentDetails)

  const element = React.createElement(IndustryFormeDocument, { data: adapted })
  const serialized = await serialize(element)
  const xml = typeof serialized === 'string' ? serialized : JSON.stringify(serialized)

  assert.match(xml, /INVOICE/)
  assert.match(xml, /INV-2026-0001/)
  assert.match(xml, /Due Date/)
  assert.match(xml, /CLIENT-PO-44/)
  assert.match(xml, /To/)
  assert.match(xml, /Dangote Industries Ltd/)
  assert.match(xml, /Unit Price/)
  assert.match(xml, /Bank Details/)
  assert.match(xml, /Access Bank Plc/)
  assert.match(xml, /0123456789/)
})


import { IndustrialFormeDocument } from '../../components/pdf/forme/IndustrialFormeDocument'
import { EvergreenFormeDocument } from '../../components/pdf/forme/EvergreenFormeDocument'
import { ArchitecturalFormeDocument } from '../../components/pdf/forme/ArchitecturalFormeDocument'
import { ExecutiveFormeDocument } from '../../components/pdf/forme/ExecutiveFormeDocument'
import { HeritageHouseFormeDocument } from '../../components/pdf/forme/HeritageHouseFormeDocument'
import { LandscapeFormeDocument } from '../../components/pdf/forme/LandscapeFormeDocument'
import { MinimalFormeDocument } from '../../components/pdf/forme/MinimalFormeDocument'

test('All 7 remaining Commercial Forme Templates render Purchase Orders with procurement semantics', async () => {
  const po = createSamplePO()
  const requisitioner = {
    name: 'Mr. Chukwuemeka Daniels',
    title: 'Purchasing Officer',
    signatureUrl: null,
  }
  const authorizer = {
    name: 'Mrs. Folashade Adeyemi',
    title: 'Finance Director',
    signatureUrl: null,
  }
  const delivery = {
    label: 'Delivery Destination',
    site: 'Northgate Foods Factory — Phase 2',
    addressLines: ['Km 18, Lagos-Ibadan Expressway', 'Mowe, Ogun State'],
    contactPerson: 'Mr. Ifeanyi Eze',
    phone: '+234 800 555 0120',
  }

  const preparedPo = preparePurchaseOrderDocument(po, {
    signatories: { requisitioner, authorizer },
    delivery,
    settings: {
      company_name: 'BOURXE Procurement Ltd',
      company_address: '14 Commercial Avenue',
      company_city: 'Yaba',
      company_state: 'Lagos',
      company_email: 'procurement@bourxe.example',
      company_phone: '+234 1 234 5678',
    },
  })

  const adapted = adaptCommercialDocumentData(preparedPo)

  const templates = [
    { name: 'Industrial', comp: IndustrialFormeDocument },
    { name: 'Evergreen', comp: EvergreenFormeDocument },
    { name: 'Architectural', comp: ArchitecturalFormeDocument },
    { name: 'Executive', comp: ExecutiveFormeDocument },
    { name: 'HeritageHouse', comp: HeritageHouseFormeDocument },
    { name: 'Landscape', comp: LandscapeFormeDocument },
    { name: 'Minimal', comp: MinimalFormeDocument },
  ]

  for (const { name, comp } of templates) {
    const element = React.createElement(comp, { data: adapted })
    const serialized = await serialize(element)
    const xml = typeof serialized === 'string' ? serialized : JSON.stringify(serialized)

    // Verify PO identity
    assert.match(xml, /PO-2026-0089/, `${name} must include PO number`)
    assert.match(xml, /Meridian Industrial Wholesale Ltd/, `${name} must include supplier name`)
    assert.match(xml, /Portland Cement Grade 42\.5N/, `${name} must include item description`)

    // Verify delivery destination
    assert.match(xml, /Northgate Foods Factory/, `${name} must include delivery site`)

    // Verify procurement signatories
    assert.match(xml, /Mr\. Chukwuemeka Daniels/, `${name} must include requisitioner`)
    assert.match(xml, /Mrs\. Folashade Adeyemi/, `${name} must include authorizer`)

    // Verify no customer acceptance
    assert.doesNotMatch(xml, /Client Acceptance/, `${name} must not include Client Acceptance`)
    assert.doesNotMatch(xml, /Client Receiving Acknowledgement/, `${name} must not include Client Receiving`)
    assert.doesNotMatch(xml, /Client Executive Acknowledgment/, `${name} must not include Client Executive`)
  }
})


test('preparePurchaseOrderDocument: automatically extracts embedded delivery and signatories from PO entity', () => {
  const po = createSamplePO({
    deliveryDestination: {
      site: 'Abuja Regional Depot',
      contactPerson: 'Malam Garba',
    },
    procurementSignatories: {
      requisitioner: { name: 'Aliyu Bello', title: 'Procurement Specialist' },
      authorizer: { name: 'Zainab Ahmed', title: 'COO' },
    },
    supplier_snapshot: {
      address: 'Industrial Layout, Idu, Abuja',
    },
  })

  const prepared = preparePurchaseOrderDocument(po)
  assert.equal(prepared.deliveryDestination?.site, 'Abuja Regional Depot')
  assert.equal(prepared.deliveryDestination?.contactPerson, 'Malam Garba')
  assert.equal(prepared.procurementSignatories?.requisitioner?.name, 'Aliyu Bello')
  assert.equal(prepared.procurementSignatories?.authorizer?.name, 'Zainab Ahmed')
  assert.ok(prepared.supplier.addressLines?.includes('Industrial Layout, Idu, Abuja'))
})
