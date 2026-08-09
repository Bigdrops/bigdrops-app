import React from 'react'
import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { styles, INK, ACCENT, ACCENT_DIM, PAPER, LIGHT_RULE, MUTED_TEXT, WHITE, CREST_SERIF, CREST_SANS } from './CrestStyles'
import { renderPdfRichText } from '../core/pdfRichText'
import { PdfGlyphText } from '../core/PdfGlyphText'
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
  getAccentTint,
} from '../engine'
import { resolveDesignTokens, type DesignTokens } from '../designTokens'

const keepWholePdfWord = (word: string) => [word]

function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function CrestPartyCard({
  title,
  party,
  tokens,
}: {
  title: string
  party: NonNullable<CommercialDocumentData['company']>
  tokens: DesignTokens
}) {
  const lines = buildPartyLines(party)
  const pc = {
    accent: tokens.accentColor ? { color: tokens.accentColor } : null,
    text: tokens.textColor ? { color: tokens.textColor } : null,
    muted: tokens.mutedColor ? { color: tokens.mutedColor } : null,
    border: tokens.borderColor ? { borderColor: tokens.borderColor } : null,
    headerFont: tokens.headerFont ? { fontFamily: tokens.headerFont } : null,
    bodyFont: tokens.bodyFont ? { fontFamily: tokens.bodyFont } : null,
  }

  return (
    <View style={[styles.partyBox, pc.border]}>
      <Text style={[styles.partyTitle, pc.accent, pc.headerFont]}>{title}</Text>
      {lines.map((line, idx) => {
        if (line.type === 'name') {
          return (
            <Text key={line.key} style={[styles.partyName, pc.text, pc.bodyFont]}>
              {line.value}
            </Text>
          )
        }
        return (
          <Text key={`${line.key}-${idx}`} style={[styles.partyLine, pc.text]}>
            {line.value}
          </Text>
        )
      })}
    </View>
  )
}

function CrestOptionalList(items: CommercialDocumentData['attachments']) {
  const attachmentItems = buildAttachmentItems(items)

  return attachmentItems.map((item, idx) => {
    if (item.url && item.label) {
      return (
        <Link key={`attach-${idx}`} src={item.formattedUrl || item.url} style={styles.attachmentLink}>
          {item.label}
        </Link>
      )
    }
    if (item.label) {
      return (
        <Text key={`attach-${idx}`} style={styles.attachmentItem}>
          - {item.label}
        </Text>
      )
    }
    if (item.url) {
      return (
        <Link key={`attach-${idx}`} src={item.formattedUrl || item.url} style={styles.attachmentLink}>
          {item.url}
        </Link>
      )
    }
    return null
  })
}

