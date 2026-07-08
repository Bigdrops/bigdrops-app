export interface ReceiptRow {
  id: string
  receipt_number: string
  payment_id: string
  invoice_id: string
  client_id: string
  client_name: string
  amount: number
  currency_code: string
  payment_date: string
  payment_method: string | null
  payment_ref: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}
