import { getRegisteredFillablePdfFontFamily, getRegisteredFillableWebFontFamily } from '@/lib/pdfFillableFonts'
import { getRegisteredSharedFontConfig, getRegisteredSharedWebFontFamily, isRegisteredSharedFontChoice } from '@/lib/pdfSharedFonts'

export type PdfDesignPresetDocument = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'boq' | 'receipt'
export type PdfFontChoice =
  | 'Inter'
  | 'Roboto'
  | 'Open Sans'
  | 'Lato'
  | 'Montserrat'
  | 'Poppins'
  | 'Raleway'
  | 'Orbitron'
  | 'Source Sans Pro'
  | 'Roboto Condensed'
export type PdfFillableHandwritingChoice =
  | 'Patrick Hand'
  | 'Handlee'
  | 'Caveat'
  | 'Sue Ellen Francisco'
  | 'Kalam'
  | 'Reenie Beanie'
type LegacyPdfFillableChoice = 'Biro Script' | 'Ballpoint Handwriting' | 'Ballpoint Rush'
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
  boq: 'boq_pdf_design_preset',
  receipt: 'receipt_pdf_design_preset',
}

const PDF_FONT_VALUES: PdfFontChoice[] = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Orbitron',
  'Source Sans Pro',
  'Roboto Condensed',
]

const PDF_FILLABLE_FONT_VALUES: PdfFillableFontChoice[] = [
  ...PDF_FONT_VALUES,
  'Patrick Hand',
  'Handlee',
  'Caveat',
  'Sue Ellen Francisco',
  'Kalam',
  'Reenie Beanie',
]

export const PDF_FONT_OPTIONS: Array<{ value: PdfFontChoice; label: string; description: string }> = [
  { value: 'Inter', label: 'Inter', description: 'Neutral modern default' },
  { value: 'Roboto', label: 'Roboto', description: 'Clean UI staple' },
  { value: 'Open Sans', label: 'Open Sans', description: 'Readable and friendly' },
  { value: 'Lato', label: 'Lato', description: 'Warm humanist sans' },
  { value: 'Montserrat', label: 'Montserrat', description: 'Bold geometric headings' },
  { value: 'Poppins', label: 'Poppins', description: 'Rounded geometric sans' },
  { value: 'Raleway', label: 'Raleway', description: 'Elegant headline style' },
  { value: 'Orbitron', label: 'Orbitron', description: 'Tech-inspired display' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro', description: 'Balanced document text' },
  { value: 'Roboto Condensed', label: 'Roboto Condensed', description: 'Compact structured text' },
]

export const PDF_FILLABLE_FONT_OPTIONS: Array<{ value: PdfFillableFontChoice; label: string; description: string }> = [
  ...PDF_FONT_OPTIONS,
  { value: 'Patrick Hand', label: 'Patrick Hand', description: 'Friendly handwritten print' },
  { value: 'Handlee', label: 'Handlee', description: 'Smooth casual handwriting' },
  { value: 'Caveat', label: 'Caveat', description: 'Expressive note-style script' },
  { value: 'Sue Ellen Francisco', label: 'Sue Ellen Francisco', description: 'Tall neat handwritten strokes' },
  { value: 'Kalam', label: 'Kalam', description: 'Rounded handwritten marker feel' },
  { value: 'Reenie Beanie', label: 'Reenie Beanie', description: 'Loose scribbled handwriting' },
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
    fillableFont: 'Patrick Hand',
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
    fillableFont: 'Patrick Hand',
    fillableFontMode: 'custom',
    fillableColor: '#0f172a',
  },
  boq: {
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
    fillableFont: 'Patrick Hand',
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

function normalizeFontChoice(value: unknown, fallback: PdfFontChoice): PdfFontChoice {
  const normalized = String(value || '').trim()
  if (normalized === 'sans') return 'Inter'
  if (normalized === 'serif') return 'Lato'
  if (normalized === 'mono') return 'Roboto Condensed'
  return PDF_FONT_VALUES.includes(normalized as PdfFontChoice) ? (normalized as PdfFontChoice) : fallback
}

function normalizeFillableFontChoice(value: unknown, fallback: PdfFillableFontChoice): PdfFillableFontChoice {
  const normalized = String(value || '').trim()
  if (normalized === 'sans') return 'Inter'
  if (normalized === 'serif') return 'Lato'
  if (normalized === 'mono') return 'Roboto Condensed'
  if ((['Biro Script', 'Ballpoint Handwriting', 'Ballpoint Rush'] as LegacyPdfFillableChoice[]).includes(normalized as LegacyPdfFillableChoice)) {
    return 'Patrick Hand'
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
    const raw = window.localStorage.getItem(DESIGN_PRESET_KEYS[documentType])
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

export function getEffectiveFillableFont(preset: PdfDesignPreset): PdfFillableFontChoice {
  return preset.fillableFontMode === 'custom' ? preset.fillableFont : preset.bodyFont
}

function resolveBuiltinPdfFontFamily(
  choice: PdfFontChoice,
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic' = 'regular',
) {
  const family = choice === 'Orbitron' || choice === 'Roboto Condensed' ? 'Courier' : 'Helvetica'

  if (family === 'Courier') {
    if (variant === 'bold') return 'Courier-Bold'
    if (variant === 'italic') return 'Courier-Oblique'
    if (variant === 'boldItalic') return 'Courier-BoldOblique'
    return 'Courier'
  }

  if (variant === 'bold') return 'Helvetica-Bold'
  if (variant === 'italic') return 'Helvetica-Oblique'
  if (variant === 'boldItalic') return 'Helvetica-BoldOblique'
  return 'Helvetica'
}

export function resolvePdfFontFamily(
  choice: PdfFontChoice | PdfFillableFontChoice | LegacyPdfFillableChoice,
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic' = 'regular',
) {
  const normalizedChoice =
    choice === 'Biro Script' || choice === 'Ballpoint Handwriting' || choice === 'Ballpoint Rush'
      ? 'Patrick Hand'
      : choice

  if (isRegisteredSharedFontChoice(normalizedChoice)) {
    const sharedConfig = getRegisteredSharedFontConfig(normalizedChoice)
    if (sharedConfig) {
      return sharedConfig.family
    }
    return resolveBuiltinPdfFontFamily(normalizedChoice, variant)
  }

  const registeredFillableFont = getRegisteredFillablePdfFontFamily(normalizedChoice, variant)
  if (registeredFillableFont) {
    return registeredFillableFont
  }

  if (variant === 'bold') return 'Helvetica-Bold'
  if (variant === 'italic') return 'Helvetica-Oblique'
  if (variant === 'boldItalic') return 'Helvetica-BoldOblique'
  return 'Helvetica'
}

export function resolvePdfWebFontFamily(choice: PdfFontChoice | PdfFillableFontChoice | LegacyPdfFillableChoice) {
  const normalizedChoice =
    choice === 'Biro Script' || choice === 'Ballpoint Handwriting' || choice === 'Ballpoint Rush'
      ? 'Patrick Hand'
      : choice

  const registeredSharedWebFont = getRegisteredSharedWebFontFamily(normalizedChoice)
  if (registeredSharedWebFont) {
    return `"${registeredSharedWebFont}", Arial, sans-serif`
  }

  const registeredFillableWebFont = getRegisteredFillableWebFontFamily(normalizedChoice)
  if (registeredFillableWebFont) {
    return `"${registeredFillableWebFont}", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
  }
  if (normalizedChoice === 'Orbitron' || normalizedChoice === 'Roboto Condensed') return '"Courier New", Courier, monospace'
  return 'Inter, Arial, sans-serif'
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
