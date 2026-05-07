export interface InvoicePrefill {
  invoice_number: string
  client_id: string | null
  client_name: string
  project_id: string | null
  status: string
  issue_date: string
  due_date: string | null
  [key: string]: any
}

export interface DuplicateInvoicePrefill {
  prefill: InvoicePrefill
  prefillItems: any[]
}

export interface InvoiceListItem {
  id: string
  invoice_number: string | null
  client_name: string | null
  status: string | null
  total: number | null
  issue_date: string | null
  due_date: string | null
}

export interface InvoiceDetail {
  id: string
  invoice_number: string | null
  client_id: string | null
  client_name: string | null
  project_id: string | null
  status: string | null
  total: number | null
  subtotal: number | null
  vat: number | null
  wht: number | null
  discount: number | null
  notes: string | null
  terms: string | null
  issue_date: string | null
  due_date: string | null
  [key: string]: any
}