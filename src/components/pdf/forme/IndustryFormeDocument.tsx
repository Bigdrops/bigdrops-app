import React from 'react'
import { Cell, Document, Fixed, Image, Link, Page, Row, Table, Text, View } from '@formepdf/react'
import { INDUSTRY_DEFAULT_ACCENT, INDUSTRY_GROUP_TOKENS, type CommercialDocumentData } from '../industryAdapter'
import { lightenHex } from '@/lib/pdfDesignPreset'
import {
  getAccentTint,
  buildPartyLines,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
  getGroupLabel,
} from '../engine'

export interface IndustryFormeDocumentProps {
  data: CommercialDocumentData
  compact?: boolean
}

const PAGE_WIDTH = 595.28
const DEFAULT_MARGIN_H = 32
const COMPACT_MARGIN_H = 24

const FIXED_COLUMN_WIDTHS: Record<string, number> = {
  num: 28, quantity: 48, unit: 42, make: 58, unit_price: 74, unitCost: 74, unit_cost: 74,
  amount: 80, install_rate: 72, vat_rate: 36, discount_rate: 42,
}

function resolveCommercialTableWidths(
  columns: CommercialDocumentData['table']['columns'],
  contentWidth: number,
): Array<{ width: { fixed: number } }> {
  let fixedSum = 0
  for (const col of columns) {
    if (col.key === 'description') continue
    const defaultWidth = FIXED_COLUMN_WIDTHS[col.key] ?? 60
    fixedSum += (col.width && col.width > 0 ? col.width : defaultWidth)
  }
  const descWidth = Math.max(120, contentWidth - fixedSum)

  return columns.map((col) => {
    if (col.key === 'description') return { width: { fixed: descWidth } }
    const defaultWidth = FIXED_COLUMN_WIDTHS[col.key] ?? 60
    return { width: { fixed: col.width && col.width > 0 ? col.width : defaultWidth } }
  })
}

function toTitleCase(value: string) {
  return value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

function formatDeductionValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const clean = trimmed.replace(/[()]/g, '').replace(/-/g, '').trim()
  if (/^[₦$€£]/.test(clean)) {
    return `-${clean[0]} ${clean.slice(1).trim()}`
  }
  return `-${clean}`
}

