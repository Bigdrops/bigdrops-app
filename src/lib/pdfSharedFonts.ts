import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff'
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff'
import interItalic from '@fontsource/inter/files/inter-latin-400-italic.woff'
import interBoldItalic from '@fontsource/inter/files/inter-latin-700-italic.woff'
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff'
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff'
import robotoItalic from '@fontsource/roboto/files/roboto-latin-400-italic.woff'
import openSansRegular from '@fontsource/open-sans/files/open-sans-latin-400-normal.woff'
import openSansBold from '@fontsource/open-sans/files/open-sans-latin-700-normal.woff'
import openSansItalic from '@fontsource/open-sans/files/open-sans-latin-400-italic.woff'
import latoRegular from '@fontsource/lato/files/lato-latin-400-normal.woff'
import latoBold from '@fontsource/lato/files/lato-latin-700-normal.woff'
import latoItalic from '@fontsource/lato/files/lato-latin-400-italic.woff'
import montserratRegular from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff'
import montserratBold from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff'
import montserratItalic from '@fontsource/montserrat/files/montserrat-latin-400-italic.woff'
import poppinsRegular from '@fontsource/poppins/files/poppins-latin-400-normal.woff'
import poppinsBold from '@fontsource/poppins/files/poppins-latin-700-normal.woff'
import poppinsItalic from '@fontsource/poppins/files/poppins-latin-400-italic.woff'
import ralewayRegular from '@fontsource/raleway/files/raleway-latin-400-normal.woff'
import ralewayBold from '@fontsource/raleway/files/raleway-latin-700-normal.woff'
import ralewayItalic from '@fontsource/raleway/files/raleway-latin-400-italic.woff'
import orbitronRegular from '@fontsource/orbitron/files/orbitron-latin-400-normal.woff'
import orbitronBold from '@fontsource/orbitron/files/orbitron-latin-700-normal.woff'
import sourceSansProRegular from '@fontsource/source-sans-pro/files/source-sans-pro-latin-400-normal.woff'
import sourceSansProBold from '@fontsource/source-sans-pro/files/source-sans-pro-latin-700-normal.woff'
import sourceSansProItalic from '@fontsource/source-sans-pro/files/source-sans-pro-latin-400-italic.woff'
import robotoCondensedRegular from '@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff'
import robotoCondensedBold from '@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff'
import robotoCondensedItalic from '@fontsource/roboto-condensed/files/roboto-condensed-latin-400-italic.woff'
import notoSansRegular from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff'
import notoSansBold from '@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff'
import cormorantGaramondRegular from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff'
import cormorantGaramondBold from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff'
import cormorantGaramondItalic from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff'
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
export const CREST_FONT_FAMILY = 'Cormorant Garamond'

export const REGISTERED_SHARED_FONTS: Record<PdfFontChoice, RegisteredSharedFontConfig> = {
  Inter: {
    family: 'Inter',
    webFamily: 'Inter',
    regularSrc: interRegular,
    boldSrc: interBold,
    italicSrc: interItalic,
    boldItalicSrc: interBoldItalic,
  },
  Roboto: {
    family: 'Roboto',
    webFamily: 'Roboto',
    regularSrc: robotoRegular,
    boldSrc: robotoBold,
    italicSrc: robotoItalic,
    boldItalicSrc: robotoBold,
  },
  'Open Sans': {
    family: 'Open Sans',
    webFamily: 'Open Sans',
    regularSrc: openSansRegular,
    boldSrc: openSansBold,
    italicSrc: openSansItalic,
    boldItalicSrc: openSansBold,
  },
  Lato: {
    family: 'Lato',
    webFamily: 'Lato',
    regularSrc: latoRegular,
    boldSrc: latoBold,
    italicSrc: latoItalic,
    boldItalicSrc: latoBold,
  },
  Montserrat: {
    family: 'Montserrat',
    webFamily: 'Montserrat',
    regularSrc: montserratRegular,
    boldSrc: montserratBold,
    italicSrc: montserratItalic,
    boldItalicSrc: montserratBold,
  },
  Poppins: {
    family: 'Poppins',
    webFamily: 'Poppins',
    regularSrc: poppinsRegular,
    boldSrc: poppinsBold,
    italicSrc: poppinsItalic,
    boldItalicSrc: poppinsBold,
  },
  Raleway: {
    family: 'Raleway',
    webFamily: 'Raleway',
    regularSrc: ralewayRegular,
    boldSrc: ralewayBold,
    italicSrc: ralewayItalic,
    boldItalicSrc: ralewayBold,
  },
  Orbitron: {
    family: 'Orbitron',
    webFamily: 'Orbitron',
    regularSrc: orbitronRegular,
    boldSrc: orbitronBold,
    italicSrc: orbitronRegular,
    boldItalicSrc: orbitronBold,
  },
  'Source Sans Pro': {
    family: 'Source Sans Pro',
    webFamily: 'Source Sans Pro',
    regularSrc: sourceSansProRegular,
    boldSrc: sourceSansProBold,
    italicSrc: sourceSansProItalic,
    boldItalicSrc: sourceSansProBold,
  },
  'Roboto Condensed': {
    family: 'Roboto Condensed',
    webFamily: 'Roboto Condensed',
    regularSrc: robotoCondensedRegular,
    boldSrc: robotoCondensedBold,
    italicSrc: robotoCondensedItalic,
    boldItalicSrc: robotoCondensedBold,
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
  [CREST_FONT_FAMILY]: {
    family: CREST_FONT_FAMILY,
    webFamily: CREST_FONT_FAMILY,
    regularSrc: cormorantGaramondRegular,
    boldSrc: cormorantGaramondBold,
    italicSrc: cormorantGaramondItalic,
    boldItalicSrc: cormorantGaramondBold,
  },
}

export function getRegisteredSharedFontConfig(choice: string) {
  return REGISTERED_SHARED_FONTS[choice as PdfFontChoice] || null
}

export function getRegisteredSharedWebFontFamily(choice: string) {
  return getRegisteredSharedFontConfig(choice)?.webFamily || null
}

export function isRegisteredSharedFontChoice(choice: string): choice is PdfFontChoice {
  return choice in REGISTERED_SHARED_FONTS
}
