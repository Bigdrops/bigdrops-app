import type { ReceiptRow } from './types'

export interface ReceiptPreviewData {
  receiptNumber: string
  createdAt: string

  // Company
  companyName: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  companyLogoUrl: string | null

  // Client
  clientName: string
  clientAddress: string
  clientCity: string
  clientState: string
  clientPhone: string
  clientEmail: string

  // Payment
  paymentAmount: number
  paymentDate: string
  paymentMethod: string
  paymentReference: string
  cashAmount: number
  whtAmount: number
  currencyCode: string

  // Invoice
  invoiceNumber: string
  invoiceTotal: number
  invoiceSubtotal: number
  invoiceVat: number
  invoiceWht: number
  invoiceDiscount: number

  // Project (optional)
  projectName: string | null
  projectCode: string | null

  // Bank
  bankName: string
  bankAccountNumber: string
  bankAccountName: string

  // Signatory
  signatoryName: string
  signatoryRole: string
  signatorySignatureUrl: string | null

  // Status
  status: 'active' | 'voided'

  // Computed
  amountInWords: string
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertBelow1000(num: number): string {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convertBelow1000(num % 100) : '')
  }

  const kobo = Math.round((n - Math.floor(n)) * 100)
  const naira = Math.floor(n)
  let result = ''

  if (naira >= 1000000) {
    result += convertBelow1000(Math.floor(naira / 1000000)) + ' Million '
    naira % 1000000 === 0 ? null : null
  }
  if (naira >= 1000) {
    const thousands = Math.floor((naira % 1000000) / 1000)
    result += convertBelow1000(thousands) + ' Thousand '
  }
  if (naira % 1000 > 0) {
    result += convertBelow1000(naira % 1000)
  }

  result = result.trim() + ' Naira'
  if (kobo > 0) {
    result += ' and ' + convertBelow1000(kobo) + ' Kobo'
  }

  return result
}

export function buildReceiptPreviewData(receipt: ReceiptRow): ReceiptPreviewData {
  return {
    receiptNumber: receipt.receipt_number,
    createdAt: receipt.created_at,

    companyName: receipt.company_name ?? '',
    companyAddress: receipt.company_address ?? '',
    companyEmail: receipt.company_email ?? '',
    companyPhone: receipt.company_phone ?? '',
    companyLogoUrl: receipt.company_logo_url,

    clientName: receipt.client_name,
    clientAddress: receipt.client_address ?? '',
    clientCity: receipt.client_city ?? '',
    clientState: receipt.client_state ?? '',
    clientPhone: receipt.client_phone ?? '',
    clientEmail: receipt.client_email ?? '',

    paymentAmount: receipt.payment_amount,
    paymentDate: receipt.payment_date,
    paymentMethod: receipt.payment_method ?? '—',
    paymentReference: receipt.payment_reference ?? '—',
    cashAmount: receipt.cash_amount ?? 0,
    whtAmount: receipt.wht_amount ?? 0,
    currencyCode: receipt.currency_code ?? 'NGN',

    invoiceNumber: receipt.invoice_number,
    invoiceTotal: receipt.invoice_total ?? 0,
    invoiceSubtotal: receipt.invoice_subtotal ?? 0,
    invoiceVat: receipt.invoice_vat ?? 0,
    invoiceWht: receipt.invoice_wht ?? 0,
    invoiceDiscount: receipt.invoice_discount ?? 0,

    projectName: receipt.project_name,
    projectCode: receipt.project_code,

    bankName: receipt.bank_name ?? '',
    bankAccountNumber: receipt.bank_account_number ?? '',
    bankAccountName: receipt.bank_account_name ?? '',

    signatoryName: receipt.signatory_name ?? '',
    signatoryRole: receipt.signatory_role ?? '',
    signatorySignatureUrl: receipt.signatory_signature_url,

    status: receipt.status,

    amountInWords: numberToWords(receipt.payment_amount),
  }
}
