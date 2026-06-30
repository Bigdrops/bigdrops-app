import React from 'react'
import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { styles } from './ApexStyles'
import { renderPdfRichText } from '../core/pdfRichText'
import { PdfCurrencyText } from '../pdfCurrency'
import { safeText } from '../core/safeText'
import { getDescriptionMain, getDescriptionSub } from '../core/description'
import { buildAttachmentItems } from '../engine/attachments'
import {
  resolveColumnLayout,
  resolveTextAlignment,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
} from '../engine'
import { resolveDesignTokens } from '../designTokens'

function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function Apex({ data }: { data: CommercialDocumentData }) {
  const metaRows = [
    data.documentNumber ? { label: data.documentNumberLabel, value: data.documentNumber } : null,
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate } : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const customFields = data.customHeaderFields ?? []
  const hasCustomFields = customFields.length > 0

  const footerVisible = Boolean(
    data.footer.extraText ||
    data.showTagline ||
    data.footer.documentNumber ||
    data.footer.companyName,
  )

  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const amountInWords = getAmountInWords(data.totals)
  const advanceSummary = buildAdvanceSummary(data.advanceSummary)

  const docLabel = data.customTitle || data.title || 'Document'

  const tokens = resolveDesignTokens(data.design)
  const c = {
    text: tokens.textColor ? { color: tokens.textColor } : null,
    accent: tokens.accentColor ? { color: tokens.accentColor } : null,
    muted: tokens.mutedColor ? { color: tokens.mutedColor } : null,
    border: tokens.borderColor ? { borderColor: tokens.borderColor } : null,
    surface: tokens.surfaceColor ? { backgroundColor: tokens.surfaceColor } : null,
    headerFont: tokens.headerFont ? { fontFamily: tokens.headerFont } : null,
    bodyFont: tokens.bodyFont ? { fontFamily: tokens.bodyFont } : null,
  }

  function resolveColumnStyle(column: CommercialDocumentData['table']['columns'][number]) {
    const layout = resolveColumnLayout(column)
    const widthStyle = layout.width
      ? { width: layout.width, flexGrow: 0, flexShrink: 0 }
      : { flexBasis: layout.flexBasis, flexGrow: layout.flexGrow, flexShrink: layout.flexShrink }
    return [
      widthStyle,
      column.key === 'description' ? styles.descriptionCellYield : null,
    ]
  }

  return (
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={[styles.page, c.surface]}>
      <View style={styles.headerContent}>
        <View style={styles.headerGrid}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>{docLabel.replace(/[^A-Z]/g, '').slice(0, 3) || 'INV'}</Text>
            </View>
          </View>

          <View style={styles.headerCenter}>
            <Text style={[styles.docLabel, c.accent]}>{docLabel}</Text>
            <Text style={[styles.docTitle, c.text, c.headerFont]}>{data.title || docLabel}</Text>
            {metaRows.length > 0 ? (
              <View style={styles.metaRow}>
                {metaRows.slice(0, 4).map((row, idx) => (
                  <View key={`meta-${idx}`} style={styles.metaItem}>
                    <Text style={[styles.metaLabel, c.muted]}>{row.label}</Text>
                    <Text style={[styles.metaValue, c.text]}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {data.client ? (
            <View style={styles.headerRight}>
              <Text style={[styles.partyLabel, c.muted]}>Bill To</Text>
              {data.client.name ? <Text style={[styles.partyName, c.text, c.bodyFont]}>{data.client.name}</Text> : null}
              {data.client.address ? <Text style={[styles.partyLine, c.text]}>{data.client.address}</Text> : null}
              {data.client.cityState ? <Text style={[styles.partyLine, c.text]}>{data.client.cityState}</Text> : null}
              {data.client.phone ? <Text style={[styles.partyLine, c.text]}>{data.client.phone}</Text> : null}
              {data.client.email ? <Text style={[styles.partyLine, c.text]}>{data.client.email}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.accentBar, c.accent && { backgroundColor: tokens.accentColor }]} />

      {hasCustomFields ? (
        <View style={styles.ribbon}>
          {customFields.map((field, idx) => (
            <View key={`rib-${idx}`} style={styles.ribbonItem}>
              <Text style={[styles.ribbonLabel, c.muted]}>{field.label}</Text>
              <Text style={[styles.ribbonValue, c.text]}>{field.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.content}>
        {(data.table.columns?.length ?? 0) > 0 && (data.table.rows?.length ?? 0) > 0 ? (
          <View style={[styles.tableCard, c.border]} wrap={false}>
            <View style={[styles.tableHeader, c.surface, c.border && { borderBottomColor: tokens.borderColor }]} fixed>
              {data.table.columns.map((column, idx) => {
                const alignStyle = resolveTextAlignment(column.align)
                const colStyle = resolveColumnStyle(column)
                return (
                  <Text key={`th-${idx}`} style={[styles.tableHeaderCell, ...colStyle, alignStyle, c.text, c.bodyFont]}>
                    {column.label}
                  </Text>
                )
              })}
            </View>

            <View style={styles.tableBody}>
              {data.table.rows.map((row, rowIdx) => {
                if (row.rowType === 'group_header') {
                  const groupLabel = toTitleCase(row.groupName || row.groupLabel || '')
                  return (
                    <View key={`gh-${rowIdx}`} style={[styles.groupHeaderRow, c.surface && { backgroundColor: tokens.surfaceColor }, c.border && { borderBottomColor: tokens.borderColor }]} wrap={false}>
                      <Text style={[styles.groupHeaderText, c.text, c.headerFont]}>{groupLabel || 'Group'}</Text>
                    </View>
                  )
                }

                if (row.rowType === 'group_footer') {
                  const subtotalValue = row.groupSubtotalValue
                  const showSubtotal = row.showSubtotal === true && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== ''
                  return showSubtotal ? (
                    <View key={`gf-${rowIdx}`} wrap={false}>
                      <View style={[styles.groupSubtotalRow, c.surface && { backgroundColor: tokens.surfaceColor }]}>
                        <Text style={[styles.groupSubtotalLabel, c.text]}>Subtotal</Text>
                        <PdfCurrencyText value={subtotalValue} style={[styles.groupSubtotalValue, c.text]} />
                      </View>
                      <View style={[styles.groupClosingRule, c.border && { backgroundColor: tokens.borderColor }]} />
                    </View>
                  ) : (
                    <View key={`gcr-${rowIdx}`} style={styles.groupClosingRule} />
                  )
                }

                return (
                  <View key={`tr-${rowIdx}`} style={[styles.tableRow, c.border && { borderBottomColor: tokens.borderColor }]} wrap={false}>
                    {data.table.columns.map((column, colIdx) => {
                      const cell = row.cells?.[column.key]
                      const alignStyle = resolveTextAlignment(column.align)
                      const colStyle = resolveColumnStyle(column)
                      const isDescription = column.key === 'description'
                      const isTightSingleLineCell = column.key === 'quantity' || column.key === 'unit' || column.key === 'qty'

                      return (
                        <View key={`tc-${rowIdx}-${colIdx}`} style={[styles.tableCell, ...colStyle, alignStyle]}>
                          {isDescription ? (
                            <>
                              <Text style={[styles.descriptionMain, c.text]}>{getDescriptionMain(cell)}</Text>
                              {getDescriptionSub(cell) ? (
                                <Text style={[styles.descriptionSub, c.muted]}>{getDescriptionSub(cell)}</Text>
                              ) : null}
                              {row.imageUrl ? (
                                <>
                                  <Image src={row.imageUrl} style={styles.imageThumb} />
                                  <Link src={row.imageUrl} style={styles.imageLink}>Open image</Link>
                                </>
                              ) : null}
                            </>
                          ) : isTightSingleLineCell ? (
                            <Text style={[styles.tightCellText, styles.qtyUnitToken, c.muted, alignStyle || { textAlign: 'center' }]} wrap={false}>
                              {safeText(cell)}
                            </Text>
                          ) : (
                            <PdfCurrencyText value={safeText(cell)} style={alignStyle || undefined} />
                          )}
                        </View>
                      )
                    })}
                  </View>
                )
              })}
            </View>
          </View>
        ) : null}

        {(data.notes?.content || data.terms?.content || (data.attachments?.length ?? 0) > 0) ? (
          <View style={styles.infoRow}>
            {data.notes?.content ? (
              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, c.accent, c.headerFont]}>{data.notes.title || 'Notes'}</Text>
                {renderPdfRichText(data.notes.content, {
                  containerStyle: styles.infoRichText,
                  paragraphStyle: styles.infoParagraph,
                  listStyle: styles.infoList,
                  listItemRowStyle: styles.infoListItemRow,
                  listMarkerStyle: styles.infoListMarker,
                  listItemTextStyle: styles.infoListItemText,
                  fallbackTextStyle: styles.infoText,
                }) || <Text style={styles.infoText}>{data.notes.plainText || ''}</Text>}
              </View>
            ) : null}
            {data.terms?.content ? (
              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, c.accent, c.headerFont]}>{data.terms.title || 'Terms'}</Text>
                {renderPdfRichText(data.terms.content, {
                  containerStyle: styles.infoRichText,
                  paragraphStyle: styles.infoParagraph,
                  listStyle: styles.infoList,
                  listItemRowStyle: styles.infoListItemRow,
                  listMarkerStyle: styles.infoListMarker,
                  listItemTextStyle: styles.infoListItemText,
                  fallbackTextStyle: styles.infoText,
                }) || <Text style={styles.infoText}>{data.terms.plainText || ''}</Text>}
              </View>
            ) : null}
            {(data.attachments?.length ?? 0) > 0 ? (
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Attachments</Text>
                <View style={{ gap: 2 }}>
                  {buildAttachmentItems(data.attachments).map((item, idx) => {
                    if (item.url && item.label) {
                      return <Link key={`att-${idx}`} src={item.formattedUrl || item.url} style={styles.attachmentLink}>{item.label}</Link>
                    }
                    if (item.label) {
                      return <Text key={`att-${idx}`} style={styles.attachmentItem}>- {item.label}</Text>
                    }
                    if (item.url) {
                      return <Link key={`att-${idx}`} src={item.formattedUrl || item.url} style={styles.attachmentLink}>{item.url}</Link>
                    }
                    return null
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {(totalsLines.length > 0 || mainTotal || amountInWords || balanceDue || advanceSummary) ? (
          <View style={styles.totalsWrap} wrap={false}>
            <View style={styles.totalsGrid}>
              {totalsLines.map((line, idx) => (
                <View key={`tl-${idx}`} style={styles.totalRow}>
                  <Text style={[styles.totalLabel, c.text]}>{line.label}</Text>
                  <PdfCurrencyText value={line.value} style={[styles.totalValue, c.text]} />
                </View>
              ))}

              {mainTotal ? (
                <View style={[styles.totalFinal, c.border && { borderTopColor: tokens.textColor || '#1a2f2f' }]}>
                  <Text style={[styles.totalFinalLabel, c.text, c.headerFont]}>{mainTotal.label}</Text>
                  <PdfCurrencyText value={mainTotal.value} style={[styles.totalFinalValue, c.text, c.headerFont]} />
                </View>
              ) : null}

              {amountInWords ? (
                <Text style={[styles.amountWords, c.muted]}>{amountInWords}</Text>
              ) : null}

              {advanceSummary ? (
                <View style={[styles.advanceRow, c.surface && { backgroundColor: tokens.surfaceColor }]}>
                  <Text style={[styles.advanceLabel, c.text, c.headerFont]}>{advanceSummary.primaryLabel}</Text>
                  <PdfCurrencyText value={advanceSummary.advanceAmount} style={[styles.advanceValue, c.text, c.headerFont]} />
                </View>
              ) : null}

              {advanceSummary?.balanceRemaining ? (
                  <View style={[styles.advanceBox, c.border && { borderTopColor: tokens.borderColor }]}>
                  <View style={styles.advanceSubRow}>
                    <Text style={[styles.advanceSubLabel, c.muted]}>{advanceSummary.secondaryLabel}</Text>
                    <PdfCurrencyText value={advanceSummary.balanceRemaining} style={[styles.advanceSubValue, c.muted]} />
                  </View>
                </View>
              ) : null}

              {balanceDue ? (
                <View style={styles.balanceDue}>
                  <Text style={[styles.balanceDueText, c.surface && { color: tokens.surfaceColor }]}>{balanceDue.label}</Text>
                  <PdfCurrencyText value={balanceDue.value} style={[styles.balanceDueValue, c.surface && { color: tokens.surfaceColor }]} />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {(data.signature?.name || data.signature?.imageUrl || (data.additionalFields?.length ?? 0) > 0) ? (
          <View style={styles.sigExtraRow}>
            {data.signature?.name || data.signature?.imageUrl ? (
              <View style={styles.sigBox}>
                {data.signature.imageUrl ? (
                  <Image src={{ uri: data.signature.imageUrl, method: 'GET', headers: {} }} style={styles.sigImage} />
                ) : (
                  <View style={styles.sigScribble} />
                )}
                <View style={[styles.sigLine, c.border && { backgroundColor: tokens.borderColor }]} />
                {data.signature.name ? <Text style={[styles.sigName, c.text]}>{data.signature.name}</Text> : null}
                {data.signature.role ? <Text style={[styles.sigRole, c.muted]}>{data.signature.role}</Text> : null}
              </View>
            ) : (
              <View style={styles.sigBox} />
            )}
            {(data.additionalFields?.length ?? 0) > 0 ? (
              <View style={styles.extraFieldsWrap}>
                {data.additionalFields.map((field, idx) => (
                  <View key={`ext-${idx}`} style={styles.extraFieldRow}>
                    <Text style={[styles.extraFieldLabel, c.muted]}>{field.label}</Text>
                    <Text style={[styles.extraFieldValue, c.text]}>{field.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {footerVisible ? (
        <View style={[styles.footerZone, c.surface && { backgroundColor: tokens.surfaceColor }, c.border && { borderTopColor: tokens.borderColor }]} fixed>
          {data.footer.extraText ? <Text style={[styles.footerExtra, c.muted]}>{data.footer.extraText}</Text> : null}
          {data.showTagline && data.company?.tagline ? (
            <Text style={[styles.footerTagline, c.muted]}>{data.company.tagline}</Text>
          ) : null}
          <View style={styles.footerBar}>
            <Text style={[styles.footerText, c.muted]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
            <Text style={[styles.footerText, c.muted]}>{data.footer.documentNumber || data.documentNumber}</Text>
            <Text style={[styles.footerText, c.muted]}>{data.footer.companyName || data.company?.name || ''}</Text>
          </View>
        </View>
      ) : null}
    </Page>
  )
}
