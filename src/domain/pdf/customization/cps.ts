/**
 * PDF Customization Engine — Cost & Pricing Sheet Domain Metadata
 *
 * Declares the Cost & Pricing Sheet capabilities, policy, and template defaults
 * for the shared PDF Customization Engine.
 *
 * The Cost & Pricing Sheet supports:
 * - Document Font
 * - Accent color (applied to document headings, group bands, and rules)
 * - No handwriting font, no handwriting color
 */

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
} from './types'

export const CPS_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: true,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

export const CPS_POLICY: PdfCustomizationPolicy = {
  accentColor: true,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

export const CPS_TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#0f172a',
  documentFont: 'Inter',
  handwritingFont: 'Inter',
  handwritingColor: '#0f172a',
}
