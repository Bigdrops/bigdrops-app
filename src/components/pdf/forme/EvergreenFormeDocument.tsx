import React from 'react'
import { Cell, Document, Fixed, Image, Link, Page, Row, Table, Text, View } from '@formepdf/react'
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

export const EVERGREEN_TOKENS = {
  accent: '#1f6e5c', accentDim: '#2a8a73', accentLight: '#e8f3ef', accentPale: '#f0f6f2',
  ink: '#1a3a32', paper: '#ffffff', rule: '#d4dfd8', lightRule: '#e6ede8', panel: '#f7faf8',
  grayText: '#5a7268', mutedText: '#7f9a8e', link: '#1a6b5c', white: '#ffffff',
} as const

const PORTRAIT_WIDTH = 595.28
const LANDSCAPE_WIDTH = 841.89
const LANDSCAPE_HEIGHT = 595.28

export interface EvergreenFormeDocumentProps {
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

function renderBankRow(label: string, value: string | null | undefined, font: string, headerFont: string, inkColor: string, grayTextColor: string) {
  if (!value) return null
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
      <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, width: '35%' }}>{label}</Text>
      <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: inkColor, width: '65%', textAlign: 'right' }}>
        {safeText(value)}
      </Text>
    </View>
  )
}

function renderPartyCard(
  title: string,
  lineMap: Map<string, string>,
  lines: ReturnType<typeof buildPartyLines>,
  compact: boolean,
  accentPale: string,
  headerFont: string,
  accentColor: string,
  font: string,
  inkColor: string,
  grayTextColor: string,
) {
  return (
    <View style={{ flex: 1, backgroundColor: accentPale, borderRadius: 6, padding: compact ? 8 : 12 }}>
      <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
        {title}
      </Text>
      {lineMap.get('name') ? (
        <Text style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: inkColor, marginBottom: 3 }}>
          {safeText(lineMap.get('name'))}
        </Text>
      ) : null}
      {lines.filter((l) => l.type !== 'name').map((line, idx) => (
        <Text key={line.key || idx} style={{ fontFamily: font, fontSize: 8.5, color: grayTextColor, lineHeight: 1.38, marginBottom: 1 }}>
          {safeText(line.value)}
        </Text>
      ))}
    </View>
  )
}

function renderTextCard(
  section: { title?: string; content?: string; plainText?: string } | null | undefined,
  compact: boolean,
  accentPale: string,
  headerFont: string,
  accentColor: string,
  font: string,
  grayTextColor: string,
) {
  if (!section?.content && !section?.plainText) return null
  return (
    <View style={{ marginTop: compact ? 6 : 8, backgroundColor: accentPale, borderRadius: 6, padding: compact ? 8 : 12 }}>
      {section.title ? (
        <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
          {safeText(section.title)}
        </Text>
      ) : null}
      {section.content ? (
        renderFormeRichText(section.content, {
          font,
          paragraphStyle: { fontFamily: font, fontSize: 8, color: grayTextColor, lineHeight: 1.45, marginBottom: 4 },
          listMarkerStyle: { fontFamily: headerFont, fontSize: 8, color: grayTextColor, width: 10 },
          listItemTextStyle: { fontFamily: font, fontSize: 8, color: grayTextColor, lineHeight: 1.45 },
        })
      ) : (
        <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, lineHeight: 1.45 }}>
          {safeText(section.plainText)}
        </Text>
      )}
    </View>
  )
}

