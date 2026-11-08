import React from 'react'
import { Cell, Image, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../../industryAdapter'
import { glyphRuns } from '../glyphs'
import { parseGroupHeader } from '../industrialLayout'
import {
  type CommercialSegment,
} from '../commercialSegments'

type CommercialRow = CommercialDocumentData['table']['rows'][number]
import {
  resolveCellAlign,
  readDescription,
  displayCellValue,
} from '../commercialLayout'
import {
  LANDSCAPE_TOKENS as C,
  type LandscapeScale,
  formatPresentationQuantity,
  hasText,
} from './landscapeTokens'

function CellText({
  value,
  scale,
  align = 'left',
  bold = false,
  color = C.navy,
  isMono = false,
}: {
  value: unknown
  scale: LandscapeScale
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  color?: string
  isMono?: boolean
}) {
  const str = value === null || value === undefined ? '' : String(value)
  const formatted = formatPresentationQuantity(str)
  return (
    <Text
      style={{
        fontFamily: scale.font,
        fontSize: scale.bodySmall,
        fontWeight: bold ? 700 : 400,
        color,
        textAlign: align,
        lineHeight: 1.3,
        letterSpacing: isMono ? 0.3 : 0,
      }}
    >
      {glyphRuns(formatted, scale.font)}
    </Text>
  )
}

function ItemRow({
  row,
  columns,
  scale,
  rowIndex,
}: {
  row: CommercialRow
  columns: CommercialDocumentData['table']['columns']
  scale: LandscapeScale
  rowIndex: number
}) {
  const isEven = rowIndex % 2 === 0
  const rawRow = row as Record<string, unknown>
  const rawDesc = row.cells?.description ?? rawRow.description
  const parsedDesc = readDescription(rawDesc)
  const mainDesc = parsedDesc.main || (typeof rawRow.description === 'string' ? rawRow.description : '')
  const secondaryDesc = parsedDesc.sub || (typeof rawRow.subDescription === 'string' ? rawRow.subDescription : '')

  return (
    <Row
      style={{
        backgroundColor: isEven ? C.paper : C.rowTint,
        borderBottomWidth: 0.35,
        borderBottomColor: C.grid,
      }}
    >
      {columns.map((column, colIndex) => {
        const align = resolveCellAlign(column)
        const isLast = colIndex === columns.length - 1
        const isNum = column.key === 'num'
        const isDesc = column.key === 'description'
        const isPriceOrAmt = column.key === 'unit_price' || column.key === 'amount'

        let content: React.ReactNode = null
        if (isDesc) {
          content = (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {row.imageUrl ? (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 0.3,
                    borderColor: C.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                    backgroundColor: C.paper,
                  }}
                >
                  <Image src={row.imageUrl} style={{ width: 18, height: 18 }} alt="" />
                </View>
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: scale.font,
                    fontSize: scale.body,
                    fontWeight: 700,
                    color: C.navy,
                    lineHeight: 1.25,
                  }}
                >
                  {glyphRuns(mainDesc, scale.font)}
                </Text>
                {secondaryDesc ? (
                  <Text
                    style={{
                      fontFamily: scale.font,
                      fontSize: scale.bodySmall - 0.3,
                      color: C.slate,
                      marginTop: 1.5,
                      lineHeight: 1.3,
                    }}
                  >
                    {glyphRuns(secondaryDesc, scale.font)}
                  </Text>
                ) : null}
              </View>
            </View>
          )
        } else {
          const cellVal = (row.cells && row.cells[column.key]) !== undefined
            ? row.cells[column.key]
            : (row as any)[column.key]
          const rawValue = displayCellValue(cellVal)
          content = (
            <CellText
              value={rawValue}
              scale={scale}
              align={align}
              bold={isPriceOrAmt}
              color={isPriceOrAmt ? C.navy : C.inkSoft}
              isMono={isPriceOrAmt || column.key === 'quantity'}
            />
          )
        }

        return (
          <Cell
            key={`cell-${column.key}-${colIndex}`}
            style={{
              paddingTop: scale.pad(5),
              paddingBottom: scale.pad(5),
              paddingLeft: scale.pad(isNum ? 3 : 6),
              paddingRight: scale.pad(6),
              borderRightWidth: isLast ? 0 : 0.35,
              borderRightColor: C.grid,
              justifyContent: 'center',
            }}
          >
            {content}
          </Cell>
        )
      })}
    </Row>
  )
}

