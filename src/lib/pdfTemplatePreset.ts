import {
  DEFAULT_INVOICE_TEMPLATE,
  DEFAULT_QUOTATION_TEMPLATE,
  PDF_TEMPLATES,
  type PdfTemplateId,
} from '@/components/pdf/pdfTemplates'

const TEMPLATE_PRESET_KEYS = {
  invoice: 'invoice_pdf_template_preset',
  quotation: 'quotation_pdf_template_preset',
} as const

type PdfTemplatePresetDocument = keyof typeof TEMPLATE_PRESET_KEYS

const VALID_TEMPLATE_IDS = new Set<PdfTemplateId>(PDF_TEMPLATES.map((template) => template.id))

const LEGACY_TEMPLATE_MAP: Record<string, PdfTemplateId> = {
  proforma: 'classic',
  compact: 'minimal',
  professional: 'elegant',
  bold: 'bold',
  quotation: 'quotation',
  classic: 'classic',
  minimal: 'minimal',
  modern: 'modern',
  elegant: 'elegant',
}

function isPdfTemplateId(value: string): value is PdfTemplateId {
  return VALID_TEMPLATE_IDS.has(value as PdfTemplateId)
}

function getDocumentFallback(documentType: PdfTemplatePresetDocument): PdfTemplateId {
  return documentType === 'invoice' ? DEFAULT_INVOICE_TEMPLATE : DEFAULT_QUOTATION_TEMPLATE
}

function normalizeTemplateId(
  value: string | null,
  documentType: PdfTemplatePresetDocument,
  fallback: PdfTemplateId,
): PdfTemplateId {
  if (!value) return fallback
  const mapped = LEGACY_TEMPLATE_MAP[value] || value
  if (!isPdfTemplateId(mapped)) return fallback
  if (documentType === 'invoice' && mapped === 'quotation') return DEFAULT_INVOICE_TEMPLATE
  return mapped
}

export function getPdfTemplatePreset(
  documentType: PdfTemplatePresetDocument,
  fallback: PdfTemplateId = getDocumentFallback(documentType),
): PdfTemplateId {
  if (typeof window === 'undefined') return fallback

  try {
    const storedValue = window.localStorage.getItem(TEMPLATE_PRESET_KEYS[documentType])
    return normalizeTemplateId(storedValue, documentType, fallback)
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
