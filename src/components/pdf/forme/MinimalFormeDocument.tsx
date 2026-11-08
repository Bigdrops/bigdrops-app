import React from 'react'
import { Cell, Document, Fixed, Image, Link, Page, Row, Table, Text, View, type Style } from '@formepdf/react'
import type { CommercialDocumentData } from '../industryAdapter'
import { resolveDesignTokens } from '../designTokens'
import { isFormeSupportedFamily } from './fonts'
import { glyphRuns } from './glyphs'
import { renderFormeRichText } from './formeRichText'
import { safeText } from '../core/safeText'
import { getDescriptionMain, getDescriptionSub } from '../core/description'
import {
  buildPartyLines,
  buildAttachmentItems,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
  resolveTextAlignment,
} from '../engine'
export interface MinimalFormeDocumentProps {
  data: CommercialDocumentData
  compact?: boolean
}

/** Palette and metrics from the authoritative React Minimal template. */
const PALETTE = {
  ink: '#1a1a1a',
  paper: '#ffffff',
  rule: '#d4d4d4',
  lightRule: '#e8e8e8',
  panelBg: '#f5f5f5',
  grayText: '#6b6b6b',
  mutedText: '#8a8a8a',
  link: '#2563eb',
} as const

// Reference margin is 60pt; Forme needs ~6pt more room to keep a group subtotal with its rows.
const PAGE_MARGIN = { top: 28, right: 28, bottom: 54, left: 28 }
const PORTRAIT_WIDTH = 595.28
const LANDSCAPE_WIDTH = 841.89
const LANDSCAPE_HEIGHT = 595.28

function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/** Mirrors resolveColumnLayout: fixed widths win, otherwise columns share space by flex. */
function resolveTableColumns(
  columns: CommercialDocumentData['table']['columns'],
  availableWidth: number,
) {
  const flexWeights = columns.map((column) =>
    column.width && column.width > 0 ? 0 : Number(column.flex ?? 1),
  )
  const fixedTotal = columns.reduce(
    (sum, column) => sum + (column.width && column.width > 0 ? column.width : 0),
    0,
  )
  const flexTotal = flexWeights.reduce((sum, weight) => sum + weight, 0)
  const remaining = Math.max(0, availableWidth - fixedTotal)

  let widths = columns.map((column, index) =>
    column.width && column.width > 0
      ? column.width
      : flexTotal > 0
        ? (remaining * flexWeights[index]) / flexTotal
        : 0,
  )

  const total = widths.reduce((sum, width) => sum + width, 0)
  if (flexTotal > 0 && total > 0) {
    widths = widths.map((width) => (width * availableWidth) / total)
  }

  const rounded = widths.map((width) => Math.round(width * 100) / 100)
  const adjustIndex = flexWeights.map((weight, index) => (weight > 0 ? index : -1)).filter((index) => index >= 0).pop()
  if (adjustIndex !== undefined) {
    const sum = rounded.reduce((totalWidth, width) => totalWidth + width, 0)
    rounded[adjustIndex] = Math.round((rounded[adjustIndex] + (availableWidth - sum)) * 100) / 100
  }

  return rounded.map((width) => ({ width: { fixed: width } }))
}