export function IndustryFormeDocument({ data, compact = false }: IndustryFormeDocumentProps) {
  const design = data.design || {
    accentColor: null, textColor: null, mutedColor: null, borderColor: null,
    surfaceColor: null, headerFont: null, bodyFont: null, useCustomFonts: false, useCustomColors: false,
  }

  const accentColor = (design.useCustomColors && design.accentColor) ? design.accentColor : INDUSTRY_DEFAULT_ACCENT
  const textColor = (design.useCustomColors && design.textColor) ? design.textColor : '#1e293b'
  const mutedColor = (design.useCustomColors && design.mutedColor) ? design.mutedColor : '#64748b'
  const borderColor = (design.useCustomColors && design.borderColor) ? design.borderColor : '#e2e8f0'
  const panelSurfaceColor = (design.useCustomColors && design.surfaceColor)
    ? (design.surfaceColor !== '#f8fafc' ? design.surfaceColor : lightenHex(accentColor, 45))
    : '#f8fafc'
  const subtleSurfaceColor = getAccentTint(accentColor, panelSurfaceColor || '#f5f7f6')

  const font = (design.useCustomFonts && design.bodyFont) ? design.bodyFont : 'Inter'
  const headerFont = (design.useCustomFonts && design.headerFont) ? design.headerFont : 'Inter'

  const marginH = compact ? COMPACT_MARGIN_H : DEFAULT_MARGIN_H
  const contentWidth = PAGE_WIDTH - marginH * 2
  const tableColumns = resolveCommercialTableWidths(data.table.columns, contentWidth)

  const metaRows = [
    data.documentNumber ? { label: data.documentNumberLabel, value: data.documentNumber } : null,
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate } : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)
  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const amountInWords = getAmountInWords(data.totals)
  const advanceSummary = buildAdvanceSummary(data.advanceSummary)
  const pageSize = data.layout?.orientation === 'landscape' ? { width: 841.89, height: 595.28 } : 'A4'

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()}>
      <Page size={pageSize} margin={{ top: compact ? 20 : 28, right: marginH, bottom: compact ? 6 : 8, left: marginH }}>
        {/* Fixed Footer: Permanent Bottom-of-Page Anchoring */}
        <Fixed position="footer">
          <View style={{ borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              {data.company?.companyLogoUrl ? (
                <Image src={data.company.companyLogoUrl} href={data.company.companyLogoUrl} style={{ width: 14, height: 14, marginRight: 6 }} />
              ) : null}
              <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>
                {data.footer.companyName || data.company?.name || ''}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor, fontWeight: 600 }}>
                Page {'{{pageNumber}}'} of {'{{totalPages}}'}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>
                {data.footer.documentNumber || data.documentNumber || ''}
              </Text>
            </View>
          </View>
        </Fixed>

        {/* Header Block */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? 12 : 18 }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ fontFamily: headerFont, fontSize: compact ? 22 : 26, fontWeight: 700, color: textColor, letterSpacing: 0.5 }}>
              {data.title}
            </Text>
            {data.customTitle ? (
              <Text style={{ fontFamily: font, fontSize: 11, color: mutedColor, marginTop: 2 }}>{data.customTitle}</Text>
            ) : null}

            {metaRows.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                {metaRows.map((row, idx) => (
                  <View key={`meta-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
                    <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: mutedColor, width: 85 }}>{row.label}</Text>
                    <Text style={{ fontFamily: font, fontSize: 9, color: textColor, flex: 1 }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {(data.customHeaderFields || []).map((field, idx) => (
              <View key={`custom-meta-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: mutedColor, width: 85 }}>{field.label}</Text>
                <Text style={{ fontFamily: font, fontSize: 9, color: textColor, flex: 1 }}>{field.value}</Text>
              </View>
            ))}
          </View>

          {data.company?.companyLogoUrl ? (
            <View style={{ width: 86, height: 86, alignItems: 'flex-end', justifyContent: 'flex-start' }}>
              <Image src={data.company.companyLogoUrl} href={data.company.companyLogoUrl} style={{ width: 86, height: 86 }} />
            </View>
          ) : null}
        </View>

        {/* Parties Block */}
        {(data.company || data.client) ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: compact ? 12 : 16 }}>
            {data.company ? (
              <View style={{ flex: 1, backgroundColor: panelSurfaceColor, borderWidth: 1, borderColor, borderRadius: 3, padding: 10 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: accentColor, textTransform: 'uppercase', marginBottom: 4 }}>
                  From
                </Text>
                {buildPartyLines(data.company).map((line) => {
                  const isName = line.type === 'name'
                  const isContactOrCustom = line.type === 'phone' || line.type === 'email' || line.type === 'website' || line.type === 'custom'
                  return (
                    <Text
                      key={line.key}
                      style={{
                        fontFamily: font,
                        fontSize: isName ? 10.5 : 8.5,
                        fontWeight: isName ? 700 : 400,
                        color: isName || isContactOrCustom ? textColor : mutedColor,
                        marginBottom: isName ? 2 : 1,
                      }}
                    >
                      {line.value}
                    </Text>
                  )
                })}
              </View>
            ) : null}

            {data.client ? (
              <View style={{ flex: 1, backgroundColor: panelSurfaceColor, borderWidth: 1, borderColor, borderRadius: 3, padding: 10 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: accentColor, textTransform: 'uppercase', marginBottom: 4 }}>
                  {data.isProcurement ? (data.partyHeaderLabel || 'Order From · Supplier') : 'To'}
                </Text>
                {buildPartyLines(data.client).map((line) => {
                  const isName = line.type === 'name'
                  const isContactOrCustom = line.type === 'phone' || line.type === 'email' || line.type === 'website' || line.type === 'custom'
                  return (
                    <Text
                      key={line.key}
                      style={{
                        fontFamily: font,
                        fontSize: isName ? 10.5 : 8.5,
                        fontWeight: isName ? 700 : 400,
                        color: isName || isContactOrCustom ? textColor : mutedColor,
                        marginBottom: isName ? 2 : 1,
                      }}
                    >
                      {line.value}
                    </Text>
                  )
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Table Block */}
        {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: compact ? 12 : 16 }}>
            <Table columns={tableColumns}>
              <Row header>
                {data.table.columns.map((column, idx) => (
                  <Cell
                    key={`head-${idx}`}
                    style={{
                      backgroundColor: accentColor,
                      paddingTop: 5, paddingBottom: 5, paddingLeft: 6, paddingRight: 6,
                      borderRightWidth: idx < data.table.columns.length - 1 ? 0.5 : 0,
                      borderRightColor: '#ffffff33',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: '#ffffff',
                        textAlign: column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left',
                      }}
                    >
                      {column.label}
                    </Text>
                  </Cell>
                ))}
              </Row>

              {data.table.rows.map((row, rowIdx) => {
                if (row.rowType === 'group_header') {
                  const groupLabel = toTitleCase(getGroupLabel(row))
                  return (
                    <Row key={`group-h-${rowIdx}`}>
                      <Cell
                        colSpan={data.table.columns.length}
                        style={{
                          backgroundColor: '#ffffff',
                          paddingTop: 6,
                          paddingBottom: 6,
                          paddingLeft: 8,
                          paddingRight: 8,
                          borderTopWidth: 1.5,
                          borderTopColor: INDUSTRY_GROUP_TOKENS.border,
                          borderLeftWidth: 1.5,
                          borderLeftColor: INDUSTRY_GROUP_TOKENS.border,
                          borderRightWidth: 1.5,
                          borderRightColor: INDUSTRY_GROUP_TOKENS.border,
                          borderBottomWidth: 0.5,
                          borderBottomColor: '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: textColor, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {groupLabel}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  const subtotalValue = row.groupSubtotalValue
                  const showSubtotal = row.showSubtotal === true && subtotalValue != null && subtotalValue !== ''
                  return (
                    <Row key={`group-f-${rowIdx}`}>
                      <Cell
                        colSpan={data.table.columns.length}
                        style={{
                          backgroundColor: '#ffffff',
                          paddingTop: 5,
                          paddingBottom: 5,
                          paddingLeft: 8,
                          paddingRight: 8,
                          borderTopWidth: 0.5,
                          borderTopColor: '#e2e8f0',
                          borderLeftWidth: 1.5,
                          borderLeftColor: INDUSTRY_GROUP_TOKENS.border,
                          borderRightWidth: 1.5,
                          borderRightColor: INDUSTRY_GROUP_TOKENS.border,
                          borderBottomWidth: 1.5,
                          borderBottomColor: INDUSTRY_GROUP_TOKENS.border,
                        }}
                      >
                        {showSubtotal ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 10 }}>
                              Group Subtotal
                            </Text>
                            <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: textColor }}>
                              {subtotalValue}
                            </Text>
                          </View>
                        ) : null}
                      </Cell>
                    </Row>
                  )
                }

                const isEven = rowIdx % 2 === 1
                const isGroupMember = Boolean(row.isInGroup)
                const nextRow = data.table.rows[rowIdx + 1]
                const isLastInGroupWithoutFooter = isGroupMember && (!nextRow || (nextRow.rowType !== 'standard' && nextRow.rowType !== 'group_footer'))

                // Preserved existing white/light-grey table appearance for all rows
                const rowBg = isEven ? '#f8fafc' : '#ffffff'

                return (
                  <Row key={`row-${rowIdx}`}>
                    {data.table.columns.map((column, colIdx) => {
                      const cell = row.cells?.[column.key]
                      const isDesc = column.key === 'description'
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

                      const borderBottomW = isLastInGroupWithoutFooter ? 1.5 : 0.5
                      const borderBottomC = isLastInGroupWithoutFooter ? INDUSTRY_GROUP_TOKENS.border : '#e2e8f0'

                      return (
                        <Cell
                          key={`cell-${rowIdx}-${colIdx}`}
                          style={{
                            backgroundColor: rowBg,
                            paddingTop: 4,
                            paddingBottom: 4,
                            paddingLeft: 6,
                            paddingRight: 6,
                            borderBottomWidth: borderBottomW,
                            borderBottomColor: borderBottomC,
                            borderLeftWidth: isFirstCol && isGroupMember ? 1.5 : 0,
                            borderLeftColor: isFirstCol && isGroupMember ? INDUSTRY_GROUP_TOKENS.border : 'transparent',
                            borderRightWidth: isLastCol && isGroupMember ? 1.5 : 0,
                            borderRightColor: isLastCol && isGroupMember ? INDUSTRY_GROUP_TOKENS.border : 'transparent',
                          }}
                        >
                          {isDesc ? (
                            <View>
                              <Text style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: textColor, textAlign: align }}>
                                {mainText}
                              </Text>
                              {subText ? (
                                <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor, marginTop: 1, textAlign: align }}>
                                  {subText}
                                </Text>
                              ) : null}
                              {row.imageUrl ? (
                                <View style={{ marginTop: 4, marginBottom: 2 }}>
                                  <Image src={row.imageUrl} href={row.imageUrl} style={{ width: 48, height: 48 }} />
                                </View>
                              ) : null}
                            </View>
                          ) : (
                            <Text style={{ fontFamily: font, fontSize: 9, color: textColor, textAlign: align }}>
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

        {/* Closing Block: Bank Details + Totals */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? 12 : 16 }}>
          {hasBankDetails && data.paymentDetails ? (
            <View style={{ width: 220, backgroundColor: panelSurfaceColor, borderWidth: 1, borderColor, borderRadius: 3, padding: 10 }}>
              <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: accentColor, textTransform: 'uppercase', marginBottom: 6 }}>
                Bank Details
              </Text>
              {data.paymentDetails.bankName ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>Bank</Text>
                  <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>{data.paymentDetails.bankName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountName ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>Account Name</Text>
                  <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>{data.paymentDetails.accountName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountNumber ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>Account Number</Text>
                  <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>{data.paymentDetails.accountNumber}</Text>
                </View>
              ) : null}
              {data.paymentDetails.sortCode ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>Sort Code</Text>
                  <Text style={{ fontFamily: font, fontSize: 8.5, color: textColor }}>{data.paymentDetails.sortCode}</Text>
                </View>
              ) : null}
            </View>
          ) : data.isProcurement && data.deliveryDestination ? (
            <View style={{ flex: 1, marginRight: 16, backgroundColor: panelSurfaceColor, borderWidth: 1, borderColor, borderRadius: 3, padding: 10 }}>
              <Text style={{ fontFamily: headerFont, fontSize: 8.5, fontWeight: 700, color: accentColor, textTransform: 'uppercase', marginBottom: 4 }}>
                {data.deliveryDestination.label || 'Delivery Destination'}
              </Text>
              {data.deliveryDestination.site ? (
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor, marginBottom: 2 }}>
                  {data.deliveryDestination.site}
                </Text>
              ) : null}
              {(data.deliveryDestination.addressLines || []).map((line, idx) => (
                <Text key={`dest-line-${idx}`} style={{ fontFamily: font, fontSize: 8, color: textColor, marginBottom: 1 }}>
                  {line}
                </Text>
              ))}
              {data.deliveryDestination.contactPerson ? (
                <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor, marginTop: 2 }}>
                  Contact: {data.deliveryDestination.contactPerson} {data.deliveryDestination.phone ? `(${data.deliveryDestination.phone})` : ''}
                </Text>
              ) : null}
              {data.deliveryDestination.notes ? (
                <Text style={{ fontFamily: font, fontSize: 7.5, color: mutedColor, marginTop: 2, fontStyle: 'italic' }}>
                  {data.deliveryDestination.notes}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={{ width: 236, backgroundColor: panelSurfaceColor, borderWidth: 1, borderColor, borderRadius: 3, padding: 10 }}>
            {totalsLines.map((line, idx) => {
              const isDeduction = Boolean(
                line.isDeduction ||
                line.value.startsWith('-') ||
                line.value.startsWith('(') ||
                /discount|wht|withholding|deduction/i.test(line.label)
              )
              const rowTextColor = isDeduction ? '#991b1b' : textColor
              const rowLabelColor = mutedColor
              const displayValue = isDeduction ? formatDeductionValue(line.value) : line.value

              return (
                <View key={`total-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <Text style={{ fontFamily: font, fontSize: 8.5, color: rowLabelColor }}>
                    {line.label}
                  </Text>
                  <Text style={{ fontFamily: font, fontSize: 9, color: rowTextColor, fontWeight: isDeduction ? 600 : 400 }}>
                    {displayValue}
                  </Text>
                </View>
              )
            })}

            {mainTotal ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1.5, borderTopColor: accentColor, marginTop: 4, paddingTop: 5 }}>
                <Text style={{ fontFamily: headerFont, fontSize: 10, fontWeight: 700, color: textColor }}>{mainTotal.label}</Text>
                <Text style={{ fontFamily: headerFont, fontSize: 11, fontWeight: 700, color: textColor }}>{mainTotal.value}</Text>
              </View>
            ) : null}

            {amountInWords ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 0.75,
                  borderColor,
                  borderLeftWidth: 2,
                  borderLeftColor: accentColor,
                  borderRadius: 2,
                  paddingTop: compact ? 4 : 5,
                  paddingBottom: compact ? 4 : 5,
                  paddingLeft: 7,
                  paddingRight: 7,
                  marginTop: compact ? 4 : 6,
                }}
              >
                <Text style={{ fontFamily: font, fontSize: 8.8, fontWeight: 700, lineHeight: 1.35, color: textColor }}>
                  {amountInWords}
                </Text>
              </View>
            ) : null}

            {balanceDue ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: accentColor, padding: 5, borderRadius: 2, marginTop: 6 }}>
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: '#ffffff' }}>{balanceDue.label}</Text>
                <Text style={{ fontFamily: font, fontSize: 9.5, fontWeight: 700, color: '#ffffff' }}>{balanceDue.value}</Text>
              </View>
            ) : null}

            {advanceSummary ? (
              <View style={{ borderTopWidth: 1, borderTopColor: borderColor, marginTop: 6, paddingTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>{advanceSummary.primaryLabel}</Text>
                  <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>{advanceSummary.advanceAmount}</Text>
                </View>
                {advanceSummary.secondaryLabel ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>{advanceSummary.secondaryLabel}</Text>
                    <Text style={{ fontFamily: font, fontSize: 8.5, color: textColor }}>{advanceSummary.balanceRemaining}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Additional Fields */}
        {data.additionalFields && data.additionalFields.length > 0 ? (
          <View style={{ marginBottom: 10, backgroundColor: subtleSurfaceColor, borderWidth: 1, borderColor, borderRadius: 3, padding: 8 }}>
            {data.additionalFields.map((field, idx) => (
              <View key={`add-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: mutedColor }}>{field.label}</Text>
                <Text style={{ fontFamily: font, fontSize: 8.5, color: textColor }}>{field.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Optional Sections: Notes & Terms */}
        {data.notes?.content || data.notes?.plainText ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 9, fontWeight: 700, color: accentColor, marginBottom: 3 }}>
              {data.notes.title || 'Notes'}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 8.5, color: textColor, lineHeight: 1.3 }}>
              {data.notes.plainText || data.notes.content}
            </Text>
          </View>
        ) : null}

        {data.terms?.content || data.terms?.plainText ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 9, fontWeight: 700, color: accentColor, marginBottom: 3 }}>
              {data.terms.title || 'Terms & Conditions'}
            </Text>
            <Text style={{ fontFamily: font, fontSize: 8.5, color: textColor, lineHeight: 1.3 }}>
              {data.terms.plainText || data.terms.content}
            </Text>
          </View>
        ) : null}

        {/* Attachments */}
        {data.attachments && data.attachments.length > 0 ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: headerFont, fontSize: 9, fontWeight: 700, color: accentColor, marginBottom: 3 }}>Attachments</Text>
            {data.attachments.map((att, idx) => (
              <Text key={`att-${idx}`} style={{ fontFamily: font, fontSize: 8, color: mutedColor, marginBottom: 1 }}>• {att.label || att.url}</Text>
            ))}
          </View>
        ) : null}

        {/* Signature Block */}
        {data.isProcurement && data.procurementSignatories ? (
          <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            {data.procurementSignatories.requisitioner ? (
              <View style={{ width: 160 }}>
                {data.procurementSignatories.requisitioner.signatureUrl ? (
                  <Image src={data.procurementSignatories.requisitioner.signatureUrl} href={data.procurementSignatories.requisitioner.signatureUrl} style={{ width: 120, height: 44, marginBottom: 2 }} />
                ) : (
                  <View style={{ height: 44, justifyContent: 'flex-end', marginBottom: 2 }} />
                )}
                <View style={{ height: 1, backgroundColor: textColor, marginBottom: 4 }} />
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>
                  {data.procurementSignatories.requisitioner.name || 'Requisitioner'}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>
                  {data.procurementSignatories.requisitioner.title || data.procurementSignatories.requisitioner.label || 'Purchasing Officer'}
                </Text>
              </View>
            ) : <View style={{ width: 160 }} />}

            {data.procurementSignatories.authorizer ? (
              <View style={{ width: 160 }}>
                {data.procurementSignatories.authorizer.signatureUrl ? (
                  <Image src={data.procurementSignatories.authorizer.signatureUrl} href={data.procurementSignatories.authorizer.signatureUrl} style={{ width: 120, height: 44, marginBottom: 2 }} />
                ) : (
                  <View style={{ height: 44, justifyContent: 'flex-end', marginBottom: 2 }} />
                )}
                <View style={{ height: 1, backgroundColor: textColor, marginBottom: 4 }} />
                <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>
                  {data.procurementSignatories.authorizer.name || 'Authorised By'}
                </Text>
                <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>
                  {data.procurementSignatories.authorizer.title || data.procurementSignatories.authorizer.label || 'Management Authorisation'}
                </Text>
              </View>
            ) : null}
          </View>
        ) : data.signature && (data.signature.imageUrl || data.signature.name) ? (
          <View style={{ marginTop: 14, width: 160 }}>
            {data.signature.imageUrl ? (
              <Image src={data.signature.imageUrl} href={data.signature.imageUrl} style={{ width: 120, height: 44, marginBottom: 2 }} />
            ) : null}
            <View style={{ height: 1, backgroundColor: textColor, marginBottom: 4 }} />
            {data.signature.name ? (
              <Text style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: textColor }}>{data.signature.name}</Text>
            ) : null}
            {data.signature.role ? (
              <Text style={{ fontFamily: font, fontSize: 8, color: mutedColor }}>{data.signature.role}</Text>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export default IndustryFormeDocument
