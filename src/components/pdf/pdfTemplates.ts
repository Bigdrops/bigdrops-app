export type PdfTemplateId = 'standard' | 'classic' | 'minimal' | 'modern' | 'elegant' | 'bold'

export const PDF_TEMPLATES = [
  { id: 'standard' as const, label: 'Standard', description: 'Clean · Formal' },
  { id: 'classic' as const, label: 'Classic', description: 'Purple · Bordered' },
  { id: 'minimal' as const, label: 'Minimal', description: 'Airy · Clean' },
  { id: 'modern' as const, label: 'Modern', description: 'Purple header · White text' },
  { id: 'elegant' as const, label: 'Elegant', description: 'Warm beige · Premium' },
  { id: 'bold' as const, label: 'Bold', description: 'Dark header · Strong contrast' },
] satisfies Array<{ id: PdfTemplateId; label: string; description: string }>

export const INVOICE_PDF_TEMPLATES = PDF_TEMPLATES
export const QUOTATION_PDF_TEMPLATES = PDF_TEMPLATES

export const DEFAULT_TEMPLATE: PdfTemplateId = 'classic'
export const DEFAULT_INVOICE_TEMPLATE: PdfTemplateId = 'classic'
export const DEFAULT_QUOTATION_TEMPLATE: PdfTemplateId = 'standard'

export function getPdfTemplatesForDocument(documentType: 'invoice' | 'quotation') {
  return documentType === 'invoice' ? INVOICE_PDF_TEMPLATES : QUOTATION_PDF_TEMPLATES
}