export function MinimalFormeDocument({ data }: MinimalFormeDocumentProps): React.JSX.Element {
  const tokens = resolveDesignTokens(data.design)
  const baseFont = 'Helvetica'
  const headerFont = tokens.headerFont && isFormeSupportedFamily(tokens.headerFont) ? tokens.headerFont : 'Helvetica'
  const bodyFont = tokens.bodyFont && isFormeSupportedFamily(tokens.bodyFont) ? tokens.bodyFont : 'Helvetica'

  const colorText: Style = tokens.textColor ? { color: tokens.textColor } : {}
  const colorAccent: Style = tokens.accentColor ? { color: tokens.accentColor } : {}
  const colorMuted: Style = tokens.mutedColor ? { color: tokens.mutedColor } : {}
  const colorBorder: Style = tokens.borderColor ? { borderColor: tokens.borderColor } : {}
  const pageBackground = tokens.surfaceColor || PALETTE.paper

  const companyLines = data.company ? buildPartyLines(data.company) : []
  const clientLines = data.client ? buildPartyLines(data.client) : []
  const companyLineMap = new Map<string, string>(companyLines.map((line) => [line.type, line.value] as const))
  const clientLineMap = new Map<string, string>(clientLines.map((line) => [line.type, line.value] as const))
  const attachmentItems = buildAttachmentItems(data.attachments)
  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const amountInWords = getAmountInWords(data.totals)
  const advance = buildAdvanceSummary(data.advanceSummary)
  const isAdvanceInvoice = Boolean(advance)

  const footerVisible = Boolean(
    data.footer.extraText || data.showTagline || data.footer.documentNumber || data.footer.companyName,
  )
  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)

  const isLandscape = data.layout?.orientation === 'landscape'
  const pageWidth = isLandscape ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH
  const contentWidth = pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right
  const tableColumns = resolveTableColumns(data.table.columns, contentWidth)
  const tableColumnCount = data.table.columns.length

  const companyBoxLines = companyLines.filter((line) => line.type !== 'name')
  const clientBoxLines = clientLines.filter((line) => line.type !== 'name')

  const renderPartyBox = (
    title: string,
    lines: ReturnType<typeof buildPartyLines>,
    lineMap: Map<string, string>,
    isLast: boolean,
  ) => (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: PALETTE.rule,
        ...(isLast ? { borderLeftWidth: 0 } : {}),
      }}
    >
      <Text
        style={{
          fontFamily: headerFont,
          fontSize: 7,
          fontWeight: 700,
          color: PALETTE.mutedText,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 6,
          ...colorAccent,
        }}
      >
        {title}
      </Text>
      {lineMap.get('name') ? (
        <Text
          style={{
            fontFamily: bodyFont,
            fontSize: 11,
            fontWeight: 700,
            color: PALETTE.ink,
            marginBottom: 4,
            ...colorText,
          }}
        >
          {safeText(lineMap.get('name'))}
        </Text>
      ) : null}
      {lines.filter((line) => line.type !== 'name').map((line, index) => (
        <Text
          key={line.key || index}
          style={{
            fontFamily: baseFont,
            fontSize: 9,
            color: PALETTE.grayText,
            lineHeight: 1.4,
            marginBottom: 1,
            ...colorText,
          }}
        >
          {safeText(line.value)}
        </Text>
      ))}
    </View>
  )

  const notesRichTextStyles = {
    font: baseFont,
    containerStyle: { marginTop: 2 },
    paragraphStyle: { fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, lineHeight: 1.5, marginBottom: 5 },
    listStyle: { marginBottom: 5 },
    listItemRowStyle: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, marginBottom: 2 },
    listMarkerStyle: { width: 12, fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, lineHeight: 1.5, fontWeight: 700 },
    listItemTextStyle: { flex: 1, fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, lineHeight: 1.5 },
  }

  const renderTextSection = (
    section: CommercialDocumentData['notes'],
  ) => {
    if (!section?.content) return null
    return (
      <View style={{ marginTop: 16 }}>
        {section.title ? (
          <Text
            style={{
              fontFamily: headerFont,
              fontSize: 7,
              fontWeight: 700,
              color: PALETTE.mutedText,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
              borderBottomWidth: 0.5,
              borderBottomColor: PALETTE.lightRule,
              paddingBottom: 4,
              ...colorAccent,
            }}
          >
            {safeText(section.title)}
          </Text>
        ) : null}
        {renderFormeRichText(section.content, notesRichTextStyles) ?? (
          <Text
            style={{
              fontFamily: baseFont,
              fontSize: 8,
              color: PALETTE.grayText,
              lineHeight: 1.5,
              ...colorText,
            }}
          >
            {safeText(section.plainText || '')}
          </Text>
        )}
      </View>
    )
  }

  return (
    <Document
      title={`${data.title} ${data.documentNumber || ''}`.trim()}
      style={{ fontFamily: baseFont, fontSize: 9, color: PALETTE.ink, lineHeight: 1.1 }}
    >
      <Page
        size={isLandscape ? { width: LANDSCAPE_WIDTH, height: LANDSCAPE_HEIGHT } : 'A4'}
        margin={PAGE_MARGIN}
        style={{ backgroundColor: pageBackground }}
      >
        {footerVisible ? (
          <Fixed
            position="footer"
            // Forme anchors fixed footers to the content margin; the reference footer sits 16pt from the page edge.
            style={{ backgroundColor: pageBackground, transform: 'translate(0, 31)' }}
          >
            {data.footer.extraText ? (
              <Text
                style={{
                  fontFamily: baseFont,
                  fontSize: 7.5,
                  color: PALETTE.mutedText,
                  textAlign: 'center',
                  marginBottom: 4,
                  ...colorMuted,
                }}
              >
                {safeText(data.footer.extraText)}
              </Text>
            ) : null}
            {data.showTagline && data.company?.tagline ? (
              <Text
                style={{
                  fontFamily: baseFont,
                  fontSize: 7.5,
                  color: PALETTE.mutedText,
                  textAlign: 'center',
                  fontStyle: 'italic',
                  marginBottom: 4,
                  ...colorMuted,
                }}
              >
                {safeText(data.company.tagline)}
              </Text>
            ) : null}
            <View
              style={{
                paddingTop: 6,
                borderTopWidth: 0.5,
                borderTopColor: PALETTE.rule,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: baseFont, fontSize: 7.5, color: PALETTE.mutedText, ...colorMuted }}>
                {'Page {{pageNumber}} of {{totalPages}}'}
              </Text>
              <Text style={{ fontFamily: baseFont, fontSize: 7.5, color: PALETTE.mutedText, ...colorMuted }}>
                {safeText(data.footer.documentNumber || data.documentNumber)}
              </Text>
              <Text style={{ fontFamily: baseFont, fontSize: 7.5, color: PALETTE.mutedText, ...colorMuted }}>
                {safeText(data.footer.companyName || data.company?.name || '')}
              </Text>
            </View>
          </Fixed>
        ) : null}

        {/* Header */}
        <View
          wrap={false}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 10,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: PALETTE.rule,
          }}
        >
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text
              style={{
                fontFamily: headerFont,
                fontSize: 22,
                fontWeight: 700,
                color: PALETTE.ink,
                letterSpacing: 1.5,
                marginBottom: 2,
                ...colorText,
              }}
            >
              {safeText(data.title)}
            </Text>
            {data.customTitle ? (
              <Text
                style={{
                  fontFamily: baseFont,
                  fontSize: 10,
                  color: PALETTE.grayText,
                  marginBottom: 12,
                  ...colorMuted,
                }}
              >
                {safeText(data.customTitle)}
              </Text>
            ) : null}
            {companyLineMap.get('name') ? (
              <>
                <Text
                  style={{
                    fontFamily: headerFont,
                    fontSize: 11,
                    fontWeight: 700,
                    color: PALETTE.ink,
                    marginBottom: 3,
                    ...colorText,
                  }}
                >
                  {safeText(companyLineMap.get('name'))}
                </Text>
                {companyLineMap.get('address') ? (
                  <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, lineHeight: 1.4, ...colorText }}>
                    {safeText(companyLineMap.get('address'))}
                  </Text>
                ) : null}
                {companyLineMap.get('cityState') ? (
                  <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, lineHeight: 1.4, ...colorText }}>
                    {safeText(companyLineMap.get('cityState'))}
                  </Text>
                ) : null}
                {companyLineMap.get('phone') || companyLineMap.get('email') ? (
                  <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, lineHeight: 1.4, ...colorText }}>
                    {[safeText(companyLineMap.get('phone')), safeText(companyLineMap.get('email'))].filter(Boolean).join(' | ')}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            {data.company?.companyLogoUrl ? (
              <Image src={data.company.companyLogoUrl} style={{ width: 70, height: 70 }} />
            ) : null}
            {data.documentNumber ? (
              <Text
                style={{
                  fontFamily: headerFont,
                  fontSize: 8,
                  fontWeight: 700,
                  color: PALETTE.ink,
                  marginBottom: 2,
                  textAlign: 'right',
                  ...colorText,
                }}
              >
                {safeText(data.documentNumberLabel)}: {safeText(data.documentNumber)}
              </Text>
            ) : null}
            {data.issueDate ? (
              <Text
                style={{
                  fontFamily: baseFont,
                  fontSize: 8,
                  color: PALETTE.grayText,
                  marginBottom: 2,
                  textAlign: 'right',
                  ...colorText,
                }}
              >
                {safeText(data.issueDateLabel)}: {safeText(data.issueDate)}
              </Text>
            ) : null}
            {data.dueDateOrValidityDate ? (
              <Text
                style={{
                  fontFamily: baseFont,
                  fontSize: 8,
                  color: PALETTE.grayText,
                  marginBottom: 2,
                  textAlign: 'right',
                  ...colorText,
                }}
              >
                {safeText(data.dueDateOrValidityDateLabel)}: {safeText(data.dueDateOrValidityDate)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Parties */}
        {data.company || data.client ? (
          <View wrap={false} style={{ flexDirection: 'row', marginBottom: 10 }}>
            {data.company ? renderPartyBox('From', companyBoxLines, companyLineMap, false) : null}
            {data.client ? renderPartyBox(data.isProcurement ? (data.partyHeaderLabel || 'Order From · Supplier') : 'Bill To', clientBoxLines, clientLineMap, true) : null}
          </View>
        ) : null}

        {/* PO and custom header fields */}
        {data.poNumber || data.customHeaderFields.length > 0 ? (
          <View
            wrap={false}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              paddingVertical: 8,
              marginBottom: 10,
              borderTopWidth: 1,
              borderTopColor: PALETTE.lightRule,
              borderBottomWidth: 1,
              borderBottomColor: PALETTE.lightRule,
            }}
          >
            {data.poNumber ? (
              <View style={{ width: '33%', marginBottom: 6 }}>
                <Text
                  style={{
                    fontFamily: baseFont,
                    fontSize: 7,
                    fontWeight: 700,
                    color: PALETTE.mutedText,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 2,
                    ...colorMuted,
                  }}
                >
                  {safeText(data.poNumberLabel)}
                </Text>
                <Text style={{ fontFamily: baseFont, fontSize: 9, color: PALETTE.ink, ...colorText }}>
                  {safeText(data.poNumber)}
                </Text>
              </View>
            ) : null}
            {data.customHeaderFields.map((field, index) => (
              <View key={`custom-field-${index}`} style={{ width: '33%', marginBottom: 6 }}>
                <Text
                  style={{
                    fontFamily: baseFont,
                    fontSize: 7,
                    fontWeight: 700,
                    color: PALETTE.mutedText,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 2,
                    ...colorMuted,
                  }}
                >
                  {safeText(field.label)}
                </Text>
                <Text style={{ fontFamily: baseFont, fontSize: 9, color: PALETTE.ink, ...colorText }}>
                  {safeText(field.value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Table */}
        {tableColumnCount > 0 && data.table.rows.length > 0 ? (
          <View style={{ marginBottom: 10 }}>
            <Table columns={tableColumns}>
              <Row header>
                {data.table.columns.map((column, index) => {
                  const alignment = resolveTextAlignment(column.align)?.textAlign ?? 'left'
                  return (
                    <Cell
                      key={`table-head-${index}`}
                      style={{
                        borderBottomWidth: 1.5,
                        borderBottomColor: PALETTE.ink,
                        paddingTop: 6,
                        paddingBottom: 6,
                        paddingLeft: 4,
                        paddingRight: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: bodyFont,
                          fontSize: 7,
                          fontWeight: 700,
                          color: PALETTE.mutedText,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          textAlign: alignment,
                          ...colorText,
                        }}
                      >
                        {safeText(column.label)}
                      </Text>
                    </Cell>
                  )
                })}
              </Row>

              {data.table.rows.map((row, rowIndex) => {
                if (row.rowType === 'group_header') {
                  return (
                    <Row key={`group-header-${rowIndex}`}>
                      <Cell
                        colSpan={tableColumnCount}
                        style={{
                          backgroundColor: PALETTE.paper,
                          paddingTop: 6,
                          paddingBottom: 6,
                          paddingLeft: 4,
                          paddingRight: 4,
                          borderTopWidth: 0.5,
                          borderTopColor: PALETTE.rule,
                          borderBottomWidth: 0.5,
                          borderBottomColor: PALETTE.rule,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: headerFont,
                            fontSize: 10,
                            fontWeight: 700,
                            color: PALETTE.ink,
                            ...colorText,
                          }}
                        >
                          {toTitleCase(row.groupName || row.groupLabel || '')}
                        </Text>
                      </Cell>
                    </Row>
                  )
                }

                if (row.rowType === 'group_footer') {
                  const subtotalValue = row.groupSubtotalValue
                  const showSubtotal = row.showSubtotal === true
                    && subtotalValue !== null
                    && subtotalValue !== undefined
                    && subtotalValue !== ''

                  return (
                    <React.Fragment key={`group-footer-${rowIndex}`}>
                      {showSubtotal ? (
                        <Row>
                          {data.table.columns.map((column, columnIndex) => {
                            const isLabel = columnIndex === tableColumnCount - 2
                            const isValue = columnIndex === tableColumnCount - 1
                            const isCombined = tableColumnCount === 1
                            return (
                              <Cell
                                key={`group-subtotal-${rowIndex}-${columnIndex}`}
                                style={{
                                  backgroundColor: PALETTE.paper,
                                  paddingTop: 4,
                                  paddingBottom: 4,
                                  paddingLeft: 4,
                                  paddingRight: 4,
                                  borderBottomWidth: 1.5,
                                  borderBottomColor: PALETTE.ink,
                                }}
                              >
                                {isCombined ? (
                                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <Text
                                      style={{
                                        fontFamily: baseFont,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: PALETTE.ink,
                                        marginRight: 8,
                                        ...colorText,
                                      }}
                                    >
                                      Subtotal
                                    </Text>
                                    <Text
                                      style={{
                                        fontFamily: baseFont,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: PALETTE.ink,
                                        textAlign: 'right',
                                        ...colorText,
                                      }}
                                    >
                                      {glyphRuns(safeText(subtotalValue), bodyFont)}
                                    </Text>
                                  </View>
                                ) : isLabel ? (
                                  <Text
                                    style={{
                                      fontFamily: baseFont,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: PALETTE.ink,
                                      textAlign: 'right',
                                      marginRight: 8,
                                      ...colorText,
                                    }}
                                  >
                                    Subtotal
                                  </Text>
                                ) : isValue ? (
                                  <Text
                                    style={{
                                      fontFamily: baseFont,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: PALETTE.ink,
                                      textAlign: 'right',
                                      ...colorText,
                                    }}
                                  >
                                    {glyphRuns(safeText(subtotalValue), bodyFont)}
                                  </Text>
                                ) : null}
                              </Cell>
                            )
                          })}
                        </Row>
                      ) : null}
                      <Row>
                        <Cell colSpan={tableColumnCount} style={{ padding: 0, backgroundColor: PALETTE.paper }}>
                          <View style={{ height: 1.5, backgroundColor: PALETTE.ink }} />
                        </Cell>
                      </Row>
                    </React.Fragment>
                  )
                }

                const zebra = rowIndex % 2 === 1
                return (
                  <Row key={`row-${rowIndex}`}>
                    {data.table.columns.map((column, columnIndex) => {
                      const cell = row.cells?.[column.key]
                      const isDescription = column.key === 'description'
                      const alignment = resolveTextAlignment(column.align)?.textAlign ?? 'left'
                      const cellStyle: Style = {
                        backgroundColor: zebra ? PALETTE.panelBg : PALETTE.paper,
                        borderBottomWidth: 0.5,
                        borderBottomColor: PALETTE.lightRule,
                        paddingTop: 7,
                        paddingBottom: 7,
                        paddingLeft: 4,
                        paddingRight: 4,
                      }

                      return (
                        <Cell key={`cell-${rowIndex}-${columnIndex}`} style={cellStyle}>
                          {isDescription ? (
                            <View>
                              <Text
                                style={{
                                  fontFamily: baseFont,
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: PALETTE.ink,
                                  lineHeight: 1.3,
                                  ...colorText,
                                }}
                              >
                                {glyphRuns(getDescriptionMain(cell), bodyFont)}
                              </Text>
                              {getDescriptionSub(cell) ? (
                                <Text
                                  style={{
                                    fontFamily: baseFont,
                                    fontSize: 8,
                                    color: PALETTE.grayText,
                                    lineHeight: 1.35,
                                    marginTop: 2,
                                    ...colorMuted,
                                  }}
                                >
                                  {glyphRuns(getDescriptionSub(cell), bodyFont)}
                                </Text>
                              ) : null}
                              {row.imageUrl ? (
                                <>
                                  <Image src={row.imageUrl} style={{ width: 36, height: 36, marginTop: 4 }} />
                                  <Text
                                    style={{
                                      fontFamily: baseFont,
                                      fontSize: 7,
                                      color: PALETTE.link,
                                      marginTop: 2,
                                    }}
                                  >
                                    <Link href={row.imageUrl}>Open image</Link>
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          ) : (
                            <Text
                              style={{
                                fontFamily: baseFont,
                                fontSize: 9,
                                color: PALETTE.ink,
                                textAlign: alignment,
                                ...colorText,
                              }}
                            >
                              {glyphRuns(safeText(cell), bodyFont)}
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

        {/* Bank details and totals */}
        {hasBankDetails || (data.isProcurement && Boolean(data.deliveryDestination)) || totalsLines.length > 0 || mainTotal || balanceDue || amountInWords || advance ? (
          <View
            wrap={false}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <View style={{ flex: 1, paddingRight: 20 }}>
              {hasBankDetails && data.paymentDetails ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: PALETTE.rule,
                    padding: 10,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: headerFont,
                      fontSize: 7,
                      fontWeight: 700,
                      color: PALETTE.mutedText,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 6,
                      borderBottomWidth: 0.5,
                      borderBottomColor: PALETTE.lightRule,
                      paddingBottom: 4,
                      ...colorAccent,
                    }}
                  >
                    Bank Details
                  </Text>
                  {data.paymentDetails.bankName ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, width: '35%', ...colorMuted }}>
                        Bank
                      </Text>
                      <Text
                        style={{
                          fontFamily: baseFont,
                          fontSize: 8,
                          fontWeight: 700,
                          color: PALETTE.ink,
                          width: '65%',
                          textAlign: 'right',
                          ...colorText,
                        }}
                      >
                        {safeText(data.paymentDetails.bankName)}
                      </Text>
                    </View>
                  ) : null}
                  {data.paymentDetails.accountName ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, width: '35%', ...colorMuted }}>
                        Account Name
                      </Text>
                      <Text
                        style={{
                          fontFamily: baseFont,
                          fontSize: 8,
                          fontWeight: 700,
                          color: PALETTE.ink,
                          width: '65%',
                          textAlign: 'right',
                          ...colorText,
                        }}
                      >
                        {safeText(data.paymentDetails.accountName)}
                      </Text>
                    </View>
                  ) : null}
                  {data.paymentDetails.accountNumber ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, width: '35%', ...colorMuted }}>
                        Account No
                      </Text>
                      <Text
                        style={{
                          fontFamily: baseFont,
                          fontSize: 8,
                          fontWeight: 700,
                          color: PALETTE.ink,
                          width: '65%',
                          textAlign: 'right',
                          ...colorText,
                        }}
                      >
                        {safeText(data.paymentDetails.accountNumber)}
                      </Text>
                    </View>
                  ) : null}
                  {data.paymentDetails.sortCode ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, width: '35%', ...colorMuted }}>
                        Sort Code
                      </Text>
                      <Text
                        style={{
                          fontFamily: baseFont,
                          fontSize: 8,
                          fontWeight: 700,
                          color: PALETTE.ink,
                          width: '65%',
                          textAlign: 'right',
                          ...colorText,
                        }}
                      >
                        {safeText(data.paymentDetails.sortCode)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : data.isProcurement && data.deliveryDestination ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: PALETTE.rule,
                    padding: 10,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: headerFont,
                      fontSize: 7,
                      fontWeight: 700,
                      color: PALETTE.mutedText,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 6,
                      borderBottomWidth: 0.5,
                      borderBottomColor: PALETTE.lightRule,
                      paddingBottom: 4,
                      ...colorAccent,
                    }}
                  >
                    {data.deliveryDestination.label || 'DELIVERY DESTINATION'}
                  </Text>
                  {data.deliveryDestination.site ? (
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 8.5,
                        fontWeight: 700,
                        color: PALETTE.ink,
                        marginBottom: 2,
                        ...colorText,
                      }}
                    >
                      {safeText(data.deliveryDestination.site)}
                    </Text>
                  ) : null}
                  {(data.deliveryDestination.addressLines || []).map((line, idx) => (
                    <Text
                      key={'dest-line-' + idx}
                      style={{
                        fontFamily: baseFont,
                        fontSize: 8,
                        color: PALETTE.grayText,
                        marginBottom: 1,
                        ...colorMuted,
                      }}
                    >
                      {safeText(line)}
                    </Text>
                  ))}
                  {data.deliveryDestination.contactPerson ? (
                    <Text
                      style={{
                        fontFamily: baseFont,
                        fontSize: 7.5,
                        color: PALETTE.mutedText,
                        marginTop: 2,
                        ...colorMuted,
                      }}
                    >
                      Contact: {safeText(data.deliveryDestination.contactPerson)} {data.deliveryDestination.phone ? '(' + safeText(data.deliveryDestination.phone) + ')' : ''}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={{ width: 240, flexShrink: 0 }}>
              <View style={{ borderWidth: 1, borderColor: PALETTE.rule, padding: 12 }}>
                {totalsLines.map((line, index) => (
                  <View key={`total-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontFamily: baseFont, fontSize: 9, color: PALETTE.grayText, flex: 1, paddingRight: 8, ...colorMuted }}>
                      {safeText(line.label)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: baseFont,
                        fontSize: 9,
                        color: PALETTE.ink,
                        textAlign: 'right',
                        ...colorText,
                      }}
                    >
                      {glyphRuns(safeText(line.value), bodyFont)}
                    </Text>
                  </View>
                ))}

                {mainTotal ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      borderTopWidth: 1.5,
                      borderTopColor: PALETTE.ink,
                      paddingTop: 6,
                      marginTop: 6,
                      ...colorBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 11,
                        fontWeight: 700,
                        color: PALETTE.ink,
                        flex: 1,
                        paddingRight: 8,
                        ...colorText,
                      }}
                    >
                      {safeText(mainTotal.label)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 11,
                        fontWeight: 700,
                        color: PALETTE.ink,
                        textAlign: 'right',
                        ...colorText,
                      }}
                    >
                      {glyphRuns(safeText(mainTotal.value), headerFont)}
                    </Text>
                  </View>
                ) : null}

                {amountInWords ? (
                  <Text
                    style={{
                      fontFamily: baseFont,
                      fontSize: 7.5,
                      color: PALETTE.grayText,
                      fontStyle: 'italic',
                      textAlign: 'right',
                      marginTop: 8,
                      lineHeight: 1.4,
                      ...colorMuted,
                    }}
                  >
                    {safeText(amountInWords)}
                  </Text>
                ) : null}

                {!isAdvanceInvoice && balanceDue ? (
                  <View
                    style={{
                      marginTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: PALETTE.ink,
                      paddingTop: 6,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 9,
                        fontWeight: 700,
                        color: PALETTE.ink,
                        flex: 1,
                        paddingRight: 8,
                        ...colorText,
                      }}
                    >
                      {safeText(balanceDue.label)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: headerFont,
                        fontSize: 9,
                        fontWeight: 700,
                        color: PALETTE.ink,
                        textAlign: 'right',
                        ...colorText,
                      }}
                    >
                      {glyphRuns(safeText(balanceDue.value), headerFont)}
                    </Text>
                  </View>
                ) : null}

                {isAdvanceInvoice && advance ? (
                  <View
                    style={{
                      marginTop: 12,
                      borderWidth: 1.5,
                      borderColor: PALETTE.ink,
                      padding: 10,
                      ...colorBorder,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: headerFont,
                          fontSize: 9,
                          fontWeight: 700,
                          color: PALETTE.ink,
                          flex: 1,
                          paddingRight: 8,
                          ...colorAccent,
                        }}
                      >
                        {safeText(advance.primaryLabel)}
                      </Text>
                      <Text
                        style={{
                          fontFamily: headerFont,
                          fontSize: 11,
                          fontWeight: 700,
                          color: PALETTE.ink,
                          textAlign: 'right',
                          ...colorAccent,
                        }}
                      >
                        {glyphRuns(safeText(advance.advanceAmount), headerFont)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: baseFont,
                          fontSize: 8,
                          color: PALETTE.grayText,
                          flex: 1,
                          paddingRight: 8,
                          ...colorMuted,
                        }}
                      >
                        {safeText(advance.secondaryLabel)}
                      </Text>
                      <Text
                        style={{
                          fontFamily: baseFont,
                          fontSize: 8,
                          color: PALETTE.grayText,
                          textAlign: 'right',
                          ...colorText,
                        }}
                      >
                        {glyphRuns(safeText(advance.balanceRemaining), bodyFont)}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {renderTextSection(data.notes)}
        {renderTextSection(data.terms)}

        {/* Attachments */}
        {attachmentItems.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text
              style={{
                fontFamily: headerFont,
                fontSize: 7,
                fontWeight: 700,
                color: PALETTE.mutedText,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 6,
                borderBottomWidth: 0.5,
                borderBottomColor: PALETTE.lightRule,
                paddingBottom: 4,
                ...colorAccent,
              }}
            >
              Attachments
            </Text>
            {attachmentItems.map((item, index) => {
              if (item.formattedUrl) {
                return (
                  <Text
                    key={`attachment-${index}`}
                    style={{
                      fontFamily: baseFont,
                      fontSize: 8,
                      color: PALETTE.link,
                      marginBottom: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    <Link href={item.formattedUrl}>{safeText(item.label)}</Link>
                  </Text>
                )
              }
              return (
                <Text
                  key={`attachment-${index}`}
                  style={{
                    fontFamily: baseFont,
                    fontSize: 8,
                    color: PALETTE.grayText,
                    marginBottom: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {safeText(item.label || item.url)}
                </Text>
              )
            })}
          </View>
        ) : null}

        {/* Additional fields */}
        {data.additionalFields.length > 0 ? (
          <View
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 0.5,
              borderTopColor: PALETTE.lightRule,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {data.additionalFields.map((field, index) => (
              <View key={`additional-${index}`} style={{ width: '33%', marginBottom: 6 }}>
                <Text
                  style={{
                    fontFamily: baseFont,
                    fontSize: 7,
                    fontWeight: 700,
                    color: PALETTE.mutedText,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 2,
                    ...colorMuted,
                  }}
                >
                  {safeText(field.label)}
                </Text>
                <Text style={{ fontFamily: baseFont, fontSize: 9, color: PALETTE.ink, ...colorText }}>
                  {safeText(field.value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Signature */}
        {data.isProcurement && data.procurementSignatories ? (
          <View wrap={false} style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', gap: 20 }}>
            {data.procurementSignatories.requisitioner ? (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7, color: PALETTE.mutedText, textTransform: 'uppercase', marginBottom: 2 }}>
                  {data.procurementSignatories.requisitioner.label || 'Purchasing Officer / Requisitioner'}
                </Text>
                {data.procurementSignatories.requisitioner.signatureUrl ? (
                  <Image src={data.procurementSignatories.requisitioner.signatureUrl} style={{ width: 120, height: 36, marginBottom: 2 }} />
                ) : (
                  <View style={{ height: 36 }} />
                )}
                <View style={{ width: '100%', borderTopWidth: 0.5, borderTopColor: PALETTE.ink, marginBottom: 4, ...colorBorder }} />
                <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: PALETTE.ink, marginBottom: 2, textAlign: 'center', ...colorText }}>
                  {safeText(data.procurementSignatories.requisitioner.name || 'Authorised Signatory')}
                </Text>
                <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, textAlign: 'center', ...colorMuted }}>
                  {safeText(data.procurementSignatories.requisitioner.title || 'Purchasing Officer')}
                </Text>
              </View>
            ) : null}
            {data.procurementSignatories.authorizer ? (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: headerFont, fontSize: 7, color: PALETTE.mutedText, textTransform: 'uppercase', marginBottom: 2 }}>
                  {data.procurementSignatories.authorizer.label || 'Management / Finance Authorisation'}
                </Text>
                {data.procurementSignatories.authorizer.signatureUrl ? (
                  <Image src={data.procurementSignatories.authorizer.signatureUrl} style={{ width: 120, height: 36, marginBottom: 2 }} />
                ) : (
                  <View style={{ height: 36 }} />
                )}
                <View style={{ width: '100%', borderTopWidth: 0.5, borderTopColor: PALETTE.ink, marginBottom: 4, ...colorBorder }} />
                <Text style={{ fontFamily: headerFont, fontSize: 9.5, fontWeight: 700, color: PALETTE.ink, marginBottom: 2, textAlign: 'center', ...colorText }}>
                  {safeText(data.procurementSignatories.authorizer.name || 'Authorised By')}
                </Text>
                <Text style={{ fontFamily: baseFont, fontSize: 8, color: PALETTE.grayText, textAlign: 'center', ...colorMuted }}>
                  {safeText(data.procurementSignatories.authorizer.title || 'Management Authorisation')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : data.signature && (data.signature.imageUrl || data.signature.name) ? (
          <View wrap={false} style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ width: 200, alignItems: 'center' }}>
              {typeof data.signature.imageUrl === 'string' && data.signature.imageUrl.trim() ? (
                <Image src={data.signature.imageUrl} style={{ width: 120, height: 36, marginBottom: 2 }} />
              ) : null}
              <View
                style={{
                  width: '100%',
                  borderTopWidth: 0.5,
                  borderTopColor: PALETTE.ink,
                  marginBottom: 4,
                  ...colorBorder,
                }}
              />
              {data.signature.name ? (
                <Text
                  style={{
                    fontFamily: headerFont,
                    fontSize: 10,
                    fontWeight: 700,
                    color: PALETTE.ink,
                    marginBottom: 2,
                    textAlign: 'center',
                    ...colorText,
                  }}
                >
                  {safeText(data.signature.name)}
                </Text>
              ) : null}
              {data.signature.role ? (
                <Text
                  style={{
                    fontFamily: baseFont,
                    fontSize: 8,
                    color: PALETTE.grayText,
                    textAlign: 'center',
                    ...colorMuted,
                  }}
                >
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

export default MinimalFormeDocument