export function ItemsTable({
  segment,
  data,
  tableColumns,
  scale,
  accent,
  showBand,
  bandMeta,
}: {
  segment: CommercialSegment
  data: CommercialDocumentData
  tableColumns: Array<{ width: { fixed: number } }>
  scale: LandscapeScale
  accent: string
  showBand: boolean
  bandMeta: string
}) {
  const parsed = segment.groupLabel ? parseGroupHeader(segment.groupLabel) : null
  const groupTitle = parsed?.title || segment.groupLabel || ''
  const groupKey = parsed?.key || null

  return (
    <Table
      columns={tableColumns}
      style={{
        borderWidth: 0.71,
        borderColor: C.navy,
        marginBottom: scale.gap(6),
      }}
    >
      {/* Repeating Table Header */}
      <Row
        header
        style={{
          backgroundColor: C.tint2,
          borderBottomWidth: 0.8,
          borderBottomColor: C.lineMed,
        }}
      >
        {data.table.columns.map((column, index) => {
          const align = resolveCellAlign(column)
          const isLast = index === data.table.columns.length - 1
          return (
            <Cell
              key={`th-${column.key}-${index}`}
              style={{
                paddingTop: scale.pad(4),
                paddingBottom: scale.pad(4),
                paddingLeft: scale.pad(6),
                paddingRight: scale.pad(6),
                borderRightWidth: isLast ? 0 : 0.4,
                borderRightColor: C.line,
              }}
            >
              <Text
                style={{
                  fontFamily: scale.font,
                  fontSize: scale.micro,
                  fontWeight: 700,
                  color: C.cobalt,
                  textAlign: align,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {column.label}
              </Text>
            </Cell>
          )
        })}
      </Row>

      {/* Group Header Band if segment has group */}
      {segment.groupLabel ? (
        <Row
          style={{
            backgroundColor: C.tint,
            borderBottomWidth: 0.6,
            borderBottomColor: C.lineMed,
          }}
        >
          <Cell
            colSpan={data.table.columns.length}
            style={{
              paddingTop: scale.pad(4),
              paddingBottom: scale.pad(4),
              paddingLeft: scale.pad(8),
              paddingRight: scale.pad(8),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {groupKey ? (
                <View
                  style={{
                    backgroundColor: C.cobalt,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    marginRight: 6,
                  }}
                >
                  <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, color: '#FFFFFF' }}>
                    {groupKey}
                  </Text>
                </View>
              ) : null}
              <Text
                style={{
                  fontFamily: scale.font,
                  fontSize: scale.bodySmall + 0.3,
                  fontWeight: 700,
                  color: C.navy,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {glyphRuns(groupTitle, scale.font)}
              </Text>
            </View>
          </Cell>
        </Row>
      ) : null}

      {/* Items Rows */}
      {segment.lines.map((row, index) => (
        <ItemRow
          key={`row-${index}-${row.cells?.num || index}`}
          row={row}
          columns={data.table.columns}
          scale={scale}
          rowIndex={index}
        />
      ))}

      {/* Group Subtotal Row if present */}
      {segment.footer ? (
        <Row
          style={{
            backgroundColor: C.tint,
            borderTopWidth: 0.8,
            borderTopColor: C.cobalt,
            borderBottomWidth: 0.8,
            borderBottomColor: C.cobalt,
          }}
        >
          <Cell
            colSpan={data.table.columns.length - 1}
            style={{
              paddingTop: scale.pad(4),
              paddingBottom: scale.pad(4),
              paddingRight: scale.pad(8),
              textAlign: 'right',
            }}
          >
            <Text
              style={{
                fontFamily: scale.font,
                fontSize: scale.bodySmall,
                fontWeight: 700,
                color: C.cobalt,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {glyphRuns(segment.footer.groupSubtotalLabel || 'Subtotal', scale.font)}
            </Text>
          </Cell>
          <Cell
            style={{
              paddingTop: scale.pad(4),
              paddingBottom: scale.pad(4),
              paddingRight: scale.pad(6),
              textAlign: 'right',
            }}
          >
            <Text
              style={{
                fontFamily: scale.font,
                fontSize: scale.bodySmall + 0.2,
                fontWeight: 700,
                color: C.navy,
              }}
            >
              {glyphRuns(segment.footer.groupSubtotalValue || '', scale.font)}
            </Text>
          </Cell>
        </Row>
      ) : null}
    </Table>
  )
}
