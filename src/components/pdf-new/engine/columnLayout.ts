type ColumnInput = {
  key: string
  width?: number
  flex?: number
}

type ColumnLayout = {
  width: number | null
  flexGrow: number
  flexShrink: number
  flexBasis: number
}

export function resolveColumnLayout(
  column: ColumnInput,
  overrides?: Record<string, { width?: number; flex?: number }>
): ColumnLayout {
  const override = overrides?.[column.key] || {}
  const width = Number(column.width ?? override.width ?? 0)
  const flex = Number(column.flex ?? override.flex ?? 1)

  if (width > 0) {
    return {
      width,
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 0,
    }
  }

  return {
    width: null,
    flexGrow: flex,
    flexShrink: 1,
    flexBasis: 0,
  }
}
