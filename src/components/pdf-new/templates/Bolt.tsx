import React from 'react'
import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import { darkenHex, lightenHex } from '@/lib/pdfDesignPreset'
import type { IndustryTemplateData } from '../industryAdapter'
import { PdfCurrencyText } from '../pdfCurrency'
import { styles } from './BoltStyles'
import { safeText } from '../core/safeText'
import { getDescriptionMain, getDescriptionSub } from '../core/description'

const DEFAULT_ACCENT = '#1a56db'

export default function Bolt({ data }: { data: IndustryTemplateData }) {
  const design = data.design
  const accent = design.accentColor || DEFAULT_ACCENT
  const ink = design.textColor || '#0f172a'
  const muted = design.mutedColor || '#64748b'
  const surface = design.surfaceColor || '#f8fafc'
  const accentTint = lightenHex(accent, 90)
  const accentRule = lightenHex(accent, 78)
  const accentLink = darkenHex(accent, 12)

  const documentLabel = data.customTitle || data.title || 'Invoice'
  const documentTitle = data.title || 'INVOICE'
  const displayColumns = (data.table.columns || []).filter((column) => column.key !== 'num')
  const rows = data.table.rows || []
  const headerFields = [
    data.poNumber ? { label: data.poNumberLabel || 'PO Number', value: data.poNumber } : null,
    ...data.customHeaderFields,
  ].filter((field): field is { label: string; value: string | null | undefined } => Boolean(field?.value))

  return (
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={styles.page}>
      <View fixed style={[styles.footer, { backgroundColor: surface }]}>
        <Text style={[styles.footerLeft, { color: ink }]}>{safeText(data.footer.documentNumber || data.documentNumber)}</Text>
        <Text
          style={styles.footerCenter}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <Text style={styles.footerRight}>{safeText(data.footer.companyName || data.company?.name || '')}</Text>
      </View>

      <View style={[styles.headerBanner, { backgroundColor: accent }]}>
        <View style={styles.headerBannerBottomLine} />

        <View style={styles.headerLeft}>
          {data.company?.companyLogoUrl ? (
            <Image src={data.company.companyLogoUrl} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={[styles.logoText, { color: accent }]}>
                {data.company?.name
                  ? `${data.company.name.charAt(0)}${data.company.name.split(' ')[1]?.charAt(0) || ''}`
                  : 'BD'}
              </Text>
            </View>
          )}

          <Text style={styles.companyName}>{safeText(data.company?.name || 'Company Name')}</Text>
          <Text style={styles.companyContact}>
            {safeText(data.company?.address || '')}
            {data.company?.cityState ? `\n${safeText(data.company.cityState)}` : ''}
            {(data.company?.phone || data.company?.email) ? '\n' : ''}
            {safeText(data.company?.phone || '')}
            {data.company?.phone && data.company?.email ? ' · ' : ''}
            {safeText(data.company?.email || '')}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.documentLabel}>{safeText(documentLabel)}</Text>
          <Text style={styles.documentTitle}>{safeText(documentTitle)}</Text>

          <View style={styles.metaStack}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>{safeText(data.documentNumberLabel)}</Text>
              <Text style={styles.metaValue}>{safeText(data.documentNumber)}</Text>
            </View>
            {data.issueDate ? (
              <View style={[styles.metaLine, styles.metaLineGap]}>
                <Text style={styles.metaLabel}>{safeText(data.issueDateLabel)}</Text>
                <Text style={styles.metaValue}>{safeText(data.issueDate)}</Text>
              </View>
            ) : null}
            {data.dueDateOrValidityDate ? (
              <View style={[styles.metaLine, styles.metaLineGap]}>
                <Text style={styles.metaLabel}>{safeText(data.dueDateOrValidityDateLabel)}</Text>
                <Text style={styles.metaValue}>{safeText(data.dueDateOrValidityDate)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.addressRow}>
        <View style={styles.addressColumn}>
          <Text style={[styles.addressLabel, { color: muted }]}>Bill To</Text>
          <Text style={[styles.addressName, { color: ink }]}>{safeText(data.client?.name || '—')}</Text>
          <Text style={[styles.addressDetail, { color: darkenHex(muted, 4) }]}>
            {safeText(data.client?.address || '—')}
            {data.client?.cityState ? `\n${safeText(data.client.cityState)}` : ''}
            {data.client?.phone ? `\n${safeText(data.client.phone)}` : ''}
            {data.client?.email ? `${data.client?.phone ? ' · ' : '\n'}${safeText(data.client.email)}` : ''}
          </Text>
        </View>

        <View style={styles.addressColumnLast}>
          <Text style={[styles.addressLabel, { color: muted }]}>Our Reference</Text>
          <Text style={[styles.addressName, { color: ink }]}>{safeText(data.company?.name || '—')}</Text>
          <Text style={[styles.addressDetail, { color: darkenHex(muted, 4) }]}>
            {data.company?.customInfo?.length
              ? data.company.customInfo.map((entry) => `${safeText(entry.label)}: ${safeText(entry.value)}`).join(' · ')
              : '—'}
          </Text>
        </View>
      </View>

      {headerFields.length > 0 ? (
        <View style={[styles.customStrip, { backgroundColor: surface }]}>
          {headerFields.map((field, index) => (
            <View key={`${field.label}-${index}`} style={styles.customFieldItem}>
              <Text style={[styles.customFieldKey, { color: muted }]}>{safeText(field.label)}</Text>
              <Text style={[styles.customFieldValue, { color: ink }]}>{safeText(field.value)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
          {displayColumns.map((column) => {
            const alignStyle =
              column.align === 'right'
                ? styles.alignRight
                : column.align === 'center'
                  ? styles.alignCenter
                  : null
            const widthStyle = column.width ? { width: column.width } : column.flex ? { flex: column.flex } : { flex: 1 }

            return (
              <Text key={column.key} style={[styles.tableHeaderCell, widthStyle, alignStyle]}>
                {safeText(column.label)}
              </Text>
            )
          })}
        </View>

        {rows.map((row, rowIndex) => {
          if (row.isGroupHeader) {
            return (
              <View
                key={`group-header-${rowIndex}`}
                style={[styles.groupHeaderRow, { backgroundColor: accentTint, borderBottomColor: accentRule }]}
              >
                <Text style={[styles.groupHeaderText, { color: accent }]}>{safeText(row.groupLabel || '')}</Text>
              </View>
            )
          }

          if (row.isGroupFooter && row.showSubtotal) {
            return (
              <View key={`group-footer-${rowIndex}`} style={styles.groupSubtotalRow}>
                <View style={styles.groupSubtotalSpacer} />
                <Text style={[styles.groupSubtotalLabel, { color: ink }]}>Group Total:</Text>
                <PdfCurrencyText value={safeText(row.groupSubtotalValue || '')} style={[styles.groupSubtotalValue, { color: ink }]} />
              </View>
            )
          }

          const cells = row.cells || {}

          return (
            <View key={`row-${rowIndex}`} style={[styles.tableRow, row.isInGroup ? styles.groupItemRow : null]} wrap={false}>
              <Text style={[styles.tableCellBase, styles.colNum, styles.alignCenter]}>{safeText(cells.num)}</Text>

              {displayColumns.map((column) => {
                const rawValue = cells[column.key]
                const widthStyle = column.width ? { width: column.width } : column.flex ? { flex: column.flex } : { flex: 1 }
                const alignStyle =
                  column.align === 'right'
                    ? styles.alignRight
                    : column.align === 'center'
                      ? styles.alignCenter
                      : null

                if (column.key === 'description') {
                  return (
                    <View
                      key={column.key}
                      style={[
                        styles.tableCellBase,
                        widthStyle,
                        row.isInGroup ? styles.groupDescriptionCell : null,
                      ]}
                    >
                      {row.isInGroup ? (
                        <Text style={[styles.groupItemPrefix, { color: accent }]}>└</Text>
                      ) : null}
                      <Text style={[styles.itemTitle, { color: ink }]}>{getDescriptionMain(cells)}</Text>
                      {getDescriptionSub(cells) ? (
                        <Text style={[styles.itemSub, { color: darkenHex(muted, 4) }]}>{getDescriptionSub(cells)}</Text>
                      ) : null}
                      {row.imageUrl ? (
                        <View style={styles.thumbnailRow}>
                          <Image src={row.imageUrl} style={styles.thumbnailImg} />
                          <Link
                            src={row.imageUrl}
                            style={[
                              styles.openImageLink,
                              { color: accentLink, backgroundColor: accentTint },
                            ]}
                          >
                            Open image
                          </Link>
                        </View>
                      ) : null}
                    </View>
                  )
                }

                const textStyle =
                  column.key === 'make'
                    ? styles.makeCell
                    : column.key === 'model'
                      ? styles.modelCell
                      : column.key === 'qty'
                        ? styles.qtyCell
                        : column.key === 'unit_price'
                          ? styles.priceCell
                          : column.key === 'amount'
                            ? styles.amountCell
                            : styles.tableCellText

                return (
                  <View key={column.key} style={[styles.tableCellBase, widthStyle]}>
                    <PdfCurrencyText value={safeText(rawValue)} style={[textStyle, alignStyle, { color: ink }]} />
                  </View>
                )
              })}
            </View>
          )
        })}
      </View>

      <View style={[styles.bottomPanel, { borderTopColor: '#e2e8f0' }]}>
        <View style={styles.bottomColumn}>
          {data.showBankDetails && data.paymentDetails ? (
            <>
              <Text style={[styles.sectionTitle, { color: accent, borderBottomColor: accentRule }]}>Payment</Text>
              <View style={styles.bankLine}>
                <Text style={[styles.bankLabel, { color: darkenHex(muted, 4) }]}>Bank</Text>
                <Text style={[styles.bankValue, { color: ink }]}>{safeText(data.paymentDetails.bankName)}</Text>
              </View>
              <View style={styles.bankLine}>
                <Text style={[styles.bankLabel, { color: darkenHex(muted, 4) }]}>Account</Text>
                <Text style={[styles.bankValue, { color: ink }]}>{safeText(data.paymentDetails.accountName)}</Text>
              </View>
              <View style={styles.bankLine}>
                <Text style={[styles.bankLabel, { color: darkenHex(muted, 4) }]}>No.</Text>
                <Text style={[styles.bankValue, { color: ink }]}>{safeText(data.paymentDetails.accountNumber)}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.bottomColumn}>
          {data.notes ? (
            <>
              <Text style={[styles.sectionTitle, { color: accent, borderBottomColor: accentRule }]}>
                {safeText(data.notes.title || 'Notes')}
              </Text>
              <Text style={[styles.textBlock, { color: darkenHex(muted, 4) }]}>{safeText(data.notes.content)}</Text>
            </>
          ) : null}
          {data.terms ? (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  styles.sectionTitleGap,
                  { color: accent, borderBottomColor: accentRule },
                ]}
              >
                {safeText(data.terms.title || 'Terms')}
              </Text>
              <Text style={[styles.textBlock, { color: darkenHex(muted, 4) }]}>{safeText(data.terms.content)}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.bottomColumnLast}>
          {data.attachments.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: accent, borderBottomColor: accentRule }]}>Attachments</Text>
              {data.attachments.map((attachment, index) =>
                attachment.url ? (
                  <Link
                    key={`${attachment.label || 'attachment'}-${index}`}
                    src={attachment.url}
                    style={[styles.attachmentLink, { color: accentLink }]}
                  >
                    {safeText(attachment.label || attachment.url)}
                  </Link>
                ) : (
                  <Text key={`${attachment.label || 'attachment'}-${index}`} style={[styles.textBlock, { color: darkenHex(muted, 4) }]}>
                    {safeText(attachment.label)}
                  </Text>
                ),
              )}
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.totalsSignatureRow} wrap={false}>
        <View style={styles.leftSection}>
          <View style={styles.totalsGrid}>
            {data.totals.lines.map((line) => (
              <React.Fragment key={line.label}>
                <Text style={[styles.totalsLabel, { color: darkenHex(muted, 4) }]}>{safeText(line.label)}</Text>
                <PdfCurrencyText value={safeText(line.value)} style={[styles.totalsValue, { color: ink }]} />
              </React.Fragment>
            ))}

            {data.totals.mainLine ? (
              <>
                <Text style={[styles.totalsGrandLabel, { color: ink }]}>{safeText(data.totals.mainLine.label)}</Text>
                <PdfCurrencyText value={safeText(data.totals.mainLine.value)} style={[styles.totalsGrandValue, { color: ink }]} />
              </>
            ) : null}

            {data.totals.amountInWords ? (
              <Text style={[styles.amountWords, { color: muted }]}>{safeText(data.totals.amountInWords)}</Text>
            ) : null}

            {data.totals.balanceDue ? (
              <>
                <Text style={[styles.balanceDueLabel, { color: darkenHex(muted, 4) }]}>{safeText(data.totals.balanceDue.label)}</Text>
                <PdfCurrencyText value={safeText(data.totals.balanceDue.value)} style={[styles.balanceDueValue, { color: ink }]} />
              </>
            ) : null}
          </View>

          {data.advanceSummary ? (
            <View style={[styles.advanceBlock, { backgroundColor: accentTint, borderLeftColor: accent }]}>
              <View style={styles.advanceColumn}>
                <Text style={[styles.advanceLabel, { color: darkenHex(muted, 4) }]}>
                  {safeText(data.advanceSummary.primaryLabel || 'Advance')}
                </Text>
                <PdfCurrencyText value={safeText(data.advanceSummary.advanceAmount || '')} style={[styles.advanceValue, { color: accent }]} />
              </View>
              {data.advanceSummary.secondaryLabel && data.advanceSummary.balanceRemaining ? (
                <>
                  <View style={[styles.advanceDivider, { backgroundColor: accentRule }]} />
                  <View style={styles.advanceColumn}>
                    <Text style={[styles.advanceLabel, { color: darkenHex(muted, 4) }]}>
                      {safeText(data.advanceSummary.secondaryLabel)}
                    </Text>
                    <PdfCurrencyText value={safeText(data.advanceSummary.balanceRemaining)} style={[styles.advanceValue, { color: accent }]} />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.rightSection}>
          {data.additionalFields.length > 0 ? (
            <View style={styles.extraFieldsVertical}>
              {data.additionalFields.map((field, index) => (
                <View key={`${field.label}-${index}`} style={styles.extraFieldItem}>
                  <Text style={[styles.extraFieldKey, { color: muted }]}>{safeText(field.label)}</Text>
                  <Text style={[styles.extraFieldValue, { color: ink }]}>{safeText(field.value)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {data.signature?.name || data.signature?.imageUrl ? (
            <View style={styles.signatureBox}>
              {data.signature?.imageUrl ? (
                <Image src={data.signature.imageUrl} style={styles.signatureImage} />
              ) : (
                <Text style={[styles.signatureScribble, { color: ink }]}>{safeText(data.signature?.name || '')}</Text>
              )}
              {data.signature?.name ? <Text style={[styles.signatureName, { color: ink }]}>{safeText(data.signature.name)}</Text> : null}
              {data.signature?.role ? <Text style={[styles.signatureRole, { color: muted }]}>{safeText(data.signature.role)}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
    </Page>
  )
}
