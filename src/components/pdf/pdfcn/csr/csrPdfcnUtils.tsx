import React from 'react'
import type {
  CanonicalPreparedCsr,
  CsrMaterialItem,
  CsrOperationalReadings,
} from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { Image, View } from '../primitives'

export type CsrOrientation = 'portrait' | 'landscape'

export interface AdaptiveMaterialsResult {
  columns: CsrMaterialItem[][]
  colCount: number
  layoutMode: 'empty' | 'single' | 'dual' | 'triple' | 'quad'
  /** True when at least one item carries a part number (single-list layout shows the column only then). */
  hasPartNo: boolean
}

/** Description length above which narrow columns start to hurt readability. */
const LONG_DESCRIPTION_CHARS: Record<CsrOrientation, number> = {
  landscape: 40,
  portrait: 30,
}

function pickColumnCount(count: number, orientation: CsrOrientation, longestDescription: number): number {
  if (count === 0) return 0
  if (count <= 3) return 1

  let columns: number
  if (orientation === 'portrait') {
    if (count <= 5) columns = 1
    else if (count <= 12) columns = 2
    else if (count <= 18) columns = 3
    else columns = 4
  } else if (count <= 8) {
    columns = 2
  } else if (count <= 12) {
    columns = 3
  } else {
    columns = 4
  }

  // Long descriptions need wider columns; extra rows are cheaper than cramped text.
  if (columns > 2 && longestDescription > LONG_DESCRIPTION_CHARS[orientation]) {
    columns -= 1
  }
  return columns
}

/**
 * Content-aware materials partitioner. Column count follows the real item
 * count, the page orientation and the longest description. It never drops,
 * duplicates or renames an item.
 *
 * - 1-3 items: one list.
 * - 4-8 items: one list (portrait, up to 5) or two sequential columns.
 * - 9+ items: more columns as capacity requires.
 * - Two columns split in source order (first half, second half).
 * - Three or more columns read vertically in interleaved order, so four
 *   columns hold 01,05,09,... / 02,06,10,... / 03,07,11,... / 04,08,12,...
 */
export function getAdaptiveMaterialColumns(
  materials: readonly CsrMaterialItem[],
  orientation: CsrOrientation,
): AdaptiveMaterialsResult {
  const count = materials.length
  const hasPartNo = materials.some((item) => Boolean(item.partNo))
  if (count === 0) {
    return { columns: [], colCount: 0, layoutMode: 'empty', hasPartNo }
  }

  const longest = materials.reduce((max, item) => Math.max(max, item.description.length), 0)
  const colCount = pickColumnCount(count, orientation, longest)

  if (colCount === 1) {
    return { columns: [Array.from(materials)], colCount: 1, layoutMode: 'single', hasPartNo }
  }

  if (colCount === 2) {
    const half = Math.ceil(count / 2)
    return {
      columns: [materials.slice(0, half), materials.slice(half)],
      colCount: 2,
      layoutMode: 'dual',
      hasPartNo,
    }
  }

  const columns: CsrMaterialItem[][] = Array.from({ length: colCount }, () => [])
  materials.forEach((item, index) => {
    columns[index % colCount].push(item)
  })

  return {
    columns,
    colCount,
    layoutMode: colCount === 3 ? 'triple' : 'quad',
    hasPartNo,
  }
}

/** Placeholder for a recorded-but-empty value in a labelled field. */
export function dash(value: string | null | undefined): string {
  const text = value == null ? '' : String(value).trim()
  return text.length > 0 ? text : '-'
}

export function formatQuantity(item: CsrMaterialItem): string {
  return [item.qty, item.unit].filter(Boolean).join(' ') || '-'
}

export function formatMakeModel(equipment: CanonicalPreparedCsr['equipment']): string {
  return dash([equipment.make, equipment.model].filter(Boolean).join(' '))
}

/** One date when the service started and ended on the same day, otherwise the period. */
export function formatServiceDate(window: CanonicalPreparedCsr['serviceWindow'], fallbackDate: string): string {
  const start = window.startDate || fallbackDate
  const end = window.endDate || start
  if (!start && !end) return '-'
  return start === end || !end ? start : `${start} to ${end}`
}

export interface ReadingField {
  readonly key: keyof CsrOperationalReadings
  readonly label: string
}

/** Presentation labels for the six recorded channels. Values are shown exactly as recorded. */
export const READING_FIELDS: readonly ReadingField[] = [
  { key: 'voltage', label: 'GEN. VOLTAGE (V)' },
  { key: 'frequency', label: 'FREQUENCY (Hz)' },
  { key: 'battery', label: 'BATTERY / ALT. (Vdc)' },
  { key: 'temperature', label: 'TEMPERATURE (\u00b0C)' },
  { key: 'pressure', label: 'PRESSURE' },
  { key: 'hours', label: 'ENGINE HOURS' },
]

export function isCompleteStatus(status: string): boolean {
  return /^(complete|completed)$/i.test(status.trim())
}

/**
 * Brand logo renderer. Renders only an uploaded company logo. Without one it
 * renders nothing, so no other provider's mark can appear on a report.
 */
export const BrandLogo: React.FC<{
  logoUrl?: string | null
  width?: number
  height?: number
}> = ({ logoUrl, width, height }) => {
  if (!logoUrl) return null
  // A height-only Image keeps the file's own aspect ratio: wide lockups stay
  // wide, tall marks stay tall, and nothing is squeezed into a square.
  if (height !== undefined && width === undefined) {
    return <Image src={logoUrl} height={height} style={{ height }} />
  }
  const resolvedWidth = width ?? 24
  if (height === undefined) {
    return <Image src={logoUrl} width={resolvedWidth} style={{ width: resolvedWidth }} />
  }
  return (
    <Image
      src={logoUrl}
      width={resolvedWidth}
      height={height}
      style={{ width: resolvedWidth, height }}
    />
  )
}

/**
 * Signature stage renderer:
 * - If signature image URL is provided, renders the signature image.
 * - Otherwise, provides a clean blank writable line for physical handwritten completion.
 */
export const SignatureStage: React.FC<{
  signatureUrl?: string | null
  height?: number
  lineColor?: string
}> = ({ signatureUrl, height = 22, lineColor = '#111111' }) => {
  if (signatureUrl) {
    return (
      <View
        style={{
          height,
          borderBottomWidth: 0.8,
          borderBottomColor: lineColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 2,
        }}
      >
        <Image
          src={signatureUrl}
          height={height - 4}
          style={{ height: height - 4 }}
        />
      </View>
    )
  }

  return (
    <View
      style={{
        height,
        borderBottomWidth: 0.8,
        borderBottomColor: lineColor,
        backgroundColor: '#ffffff',
      }}
    />
  )
}
