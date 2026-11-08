import type {
  PdfColumnDefinition,
  PdfLineItem,
  PdfLogo,
  PdfPageLayout,
  PdfParty,
  PdfSignature,
  PdfTextSection,
  PdfTotalRow,
  PdfTotals,
} from '@/components/pdf/types'
import type {
  PurchaseOrder,
  PurchaseOrderExtraCharge,
  PurchaseOrderItem,
} from '@/domain/purchase-order/types'
import { numberToWords } from '@/lib/formatters/money'
import type { PdfcnValidationResult } from '../types'
import type {
  PreparePurchaseOrderOptions,
  PreparedPurchaseOrderDocument,
  PurchaseOrderDeliveryDestination,
  PurchaseOrderProcurementSignatories,
  SupplierSnapshotInput,
} from './purchaseOrderPreparedContract'

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function safeNullableStr(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s.length > 0 ? s : null
}

function stripHtml(html: string): string {
  if (!html) return ''
  if (typeof document !== 'undefined') {
    try {
      return new DOMParser().parseFromString(html, 'text/html').body.textContent || ''
    } catch {
      // Fall through to regex if DOMParser fails
    }
  }
  return html.replace(/<[^>]*>/g, '').trim()
}

function sanitizeKey(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item'
}

export const DEFAULT_PURCHASE_ORDER_PAGE_LAYOUT: PdfPageLayout = {
  size: 'A4',
  orientation: 'portrait',
}

export const STANDARD_PURCHASE_ORDER_COLUMNS: PdfColumnDefinition[] = [
  { key: 'description', label: 'Item & Description', kind: 'builtin', align: 'left', pdfFlex: 4 },
  { key: 'unit', label: 'Unit', kind: 'builtin', align: 'center', pdfFlex: 1 },
  { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'right', pdfFlex: 1 },
  { key: 'unitCost', label: 'Unit Cost', kind: 'builtin', align: 'right', pdfFlex: 2 },
  { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfFlex: 2 },
]

function buildCompanyParty(settings?: Record<string, unknown> | null): PdfParty {
  const addressLines = [
    safeNullableStr(settings?.company_address),
    [safeNullableStr(settings?.company_city), safeNullableStr(settings?.company_state)]
      .filter(Boolean)
      .join(', '),
  ].filter(Boolean) as string[]

  const customInfo: Array<{ label: string; value: string }> = []
  if (Array.isArray(settings?.custom_info)) {
    for (const item of settings.custom_info) {
      if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
        const lbl = safeStr((item as { label: unknown }).label)
        const val = safeStr((item as { value: unknown }).value)
        if (lbl && val) customInfo.push({ label: lbl, value: val })
      }
    }
  }

  return {
    label: 'From (Issuer)',
    name: safeStr(settings?.company_name),
    taxId: safeNullableStr(settings?.company_tax_id || settings?.company_tin),
    attention: safeNullableStr(settings?.company_contact_person || settings?.company_attention),
    email: safeNullableStr(settings?.company_email),
    phone: safeNullableStr(settings?.company_phone),
    addressLines,
    website: safeNullableStr(settings?.company_website),
    customInfo,
  }
}

function buildSupplierParty(
  poSupplierName: string,
  supplierSnapshot?: SupplierSnapshotInput | null,
): PdfParty {
  // poSupplierName is the frozen snapshot written at PO creation; it is authoritative
  const name = safeStr(poSupplierName) || safeStr(supplierSnapshot?.name)
  const addressLines = [
    safeNullableStr(supplierSnapshot?.address),
    [safeNullableStr(supplierSnapshot?.city), safeNullableStr(supplierSnapshot?.state)]
      .filter(Boolean)
      .join(', '),
  ].filter(Boolean) as string[]

  return {
    label: 'Order From · Supplier / Vendor',
    name,
    taxId: safeNullableStr(supplierSnapshot?.tax_id || supplierSnapshot?.tin),
    attention: safeNullableStr(supplierSnapshot?.contact_person || supplierSnapshot?.attention),
    email: safeNullableStr(supplierSnapshot?.email),
    phone: safeNullableStr(supplierSnapshot?.phone),
    addressLines,
    customInfo: [],
  }
}

