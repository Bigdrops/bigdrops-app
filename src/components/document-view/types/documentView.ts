export type DocumentStatus =
  | 'open'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'converted'
  | 'archived'
  | 'void'
  | (string & {})

export interface PaymentSummary {
  paidAmount: number
  outstandingAmount: number
  paymentCount: number
  lastPaymentDate?: string | null
}

export interface AdvanceSummary {
  enabled: boolean
  requestedAmount: number
  remainingAmount: number
  label?: string
}

export interface BaseDocument {
  id: string
  number: string
  title: string
  status: DocumentStatus
}
