import { getAdvanceConfig } from './advanceConfig'

type InvoiceListLike = {
  custom_fields?: unknown
} | null | undefined

export const ADVANCE_INVOICE_EXCLUSION_FILTER =
  'custom_fields.is.null,custom_fields.not.ilike.%"role":"advance"%'

export function isAdvanceInvoice(invoice: InvoiceListLike) {
  return getAdvanceConfig(invoice?.custom_fields)?.role === 'advance'
}

export function shouldIncludeInvoiceInList(invoice: InvoiceListLike) {
  if (!invoice || !Object.prototype.hasOwnProperty.call(invoice, 'custom_fields')) {
    return true
  }

  return !isAdvanceInvoice(invoice)
}
