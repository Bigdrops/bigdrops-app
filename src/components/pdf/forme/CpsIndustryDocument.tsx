import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { CpsPdfModel, CpsPdfRow } from '../cpsPreparedModel'
import { formatQuantityValue, groupedItemKeys } from '../cpsPreparedModel'

const INK = '#1f2937'
const BODY = '#333333'
const MUTED = '#6b7280'
const LINE = '#d4d4d4'
const BAND = '#7d8a88'
const BOX = '#e8e8e8'
const ZEBRA = '#f8fafc'
const HAIR = '#e5e7eb'
const RULE = '#1f2937'
const WALL = '#d1d5db'

const TOTALS_LABELS = ['Total Cost', 'Selling Total', 'Gross Profit', 'Margin']

type IndustryColumnKey = 'no' | 'description' | 'qty' | 'unitCp' | 'unitSp' | 'totalCost' | 'totalSell'

const INDUSTRY_WIDTHS: Record<IndustryColumnKey, { fixed: number } | { fraction: number }> = {
  no: { fixed: 30 },
  description: { fraction: 1 },
  qty: { fixed: 48 },
  unitCp: { fixed: 72 },
  unitSp: { fixed: 72 },
  totalCost: { fixed: 84 },
  totalSell: { fixed: 84 },
}

const INDUSTRY_LABELS: Record<IndustryColumnKey, string> = {
  no: 'No.',
  description: 'Description / Specification',
  qty: 'Qty',
  unitCp: 'Unit CP',
  unitSp: 'Unit SP',
  totalCost: 'Total Cost',
  totalSell: 'Total Sell',
}

function industryColumns(model: CpsPdfModel): IndustryColumnKey[] {
  const columns: IndustryColumnKey[] = ['no', 'description', 'qty']
  if (model.visibleColumns.includes('cp')) columns.push('unitCp')
  columns.push('unitSp')
  if (model.visibleColumns.includes('cp')) columns.push('totalCost')
  columns.push('totalSell')
  return columns
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function IndustryHeader({ model, font }: { model: CpsPdfModel; font: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
      <View style={{ flex: 1, paddingRight: 18 }}>
        <Text style={{ fontFamily: font, fontSize: 25, color: INK, letterSpacing: 1 }}>COST &amp; PRICING SHEET</Text>
        <Text style={{ fontFamily: font, fontSize: 14, color: MUTED, marginTop: 2, marginBottom: 16 }}>{model.title}</Text>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: MUTED, width: 70 }}>Number</Text>
            <Text style={{ fontFamily: font, fontSize: 10, color: BODY }}>{model.number}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: MUTED, width: 70 }}>Issued</Text>
            <Text style={{ fontFamily: font, fontSize: 10, color: BODY }}>{model.issueDate || '-'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: MUTED, width: 70 }}>Currency</Text>
            <Text style={{ fontFamily: font, fontSize: 10, color: BODY }}>{model.currency || 'NGN'}</Text>
          </View>
        </View>
      </View>
      <View style={{ width: 120, alignItems: 'flex-end' }}>
        {model.logoDataUri ? (
          <Image src={model.logoDataUri} style={{ width: 86, height: 86 }} />
        ) : null}
        {model.companyName ? (
          <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: INK, textAlign: 'right', marginTop: 6 }}>{model.companyName}</Text>
        ) : null}
      </View>
    </View>
  )
}

