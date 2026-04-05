import { Font } from '@react-pdf/renderer'
import {
  REGISTERED_FILLABLE_FONTS,
  type RegisteredFillableFontFamily,
} from '@/lib/pdfFillableFonts'

let pdfFontsRegistered = false

function registerPdfAlias(family: RegisteredFillableFontFamily, src: string) {
  Font.register({ family, src })
}

export function registerPdfFillableFonts() {
  if (pdfFontsRegistered) return

  Object.values(REGISTERED_FILLABLE_FONTS).forEach((font) => {
    const regularSrc = font.regularSrc
    const boldSrc = font.boldSrc || regularSrc

    registerPdfAlias(font.regular, regularSrc)
    registerPdfAlias(font.bold, boldSrc)
    registerPdfAlias(font.italic, regularSrc)
    registerPdfAlias(font.boldItalic, boldSrc)
  })

  pdfFontsRegistered = true
}
