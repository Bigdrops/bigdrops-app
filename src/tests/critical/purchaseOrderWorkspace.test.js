import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  INVOICE_DESCRIPTOR,
  PURCHASE_ORDER_DESCRIPTOR,
  QUOTATION_DESCRIPTOR,
  resolveDocumentDescriptor,
} from '../../components/document/documentDescriptor.ts'
import {
  PURCHASE_ORDER_FORM_COLUMNS,
  applyPurchaseOrderItemUpdate,
  applySharedHeaderUpdate,
  matchesPurchaseOrderQuery,
  purchaseOrderItemFromImport,
  toDomainDiscountTiming,
  toFormDiscountTiming,
  toPurchaseOrderFormItems,
  toSharedHeaderModel,
} from '../../domain/purchase-order/formAdapter.ts'
import { createEmptyPurchaseOrder } from '../../domain/purchase-order/types.ts'

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')

/* ------------------------------------------------------------------ */
/* Descriptor contract                                                */
/* ------------------------------------------------------------------ */

test('po workspace: the purchase order descriptor binds the supplier party', () => {
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.family, 'purchase_order')
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.title, 'Purchase Order')
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.numberLabel, 'PO No.')
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.issueDateLabel, 'PO Date')
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.party.term, 'Supplier')
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.party.idField, 'supplier_id')
  assert.equal(PURCHASE_ORDER_DESCRIPTOR.party.nameField, 'supplier_name')
})

test('po workspace: the purchase order hides every control without a backend column', () => {
  const hidden = PURCHASE_ORDER_DESCRIPTOR.hiddenSections
  for (const section of [
    'titleField',
    'clientPoNumberField',
    'dueDateField',
    'paymentStage',
    'whtSection',
    'additionalFieldsSection',
    'headerFieldsSection',
  ]) {
    assert.equal(hidden?.[section], true, `${section} must be hidden for purchase orders`)
  }
})

test('po workspace: invoice and quotation descriptors keep every section visible', () => {
  assert.equal(INVOICE_DESCRIPTOR.hiddenSections, undefined)
  assert.equal(QUOTATION_DESCRIPTOR.hiddenSections, undefined)
  // The retired binary still classifies the sales families identically.
  assert.equal(resolveDocumentDescriptor({ documentType: 'QUOTATION' }).family, 'quotation')
  assert.equal(resolveDocumentDescriptor({ title: 'New Invoice' }).family, 'invoice')
})

/* ------------------------------------------------------------------ */
/* Form adapter: header mapping                                       */
/* ------------------------------------------------------------------ */

function samplePo() {
  const po = createEmptyPurchaseOrder({
    supplier_id: 'supplier-1',
    po_number: 'PO-000007',
    po_date: '2026-10-15',
    notes: 'Deliver before Friday',
    terms: 'Net 30',
  })
  po.supplier_name = 'Frozen Name Ltd'
  po.calculation_inputs = { vatPercent: 7.5, discountType: 'fixed', discountTiming: 'before_tax', discountValue: 5000 }
  return po
}

test('po workspace: the shared header model aliases PO fields to form fields', () => {
  const header = toSharedHeaderModel(samplePo())

  assert.equal(header.invoice_number, 'PO-000007')
  assert.equal(header.issue_date, '2026-10-15')
  assert.equal(header.supplier_id, 'supplier-1')
  assert.equal(header.supplier_name, 'Frozen Name Ltd')
  // Rate inputs travel as the form's discount / vat fields. Computed
  // amounts never travel upward.
  assert.equal(header.discount, 5000)
  assert.equal(header.vat, 7.5)
  assert.equal(header.wht, 0)
  assert.equal(header.document_type, 'purchase_order')
  assert.equal('client_id' in header, false)
  assert.equal('unit_price' in header, false)
})

test('po workspace: header edits route back into PO state, the rest are refused', () => {
  const po = samplePo()

  assert.equal(applySharedHeaderUpdate(po, 'invoice_number', 'MANUAL-9')?.po_number, 'MANUAL-9')
  assert.equal(applySharedHeaderUpdate(po, 'issue_date', '2026-10-20')?.po_date, '2026-10-20')
  assert.equal(applySharedHeaderUpdate(po, 'supplier_id', 's-2')?.supplier_id, 's-2')
  assert.equal(applySharedHeaderUpdate(po, 'discount', 250)?.calculation_inputs.discountValue, 250)
  assert.equal(applySharedHeaderUpdate(po, 'vat', 5)?.calculation_inputs.vatPercent, 5)
  assert.equal(applySharedHeaderUpdate(po, 'notes', 'n')?.notes, 'n')
  assert.equal(applySharedHeaderUpdate(po, 'terms', 't')?.terms, 't')

  // No PO column exists for these: a silent drop beats a wrong write.
  for (const field of ['payment_terms', 'custom_payment_terms', 'wht', 'title', 'po_number', 'client_id', 'due_date']) {
    assert.equal(applySharedHeaderUpdate(po, field, 'x'), null, `${field} must not map anywhere`)
  }
})

