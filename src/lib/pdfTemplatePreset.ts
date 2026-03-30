import { DEFAULT_TEMPLATE, PDF_TEMPLATES, type PdfTemplateId } from '@/components/pdf/pdfTemplates'

const TEMPLATE_PRESET_KEYS = {
  invoice: 'invoice_pdf_template_preset',
  quotation: 'quotation_pdf_template_preset',
} as const

type PdfTemplatePresetDocument = keyof typeof TEMPLATE_PRESET_KEYS

const VALID_TEMPLATE_IDS = new Set<PdfTemplateId>(PDF_TEMPLATES.map((template) => template.id))

function isPdfTemplateId(value: string): value is PdfTemplateId {
  return VALID_TEMPLATE_IDS.has(value as PdfTemplateId)
}

export function getPdfTemplatePreset(
  documentType: PdfTemplatePresetDocument,
  fallback: PdfTemplateId = DEFAULT_TEMPLATE,
): PdfTemplateId {
  if (typeof window === 'undefined') return fallback

  try {
    const storedValue = window.localStorage.getItem(TEMPLATE_PRESET_KEYS[documentType])
    return storedValue && isPdfTemplateId(storedValue) ? storedValue : fallback
  } catch {
    return fallback
  }
}

export function setPdfTemplatePreset(documentType: PdfTemplatePresetDocument, templateId: PdfTemplateId) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(TEMPLATE_PRESET_KEYS[documentType], templateId)
  } catch {
    // Ignore storage write failures and keep the in-memory selection.
  }
}
