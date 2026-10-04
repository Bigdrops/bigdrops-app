import React from 'react'
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { CpsPdfModel } from '../types'
import { safeText } from '../core/safeText'

const INK = '#101828'
const MUTED = '#667085'
const LINE = 'rgba(16, 24, 40, .12)'
const SOFT = '#f2f4f7'
const BRAND = '#175cd3'
const COST = '#b54708'
const SELL = '#067647'

function money(value: number): string {
  return '₦' + Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9,
    color: INK,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  companyName: {
    fontSize: 13,
    fontWeight: 700,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    marginTop: 2,
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  metaNumber: {
    fontSize: 10,
    fontWeight: 700,
  },
  metaLine: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },
  status: {
    fontSize: 8,
    fontWeight: 700,
    marginTop: 4,
  },
  partyRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  partyBox: {
    flex: 1,
  },
  partyTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    marginBottom: 3,
  },
  partyName: {
    fontSize: 10,
    fontWeight: 700,
  },
  partyLine: {
    fontSize: 8,
    color: MUTED,
    marginTop: 1,
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 5,
    marginBottom: 2,
  },
  headCell: {
    fontSize: 7.5,
    fontWeight: 700,
    color: MUTED,
  },
  groupBand: {
    backgroundColor: SOFT,
    borderRadius: 4,
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: BRAND,
  },
  groupSubtotal: {
    fontSize: 8,
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  cellNo: {
    width: 24,
    fontSize: 8,
    color: MUTED,
  },
  cellDesc: {
    flex: 1,
    paddingRight: 6,
  },
  cellTitle: {
    fontSize: 9,
    fontWeight: 700,
  },
  cellSub: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 1,
  },
  cellQty: {
    width: 52,
    fontSize: 8,
    textAlign: 'right',
  },
  cellMoney: {
    width: 64,
    fontSize: 8,
    textAlign: 'right',
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginTop: 3,
  },
  totals: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 8.5,
    color: MUTED,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 700,
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  grandValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  notes: {
    marginTop: 10,
    fontSize: 8,
    color: MUTED,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: INK,
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: MUTED,
  },
})

export default function CpsSchedule({ data }: { data: CpsPdfModel }) {
  const font = data.documentFont || 'Inter'
  const fontStyle = { fontFamily: font }
  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            {data.company.logoUrl ? (
              <Image src={data.company.logoUrl} style={styles.logo} />
            ) : null}
            <View>
              {data.company.name ? (
                <Text style={[styles.companyName, fontStyle]}>{safeText(data.company.name)}</Text>
              ) : null}
              <Text style={[styles.title, fontStyle]}>{safeText(data.identity.title)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.metaRight}>
          <Text style={[styles.metaNumber, fontStyle]}>{safeText(data.identity.number)}</Text>
          <Text style={styles.metaLine}>Issued {safeText(data.identity.issueDate)}</Text>
          <Text style={styles.status}>{safeText(data.identity.status)}</Text>
        </View>
      </View>

      <View style={styles.partyRow}>
        <View style={styles.partyBox}>
          <Text style={styles.partyTitle}>Bill To</Text>
          <Text style={[styles.partyName, fontStyle]}>{safeText(data.client.name)}</Text>
          {data.client.contactPerson ? (
            <Text style={styles.partyLine}>{safeText(data.client.contactPerson)}</Text>
          ) : null}
          {[data.client.phone, data.client.email].filter(Boolean).join(' · ') ? (
            <Text style={styles.partyLine}>
              {safeText([data.client.phone, data.client.email].filter(Boolean).join(' · '))}
            </Text>
          ) : null}
          {data.client.city ? (
            <Text style={styles.partyLine}>{safeText(data.client.city)}</Text>
          ) : null}
        </View>
        {data.site ? (
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>Site / Project</Text>
            <Text style={[styles.partyName, fontStyle]}>{safeText(data.site)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tableHead}>
        <Text style={[styles.cellNo, styles.headCell]}>No</Text>
        <Text style={[styles.cellDesc, styles.headCell]}>Description</Text>
        <Text style={[styles.cellQty, styles.headCell]}>Qty</Text>
        <Text style={[styles.cellMoney, styles.headCell]}>CP</Text>
        <Text style={[styles.cellMoney, styles.headCell]}>SP</Text>
        <Text style={[styles.cellMoney, styles.headCell]}>Total</Text>
      </View>

      {data.rows.map((row) => {
        if (row.kind === 'group') {
          const group = row.groupId
            ? data.groups.find((entry) => entry.id === row.groupId)
            : undefined
          return (
            <View key={row.key} style={styles.groupBand} wrap={false}>
              <Text style={[styles.groupTitle, fontStyle]}>{safeText(row.title)}</Text>
              {group ? <Text style={styles.groupSubtotal}>{money(group.subtotal)}</Text> : null}
            </View>
          )
        }
        return (
          <View key={row.key} style={styles.row} wrap={false}>
            <Text style={styles.cellNo}>{safeText(row.number)}</Text>
            <View style={styles.cellDesc}>
              <Text style={[styles.cellTitle, fontStyle]}>{safeText(row.description)}</Text>
              {row.specification ? (
                <Text style={styles.cellSub}>{safeText(row.specification)}</Text>
              ) : null}
              {row.make ? <Text style={styles.cellSub}>{safeText(row.make)}</Text> : null}
              {row.imageUrl ? <Image src={row.imageUrl} style={styles.thumb} /> : null}
            </View>
            <Text style={styles.cellQty}>
              {safeText(String(row.quantity))} {safeText(row.unit)}
            </Text>
            <Text style={[styles.cellMoney, { color: COST }]}>{money(row.cp)}</Text>
            <Text style={[styles.cellMoney, { color: SELL }]}>{money(row.sp)}</Text>
            <Text style={[styles.cellMoney, fontStyle]}>{money(row.totalSelling)}</Text>
          </View>
        )
      })}

      <View style={styles.totals} wrap={false}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Cost (CP × Qty)</Text>
          <Text style={styles.totalValue}>{money(data.totals.total_cost)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Schedule Selling Total (SP × Qty)</Text>
          <Text style={styles.totalValue}>{money(data.totals.total_selling_price)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Gross Profit</Text>
          <Text style={styles.totalValue}>{money(data.totals.gross_profit)}</Text>
        </View>
        <View style={styles.grandRow}>
          <Text style={[styles.totalLabel, fontStyle]}>Margin</Text>
          <Text style={[styles.grandValue, fontStyle]}>
            {Number(data.totals.margin_percent || 0).toFixed(1)}%
          </Text>
        </View>
      </View>

      {data.notes ? (
        <View style={styles.notes} wrap={false}>
          <Text style={[styles.notesTitle, fontStyle]}>Notes</Text>
          <Text>{safeText(data.notes)}</Text>
        </View>
      ) : null}

      <View style={styles.footer} fixed>
        <Text>{safeText(data.identity.number)}</Text>
        <Text
          render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  )
}
