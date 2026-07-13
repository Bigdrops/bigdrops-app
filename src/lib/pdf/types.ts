export type PdfDocumentType = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'boq' | 'rfq' | 'receipt'

export type PdfDeliveryMode = 'download' | 'save' | 'open' | 'save-open' | 'share' | 'print'

export type PdfDeliveryResult = {
  success: boolean
  uri?: string
  path?: string
  platform?: 'web' | 'ios' | 'android'
  method: PdfDeliveryMode
  error?: string
}

export type PdfFeedbackEventKind =
  | 'created'
  | 'viewed'
  | 'downloaded'
  | 'shared'
  | 'printed'
  | 'saved'
  | 'failed'

export type PdfFeedbackEvent = {
  kind: PdfFeedbackEventKind
  documentType: PdfDocumentType
  timestamp: number
  fileName?: string
  error?: string
}
