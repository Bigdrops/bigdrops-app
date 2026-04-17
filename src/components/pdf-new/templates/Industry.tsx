import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import type { IndustryTemplateData } from '../industryAdapter'
import {
  getCellText,
  getDescriptionMain,
  getDescriptionSub,
  resolveIndustryColumnStyle,
  resolveTextAlignmentStyle,
  styles,
} from './industryStyles'

type TemplateProps = {
  data: IndustryTemplateData
}

function renderOptionalList(items: IndustryTemplateData['attachments']) {
  return items.map((item, idx) => {
    if (typeof item === 'string') {
      return (
        <Text key={`attach-${idx}`} style={styles.attachmentItem}>
          - {item}
        </Text>
      )
    }

    if (item?.url && item?.label) {
      return (
        <Link
          key={`attach-${idx}`}
          src={item.url}
          style={styles.attachmentLink}
        >
          {item.label}
        </Link>
      )
    }

    if (item?.label) {
      return (
        <Text key={`attach-${idx}`} style={styles.attachmentItem}>
          - {item.label}
        </Text>
      )
    }

    if (item?.url) {
      return (
        <Link
          key={`attach-${idx}`}
          src={item.url}
          style={styles.attachmentLink}
        >
          {item.url}
        </Link>
      )
    }

    return null
  })
}

