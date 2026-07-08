/**
 * PDF Customization Engine — Unified Font Registration
 *
 * Abstracts over the existing pdfFontRegistry.ts and pdfFillableFonts.ts.
 * Downstream consumers call one function to register all fonts.
 * Does not modify existing registries — wraps them.
 */

import { registerPdfFonts } from '@/lib/pdfFontRegistry'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

/**
 * Register all fonts needed by the PDF Customization Engine.
 * Delegates to existing shared + fillable registration.
 * Call once at app startup or before PDF generation.
 */
export function registerPdfCustomizationFonts(): void {
  registerPdfFonts()
}

/**
 * Register only fillable (handwriting) fonts.
 * Useful when only handwriting overrides are needed.
 */
export function registerPdfCustomizationFillableFonts(): void {
  registerPdfFillableFonts()
}
