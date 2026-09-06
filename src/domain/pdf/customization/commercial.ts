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
import type { PdfDesignPreset, PdfDesignPresetDocument } from '@/lib/pdfDesignPreset'
import { getPdfDesignPreset, hasSavedPdfDesignPreset, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { resolveFull } from './resolver'

const STORAGE_PREFIX = 'bigdrops_pdf_customization_'

/**
 * Load the engine's saved settings for a document family.
 * Used by consumers that need to know whether engine values exist
 * before merging them onto the persisted design preset.
 */
export function loadEngineSettings(family: PdfCustomizationDocumentFamily): PdfCustomizationSettings | undefined {
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
 * The base preset's explicit toggle state (useCustomColors / useCustomFonts)
 * is preserved: an explicitly saved OFF must never be re-enabled here.
 * Non-customization fields (textColor, borderColor, etc.) are also preserved.
 */
export function bridgeToCommercialDesignPreset(
  base: PdfDesignPreset,
  customization: ResolvedPdfCustomization,
): PdfDesignPreset {
  return {
    ...base,
    accentColor: customization.accentColor,
    headerFont: customization.documentFont as PdfDesignPreset['headerFont'],
    bodyFont: customization.documentFont as PdfDesignPreset['bodyFont'],
  }
}

/**
 * Commit the engine's accent/font values into the persisted design preset.
 *
 * Restores the pre-unification save contract: tapping Save writes the
 * design preset (previously via `setPdfDesignPreset` in the old sheet).
 * Without this, the preset store freezes and a legacy preset saved with
 * customization toggles OFF vetoes new engine edits in downloads while
 * the popup shows them — popup/PDF divergence.
 *
 * Saving means customized, so the toggles go ON. Other preset fields
 * (text, muted, border, surface, fillable) are preserved untouched.
 */
export function persistCommercialDesignPreset(
  documentType: PdfDesignPresetDocument,
  customization: Pick<ResolvedPdfCustomization, 'accentColor' | 'documentFont'>,
): void {
  const docType: PdfDesignPresetDocument = documentType === 'quotation' ? 'quotation' : 'invoice'
  const base = getPdfDesignPreset(docType)
  setPdfDesignPreset(docType, {
    ...base,
    useCustomColors: true,
    useCustomFonts: true,
    accentColor: customization.accentColor,
    headerFont: customization.documentFont as PdfDesignPreset['headerFont'],
    bodyFont: customization.documentFont as PdfDesignPreset['bodyFont'],
  })
}

/**
 * Resolve document family for Commercial documents.
 *
 * Invoice and Quotation share the same 'commercial' customization family.
 * If both are provided, invoice takes precedence (they use the same engine).
 *
 * Accepts the broader PdfDesignPresetDocument (which includes 'receipt') so
 * that callers can pass a PdfDesignPresetDocument directly. 'receipt' and
 * any other non-quotation family falls through to 'invoice'.
 */
export function resolveCommercialDocumentFamily(
  documentType?: PdfDesignPresetDocument,
): PdfCustomizationDocumentFamily {
  if (documentType === 'quotation') return 'quotation'
  return 'invoice'
}

/**
 * Standalone resolver: reads persisted design preset + engine localStorage → bridges to PdfDesignPreset.
 *
 * Use this in PDF download actions (invoicePdfActions, pdfDownloadHandler)
 * where the React hook is not available.
 *
 * The persisted design preset is the source of truth for the Custom Colors /
 * Custom Fonts toggles. Engine-saved accent/font values are applied on top
 * when present (the customization modal keeps them in sync).
 *
 * Legacy default: when the engine holds saved accent/font values but the user
 * has never explicitly saved a design preset, the toggles default ON (the
 * historical behavior before presets were persisted). Once a preset is saved,
 * its explicit toggle state is honored — including an intentionally saved OFF.
 */
export function resolveCommercialDesignPreset(
  documentType: PdfCustomizationDocumentFamily,
): PdfDesignPreset {
  const docType: PdfDesignPresetDocument = documentType === 'quotation' ? 'quotation' : 'invoice'
  const base = getPdfDesignPreset(docType)
  const engineSettings = loadEngineSettings(documentType)
  if (!engineSettings) return base
  const { customization } = resolveFull(
    COMMERCIAL_TEMPLATE_DEFAULTS,
    COMMERCIAL_CAPABILITIES,
    COMMERCIAL_POLICY,
    engineSettings,
  )
  const preset = bridgeToCommercialDesignPreset(base, customization)
  if (!hasSavedPdfDesignPreset(docType)) {
    preset.useCustomColors = true
    preset.useCustomFonts = true
  }
  return preset
}
