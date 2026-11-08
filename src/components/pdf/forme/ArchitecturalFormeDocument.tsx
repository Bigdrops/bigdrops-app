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

export const ARCHITECTURAL_TOKENS = {
  charcoal: '#1e2427',
  charcoalDark: '#14181a',
  ink: '#1e2427',
  copper: '#a4663f',
  copperLight: '#c08a5f',
  sand: '#e3d7c3',
  ivory: '#f6f0e4',
  ivoryPanel: '#ede4d3',
  grayText: '#60584f',
  mutedText: '#8c8275',
  white: '#ffffff',
  rule: '#d9cdbb',
  lightRule: '#e8ded0',
} as const

const PORTRAIT_WIDTH = 595.28
const LANDSCAPE_WIDTH = 841.89
const LANDSCAPE_HEIGHT = 595.28

export interface ArchitecturalFormeDocumentProps {
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
      <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, width: '38%' }}>{label}</Text>
      <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.ink, width: '62%', textAlign: 'right' }}>{safeText(value)}</Text>
    </View>
  )
}

function renderTextCard(section: { title?: string; content?: string; plainText?: string } | null | undefined, compact: boolean, font: string, headerFont: string) {
  if (!section?.content && !section?.plainText) return null
  return (
    <View style={{ marginTop: compact ? 6 : 8, backgroundColor: ARCHITECTURAL_TOKENS.ivoryPanel, borderRadius: 3, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.rule, padding: compact ? 8 : 10 }}>
      {section.title ? (
        <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          {safeText(section.title)}
        </Text>
      ) : null}
      {section.content ? renderFormeRichText(section.content, {
        font,
        paragraphStyle: { fontFamily: font, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.grayText, lineHeight: 1.4, marginBottom: 3 },
        listMarkerStyle: { fontFamily: headerFont, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.copper, width: 10 },
        listItemTextStyle: { fontFamily: font, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.grayText, lineHeight: 1.4 },
      }) : (
        <Text style={{ fontFamily: font, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.grayText, lineHeight: 1.4 }}>{safeText(section.plainText)}</Text>
      )}
    </View>
  )
}

