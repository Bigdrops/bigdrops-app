import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { CpsPdfModel, CpsPdfRow } from '../cpsPreparedModel'
import { formatQuantityValue, groupedItemKeys } from '../cpsPreparedModel'
import { LEDGER_SCHEDULE_GEOMETRY, resolveScheduleWidths } from './cpsScheduleGeometry'

const NAVY = '#183b52'
const INK = '#17232d'
const MUTED = '#7e8992'
const LINE = '#dce2e6'
const LINE_SOFT = '#edf0f2'
const COST = '#8d633e'
const SELL = '#286a52'
const GROUP = '#263741'
const GROUP_SOFT = '#f5f7f8'

const STRIP_LABELS = ['Total Cost', 'Selling Total', 'Gross Profit', 'Margin']
const CLOSEOUT_LABELS = ['Total Cost', 'Selling Total', 'Gross Profit', 'Profit Margin']

type LedgerColumnKey = 'no' | 'description' | 'qty' | 'unitCp' | 'unitSp' | 'totalCost' | 'totalSell'

const LEDGER_LABELS: Record<LedgerColumnKey, string> = {
  no: 'No.',
  description: 'Description / Specification',
  qty: 'Qty',
  unitCp: 'Unit CP',
  unitSp: 'Unit SP',
  totalCost: 'Total Cost',
  totalSell: 'Total Sell',
}

function ledgerColumns(model: CpsPdfModel): LedgerColumnKey[] {
  const columns: LedgerColumnKey[] = ['no', 'description', 'qty']
  if (model.visibleColumns.includes('cp')) columns.push('unitCp')
  columns.push('unitSp')
  if (model.visibleColumns.includes('cp')) columns.push('totalCost')
  columns.push('totalSell')
  return columns
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function LedgerHeader({ model, font }: { model: CpsPdfModel; font: string }) {
  const accent = model.accent || NAVY
  return (
    <View style={{ flexDirection: 'row', marginBottom: 0, borderBottomWidth: 1, borderBottomColor: LINE }}>
      <View style={{ width: 178, paddingTop: 22, paddingBottom: 20, paddingLeft: 19, paddingRight: 19, borderRightWidth: 1, borderRightColor: LINE }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {model.logoDataUri ? (
            <Image src={model.logoDataUri} style={{ width: 39, height: 39, borderRadius: 7, marginRight: 9 }} />
          ) : null}
          <View style={{ flex: 1 }}>
            {model.companyName ? (
              <Text style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: INK }}>{model.companyName}</Text>
            ) : null}
          </View>
        </View>
        {model.companyLines.map((line, index) => (
          <Text key={index} style={{ fontFamily: font, fontSize: 6.9, color: MUTED, marginTop: index === 0 ? 14 : 1 }}>{line}</Text>
        ))}
      </View>
      <View style={{ flex: 1, paddingTop: 21, paddingBottom: 20, paddingLeft: 25, paddingRight: 25 }}>
        <Text style={{ fontFamily: font, fontSize: 20, fontWeight: 700, color: accent }}>COST &amp; PRICING SHEET</Text>
        <View style={{ width: 42, height: 3, backgroundColor: accent, marginTop: 10, marginBottom: 11 }} />
        <Text style={{ fontFamily: font, fontSize: 6, fontWeight: 700, color: MUTED }}>TITLE</Text>
        <Text style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: INK, marginTop: 3 }}>{model.title}</Text>
      </View>
      <View style={{ width: 150, paddingTop: 22, paddingBottom: 20, paddingLeft: 17, paddingRight: 17, backgroundColor: '#f7f9fa' }}>
        <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: accent, marginBottom: 12 }}>{model.number}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: LINE }}>
          <Text style={{ fontFamily: font, fontSize: 6.8, color: MUTED }}>Issued</Text>
          <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: INK }}>{model.issueDate || '-'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 5 }}>
          <Text style={{ fontFamily: font, fontSize: 6.8, color: MUTED }}>Currency</Text>
          <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: INK }}>{model.currency || 'NGN'}</Text>
        </View>
      </View>
    </View>
  )
}