function buildLineItems(items?: PurchaseOrderItem[]): PdfLineItem[] {
  if (!Array.isArray(items) || items.length === 0) return []
  return items.map((item, index) => {
    const quantity = item.quantity === null || item.quantity === undefined ? null : Number(item.quantity)
    const unitCost = item.unit_cost === null || item.unit_cost === undefined ? null : Number(item.unit_cost)
    const lineTotal =
      item.line_total === null || item.line_total === undefined
        ? quantity !== null && unitCost !== null
          ? quantity * unitCost
          : null
        : Number(item.line_total)

    return {
      id: safeStr(item.id || item._uiKey || `po-item-${index + 1}`),
      rowType: 'line' as const,
      groupId: null,
      groupLabel: null,
      description: safeStr(item.description),
      subDescription: null,
      make: null,
      quantity,
      unit: safeStr(item.unit),
      unitCost,
      // Note: unitPrice is deliberately omitted in canonical PO preparation.
      // Procurement cost must not be silently aliased to sales price.
      // Any presentation-only mapping for legacy renderers belongs strictly in M10 adapters.
      amount: lineTotal,
      imageUrl: null,
      customData: {},
      cells: {
        description: safeStr(item.description),
        unit: safeStr(item.unit),
        quantity,
        unitCost,
        amount: lineTotal,
      },
    }
  })
}

function buildTotals(po: PurchaseOrder): PdfTotals {
  const rows: PdfTotalRow[] = [
    {
      key: 'subtotal',
      label: 'Procurement Subtotal',
      amount: Number(po.subtotal || 0),
    },
  ]

  const discountVal = Number(po.discount || 0)
  if (discountVal > 0) {
    rows.push({
      key: 'discount',
      label: 'PO Discount',
      amount: -discountVal,
      tone: 'muted',
    })
  }

  if (Array.isArray(po.extra_charges)) {
    po.extra_charges.forEach((charge: PurchaseOrderExtraCharge) => {
      const chargeVal = Number(charge?.value || 0)
      if (charge && chargeVal > 0) {
        const label = safeStr(charge.label) || 'Additional Charge'
        rows.push({
          key: `charge-${sanitizeKey(label)}`,
          label,
          amount: chargeVal,
        })
      }
    })
  }

  const vatVal = Number(po.vat || 0)
  if (vatVal > 0) {
    const vatPct = po.calculation_inputs?.vatPercent ? ` (${po.calculation_inputs.vatPercent}%)` : ''
    rows.push({
      key: 'vat',
      label: `VAT${vatPct}`,
      amount: vatVal,
    })
  }

  rows.push({
    key: 'total',
    label: 'Total Order Amount',
    amount: Number(po.total || 0),
    emphasis: true,
    tone: 'primary',
  })

  return {
    mode: 'standard',
    rows,
    amountInWords: numberToWords(Number(po.total || 0)),
    balanceDue: null,
    advanceSummary: null,
  }
}

export type PreparePurchaseOrderInput =
  | PurchaseOrder
  | {
      purchaseOrder: PurchaseOrder
      options?: PreparePurchaseOrderOptions
    }

/**
 * Pure canonical preparation function for Supplier Purchase Orders.
 *
 * Transforms the authoritative PurchaseOrder domain entity and related snapshots
 * into a stable, renderer-neutral PreparedPurchaseOrderDocument conforming to
 * PurchaseOrderPdfModel.
 *
 * Business Invariants:
 * - Counterparty is Supplier/Vendor; po.supplier_name snapshot is authoritative.
 * - Outgoing document: bankDetails is strictly null.
 * - Procurement line items: unit_cost is preserved and rowType is flat 'line'.
 * - Financial math: preserves stored domain totals; WHT is omitted; balanceDue is null.
 * - Pure function: never mutates input arguments.
 */
