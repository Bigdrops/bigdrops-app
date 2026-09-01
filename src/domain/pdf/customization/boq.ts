/**
 * PDF Customization Engine — BOQ Domain Metadata
 *
 * Declares BOQ's capabilities, policy, and template defaults
 * for the shared PDF Customization Engine.
 *
 * BOQ has minimal customization:
 * - Document Font only
 * - No accent color, no handwriting font, no handwriting color
 */

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
} from './types'

export const BOQ_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: false,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

export const BOQ_POLICY: PdfCustomizationPolicy = {
  accentColor: false,
  documentFont: true,
  handwritingFont: false,
  handwritingColor: false,
}

export const BOQ_TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#0f172a',
  documentFont: 'Inter',
  handwritingFont: 'Inter',
  handwritingColor: '#0f172a',
}
