/**
 * PDF Customization Engine — Waybill Domain Metadata
 *
 * Declares Waybill's capabilities, policy, and template defaults
 * for the shared PDF Customization Engine.
 *
 * Waybill supports 3 customization sockets:
 * - Document Font
 * - Ink Font (handwriting)
 * - Ink Colour (handwriting color)
 *
 * Waybill does NOT support Accent Colour.
 */

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
  ResolvedPdfCustomization,
} from './types'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'

export const WAYBILL_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: false,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}

export const WAYBILL_POLICY: PdfCustomizationPolicy = {
  accentColor: false,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}

/** Waybill template defaults — sourced from the existing waybill default preset. */
export const WAYBILL_TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#0f172a',
  documentFont: 'Inter',
  handwritingFont: 'Patrick Hand',
  handwritingColor: '#0f172a',
}

/**
 * Bridge: ResolvedPdfCustomization → PdfDesignPreset.
 *
 * The shared engine resolves 4 fields. Waybill PDF templates consume
 * the full PdfDesignPreset. This function maps engine output onto the
 * existing preset shape so templates render identically.
 *
 * Non-customization fields (textColor, borderColor, etc.) are preserved
 * from the base preset unchanged.
 */
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