function LedgerParties({ model, font }: { model: CpsPdfModel; font: string }) {
  const hasClient = Boolean(model.clientName) || model.clientLines.length > 0
  if (!hasClient && !model.site) return null
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE }}>
      {hasClient ? (
        <View style={{ flex: 1.15, paddingTop: 15, paddingBottom: 16, paddingLeft: 22, paddingRight: 22, borderRightWidth: 1, borderRightColor: LINE }}>
          <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: model.accent || NAVY, marginBottom: 7 }}>CLIENT</Text>
          {model.clientName ? (
            <Text style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: INK }}>{model.clientName}</Text>
          ) : null}
          {model.clientLines.map((line, index) => (
            <Text key={index} style={{ fontFamily: font, fontSize: 7.3, color: INK, marginTop: 3 }}>{line}</Text>
          ))}
        </View>
      ) : null}
      {model.site ? (
        <View style={{ flex: 0.85, paddingTop: 15, paddingBottom: 16, paddingLeft: 22, paddingRight: 22 }}>
          <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: model.accent || NAVY, marginBottom: 7 }}>PROJECT / SITE</Text>
          <Text style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: INK }}>{model.site}</Text>
        </View>
      ) : null}
    </View>
  )
}

function LedgerStrip({ model, font }: { model: CpsPdfModel; font: string }) {
  const accent = model.accent || NAVY
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE }}>
      {model.totals.map((total, index) => {
        const isMargin = index === model.totals.length - 1
        return (
          <View key={total.label} style={{ flex: 1, paddingTop: 12, paddingBottom: 13, paddingLeft: 17, paddingRight: 17, borderRightWidth: index === model.totals.length - 1 ? 0 : 1, borderRightColor: LINE, backgroundColor: isMargin ? accent : '#ffffff' }}>
            <Text style={{ fontFamily: font, fontSize: 5.8, fontWeight: 700, color: isMargin ? '#bed0da' : MUTED }}>{STRIP_LABELS[index] || total.label}</Text>
            <Text style={{ fontFamily: font, fontSize: isMargin ? 15 : 11, fontWeight: 700, color: isMargin ? '#ffffff' : index === 0 ? COST : SELL, marginTop: 5 }}>{total.display}</Text>
          </View>
        )
      })}
    </View>
  )
}

function LedgerScheduleHead({ font, itemCount }: { font: string; itemCount: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10, marginTop: 22, paddingLeft: 27, paddingRight: 27 }}>
      <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: INK }}>COST SCHEDULE</Text>
      <Text style={{ fontFamily: font, fontSize: 6, color: MUTED }}>{pluralize(itemCount, 'line item')}</Text>
    </View>
  )
}

function LedgerHeaderRow({ font, columns }: { font: string; columns: LedgerColumnKey[] }) {
  return (
    <Row header>
      {columns.map((key) => (
        <Cell key={key} style={{ paddingTop: 0, paddingBottom: 7, paddingLeft: 9, paddingRight: 9, borderBottomWidth: 2, borderBottomColor: INK }}>
          <Text style={{ fontFamily: font, fontSize: 5.3, fontWeight: 700, color: MUTED, textAlign: key === 'description' ? ('left' as const) : ('right' as const) }}>
            {LEDGER_LABELS[key]}
          </Text>
        </Cell>
      ))}
    </Row>
  )
}

function LedgerGroupHeader({ model, font, row, columns }: { model: CpsPdfModel; font: string; row: CpsPdfRow; columns: LedgerColumnKey[] }) {
  const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
  const count = Number(group?.itemCount) || 0
  return (
    <Row key={row.key}>
      <Cell colSpan={columns.length} style={{ backgroundColor: GROUP, borderTopWidth: 1.7, borderTopColor: GROUP, borderLeftWidth: 1.7, borderLeftColor: GROUP, borderRightWidth: 1.7, borderRightColor: GROUP }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, paddingBottom: 9, paddingLeft: 11, paddingRight: 11 }}>
          <Text style={{ fontFamily: font, fontSize: 7.4, fontWeight: 700, color: '#ffffff' }}>{row.title}</Text>
          <View style={{ borderWidth: 1, borderColor: '#8fa3b0', borderRadius: 99, paddingTop: 3, paddingBottom: 3, paddingLeft: 7, paddingRight: 7 }}>
            <Text style={{ fontFamily: font, fontSize: 5.3, fontWeight: 700, color: '#d7e0e5' }}>{pluralize(count, 'Item').toUpperCase()}</Text>
          </View>
        </View>
      </Cell>
    </Row>
  )
}

