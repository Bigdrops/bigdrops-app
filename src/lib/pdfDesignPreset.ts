import { getRegisteredFillablePdfFontFamily, getRegisteredFillableWebFontFamily } from '@/lib/pdfFillableFonts'
import { getRegisteredSharedFontConfig, getRegisteredSharedWebFontFamily, isRegisteredSharedFontChoice } from '@/lib/pdfSharedFonts'

export type PdfDesignPresetDocument = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'cps_sheets' | 'receipt'
export type PdfFontChoice = 'Inter' | 'Archivo Black'
export type LegacyPdfFontChoice =
  | 'Roboto'
  | 'Open Sans'
  | 'Lato'
  | 'Montserrat'
  | 'Poppins'
  | 'Raleway'
  | 'Orbitron'
  | 'Source Sans Pro'
  | 'Roboto Condensed'
  | 'Cormorant Garamond'
  | 'DejaVu Sans'
export type PdfFillableHandwritingChoice = 'Caveat'
export type LegacyPdfFillableChoice =
  | 'Patrick Hand'
  | 'Handlee'
  | 'Sue Ellen Francisco'
  | 'Kalam'
  | 'Reenie Beanie'
  | 'Biro Script'
  | 'Ballpoint Handwriting'
  | 'Ballpoint Rush'
export type PdfFillableFontChoice = PdfFontChoice | PdfFillableHandwritingChoice
export type PdfFillableFontMode = 'auto' | 'custom'

export type PdfDesignPreset = {
  useCustomColors: boolean
  useCustomFonts: boolean
  accentColor: string
  textColor: string
  mutedColor: string
  borderColor: string
  surfaceColor: string
  headerFont: PdfFontChoice
  bodyFont: PdfFontChoice
  fillableFont: PdfFillableFontChoice
  fillableFontMode: PdfFillableFontMode
  fillableColor: string
  templateAccentColor?: string
}

const DESIGN_PRESET_KEYS: Record<PdfDesignPresetDocument, string> = {
  invoice: 'invoice_pdf_design_preset',
  quotation: 'quotation_pdf_design_preset',
  csr: 'csr_pdf_design_preset',
  waybill: 'waybill_pdf_design_preset',
  cps_sheets: 'cps_sheets_pdf_design_preset',
  receipt: 'receipt_pdf_design_preset',
}

/**
 * Legacy storage keys. The Cost & Pricing Sheet preset was stored under the BOQ
 * key before the rename. Readers fall back to these keys, so an existing saved
 * preset is not lost.
 */
const LEGACY_DESIGN_PRESET_KEYS: Partial<Record<PdfDesignPresetDocument, string>> = {
  cps_sheets: 'boq_pdf_design_preset',
}

function readStoredPreset(documentType: PdfDesignPresetDocument): string | null {
  if (typeof window === 'undefined') return null
  const current = window.localStorage.getItem(DESIGN_PRESET_KEYS[documentType])
  if (current) return current
  const legacyKey = LEGACY_DESIGN_PRESET_KEYS[documentType]
  return legacyKey ? window.localStorage.getItem(legacyKey) : null
}

const PDF_FONT_VALUES: PdfFontChoice[] = [
  'Inter',
  'Archivo Black',
]

const PDF_FILLABLE_FONT_VALUES: PdfFillableFontChoice[] = [
  ...PDF_FONT_VALUES,
  'Caveat',
]

export const PDF_FONT_OPTIONS: Array<{ value: PdfFontChoice; label: string; description: string }> = [
  { value: 'Inter', label: 'Inter', description: 'Neutral modern standard' },
]

export const PDF_FILLABLE_FONT_OPTIONS: Array<{ value: PdfFillableFontChoice; label: string; description: string }> = [
  ...PDF_FONT_OPTIONS,
  { value: 'Caveat', label: 'Caveat', description: 'Expressive note-style script' },
]

export const PDF_ACCENT_SWATCHES = ['#14b8a6', '#3b82f6', '#ef4444', '#f59e0b', '#6366f1', '#111827']

