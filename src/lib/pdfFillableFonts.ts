import caveatRegular from '@/assets/pdf-fonts/Caveat-Regular.woff'
import caveatBold from '@/assets/pdf-fonts/Caveat-Bold.woff'

export type RegisteredFillableFontFamily =
  | 'Caveat'
  | 'Caveat Bold'
  | 'Caveat Italic'
  | 'Caveat Bold Italic'

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
  Caveat: {
    regular: 'Caveat',
    bold: 'Caveat Bold',
    italic: 'Caveat Italic',
    boldItalic: 'Caveat Bold Italic',
    webFamily: 'Caveat',
    regularSrc: caveatRegular,
    boldSrc: caveatBold,
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
