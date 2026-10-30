import React from 'react'
import type { CsrMaterialItem } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { View, Text, Table, Row, Cell } from '../primitives'
import {
  dash,
  formatQuantity,
  getAdaptiveMaterialColumns,
  type CsrOrientation,
} from './csrPdfcnUtils'

export interface MaterialsTheme {
  readonly border: string
  readonly headerBg: string
  readonly headerText: string
  readonly rule: string
  readonly zebra: string
  readonly paper: string
  readonly text: string
  readonly muted: string
  readonly accent: string
  readonly divider: string
}

interface MaterialsScheduleProps {
  materials: readonly CsrMaterialItem[]
  orientation: CsrOrientation
  theme: MaterialsTheme
}

const NO_WIDTH = 22

/** Multi-column rows stay single-line: the part number trails the description. */
const materialDescription = (item: CsrMaterialItem): string =>
  item.partNo ? `${dash(item.description)}  ·  ${item.partNo}` : dash(item.description)

/**
 * Shared, content-aware materials schedule. The column count comes from
 * `getAdaptiveMaterialColumns`; item order and identity are never altered.
 *
 * - One list uses a real table so its header repeats on continuation pages.
 * - Multi-column layouts use aligned rows: row i holds the i-th entry of
 *   every column, so a wrapped description never shifts a neighbouring column.
 */
export const CsrMaterialsSchedule: React.FC<MaterialsScheduleProps> = ({ materials, orientation, theme }) => {
  const adaptive = getAdaptiveMaterialColumns(materials, orientation)
  const t = theme

  if (adaptive.layoutMode === 'empty') {
    return (
      <View style={{ padding: 10, backgroundColor: t.zebra, alignItems: 'center' }}>
        <Text style={{ fontSize: 8.5, color: t.muted, fontStyle: 'italic' }}>
          No replacement parts or materials recorded for this service.
        </Text>
      </View>
    )
  }

  const headStyle = { fontSize: 7, fontWeight: 700 as const, color: t.headerText, letterSpacing: 0.3 }
  const outerFrame = {
    borderTopWidth: 0.8,
    borderTopColor: t.border,
  }

  if (adaptive.layoutMode === 'single') {
    const items = adaptive.columns[0]
    return (
      <Table>
        <Row header style={{ backgroundColor: t.headerBg, ...outerFrame }}>
          <Cell style={{ width: 34, padding: 4.5, borderLeftWidth: 0.8, borderLeftColor: t.border }}>
            <Text style={headStyle}>NO</Text>
          </Cell>
          <Cell style={{ flex: 1, padding: 4.5 }}>
            <Text style={headStyle}>DESCRIPTION</Text>
          </Cell>
          {adaptive.hasPartNo ? (
            <Cell style={{ width: 110, padding: 4.5 }}>
              <Text style={headStyle}>PART NUMBER</Text>
            </Cell>
          ) : null}
          <Cell
            style={{
              width: 90,
              padding: 4.5,
              alignItems: 'flex-end',
              borderRightWidth: 0.8,
              borderRightColor: t.border,
            }}
          >
            <Text style={headStyle}>QUANTITY</Text>
          </Cell>
        </Row>
        {items.map((item, rowIdx) => {
          const isLast = rowIdx === items.length - 1
          return (
            <Row
              key={`${item.no}-${rowIdx}`}
              style={{
                backgroundColor: rowIdx % 2 === 1 ? t.zebra : t.paper,
                borderBottomWidth: isLast ? 0.8 : 0.5,
                borderBottomColor: isLast ? t.border : t.rule,
              }}
            >
              <Cell style={{ width: 34, padding: 4.5, borderLeftWidth: 0.8, borderLeftColor: t.border }}>
                <Text style={{ fontSize: 9, fontWeight: 700, color: t.accent }}>{item.no}</Text>
              </Cell>
              <Cell style={{ flex: 1, padding: 4.5 }}>
                <Text style={{ fontSize: 9.5, color: t.text }}>{dash(item.description)}</Text>
              </Cell>
              {adaptive.hasPartNo ? (
                <Cell style={{ width: 110, padding: 4.5 }}>
                  <Text style={{ fontSize: 9, color: t.muted }}>{dash(item.partNo)}</Text>
                </Cell>
              ) : null}
              <Cell
                style={{
                  width: 90,
                  padding: 4.5,
                  alignItems: 'flex-end',
                  borderRightWidth: 0.8,
                  borderRightColor: t.border,
                }}
              >
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: t.text }}>{formatQuantity(item)}</Text>
              </Cell>
            </Row>
          )
        })}
      </Table>
    )
  }

  const groups = adaptive.columns
  const rowCount = Math.max(...groups.map((group) => group.length))
  const dense = adaptive.colCount >= 4
  const bodySize = dense ? 8 : 8.5
  const qtyWidth = dense ? 50 : 58
  const pad = dense ? 3.5 : 4
  const dividerFor = (g: number) => ({
    ...(g === 0
      ? { borderLeftWidth: 0.8, borderLeftColor: t.border }
      : { borderLeftWidth: 0.8, borderLeftColor: t.divider }),
    ...(g === groups.length - 1 ? { borderRightWidth: 0.8, borderRightColor: t.border } : {}),
  })

  return (
    <Table>
      <Row header style={{ backgroundColor: t.headerBg, ...outerFrame }}>
        {groups.map((_, g) => (
          <Cell key={`h-${g}`} style={{ flex: 1, padding: pad, ...dividerFor(g) }}>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <Text style={{ ...headStyle, width: NO_WIDTH }}>NO</Text>
              <Text style={{ ...headStyle, flex: 1 }}>DESCRIPTION</Text>
              <Text style={{ ...headStyle, width: qtyWidth, textAlign: 'right' }}>QTY</Text>
            </View>
          </Cell>
        ))}
      </Row>
      {Array.from({ length: rowCount }, (_, rowIdx) => (
        <Row
          key={rowIdx}
          style={{
            backgroundColor: rowIdx % 2 === 1 ? t.zebra : t.paper,
            borderBottomWidth: rowIdx === rowCount - 1 ? 0.8 : 0.5,
            borderBottomColor: rowIdx === rowCount - 1 ? t.border : t.rule,
          }}
        >
          {groups.map((group, g) => {
            const item = group[rowIdx]
            return (
              <Cell key={`c-${g}`} style={{ flex: 1, padding: pad, ...dividerFor(g) }}>
                <View style={{ display: 'flex', flexDirection: 'row' }}>
                  <Text style={{ fontSize: bodySize, fontWeight: 700, color: t.accent, width: NO_WIDTH }}>
                    {item ? item.no : ' '}
                  </Text>
                  <Text style={{ flex: 1, fontSize: bodySize, color: t.text }}>
                    {item ? materialDescription(item) : ' '}
                  </Text>
                  <Text
                    style={{ fontSize: bodySize, fontWeight: 700, color: t.text, width: qtyWidth, textAlign: 'right' }}
                  >
                    {item ? formatQuantity(item) : ' '}
                  </Text>
                </View>
              </Cell>
            )
          })}
        </Row>
      ))}
    </Table>
  )
}