function IndustryParties({ model, font }: { model: CpsPdfModel; font: string }) {
  const titleColor = model.accent || BAND
  const hasClient = Boolean(model.clientName) || model.clientLines.length > 0
  const secondTitle = model.site ? 'PROJECT / SITE' : model.companyLines.length > 0 ? 'COMPANY' : null
  const secondLines = model.site ? [model.site] : model.companyLines
  if (!hasClient && !secondTitle) return null
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
      {hasClient ? (
        <View style={{ flex: 1, backgroundColor: BOX, borderWidth: 1, borderColor: LINE, borderRadius: 3, paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14, marginRight: secondTitle ? 14 : 0 }}>
          <Text style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: titleColor, marginBottom: 10 }}>CLIENT</Text>
          {model.clientName ? (
            <Text style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 5 }}>{model.clientName}</Text>
          ) : null}
          {model.clientLines.map((line, index) => (
            <Text key={index} style={{ fontFamily: font, fontSize: 10, color: BODY, marginBottom: 2 }}>{line}</Text>
          ))}
        </View>
      ) : null}
      {secondTitle ? (
        <View style={{ flex: 1, backgroundColor: BOX, borderWidth: 1, borderColor: LINE, borderRadius: 3, paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14 }}>
          <Text style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: titleColor, marginBottom: 10 }}>{secondTitle}</Text>
          {secondLines.map((line, index) => (
            <Text key={index} style={{ fontFamily: font, fontSize: index === 0 ? 12.5 : 10, fontWeight: index === 0 ? 700 : 400, color: index === 0 ? INK : BODY, marginBottom: index === 0 ? 5 : 2 }}>{line}</Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function IndustrySectionTitle({ font, accent, children }: { font: string; accent: string; children: string }) {
  return (
    <Text style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: accent, marginTop: 10, marginBottom: 8 }}>{children}</Text>
  )
}

function IndustryHeaderRow({ font, columns }: { font: string; columns: IndustryColumnKey[] }) {
  return (
    <Row header>
      {columns.map((key) => (
        <Cell key={key} style={{ backgroundColor: BAND, paddingTop: 5, paddingBottom: 5, paddingLeft: 6, paddingRight: 6, borderRightWidth: 0.5, borderRightColor: '#dfe5e4' }}>
          <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: '#ffffff', textAlign: key === 'description' ? ('left' as const) : ('right' as const) }}>
            {INDUSTRY_LABELS[key]}
          </Text>
        </Cell>
      ))}
    </Row>
  )
}

function IndustryGroupHeader({ model, font, row }: { model: CpsPdfModel; font: string; row: CpsPdfRow }) {
  const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
  const count = Number(group?.itemCount) || 0
  return (
    <Row key={row.key}>
      <Cell colSpan={industryColumns(model).length} style={{ backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: HAIR, borderBottomWidth: 1, borderBottomColor: HAIR, paddingTop: 6, paddingBottom: 6, paddingLeft: 6, paddingRight: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: font, fontSize: 10.75, fontWeight: 700, color: INK }}>{row.title}</Text>
          <Text style={{ fontFamily: font, fontSize: 9, color: MUTED, marginLeft: 8 }}>· {pluralize(count, 'Item')}</Text>
        </View>
      </Cell>
    </Row>
  )
}

function IndustryGroupFooter({ model, font, row, columns }: { model: CpsPdfModel; font: string; row: CpsPdfRow; columns: IndustryColumnKey[] }) {
  const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
  return (
    <Row key={row.key}>
      {columns.map((key) => {
        const figure = key === 'totalCost' ? group?.costSubtotalText || '' : key === 'totalSell' ? group?.subtotalText || '' : ''
        return (
          <Cell key={key} style={{ backgroundColor: '#ffffff', paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6, borderTopWidth: 1, borderTopColor: HAIR, borderBottomWidth: 2, borderBottomColor: RULE }}>
            {figure ? (
              <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: INK, textAlign: 'right' }}>{figure}</Text>
            ) : null}
          </Cell>
        )
      })}
    </Row>
  )
}

function IndustryItemCells({ font, row, columns, inGroup, striped }: { font: string; row: CpsPdfRow; columns: IndustryColumnKey[]; inGroup: boolean; striped: boolean }) {
  const rowBg = striped ? ZEBRA : '#ffffff'
  return columns.map((key, index) => {
    const isFirst = index === 0
    const base = {
      backgroundColor: rowBg,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 6,
      paddingRight: 6,
      borderBottomWidth: 1,
      borderBottomColor: HAIR,
      borderLeftWidth: inGroup && isFirst ? 3 : 0,
      borderLeftColor: WALL,
    }
    if (key === 'no') {
      return (
        <Cell key={key} style={base}>
          <Text style={{ fontFamily: font, fontSize: 10, color: BODY, textAlign: 'center' }}>{row.number}</Text>
        </Cell>
      )
    }
    if (key === 'description') {
      return (
        <Cell key={key} style={base}>
          <Text style={{ fontFamily: font, fontSize: 10.2, fontWeight: 700, color: INK }}>{row.description}</Text>
          {row.specification ? (
            <Text style={{ fontFamily: font, fontSize: 8.8, color: MUTED, marginTop: 3 }}>{row.specification}</Text>
          ) : null}
          {row.make ? (
            <Text style={{ fontFamily: font, fontSize: 9.6, color: MUTED, marginTop: 2 }}>{row.make}</Text>
          ) : null}
          {row.imageDataUri ? (
            <Image src={row.imageDataUri} href={row.imageHref || undefined} alt={row.description || 'Item photo'} style={{ width: 58, height: 58, marginTop: 4, marginBottom: 4 }} />
          ) : null}
        </Cell>
      )
    }
    if (key === 'qty') {
      return (
        <Cell key={key} style={base}>
          <Text style={{ fontFamily: font, fontSize: 10, color: BODY, textAlign: 'right' }}>{formatQuantityValue(row.quantityValue)}</Text>
          {row.unitText ? (
            <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED, textAlign: 'right' }}>{row.unitText}</Text>
          ) : null}
        </Cell>
      )
    }
    const value = key === 'unitCp' ? row.cpText : key === 'unitSp' ? row.spText : key === 'totalCost' ? row.totalCostText : row.totalText
    const bold = key === 'unitSp' || key === 'totalSell'
    return (
      <Cell key={key} style={base}>
        <Text style={{ fontFamily: font, fontSize: bold ? 10 : 9.5, fontWeight: bold ? 700 : 400, color: key === 'totalSell' ? INK : BODY, textAlign: 'right' }}>{value}</Text>
      </Cell>
    )
  })
}

