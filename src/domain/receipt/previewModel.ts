import type { ReceiptRow } from './types'

export interface ReceiptPreviewModel {
  receiptNumber: string
  paymentDate: string
  paymentMethod: string
  paymentRef: string
  amount: number
  currencyCode: string
  clientName: string
  invoiceNumber: string
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  logoUrl: string | null
  notes: string | null
}

export function buildReceiptPreviewModel(
  receipt: ReceiptRow,
  invoiceNumber: string,
  settings: {
    company_name?: string | null
    company_address?: string | null
    company_phone?: string | null
    company_email?: string | null
    company_logo_url?: string | null
  },
): ReceiptPreviewModel {
  return {
    receiptNumber: receipt.receipt_number,
    paymentDate: receipt.payment_date,
    paymentMethod: receipt.payment_method || '—',
    paymentRef: receipt.payment_ref || '—',
    amount: receipt.amount,
    currencyCode: receipt.currency_code,
    clientName: receipt.client_name,
    invoiceNumber,
    companyName: settings.company_name || '',
    companyAddress: settings.company_address || '',
    companyPhone: settings.company_phone || '',
    companyEmail: settings.company_email || '',
    logoUrl: settings.company_logo_url || null,
    notes: receipt.notes,
  }
}
