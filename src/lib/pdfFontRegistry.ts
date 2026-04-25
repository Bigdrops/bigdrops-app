import { Font } from '@react-pdf/renderer'
import {
  REGISTERED_FILLABLE_FONTS,
  type RegisteredFillableFontFamily,
} from '@/lib/pdfFillableFonts'
import { REGISTERED_SHARED_FONTS } from '@/lib/pdfSharedFonts'

let pdfFontsRegistered = false

function registerPdfAlias(family: RegisteredFillableFontFamily | string, src: string) {
  Font.register({ family, src })
}

function registerFillableFontConfig(
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

function registerSharedFontConfig(
  config: {
    family: string
    regularSrc: string
    boldSrc?: string
    italicSrc?: string
    boldItalicSrc?: string
  },
) {
  Font.register({
    family: config.family,
    fonts: [
      { src: config.regularSrc, fontWeight: 400 },
      { src: config.boldSrc || config.regularSrc, fontWeight: 700 },
      { src: config.italicSrc || config.regularSrc, fontStyle: 'italic' },
      { src: config.boldItalicSrc || config.boldSrc || config.regularSrc, fontWeight: 700, fontStyle: 'italic' },
    ],
  })
}

export function registerPdfFonts() {
  if (pdfFontsRegistered) return

  Object.values(REGISTERED_FILLABLE_FONTS).forEach(registerFillableFontConfig)
  Object.values(REGISTERED_SHARED_FONTS).forEach(registerSharedFontConfig)

  // Prevent hyphenation for qty/unit tokens and disable default hyphenation dashes
  Font.registerHyphenationCallback(word => {
    // Guard against splitting tokens like 1800m, 120set, 210pcs
    if (/^\d+[a-zA-Z]+$/.test(word)) {
      return [word]
    }

    // Return the word as-is for everything else to let it wrap normally (no hyphenation)
    return [word]
  })

  pdfFontsRegistered = true
}

export function ensureSharedPdfFontRegistered(choice: string) {
  registerPdfFonts()
  return choice in REGISTERED_SHARED_FONTS
}

export function registerPdfFillableFonts() {
  registerPdfFonts()
}
