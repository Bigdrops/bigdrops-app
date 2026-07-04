export type PaymentMethod = "Transfer" | "Cash" | "POS" | "Cheque" | "Other"

export interface InvoicePayment {
  id: string
  invoice_id: string
  cash_amount: number
  wht_amount: number
  wht_rate: number | null
  wht_type: string | null
  amount: number
  date: string
  method: string
  reference: string | null
  notes: string | null
  source: string
  bank_account_id: string | null
  created_at: string
  voided_at: string | null
}

export interface InvoiceFinancialsRow {
  id: string
  computed_status: string | null
  balance_due: number | null
  total_paid: number | null
}

export interface PaymentInput {
  invoice_id: string
  cash_amount: number
  wht_amount: number
  amount: number
  date: string
  method: PaymentMethod
  reference?: string
  notes?: string
  bank_account_id?: string | null
  wht_rate?: number | null
  wht_type?: string | null
}

export interface PaymentRecordResult {
  success: boolean
  paymentId?: string
  error?: string
}

export interface BankAccountSummary {
  id: string
  bank_name: string | null
  account_number: string | null
  is_default: boolean | null
}