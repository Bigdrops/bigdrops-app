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

/**
 * Mosaic — asymmetric commercial template.
 *
 * Visual source of truth: docs/templates/html-temps/invoice-templates/commercial-mosaic.html
 * Forest identity, lime structural accent, charcoal table header, monospaced labels.
 * Deliberately omits the reference's "Control" card: no document-control furniture
 * may render. Signature furniture renders only from real signature data.
 */
export const MOSAIC_TOKENS = {
  forest: '#0d2b1d',
  forestMid: '#1b4332',
  charcoal: '#1a1d1a',
  slate: '#47554e',
  border: '#d6dfd9',
  borderLight: '#e5ebe7',
  paper: '#ffffff',
  white: '#ffffff',
  tint: '#f7faf8',
  tint2: '#eef4f0',
  lime: '#84cc16',
  limeSoft: '#f4fce3',
  limeDark: '#4d7c0f',
} as const

const PORTRAIT_WIDTH = 595.28
const LANDSCAPE_WIDTH = 841.89
const LANDSCAPE_HEIGHT = 595.28

export interface MosaicFormeDocumentProps {
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

/** Monospaced label treatment used throughout the reference. */
function microLabel(font: string, color: string = MOSAIC_TOKENS.slate) {
  return {
    fontFamily: font,
    fontSize: 4.9,
    fontWeight: 700 as const,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    color,
  }
}

export function MosaicFormeDocument({ data, compact = false }: MosaicFormeDocumentProps) {
  const tokens = resolveDesignTokens(data.design)
  const font = isFormeSupportedFamily(tokens.bodyFont) ? tokens.bodyFont : 'Inter'
  const headerFont = isFormeSupportedFamily(tokens.headerFont) ? tokens.headerFont : 'Inter'
  const lime = tokens.accentColor || MOSAIC_TOKENS.lime

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
  const companyLogo =
    data.company?.companyLogoUrl ||
    (data as { companyLogoUrl?: string; logoUrl?: string }).companyLogoUrl ||
    (data as { companyLogoUrl?: string; logoUrl?: string }).logoUrl ||
    ''

  const isProcurement = Boolean(data.isProcurement)
  const footerVisible = Boolean(
    data.footer.extraText || data.showTagline || data.footer.documentNumber || data.footer.companyName || companyLogo,
  )
  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)
  const hasClientDetails = Boolean(clientLineMap.get('name') || clientLines.length > 0)

  const isLandscape = data.layout?.orientation === 'landscape'
  const pageWidth = isLandscape ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH
  const pageMargin = { top: compact ? 14 : 18, right: compact ? 16 : 20, bottom: compact ? 6 : 8, left: compact ? 16 : 20 }
  const contentWidth = pageWidth - pageMargin.left - pageMargin.right
  const tableColumns = resolveTableColumns(data.table.columns, contentWidth)
  const tableColumnCount = data.table.columns.length

  const pageSize = isLandscape
    ? { width: LANDSCAPE_WIDTH, height: LANDSCAPE_HEIGHT }
    : (data.layout?.size || 'A4')

  const companyTaxInfo = [
    companyLineMap.get('registrationNumber') ? `RC ${companyLineMap.get('registrationNumber')}` : null,
    companyLineMap.get('taxId') ? `TIN ${companyLineMap.get('taxId')}` : null,
  ].filter(Boolean).join('  ·  ')

  const signature = data.signature
  const showSignature = Boolean(signature && (signature.imageUrl || signature.name))
  const procurementSignatories = data.procurementSignatories
  const showProcurementSignatures = Boolean(
    isProcurement &&
      procurementSignatories &&
      (procurementSignatories.requisitioner || procurementSignatories.authorizer),
  )

