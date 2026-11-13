import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Svg, Table, Text, View } from '@formepdf/react'
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
 * Executive RFQ — centred serif masthead, slate rules with a diamond rule
 * separator, panel metadata bar. Adapted from the commercial Executive
 * template to RFQ semantics; invoice-specific furniture (totals, bank
 * details, terms-of-payment panels, BOQ schedules) is intentionally absent.
 */
export const RFQ_EXECUTIVE_TOKENS = {
  forestDark: '#0f281e',
  forestLight: '#24523f',
  slate: '#527c91',
  slateLight: '#9db8c6',
  slatePale: '#eef3f6',
  paper: '#ffffff',
  panel: '#f4f7f9',
  ink: '#1c201d',
  grayText: '#4e5a5f',
  mutedText: '#7c888e',
  white: '#ffffff',
  rule: '#d7e0e5',
  lightRule: '#e9eff2',
} as const

const PAGE_WIDTH = 595.28
const PAGE_MARGIN = { top: 22, right: 24, bottom: 20, left: 24 }
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN.left - PAGE_MARGIN.right

export function RfqExecutiveDocument({ rfq, rows, columns, settings }: RfqFormeDocumentProps): React.JSX.Element {
  const T = RFQ_EXECUTIVE_TOKENS
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
  const status = String((rfq as { status?: unknown }).status || 'open').toUpperCase()

  const tableColumns = [
    { width: { fixed: (table.sNoWidthPct / 100) * CONTENT_WIDTH } },
    ...table.visibleColumns.map((column) => ({
      width: { fixed: ((table.columnWidths.get(column.key) ?? 12) / 100) * CONTENT_WIDTH },
    })),
    ...(table.hasProfitColumn ? [{ width: { fixed: (table.profitWidthPct / 100) * CONTENT_WIDTH } }] : []),
  ]

  const bodyFont = 'Inter'
  const displayFont = 'PT Serif'

  return (
    <Document title={`RFQ ${safeText(rfq.rfq_number)}`.trim()} author={companyName || 'Company'} style={{ fontFamily: bodyFont, fontSize: 8.5, color: T.ink }}>
      <Page size="A4" margin={PAGE_MARGIN} style={{ backgroundColor: T.paper }}>
        {/* FIXED HEADER — slate hairline with document identity */}
        <Fixed position="header" style={{ borderBottomWidth: 0.5, borderBottomColor: T.slateLight, paddingBottom: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: displayFont, fontSize: 6.5, color: T.slate, letterSpacing: 1, textTransform: 'uppercase' }}>
            {safeText(`REQUEST FOR QUOTE${rfq.rfq_number ? ` · ${rfq.rfq_number}` : ''}`)}
          </Text>
        </Fixed>

        {/* FIXED FOOTER — slate hairline, page + register number + company */}
        <Fixed position="footer" style={{ borderTopWidth: 0.5, borderTopColor: T.slateLight, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 7, color: T.mutedText, flex: 1 }}>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
          <Text style={{ fontFamily: displayFont, fontSize: 7, fontWeight: 700, color: T.forestLight, textAlign: 'center', flex: 1, letterSpacing: 0.5 }}>
            {safeText(rfq.rfq_number || '')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
            {companyLogo ? <Image src={companyLogo} alt="Company logo" style={{ width: 13, height: 13, marginRight: 5 }} /> : null}
            <Text style={{ fontSize: 7, color: T.mutedText, textAlign: 'right' }}>{safeText(companyName || brandName || '')}</Text>
          </View>
        </Fixed>

        {/* SYMMETRICAL MASTHEAD */}
        <View style={{ alignItems: 'center', marginBottom: 10 }} wrap={false}>
          {companyLogo ? (
            <View style={{ marginBottom: 4, alignItems: 'center' }}>
              <Image src={companyLogo} alt="Company logo" style={{ width: 34, height: 34 }} />
            </View>
          ) : null}
          {companyName ? (
            <Text style={{ fontFamily: displayFont, fontSize: 15, fontWeight: 700, color: T.forestDark, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
              {glyphRuns(safeText(companyName), displayFont)}
            </Text>
          ) : null}
          {companyAddress ? (
            <Text style={{ fontSize: 7.2, color: T.mutedText, textAlign: 'center', marginTop: 2, lineHeight: 1.3 }}>
              {glyphRuns(safeText(companyAddress), bodyFont)}
              {companyPhone ? `  ·  Tel: ${safeText(companyPhone)}` : ''}
            </Text>
          ) : null}

          {/* Diamond Rule Separator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '60%', marginVertical: 5 }}>
            <View style={{ flex: 1, height: 0.5, backgroundColor: T.slateLight }} />
            <Svg
              width={5}
              height={5}
              viewBox="0 0 10 10"
              style={{ marginHorizontal: 6 }}
              content={`<path d="M5 0.6 L9.4 5 L5 9.4 L0.6 5 Z" fill="${T.slate}" />`}
            />
            <View style={{ flex: 1, height: 0.5, backgroundColor: T.slateLight }} />
          </View>

          {/* Document Title */}
          <Text style={{ fontFamily: displayFont, fontSize: 19, fontWeight: 700, color: T.forestDark, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' }}>
            REQUEST FOR QUOTE
          </Text>
          {rfq.title ? (
            <Text style={{ fontFamily: displayFont, fontSize: 8, fontStyle: 'italic', color: T.slate, marginTop: 1, textAlign: 'center' }}>
              {glyphRuns(safeText(rfq.title), displayFont)}
            </Text>
          ) : null}

          {/* 4-Cell Metadata Bar */}
          <View style={{ flexDirection: 'row', width: '100%', backgroundColor: T.panel, borderWidth: 0.5, borderColor: T.slateLight, borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 0.5, borderRightColor: T.slateLight, alignItems: 'center' }}>
              <Text style={{ fontSize: 6.2, color: T.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>RFQ No.</Text>
              <Text style={{ fontFamily: displayFont, fontSize: 7.5, fontWeight: 700, color: T.forestDark, marginTop: 1 }}>{glyphRuns(safeText(rfq.rfq_number || ''), displayFont)}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 0.5, borderRightColor: T.slateLight, alignItems: 'center' }}>
              <Text style={{ fontSize: 6.2, color: T.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>Issued</Text>
              <Text style={{ fontFamily: displayFont, fontSize: 7.5, fontWeight: 700, color: T.ink, marginTop: 1 }}>{glyphRuns(safeText(rfq.issue_date || ''), displayFont)}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 0.5, borderRightColor: T.slateLight, alignItems: 'center' }}>
              <Text style={{ fontSize: 6.2, color: T.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>Deadline</Text>
              <Text style={{ fontFamily: displayFont, fontSize: 7.5, fontWeight: 700, color: T.slate, marginTop: 1 }}>{glyphRuns(safeText(rfq.expiry_date || 'No deadline'), displayFont)}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 6.2, color: T.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</Text>
              <Text style={{ fontFamily: displayFont, fontSize: 7.5, fontWeight: 700, color: T.forestLight, marginTop: 1, textTransform: 'uppercase' }}>{glyphRuns(safeText(status), displayFont)}</Text>
            </View>
          </View>
        </View>

        {/* PARTIES & PARTICULARS */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }} wrap={false}>
          <View style={{ flex: 1, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.slateLight, borderRadius: 3, padding: 8 }}>
            <Text style={{ fontFamily: displayFont, fontSize: 7, fontWeight: 700, color: T.slate, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: T.slatePale, paddingBottom: 2 }}>
              Issued By · Requesting Organisation
            </Text>
            {companyName ? (
              <Text style={{ fontFamily: displayFont, fontSize: 9.5, fontWeight: 700, color: T.forestDark, marginBottom: 2 }}>{glyphRuns(safeText(companyName), displayFont)}</Text>
            ) : (
              <Text style={{ fontSize: 7.5, color: T.mutedText }}>—</Text>
            )}
            {companyAddress ? <Text style={{ fontSize: 7.5, color: T.grayText, lineHeight: 1.35 }}>{glyphRuns(safeText(companyAddress), bodyFont)}</Text> : null}
            {companyPhone ? <Text style={{ fontSize: 7.5, color: T.grayText, lineHeight: 1.35 }}>{glyphRuns(safeText(`Tel: ${companyPhone}`), bodyFont)}</Text> : null}
          </View>

          <View style={{ flex: 1, backgroundColor: T.panel, borderWidth: 0.5, borderColor: T.slateLight, borderRadius: 3, padding: 8 }}>
            <Text style={{ fontFamily: displayFont, fontSize: 7, fontWeight: 700, color: T.slate, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: T.slateLight, paddingBottom: 2 }}>
              Requested From
            </Text>
            {vendorName ? (
              <>
                <Text style={{ fontFamily: displayFont, fontSize: 9.5, fontWeight: 700, color: T.forestDark, marginBottom: 2 }}>{glyphRuns(safeText(vendorName), displayFont)}</Text>
                {vendorContact ? <Text style={{ fontSize: 7.5, color: T.grayText, lineHeight: 1.35 }}>{glyphRuns(safeText(vendorContact), bodyFont)}</Text> : null}
              </>
            ) : (
              <Text style={{ fontSize: 7.5, color: T.mutedText }}>Vendor not specified</Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 6.2, color: T.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>Lines</Text>
              <Text style={{ fontFamily: displayFont, fontSize: 7, fontWeight: 700, color: T.forestDark }}>{itemCount}</Text>
            </View>
          </View>
        </View>

        {/* ITEM SCHEDULE TABLE */}
        {table.visibleColumns.length > 0 ? (
          <View style={{ marginBottom: 10 }}>
            <Table columns={tableColumns}>
              <Row header>
                {[
                  { label: '#', align: 'center' as const },
                  ...table.visibleColumns.map((column) => ({ label: column.label, align: (RIGHT_ALIGNED_KEYS.has(column.key) ? 'right' : 'left') as 'left' | 'right' })),
                  ...(table.hasProfitColumn ? [{ label: 'Profit', align: 'right' as const }] : []),
                ].map((column, idx) => (
                  <Cell
                    key={`th-${idx}`}
                    style={{
                      backgroundColor: T.forestLight,
                      paddingTop: 5,
                      paddingBottom: 5,
                      paddingLeft: 6,
                      paddingRight: 6,
                      borderRightWidth: idx < table.visibleColumns.length + (table.hasProfitColumn ? 1 : 0) ? 0.5 : 0,
                      borderRightColor: '#25483b',
                    }}
                  >
                    <Text style={{ fontFamily: displayFont, fontSize: 7, fontWeight: 700, color: T.white, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: column.align }}>
                      {safeText(column.label)}
                    </Text>
                  </Cell>
                ))}
              </Row>

              {table.displayRows.map((row, rowIdx) => {
                if (row.row_type === 'section') {
                  return (
                    <Row key={row.id || `section-${rowIdx}`}>
                      <Cell colSpan={table.visibleColumns.length + 1 + (table.hasProfitColumn ? 1 : 0)} style={{ backgroundColor: T.slatePale, paddingVertical: 4, paddingLeft: 6, paddingRight: 6, borderBottomWidth: 0.5, borderBottomColor: T.slateLight }}>
                        <Text style={{ fontFamily: displayFont, fontSize: 7.5, fontWeight: 700, color: T.forestDark, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {glyphRuns(safeText(row.section_title), bodyFont)}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }
                const isAlt = rowIdx % 2 === 1
                const bg = isAlt ? T.panel : T.white
                const cellBorder = { borderBottomWidth: 0.5, borderBottomColor: T.lightRule }
                return (
                  <Row key={row.id || `row-${rowIdx}`}>
                    <Cell style={{ backgroundColor: bg, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6, ...cellBorder }}>
                      <Text style={{ fontSize: 7.5, fontWeight: 700, color: T.ink, textAlign: 'center' }}>{rowIdx + 1}</Text>
                    </Cell>
                    {table.visibleColumns.map((column) => {
                      const value = row[column.key]
                      const text = value === null || value === undefined || value === '' ? '—' : String(value)
                      return (
                        <Cell key={column.key} style={{ backgroundColor: bg, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6, ...cellBorder }}>
                          <Text style={{ fontSize: 7.5, color: T.ink, textAlign: RIGHT_ALIGNED_KEYS.has(column.key) ? 'right' : 'left' }}>{glyphRuns(text, bodyFont)}</Text>
                        </Cell>
                      )
                    })}
                    {table.hasProfitColumn ? (
                      <Cell style={{ backgroundColor: bg, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6, ...cellBorder }}>
                        <Text style={{ fontSize: 7.5, color: T.ink, textAlign: 'right' }}>{glyphRuns(`₦${displayRowProfit(row)}`, bodyFont)}</Text>
                      </Cell>
                    ) : null}
                  </Row>
                )
              })}
            </Table>
          </View>
        ) : null}

        {/* NOTES & INSTRUCTIONS — only when present on the model */}
        {rfq.notes ? (
          <View style={{ backgroundColor: T.panel, borderRadius: 3, borderWidth: 0.5, borderColor: T.slateLight, padding: 10 }} wrap={false}>
            <Text style={{ fontFamily: displayFont, fontSize: 7, fontWeight: 700, color: T.slate, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Notes &amp; Instructions
            </Text>
            <Text style={{ fontSize: 7.5, color: T.grayText, lineHeight: 1.45 }}>{glyphRuns(safeText(rfq.notes), bodyFont)}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