function IndustryTotals({ model, font }: { model: CpsPdfModel; font: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 8 }}>
      <View style={{ width: 232, borderWidth: 1, borderColor: LINE, borderRadius: 3, paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14 }}>
        {model.totals.map((total, index) => {
          const isFinal = index === model.totals.length - 1
          return (
            <View key={total.label} style={{ flexDirection: 'row', alignItems: isFinal ? 'center' : 'flex-start', marginTop: isFinal ? 10 : 0, paddingTop: isFinal ? 10 : 1, marginBottom: isFinal ? 0 : 6, borderTopWidth: isFinal ? 2 : 0, borderTopColor: RULE }}>
              <Text style={{ fontFamily: font, fontSize: isFinal ? 13 : 10, fontWeight: isFinal ? 700 : 400, color: isFinal ? INK : MUTED, flex: 1, paddingRight: 12 }}>{TOTALS_LABELS[index] || total.label}</Text>
              <Text style={{ fontFamily: font, fontSize: isFinal ? 13 : 10, fontWeight: 700, color: INK, width: isFinal ? 108 : 94, textAlign: 'right' }}>{total.display}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function IndustryNotes({ model, font, accent }: { model: CpsPdfModel; font: string; accent: string }) {
  if (!model.notes) return null
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: accent, marginBottom: 8 }}>NOTES</Text>
      <Text style={{ fontFamily: font, fontSize: 9.5, color: BODY }}>{model.notes}</Text>
    </View>
  )
}

function IndustryFooter({ model, font }: { model: CpsPdfModel; font: string }) {
  return (
    <Fixed position="footer">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED }}>{model.companyName}</Text>
        <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED }}>
          {model.number} · Page {'{{pageNumber}}'} of {'{{totalPages}}'}
        </Text>
      </View>
    </Fixed>
  )
}

export function CpsIndustryDocument({ model }: { model: CpsPdfModel }) {
  const font = model.fontFamily || 'Helvetica'
  const accent = model.accent || BAND
  const columns = industryColumns(model)
  const tableColumns = columns.map((key) => ({ width: INDUSTRY_WIDTHS[key] }))
  const inWall = groupedItemKeys(model.rows)
  return (
    <Document title={`${model.number} ${model.title}`.trim()}>
      <Page size="A4" margin={{ top: 28, right: 32, bottom: 56, left: 32 }}>
        <IndustryFooter model={model} font={font} />
        <IndustryHeader model={model} font={font} />
        <IndustryParties model={model} font={font} />
        <IndustrySectionTitle font={font} accent={accent}>COST SCHEDULE</IndustrySectionTitle>
        <Table columns={tableColumns}>
          <IndustryHeaderRow font={font} columns={columns} />
          {model.rows.map((row, rowIdx) => {
            if (row.kind === 'group') {
              return <IndustryGroupHeader key={row.key} model={model} font={font} row={row} />
            }
            if (row.kind === 'group-subtotal') {
              return <IndustryGroupFooter key={row.key} model={model} font={font} row={row} columns={columns} />
            }
            return (
              <Row key={row.key}>
                  {IndustryItemCells({ font, row, columns, inGroup: inWall.has(row.key), striped: rowIdx % 2 === 1 })}
              </Row>
            )
          })}
        </Table>
        <IndustryTotals model={model} font={font} />
        <IndustryNotes model={model} font={font} accent={accent} />
      </Page>
    </Document>
  )
}
