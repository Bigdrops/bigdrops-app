/**
 * PDF Customization Engine — Pure Resolver
 *
 * Merges template defaults + policy + user settings → ResolvedPdfCustomization.
 * Stateless, synchronous, testable. No React, no storage, no side effects.
 */

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfTemplateDefaults,
  PdfCustomizationSettings,
  ResolvedPdfCustomization,
  ResolvedPdfCustomizationSettings,
} from './types'
import { DEFAULT_CAPABILITIES, DEFAULT_POLICY, FALLBACK_TEMPLATE_DEFAULTS } from './types'

/**
 * Resolve user-saved settings into a fully concrete settings object,
 * applying only values for capabilities that are enabled in both the
 * template capabilities and the document policy.
 */
export function resolveSettings(
  templateCapabilities: PdfCustomizationCapabilities,
  policy: PdfCustomizationPolicy,
  userSettings?: PdfCustomizationSettings,
): ResolvedPdfCustomizationSettings {
  const defaults = FALLBACK_TEMPLATE_DEFAULTS
  const user: PdfCustomizationSettings = userSettings ?? { version: 1 }

  const canUse = (cap: keyof PdfCustomizationCapabilities) =>
    templateCapabilities[cap] && policy[cap]

  return {
    version: 1,
    accentColor: canUse('accentColor')
      ? (user.accentColor ?? defaults.accentColor)
      : defaults.accentColor,
    documentFont: canUse('documentFont')
      ? (user.documentFont ?? defaults.documentFont)
      : defaults.documentFont,
    inkFont: canUse('handwritingFont')
      ? (user.inkFont ?? defaults.handwritingFont)
      : defaults.handwritingFont,
    inkColour: canUse('handwritingColor')
      ? (user.inkColour ?? defaults.handwritingColor)
      : defaults.handwritingColor,
  }
}

/**
 * Resolve the full customization object from a resolved settings
 * and the template defaults. Used downstream by document engines.
 */
export function resolvePdfCustomization(
  templateDefaults: PdfTemplateDefaults,
  resolvedSettings: ResolvedPdfCustomizationSettings,
): ResolvedPdfCustomization {
  return {
    accentColor: resolvedSettings.accentColor,
    documentFont: resolvedSettings.documentFont,
    handwritingFont: resolvedSettings.inkFont,
    handwritingColor: resolvedSettings.inkColour,
  }
}

/**
 * High-level: resolve everything from raw inputs.
 * Returns both the resolved customization and the resolved settings.
 */
export function resolveFull(
  templateDefaults?: PdfTemplateDefaults,
  templateCapabilities?: PdfCustomizationCapabilities,
  policy?: PdfCustomizationPolicy,
  userSettings?: PdfCustomizationSettings,
): {
  customization: ResolvedPdfCustomization
  settings: ResolvedPdfCustomizationSettings
} {
  const defaults = templateDefaults ?? FALLBACK_TEMPLATE_DEFAULTS
  const caps = templateCapabilities ?? DEFAULT_CAPABILITIES
  const pol = policy ?? DEFAULT_POLICY

  const settings = resolveSettings(caps, pol, userSettings)
  const customization = resolvePdfCustomization(defaults, settings)

  return { customization, settings }
}
