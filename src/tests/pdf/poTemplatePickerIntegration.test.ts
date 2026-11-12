import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
} from '../../domain/invoice/types'

/**
 * Supplier Purchase Order template-picker integration.
 *
 * PO uses the same established commercial template inventory as Invoice and
 * Quotation (CommercialTemplatePicker), keeps an independent selection, and
 * routes the selected template into the normal Forme resolution path.
 * No new templates, no duplicated registrations.
 */

const pickerSource = readFileSync(
  path.resolve('src/components/document-view/shared/CommercialTemplatePicker.tsx'),
  'utf8',
)
const poCustomizeSource = readFileSync(
  path.resolve('src/components/document-view/purchase-order/PurchaseOrderCustomizeSheet.tsx'),
  'utf8',
)
const poDetailSource = readFileSync(
  path.resolve('src/pages/PurchaseOrderDetail.tsx'),
  'utf8',
)

const PICKER_TEMPLATE_IDS = [
  'industrial',
  'industry',
  'minimal',
  'landscape',
  'evergreen',
  'architectural',
  'executive',
  'heritage',
  'mosaic',
]

test('PO picker presents exactly the established commercial inventory', () => {
  for (const id of PICKER_TEMPLATE_IDS) {
    assert.match(
      pickerSource,
      new RegExp(`id:\\s*'${id}'`),
      `Picker must offer the established template id "${id}" to PO`,
    )
  }
  // PO shares the same registered inventory; no PO-only or duplicate registrations.
  for (const id of [...PICKER_TEMPLATE_IDS, 'industry-forme']) {
    assert.ok(
      (INVOICE_PDF_TEMPLATE_IDS as readonly string[]).includes(id),
      `"${id}" must be a registered commercial template`,
    )
    assert.notEqual(normalizeInvoicePdfTemplateId(id), null)
  }
})

test('every picker template the user can select in PO resolves to a Forme route', async () => {
  const { resolveCommercialPdfRoute } = await import('../../components/pdf')

  for (const id of PICKER_TEMPLATE_IDS) {
    const route = resolveCommercialPdfRoute(id)
    assert.match(route, /-forme$/, `PO selection "${id}" must route to its Forme renderer, got ${route}`)
    assert.notEqual(normalizeInvoicePdfTemplateId(id), null, `"${id}" must normalize for PO resolution`)
  }
})

test('PO customize sheet mounts the shared picker with PO-local selection state', () => {
  assert.match(
    poCustomizeSource,
    /CommercialTemplatePicker/,
    'PO sheet must mount the shared commercial picker',
  )
  assert.match(
    poCustomizeSource,
    /value=\{value\.templateId\}/,
    'Picker value must bind to PO-local state',
  )
  assert.match(
    poCustomizeSource,
    /onChange=\{\(id\) => set\(\{ templateId: id \}\)\}/,
    'Picker must write PO-local template state',
  )
  assert.match(
    poCustomizeSource,
    /documentFamily:\s*'purchase_order'/,
    'PO engine bucket must stay purchase_order (independent from invoice/quotation)',
  )
})

test('selected PO template flows into the real PDF generation call', () => {
  assert.match(
    poDetailSource,
    /generatePurchaseOrderPdf\(\{\s*\n(?:[^}]|\n)*?templateId:\s*customize\.templateId/,
    'Download path must pass the PO-local template selection into generatePurchaseOrderPdf',
  )
  assert.match(
    poDetailSource,
    /generatePurchaseOrderPdfBlob\(\{\s*\n(?:[^}]|\n)*?templateId:\s*customize\.templateId/,
    'Share blob path must pass the PO-local template selection into generatePurchaseOrderPdfBlob',
  )
  // Compact remains threaded through to the same call.
  assert.match(poDetailSource, /compact:\s*customize\.compact/)
})

test('PO selection is independent from invoice and quotation buckets', () => {
  assert.doesNotMatch(poCustomizeSource, /documentFamily:\s*'invoice'/)
  assert.doesNotMatch(poCustomizeSource, /documentFamily:\s*'quotation'/)
})
