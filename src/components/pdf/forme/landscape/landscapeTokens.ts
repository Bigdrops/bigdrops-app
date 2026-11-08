import { isFormeSupportedFamily } from '../fonts'
import type { CommercialDocumentData } from '../../industryAdapter'

/**
 * Technical blueprint palette sampled from CSR Blueprint Landscape
 * (csr-blueprint-technical-drawinglandscape.html).
 */
export const LANDSCAPE_TOKENS = {
  navy: '#07192b',
  cobalt: '#0f3156',
  blue: '#1d568a',
  cyanDim: '#4678a3',
  slate: '#4f667a',
  lineHeavy: '#07192b',
  lineMed: '#29527a',
  line: '#9cb4c9',
  grid: '#dce6ef',
  tint: '#edf3f8',
  tint2: '#dde8f2',
  amber: '#b84a14',
  amberSoft: '#fbeee8',
  paper: '#ffffff',
  inkSoft: '#3f5670',
  rowTint: '#f7fafc',
  headerInk: '#dbe8f2',
  deductionRed: '#b42318',
  okGreen: '#135c47',
} as const

export const PAGE_WIDTH = 841.89
export const PAGE_HEIGHT = 595.28
export const MARGIN_H = 22
export const MARGIN_V = 16
export const TABLE_BORDER = 0.71

export type LandscapeScale = {
  font: string
  compact: boolean
  body: number
  bodySmall: number
  micro: number
  title: number
  number: number
  hero: number
  pad: (value: number) => number
  gap: (value: number) => number
}

export function createScale(font: string, compact: boolean): LandscapeScale {
  const size = (base: number) => Math.round((compact ? base * 0.9 : base) * 10) / 10
  return {
    font,
    compact,
    body: size(6.5),
    bodySmall: size(5.8),
    micro: size(4.9),
    title: size(18),
    number: size(12),
    hero: size(16),
    pad: (value: number) => (compact ? Math.max(1, Math.round(value * 0.75 * 2) / 2) : value),
    gap: (value: number) => (compact ? Math.max(2, Math.round(value * 0.72)) : value),
  }
}

export function resolveFont(choice: string | null | undefined, fallback: string): string {
  return choice && isFormeSupportedFamily(choice) ? choice : fallback
}

export function hasText(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

export type Block = {
  key: string
  weight: number
  node: React.ReactNode
}

export function weightedColumnWidths(blocks: Block[], width: number) {
  const totalWeight = blocks.reduce((sum, block) => sum + block.weight, 0)
  let consumed = 0
  return blocks.map((block, index) => {
    if (index === blocks.length - 1) return { width: { fixed: Math.round((width - consumed) * 100) / 100 } }
    const value = Math.round(((width * block.weight) / totalWeight) * 100) / 100
    consumed += value
    return { width: { fixed: value } }
  })
}

/** Formats merged quantity string like "1set" into "1 set" for presentation */
export function formatPresentationQuantity(raw: string): string {
  const match = raw.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/)
  if (match) {
    return `${match[1]} ${match[2]}`
  }
  return raw
}
