export type CitCategory = 'small' | 'medium' | 'large' | 'exempt'
export type WhtReceiptStatus = 'pending' | 'requested' | 'received' | 'verified'

export interface TaxSettings {
  id: string
  settings_id: number
  tin: string | null
  vat_enabled: boolean
  vat_threshold: number
  threshold_basis: string | null
  cit_category: CitCategory | string | null
  year_end_month: number | null
  year_end_day: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WhtReceipt {
  id: string
  payment_id: string
  invoice_id: string | null
  client_name: string | null
  gross_base_amount: number | null
  wht_rate: number | null
  wht_amount: number | null
  receipt_status: WhtReceiptStatus
  receipt_number: string | null
  receipt_file_url: string | null
  received_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
