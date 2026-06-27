type IndustryColumn = {
  key: string
  align?: string
  width?: number
  flex?: number
  dataType?: string | null
}

const TEXT_RIGHT = { textAlign: 'right' as const }
const TEXT_CENTER = { textAlign: 'center' as const }

export function resolveTextAlignmentStyle(column: IndustryColumn) {
  if (column.align === 'right') return TEXT_RIGHT
  if (column.align === 'center') return TEXT_CENTER
  return null
}