function LedgerGroupFooter({ model, font, row, columns }: { model: CpsPdfModel; font: string; row: CpsPdfRow; columns: LedgerColumnKey[] }) {
  const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
  return (
    <Row key={row.key}>
      {columns.map((key, index) => {
        const isFirst = index === 0
        const isLast = index === columns.length - 1
        const figure = key === 'totalCost' ? group?.costSubtotalText || '' : key === 'totalSell' ? group?.subtotalText || '' : ''
        const color = key === 'totalCost' ? COST : key === 'totalSell' ? SELL : INK
        return (
          <Cell
            key={key}
            style={{
              backgroundColor: GROUP_SOFT,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 7,
              paddingRight: 7,
              borderTopWidth: 1.7,
              borderTopColor: GROUP,
              borderBottomWidth: 1.7,
              borderBottomColor: GROUP,
              borderLeftWidth: isFirst ? 1.7 : 0,
              borderLeftColor: GROUP,
              borderRightWidth: isLast ? 1.7 : 0,
              borderRightColor: GROUP,
            }}
          >
            {figure ? (
              <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: key === 'totalSell' ? 700 : 400, color, textAlign: 'right' }}>{figure}</Text>
            ) : null}
          </Cell>
        )
      })}
    </Row>
  )
}

function LedgerItemCells({ model, font, row, columns, inGroup }: { model: CpsPdfModel; font: string; row: CpsPdfRow; columns: LedgerColumnKey[]; inGroup: boolean }) {
  const wall = { borderLeftColor: GROUP, borderRightColor: GROUP }
  return columns.map((key, index) => {
    const isFirst = index === 0
    const isLast = index === columns.length - 1
    const side = {
      borderLeftWidth: inGroup && isFirst ? 1.7 : 0,
      borderRightWidth: inGroup && isLast ? 1.7 : 0,
      ...wall,
    }
    if (key === 'no') {
      return (
        <Cell key={key} style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 9, paddingRight: 6, borderBottomWidth: 1, borderBottomColor: LINE_SOFT, ...side }}>
          <Text style={{ fontFamily: font, fontSize: 6.4, color: MUTED, textAlign: 'center' }}>{row.number}</Text>
        </Cell>
      )
    }
    if (key === 'description') {
      return (
        <Cell key={key} style={{ paddingTop: 9, paddingBottom: 9, paddingLeft: 0, paddingRight: 10, borderBottomWidth: 1, borderBottomColor: LINE_SOFT, ...side }}>
          <Text style={{ fontFamily: font, fontSize: 7.6, fontWeight: 700, color: INK }}>{row.description}</Text>
          {row.specification ? (
            <Text style={{ fontFamily: font, fontSize: 6.3, color: MUTED, marginTop: 2 }}>{row.specification}</Text>
          ) : null}
          {row.make ? (
            <Text style={{ fontFamily: font, fontSize: 5.5, fontWeight: 700, color: model.accent || NAVY, marginTop: 4 }}>{row.make.toUpperCase()}</Text>
          ) : null}
          {row.imageDataUri ? (
            <Image src={row.imageDataUri} href={row.imageHref || undefined} alt={row.description || 'Item photo'} style={{ width: 40, height: 40, marginTop: 6 }} />
          ) : null}
        </Cell>
      )
    }
    if (key === 'qty') {
      return (
        <Cell key={key} style={{ paddingTop: 9, paddingBottom: 9, paddingLeft: 6, paddingRight: 6, borderBottomWidth: 1, borderBottomColor: LINE_SOFT, ...side }}>
          <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: INK, textAlign: 'right' }}>{formatQuantityValue(row.quantityValue)}</Text>
          {row.unitText ? (
            <Text style={{ fontFamily: font, fontSize: 5.2, color: MUTED, textAlign: 'right', marginTop: 1 }}>{row.unitText.toUpperCase()}</Text>
          ) : null}
        </Cell>
      )
    }
    const value = key === 'unitCp' ? row.cpText : key === 'unitSp' ? row.spText : key === 'totalCost' ? row.totalCostText : row.totalText
    const color = key === 'unitCp' || key === 'totalCost' ? COST : key === 'unitSp' ? SELL : INK
    const bold = key === 'unitSp' || key === 'totalSell'
    return (
      <Cell key={key} style={{ paddingTop: 9, paddingBottom: 9, paddingLeft: 6, paddingRight: 6, borderBottomWidth: 1, borderBottomColor: LINE_SOFT, ...side }}>
        <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: bold ? 700 : 400, color, textAlign: 'right' }}>{value}</Text>
      </Cell>
    )
  })
}

