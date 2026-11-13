import React from 'react'
import { Text } from '@formepdf/react'
import { GREEK_GLYPH_FONT } from './fonts'

/** Locked glyph-coverage font for the Naira sign. */
export const CURRENCY_GLYPH_FONT = 'Noto Sans'

/**
 * Locked glyph-coverage font for engineering symbols: superscripts, subscripts,
 * vulgar fractions, the micro sign, Greek letters and comparison signs. Inter,
 * PT Serif, Archivo Black, Caveat and Noto Sans all lack parts of this set, and a
 * missing glyph is written to the PDF as `?`.
 */
export const SYMBOL_GLYPH_FONT = 'Plus Jakarta Sans'

const GREEK_LETTERS = ['Δ', 'π', 'Ω', '\u2126', 'θ', 'λ', 'φ', 'Σ', 'α', 'β', 'γ', 'δ', 'ε', 'μ']
const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁻', '⁺', 'ⁿ']
const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
const FRACTIONS = ['¼', '½', '¾', '⅛', '⅜', '⅝', '⅞', '⅓', '⅔', '⁄']
const MEASURES = ['µ', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '√', '∞', '∅', 'Ø', '‰', '′', '″']

const FALLBACK_FOR: Record<string, string> = {
  '₦': CURRENCY_GLYPH_FONT,
  // OHM SIGN is a distinct code point from GREEK CAPITAL OMEGA. Typed data can
  // contain either; both must leave a Latin-only family for the Greek subset.
  'Ω': GREEK_GLYPH_FONT,
  '\u2126': GREEK_GLYPH_FONT,
  '−': 'Inter',
}

for (const char of [...SUPERSCRIPTS, ...SUBSCRIPTS, ...FRACTIONS, ...MEASURES]) {
  FALLBACK_FOR[char] = SYMBOL_GLYPH_FONT
}
for (const char of GREEK_LETTERS) {
  if (char === 'Ω' || char === '\u2126') continue
  FALLBACK_FOR[char] = SYMBOL_GLYPH_FONT
}

const BASE_FONT_MISSING: Record<string, ReadonlySet<string>> = {
  Inter: new Set(['₦', 'Ω']),
  'Archivo Black': new Set(['₦']),
  Caveat: new Set(['₦', 'Ω']),
  'Noto Sans': new Set(['Ω', '−', '·', '—', '–', '²', '³', '°', 'µ', 'Ø', '′', '″']),
  'Noto Sans Greek': new Set(['₦', '−']),
  Helvetica: new Set(['₦', 'Ω']),
  // Both Goeist families lack ₦ (locked to Noto Sans). Goeist Mono also lacks Ω (U+2126, locked to Noto Sans Greek).
  'Goeist Sans': new Set(['₦']),
  'Goeist Mono': new Set(['₦', 'Ω']),
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
 * A character with a locked coverage font is always routed to that font, so a
 * family that lacks the glyph (including ones not enumerated in
 * BASE_FONT_MISSING, such as the OHM SIGN) can never emit a `?`.
 */
function fallbackFor(font: string, char: string): string | null {
  const target = FALLBACK_FOR[char]
  if (!target || target === font) return null
  return target
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
    const fontFamily = fallbackFor(baseFont, char) || (fontHasChar(baseFont, char) ? baseFont : FALLBACK_FOR[char] || baseFont)
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
