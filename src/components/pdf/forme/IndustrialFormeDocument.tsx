import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../industryAdapter'
import {
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
const MARGIN_H = 22.68
const CONTENT_INNER_WIDTH = PAGE_WIDTH - 2 * MARGIN_H - 2 * 11.34 // ~527.24 pt

/**
 * Standard column widths in points for the industrial engineering schedule
 * based on physical millimeter specifications in commercial-industrial.html
 */
const INDUSTRIAL_FIXED_WIDTHS: Record<string, number> = {
  num: 26, // 9mm
  quantity: 34, // 12mm
  unit: 40, // 14mm
  make: 56,
  unit_price: 72, // 25mm
  amount: 80, // 28mm
  install_rate: 68,
  vat_rate: 36,
  discount_rate: 42,
}

function resolveIndustrialTableWidths(
  columns: CommercialDocumentData['table']['columns'],
  availableWidth: number,
): Array<{ width: { fixed: number } }> {
  let fixedSum = 0
  for (const col of columns) {
    if (col.key === 'description') continue
    const defaultWidth = INDUSTRIAL_FIXED_WIDTHS[col.key] ?? 56
    fixedSum += (col.width && col.width > 0 ? col.width : defaultWidth)
  }
  const descWidth = Math.max(120, availableWidth - fixedSum)

  return columns.map((col) => {
    if (col.key === 'description') return { width: { fixed: descWidth } }
    const defaultWidth = INDUSTRIAL_FIXED_WIDTHS[col.key] ?? 56
    return { width: { fixed: col.width && col.width > 0 ? col.width : defaultWidth } }
  })
}

function formatIndustrialDeduction(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const clean = trimmed.replace(/[()]/g, '').replace(/^-+/, '').trim()
  if (/^[₦$€£]/.test(clean)) {
    return `−${clean[0]} ${clean.slice(1).trim()}`
  }
  return `−${clean}`
}

function parseGroupHeader(label: string): { key: string | null; title: string } {
  const trimmed = label.trim()
  const match = trimmed.match(/^(?:group\s+([a-z0-9]+)\s*[-:—]?\s*)?(.*)$/i)
  if (match) {
    return {
      key: match[1] ? match[1].toUpperCase() : null,
      title: match[2] ? match[2].trim() : trimmed,
    }
  }
  return { key: null, title: trimmed }
}

export function IndustrialFormeDocument({ data, compact = false }: IndustrialFormeDocumentProps): React.JSX.Element {
  const font = 'Inter'
  const displayFont = 'Archivo Black'
  const signFont = 'Caveat'

  const titleGridSplitLeft = 1.35
  const titleGridSplitRight = 1.0

  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)
  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const amountInWords = getAmountInWords(data.totals)
  const advanceSummary = buildAdvanceSummary(data.advanceSummary)

  const tableColumns = resolveIndustrialTableWidths(data.table.columns, CONTENT_INNER_WIDTH)

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()}>
      <Page
        size="A4"
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

        {/* Outer Frame Wrapper */}
        <View style={{ borderWidth: 1, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: INDUSTRIAL_TOKENS.paper, marginBottom: 10 }}>
          {/* 1. Title Grid (1.35fr : 1fr) */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INDUSTRIAL_TOKENS.graphite }}>
            {/* Left Title Column */}
            <View
              style={{
                flex: titleGridSplitLeft,
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 10,
                paddingRight: 10,
                borderRightWidth: 0.75,
                borderRightColor: INDUSTRIAL_TOKENS.graphite,
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: font, fontSize: 5.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                COMMERCIAL DOCUMENT
              </Text>
              <Text style={{ fontFamily: displayFont, fontSize: compact ? 24 : 29, fontWeight: 900, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: -0.2, marginTop: 2 }}>
                {data.title}
              </Text>
              {data.customTitle ? (
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.1, marginTop: 3 }}>
                  {data.customTitle}
                </Text>
              ) : null}
            </View>

            {/* Right Meta Matrix Cells (2x2) */}
            <View style={{ flex: titleGridSplitRight, flexDirection: 'column' }}>
              <View style={{ flexDirection: 'row', flex: 1, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.lineSoft }}>
                <View style={{ flex: 1, padding: 6 }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {data.documentNumberLabel || 'Document no.'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.orange, letterSpacing: 0.2, marginTop: 2 }}>
                    {data.documentNumber || '—'}
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 6, borderLeftWidth: 0.5, borderLeftColor: INDUSTRIAL_TOKENS.lineSoft }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {data.issueDateLabel || 'Issue date'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.2, marginTop: 2 }}>
                    {data.issueDate || '—'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flex: 1 }}>
                <View style={{ flex: 1, padding: 6 }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {data.dueDateOrValidityDateLabel || 'Due date'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.2, marginTop: 2 }}>
                    {data.dueDateOrValidityDate || '—'}
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 6, borderLeftWidth: 0.5, borderLeftColor: INDUSTRIAL_TOKENS.lineSoft }}>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {data.poNumber ? (data.poNumberLabel || 'Client PO Ref.') : 'Payment terms'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite, letterSpacing: 0.2, marginTop: 2 }}>
                    {data.poNumber || 'Net 30'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Issuer Banner (Company branding & contacts) */}
          {data.company ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: INDUSTRIAL_TOKENS.graphite, gap: 10 }}>
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
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                {data.company.phone ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel }}>
                    TEL <Text style={{ fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>{data.company.phone}</Text>
                  </Text>
                ) : null}
                {data.company.email ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel }}>
                    MAIL <Text style={{ fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>{data.company.email}</Text>
                  </Text>
                ) : null}
                {data.company.website ? (
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel }}>
                    WEB <Text style={{ fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>{data.company.website}</Text>
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
                    paddingTop: 4,
                    paddingBottom: 4,
                    paddingLeft: 6,
                    paddingRight: 6,
                    borderRightWidth: idx < data.customHeaderFields.length - 1 ? 0.5 : 0,
                    borderRightColor: INDUSTRIAL_TOKENS.lineSoft,
                  }}
                >
                  <Text style={{ fontFamily: font, fontSize: 4.5, color: INDUSTRIAL_TOKENS.orange, fontWeight: 700, letterSpacing: 0.4 }}>
                    {`M-${String(idx + 1).padStart(2, '0')}`}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>
                    {field.label}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite, marginTop: 1 }}>
                    {field.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 4. Parties Block (Client / Bill To & Project Info) */}
          {(data.client || data.company) ? (
            <View style={{ flexDirection: 'row', padding: 8, gap: 10 }}>
              {data.client ? (
                <View style={{ flex: 1.2, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.panelDeep, borderBottomWidth: 0.75, borderBottomColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                    <Text style={{ fontFamily: font, fontSize: 5.2, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      <Text style={{ color: INDUSTRIAL_TOKENS.orange, fontWeight: 700 }}>PT-01</Text> BILL TO / CLIENT
                    </Text>
                    <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.5 }}>PARTY</Text>
                  </View>
                  <View style={{ padding: 6 }}>
                    <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.2 }}>
                      {data.client.name}
                    </Text>
                    {data.client.attention ? (
                      <Text style={{ fontFamily: font, fontSize: 6.5, color: INDUSTRIAL_TOKENS.graphite, marginTop: 2 }}>
                        Attn: {data.client.attention}
                      </Text>
                    ) : null}
                    <Text style={{ fontFamily: font, fontSize: 6.5, color: '#343E41', marginTop: 1, lineHeight: 1.3 }}>
                      {[data.client.address, data.client.cityState].filter(Boolean).join(', ')}
                    </Text>
                    {data.client.phone || data.client.email ? (
                      <Text style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.steel, marginTop: 2 }}>
                        {[data.client.phone, data.client.email].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={{ flex: 0.95, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.panelDeep, borderBottomWidth: 0.75, borderBottomColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                  <Text style={{ fontFamily: font, fontSize: 5.2, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    <Text style={{ color: INDUSTRIAL_TOKENS.orange, fontWeight: 700 }}>PT-02</Text> PROJECT / SITE
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.5 }}>SITE</Text>
                </View>
                <View style={{ padding: 6 }}>
                  <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.2 }}>
                    {data.company?.tagline || data.customTitle || 'Commercial Supply Schedule'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 6.5, color: '#343E41', marginTop: 2, lineHeight: 1.3 }}>
                    Document Ref: {data.documentNumber}
                  </Text>
                  {data.poNumber ? (
                    <Text style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.steel, marginTop: 1 }}>
                      Contract PO: {data.poNumber}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* 5. Line Items Table */}
        {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Table columns={tableColumns}>
              {/* Header Row */}
              <Row header>
                {data.table.columns.map((column, idx) => {
                  const colCode = String.fromCharCode(65 + idx) // A, B, C, D...
                  const align = column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left'
                  return (
                    <Cell
                      key={`head-${idx}`}
                      style={{
                        backgroundColor: INDUSTRIAL_TOKENS.graphite,
                        paddingTop: 4,
                        paddingBottom: 4,
                        paddingLeft: 5,
                        paddingRight: 5,
                        borderRightWidth: idx < data.table.columns.length - 1 ? 0.5 : 0,
                        borderRightColor: '#465053',
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
                        {column.label}
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
                          backgroundColor: '#FFFFFF',
                          paddingTop: 4.5,
                          paddingBottom: 4.5,
                          paddingLeft: 6,
                          paddingRight: 6,
                          borderTopWidth: 1.5,
                          borderTopColor: INDUSTRIAL_TOKENS.graphite,
                          borderLeftWidth: 1.5,
                          borderLeftColor: INDUSTRIAL_TOKENS.graphite,
                          borderRightWidth: 1.5,
                          borderRightColor: INDUSTRIAL_TOKENS.graphite,
                          borderBottomWidth: 0.5,
                          borderBottomColor: INDUSTRIAL_TOKENS.lineSoft,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.orange, letterSpacing: 0.8, marginRight: 6 }}>
                            {groupKey ? `GROUP ${groupKey}` : 'GROUP'}
                          </Text>
                          <Text style={{ fontFamily: font, fontSize: 7, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                            {groupTitle}
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
                          paddingTop: 3.5,
                          paddingBottom: 3.5,
                          paddingLeft: 6,
                          paddingRight: 6,
                          borderTopWidth: 0.5,
                          borderTopColor: INDUSTRIAL_TOKENS.lineSoft,
                          borderLeftWidth: 1.5,
                          borderLeftColor: INDUSTRIAL_TOKENS.graphite,
                          borderRightWidth: 1.5,
                          borderRightColor: INDUSTRIAL_TOKENS.graphite,
                          borderBottomWidth: 1.5,
                          borderBottomColor: INDUSTRIAL_TOKENS.graphite,
                        }}
                      >
                        {showSubtotal ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontFamily: font, fontSize: 5.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              END OF GROUP · GROUP SUBTOTAL
                            </Text>
                            <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>
                              {subtotalValue}
                            </Text>
                          </View>
                        ) : null}
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
                            paddingTop: 4,
                            paddingBottom: 4,
                            paddingLeft: 5,
                            paddingRight: 5,
                            borderBottomWidth: 0.5,
                            borderBottomColor: INDUSTRIAL_TOKENS.lineSoft,
                            borderLeftWidth: isFirstCol && isGroupMember ? 1.5 : (isFirstCol ? 0 : 0.5),
                            borderLeftColor: isFirstCol && isGroupMember ? INDUSTRIAL_TOKENS.graphite : (isFirstCol ? 'transparent' : INDUSTRIAL_TOKENS.lineSoft),
                            borderRightWidth: isLastCol && isGroupMember ? 1.5 : 0,
                            borderRightColor: isLastCol && isGroupMember ? INDUSTRIAL_TOKENS.graphite : 'transparent',
                          }}
                        >
                          {isNum ? (
                            <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.orange, textAlign: 'center' }}>
                              {mainText}
                            </Text>
                          ) : isDesc ? (
                            <View>
                              <Text style={{ fontFamily: font, fontSize: 7.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>
                                {mainText}
                              </Text>
                              {subText ? (
                                <Text style={{ fontFamily: font, fontSize: 6, color: '#394346', marginTop: 1, lineHeight: 1.25 }}>
                                  {subText}
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
                              {mainText}
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
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          {/* Cost Build-up Ledger (SCH-01) */}
          <View style={{ flex: 1.15, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
              <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                COST BUILD-UP
              </Text>
              <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.peach, letterSpacing: 0.6 }}>SCH-01</Text>
            </View>
            <View style={{ padding: 6 }}>
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
                      {line.label}
                    </Text>
                    <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 600, color: isDed ? INDUSTRIAL_TOKENS.deductionRed : INDUSTRIAL_TOKENS.graphite }}>
                      {formattedVal}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Bank Payment Details (PAY) */}
          <View style={{ flex: 0.95, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
              <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                BANK PAYMENT DETAILS
              </Text>
              <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.peach, letterSpacing: 0.6 }}>PAY</Text>
            </View>
            <View style={{ padding: 6 }}>
              {hasBankDetails && data.paymentDetails ? (
                <View>
                  <Text style={{ fontFamily: font, fontSize: 6.8, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
                    {data.paymentDetails.bankName}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, marginTop: 1, letterSpacing: 0.5 }}>
                    {data.paymentDetails.accountNumber}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, marginTop: 1 }}>
                    {data.paymentDetails.accountName}
                    {data.paymentDetails.sortCode ? ` · Sort: ${data.paymentDetails.sortCode}` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontFamily: font, fontSize: 6.5, color: INDUSTRIAL_TOKENS.steel, fontStyle: 'italic' }}>
                  Electronic fund transfer / wire details available upon request.
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 7. Total Callout Banner with Heavy Orange Accent Stripe */}
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
              borderLeftColor: INDUSTRIAL_TOKENS.orange,
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 8,
              paddingRight: 8,
              marginBottom: 4,
            }}
          >
            <View>
              <Text style={{ fontFamily: font, fontSize: 5.6, fontWeight: 700, color: INDUSTRIAL_TOKENS.peach, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {mainTotal.label || 'TOTAL AMOUNT DUE'}
              </Text>
              {data.dueDateOrValidityDate ? (
                <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.peach, marginTop: 1, letterSpacing: 0.4 }}>
                  Payment due {data.dueDateOrValidityDate} · Net 30
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontFamily: font, fontSize: 18, fontWeight: 900, color: '#FFFFFF', letterSpacing: -0.2 }}>
                {mainTotal.value}
              </Text>
              <Text style={{ fontFamily: font, fontSize: 6, fontWeight: 700, color: INDUSTRIAL_TOKENS.peach, letterSpacing: 0.6 }}>
                NGN
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
              backgroundColor: INDUSTRIAL_TOKENS.orange,
              paddingTop: 3.5,
              paddingBottom: 3.5,
              paddingLeft: 8,
              paddingRight: 8,
              marginBottom: 4,
            }}
          >
            <Text style={{ fontFamily: font, fontSize: 6, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {balanceDue.label}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: '#FFFFFF' }}>
              {balanceDue.value}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                {advanceSummary.primaryLabel}
              </Text>
              <Text style={{ fontFamily: font, fontSize: 7, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite }}>
                {advanceSummary.advanceAmount}
              </Text>
            </View>
            {advanceSummary.secondaryLabel ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
                  {advanceSummary.secondaryLabel}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 7, color: INDUSTRIAL_TOKENS.graphite }}>
                  {advanceSummary.balanceRemaining}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Amount in words */}
        {amountInWords ? (
          <Text style={{ fontFamily: font, fontSize: 5.5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 4, marginBottom: 8 }}>
            {amountInWords}
          </Text>
        ) : null}

        {/* 8. Notes & Terms Section */}
        {(data.notes || data.terms) ? (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            {data.notes ? (
              <View style={{ flex: 0.85, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                  <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {data.notes.title || 'NOTES'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.peach, letterSpacing: 0.6 }}>N-01</Text>
                </View>
                <View style={{ padding: 6 }}>
                  <Text style={{ fontFamily: font, fontSize: 6, color: '#343E41', lineHeight: 1.35 }}>
                    {data.notes.plainText || data.notes.content}
                  </Text>
                </View>
              </View>
            ) : null}

            {data.terms ? (
              <View style={{ flex: 1.15, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: INDUSTRIAL_TOKENS.graphite, padding: 3 }}>
                  <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#EFF1ED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {data.terms.title || 'TERMS & CONDITIONS'}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.peach, letterSpacing: 0.6 }}>T-01</Text>
                </View>
                <View style={{ padding: 6 }}>
                  <Text style={{ fontFamily: font, fontSize: 6, color: '#343E41', lineHeight: 1.35 }}>
                    {data.terms.plainText || data.terms.content}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Additional Fields & Attachments */}
        {(data.additionalFields && data.additionalFields.length > 0) || (data.attachments && data.attachments.length > 0) ? (
          <View style={{ borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 6, marginBottom: 8 }}>
            {data.additionalFields && data.additionalFields.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: data.attachments?.length ? 4 : 0 }}>
                {data.additionalFields.map((field, idx) => (
                  <View key={`add-field-${idx}`} style={{ marginRight: 10 }}>
                    <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>{field.label}</Text>
                    <Text style={{ fontFamily: font, fontSize: 6.5, fontWeight: 600, color: INDUSTRIAL_TOKENS.graphite }}>{field.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {data.attachments && data.attachments.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderTopWidth: data.additionalFields?.length ? 0.5 : 0, borderTopColor: INDUSTRIAL_TOKENS.lineSoft, paddingTop: data.additionalFields?.length ? 4 : 0 }}>
                <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', marginRight: 4 }}>Attachments:</Text>
                {data.attachments.map((att, idx) => (
                  <Text key={`att-${idx}`} style={{ fontFamily: font, fontSize: 6, color: INDUSTRIAL_TOKENS.graphite }}>
                    {att.label || `Attachment ${idx + 1}`}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 9. Signatures Block (Triple-box signature grid) */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {/* Box 1: Issuer authorised signatory */}
          <View style={{ flex: 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 5 }}>
            <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.line, paddingBottom: 2 }}>
              ISSUER AUTHORISED SIGNATORY
            </Text>
            <View style={{ height: 26, justifyContent: 'center' }}>
              {data.signature?.imageUrl ? (
                <Image src={data.signature.imageUrl} href={data.signature.imageUrl} style={{ maxWidth: 90, maxHeight: 24 }} />
              ) : data.signature?.name ? (
                <Text style={{ fontFamily: signFont, fontSize: 16, color: INDUSTRIAL_TOKENS.graphite }}>
                  {data.signature.name}
                </Text>
              ) : null}
            </View>
            <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
              {data.signature?.name || 'Authorised Signatory'}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
              {data.signature?.role || 'Authorised Representative'}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 4.8, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', borderTopWidth: 0.5, borderTopColor: INDUSTRIAL_TOKENS.line, paddingTop: 2, marginTop: 4 }}>
              DATE / STAMP
            </Text>
          </View>

          {/* Box 2: Client acknowledgement */}
          <View style={{ flex: 1, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 5 }}>
            <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.line, paddingBottom: 2 }}>
              CLIENT ACKNOWLEDGEMENT
            </Text>
            <View style={{ height: 26 }} />
            <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
              Received by
            </Text>
            <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
              Client confirmation / acknowledgement
            </Text>
            <Text style={{ fontFamily: font, fontSize: 4.8, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', borderTopWidth: 0.5, borderTopColor: INDUSTRIAL_TOKENS.line, paddingTop: 2, marginTop: 4 }}>
              DATE / STAMP
            </Text>
          </View>

          {/* Box 3: Document control */}
          <View style={{ width: 85, borderWidth: 0.75, borderColor: INDUSTRIAL_TOKENS.graphite, backgroundColor: 'rgba(255,255,255,0.45)', padding: 5 }}>
            <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', letterSpacing: 0.6, borderBottomWidth: 0.5, borderBottomColor: INDUSTRIAL_TOKENS.line, paddingBottom: 2 }}>
              DOCUMENT CONTROL
            </Text>
            <View style={{ height: 26 }} />
            <Text style={{ fontFamily: font, fontSize: 6.2, fontWeight: 700, color: INDUSTRIAL_TOKENS.graphite, textTransform: 'uppercase' }}>
              {data.documentNumber || 'REF-CONTROL'}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 5, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase' }}>
              Commercial record
            </Text>
            <Text style={{ fontFamily: font, fontSize: 4.8, color: INDUSTRIAL_TOKENS.steel, textTransform: 'uppercase', borderTopWidth: 0.5, borderTopColor: INDUSTRIAL_TOKENS.line, paddingTop: 2, marginTop: 4 }}>
              VERIFIED / FILED
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