test('po workspace: discount timing maps between form and domain vocabularies', () => {
  assert.equal(toFormDiscountTiming('before_tax'), 'before')
  assert.equal(toFormDiscountTiming('after_tax'), 'after')
  assert.equal(toDomainDiscountTiming('before'), 'before_tax')
  assert.equal(toDomainDiscountTiming('after'), 'after_tax')
})

/* ------------------------------------------------------------------ */
/* Form adapter: item mapping                                         */
/* ------------------------------------------------------------------ */

test('po workspace: form rows mirror unit_cost as unit_price without duplicating truth', () => {
  const po = samplePo()
  po.items = [
    { description: 'Cement', quantity: 20, unit: 'bag', unit_cost: 5000, line_total: 100000, sort_order: 0 },
  ]

  const [row] = toPurchaseOrderFormItems(po)
  assert.equal(row.unit_price, 5000)
  assert.equal(row.unit_cost, 5000)
  assert.equal(row.row_type, 'standard')
  assert.ok(row._uiKey)

  // Editing the mirrored field writes the procurement cost.
  const [updated] = applyPurchaseOrderItemUpdate(po.items, 0, 'unit_price', 5500)
  assert.equal(updated.unit_cost, 5500)
  assert.equal('unit_price' in updated, false)

  // A computed line amount is never an input.
  const [untouched] = applyPurchaseOrderItemUpdate(po.items, 0, 'line_total', 1)
  assert.equal(untouched.line_total, 100000)
})

test('po workspace: the line editor columns carry procurement wording', () => {
  const keys = PURCHASE_ORDER_FORM_COLUMNS.map((column) => column.key)
  assert.deepEqual(keys, ['description', 'quantity', 'unit', 'unit_price', 'amount'])
  assert.equal(
    PURCHASE_ORDER_FORM_COLUMNS.find((column) => column.key === 'unit_price')?.label,
    'Unit Cost',
  )
  for (const forbidden of ['install_rate', 'wht', 'selling_price']) {
    assert.equal(keys.includes(forbidden), false, `${forbidden} must not be a PO column`)
  }
})

test('po workspace: imported rows map sales-shaped prices onto procurement costs', () => {
  const item = purchaseOrderItemFromImport({ description: 'Sand', quantity: 2, unit: 'trip', unit_price: 25000 }, 0)
  assert.equal(item.description, 'Sand')
  assert.equal(item.quantity, 2)
  assert.equal(item.unit, 'trip')
  assert.equal(item.unit_cost, 25000)
  assert.equal('unit_price' in item, false)
})

test('po workspace: list search matches number and supplier snapshot only', () => {
  const po = samplePo()
  assert.equal(matchesPurchaseOrderQuery(po, ''), true)
  assert.equal(matchesPurchaseOrderQuery(po, 'PO-000007'), true)
  assert.equal(matchesPurchaseOrderQuery(po, 'frozen name'), true)
  assert.equal(matchesPurchaseOrderQuery(po, 'FROZEN'), true)
  assert.equal(matchesPurchaseOrderQuery(po, 'no-such-po'), false)
})

/* ------------------------------------------------------------------ */
/* Supplier selector adapter                                          */
/* ------------------------------------------------------------------ */

test('po workspace: the supplier party adapter speaks the neutral contract', () => {
  const source = read('src/components/supplier/SupplierPartySelector.tsx')
  assert.match(source, /PartySelectorSlotProps/)
  assert.match(source, /supplierId=\{partyId\}/)
  assert.match(source, /supplierName=\{partyName\}/)
  assert.match(source, /onSupplierChange=\{\(id, name\) => onPartyChange\(id, name\)\}/)
  assert.match(source, /hideHeader/)
  assert.match(source, /hideTrigger/)
  assert.match(source, /allowClear=\{false\}/)
  assert.equal(/clients|client_id|clientId/i.test(source), false)
})

/* ------------------------------------------------------------------ */
/* Shared-form generalizations stay backward compatible               */
/* ------------------------------------------------------------------ */

test('po workspace: hidden sections render conditionally with visible defaults', () => {
  const header = read('src/components/document/FormHeader.tsx')
  for (const flag of ['titleField', 'clientPoNumberField', 'dueDateField', 'headerFieldsSection']) {
    assert.match(header, new RegExp(`hiddenSections\\?\\.${flag}`), `FormHeader must gate ${flag}`)
  }

  const terms = read('src/components/document/FormCommercialTerms.tsx')
  for (const flag of ['paymentStage', 'whtSection', 'additionalFieldsSection']) {
    assert.match(terms, new RegExp(`hiddenSections\\?\\.${flag}`), `FormCommercialTerms must gate ${flag}`)
  }
  // The control count follows the visible set, so Invoice still reads 3.
  assert.match(terms, /visibleControlCount/)

  const notes = read('src/components/document/FormNotesTerms.tsx')
  assert.match(notes, /hideSignatorySection = false/)
  assert.match(notes, /hideReferenceLinksSection = false/)

  const lineItems = read('src/components/document/FormLineItems.tsx')
  assert.match(lineItems, /enableItemSuggestions \?\? ctx !== 'waybill'/)

  const shared = read('src/components/document/SharedDocumentForm.tsx')
  assert.match(shared, /hideSignatorySection/)
  assert.match(shared, /hideReferenceLinksSection/)
})

