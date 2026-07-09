import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
  ResolvedPdfCustomization,
} from './types'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'

export const CSR_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: false,
  documentFont: false,
  handwritingFont: true,
  handwritingColor: true,
}

export const CSR_POLICY: PdfCustomizationPolicy = {
  accentColor: false,
  documentFont: false,
  handwritingFont: true,
  handwritingColor: true,
}

export const CSR_STATIC_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#0f172a',
  documentFont: 'Inter',
  handwritingFont: 'Inter',
  handwritingColor: '#3b82f6',
}

export function bridgeToDesignPreset(
  base: PdfDesignPreset,
  customization: ResolvedPdfCustomization,
): PdfDesignPreset {
  return {
    ...base,
    useCustomColors: true,
    useCustomFonts: true,
    headerFont: customization.documentFont as PdfDesignPreset['headerFont'],
    bodyFont: customization.documentFont as PdfDesignPreset['bodyFont'],
    fillableFont: customization.handwritingFont as PdfDesignPreset['fillableFont'],
    fillableFontMode: 'custom',
    fillableColor: customization.handwritingColor,
  }
}
