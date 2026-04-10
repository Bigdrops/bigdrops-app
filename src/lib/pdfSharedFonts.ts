import interRegular from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
import interItalic from '@fontsource-variable/inter/files/inter-latin-wght-italic.woff2'
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

export type RegisteredSharedPdfFontFamily =
  | 'Inter'
  | 'Inter Bold'
  | 'Inter Italic'
  | 'Inter Bold Italic'
  | 'Roboto'
  | 'Roboto Bold'
  | 'Roboto Italic'
  | 'Roboto Bold Italic'
  | 'Open Sans'
  | 'Open Sans Bold'
  | 'Open Sans Italic'
  | 'Open Sans Bold Italic'
  | 'Lato'
  | 'Lato Bold'
  | 'Lato Italic'
  | 'Lato Bold Italic'
  | 'Montserrat'
  | 'Montserrat Bold'
  | 'Montserrat Italic'
  | 'Montserrat Bold Italic'
  | 'Poppins'
  | 'Poppins Bold'
  | 'Poppins Italic'
  | 'Poppins Bold Italic'
  | 'Raleway'
  | 'Raleway Bold'
  | 'Raleway Italic'
  | 'Raleway Bold Italic'
  | 'Orbitron'
  | 'Orbitron Bold'
  | 'Orbitron Italic'
  | 'Orbitron Bold Italic'
  | 'Source Sans Pro'
  | 'Source Sans Pro Bold'
  | 'Source Sans Pro Italic'
  | 'Source Sans Pro Bold Italic'
  | 'Roboto Condensed'
  | 'Roboto Condensed Bold'
  | 'Roboto Condensed Italic'
  | 'Roboto Condensed Bold Italic'

type RegisteredSharedFontConfig = {
  regular: RegisteredSharedPdfFontFamily
  bold: RegisteredSharedPdfFontFamily
  italic: RegisteredSharedPdfFontFamily
  boldItalic: RegisteredSharedPdfFontFamily
  webFamily: string
  regularSrc: string
  boldSrc?: string
  italicSrc?: string
}

export const REGISTERED_SHARED_FONTS: Record<string, RegisteredSharedFontConfig> = {
  Inter: {
    regular: 'Inter',
    bold: 'Inter Bold',
    italic: 'Inter Italic',
    boldItalic: 'Inter Bold Italic',
    webFamily: 'Inter Variable',
    regularSrc: interRegular,
    boldSrc: interRegular,
    italicSrc: interItalic,
  },
  Roboto: {
    regular: 'Roboto',
    bold: 'Roboto Bold',
    italic: 'Roboto Italic',
    boldItalic: 'Roboto Bold Italic',
    webFamily: 'Roboto',
    regularSrc: robotoRegular,
    boldSrc: robotoBold,
    italicSrc: robotoItalic,
  },
  'Open Sans': {
    regular: 'Open Sans',
    bold: 'Open Sans Bold',
    italic: 'Open Sans Italic',
    boldItalic: 'Open Sans Bold Italic',
    webFamily: 'Open Sans',
    regularSrc: openSansRegular,
    boldSrc: openSansBold,
    italicSrc: openSansItalic,
  },
  Lato: {
    regular: 'Lato',
    bold: 'Lato Bold',
    italic: 'Lato Italic',
    boldItalic: 'Lato Bold Italic',
    webFamily: 'Lato',
    regularSrc: latoRegular,
    boldSrc: latoBold,
    italicSrc: latoItalic,
  },
  Montserrat: {
    regular: 'Montserrat',
    bold: 'Montserrat Bold',
    italic: 'Montserrat Italic',
    boldItalic: 'Montserrat Bold Italic',
    webFamily: 'Montserrat',
    regularSrc: montserratRegular,
    boldSrc: montserratBold,
    italicSrc: montserratItalic,
  },
  Poppins: {
    regular: 'Poppins',
    bold: 'Poppins Bold',
    italic: 'Poppins Italic',
    boldItalic: 'Poppins Bold Italic',
    webFamily: 'Poppins',
    regularSrc: poppinsRegular,
    boldSrc: poppinsBold,
    italicSrc: poppinsItalic,
  },
  Raleway: {
    regular: 'Raleway',
    bold: 'Raleway Bold',
    italic: 'Raleway Italic',
    boldItalic: 'Raleway Bold Italic',
    webFamily: 'Raleway',
    regularSrc: ralewayRegular,
    boldSrc: ralewayBold,
    italicSrc: ralewayItalic,
  },
  Orbitron: {
    regular: 'Orbitron',
    bold: 'Orbitron Bold',
    italic: 'Orbitron Italic',
    boldItalic: 'Orbitron Bold Italic',
    webFamily: 'Orbitron',
    regularSrc: orbitronRegular,
    boldSrc: orbitronBold,
  },
  'Source Sans Pro': {
    regular: 'Source Sans Pro',
    bold: 'Source Sans Pro Bold',
    italic: 'Source Sans Pro Italic',
    boldItalic: 'Source Sans Pro Bold Italic',
    webFamily: 'Source Sans Pro',
    regularSrc: sourceSansProRegular,
    boldSrc: sourceSansProBold,
    italicSrc: sourceSansProItalic,
  },
  'Roboto Condensed': {
    regular: 'Roboto Condensed',
    bold: 'Roboto Condensed Bold',
    italic: 'Roboto Condensed Italic',
    boldItalic: 'Roboto Condensed Bold Italic',
    webFamily: 'Roboto Condensed',
    regularSrc: robotoCondensedRegular,
    boldSrc: robotoCondensedBold,
    italicSrc: robotoCondensedItalic,
  },
}

export function getRegisteredSharedPdfFontFamily(
  choice: string,
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic' = 'regular',
) {
  const config = REGISTERED_SHARED_FONTS[choice]
  if (!config) return null
  return config[variant]
}

export function getRegisteredSharedWebFontFamily(choice: string) {
  return REGISTERED_SHARED_FONTS[choice]?.webFamily || null
}
