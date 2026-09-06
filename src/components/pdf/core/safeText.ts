/**
 * Safely converts an unknown value to a string for PDF display.
 * Prevents "[object Object]" from appearing in the UI.
 */
export function safeText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    
    // Try common display fields
    const candidates = ['label', 'name', 'text', 'main', 'value']
    for (const key of candidates) {
      if (typeof obj[key] === 'string' && obj[key]) {
        return obj[key] as string
      }
      if (typeof obj[key] === 'number') {
        return String(obj[key])
      }
    }
  }

  return ''
}

/**
 * Glyph-safe text helpers.
 *
 * react-pdf renders a character missing from the active font by falling back
 * to the built-in Helvetica (WinAnsi) font. Characters outside WinAnsi are
 * then encoded as their low byte and corrupt (for example ⅘ U+2158 renders
 * as "X"). The registered shared fonts ship Latin-subset files, so any
 * character outside the ranges below must be routed to a glyph-complete font
 * (DejaVu Sans) instead of being left to the Helvetica fallback.
 */

export type GlyphRun = {
  text: string
  /** True when the run must be rendered with the glyph-supplement font. */
  glyphFont: boolean
}

/** WinAnsi symbols the built-in Helvetica fallback renders faithfully. */
function isWinAnsiSymbol(code: number): boolean {
  if (code === 0x20ac) return true // €
  if (code === 0x2122) return true // ™
  if (code === 0x2212 || code === 0x2260 || code === 0x2264 || code === 0x2265) return true // − ≠ ≤ ≥
  if (code === 0x25a0) return true // ■
  if (code === 0x266a) return true // ♪
  return false
}

/**
 * True when every registered PDF font can render the code point faithfully:
 * Latin text plus the common punctuation every Latin-subset face ships.
 */
function isCodePointCoveredByPrimaryFonts(code: number): boolean {
  // Basic Latin + Latin-1 Supplement (present in every font used on PDFs).
  if (code <= 0x00ff) return true
  // Latin Extended-A/B, IPA extensions, spacing modifiers, combining marks.
  if (code >= 0x0100 && code <= 0x036f) return true
  // General Punctuation (curly quotes, dashes, bullets, ellipsis, primes).
  if (code >= 0x2000 && code <= 0x206f) return true
  return isWinAnsiSymbol(code)
}

/**
 * True when the character needs the glyph-supplement font because the
 * primary fonts (or their WinAnsi fallback) cannot represent it.
 */
export function needsGlyphFont(char: string): boolean {
  const code = char.codePointAt(0)
  if (code === undefined) return false
  return !isCodePointCoveredByPrimaryFonts(code)
}

/**
 * Splits text into runs so that characters the primary fonts cannot render
 * are isolated and can be rendered with the glyph-supplement font.
 */
export function splitGlyphRuns(value: unknown): GlyphRun[] {
  const text = safeText(value)
  if (!text) return []

  const runs: GlyphRun[] = []
  let current = ''
  let currentGlyphFont = false

  for (const char of text) {
    const glyphFont = needsGlyphFont(char)
    if (current && glyphFont !== currentGlyphFont) {
      runs.push({ text: current, glyphFont: currentGlyphFont })
      current = ''
    }
    current += char
    currentGlyphFont = glyphFont
  }

  if (current) {
    runs.push({ text: current, glyphFont: currentGlyphFont })
  }

  return runs
}
