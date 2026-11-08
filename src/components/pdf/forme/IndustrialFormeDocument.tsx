import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../industryAdapter'
import { isFormeSupportedFamily } from './fonts'
import { glyphRuns } from './glyphs'
import { parseGroupHeader, resolveIndustrialTableWidths } from './industrialLayout'
import {
  buildPartyLines,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
  getGroupLabel,
} from '../engine'

export interface IndustrialFormeDocumentProps {
  data: CommercialDocumentData
  compact?: boolean
}

/**
 * Industrial Color & Metric Tokens (sampled directly from commercial-industrial.html)
 */
export const INDUSTRIAL_TOKENS = {
  paper: '#F6F6F2',
  panel: '#ECEEEA',
  panelDeep: '#E2E5E0',
  graphite: '#1D2528',
  steel: '#5D6B70',
  line: '#AEB6B4',
  lineSoft: '#D2D6D2',
  orange: '#DC5A21',
  orangeSoft: '#F4DCCF',
  peach: '#F3A57D',
  deductionRed: '#B42318',
} as const

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_H = 22.68
const TABLE_OUTER_BORDER = 0.71 // 0.25 mm

function formatIndustrialDeduction(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const clean = trimmed.replace(/[()]/g, '').replace(/^-+/, '').trim()
  if (/^[₦$€£]/.test(clean)) {
    return `−${clean[0]} ${clean.slice(1).trim()}`
  }
  return `−${clean}`
}

function resolveFont(choice: string | null | undefined, fallback: string): string {
  return choice && isFormeSupportedFamily(choice) ? choice : fallback
}

function joinClientContacts(client: NonNullable<CommercialDocumentData['client']>) {
  const lines = buildPartyLines(client)
  const email = lines.find((line) => line.type === 'email')
  const hasPhone = lines.some((line) => line.type === 'phone')
  if (!email || !hasPhone) return lines
  return lines
    .filter((line) => line.type !== 'email')
    .map((line) =>
      line.type === 'phone'
        ? { ...line, value: `${line.value} | ${email.value}` }
        : line,
    )
}