/* ------------------------------------------------------------------ */
/* Application wiring                                                 */
/* ------------------------------------------------------------------ */

test('po workspace: routes, navigation, icons, and cache keys exist', () => {
  const shell = read('src/components/app/AppShell.tsx')
  for (const route of ['/purchase-orders"', '/purchase-orders/new"', '/purchase-orders/edit/:id"', '/purchase-orders/:id"']) {
    assert.match(shell, new RegExp(route.replace(/[/:]/g, (c) => `\\${c}`)), `${route} must be registered`)
  }

  const nav = read('src/components/layout/navData.ts')
  assert.match(nav, /procurementPicker/)
  assert.match(nav, /purchase_orders: '\/purchase-orders'/)
  assert.match(nav, /pathname\.startsWith\('\/purchase-orders'\)/)

  const mobile = read('src/components/layout/MobileSidebar.tsx')
  assert.match(mobile, /procurementPicker/)

  const desktop = read('src/components/layout/DesktopSidebar.tsx')
  assert.match(desktop, /procurementPicker/)
  assert.match(desktop, /handleProcurementPick/)

  const icons = read('src/lib/iconRegistry.ts')
  assert.match(icons, /purchase_order:/)

  const cache = read('src/lib/cache/listCache.ts')
  assert.match(cache, /purchaseOrderListCacheKey/)

  const form = read('src/pages/PurchaseOrderFormPage.tsx')
  assert.match(form, /PURCHASE_ORDER_DESCRIPTOR/)
  assert.match(form, /partySelector=\{SupplierPartySelector\}/)
  assert.match(form, /enableItemSuggestions=\{false\}/)
  assert.match(form, /hideSignatorySection/)
  assert.match(form, /hideReferenceLinksSection/)
})

test('po workspace: audit history labels cover purchase orders', () => {
  const formatters = read('src/domain/audit/auditFormatters.ts')
  assert.match(formatters, /purchase_order: \{/)
  assert.match(formatters, /Created purchase order/)

  const types = read('src/domain/audit/auditTypes.ts')
  assert.match(types, /\| 'purchase_order'/)
})

/* ------------------------------------------------------------------ */
/* Isolation: no sales, accounting, inventory, or PDF coupling        */
/* ------------------------------------------------------------------ */

const PO_SOURCES = [
  'src/pages/PurchaseOrderFormPage.tsx',
  'src/pages/PurchaseOrders.tsx',
  'src/pages/PurchaseOrderDetail.tsx',
  'src/pages/NewPurchaseOrder.tsx',
  'src/pages/EditPurchaseOrder.tsx',
  'src/domain/purchase-order/formAdapter.ts',
  'src/components/supplier/SupplierPartySelector.tsx',
]

test('po workspace: pages never touch sales save handlers or the calculation engine directly', () => {
  for (const file of PO_SOURCES) {
    const source = read(file)
    for (const forbidden of [
      'useInvoiceSave',
      'useQuotationSave',
      'useDocumentSave',
      '@/lib/Calculations',
      'selling_price',
      'source_transaction',
      'journal',
      'inventory',
      'stock',
    ]) {
      assert.equal(source.includes(forbidden), false, `${file} must not reference ${forbidden}`)
    }
  }
  // Totals flow through the canonical PO adapter only.
  const form = read('src/pages/PurchaseOrderFormPage.tsx')
  assert.match(form, /computePurchaseOrderTotals/)
  assert.match(form, /savePurchaseOrder/)
})

test('po workspace: no PDF engine is introduced', () => {
  for (const file of PO_SOURCES) {
    const source = read(file)
    for (const forbidden of ['react-pdf', '@react-pdf', 'formepdf', 'FormePDF', 'generatePdf', 'PdfDocument']) {
      assert.equal(source.includes(forbidden), false, `${file} must not reference ${forbidden}`)
    }
  }
})

test('po workspace: lifecycle actions use the dedicated transition authority', () => {
  const detail = read('src/pages/PurchaseOrderDetail.tsx')
  assert.match(detail, /transitionPurchaseOrderStatus/)
  for (const action of ['Issue', 'Cancel', 'Close', 'Archive', 'Restore']) {
    assert.match(detail, new RegExp(action), `detail must offer ${action}`)
  }
  // Confirmations carry irreversible-transition consequences.
  assert.match(detail, /terminal/)
  assert.match(detail, /original status/)
  // Edit is a draft-only affordance; the form redirects anything else.
  assert.match(detail, /status === 'draft'/)
  const form = read('src/pages/PurchaseOrderFormPage.tsx')
  assert.match(form, /status !== 'draft'/)
  assert.match(form, /createEmptyPurchaseOrder\(\)/)
})
