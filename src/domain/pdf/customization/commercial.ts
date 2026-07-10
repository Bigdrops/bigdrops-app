/**
 * PDF Customization Engine — Commercial Domain Metadata
 *
 * Declares Invoice/Quotation capabilities, policy, and template defaults
 * for the shared PDF Customization Engine.
 *
 * Commercial supports 2 customization sockets:
 * - Accent Colour
 * - Document Font
 *
 * Commercial does NOT support Handwriting Font or Handwriting Colour.
 */

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfCustomizationDocumentFamily,
  PdfCustomizationSettings,
  PdfTemplateDefaults,
  ResolvedPdfCustomization,
} from './types'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { getDefaultPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { resolveFull } from './resolver'

const STORAGE_PREFIX = 'bigdrops_pdf_customization_'

function loadEngineSettings(family: PdfCustomizationDocumentFamily): PdfCustomizationSettings | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${family}`)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.version === 1) return parsed
  } catch { /* corrupt — ignore */ }
  return undefined
}

export const COMMERCIAL_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: true,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

export const COMMERCIAL_POLICY: PdfCustomizationPolicy = {
  accentColor: true,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

/** Commercial template defaults — sourced from existing invoice/quotation presets. */
export const COMMERCIAL_TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#14b8a6',
  documentFont: 'Inter',
  handwritingFont: 'Inter',
  handwritingColor: '#0f172a',
}

/**
 * Bridge: ResolvedPdfCustomization → PdfDesignPreset.
 *
 * The shared engine resolves 2 fields (accentColor, documentFont).
 * Commercial PDF templates consume the full PdfDesignPreset. This function
 * maps engine output onto the existing preset shape so templates render identically.
 *
 * Non-customization fields (textColor, borderColor, etc.) are preserved
 * from the base preset unchanged.
 */
export function bridgeToCommercialDesignPreset(
  base: PdfDesignPreset,
  customization: ResolvedPdfCustomization,
): PdfDesignPreset {
  return {
    ...base,
    useCustomColors: true,
    useCustomFonts: true,
    accentColor: customization.accentColor,
    headerFont: customization.documentFont as PdfDesignPreset['headerFont'],
    bodyFont: customization.documentFont as PdfDesignPreset['bodyFont'],
  }
}

/**
 * Resolve document family for Commercial documents.
 *
 * Invoice and Quotation share the same 'commercial' customization family.
 * If both are provided, invoice takes precedence (they use the same engine).
 */
export function resolveCommercialDocumentFamily(
  documentType?: PdfCustomizationDocumentFamily,
): PdfCustomizationDocumentFamily {
  if (documentType === 'quotation') return 'quotation'
  return 'invoice'
}

/**
 * Standalone resolver: reads engine localStorage → bridges to PdfDesignPreset.
 *
 * Use this in PDF download actions (invoicePdfActions, pdfDownloadHandler)
 * where the React hook is not available. Falls back to the legacy preset
 * shape when the engine has no saved settings.
 */
export function resolveCommercialDesignPreset(
  documentType: PdfCustomizationDocumentFamily,
): PdfDesignPreset {
  const base = getDefaultPdfDesignPreset(documentType === 'quotation' ? 'quotation' : 'invoice')
  const engineSettings = loadEngineSettings(documentType)
  if (!engineSettings) return base
  const { customization } = resolveFull(
    COMMERCIAL_TEMPLATE_DEFAULTS,
    COMMERCIAL_CAPABILITIES,
    COMMERCIAL_POLICY,
    engineSettings,
  )
  return bridgeToCommercialDesignPreset(base, customization)
}
