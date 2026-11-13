import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { isFormeSupportedFamily } from '../fonts'

/**
 * Kept in sync with DEFAULT_PRESETS.waybill in src/lib/pdfDesignPreset.ts —
 * that module cannot be imported here because it pulls in .woff asset imports
 * that only exist under Vite. Production always passes a resolved preset.
 */
export const DEFAULT_WAYBILL_PRESET: Pick<
  PdfDesignPreset,
  | 'useCustomColors'
  | 'useCustomFonts'
  | 'accentColor'
  | 'textColor'
  | 'mutedColor'
  | 'borderColor'
  | 'surfaceColor'
  | 'headerFont'
  | 'bodyFont'
  | 'fillableFont'
  | 'fillableFontMode'
  | 'fillableColor'
> = {
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
}

export function formeFont(choice: unknown, fallback: string): string {
  return typeof choice === 'string' && isFormeSupportedFamily(choice) ? choice : fallback
}

// Mirrors getEffectiveFillableFont: custom mode honours the saved handwriting
// font, otherwise the body font is used for handwriting fields.
export function effectiveFillableFont(preset: { fillableFontMode?: string; fillableFont?: string; bodyFont?: string }): string {
  return preset.fillableFontMode === 'custom' ? String(preset.fillableFont ?? 'Caveat') : String(preset.bodyFont ?? 'Inter')
}

export interface WaybillFormeFonts {
  preset: Pick<
    PdfDesignPreset,
    | 'useCustomColors'
    | 'useCustomFonts'
    | 'accentColor'
    | 'textColor'
    | 'mutedColor'
    | 'borderColor'
    | 'surfaceColor'
    | 'headerFont'
    | 'bodyFont'
    | 'fillableFont'
    | 'fillableFontMode'
    | 'fillableColor'
    | 'templateAccentColor'
  >
  bodyFont: string
  fillableFont: string
  fillableColor: string
}

export function resolveWaybillFormeFonts(
  designPreset?: PdfDesignPreset | null,
): WaybillFormeFonts {
  const preset = designPreset ?? DEFAULT_WAYBILL_PRESET
  const bodyFont = formeFont(preset.bodyFont, 'Inter')
  const fillableFont = formeFont(effectiveFillableFont(preset), 'Caveat')
  const fillableColor = preset.fillableColor || preset.textColor
  return { preset, bodyFont, fillableFont, fillableColor }
}
