export type PdfTemplateId = 'proforma' | 'bold' | 'compact' | 'quotation'

export const PDF_TEMPLATES = [
  { id: 'proforma' as PdfTemplateId, label: 'Proforma', description: 'Green · Centered' },
  { id: 'bold' as PdfTemplateId, label: 'Bold', description: 'Dark band · Strong' },
  { id: 'compact' as PdfTemplateId, label: 'Compact', description: 'Tight · Dense' },
  { id: 'quotation' as PdfTemplateId, label: 'Standard', description: 'Clean · Formal' },
]

export const DEFAULT_TEMPLATE: PdfTemplateId = 'proforma'
