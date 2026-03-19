import React from '@react-pdf/renderer'
import { getPdfCellValue, getPdfColumns, type ColumnConfig, type InvoiceItem } from '@/domain/invoice'
import type { ComputedGroup, ComputedItem } from '@/lib/Calculations'
import type { PdfColumnDefinition } from '@/domain/invoice'

type RenderRow =
  | { type: 'group_header'; key: string; groupName: string }
  | { type: 'group_subtotal'; key: string; groupName: string; subtotal: number }
  | { type: 'group_end'; key: string }
  | { type: 'item'; key: string; rawItem: InvoiceItem; computedItem: ComputedItem }

type LegacyRenderRow =
  | { _type: 'group_header'; item: InvoiceItem }
  | { _type: 'group_subtotal'; name: string; subtotal: number }
  | { _type: 'group_end'; name?: string }
  | { _type: 'item'; item: InvoiceItem; amount: number; installValue?: number }

type BuildRowsArgs = {
  rawItems: InvoiceItem[]
  computedItems: ComputedItem[]
  groups: ComputedGroup[]
  groupMeta?: Record<string, { showSubtotal?: boolean }>
}

export function buildRenderRows({
  rawItems,
  computedItems,
  groups,
  groupMeta = {},
}: BuildRowsArgs): RenderRow[] {
  const rows: RenderRow[] = []
  const groupTotals = new Map(groups.map((group) => [group.group_id, group]))
  let activeGroupId: string | null = null
  let activeGroupName = ''

  const flushGroup = () => {
    if (!activeGroupId) return
    const meta = groupMeta[activeGroupId]
    const group = groupTotals.get(activeGroupId)
    if (meta?.showSubtotal && group) {
      rows.push({
        type: 'group_subtotal',
        key: `subtotal_${activeGroupId}`,
        groupName: activeGroupName,
        subtotal: Number(group.subtotal || 0),
      })
    }
    rows.push({ type: 'group_end', key: `end_${activeGroupId}` })
    activeGroupId = null
    activeGroupName = ''
  }

  rawItems.forEach((rawItem, index) => {
    if (rawItem.row_type === 'group_header') {
      flushGroup()
      activeGroupId = String(rawItem.group_id || '')
      activeGroupName = String(rawItem.group_name || `Group ${index + 1}`)
      rows.push({
        type: 'group_header',
        key: `header_${activeGroupId || index}`,
        groupName: activeGroupName,
      })
      return
    }

    const computedItem = computedItems[index]
    if (!computedItem || computedItem.row_type !== 'standard') return
    rows.push({
      type: 'item',
      key: String(rawItem.id || rawItem._uiKey || `item_${index}`),
      rawItem,
      computedItem,
    })
  })

  flushGroup()
  return rows
}

type RenderItemsTableArgs = {
  rawItems?: InvoiceItem[]
  computedItems?: ComputedItem[]
  groups?: ComputedGroup[]
  rows?: Array<RenderRow | LegacyRenderRow>
  columns?: PdfColumnDefinition[]
  columnConfig?: ColumnConfig[]
  groupMeta?: Record<string, { showSubtotal?: boolean }>
  mergeQtyUnit?: boolean
  styles: Record<string, any>
  getColumnStyle?: (column: PdfColumnDefinition, extra?: Record<string, unknown>) => Record<string, unknown>
  itemCounterRef?: { current: number }
  getDescriptionExtras?: (rawItem: InvoiceItem) => string[]
}

