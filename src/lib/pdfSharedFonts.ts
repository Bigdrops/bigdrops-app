import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff'
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff'
import interItalic from '@fontsource/inter/files/inter-latin-400-italic.woff'
import interBoldItalic from '@fontsource/inter/files/inter-latin-700-italic.woff'
import notoSansRegular from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff'
import notoSansBold from '@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff'
import type { PdfFontChoice } from '@/lib/pdfDesignPreset'

export type RegisteredSharedFontConfig = {
  family: string
  webFamily: string
  regularSrc: string
  boldSrc?: string
  italicSrc?: string
  boldItalicSrc?: string
}

export const PDF_CURRENCY_FONT_FAMILY = 'Noto Sans'
export const CREST_FONT_FAMILY = 'Inter'
export const PDF_GLYPH_FONT_FAMILY = 'Noto Sans'
export const ARCHIVO_BLACK_FONT_FAMILY = 'Archivo Black'

function publicFontSrc(filename: string): string {
  return typeof window === 'undefined' ? `public/fonts/${filename}` : `/fonts/${filename}`
}

export const REGISTERED_SHARED_FONTS: Record<PdfFontChoice, RegisteredSharedFontConfig> = {
  Inter: {
    family: 'Inter',
    webFamily: 'Inter',
    regularSrc: interRegular,
    boldSrc: interBold,
    italicSrc: interItalic,
    boldItalicSrc: interBoldItalic,
  },
  'Archivo Black': {
    family: 'Archivo Black',
    webFamily: 'Archivo Black',
    regularSrc: publicFontSrc('ArchivoBlack-Regular.ttf'),
    boldSrc: publicFontSrc('ArchivoBlack-Regular.ttf'),
  },
  'Goeist Sans': {
    family: 'Goeist Sans',
    webFamily: 'Goeist Sans',
    regularSrc: publicFontSrc('GoeistSans-Regular.ttf'),
    boldSrc: publicFontSrc('GoeistSans-Bold.ttf'),
    italicSrc: publicFontSrc('GoeistSans-Italic.ttf'),
    boldItalicSrc: publicFontSrc('GoeistSans-BoldItalic.ttf'),
  },
  'Goeist Mono': {
    family: 'Goeist Mono',
    webFamily: 'Goeist Mono',
    regularSrc: publicFontSrc('GoeistMono-Regular.ttf'),
    boldSrc: publicFontSrc('GoeistMono-Bold.ttf'),
    italicSrc: publicFontSrc('GoeistMono-Italic.ttf'),
    boldItalicSrc: publicFontSrc('GoeistMono-BoldItalic.ttf'),
  },
}

export const REGISTERED_LOCKED_SHARED_FONTS: Record<string, RegisteredSharedFontConfig> = {
  [PDF_CURRENCY_FONT_FAMILY]: {
    family: PDF_CURRENCY_FONT_FAMILY,
    webFamily: PDF_CURRENCY_FONT_FAMILY,
    regularSrc: notoSansRegular,
    boldSrc: notoSansBold,
    italicSrc: notoSansRegular,
    boldItalicSrc: notoSansBold,
  },
}

export function getRegisteredSharedFontConfig(choice: string): RegisteredSharedFontConfig | null {
  return REGISTERED_SHARED_FONTS[choice as PdfFontChoice] || REGISTERED_LOCKED_SHARED_FONTS[choice] || null
}

export function getRegisteredSharedWebFontFamily(choice: string): string | null {
  return getRegisteredSharedFontConfig(choice)?.webFamily || null
}

export function isRegisteredSharedFontChoice(choice: string): choice is PdfFontChoice {
  return choice in REGISTERED_SHARED_FONTS
}
