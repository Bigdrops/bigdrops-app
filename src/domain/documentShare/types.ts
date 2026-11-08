export type DocumentShareRecord = {
  id: string
  token: string
  document_type: string
  document_id: string
  document_number: string
  document_title?: string | null
  pdf_path: string
  pdf_url: string
  created_at: string
  updated_at?: string | null
  expires_at?: string | null
  is_revoked: boolean
  created_by?: string | null
  tenant_id?: string | null
  metadata: DocumentShareMetadata
}

export type DocumentShareMetadata = {
  issuerName?: string
  issuerEmail?: string
  issuerLogoUrl?: string
  recipientName?: string
  recipientEmail?: string
  issueDate?: string
  dueDate?: string
  validUntil?: string
  totalFormatted?: string
  currency?: string
  fileName: string
  notes?: string
}

export type DocumentSharePayload = {
  documentType: string
  documentId: string
  documentNumber: string
  documentTitle?: string
  recipientName?: string
  recipientEmail?: string
  issuerName?: string
  issuerEmail?: string
  issuerLogoUrl?: string
  totalFormatted?: string
  issueDate?: string
  dueDate?: string
  validUntil?: string
  notes?: string
  fileName: string
  tenantId?: string
  getPdfBlob: () => Promise<Blob>
}

export type ShareChannel = 'link' | 'whatsapp' | 'email'

export type ShareActionResult = {
  success: boolean
  method: 'native' | 'web-share-file' | 'clipboard' | 'unsupported-desktop' | 'mailto-fallback' | 'resend-edge' | 'error'
  error?: string
  prefilledText?: string
  mailtoUrl?: string
  messageId?: string
  operationId?: string
  ambiguous?: boolean
}
