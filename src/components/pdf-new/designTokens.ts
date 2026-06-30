import type { CommercialDocumentData } from './industryAdapter'
import { resolvePdfFontFamily } from '../../lib/pdfDesignPreset'

type DesignInput = CommercialDocumentData['design']

export type DesignTokens = {
  accentColor: string | null
  textColor: string | null
  mutedColor: string | null
  borderColor: string | null
  surfaceColor: string | null
  headerFont: string | null
  bodyFont: string | null
}

export function resolveDesignTokens(design: DesignInput | undefined): DesignTokens {
  if (!design) {
    return {
      accentColor: null,
      textColor: null,
      mutedColor: null,
      borderColor: null,
      surfaceColor: null,
      headerFont: null,
      bodyFont: null,
    }
  }

  const useColors = design.useCustomColors
  const useFonts = design.useCustomFonts

  return {
    accentColor: useColors && design.accentColor ? design.accentColor : null,
    textColor: useColors && design.textColor ? design.textColor : null,
    mutedColor: useColors && design.mutedColor ? design.mutedColor : null,
    borderColor: useColors && design.borderColor ? design.borderColor : null,
    surfaceColor: useColors && design.surfaceColor ? design.surfaceColor : null,
    headerFont: useFonts && design.headerFont
      ? resolvePdfFontFamily(design.headerFont, 'bold')
      : null,
    bodyFont: useFonts && design.bodyFont
      ? resolvePdfFontFamily(design.bodyFont)
      : null,
  }
}