export default function Crest({ data }: { data: CommercialDocumentData }) {
  const metaRows = [
    data.documentNumber
      ? { label: data.documentNumberLabel, value: data.documentNumber }
      : null,
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate
      ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate }
      : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const customFields = data.customHeaderFields
  const hasCustomFields = customFields.length > 0

  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)

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

  const showHeader = Boolean(
    data.title || metaRows.length > 0 || data.company?.companyLogoUrl
  )

  const accentTintColor = getAccentTint(ACCENT, ACCENT_DIM)

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

  function resolveColumnStyle(
    column: CommercialDocumentData['table']['columns'][number],
  ) {
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
      {/* ── Header Band ────────────────────────────────── */}
      {showHeader ? (
        <>
          <View style={[styles.headerBand, c.surface]}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                {data.company?.name ? (
                  <Text style={[styles.companyName, c.text, c.headerFont]}>{data.company.name}</Text>
                ) : null}

                <Text style={[styles.title, c.text, c.headerFont]}>{data.title}</Text>

                {metaRows.length > 0 ? (
                  <View style={styles.metaList}>
                    {metaRows.map((row, idx) => (
                      <View key={`meta-${idx}`} style={styles.metaRow}>
                        <Text style={[styles.metaLabel, c.muted]}>{row.label}</Text>
                        <Text style={[styles.metaValue, c.text]}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {data.company?.companyLogoUrl ? (
                <View style={styles.headerRight}>
                  <View style={styles.logoWrapper}>
                    <Image src={data.company.companyLogoUrl} style={styles.logo} />
                  </View>
                </View>
              ) : null}
            </View>
          </View>
          <View style={[styles.headerAccentBar, c.accent]} />
        </>
      ) : null}

      {/* ── Party / Address Block ──────────────────────── */}
      {(data.company || data.client) ? (
        <View style={styles.partyRow}>
          {data.company ? (
            <CrestPartyCard title="From" party={data.company} tokens={tokens} />
          ) : null}
          {data.client ? (
            <View style={[styles.partyBox, styles.partyBoxLast, c.border]}>
              <Text style={[styles.partyTitle, c.accent, c.headerFont]}>To</Text>
              {data.client.name ? (
                <Text style={[styles.partyName, c.text, c.bodyFont]}>{data.client.name}</Text>
              ) : null}
              {data.client.address ? (
                <Text style={[styles.partyLine, c.text]}>{data.client.address}</Text>
              ) : null}
              {data.client.cityState ? (
                <Text style={[styles.partyLine, c.text]}>{data.client.cityState}</Text>
              ) : null}
              {data.client.phone ? (
                <Text style={[styles.partyLine, c.text]}>{data.client.phone}</Text>
              ) : null}
              {data.client.email ? (
                <Text style={[styles.partyLine, c.text]}>{data.client.email}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Custom Fields Strip ────────────────────────── */}
      {hasCustomFields ? (
        <View style={styles.customFieldsWrap}>
          {customFields.map((field, idx) => (
            <View key={`cf-${idx}`} style={styles.customFieldChip}>
              <Text style={[styles.customFieldLabel, c.muted]}>{field.label}</Text>
              <Text style={[styles.customFieldValue, c.text]}>{field.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Table ──────────────────────────────────────── */}
      {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
        <View style={styles.tableWrap}>
          <View style={[styles.tableHeaderRow, c.surface]} fixed>
            {data.table.columns.map((column, idx) => {
              const alignStyle = resolveTextAlignment(column.align)
              const colStyle = resolveColumnStyle(column)

              return (
                <Text
                  key={`head-${idx}`}
                  style={[
                    styles.tableHeaderCell,
                    ...colStyle,
                    alignStyle,
                    c.text,
                    c.bodyFont,
                  ]}
                >
                  {column.label}
                </Text>
              )
            })}
          </View>

          {data.table.rows.map((row, rowIdx) => {
            if (row.rowType === 'group_header') {
              const groupLabel = toTitleCase(row.groupName || row.groupLabel || '')

              return (
                <View
                  key={`group-h-${rowIdx}`}
                  style={[styles.groupHeaderRow, c.surface]}
                  wrap={false}
                >
                  <Text style={[styles.groupHeaderText, c.text, c.headerFont]}>
                    {groupLabel || 'Group'}
                  </Text>
                </View>
              )
            }

            if (row.rowType === 'group_footer') {
              const subtotalValue = row.groupSubtotalValue
              const showSubtotal = row.showSubtotal === true && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== ''

              return showSubtotal ? (
                  <View key={`group-f-${rowIdx}`} wrap={false}>
                  <View style={[styles.groupSubtotalRow, c.surface]}>
                    <Text style={[styles.groupSubtotalLabel, c.text]}>
                      Subtotal
                    </Text>
                    <PdfCurrencyText
                      value={subtotalValue}
                      style={[styles.groupSubtotalValue, c.text]}
                    />
                  </View>
                  <View style={[styles.groupClosingRule, c.border]} wrap={false} />
                </View>
              ) : (
                <View
                  key={`group-f-${rowIdx}-rule`}
                  style={styles.groupClosingRule}
                  wrap={false}
                />
              )
            }

            return (
              <View
                key={`row-${rowIdx}`}
                style={[
                  styles.tableRow,
                  rowIdx % 2 === 1 ? styles.tableRowEven : null,
                  c.border,
                ]}
                wrap={false}
              >
                {data.table.columns.map((column, colIdx) => {
                  const cell = row.cells?.[column.key]
                  const alignStyle = resolveTextAlignment(column.align)
                  const colStyle = resolveColumnStyle(column)
                  const isDescription = column.key === 'description'
                  const isTightSingleLineCell = column.key === 'quantity' || column.key === 'unit' || column.key === 'qty'

                  return (
                    <View
                      key={`cell-${rowIdx}-${colIdx}`}
                      style={[
                        styles.tableCell,
                        ...colStyle,
                        alignStyle,
                      ]}
                    >
                      {isDescription ? (
                        <>
                          <PdfGlyphText value={getDescriptionMain(cell)} style={[styles.descriptionMain, c.text]} />
                          {getDescriptionSub(cell) ? (
                            <PdfGlyphText value={getDescriptionSub(cell)} style={[styles.descriptionSub, c.muted]} />
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
                      ) : isTightSingleLineCell ? (
                        <Text
                          style={[styles.tightCellText, styles.qtyUnitToken, c.muted, alignStyle || { textAlign: 'center' }]}
                          wrap={false}
                          hyphenationCallback={keepWholePdfWord}
                        >
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
      ) : null}

      {/* ── Totals + Bank Details ──────────────────────── */}
      {(hasBankDetails || totalsLines.length > 0 || advanceSummary || mainTotal || amountInWords || balanceDue) ? (
        <View
          style={[
            styles.closingRow,
            hasBankDetails ? styles.closingRowWide : null,
          ]}
          wrap={false}
        >
          {hasBankDetails && data.paymentDetails ? (
            <View style={styles.bankBox}>
              <Text style={[styles.bankTitle, c.accent, c.headerFont]}>Bank Details</Text>
              {data.paymentDetails.bankName ? (
                <View style={styles.bankRow}>
                  <Text style={[styles.bankLabel, c.muted]}>Bank</Text>
                  <Text style={[styles.bankValue, c.text]}>{data.paymentDetails.bankName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountName ? (
                <View style={styles.bankRow}>
                  <Text style={[styles.bankLabel, c.muted]}>Account Name</Text>
                  <Text style={[styles.bankValue, c.text]}>{data.paymentDetails.accountName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountNumber ? (
                <View style={styles.bankRow}>
                  <Text style={[styles.bankLabel, c.muted]}>Account Number</Text>
                  <Text style={[styles.bankValue, c.text]}>{data.paymentDetails.accountNumber}</Text>
                </View>
              ) : null}
              {data.paymentDetails.sortCode ? (
                <View style={styles.bankRow}>
                  <Text style={[styles.bankLabel, c.muted]}>Sort Code</Text>
                  <Text style={[styles.bankValue, c.text]}>{data.paymentDetails.sortCode}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.totalsBox]}>
            {totalsLines.map((line, idx) => (
              <View key={`total-${idx}`} style={styles.totalRow}>
                <Text style={[styles.totalLabel, c.muted]}>{line.label}</Text>
                <PdfCurrencyText
                  value={line.value}
                  style={[styles.totalValue, c.text]}
                />
              </View>
            ))}

            {mainTotal ? (
              <View style={[styles.totalFinal, c.border]}>
                <Text style={[styles.totalFinalLabel, c.text, c.headerFont]}>
                  {mainTotal.label}
                </Text>
                <PdfCurrencyText
                  value={mainTotal.value}
                  style={[styles.totalFinalValue, c.text, c.headerFont]}
                />
              </View>
            ) : null}

            {amountInWords ? (
              <Text style={[styles.amountWords, c.muted]}>
                {amountInWords}
              </Text>
            ) : null}

            {balanceDue ? (
              <View style={styles.balanceDue}>
                <Text style={[styles.balanceDueText, c.text, c.headerFont]}>
                  {balanceDue.label}
                </Text>
                <PdfCurrencyText
                  value={balanceDue.value}
                  style={[styles.balanceDueValue, c.text, c.headerFont]}
                />
              </View>
            ) : null}

            {advanceSummary ? (
              <View style={[styles.advanceBox, c.border]}>
                {advanceSummary.advanceAmount ? (
                  <View style={styles.advanceRow}>
                    <Text style={[styles.advanceProminentLabel, c.accent, c.headerFont]}>
                      {advanceSummary.primaryLabel}
                    </Text>
                    <PdfCurrencyText
                      value={advanceSummary.advanceAmount}
                      style={[styles.advanceProminentValue, c.accent, c.headerFont]}
                    />
                  </View>
                ) : null}

                {advanceSummary.balanceRemaining ? (
                  <View style={styles.advanceRow}>
                    <Text style={[styles.advanceLabel, c.muted]}>
                      {advanceSummary.secondaryLabel}
                    </Text>
                    <PdfCurrencyText
                      value={advanceSummary.balanceRemaining}
                      style={[styles.advanceValue, c.text]}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Notes ──────────────────────────────────────── */}
      {data.notes?.content ? (
        <View style={styles.optionalSection}>
          {data.notes.title ? <Text style={[styles.optionalTitle, c.accent, c.headerFont]}>{data.notes.title}</Text> : null}
          {renderPdfRichText(data.notes.content, {
            containerStyle: styles.optionalRichText,
            paragraphStyle: styles.optionalParagraph,
            listStyle: styles.optionalList,
            listItemRowStyle: styles.optionalListItemRow,
            listMarkerStyle: styles.optionalListMarker,
            listItemTextStyle: styles.optionalListItemText,
            fallbackTextStyle: styles.optionalText,
          }) || <Text style={[styles.optionalText, c.muted]}>{data.notes.plainText || ''}</Text>}
        </View>
      ) : null}

      {/* ── Terms ──────────────────────────────────────── */}
      {data.terms?.content ? (
        <View style={styles.optionalSection}>
          {data.terms.title ? <Text style={[styles.optionalTitle, c.accent, c.headerFont]}>{data.terms.title}</Text> : null}
          {renderPdfRichText(data.terms.content, {
            containerStyle: styles.optionalRichText,
            paragraphStyle: styles.optionalParagraph,
            listStyle: styles.optionalList,
            listItemRowStyle: styles.optionalListItemRow,
            listMarkerStyle: styles.optionalListMarker,
            listItemTextStyle: styles.optionalListItemText,
            fallbackTextStyle: styles.optionalText,
          }) || <Text style={[styles.optionalText, c.muted]}>{data.terms.plainText || ''}</Text>}
        </View>
      ) : null}

      {/* ── Attachments ────────────────────────────────── */}
      {data.attachments.length > 0 ? (
        <View style={styles.optionalSection}>
          <Text style={[styles.optionalTitle, c.accent, c.headerFont]}>Attachments</Text>
          <View style={styles.attachmentsWrap}>
            {CrestOptionalList(data.attachments)}
          </View>
        </View>
      ) : null}

      {/* ── Additional Fields ──────────────────────────── */}
      {data.additionalFields.length > 0 ? (
        <View style={styles.optionalSection}>
          <View style={styles.additionalWrap}>
            {data.additionalFields.map((field, idx) => (
              <View key={`add-${idx}`} style={styles.additionalRow}>
                <Text style={[styles.additionalLabel, c.muted]}>{field.label}</Text>
                <Text style={[styles.additionalValue, c.text]}>{field.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── Signature ──────────────────────────────────── */}
      {data.signature && (data.signature.imageUrl || data.signature.name) ? (
        <View style={styles.signatureWrap} wrap={false}>
          <View style={styles.signatureBox}>
            {typeof data.signature.imageUrl === 'string' &&
            data.signature.imageUrl.trim() ? (
              <Image
                src={{
                  uri: data.signature.imageUrl,
                  method: 'GET',
                  headers: {},
                }}
                style={styles.signatureImage}
              />
            ) : null}
            <View style={[styles.signatureLine, c.border]} />
            {data.signature.name ? <Text style={[styles.signerName, c.text, c.headerFont]}>{data.signature.name}</Text> : null}
            {data.signature.role ? <Text style={[styles.signerRole, c.muted]}>{data.signature.role}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* ── Footer ─────────────────────────────────────── */}
      {footerVisible ? (
        <View style={[styles.footerZone, c.surface]} fixed>
          {data.footer.extraText ? <Text style={[styles.footerExtraText, c.muted]}>{data.footer.extraText}</Text> : null}
          {data.showTagline && data.company?.tagline ? (
            <Text style={[styles.taglineFooter, c.muted]}>{data.company.tagline}</Text>
          ) : null}
          <View style={styles.documentFooter}>
            <Text
              style={[styles.footerText, c.muted]}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              fixed
            />
            <Text style={[styles.footerText, c.muted]}>{data.footer.documentNumber || data.documentNumber}</Text>
            <Text style={[styles.footerText, c.muted]}>{data.footer.companyName || data.company?.name || ''}</Text>
          </View>
        </View>
      ) : null}
    </Page>
  )
}