export function preparePurchaseOrderDocument(
  input: PreparePurchaseOrderInput,
  explicitOptions?: PreparePurchaseOrderOptions,
): PreparedPurchaseOrderDocument {
  const isWrapped = Boolean(input && typeof input === 'object' && 'purchaseOrder' in input)
  const po: PurchaseOrder = isWrapped
    ? (input as { purchaseOrder: PurchaseOrder }).purchaseOrder
    : (input as PurchaseOrder)
  const wrappedOptions = isWrapped
    ? (input as { options?: PreparePurchaseOrderOptions }).options
    : undefined
  const options = explicitOptions ?? wrappedOptions ?? {}

  const companyParty = buildCompanyParty(options.settings)
  const supplierParty = buildSupplierParty(
    po.supplier_name,
    options.supplier ?? (po as any).supplier_snapshot ?? (po as any).supplier,
  )
  const items = buildLineItems(po.items)
  const totals = buildTotals(po)

  const notes: PdfTextSection | null = safeStr(po.notes)
    ? {
        title: 'Notes',
        content: po.notes,
        plainText: stripHtml(po.notes),
        format: 'html',
      }
    : null

  const terms: PdfTextSection | null = safeStr(po.terms)
    ? {
        title: 'Terms and Conditions',
        content: po.terms,
        plainText: stripHtml(po.terms),
        format: 'html',
      }
    : null

  const logo: PdfLogo | null = safeNullableStr(options.settings?.company_logo_url)
    ? {
        imageUrl: safeStr(options.settings?.company_logo_url),
        altText: safeStr(options.settings?.company_name || 'Company Logo'),
      }
    : null

  return {
    identity: {
      id: safeStr(po.id),
      kind: 'purchase_order',
      number: safeStr(po.po_number),
      title: safeStr(options.title) || 'PURCHASE ORDER',
      issueDate: safeNullableStr(po.po_date),
      dueDate: null,
      validUntil: null,
      poNumber: safeNullableStr(po.po_number),
      status: safeNullableStr(po.status),
      currency: safeStr(po.currency) || 'NGN',
    },
    issuer: companyParty,
    company: companyParty,
    recipient: supplierParty,
    supplier: supplierParty,
    deliveryDestination: options.delivery ?? (po as any).deliveryDestination ?? (po as any).delivery ?? (po as any).custom_fields?.delivery ?? null,
    procurementSignatories: options.signatories ?? (po as any).procurementSignatories ?? (po as any).signatories ?? (po as any).custom_fields?.signatories ?? null,
    items,
    columns: STANDARD_PURCHASE_ORDER_COLUMNS,
    pageLayout: options.pageLayout ?? DEFAULT_PURCHASE_ORDER_PAGE_LAYOUT,
    mergeQtyUnit: options.mergeQtyUnit ?? true,
    hideEmptyGroups: true,
    totals,
    bankDetails: null,
    notes,
    terms,
    // Note: signature is strictly null on PO documents.
    // Internal authorizers and requisitioners live in procurementSignatories,
    // preventing commercial templates from rendering authorizer as client/customer acceptance.
    signature: null,
    logo,
    footerText: safeNullableStr(options.settings?.pdf_footer_text),
    template: options.templateId ? { name: options.templateId } : null,
  }
}

/**
 * Validates a canonical PreparedPurchaseOrderDocument before rendering.
 */
export function validatePreparedPurchaseOrderDocument(
  doc: PreparedPurchaseOrderDocument,
): PdfcnValidationResult {
  const errors: string[] = []

  if (!doc.identity || doc.identity.kind !== 'purchase_order') {
    errors.push("Document identity kind must be 'purchase_order'")
  }
  if (!doc.identity?.number) {
    errors.push('Purchase order number is required')
  }
  if (!doc.supplier?.name) {
    errors.push('Supplier name snapshot is required')
  }
  if (!Array.isArray(doc.items) || doc.items.length === 0) {
    errors.push('At least one purchase order item is required')
  }
  if (doc.bankDetails !== null) {
    errors.push('Bank details must be null on purchase order')
  }
  if (doc.signature !== null && doc.signature !== undefined) {
    errors.push('Generic signature must be null on purchase order to prevent client acceptance misattribution')
  }
  if (doc.totals?.balanceDue !== null && doc.totals?.balanceDue !== undefined) {
    errors.push('Balance due must be null on purchase order')
  }
  if (doc.totals?.advanceSummary !== null && doc.totals?.advanceSummary !== undefined) {
    errors.push('Advance summary must be null on purchase order')
  }
  if (Array.isArray(doc.items)) {
    const hasUnitPrice = doc.items.some((item) => item.unitPrice !== undefined && item.unitPrice !== null)
    if (hasUnitPrice) {
      errors.push('Line items must not populate generic unitPrice on purchase order; use unitCost')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
