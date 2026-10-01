/**
 * PDF Customization Engine — Cost & Pricing Sheet Domain Metadata
 *
 * Declares the Cost & Pricing Sheet capabilities, policy, and template defaults
 * for the shared PDF Customization Engine.
 *
 * The Cost & Pricing Sheet has minimal customization:
 * - Document Font only
 * - No accent color, no handwriting font, no handwriting color
 */

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
} from './types'

export const CPS_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: false,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

export const CPS_POLICY: PdfCustomizationPolicy = {
  accentColor: false,
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
