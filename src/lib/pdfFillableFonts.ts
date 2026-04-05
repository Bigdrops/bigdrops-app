import patrickHandRegular from '@/assets/pdf-fonts/PatrickHand-Regular.woff'
import handleeRegular from '@/assets/pdf-fonts/Handlee-Regular.woff'
import caveatRegular from '@/assets/pdf-fonts/Caveat-Regular.woff'
import caveatBold from '@/assets/pdf-fonts/Caveat-Bold.woff'
import sueEllenFranciscoRegular from '@/assets/pdf-fonts/SueEllenFrancisco-Regular.woff'
import kalamRegular from '@/assets/pdf-fonts/Kalam-Regular.woff'
import kalamBold from '@/assets/pdf-fonts/Kalam-Bold.woff'
import reenieBeanieRegular from '@/assets/pdf-fonts/ReenieBeanie-Regular.woff'

export type RegisteredFillableFontFamily =
  | 'Patrick Hand'
  | 'Patrick Hand Bold'
  | 'Patrick Hand Italic'
  | 'Patrick Hand Bold Italic'
  | 'Handlee'
  | 'Handlee Bold'
  | 'Handlee Italic'
  | 'Handlee Bold Italic'
  | 'Caveat'
  | 'Caveat Bold'
  | 'Caveat Italic'
  | 'Caveat Bold Italic'
  | 'Sue Ellen Francisco'
  | 'Sue Ellen Francisco Bold'
  | 'Sue Ellen Francisco Italic'
  | 'Sue Ellen Francisco Bold Italic'
  | 'Kalam'
  | 'Kalam Bold'
  | 'Kalam Italic'
  | 'Kalam Bold Italic'
  | 'Reenie Beanie'
  | 'Reenie Beanie Bold'
  | 'Reenie Beanie Italic'
  | 'Reenie Beanie Bold Italic'

export type RegisteredFillableFontConfig = {
  regular: RegisteredFillableFontFamily
  bold: RegisteredFillableFontFamily
  italic: RegisteredFillableFontFamily
  boldItalic: RegisteredFillableFontFamily
  webFamily: string
  regularSrc: string
  boldSrc?: string
}

export const REGISTERED_FILLABLE_FONTS: Record<string, RegisteredFillableFontConfig> = {
  'Patrick Hand': {
    regular: 'Patrick Hand',
    bold: 'Patrick Hand Bold',
    italic: 'Patrick Hand Italic',
    boldItalic: 'Patrick Hand Bold Italic',
    webFamily: 'Patrick Hand',
    regularSrc: patrickHandRegular,
  },
  Handlee: {
    regular: 'Handlee',
    bold: 'Handlee Bold',
    italic: 'Handlee Italic',
    boldItalic: 'Handlee Bold Italic',
    webFamily: 'Handlee',
    regularSrc: handleeRegular,
  },
  Caveat: {
    regular: 'Caveat',
    bold: 'Caveat Bold',
    italic: 'Caveat Italic',
    boldItalic: 'Caveat Bold Italic',
    webFamily: 'Caveat',
    regularSrc: caveatRegular,
    boldSrc: caveatBold,
  },
  'Sue Ellen Francisco': {
    regular: 'Sue Ellen Francisco',
    bold: 'Sue Ellen Francisco Bold',
    italic: 'Sue Ellen Francisco Italic',
    boldItalic: 'Sue Ellen Francisco Bold Italic',
    webFamily: 'Sue Ellen Francisco',
    regularSrc: sueEllenFranciscoRegular,
  },
  Kalam: {
    regular: 'Kalam',
    bold: 'Kalam Bold',
    italic: 'Kalam Italic',
    boldItalic: 'Kalam Bold Italic',
    webFamily: 'Kalam',
    regularSrc: kalamRegular,
    boldSrc: kalamBold,
  },
  'Reenie Beanie': {
    regular: 'Reenie Beanie',
    bold: 'Reenie Beanie Bold',
    italic: 'Reenie Beanie Italic',
    boldItalic: 'Reenie Beanie Bold Italic',
    webFamily: 'Reenie Beanie',
    regularSrc: reenieBeanieRegular,
  },
}

let webFontsLoadPromise: Promise<void> | null = null

export function getRegisteredFillablePdfFontFamily(
  choice: string,
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic' = 'regular',
) {
  const config = REGISTERED_FILLABLE_FONTS[choice]
  if (!config) return null
  return config[variant]
}

export function getRegisteredFillableWebFontFamily(choice: string) {
  return REGISTERED_FILLABLE_FONTS[choice]?.webFamily || null
}

export async function ensureFillableWebFontsLoaded() {
  if (typeof window === 'undefined' || typeof FontFace === 'undefined' || !document?.fonts) return
  if (webFontsLoadPromise) return webFontsLoadPromise

  webFontsLoadPromise = Promise.all(
    Object.values(REGISTERED_FILLABLE_FONTS).map(async (font) => {
      if (document.fonts.check(`16px "${font.webFamily}"`)) return
      const face = new FontFace(font.webFamily, `url(${font.regularSrc}) format("woff")`)
      const loadedFace = await face.load()
      document.fonts.add(loadedFace)
    }),
  ).then(() => undefined)

  return webFontsLoadPromise
}