export function renderItemsTable({
  rawItems = [],
  computedItems = [],
  groups = [],
  rows,
  columns,
  columnConfig = [],
  groupMeta = {},
  mergeQtyUnit = false,
  styles,
  getColumnStyle,
  itemCounterRef,
  getDescriptionExtras,
}: RenderItemsTableArgs) {
  const resolvedColumns = columns || getPdfColumns(columnConfig)
  const resolvedRows = rows || buildRenderRows({ rawItems, computedItems, groups, groupMeta })
  let itemCount = itemCounterRef?.current || 0
  const columnStyle =
    getColumnStyle ||
    ((column: PdfColumnDefinition, extra: Record<string, unknown> = {}) => ({
      flex: column.pdfFlex,
      textAlign: column.align,
      ...extra,
    }))

  return (
    <React.View style={styles.table}>
      <React.View style={styles.tableHeader}>
        {resolvedColumns.map((column) => (
          <React.Text key={column.key} style={[styles.thText, columnStyle(column)]}>
            {column.label}
          </React.Text>
        ))}
      </React.View>

      {resolvedRows.map((row, index) => {
        if ('type' in row && row.type === 'group_header') {
          return (
            <React.View key={row.key} style={styles.groupRow} wrap={false}>
              <React.Text style={styles.groupText}>{row.groupName}</React.Text>
            </React.View>
          )
        }

        if ('_type' in row && row._type === 'group_header') {
          return (
            <React.View key={`header_${index}`} style={styles.groupRow} wrap={false}>
              <React.Text style={styles.groupText}>{row.item.group_name}</React.Text>
            </React.View>
          )
        }

        if ('type' in row && row.type === 'group_subtotal') {
          return (
            <React.View key={row.key} style={styles.groupSubtotalRow} wrap={false}>
              <React.Text style={styles.groupSubtotalLabel}>{row.groupName} - Section Total</React.Text>
              <React.Text style={styles.groupSubtotalValue}>NGN {row.subtotal.toLocaleString()}</React.Text>
            </React.View>
          )
        }

        if ('_type' in row && row._type === 'group_subtotal') {
          return (
            <React.View key={`subtotal_${index}`} style={styles.groupSubtotalRow} wrap={false}>
              <React.Text style={styles.groupSubtotalLabel}>{row.name} - Section Total</React.Text>
              <React.Text style={styles.groupSubtotalValue}>NGN {row.subtotal.toLocaleString()}</React.Text>
            </React.View>
          )
        }

        if (('type' in row && row.type === 'group_end') || ('_type' in row && row._type === 'group_end')) {
          return (
            <React.View
              key={'type' in row ? row.key : `group_end_${index}`}
              style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 8, marginBottom: 4 }}
              wrap={false}
            />
          )
        }

        itemCount += 1
        if (itemCounterRef) {
          itemCounterRef.current = itemCount
        }
        const rowStyle = itemCount % 2 === 0 ? styles.tableRowAlt : styles.tableRow
        const rawItem = 'type' in row ? row.rawItem : row.item
        const amount = 'type' in row ? row.computedItem.line_subtotal : row.amount
        const installValue = 'type' in row ? row.computedItem.line_install : row.installValue

        return (
          <React.View key={('type' in row ? row.key : `item_${index}`) || index} style={rowStyle} wrap={false}>
            {resolvedColumns.map((column) => {
              if (column.key === 'num') {
                return (
                  <React.Text
                    key={column.key}
                    style={[columnStyle(column), { color: '#999', alignSelf: 'flex-start' }]}
                  >
                    {itemCount}
                  </React.Text>
                )
              }

              if (column.key === 'description') {
                return (
                  <React.View key={column.key} style={columnStyle(column, { alignSelf: 'flex-start' })}>
                    <React.Text style={styles.descText}>{rawItem.description}</React.Text>
                    {rawItem.sub_description ? (
                      <React.Text style={styles.subDescText}>{rawItem.sub_description}</React.Text>
                    ) : null}
                    {getDescriptionExtras
                      ? getDescriptionExtras(rawItem).map((line, lineIndex) => (
                          <React.Text key={`${column.key}_extra_${lineIndex}`} style={styles.subDescText}>
                            {line}
                          </React.Text>
                        ))
                      : null}
                  </React.View>
                )
              }

              if (mergeQtyUnit && column.key === 'quantity') {
                const qty = Number(rawItem.quantity || 0).toLocaleString()
                const unit = String(rawItem.unit || '').trim()
                return (
                  <React.Text
                    key={column.key}
                    style={[columnStyle(column, { alignSelf: 'flex-start', color: '#555' })]}
                  >
                    {unit ? `${qty} ${unit}` : qty}
                  </React.Text>
                )
              }

              if (mergeQtyUnit && column.key === 'unit') {
                return null
              }

              return (
                <React.Text
                  key={column.key}
                  style={[
                    columnStyle(column, {
                      alignSelf: 'flex-start',
                      color: column.align === 'right' ? '#1a1a1a' : '#555',
                    }),
                  ]}
                >
                  {getPdfCellValue(column, rawItem, {
                    amount,
                    installValue,
                  })}
                </React.Text>
              )
            })}
          </React.View>
        )
      })}
    </React.View>
  )
}
