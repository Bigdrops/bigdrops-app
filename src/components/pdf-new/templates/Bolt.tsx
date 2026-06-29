import React from 'react'
import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import {
  styles,
  INK,
  ACCENT,
  GOLD,
  GOLD_DIM,
  PAPER,
  WHITE,
  DEEP_PINE,
  MUTED_TEXT,
  BOLT_SERIF,
  BOLT_SANS,
} from './BoltStyles'
import { renderPdfRichText } from '../core/pdfRichText'
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

function BoltPartyCard({
  title,
  party,
}: {
  title: string
  party: NonNullable<CommercialDocumentData['company']>
}) {
  const lines = buildPartyLines(party)

  return (
    <View style={styles.partyBox}>
      <Text style={styles.partyTitle}>{title}</Text>
      {lines.map((line, idx) => {
        if (line.type === 'name') {
          return (
            <Text key={line.key} style={styles.partyName}>
              {line.value}
            </Text>
          )
        }
        return (
          <Text key={`${line.key}-${idx}`} style={styles.partyLine}>
            {line.value}
          </Text>
        )
      })}
    </View>
  )
}

function BoltOptionalList(items: CommercialDocumentData['attachments']) {
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

export default function Bolt({ data }: { data: CommercialDocumentData }) {
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

  const customFields = data.customHeaderFields ?? []
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
    data.title || metaRows.length > 0 || data.company?.companyLogoUrl,
  )

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
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={styles.page}>
      {/* ── Seal Band ───────────────────────────────────── */}
      {showHeader ? (
        <>
          <View style={styles.sealBand}>
            <View style={styles.sealContent}>
              <View style={styles.sealLeft}>
                <View style={styles.sealBadge}>
                  <Text style={styles.sealBadgeText}>Verified Document</Text>
                </View>
                <Text style={styles.sealDocumentType}>
                  {data.customTitle || data.title}
                </Text>
                <Text style={styles.sealTitle}>{data.title}</Text>
              </View>
              <View style={styles.sealRight}>
                {data.documentNumber ? (
                  <>
                    <Text style={styles.sealNumber}>{data.documentNumberLabel}</Text>
                    <Text style={styles.sealNumberValue}>{data.documentNumber}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.goldRule} />
        </>
      ) : null}

      {/* ── Company / Title Block ──────────────────────── */}
      {data.company?.name ? (
        <View style={styles.headerBlock}>
          <Text style={styles.companyName}>{data.company.name}</Text>
          {data.company.tagline ? (
            <Text style={styles.tagline}>{data.company.tagline}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Meta Chips ─────────────────────────────────── */}
      {metaRows.length > 0 ? (
        <View style={styles.metaGrid}>
          {metaRows.map((row, idx) => (
            <View key={`meta-${idx}`} style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>{row.label}</Text>
              <Text style={styles.metaChipValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Party / Address Block ──────────────────────── */}
      {(data.company || data.client) ? (
        <View style={styles.partyRow}>
          {data.company ? (
            <BoltPartyCard title="From" party={data.company} />
          ) : null}
          {data.client ? (
            <View style={styles.partyBox}>
              <Text style={styles.partyTitle}>To</Text>
              {data.client.name ? (
                <Text style={styles.partyName}>{data.client.name}</Text>
              ) : null}
              {data.client.address ? (
                <Text style={styles.partyLine}>{data.client.address}</Text>
              ) : null}
              {data.client.cityState ? (
                <Text style={styles.partyLine}>{data.client.cityState}</Text>
              ) : null}
              {data.client.phone ? (
                <Text style={styles.partyLine}>{data.client.phone}</Text>
              ) : null}
              {data.client.email ? (
                <Text style={styles.partyLine}>{data.client.email}</Text>
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
              <Text style={styles.customFieldLabel}>{field.label}</Text>
              <Text style={styles.customFieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Table ──────────────────────────────────────── */}
      {(data.table.columns?.length ?? 0) > 0 && (data.table.rows?.length ?? 0) > 0 ? (
        <View style={styles.tableWrap}>
          <View style={styles.tableHeaderRow} fixed>
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
                  style={styles.groupHeaderRow}
                  wrap={false}
                >
                  <Text style={styles.groupHeaderText}>
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
                  <View style={styles.groupSubtotalRow}>
                    <Text style={styles.groupSubtotalLabel}>
                      Subtotal
                    </Text>
                    <PdfCurrencyText
                      value={subtotalValue}
                      style={styles.groupSubtotalValue}
                    />
                  </View>
                  <View style={styles.groupClosingRule} wrap={false} />
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
                          <Text style={styles.descriptionMain}>{getDescriptionMain(cell)}</Text>
                          {getDescriptionSub(cell) ? (
                            <Text style={styles.descriptionSub}>{getDescriptionSub(cell)}</Text>
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
                          style={[styles.tightCellText, styles.qtyUnitToken, alignStyle || { textAlign: 'center' }]}
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
              <Text style={styles.bankTitle}>Bank Details</Text>
              {data.paymentDetails.bankName ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.bankName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountName ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Name</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.accountName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountNumber ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Number</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.accountNumber}</Text>
                </View>
              ) : null}
              {data.paymentDetails.sortCode ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Sort Code</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.sortCode}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.totalsBox}>
            {totalsLines.map((line, idx) => (
              <View key={`total-${idx}`} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{line.label}</Text>
                <PdfCurrencyText
                  value={line.value}
                  style={styles.totalValue}
                />
              </View>
            ))}

            {mainTotal ? (
              <View style={styles.totalFinal}>
                <Text style={styles.totalFinalLabel}>
                  {mainTotal.label}
                </Text>
                <PdfCurrencyText
                  value={mainTotal.value}
                  style={styles.totalFinalValue}
                />
              </View>
            ) : null}

            {amountInWords ? (
              <Text style={styles.amountWords}>
                {amountInWords}
              </Text>
            ) : null}

            {balanceDue ? (
              <View style={styles.balanceDue}>
                <Text style={styles.balanceDueText}>
                  {balanceDue.label}
                </Text>
                <PdfCurrencyText
                  value={balanceDue.value}
                  style={styles.balanceDueValue}
                />
              </View>
            ) : null}

            {advanceSummary ? (
              <View style={styles.advanceBox}>
                {advanceSummary.advanceAmount ? (
                  <View style={styles.advanceRow}>
                    <Text style={styles.advanceProminentLabel}>
                      {advanceSummary.primaryLabel}
                    </Text>
                    <PdfCurrencyText
                      value={advanceSummary.advanceAmount}
                      style={styles.advanceProminentValue}
                    />
                  </View>
                ) : null}

                {advanceSummary.balanceRemaining ? (
                  <View style={styles.advanceRow}>
                    <Text style={styles.advanceLabel}>
                      {advanceSummary.secondaryLabel}
                    </Text>
                    <PdfCurrencyText
                      value={advanceSummary.balanceRemaining}
                      style={styles.advanceValue}
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
          {data.notes.title ? <Text style={styles.optionalTitle}>{data.notes.title}</Text> : null}
          {renderPdfRichText(data.notes.content, {
            containerStyle: styles.optionalRichText,
            paragraphStyle: styles.optionalParagraph,
            listStyle: styles.optionalList,
            listItemRowStyle: styles.optionalListItemRow,
            listMarkerStyle: styles.optionalListMarker,
            listItemTextStyle: styles.optionalListItemText,
            fallbackTextStyle: styles.optionalText,
          }) || <Text style={styles.optionalText}>{data.notes.plainText || ''}</Text>}
        </View>
      ) : null}

      {/* ── Terms ──────────────────────────────────────── */}
      {data.terms?.content ? (
        <View style={styles.optionalSection}>
          {data.terms.title ? <Text style={styles.optionalTitle}>{data.terms.title}</Text> : null}
          {renderPdfRichText(data.terms.content, {
            containerStyle: styles.optionalRichText,
            paragraphStyle: styles.optionalParagraph,
            listStyle: styles.optionalList,
            listItemRowStyle: styles.optionalListItemRow,
            listMarkerStyle: styles.optionalListMarker,
            listItemTextStyle: styles.optionalListItemText,
            fallbackTextStyle: styles.optionalText,
          }) || <Text style={styles.optionalText}>{data.terms.plainText || ''}</Text>}
        </View>
      ) : null}

      {/* ── Attachments ────────────────────────────────── */}
      {(data.attachments?.length ?? 0) > 0 ? (
        <View style={styles.optionalSection}>
          <Text style={styles.optionalTitle}>Attachments</Text>
          <View style={styles.attachmentsWrap}>
            {BoltOptionalList(data.attachments)}
          </View>
        </View>
      ) : null}

      {/* ── Additional Fields ──────────────────────────── */}
      {(data.additionalFields?.length ?? 0) > 0 ? (
        <View style={styles.optionalSection}>
          <View style={styles.additionalWrap}>
            {data.additionalFields.map((field, idx) => (
              <View key={`add-${idx}`} style={styles.additionalRow}>
                <Text style={styles.additionalLabel}>{field.label}</Text>
                <Text style={styles.additionalValue}>{field.value}</Text>
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
            <View style={styles.signatureLine} />
            {data.signature.name ? <Text style={styles.signerName}>{data.signature.name}</Text> : null}
            {data.signature.role ? <Text style={styles.signerRole}>{data.signature.role}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* ── Footer ─────────────────────────────────────── */}
      {footerVisible ? (
        <View style={styles.footerZone} fixed>
          <View style={styles.footerRule} />
          {data.footer.extraText ? <Text style={styles.footerExtraText}>{data.footer.extraText}</Text> : null}
          {data.showTagline && data.company?.tagline ? (
            <Text style={styles.taglineFooter}>{data.company.tagline}</Text>
          ) : null}
          <View style={styles.documentFooter}>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              fixed
            />
            <Text style={styles.footerText}>{data.footer.documentNumber || data.documentNumber}</Text>
            <Text style={styles.footerText}>{data.footer.companyName || data.company?.name || ''}</Text>
          </View>
        </View>
      ) : null}
    </Page>
  )
}