  const metaRows: Array<{ label: string; value: string; highlight?: boolean }> = []
  if (safeText(data.issueDate)) {
    metaRows.push({ label: safeText(data.issueDateLabel || 'Issue Date'), value: safeText(data.issueDate) })
  }
  const dateLabel = isProcurement ? 'Required by' : safeText(data.dueDateOrValidityDateLabel || 'Due Date')
  if (safeText(data.dueDateOrValidityDate)) {
    metaRows.push({ label: dateLabel, value: safeText(data.dueDateOrValidityDate), highlight: true })
  }
  if (safeText(data.poNumber)) {
    metaRows.push({ label: safeText(data.poNumberLabel || 'Client PO Ref.'), value: safeText(data.poNumber) })
  }
  data.customHeaderFields.forEach((field) => {
    if (safeText(field.label) || safeText(field.value)) {
      metaRows.push({ label: safeText(field.label), value: safeText(field.value) })
    }
  })

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()} style={{ fontFamily: font, fontSize: 7.2, color: MOSAIC_TOKENS.charcoal }}>
      <Page size={pageSize} margin={pageMargin} style={{ backgroundColor: MOSAIC_TOKENS.paper }}>
        {/* FIXED FOOTER — forest register strip */}
        {footerVisible ? (
          <Fixed position="footer">
            <View style={{ backgroundColor: MOSAIC_TOKENS.forest, paddingVertical: 4, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1.3 }}>
                {companyLogo ? (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 2, marginRight: 6 }}>
                    <Image src={companyLogo} href={companyLogo} style={{ width: 18 }} />
                  </View>
                ) : null}
                <Text style={{ fontFamily: font, fontSize: 5.4, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f7faf8' }}>
                  {safeText(data.footer.companyName || data.company?.name || '')}
                </Text>
              </View>
              <View style={{ backgroundColor: lime, paddingHorizontal: 4, paddingVertical: 1 }}>
                <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 800, color: MOSAIC_TOKENS.charcoal, letterSpacing: 0.6 }}>
                  {'{{pageNumber}} / {{totalPages}}'}
                </Text>
              </View>
              <Text style={{ fontFamily: font, fontSize: 5.4, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: '#c9d6cd', flex: 1, textAlign: 'right' }}>
                {safeText(data.footer.extraText || data.documentNumber)}
              </Text>
            </View>
          </Fixed>
        ) : null}

        {/* 1. ASYMMETRIC MASTHEAD — identity slab + document tower */}
        <View style={{ flexDirection: 'row', borderWidth: 0.8, borderColor: MOSAIC_TOKENS.forest, marginBottom: compact ? 6 : 8 }} wrap={false}>
          {/* Left slab (≈64%) */}
          <View style={{ width: contentWidth * 0.64, borderRightWidth: 0.8, borderRightColor: MOSAIC_TOKENS.forest }}>
            <View style={{ paddingVertical: compact ? 7 : 9, paddingHorizontal: 9, borderBottomWidth: 0.6, borderBottomColor: MOSAIC_TOKENS.border, borderLeftWidth: 4.5, borderLeftColor: lime }}>
              <Text style={{ fontFamily: headerFont, fontSize: compact ? 20 : 24, fontWeight: 900, letterSpacing: 0.4, textTransform: 'uppercase', lineHeight: 1.05, color: MOSAIC_TOKENS.forest }}>
                {safeText(data.title)}
              </Text>
              {data.customTitle ? (
                <Text style={{ fontFamily: font, fontSize: 7.4, fontWeight: 700, lineHeight: 1.3, color: MOSAIC_TOKENS.charcoal, borderBottomWidth: 1, borderBottomColor: lime, paddingBottom: 1.5, marginTop: 2 }}>
                  {safeText(data.customTitle)}
                </Text>
              ) : null}
            </View>

            {hasClientDetails ? (
              <View style={{ paddingVertical: compact ? 6 : 8, paddingHorizontal: 9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2.5 }}>
                  <View style={{ width: 5, height: 5, backgroundColor: lime, marginRight: 4 }} />
                  <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>
                    {safeText(data.partyHeaderLabel || (isProcurement ? 'Order From · Supplier / Vendor' : 'Bill To · Client'))}
                  </Text>
                </View>
                {clientLineMap.get('name') ? (
                  <Text style={{ fontFamily: headerFont, fontSize: 8.8, fontWeight: 800, lineHeight: 1.2, color: MOSAIC_TOKENS.forest, marginBottom: 1.5 }}>
                    {safeText(clientLineMap.get('name'))}
                  </Text>
                ) : null}
                {clientLines.filter((l) => l.type !== 'name').map((line, idx) => (
                  <Text key={`cl-${idx}`} style={{ fontFamily: font, fontSize: 6.2, lineHeight: 1.4, color: MOSAIC_TOKENS.slate }}>
                    {safeText(line.value)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          {/* Right tower (≈36%) */}
          <View style={{ width: contentWidth * 0.36 }}>
            <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: MOSAIC_TOKENS.border }}>
              <View style={{ borderWidth: 0.7, borderColor: MOSAIC_TOKENS.forest, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 3, alignSelf: 'flex-start' }}>
                {companyLogo ? (
                  // width-only: preserves the source aspect ratio (no stretch/crop)
                  <Image src={companyLogo} href={companyLogo} style={{ width: 44, margin: 3 }} />
                ) : (
                  <Text style={{ fontFamily: headerFont, fontSize: 22, fontWeight: 800, color: MOSAIC_TOKENS.forest, lineHeight: 1, paddingHorizontal: 14, paddingVertical: 10 }}>
                    {(safeText(companyLineMap.get('name') || data.company?.name || '')).charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={{ fontFamily: headerFont, fontSize: 6.6, fontWeight: 800, letterSpacing: 0.2, textTransform: 'uppercase', lineHeight: 1.25, color: MOSAIC_TOKENS.forest }}>
                {safeText(companyLineMap.get('name') || data.company?.name || '')}
              </Text>
              {companyTaxInfo ? (
                <Text style={{ fontFamily: font, fontSize: 5, fontWeight: 700, color: MOSAIC_TOKENS.slate, marginTop: 1.5 }}>
                  {companyTaxInfo}
                </Text>
              ) : null}
            </View>

            <View style={{ backgroundColor: MOSAIC_TOKENS.charcoal, paddingVertical: 5, paddingHorizontal: 8 }}>
              <Text style={{ fontFamily: font, fontSize: 4.6, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: lime }}>
                {safeText(data.documentNumberLabel || 'Document number')}
              </Text>
              <Text style={{ fontFamily: font, fontSize: 8.8, fontWeight: 800, letterSpacing: 0.3, color: '#ffffff', marginTop: 1 }}>
                {safeText(data.documentNumber)}
              </Text>
            </View>

            {metaRows.length > 0 ? (
              <View style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
                {metaRows.map((row, idx) => (
                  <View key={`meta-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: idx === metaRows.length - 1 ? 0 : 0.3, borderBottomColor: MOSAIC_TOKENS.borderLight, paddingBottom: 2, marginBottom: 2 }}>
                    <Text style={microLabel(font, MOSAIC_TOKENS.slate)}>{row.label}</Text>
                    <Text style={row.highlight
                      ? { fontFamily: font, fontSize: 5.9, fontWeight: 700, color: '#ffffff', backgroundColor: MOSAIC_TOKENS.forest, borderLeftWidth: 1.5, borderLeftColor: lime, paddingHorizontal: 3, paddingVertical: 0.8 }
                      : { fontFamily: font, fontSize: 6.2, fontWeight: 700, color: MOSAIC_TOKENS.forest }}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.company?.address || data.company?.phone || data.company?.email ? (
              <View style={{ paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 0.4, borderTopColor: MOSAIC_TOKENS.border }}>
                <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{'Issuer contact'}</Text>
                {data.company?.address ? (
                  <Text style={{ fontFamily: font, fontSize: 5.4, lineHeight: 1.35, color: MOSAIC_TOKENS.slate, marginTop: 1 }}>
                    {`${safeText(data.company.address)}${data.company.cityState ? `, ${safeText(data.company.cityState)}` : ''}`}
                  </Text>
                ) : null}
                {data.company?.phone ? (
                  <Text style={{ fontFamily: font, fontSize: 5.4, color: MOSAIC_TOKENS.slate, marginTop: 0.8 }}>{safeText(data.company.phone)}</Text>
                ) : null}
                {data.company?.email ? (
                  <Text style={{ fontFamily: font, fontSize: 5.4, color: MOSAIC_TOKENS.slate, marginTop: 0.8 }}>{safeText(data.company.email)}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* 2. ITEM REGISTER */}
        {tableColumnCount > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: compact ? 6 : 8 }}>
            <Table columns={tableColumns}>
              <Row header style={{ backgroundColor: MOSAIC_TOKENS.charcoal, borderBottomWidth: 1.2, borderBottomColor: lime }}>
                {data.table.columns.map((column, idx) => (
                  <Cell
                    key={`th-${idx}`}
                    style={{
                      backgroundColor: MOSAIC_TOKENS.charcoal,
                      paddingTop: compact ? 3.5 : 4.5,
                      paddingBottom: compact ? 3.5 : 4.5,
                      paddingLeft: 5,
                      paddingRight: 5,
                      borderRightWidth: idx < tableColumnCount - 1 ? 0.3 : 0,
                      borderRightColor: MOSAIC_TOKENS.forestMid,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: font,
                        fontSize: 4.9,
                        fontWeight: 700,
                        letterSpacing: 0.7,
                        textTransform: 'uppercase',
                        color: '#ffffff',
                        textAlign: (column.align as 'left' | 'center' | 'right' | 'justify') || 'left',
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
                    <Row key={`gh-${rowIdx}`} style={{ backgroundColor: MOSAIC_TOKENS.tint2, borderTopWidth: 0.8, borderTopColor: MOSAIC_TOKENS.forest, borderBottomWidth: 0.5, borderBottomColor: MOSAIC_TOKENS.forest }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontFamily: font, fontSize: 4.9, fontWeight: 800, letterSpacing: 0.6, color: lime, backgroundColor: MOSAIC_TOKENS.forest, borderLeftWidth: 1.2, borderLeftColor: lime, paddingHorizontal: 3, paddingVertical: 1, marginRight: 5 }}>
                            {'GROUP'}
                          </Text>
                          <Text style={{ fontFamily: font, fontSize: 6.6, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: MOSAIC_TOKENS.forest }}>
                            {safeText(row.groupLabel || row.groupName)}
                          </Text>
                        </View>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  // A subtotal band without a resolved amount would print a label
                  // with no value. Omit the band rather than showing a placeholder.
                  if (!safeText(row.groupSubtotalValue)) return null
                  return (
                    <Row key={`gf-${rowIdx}`} style={{ backgroundColor: MOSAIC_TOKENS.tint, borderTopWidth: 0.3, borderTopColor: MOSAIC_TOKENS.border, borderBottomWidth: 1.4, borderBottomColor: MOSAIC_TOKENS.forest }}>
                      <Cell colSpan={tableColumnCount} style={{ paddingVertical: 3.5, paddingHorizontal: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ ...microLabel(font, MOSAIC_TOKENS.forest), marginRight: 6 }}>
                            {safeText(row.groupLabel || row.groupName)}
                          </Text>
                          <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 800, color: MOSAIC_TOKENS.forest }}>
                            {glyphRuns(safeText(row.groupSubtotalValue), font)}
                          </Text>
                        </View>
                      </Cell>
                    </Row>
                  )
                }

                const rowBg = rowIdx % 2 === 0 ? MOSAIC_TOKENS.white : MOSAIC_TOKENS.tint
                return (
                  <Row key={`tr-${rowIdx}`} style={{ backgroundColor: rowBg, borderBottomWidth: 0.2, borderBottomColor: MOSAIC_TOKENS.borderLight }}>
                    {data.table.columns.map((col, colIdx) => {
                      const align = (col.align as 'left' | 'center' | 'right' | 'justify') || 'left'
                      const cell = row.cells?.[col.key]
                      const cellStyle = {
                        paddingTop: compact ? 3 : 4,
                        paddingBottom: compact ? 3 : 4,
                        paddingLeft: col.key === 'num' ? 2 : 5,
                        paddingRight: 5,
                        borderRightWidth: col.key === 'num' && colIdx < tableColumnCount - 1 ? 0.2 : 0,
                        borderRightColor: MOSAIC_TOKENS.borderLight,
                      }

                      if (col.key === 'description') {
                        const descObj = typeof cell === 'object' && cell !== null ? (cell as { main?: string; sub?: string }) : null
                        const main = descObj?.main || (typeof cell === 'string' ? cell : '')
                        const sub = descObj?.sub || ''
                        return (
                          <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                            <Text style={{ fontFamily: headerFont, fontSize: compact ? 6.9 : 7.1, fontWeight: 700, lineHeight: 1.3, color: MOSAIC_TOKENS.forest }}>
                              {glyphRuns(main, font)}
                            </Text>
                            {sub ? (
                              <Text style={{ ...microLabel(font, MOSAIC_TOKENS.slate), marginTop: 1.5 }}>{glyphRuns(sub, font)}</Text>
                            ) : null}
                            {row.imageUrl ? (
                              <View style={{ marginTop: 2 }}>
                                <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 30, height: 30 }} />
                                <Link href={row.imageUrl} style={{ fontSize: 6, color: MOSAIC_TOKENS.limeDark, textDecoration: 'underline', marginTop: 1 }}>Open image</Link>
                              </View>
                            ) : null}
                          </Cell>
                        )
                      }

                      const rawText = safeText(cell)
                      const text = col.key === 'quantity' ? rawText.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/, '$1 $2') : rawText
                      const isAmount = col.key === 'amount'
                      return (
                        <Cell key={`cell-${rowIdx}-${colIdx}`} style={cellStyle}>
                          <Text
                            style={{
                              fontFamily: col.key === 'num' || col.key === 'amount' || col.key === 'unit_price' ? font : font,
                              fontSize: col.key === 'num' ? 6.4 : isAmount ? 6.5 : 6.4,
                              fontWeight: col.key === 'num' ? 700 : isAmount ? 700 : 400,
                              color: col.key === 'num' || isAmount ? MOSAIC_TOKENS.forest : MOSAIC_TOKENS.charcoal,
                              textAlign: align,
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

        {/* 3. SETTLEMENT — total anchor card + supporting ledger */}
        <View style={{ flexDirection: 'row', borderTopWidth: 0.8, borderTopColor: MOSAIC_TOKENS.forest, marginBottom: compact ? 6 : 8 }} wrap={false}>
          <View style={{ flex: 1.35, borderRightWidth: 0.8, borderRightColor: MOSAIC_TOKENS.forest, paddingVertical: 7, paddingLeft: 0, paddingRight: 9 }}>
            <View style={{ backgroundColor: MOSAIC_TOKENS.forest, borderLeftWidth: 4.5, borderLeftColor: lime, paddingVertical: 6, paddingHorizontal: 8 }}>
              <Text style={{ fontFamily: font, fontSize: 4.9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: lime }}>
                {safeText(mainTotal?.label || 'Total amount due')}
              </Text>
              <Text style={{ fontFamily: font, fontSize: compact ? 13 : 15, fontWeight: 900, color: '#ffffff', marginTop: 2 }}>
                {glyphRuns(safeText(mainTotal?.value), font)}
              </Text>
              {amountInWords ? (
                <Text style={{ fontFamily: font, fontSize: 5.4, lineHeight: 1.35, color: '#d6dfd9', borderTopWidth: 0.3, borderTopColor: '#3a5c4b', paddingTop: 2.5, marginTop: 3 }}>
                  {safeText(amountInWords)}
                </Text>
              ) : null}
            </View>

            {isAdvanceInvoice && advance ? (
              <View style={{ marginTop: 4, paddingVertical: 4, paddingHorizontal: 6, borderWidth: 0.4, borderColor: MOSAIC_TOKENS.border }}>
                <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(advance.primaryLabel || 'Advance Payment')}</Text>
                <Text style={{ fontFamily: font, fontSize: 6.2, color: MOSAIC_TOKENS.charcoal, marginTop: 1.5 }}>
                  {`Advance ${safeText(advance.advanceAmount)}   ·   Remaining ${safeText(advance.balanceRemaining)}`}
                </Text>
              </View>
            ) : null}

            {hasBankDetails && data.paymentDetails ? (
              <View style={{ marginTop: 5, borderWidth: 0.4, borderColor: MOSAIC_TOKENS.border, paddingVertical: 4, paddingHorizontal: 6 }}>
                <Text style={microLabel(font, MOSAIC_TOKENS.slate)}>{safeText(data.paymentDetails.bankName)}</Text>
                <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: MOSAIC_TOKENS.forest, marginTop: 1 }}>
                  {safeText(data.paymentDetails.accountNumber)}
                </Text>
                {data.paymentDetails.accountName ? (
                  <Text style={{ fontFamily: font, fontSize: 5.1, color: MOSAIC_TOKENS.slate, marginTop: 0.8 }}>
                    {safeText(data.paymentDetails.accountName)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {isProcurement && data.deliveryDestination ? (
              <View style={{ marginTop: 5, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: MOSAIC_TOKENS.tint, borderLeftWidth: 1.5, borderLeftColor: lime }}>
                <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(data.deliveryDestination.label || 'Deliver to')}</Text>
                {data.deliveryDestination.site ? (
                  <Text style={{ fontFamily: font, fontSize: 5.9, fontWeight: 700, color: MOSAIC_TOKENS.forest, marginTop: 1 }}>
                    {safeText(data.deliveryDestination.site)}
                  </Text>
                ) : null}
                {(data.deliveryDestination.addressLines || []).map((line, idx) => (
                  <Text key={`dest-${idx}`} style={{ fontFamily: font, fontSize: 5.4, color: MOSAIC_TOKENS.charcoal, lineHeight: 1.35 }}>
                    {safeText(line)}
                  </Text>
                ))}
                {data.deliveryDestination.contactPerson ? (
                  <Text style={{ fontFamily: font, fontSize: 5.2, color: MOSAIC_TOKENS.slate, marginTop: 1 }}>
                    {safeText(data.deliveryDestination.contactPerson)}
                    {data.deliveryDestination.phone ? ` · ${safeText(data.deliveryDestination.phone)}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 9 }}>
            {totalsLines.map((line, idx) => (
              <View key={`tot-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.2, borderBottomColor: MOSAIC_TOKENS.borderLight, paddingVertical: 1.8 }}>
                <Text style={{ fontFamily: font, fontSize: 6.1, color: line.isDeduction ? MOSAIC_TOKENS.limeDark : MOSAIC_TOKENS.forest }}>
                  {safeText(line.label)}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 6.3, fontWeight: 700, color: line.isDeduction ? MOSAIC_TOKENS.limeDark : MOSAIC_TOKENS.forest }}>
                  {glyphRuns(safeText(line.value), font)}
                </Text>
              </View>
            ))}
            {balanceDue ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: MOSAIC_TOKENS.tint2, borderTopWidth: 0.4, borderTopColor: MOSAIC_TOKENS.forest, borderBottomWidth: 0.4, borderBottomColor: MOSAIC_TOKENS.forest, paddingVertical: 2.5, paddingHorizontal: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 6.1, fontWeight: 800, color: MOSAIC_TOKENS.forest }}>{safeText(balanceDue.label)}</Text>
                <Text style={{ fontFamily: font, fontSize: 6.4, fontWeight: 800, color: MOSAIC_TOKENS.forest }}>{glyphRuns(safeText(balanceDue.value), font)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 4. NARRATIVE + CONDITIONS */}
        {(data.notes || data.terms) ? (
          <View style={{ flexDirection: 'row', borderTopWidth: 0.8, borderTopColor: MOSAIC_TOKENS.forest, marginBottom: compact ? 4 : 6 }} wrap={false}>
            {data.notes ? (
              <View style={{ flex: 0.85, borderRightWidth: data.terms ? 0.6 : 0, borderRightColor: MOSAIC_TOKENS.forest }}>
                <View style={{ backgroundColor: MOSAIC_TOKENS.tint2, borderBottomWidth: 0.4, borderBottomColor: MOSAIC_TOKENS.border, paddingVertical: 2.5, paddingHorizontal: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(data.notes.title || 'Notes')}</Text>
                  <Text style={microLabel(font, MOSAIC_TOKENS.slate)}>{'Operational'}</Text>
                </View>
                <View style={{ paddingVertical: 4, paddingRight: 6, paddingLeft: 9, borderLeftWidth: 3.5, borderLeftColor: lime, backgroundColor: MOSAIC_TOKENS.white }}>
                  {data.notes.content ? renderFormeRichText(data.notes.content, {
                    font,
                    paragraphStyle: { fontFamily: font, fontSize: 5.9, color: '#374151', lineHeight: 1.4, marginBottom: 2 },
                    listMarkerStyle: { fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.forest, width: 7 },
                    listItemTextStyle: { fontFamily: font, fontSize: 5.9, color: '#374151', lineHeight: 1.4 },
                  }) : (
                    <Text style={{ fontFamily: font, fontSize: 5.9, color: '#374151', lineHeight: 1.4 }}>{safeText(data.notes.plainText)}</Text>
                  )}
                </View>
              </View>
            ) : null}

            {data.terms ? (
              <View style={{ flex: 1 }}>
                <View style={{ backgroundColor: MOSAIC_TOKENS.tint2, borderBottomWidth: 0.4, borderBottomColor: MOSAIC_TOKENS.border, paddingVertical: 2.5, paddingHorizontal: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(data.terms.title || 'Terms')}</Text>
                  <Text style={microLabel(font, MOSAIC_TOKENS.slate)}>{'Conditions'}</Text>
                </View>
                <View style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
                  {data.terms.content ? renderFormeRichText(data.terms.content, {
                    font,
                    paragraphStyle: { fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.slate, lineHeight: 1.38, marginBottom: 2 },
                    listMarkerStyle: { fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.forest, width: 7 },
                    listItemTextStyle: { fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.slate, lineHeight: 1.38 },
                  }) : (
                    <Text style={{ fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.slate, lineHeight: 1.38 }}>{safeText(data.terms.plainText)}</Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 5. ATTACHMENTS */}
        {attachmentItems.length > 0 ? (
          <View style={{ marginBottom: compact ? 4 : 6, borderWidth: 0.4, borderColor: MOSAIC_TOKENS.border, paddingVertical: 4, paddingHorizontal: 6 }}>
            <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{'Supporting documents'}</Text>
            {attachmentItems.map((att, idx) => (
              <View key={`att-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1.5 }}>
                <Text style={{ fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.slate, marginRight: 4 }}>{safeText(att.label)}</Text>
                {att.url ? <Link href={att.url} style={{ fontSize: 5.9, color: MOSAIC_TOKENS.limeDark, textDecoration: 'underline' }}>Open document</Link> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* 6. SIGNATURES — only when genuine signature data exists */}
        {showProcurementSignatures && procurementSignatories ? (
          <View style={{ flexDirection: 'row', borderTopWidth: 0.6, borderTopColor: MOSAIC_TOKENS.forest, paddingTop: 5 }} wrap={false}>
            {procurementSignatories.requisitioner ? (
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(procurementSignatories.requisitioner.label || 'Requisitioner')}</Text>
                {procurementSignatories.requisitioner.signatureUrl ? (
                  <Image src={procurementSignatories.requisitioner.signatureUrl} href={procurementSignatories.requisitioner.signatureUrl} style={{ width: 90, height: 28, marginVertical: 2 }} />
                ) : null}
                {safeText(procurementSignatories.requisitioner.name) ? (
                  <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: MOSAIC_TOKENS.forest }}>
                    {safeText(procurementSignatories.requisitioner.name)}
                  </Text>
                ) : null}
                {safeText(procurementSignatories.requisitioner.title) ? (
                  <Text style={{ fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.slate }}>{safeText(procurementSignatories.requisitioner.title)}</Text>
                ) : null}
              </View>
            ) : null}
            {procurementSignatories.authorizer ? (
              <View style={{ flex: 1 }}>
                <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(procurementSignatories.authorizer.label || 'Authorisation')}</Text>
                {procurementSignatories.authorizer.signatureUrl ? (
                  <Image src={procurementSignatories.authorizer.signatureUrl} href={procurementSignatories.authorizer.signatureUrl} style={{ width: 90, height: 28, marginVertical: 2 }} />
                ) : null}
                {safeText(procurementSignatories.authorizer.name) ? (
                  <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: MOSAIC_TOKENS.forest }}>
                    {safeText(procurementSignatories.authorizer.name)}
                  </Text>
                ) : null}
                {safeText(procurementSignatories.authorizer.title) ? (
                  <Text style={{ fontFamily: font, fontSize: 5.9, color: MOSAIC_TOKENS.slate }}>{safeText(procurementSignatories.authorizer.title)}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : showSignature && signature ? (
          <View style={{ borderTopWidth: 0.6, borderTopColor: MOSAIC_TOKENS.forest, paddingTop: 5, width: 200 }} wrap={false}>
            <Text style={microLabel(font, MOSAIC_TOKENS.forest)}>{safeText(signature.role || 'Authorised Signatory')}</Text>
            {signature.imageUrl ? (
              <Image src={signature.imageUrl} href={signature.imageUrl} style={{ width: 90, height: 28, marginVertical: 2 }} />
            ) : null}
            {safeText(signature.name) ? (
              <Text style={{ fontFamily: headerFont, fontSize: 7, fontWeight: 700, color: MOSAIC_TOKENS.forest }}>
                {safeText(signature.name)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
