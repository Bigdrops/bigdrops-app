import React from 'react'
import type { CsrMaterialItem } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { Table, Row, Cell, View, Text } from '../primitives'
import { dash } from './csrPdfcnUtils'
import { distributePortraitMaterialColumns } from './csrPortraitMaterialsLayout'

const C = {
  ink: '#111111',
  muted: '#555555',
  zebra: '#EFEFEF',
  paper: '#ffffff',
}

const MaterialCard: React.FC<{ item: CsrMaterialItem; zebra: boolean }> = ({ item, zebra }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      minHeight: 38,
      backgroundColor: zebra ? C.zebra : C.paper,
    }}
  >
    <View style={{ width: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Courier', fontWeight: 700, fontSize: 7.2, color: C.paper }}>
        {dash(item.no)}
      </Text>
    </View>
    <View
      style={{
        flex: 1,
        padding: 5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={{ fontWeight: 700, fontSize: 7.8, lineHeight: 1.25, color: C.ink }}>
          {dash(item.description)}
        </Text>
        {item.partNo ? (
          <Text style={{ fontFamily: 'Courier', fontSize: 6.3, color: C.muted, marginTop: 2 }}>
            {item.partNo}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          marginTop: 5,
        }}
      >
        <Text style={{ fontFamily: 'Courier', fontWeight: 700, fontSize: 11, color: C.ink }}>
          {dash(item.qty)}
        </Text>
        {item.qty && item.unit ? (
          <Text
            style={{
              fontWeight: 700,
              fontSize: 6.4,
              color: C.ink,
              textTransform: 'uppercase',
              marginLeft: 3,
              paddingBottom: 1.5,
            }}
          >
            {item.unit}
          </Text>
        ) : null}
      </View>
    </View>
  </View>
)

/** A full-width single column fits the whole card on one line, so it stays compact. */
const MaterialCardRow: React.FC<{ item: CsrMaterialItem; zebra: boolean }> = ({ item, zebra }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      minHeight: 30,
      backgroundColor: zebra ? C.zebra : C.paper,
    }}
  >
    <View style={{ width: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Courier', fontWeight: 700, fontSize: 7.2, color: C.paper }}>
        {dash(item.no)}
      </Text>
    </View>
    <View
      style={{
        flex: 1,
        paddingHorizontal: 6,
        paddingVertical: 4,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 700, fontSize: 7.8, lineHeight: 1.25, color: C.ink }}>
          {dash(item.description)}
        </Text>
      </View>
      {item.partNo ? (
        <Text style={{ fontFamily: 'Courier', fontSize: 6.3, color: C.muted, marginLeft: 8 }}>{item.partNo}</Text>
      ) : null}
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', marginLeft: 8 }}>
        <Text style={{ fontFamily: 'Courier', fontWeight: 700, fontSize: 11, color: C.ink }}>
          {dash(item.qty)}
        </Text>
        {item.qty && item.unit ? (
          <Text
            style={{
              fontWeight: 700,
              fontSize: 6.4,
              color: C.ink,
              textTransform: 'uppercase',
              marginLeft: 3,
              paddingBottom: 1.5,
            }}
          >
            {item.unit}
          </Text>
        ) : null}
      </View>
    </View>
  </View>
)

/**
 * Portrait parts & materials schedule. A real table keeps the section heading
 * and the column dividers intact when the schedule continues onto a new A4
 * page; every row still renders one vertical card per occupied column.
 */
export const CsrPortraitMaterialsSchedule: React.FC<{
  materials: readonly CsrMaterialItem[]
  heading?: React.ReactNode
  tableHeading?: React.ReactNode
}> = ({ materials, heading, tableHeading }) => {
  const columns = distributePortraitMaterialColumns(materials)
  const count = materials.length

  if (count === 0) {
    return (
      <View>
        {heading}
        <View style={{ borderWidth: 2.2, borderColor: C.ink, backgroundColor: C.zebra, padding: 9 }}>
          <Text style={{ fontSize: 7.9, color: C.muted, fontStyle: 'italic' }}>
            No replacement parts or materials recorded for this service.
          </Text>
        </View>
      </View>
    )
  }

  const columnCount = columns.length
  const rowCount = Math.max(...columns.map((column) => column.length))

  return (
    <View>
      <Table>
        {tableHeading || heading ? (
          <Row header>
            <Cell colSpan={columnCount} style={{ borderTopWidth: 0 }}>
              {tableHeading ?? heading}
            </Cell>
          </Row>
        ) : null}
        {Array.from({ length: rowCount }, (_, rowIdx) => {
          const zebra = rowIdx % 2 === 1
          return (
            <Row key={rowIdx}>
              {Array.from({ length: columnCount }, (_, columnIdx) => {
                const item = columns[columnIdx][rowIdx]
                const isFirstRow = rowIdx === 0
                const isLastRow = rowIdx === rowCount - 1
                return (
                  <Cell
                    key={columnIdx}
                    style={{
                      flex: 1,
                      borderLeftWidth: columnIdx === 0 ? 2.2 : 1.4,
                      borderLeftColor: C.ink,
                      borderRightWidth: columnIdx === columnCount - 1 ? 2.2 : 0,
                      borderRightColor: C.ink,
                      borderTopWidth: isFirstRow ? 2.2 : 0.8,
                      borderTopColor: C.ink,
                      borderBottomWidth: isLastRow ? 2.2 : 0,
                      borderBottomColor: C.ink,
                    }}
                  >
                    {item ? (
                      columnCount === 1 ? (
                        <MaterialCardRow item={item} zebra={zebra} />
                      ) : (
                        <MaterialCard item={item} zebra={zebra} />
                      )
                    ) : (
                      <View
                        style={{
                          minHeight: columnCount === 1 ? 30 : 38,
                          backgroundColor: zebra ? C.zebra : C.paper,
                        }}
                      />
                    )}
                  </Cell>
                )
              })}
            </Row>
          )
        })}
      </Table>
    </View>
  )
}
