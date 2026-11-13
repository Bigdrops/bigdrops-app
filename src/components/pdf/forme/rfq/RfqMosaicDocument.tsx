import React from 'react'
import { Cell, Document, Fixed, Page, Row, Table, Text, View } from '@formepdf/react'
import { normalizeRfqTemplateId } from '@/domain/rfq/templates'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import {
  displayRowProfit,
  mapItemsToRows,
  prepareRfqTable,
  resolveBrandName,
  resolveCompanyAddress,
  resolveCompanyLogo,
  resolveCompanyName,
  resolveCompanyPhone,
  resolveVendorContact,
  resolveVendorName,
  RIGHT_ALIGNED_KEYS,
  type RfqFormeDocumentProps,
} from './kit'

/**
 * Mosaic RFQ — forest identity slab masthead, lime structural accent,
 * charcoal schedule header. Adapted from the commercial Mosaic template to
 * RFQ semantics; invoice-specific furniture (totals, bank details, signature
 * blocks, BOQ schedules) is intentionally absent.
 */
export const RFQ_MOSAIC_TOKENS = {
  forest: '#0d2b1d',
  forestMid: '#1b4332',
  charcoal: '#1a1d1a',
  slate: '#47554e',
  border: '#d6dfd9',
  borderLight: '#e5ebe7',
  paper: '#ffffff',
  tint: '#f7faf8',
  tint2: '#eef4f0',
  lime: '#84cc16',
  limeSoft: '#f4fce3',
  limeDark: '#4d7c0f',
} as const

const PAGE_WIDTH = 595.28
const PAGE_MARGIN = { top: 18, right: 20, bottom: 10, left: 20 }
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN.left - PAGE_MARGIN.right

function microLabel(color: string = RFQ_MOSAIC_TOKENS.slate) {
  return {
    fontSize: 4.9,
    fontWeight: 700 as const,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    color,
  }
}