export default function IndustryTemplate({ data }: TemplateProps) {
  // ─── DESIGN TOKENS ─────────────────────────────────────────────
  const design = data?.design || {}
  const accentColor = design.useCustomColors && design.accentColor ? design.accentColor : null
  const textColor = design.useCustomColors && design.textColor ? design.textColor : null
  const mutedColor = design.useCustomColors && design.mutedColor ? design.mutedColor : null
  const borderColor = design.useCustomColors && design.borderColor ? design.borderColor : null
  const surfaceColor = design.useCustomColors && design.surfaceColor ? design.surfaceColor : null
  const headerFontFamily = design.useCustomFonts && design.headerFont ? design.headerFont : undefined
  const bodyFontFamily = design.useCustomFonts && design.bodyFont ? design.bodyFont : undefined

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
  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)
  const footerVisible = Boolean(
    data.footer.extraText ||
    data.showTagline ||
    data.footer.documentNumber ||
    data.footer.companyName,
  )

  return (
    <Page size="A4" style={styles.page}>
      {(data.title || metaRows.length > 0 || data.company?.logoUrl) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              style={[
                styles.title,
                textColor ? { color: textColor } : null,
                headerFontFamily ? { fontFamily: headerFontFamily } : null,
              ]}
            >
              {data.title}
            </Text>
            {data.customTitle ? (
              <Text
                style={[
                  styles.customTitle,
                  mutedColor ? { color: mutedColor } : null,
                  bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                ]}
              >
                {data.customTitle}
              </Text>
            ) : null}

            {metaRows.length > 0 ? (
              <View style={styles.metaList}>
                {metaRows.map((row, idx) => (
                  <View key={`meta-${idx}`} style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaLabel,
                        mutedColor ? { color: mutedColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        textColor ? { color: textColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.customHeaderFields.map((field, idx) => (
              <View key={`custom-meta-${idx}`} style={styles.metaRow}>
                <Text
                  style={[
                    styles.metaLabel,
                    mutedColor ? { color: mutedColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {field.label}
                </Text>
                <Text
                  style={[
                    styles.metaValue,
                    textColor ? { color: textColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {field.value}
                </Text>
              </View>
            ))}
          </View>

          {data.company?.logoUrl ? (
            <View style={styles.headerRight}>
              <Image src={data.company.logoUrl} style={styles.logo} />
            </View>
          ) : null}
        </View>
      )}

      {(data.company || data.client) ? (
        <View style={styles.partyRow}>
          {data.company ? (
            <View
              style={[
                styles.partyBox,
                surfaceColor ? { backgroundColor: surfaceColor } : null,
                borderColor ? { borderColor } : null,
              ]}
            >
              <Text
                style={[
                  styles.partyTitle,
                  textColor ? { color: textColor } : null,
                  headerFontFamily ? { fontFamily: headerFontFamily } : null,
                ]}
              >
                From
              </Text>
              {data.company.name ? <Text style={styles.partyName}>{data.company.name}</Text> : null}
              {data.company.address ? <Text style={styles.partyLine}>{data.company.address}</Text> : null}
              {data.company.cityState ? <Text style={styles.partyLine}>{data.company.cityState}</Text> : null}
              {data.company.phone ? <Text style={styles.partyLine}>{data.company.phone}</Text> : null}
              {data.company.email ? <Text style={styles.partyLine}>{data.company.email}</Text> : null}

              {data.company.customInfo.length > 0 ? (
                <View style={styles.customInfoWrap}>
                  {data.company.customInfo.map((entry, idx) => (
                    <View key={`company-extra-${idx}`} style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{entry.label}</Text>
                      <Text style={styles.metaValue}>{entry.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {data.client ? (
            <View
              style={[
                styles.partyBox,
                styles.partyBoxLast,
                surfaceColor ? { backgroundColor: surfaceColor } : null,
                borderColor ? { borderColor } : null,
              ]}
            >
              <Text
                style={[
                  styles.partyTitle,
                  textColor ? { color: textColor } : null,
                  headerFontFamily ? { fontFamily: headerFontFamily } : null,
                ]}
              >
                To
              </Text>
              {data.client.name ? <Text style={styles.partyName}>{data.client.name}</Text> : null}
              {data.client.address ? <Text style={styles.partyLine}>{data.client.address}</Text> : null}
              {data.client.cityState ? <Text style={styles.partyLine}>{data.client.cityState}</Text> : null}
              {data.client.phone ? <Text style={styles.partyLine}>{data.client.phone}</Text> : null}
              {data.client.email ? <Text style={styles.partyLine}>{data.client.email}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
        <View style={styles.tableWrap}>
          <View style={styles.tableHeaderRow} fixed>
            {data.table.columns.map((column, idx) => {
              const columnStyle = resolveIndustryColumnStyle(column)
              const alignStyle = resolveTextAlignmentStyle(column)

              return (
                <Text
                  key={`head-${idx}`}
                  style={[
                    styles.tableHeaderCell,
                    columnStyle,
                    alignStyle,
                    surfaceColor ? { backgroundColor: surfaceColor } : null,
                    headerFontFamily ? { fontFamily: headerFontFamily } : null,
                  ]}
                >
                  {column.label}
                </Text>
              )
            })}
          </View>

          {data.table.rows.map((row, rowIdx) => {
            if (row.isGroupHeader) {
              return (
                <View key={`group-${rowIdx}`} style={[styles.tableRow, styles.tableGroupRow]}>
                  <Text style={[styles.tableCell, styles.groupCell, { flex: 1 }]}>
                    {row.groupName || row.groupLabel || ''}
                  </Text>
                </View>
              )
            }

            return (
              <View
                key={`row-${rowIdx}`}
                style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowEven : null]}
                wrap={false}
              >
                {data.table.columns.map((column, colIdx) => {
                  const cell = row.cells?.[column.key]
                  const columnStyle = resolveIndustryColumnStyle(column)
                  const alignStyle = resolveTextAlignmentStyle(column)
                  const isDescription = column.key === 'description'
                  const isMake = column.key === 'make'

                  return (
                    <View
                      key={`cell-${rowIdx}-${colIdx}`}
                      style={[styles.tableCell, columnStyle, alignStyle]}
                    >
                      {isDescription ? (
                        <>
                          {row.imageUrl ? (
                            <>
                              <Image src={row.imageUrl} style={styles.imageThumb} />
                              <Link src={row.imageUrl} style={styles.imageLink}>
                                Open image
                              </Link>
                            </>
                          ) : null}
                          <Text style={styles.descriptionMain}>{getDescriptionMain(cell)}</Text>
                          {getDescriptionSub(cell) ? (
                            <Text style={styles.descriptionSub}>{getDescriptionSub(cell)}</Text>
                          ) : null}
                        </>
                      ) : isMake ? (
                        <Text style={styles.makeText}>{getCellText(cell)}</Text>
                      ) : (
                        <Text style={alignStyle}>{getCellText(cell)}</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>
      ) : null}

      {(hasBankDetails || data.totals.lines.length > 0 || data.advanceSummary || data.totals.mainLine || data.totals.amountInWords || data.totals.balanceDue) ? (
        <View style={[styles.closingRow, !hasBankDetails ? styles.closingRowNoBank : null]} wrap={false}>
          {hasBankDetails && data.paymentDetails ? (
            <View
              style={[
                styles.bankBox,
                surfaceColor ? { backgroundColor: surfaceColor } : null,
                borderColor ? { borderColor } : null,
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  textColor ? { color: textColor } : null,
                  headerFontFamily ? { fontFamily: headerFontFamily } : null,
                ]}
              >
                Bank Details
              </Text>
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

          <View
            style={[
              styles.totalsBox,
              !hasBankDetails ? styles.totalsBoxSolo : null,
              surfaceColor ? { backgroundColor: surfaceColor } : null,
              borderColor ? { borderColor } : null,
            ]}
          >
            {data.totals.lines.map((line, idx) => (
              <View key={`total-${idx}`} style={styles.totalRow}>
                <Text
                  style={[
                    styles.totalLabel,
                    mutedColor ? { color: mutedColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {line.label}
                </Text>
                <Text
                  style={[
                    styles.totalValue,
                    textColor ? { color: textColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {line.value}
                </Text>
              </View>
            ))}

            {data.advanceSummary ? (
              <View style={styles.advanceBox}>
                {data.advanceSummary.advanceAmount ? (
                  <View style={styles.advanceRow}>
                    <Text
                      style={[
                        styles.advanceProminentLabel,
                        textColor ? { color: textColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.primaryLabel}
                    </Text>
                    <Text
                      style={[
                        styles.advanceProminentValue,
                        accentColor ? { color: accentColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.advanceAmount}
                    </Text>
                  </View>
                ) : null}

                {data.advanceSummary.balanceRemaining ? (
                  <View style={styles.advanceRow}>
                    <Text
                      style={[
                        styles.advanceLabel,
                        mutedColor ? { color: mutedColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.secondaryLabel}
                    </Text>
                    <Text
                      style={[
                        styles.advanceValue,
                        textColor ? { color: textColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.balanceRemaining}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {data.totals.mainLine ? (
              <View style={styles.totalFinal}>
                <Text
                  style={[
                    styles.totalFinalLabel,
                    textColor ? { color: textColor } : null,
                    headerFontFamily ? { fontFamily: headerFontFamily } : null,
                  ]}
                >
                  {data.totals.mainLine.label}
                </Text>
                <Text
                  style={[
                    styles.totalFinalValue,
                    textColor ? { color: textColor } : null,
                    headerFontFamily ? { fontFamily: headerFontFamily } : null,
                  ]}
                >
                  {data.totals.mainLine.value}
                </Text>
              </View>
            ) : null}

            {data.totals.amountInWords ? (
              <Text
                style={[
                  styles.amountWords,
                  mutedColor ? { color: mutedColor } : null,
                  bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                ]}
              >
                {data.totals.amountInWords}
              </Text>
            ) : null}

            {data.totals.balanceDue ? (
              <View
                style={[
                  styles.balanceDue,
                  accentColor ? { backgroundColor: accentColor } : null,
                ]}
              >
                <Text
                  style={[
                    styles.balanceDueText,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {data.totals.balanceDue.label}
                </Text>
                <Text
                  style={[
                    styles.balanceDueValue,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {data.totals.balanceDue.value}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {data.notes?.content ? (
        <View style={styles.optionalSection}>
          {data.notes.title ? (
            <Text
              style={[
                styles.optionalTitle,
                textColor ? { color: textColor } : null,
                headerFontFamily ? { fontFamily: headerFontFamily } : null,
              ]}
            >
              {data.notes.title}
            </Text>
          ) : null}
          <Text style={styles.optionalText}>{data.notes.content}</Text>
        </View>
      ) : null}

      {data.terms?.content ? (
        <View style={styles.optionalSection}>
          {data.terms.title ? (
            <Text
              style={[
                styles.optionalTitle,
                textColor ? { color: textColor } : null,
                headerFontFamily ? { fontFamily: headerFontFamily } : null,
              ]}
            >
              {data.terms.title}
            </Text>
          ) : null}
          <Text style={styles.optionalText}>{data.terms.content}</Text>
        </View>
      ) : null}

      {data.attachments.length > 0 ? (
        <View style={styles.optionalSection}>
          <Text
            style={[
              styles.optionalTitle,
              textColor ? { color: textColor } : null,
              headerFontFamily ? { fontFamily: headerFontFamily } : null,
            ]}
          >
            Attachments
          </Text>
          <View style={styles.attachmentsWrap}>{renderOptionalList(data.attachments)}</View>
        </View>
      ) : null}

      {data.additionalFields.length > 0 ? (
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

      {data.signature && (data.signature.imageUrl || data.signature.name) ? (
        <View style={styles.signatureWrap}>
          <View style={styles.signatureBox}>
            {data.signature.imageUrl ? (
              <Image src={data.signature.imageUrl} style={styles.signatureImage} />
            ) : null}
            <View style={styles.signatureLine} />
            {data.signature.name ? <Text style={styles.signerName}>{data.signature.name}</Text> : null}
            {data.signature.role ? <Text style={styles.signerRole}>{data.signature.role}</Text> : null}
          </View>
        </View>
      ) : null}

      {footerVisible ? (
        <View style={styles.footerZone} fixed>
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