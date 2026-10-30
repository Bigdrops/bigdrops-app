import { Font } from '@formepdf/react'

/**
 * Display face for the portrait CSR headings.
 *
 * Arial Black (ariblk.ttf) ships with Windows and its EULA does not permit
 * redistribution, so the OFL-licensed Archivo Black — the closest widely
 * available Arial Black analogue — is bundled instead. Change this constant
 * to re-target every display heading at once.
 */
export const CSR_PORTRAIT_DISPLAY_FONT = 'Archivo Black'

/** Node/Bun renders resolve a filesystem path; the browser fetches the public URL. */
const FONT_SRC =
  typeof window === 'undefined'
    ? 'public/fonts/ArchivoBlack-Regular.ttf'
    : '/fonts/ArchivoBlack-Regular.ttf'

let registered = false

export function ensureCsrPortraitDisplayFont(): void {
  if (registered) return
  Font.register({ family: CSR_PORTRAIT_DISPLAY_FONT, src: FONT_SRC, fontWeight: 400 })
  Font.register({ family: CSR_PORTRAIT_DISPLAY_FONT, src: FONT_SRC, fontWeight: 700 })
  registered = true
}

ensureCsrPortraitDisplayFont()