export function RfqMosaicDocument({ rfq, rows, columns, settings }: RfqFormeDocumentProps): React.JSX.Element {
  const T = RFQ_MOSAIC_TOKENS
  const table = prepareRfqTable(
    rows ?? rfq.table_rows ?? mapItemsToRows(rfq.items),
    columns ?? rfq.table_columns ?? [],
  )
  const companyName = resolveCompanyName(settings)
  const companyAddress = resolveCompanyAddress(settings)
  const companyPhone = resolveCompanyPhone(settings)
  const companyLogo = resolveCompanyLogo(settings)
  const brandName = resolveBrandName(rfq)
  const vendorName = resolveVendorName(rfq)
  const vendorContact = resolveVendorContact(rfq)
  const itemCount = table.displayRows.filter((row) => row.row_type !== 'section').length

  const tableColumns = [
    { width: { fixed: (table.sNoWidthPct / 100) * CONTENT_WIDTH } },
    ...table.visibleColumns.map((column) => ({
      width: { fixed: ((table.columnWidths.get(column.key) ?? 12) / 100) * CONTENT_WIDTH },
    })),
    ...(table.hasProfitColumn ? [{ width: { fixed: (table.profitWidthPct / 100) * CONTENT_WIDTH } }] : []),
  ]

  const bodyFont = 'Inter'
  const displayFont = 'Archivo Black'

  return (
    <Document title={`RFQ ${safeText(rfq.rfq_number)}`.trim()} author={companyName || 'Company'} style={{ fontFamily: bodyFont, fontSize: 7.2, color: T.charcoal }}>
      <Page size="A4" margin={PAGE_MARGIN} style={{ backgroundColor: T.paper }}>
        {/* FIXED FOOTER — forest register strip */}
        <Fixed position="footer" style={{ backgroundColor: T.forest, paddingVertical: 4, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.4, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f7faf8', flex: 1.3 }}>
            {safeText(companyName || brandName || 'BOUXRE')}
          </Text>
          <View style={{ backgroundColor: T.lime, paddingHorizontal: 4, paddingVertical: 1 }}>
            <Text style={{ fontSize: 5.2, fontWeight: 700, color: T.charcoal, letterSpacing: 0.6 }}>{'{{pageNumber}} / {{totalPages}}'}</Text>
          </View>
          <Text style={{ fontSize: 5.4, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: '#c9d6cd', flex: 1, textAlign: 'right' }}>
            {safeText(`RFQ · ${rfq.rfq_number || ''}`)}
          </Text>
        </Fixed>

        {/* MASTHEAD — identity slab + document tower */}
        <View style={{ flexDirection: 'row', borderWidth: 0.8, borderColor: T.forest, marginBottom: 8 }} wrap={false}>
          <View style={{ width: CONTENT_WIDTH * 0.64, borderRightWidth: 0.8, borderRightColor: T.forest, borderLeftWidth: 4.5, borderLeftColor: T.lime, paddingVertical: 9, paddingHorizontal: 9 }}>
            <Text style={{ ...microLabel(T.slate), marginBottom: 3 }}>{safeText(brandName ? `${brandName} · PROCUREMENT` : 'PROCUREMENT')}</Text>
            <Text style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', lineHeight: 1.08, color: T.forest }}>
              REQUEST FOR QUOTE
            </Text>
            {rfq.title ? (
              <Text style={{ fontSize: 7.4, fontWeight: 700, lineHeight: 1.3, color: T.charcoal, borderBottomWidth: 1, borderBottomColor: T.lime, paddingBottom: 2, marginTop: 3 }}>
                {glyphRuns(safeText(rfq.title), bodyFont)}
              </Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.charcoal, paddingHorizontal: 7, paddingVertical: 6 }}>
              <Text style={{ ...microLabel(T.lime), marginBottom: 2 }}>RFQ NO.</Text>
              <Text style={{ fontSize: 12.5, fontWeight: 700, color: T.lime, letterSpacing: 0.4 }}>{glyphRuns(safeText(rfq.rfq_number || ''), bodyFont)}</Text>
            </View>
            <View style={{ paddingHorizontal: 7, paddingVertical: 5 }}>
              <Text style={microLabel()}>ISSUED</Text>
              <Text style={{ fontSize: 8, fontWeight: 700, color: T.charcoal, marginBottom: 4 }}>{glyphRuns(safeText(rfq.issue_date || '—'), bodyFont)}</Text>
              <Text style={microLabel()}>SUBMISSION DEADLINE</Text>
              <Text style={{ fontSize: 8, fontWeight: 700, color: T.limeDark }}>{glyphRuns(safeText(rfq.expiry_date || 'No deadline'), bodyFont)}</Text>
            </View>
          </View>
        </View>

        {/* PARTIES — issuer / requested-from panels */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }} wrap={false}>
          <View style={{ flex: 1, backgroundColor: T.tint, borderWidth: 0.5, borderColor: T.border, borderRadius: 3, padding: 6 }}>
            <Text style={{ ...microLabel(T.slate), borderBottomWidth: 0.5, borderBottomColor: T.border, paddingBottom: 2, marginBottom: 3 }}>Issuing Organisation</Text>
            {companyName ? (
              <Text style={{ fontSize: 9.5, fontWeight: 700, color: T.forest, marginBottom: 2 }}>{glyphRuns(safeText(companyName), bodyFont)}</Text>
            ) : (
              <Text style={{ fontSize: 7.5, color: T.slate }}>—</Text>
            )}
            {companyAddress ? <Text style={{ fontSize: 7.5, color: T.charcoal, lineHeight: 1.35 }}>{glyphRuns(safeText(companyAddress), bodyFont)}</Text> : null}
            {companyPhone ? <Text style={{ fontSize: 7.5, color: T.charcoal, lineHeight: 1.35 }}>{glyphRuns(safeText(`Tel: ${companyPhone}`), bodyFont)}</Text> : null}
          </View>
          <View style={{ flex: 1, backgroundColor: T.tint2, borderWidth: 0.5, borderColor: T.border, borderRadius: 3, padding: 6 }}>
            <Text style={{ ...microLabel(T.slate), borderBottomWidth: 0.5, borderBottomColor: T.border, paddingBottom: 2, marginBottom: 3 }}>Requested From</Text>
            {vendorName ? (
              <>
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: T.forest, marginBottom: 2 }}>{glyphRuns(safeText(vendorName), bodyFont)}</Text>
                {vendorContact ? <Text style={{ fontSize: 7.5, color: T.charcoal, lineHeight: 1.35 }}>{glyphRuns(safeText(vendorContact), bodyFont)}</Text> : null}
              </>
            ) : (
              <Text style={{ fontSize: 7.5, color: T.slate }}>Vendor not specified</Text>
            )}
          </View>
        </View>

        {/* ITEM SCHEDULE */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={microLabel()}>Item Schedule</Text>
          <Text style={microLabel()}>{itemCount} {itemCount === 1 ? 'line' : 'lines'}</Text>
        </View>
        <View style={{ marginBottom: 8, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: T.border }}>
          <Table columns={tableColumns}>
            <Row header>
              <Cell style={{ backgroundColor: T.charcoal, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
                <Text style={{ ...microLabel('#ffffff'), textAlign: 'center' }}>#</Text>
              </Cell>
              {table.visibleColumns.map((column) => (
                <Cell key={column.key} style={{ backgroundColor: T.charcoal, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
                  <Text style={{ ...microLabel('#ffffff'), textAlign: RIGHT_ALIGNED_KEYS.has(column.key) ? 'right' : 'left' }}>{safeText(column.label)}</Text>
                </Cell>
              ))}
              {table.hasProfitColumn ? (
                <Cell style={{ backgroundColor: T.charcoal, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
                  <Text style={{ ...microLabel('#ffffff'), textAlign: 'right' }}>Profit</Text>
                </Cell>
              ) : null}
            </Row>
            {table.displayRows.map((row, index) => {
              if (row.row_type === 'section') {
                return (
                  <Row key={row.id || `section-${index}`}>
                    <Cell colSpan={table.visibleColumns.length + 1 + (table.hasProfitColumn ? 1 : 0)} style={{ backgroundColor: T.limeSoft, paddingVertical: 4, paddingLeft: 6, paddingRight: 6, borderBottomWidth: 0.5, borderBottomColor: T.border }}>
                      <Text style={{ fontSize: 6.5, fontWeight: 700, color: T.forest, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        {glyphRuns(safeText(row.section_title), bodyFont)}
                      </Text>
                    </Cell>
                  </Row>
                )
              }
              const isAlt = index % 2 === 1
              const bg = isAlt ? T.tint : T.paper
              const cellBorder = { borderBottomWidth: 0.5, borderBottomColor: T.borderLight }
              return (
                <Row key={row.id || `row-${index}`}>
                  <Cell style={{ backgroundColor: bg, paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6, ...cellBorder }}>
                    <Text style={{ fontSize: 7, fontWeight: 700, color: T.charcoal, textAlign: 'center' }}>{index + 1}</Text>
                  </Cell>
                  {table.visibleColumns.map((column) => {
                    const value = row[column.key]
                    const text = value === null || value === undefined || value === '' ? '—' : String(value)
                    return (
                      <Cell key={column.key} style={{ backgroundColor: bg, paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6, ...cellBorder }}>
                        <Text style={{ fontSize: 7, color: T.charcoal, textAlign: RIGHT_ALIGNED_KEYS.has(column.key) ? 'right' : 'left' }}>{glyphRuns(text, bodyFont)}</Text>
                      </Cell>
                    )
                  })}
                  {table.hasProfitColumn ? (
                    <Cell style={{ backgroundColor: bg, paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6, ...cellBorder }}>
                      <Text style={{ fontSize: 7, color: T.charcoal, textAlign: 'right' }}>{glyphRuns(`₦${displayRowProfit(row)}`, bodyFont)}</Text>
                    </Cell>
                  ) : null}
                </Row>
              )
            })}
          </Table>
        </View>

        {/* NOTES — only when present on the model */}
        {rfq.notes ? (
          <View style={{ backgroundColor: T.tint, borderWidth: 0.5, borderColor: T.border, borderRadius: 3, padding: 7, marginBottom: 8 }} wrap={false}>
            <Text style={{ ...microLabel(T.slate), marginBottom: 3 }}>Notes &amp; Instructions</Text>
            <Text style={{ fontSize: 7.5, color: T.charcoal, lineHeight: 1.45 }}>{glyphRuns(safeText(rfq.notes), bodyFont)}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

// Re-exported so the dispatcher surface stays stable if the module is imported elsewhere.
export { normalizeRfqTemplateId }