const DEFAULT_PRESETS: Record<PdfDesignPresetDocument, PdfDesignPreset> = {
  invoice: {
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: '#14b8a6',
    textColor: '#0f172a',
    mutedColor: '#475569',
    borderColor: '#cbd5e1',
    surfaceColor: '#f8fafc',
    headerFont: 'Inter',
    bodyFont: 'Inter',
    fillableFont: 'Inter',
    fillableFontMode: 'auto',
    fillableColor: '#0f172a',
  },
  quotation: {
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: '#0f172a',
    textColor: '#0f172a',
    mutedColor: '#475569',
    borderColor: '#cbd5e1',
    surfaceColor: '#f8fafc',
    headerFont: 'Inter',
    bodyFont: 'Inter',
    fillableFont: 'Inter',
    fillableFontMode: 'auto',
    fillableColor: '#0f172a',
  },
  csr: {
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: '#0f172a',
    textColor: '#0f172a',
    mutedColor: '#475569',
    borderColor: '#cbd5e1',
    surfaceColor: '#f8fafc',
    headerFont: 'Inter',
    bodyFont: 'Inter',
    fillableFont: 'Caveat',
    fillableFontMode: 'custom',
    fillableColor: '#0f172a',
  },
  waybill: {
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: '#0f172a',
    textColor: '#0f172a',
    mutedColor: '#475569',
    borderColor: '#cbd5e1',
    surfaceColor: '#f8fafc',
    headerFont: 'Inter',
    bodyFont: 'Inter',
    fillableFont: 'Caveat',
    fillableFontMode: 'custom',
    fillableColor: '#0f172a',
  },
  cps_sheets: {
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: '#0f172a',
    textColor: '#0f172a',
    mutedColor: '#475569',
    borderColor: '#cbd5e1',
    surfaceColor: '#f8fafc',
    headerFont: 'Inter',
    bodyFont: 'Inter',
    fillableFont: 'Inter',
    fillableFontMode: 'auto',
    fillableColor: '#0f172a',
  },
  receipt: {
    useCustomColors: false,
    useCustomFonts: false,
    accentColor: '#0f172a',
    textColor: '#0f172a',
    mutedColor: '#475569',
    borderColor: '#cbd5e1',
    surfaceColor: '#f8fafc',
    headerFont: 'Inter',
    bodyFont: 'Inter',
    fillableFont: 'Caveat',
    fillableFontMode: 'custom',
    fillableColor: '#0f172a',
  },
}

function normalizeHexColor(value: unknown, fallback: string) {
  const text = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(text)) return `#${text.toLowerCase()}`
  return fallback
}

function normalizeFontChoice(value: unknown, fallback: PdfFontChoice = 'Inter'): PdfFontChoice {
  const normalized = String(value || '').trim()
  if (normalized === 'Archivo Black') return 'Archivo Black'
  if (normalized === 'Inter') return 'Inter'
  // All legacy or retired commercial font preferences normalize to Inter
  return fallback
}

function normalizeFillableFontChoice(value: unknown, fallback: PdfFillableFontChoice = 'Caveat'): PdfFillableFontChoice {
  const normalized = String(value || '').trim()
  if (normalized === 'sans' || normalized === 'Inter') return 'Inter'
  if (normalized === 'Archivo Black') return 'Archivo Black'
  if (
    normalized === 'Caveat' ||
    ([
      'Patrick Hand',
      'Handlee',
      'Sue Ellen Francisco',
      'Kalam',
      'Reenie Beanie',
      'Biro Script',
      'Ballpoint Handwriting',
      'Ballpoint Rush',
    ] as (LegacyPdfFillableChoice | string)[]).includes(normalized)
  ) {
    return 'Caveat'
  }
  return PDF_FILLABLE_FONT_VALUES.includes(normalized as PdfFillableFontChoice)
    ? (normalized as PdfFillableFontChoice)
    : fallback
}

function normalizeFillableFontMode(value: unknown): PdfFillableFontMode {
  return value === 'custom' ? 'custom' : 'auto'
}

export function getDefaultPdfDesignPreset(documentType: PdfDesignPresetDocument): PdfDesignPreset {
  return { ...DEFAULT_PRESETS[documentType] }
}

export function sanitizePdfDesignPreset(
  value: Partial<PdfDesignPreset> | null | undefined,
  documentType: PdfDesignPresetDocument,
): PdfDesignPreset {
  const fallback = getDefaultPdfDesignPreset(documentType)

  return {
    useCustomColors: value?.useCustomColors === true,
    useCustomFonts: value?.useCustomFonts === true,
    accentColor: normalizeHexColor(value?.accentColor, fallback.accentColor),
    textColor: normalizeHexColor(value?.textColor, fallback.textColor),
    mutedColor: normalizeHexColor(value?.mutedColor, fallback.mutedColor),
    borderColor: normalizeHexColor(value?.borderColor, fallback.borderColor),
    surfaceColor: normalizeHexColor(value?.surfaceColor, fallback.surfaceColor),
    headerFont: normalizeFontChoice(value?.headerFont, fallback.headerFont),
    bodyFont: normalizeFontChoice(value?.bodyFont, fallback.bodyFont),
    fillableFont: normalizeFillableFontChoice(value?.fillableFont, fallback.fillableFont),
    fillableFontMode: normalizeFillableFontMode(value?.fillableFontMode),
    fillableColor: normalizeHexColor(value?.fillableColor, fallback.fillableColor),
    templateAccentColor: normalizeHexColor(value?.templateAccentColor || '', '') || undefined,
  }
}

export function getPdfDesignPreset(documentType: PdfDesignPresetDocument): PdfDesignPreset {
  if (typeof window === 'undefined') return getDefaultPdfDesignPreset(documentType)

  try {
    const raw = readStoredPreset(documentType)
    if (!raw) return getDefaultPdfDesignPreset(documentType)
    return sanitizePdfDesignPreset(JSON.parse(raw) as Partial<PdfDesignPreset>, documentType)
  } catch {
    return getDefaultPdfDesignPreset(documentType)
  }
}

