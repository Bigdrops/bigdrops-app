import { Font } from '@react-pdf/renderer'
import {
  REGISTERED_FILLABLE_FONTS,
  type RegisteredFillableFontFamily,
} from '@/lib/pdfFillableFonts'

let pdfFontsRegistered = false

function registerPdfAlias(family: RegisteredFillableFontFamily | string, src: string) {
  Font.register({ family, src })
}

function registerFontConfig(
  config: {
    regular: RegisteredFillableFontFamily | string
    bold: RegisteredFillableFontFamily | string
    italic: RegisteredFillableFontFamily | string
    boldItalic: RegisteredFillableFontFamily | string
    regularSrc: string
    boldSrc?: string
    italicSrc?: string
  },
) {
  const regularSrc = config.regularSrc
  const boldSrc = config.boldSrc || regularSrc
  const italicSrc = config.italicSrc || regularSrc

  registerPdfAlias(config.regular, regularSrc)
  registerPdfAlias(config.bold, boldSrc)
  registerPdfAlias(config.italic, italicSrc)
  registerPdfAlias(config.boldItalic, boldSrc)
}

export function registerPdfFonts() {
  if (pdfFontsRegistered) return

  Object.values(REGISTERED_FILLABLE_FONTS).forEach(registerFontConfig)

  pdfFontsRegistered = true
}

export function ensureSharedPdfFontRegistered(_choice: string) {
  return false
}

export function registerPdfFillableFonts() {
  registerPdfFonts()
}
