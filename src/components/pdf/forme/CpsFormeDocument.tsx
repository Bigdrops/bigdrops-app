import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'

export type CpsFormeColumnKey = 'no' | 'description' | 'qty' | 'cp' | 'sp' | 'total'

export interface CpsFormeRow {
  key: string
  kind: 'group' | 'item'
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
  no: { fixed: 28 },
  description: { fraction: 0.42 },
  qty: { fixed: 52 },
  cp: { fixed: 64 },
  sp: { fixed: 64 },
  total: { fixed: 72 },
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {model.logoDataUri ? (
          <Image src={model.logoDataUri} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }} />
        ) : null}
        <View>
          {model.companyName ? (
            <Text style={{ fontFamily: font, fontSize: 12, fontWeight: 700 }}>{model.companyName}</Text>
          ) : null}
          <Text style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: accent }}>{model.title}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700 }}>{model.number}</Text>
        <Text style={{ fontFamily: font, fontSize: 8, color: MUTED }}>Issued {model.issueDate}</Text>
        <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700 }}>{model.status}</Text>
      </View>
    </View>
  )
}

function DocParties({ model, font }: { model: CpsFormeModel; font: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: MUTED }}>Bill To</Text>
        <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700 }}>{model.clientName}</Text>
        {model.clientLines.map((line, index) => (
          <Text key={index} style={{ fontFamily: font, fontSize: 8, color: MUTED }}>{line}</Text>
        ))}
      </View>
      {model.companyLines.length > 0 ? (
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: MUTED }}>From</Text>
          {model.companyLines.map((line, index) => (
            <Text key={index} style={{ fontFamily: font, fontSize: 8, color: MUTED }}>{line}</Text>
          ))}
        </View>
      ) : null}
      {model.site ? (
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: MUTED }}>Site / Project</Text>
          <Text style={{ fontFamily: font, fontSize: 10, fontWeight: 700 }}>{model.site}</Text>
        </View>
      ) : null}
    </View>
  )
}

function DocTotals({ model, font }: { model: CpsFormeModel; font: string }) {
  return (
    <View wrap={false} style={{ alignItems: 'flex-end', marginTop: 10 }}>
      {model.totals.map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', width: 280 }}>
          <Text style={{ fontFamily: font, fontSize: 10 }}>{row.label}</Text>
          <Text style={{ fontFamily: font, fontSize: 10, fontWeight: row.emphasis ? 700 : 400 }}>{row.display}</Text>
        </View>
      ))}
    </View>
  )
}

function DocNotes({ model, font }: { model: CpsFormeModel; font: string }) {
  if (!model.notes) return null
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700 }}>Notes</Text>
      <Text style={{ fontFamily: font, fontSize: 8, color: MUTED }}>{model.notes}</Text>
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
        <Cell key={key} style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text
            style={{
              fontFamily: font,
              fontSize: 8,
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

function hasColumn(model: CpsFormeModel, key: CpsFormeColumnKey): boolean {
  return model.visibleColumns.includes(key)
}

function ItemCells({ model, font, row }: { model: CpsFormeModel; font: string; row: CpsFormeModel['rows'][number] }) {
  return (
    <>
      {hasColumn(model, 'no') ? (
        <Cell style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text style={{ fontFamily: font, fontSize: 8, color: MUTED, textAlign: 'center' }}>{row.number}</Text>
        </Cell>
      ) : null}
      {hasColumn(model, 'description') ? (
        <Cell style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700 }}>{row.description}</Text>
          {row.specification ? (
            <Text style={{ fontFamily: font, fontSize: 7.5, color: MUTED }}>{row.specification}</Text>
          ) : null}
          {row.make ? (
            <Text style={{ fontFamily: font, fontSize: 7.5, color: MUTED }}>{row.make}</Text>
          ) : null}
          {row.imageDataUri ? (
            <Image src={row.imageDataUri} style={{ width: 56, height: 56, marginTop: 4 }} />
          ) : null}
        </Cell>
      ) : null}
      {hasColumn(model, 'qty') ? (
        <Cell style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text style={{ fontFamily: font, fontSize: 8, textAlign: 'right' }}>{row.quantityText}</Text>
        </Cell>
      ) : null}
      {hasColumn(model, 'cp') ? (
        <Cell style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text style={{ fontFamily: font, fontSize: 8, textAlign: 'right', color: COST }}>{row.cpText}</Text>
        </Cell>
      ) : null}
      {hasColumn(model, 'sp') ? (
        <Cell style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text style={{ fontFamily: font, fontSize: 8, textAlign: 'right', color: SELL }}>{row.spText}</Text>
        </Cell>
      ) : null}
      {hasColumn(model, 'total') ? (
        <Cell style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
          <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, textAlign: 'right' }}>{row.totalText}</Text>
        </Cell>
      ) : null}
    </>
  )
}

export function CpsScheduleDocument({ model }: { model: CpsFormeModel }) {
  const font = model.fontFamily || 'Helvetica'
  const accent = model.accent || BRAND
  return (
    <Document title={`${model.number} ${model.title}`.trim()}>
      <Page size={pageSize(model.orientation)} margin={{ top: 48, right: 40, bottom: 56, left: 40 }}>
        <DocFooter model={model} font={font} />
        <DocHeader model={{ ...model }} font={font} />
        <DocParties model={model} font={font} />
        <Table columns={tableColumns(model.visibleColumns)}>
          <HeaderRow model={model} font={font} />
          {model.rows.map((row) => {
            if (row.kind === 'group') {
              const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
              return (
                <Row key={row.key}>
                  <Cell colSpan={model.visibleColumns.length} style={{ paddingTop: 5, paddingBottom: 5, paddingLeft: 8, paddingRight: 8, backgroundColor: SOFT }}>
                    <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: accent }}>{row.title}</Text>
                    {group ? (
                      <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700 }}>{group.subtotalText}</Text>
                    ) : null}
                  </Cell>
                </Row>
              )
            }
            return (
              <Row key={row.key}>
                <ItemCells model={model} font={font} row={row} />
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
              const group = row.groupId ? model.groups.find((entry) => entry.id === row.groupId) : undefined
              return (
                <Row key={row.key}>
                  <Cell colSpan={model.visibleColumns.length} style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6, backgroundColor: SOFT }}>
                    <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: accent }}>
                      {row.title}{group ? ` — ${group.subtotalText}` : ''}
                    </Text>
                  </Cell>
                </Row>
              )
            }
            const compact: typeof row = { ...row, specification: '', make: '', imageDataUri: null }
            return (
              <Row key={row.key}>
                <ItemCells model={model} font={font} row={compact} />
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
