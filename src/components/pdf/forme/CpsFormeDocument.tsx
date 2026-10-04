import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'

export type CpsFormeColumnKey = 'no' | 'description' | 'qty' | 'cp' | 'sp' | 'total'

export interface CpsFormeRow {
  key: string
  kind: 'group' | 'item' | 'group-subtotal'
  number: string
  groupId: string | null
  title: string
  description: string
  specification: string
  make: string
  quantityText: string
  cpText: string
  spText: string
  totalText: string
  imageDataUri: string | null
}

export interface CpsFormeGroup {
  id: string
  title: string
  itemCount: string
  subtotalText: string
}

export interface CpsFormeModel {
  title: string
  number: string
  issueDate: string
  status: string
  companyName: string
  logoDataUri: string | null
  companyLines: string[]
  clientName: string
  clientLines: string[]
  site: string
  notes: string
  fontFamily: string
  accent: string | null
  orientation: 'portrait' | 'landscape'
  visibleColumns: CpsFormeColumnKey[]
  rows: CpsFormeRow[]
  groups: CpsFormeGroup[]
  totals: Array<{ label: string; display: string; emphasis?: boolean }>
}

const INK = '#101828'
const MUTED = '#667085'
const SOFT = '#f2f4f7'
const BRAND = '#175cd3'
const COST = '#b54708'
const SELL = '#067647'

const COLUMN_WIDTHS: Record<CpsFormeColumnKey, { fixed: number } | { fraction: number }> = {
  no: { fixed: 34 },
  description: { fraction: 0.5 },
  qty: { fixed: 58 },
  cp: { fixed: 78 },
  sp: { fixed: 78 },
  total: { fixed: 88 },
}

function pageSize(orientation: 'portrait' | 'landscape'): 'A4' | { width: number; height: number } {
  if (orientation === 'landscape') return { width: 841.89, height: 595.28 }
  return 'A4'
}

const COLUMN_LABELS: Record<CpsFormeColumnKey, string> = {
  no: 'No',
  description: 'Description',
  qty: 'Qty',
  cp: 'CP',
  sp: 'SP',
  total: 'Total',
}

function DocHeader({ model, font }: { model: CpsFormeModel; font: string }) {
  const accent = model.accent || BRAND
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: '#d0d5dd' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
        {model.logoDataUri ? (
          <Image src={model.logoDataUri} style={{ width: 58, height: 58, borderRadius: 8, marginRight: 12 }} />
        ) : null}
        <View style={{ flex: 1 }}>
          {model.companyName ? (
            <Text style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: INK }}>{model.companyName}</Text>
          ) : null}
          <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: accent, marginTop: 4 }}>COST & PRICING SHEET</Text>
          <Text style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: INK, marginTop: 2 }}>{model.title}</Text>
        </View>
      </View>
      <View style={{ width: 170, borderWidth: 1, borderColor: '#d0d5dd' }}>
        <View style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 9, paddingRight: 9, borderBottomWidth: 1, borderBottomColor: '#eaecf0' }}>
          <Text style={{ fontFamily: font, fontSize: 7.5, color: MUTED }}>Document No.</Text>
          <Text style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: INK }}>{model.number}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingTop: 7, paddingBottom: 7, paddingLeft: 9, paddingRight: 9, borderRightWidth: 1, borderRightColor: '#eaecf0' }}>
            <Text style={{ fontFamily: font, fontSize: 7.5, color: MUTED }}>Issue Date</Text>
            <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: INK }}>{model.issueDate || '-'}</Text>
          </View>
          <View style={{ flex: 1, paddingTop: 7, paddingBottom: 7, paddingLeft: 9, paddingRight: 9 }}>
            <Text style={{ fontFamily: font, fontSize: 7.5, color: MUTED }}>Status</Text>
            <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: accent }}>{model.status}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function DocParties({ model, font }: { model: CpsFormeModel; font: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 14, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#eaecf0', borderBottomWidth: 1, borderBottomColor: '#eaecf0' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: MUTED }}>Client</Text>
        <Text style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: INK }}>{model.clientName || '-'}</Text>
        {model.clientLines.map((line, index) => (
          <Text key={index} style={{ fontFamily: font, fontSize: 8.5, color: MUTED }}>{line}</Text>
        ))}
      </View>
      {model.companyLines.length > 0 ? (
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: MUTED }}>From</Text>
          {model.companyLines.map((line, index) => (
            <Text key={index} style={{ fontFamily: font, fontSize: 8.5, color: INK }}>{line}</Text>
          ))}
        </View>
      ) : null}
      {model.site ? (
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: MUTED }}>Site / Project</Text>
          <Text style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: INK }}>{model.site}</Text>
        </View>
      ) : null}
    </View>
  )
}

