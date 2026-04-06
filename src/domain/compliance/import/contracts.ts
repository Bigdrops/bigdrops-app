import { TaxFilingStatus, TaxFilingTaxType, WhtReceiptStatus } from '../types'

export type ComplianceRecordType = 'vat_input' | 'tax_filing' | 'wht_receipt'

export interface ComplianceImportContract {
  type: ComplianceRecordType
  label: string
  prompt: string
  jsonSchema: string
  requiredFields: string[]
}

export const COMPLIANCE_IMPORT_CONTRACTS: Record<ComplianceRecordType, ComplianceImportContract> = {
  vat_input: {
    type: 'vat_input',
    label: 'VAT Input',
    prompt: `Act as a tax data extractor. Return a SINGLE JSON object only. No markdown fences. No prose.
Fields:
- date: YYYY-MM-DD
- vendor_name: string
- category: string
- reference: string
- net_amount: number
- vat_amount: number
- is_recoverable: boolean
- notes: string`,
    jsonSchema: `{
  "date": "YYYY-MM-DD",
  "vendor_name": "",
  "category": "",
  "reference": "",
  "net_amount": 0,
  "vat_amount": 0,
  "is_recoverable": true,
  "notes": ""
}`,
    requiredFields: ['date', 'vendor_name', 'net_amount', 'vat_amount']
  },
  tax_filing: {
    type: 'tax_filing',
    label: 'Tax Filing',
    prompt: `Act as a tax filing data extractor. Return a SINGLE JSON object only. No markdown fences. No prose.
Fields:
- tax_type: "vat" | "wht" | "cit"
- period_start: YYYY-MM-DD
- period_end: YYYY-MM-DD
- amount_due: number
- amount_paid: number
- status: "draft" | "ready" | "filed" | "paid" | "overdue"
- submitted_at: YYYY-MM-DD (optional)
- receipt_reference: string (optional)
- portal_reference: string (optional)
- notes: string (optional)`,
    jsonSchema: `{
  "tax_type": "vat",
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "amount_due": 0,
  "amount_paid": 0,
  "status": "draft",
  "submitted_at": "",
  "receipt_reference": "",
  "portal_reference": "",
  "notes": ""
}`,
    requiredFields: ['tax_type', 'period_start', 'period_end', 'amount_due', 'status']
  },
  wht_receipt: {
    type: 'wht_receipt',
    label: 'WHT Receipt',
    prompt: `Act as a WHT receipt data extractor. Return a SINGLE JSON object only. No markdown fences. No prose.
Fields:
- client_name: string
- receipt_number: string
- issue_date: YYYY-MM-DD
- invoice_reference: string
- payment_reference: string
- gross_base_amount: number
- wht_rate: number
- wht_amount: number
- receipt_status: "pending" | "requested" | "received" | "verified"
- notes: string`,
    jsonSchema: `{
  "client_name": "",
  "receipt_number": "",
  "issue_date": "YYYY-MM-DD",
  "invoice_reference": "",
  "payment_reference": "",
  "gross_base_amount": 0,
  "wht_rate": 0,
  "wht_amount": 0,
  "receipt_status": "received",
  "notes": ""
}`,
    requiredFields: ['client_name', 'wht_amount']
  }
}
