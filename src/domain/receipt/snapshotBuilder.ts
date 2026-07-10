import type { ReceiptRow } from './types'

type ReceiptSnapshot = Omit<ReceiptRow, 'id' | 'receipt_number' | 'status' | 'voided_at' | 'void_reason' | 'created_by' | 'created_at'>

interface InvoiceRow {
  invoice_number: string
  total: number | null
  subtotal: number | null
  vat: number | null
  wht: number | null
  discount: number | null
  notes: string | null
  terms: string | null
  po_number: string | null
  project_id: string | null
}

interface ClientRow {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
}

interface ProjectRow {
  name: string
  project_code: string | null
}

interface CompanySettings {
  company_name: string | null
  company_address: string | null
  company_email: string | null
  company_phone: string | null
  company_logo_url: string | null
}

interface BankAccountRow {
  bank_name: string | null
  account_number: string | null
  account_name: string | null
}

interface SignatoryRow {
  name: string
  role: string
  signature_url: string | null
}

interface PaymentRow {
  amount: number
  date: string
  method: string | null
  reference: string | null
  notes: string | null
  cash_amount: number | null
  wht_amount: number | null
  currency_code: string | null
  wht_rate: number | null
  wht_type: string | null
  bank_account_id: string | null
}

export interface ReceiptSnapshotInput {
  payment: PaymentRow
  invoice: InvoiceRow
  client: ClientRow
  project: ProjectRow | null
  company: CompanySettings
  bank: BankAccountRow | null
  signatory: SignatoryRow | null
}

export function buildReceiptSnapshot(input: ReceiptSnapshotInput): ReceiptSnapshot {
  const { payment, invoice, client, project, company, bank, signatory } = input

  return {
    payment_id: '',  // set by caller
    invoice_id: '',  // set by caller
    client_id: client.id,
    amount: payment.amount,

    // Payment snapshot
    payment_amount: payment.amount,
    payment_date: payment.date,
    payment_method: payment.method,
    payment_reference: payment.reference,
    payment_notes: payment.notes,
    cash_amount: payment.cash_amount ?? 0,
    wht_amount: payment.wht_amount ?? 0,
    currency_code: payment.currency_code ?? 'NGN',
    wht_rate: payment.wht_rate,
    wht_type: payment.wht_type,

    // Invoice snapshot
    invoice_number: invoice.invoice_number,
    invoice_total: invoice.total,
    invoice_subtotal: invoice.subtotal,
    invoice_vat: invoice.vat,
    invoice_wht: invoice.wht,
    invoice_discount: invoice.discount,
    invoice_notes: invoice.notes,
    invoice_terms: invoice.terms,
    invoice_po_number: invoice.po_number,

    // Client snapshot
    client_name: client.name,
    client_address: client.address,
    client_city: client.city,
    client_state: client.state,
    client_phone: client.phone,
    client_email: client.email,

    // Project snapshot
    project_name: project?.name ?? null,
    project_code: project?.project_code ?? null,

    // Company snapshot
    company_name: company.company_name ?? '',
    company_address: company.company_address,
    company_email: company.company_email,
    company_phone: company.company_phone,
    company_logo_url: company.company_logo_url,

    // Bank snapshot
    bank_name: bank?.bank_name ?? null,
    bank_account_number: bank?.account_number ?? null,
    bank_account_name: bank?.account_name ?? null,

    // Signatory snapshot
    signatory_name: signatory?.name ?? null,
    signatory_role: signatory?.role ?? null,
    signatory_signature_url: signatory?.signature_url ?? null,
  }
}