export function ArchitecturalFormeDocument({ data, compact = false }: ArchitecturalFormeDocumentProps) {
  const tokens = resolveDesignTokens(data.design)
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
  const pageMargin = { top: compact ? 16 : 20, right: 20, bottom: compact ? 16 : 20, left: 20 }
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
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()} style={{ fontFamily: font, fontSize: 8.5, color: ARCHITECTURAL_TOKENS.ink }}>
      <Page size={pageSize} margin={pageMargin} style={{ backgroundColor: ARCHITECTURAL_TOKENS.ivory }}>
        {/* TOP REPEATING TECHNICAL RUN / ACCENT */}
        <Fixed position="header">
          <View style={{ borderBottomWidth: 1, borderBottomColor: ARCHITECTURAL_TOKENS.copperLight, paddingBottom: 4, marginBottom: compact ? 6 : 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, letterSpacing: 1, textTransform: 'uppercase' }}>
              {`${safeText(data.title)} · ${safeText(data.documentNumber)}`}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 6.5, color: ARCHITECTURAL_TOKENS.mutedText, letterSpacing: 0.5 }}>
              {'ARCHITECTURAL SPECIFICATION SHEET'}
            </Text>
          </View>
        </Fixed>

        {/* FIXED FOOTER */}
        {footerVisible ? (
          <Fixed position="footer">
            <View style={{ borderTopWidth: 1, borderTopColor: ARCHITECTURAL_TOKENS.copperLight, paddingTop: 4 }}>
              {data.footer.extraText ? (
                <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.footer.extraText)}
                </Text>
              ) : null}
              {data.showTagline && data.company?.tagline ? (
                <Text style={{ fontFamily: font, fontSize: 7, fontStyle: 'italic', color: ARCHITECTURAL_TOKENS.copper, textAlign: 'center', marginBottom: 2 }}>
                  {safeText(data.company.tagline)}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, flex: 1 }}>
                  {'Page {{pageNumber}} of {{totalPages}}'}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal, textAlign: 'center', flex: 1, letterSpacing: 0.5 }}>
                  {safeText(data.footer.documentNumber || data.documentNumber)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                  {companyLogo ? (
                    <Image src={companyLogo} href={companyLogo} style={{ width: 13, height: 13, marginRight: 5 }} />
                  ) : null}
                  <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, textAlign: 'right' }}>
                    {safeText(data.footer.companyName || data.company?.name || '')}
                  </Text>
                </View>
              </View>
            </View>
          </Fixed>
        ) : null}

        {/* 1. ASYMMETRIC HEADER */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', marginBottom: compact ? 8 : 12 }} wrap={false}>
          {/* Left Charcoal Card */}
          <View style={{ width: '56%', backgroundColor: ARCHITECTURAL_TOKENS.charcoal, borderRadius: 3, padding: compact ? 8 : 10, justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: headerFont, fontSize: compact ? 12 : 13.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.white, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {safeText(companyLineMap.get('name') || data.company?.name || '')}
              </Text>
              {companyTaxInfo ? (
                <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copperLight, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>
                  {companyTaxInfo}
                </Text>
              ) : null}
            </View>
            <View style={{ marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#3a4449', paddingTop: 4 }}>
              {companyLineMap.get('address') ? (
                <Text style={{ fontFamily: font, fontSize: 7.2, color: '#d5cec2', lineHeight: 1.3 }}>
                  {safeText(companyLineMap.get('address'))}
                  {companyLineMap.get('cityState') ? `, ${safeText(companyLineMap.get('cityState'))}` : ''}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                {companyLineMap.get('phone') ? (
                  <Text style={{ fontFamily: font, fontSize: 7, color: '#d5cec2' }}>
                    {`Tel: ${safeText(companyLineMap.get('phone'))}`}
                  </Text>
                ) : null}
                {companyLineMap.get('email') ? (
                  <Text style={{ fontFamily: font, fontSize: 7, color: '#d5cec2' }}>
                    {`Email: ${safeText(companyLineMap.get('email'))}`}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Right Technical Document Metadata Card */}
          <View style={{ width: '42%', justifyContent: 'space-between', paddingLeft: 8 }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: headerFont, fontSize: compact ? 18 : 22, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal, letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1 }}>
                {safeText(data.title)}
              </Text>
              {data.customTitle ? (
                <Text style={{ fontFamily: font, fontSize: 8, fontStyle: 'italic', color: ARCHITECTURAL_TOKENS.copper, marginTop: 2, textAlign: 'right' }}>
                  {safeText(data.customTitle)}
                </Text>
              ) : null}
              <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, letterSpacing: 0.8, marginTop: 3 }}>
                {`NO. ${safeText(data.documentNumber)}`}
              </Text>
            </View>

            <View style={{ backgroundColor: ARCHITECTURAL_TOKENS.ivoryPanel, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.rule, borderRadius: 3, padding: 6, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {safeText(data.issueDateLabel || 'Date')}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.ink }}>
                  {safeText(data.issueDate || '—')}
                </Text>
              </View>
              {data.dueDateOrValidityDate ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {safeText(data.dueDateOrValidityDateLabel || 'Due Date')}
                  </Text>
                  <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper }}>
                    {safeText(data.dueDateOrValidityDate)}
                  </Text>
                </View>
              ) : null}
              {data.poNumber ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {safeText(data.poNumberLabel || 'PO Ref')}
                  </Text>
                  <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.ink }}>
                    {safeText(data.poNumber)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* 2. PARTIES & PARTICULARS */}
        <View style={{ flexDirection: 'row', gap: 10, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.copperLight, borderRadius: 3, backgroundColor: ARCHITECTURAL_TOKENS.white, padding: compact ? 6 : 8, marginBottom: compact ? 8 : 10 }} wrap={false}>
          {/* Bill To */}
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
              {'BILL TO · CLIENT'}
            </Text>
            {clientLineMap.get('name') ? (
              <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.ink, marginBottom: 2 }}>
                {safeText(clientLineMap.get('name'))}
              </Text>
            ) : null}
            {clientLines.filter((l) => l.type !== 'name').map((line, idx) => (
              <Text key={`cl-${idx}`} style={{ fontFamily: font, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.grayText, lineHeight: 1.35 }}>
                {safeText(line.value)}
              </Text>
            ))}
          </View>

          {/* Project Details / Particulars */}
          <View style={{ flex: 1, borderLeftWidth: 0.5, borderLeftColor: ARCHITECTURAL_TOKENS.lightRule, paddingLeft: 8 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
              {'PROJECT & DELIVERY SPECIFICATION'}
            </Text>
            {data.customHeaderFields.length > 0 ? (
              data.customHeaderFields.map((field, idx) => (
                <View key={`chf-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.mutedText, textTransform: 'uppercase' }}>
                    {safeText(field.label)}
                  </Text>
                  <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.ink }}>
                    {safeText(field.value)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ fontFamily: font, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.mutedText, fontStyle: 'italic' }}>
                {'Standard commercial drawing and material specification applies.'}
              </Text>
            )}
          </View>
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
                      backgroundColor: ARCHITECTURAL_TOKENS.charcoal,
                      paddingTop: compact ? 4 : 5,
                      paddingBottom: compact ? 4 : 5,
                      paddingLeft: 6,
                      paddingRight: 6,
                      borderRightWidth: idx < tableColumnCount - 1 ? 0.5 : 0,
                      borderRightColor: '#343f44',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 7,
                        fontWeight: 700,
                        color: ARCHITECTURAL_TOKENS.white,
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
                    <Row key={`gh-${rowIdx}`} style={{ backgroundColor: ARCHITECTURAL_TOKENS.ivoryPanel, borderBottomWidth: 0.5, borderBottomColor: ARCHITECTURAL_TOKENS.copperLight }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                        <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {safeText(row.groupLabel || row.groupName)}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  return (
                    <Row key={`gf-${rowIdx}`} style={{ backgroundColor: ARCHITECTURAL_TOKENS.ivory, borderBottomWidth: 1.5, borderBottomColor: ARCHITECTURAL_TOKENS.copperLight }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ fontFamily: font, fontSize: 7.5, color: ARCHITECTURAL_TOKENS.mutedText, marginRight: 8, textTransform: 'uppercase' }}>
                            {safeText(row.groupLabel || row.groupName || 'Group Subtotal')}
                          </Text>
                          <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal }}>
                            {glyphRuns(safeText(row.groupSubtotalValue), font)}
                          </Text>
                        </View>
                      </Cell>
                    </Row>
                  )
                }

                const rowBg = rowIdx % 2 === 0 ? ARCHITECTURAL_TOKENS.white : ARCHITECTURAL_TOKENS.ivory
                return (
                  <Row key={`tr-${rowIdx}`} style={{ backgroundColor: rowBg, borderBottomWidth: 0.5, borderBottomColor: ARCHITECTURAL_TOKENS.lightRule }}>
                    {data.table.columns.map((col, colIdx) => {
                      const align = (col.align as 'left' | 'center' | 'right' | 'justify') || 'left'
                      const cell = row.cells?.[col.key]
                      const cellStyle = {
                        paddingTop: compact ? 3.5 : 4.5, paddingBottom: compact ? 3.5 : 4.5,
                        paddingLeft: 6, paddingRight: 6,
                        borderRightWidth: colIdx < tableColumnCount - 1 ? 0.5 : 0,
                        borderRightColor: ARCHITECTURAL_TOKENS.lightRule,
                      }

                      if (col.key === 'description') {
                        const descObj = typeof cell === 'object' && cell !== null ? cell as { main?: string; sub?: string } : null
                        const main = descObj?.main || (typeof cell === 'string' ? cell : '')
                        const sub = descObj?.sub || ''
                        return (
                          <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                            <Text style={{ fontFamily: headerFont, fontSize: compact ? 8 : 8.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal, lineHeight: 1.3 }}>
                              {glyphRuns(main, font)}
                            </Text>
                            {sub ? <Text style={{ fontFamily: font, fontSize: 7.2, color: ARCHITECTURAL_TOKENS.grayText, lineHeight: 1.35, marginTop: 1.5 }}>{glyphRuns(sub, font)}</Text> : null}
                            {row.imageUrl ? (
                              <View style={{ marginTop: 3 }}>
                                <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 32, height: 32, borderRadius: 2 }} />
                                <Link href={row.imageUrl} style={{ fontSize: 6.5, color: ARCHITECTURAL_TOKENS.copper, textDecoration: 'underline', marginTop: 1.5 }}>Open image</Link>
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
                            color: col.key === 'amount' ? ARCHITECTURAL_TOKENS.charcoal : ARCHITECTURAL_TOKENS.ink,
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

        {/* 4. CLOSING: LEDGER & TOTALS */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: compact ? 4 : 8 }} wrap={false}>
          {/* Left Financial Ledger */}
          <View style={{ flex: 1, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.rule, borderRadius: 3, backgroundColor: ARCHITECTURAL_TOKENS.white, padding: compact ? 6 : 8 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: ARCHITECTURAL_TOKENS.rule, paddingBottom: 2 }}>
              {'FINANCIAL LEDGER STATEMENT'}
            </Text>
            {totalsLines.map((line, idx) => (
              <View key={`tot-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: ARCHITECTURAL_TOKENS.lightRule }}>
                <Text style={{ fontFamily: font, fontSize: 7.2, color: line.isDeduction ? ARCHITECTURAL_TOKENS.copper : ARCHITECTURAL_TOKENS.grayText }}>
                  {safeText(line.label)}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: line.isDeduction ? ARCHITECTURAL_TOKENS.copper : ARCHITECTURAL_TOKENS.ink }}>
                  {glyphRuns(safeText(line.value), font)}
                </Text>
              </View>
            ))}
            {balanceDue ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderTopWidth: 1, borderTopColor: ARCHITECTURAL_TOKENS.charcoal, marginTop: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal }}>
                  {safeText(balanceDue.label || 'Balance Due')}
                </Text>
                <Text style={{ fontFamily: headerFont, fontSize: 8, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper }}>
                  {glyphRuns(safeText(balanceDue.value), font)}
                </Text>
              </View>
            ) : null}
            {isAdvanceInvoice && advance ? (
              <View style={{ marginTop: 4, padding: 4, backgroundColor: ARCHITECTURAL_TOKENS.ivoryPanel, borderRadius: 2 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase' }}>
                  {safeText(advance.primaryLabel || 'Advance Payment')}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 7.2, color: ARCHITECTURAL_TOKENS.ink }}>
                  {`Advance: ${safeText(advance.advanceAmount)}  ·  Remaining: ${safeText(advance.balanceRemaining)}`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right Charcoal Total Box + Bank Details */}
          <View style={{ width: '46%' }}>
            <View style={{ backgroundColor: ARCHITECTURAL_TOKENS.charcoal, borderRadius: 3, padding: compact ? 8 : 10 }}>
              <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copperLight, textTransform: 'uppercase', letterSpacing: 1 }}>
                {safeText(mainTotal?.label || 'TOTAL AMOUNT DUE')}
              </Text>
              <Text style={{ fontFamily: headerFont, fontSize: compact ? 15 : 18, fontWeight: 700, color: ARCHITECTURAL_TOKENS.white, marginVertical: 3 }}>
                {glyphRuns(safeText(mainTotal?.value || '₦0.00'), font)}
              </Text>
              <View style={{ height: 0.5, backgroundColor: ARCHITECTURAL_TOKENS.copper, marginVertical: 3 }} />
              {amountInWords ? (
                <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: ARCHITECTURAL_TOKENS.sand, lineHeight: 1.35 }}>
                  {safeText(amountInWords)}
                </Text>
              ) : null}
            </View>

            {hasBankDetails && data.paymentDetails ? (
              <View style={{ backgroundColor: ARCHITECTURAL_TOKENS.white, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.copperLight, borderRadius: 3, padding: compact ? 6 : 7, marginTop: 4 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
                  {'BANK SETTLEMENT DETAILS'}
                </Text>
                {renderBankRow('Bank', data.paymentDetails.bankName, font, headerFont)}
                {renderBankRow('Account No', data.paymentDetails.accountNumber, font, headerFont)}
                {renderBankRow('Account Name', data.paymentDetails.accountName, font, headerFont)}
                {renderBankRow('Sort Code', data.paymentDetails.sortCode, font, headerFont)}
              </View>
            ) : null}
          </View>
        </View>

        {/* 5. NOTES & TERMS */}
        {(data.notes || data.terms) ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: compact ? 4 : 8 }} wrap={false}>
            {data.notes ? (
              <View style={{ flex: 1 }}>
                {renderTextCard(data.notes, compact, font, headerFont)}
              </View>
            ) : null}
            {data.terms ? (
              <View style={{ flex: 1 }}>
                {renderTextCard(data.terms, compact, font, headerFont)}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 6. ATTACHMENTS */}
        {attachmentItems.length > 0 ? (
          <View style={{ marginTop: compact ? 4 : 6, backgroundColor: ARCHITECTURAL_TOKENS.ivoryPanel, borderRadius: 3, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.rule, padding: 6 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 6.8, fontWeight: 700, color: ARCHITECTURAL_TOKENS.copper, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
              {'ATTACHMENTS & PROJECT DRAWINGS'}
            </Text>
            {attachmentItems.map((att, idx) => (
              <View key={`att-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1.5 }}>
                <Text style={{ fontFamily: font, fontSize: 7, color: ARCHITECTURAL_TOKENS.grayText, marginRight: 4 }}>{`• ${safeText(att.label)}`}</Text>
                {att.url ? <Link href={att.url} style={{ fontSize: 6.8, color: ARCHITECTURAL_TOKENS.copper, textDecoration: 'underline' }}>Open document</Link> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* 7. SIGNATURES & DOCUMENT CONTROL */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: compact ? 6 : 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: ARCHITECTURAL_TOKENS.charcoal }} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: ARCHITECTURAL_TOKENS.copper, marginBottom: 2 }}>
              {'Issuer Authorised Signatory'}
            </Text>
            {data.signature?.imageUrl ? (
              <Image src={data.signature.imageUrl} href={data.signature.imageUrl} style={{ width: 80, height: 26, marginVertical: 2 }} />
            ) : (
              <View style={{ height: 26, borderBottomWidth: 0.5, borderBottomColor: ARCHITECTURAL_TOKENS.charcoal, marginBottom: 2 }} />
            )}
            <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal }}>
              {safeText(data.signature?.name || companyLineMap.get('name') || 'Authorised Signatory')}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 6.8, color: ARCHITECTURAL_TOKENS.mutedText }}>
              {safeText(data.signature?.role || 'Authorised Signatory')}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font, fontSize: 6.8, fontStyle: 'italic', color: ARCHITECTURAL_TOKENS.copper, marginBottom: 2 }}>
              {'Client Receiving Acknowledgement'}
            </Text>
            <View style={{ height: 26, borderBottomWidth: 0.5, borderBottomColor: ARCHITECTURAL_TOKENS.charcoal, marginBottom: 2 }} />
            <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal }}>
              {'Received & Verified By'}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 6.8, color: ARCHITECTURAL_TOKENS.mutedText }}>
              {'Signature & Company Stamp'}
            </Text>
          </View>

          <View style={{ width: 100, borderWidth: 0.5, borderColor: ARCHITECTURAL_TOKENS.copperLight, borderRadius: 2, padding: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: ARCHITECTURAL_TOKENS.ivoryPanel }}>
            <Text style={{ fontFamily: font, fontSize: 6, color: ARCHITECTURAL_TOKENS.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {'DOCUMENT CONTROL'}
            </Text>
            <Text style={{ fontFamily: headerFont, fontSize: 7.5, fontWeight: 700, color: ARCHITECTURAL_TOKENS.charcoal, marginTop: 1 }}>
              {safeText(data.documentNumber)}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 6.2, color: ARCHITECTURAL_TOKENS.copper, marginTop: 1 }}>
              {'ORIGINAL'}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