export function IndustrialFormeDocument({ data, compact = false }: IndustrialFormeDocumentProps): React.JSX.Element {
  const design = data.design
  const font = resolveFont(design?.useCustomFonts ? design?.bodyFont : null, 'Inter')
  const displayFont = resolveFont(design?.useCustomFonts ? design?.headerFont : null, 'Archivo Black')
  const signFont = 'Caveat'
  const accent = design?.useCustomColors && design?.accentColor ? design.accentColor : INDUSTRIAL_TOKENS.orange

  const isLandscape = data.layout?.orientation === 'landscape'
  const pageWidth = isLandscape ? PAGE_HEIGHT : PAGE_WIDTH
  const pageHeight = isLandscape ? PAGE_WIDTH : PAGE_HEIGHT
  const pageSize = isLandscape ? { width: pageWidth, height: pageHeight } : 'A4'
  const contentWidth = pageWidth - MARGIN_H * 2

  const pad = (value: number) => (compact ? Math.max(1, Math.round(value * 0.72 * 2) / 2) : value)
  const gap = (value: number) => (compact ? Math.max(2, Math.round(value * 0.7)) : value)

  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)
  const bankDetails = hasBankDetails && data.paymentDetails
    ? [
        data.paymentDetails.bankName,
        data.paymentDetails.accountName,
        data.paymentDetails.accountNumber,
        data.paymentDetails.sortCode,
      ].some((value) => Boolean(value && value.trim()))
      ? data.paymentDetails
      : null
    : null

  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const amountInWords = getAmountInWords(data.totals)
  const advanceSummary = buildAdvanceSummary(data.advanceSummary)

  const tableColumns = resolveIndustrialTableWidths(
    data.table.columns,
    // The outer frame and the table border each inset the row area by one
    // full border width on both sides. Forme shifts cells right by the left
    // border without reducing the column budget, so subtract both borders.
    contentWidth - TABLE_OUTER_BORDER * 4,
  )

  const metaFields = [
    data.documentNumber
      ? { label: data.documentNumberLabel || 'Document number', value: data.documentNumber }
      : null,
    data.issueDate ? { label: data.issueDateLabel || 'Issue date', value: data.issueDate } : null,
    data.dueDateOrValidityDate
      ? { label: data.dueDateOrValidityDateLabel || 'Due date', value: data.dueDateOrValidityDate }
      : null,
    data.poNumber ? { label: data.poNumberLabel || 'PO number', value: data.poNumber } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const metaRows: Array<Array<{ label: string; value: string }>> = []
  for (let index = 0; index < metaFields.length; index += 2) {
    metaRows.push(metaFields.slice(index, index + 2))
  }

  const clientLines = data.client ? joinClientContacts(data.client) : []

  const notesText = data.notes?.plainText || data.notes?.content || ''
  const termsText = data.terms?.plainText || data.terms?.content || ''
  const additionalFields = (data.additionalFields || []).filter((field) => Boolean(field.value && field.value.trim()))
  const attachments = (data.attachments || []).filter((entry) => Boolean(entry.label || entry.url))
  const signature = data.signature && (data.signature.imageUrl || data.signature.name) ? data.signature : null

  const hasClosingLeft = totalsLines.length > 0
  const hasClosingRight = Boolean(bankDetails) || Boolean(data.isProcurement && data.deliveryDestination)

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()}>
      <Page
        size={pageSize}
        margin={{
          top: compact ? 18 : 22.68,
          right: MARGIN_H,
          bottom: compact ? 6 : 8,
          left: MARGIN_H,
        }}
        style={{ backgroundColor: INDUSTRIAL_TOKENS.paper }}
      >
        {/* Fixed Footer: Pinned at true bottom baseline */}
        <Fixed position="footer">
          <View
            style={{
              borderTopWidth: 1.25,
              borderTopColor: INDUSTRIAL_TOKENS.graphite,
              backgroundColor: INDUSTRIAL_TOKENS.panel,
              paddingTop: 4,
              paddingBottom: 4,
              paddingLeft: 8,
              paddingRight: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              {data.company?.companyLogoUrl ? (
                <Image
                  src={data.company.companyLogoUrl}
                  href={data.company.companyLogoUrl}
                  style={{ width: 12, height: 12, marginRight: 6 }}
                />
              ) : null}
              <Text style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {data.footer.companyName || data.company?.name || ''}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.graphite, fontWeight: 700, letterSpacing: 0.4 }}>
                Page {'{{pageNumber}}'} of {'{{totalPages}}'}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.4 }}>
                {data.footer.documentNumber || data.documentNumber || ''}
              </Text>
            </View>
          </View>
        </Fixed>

        {/* Outer Frame Wrapper — frames the complete sheet on every page */}
        <View style={{ borderWidth: TABLE_OUTER_BORDER, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: INDUSTRIAL_TOKENS.paper }}>
          {/* 1. Title Grid (1.35fr : 1fr) */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INDUSTRIAL_TOKENS.graphite }}>
            {/* Left Title Column */}
            <View
              style={{
                flex: metaRows.length > 0 ? 1.35 : 1,
                paddingTop: pad(7),
                paddingBottom: pad(7),
                paddingLeft: 10,
                paddingRight: 10,
                borderRightWidth: metaRows.length > 0 ? 0.75 : 0,
                borderRightColor: INDUSTRIAL_TOKENS.graphite,
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: displayFont, fontSize: compact ? 24 : 29, fontWeight: 900, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: -0.2, marginTop: 2 }}>
                {data.title}
              </Text>
              {data.customTitle ? (
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.1, marginTop: 3 }}>
                  {data.customTitle}
                </Text>
              ) : null}
            </View>

            {/* Right Meta Matrix Cells */}
            {metaRows.length > 0 ? (
              <View style={{ flex: 1, flexDirection: 'column' }}>
                {metaRows.map((row, rowIdx) => (
                  <View
                    key={`meta-row-${rowIdx}`}
                    style={{
                      flexDirection: 'row',
                      flex: 1,
                      borderBottomWidth: rowIdx < metaRows.length - 1 ? 0.5 : 0,
                      borderBottomColor: INDUSTRIAL_TOKENS.lineSoft,
                    }}
                  >
                    {row.map((field, colIdx) => (
                      <View
                        key={`meta-${rowIdx}-${colIdx}`}
                        style={{
                          flex: 1,
                          padding: 6,
                          borderLeftWidth: colIdx > 0 ? 0.5 : 0,
                          borderLeftColor: INDUSTRIAL_TOKENS.lineSoft,
                        }}
                      >
                        <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {field.label}
                        </Text>
                        <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.2, marginTop: 2 }}>
                          {field.value}
                        </Text>
                      </View>
                    ))}
                    {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* 2. Issuer Banner (Company branding & contacts) */}
          {data.company ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: pad(6), borderBottomWidth: 1, borderBottomColor: INDUSTRIAL_TOKENS.graphite, gap: 10 }}>
              {data.company.companyLogoUrl ? (
                <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Image src={data.company.companyLogoUrl} href={data.company.companyLogoUrl} style={{ width: 32, height: 32 }} />
                </View>
              ) : null}

              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {data.company.name}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, marginTop: 1, lineHeight: 1.3 }}>
                  {[data.company.address, data.company.cityState].filter(Boolean).join(', ')}
                </Text>
                {data.showTagline && data.company.tagline ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, marginTop: 1 }}>
                    {data.company.tagline}
                  </Text>
                ) : null}
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                {data.company.phone ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel }}>
                    TEL <Text style={{ fontFamily: font, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>{data.company.phone}</Text>
                  </Text>
                ) : null}
                {data.company.email ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel }}>
                    MAIL <Text style={{ fontFamily: font, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>{data.company.email}</Text>
                  </Text>
                ) : null}
                {data.company.website ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel }}>
                    WEB <Text style={{ fontFamily: font, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>{data.company.website}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* 3. Custom Metadata Row (M-01, M-02...) */}
          {data.customHeaderFields.length > 0 ? (
            <View style={{ flexDirection: 'row', backgroundColor: INDUSTRIAL_TOKENS.panel, borderBottomWidth: 1, borderBottomColor: INDUSTRIAL_TOKENS.graphite }}>
              {data.customHeaderFields.map((field, idx) => (
                <View
                  key={`custom-meta-${idx}`}
                  style={{
                    flex: 1,
                    paddingTop: pad(4),
                    paddingBottom: pad(4),
                    paddingLeft: 6,
                    paddingRight: 6,
                    borderRightWidth: idx < data.customHeaderFields.length - 1 ? 0.5 : 0,
                    borderRightColor: INDUSTRIAL_TOKENS.lineSoft,
                  }}
                >
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>
                    {glyphRuns(field.label, font)}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite, marginTop: 1 }}>
                    {glyphRuns(field.value, font)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 4. Client Block */}
          {data.client ? (
            <View style={{ padding: pad(6) }}>
              <View style={{ borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                <View style={{ backgroundColor: INDUSTRIAL_TOKENS.panelDeep, borderBottomWidth: 0.75, borderBottomColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                  <Text style={{ fontFamily: font, fontSize: 5.2, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {data.isProcurement ? (data.partyHeaderLabel || 'ORDER FROM / SUPPLIER') : 'BILL TO / CLIENT'}
                  </Text>
                </View>
                <View style={{ padding: pad(6) }}>
                  {clientLines.map((line) => (
                    <Text
                      key={line.key}
                      style={{
                        fontFamily: font,
                        fontSize: line.type === 'name' ? 8.5 : 6.5,
                        fontWeight: line.type === 'name' ? 700 : 400,
                        color: line.type === 'phone' || line.type === 'email' || line.type === 'website'
                          ? INDUSTRIAL_TOKENS.steel
                          : '#343E41',
                        textTransform: line.type === 'name' ? 'uppercase' : 'none',
                        letterSpacing: line.type === 'name' ? 0.2 : 0,
                        marginTop: line.type === 'name' ? 0 : 1,
                        lineHeight: 1.3,
                      }}
                    >
                      {glyphRuns(line.value, font)}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {/* 5. Line Items Table */}
          {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
            <View style={{ marginBottom: gap(9) }}>
              <Table columns={tableColumns} style={{ borderWidth: TABLE_OUTER_BORDER, borderColor: INDUSTRIAL_TOKENS.graphite }}>
                {/* Header Row */}
                <Row header>
                  {data.table.columns.map((column, idx) => {
                    const colCode = String.fromCharCode(65 + idx) // A, B, C, D...
                    const align = column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left'
                    const isFirstCol = idx === 0
                    const isLastCol = idx === data.table.columns.length - 1
                    return (
                      <Cell
                        key={`head-${idx}`}
                        style={{
                          backgroundColor: INDUSTRIAL_TOKENS.graphite,
                          paddingTop: pad(4),
                          paddingBottom: pad(4),
                          paddingLeft: 5,
                          paddingRight: 5,
                          borderLeftWidth: isFirstCol ? TABLE_OUTER_BORDER : 0,
                          borderLeftColor: INDUSTRIAL_TOKENS.graphite,
                          borderRightWidth: isLastCol ? TABLE_OUTER_BORDER : 0.5,
                          borderRightColor: isLastCol ? INDUSTRIAL_TOKENS.graphite : '#465053',
                        }}
                      >
                        <Text style={{ fontFamily: font, fontSize: 4.5, color: INDUSTRIAL_TOKENS.peach, letterSpacing: 0.8, textAlign: align }}>
                          {colCode}
                        </Text>
                        <Text
                          style={{
                            fontFamily: font,
                            fontSize: 5.5,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            textAlign: align,
                          }}
                        >
                          {glyphRuns(column.label, font)}
                        </Text>
                      </Cell>
                    )
                  })}
                </Row>

                {/* Table Rows */}
                {data.table.rows.map((row, rowIdx) => {
                  // Group Header
                  if (row.rowType === 'group_header') {
                    const rawLabel = getGroupLabel(row)
                    const { key: groupKey, title: groupTitle } = parseGroupHeader(rawLabel)
                    return (
                      <Row key={`group-h-${rowIdx}`}>
                        <Cell
                          colSpan={data.table.columns.length}
                          style={{
                            backgroundColor: accent,
                            paddingTop: pad(4.5),
                            paddingBottom: pad(4.5),
                            paddingLeft: 6,
                            paddingRight: 6,
                            borderTopWidth: 1.5,
                            borderTopColor: INDUSTRIAL_TOKENS.graphite,
                            borderLeftWidth: TABLE_OUTER_BORDER,
                            borderLeftColor: INDUSTRIAL_TOKENS.graphite,
                            borderRightWidth: TABLE_OUTER_BORDER,
                            borderRightColor: INDUSTRIAL_TOKENS.graphite,
                            borderBottomWidth: 0.5,
                            borderBottomColor: INDUSTRIAL_TOKENS.graphite,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {groupKey ? (
                              <View style={{ backgroundColor: '#FFFFFF', paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1, marginRight: 6 }}>
                                <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 700, color: accent, letterSpacing: 0.6 }}>
                                  {groupKey}
                                </Text>
                              </View>
                            ) : null}
                            <Text style={{ fontFamily: font, fontSize: 7, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                              {glyphRuns(groupTitle, font)}
                            </Text>
                          </View>
                        </Cell>
                      </Row>
                    )
                  }

                  // Group Footer (Subtotal)
                  if (row.rowType === 'group_footer') {
                    const subtotalValue = row.groupSubtotalValue
                    const showSubtotal = row.showSubtotal === true && subtotalValue != null && subtotalValue !== ''
                    return (
                      <Row key={`group-f-${rowIdx}`}>
                        <Cell
                          colSpan={data.table.columns.length}
                          style={{
                            backgroundColor: INDUSTRIAL_TOKENS.panel,
                            paddingTop: pad(3.5),
                            paddingBottom: pad(3.5),
                            paddingLeft: 6,
                            paddingRight: 6,
                            borderTopWidth: 0.85,
                            borderTopColor: accent,
                            borderLeftWidth: TABLE_OUTER_BORDER,
                            borderLeftColor: INDUSTRIAL_TOKENS.graphite,
                            borderRightWidth: TABLE_OUTER_BORDER,
                            borderRightColor: INDUSTRIAL_TOKENS.graphite,
                            borderBottomWidth: 1.5,
                            borderBottomColor: INDUSTRIAL_TOKENS.graphite,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontFamily: font, fontSize: 5.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {showSubtotal ? 'END OF GROUP | GROUP SUBTOTAL' : 'END OF GROUP'}
                            </Text>
                            {showSubtotal ? (
                              <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>
                                {glyphRuns(String(subtotalValue), font)}
                              </Text>
                            ) : null}
                          </View>
                        </Cell>
                      </Row>
                    )
                  }

                  // Standard Data Row
                  const isEven = rowIdx % 2 === 1
                  const isGroupMember = Boolean(row.isInGroup)
                  const rowBg = isEven ? INDUSTRIAL_TOKENS.panel : '#FFFFFF'

                  return (
                    <Row key={`row-${rowIdx}`}>
                      {data.table.columns.map((column, colIdx) => {
                        const cell = row.cells?.[column.key]
                        const isDesc = column.key === 'description'
                        const isNum = column.key === 'num'
                        const isFirstCol = colIdx === 0
                        const isLastCol = colIdx === data.table.columns.length - 1
                        const align = column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left'

                        let mainText = ''
                        let subText = ''
                        if (isDesc && typeof cell === 'object' && cell !== null) {
                          const descObj = cell as Record<string, unknown>
                          mainText = String(descObj.main || '')
                          subText = String(descObj.sub || '')
                        } else {
                          mainText = cell != null ? String(cell) : ''
                        }

                        return (
                          <Cell
                            key={`cell-${rowIdx}-${colIdx}`}
                            style={{
                              backgroundColor: rowBg,
                              paddingTop: pad(4),
                              paddingBottom: pad(4),
                              paddingLeft: 5,
                              paddingRight: 5,
                              borderBottomWidth: 0.5,
                              borderBottomColor: INDUSTRIAL_TOKENS.lineSoft,
                              borderLeftWidth: isFirstCol ? (isGroupMember ? 1.5 : TABLE_OUTER_BORDER) : 0.5,
                              borderLeftColor: isFirstCol && isGroupMember ? INDUSTRIAL_TOKENS.graphite : INDUSTRIAL_TOKENS.lineSoft,
                              borderRightWidth: isLastCol ? (isGroupMember ? 1.5 : TABLE_OUTER_BORDER) : 0,
                              borderRightColor: isLastCol && isGroupMember ? INDUSTRIAL_TOKENS.graphite : 'transparent',
                            }}
                          >
                            {isNum ? (
                              <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: accent, textAlign: 'center' }}>
                                {mainText}
                              </Text>
                            ) : isDesc ? (
                              <View>
                                <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>
                                  {glyphRuns(mainText, font)}
                                </Text>
                                {subText ? (
                                  <Text style={{ fontFamily: font, fontSize: 6, color: '#394346', marginTop: 1, lineHeight: 1.25 }}>
                                    {glyphRuns(subText, font)}
                                  </Text>
                                ) : null}
                                {row.imageUrl ? (
                                  <View
                                    style={{
                                      marginTop: 3,
                                      width: 34,
                                      height: 18,
                                      borderWidth: 0.5,
                                      borderColor: INDUSTRIAL_TOKENS.lineSoft,
                                      backgroundColor: '#FFFFFF',
                                      padding: 1.5,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 31, height: 15 }} />
                                  </View>
                                ) : null}
                              </View>
                            ) : (
                              <Text
                                style={{
                                  fontFamily: font,
                                  fontSize: 6.8,
                                  fontWeight: column.key === 'amount' ? 700 : 400,
                                  color: INDUSTRIAL_TOKENS.graphite,
                                  textAlign: align,
                                }}
                              >
                                {glyphRuns(mainText, font)}
                              </Text>
                            )}
                          </Cell>
                        )
                      })}
                    </Row>
                  )
                })}
              </Table>
            </View>
          ) : null}

          {/* 6. Closing Section: Cost Build-up & Bank Details */}
          {(hasClosingLeft || hasClosingRight) ? (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: gap(6) }}>
              {/* Cost build-up ledger */}
              {hasClosingLeft ? (
                <View style={{ flex: hasClosingRight ? 1.15 : 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                    <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      COST BUILD-UP
                    </Text>
                  </View>
                  <View style={{ padding: pad(6) }}>
                    {totalsLines.map((line, idx) => {
                      const isDed = Boolean(line.isDeduction)
                      const formattedVal = isDed ? formatIndustrialDeduction(line.value) : line.value
                      return (
                        <View
                          key={`total-line-${idx}`}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 2,
                            paddingBottom: 2,
                            borderBottomWidth: idx < totalsLines.length - 1 ? 0.5 : 0,
                            borderBottomColor: INDUSTRIAL_TOKENS.lineSoft,
                          }}
                        >
                          <Text style={{ fontFamily: font, fontSize: 6.5, color: isDed ? INDUSTRIAL_TOKENS.deductionRed : INDUSTRIAL_TOKENS.steel }}>
                            {glyphRuns(line.label, font)}
                          </Text>
                          <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 600, color: isDed ? INDUSTRIAL_TOKENS.deductionRed : INDUSTRIAL_TOKENS.graphite }}>
                            {glyphRuns(formattedVal, font)}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              ) : null}

              {/* Bank payment details */}
              {bankDetails ? (
                <View style={{ flex: hasClosingLeft ? 0.95 : 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                    <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      BANK PAYMENT DETAILS
                    </Text>
                  </View>
                  <View style={{ padding: pad(6) }}>
                    {bankDetails.bankName ? (
                      <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
                        {bankDetails.bankName}
                      </Text>
                    ) : null}
                    {bankDetails.accountNumber ? (
                      <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, marginTop: 1, letterSpacing: 0.5 }}>
                        {bankDetails.accountNumber}
                      </Text>
                    ) : null}
                    {bankDetails.accountName || bankDetails.sortCode ? (
                      <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, marginTop: 1 }}>
                        {[bankDetails.accountName, bankDetails.sortCode ? `Sort: ${bankDetails.sortCode}` : '']
                          .filter(Boolean)
                          .join(' | ')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : data.isProcurement && data.deliveryDestination ? (
                <View style={{ flex: hasClosingLeft ? 0.95 : 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                    <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {data.deliveryDestination.label || 'DELIVERY DESTINATION'}
                    </Text>
                  </View>
                  <View style={{ padding: pad(6) }}>
                    {data.deliveryDestination.site ? (
                      <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
                        {data.deliveryDestination.site}
                      </Text>
                    ) : null}
                    {(data.deliveryDestination.addressLines || []).map((line, idx) => (
                      <Text key={'dest-line-' + idx} style={{ fontFamily: font, fontSize: 6, color: '#343E41', marginTop: 1 }}>
                        {line}
                      </Text>
                    ))}
                    {data.deliveryDestination.contactPerson ? (
                      <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, marginTop: 1 }}>
                        Contact: {data.deliveryDestination.contactPerson} {data.deliveryDestination.phone ? '(' + data.deliveryDestination.phone + ')' : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 7. Total Callout Banner with Heavy Accent Stripe */}
          {mainTotal ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: INDUSTRIAL_TOKENS.graphite,
                borderWidth: 1,
                borderColor: INDUSTRIAL_TOKENS.graphite,
                borderLeftWidth: 8,
                borderLeftColor: accent,
                paddingTop: pad(6),
                paddingBottom: pad(6),
                paddingLeft: 8,
                paddingRight: 8,
                marginBottom: 4,
              }}
            >
              <View>
                <Text style={{ fontFamily: font, fontSize: 5.6, fontWeight: 700, color: INDUSTRIAL_TOKENS.peach, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {mainTotal.label || 'TOTAL'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontFamily: font, fontSize: 18, fontWeight: 900, color: '#FFFFFF', letterSpacing: -0.2 }}>
                  {glyphRuns(mainTotal.value, font)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Balance Due / Advance Summary Banner if applicable */}
          {balanceDue ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: accent,
                paddingTop: pad(3.5),
                paddingBottom: pad(3.5),
                paddingLeft: 8,
                paddingRight: 8,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontFamily: font, fontSize: 6, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {glyphRuns(balanceDue.label, font)}
              </Text>
              <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: '#FFFFFF' }}>
                {glyphRuns(balanceDue.value, font)}
              </Text>
            </View>
          ) : null}

          {advanceSummary ? (
            <View
              style={{
                borderWidth: 0.75,
                borderColor: INDUSTRIAL_TOKENS.graphite,
                backgroundColor: INDUSTRIAL_TOKENS.panel,
                padding: 5,
                marginBottom: 4,
              }}
            >
              {advanceSummary.advanceAmount ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: advanceSummary.secondaryLabel ? 2 : 0 }}>
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                    {advanceSummary.primaryLabel || ''}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 7, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>
                    {glyphRuns(advanceSummary.advanceAmount, font)}
                  </Text>
                </View>
              ) : null}
              {advanceSummary.secondaryLabel ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                    {advanceSummary.secondaryLabel}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 7, color: INDUSTRIAL_TOKENS.graphite }}>
                    {glyphRuns(advanceSummary.balanceRemaining || '', font)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Amount in words */}
          {amountInWords ? (
            <View
              style={{
                borderWidth: 0.75,
                borderColor: INDUSTRIAL_TOKENS.graphite,
                borderLeftWidth: 3,
                borderLeftColor: accent,
                backgroundColor: INDUSTRIAL_TOKENS.panel,
                paddingTop: pad(4),
                paddingBottom: pad(4),
                paddingLeft: 8,
                paddingRight: 8,
                marginBottom: gap(8),
              }}
            >
              <Text style={{ fontFamily: font, fontSize: 5, fontWeight: 700, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                AMOUNT IN WORDS
              </Text>
              <Text style={{ fontFamily: font, fontSize: compact ? 7.5 : 8.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.1, lineHeight: 1.3, marginTop: 2 }}>
                {glyphRuns(amountInWords, font)}
              </Text>
            </View>
          ) : null}

          {/* 8. Notes & Terms Section */}
          {(notesText || termsText) ? (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: gap(6) }}>
              {notesText ? (
                <View style={{ flex: termsText ? 0.85 : 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                    <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {data.notes?.title || 'NOTES'}
                    </Text>
                  </View>
                  <View style={{ padding: pad(6) }}>
                    <Text style={{ fontFamily: font, fontSize: 6, color: '#343E41', lineHeight: 1.35 }}>
                      {glyphRuns(notesText, font)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {termsText ? (
                <View style={{ flex: notesText ? 1.15 : 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                    <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {data.terms?.title || 'TERMS & CONDITIONS'}
                    </Text>
                  </View>
                  <View style={{ padding: pad(6) }}>
                    <Text style={{ fontFamily: font, fontSize: 6, color: '#343E41', lineHeight: 1.35 }}>
                      {glyphRuns(termsText, font)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Additional Fields & Attachments */}
          {additionalFields.length > 0 || attachments.length > 0 ? (
            <View style={{ borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 6, marginBottom: gap(6) }}>
              {additionalFields.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: attachments.length ? 4 : 0 }}>
                  {additionalFields.map((field, idx) => (
                    <View key={`add-field-${idx}`} style={{ marginRight: 10 }}>
                      <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>{glyphRuns(field.label, font)}</Text>
                      <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite }}>{glyphRuns(field.value, font)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {attachments.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderTopWidth: additionalFields.length ? 0.5 : 0, borderTopColor: INDUSTRIAL_TOKENS.lineSoft, paddingTop: additionalFields.length ? 4 : 0 }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', marginRight: 4 }}>Attachments:</Text>
                  {attachments.map((att, idx) => (
                    <Text key={`att-${idx}`} style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.graphite }}>
                      {att.label || att.url || ''}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 9. Issuer Signature — rendered only when a signature is supplied */}
          {data.isProcurement && data.procurementSignatories ? (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: gap(5) }}>
              {data.procurementSignatories.requisitioner ? (
                <View style={{ width: 210, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 4 }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.line, paddingBottom: 2 }}>
                    {data.procurementSignatories.requisitioner.label || 'PURCHASING OFFICER / REQUISITIONER'}
                  </Text>
                  <View style={{ height: compact ? 18 : 22, overflow: 'hidden', justifyContent: 'center' }}>
                    {data.procurementSignatories.requisitioner.signatureUrl ? (
                      <Image src={data.procurementSignatories.requisitioner.signatureUrl} href={data.procurementSignatories.requisitioner.signatureUrl} height={compact ? 16 : 20} />
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
                    {data.procurementSignatories.requisitioner.name || 'Requisitioner'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                    {data.procurementSignatories.requisitioner.title || 'Purchasing Officer'}
                  </Text>
                </View>
              ) : null}
              {data.procurementSignatories.authorizer ? (
                <View style={{ width: 210, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 4 }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.line, paddingBottom: 2 }}>
                    {data.procurementSignatories.authorizer.label || 'MANAGEMENT / FINANCE AUTHORISATION'}
                  </Text>
                  <View style={{ height: compact ? 18 : 22, overflow: 'hidden', justifyContent: 'center' }}>
                    {data.procurementSignatories.authorizer.signatureUrl ? (
                      <Image src={data.procurementSignatories.authorizer.signatureUrl} href={data.procurementSignatories.authorizer.signatureUrl} height={compact ? 16 : 20} />
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
                    {data.procurementSignatories.authorizer.name || 'Authorised By'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                    {data.procurementSignatories.authorizer.title || 'Management Authorisation'}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : signature ? (
            <View style={{ flexDirection: 'row', marginBottom: gap(5) }}>
              <View style={{ width: 210, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 4 }}>
                <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.line, paddingBottom: 2 }}>
                  ISSUER AUTHORISED SIGNATORY
                </Text>
                <View style={{ height: compact ? 18 : 22, overflow: 'hidden', justifyContent: 'center' }}>
                  {signature.imageUrl ? (
                    <Image src={signature.imageUrl} href={signature.imageUrl} height={compact ? 16 : 20} />
                  ) : signature.name ? (
                    <Text style={{ fontFamily: signFont, fontSize: 16, color: INDUSTRIAL_TOKENS.graphite }}>
                      {signature.name}
                    </Text>
                  ) : null}
                </View>
                {signature.name ? (
                  <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
                    {signature.name}
                  </Text>
                ) : null}
                {signature.role ? (
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                    {signature.role}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
