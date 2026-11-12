import React from 'react'
import { Cell, Document, Fixed, Image, Link, Page, Row, Svg, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../industryAdapter'
import { isFormeSupportedFamily } from './fonts'
import { glyphRuns } from './glyphs'
import { renderFormeRichText } from './formeRichText'
import {
  buildPartyLines,
  buildAttachmentItems,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
} from '../engine'
import { resolveDesignTokens } from '../designTokens'

export const HERITAGE_TOKENS = {
  burgundy: '#5c1a26',
  burgundyDeep: '#451119',
  bronze: '#9a7b45',
  bronzeLight: '#c6aa76',
  ink: '#251e17',
  muted: '#7b6e5c',
  rule: '#d9cbac',
  lightRule: '#eae0ca',
  /* Paper stock: clean white. `page` fills the sheet, and `paper`/`white` are the
     surface tints, so all three are white. Burgundy, bronze and ivory stay. */
  paper: '#ffffff',
  page: '#ffffff',
  ivory: '#f2e9d4',
  white: '#ffffff',
} as const

const PORTRAIT_WIDTH = 595.28
const LANDSCAPE_WIDTH = 841.89
const LANDSCAPE_HEIGHT = 595.28

export interface HeritageHouseFormeDocumentProps {
  data: CommercialDocumentData
  compact?: boolean
}

function safeText(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function resolveTableColumns(columns: CommercialDocumentData['table']['columns'], availableWidth: number) {
  const flexWeights = columns.map((col) => (col.width && col.width > 0 ? 0 : Number(col.flex ?? 1)))
  const fixedTotal = columns.reduce((sum, col) => sum + (col.width && col.width > 0 ? col.width : 0), 0)
  const flexTotal = flexWeights.reduce((sum, w) => sum + w, 0)
  const remaining = Math.max(0, availableWidth - fixedTotal)

  let widths = columns.map((col, i) => (col.width && col.width > 0 ? col.width : flexTotal > 0 ? (remaining * flexWeights[i]) / flexTotal : 0))
  const total = widths.reduce((sum, w) => sum + w, 0)
  if (flexTotal > 0 && total > 0) widths = widths.map((w) => (w * availableWidth) / total)

  const rounded = widths.map((w) => Math.round(w * 100) / 100)
  const adjIdx = flexWeights.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0).pop()
  if (adjIdx !== undefined) {
    const sum = rounded.reduce((tot, w) => tot + w, 0)
    rounded[adjIdx] = Math.round((rounded[adjIdx] + (availableWidth - sum)) * 100) / 100
  }
  return rounded.map((width) => ({ width: { fixed: width } }))
}

function renderBankRow(label: string, value: string | null | undefined, font: string, headerFont: string) {
  if (!value) return null
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
      <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, width: '38%' }}>{label}</Text>
      <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, width: '62%', textAlign: 'right' }}>{safeText(value)}</Text>
    </View>
  )
}

function renderTextCard(
  section: { title?: string; content?: string; plainText?: string } | null | undefined,
  compact: boolean,
  font: string,
  headerFont: string,
  accentColor: string = HERITAGE_TOKENS.bronze,
) {
  if (!section?.content && !section?.plainText) return null
  return (
    <View style={{ marginTop: compact ? 4 : 6, backgroundColor: HERITAGE_TOKENS.white, borderRadius: 2, borderWidth: 0.5, borderColor: HERITAGE_TOKENS.rule, padding: compact ? 6 : 8 }}>
      {section.title ? (
        <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: accentColor, paddingBottom: 1.5 }}>
          {safeText(section.title)}
        </Text>
      ) : null}
      {section.content ? renderFormeRichText(section.content, {
        font,
        paragraphStyle: { fontFamily: font, fontSize: 7.2, color: HERITAGE_TOKENS.ink, lineHeight: 1.38, marginBottom: 3 },
        listMarkerStyle: { fontFamily: headerFont, fontSize: 7.2, color: accentColor, width: 10 },
        listItemTextStyle: { fontFamily: font, fontSize: 7.2, color: HERITAGE_TOKENS.ink, lineHeight: 1.38 },
      }) : (
        <Text style={{ fontFamily: font, fontSize: 7.2, color: HERITAGE_TOKENS.ink, lineHeight: 1.38 }}>{safeText(section.plainText)}</Text>
      )}
    </View>
  )
}