export function EvergreenFormeDocument({ data, compact = false }: EvergreenFormeDocumentProps) {
  const tokens = resolveDesignTokens(data.design)
  const accentColor = tokens.accentColor || EVERGREEN_TOKENS.accent
  const accentPale = EVERGREEN_TOKENS.accentPale
  const inkColor = tokens.textColor || EVERGREEN_TOKENS.ink
  const grayTextColor = tokens.mutedColor || EVERGREEN_TOKENS.grayText
  const mutedTextColor = EVERGREEN_TOKENS.mutedText
  const ruleColor = tokens.borderColor || EVERGREEN_TOKENS.rule

  const font = isFormeSupportedFamily(tokens.bodyFont) ? tokens.bodyFont : 'Inter'
  const headerFont = isFormeSupportedFamily(tokens.headerFont) ? tokens.headerFont : 'Inter'

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
  const companyLogo = data.company?.companyLogoUrl || (data as any)?.companyLogoUrl || (data as any)?.logoUrl || ''

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

  const companyContactParts = [
    companyLineMap.get('phone'),
    companyLineMap.get('email'),
    companyLineMap.get('website'),
  ].filter(Boolean)
  const companyContactLine = companyContactParts.join(' | ')

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()} style={{ fontFamily: font, fontSize: 9, color: inkColor }}>
      <Page size={pageSize} margin={pageMargin} style={{ backgroundColor: tokens.surfaceColor || EVERGREEN_TOKENS.paper }}>
        {/* TOP ACCENT BAR */}
        <Fixed position="header">
          <View style={{ height: 4, backgroundColor: accentColor, borderRadius: 2, marginBottom: compact ? 6 : 8 }} />
        </Fixed>

        {/* FIXED FOOTER */}
        {footerVisible ? (
          <Fixed position="footer">
            <View style={{ paddingTop: 4 }}>
              {data.footer.extraText ? (
                <Text style={{ fontFamily: font, fontSize: 7.5, color: mutedTextColor, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.footer.extraText)}
                </Text>
              ) : null}
              {data.showTagline && data.company?.tagline ? (
                <Text style={{ fontFamily: font, fontSize: 7.5, fontStyle: 'italic', color: mutedTextColor, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.company.tagline)}
                </Text>
              ) : null}
              <View style={{ borderTopWidth: 0.5, borderTopColor: EVERGREEN_TOKENS.rule, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: font, fontSize: 7.5, color: mutedTextColor, flex: 1 }}>
                  {'Page {{pageNumber}} of {{totalPages}}'}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 7.5, color: mutedTextColor, textAlign: 'center', flex: 1 }}>
                  {safeText(data.footer.documentNumber || data.documentNumber)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                  {companyLogo ? (
                    <Image
                      src={companyLogo}
                      href={companyLogo}
                      style={{ width: 13, height: 13, marginRight: 5 }}
                    />
                  ) : null}
                  <Text style={{ fontFamily: font, fontSize: 7.5, color: mutedTextColor, textAlign: 'right' }}>
                    {safeText(data.footer.companyName || data.company?.name || '')}
                  </Text>
                </View>
              </View>
            </View>
          </Fixed>
        ) : null}

        {/* 1. HEADER */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: EVERGREEN_TOKENS.lightRule, paddingBottom: compact ? 8 : 10, marginBottom: compact ? 8 : 10 }} wrap={false}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ fontFamily: headerFont, fontSize: compact ? 17 : 20, fontWeight: 700, color: inkColor, marginBottom: 2 }}>
              {safeText(data.title)}
            </Text>
            {data.customTitle ? (
              <Text style={{ fontFamily: font, fontSize: 9, color: grayTextColor, marginBottom: 4 }}>
                {safeText(data.customTitle)}
              </Text>
            ) : null}
            {companyLineMap.get('name') ? (
              <View style={{ marginTop: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 11.5, fontWeight: 700, color: inkColor, marginBottom: 2 }}>
                  {safeText(companyLineMap.get('name'))}
                </Text>
                {companyLineMap.get('address') ? (
                  <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, lineHeight: 1.35 }}>
                    {safeText(companyLineMap.get('address'))}
                  </Text>
                ) : null}
                {companyLineMap.get('cityState') ? (
                  <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, lineHeight: 1.35 }}>
                    {safeText(companyLineMap.get('cityState'))}
                  </Text>
                ) : null}
                {companyContactLine ? (
                  <Text style={{ fontFamily: font, fontSize: 7.5, color: mutedTextColor, marginTop: 2 }}>
                    {safeText(companyContactLine)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            {companyLogo ? (
              <View style={{ marginBottom: 6, alignItems: 'flex-end' }}>
                <Image src={companyLogo} href={companyLogo} style={{ width: 64, height: 64 }} />
              </View>
            ) : null}
            {data.documentNumber ? (
              <Text style={{ fontFamily: headerFont, fontSize: 9, fontWeight: 700, color: inkColor, marginBottom: 2, textAlign: 'right' }}>{safeText(data.documentNumberLabel)}: {safeText(data.documentNumber)}</Text>
            ) : null}
            {data.issueDate ? (
              <Text style={{ fontFamily: font, fontSize: 8.5, color: inkColor, marginBottom: 2, textAlign: 'right' }}>{safeText(data.issueDateLabel)}: {safeText(data.issueDate)}</Text>
            ) : null}
            {data.dueDateOrValidityDate ? (
              <Text style={{ fontFamily: font, fontSize: 8.5, color: inkColor, marginBottom: 2, textAlign: 'right' }}>{safeText(data.dueDateOrValidityDateLabel)}: {safeText(data.dueDateOrValidityDate)}</Text>
            ) : null}
          </View>
        </View>

        {/* 2. PARTY SECTION (From / Bill To) */}
        {(data.company || data.client) ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: compact ? 8 : 10 }} wrap={false}>
            {data.company ? renderPartyCard('From', companyLineMap, companyLines, compact, accentPale, headerFont, accentColor, font, inkColor, grayTextColor) : null}
            {data.client ? renderPartyCard('Bill To', clientLineMap, clientLines, compact, accentPale, headerFont, accentColor, font, inkColor, grayTextColor) : null}
          </View>
        ) : null}

        {/* 3. CUSTOM HEADER FIELDS STRIP */}
        {(data.poNumber || (data.customHeaderFields && data.customHeaderFields.length > 0)) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: accentPale, borderRadius: 6, paddingHorizontal: 12, paddingVertical: compact ? 6 : 8, marginBottom: compact ? 8 : 10 }} wrap={false}>
            {data.poNumber ? (
              <View style={{ minWidth: 120, flexGrow: 1 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: mutedTextColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  {safeText(data.poNumberLabel)}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 8.5, color: inkColor }}>
                  {safeText(data.poNumber)}
                </Text>
              </View>
            ) : null}
            {data.customHeaderFields.map((field, idx) => (
              <View key={`chf-${idx}`} style={{ minWidth: 120, flexGrow: 1 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: mutedTextColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  {safeText(field.label)}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 8.5, color: inkColor }}>
                  {safeText(field.value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 4. LINE ITEMS TABLE */}
        {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: compact ? 8 : 10 }}>
            <Table columns={tableColumns}>
              <Row header>
                {data.table.columns.map((column, idx) => (
                  <Cell
                    key={`th-${idx}`}
                    style={{
                      backgroundColor: accentColor,
                      paddingTop: compact ? 5 : 6,
                      paddingBottom: compact ? 5 : 6,
                      paddingLeft: 6,
                      paddingRight: 6,
                      borderTopLeftRadius: idx === 0 ? 6 : 0,
                      borderTopRightRadius: idx === tableColumnCount - 1 ? 6 : 0,
                      borderRightWidth: idx < tableColumnCount - 1 ? 0.5 : 0,
                      borderRightColor: '#ffffff33',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 7.5,
                        fontWeight: 700,
                        color: EVERGREEN_TOKENS.white,
                        textAlign: (column.align as 'left' | 'center' | 'right' | 'justify') || 'left',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
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
                    <Row key={`gh-${rowIdx}`} style={{ backgroundColor: accentPale, borderBottomWidth: 0.5, borderBottomColor: EVERGREEN_TOKENS.lightRule }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 5, paddingHorizontal: 6 }}>
                        <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {safeText(row.groupLabel || row.groupName)}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  return (
                    <Row key={`gf-${rowIdx}`} style={{ backgroundColor: EVERGREEN_TOKENS.white, borderBottomWidth: 0.5, borderBottomColor: EVERGREEN_TOKENS.rule }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, marginRight: 8 }}>
                            {safeText(row.groupLabel || row.groupName || 'Subtotal')}
                          </Text>
                          <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: inkColor }}>
                            {glyphRuns(safeText(row.groupSubtotalValue), font)}
                          </Text>
                        </View>
                      </Cell>
                    </Row>
                  )
                }

                const isEven = rowIdx % 2 === 0
                const rowBg = isEven ? EVERGREEN_TOKENS.white : EVERGREEN_TOKENS.panel

                return (
                  <Row key={`tr-${rowIdx}`} style={{ backgroundColor: rowBg, borderBottomWidth: 0.5, borderBottomColor: EVERGREEN_TOKENS.lightRule }}>
                    {data.table.columns.map((col, colIdx) => {
                      const align = col.align || 'left'
                      const cell = row.cells?.[col.key]
                      const cellStyle = {
                        paddingTop: compact ? 4 : 5,
                        paddingBottom: compact ? 4 : 5,
                        paddingLeft: 6,
                        paddingRight: 6,
                        borderRightWidth: colIdx < tableColumnCount - 1 ? 0.5 : 0,
                        borderRightColor: EVERGREEN_TOKENS.lightRule,
                      }

                      if (col.key === 'description') {
                        const descObj = typeof cell === 'object' && cell !== null ? cell as { main?: string; sub?: string } : null
                        const main = descObj?.main || (typeof cell === 'string' ? cell : '')
                        const sub = descObj?.sub || ''

                        return (
                          <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                            <Text style={{ fontFamily: headerFont, fontSize: compact ? 9 : 9.5, fontWeight: 700, color: inkColor, lineHeight: 1.3 }}>
                              {glyphRuns(main, font)}
                            </Text>
                            {sub ? (
                              <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, lineHeight: 1.35, marginTop: 2 }}>
                                {glyphRuns(sub, font)}
                              </Text>
                            ) : null}
                            {row.imageUrl ? (
                              <View style={{ marginTop: 4 }}>
                                <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 36, height: 36, borderRadius: 4 }} />
                                <Link href={row.imageUrl} style={{ fontSize: 7, color: EVERGREEN_TOKENS.link, textDecoration: 'underline', marginTop: 2 }}>
                                  Open image
                                </Link>
                              </View>
                            ) : null}
                          </Cell>
                        )
                      }

                      const rawText = safeText(cell)
                      const text = col.key === 'quantity' ? rawText.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/, '$1 $2') : rawText

                      return (
                        <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                          <Text
                            style={{
                              fontFamily: col.key === 'amount' || col.key === 'num' ? headerFont : font,
                              fontSize: 8.5,
                              fontWeight: col.key === 'amount' || col.key === 'num' ? 700 : 400,
                              color: inkColor,
                              textAlign: (align as 'left' | 'center' | 'right' | 'justify'),
                              lineHeight: 1.3,
                            }}
                          >
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

        {/* 5. BOTTOM SECTION: BANK DETAILS + TOTALS LEDGER */}
        {(hasBankDetails || totalsLines.length > 0 || mainTotal || balanceDue || amountInWords || advance) ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: compact ? 6 : 8 }} wrap={false}>
            {/* Left: Bank Details */}
            <View style={{ flex: 1, paddingRight: 16 }}>
              {hasBankDetails && data.paymentDetails ? (
                <View style={{ backgroundColor: accentPale, borderRadius: 6, padding: compact ? 8 : 12 }}>
                  <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: EVERGREEN_TOKENS.lightRule, paddingBottom: 4 }}>
                    Bank Details
                  </Text>
                  {renderBankRow('Bank', data.paymentDetails.bankName, font, headerFont, inkColor, grayTextColor)}
                  {renderBankRow('Account Name', data.paymentDetails.accountName, font, headerFont, inkColor, grayTextColor)}
                  {renderBankRow('Account No', data.paymentDetails.accountNumber, font, headerFont, inkColor, grayTextColor)}
                  {renderBankRow('Sort Code', data.paymentDetails.sortCode, font, headerFont, inkColor, grayTextColor)}
                </View>
              ) : null}
            </View>

            {/* Right: Totals Box */}
            <View style={{ width: 240, flexShrink: 0 }}>
              <View style={{ backgroundColor: accentPale, borderRadius: 6, padding: compact ? 8 : 12 }}>
                {totalsLines.map((line, idx) => (
                  <View key={`tot-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontFamily: font, fontSize: 8.5, color: grayTextColor, flex: 1, paddingRight: 8 }}>{safeText(line.label)}</Text>
                    <Text style={{ fontFamily: font, fontSize: 8.5, color: inkColor, textAlign: 'right' }}>{glyphRuns(safeText(line.value), font)}</Text>
                  </View>
                ))}

                {mainTotal ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: accentColor, paddingTop: 6, marginTop: 6 }}>
                    <Text style={{ fontFamily: headerFont, fontSize: 10.5, fontWeight: 700, color: inkColor, flex: 1, paddingRight: 8 }}>{safeText(mainTotal.label)}</Text>
                    <Text style={{ fontFamily: headerFont, fontSize: 10.5, fontWeight: 700, color: inkColor, textAlign: 'right' }}>{glyphRuns(safeText(mainTotal.value), font)}</Text>
                  </View>
                ) : null}

                {amountInWords ? (
                  <Text style={{ fontFamily: font, fontSize: 7.5, fontStyle: 'italic', color: grayTextColor, textAlign: 'right', marginTop: 6, lineHeight: 1.4 }}>{safeText(amountInWords)}</Text>
                ) : null}

                {!isAdvanceInvoice && balanceDue ? (
                  <View style={{ marginTop: 8, backgroundColor: accentColor, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: EVERGREEN_TOKENS.white, flex: 1, paddingRight: 8 }}>{safeText(balanceDue.label)}</Text>
                    <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: EVERGREEN_TOKENS.white, textAlign: 'right' }}>{glyphRuns(safeText(balanceDue.value), font)}</Text>
                  </View>
                ) : null}

                {isAdvanceInvoice && advance ? (
                  <View style={{ marginTop: 8, borderWidth: 1.5, borderColor: accentColor, borderRadius: 6, padding: 8, backgroundColor: EVERGREEN_TOKENS.white }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: inkColor, flex: 1, paddingRight: 8 }}>
                        {safeText(advance.primaryLabel)}
                      </Text>
                      <Text style={{ fontFamily: headerFont, fontSize: 10.5, fontWeight: 700, color: accentColor, textAlign: 'right' }}>
                        {glyphRuns(safeText(advance.advanceAmount), font)}
                      </Text>
                    </View>
                    {advance.secondaryLabel ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: EVERGREEN_TOKENS.rule }}>
                        <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, flex: 1, paddingRight: 8 }}>
                          {safeText(advance.secondaryLabel)}
                        </Text>
                        <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, textAlign: 'right' }}>
                          {glyphRuns(safeText(advance.balanceRemaining), font)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* 6. NOTES & 7. TERMS SECTIONS */}
        {renderTextCard(data.notes, compact, accentPale, headerFont, accentColor, font, grayTextColor)}
        {renderTextCard(data.terms, compact, accentPale, headerFont, accentColor, font, grayTextColor)}

        {/* 8. ATTACHMENTS */}
        {attachmentItems.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: mutedTextColor, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: EVERGREEN_TOKENS.lightRule, paddingBottom: 3 }}>
              Attachments
            </Text>
            {attachmentItems.map((item, idx) => (
              item.formattedUrl ? (
                <Link key={`att-${idx}`} href={item.formattedUrl} style={{ fontFamily: font, fontSize: 8, color: EVERGREEN_TOKENS.link, textDecoration: 'underline', marginBottom: 2 }}>
                  {safeText(item.label)}
                </Link>
              ) : (
                <Text key={`att-${idx}`} style={{ fontFamily: font, fontSize: 8, color: grayTextColor, marginBottom: 2 }}>
                  {safeText(item.label || item.url)}
                </Text>
              )
            ))}
          </View>
        ) : null}

        {/* 9. ADDITIONAL FIELDS */}
        {data.additionalFields && data.additionalFields.length > 0 ? (
          <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: accentPale, borderRadius: 6, padding: 10 }}>
            {data.additionalFields.map((field, idx) => (
              <View key={`af-${idx}`} style={{ minWidth: 120, flexGrow: 1 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: mutedTextColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  {safeText(field.label)}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 8.5, color: inkColor }}>
                  {safeText(field.value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 10. SIGNATURE BLOCK */}
        {data.signature && (data.signature.imageUrl || data.signature.name) ? (
          <View style={{ marginTop: compact ? 12 : 16, flexDirection: 'row', justifyContent: 'flex-end' }} wrap={false}>
            <View style={{ width: 180, alignItems: 'center' }}>
              {data.signature.imageUrl ? (
                <Image src={data.signature.imageUrl} href={data.signature.imageUrl} style={{ width: 110, height: 34, marginBottom: 2 }} />
              ) : null}
              <View style={{ width: '100%', borderTopWidth: 0.5, borderTopColor: ruleColor, marginBottom: 4 }} />
              {data.signature.name ? (
                <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: inkColor, textAlign: 'center' }}>
                  {safeText(data.signature.name)}
                </Text>
              ) : null}
              {data.signature.role ? (
                <Text style={{ fontFamily: font, fontSize: 8, color: grayTextColor, textAlign: 'center' }}>
                  {safeText(data.signature.role)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export default EvergreenFormeDocument
