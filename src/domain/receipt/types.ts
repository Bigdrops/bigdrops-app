export interface ReceiptRow {
  id: string
  receipt_number: string
  payment_id: string
  invoice_id: string
  client_id: string

  // Payment snapshot
  payment_amount: number
  payment_date: string
  payment_method: string | null
  payment_reference: string | null
  payment_notes: string | null
  cash_amount: number
  wht_amount: number
  currency_code: string
  wht_rate: number | null
  wht_type: string | null

  // Invoice snapshot
  invoice_number: string
  invoice_total: number | null
  invoice_subtotal: number | null
  invoice_vat: number | null
  invoice_wht: number | null
  invoice_discount: number | null
  invoice_notes: string | null
  invoice_terms: string | null
  invoice_po_number: string | null

  // Client snapshot
  client_name: string
  client_address: string | null
  client_city: string | null
  client_state: string | null
  client_phone: string | null
  client_email: string | null

  // Project snapshot
  project_name: string | null
  project_code: string | null

  // Company snapshot
  company_name: string
  company_address: string | null
  company_email: string | null
  company_phone: string | null
  company_logo_url: string | null

  // Bank snapshot
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null

  // Signatory snapshot
  signatory_name: string | null
  signatory_role: string | null
  signatory_signature_url: string | null

  // Lifecycle
  status: 'active' | 'voided'
  voided_at: string | null
  void_reason: string | null

  // Audit
  created_by: string | null
  created_at: string
}
