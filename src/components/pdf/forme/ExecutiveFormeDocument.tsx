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

export const EXECUTIVE_TOKENS = {
  forest: '#173a2c',
  forestDark: '#0f281e',
  forestLight: '#24523f',
  gold: '#a9854f',
  goldLight: '#d8c39c',
  goldPale: '#efe6d5',
  paper: '#fcf9f2',
  ivoryPanel: '#f6f0e2',
  ink: '#1c201d',
  grayText: '#555e58',
  mutedText: '#7e8881',
  white: '#ffffff',
  rule: '#dfd5c2',
  lightRule: '#ede5d5',
} as const

const PORTRAIT_WIDTH = 595.28
const LANDSCAPE_WIDTH = 841.89
const LANDSCAPE_HEIGHT = 595.28

export interface ExecutiveFormeDocumentProps {
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
      <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.mutedText, width: '38%' }}>{label}</Text>
      <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, width: '62%', textAlign: 'right' }}>{safeText(value)}</Text>
    </View>
  )
}

function renderTextCard(
  section: { title?: string; content?: string; plainText?: string } | null | undefined,
  compact: boolean,
  font: string,
  headerFont: string,
  accentColor: string = EXECUTIVE_TOKENS.gold,
  accentLight: string = EXECUTIVE_TOKENS.goldLight,
) {
  if (!section?.content && !section?.plainText) return null
  return (
    <View style={{ marginTop: compact ? 6 : 8, backgroundColor: EXECUTIVE_TOKENS.ivoryPanel, borderRadius: 3, borderWidth: 0.5, borderColor: accentLight, padding: compact ? 8 : 10 }}>
      {section.title ? (
        <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          {safeText(section.title)}
        </Text>
      ) : null}
      {section.content ? renderFormeRichText(section.content, {
        font,
        paragraphStyle: { fontFamily: font, fontSize: 7.5, color: EXECUTIVE_TOKENS.grayText, lineHeight: 1.4, marginBottom: 3 },
        listMarkerStyle: { fontFamily: headerFont, fontSize: 7.5, color: accentColor, width: 10 },
        listItemTextStyle: { fontFamily: font, fontSize: 7.5, color: EXECUTIVE_TOKENS.grayText, lineHeight: 1.4 },
      }) : (
        <Text style={{ fontFamily: font, fontSize: 7.5, color: EXECUTIVE_TOKENS.grayText, lineHeight: 1.4 }}>{safeText(section.plainText)}</Text>
      )}
    </View>
  )
}

