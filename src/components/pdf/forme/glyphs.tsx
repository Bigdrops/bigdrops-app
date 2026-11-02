import React from 'react'
import { Text } from '@formepdf/react'
import { GREEK_GLYPH_FONT } from './fonts'

/** Locked glyph-coverage font for the Naira sign. */
export const CURRENCY_GLYPH_FONT = 'Noto Sans'

const FALLBACK_FOR: Record<string, string> = {
  '₦': CURRENCY_GLYPH_FONT,
  'Ω': GREEK_GLYPH_FONT,
  '−': 'Inter',
}

const BASE_FONT_MISSING: Record<string, ReadonlySet<string>> = {
  Inter: new Set(['₦', 'Ω']),
  'Archivo Black': new Set(['₦']),
  Caveat: new Set(['₦', 'Ω']),
  'Noto Sans': new Set(['Ω', '−', '·', '—', '–', '²', '³', '°', 'µ', 'Ø', '′', '″']),
  'Noto Sans Greek': new Set(['₦', '−']),
  Helvetica: new Set(['₦', 'Ω']),
}

export interface GlyphRun {
  text: string
  fontFamily: string
}

function fontHasChar(font: string, char: string): boolean {
  const missing = BASE_FONT_MISSING[font] || BASE_FONT_MISSING.Inter
  return !missing.has(char)
}

/**
 * Split a value into runs so every required glyph is drawn by a font that
 * contains it. The base font keeps most text; only glyphs it lacks move to
 * their locked coverage font. Consecutive characters that share a font are
 * merged into one run.
 */
export function splitGlyphRuns(value: string, baseFont: string): GlyphRun[] {
  const runs: GlyphRun[] = []
  for (const char of Array.from(value)) {
    const fontFamily = fontHasChar(baseFont, char) ? baseFont : FALLBACK_FOR[char] || baseFont
    const previous = runs[runs.length - 1]
    if (previous && previous.fontFamily === fontFamily) {
      previous.text += char
    } else {
      runs.push({ text: char, fontFamily })
    }
  }
  return runs
}

/**
 * Build inline runs for a value with per-glyph font fallback.
 *
 * Forme only serializes Text children that are inline strings or Text
 * elements, so this must be called as a function inside a Text:
 * `{glyphRuns(value, font)}`. A component boundary would be dropped.
 */
export function glyphRuns(value: string, font: string): React.ReactNode[] {
  return splitGlyphRuns(value, font).map((run, index) => (
    <Text key={index} style={{ fontFamily: run.fontFamily }}>{run.text}</Text>
  ))
}
