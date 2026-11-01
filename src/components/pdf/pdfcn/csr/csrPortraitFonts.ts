import { ensureFormeFontFamily } from '@/components/pdf/forme/fonts'

/**
 * Display face for the portrait CSR headings.
 *
 * Arial Black (ariblk.ttf) ships with Windows and its EULA does not permit
 * redistribution, so the OFL-licensed Archivo Black — the closest widely
 * available Arial Black analogue — is bundled instead.
 */
export const CSR_PORTRAIT_DISPLAY_FONT = 'Archivo Black'

export function ensureCsrPortraitDisplayFont(): void {
  void ensureFormeFontFamily(CSR_PORTRAIT_DISPLAY_FONT)
}

ensureCsrPortraitDisplayFont()