export function ExecutiveFormeDocument({ data, compact = false }: ExecutiveFormeDocumentProps) {
  const tokens = resolveDesignTokens(data.design)
  const font = isFormeSupportedFamily(tokens.bodyFont) ? tokens.bodyFont : 'Inter'
  const headerFont = isFormeSupportedFamily(tokens.headerFont) ? tokens.headerFont : (isFormeSupportedFamily('PT Serif') ? 'PT Serif' : 'Inter')
  const gold = tokens.accentColor || EXECUTIVE_TOKENS.gold
  const goldLight = tokens.accentColor || EXECUTIVE_TOKENS.goldLight

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

  const companyTaxInfo = [
    companyLineMap.get('taxId') ? `TIN: ${companyLineMap.get('taxId')}` : null,
    companyLineMap.get('registrationNumber') ? `RC: ${companyLineMap.get('registrationNumber')}` : null,
  ].filter(Boolean).join('  ·  ')

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()} style={{ fontFamily: font, fontSize: 8.5, color: EXECUTIVE_TOKENS.ink }}>
      <Page size={pageSize} margin={pageMargin} style={{ backgroundColor: EXECUTIVE_TOKENS.paper }}>
        {/* TOP ELEGANT GOLD ACCENT RULE */}
        <Fixed position="header">
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: goldLight, paddingBottom: 3, marginBottom: compact ? 6 : 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.5, color: gold, letterSpacing: 1, textTransform: 'uppercase' }}>
              {`${safeText(data.title)} · ${safeText(data.documentNumber)}`}
            </Text>
          </View>
        </Fixed>

        {/* FIXED FOOTER */}
        {footerVisible ? (
          <Fixed position="footer">
            <View style={{ borderTopWidth: 0.5, borderTopColor: goldLight, paddingTop: 4 }}>
              {data.footer.extraText ? (
                <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.mutedText, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.footer.extraText)}
                </Text>
              ) : null}
              {data.showTagline && data.company?.tagline ? (
                <Text style={{ fontFamily: font, fontSize: 7, fontStyle: 'italic', color: gold, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.company.tagline)}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.mutedText, flex: 1 }}>
                  {'Page {{pageNumber}} of {{totalPages}}'}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, textAlign: 'center', flex: 1, letterSpacing: 0.5 }}>
                  {safeText(data.footer.documentNumber || data.documentNumber)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                  {companyLogo ? (
                    <Image src={companyLogo} href={companyLogo} style={{ width: 13, height: 13, marginRight: 5 }} />
                  ) : null}
                  <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.mutedText, textAlign: 'right' }}>
                    {safeText(data.footer.companyName || data.company?.name || '')}
                  </Text>
                </View>
              </View>
            </View>
          </Fixed>
        ) : null}

        {/* 1. SYMMETRICAL MASTHEAD */}
        <View style={{ alignItems: 'center', marginBottom: compact ? 8 : 12 }} wrap={false}>
          {companyLogo ? (
            <View style={{ marginBottom: 4, alignItems: 'center' }}>
              <Image src={companyLogo} href={companyLogo} style={{ width: 34, height: 34 }} />
            </View>
          ) : null}
          <Text style={{ fontFamily: headerFont, fontSize: compact ? 13 : 15, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
            {safeText(companyLineMap.get('name') || data.company?.name || '')}
          </Text>
          {companyTaxInfo ? (
            <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 600, color: gold, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2, textAlign: 'center' }}>
              {companyTaxInfo}
            </Text>
          ) : null}
          {companyLineMap.get('address') ? (
            <Text style={{ fontFamily: font, fontSize: 7.2, color: EXECUTIVE_TOKENS.mutedText, textAlign: 'center', marginTop: 2, lineHeight: 1.3 }}>
              {safeText(companyLineMap.get('address'))}
              {companyLineMap.get('cityState') ? `, ${safeText(companyLineMap.get('cityState'))}` : ''}
              {companyLineMap.get('phone') ? `  ·  Tel: ${safeText(companyLineMap.get('phone'))}` : ''}
              {companyLineMap.get('email') ? `  ·  ${safeText(companyLineMap.get('email'))}` : ''}
            </Text>
          ) : null}

          {/* Diamond Rule Separator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '60%', marginVertical: 5 }}>
            <View style={{ flex: 1, height: 0.5, backgroundColor: goldLight }} />
            <Text style={{ fontFamily: headerFont, fontSize: 7, color: gold, marginHorizontal: 6 }}>
              {'❖'}
            </Text>
            <View style={{ flex: 1, height: 0.5, backgroundColor: goldLight }} />
          </View>

          {/* Document Title */}
          <Text style={{ fontFamily: headerFont, fontSize: compact ? 17 : 20, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' }}>
            {safeText(data.title)}
          </Text>
          {data.customTitle ? (
            <Text style={{ fontFamily: headerFont, fontSize: 8, fontStyle: 'italic', color: gold, marginTop: 1, textAlign: 'center' }}>
              {safeText(data.customTitle)}
            </Text>
          ) : null}

          {/* 4-Cell Metadata Bar */}
          <View style={{ flexDirection: 'row', width: '100%', backgroundColor: EXECUTIVE_TOKENS.ivoryPanel, borderWidth: 0.5, borderColor: goldLight, borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 0.5, borderRightColor: goldLight, alignItems: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 6.2, color: EXECUTIVE_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>{'DOCUMENT NO'}</Text>
              <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, marginTop: 1 }}>{safeText(data.documentNumber)}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 0.5, borderRightColor: goldLight, alignItems: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 6.2, color: EXECUTIVE_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>{safeText(data.issueDateLabel || 'ISSUE DATE')}</Text>
              <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.ink, marginTop: 1 }}>{safeText(data.issueDate || '—')}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 0.5, borderRightColor: goldLight, alignItems: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 6.2, color: EXECUTIVE_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>{safeText(data.dueDateOrValidityDateLabel || 'DUE DATE')}</Text>
              <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: gold, marginTop: 1 }}>{safeText(data.dueDateOrValidityDate || '—')}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6, alignItems: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 6.2, color: EXECUTIVE_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 }}>{safeText(data.poNumberLabel || 'PO REF')}</Text>
              <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, marginTop: 1 }}>{safeText(data.poNumber || '—')}</Text>
            </View>
          </View>
        </View>

        {/* 2. PARTIES & PARTICULARS */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: compact ? 8 : 10 }} wrap={false}>
          {/* Bill To */}
          <View style={{ flex: 1, backgroundColor: EXECUTIVE_TOKENS.white, borderWidth: 0.5, borderColor: goldLight, borderRadius: 3, padding: compact ? 6 : 8 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: EXECUTIVE_TOKENS.goldPale, paddingBottom: 2 }}>
              {data.isProcurement ? (data.partyHeaderLabel || 'SUPPLIER INFORMATION · ORDER FROM') : 'CLIENT INFORMATION · BILL TO'}
            </Text>
            {clientLineMap.get('name') ? (
              <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, marginBottom: 2 }}>
                {safeText(clientLineMap.get('name'))}
              </Text>
            ) : null}
            {clientLines.filter((l) => l.type !== 'name').map((line, idx) => (
              <Text key={`cl-${idx}`} style={{ fontFamily: font, fontSize: 7.5, color: EXECUTIVE_TOKENS.grayText, lineHeight: 1.35 }}>
                {safeText(line.value)}
              </Text>
            ))}
          </View>

          {/* Project Details */}
          {data.customHeaderFields.length > 0 ? (
            <View style={{ flex: 1, backgroundColor: EXECUTIVE_TOKENS.ivoryPanel, borderWidth: 0.5, borderColor: goldLight, borderRadius: 3, padding: compact ? 6 : 8 }}>
              <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: EXECUTIVE_TOKENS.goldPale, paddingBottom: 2 }}>
                {'ENGAGEMENT & REFERENCE PARTICULARS'}
              </Text>
              {data.customHeaderFields.map((field, idx) => (
                <View key={`chf-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.mutedText, textTransform: 'uppercase' }}>
                    {safeText(field.label)}
                  </Text>
                  <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                    {safeText(field.value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* 3. LINE ITEMS TABLE */}
        {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: compact ? 8 : 10 }}>
            <Table columns={tableColumns}>
              <Row header>
                {data.table.columns.map((column, idx) => (
                  <Cell
                    key={`th-${idx}`}
                    style={{
                      backgroundColor: EXECUTIVE_TOKENS.forest,
                      paddingTop: compact ? 4 : 5,
                      paddingBottom: compact ? 4 : 5,
                      paddingLeft: 6,
                      paddingRight: 6,
                      borderRightWidth: idx < tableColumnCount - 1 ? 0.5 : 0,
                      borderRightColor: '#25483b',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 7,
                        fontWeight: 700,
                        color: EXECUTIVE_TOKENS.white,
                        textAlign: (column.align as 'left' | 'center' | 'right' | 'justify') || 'left',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
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
                    <Row key={`gh-${rowIdx}`} style={{ backgroundColor: EXECUTIVE_TOKENS.goldPale, borderBottomWidth: 0.5, borderBottomColor: EXECUTIVE_TOKENS.goldLight }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                        <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {safeText(row.groupLabel || row.groupName)}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  return (
                    <Row key={`gf-${rowIdx}`} style={{ backgroundColor: EXECUTIVE_TOKENS.paper, borderBottomWidth: 1.5, borderBottomColor: EXECUTIVE_TOKENS.gold }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ fontFamily: font, fontSize: 7.5, color: EXECUTIVE_TOKENS.mutedText, marginRight: 8, textTransform: 'uppercase' }}>
                            {safeText(row.groupLabel || row.groupName || 'Group Subtotal')}
                          </Text>
                          <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                            {glyphRuns(safeText(row.groupSubtotalValue), font)}
                          </Text>
                        </View>
                      </Cell>
                    </Row>
                  )
                }

                const rowBg = rowIdx % 2 === 0 ? EXECUTIVE_TOKENS.white : EXECUTIVE_TOKENS.ivoryPanel
                return (
                  <Row key={`tr-${rowIdx}`} style={{ backgroundColor: rowBg, borderBottomWidth: 0.5, borderBottomColor: EXECUTIVE_TOKENS.lightRule }}>
                    {data.table.columns.map((col, colIdx) => {
                      const align = (col.align as 'left' | 'center' | 'right' | 'justify') || 'left'
                      const cell = row.cells?.[col.key]
                      const cellStyle = {
                        paddingTop: compact ? 3.5 : 4.5, paddingBottom: compact ? 3.5 : 4.5,
                        paddingLeft: 6, paddingRight: 6,
                        borderRightWidth: colIdx < tableColumnCount - 1 ? 0.5 : 0,
                        borderRightColor: EXECUTIVE_TOKENS.lightRule,
                      }

                      if (col.key === 'description') {
                        const descObj = typeof cell === 'object' && cell !== null ? cell as { main?: string; sub?: string } : null
                        const main = descObj?.main || (typeof cell === 'string' ? cell : '')
                        const sub = descObj?.sub || ''
                        return (
                          <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                            <Text style={{ fontFamily: headerFont, fontSize: compact ? 8 : 8.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, lineHeight: 1.3 }}>
                              {glyphRuns(main, font)}
                            </Text>
                            {sub ? <Text style={{ fontFamily: font, fontSize: 7.2, color: EXECUTIVE_TOKENS.grayText, lineHeight: 1.35, marginTop: 1.5 }}>{glyphRuns(sub, font)}</Text> : null}
                            {row.imageUrl ? (
                              <View style={{ marginTop: 3 }}>
                                <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 32, height: 32, borderRadius: 2 }} />
                                <Link href={row.imageUrl} style={{ fontSize: 6.5, color: gold, textDecoration: 'underline', marginTop: 1.5 }}>Open image</Link>
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
                            fontSize: 7.8,
                            fontWeight: col.key === 'amount' || col.key === 'num' ? 700 : 400,
                            color: col.key === 'num' ? gold : (col.key === 'amount' ? EXECUTIVE_TOKENS.forest : EXECUTIVE_TOKENS.ink),
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

        {/* 4. FULL WIDTH FOREST GREEN TOTAL BAR */}
        <View style={{ backgroundColor: EXECUTIVE_TOKENS.forest, borderRadius: 3, paddingVertical: compact ? 6 : 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} wrap={false}>
          <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: goldLight, textTransform: 'uppercase', letterSpacing: 1.2 }}>
            {safeText(mainTotal?.label || 'TOTAL AMOUNT DUE')}
          </Text>
          <Text style={{ fontFamily: headerFont, fontSize: compact ? 14 : 17, fontWeight: 700, color: EXECUTIVE_TOKENS.white }}>
            {glyphRuns(safeText(mainTotal?.value || '₦0.00'), font)}
          </Text>
        </View>

        {amountInWords ? (
          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: goldLight, marginBottom: 4 }}>
            <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: EXECUTIVE_TOKENS.grayText, textAlign: 'center', lineHeight: 1.35 }}>
              {safeText(amountInWords)}
            </Text>
          </View>
        ) : null}

        {/* 5. CLOSING: LEDGER & BANK DETAILS */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: compact ? 4 : 6 }} wrap={false}>
          {/* Left Financial Ledger */}
          <View style={{ flex: 1, borderWidth: 0.5, borderColor: EXECUTIVE_TOKENS.rule, borderRadius: 3, backgroundColor: EXECUTIVE_TOKENS.white, padding: compact ? 6 : 8 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: EXECUTIVE_TOKENS.goldPale, paddingBottom: 2 }}>
              {'FINANCIAL LEDGER STATEMENT'}
            </Text>
            {totalsLines.map((line, idx) => (
              <View key={`tot-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: EXECUTIVE_TOKENS.lightRule }}>
                <Text style={{ fontFamily: font, fontSize: 7.2, color: line.isDeduction ? gold : EXECUTIVE_TOKENS.grayText }}>
                  {safeText(line.label)}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: line.isDeduction ? gold : EXECUTIVE_TOKENS.ink }}>
                  {glyphRuns(safeText(line.value), font)}
                </Text>
              </View>
            ))}
            {balanceDue ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderTopWidth: 1, borderTopColor: EXECUTIVE_TOKENS.forest, marginTop: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                  {safeText(balanceDue.label || 'Balance Due')}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: gold }}>
                  {glyphRuns(safeText(balanceDue.value), font)}
                </Text>
              </View>
            ) : null}
            {isAdvanceInvoice && advance ? (
              <View style={{ marginTop: 4, padding: 4, backgroundColor: EXECUTIVE_TOKENS.ivoryPanel, borderRadius: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: gold, textTransform: 'uppercase' }}>
                  {safeText(advance.primaryLabel || 'Advance Payment')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 7.2, color: EXECUTIVE_TOKENS.ink }}>
                  {`Advance: ${safeText(advance.advanceAmount)}  ·  Remaining: ${safeText(advance.balanceRemaining)}`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right Bank Details */}
          <View style={{ width: '46%' }}>
            {hasBankDetails && data.paymentDetails ? (
              <View style={{ backgroundColor: EXECUTIVE_TOKENS.white, borderWidth: 0.5, borderColor: goldLight, borderRadius: 3, padding: compact ? 6 : 7 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
                  {'BANK SETTLEMENT DETAILS'}
                </Text>
                {renderBankRow('Bank', data.paymentDetails.bankName, font, headerFont)}
                {renderBankRow('Account No', data.paymentDetails.accountNumber, font, headerFont)}
                {renderBankRow('Account Name', data.paymentDetails.accountName, font, headerFont)}
                {renderBankRow('Sort Code', data.paymentDetails.sortCode, font, headerFont)}
              </View>
            ) : data.isProcurement ? (
              data.deliveryDestination ? (
                <View style={{ backgroundColor: EXECUTIVE_TOKENS.white, borderWidth: 0.5, borderColor: goldLight, borderRadius: 3, padding: compact ? 6 : 7 }}>
                  <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
                    {data.deliveryDestination.label || 'DELIVERY DESTINATION'}
                  </Text>
                  {data.deliveryDestination.site ? (
                    <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest, marginBottom: 2 }}>
                      {data.deliveryDestination.site}
                    </Text>
                  ) : null}
                  {(data.deliveryDestination.addressLines || []).map((line, idx) => (
                    <Text key={'dest-line-' + idx} style={{ fontFamily: font, fontSize: 6.8, color: EXECUTIVE_TOKENS.grayText, marginBottom: 1 }}>
                      {line}
                    </Text>
                  ))}
                  {data.deliveryDestination.contactPerson ? (
                    <Text style={{ fontFamily: font, fontSize: 6.5, color: EXECUTIVE_TOKENS.mutedText, marginTop: 2 }}>
                      Contact: {data.deliveryDestination.contactPerson} {data.deliveryDestination.phone ? '(' + data.deliveryDestination.phone + ')' : ''}
                    </Text>
                  ) : null}
                </View>
              ) : null
            ) : (
              <View style={{ backgroundColor: EXECUTIVE_TOKENS.ivoryPanel, borderWidth: 0.5, borderColor: goldLight, borderRadius: 3, padding: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                  {'EXECUTIVE DIRECT SETTLEMENT'}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.mutedText, textAlign: 'center', marginTop: 2 }}>
                  {'Please remit in accordance with contract schedule.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 6. NOTES & TERMS */}
        {(data.notes || data.terms) ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: compact ? 4 : 8 }} wrap={false}>
            {data.notes ? (
              <View style={{ flex: 1 }}>
                {renderTextCard(data.notes, compact, font, headerFont, gold, goldLight)}
              </View>
            ) : null}
            {data.terms ? (
              <View style={{ flex: 1 }}>
                {renderTextCard(data.terms, compact, font, headerFont, gold, goldLight)}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 7. ATTACHMENTS */}
        {attachmentItems.length > 0 ? (
          <View style={{ marginTop: compact ? 4 : 6, backgroundColor: EXECUTIVE_TOKENS.ivoryPanel, borderRadius: 3, borderWidth: 0.5, borderColor: goldLight, padding: 6 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: gold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
              {'DOCUMENT ATTACHMENTS & CONTRACT SCHEDULES'}
            </Text>
            {attachmentItems.map((att, idx) => (
              <View key={`att-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1.5 }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: EXECUTIVE_TOKENS.grayText, marginRight: 4 }}>{`• ${safeText(att.label)}`}</Text>
                {att.url ? <Link href={att.url} style={{ fontSize: 6.8, color: gold, textDecoration: 'underline' }}>Open document</Link> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* 8. SIGNATURES — strictly conditional on genuine signature data */}
        {data.isProcurement && data.procurementSignatories && (data.procurementSignatories.requisitioner || data.procurementSignatories.authorizer) ? (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: compact ? 6 : 10, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: goldLight }} wrap={false}>
            {data.procurementSignatories.requisitioner ? (
              <View style={{ width: 180 }}>
                <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: gold, marginBottom: 2 }}>
                  {data.procurementSignatories.requisitioner.label || 'Purchasing Officer / Requisitioner'}
                </Text>
                {data.procurementSignatories.requisitioner.signatureUrl ? (
                  <Image src={data.procurementSignatories.requisitioner.signatureUrl} href={data.procurementSignatories.requisitioner.signatureUrl} style={{ width: 100, height: 32, marginVertical: 2 }} />
                ) : null}
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                  {safeText(data.procurementSignatories.requisitioner.name || 'Authorised Requisitioner')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 6.8, color: EXECUTIVE_TOKENS.mutedText }}>
                  {safeText(data.procurementSignatories.requisitioner.title || 'Purchasing Officer')}
                </Text>
              </View>
            ) : null}

            {data.procurementSignatories.authorizer ? (
              <View style={{ width: 180 }}>
                <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: gold, marginBottom: 2 }}>
                  {data.procurementSignatories.authorizer.label || 'Management / Finance Authorisation'}
                </Text>
                {data.procurementSignatories.authorizer.signatureUrl ? (
                  <Image src={data.procurementSignatories.authorizer.signatureUrl} href={data.procurementSignatories.authorizer.signatureUrl} style={{ width: 100, height: 32, marginVertical: 2 }} />
                ) : null}
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                  {safeText(data.procurementSignatories.authorizer.name || 'Authorised By')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 6.8, color: EXECUTIVE_TOKENS.mutedText }}>
                  {safeText(data.procurementSignatories.authorizer.title || 'Management Authorisation')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : !data.isProcurement && data.signature && (data.signature.imageUrl || data.signature.name) ? (
          <View style={{ marginTop: compact ? 6 : 10, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: goldLight, width: 180 }} wrap={false}>
            <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: gold, marginBottom: 2 }}>
              {'Authorised Signatory'}
            </Text>
            {data.signature.imageUrl ? (
              <Image src={data.signature.imageUrl} href={data.signature.imageUrl} style={{ width: 100, height: 32, marginVertical: 2 }} />
            ) : null}
            {data.signature.name ? (
              <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: EXECUTIVE_TOKENS.forest }}>
                {safeText(data.signature.name)}
              </Text>
            ) : null}
            {data.signature.role ? (
              <Text style={{ fontFamily: font, fontSize: 6.8, color: EXECUTIVE_TOKENS.mutedText }}>
                {safeText(data.signature.role)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