export function HeritageHouseFormeDocument({ data, compact = false }: HeritageHouseFormeDocumentProps) {
  const tokens = resolveDesignTokens(data.design)
  const font = isFormeSupportedFamily(tokens.bodyFont) ? tokens.bodyFont : 'Inter'
  const headerFont = isFormeSupportedFamily(tokens.headerFont) ? tokens.headerFont : (isFormeSupportedFamily('PT Serif') ? 'PT Serif' : 'Inter')
  const bronze = tokens.accentColor || HERITAGE_TOKENS.bronze
  const _bronzeLight = tokens.accentColor || HERITAGE_TOKENS.bronzeLight

  const companyLines = data.company ? buildPartyLines(data.company) : []
  const clientLines = data.client ? buildPartyLines(data.client) : []
  const companyLineMap = new Map<string, string>(companyLines.map((l) => [l.type, l.value] as const))
  const clientLineMap = new Map<string, string>(clientLines.map((l) => [l.type, l.value] as const))
  const attachmentItems = buildAttachmentItems(data.attachments)
  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const amountInWords = getAmountInWords(data.totals)
  const advance = buildAdvanceSummary(data.advanceSummary)
  const isAdvanceInvoice = Boolean(advance)
  const companyLogo = data.company?.companyLogoUrl || (data as { companyLogoUrl?: string; logoUrl?: string }).companyLogoUrl || (data as { companyLogoUrl?: string; logoUrl?: string }).logoUrl || ''

  const footerVisible = Boolean(
    data.footer.extraText || data.showTagline || data.footer.documentNumber || data.footer.companyName || companyLogo,
  )
  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)

  const isLandscape = data.layout?.orientation === 'landscape'
  const pageWidth = isLandscape ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH
  const pageMargin = { top: compact ? 16 : 22, right: 24, bottom: compact ? 16 : 20, left: 24 }
  const contentWidth = pageWidth - pageMargin.left - pageMargin.right
  const tableColumns = resolveTableColumns(data.table.columns, contentWidth)
  const tableColumnCount = data.table.columns.length

  const pageSize = isLandscape
    ? { width: LANDSCAPE_WIDTH, height: LANDSCAPE_HEIGHT }
    : (data.layout?.size || 'A4')

  const companyName = safeText(companyLineMap.get('name') || data.company?.name || '')
  const companySealLetter = companyName.charAt(0).toUpperCase() || 'B'

  const companyTaxInfo = [
    companyLineMap.get('taxId') ? `TIN ${companyLineMap.get('taxId')}` : null,
    companyLineMap.get('registrationNumber') ? `RC ${companyLineMap.get('registrationNumber')}` : null,
  ].filter(Boolean).join('  ·  ')

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()} style={{ fontFamily: font, fontSize: 8.5, color: HERITAGE_TOKENS.ink }}>
      <Page size={pageSize} margin={pageMargin} style={{ backgroundColor: HERITAGE_TOKENS.page }}>
        {/* TOP ACCENT RULE */}
        <Fixed position="header">
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: HERITAGE_TOKENS.rule, paddingBottom: 3, marginBottom: compact ? 5 : 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.5, color: HERITAGE_TOKENS.burgundy, letterSpacing: 1, textTransform: 'uppercase' }}>
              {`${safeText(data.title)} · ${safeText(data.documentNumber)}`}
            </Text>
          </View>
        </Fixed>

        {/* FIXED FOOTER */}
        {footerVisible ? (
          <Fixed position="footer">
            <View style={{ borderTopWidth: 0.5, borderTopColor: HERITAGE_TOKENS.rule, paddingTop: 4 }}>
              {data.footer.extraText ? (
                <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.footer.extraText)}
                </Text>
              ) : null}
              {data.showTagline && data.company?.tagline ? (
                <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: bronze, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.company.tagline)}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, flex: 1 }}>
                  {'Page {{pageNumber}} of {{totalPages}}'}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textAlign: 'center', flex: 1, letterSpacing: 0.5 }}>
                  {safeText(data.footer.documentNumber || data.documentNumber)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                  {companyLogo ? (
                    <Image src={companyLogo} href={companyLogo} style={{ width: 13, height: 13, marginRight: 5 }} />
                  ) : null}
                  <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, textAlign: 'right' }}>
                    {safeText(data.footer.companyName || data.company?.name || '')}
                  </Text>
                </View>
              </View>
            </View>
          </Fixed>
        ) : null}

        {/* 1. MASTHEAD: BRAND SEAL & TITLES */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? 6 : 9 }} wrap={false}>
          {/* Left Issuer with Seal Box */}
          <View style={{ flexDirection: 'row', gap: 8, flex: 1, paddingRight: 10 }}>
            <View style={{ width: 34, height: 34, borderWidth: 1, borderColor: HERITAGE_TOKENS.burgundy, backgroundColor: HERITAGE_TOKENS.white, alignItems: 'center', justifyContent: 'center', padding: 2 }}>
              {companyLogo ? (
                <Image src={companyLogo} href={companyLogo} style={{ width: 30, height: 30 }} />
              ) : (
                <Text style={{ fontFamily: headerFont, fontSize: 16, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, lineHeight: 1 }}>
                  {companySealLetter}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: headerFont, fontSize: compact ? 11 : 12.5, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {companyName}
              </Text>
              {companyTaxInfo ? (
                <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 700, color: bronze, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>
                  {companyTaxInfo}
                </Text>
              ) : null}
              {companyLineMap.get('address') ? (
                <Text style={{ fontFamily: font, fontSize: 7, color: HERITAGE_TOKENS.muted, lineHeight: 1.3, marginTop: 2 }}>
                  {safeText(companyLineMap.get('address'))}
                  {companyLineMap.get('cityState') ? `, ${safeText(companyLineMap.get('cityState'))}` : ''}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 1.5 }}>
                {companyLineMap.get('phone') ? (
                  <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted }}>{`Tel: ${safeText(companyLineMap.get('phone'))}`}</Text>
                ) : null}
                {companyLineMap.get('email') ? (
                  <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted }}>{`Email: ${safeText(companyLineMap.get('email'))}`}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Right Wordmark & Document Meta */}
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Text style={{ fontFamily: headerFont, fontSize: compact ? 16 : 19, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {safeText(data.title)}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 7.2, color: HERITAGE_TOKENS.muted, letterSpacing: 0.6, marginTop: 2 }}>
              {`No. `}
              <Text style={{ fontFamily: headerFont, fontWeight: 700, color: HERITAGE_TOKENS.ink }}>{safeText(data.documentNumber)}</Text>
            </Text>
            <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, letterSpacing: 0.5, marginTop: 1 }}>
              {`${safeText(data.issueDateLabel || 'Issue Date')} ${safeText(data.issueDate || '')}`.trim()}
            </Text>
          </View>
        </View>

        {/* Diamond Ornament Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: compact ? 3 : 5 }}>
          <View style={{ flex: 1, height: 0.5, backgroundColor: bronze }} />
          {/* Vector diamond. No font-family glyph is involved, so no fallback can
              render a missing-glyph box or question mark. */}
          <Svg
            width={5}
            height={5}
            viewBox="0 0 10 10"
            style={{ marginHorizontal: 6 }}
            content={`<path d="M5 0.6 L9.4 5 L5 9.4 L0.6 5 Z" fill="${bronze}" />`}
          />
          <View style={{ flex: 1, height: 0.5, backgroundColor: bronze }} />
        </View>

        {data.customTitle ? (
          <View style={{ alignItems: 'center', marginBottom: compact ? 4 : 6 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontStyle: 'italic', color: HERITAGE_TOKENS.burgundy }}>
              {safeText(data.customTitle)}
            </Text>
          </View>
        ) : null}

        {/* 2. PARTIES & DOT-LEADER PARTICULARS */}
        <View style={{ flexDirection: 'row', gap: 12, borderTopWidth: 0.5, borderTopColor: HERITAGE_TOKENS.rule, paddingTop: compact ? 4 : 6, marginBottom: compact ? 6 : 8 }} wrap={false}>
          {/* Bill To */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontStyle: 'italic', color: bronze, letterSpacing: 0.5, marginBottom: 2 }}>
              {data.isProcurement ? (data.partyHeaderLabel || 'Order From · Supplier') : 'Bill To · Client'}
            </Text>
            {clientLineMap.get('name') ? (
              <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, marginBottom: 2 }}>
                {safeText(clientLineMap.get('name'))}
              </Text>
            ) : null}
            {clientLines.filter((l) => l.type !== 'name').map((line, idx) => (
              <Text key={`cl-${idx}`} style={{ fontFamily: font, fontSize: 7.2, color: '#3f362a', lineHeight: 1.35 }}>
                {safeText(line.value)}
              </Text>
            ))}
          </View>

          {/* Project Details with Dot Leaders */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontStyle: 'italic', color: bronze, letterSpacing: 0.5, marginBottom: 2 }}>
              {'Particulars & References'}
            </Text>
            {data.dueDateOrValidityDate ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, textTransform: 'uppercase' }}>{safeText(data.dueDateOrValidityDateLabel || 'Due Date')}</Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.2, fontWeight: 700, color: HERITAGE_TOKENS.burgundy }}>{safeText(data.dueDateOrValidityDate)}</Text>
              </View>
            ) : null}
            {data.poNumber ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, textTransform: 'uppercase' }}>{safeText(data.poNumberLabel || 'Client PO Ref')}</Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.2, fontWeight: 700, color: HERITAGE_TOKENS.ink }}>{safeText(data.poNumber)}</Text>
              </View>
            ) : null}
            {data.customHeaderFields.map((field, idx) => (
              <View key={`chf-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, textTransform: 'uppercase' }}>{safeText(field.label)}</Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.2, fontWeight: 700, color: HERITAGE_TOKENS.ink }}>{safeText(field.value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. LINE ITEMS REGISTER TABLE */}
        {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: compact ? 6 : 8 }}>
            <Table columns={tableColumns}>
              <Row header>
                {data.table.columns.map((column, idx) => (
                  <Cell
                    key={`th-${idx}`}
                    style={{
                      paddingTop: compact ? 4 : 5,
                      paddingBottom: compact ? 4 : 5,
                      paddingLeft: 5,
                      paddingRight: 5,
                      borderTopWidth: 0.5,
                      borderTopColor: bronze,
                      borderBottomWidth: 1,
                      borderBottomColor: HERITAGE_TOKENS.burgundy,
                      backgroundColor: HERITAGE_TOKENS.white,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 6.5,
                        fontWeight: 700,
                        color: HERITAGE_TOKENS.burgundy,
                        textAlign: (column.align as 'left' | 'center' | 'right' | 'justify') || 'left',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}
                    >
                      {safeText(column.label)}
                    </Text>
                  </Cell>
                ))}
              </Row>

              {data.table.rows.map((row, rowIdx) => {
                if (row.rowType === 'group_header') {
                  return (
                    <Row key={`gh-${rowIdx}`} style={{ backgroundColor: HERITAGE_TOKENS.white, borderTopWidth: 0.5, borderTopColor: bronze, borderBottomWidth: 0.5, borderBottomColor: HERITAGE_TOKENS.rule }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 5 }}>
                        <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {safeText(row.groupLabel || row.groupName)}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  return (
                    <Row key={`gf-${rowIdx}`} style={{ backgroundColor: HERITAGE_TOKENS.white, borderTopWidth: 0.5, borderTopColor: HERITAGE_TOKENS.rule, borderBottomWidth: 1.5, borderBottomColor: HERITAGE_TOKENS.burgundy }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 5 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ fontFamily: headerFont, fontSize: 7.2, fontStyle: 'italic', color: HERITAGE_TOKENS.burgundy, marginRight: 8 }}>
                            {safeText(row.groupLabel || row.groupName || 'End of Group')}
                          </Text>
                          <Text style={{ fontFamily: headerFont, fontSize: 7.8, fontWeight: 700, color: HERITAGE_TOKENS.burgundy }}>
                            {glyphRuns(safeText(row.groupSubtotalValue), font)}
                          </Text>
                        </View>
                      </Cell>
                    </Row>
                  )
                }

                const rowBg = HERITAGE_TOKENS.white
                return (
                  <Row key={`tr-${rowIdx}`} style={{ backgroundColor: rowBg, borderBottomWidth: 0.5, borderBottomColor: HERITAGE_TOKENS.rule }}>
                    {data.table.columns.map((col, colIdx) => {
                      const align = (col.align as 'left' | 'center' | 'right' | 'justify') || 'left'
                      const cell = row.cells?.[col.key]
                      const cellStyle = {
                        paddingTop: compact ? 3 : 4, paddingBottom: compact ? 3 : 4,
                        paddingLeft: 5, paddingRight: 5,
                      }

                      if (col.key === 'description') {
                        const descObj = typeof cell === 'object' && cell !== null ? cell as { main?: string; sub?: string } : null
                        const main = descObj?.main || (typeof cell === 'string' ? cell : '')
                        const sub = descObj?.sub || ''
                        return (
                          <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                            <Text style={{ fontFamily: headerFont, fontSize: compact ? 7.8 : 8.2, fontWeight: 700, color: HERITAGE_TOKENS.ink, lineHeight: 1.3 }}>
                              {glyphRuns(main, font)}
                            </Text>
                            {sub ? <Text style={{ fontFamily: font, fontSize: 7, color: HERITAGE_TOKENS.muted, lineHeight: 1.35, marginTop: 1 }}>{glyphRuns(sub, font)}</Text> : null}
                            {row.imageUrl ? (
                              <View style={{ marginTop: 2 }}>
                                <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 32, height: 32, borderRadius: 2 }} />
                                <Link href={row.imageUrl} style={{ fontSize: 6.5, color: bronze, textDecoration: 'underline', marginTop: 1 }}>Open image</Link>
                              </View>
                            ) : null}
                          </Cell>
                        )
                      }

                      const rawText = safeText(cell)
                      const text = col.key === 'quantity' ? rawText.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/, '$1 $2') : rawText
                      return (
                        <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                          <Text style={{
                            fontFamily: col.key === 'amount' || col.key === 'num' ? headerFont : font,
                            fontSize: 7.5,
                            fontWeight: col.key === 'amount' || col.key === 'num' ? 700 : 400,
                            color: col.key === 'num' ? bronze : (col.key === 'amount' ? HERITAGE_TOKENS.burgundy : HERITAGE_TOKENS.ink),
                            textAlign: align, lineHeight: 1.3,
                          }}>
                            {glyphRuns(text, font)}
                          </Text>
                        </Cell>
                      )
                    })}
                  </Row>
                )
              })}
            </Table>
          </View>
        ) : null}

        {/* 4. CLOSING: LEDGER & HERITAGE DUE BLOCK */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: compact ? 4 : 6, borderTopWidth: 1, borderTopColor: HERITAGE_TOKENS.burgundy, paddingTop: 4 }} wrap={false}>
          {/* Left Financial Ledger */}
          <View style={{ flex: 1 }}>
            {totalsLines.map((line, idx) => (
              <View key={`tot-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.8, borderBottomWidth: 0.5, borderBottomColor: HERITAGE_TOKENS.rule }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: line.isDeduction ? HERITAGE_TOKENS.burgundy : HERITAGE_TOKENS.ink }}>
                  {safeText(line.label)}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.2, fontWeight: 700, color: line.isDeduction ? HERITAGE_TOKENS.burgundy : HERITAGE_TOKENS.ink }}>
                  {glyphRuns(safeText(line.value), font)}
                </Text>
              </View>
            ))}
            {balanceDue ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderTopWidth: 0.5, borderTopColor: bronze, borderBottomWidth: 1.5, borderBottomColor: HERITAGE_TOKENS.burgundy, marginTop: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: HERITAGE_TOKENS.burgundy }}>
                  {safeText(balanceDue.label || 'Balance Due')}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.8, fontWeight: 700, color: HERITAGE_TOKENS.burgundy }}>
                  {glyphRuns(safeText(balanceDue.value), font)}
                </Text>
              </View>
            ) : null}
            {isAdvanceInvoice && advance ? (
              <View style={{ marginTop: 4, padding: 4, backgroundColor: HERITAGE_TOKENS.white, borderRadius: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase' }}>
                  {safeText(advance.primaryLabel || 'Advance Payment')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 7, color: HERITAGE_TOKENS.ink }}>
                  {`Advance: ${safeText(advance.advanceAmount)}  ·  Remaining: ${safeText(advance.balanceRemaining)}`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right Due Callout & Remittance Details */}
          <View style={{ width: '46%' }}>
            <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
              <Text style={{ fontFamily: font, fontSize: 6.5, color: HERITAGE_TOKENS.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                {safeText(mainTotal?.label || 'TOTAL AMOUNT DUE')}
              </Text>
              <Text style={{ fontFamily: headerFont, fontSize: compact ? 15 : 18, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, marginVertical: 2 }}>
                {glyphRuns(safeText(mainTotal?.value || '₦0.00'), font)}
              </Text>
              <View style={{ width: '100%', height: 1, borderTopWidth: 0.5, borderTopColor: HERITAGE_TOKENS.burgundy, borderBottomWidth: 0.5, borderBottomColor: bronze, marginVertical: 2 }} />
              {amountInWords ? (
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontStyle: 'italic', color: HERITAGE_TOKENS.muted, textAlign: 'right', lineHeight: 1.35 }}>
                  {safeText(amountInWords)}
                </Text>
              ) : null}
            </View>

            {hasBankDetails && data.paymentDetails ? (
              <View style={{ backgroundColor: HERITAGE_TOKENS.white, borderWidth: 0.5, borderColor: bronze, borderRadius: 2, padding: compact ? 5 : 6 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2, borderBottomWidth: 0.5, borderBottomColor: HERITAGE_TOKENS.rule, paddingBottom: 1.5 }}>
                  {'BANK PAYMENT DETAILS'}
                </Text>
                {renderBankRow('Bank', data.paymentDetails.bankName, font, headerFont)}
                {renderBankRow('Account No', data.paymentDetails.accountNumber, font, headerFont)}
                {renderBankRow('Account Name', data.paymentDetails.accountName, font, headerFont)}
                {renderBankRow('Sort Code', data.paymentDetails.sortCode, font, headerFont)}
              </View>
            ) : data.isProcurement && data.deliveryDestination ? (
              <View style={{ backgroundColor: HERITAGE_TOKENS.white, borderWidth: 0.5, borderColor: bronze, borderRadius: 2, padding: compact ? 5 : 6 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2, borderBottomWidth: 0.5, borderBottomColor: HERITAGE_TOKENS.rule, paddingBottom: 1.5 }}>
                  {data.deliveryDestination.label || 'DELIVERY DESTINATION'}
                </Text>
                {data.deliveryDestination.site ? (
                  <Text style={{ fontFamily: headerFont, fontSize: 7.2, fontWeight: 700, color: HERITAGE_TOKENS.ink, marginBottom: 1 }}>
                    {data.deliveryDestination.site}
                  </Text>
                ) : null}
                {(data.deliveryDestination.addressLines || []).map((line, idx) => (
                  <Text key={'dest-line-' + idx} style={{ fontFamily: font, fontSize: 6.8, color: HERITAGE_TOKENS.muted, marginBottom: 1 }}>
                    {line}
                  </Text>
                ))}
                {data.deliveryDestination.contactPerson ? (
                  <Text style={{ fontFamily: font, fontSize: 6.5, color: HERITAGE_TOKENS.muted, marginTop: 1 }}>
                    Contact: {data.deliveryDestination.contactPerson} {data.deliveryDestination.phone ? '(' + data.deliveryDestination.phone + ')' : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* 5. NOTES & TERMS */}
        {(data.notes || data.terms) ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: compact ? 4 : 6, borderTopWidth: 0.5, borderTopColor: HERITAGE_TOKENS.rule, paddingTop: 4 }} wrap={false}>
            {data.notes ? (
              <View style={{ flex: 1 }}>
                {renderTextCard(data.notes, compact, font, headerFont, bronze)}
              </View>
            ) : null}
            {data.terms ? (
              <View style={{ flex: 1 }}>
                {renderTextCard(data.terms, compact, font, headerFont, bronze)}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 6. ATTACHMENTS */}
        {attachmentItems.length > 0 ? (
          <View style={{ marginTop: compact ? 4 : 6, backgroundColor: HERITAGE_TOKENS.white, borderRadius: 2, borderWidth: 0.5, borderColor: HERITAGE_TOKENS.rule, padding: 5 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: HERITAGE_TOKENS.burgundy, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
              {'DOCUMENT ATTACHMENTS & SPECIFICATIONS'}
            </Text>
            {attachmentItems.map((att, idx) => (
              <View key={`att-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1.5 }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: HERITAGE_TOKENS.ink, marginRight: 4 }}>{`• ${safeText(att.label)}`}</Text>
                {att.url ? <Link href={att.url} style={{ fontSize: 6.8, color: bronze, textDecoration: 'underline' }}>Open document</Link> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* 7. SIGNATURES — strictly conditional on genuine signature data */}
        {data.isProcurement && data.procurementSignatories && (data.procurementSignatories.requisitioner || data.procurementSignatories.authorizer) ? (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: compact ? 6 : 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: HERITAGE_TOKENS.burgundy }} wrap={false}>
            {data.procurementSignatories.requisitioner ? (
              <View style={{ width: 180 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontStyle: 'italic', color: bronze, marginBottom: 2 }}>
                  {data.procurementSignatories.requisitioner.label || 'Purchasing Officer / Requisitioner'}
                </Text>
                {data.procurementSignatories.requisitioner.signatureUrl ? (
                  <Image src={data.procurementSignatories.requisitioner.signatureUrl} href={data.procurementSignatories.requisitioner.signatureUrl} style={{ width: 100, height: 32, marginVertical: 2 }} />
                ) : null}
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: HERITAGE_TOKENS.ink }}>
                  {safeText(data.procurementSignatories.requisitioner.name || 'Authorised Requisitioner')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 6.5, color: HERITAGE_TOKENS.muted }}>
                  {safeText(data.procurementSignatories.requisitioner.title || 'Purchasing Officer')}
                </Text>
              </View>
            ) : null}

            {data.procurementSignatories.authorizer ? (
              <View style={{ width: 180 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontStyle: 'italic', color: bronze, marginBottom: 2 }}>
                  {data.procurementSignatories.authorizer.label || 'Management / Finance Authorisation'}
                </Text>
                {data.procurementSignatories.authorizer.signatureUrl ? (
                  <Image src={data.procurementSignatories.authorizer.signatureUrl} href={data.procurementSignatories.authorizer.signatureUrl} style={{ width: 100, height: 32, marginVertical: 2 }} />
                ) : null}
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: HERITAGE_TOKENS.ink }}>
                  {safeText(data.procurementSignatories.authorizer.name || 'Authorised By')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 6.5, color: HERITAGE_TOKENS.muted }}>
                  {safeText(data.procurementSignatories.authorizer.title || 'Management Authorisation')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : !data.isProcurement && data.signature && (data.signature.imageUrl || data.signature.name) ? (
          <View style={{ marginTop: compact ? 6 : 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: HERITAGE_TOKENS.burgundy, width: 180 }} wrap={false}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontStyle: 'italic', color: bronze, marginBottom: 2 }}>
              {'Authorised Signatory'}
            </Text>
            {data.signature.imageUrl ? (
              <Image src={data.signature.imageUrl} href={data.signature.imageUrl} style={{ width: 100, height: 32, marginVertical: 2 }} />
            ) : null}
            {data.signature.name ? (
              <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: HERITAGE_TOKENS.ink }}>
                {safeText(data.signature.name)}
              </Text>
            ) : null}
            {data.signature.role ? (
              <Text style={{ fontFamily: font, fontSize: 6.5, color: HERITAGE_TOKENS.muted }}>
                {safeText(data.signature.role)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
