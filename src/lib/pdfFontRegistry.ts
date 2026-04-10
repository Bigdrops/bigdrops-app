import { Font } from '@react-pdf/renderer'
import {
  REGISTERED_FILLABLE_FONTS,
  type RegisteredFillableFontFamily,
} from '@/lib/pdfFillableFonts'
import {
  getRegisteredSharedFontConfig,
  isRegisteredSharedFontChoice,
} from '@/lib/pdfSharedFonts'
import type { PdfFontChoice } from '@/lib/pdfDesignPreset'

let pdfFontsRegistered = false
const registeredSharedFamilies = new Set<PdfFontChoice>()

function registerPdfAlias(family: RegisteredFillableFontFamily | string, src: string) {
  Font.register({ family, src })
}

function toBrowserSafeFontSrc(src: string) {
  if (typeof window === 'undefined') return src
  try {
    return new URL(src, window.location.href).toString()
  } catch {
    return src
  }
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

export function ensureSharedPdfFontRegistered(choice: string) {
  if (!isRegisteredSharedFontChoice(choice)) return false
  if (registeredSharedFamilies.has(choice)) return true

  const config = getRegisteredSharedFontConfig(choice)
  if (!config) return false

  Font.register({
    family: config.family,
    fonts: [
      { src: toBrowserSafeFontSrc(config.regularSrc), fontWeight: 400, fontStyle: 'normal' },
      { src: toBrowserSafeFontSrc(config.boldSrc || config.regularSrc), fontWeight: 700, fontStyle: 'normal' },
      { src: toBrowserSafeFontSrc(config.italicSrc || config.regularSrc), fontWeight: 400, fontStyle: 'italic' },
      { src: toBrowserSafeFontSrc(config.boldItalicSrc || config.boldSrc || config.italicSrc || config.regularSrc), fontWeight: 700, fontStyle: 'italic' },
    ],
  })

  registeredSharedFamilies.add(choice)
  return true
}

export function registerPdfFillableFonts() {
  registerPdfFonts()
}
