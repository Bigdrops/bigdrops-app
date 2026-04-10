import { Font } from '@react-pdf/renderer'
import {
  REGISTERED_FILLABLE_FONTS,
  type RegisteredFillableFontFamily,
} from '@/lib/pdfFillableFonts'
import {
  REGISTERED_SHARED_FONTS,
  type RegisteredSharedPdfFontFamily,
} from '@/lib/pdfSharedFonts'

let pdfFontsRegistered = false

function registerPdfAlias(family: RegisteredFillableFontFamily | RegisteredSharedPdfFontFamily, src: string) {
  Font.register({ family, src })
}

function registerFontConfig(
  config: {
    regular: RegisteredFillableFontFamily | RegisteredSharedPdfFontFamily
    bold: RegisteredFillableFontFamily | RegisteredSharedPdfFontFamily
    italic: RegisteredFillableFontFamily | RegisteredSharedPdfFontFamily
    boldItalic: RegisteredFillableFontFamily | RegisteredSharedPdfFontFamily
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

  Object.values(REGISTERED_SHARED_FONTS).forEach(registerFontConfig)
  Object.values(REGISTERED_FILLABLE_FONTS).forEach(registerFontConfig)

  pdfFontsRegistered = true
}

export function registerPdfFillableFonts() {
  registerPdfFonts()
}
