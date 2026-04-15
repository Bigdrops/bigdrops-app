export type PdfTemplateId = 'minimal' | 'elegant'

export const PDF_TEMPLATES = [
  { id: 'minimal' as const, label: 'Minimal', description: 'Airy · Clean' },
  { id: 'elegant' as const, label: 'Elegant', description: 'Warm beige · Premium' },
] satisfies Array<{ id: PdfTemplateId; label: string; description: string }>

export const INVOICE_PDF_TEMPLATES = PDF_TEMPLATES
export const QUOTATION_PDF_TEMPLATES = PDF_TEMPLATES

export const DEFAULT_TEMPLATE: PdfTemplateId = 'minimal'
export const DEFAULT_INVOICE_TEMPLATE: PdfTemplateId = 'minimal'
export const DEFAULT_QUOTATION_TEMPLATE: PdfTemplateId = 'minimal'

export function getPdfTemplatesForDocument(documentType: 'invoice' | 'quotation') {
  return documentType === 'invoice' ? INVOICE_PDF_TEMPLATES : QUOTATION_PDF_TEMPLATES
}
