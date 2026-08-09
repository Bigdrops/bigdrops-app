import React from 'react'
import { Text } from '@react-pdf/renderer'

import { splitGlyphRuns } from './safeText'
import { PDF_GLYPH_FONT_FAMILY } from '@/lib/pdfSharedFonts'

type PdfGlyphTextProps = {
  value: string
  style?: any
  wrap?: boolean
  fixed?: boolean
  hyphenationCallback?: (word: string) => string[]
}

function flattenStyles(style: any): Array<Record<string, unknown>> {
  if (!style) return []
  if (Array.isArray(style)) {
    const out: Array<Record<string, unknown>> = []
    for (const entry of style) {
      if (Array.isArray(entry)) {
        out.push(...flattenStyles(entry))
      } else if (entry && typeof entry === 'object') {
        out.push(entry)
      }
    }
    return out
  }
  if (typeof style === 'object') {
    return [style]
  }
  return []
}

/**
 * Mirrors the weight/style of the primary run so the glyph-supplement font
 * matches the surrounding text (e.g. Helvetica-Bold → DejaVu Sans bold).
 */
function resolveGlyphWeightStyle(style: any): Record<string, unknown> | null {
  let bold = false
  let italic = false

  for (const entry of flattenStyles(style)) {
    const family = typeof entry.fontFamily === 'string' ? entry.fontFamily : ''
    if (family.includes('Bold') || family.includes('Heavy') || family.includes('Black')) bold = true
    if (family.includes('Italic') || family.includes('Oblique')) italic = true

    const weight = entry.fontWeight
    if (typeof weight === 'number' && weight >= 600) bold = true
    else if (typeof weight === 'string' && /^(bold|bolder|[6-9]00)$/i.test(weight)) bold = true

    if (entry.fontStyle === 'italic' || entry.fontStyle === 'oblique') italic = true
  }

  if (!bold && !italic) return null
  return {
    ...(bold ? { fontWeight: 'bold' as const } : null),
    ...(italic ? { fontStyle: 'italic' as const } : null),
  }
}

/**
 * Renders text so every character is represented by a font that actually
 * contains its glyph. Runs the primary font cannot render are rendered with
 * the registered DejaVu Sans glyph font instead of corrupting through the
 * built-in Helvetica (WinAnsi) fallback.
 */
export function PdfGlyphText({ value, style, ...rest }: PdfGlyphTextProps) {
  const text = value ?? ''
  const runs = splitGlyphRuns(text)
  const hasGlyphRun = runs.some((run) => run.glyphFont)

  if (!hasGlyphRun) {
    return React.createElement(Text, { style, ...rest }, text)
  }

  const glyphWeightStyle = resolveGlyphWeightStyle(style)

  return React.createElement(
    Text,
    { style, ...rest },
    runs.map((run, index) => {
      if (!run.glyphFont) return run.text

      return React.createElement(
        Text,
        {
          key: `glyph-${index}`,
          style: {
            fontFamily: PDF_GLYPH_FONT_FAMILY,
            ...(glyphWeightStyle || null),
          },
        },
        run.text,
      )
    }),
  )
}