function DocTotals({ model, font }: { model: CpsFormeModel; font: string }) {
  const accent = model.accent || BRAND
  return (
    <View wrap={false} style={{ alignItems: 'flex-end', marginTop: 14 }}>
      <View style={{ width: 330, borderWidth: 1, borderColor: '#d0d5dd' }}>
      {model.totals.map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 10, borderBottomWidth: row.label === 'Margin' ? 0 : 1, borderBottomColor: '#eaecf0', backgroundColor: row.emphasis ? '#eef4ff' : '#ffffff' }}>
          <Text style={{ fontFamily: font, fontSize: 9.5, color: row.emphasis ? accent : INK, fontWeight: row.emphasis ? 700 : 400 }}>{row.label}</Text>
          <Text style={{ fontFamily: font, fontSize: row.emphasis ? 11 : 9.5, fontWeight: row.emphasis ? 700 : 600, color: row.label.includes('Selling') ? SELL : INK }}>{row.display}</Text>
        </View>
      ))}
      </View>
    </View>
  )
}

function DocNotes({ model, font }: { model: CpsFormeModel; font: string }) {
  if (!model.notes) return null
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700 }}>Notes</Text>
      <Text style={{ fontFamily: font, fontSize: 9, color: MUTED }}>{model.notes}</Text>
    </View>
  )
}

function DocFooter({ model, font }: { model: CpsFormeModel; font: string }) {
  return (
    <Fixed position="footer">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: font, fontSize: 8, color: MUTED }}>{model.number}</Text>
        <Text style={{ fontFamily: font, fontSize: 8, color: MUTED }}>
          Page {'{{pageNumber}}'} of {'{{totalPages}}'}
        </Text>
      </View>
    </Fixed>
  )
}

function tableColumns(visible: CpsFormeColumnKey[]) {
  return visible.map((key) => ({ width: COLUMN_WIDTHS[key] }))
}

function HeaderRow({ model, font }: { model: CpsFormeModel; font: string }) {
  return (
    <Row header style={{ backgroundColor: INK }}>
      {model.visibleColumns.map((key) => (
        <Cell key={key} style={{ paddingTop: 6, paddingBottom: 6, paddingLeft: 7, paddingRight: 7 }}>
          <Text
            style={{
              fontFamily: font,
              fontSize: 9,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: key === 'description' ? ('left' as const) : ('right' as const),
            }}
          >
            {COLUMN_LABELS[key]}
          </Text>
        </Cell>
      ))}
    </Row>
  )
}

function GroupHeaderRow({ model, font, row }: { model: CpsFormeModel; font: string; row: CpsFormeRow }) {
  const accent = model.accent || BRAND
  const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
  return (
    <Row key={row.key}>
      <Cell colSpan={model.visibleColumns.length} style={{ paddingTop: 8, paddingBottom: 6, paddingLeft: 8, paddingRight: 8, backgroundColor: '#eef4ff', borderTopWidth: 1, borderTopColor: '#c7d7fe' }}>
        <Text style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: accent }}>{row.title}</Text>
        {group ? (
          <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED }}>{group.itemCount} item{group.itemCount === '1' ? '' : 's'}</Text>
        ) : null}
      </Cell>
    </Row>
  )
}

function GroupSubtotalRow({ model, font, row }: { model: CpsFormeModel; font: string; row: CpsFormeRow }) {
  const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
  return (
    <Row key={row.key}>
      <Cell colSpan={Math.max(1, model.visibleColumns.length - 1)} style={{ paddingTop: 6, paddingBottom: 6, paddingLeft: 8, paddingRight: 8, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#d0d5dd' }}>
        <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: INK }}>{row.title}</Text>
      </Cell>
      <Cell style={{ paddingTop: 6, paddingBottom: 6, paddingLeft: 8, paddingRight: 8, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#d0d5dd' }}>
        <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, textAlign: 'right', color: INK }}>
          {group?.subtotalText || row.totalText}
        </Text>
      </Cell>
    </Row>
  )
}

function hasColumn(model: CpsFormeModel, key: CpsFormeColumnKey): boolean {
  return model.visibleColumns.includes(key)
}