function LedgerCloseout({ model, font }: { model: CpsPdfModel; font: string }) {
  const accent = model.accent || NAVY
  return (
    <View style={{ flexDirection: 'row', marginTop: 22, paddingTop: 17, paddingLeft: 27, paddingRight: 27, borderTopWidth: 2, borderTopColor: INK }}>
      <View style={{ flex: 1, paddingRight: 31 }}>
        {model.notes ? (
          <View>
            <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 700, color: INK }}>NOTES</Text>
            <Text style={{ fontFamily: font, fontSize: 6.4, color: MUTED, marginTop: 6 }}>{model.notes}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ width: 275, borderWidth: 1, borderColor: LINE }}>
        {model.totals.map((total, index) => {
          const isMargin = index === model.totals.length - 1
          const isProfit = total.label.toLowerCase().includes('profit') && !isMargin
          return (
            <View key={total.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 10, borderBottomWidth: index === model.totals.length - 1 ? 0 : 1, borderBottomColor: LINE, backgroundColor: isMargin ? accent : isProfit ? '#f0f7f4' : '#ffffff' }}>
              <Text style={{ fontFamily: font, fontSize: 6.7, color: isMargin ? '#c4d4dd' : MUTED }}>{CLOSEOUT_LABELS[index] || total.label}</Text>
              <Text style={{ fontFamily: font, fontSize: isMargin ? 10 : 7, fontWeight: isMargin || isProfit ? 700 : 400, color: isMargin ? '#ffffff' : index === 0 ? COST : SELL }}>{total.display}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LedgerFooter({ model, font }: { model: CpsPdfModel; font: string }) {
  return (
    <Fixed position="footer">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 27, marginRight: 27 }}>
        <Text style={{ fontFamily: font, fontSize: 5.4, color: MUTED }}>{model.companyName}</Text>
        <Text style={{ fontFamily: font, fontSize: 5.4, color: MUTED }}>
          {model.number} · Page {'{{pageNumber}}'} of {'{{totalPages}}'}
        </Text>
      </View>
    </Fixed>
  )
}

export function LedgerCpsDocument({ model }: { model: CpsPdfModel }) {
  const font = model.fontFamily || 'Helvetica'
  const columns = ledgerColumns(model)
  const tableColumns = resolveScheduleWidths(LEDGER_SCHEDULE_GEOMETRY, columns)
  const itemCount = model.rows.filter((row) => row.kind === 'item').length
  const inWall = groupedItemKeys(model.rows)
  return (
    <Document title={`${model.number} ${model.title}`.trim()}>
      <Page size="A4" margin={{ top: 0, right: 0, bottom: 52, left: 0 }}>
        <LedgerFooter model={model} font={font} />
        <LedgerHeader model={model} font={font} />
        <LedgerParties model={model} font={font} />
        <LedgerStrip model={model} font={font} />
        <LedgerScheduleHead font={font} itemCount={itemCount} />
        <View style={{ paddingLeft: 27, paddingRight: 27 }}>
          <Table columns={tableColumns}>
            <LedgerHeaderRow font={font} columns={columns} />
            {model.rows.map((row) => {
              if (row.kind === 'group') {
                return <LedgerGroupHeader key={row.key} model={model} font={font} row={row} columns={columns} />
              }
              if (row.kind === 'group-subtotal') {
                return <LedgerGroupFooter key={row.key} model={model} font={font} row={row} columns={columns} />
              }
              return (
                <Row key={row.key}>
                  {LedgerItemCells({ model, font, row, columns, inGroup: inWall.has(row.key) })}
                </Row>
              )
            })}
          </Table>
        </View>
        <LedgerCloseout model={model} font={font} />
      </Page>
    </Document>
  )
}
