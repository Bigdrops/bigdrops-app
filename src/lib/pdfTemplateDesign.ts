import { TEMPLATE_TOKENS } from '@/components/pdf/templates/templateTokens'
import type { PdfTemplateId } from '@/components/pdf/pdfTemplates'
import {
  getDefaultPdfDesignPreset,
  sanitizePdfDesignPreset,
  type PdfDesignPreset,
  type PdfDesignPresetDocument,
} from '@/lib/pdfDesignPreset'

type SupportedTemplateDocument = Extract<PdfDesignPresetDocument, 'invoice' | 'quotation'>

function getTemplateAccent(template: PdfTemplateId) {
  return TEMPLATE_TOKENS[template].accent
}

export function getTemplateDefaultDesignPreset(
  documentType: SupportedTemplateDocument,
  template: PdfTemplateId,
): PdfDesignPreset {
  const fallback = getDefaultPdfDesignPreset(documentType)

  return {
    ...fallback,
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: getTemplateAccent(template),
  }
}

export function resolveTemplateDesignPreset(
  documentType: SupportedTemplateDocument,
  template: PdfTemplateId,
  preset: Partial<PdfDesignPreset> | null | undefined,
): PdfDesignPreset {
  const basePreset = getTemplateDefaultDesignPreset(documentType, template)
  const sanitizedPreset = sanitizePdfDesignPreset(preset, documentType)

  return {
    ...basePreset,
    ...sanitizedPreset,
    accentColor: sanitizedPreset.useCustomColors ? sanitizedPreset.accentColor : basePreset.accentColor,
    headerFont: sanitizedPreset.useCustomFonts ? sanitizedPreset.headerFont : basePreset.headerFont,
    bodyFont: sanitizedPreset.useCustomFonts ? sanitizedPreset.bodyFont : basePreset.bodyFont,
  }
}