export function setPdfDesignPreset(documentType: PdfDesignPresetDocument, preset: PdfDesignPreset) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(DESIGN_PRESET_KEYS[documentType], JSON.stringify(sanitizePdfDesignPreset(preset, documentType)))
  } catch {
    // Ignore storage write failures and keep the in-memory selection.
  }
}

/**
 * True when the user has explicitly saved a design preset for this document
 * type. Distinguishes an intentionally saved `false` toggle from the
 * never-configured default, which consumers use to preserve legacy defaults.
 */
export function hasSavedPdfDesignPreset(documentType: PdfDesignPresetDocument): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(readStoredPreset(documentType))
  } catch {
    return false
  }
}

export function getEffectiveFillableFont(preset: PdfDesignPreset): PdfFillableFontChoice {
  return preset.fillableFontMode === 'custom' ? preset.fillableFont : preset.bodyFont
}

function resolveBuiltinPdfFontFamily(
  choice: PdfFontChoice,
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic' = 'regular',
) {
  if (variant === 'bold') return 'Helvetica-Bold'
  if (variant === 'italic') return 'Helvetica-Oblique'
  if (variant === 'boldItalic') return 'Helvetica-BoldOblique'
  return 'Helvetica'
}

export function resolvePdfFontFamily(
  choice: PdfFontChoice | PdfFillableFontChoice | LegacyPdfFillableChoice | LegacyPdfFontChoice | string,
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic' = 'regular',
) {
  const normalizedChoice =
    choice === 'Biro Script' ||
    choice === 'Ballpoint Handwriting' ||
    choice === 'Ballpoint Rush' ||
    choice === 'Patrick Hand' ||
    choice === 'Handlee' ||
    choice === 'Sue Ellen Francisco' ||
    choice === 'Kalam' ||
    choice === 'Reenie Beanie'
      ? 'Caveat'
      : choice

  if (normalizedChoice === 'Caveat') {
    const registeredFillableFont = getRegisteredFillablePdfFontFamily('Caveat', variant)
    if (registeredFillableFont) {
      return registeredFillableFont
    }
    return 'Caveat'
  }

  if (normalizedChoice === 'Archivo Black') {
    return 'Archivo Black'
  }

  if (normalizedChoice === 'Noto Sans') {
    return 'Noto Sans'
  }

  if (isRegisteredSharedFontChoice(normalizedChoice)) {
    const sharedConfig = getRegisteredSharedFontConfig(normalizedChoice)
    if (sharedConfig) {
      return sharedConfig.family
    }
    return resolveBuiltinPdfFontFamily(normalizedChoice as PdfFontChoice, variant)
  }

  const registeredFillableFont = getRegisteredFillablePdfFontFamily(normalizedChoice, variant)
  if (registeredFillableFont) {
    return registeredFillableFont
  }

  return 'Inter'
}

export function resolvePdfWebFontFamily(
  choice: PdfFontChoice | PdfFillableFontChoice | LegacyPdfFillableChoice | LegacyPdfFontChoice | string,
) {
  const normalizedChoice =
    choice === 'Biro Script' ||
    choice === 'Ballpoint Handwriting' ||
    choice === 'Ballpoint Rush' ||
    choice === 'Patrick Hand' ||
    choice === 'Handlee' ||
    choice === 'Sue Ellen Francisco' ||
    choice === 'Kalam' ||
    choice === 'Reenie Beanie'
      ? 'Caveat'
      : choice

  if (normalizedChoice === 'Caveat') {
    return '"Caveat", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
  }
  if (normalizedChoice === 'Archivo Black') {
    return '"Archivo Black", Arial Black, sans-serif'
  }
  if (normalizedChoice === 'Noto Sans') {
    return '"Noto Sans", Arial, sans-serif'
  }

  const registeredSharedWebFont = getRegisteredSharedWebFontFamily(normalizedChoice)
  if (registeredSharedWebFont) {
    return `"${registeredSharedWebFont}", Arial, sans-serif`
  }

  const registeredFillableWebFont = getRegisteredFillableWebFontFamily(normalizedChoice)
  if (registeredFillableWebFont) {
    return `"${registeredFillableWebFont}", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
  }

  return '"Inter", Arial, sans-serif'
}

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function transformHex(hexColor: string, amount: number) {
  const normalized = normalizeHexColor(hexColor, '#0f172a').slice(1)
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  const factor = amount / 100

  const nextRed = amount >= 0 ? red + (255 - red) * factor : red * (1 + factor)
  const nextGreen = amount >= 0 ? green + (255 - green) * factor : green * (1 + factor)
  const nextBlue = amount >= 0 ? blue + (255 - blue) * factor : blue * (1 + factor)

  return `#${clampChannel(nextRed).toString(16).padStart(2, '0')}${clampChannel(nextGreen).toString(16).padStart(2, '0')}${clampChannel(nextBlue).toString(16).padStart(2, '0')}`
}

export function lightenHex(hexColor: string, amount = 30) {
  return transformHex(hexColor, Math.abs(amount))
}

export function darkenHex(hexColor: string, amount = 18) {
  return transformHex(hexColor, -Math.abs(amount))
}
