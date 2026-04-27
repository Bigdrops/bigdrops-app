type TemplateTableColumn = {
  key: string
  width?: number
  flex?: number
}

export function resolveTemplateTableColumnStyle(column: TemplateTableColumn) {
  const width = Number(column.width || 0)
  if (width > 0) {
    return {
      width,
      flexGrow: 0,
      flexShrink: 0,
    }
  }

  return {
    flexBasis: 0,
    flexGrow: Number(column.flex || 1),
    flexShrink: 1,
  }
}

export function isTightTokenColumn(columnKey: string) {
  return columnKey === 'quantity' || columnKey === 'unit'
}

export function keepPdfWordUnbroken(word: string) {
  return [word]
}
