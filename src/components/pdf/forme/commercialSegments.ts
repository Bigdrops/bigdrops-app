import type { CommercialDocumentData } from '../industryAdapter'

export type CommercialRow = CommercialDocumentData['table']['rows'][number]

export type CommercialSegment = {
  key: string
  groupLabel: string | null
  groupHeader: CommercialRow | null
  lines: CommercialRow[]
  footer: CommercialRow | null
}

/**
 * Split adapter rows into ungrouped runs and grouped blocks. Each group block
 * keeps its own rows so a template can render it as a separate table whose
 * header (including the real group name) repeats when the block continues.
 */
export function segmentCommercialRows(rows: CommercialRow[]): CommercialSegment[] {
  const segments: CommercialSegment[] = []
  let current: CommercialSegment | null = null

  const flush = () => {
    if (current && (current.groupHeader || current.lines.length > 0 || current.footer)) {
      segments.push(current)
    }
    current = null
  }

  rows.forEach((row, index) => {
    if (row.isGroupHeader) {
      flush()
      current = {
        key: `group-${index}`,
        groupLabel: row.groupName || row.groupLabel || null,
        groupHeader: row,
        lines: [],
        footer: null,
      }
      return
    }

    if (row.isGroupFooter) {
      if (current) {
        current.footer = row
        flush()
      }
      return
    }

    if (!current) {
      current = {
        key: `run-${index}`,
        groupLabel: null,
        groupHeader: null,
        lines: [],
        footer: null,
      }
    }
    current.lines.push(row)
  })

  flush()
  return segments
}

export function countSegmentLines(segments: CommercialSegment[]): number {
  return segments.reduce((total, segment) => total + segment.lines.length, 0)
}

export function countSegmentsWithGroups(segments: CommercialSegment[]): number {
  return segments.filter((segment) => segment.groupHeader).length
}

/** Split plain text into non-empty paragraphs without inventing content. */
export function splitTextLines(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}
