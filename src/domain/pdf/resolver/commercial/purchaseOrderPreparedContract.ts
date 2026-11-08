import type {
  PdfBaseDocumentModel,
  PdfDocumentIdentity,
  PdfPageLayout,
  PdfParty,
  PurchaseOrderPdfModel,
} from '@/components/pdf/types'

/**
 * Supplier snapshot input interface for PDF document preparation.
 * Represents frozen supplier details captured at PO generation or passed via options.
 */
export interface SupplierSnapshotInput {
  name?: string | null
  contact_person?: string | null
  attention?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  tax_id?: string | null
  tin?: string | null
  notes?: string | null
}

/**
 * Delivery site / project destination information for procurement fulfillment.
 */
export interface PurchaseOrderDeliveryDestination {
  label?: string | null
  site?: string | null
  addressLines?: string[]
  contactPerson?: string | null
  phone?: string | null
  notes?: string | null
}

/**
 * Single internal procurement signatory (e.g. Purchasing Officer or Authorizer).
 */
export interface PurchaseOrderProcurementSignatory {
  label?: string | null
  name?: string | null
  title?: string | null
  signatureUrl?: string | null
  signedAt?: string | null
}

/**
 * Dual procurement authorization block (Requisitioner & Authorizer).
 */
export interface PurchaseOrderProcurementSignatories {
  requisitioner?: PurchaseOrderProcurementSignatory | null
  authorizer?: PurchaseOrderProcurementSignatory | null
}

/**
 * Options provided when preparing a Purchase Order for PDF rendering.
 */
export interface PreparePurchaseOrderOptions {
  /** Supplier details snapshot (complements the authoritative po.supplier_name) */
  supplier?: SupplierSnapshotInput | null
  /** Company tenant settings */
  settings?: Record<string, unknown> | null
  /** Delivery / shipping destination */
  delivery?: PurchaseOrderDeliveryDestination | null
  /** Dual procurement signatories */
  signatories?: PurchaseOrderProcurementSignatories | null
  /** Document title override (defaults to 'PURCHASE ORDER') */
  title?: string | null
  /** Orientation / layout (defaults to 'portrait') */
  pageLayout?: PdfPageLayout | null
  /** Merge quantity and unit columns */
  mergeQtyUnit?: boolean
  /** Template ID override (e.g. 'industry') */
  templateId?: string | null
}

/**
 * Canonical Prepared Supplier Purchase Order Document Model.
 *
 * Extends PurchaseOrderPdfModel (renderer-neutral commercial model) with
 * explicit procurement-specific properties while maintaining full compatibility
 * with existing Forme commercial templates.
 *
 * Invariants:
 * - identity.kind === 'purchase_order'
 * - supplier: authoritative PdfParty containing po.supplier_name
 * - recipient: alias pointing to supplier for renderer compatibility
 * - bankDetails: strictly null (issuer pays, not receives)
 * - balanceDue: strictly null (no sales balance)
 * - advanceSummary: strictly null
 * - signature: strictly null (internal authorization lives in procurementSignatories,
 *   never in the generic signature field which implies client acceptance)
 * - items: line items carry procurement cost in unitCost; unitPrice is NOT populated
 */
export interface PreparedPurchaseOrderDocument extends PurchaseOrderPdfModel {
  /** Issuing company party (alias for issuer) */
  company?: PdfParty | null
  /** Authoritative supplier party (procurement counterparty, alias for recipient) */
  supplier: PdfParty
  /** Optional procurement delivery site */
  deliveryDestination?: PurchaseOrderDeliveryDestination | null
  /** Authoritative dual procurement signatories (internal requisition and authorization) */
  procurementSignatories?: PurchaseOrderProcurementSignatories | null
  /** Generic signature is strictly null to prevent commercial templates from rendering authorizer as client acceptance */
  signature: null
}