function itemCells(model: CpsFormeModel, font: string, row: CpsFormeModel['rows'][number]) {
  const cells = []
  if (hasColumn(model, 'no')) {
    cells.push(
      <Cell key="no" style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
        <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED, textAlign: 'center' }}>{row.number}</Text>
      </Cell>,
    )
  }
  if (hasColumn(model, 'description')) {
    cells.push(
      <Cell key="description" style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 7, paddingRight: 7 }}>
        <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: INK }}>{row.description}</Text>
        {row.specification ? (
          <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED, marginTop: 2 }}>{row.specification}</Text>
        ) : null}
        {row.make ? (
          <Text style={{ fontFamily: font, fontSize: 8.5, color: MUTED, marginTop: 2 }}>{row.make}</Text>
        ) : null}
        {row.imageDataUri ? (
          <Image src={row.imageDataUri} style={{ width: 58, height: 58, marginTop: 5 }} />
        ) : null}
      </Cell>,
    )
  }
  if (hasColumn(model, 'qty')) {
    cells.push(
      <Cell key="qty" style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 7, paddingRight: 7 }}>
        <Text style={{ fontFamily: font, fontSize: 9, textAlign: 'right', color: INK }}>{row.quantityText}</Text>
      </Cell>,
    )
  }
  if (hasColumn(model, 'cp')) {
    cells.push(
      <Cell key="cp" style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 7, paddingRight: 7 }}>
        <Text style={{ fontFamily: font, fontSize: 9, textAlign: 'right', color: COST }}>{row.cpText}</Text>
      </Cell>,
    )
  }
  if (hasColumn(model, 'sp')) {
    cells.push(
      <Cell key="sp" style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 7, paddingRight: 7 }}>
        <Text style={{ fontFamily: font, fontSize: 9, textAlign: 'right', color: SELL }}>{row.spText}</Text>
      </Cell>,
    )
  }
  if (hasColumn(model, 'total')) {
    cells.push(
      <Cell key="total" style={{ paddingTop: 7, paddingBottom: 7, paddingLeft: 7, paddingRight: 7 }}>
        <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, textAlign: 'right', color: INK }}>{row.totalText}</Text>
      </Cell>,
    )
  }
  return cells
}

export function CpsScheduleDocument({ model }: { model: CpsFormeModel }) {
  const font = model.fontFamily || 'Helvetica'
  return (
    <Document title={`${model.number} ${model.title}`.trim()}>
      <Page size={pageSize(model.orientation)} margin={{ top: 42, right: 38, bottom: 54, left: 38 }}>
        <DocFooter model={model} font={font} />
        <DocHeader model={{ ...model }} font={font} />
        <DocParties model={model} font={font} />
        <Table columns={tableColumns(model.visibleColumns)}>
          <HeaderRow model={model} font={font} />
          {model.rows.map((row) => {
            if (row.kind === 'group') {
              return <GroupHeaderRow key={row.key} model={model} font={font} row={row} />
            }
            if (row.kind === 'group-subtotal') {
              return <GroupSubtotalRow key={row.key} model={model} font={font} row={row} />
            }
            return (
              <Row key={row.key}>
                {itemCells(model, font, row)}
              </Row>
            )
          })}
        </Table>
        <DocTotals model={model} font={font} />
        <DocNotes model={model} font={font} />
      </Page>
    </Document>
  )
}

export function CpsCompactDocument({ model }: { model: CpsFormeModel }) {
  const font = model.fontFamily || 'Helvetica'
  const accent = model.accent || BRAND
  return (
    <Document title={`${model.number} ${model.title}`.trim()}>
      <Page size={pageSize(model.orientation)} margin={{ top: 36, right: 32, bottom: 48, left: 32 }}>
        <DocFooter model={model} font={font} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <View>
            <Text style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: accent }}>{model.title}</Text>
            <Text style={{ fontFamily: font, fontSize: 8, color: MUTED }}>
              {[model.number, model.issueDate, model.status].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700 }}>{model.clientName}</Text>
            {model.site ? (
              <Text style={{ fontFamily: font, fontSize: 8, color: MUTED }}>{model.site}</Text>
            ) : null}
          </View>
        </View>
        <Table columns={tableColumns(model.visibleColumns)}>
          <HeaderRow model={model} font={font} />
          {model.rows.map((row) => {
            if (row.kind === 'group') {
              return (
                <Row key={row.key}>
                  <Cell colSpan={model.visibleColumns.length} style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6, backgroundColor: SOFT }}>
                    <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: accent }}>
                      {row.title}
                    </Text>
                  </Cell>
                </Row>
              )
            }
            if (row.kind === 'group-subtotal') {
              const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
              return (
                <Row key={row.key}>
                  <Cell colSpan={model.visibleColumns.length} style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6, backgroundColor: '#f8fafc' }}>
                    <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, textAlign: 'right' }}>
                      {row.title}: {group?.subtotalText || row.totalText}
                    </Text>
                  </Cell>
                </Row>
              )
            }
            const compact: typeof row = { ...row, specification: '', make: '', imageDataUri: null }
            return (
              <Row key={row.key}>
                {itemCells(model, font, compact)}
              </Row>
            )
          })}
        </Table>
        <DocTotals model={model} font={font} />
        <DocNotes model={model} font={font} />
      </Page>
    </Document>
  )
}
