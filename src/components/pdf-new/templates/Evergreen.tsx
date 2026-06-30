import React from 'react'
import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { styles, ACCENT, ACCENT_PALE, INK, PAPER, RULE, GRAY_TEXT } from './EvergreenStyles'
import { renderPdfRichText } from '../core/pdfRichText'
import { resolveDesignTokens } from '../designTokens'
import { PdfCurrencyText } from '../pdfCurrency'
import { safeText } from '../core/safeText'
import { getDescriptionMain, getDescriptionSub } from '../core/description'
import { buildPartyLines } from '../engine/party'
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

function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function Evergreen({ data }: { data: CommercialDocumentData }) {
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
  const isAdvanceInvoice = !!advance
  const footerVisible = Boolean(
    data.footer.extraText || data.showTagline || data.footer.documentNumber || data.footer.companyName,
  )

  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)

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

  return (
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={[styles.page, c.surface]}>
      {/* ACCENT BAR */}
      <View style={[styles.accentBar, c.accent]} fixed />

      <View style={styles.pageContent}>
        {/* 1. HEADER */}
        <View style={styles.header} wrap={false}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, c.text, c.headerFont]}>{safeText(data.title)}</Text>
            {data.customTitle ? <Text style={[styles.customTitle, c.muted]}>{safeText(data.customTitle)}</Text> : null}
            {companyLineMap.get('name') ? (
              <>
                <Text style={[styles.brandName, c.text, c.headerFont]}>{safeText(companyLineMap.get('name'))}</Text>
                {companyLineMap.get('address') && (
                  <Text style={[styles.brandDetail, c.text]}>{safeText(companyLineMap.get('address'))}</Text>
                )}
                {companyLineMap.get('cityState') && (
                  <Text style={[styles.brandDetail, c.text]}>{safeText(companyLineMap.get('cityState'))}</Text>
                )}
                {(companyLineMap.get('phone') || companyLineMap.get('email')) && (
                  <Text style={[styles.brandDetail, c.text]}>
                    {[safeText(companyLineMap.get('phone')), safeText(companyLineMap.get('email'))].filter(Boolean).join(' | ')}
                  </Text>
                )}
              </>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            {data.company?.companyLogoUrl ? (
              <Image src={data.company.companyLogoUrl} style={styles.logo} />
            ) : null}
            {data.documentNumber ? (
              <Text style={[styles.docMetaBold, c.text, c.headerFont]}>
                {safeText(data.documentNumberLabel)}: {safeText(data.documentNumber)}
              </Text>
            ) : null}
            {data.issueDate ? (
              <Text style={[styles.docMetaValue, c.text]}>
                {safeText(data.issueDateLabel)}: {safeText(data.issueDate)}
              </Text>
            ) : null}
            {data.dueDateOrValidityDate ? (
              <Text style={[styles.docMetaValue, c.text]}>
                {safeText(data.dueDateOrValidityDateLabel)}: {safeText(data.dueDateOrValidityDate)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 2. PARTY SECTION */}
        {(data.company || data.client) ? (
          <View style={styles.partyRow} wrap={false}>
            {data.company ? (
              <View style={styles.partyBox}>
                <Text style={[styles.partyTitle, c.accent, c.headerFont]}>From</Text>
                {companyLineMap.get('name') ? (
                  <Text style={[styles.partyName, c.text, c.bodyFont]}>{safeText(companyLineMap.get('name'))}</Text>
                ) : null}
                {companyLines.filter((l) => l.type !== 'name').map((line, idx) => (
                  <Text key={line.key || idx} style={[styles.partyLine, c.text]}>
                    {safeText(line.value)}
                  </Text>
                ))}
              </View>
            ) : null}
            {data.client ? (
              <View style={styles.partyBox}>
                <Text style={[styles.partyTitle, c.accent, c.headerFont]}>Bill To</Text>
                {clientLineMap.get('name') ? (
                  <Text style={[styles.partyName, c.text, c.bodyFont]}>{safeText(clientLineMap.get('name'))}</Text>
                ) : null}
                {clientLines.filter((l) => l.type !== 'name').map((line, idx) => (
                  <Text key={line.key || idx} style={[styles.partyLine, c.text]}>
                    {safeText(line.value)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 3. CUSTOM HEADER FIELDS */}
        {(data.poNumber || data.customHeaderFields.length > 0) ? (
          <View style={styles.customFieldsStrip} wrap={false}>
            {data.poNumber ? (
              <View style={styles.customFieldItem}>
                <Text style={[styles.customFieldLabel, c.muted]}>{safeText(data.poNumberLabel)}</Text>
                <Text style={[styles.customFieldValue, c.text]}>{safeText(data.poNumber)}</Text>
              </View>
            ) : null}
            {data.customHeaderFields.map((field, idx) => (
              <View key={idx} style={styles.customFieldItem}>
                <Text style={[styles.customFieldLabel, c.muted]}>{safeText(field.label)}</Text>
                <Text style={[styles.customFieldValue, c.text]}>{safeText(field.value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 4. TABLE */}
        {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
          <View style={styles.tableWrap}>
            <View style={styles.tableHeaderRow} fixed>
              {data.table.columns.map((col, idx) => {
                const alignStyle = resolveTextAlignment(col.align)
                const layout = resolveColumnLayout(col)
                const widthStyle = layout.width
                  ? { width: layout.width, flexGrow: 0, flexShrink: 0 }
                  : { flexBasis: layout.flexBasis, flexGrow: layout.flexGrow, flexShrink: layout.flexShrink }
                return (
                  <Text key={idx} style={[styles.tableHeaderCell, c.text, c.bodyFont, widthStyle as any, alignStyle]}>
                    {safeText(col.label)}
                  </Text>
                )
              })}
            </View>

            {data.table.rows.map((row, rowIdx) => {
              if (row.rowType === 'group_header') {
                return (
                  <View key={`gh-${rowIdx}`} style={styles.groupHeaderRow} wrap={false}>
                    <Text style={[styles.groupHeaderText, c.text, c.headerFont]}>
                      {toTitleCase(row.groupName || row.groupLabel || '')}
                    </Text>
                  </View>
                )
              }

              if (row.rowType === 'group_footer') {
                const subtotalValue = row.groupSubtotalValue
                const showSubtotal = row.showSubtotal === true && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== ''

                if (!showSubtotal) {
                  return <View key={`gf-${rowIdx}`} style={[styles.groupClosingRule, c.border]} wrap={false} />
                }

                return (
                  <View key={`gf-${rowIdx}`} wrap={false}>
                    <View style={styles.groupSubtotalRow}>
                      <Text style={[styles.groupSubtotalLabel, c.text]}>Subtotal</Text>
                      <PdfCurrencyText value={subtotalValue} style={[styles.groupSubtotalValue, c.text]} />
                    </View>
                    <View style={[styles.groupClosingRule, c.border]} />
                  </View>
                )
              }

              return (
                <View
                  key={`row-${rowIdx}`}
                  style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowEven : null]}
                  wrap={false}
                >
                  {data.table.columns.map((col, colIdx) => {
                    const cell = row.cells?.[col.key]
                    const alignStyle = resolveTextAlignment(col.align)
                    const layout = resolveColumnLayout(col)
                    const widthStyle = layout.width
                      ? { width: layout.width, flexGrow: 0, flexShrink: 0 }
                      : { flexBasis: layout.flexBasis, flexGrow: layout.flexGrow, flexShrink: layout.flexShrink }
                    const isDescription = col.key === 'description'

                    return (
                      <View key={`cell-${rowIdx}-${colIdx}`} style={[widthStyle as any, alignStyle]}>
                        {isDescription ? (
                          <>
                            <Text style={[styles.descriptionMain, c.text]}>{getDescriptionMain(cell)}</Text>
                            {getDescriptionSub(cell) ? (
                              <Text style={[styles.descriptionSub, c.muted]}>{getDescriptionSub(cell)}</Text>
                            ) : null}
                            {row.imageUrl ? (
                              <>
                                <Image src={row.imageUrl} style={styles.imageThumb} />
                                <Link src={row.imageUrl} style={styles.imageLink}>
                                  Open image
                                </Link>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <PdfCurrencyText value={safeText(cell)} style={[styles.tableCell, c.text]} />
                        )}
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        ) : null}

        {/* 5. BOTTOM: BANK + TOTALS */}
        {(hasBankDetails || totalsLines.length > 0 || mainTotal || balanceDue || amountInWords || advance) ? (
          <View style={styles.bottomSection} wrap={false}>
            <View style={styles.bottomLeft}>
              {hasBankDetails && data.paymentDetails ? (
                <View style={styles.bankBox}>
                  <Text style={[styles.sectionTitle, c.accent, c.headerFont]}>Bank Details</Text>
                  {data.paymentDetails.bankName ? (
                    <View style={styles.bankRow}>
                      <Text style={[styles.bankLabel, c.muted]}>Bank</Text>
                      <Text style={[styles.bankValue, c.text]}>{safeText(data.paymentDetails.bankName)}</Text>
                    </View>
                  ) : null}
                  {data.paymentDetails.accountName ? (
                    <View style={styles.bankRow}>
                      <Text style={[styles.bankLabel, c.muted]}>Account Name</Text>
                      <Text style={[styles.bankValue, c.text]}>{safeText(data.paymentDetails.accountName)}</Text>
                    </View>
                  ) : null}
                  {data.paymentDetails.accountNumber ? (
                    <View style={styles.bankRow}>
                      <Text style={[styles.bankLabel, c.muted]}>Account No</Text>
                      <Text style={[styles.bankValue, c.text]}>{safeText(data.paymentDetails.accountNumber)}</Text>
                    </View>
                  ) : null}
                  {data.paymentDetails.sortCode ? (
                    <View style={styles.bankRow}>
                      <Text style={[styles.bankLabel, c.muted]}>Sort Code</Text>
                      <Text style={[styles.bankValue, c.text]}>{safeText(data.paymentDetails.sortCode)}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.bottomRight}>
              <View style={styles.totalsBox}>
                {totalsLines.map((line, idx) => (
                  <View key={idx} style={styles.totalRow}>
                    <Text style={[styles.totalLabel, c.muted]}>{safeText(line.label)}</Text>
                    <PdfCurrencyText value={safeText(line.value)} style={[styles.totalValue, c.text]} />
                  </View>
                ))}

                {mainTotal ? (
                  <View style={[styles.totalFinal, c.border]}>
                    <Text style={[styles.totalFinalLabel, c.text, c.headerFont]}>{safeText(mainTotal.label)}</Text>
                    <PdfCurrencyText value={safeText(mainTotal.value)} style={[styles.totalFinalValue, c.text, c.headerFont]} />
                  </View>
                ) : null}

                {amountInWords ? (
                  <Text style={[styles.amountWords, c.muted]}>{safeText(amountInWords)}</Text>
                ) : null}

                {!isAdvanceInvoice && balanceDue ? (
                  <View style={styles.balanceDue}>
                    <Text style={[styles.balanceDueLabel, c.text, c.headerFont]}>{safeText(balanceDue.label)}</Text>
                    <PdfCurrencyText value={safeText(balanceDue.value)} style={[styles.balanceDueValue, c.text, c.headerFont]} />
                  </View>
                ) : null}

                {isAdvanceInvoice && advance ? (
                  <View style={[styles.advanceBox, c.border]}>
                    <View style={styles.advanceRow}>
                      <Text style={[styles.advancePrimaryLabel, c.accent, c.headerFont]}>{safeText(advance.primaryLabel)}</Text>
                      <PdfCurrencyText value={safeText(advance.advanceAmount)} style={[styles.advancePrimaryValue, c.accent, c.headerFont]} />
                    </View>
                    <View style={styles.advanceRow}>
                      <Text style={[styles.advanceSecondaryLabel, c.muted]}>{safeText(advance.secondaryLabel)}</Text>
                      <PdfCurrencyText value={safeText(advance.balanceRemaining)} style={[styles.advanceSecondaryValue, c.text]} />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* 6. NOTES */}
        {data.notes?.content ? (
          <View style={styles.notesSection}>
            {data.notes.title ? <Text style={[styles.notesTitle, c.accent, c.headerFont]}>{safeText(data.notes.title)}</Text> : null}
            {renderPdfRichText(data.notes.content, {
              containerStyle: styles.notesRichText,
              paragraphStyle: styles.notesParagraph,
              listStyle: styles.notesList,
              listItemRowStyle: styles.notesListItemRow,
              listMarkerStyle: styles.notesListMarker,
              listItemTextStyle: styles.notesListItemText,
              fallbackTextStyle: styles.notesPlainText,
            }) || <Text style={[styles.notesPlainText, c.text]}>{data.notes.plainText || ''}</Text>}
          </View>
        ) : null}

        {/* 7. TERMS */}
        {data.terms?.content ? (
          <View style={styles.notesSection}>
            {data.terms.title ? <Text style={[styles.notesTitle, c.accent, c.headerFont]}>{safeText(data.terms.title)}</Text> : null}
            {renderPdfRichText(data.terms.content, {
              containerStyle: styles.notesRichText,
              paragraphStyle: styles.notesParagraph,
              listStyle: styles.notesList,
              listItemRowStyle: styles.notesListItemRow,
              listMarkerStyle: styles.notesListMarker,
              listItemTextStyle: styles.notesListItemText,
              fallbackTextStyle: styles.notesPlainText,
            }) || <Text style={[styles.notesPlainText, c.text]}>{data.terms.plainText || ''}</Text>}
          </View>
        ) : null}

        {/* 8. ATTACHMENTS */}
        {attachmentItems.length > 0 ? (
          <View style={styles.attachmentsSection}>
            <Text style={[styles.sectionTitle, c.accent, c.headerFont]}>Attachments</Text>
            {attachmentItems.map((item, idx) => {
              if (item.formattedUrl) {
                return (
                  <Link key={idx} src={item.formattedUrl} style={styles.attachmentLink}>
                    {safeText(item.label)}
                  </Link>
                )
              }
              return (
                <Text key={idx} style={styles.attachmentItem}>
                  {safeText(item.label || item.url)}
                </Text>
              )
            })}
          </View>
        ) : null}

        {/* 9. ADDITIONAL FIELDS */}
        {data.additionalFields.length > 0 ? (
          <View style={styles.additionalFieldsBar}>
            {data.additionalFields.map((field, idx) => (
              <View key={idx} style={styles.additionalFieldItem}>
                <Text style={[styles.additionalFieldLabel, c.muted]}>{safeText(field.label)}</Text>
                <Text style={[styles.additionalFieldValue, c.text]}>{safeText(field.value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 10. SIGNATURE */}
        {data.signature && (data.signature.imageUrl || data.signature.name) ? (
          <View style={styles.signatureWrap} wrap={false}>
            <View style={styles.signatureBox}>
              {typeof data.signature.imageUrl === 'string' && data.signature.imageUrl.trim() ? (
                <Image src={{ uri: data.signature.imageUrl, method: 'GET', headers: {} }} style={styles.signatureImage} />
              ) : null}
              <View style={[styles.signatureLine, c.border]} />
              {data.signature.name ? <Text style={[styles.signerName, c.text, c.headerFont]}>{safeText(data.signature.name)}</Text> : null}
              {data.signature.role ? <Text style={[styles.signerRole, c.muted]}>{safeText(data.signature.role)}</Text> : null}
            </View>
          </View>
        ) : null}
      </View>

      {/* 11. FIXED FOOTER */}
      {footerVisible ? (
        <View style={[styles.footerZone, c.surface]} fixed>
          {data.footer.extraText ? <Text style={[styles.footerExtra, c.muted]}>{safeText(data.footer.extraText)}</Text> : null}
          {data.showTagline && data.company?.tagline ? (
            <Text style={[styles.footerTagline, c.muted]}>{safeText(data.company.tagline)}</Text>
          ) : null}
          <View style={styles.documentFooter}>
            <Text style={[styles.footerText, c.muted]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
            <Text style={[styles.footerText, c.muted]}>{safeText(data.footer.documentNumber || data.documentNumber)}</Text>
            <Text style={[styles.footerText, c.muted]}>{safeText(data.footer.companyName || data.company?.name || '')}</Text>
          </View>
        </View>
      ) : null}
    </Page>
  )
}
